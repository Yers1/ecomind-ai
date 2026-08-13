import { mascotDetails, readExtensionState, STORAGE_KEY, writeExtensionState, type ExtensionState, type MascotPreference } from './shared'
import { getKoalaLevel, periodSummary } from '../../shared/ecoPoints'
import { formatTrafficLightScore, getTrafficLightStatus, trafficLightAccessibleText } from '../../shared/trafficLight'
import { extensionBackendConfigured, extensionRepository, extensionSupabase, importExtensionProgress, syncExtensionQueue } from './backend'

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
  baseScore?: number | null
  certificationAdjustment?: number
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
const pointsLabel = document.querySelector<HTMLElement>('#pointsLabel')!
const authStatus = document.querySelector<HTMLElement>('#authStatus')!
const otpForm = document.querySelector<HTMLFormElement>('#otpForm')!
const authEmail = document.querySelector<HTMLInputElement>('#authEmail')!
const authCode = document.querySelector<HTMLInputElement>('#authCode')!
const otpCodeRow = document.querySelector<HTMLElement>('#otpCodeRow')!
const otpButton = document.querySelector<HTMLButtonElement>('#otpButton')!
const signedInControls = document.querySelector<HTMLElement>('#signedInControls')!
const syncButton = document.querySelector<HTMLButtonElement>('#syncButton')!
const importButton = document.querySelector<HTMLButtonElement>('#importButton')!
const signOutButton = document.querySelector<HTMLButtonElement>('#signOutButton')!
const syncStatus = document.querySelector<HTMLElement>('#syncStatus')!
const mascotSelect = document.querySelector<HTMLSelectElement>('#mascotSelect')!
const brandMascot = document.querySelector<HTMLElement>('#brandMascot')!
const autoWidgetToggle = document.querySelector<HTMLInputElement>('#autoWidgetToggle')!
let otpSent = false

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
  unsupported: { title: 'Unsupported marketplace or page', detail: 'Live extraction currently supports Amazon US/UK clothing pages only. Threadly fixtures are Demo Mode.' },
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
    trafficResult.innerHTML = `<i>${icon}</i><span><strong>${formatTrafficLightScore(result?.score ?? null, result?.provisional ?? true, result?.range)}${result?.grade ? ` · ${result.grade}` : ''}</strong><b>${status.label}${result?.provisional && result.score !== null ? ' · Provisional' : ''}</b><small>${result!.confidence} confidence</small><small>${result?.baseScore === null || result?.baseScore === undefined ? 'Base score unavailable' : `Base ${result.baseScore} · verified certification +${result.certificationAdjustment ?? 0}`}</small></span>`
  }
}

function pageHint(url?: string) {
  if (!url) return { state: 'restricted' as const, retailer: 'Unavailable' }
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return { state: 'restricted' as const, retailer: 'Restricted page' }
    if (/(^|\.)(amazon\.com|amazon\.co\.uk)$/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'Amazon · best-effort clothing support' }
    if (/ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(parsed.hostname)) return { state: 'ready' as const, retailer: 'Threadly · Demo Mode only' }
    return { state: 'unsupported' as const, retailer: 'Unsupported marketplace' }
  } catch { return { state: 'restricted' as const, retailer: 'Unavailable' } }
}

function writeState(state: ExtensionState) { return new Promise<void>((resolve, reject) => chrome.storage.local.set({ [STORAGE_KEY]: state }, () => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())) }

async function refreshPoints(state: ExtensionState) {
  pointsValue.textContent = String(state.points)
  pointsLabel.textContent = 'Local EcoPoints'
  const week = periodSummary(state.pointEvents, 'week')
  if (!extensionBackendConfigured || !extensionSupabase || !extensionRepository) { authStatus.textContent = 'Backend not configured'; otpForm.hidden = true; signedInControls.hidden = true; weeklyRank.textContent = 'Setup required'; weeklySummary.textContent = `${week.points} local EcoPoints · ${getKoalaLevel(state.points)}`; return }
  const { data } = await extensionSupabase.auth.getSession(); const session = data.session
  if (!session) { authStatus.textContent = 'Not signed in'; otpForm.hidden = false; signedInControls.hidden = true; weeklyRank.textContent = 'Sign in required'; weeklySummary.textContent = `${week.points} local EcoPoints · ${getKoalaLevel(state.points)}`; return }
  if (state.backendAccountId !== session.user.id) { state.backendAccountId = session.user.id; await writeState(state) }
  authStatus.textContent = session.user.email ?? 'Signed in'; otpForm.hidden = true; signedInControls.hidden = false
  importButton.hidden = state.importedForAccounts.includes(session.user.id) || !state.pointEvents.some((event) => event.points > 0 && event.actionType !== 'legacy-demo-balance')
  const synced = await syncExtensionQueue(state)
  try { const summary = synced.summary ?? await extensionRepository.getSummary('week'); const entries = await extensionRepository.getLeaderboard('week'); const current = entries.find((entry) => entry.isCurrentUser); pointsValue.textContent = String(summary.allTimePoints); pointsLabel.textContent = 'Synced EcoPoints'; weeklyRank.textContent = current?.rank ? `Rank #${current.rank}` : 'Not opted in'; weeklySummary.textContent = `${summary.periodPoints} weekly EcoPoints · ${summary.koalaLevel}`; const pending = synced.state.syncQueue.filter((item) => item.accountId === session.user.id && item.status !== 'synced').length; syncStatus.textContent = pending ? `${pending} action${pending === 1 ? '' : 's'} still need attention.` : 'All eligible extension actions are synchronised.' } catch (error) { syncStatus.textContent = error instanceof Error ? `Backend unavailable: ${error.message}` : 'Backend unavailable.' }
}
function getActiveTab(): Promise<chrome.tabs.Tab | undefined> { return new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]))) }
function sendToTab(message: StatusMessage): Promise<StatusMessage | undefined> {
  return new Promise((resolve) => {
    if (!activeTab?.id) return resolve(undefined)
    chrome.tabs.sendMessage(activeTab.id, message, (response) => chrome.runtime.lastError ? resolve(undefined) : resolve(response as StatusMessage | undefined))
  })
}

