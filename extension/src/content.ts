import {
  readExtensionState,
  STORAGE_KEY,
  writeExtensionState,
  type ExtensionState,
  type ExtensionWishlistItem,
} from './shared'
import {
  PRODUCT_RECORDS,
  calculateConfidence,
  calculateGreenScore,
  formatScore,
  packagingLabels,
  type DataSource,
  type MaterialShare,
  type ProductRecord,
  type ScoreResult,
} from '../../shared/ecomind'

type AnalysisState = 'ready' | 'analysing' | 'success' | 'missing-data' | 'low-confidence' | 'unsupported' | 'error'

interface AnalysedProduct extends ProductRecord {
  imageUrl: string
}

interface StatusMessage {
  type: 'ECOMIND_STATUS_UPDATE' | 'ECOMIND_GET_STATUS'
  state?: AnalysisState
  detail?: string
}

const ALTERNATIVE_DATA: Record<string, AnalysedProduct> = {
  'renew-loop-tee': { ...PRODUCT_RECORDS.find((product) => product.id === 'renew-loop-tee')!, imageUrl: '' },
}

const ROOT_ID = 'ecomind-extension-root'

let analysisState: AnalysisState = 'ready'
let analysisDetail = 'Ready to analyse'
let currentProduct: AnalysedProduct | null = null
let currentResult: ScoreResult | null = null
let shadow: ShadowRoot | null = null

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function parseMaterials(listingText: string, fallback?: string): MaterialShare[] {
  const materials: MaterialShare[] = []
  const pattern = /(\d{1,3})%\s*(recycled cotton|polyester|cotton|lyocell)/gi
  for (const match of listingText.matchAll(pattern)) {
    const raw = match[2].toLowerCase()
    const material = raw === 'recycled cotton' ? 'Recycled cotton' : raw.charAt(0).toUpperCase() + raw.slice(1)
    materials.push({ material, percentage: Number(match[1]) })
  }
  if (materials.length || !fallback) return materials
  try { return JSON.parse(fallback) as MaterialShare[] } catch { return [] }
}

