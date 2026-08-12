import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

function localEnvironment() {
  const executable = process.platform === 'win32' ? 'powershell.exe' : 'npx'
  const args = process.platform === 'win32' ? ['-NoProfile', '-Command', 'npx supabase status -o env'] : ['supabase', 'status', '-o', 'env']
  const output = execFileSync(executable, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return Object.fromEntries(output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/)
    return match ? [[match[1], match[2]]] : []
  }))
}

const environment = localEnvironment()
const url = environment.API_URL
const anonKey = environment.ANON_KEY
const serviceRoleKey = environment.SERVICE_ROLE_KEY
assert.ok(url && anonKey && serviceRoleKey, 'Local Supabase must expose API_URL, ANON_KEY and SERVICE_ROLE_KEY.')

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const admin = createClient(url, serviceRoleKey, options)
const clients = [0, 1, 2].map(() => createClient(url, anonKey, options))
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const accounts = ['a', 'b', 'c'].map((letter) => ({ email: `ecomind-${letter}-${suffix}@example.test`, password: `Local-only-${suffix}!` }))
const createdIds = []

try {
  for (let index = 0; index < accounts.length; index += 1) {
    const created = await admin.auth.admin.createUser({ ...accounts[index], email_confirm: true })
    assert.ifError(created.error)
    createdIds.push(created.data.user.id)
    const signedIn = await clients[index].auth.signInWithPassword(accounts[index])
    assert.ifError(signedIn.error)
  }

  for (const [index, nickname] of ['Local Koala A', 'Local Koala B', 'Local Koala C'].entries()) {
    const profile = await clients[index].from('profiles').insert({
      user_id: createdIds[index],
      display_name: nickname,
      opted_into_leaderboard: index < 2,
    })
    assert.ifError(profile.error)
  }

  const keyA = `local-a-${suffix}`
  const keyB = `local-b-${suffix}`
  const actionA = await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: keyA, p_source: 'web', p_metadata: {} })
  const actionB = await clients[1].rpc('award_eco_points', { p_action_type: 'avoidUnnecessaryPurchase', p_deduplication_key: keyB, p_source: 'extension', p_metadata: {} })
  assert.ifError(actionA.error); assert.equal(actionA.data.status, 'synced'); assert.equal(actionA.data.pointsAwarded, 5)
  assert.ifError(actionB.error); assert.equal(actionB.data.status, 'synced'); assert.equal(actionB.data.pointsAwarded, 25)

  const duplicate = await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: keyA, p_source: 'web', p_metadata: {} })
  assert.ifError(duplicate.error); assert.equal(duplicate.data.status, 'duplicate_rejected')
  const invalidAction = await clients[0].rpc('award_eco_points', { p_action_type: 'scanProduct', p_deduplication_key: `unknown-${suffix}`, p_source: 'web', p_metadata: {} })
  assert.ok(invalidAction.error)
  const clientPoints = await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: `points-${suffix}`, p_source: 'web', p_metadata: { points: '999' } })
  assert.ok(clientPoints.error)

  const boardA = await clients[0].rpc('get_public_leaderboard', { p_period: 'week' })
  const boardB = await clients[1].rpc('get_public_leaderboard', { p_period: 'week' })
  assert.ifError(boardA.error); assert.ifError(boardB.error)
  const publicRows = (rows) => rows.map(({ is_current_user: _current, ...row }) => row)
  assert.deepEqual(publicRows(boardA.data), publicRows(boardB.data))
  assert.equal(boardA.data.find((entry) => entry.display_name === 'Local Koala A').is_current_user, true)
  assert.equal(boardB.data.find((entry) => entry.display_name === 'Local Koala B').is_current_user, true)
  assert.deepEqual(boardA.data.map((entry) => entry.display_name), ['Local Koala B', 'Local Koala A'])
  assert.ok(!JSON.stringify(boardA.data).match(/@example\.test|user_id|score_reached_at|metadata/))

  const ownEvents = await clients[0].from('eco_point_events').select('*').eq('user_id', createdIds[0])
  const otherEvents = await clients[1].from('eco_point_events').select('*').eq('user_id', createdIds[0])
  assert.ifError(ownEvents.error); assert.equal(ownEvents.data.length, 1)
  assert.ifError(otherEvents.error); assert.equal(otherEvents.data.length, 0)
  const editOther = await clients[1].from('profiles').update({ display_name: 'Forbidden edit' }).eq('user_id', createdIds[0]).select()
  assert.ifError(editOther.error); assert.equal(editOther.data.length, 0)
  const directInsert = await clients[0].from('eco_point_events').insert({ user_id: createdIds[0], action_type: 'compareGreenerAlternative', points: 999, source: 'web', deduplication_key: `direct-${suffix}` })
  assert.ok(directInsert.error)
  const privateHelper = await clients[1].rpc('badge_for_user', { p_user_id: createdIds[0] })
  assert.ok(privateHelper.error, 'Internal badge helper must not be executable by clients.')

  for (const period of ['week', 'month', 'all']) {
    const board = await clients[0].rpc('get_public_leaderboard', { p_period: period })
    assert.ifError(board.error); assert.equal(board.data.length, 2)
  }

  const secondSession = createClient(url, anonKey, options)
  const secondLogin = await secondSession.auth.signInWithPassword(accounts[0])
  assert.ifError(secondLogin.error)
  const firstSummary = await clients[0].rpc('get_my_leaderboard_summary', { p_period: 'all' })
  const secondSummary = await secondSession.rpc('get_my_leaderboard_summary', { p_period: 'all' })
  assert.ifError(firstSummary.error); assert.deepEqual(secondSummary.data, firstSummary.data)

  const leave = await clients[0].from('profiles').update({ opted_into_leaderboard: false }).eq('user_id', createdIds[0])
  assert.ifError(leave.error)
  const afterLeave = await clients[1].rpc('get_public_leaderboard', { p_period: 'week' })
  assert.ifError(afterLeave.error); assert.deepEqual(afterLeave.data.map((entry) => entry.display_name), ['Local Koala B'])

  const challengeC = await clients[2].rpc('award_eco_points', { p_action_type: 'completeWeeklyChallenge', p_deduplication_key: `weekly-delete-${suffix}`, p_source: 'web', p_metadata: { challengeId: 'repair-reuse' } })
  assert.ifError(challengeC.error); assert.equal(challengeC.data.status, 'synced')
  const preferenceC = await clients[2].from('user_preferences').insert({ user_id: createdIds[2], import_version: 1 })
  assert.ifError(preferenceC.error)
  const deletedId = createdIds[2]
  const deleteAccount = await clients[2].rpc('delete_my_account')
  assert.ifError(deleteAccount.error)
  const deletedUser = await admin.auth.admin.getUserById(deletedId)
  assert.ok(deletedUser.error || !deletedUser.data.user)
  for (const table of ['profiles', 'eco_point_events', 'user_challenge_completions', 'user_preferences']) {
    const related = await admin.from(table).select('user_id').eq('user_id', deletedId)
    assert.equal(related.error, null, `${table} cleanup query failed: ${JSON.stringify(related.error)}`); assert.equal(related.data.length, 0, `${table} must cascade on account deletion.`)
  }
  createdIds.splice(2, 1)
} finally {
  for (const id of createdIds) await admin.auth.admin.deleteUser(id)
}

console.log('Local Supabase checks passed: three sessions, shared ranking, UTC periods, RLS isolation, duplicate and arbitrary-point rejection, opt-out, cross-session restore and deletion.')
