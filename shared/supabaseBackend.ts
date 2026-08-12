import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { EcoPointActionType, LeaderboardPeriod, PointEvent } from './ecoPoints'

export type BackendSyncStatus = 'synced' | 'waiting_to_sync' | 'duplicate_rejected' | 'action_limit_reached' | 'action_rejected' | 'sign_in_required' | 'backend_unavailable'

export type BackendLeaderboardEntry = {
  publicId: string
  displayName: string
  koalaLevel: 'Starter Koala' | 'Eco Explorer' | 'Climate Champion'
  badge: string
  ecoPoints: number
  actionCount: number
  rank: number
  isCurrentUser: boolean
}

export type BackendSummary = {
  rank: number | null
  periodPoints: number
  periodActions: number
  allTimePoints: number
  koalaLevel: 'Starter Koala' | 'Eco Explorer' | 'Climate Champion'
  badge: string
  pointsToNextRank: number
}

export type SyncQueueItem = {
  id: string
  accountId?: string
  actionType: Exclude<EcoPointActionType, 'analysis' | 'legacy-demo-balance'>
  deduplicationKey: string
  source: 'web' | 'extension' | 'web-import' | 'extension-import'
  localTimestamp: string
  metadata: Record<string, string>
  status: BackendSyncStatus
  message?: string
}

export type AwardResult = { status: BackendSyncStatus; eventId?: string; pointsAwarded?: number; summary?: BackendSummary }

export type PublicSupabaseConfig = { url: string; anonKey: string; liveVerified: boolean }

export function isSupabaseConfigured(config: PublicSupabaseConfig) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) && config.anonKey.length > 40 && !config.url.includes('YOUR_PROJECT')
}

export function createEcoMindSupabaseClient(config: PublicSupabaseConfig, storage?: { getItem(key: string): Promise<string | null> | string | null; setItem(key: string, value: string): Promise<void> | void; removeItem(key: string): Promise<void> | void }) {
  if (!isSupabaseConfigured(config)) return null
  return createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, ...(storage ? { storage } : {}) } })
}

function normaliseEntry(row: Record<string, unknown>): BackendLeaderboardEntry {
  return { publicId: String(row.public_id), displayName: String(row.display_name), koalaLevel: String(row.koala_level) as BackendLeaderboardEntry['koalaLevel'], badge: String(row.badge), ecoPoints: Number(row.eco_points), actionCount: Number(row.action_count), rank: Number(row.rank), isCurrentUser: Boolean(row.is_current_user) }
}

export class SupabaseLeaderboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getLeaderboard(period: LeaderboardPeriod) {
    const { data, error } = await this.client.rpc('get_public_leaderboard', { p_period: period })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(normaliseEntry)
  }

  async getSummary(period: LeaderboardPeriod) {
    const { data, error } = await this.client.rpc('get_my_leaderboard_summary', { p_period: period })
    if (error) throw error
    return data as BackendSummary
  }

  async getProfile() {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) return null
    const { data, error } = await this.client.from('profiles').select('display_name,opted_into_leaderboard,created_at').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    return data as { display_name: string; opted_into_leaderboard: boolean; created_at: string } | null
  }

  async join(displayName: string) {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) throw new Error('sign_in_required')
    const { error } = await this.client.from('profiles').upsert({ user_id: user.id, display_name: displayName, opted_into_leaderboard: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  }

  async updateProfile(displayName: string) {
    const { error } = await this.client.from('profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('user_id', (await this.client.auth.getUser()).data.user?.id ?? '')
    if (error) throw error
  }

  async leave() {
    const { error } = await this.client.from('profiles').update({ opted_into_leaderboard: false, updated_at: new Date().toISOString() }).eq('user_id', (await this.client.auth.getUser()).data.user?.id ?? '')
    if (error) throw error
  }

  async award(item: SyncQueueItem): Promise<AwardResult> {
    const { data, error } = await this.client.rpc('award_eco_points', { p_action_type: item.actionType, p_deduplication_key: item.deduplicationKey, p_source: item.source, p_metadata: item.metadata })
    if (error) {
      if (/auth|jwt|sign.in/i.test(error.message)) return { status: 'sign_in_required' }
      if (error.code === '22023' || /invalid|unknown_action/i.test(error.message)) return { status: 'action_rejected' }
      throw error
    }
    return data as AwardResult
  }

  async privateEvents() {
    const { data, error } = await this.client.from('eco_point_events').select('id,action_type,points,source,deduplication_key,is_self_reported,created_at').order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return data ?? []
  }

  async deleteAccount() {
    const { error } = await this.client.rpc('delete_my_account')
    if (error) throw error
  }
}

export function localEventToQueueItem(event: PointEvent, source: 'web-import' | 'extension-import', accountId?: string): SyncQueueItem | null {
  if (event.actionType === 'analysis' || event.actionType === 'legacy-demo-balance') return null
  if (!event.deduplicationKey || Number.isNaN(Date.parse(event.timestamp))) return null
  const allowed = { compareGreenerAlternative: 5, saveLowerImpactOption: 5, chooseLowerImpactOption: 10, repairOrReuseItem: 20, avoidUnnecessaryPurchase: 25, completeWeeklyChallenge: 30 } as const
  if (allowed[event.actionType] !== event.points) return null
  const challengeId = event.actionType === 'completeWeeklyChallenge' ? event.deduplicationKey.match(/^weekly-\d{4}-\d{2}-\d{2}-(.+)$/)?.[1] ?? '' : ''
  if (event.actionType === 'completeWeeklyChallenge' && !challengeId) return null
  return { id: `import:${event.deduplicationKey}`, accountId, actionType: event.actionType, deduplicationKey: event.deduplicationKey, source, localTimestamp: event.timestamp, metadata: { localTimestamp: event.timestamp, ...(challengeId ? { challengeId } : {}) }, status: 'waiting_to_sync' }
}
