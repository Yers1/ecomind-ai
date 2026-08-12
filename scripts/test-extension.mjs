import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Window } from 'happy-dom'

const STORAGE_KEY = 'ecomindExtensionState'
const contentBundle = await readFile(new URL('../dist-extension/content.js', import.meta.url), 'utf8')
const persistedStorage = {}
const runtimeMessages = []
const runtimeListeners = []
const storageListeners = []

globalThis.chrome = {
  runtime: {
    lastError: null,
    onMessage: {
      addListener(listener) {
        runtimeListeners.push(listener)
      },
    },
    sendMessage(message, callback) {
      runtimeMessages.push(message)
      callback?.()
    },
  },
  storage: {
    local: {
      get(key, callback) {
        callback({ [key]: persistedStorage[key] })
      },
      set(values, callback) {
        const changes = {}
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: persistedStorage[key], newValue: value }
          persistedStorage[key] = value
        }
        for (const listener of storageListeners) listener(changes, 'local')
        callback?.()
      },
    },
    onChanged: {
      addListener(listener) {
        storageListeners.push(listener)
      },
    },
  },
}

function productMarkup() {
  return `<!doctype html><html><body>
    <section
      data-ecomind-demo-product="true"
      data-product-id="polyester-everyday-tee"
      data-currency="GBP"
      data-listing-text="Shell: 100% polyester. Packed in an individual protective polybag."
      data-materials='[{"material":"Polyester","percentage":100}]'
      data-recycled-content="0"
      data-carbon-kg="5.2"
      data-carbon-value-type="estimated"
      data-packaging="plastic-mailer"
      data-durability="62"
      data-circularity="45"
      data-source-labels='["Visible demo product listing","Local EcoMind sample textile factors"]'
      data-missing-fields='["Manufacturing location","Supplier lifecycle assessment","End-of-life guidance"]'
      data-alternative-product-id="renew-loop-tee"
    >
      <div class="product-gallery"><img src="http://example.test/product.png" alt="Demo product"></div>
      <div class="product-info"><h1>Northline Everyday Performance Tee</h1><p class="product-price">£14.99</p></div>
      <div class="store-details"><p>A lightweight everyday T-shirt.</p><p>Shell: 100% polyester. Packed in an individual protective polybag.</p></div>
    </section>
  </body></html>`
}

function installDom(html) {
  const window = new Window({ url: 'http://127.0.0.1:5173/#/demo' })
  window.document.write(html)
  globalThis.window = window
  globalThis.document = window.document
  globalThis.Event = window.Event
  globalThis.CustomEvent = window.CustomEvent
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Node = window.Node
  globalThis.ShadowRoot = window.ShadowRoot
  return window
}

function executeContentScript() {
  ;(0, eval)(contentBundle)
}

async function waitForAnalysis() {
  await new Promise((resolve) => setTimeout(resolve, 800))
}

const firstWindow = installDom(productMarkup())
executeContentScript()
await waitForAnalysis()

const injectedRoot = firstWindow.document.querySelector('#ecomind-extension-root')
assert.ok(injectedRoot?.shadowRoot, 'The content script must inject a Shadow DOM root.')
assert.match(injectedRoot.shadowRoot.textContent, /Green Score/i)
assert.match(injectedRoot.shadowRoot.textContent, /27\s*\/100/i)
assert.equal(runtimeMessages.at(-1)?.state, 'success')

injectedRoot.shadowRoot.querySelector('.save').click()
await new Promise((resolve) => setTimeout(resolve, 20))

assert.equal(persistedStorage[STORAGE_KEY].points, 35, 'A higher-impact save should not award points.')
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 1)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[0].id, 'polyester-everyday-tee')

injectedRoot.shadowRoot.querySelector('.choose').click()
await new Promise((resolve) => setTimeout(resolve, 20))
assert.equal(persistedStorage[STORAGE_KEY].points, 70)
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 2)
assert.equal(persistedStorage[STORAGE_KEY].wishlist[1].id, 'renew-loop-tee')

const refreshedWindow = installDom(productMarkup())
executeContentScript()
await waitForAnalysis()
refreshedWindow.document.querySelector('#ecomind-extension-root').shadowRoot.querySelector('.save').click()
refreshedWindow.document.querySelector('#ecomind-extension-root').shadowRoot.querySelector('.choose').click()
await new Promise((resolve) => setTimeout(resolve, 20))

assert.equal(persistedStorage[STORAGE_KEY].points, 70, 'Repeated actions must not award points twice.')
assert.equal(persistedStorage[STORAGE_KEY].wishlist.length, 2, 'Wishlist must persist without duplicates.')
assert.match(refreshedWindow.document.documentElement.dataset.ecomindExtensionState, /polyester-everyday-tee/)

const unsupportedWindow = installDom('<!doctype html><html><body><h1>Unsupported page</h1></body></html>')
executeContentScript()
await waitForAnalysis()
assert.equal(unsupportedWindow.document.querySelector('#ecomind-extension-root'), null)
assert.equal(runtimeMessages.at(-1)?.state, 'unsupported')

console.log('Extension integration checks passed: injection, score, status, storage persistence, unsupported page.')
