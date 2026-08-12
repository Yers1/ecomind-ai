import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActivityItem } from '../types'

interface StoredState {
  authenticated: boolean
  points: number
  wishlist: string[]
  completedActions: string[]
  activities: ActivityItem[]
}

interface ExtensionBridgeState {
  points?: number
  wishlist?: Array<{ id: string }>
  completedActions?: string[]
  activities?: ActivityItem[]
}

interface EcoMindContextValue extends StoredState {
  login: () => void
  logout: () => void
  saveProduct: (productId: string, productName: string, rewardEligible?: boolean) => number
  removeProduct: (productId: string) => void
  recordAnalysis: (productId: string, productName: string) => number
  recordComparison: (productId: string, productName: string) => number
  completeAction: (key: string, title: string, detail: string, points: number) => number
  isSaved: (productId: string) => boolean
}

const STORAGE_KEY = 'ecomind-ai-demo-state-v2'
const initialState: StoredState = {
  authenticated: false,
  points: 0,
  wishlist: [],
  completedActions: [],
  activities: [],
}

const EcoMindContext = createContext<EcoMindContextValue | null>(null)

export function EcoMindProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? (JSON.parse(saved) as StoredState) : initialState
    } catch {
      return initialState
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const syncExtensionState = () => {
      const raw = document.documentElement.dataset.ecomindExtensionState
      if (!raw) return
      try {
        const extension = JSON.parse(raw) as ExtensionBridgeState
        setState((current) => {
          const threadlyIds = new Set(['polyester-everyday-tee', 'cotton-classic-tee', 'renew-loop-tee'])
          const extensionIds = (extension.wishlist ?? []).map((item) => item.id.replace(/^Threadly demo:/, '')).filter((id) => threadlyIds.has(id))
          const activityMap = new Map<string, ActivityItem>()
          ;[...(extension.activities ?? []), ...current.activities].forEach((activity) => activityMap.set(activity.id.replace(/-\d+$/, ''), activity))
          const activities = [...activityMap.values()].slice(0, 12)
          return {
            ...current,
            authenticated: true,
            points: activities.reduce((total, activity) => total + activity.points, 0),
            wishlist: [...new Set([...current.wishlist, ...extensionIds])],
            completedActions: [...new Set([...current.completedActions, ...(extension.completedActions ?? [])])],
            activities,
          }
        })
      } catch {
        // The bridge is optional. Ignore malformed external state and retain web state.
      }
    }
    document.addEventListener('ecomind-extension-storage', syncExtensionState)
    syncExtensionState()
    return () => document.removeEventListener('ecomind-extension-storage', syncExtensionState)
  }, [])

  const login = useCallback(() => setState((current) => ({ ...current, authenticated: true })), [])
  const logout = useCallback(() => setState((current) => ({ ...current, authenticated: false })), [])

  const awardAction = useCallback((key: string, title: string, detail: string, points: number) => {
    if (state.completedActions.includes(key)) return 0
    setState((current) => {
      if (current.completedActions.includes(key)) return current
      const activity: ActivityItem = { id: `${key}-${Date.now()}`, title, detail, points, date: 'Today' }
      return {
        ...current,
        points: current.points + points,
        completedActions: [...current.completedActions, key],
        activities: [activity, ...current.activities].slice(0, 12),
      }
    })
    return points
  }, [state.completedActions])

  const saveProduct = useCallback(
    (productId: string, productName: string, rewardEligible = true) => {
      setState((current) =>
        current.wishlist.includes(productId)
          ? current
          : { ...current, wishlist: [...current.wishlist, productId] },
      )
      return rewardEligible ? awardAction(`save-${productId}`, 'Lower-impact option saved', productName, 5) : 0
    },
    [awardAction],
  )

  const removeProduct = useCallback(
    (productId: string) => setState((current) => ({ ...current, wishlist: current.wishlist.filter((id) => id !== productId) })),
    [],
  )

  const recordAnalysis = useCallback(
    (productId: string, productName: string) =>
      awardAction(`analysis-${productId}`, 'Product analysis completed', productName, 0),
    [awardAction],
  )

  const recordComparison = useCallback(
    (productId: string, productName: string) =>
      awardAction(`compare-${productId}`, 'Greener alternative compared', productName, 5),
    [awardAction],
  )

  const value = useMemo<EcoMindContextValue>(
    () => ({
      ...state,
      login,
      logout,
      saveProduct,
      removeProduct,
      recordAnalysis,
      recordComparison,
      completeAction: awardAction,
      isSaved: (productId: string) => state.wishlist.includes(productId),
    }),
    [state, login, logout, saveProduct, removeProduct, recordAnalysis, recordComparison, awardAction],
  )

  return <EcoMindContext.Provider value={value}>{children}</EcoMindContext.Provider>
}

export function useEcoMind() {
  const context = useContext(EcoMindContext)
  if (!context) throw new Error('useEcoMind must be used inside EcoMindProvider')
  return context
}
