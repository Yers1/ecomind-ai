import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActivityItem } from '../types'

interface StoredState {
  authenticated: boolean
  points: number
  wishlist: string[]
  completedActions: string[]
  activities: ActivityItem[]
}

interface EcoMindContextValue extends StoredState {
  login: () => void
  logout: () => void
  saveProduct: (productId: string, productName: string, rewardEligible?: boolean) => number
  removeProduct: (productId: string) => void
  chooseAlternative: (productId: string, productName: string) => number
  completeAction: (key: string, title: string, detail: string, points: number) => number
  isSaved: (productId: string) => boolean
}

const STORAGE_KEY = 'ecomind-ai-demo-state-v1'
const initialState: StoredState = {
  authenticated: false,
  points: 35,
  wishlist: [],
  completedActions: [],
  activities: [
    {
      id: 'welcome',
      title: 'Demo profile started',
      detail: 'Starter points added to demonstrate koala progression.',
      points: 35,
      date: 'Today',
    },
  ],
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

  const login = useCallback(() => setState((current) => ({ ...current, authenticated: true })), [])
  const logout = useCallback(() => setState((current) => ({ ...current, authenticated: false })), [])

  const awardAction = useCallback((key: string, title: string, detail: string, points: number) => {
    let awarded = 0
    setState((current) => {
      if (current.completedActions.includes(key)) return current
      awarded = points
      const activity: ActivityItem = { id: `${key}-${Date.now()}`, title, detail, points, date: 'Today' }
      return {
        ...current,
        points: current.points + points,
        completedActions: [...current.completedActions, key],
        activities: [activity, ...current.activities].slice(0, 8),
      }
    })
    return awarded
  }, [])

  const saveProduct = useCallback(
    (productId: string, productName: string, rewardEligible = true) => {
      setState((current) =>
        current.wishlist.includes(productId)
          ? current
          : { ...current, wishlist: [...current.wishlist, productId] },
      )
      return rewardEligible ? awardAction(`save-${productId}`, 'Lower-impact product saved', productName, 15) : 0
    },
    [awardAction],
  )

  const removeProduct = useCallback(
    (productId: string) => setState((current) => ({ ...current, wishlist: current.wishlist.filter((id) => id !== productId) })),
    [],
  )

  const chooseAlternative = useCallback(
    (productId: string, productName: string) =>
      awardAction(`choose-${productId}`, 'Lower-impact option selected', productName, 35),
    [awardAction],
  )

  const value = useMemo<EcoMindContextValue>(
    () => ({
      ...state,
      login,
      logout,
      saveProduct,
      removeProduct,
      chooseAlternative,
      completeAction: awardAction,
      isSaved: (productId: string) => state.wishlist.includes(productId),
    }),
    [state, login, logout, saveProduct, removeProduct, chooseAlternative, awardAction],
  )

  return <EcoMindContext.Provider value={value}>{children}</EcoMindContext.Provider>
}

export function useEcoMind() {
  const context = useContext(EcoMindContext)
  if (!context) throw new Error('useEcoMind must be used inside EcoMindProvider')
  return context
}
