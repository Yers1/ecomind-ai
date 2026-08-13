import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { validateNickname, type LeaderboardPeriod, type PointEvent } from '../../shared/ecoPoints'
import { createEcoMindSupabaseClient, isSupabaseConfigured, localEventToQueueItem, SupabaseLeaderboardRepository, type BackendLeaderboardEntry, type BackendSummary, type BackendSyncStatus, type PublicSupabaseConfig, type SyncQueueItem } from '../../shared/supabaseBackend'

const config: PublicSupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  liveVerified: import.meta.env.VITE_SUPABASE_LIVE_VERIFIED === 'true',
}
const client = createEcoMindSupabaseClient(config)
const repository = client ? new SupabaseLeaderboardRepository(client) : null
const QUEUE_KEY = 'ecomind-supabase-sync-queue-v1'

type RemoteProfile = { displayName: string; optedIn: boolean; createdAt: string } | null
type BackendState = 'unconfigured' | 'loading' | 'ready' | 'offline' | 'error'

interface SupabaseContextValue {
  configured: boolean
  liveVerified: boolean
  backendState: BackendState
  user: User | null
  profile: RemoteProfile
  rankings: BackendLeaderboardEntry[]
  summary: BackendSummary | null
  queue: SyncQueueItem[]
  message: string | null
  signIn: (email: string, password: string) => Promise<void>
  createAccount: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: (period?: LeaderboardPeriod) => Promise<void>
  join: (displayName: string) => Promise<void>
  updateNickname: (displayName: string) => Promise<void>
  leave: () => Promise<void>
  deleteAccount: () => Promise<void>
  queueAction: (event: PointEvent, metadata?: Record<string, string>) => Promise<BackendSyncStatus>
  syncQueue: () => Promise<void>
  importLocalProgress: (events: PointEvent[]) => Promise<{ accepted: number; skipped: number }>
  localImportAvailable: (events: PointEvent[]) => boolean
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

function loadQueue() {
  try { const value = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); return Array.isArray(value) ? value as SyncQueueItem[] : [] } catch { return [] }
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Backend unavailable' }

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured(config)
  const [backendState, setBackendState] = useState<BackendState>(configured ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<RemoteProfile>(null)
  const [rankings, setRankings] = useState<BackendLeaderboardEntry[]>([])
  const [summary, setSummary] = useState<BackendSummary | null>(null)
  const [queue, setQueue] = useState<SyncQueueItem[]>(loadQueue)
  const [message, setMessage] = useState<string | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')

  useEffect(() => { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) }, [queue])

  const loadProfile = useCallback(async () => {
    if (!repository) return setProfile(null)
    const value = await repository.getProfile()
    setProfile(value ? { displayName: value.display_name, optedIn: value.opted_into_leaderboard, createdAt: value.created_at } : null)
  }, [])

  const refresh = useCallback(async (nextPeriod: LeaderboardPeriod = period) => {
    if (!repository) return
    if (!navigator.onLine) { setBackendState('offline'); return }
    setBackendState('loading'); setPeriod(nextPeriod)
    try {
      const entries = await repository.getLeaderboard(nextPeriod)
      setRankings(entries)
      if (user) { setSummary(await repository.getSummary(nextPeriod)); await loadProfile() } else { setSummary(null); setProfile(null) }
      setBackendState('ready')
    } catch (error) { setBackendState('error'); setMessage(errorMessage(error)) }
  }, [loadProfile, period, user])

