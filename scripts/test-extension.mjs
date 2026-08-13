import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Window } from 'happy-dom'

const STORAGE_KEY = 'ecomindExtensionStateV2'
const contentBundle = await readFile(new URL('../dist-extension/content.js', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../dist-extension/manifest.json', import.meta.url), 'utf8'))
assert.equal(manifest.manifest_version, 3)
assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage'])
if ('host_permissions' in manifest) {
  assert.equal(manifest.host_permissions.length, 1, 'A configured build may request only one exact Supabase origin.')
  assert.match(manifest.host_permissions[0], /^https:\/\/[a-z0-9-]+\.supabase\.co\/\*$/)
}
assert.equal('content_scripts' in manifest, false, 'Injection must happen only after the popup action.')
const persistedStorage = {}
const runtimeMessages = []
const runtimeListeners = []
const storageListeners = []

globalThis.chrome = {
  runtime: {
    lastError: null,
    onMessage: { addListener(listener) { runtimeListeners.push(listener) } },
    sendMessage(message, callback) { runtimeMessages.push(message); callback?.() },
  },
  storage: {
    local: {
      get(key, callback) { callback({ [key]: persistedStorage[key] }) },
      set(values, callback) {
        const changes = {}
        for (const [key, value] of Object.entries(values)) { changes[key] = { oldValue: persistedStorage[key], newValue: value }; persistedStorage[key] = value }
        for (const listener of storageListeners) listener(changes, 'local')
        callback?.()
      },
    },
    onChanged: { addListener(listener) { storageListeners.push(listener) } },
  },
}

async function fixture(name) { return readFile(new URL(`../tests/fixtures/${name}`, import.meta.url), 'utf8') }

function installDom(html, url) {
  const window = new Window({ url })
  window.document.write(html)
  globalThis.window = window
  globalThis.document = window.document
  globalThis.location = window.location
  globalThis.Event = window.Event
  globalThis.CustomEvent = window.CustomEvent
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Node = window.Node
  globalThis.ShadowRoot = window.ShadowRoot
  globalThis.MutationObserver = window.MutationObserver
  globalThis.KeyboardEvent = window.KeyboardEvent
  globalThis.FormData = window.FormData
  globalThis.SubmitEvent = window.SubmitEvent
  return window
}

function executeContentScript() { ;(0, eval)(contentBundle) }
async function settle() { await new Promise((resolve) => setTimeout(resolve, 40)) }
function root(window) { return window.document.querySelector('#ecomind-extension-root')?.shadowRoot }

const threadlyWindow = installDom(await fixture('threadly.html'), 'https://ecomind-ai-two.vercel.app/#/demo')
executeContentScript(); await settle()
assert.ok(root(threadlyWindow), 'The content script must inject a Shadow DOM root on Threadly.')
assert.match(root(threadlyWindow).textContent, /27\s*\/100/i)
assert.match(root(threadlyWindow).textContent, /~27\s*\/100/i)
assert.match(root(threadlyWindow).textContent, /Higher impact/i)
assert.match(root(threadlyWindow).querySelector('.traffic').getAttribute('aria-label'), /Traffic-light status: red/i)
assert.ok(root(threadlyWindow).querySelectorAll('.traffic').length >= 2, 'The analysed product and Threadly alternative must both show traffic-light results.')
assert.ok([...root(threadlyWindow).querySelectorAll('.traffic')].every((item) => item.getAttribute('aria-label')?.startsWith('Traffic-light status:')), 'Every Threadly traffic-light result needs accessible text.')
assert.match(root(threadlyWindow).textContent, /Threadly demo/i)
assert.match(root(threadlyWindow).textContent, /Record demo comparison/i)
assert.equal(runtimeMessages.at(-1)?.state, 'missing-data')
const threadlyHost = threadlyWindow.document.querySelector('#ecomind-extension-root')
assert.equal(threadlyHost.hidden, false, 'The low-key widget is visible by default after analysis.')
root(threadlyWindow).querySelector('.widget').click()
assert.ok(root(threadlyWindow).querySelector('.layer').classList.contains('open'), 'The minimised widget must expand into the drawer.')
root(threadlyWindow).querySelector('.close').click()
assert.ok(!root(threadlyWindow).querySelector('.layer').classList.contains('open'), 'The drawer must minimise without removing the widget.')
root(threadlyWindow).querySelector('.widget').click()
root(threadlyWindow).querySelector('.hide-widget').click()
assert.equal(threadlyHost.hidden, true, 'Hide on this page must conceal the widget.')
runtimeListeners[0]({ type: 'ECOMIND_STATUS_UPDATE', state: 'missing-data', detail: 'open-widget' }, null, () => {})
assert.equal(threadlyHost.hidden, false, 'The toolbar message must restore a hidden widget.')
root(threadlyWindow).querySelector('[data-mascot="panda"]').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].preferences.mascot, 'panda', 'Mascot preference must persist in chrome.storage.local.')
assert.match(root(threadlyWindow).querySelector('.widget').textContent, /🐼/, 'The selected mascot must appear in the widget.')
root(threadlyWindow).querySelector('.save').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 0)
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 1)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[0].id, 'Threadly demo:polyester-everyday-tee')
root(threadlyWindow).querySelector('.compare-threadly').click(); await settle()
root(threadlyWindow).querySelector('.save-threadly').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 10)
assert.equal(persistedStorage[STORAGE_KEY].pointEvents.filter((event) => event.points > 0).length, 2)
assert.ok(persistedStorage[STORAGE_KEY].wishlist.some((item) => item.id === 'Threadly demo:renew-loop-tee'))

