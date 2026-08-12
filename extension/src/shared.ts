import { migrateLegacyPointEvents, neutralNickname, type LeaderboardProfile, type PointEvent } from '../../shared/ecoPoints'

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
  schemaVersion: 3
  points: number
  wishlist: ExtensionWishlistItem[]
  completedActions: string[]
  activities: ExtensionActivity[]
  pointEvents: PointEvent[]
  leaderboardProfile: LeaderboardProfile
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
  schemaVersion: 3,
  points: 0,
  wishlist: [],
  completedActions: [],
  activities: [],
  pointEvents: [],
  leaderboardProfile: { optedIn: false, displayName: neutralNickname(), joinedAt: null },
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
        schemaVersion: 3,
        pointEvents,
        leaderboardProfile: { ...DEFAULT_EXTENSION_STATE.leaderboardProfile, ...(saved?.leaderboardProfile ?? {}) },
        manualCorrections: saved?.manualCorrections && typeof saved.manualCorrections === 'object' ? saved.manualCorrections : {},
        preferences: {
          ...DEFAULT_EXTENSION_STATE.preferences,
          ...(saved?.preferences ?? {}),
        },
      })
    })
  })
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
