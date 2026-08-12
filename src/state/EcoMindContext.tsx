import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ECO_POINT_RULES, addPointEvent, createPointEvent, migrateLegacyPointEvents, neutralNickname, periodSummary, type EcoPointActionType, type EcoPointSource, type LeaderboardProfile, type PointEvent } from '../../shared/ecoPoints'
import type { ActivityItem } from '../types'

interface StoredState {
  schemaVersion: 3
  authenticated: boolean
  points: number
  wishlist: string[]
  completedActions: string[]
  activities: ActivityItem[]
  pointEvents: PointEvent[]
  leaderboardProfile: LeaderboardProfile
}

interface ExtensionBridgeState {
  points?: number
  wishlist?: Array<{ id: string }>
  completedActions?: string[]
  activities?: ActivityItem[]
  pointEvents?: PointEvent[]
}

type RecordEcoAction = { key: string; actionType: EcoPointActionType; title: string; detail: string; source?: EcoPointSource; selfReported?: boolean; points?: number }

interface EcoMindContextValue extends StoredState {
  login: () => void
  logout: () => void
  saveProduct: (productId: string, productName: string, rewardEligible?: boolean) => number
  removeProduct: (productId: string) => void
  recordAnalysis: (productId: string, productName: string) => number
  recordComparison: (productId: string, productName: string) => number
  completeAction: (key: string, title: string, detail: string, points: number) => number
  recordEcoAction: (input: RecordEcoAction) => number
  setLeaderboardProfile: (profile: LeaderboardProfile) => void
  isSaved: (productId: string) => boolean
  weeklyPoints: number
  weeklyActions: number
}

const STORAGE_KEY = 'ecomind-ai-demo-state-v2'
const initialState: StoredState = { schemaVersion: 3, authenticated: false, points: 0, wishlist: [], completedActions: [], activities: [], pointEvents: [], leaderboardProfile: { optedIn: false, displayName: neutralNickname(), joinedAt: null } }
const EcoMindContext = createContext<EcoMindContextValue | null>(null)

function migrateState(value: Partial<StoredState> & { schemaVersion?: number }): StoredState {
  const migratedEvents = migrateLegacyPointEvents(value.pointEvents, value.points)
  return { ...initialState, ...value, schemaVersion: 3, wishlist: Array.isArray(value.wishlist) ? value.wishlist : [], completedActions: Array.isArray(value.completedActions) ? value.completedActions : [], activities: Array.isArray(value.activities) ? value.activities : [], pointEvents: migratedEvents, leaderboardProfile: { ...initialState.leaderboardProfile, ...(value.leaderboardProfile ?? {}) } }
}