async function initialise() {
  const state = await readExtensionState()
  await refreshPoints(state)
  const mascot = mascotDetails(state.preferences.mascot)
  mascotSelect.value = mascot.id
  brandMascot.textContent = mascot.glyph
  brandMascot.setAttribute('aria-label', `EcoMind ${mascot.label}`)
  autoWidgetToggle.checked = state.preferences.showWidgetAfterAnalysis
  activeTab = await getActiveTab()
  const hint = pageHint(activeTab?.url)
  retailerValue.textContent = hint.retailer
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

mascotSelect.addEventListener('change', async () => {
  const state = await readExtensionState()
  state.preferences.mascot = mascotSelect.value as MascotPreference
  await writeExtensionState(state)
  const mascot = mascotDetails(state.preferences.mascot)
  brandMascot.textContent = mascot.glyph
  brandMascot.setAttribute('aria-label', `EcoMind ${mascot.label}`)
  await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: currentState, detail: 'preferences-changed' })
})

autoWidgetToggle.addEventListener('change', async () => {
  const state = await readExtensionState()
  state.preferences.showWidgetAfterAnalysis = autoWidgetToggle.checked
  await writeExtensionState(state)
  await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: currentState, detail: autoWidgetToggle.checked ? 'show-widget' : 'disable-widget' })
})

dashboardButton.addEventListener('click', () => {
  if (activeTab?.id && activeTab.url && /ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(activeTab.url)) {
    const dashboardUrl = new URL(activeTab.url); dashboardUrl.hash = '/dashboard'; chrome.tabs.update(activeTab.id, { url: dashboardUrl.toString() })
  } else chrome.tabs.create({ url: 'https://ecomind-ai-two.vercel.app/#/dashboard' })
  window.close()
})

leaderboardButton.addEventListener('click', () => {
  const base = activeTab?.url && /ecomind-ai-two\.vercel\.app|localhost|127\.0\.0\.1/i.test(activeTab.url) ? new URL(activeTab.url) : new URL('https://ecomind-ai-two.vercel.app')
  base.hash = '/leaderboard'; chrome.tabs.create({ url: base.toString() }); window.close()
})

chrome.runtime.onMessage.addListener((message: StatusMessage) => { if (message.type === 'ECOMIND_STATUS_UPDATE' && message.state) setStatus(message.state, message.detail, message) })
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[STORAGE_KEY]?.newValue) void refreshPoints(changes[STORAGE_KEY].newValue as ExtensionState) })
otpForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!extensionSupabase) return; otpButton.disabled = true; syncStatus.textContent = 'Contacting authentication service…'; try { if (!otpSent) { const { error } = await extensionSupabase.auth.signInWithOtp({ email: authEmail.value.trim(), options: { shouldCreateUser: true } }); if (error) throw error; otpSent = true; otpCodeRow.hidden = false; authEmail.disabled = true; otpButton.textContent = 'Verify and sign in'; syncStatus.textContent = 'Enter the six-digit code from your email.' } else { const { error } = await extensionSupabase.auth.verifyOtp({ email: authEmail.value.trim(), token: authCode.value.trim(), type: 'email' }); if (error) throw error; await refreshPoints(await readExtensionState()) } } catch (error) { syncStatus.textContent = error instanceof Error ? error.message : 'Authentication failed.' } finally { otpButton.disabled = false } })
syncButton.addEventListener('click', async () => { syncStatus.textContent = 'Synchronising…'; await refreshPoints((await syncExtensionQueue()).state) })
importButton.addEventListener('click', async () => { const state = await readExtensionState(); const count = await importExtensionProgress(state); syncStatus.textContent = `${count} recognised local actions queued; product and browsing data were not uploaded.`; await refreshPoints((await syncExtensionQueue(state)).state) })
signOutButton.addEventListener('click', async () => { await extensionSupabase?.auth.signOut(); const state = await readExtensionState(); state.backendAccountId = null; await writeState(state); await refreshPoints(state) })
void initialise()