function numberOrNull(value?: string) {
  if (!value || value === 'null') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function jsonValue<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function extractProductFromPage(): AnalysedProduct | null {
  const container = document.querySelector<HTMLElement>('[data-ecomind-demo-product="true"]')
  if (!container) return null
  const id = container.dataset.productId ?? ''
  const local = PRODUCT_RECORDS.find((item) => item.id === id)
  if (!local) throw new Error('This demo product is not in the local extension dataset.')
  const productName = container.querySelector<HTMLElement>('.product-info h1')?.textContent?.trim() ?? ''
  const priceText = container.querySelector<HTMLElement>('.product-price')?.textContent ?? ''
  const price = Number(priceText.replace(/[^0-9.]/g, ''))
  const detailParagraphs = container.querySelectorAll<HTMLElement>('.store-details p')
  const description = detailParagraphs[0]?.textContent?.trim() ?? ''
  const listingText = detailParagraphs[1]?.textContent?.trim() ?? container.dataset.listingText ?? ''
  const materials = parseMaterials(listingText, container.dataset.materials)
  const missingFields = jsonValue<string[]>(container.dataset.missingFields, [])
  if (!productName || !Number.isFinite(price)) throw new Error('Required product name or price is unavailable.')
  const estimatedCarbonKg = numberOrNull(container.dataset.carbonKg)
  const extracted: AnalysedProduct = {
    ...local,
    productName,
    price,
    currency: container.dataset.currency === 'GBP' ? 'GBP' : local.currency,
    description,
    listingText,
    imageUrl: container.querySelector<HTMLImageElement>('.product-gallery__main img')?.src ?? '',
    materials,
    recycledContentPercentage: numberOrNull(container.dataset.recycledContent),
    estimatedCarbonKg,
    carbonValueType: (container.dataset.carbonValueType as AnalysedProduct['carbonValueType']) ?? local.carbonValueType,
    packagingType: (container.dataset.packaging as AnalysedProduct['packagingType']) || null,
    durabilityRating: numberOrNull(container.dataset.durability) ?? local.durabilityRating,
    circularityRating: numberOrNull(container.dataset.circularity) ?? local.circularityRating,
    sources: jsonValue<DataSource[]>(container.dataset.sources, local.sources),
    factorSources: jsonValue(container.dataset.factorSources, local.factorSources),
    missingFields,
    alternativeProductId: container.dataset.alternativeProductId || null,
    confidenceLevel: local.confidenceLevel,
  }
  extracted.confidenceLevel = calculateConfidence(extracted)
  return extracted
}

function notifyPopup(state: AnalysisState, detail: string) {
  analysisState = state
  analysisDetail = detail
  chrome.runtime.sendMessage({ type: 'ECOMIND_STATUS_UPDATE', state, detail } satisfies StatusMessage, () => void chrome.runtime.lastError)
}

async function broadcastStorage(state?: ExtensionState) {
  const stored = state ?? await readExtensionState()
  document.documentElement.dataset.ecomindExtensionState = JSON.stringify(stored)
  document.dispatchEvent(new Event('ecomind-extension-storage'))
  shadow?.querySelector<HTMLElement>('[data-points]')?.replaceChildren(String(stored.points))
}

function koalaMarkup() {
  return `<span class="koala" role="img" aria-label="EcoMind koala"><i class="ear left"></i><i class="ear right"></i><i class="face"><b class="eye left"></b><b class="eye right"></b><b class="nose"></b></i><i class="leaf"></i></span>`
}

const extensionStyles = `
  :host{all:initial;font-family:"Segoe UI",system-ui,sans-serif;color:#102a2c}*{box-sizing:border-box}button{font:inherit}button:focus-visible,summary:focus-visible{outline:3px solid rgba(22,115,77,.34);outline-offset:3px}
  .widget{position:fixed;z-index:2147483600;right:22px;bottom:22px;min-width:292px;min-height:76px;padding:9px 13px 9px 9px;display:flex;align-items:center;gap:11px;border:0;border-radius:17px;background:#102f30;color:#f5fff9;box-shadow:0 20px 52px rgba(8,35,31,.32);cursor:pointer;text-align:left;transition:transform .18s ease,box-shadow .18s ease}.widget:hover{transform:translateY(-3px);box-shadow:0 24px 60px rgba(8,35,31,.38)}.widget:active{transform:translateY(1px)}
  .widget .copy{display:flex;flex:1;flex-direction:column;gap:2px}.widget .copy strong{font-size:13px;color:#fff}.widget .copy small{font-size:10px;color:#abc8bb}.widget .points{font-size:10px;color:#8ecbae}.widget .score{display:grid;grid-template-columns:auto auto;align-items:baseline;padding-right:11px;border-right:1px solid rgba(255,255,255,.17)}.widget .score strong{font-size:22px}.widget .score small{font-size:9px;color:#9fc0b1}.widget .score b{grid-column:1/span 2;width:23px;height:20px;display:grid;place-items:center;border-radius:6px;background:#d9f5e3;color:#135b3d;font-size:10px}.widget .arrow{font-size:18px;color:#88d8aa}
  .koala{position:relative;width:56px;height:56px;display:inline-block;flex:none}.koala .face{position:absolute;z-index:2;inset:9px 6px 2px;border-radius:48%;background:#a9b6b1;border:1px solid #657773}.koala .ear{position:absolute;z-index:1;top:6px;width:21px;height:24px;border-radius:50%;background:#879995;border:1px solid #657773;box-shadow:inset 0 0 0 5px #c8d0cd}.koala .ear.left{left:0;transform:rotate(-10deg)}.koala .ear.right{right:0;transform:rotate(10deg)}.koala .eye{position:absolute;top:18px;width:5px;height:6px;border-radius:50%;background:#172d2d}.koala .eye.left{left:12px}.koala .eye.right{right:12px}.koala .nose{position:absolute;top:25px;left:50%;width:12px;height:14px;transform:translateX(-50%);border-radius:45% 45% 55% 55%;background:#243a39}.koala .leaf{position:absolute;z-index:4;right:-1px;top:0;width:16px;height:10px;border-radius:80% 10%;transform:rotate(-24deg);background:#16734d}
  .layer{position:fixed;z-index:2147483601;inset:0;background:rgba(9,30,29,.49);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .22s ease}.layer.open{opacity:1;pointer-events:auto}.drawer{position:absolute;top:0;right:0;width:min(100%,590px);height:100%;display:flex;flex-direction:column;background:#f5f8f6;box-shadow:-20px 0 50px rgba(8,35,31,.23);transform:translateX(100%);transition:transform .3s cubic-bezier(.16,1,.3,1)}.layer.open .drawer{transform:translateX(0)}
  .drawer-header{height:68px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d9e3dd;background:#fff}.drawer-header>div{display:flex;align-items:center;gap:9px}.drawer-header strong{font-size:14px}.confidence{font-size:10px;font-weight:750;color:#7d610d}.confidence.high{color:#0c5a3a}.confidence.low{color:#a63b36}.close{width:40px;height:40px;display:grid;place-items:center;border:1px solid #d4dfd8;border-radius:11px;background:#fff;color:#183432;font-size:22px;cursor:pointer}.drawer-body{flex:1;overflow:auto;padding:20px 20px 100px}.product{display:grid;grid-template-columns:68px 1fr;align-items:center;gap:13px}.product img{width:68px;height:68px;object-fit:cover;border:1px solid #d9e3dd;border-radius:11px}.product span{font-size:10px;color:#71817e}.product h2{margin:3px 0;font-size:17px;line-height:1.15;letter-spacing:-.025em}.product b{font-size:13px}
  .score-hero{margin-top:17px;padding:19px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:18px;border:1px solid #ead5ad;border-radius:16px;background:#fff7e9}.big-score{display:grid;grid-template-columns:auto auto;align-items:baseline;color:#a24733}.big-score strong{font-size:48px;line-height:1}.big-score small{font-size:11px}.big-score b{grid-column:1/span 2;width:34px;height:32px;display:grid;place-items:center;border-radius:9px;background:#a24733;color:#fff}.score-copy>span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#0c5a3a}.score-copy h3{margin:5px 0;font-size:15px;line-height:1.3}.score-copy p{margin:0;font-size:10px;line-height:1.45;color:#637674}
  .ai-note{margin-top:10px;padding:11px 12px;border:1px solid #ded9ec;border-radius:11px;background:#f3f0f9;color:#62527e;font-size:10px;line-height:1.45}.section{margin-top:24px}.section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.section-title h3{margin:0;font-size:14px}.section-title span{font-size:9px;color:#73837f}.breakdown{display:grid;gap:6px}.factor{padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:4px;border:1px solid #d9e3dd;border-radius:11px;background:#fff}.factor strong{font-size:11px}.factor b{font-size:11px}.factor p{grid-column:1/span 2;margin:0;color:#687976;font-size:9px;line-height:1.35}.factor small{grid-column:2;color:#83918d;font-size:8px}.evidence{display:grid;grid-template-columns:1fr 1fr;gap:8px}.evidence>div{padding:13px;border-radius:11px}.used{border:1px solid #cce5d7;background:#edf8f1}.missing{border:1px solid #ead8ba;background:#fff5e7}.evidence h4{margin:0;font-size:11px}.evidence ul{margin:8px 0 0;padding-left:15px;color:#5e6f6b}.evidence li{margin:4px 0;font-size:9px;line-height:1.3}.missing-note{margin:8px 0 0;color:#76532e;font-size:9px;line-height:1.4}.sources{display:flex;flex-wrap:wrap;gap:5px}.sources span{padding:6px 8px;border:1px solid #d9e3dd;border-radius:8px;background:#fff;color:#5f716d;font-size:9px}
  details{margin-top:18px;border:1px solid #d9e3dd;border-radius:11px;background:#fff}summary{padding:12px;font-size:11px;font-weight:750;cursor:pointer}details p{padding:0 12px 12px;margin:0;color:#5d6f6b;font-size:9px;line-height:1.5}code{color:#0c5a3a}.extraction blockquote{margin:0 12px 10px;padding:10px;background:#f5f3fa;color:#574b70;font-size:9px;line-height:1.45}.extract-grid{margin:0 12px 10px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.extract-grid div{padding:7px;border:1px solid #e2ddec;border-radius:8px}.extract-grid span{display:block;color:#7a6b91;font-size:8px}.extract-grid b{font-size:9px}.alternative{margin-top:22px;padding:15px;border-radius:16px;background:#102f30;color:#f3fff8}.alternative>span{font-size:9px;color:#8bd4aa;font-weight:750}.alternative h3{margin:5px 0 6px;font-size:14px;color:#fff}.alternative p{margin:0;color:#aac7ba;font-size:9px;line-height:1.45}.alt-metrics{margin-top:11px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:5px;border-radius:10px;background:rgba(255,255,255,.08)}.alt-metrics strong{font-size:11px}.alt-metrics b{color:#8edcaf}.alt-metrics span{grid-column:1/span 2;color:#bad0c7;font-size:9px}.alt-tradeoff{margin-top:8px!important;color:#d3e5dc!important}.comparison{display:none;margin-top:12px;padding:13px;border:1px solid #cce5d7;border-radius:11px;background:#fff}.comparison.open{display:block}.comparison h4{margin:0 0 9px;font-size:12px}.comparison-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:7px 0;border-top:1px solid #e1e8e3;font-size:9px}.comparison-row strong{color:#5c7068}.comparison-row span:last-child{color:#0c5a3a;font-weight:750}.comparison-actions{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:7px}.comparison-actions button{min-height:38px;border-radius:9px;font-size:9px;font-weight:750;cursor:pointer}.save-alt{border:0;background:#16734d;color:#fff}.view-alt{border:1px solid #9fb9aa;background:#fff;color:#134a37}.disclaimer{margin:17px 15px 0;color:#778682;font-size:9px;line-height:1.5;text-align:center}
  .drawer-footer{position:absolute;right:0;bottom:0;left:0;padding:12px 20px;display:grid;grid-template-columns:.7fr 1.3fr;gap:8px;border-top:1px solid #d9e3dd;background:rgba(255,255,255,.96)}.drawer-footer button{min-height:45px;border-radius:11px;font-weight:750;cursor:pointer}.save{border:1px solid #cbd8d0;background:#fff;color:#173b32}.compare{border:0;background:#16734d;color:#fff}.save:hover{border-color:#16734d}.compare:hover{background:#0c5a3a}.success-note{position:fixed;z-index:2147483602;right:22px;bottom:110px;max-width:330px;padding:12px 14px;border-radius:11px;background:#173b32;color:#fff;box-shadow:0 14px 32px rgba(8,35,31,.28);font-size:11px}
  @media(max-width:620px){.widget{right:10px;bottom:10px;left:10px}.drawer{width:100%}.drawer-body{padding-inline:13px}.score-hero{grid-template-columns:1fr}.evidence{grid-template-columns:1fr}.drawer-footer{padding-inline:13px}}
  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`

function renderExtension(product: AnalysedProduct, result: ScoreResult, state: ExtensionState) {
  document.getElementById(ROOT_ID)?.remove()
  const host = document.createElement('div')
  host.id = ROOT_ID
  host.setAttribute('aria-label', 'EcoMind AI extension analysis')
  document.documentElement.appendChild(host)
  shadow = host.attachShadow({ mode: 'open' })
  const alternative = product.alternativeProductId ? ALTERNATIVE_DATA[product.alternativeProductId] : null
  const alternativeScore = alternative ? calculateGreenScore(alternative) : null
  const scoreTone = result.score >= 65 ? '#16734d' : result.score >= 45 ? '#87640f' : '#a24733'
  const factors = result.breakdown.map((item) => `<article class="factor"><strong>${escapeHtml(item.label)}</strong><b>${item.score === null ? 'Not disclosed' : `${Math.round(item.score)}/100`}</b><p>${escapeHtml(item.detail)}</p><small>${Math.round(item.weight * 100)}% weight</small></article>`).join('')
  const missing = product.missingFields.length ? product.missingFields.map((field) => `<li>${escapeHtml(field)}: Not disclosed</li>`).join('') : '<li>No major gaps in this demo listing.</li>'
  const sources = product.sources.map((source) => `<span title="${escapeHtml(source.note ?? '')}">${escapeHtml(source.label)} · ${escapeHtml(source.type.replaceAll('-', ' '))}</span>`).join('')
  const comparisonMarkup = alternative && alternativeScore ? `<div class="comparison"><h4>Side-by-side evidence</h4><div class="comparison-row"><strong>Product</strong><span>${escapeHtml(product.shortName)}</span><span>${escapeHtml(alternative.shortName)}</span></div><div class="comparison-row"><strong>Green Score</strong><span>${formatScore(result)}/100</span><span>${formatScore(alternativeScore)}/100</span></div><div class="comparison-row"><strong>Materials</strong><span>${escapeHtml(product.materials.map((item) => `${item.percentage}% ${item.material}`).join(', '))}</span><span>${escapeHtml(alternative.materials.map((item) => `${item.percentage}% ${item.material}`).join(', '))}</span></div><div class="comparison-row"><strong>Price</strong><span>£${product.price.toFixed(2)}</span><span>£${alternative.price.toFixed(2)}</span></div><div class="comparison-actions"><button class="view-alt" type="button">View greener product</button><button class="save-alt" type="button">Save lower-impact option</button></div></div>` : ''
  const altMarkup = alternative && alternativeScore ? `<article class="alternative"><span>LOWER-IMPACT LOCAL MATCH</span><h3>${escapeHtml(alternative.productName)}</h3><p>Here is a lower-impact option at a similar price. Affordability and practical needs still matter.</p><div class="alt-metrics"><strong>£${alternative.price.toFixed(2)}</strong><b>${formatScore(alternativeScore)}/100 ${alternativeScore.grade}</b><span>${escapeHtml(alternative.materials.map((item) => `${item.percentage}% ${item.material}`).join(', '))}</span></div><p class="alt-tradeoff"><strong>Trade-off:</strong> ${escapeHtml(alternative.tradeOff)}</p></article>${comparisonMarkup}` : `<article class="alternative"><span>LOCAL DATASET</span><h3>Best local match</h3><p>No stronger alternative was found. Repairing, reusing or skipping a new purchase can also reduce impact.</p></article>`
  shadow.innerHTML = `<style>${extensionStyles}.big-score{color:${scoreTone}}.big-score b{background:${scoreTone}}</style>
    <button class="widget" type="button" aria-label="Open EcoMind analysis. ${result.provisional ? 'Provisional Green Score approximately' : 'Green Score'} ${result.score} out of 100, grade ${result.grade}">${koalaMarkup()}<span class="score"><strong>${formatScore(result)}</strong><small>/100</small><b>${result.grade}</b></span><span class="copy"><strong>${escapeHtml(result.status)}</strong><small>${escapeHtml(product.confidenceLevel)} confidence</small><span class="points"><span data-points>${state.points}</span> demo EcoPoints</span></span><span class="arrow">→</span></button>
    <div class="layer" role="presentation"><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="ecomind-analysis-title"><header class="drawer-header"><div><strong>EcoMind analysis</strong><span class="confidence ${product.confidenceLevel.toLowerCase()}">${escapeHtml(product.confidenceLevel)} confidence</span></div><button class="close" type="button" aria-label="Close EcoMind analysis">×</button></header><div class="drawer-body">
      <section class="product">${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.productName)}">` : ''}<div><span>Visible demo listing</span><h2 id="ecomind-analysis-title">${escapeHtml(product.productName)}</h2><b>£${product.price.toFixed(2)}</b></div></section>
      <section class="score-hero"><div class="big-score"><strong>${formatScore(result)}</strong><small>/100</small><b>${result.grade}</b></div><div class="score-copy"><span>${escapeHtml(result.status)}</span><h3>${escapeHtml(result.explanation)}</h3><p>${result.range ? `Estimated range ${result.range.min}–${result.range.max}/100; unknown is not treated as zero.` : 'Estimated from available demo product information.'}</p></div></section>
      <div class="ai-note"><strong>Local interpretation.</strong> EcoMind extracts the visible listing fields. The published deterministic methodology calculates the numeric score.</div>
      <details class="extraction"><summary>See what AI extracted</summary><blockquote>“${escapeHtml(product.listingText)}”</blockquote><div class="extract-grid"><div><span>Material</span><b>${escapeHtml(product.materials.map((item) => item.material).join(', ') || 'Not disclosed')}</b></div><div><span>Percentage</span><b>${escapeHtml(product.materials.map((item) => `${item.percentage}%`).join(', ') || 'Not disclosed')}</b></div><div><span>Packaging</span><b>${product.packagingType ? escapeHtml(packagingLabels[product.packagingType]) : 'Not disclosed'}</b></div><div><span>Confidence</span><b>${escapeHtml(product.confidenceLevel)}</b></div><div><span>Manufacturing location</span><b>Not disclosed</b></div><div><span>Lifecycle assessment</span><b>Not disclosed</b></div></div><p>Simulated AI-assisted extraction structures only visible fields. It does not invent missing environmental facts.</p></details>
      <section class="section"><div class="section-title"><h3>Score breakdown</h3><span>Weighted to 100</span></div><div class="breakdown">${factors}</div></section>
      <section class="section"><div class="section-title"><h3>Evidence and missing data</h3><span>${escapeHtml(product.confidenceLevel)} confidence</span></div><div class="evidence"><div class="used"><h4>Information used</h4><ul><li>${escapeHtml(product.materials.map((item) => `${item.percentage}% ${item.material}`).join(', ') || 'Materials: Not disclosed')}</li><li>${product.estimatedCarbonKg === null ? 'Carbon: Not disclosed' : `Carbon: about ${product.estimatedCarbonKg.toFixed(1)} kg CO2e (${escapeHtml(product.carbonValueType)})`}</li><li>${product.packagingType ? escapeHtml(packagingLabels[product.packagingType]) : 'Packaging: Not disclosed'}</li></ul></div><div class="missing"><h4>Missing information</h4><ul>${missing}</ul>${product.missingFields.length ? '<p class="missing-note">Missing disclosure does not prove poor performance; it lowers confidence.</p>' : ''}</div></div></section>
      <section class="section"><div class="section-title"><h3>Local data sources</h3><span>No external requests</span></div><div class="sources">${sources}</div></section>
      <details><summary>How the Green Score is calculated</summary><p><code>Materials × 35% + carbon × 25% + recycled content × 20% + durability and circularity × 10% + packaging × 10%</code><br><br>Confidence stays separate from the score. This prototype is not a certification.</p></details>
      ${altMarkup}<p class="disclaimer">Scores are estimates, not official certifications. Product listings can be incomplete or incorrect. Product information never leaves this browser.</p>
    </div><footer class="drawer-footer"><button class="save" type="button">Save item</button><button class="compare" type="button" ${alternative ? '' : 'disabled'}>${alternative ? 'Compare greener alternative' : 'No alternative needed'}</button></footer></aside></div>`

  const layer = shadow.querySelector<HTMLElement>('.layer')!
  const widget = shadow.querySelector<HTMLButtonElement>('.widget')!
  const close = shadow.querySelector<HTMLButtonElement>('.close')!
  const openDrawer = () => { layer.classList.add('open'); document.body.inert = true; close.focus() }
  const closeDrawer = () => { layer.classList.remove('open'); document.body.inert = false; widget.focus() }
  widget.addEventListener('click', openDrawer)
  close.addEventListener('click', closeDrawer)
  layer.addEventListener('click', (event) => { if (event.target === layer) closeDrawer() })
  shadow.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent) || !layer.classList.contains('open')) return
    if (event.key === 'Escape') return closeDrawer()
    if (event.key !== 'Tab') return
    const focusable = [...shadow!.querySelectorAll<HTMLElement>('button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && shadow!.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && shadow!.activeElement === last) { event.preventDefault(); first.focus() }
  })
  shadow.querySelector<HTMLButtonElement>('.save')!.addEventListener('click', () => void saveProduct(product, result))
  shadow.querySelector<HTMLButtonElement>('.compare')!.addEventListener('click', () => { if (alternative) { shadow?.querySelector('.comparison')?.classList.add('open'); void recordComparison(product, alternative) } })
  shadow.querySelector<HTMLButtonElement>('.save-alt')?.addEventListener('click', () => { if (alternative && alternativeScore) void saveProduct(alternative, alternativeScore) })
  shadow.querySelector<HTMLButtonElement>('.view-alt')?.addEventListener('click', () => { if (alternative) { document.dispatchEvent(new CustomEvent('ecomind-view-product', { detail: { productId: alternative.id } })); closeDrawer() } })
}

function showToast(message: string) {
  if (!shadow) return
  shadow.querySelector('.success-note')?.remove()
  const note = document.createElement('div')
  note.className = 'success-note'
  note.setAttribute('role', 'status')
  note.textContent = message
  shadow.appendChild(note)
  window.setTimeout(() => note.remove(), 3200)
}

function wishlistItem(product: AnalysedProduct, result: ScoreResult): ExtensionWishlistItem {
  return { id: product.id, productName: product.productName, price: product.price, currency: product.currency, score: result.score, grade: result.grade, confidenceLevel: product.confidenceLevel, alternativeAvailable: Boolean(product.alternativeProductId) }
}

async function saveProduct(product: AnalysedProduct, result: ScoreResult) {
  const state = await readExtensionState()
  const alreadySaved = state.wishlist.some((item) => item.id === product.id)
  if (!alreadySaved) state.wishlist.push(wishlistItem(product, result))
  const actionKey = `save-${product.id}`
  const eligible = result.score >= 65 && !state.completedActions.includes(actionKey)
  if (eligible) {
    state.points += 5
    state.completedActions.push(actionKey)
    state.activities.unshift({ id: `${actionKey}-${Date.now()}`, title: 'Lower-impact option saved', detail: product.productName, points: 5, date: 'Today' })
  }
  await writeExtensionState(state)
  await broadcastStorage(state)
  showToast(alreadySaved ? 'Already saved to the extension wishlist.' : eligible ? 'Saved. +5 demo EcoPoints.' : 'Saved locally. No purchase is assumed.')
}

async function recordComparison(product: AnalysedProduct, alternative: AnalysedProduct) {
  const state = await readExtensionState()
  const actionKey = `compare-${product.id}`
  const eligible = !state.completedActions.includes(actionKey)
  if (eligible) {
    state.points += 5
    state.completedActions.push(actionKey)
    state.activities.unshift({ id: `${actionKey}-${Date.now()}`, title: 'Greener alternative compared', detail: alternative.productName, points: 5, date: 'Today' })
  }
  await writeExtensionState(state)
  await broadcastStorage(state)
  showToast(eligible ? 'Comparison opened. +5 demo EcoPoints.' : 'Comparison reward already recorded.')
}

function recordAnalysis(state: ExtensionState, product: AnalysedProduct) {
  const actionKey = `analysis-${product.id}`
  if (state.completedActions.includes(actionKey)) return
  state.completedActions.push(actionKey)
  state.activities.unshift({ id: `${actionKey}-${Date.now()}`, title: 'Product analysis completed', detail: product.productName, points: 0, date: 'Today' })
}

async function runAnalysis() {
  try {
    notifyPopup('analysing', 'Reading the visible demo product information locally.')
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    currentProduct = extractProductFromPage()
    if (!currentProduct) {
      notifyPopup('unsupported', 'This page is not an EcoMind demo product page.')
      return
    }
    currentResult = calculateGreenScore(currentProduct)
    const state = await readExtensionState()
    recordAnalysis(state, currentProduct)
    await writeExtensionState(state)
    renderExtension(currentProduct, currentResult, state)
    await broadcastStorage(state)
    const nextState: AnalysisState = currentProduct.confidenceLevel === 'Low' ? 'low-confidence' : currentResult.provisional ? 'missing-data' : 'success'
    const detail = nextState === 'low-confidence' ? 'Analysis complete with low confidence and visible data gaps.' : nextState === 'missing-data' ? 'Analysis complete, but important product fields are not disclosed.' : 'Analysis complete. Click the injected koala for details.'
    notifyPopup(nextState, detail)
  } catch (error) {
    notifyPopup('error', error instanceof Error ? error.message : 'Local product analysis failed.')
  }
}

chrome.runtime.onMessage.addListener((message: StatusMessage, _sender, sendResponse) => {
  if (message.type === 'ECOMIND_GET_STATUS') {
    sendResponse({ type: 'ECOMIND_STATUS_UPDATE', state: analysisState, detail: analysisDetail } satisfies StatusMessage)
  }
  if (message.type === 'ECOMIND_STATUS_UPDATE' && message.detail === 'open-widget') {
    shadow?.querySelector<HTMLElement>('.layer')?.classList.add('open')
    document.body.inert = true
    shadow?.querySelector<HTMLButtonElement>('.close')?.focus()
    sendResponse({ type: 'ECOMIND_STATUS_UPDATE', state: analysisState, detail: analysisDetail } satisfies StatusMessage)
  }
  if (message.type === 'ECOMIND_STATUS_UPDATE' && message.detail === 'rerun-analysis') {
    void runAnalysis()
    sendResponse({ type: 'ECOMIND_STATUS_UPDATE', state: 'analysing', detail: 'Analysis restarted locally.' } satisfies StatusMessage)
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]?.newValue) void broadcastStorage(changes[STORAGE_KEY].newValue as ExtensionState)
})

const extensionWindow = window as Window & { __ECOMIND_CONTENT_LOADED__?: boolean }
if (!extensionWindow.__ECOMIND_CONTENT_LOADED__) {
  extensionWindow.__ECOMIND_CONTENT_LOADED__ = true
  void runAnalysis()
}
