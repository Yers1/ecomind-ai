import { ensureExtensionState, type ExtensionState } from './shared'
import { syncExtensionQueue } from './backend'

chrome.runtime.onInstalled.addListener(() => {
  void ensureExtensionState()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureExtensionState().then((state) => syncExtensionQueue(state))
})

chrome.storage.onChanged.addListener((changes, area) => {
  const next = changes.ecomindExtensionStateV2?.newValue as ExtensionState | undefined
  if (area === 'local' && next?.syncQueue.some((item) => item.status === 'waiting_to_sync')) void syncExtensionQueue(next)
})
