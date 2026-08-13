import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const target = process.argv[2] ?? 'http://127.0.0.1:4173/#/insights'
const edge = process.env.ECOMIND_BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9337
const profile = await mkdtemp(join(tmpdir(), 'ecomind-responsive-'))
const output = resolve('test-results/retailer-insights-390x844.png')
await mkdir(resolve('test-results'), { recursive: true })

const browser = spawn(edge, [`--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--headless=new', '--disable-gpu', '--no-first-run', 'about:blank'], { stdio: 'ignore' })
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms))

try {
  let version
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json()); break } catch { await wait(100) }
  }
  assert.ok(version, 'Headless browser did not start.')
  const tab = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(target)}`, { method: 'PUT' }).then((response) => response.json())
  const socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolveCommand, rejectCommand } = pending.get(message.id); pending.delete(message.id)
    if (message.error) rejectCommand(new Error(message.error.message)); else resolveCommand(message.result)
  })
  const command = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    id += 1; pending.set(id, { resolveCommand, rejectCommand }); socket.send(JSON.stringify({ id, method, params }))
  })
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await command('Page.enable')
  await command('Page.navigate', { url: target })
  await wait(1400)
  await command('Runtime.evaluate', { expression: 'scrollTo(0, 0)' })
  const evaluation = await command('Runtime.evaluate', { expression: `({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,h1:document.querySelector('h1')?.textContent,csv:document.querySelector('a[download]')?.getAttribute('href'),fictional:(document.body.textContent?.match(/Fictional/g)||[]).length})`, returnByValue: true })
  const audit = evaluation.result.value
  assert.deepEqual([audit.width, audit.height], [390, 844])
  assert.equal(audit.overflow, 0, 'The 390px page must not overflow horizontally.')
  assert.equal(audit.h1, 'Signals for better product decisions.')
  assert.equal(audit.csv, '/downloads/ecomind-retailer-insights-demo.csv')
  assert.ok(audit.fictional >= 6, 'Demo labels must remain visible throughout the page.')
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(output, Buffer.from(screenshot.data, 'base64'))
  await command('Browser.close')
  socket.close()
  console.log(`Responsive browser check passed at 390×844 with zero horizontal overflow. Screenshot: ${output}`)
} finally {
  browser.kill()
  await wait(300)
  await rm(profile, { recursive: true, force: true }).catch(() => undefined)
}
