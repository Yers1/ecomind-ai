export const ECO_POINT_RULES = {
  compareGreenerAlternative: 5,
  saveLowerImpactOption: 5,
  chooseLowerImpactOption: 10,
  repairOrReuseItem: 20,
  avoidUnnecessaryPurchase: 25,
  completeWeeklyChallenge: 30,
} as const

export type EcoPointActionType = keyof typeof ECO_POINT_RULES | 'analysis' | 'legacy-demo-balance'
export type EcoPointSource = 'web' | 'extension' | 'self-reported' | 'migration'

export type PointEvent = {
  id: string
  actionType: EcoPointActionType
  points: number
  timestamp: string
  source: EcoPointSource
  deduplicationKey: string
  title: string
  detail: string
  selfReported: boolean
}

export type LeaderboardPeriod = 'week' | 'month' | 'all'
export type KoalaLevel = 'Starter Koala' | 'Eco Explorer' | 'Climate Champion'

export type LeaderboardProfile = {
  optedIn: boolean
  displayName: string
  joinedAt: string | null
}

export type LeaderboardEntry = {
  id: string
  displayName: string
  weeklyEcoPoints: number
  monthlyEcoPoints: number
  allTimeEcoPoints: number
  weeklyActionCount: number
  monthlyActionCount: number
  allTimeActionCount: number
  koalaLevel: KoalaLevel
  badge: string
  isCurrentUser: boolean
  isDemoParticipant: boolean
}

export const WEEKLY_CHALLENGES = [
  { id: 'repair-reuse', title: 'Repair or reuse one item', description: 'Extend the useful life of something you already own.', actionType: 'completeWeeklyChallenge' as const, reward: ECO_POINT_RULES.completeWeeklyChallenge, selfReported: true, progressActionType: 'repairOrReuseItem' as const },
  { id: 'compare-products', title: 'Compare before deciding', description: 'Compare two products and review the disclosed evidence.', actionType: 'completeWeeklyChallenge' as const, reward: ECO_POINT_RULES.completeWeeklyChallenge, selfReported: false, progressActionType: 'compareGreenerAlternative' as const },
  { id: 'pause-purchase', title: 'Pause one unnecessary purchase', description: 'Record a mindful decision that you do not need a new item.', actionType: 'completeWeeklyChallenge' as const, reward: ECO_POINT_RULES.completeWeeklyChallenge, selfReported: true, progressActionType: 'avoidUnnecessaryPurchase' as const },
] as const

export const SELF_REPORTED_WEEKLY_CAPS: Partial<Record<EcoPointActionType, number>> = {
  repairOrReuseItem: 1,
  avoidUnnecessaryPurchase: 1,
  completeWeeklyChallenge: 3,
}

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'demo-moss', displayName: 'Mossy Koala', weeklyEcoPoints: 85, monthlyEcoPoints: 185, allTimeEcoPoints: 430, weeklyActionCount: 5, monthlyActionCount: 12, allTimeActionCount: 31, koalaLevel: 'Climate Champion', badge: 'Repair Mentor', isCurrentUser: false, isDemoParticipant: true },
  { id: 'demo-river', displayName: 'River Koala', weeklyEcoPoints: 65, monthlyEcoPoints: 145, allTimeEcoPoints: 315, weeklyActionCount: 4, monthlyActionCount: 10, allTimeActionCount: 24, koalaLevel: 'Climate Champion', badge: 'Mindful Pauser', isCurrentUser: false, isDemoParticipant: true },
  { id: 'demo-fern', displayName: 'Fern Friend', weeklyEcoPoints: 45, monthlyEcoPoints: 120, allTimeEcoPoints: 240, weeklyActionCount: 3, monthlyActionCount: 8, allTimeActionCount: 19, koalaLevel: 'Eco Explorer', badge: 'Thoughtful Comparer', isCurrentUser: false, isDemoParticipant: true },
  { id: 'demo-patch', displayName: 'Patch Koala', weeklyEcoPoints: 25, monthlyEcoPoints: 80, allTimeEcoPoints: 155, weeklyActionCount: 1, monthlyActionCount: 5, allTimeActionCount: 12, koalaLevel: 'Eco Explorer', badge: 'Reuse Rookie', isCurrentUser: false, isDemoParticipant: true },
  { id: 'demo-leaf', displayName: 'Little Leaf', weeklyEcoPoints: 10, monthlyEcoPoints: 40, allTimeEcoPoints: 70, weeklyActionCount: 2, monthlyActionCount: 4, allTimeActionCount: 8, koalaLevel: 'Starter Koala', badge: 'First Steps', isCurrentUser: false, isDemoParticipant: true },
]

export function getPeriodStart(period: LeaderboardPeriod, now = new Date()) {
  if (period === 'all') return new Date(0)
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  const start = new Date(now); const day = (start.getDay() + 6) % 7
  start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - day)
  return start
}

export function getPeriodEnd(period: LeaderboardPeriod, now = new Date()) {
  if (period === 'all') return null
  const start = getPeriodStart(period, now)
  if (period === 'month') return new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const end = new Date(start); end.setDate(end.getDate() + 7); return end
}

export function eventsForPeriod(events: PointEvent[], period: LeaderboardPeriod, now = new Date()) {
  const start = getPeriodStart(period, now).getTime(); const end = getPeriodEnd(period, now)?.getTime() ?? Infinity
  return events.filter((event) => event.actionType !== 'legacy-demo-balance' && new Date(event.timestamp).getTime() >= start && new Date(event.timestamp).getTime() < end)
}

