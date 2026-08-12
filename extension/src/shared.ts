import { migrateLegacyPointEvents, neutralNickname, type LeaderboardProfile, type PointEvent } from '../../shared/ecoPoints'
import { localEventToQueueItem, type SyncQueueItem } from '../../shared/supabaseBackend'

export const STORAGE_KEY = 'ecomindExtensionStateV2'

export interface ExtensionWishlistItem {
  id: string
  productName: string
  price: number | null
  currency: string | null
  score: number | null
  scoreRange?: [number, number] | null
  grade: string | null
  confidenceLevel: string
  alternativeAvailable: boolean
  retailer?: string
  url?: string
  parserUsed?: string
  materials?: Array<{ name: string; percentage: number | null; evidence: string }>
  recycledContentPercentage?: number | null
  packaging?: string | null
}

export interface ExtensionActivity {
  id: string
  title: string
  detail: string
  points: number
  date: string
  timestamp?: string
}

export interface ExtensionState {
  schemaVersion: 4
  points: number
  wishlist: ExtensionWishlistItem[]
  completedActions: string[]
  activities: ExtensionActivity[]
  pointEvents: PointEvent[]
  leaderboardProfile: LeaderboardProfile
  backendAccountId: string | null
  syncQueue: SyncQueueItem[]
  importedForAccounts: string[]
  manualCorrections: Record<string, {
    title?: string | null
    materialText?: string | null
    recycledContentPercentage?: number | null
    packaging?: string | null
    markNotDisclosed?: Array<'materials' | 'recycledContent' | 'packaging'>
  }>
  preferences: {
    showWidgetAfterAnalysis: boolean
    diagnosticsEnabled: boolean
  }
}

export const DEFAULT_EXTENSION_STATE: ExtensionState = {
  schemaVersion: 4,
  points: 0,
  wishlist: [],
  completedActions: [],
  activities: [],
  pointEvents: [],
  leaderboardProfile: { optedIn: false, displayName: neutralNickname(), joinedAt: null },
  backendAccountId: null,
  syncQueue: [],
  importedForAccounts: [],
  manualCorrections: {},
  preferences: {
    showWidgetAfterAnalysis: true,
    diagnosticsEnabled: false,
  },
}

export function readExtensionState(): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Partial<ExtensionState> | undefined
      const pointEvents = migrateLegacyPointEvents(saved?.pointEvents, saved?.points, 'Previous extension demo balance')
      resolve({
        ...DEFAULT_EXTENSION_STATE,
        ...saved,
        wishlist: Array.isArray(saved?.wishlist) ? saved.wishlist : [],
        completedActions: Array.isArray(saved?.completedActions) ? saved.completedActions : [],
        activities: Array.isArray(saved?.activities) ? saved.activities : DEFAULT_EXTENSION_STATE.activities,
        schemaVersion: 4,
        pointEvents,
        leaderboardProfile: { ...DEFAULT_EXTENSION_STATE.leaderboardProfile, ...(saved?.leaderboardProfile ?? {}) },
        backendAccountId: saved?.backendAccountId ?? null,
        syncQueue: Array.isArray(saved?.syncQueue) ? saved.syncQueue : [],
        importedForAccounts: Array.isArray(saved?.importedForAccounts) ? saved.importedForAccounts : [],
        manualCorrections: saved?.manualCorrections && typeof saved.manualCorrections === 'object' ? saved.manualCorrections : {},
        preferences: {
          ...DEFAULT_EXTENSION_STATE.preferences,
          ...(saved?.preferences ?? {}),
        },
      })
    })
  })
}

export function queueExtensionEvent(state: ExtensionState, event: PointEvent) {
  if (!state.backendAccountId) return
  const item = localEventToQueueItem(event, 'extension-import', state.backendAccountId)
  if (!item || state.syncQueue.some((candidate) => candidate.accountId === state.backendAccountId && candidate.deduplicationKey === item.deduplicationKey)) return
  item.id = `live:${event.deduplicationKey}`; item.source = 'extension'
  state.syncQueue.unshift(item)
}

export function writeExtensionState(state: ExtensionState): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

export function ensureExtensionState(): Promise<ExtensionState> {
  return readExtensionState().then(async (state) => {
    await writeExtensionState(state)
    return state
  })
}
