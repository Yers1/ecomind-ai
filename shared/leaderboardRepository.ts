import { buildLeaderboard, type LeaderboardEntry, type LeaderboardPeriod, type LeaderboardProfile, type PointEvent } from './ecoPoints'

export interface LeaderboardRepository {
  getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]>
  join(profile: LeaderboardProfile): Promise<void>
  updateProfile(profile: LeaderboardProfile): Promise<void>
  leave(): Promise<void>
}

type LocalDemoRepositoryOptions = {
  getProfile: () => LeaderboardProfile
  getEvents: () => PointEvent[]
  getAllTimePoints: () => number
  setProfile: (profile: LeaderboardProfile) => void
}

export class LocalDemoLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly options: LocalDemoRepositoryOptions) {}

  async getLeaderboard(period: LeaderboardPeriod) {
    return buildLeaderboard(this.options.getProfile(), this.options.getEvents(), period, this.options.getAllTimePoints())
  }

  async join(profile: LeaderboardProfile) { this.options.setProfile({ ...profile, optedIn: true }) }
  async updateProfile(profile: LeaderboardProfile) { this.options.setProfile(profile) }
  async leave() { this.options.setProfile({ ...this.options.getProfile(), optedIn: false, joinedAt: null }) }
}
