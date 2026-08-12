import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'

if (existsSync('.env.test.local') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env.test.local')

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_TEST_ACCOUNT_A_EMAIL', 'SUPABASE_TEST_ACCOUNT_A_PASSWORD', 'SUPABASE_TEST_ACCOUNT_B_EMAIL', 'SUPABASE_TEST_ACCOUNT_B_PASSWORD', 'SUPABASE_TEST_ACCOUNT_C_EMAIL', 'SUPABASE_TEST_ACCOUNT_C_PASSWORD']
const missing = required.filter((name) => !process.env[name])
if (missing.length) { console.error(`Live Supabase test blocked. Missing: ${missing.join(', ')}`); process.exit(2) }

const makeClient = () => createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const clients = [makeClient(), makeClient(), makeClient()]
const accounts = ['A', 'B', 'C'].map((name) => ({ email: process.env[`SUPABASE_TEST_ACCOUNT_${name}_EMAIL`], password: process.env[`SUPABASE_TEST_ACCOUNT_${name}_PASSWORD`] }))
for (let index = 0; index < 3; index++) { const { error } = await clients[index].auth.signInWithPassword(accounts[index]); assert.ifError(error) }
const users = await Promise.all(clients.map(async (client) => (await client.auth.getUser()).data.user))
assert.ok(users.every(Boolean)); assert.equal(new Set(users.map((user) => user.id)).size, 3)

const suffix = Date.now().toString().slice(-6)
for (const [index, nickname] of [[0, `Test Koala A${suffix}`], [1, `Test Koala B${suffix}`], [2, `Test Koala C${suffix}`]]) {
  const { error } = await clients[index].from('profiles').upsert({ user_id: users[index].id, display_name: nickname.slice(0, 20), opted_into_leaderboard: index < 2, updated_at: new Date().toISOString() })
  assert.ifError(error)
}
const keyA = `live-test-a-${Date.now()}`; const keyB = `live-test-b-${Date.now()}`
assert.equal((await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: keyA, p_source: 'web', p_metadata: {} })).data.status, 'synced')
assert.equal((await clients[1].rpc('award_eco_points', { p_action_type: 'avoidUnnecessaryPurchase', p_deduplication_key: keyB, p_source: 'web', p_metadata: {} })).data.status, 'synced')
assert.equal((await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: keyA, p_source: 'web', p_metadata: {} })).data.status, 'duplicate_rejected')
assert.ok((await clients[0].rpc('award_eco_points', { p_action_type: 'compareGreenerAlternative', p_deduplication_key: `invalid-${Date.now()}`, p_source: 'web', p_metadata: { points: '999' } })).error, 'Unknown metadata including client points must be rejected.')

const boardA = await clients[0].rpc('get_public_leaderboard', { p_period: 'week' }); const boardB = await clients[1].rpc('get_public_leaderboard', { p_period: 'week' })
assert.ifError(boardA.error)
const publicRows = (rows) => rows.map(({ is_current_user: _current, ...row }) => row)
assert.deepEqual(publicRows(boardA.data), publicRows(boardB.data))
assert.ok(boardA.data.some((entry) => entry.display_name.startsWith('Test Koala A'))); assert.ok(boardA.data.some((entry) => entry.display_name.startsWith('Test Koala B'))); assert.ok(!boardA.data.some((entry) => entry.display_name.startsWith('Test Koala C')))

const privateA = await clients[0].from('eco_point_events').select('*').eq('user_id', users[0].id); assert.ok(privateA.data.length > 0)
const otherPrivate = await clients[1].from('eco_point_events').select('*').eq('user_id', users[0].id); assert.equal(otherPrivate.data.length, 0)
const editOther = await clients[1].from('profiles').update({ display_name: 'Forbidden edit' }).eq('user_id', users[0].id).select(); assert.equal(editOther.data.length, 0)
const directInsert = await clients[0].from('eco_point_events').insert({ user_id: users[0].id, action_type: 'compareGreenerAlternative', points: 999, source: 'web', deduplication_key: `direct-${Date.now()}` }); assert.ok(directInsert.error)
for (const period of ['week', 'month', 'all']) { const result = await clients[0].rpc('get_public_leaderboard', { p_period: period }); assert.ifError(result.error) }
await clients[0].from('profiles').update({ opted_into_leaderboard: false }).eq('user_id', users[0].id); const afterLeave = await clients[1].rpc('get_public_leaderboard', { p_period: 'week' }); assert.ok(!afterLeave.data.some((entry) => entry.display_name.startsWith('Test Koala A')))

const deleteC = await clients[2].rpc('delete_my_account'); assert.ifError(deleteC.error)
const deletedC = await clients[2].auth.getUser(); assert.ok(deletedC.error || !deletedC.data.user, 'Deleted account must no longer resolve through Auth.')

console.log('Live Supabase checks passed with three independent sessions: shared ranking, opt-out, duplicate protection, server points, RLS isolation and account deletion.')