const amazonWindow = installDom(await fixture('amazon-full.html'), 'https://www.amazon.co.uk/example/dp/B000FIX001')
executeContentScript(); await settle()
assert.ok(root(amazonWindow), 'Amazon analysis must inject the real widget.')
assert.match(root(amazonWindow).textContent, /Fixture Recycled Performance Tee/)
assert.match(root(amazonWindow).textContent, /amazon/i)
assert.match(root(amazonWindow).textContent, /Lower impact · Provisional/i)
assert.match(root(amazonWindow).textContent, /How to read the traffic light/i)
assert.match(root(amazonWindow).textContent, /EcoMind prototype material factors/i)
assert.match(root(amazonWindow).textContent, /Estimated carbon[\s\S]*Not disclosed/i)
assert.match(root(amazonWindow).textContent, /Help EcoMind complete this analysis/i)
assert.equal(runtimeMessages.at(-1)?.state, 'missing-data')
root(amazonWindow).querySelector('.save').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 3)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[2].retailer, 'Amazon UK')
assert.ok(persistedStorage[STORAGE_KEY].wishlist[2].materials.length > 0)

const pranaWindow = installDom(await fixture('amazon-prana-certified.html'), 'https://www.amazon.co.uk/example/dp/B0PRANAFIX')
executeContentScript(); await settle()
assert.match(root(pranaWindow).textContent, /Regenerative Organic Cotton/i)
assert.match(root(pranaWindow).textContent, /People certification/i)
assert.match(root(pranaWindow).textContent, /Fair Trade Certified/i)
assert.match(root(pranaWindow).textContent, /No verified environmental certification found; no points added or removed/i)
assert.match(root(pranaWindow).textContent, /Fulfilment packaging[\s\S]*Not disclosed/i)
assert.match(root(pranaWindow).textContent, /Manufacturer packaging[\s\S]*Not disclosed/i)

const hmWindow = installDom(await fixture('hm-product.html'), 'https://www2.hm.com/en_us/productpage.1234567890.html')
executeContentScript(); await settle()
assert.equal(root(hmWindow), undefined)
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported')
assert.match(runtimeMessages.at(-1)?.detail, /marketplace is not supported/i)

const manualWindow = installDom(await fixture('amazon-no-material.html'), 'https://www.amazon.com/example/dp/B000FIX003')
executeContentScript(); await settle()
assert.match(root(manualWindow).textContent, /Score unavailable/i)
assert.match(root(manualWindow).textContent, /Not enough information/i)
assert.equal(runtimeMessages.at(-1)?.state, 'missing-data')
const manualForm = root(manualWindow).querySelector('#manualForm')
manualForm.querySelector('[name="materialText"]').value = '70% organic cotton, 30% linen'
manualForm.querySelector('[name="recycled"]').value = '0'
manualForm.querySelector('[name="fulfilmentPackaging"]').value = 'Recycled paper delivery mailer'
manualForm.querySelector('[name="fulfilmentPackagingSource"]').value = 'Observed delivery option'
manualForm.querySelector('[name="manufacturerPackaging"]').value = 'Individual plastic polybag'
manualForm.querySelector('[name="manufacturerPackagingSource"]').value = 'Product listing'
manualForm.querySelector('[name="remember"]').checked = true
manualForm.dispatchEvent(new manualWindow.Event('submit', { bubbles: true, cancelable: true })); await settle()
assert.match(root(manualWindow).textContent, /Provided by user/i)
assert.doesNotMatch(root(manualWindow).textContent, /Score unavailable/i)
assert.ok(Object.keys(persistedStorage[STORAGE_KEY].manualCorrections).some((key) => key.includes('B000FIX003')))

const unsupportedWindow = installDom(await fixture('non-product.html'), 'https://magazine.example/article/care')
executeContentScript(); await settle()
assert.equal(root(unsupportedWindow), undefined)
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported')

const categoryWindow = installDom(await fixture('non-clothing-product.html'), 'https://electronics.example/products/phone')
executeContentScript(); await settle()
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported')
assert.equal(root(categoryWindow), undefined)

const variationWindow = installDom(await fixture('amazon-variation.html'), 'https://www.amazon.com/example/dp/B000BLUE01')
executeContentScript(); await settle()
variationWindow.document.querySelector('#productTitle').textContent = 'Fixture Tee — Red'
await settle()
assert.equal(runtimeMessages.at(-1)?.state, 'product-changed')
assert.match(root(variationWindow).textContent, /Product changed · re-analyse/i)

const refreshedAmazon = installDom(await fixture('amazon-full.html'), 'https://www.amazon.co.uk/example/dp/B000FIX001')
executeContentScript(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 10)
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 3)
assert.ok(refreshedAmazon.document.documentElement.contains(refreshedAmazon.document.querySelector('#ecomind-extension-root')))

console.log('Extension integration checks passed: Threadly Demo Mode, Amazon evidence, provisional score, manual correction, persistence, honest unsupported-marketplace and variation states.')
