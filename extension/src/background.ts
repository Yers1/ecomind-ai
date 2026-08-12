import { ensureExtensionState } from './shared'

chrome.runtime.onInstalled.addListener(() => {
  void ensureExtensionState()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureExtensionState()
})
