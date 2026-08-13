import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = await build({ stdin: { contents: "export * from './shared/trafficLight.ts'; export * from './shared/ecoPoints.ts'; export * from './shared/leaderboardRepository.ts'", resolveDir: root, sourcefile: 'engagement-test-entry.ts', loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false })
const lib = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

for (const [score, expected] of [[0, 'red'], [39, 'red'], [40, 'amber'], [69, 'amber'], [70, 'green'], [100, 'green']]) assert.equal(lib.getTrafficLightStatus(score, true).colour, expected)
assert.equal(lib.getTrafficLightStatus(null, true).colour, 'grey')
assert.equal(lib.getTrafficLightStatus(78, false).colour, 'grey')
assert.equal(lib.formatTrafficLightScore(54, true), '~54/100')
assert.equal(lib.formatTrafficLightScore(null, true), 'Score unavailable')
assert.deepEqual(lib.TRAFFIC_LIGHT_COLOURS.amber, { foreground: '#854D0E', background: '#FEF3C7', indicator: '#F59E0B' })
for (const colour of ['green', 'amber', 'red', 'grey']) {
  const status = colour === 'grey' ? lib.getTrafficLightStatus(null, false) : lib.getTrafficLightStatus(colour === 'green' ? 78 : colour === 'amber' ? 54 : 27, true)
  const accessible = lib.trafficLightAccessibleText(status, colour === 'grey' ? null : colour === 'green' ? 78 : colour === 'amber' ? 54 : 27, colour === 'amber', 'Medium')
  assert.match(accessible, new RegExp(`Traffic-light status: ${colour}`))
  assert.match(accessible, /Medium confidence/)
  if (colour !== 'grey') assert.match(accessible, /Grade [A-E]/)
}

const now = new Date('2026-08-12T12:00:00.000Z')
const make = (key, type, points, timestamp, selfReported = false) => lib.createPointEvent({ id: key, actionType: type, points, timestamp, source: selfReported ? 'self-reported' : 'web', deduplicationKey: key, title: key, detail: key, selfReported })
const events = [make('week-repair', 'repairOrReuseItem', 20, '2026-08-11T10:00:00.000Z', true), make('month-save', 'saveLowerImpactOption', 5, '2026-08-02T10:00:00.000Z'), make('old-compare', 'compareGreenerAlternative', 5, '2026-07-02T10:00:00.000Z')]
assert.deepEqual(lib.periodSummary(events, 'week', now), { points: 20, actions: 1, events: [events[0]] })
assert.equal(lib.periodSummary(events, 'month', now).points, 25)
assert.equal(lib.periodSummary(events, 'all', now).points, 30)
assert.equal(lib.getPeriodStart('week', now).getDay(), 1)
assert.equal(lib.getPeriodStart('week', now).getHours(), 0)
assert.equal((lib.getPeriodEnd('week', now).getTime() - lib.getPeriodStart('week', now).getTime()) / 86_400_000, 7)

const tie = [{ ...lib.DEMO_LEADERBOARD[0], id: 'b', displayName: 'Beta', weeklyEcoPoints: 20, weeklyActionCount: 1 }, { ...lib.DEMO_LEADERBOARD[0], id: 'a', displayName: 'Alpha', weeklyEcoPoints: 20, weeklyActionCount: 2 }]
assert.equal(lib.sortLeaderboard(tie, 'week')[0].id, 'a')
const duplicate = make('same', 'compareGreenerAlternative', 5, '2026-08-11T12:00:00.000Z')
assert.equal(lib.addPointEvent([duplicate], duplicate, now).length, 1)
const secondRepair = make('repair-2', 'repairOrReuseItem', 20, '2026-08-12T12:00:00.000Z', true)
assert.equal(lib.addPointEvent([events[0]], secondRepair, now).length, 1, 'Weekly self-reported cap must prevent a second repair claim.')
const challenge = make('weekly-2026-08-16-repair', 'completeWeeklyChallenge', 30, '2026-08-12T12:00:00.000Z', true)
assert.equal(lib.addPointEvent([], challenge, now).length, 1)
assert.equal(lib.addPointEvent([challenge], challenge, now).length, 1)

const migrated = lib.migrateLegacyPointEvents([], 50)
assert.equal(migrated[0].actionType, 'legacy-demo-balance')
assert.equal(lib.periodSummary(migrated, 'week', now).points, 0)
assert.equal(lib.migrateLegacyPointEvents(migrated, 50).length, 1)
assert.equal(lib.getKoalaLevel(14), 'Starter Koala')
assert.equal(lib.getKoalaLevel(15), 'Eco Explorer')
assert.equal(lib.getKoalaLevel(39), 'Eco Explorer')
assert.equal(lib.getKoalaLevel(40), 'Climate Champion')
assert.equal(lib.validateNickname('ab'), 'Use 3–20 characters.')
assert.ok(lib.validateNickname('person@example.com'))
assert.ok(lib.validateNickname('https://example.com'))
assert.ok(lib.validateNickname('+1 555 123 4567'))
assert.equal(lib.validateNickname('Quiet Koala'), null)
assert.equal(lib.neutralNickname(247), 'Green Koala 247')

const profile = { optedIn: true, displayName: 'Quiet Koala', joinedAt: now.toISOString() }
const zeroBoard = lib.buildLeaderboard(profile, [], 'week', 0)
assert.equal(zeroBoard.find((entry) => entry.isCurrentUser).weeklyEcoPoints, 0)
const oldRank = lib.rankFor(zeroBoard, 'week')
const earned = [make('no-buy', 'avoidUnnecessaryPurchase', 25, '2026-08-12T12:00:00.000Z', true), make('repair', 'repairOrReuseItem', 20, '2026-08-12T13:00:00.000Z', true)]
const earnedBoard = lib.buildLeaderboard(profile, earned, 'week', 45)
assert.ok(lib.rankFor(earnedBoard, 'week') < oldRank)
assert.equal(lib.currentUserEntry(profile, earned, 45).koalaLevel, 'Climate Champion')
assert.equal(lib.periodSummary(earned, 'week', now).points, earnedBoard.find((entry) => entry.isCurrentUser).weeklyEcoPoints, 'Dashboard and leaderboard must use the same event total.')
assert.deepEqual(lib.DEMO_LEADERBOARD, lib.DEMO_LEADERBOARD.map((entry) => ({ ...entry })), 'Sample participants must be deterministic.')

let repoProfile = { optedIn: false, displayName: 'Quiet Koala', joinedAt: null }
const repo = new lib.LocalDemoLeaderboardRepository({ getProfile: () => repoProfile, getEvents: () => earned, getAllTimePoints: () => 45, setProfile: (next) => { repoProfile = next } })
await repo.join({ ...repoProfile, optedIn: true, joinedAt: now.toISOString() }); assert.equal(repoProfile.optedIn, true)
await repo.updateProfile({ ...repoProfile, displayName: 'Patch Pal' }); assert.equal(repoProfile.displayName, 'Patch Pal')
assert.ok((await repo.getLeaderboard('week')).some((entry) => entry.isCurrentUser))
await repo.leave(); assert.equal(repoProfile.optedIn, false)

const popupHtml = await readFile(resolve(root, 'extension', 'popup.html'), 'utf8')
const popupTs = await readFile(resolve(root, 'extension', 'src', 'popup.ts'), 'utf8')
const popupCss = await readFile(resolve(root, 'extension', 'popup.css'), 'utf8')
const websiteCss = await readFile(resolve(root, 'src', 'styles.css'), 'utf8')
const contentTs = await readFile(resolve(root, 'extension', 'src', 'content.ts'), 'utf8')
const leaderboardPage = await readFile(resolve(root, 'src', 'pages', 'LeaderboardPage.tsx'), 'utf8')
const landing = await readFile(resolve(root, 'src', 'pages', 'LandingPage.tsx'), 'utf8')
assert.match(popupHtml, /id="trafficResult"[^>]*hidden/)
assert.match(popupHtml, /id="weeklyRank"/)
assert.match(popupHtml, /id="leaderboardButton"/)
assert.match(popupTs, /extensionRepository/)
assert.doesNotMatch(popupTs, /DEMO_LEADERBOARD|buildLeaderboard/)
assert.doesNotMatch(leaderboardPage, /DEMO_LEADERBOARD|buildLeaderboard/)
assert.doesNotMatch(landing, /TrafficLightResult|ScoreBadge/, 'No traffic-light result may appear on the landing preview before analysis.')
assert.match(popupCss, /#f59e0b/i)
assert.match(websiteCss, /#f59e0b/i)
assert.match(contentTs, /#f59e0b/i)
assert.match(contentTs, /Packaging 5% \+ 5%/)

console.log('Engagement checks passed: traffic thresholds/accessibility, period totals, ranking, deduplication, caps, migration, profiles, popup summary and pre-analysis privacy.')
