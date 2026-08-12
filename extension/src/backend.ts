import { createEcoMindSupabaseClient, isSupabaseConfigured, SupabaseLeaderboardRepository, localEventToQueueItem, type BackendSummary } from '../../shared/supabaseBackend'
import { readExtensionState, writeExtensionState, type ExtensionState } from './shared'

declare const __ECOMIND_SUPABASE_URL__: string
declare const __ECOMIND_SUPABASE_ANON_KEY__: string
declare const __ECOMIND_SUPABASE_LIVE_VERIFIED__: boolean

export const extensionBackendConfig = { url: __ECOMIND_SUPABASE_URL__, anonKey: __ECOMIND_SUPABASE_ANON_KEY__, liveVerified: __ECOMIND_SUPABASE_LIVE_VERIFIED__ }
const storage = {
  getItem: (key: string) => new Promise<string | null>((resolve) => chrome.storage.local.get(key, (result) => resolve(typeof result[key] === 'string' ? result[key] : null))),
  setItem: (key: string, value: string) => new Promise<void>((resolve, reject) => chrome.storage.local.set({ [key]: value }, () => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())),
  removeItem: (key: string) => new Promise<void>((resolve, reject) => chrome.storage.local.remove(key, () => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())),
}
export const extensionSupabase = createEcoMindSupabaseClient(extensionBackendConfig, storage)
export const extensionRepository = extensionSupabase ? new SupabaseLeaderboardRepository(extensionSupabase) : null
export const extensionBackendConfigured = isSupabaseConfigured(extensionBackendConfig)

export async function syncExtensionQueue(state?: ExtensionState): Promise<{ state: ExtensionState; summary: BackendSummary | null }> {
  const current = state ?? await readExtensionState()
  if (!extensionRepository || !extensionSupabase || !current.backendAccountId || !navigator.onLine) return { state: current, summary: null }
  let summary: BackendSummary | null = null
  const pending = current.syncQueue.filter((candidate) => candidate.accountId === current.backendAccountId && ['waiting_to_sync', 'backend_unavailable'].includes(candidate.status))
  for (const item of pending) {
    try { const result = await extensionRepository.award(item); item.status = result.status; item.message = result.status === 'synced' ? `+${result.pointsAwarded} EcoPoints synced` : result.status.replaceAll('_', ' '); if (result.summary) summary = result.summary } catch (error) { item.status = 'backend_unavailable'; item.message = error instanceof Error ? error.message : 'Backend unavailable' }
  }
  if (pending.length) await writeExtensionState(current)
  return { state: current, summary }
}

export async function importExtensionProgress(state: ExtensionState) {
  if (!state.backendAccountId || state.importedForAccounts.includes(state.backendAccountId)) return 0
  const items = state.pointEvents.map((event) => localEventToQueueItem(event, 'extension-import', state.backendAccountId!)).filter((item) => item !== null)
  const keys = new Set(state.syncQueue.filter((item) => item.accountId === state.backendAccountId).map((item) => item.deduplicationKey))
  state.syncQueue.unshift(...items.filter((item) => !keys.has(item.deduplicationKey)))
  state.importedForAccounts.push(state.backendAccountId)
  await writeExtensionState(state)
  return items.length
}
