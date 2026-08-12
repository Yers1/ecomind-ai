import { readExtensionState, STORAGE_KEY, type ExtensionState } from './shared'
import { buildLeaderboard, getKoalaLevel, periodSummary, rankFor } from '../../shared/ecoPoints'
import { formatTrafficLightScore, getTrafficLightStatus, trafficLightAccessibleText } from '../../shared/trafficLight'

type PageState = 'checking' | 'ready' | 'possible-product' | 'analysing' | 'success' | 'missing-data' | 'low-confidence' | 'product-changed' | 'unsupported-category' | 'unsupported' | 'restricted' | 'access-error' | 'error'

interface StatusMessage {
  type: 'ECOMIND_STATUS_UPDATE' | 'ECOMIND_GET_STATUS'
  state?: PageState
  detail?: string
  score?: number | null
  range?: [number, number] | null
  grade?: string | null
  confidence?: 'High' | 'Medium' | 'Low'
  provisional?: boolean
  hasSufficientEvidence?: boolean
}

const statusCard = document.querySelector<HTMLElement>('.status-card')!
const statusText = document.querySelector<HTMLElement>('#statusText')!
const statusDetail = document.querySelector<HTMLElement>('#statusDetail')!
const retailerValue = document.querySelector<HTMLElement>('#retailerValue')!
const analyseButton = document.querySelector<HTMLButtonElement>('#analyseButton')!
const dashboardButton = document.querySelector<HTMLButtonElement>('#dashboardButton')!
const pointsValue = document.querySelector<HTMLElement>('#pointsValue')!
const trafficResult = document.querySelector<HTMLElement>('#trafficResult')!
const leaderboardButton = document.querySelector<HTMLButtonElement>('#leaderboardButton')!
const weeklyRank = document.querySelector<HTMLElement>('#weeklyRank')!
const weeklySummary = document.querySelector<HTMLElement>('#weeklySummary')!

let activeTab: chrome.tabs.Tab | undefined
let currentState: PageState = 'checking'

const labels: Record<PageState, { title: string; detail: string }> = {
  checking: { title: 'Checking current tab', detail: 'EcoMind has not read this page.' },
  ready: { title: 'Product page detected', detail: 'Ready to analyse locally after your click.' },
  'possible-product': { title: 'Possible product page', detail: 'Some details may need confirmation.' },
  analysing: { title: 'Analysing locally', detail: 'Reading product evidence from this active page.' },
  success: { title: 'Analysis complete', detail: 'Open the injected koala to review the evidence.' },
  'missing-data': { title: 'Partial information extracted', detail: 'Missing fields remain unknown and widen the range.' },
  'low-confidence': { title: 'Low-confidence analysis', detail: 'Open the koala to review or correct missing evidence.' },
  'product-changed': { title: 'Product changed', detail: 'The selected variation changed. Re-analyse before using the result.' },
  'unsupported-category': { title: 'Category not supported', detail: 'EcoMind currently scores clothing and textile products.' },
  unsupported: { title: 'No product detected', detail: 'Open a product detail page, then try again. Manual entry is available after activation.' },
  restricted: { title: 'Restricted browser page', detail: 'Chrome does not allow extensions to analyse this page. Open a normal website.' },
  'access-error': { title: 'Temporary access unavailable', detail: 'Keep this popup open and click Analyse this product again.' },
  error: { title: 'Analysis error', detail: 'The page may have changed. Try the analysis again or use manual entry.' },
}

function setStatus(state: PageState, detail?: string, result?: StatusMessage) {
  currentState = state
  statusCard.dataset.state = state
  statusText.textContent = labels[state].title
  statusDetail.textContent = detail ?? labels[state].detail
  analyseButton.disabled = ['checking', 'analysing', 'restricted'].includes(state)
  analyseButton.textContent = state === 'product-changed' ? 'Re-analyse product' : ['success', 'missing-data', 'low-confidence', 'unsupported-category'].includes(state) ? 'Open EcoMind analysis' : state === 'error' || state === 'access-error' ? 'Try analysis again' : 'Analyse this product'
  const showResult = ['success', 'missing-data', 'low-confidence', 'unsupported-category'].includes(state) && result?.confidence
  trafficResult.hidden = !showResult
  if (showResult) {
    const status = getTrafficLightStatus(result?.score ?? null, result?.hasSufficientEvidence ?? false)
    const accessible = trafficLightAccessibleText(status, result?.score ?? null, result?.provisional ?? true, result!.confidence!, result?.range)
    const icon = status.colour === 'green' ? '✓' : status.colour === 'amber' ? '−' : status.colour === 'red' ? '!' : '?'
    trafficResult.className = `popup-traffic popup-traffic--${status.colour}`
    trafficResult.setAttribute('aria-label', accessible); trafficResult.title = status.shortExplanation
    trafficResult.innerHTML = `<i>${icon}</i><span><strong>${formatTrafficLightScore(result?.score ?? null, result?.provisional ?? true, result?.range)}${result?.grade ? ` · ${result.grade}` : ''}</strong><b>${status.label}${result?.provisional && result.score !== null ? ' · Provisional' : ''}</b><small>${result!.confidence} confidence</small></span>`
  }
}