  useEffect(() => {
    if (!client) return
    void client.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setBackendState(data.session ? 'loading' : 'ready') })
    const { data } = client.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (!session) { setProfile(null); setRankings([]); setSummary(null); setBackendState('ready') } })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (configured) void refresh(period) }, [configured, period, refresh, user])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) throw new Error('Supabase is not configured.')
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
    setUser(data.user); setMessage('Signed in. Your public profile remains off until you choose to join.')
  }, [])

  const createAccount = useCallback(async (email: string, password: string) => {
    if (!client) throw new Error('Supabase is not configured.')
    if (password.length < 10) throw new Error('Use at least 10 characters for your password.')
    const { data, error } = await client.auth.signUp({ email: email.trim(), password })
    if (error) throw error
    if (!data.session) throw new Error('Account created, but sign-in confirmation is still required.')
    setUser(data.user); setMessage('Private account created. Join the leaderboard only if you choose.')
  }, [])

  const signOut = useCallback(async () => { if (client) await client.auth.signOut(); setUser(null); setProfile(null); setRankings([]); setSummary(null) }, [])

  const join = useCallback(async (displayName: string) => {
    if (!repository || !user) throw new Error('Sign in before joining.')
    const validation = validateNickname(displayName); if (validation) throw new Error(validation)
    await repository.join(displayName.trim()); await refresh(period); setMessage('You joined the leaderboard.')
  }, [period, refresh, user])

  const updateNickname = useCallback(async (displayName: string) => {
    if (!repository || !user) throw new Error('Sign in required.')
    const validation = validateNickname(displayName); if (validation) throw new Error(validation)
    await repository.updateProfile(displayName.trim()); await refresh(period)
  }, [period, refresh, user])

  const leave = useCallback(async () => { if (!repository) return; await repository.leave(); await refresh(period); setMessage('Your profile is no longer public. Private points were kept.') }, [period, refresh])

  const deleteAccount = useCallback(async () => {
    if (!repository || !user) return
    await repository.deleteAccount(); setQueue((items) => items.filter((item) => item.accountId !== user.id)); await signOut(); setMessage('Your EcoMind account and backend data were deleted.')
  }, [signOut, user])

  const syncQueue = useCallback(async () => {
    if (!repository || !user) return
    if (!navigator.onLine) { setBackendState('offline'); return }
    const pending = queue.filter((item) => item.accountId === user.id && (item.status === 'waiting_to_sync' || item.status === 'backend_unavailable'))
    if (!pending.length) return
    for (const item of pending) {
      try {
        const result = await repository.award(item)
        setQueue((items) => items.map((candidate) => candidate.id === item.id ? { ...candidate, status: result.status, message: result.status === 'synced' ? `+${result.pointsAwarded} EcoPoints synced` : result.status.replaceAll('_', ' ') } : candidate))
        if (result.summary) setSummary(result.summary)
      } catch (error) {
        setQueue((items) => items.map((candidate) => candidate.id === item.id ? { ...candidate, status: 'backend_unavailable', message: errorMessage(error) } : candidate))
      }
    }
    await refresh(period)
  }, [period, queue, refresh, user])

  const queueAction = useCallback(async (event: PointEvent, metadata: Record<string, string> = {}) => {
    if (!user) return 'sign_in_required'
    const item = localEventToQueueItem(event, 'web-import', user.id)
    if (!item) return 'action_limit_reached'
    item.id = `live:${event.deduplicationKey}`; item.source = 'web'; item.metadata = metadata
    setQueue((items) => items.some((candidate) => candidate.accountId === user.id && candidate.deduplicationKey === item.deduplicationKey) ? items : [item, ...items])
    return navigator.onLine ? 'waiting_to_sync' : 'waiting_to_sync'
  }, [user])

  useEffect(() => { if (queue.some((item) => item.accountId === user?.id && item.status === 'waiting_to_sync')) void syncQueue() }, [queue, syncQueue, user?.id])
  useEffect(() => { const online = () => { setBackendState(user ? 'loading' : 'ready'); void syncQueue() }; const offline = () => setBackendState('offline'); window.addEventListener('online', online); window.addEventListener('offline', offline); return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) } }, [syncQueue, user])

  useEffect(() => {
    const handler = (event: Event) => { const detail = (event as CustomEvent<{ event: PointEvent; metadata: Record<string, string> }>).detail; if (detail?.event && user) void queueAction(detail.event, detail.metadata) }
    window.addEventListener('ecomind-point-event', handler); return () => window.removeEventListener('ecomind-point-event', handler)
  }, [queueAction, user])

  const importLocalProgress = useCallback(async (events: PointEvent[]) => {
    if (!user) throw new Error('Sign in before importing.')
    const importKey = `ecomind-import-v1:${user.id}`
    if (localStorage.getItem(importKey)) return { accepted: 0, skipped: events.length }
    const converted = events.map((event) => localEventToQueueItem(event, 'web-import', user.id)).filter((item): item is SyncQueueItem => Boolean(item))
    setQueue((items) => { const keys = new Set(items.filter((item) => item.accountId === user.id).map((item) => item.deduplicationKey)); return [...converted.filter((item) => !keys.has(item.deduplicationKey)), ...items] })
    localStorage.setItem(importKey, new Date().toISOString())
    setMessage(`${converted.length} recognised local actions queued. Unsupported legacy balances were not uploaded.`)
    return { accepted: converted.length, skipped: events.length - converted.length }
  }, [user])

  const localImportAvailable = useCallback((events: PointEvent[]) => Boolean(user && !localStorage.getItem(`ecomind-import-v1:${user.id}`) && events.some((event) => localEventToQueueItem(event, 'web-import', user.id))), [user])

  const value = useMemo<SupabaseContextValue>(() => ({ configured, liveVerified: config.liveVerified, backendState, user, profile, rankings, summary, queue, message, signIn, createAccount, signOut, refresh, join, updateNickname, leave, deleteAccount, queueAction, syncQueue, importLocalProgress, localImportAvailable }), [backendState, configured, createAccount, deleteAccount, importLocalProgress, join, leave, localImportAvailable, message, profile, queue, queueAction, rankings, refresh, signIn, signOut, summary, syncQueue, updateNickname, user])
  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSupabase() { const value = useContext(SupabaseContext); if (!value) throw new Error('useSupabase must be used inside SupabaseProvider'); return value }
