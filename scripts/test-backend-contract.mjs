import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sql = await readFile(resolve(root, 'supabase/migrations/202608130001_real_leaderboard.sql'), 'utf8')
for (const table of ['profiles', 'eco_point_events', 'weekly_challenges', 'user_challenge_completions', 'user_preferences']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
assert.match(sql, /unique\(user_id, deduplication_key\)/i)
assert.match(sql, /auth\.uid\(\)/i)
assert.match(sql, /security definer/i)
assert.match(sql, /revoke all on[^;]*public\.eco_point_events[^;]*from anon, authenticated/i)
assert.match(sql, /revoke all on function public\.koala_level_for_points[^;]*public\.badge_for_user[^;]*from public, anon, authenticated/i)
assert.match(sql, /grant select on public\.eco_point_events/i)
assert.doesNotMatch(sql, /grant insert on public\.eco_point_events/i)
assert.doesNotMatch(sql, /grant update[^;]*eco_point_events/i)
assert.doesNotMatch(sql, /grant delete[^;]*eco_point_events/i)
for (const [action, points] of [['compareGreenerAlternative', 5], ['saveLowerImpactOption', 5], ['chooseLowerImpactOption', 10], ['repairOrReuseItem', 20], ['avoidUnnecessaryPurchase', 25], ['completeWeeklyChallenge', 30]]) assert.match(sql, new RegExp(`when '${action}' then ${points}`))
assert.match(sql, /date_trunc\('week'.*UTC/i)
assert.match(sql, /date_trunc\('month'.*UTC/i)
assert.match(sql, /eco_points desc, action_count desc, score_reached_at asc/i)
assert.match(sql, /delete from auth\.users where id = v_user/i)
assert.match(sql, /jsonb_object_keys\(p_metadata\).*key not in \('challengeId', 'localTimestamp'\)/i)
assert.match(sql, /> 200 then return jsonb_build_object\('status', 'action_limit_reached'\)/i)

const output = await build({ stdin: { contents: "export * from './shared/supabaseBackend.ts'", resolveDir: root, sourcefile: 'backend-contract-entry.ts', loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false })
const lib = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`)
assert.equal(lib.isSupabaseConfigured({ url: '', anonKey: '', liveVerified: false }), false)
assert.equal(lib.isSupabaseConfigured({ url: 'https://project.supabase.co', anonKey: 'a'.repeat(50), liveVerified: false }), true)
const base = { id: '1', source: 'web', selfReported: false, title: 'Action', detail: 'Private detail' }
assert.equal(lib.localEventToQueueItem({ ...base, actionType: 'legacy-demo-balance', points: 25, timestamp: new Date().toISOString(), deduplicationKey: 'legacy-demo-balance' }, 'web-import'), null)
assert.equal(lib.localEventToQueueItem({ ...base, actionType: 'saveLowerImpactOption', points: 999, timestamp: new Date().toISOString(), deduplicationKey: 'bad-points' }, 'web-import'), null)
assert.equal(lib.localEventToQueueItem({ ...base, actionType: 'saveLowerImpactOption', points: 5, timestamp: 'invalid', deduplicationKey: 'bad-time' }, 'web-import'), null)
const valid = lib.localEventToQueueItem({ ...base, actionType: 'saveLowerImpactOption', points: 5, timestamp: '2026-08-12T10:00:00.000Z', deduplicationKey: 'save-item' }, 'web-import', 'account-a')
assert.equal(valid.accountId, 'account-a'); assert.equal(valid.status, 'waiting_to_sync'); assert.equal(valid.metadata.localTimestamp, '2026-08-12T10:00:00.000Z')
const challenge = lib.localEventToQueueItem({ ...base, actionType: 'completeWeeklyChallenge', points: 30, timestamp: '2026-08-12T10:00:00.000Z', deduplicationKey: 'weekly-2026-08-16-repair-reuse' }, 'web-import')
assert.equal(challenge.metadata.challengeId, 'repair-reuse')

console.log('Backend contract checks passed: RLS/grants, server point rules, limits, UTC ranking, deletion and safe local import.')
