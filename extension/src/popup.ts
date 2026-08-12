import { readExtensionState, STORAGE_KEY, type ExtensionState } from './shared'

type PageState = 'checking' | 'ready' | 'analysing' | 'success' | 'missing-data' | 'low-confidence' | 'unsupported' | 'error'

interface StatusMessage {
  type: 'ECOMIND_STATUS_UPDATE' | 'ECOMIND_GET_STATUS'
  state?: PageState
  detail?: string
}

const statusCard = document.querySelector<HTMLElement>('.status-card')!
const statusText = document.querySelector<HTMLElement>('#statusText')!
const statusDetail = document.querySelector<HTMLElement>('#statusDetail')!
const analyseButton = document.querySelector<HTMLButtonElement>('#analyseButton')!
const dashboardButton = document.querySelector<HTMLButtonElement>('#dashboardButton')!
const pointsValue = document.querySelector<HTMLElement>('#pointsValue')!

let activeTab: chrome.tabs.Tab | undefined
let currentState: PageState = 'checking'

const labels: Record<PageState, { title: string; detail: string }> = {
  checking: { title: 'Checking page...', detail: 'EcoMind has not read this page.' },
  ready: { title: 'Ready to analyse', detail: 'A supported EcoMind demo page is open.' },
  analysing: { title: 'Analysing locally', detail: 'Reading the visible demo product information.' },
  success: { title: 'Analysis complete', detail: 'Open the injected koala to see the Green Score.' },
  'missing-data': { title: 'Missing product data', detail: 'The score shows uncertainty and undisclosed fields.' },
  'low-confidence': { title: 'Low confidence', detail: 'Important information is missing from this demo listing.' },
  unsupported: { title: 'Unsupported page', detail: 'Open an EcoMind Amazon-style demo product page.' },
  error: { title: 'Analysis error', detail: 'EcoMind could not analyse this page. Try again.' },
}

function setStatus(state: PageState, detail?: string) {
  currentState = state
  statusCard.dataset.state = state
  statusText.textContent = labels[state].title
  statusDetail.textContent = detail ?? labels[state].detail
  analyseButton.disabled = !['ready', 'error', 'missing-data', 'low-confidence', 'success'].includes(state)
  analyseButton.textContent = state === 'success' || state === 'missing-data' || state === 'low-confidence' ? 'Show EcoMind widget' : state === 'error' ? 'Try analysis again' : 'Analyse this product'
}

function isDemoUrl(url?: string) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol.startsWith('http') && (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === 'ecomind-ai-two.vercel.app' ||
      parsed.hostname.endsWith('-yers1ts-projects.vercel.app')
    )
  } catch {
    return false
  }
}

function refreshPoints(state: ExtensionState) {
  pointsValue.textContent = String(state.points)
}

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0])))
}

function sendToTab(message: StatusMessage): Promise<StatusMessage | undefined> {
  return new Promise((resolve) => {
    if (!activeTab?.id) return resolve(undefined)
    chrome.tabs.sendMessage(activeTab.id, message, (response) => {
      if (chrome.runtime.lastError) resolve(undefined)
      else resolve(response as StatusMessage | undefined)
    })
  })
}

async function initialise() {
  refreshPoints(await readExtensionState())
  activeTab = await getActiveTab()
  dashboardButton.disabled = !isDemoUrl(activeTab?.url)
  if (!isDemoUrl(activeTab?.url)) return setStatus('unsupported')
  const existing = await sendToTab({ type: 'ECOMIND_GET_STATUS' })
  setStatus(existing?.state ?? 'ready', existing?.detail)
}

analyseButton.addEventListener('click', async () => {
  if (!activeTab?.id || !isDemoUrl(activeTab.url)) return setStatus('unsupported')
  if (['success', 'missing-data', 'low-confidence'].includes(currentState)) {
    await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: currentState, detail: 'open-widget' })
    window.close()
    return
  }
  setStatus('analysing')
  const retryResponse = await sendToTab({ type: 'ECOMIND_STATUS_UPDATE', state: 'analysing', detail: 'rerun-analysis' })
  if (retryResponse) return
  chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] }, () => {
    if (chrome.runtime.lastError) setStatus('error', chrome.runtime.lastError.message)
  })
})

dashboardButton.addEventListener('click', () => {
  if (!activeTab?.id || !activeTab.url || !isDemoUrl(activeTab.url)) return
  const dashboardUrl = new URL(activeTab.url)
  dashboardUrl.hash = '/dashboard'
  chrome.tabs.update(activeTab.id, { url: dashboardUrl.toString() })
  window.close()
})

chrome.runtime.onMessage.addListener((message: StatusMessage) => {
  if (message.type === 'ECOMIND_STATUS_UPDATE' && message.state) setStatus(message.state, message.detail)
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]?.newValue) refreshPoints(changes[STORAGE_KEY].newValue as ExtensionState)
})

void initialise()