export function periodSummary(events: PointEvent[], period: LeaderboardPeriod, now = new Date()) {
  const filtered = eventsForPeriod(events, period, now)
  return { points: filtered.reduce((sum, event) => sum + event.points, 0), actions: filtered.filter((event) => event.points > 0).length, events: filtered }
}

export function getKoalaLevel(points: number): KoalaLevel {
  return points >= 40 ? 'Climate Champion' : points >= 15 ? 'Eco Explorer' : 'Starter Koala'
}

export function getAchievementBadge(events: PointEvent[]) {
  if (events.some((event) => event.actionType === 'repairOrReuseItem')) return 'Repair Starter'
  if (events.some((event) => event.actionType === 'avoidUnnecessaryPurchase')) return 'Mindful Pauser'
  if (events.some((event) => event.actionType === 'compareGreenerAlternative')) return 'Thoughtful Comparer'
  return 'First Steps'
}

export function currentUserEntry(profile: LeaderboardProfile, events: PointEvent[], allTimePoints?: number): LeaderboardEntry {
  const week = periodSummary(events, 'week'); const month = periodSummary(events, 'month'); const all = periodSummary(events, 'all')
  const total = Math.max(all.points, allTimePoints ?? 0)
  return { id: 'current-user', displayName: profile.displayName, weeklyEcoPoints: week.points, monthlyEcoPoints: month.points, allTimeEcoPoints: total, weeklyActionCount: week.actions, monthlyActionCount: month.actions, allTimeActionCount: all.actions, koalaLevel: getKoalaLevel(total), badge: getAchievementBadge(events), isCurrentUser: true, isDemoParticipant: false }
}

const metricFor = (entry: LeaderboardEntry, period: LeaderboardPeriod) => period === 'week' ? entry.weeklyEcoPoints : period === 'month' ? entry.monthlyEcoPoints : entry.allTimeEcoPoints
const actionMetricFor = (entry: LeaderboardEntry, period: LeaderboardPeriod) => period === 'week' ? entry.weeklyActionCount : period === 'month' ? entry.monthlyActionCount : entry.allTimeActionCount

export function sortLeaderboard(entries: LeaderboardEntry[], period: LeaderboardPeriod) {
  return [...entries].sort((a, b) => metricFor(b, period) - metricFor(a, period) || actionMetricFor(b, period) - actionMetricFor(a, period) || a.displayName.localeCompare(b.displayName))
}

export function buildLeaderboard(profile: LeaderboardProfile, events: PointEvent[], period: LeaderboardPeriod, allTimePoints?: number) {
  const entries = profile.optedIn ? [...DEMO_LEADERBOARD, currentUserEntry(profile, events, allTimePoints)] : [...DEMO_LEADERBOARD]
  return sortLeaderboard(entries, period)
}

export function rankFor(entries: LeaderboardEntry[], period: LeaderboardPeriod, id = 'current-user') {
  const index = sortLeaderboard(entries, period).findIndex((entry) => entry.id === id)
  return index < 0 ? null : index + 1
}

export function pointsToNextRank(entries: LeaderboardEntry[], period: LeaderboardPeriod, id = 'current-user') {
  const sorted = sortLeaderboard(entries, period); const index = sorted.findIndex((entry) => entry.id === id)
  if (index <= 0) return 0
  return Math.max(0, metricFor(sorted[index - 1], period) - metricFor(sorted[index], period) + 1)
}

export function validateNickname(value: string) {
  const nickname = value.trim()
  if (nickname.length < 3 || nickname.length > 20) return 'Use 3–20 characters.'
  if (/@|https?:\/\/|www\.|\.[a-z]{2,}(?:\/|$)/i.test(nickname)) return 'Do not use an email address or link.'
  if (/\+?\d[\d\s().-]{6,}\d/.test(nickname)) return 'Do not use a phone number.'
  if (/[<>]/.test(nickname)) return 'HTML characters are not allowed.'
  return null
}

export function neutralNickname(seed = 247) { return `Green Koala ${Math.abs(seed) % 1000}` }

export function canAddPointEvent(events: PointEvent[], candidate: PointEvent, now = new Date()) {
  if (events.some((event) => event.deduplicationKey === candidate.deduplicationKey)) return false
  const cap = SELF_REPORTED_WEEKLY_CAPS[candidate.actionType]
  if (!candidate.selfReported || !cap) return true
  return eventsForPeriod(events, 'week', now).filter((event) => event.actionType === candidate.actionType && event.selfReported).length < cap
}

export function addPointEvent(events: PointEvent[], candidate: PointEvent, now = new Date()) {
  return canAddPointEvent(events, candidate, now) ? [candidate, ...events] : events
}

export function createPointEvent(input: Omit<PointEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): PointEvent {
  const timestamp = input.timestamp ?? new Date().toISOString()
  return { ...input, id: input.id ?? `${input.deduplicationKey}-${timestamp}`, timestamp }
}

export function migrateLegacyPointEvents(existing: PointEvent[] | undefined, legacyPoints: number | undefined, label = 'Previous demo balance') {
  if (Array.isArray(existing) && existing.length) return existing
  if (!legacyPoints || legacyPoints <= 0) return []
  return [createPointEvent({ id: 'legacy-demo-balance', actionType: 'legacy-demo-balance', points: legacyPoints, timestamp: '1970-01-01T00:00:00.000Z', source: 'migration', deduplicationKey: 'legacy-demo-balance', title: label, detail: 'Migrated from an earlier local state. Excluded from weekly rankings.', selfReported: false })]
}
