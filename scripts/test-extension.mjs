import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Window } from 'happy-dom'

const STORAGE_KEY = 'ecomindExtensionStateV2'
const contentBundle = await readFile(new URL('../dist-extension/content.js', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../dist-extension/manifest.json', import.meta.url), 'utf8'))
assert.equal(manifest.manifest_version, 3)
assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage'])
assert.equal('host_permissions' in manifest, false)
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
assert.doesNotMatch(root(threadlyWindow).textContent, /~27\s*\/100/i)
assert.match(root(threadlyWindow).textContent, /Threadly demo/i)
assert.match(root(threadlyWindow).textContent, /Record demo comparison/i)
assert.equal(runtimeMessages.at(-1)?.state, 'success')
root(threadlyWindow).querySelector('.save').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 0)
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 1)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[0].id, 'Threadly demo:polyester-everyday-tee')
root(threadlyWindow).querySelector('.compare-threadly').click(); await settle()
root(threadlyWindow).querySelector('.save-threadly').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 10)
assert.ok(persistedStorage[STORAGE_KEY].wishlist.some((item) => item.id === 'Threadly demo:renew-loop-tee'))

const amazonWindow = installDom(await fixture('amazon-full.html'), 'https://www.amazon.co.uk/example/dp/B000FIX001')
executeContentScript(); await settle()
assert.ok(root(amazonWindow), 'Amazon analysis must inject the real widget.')
assert.match(root(amazonWindow).textContent, /Fixture Recycled Performance Tee/)
assert.match(root(amazonWindow).textContent, /amazon/i)
assert.match(root(amazonWindow).textContent, /Provisional Green Score/i)
assert.match(root(amazonWindow).textContent, /EcoMind prototype material factors/i)
assert.match(root(amazonWindow).textContent, /Estimated carbon[\s\S]*Not disclosed/i)
assert.match(root(amazonWindow).textContent, /Help EcoMind complete this analysis/i)
assert.equal(runtimeMessages.at(-1)?.state, 'missing-data')
root(amazonWindow).querySelector('.save').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 3)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[2].retailer, 'Amazon UK')
assert.ok(persistedStorage[STORAGE_KEY].wishlist[2].materials.length > 0)

const hmWindow = installDom(await fixture('hm-product.html'), 'https://www2.hm.com/en_us/productpage.1234567890.html')
executeContentScript(); await settle()
assert.match(root(hmWindow).textContent, /Parser: hm/i)
assert.match(root(hmWindow).textContent, /Compare across retailers/i)
root(hmWindow).querySelector('.compare-previous').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 15)
assert.equal(persistedStorage[STORAGE_KEY].activities[0].title, 'Real products compared')
root(hmWindow).querySelector('.compare-previous').click(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 15, 'Repeated comparison must not award points twice.')

const manualWindow = installDom(await fixture('amazon-no-material.html'), 'https://www.amazon.com/example/dp/B000FIX003')
executeContentScript(); await settle()
assert.match(root(manualWindow).textContent, /Score withheld/i)
assert.equal(runtimeMessages.at(-1)?.state, 'missing-data')
const manualForm = root(manualWindow).querySelector('#manualForm')
manualForm.querySelector('[name="materialText"]').value = '70% organic cotton, 30% linen'
manualForm.querySelector('[name="recycled"]').value = '0'
manualForm.querySelector('[name="packaging"]').value = 'Paper or card'
manualForm.querySelector('[name="remember"]').checked = true
manualForm.dispatchEvent(new manualWindow.Event('submit', { bubbles: true, cancelable: true })); await settle()
assert.match(root(manualWindow).textContent, /Provided by user/i)
assert.doesNotMatch(root(manualWindow).textContent, /Score withheld/i)
assert.ok(Object.keys(persistedStorage[STORAGE_KEY].manualCorrections).some((key) => key.includes('B000FIX003')))

const unsupportedWindow = installDom(await fixture('non-product.html'), 'https://magazine.example/article/care')
executeContentScript(); await settle()
assert.ok(root(unsupportedWindow), 'Manual fallback should be injected on an unsupported normal webpage.')
assert.match(root(unsupportedWindow).textContent, /Score withheld/i)
assert.match(root(unsupportedWindow).textContent, /Help EcoMind complete this analysis/i)
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported')

const categoryWindow = installDom(await fixture('non-clothing-product.html'), 'https://electronics.example/products/phone')
executeContentScript(); await settle()
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported-category')
assert.match(root(categoryWindow).textContent, /currently scores clothing and textile products/i)

const variationWindow = installDom(await fixture('amazon-variation.html'), 'https://www.amazon.com/example/dp/B000BLUE01')
executeContentScript(); await settle()
variationWindow.document.querySelector('#productTitle').textContent = 'Fixture Tee — Red'
await settle()
assert.equal(runtimeMessages.at(-1)?.state, 'product-changed')
assert.match(root(variationWindow).textContent, /Product changed · re-analyse/i)

const refreshedAmazon = installDom(await fixture('amazon-full.html'), 'https://www.amazon.co.uk/example/dp/B000FIX001')
executeContentScript(); await settle()
assert.equal(persistedStorage[STORAGE_KEY].points, 15)
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 3)
assert.ok(refreshedAmazon.document.documentElement.contains(refreshedAmazon.document.querySelector('#ecomind-extension-root')))

console.log('Extension integration checks passed: Threadly, Amazon evidence, provisional score, manual correction, cross-retailer comparison, persistence, category rejection, unsupported and variation states.')