function pageHint(url?: string) {
  if (!url) return { state: 'restricted' as const, retailer: 'Unavailable' }
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return { state: 'restricted' as const, retailer: 'Restricted page' }
    if (/(^|\.)(amazon\.com|amazon\.co\.uk)$/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'Amazon · best-effort clothing support' }
    if (/(^|\.)hm\.com$/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'H&M' }
    if (/(^|\.)nike\.com$/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'Nike' }
    if (/ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'Threadly demo' }
    return { state: 'possible-product' as const, retailer: 'Multi-retailer / structured-data support' }
  } catch { return { state: 'restricted' as const, retailer: 'Unavailable' } }
}

function refreshPoints(state: ExtensionState) {
  pointsValue.textContent = String(state.points)
  const week = periodSummary(state.pointEvents, 'week'); const entries = buildLeaderboard(state.leaderboardProfile, state.pointEvents, 'week', state.points); const rank = rankFor(entries, 'week')
  weeklyRank.textContent = state.leaderboardProfile.optedIn ? `Rank #${rank}` : 'Not joined'
  weeklySummary.textContent = `${week.points} weekly EcoPoints · ${getKoalaLevel(state.points)}`
}
function getActiveTab(): Promise<chrome.tabs.Tab | undefined> { return new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]))) }
function sendToTab(message: StatusMessage): Promise<StatusMessage | undefined> {
  return new Promise((resolve) => {
    if (!activeTab?.id) return resolve(undefined)
    chrome.tabs.sendMessage(activeTab.id, message, (response) => chrome.runtime.lastError ? resolve(undefined) : resolve(response as StatusMessage | undefined))
  })
}

async function initialise() {
  refreshPoints(await readExtensionState())
  activeTab = await getActiveTab()
  const hint = pageHint(activeTab?.url)
  retailerValue.textContent = hint.retailer
  dashboardButton.disabled = !activeTab?.url || !/ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(activeTab.url)
  if (hint.state === 'restricted') return setStatus('restricted')
  const existing = await sendToTab({ type: 'ECOMIND_GET_STATUS' })
  setStatus(existing?.state ?? hint.state, existing?.detail, existing)
}

analyseButton.addEventListener('click', async () => {
  if (!activeTab?.id) return setStatus('access-error')
  if (['success', 'missing-data', 'low-confidence', 'unsupported-category'].includes(currentState)) {
    await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: currentState, detail: 'open-widget' }); window.close(); return
  }
  setStatus('analysing')
  const retry = await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: 'analysing', detail: 'rerun-analysis' })
  if (retry) return
  chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] }, () => {
    if (chrome.runtime.lastError) setStatus('access-error', `Chrome could not inject EcoMind: ${chrome.runtime.lastError.message}. Try a normal https product page.`)
  })
})

dashboardButton.addEventListener('click', () => {
  if (!activeTab?.id || !activeTab.url) return
  const dashboardUrl = new URL(activeTab.url); dashboardUrl.hash = '/dashboard'; chrome.tabs.update(activeTab.id, { url: dashboardUrl.toString() }); window.close()
})

leaderboardButton.addEventListener('click', () => {
  const base = activeTab?.url && /ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(activeTab.url) ? new URL(activeTab.url) : new URL('https://ecomind-ai-two.vercel.app')
  base.hash = '/leaderboard'; chrome.tabs.create({ url: base.toString() }); window.close()
})

chrome.runtime.onMessage.addListener((message: StatusMessage) => { if (message.type === 'ECOMIND_STATUS_UPDATE' && message.state) setStatus(message.state, message.detail, message) })
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[STORAGE_KEY]?.newValue) refreshPoints(changes[STORAGE_KEY].newValue as ExtensionState) })
void initialise()