export function EcoMindProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(() => { try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? migrateState(JSON.parse(saved)) : initialState } catch { return initialState } })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state])

  useEffect(() => {
    const syncExtensionState = () => {
      const raw = document.documentElement.dataset.ecomindExtensionState; if (!raw) return
      try {
        const extension = JSON.parse(raw) as ExtensionBridgeState
        setState((current) => {
          const threadlyIds = new Set(['polyester-everyday-tee', 'cotton-classic-tee', 'renew-loop-tee'])
          const extensionIds = (extension.wishlist ?? []).map((item) => item.id.replace(/^Threadly demo:/, '')).filter((id) => threadlyIds.has(id))
          const eventMap = new Map(current.pointEvents.map((event) => [event.deduplicationKey, event])); (extension.pointEvents ?? []).forEach((event) => eventMap.set(event.deduplicationKey, event))
          const activityMap = new Map<string, ActivityItem>(); [...(extension.activities ?? []), ...current.activities].forEach((activity) => activityMap.set(activity.id.replace(/-\d+$/, ''), activity))
          const pointEvents = [...eventMap.values()]
          return { ...current, authenticated: true, points: Math.max(current.points, extension.points ?? 0, pointEvents.reduce((total, event) => total + event.points, 0)), wishlist: [...new Set([...current.wishlist, ...extensionIds])], completedActions: [...new Set([...current.completedActions, ...(extension.completedActions ?? [])])], activities: [...activityMap.values()].slice(0, 40), pointEvents }
        })
      } catch { /* Optional bridge: preserve local state if malformed. */ }
    }
    document.addEventListener('ecomind-extension-storage', syncExtensionState); syncExtensionState(); return () => document.removeEventListener('ecomind-extension-storage', syncExtensionState)
  }, [])

  const login = useCallback(() => setState((current) => ({ ...current, authenticated: true })), [])
  const logout = useCallback(() => setState((current) => ({ ...current, authenticated: false })), [])
  const setLeaderboardProfile = useCallback((profile: LeaderboardProfile) => setState((current) => ({ ...current, leaderboardProfile: profile })), [])

  const recordEcoAction = useCallback((input: RecordEcoAction) => {
    const points = input.points ?? (input.actionType === 'analysis' || input.actionType === 'legacy-demo-balance' ? 0 : ECO_POINT_RULES[input.actionType])
    let awarded = 0
    setState((current) => {
      const event = createPointEvent({ actionType: input.actionType, points, source: input.source ?? 'web', deduplicationKey: input.key, title: input.title, detail: input.detail, selfReported: input.selfReported ?? false })
      const pointEvents = addPointEvent(current.pointEvents, event)
      if (pointEvents === current.pointEvents) return current
      awarded = points
      const activity: ActivityItem = { id: event.id, title: `${input.title}${event.selfReported ? ' · Self-reported' : ''}`, detail: input.detail, points, date: 'Today', timestamp: event.timestamp }
      return { ...current, authenticated: true, points: current.points + points, completedActions: [...new Set([...current.completedActions, input.key])], activities: [activity, ...current.activities].slice(0, 40), pointEvents }
    })
    return awarded
  }, [])

  const saveProduct = useCallback((productId: string, productName: string, rewardEligible = true) => {
    setState((current) => current.wishlist.includes(productId) ? current : { ...current, wishlist: [...current.wishlist, productId] })
    return rewardEligible ? recordEcoAction({ key: `save-${productId}`, actionType: 'saveLowerImpactOption', title: 'Lower-impact option saved', detail: productName }) : 0
  }, [recordEcoAction])
  const removeProduct = useCallback((productId: string) => setState((current) => ({ ...current, wishlist: current.wishlist.filter((id) => id !== productId) })), [])
  const recordAnalysis = useCallback((productId: string, productName: string) => recordEcoAction({ key: `analysis-${productId}`, actionType: 'analysis', title: 'Product analysis completed', detail: productName, points: 0 }), [recordEcoAction])
  const recordComparison = useCallback((productId: string, productName: string) => recordEcoAction({ key: `compare-${productId}`, actionType: 'compareGreenerAlternative', title: 'Greener alternative compared', detail: productName }), [recordEcoAction])
  const completeAction = useCallback((key: string, title: string, detail: string, points: number) => {
    const actionType: EcoPointActionType = points === ECO_POINT_RULES.repairOrReuseItem ? 'repairOrReuseItem' : points === ECO_POINT_RULES.avoidUnnecessaryPurchase ? 'avoidUnnecessaryPurchase' : points === ECO_POINT_RULES.completeWeeklyChallenge ? 'completeWeeklyChallenge' : 'chooseLowerImpactOption'
    return recordEcoAction({ key, actionType, title, detail, points, source: 'self-reported', selfReported: true })
  }, [recordEcoAction])

  const weekly = periodSummary(state.pointEvents, 'week')
  const value = useMemo<EcoMindContextValue>(() => ({ ...state, login, logout, saveProduct, removeProduct, recordAnalysis, recordComparison, completeAction, recordEcoAction, setLeaderboardProfile, isSaved: (productId) => state.wishlist.includes(productId), weeklyPoints: weekly.points, weeklyActions: weekly.actions }), [state, login, logout, saveProduct, removeProduct, recordAnalysis, recordComparison, completeAction, recordEcoAction, setLeaderboardProfile, weekly.points, weekly.actions])
  return <EcoMindContext.Provider value={value}>{children}</EcoMindContext.Provider>
}

export function useEcoMind() { const context = useContext(EcoMindContext); if (!context) throw new Error('useEcoMind must be used inside EcoMindProvider'); return context }
