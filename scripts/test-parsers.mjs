import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = await build({ stdin: { contents: "export * from './shared/parsers/parserRegistry.ts'; export * from './shared/parsers/materialExtraction.ts'; export * from './shared/realProductScoring.ts'", resolveDir: root, sourcefile: 'parser-test-entry.ts', loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false })
const parsers = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

async function fixture(name, url) {
  const html = await readFile(resolve(root, 'tests', 'fixtures', name), 'utf8')
  const window = new Window({ url })
  window.document.write(html)
  return { window, parsed: parsers.parseProductPage(window.document, url) }
}

const full = await fixture('amazon-full.html', 'https://www.amazon.co.uk/example/dp/B000FIX001')
assert.equal(full.parsed.product.parserUsed, 'amazon')
assert.equal(full.parsed.product.title, 'Fixture Recycled Performance Tee')
assert.equal(full.parsed.product.price, 24.5)
assert.equal(full.parsed.product.currency, 'GBP')
assert.equal(full.parsed.product.imageUrl, 'https://example.test/tee.jpg')
assert.deepEqual(full.parsed.product.materials.map((item) => [item.name, item.percentage]), [['Recycled polyester', 95], ['Elastane', 5]])
assert.equal(full.parsed.product.recycledContentPercentage, 95)
assert.match(full.parsed.product.countryOfOrigin, /Portugal/)
assert.ok(full.parsed.product.evidence.some((item) => item.sourceType === 'amazon-selector'))
const fullScore = parsers.scoreRealProduct(full.parsed.product)
assert.equal(fullScore.canScore, true)
assert.equal(fullScore.provisional, true)
assert.ok(fullScore.range[0] < fullScore.range[1])

const partial = await fixture('amazon-partial.html', 'https://www.amazon.com/example/dp/B000FIX002')
assert.equal(partial.parsed.product.materials[0].name, 'Cotton')
assert.equal(partial.parsed.product.recycledContentPercentage, null)
assert.ok(partial.parsed.product.missingFields.includes('Packaging'))

const noMaterial = await fixture('amazon-no-material.html', 'https://www.amazon.com/example/dp/B000FIX003')
assert.equal(noMaterial.parsed.product.materials.length, 0)
assert.equal(parsers.scoreRealProduct(noMaterial.parsed.product).canScore, false)

const wording = await fixture('amazon-fabric-wording.html', 'https://www.amazon.com/example/dp/B000FIX004')
assert.deepEqual(writingNames(wording.parsed.product.materials), ['Polyester', 'Cotton'])
assert.ok(wording.parsed.product.materials.every((item) => item.percentage === null))
assert.equal(parsers.scoreRealProduct(wording.parsed.product).canScore, false, 'Qualitative materials must not be silently treated as equal shares.')

const generic = await fixture('generic-jsonld.html', 'https://independent.example/products/organic-linen-tee')
assert.equal(generic.parsed.product.parserUsed, 'generic-json-ld')
assert.equal(generic.parsed.product.brand, 'Fixture Studio')
assert.equal(generic.parsed.product.price, 42)
assert.deepEqual(writingNames(generic.parsed.product.materials), ['Organic cotton', 'Linen'])

const meta = await fixture('generic-meta.html', 'https://meta.example/product/modal-tee')
assert.equal(meta.parsed.product.parserUsed, 'generic-meta')
assert.equal(meta.parsed.product.currency, 'USD')
assert.equal(meta.parsed.product.materials[0].name, 'Viscose family')

const nonProduct = await fixture('non-product.html', 'https://magazine.example/article/care')
assert.equal(nonProduct.parsed.product.parserUsed, 'manual')
assert.equal(nonProduct.parsed.product.isProduct, false)

const threadly = await fixture('threadly.html', 'https://ecomind-ai-two.vercel.app/#/demo')
assert.equal(threadly.parsed.product.parserUsed, 'threadly')
assert.equal(threadly.parsed.product.productId, 'polyester-everyday-tee')

const malformed = await fixture('malformed-jsonld.html', 'https://broken.example/product/hemp-shirt')
assert.equal(malformed.parsed.product.parserUsed, 'generic-meta')
assert.equal(malformed.parsed.product.materials[0].name, 'Hemp')

const variation = await fixture('amazon-variation.html', 'https://www.amazon.com/example/dp/B000BLUE01')
assert.equal(variation.parsed.product.productId, 'B000BLUE01')
variation.window.document.querySelector('#productTitle').textContent = 'Fixture Tee — Red'
variation.window.document.querySelector('#ASIN').value = 'B000RED001'
const changed = parsers.parseProductPage(variation.window.document, 'https://www.amazon.com/example/dp/B000RED001')
assert.equal(changed.product.productId, 'B000RED001')
assert.notEqual(changed.product.title, variation.parsed.product.title)

const hm = await fixture('hm-product.html', 'https://www2.hm.com/en_us/productpage.1234567890.html')
assert.equal(hm.parsed.product.parserUsed, 'hm')
assert.equal(hm.parsed.product.weightGrams, 270)
assert.deepEqual(writingNames(hm.parsed.product.materials), ['Cotton', 'Elastane'])

const nike = await fixture('nike-product.html', 'https://www.nike.com/t/fixture/NK-1')
assert.equal(nike.parsed.product.parserUsed, 'nike')
assert.equal(nike.parsed.product.materials[0].percentage, 100)
assert.match(nike.parsed.product.careInstructions, /Machine wash/i)

const shopify = await fixture('shopify-product.html', 'https://fixture-blue.example/products/responsible-flannel')
assert.equal(shopify.parsed.product.parserUsed, 'shopify')
assert.equal(shopify.parsed.product.recycledContentPercentage, 40)
assert.match(shopify.parsed.product.packaging, /plastic-free/i)

const nonClothing = await fixture('non-clothing-product.html', 'https://electronics.example/products/phone')
assert.equal(nonClothing.parsed.product.isProduct, true)
assert.equal(nonClothing.parsed.product.isClothing, false)
assert.equal(parsers.scoreRealProduct(nonClothing.parsed.product).canScore, false)

const materialCases = [
  ['100% cotton', [['Cotton', 100]]],
  ['Shell: 60% cotton, 40% polyester', [['Cotton', 60], ['Polyester', 40]]],
  ['Fabric type: 95% recycled polyester, 5% spandex', [['Recycled polyester', 95], ['Elastane', 5]]],
  ['70% organic cotton / 30% linen', [['Organic cotton', 70], ['Linen', 30]]],
  ['Outer: polyester; lining: cotton', [['Polyester', null], ['Cotton', null]]],
]
for (const [text, expected] of materialCases) assert.deepEqual(parsers.extractMaterials(text).materials.map((item) => [item.name, item.percentage]), expected)
assert.equal(parsers.extractMaterials('80% cotton, 40% polyester').uncertain, true)
assert.equal(parsers.extractMaterials('Material composition not disclosed').materials.length, 0)
const uncertainScore = parsers.scoreRealProduct({ ...full.parsed.product, materials: parsers.extractMaterials('80% cotton, 40% polyester').materials, materialCompositionUncertain: true })
assert.equal(uncertainScore.canScore, false)
assert.equal(uncertainScore.score, null)

const corrected = parsers.applyManualCorrections(noMaterial.parsed.product, { title: 'User confirmed top', materialText: '70% organic cotton, 30% linen', recycledContentPercentage: 0, packaging: 'Paper or card' })
assert.equal(corrected.materials.length, 2)
assert.equal(corrected.recycledContentPercentage, 0)
assert.ok(corrected.evidence.some((item) => item.sourceType === 'manual-user-input'))
assert.equal(parsers.scoreRealProduct(corrected).canScore, true)

function writingNames(materials) { return materials.map((item) => item.name) }
console.log('Parser checks passed: Amazon, H&M, Nike, Shopify, JSON-LD, meta, Threadly, manual correction, category rejection, materials and variation fixtures.')
