export const STORAGE_KEY = 'ecomindExtensionStateV2'

export interface ExtensionWishlistItem {
  id: string
  productName: string
  price: number
  currency: string
  score: number
  grade: string
  confidenceLevel: string
  alternativeAvailable: boolean
}

export interface ExtensionActivity {
  id: string
  title: string
  detail: string
  points: number
  date: string
}

export interface ExtensionState {
  points: number
  wishlist: ExtensionWishlistItem[]
  completedActions: string[]
  activities: ExtensionActivity[]
  preferences: {
    showWidgetAfterAnalysis: boolean
  }
}

export const DEFAULT_EXTENSION_STATE: ExtensionState = {
  points: 0,
  wishlist: [],
  completedActions: [],
  activities: [],
  preferences: {
    showWidgetAfterAnalysis: true,
  },
}

export function readExtensionState(): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Partial<ExtensionState> | undefined
      resolve({
        ...DEFAULT_EXTENSION_STATE,
        ...saved,
        wishlist: Array.isArray(saved?.wishlist) ? saved.wishlist : [],
        completedActions: Array.isArray(saved?.completedActions) ? saved.completedActions : [],
        activities: Array.isArray(saved?.activities) ? saved.activities : DEFAULT_EXTENSION_STATE.activities,
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
