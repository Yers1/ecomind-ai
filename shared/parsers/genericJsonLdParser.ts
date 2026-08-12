import { applyTextEvidence, cleanText, emptyProduct, makeEvidence, parsePriceText, parseWeightGrams, result } from './parserUtils'
import type { ParsedProduct, ProductPageParser } from './parserTypes'

type JsonRecord = Record<string, unknown>

function asRecords(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(asRecords)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonRecord
  return [record, ...asRecords(record['@graph'])]
}

function types(record: JsonRecord) {
  const value = record['@type']
  return (Array.isArray(value) ? value : [value]).map(String)
}

export function readJsonLdProducts(document: Document) {
  const products: JsonRecord[] = []
  const rejected: string[] = []
  document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((script, index) => {
    try {
      const parsed = JSON.parse(script.textContent || 'null')
      products.push(...asRecords(parsed).filter((item) => types(item).some((type) => type === 'Product' || type === 'ProductGroup')))
    } catch {
      rejected.push(`Malformed JSON-LD ignored at script ${index + 1}.`)
    }
  })
  return { products, rejected }
}

function stringValue(value: unknown): string | null {
  if (Array.isArray(value)) return stringValue(value[0])
  if (value && typeof value === 'object') return cleanText(String((value as JsonRecord).name ?? (value as JsonRecord).url ?? ''))
  return typeof value === 'string' || typeof value === 'number' ? cleanText(String(value)) : null
}

function selectRecord(records: JsonRecord[], url: string) {
  const current = new URL(url)
  const direct = records.find((record) => types(record).includes('Product') && stringValue(record.url)?.includes(current.pathname))
  const group = records.find((record) => types(record).includes('ProductGroup'))
  if (!group) return direct ?? records.find((record) => types(record).includes('Product')) ?? null
  const variants = Array.isArray(group.hasVariant) ? group.hasVariant.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object')) : []
  const variant = variants.find((item) => {
    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers
    const variantUrl = stringValue((offer as JsonRecord | undefined)?.url) ?? stringValue(item.url)
    return variantUrl?.includes(current.pathname)
  }) ?? variants[0]
  return { ...group, ...(variant ?? {}), name: variant?.name ?? group.name, description: variant?.description ?? group.description, brand: variant?.brand ?? group.brand, category: variant?.category ?? group.category, material: variant?.material ?? group.material, productGroupID: group.productGroupID }
}

function offerRecord(record: JsonRecord) {
  const offers = Array.isArray(record.offers) ? record.offers[0] : record.offers
  return offers && typeof offers === 'object' ? offers as JsonRecord : null
}

function additionalText(record: JsonRecord) {
  const properties = Array.isArray(record.additionalProperty) ? record.additionalProperty : []
  return properties.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object')).map((item) => `${stringValue(item.name) ?? ''}: ${stringValue(item.value) ?? ''}`.trim()).filter(Boolean)
}

export const genericJsonLdParser: ProductPageParser = {
  id: 'generic-json-ld',
  canParse(document) { return readJsonLdProducts(document).products.length > 0 },
  parse(document, url) {
    const { products, rejected } = readJsonLdProducts(document)
    const record = selectRecord(products, url) ?? {}
    const offer = offerRecord(record)
    const retailer = cleanText(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')) ?? new URL(url).hostname.replace(/^www\d?\./, '')
    const product: ParsedProduct = emptyProduct(url, retailer, 'generic-json-ld')
    product.title = stringValue(record.name)
    product.description = stringValue(record.description)
    product.brand = stringValue(record.brand)
    product.category = stringValue(record.category)
    product.productId = stringValue(record.sku) ?? stringValue(record.productID) ?? stringValue(record.productGroupID) ?? stringValue(record.gtin)
    product.imageUrl = stringValue(record.image)
    const rawPrice = stringValue(offer?.price) ?? stringValue(record.price)
    const price = parsePriceText(rawPrice)
    product.price = price.price
    product.currency = stringValue(offer?.priceCurrency) ?? price.currency
    const extras = additionalText(record)
    product.featureText = extras
    const materialText = [stringValue(record.material), product.description, ...extras].filter(Boolean).join(' · ')
    rejected.push(...applyTextEvidence(product, materialText, 'json-ld', 'Schema.org Product data', 'script[type="application/ld+json"]'))
    product.weightGrams = parseWeightGrams(extras.join(' '))
    if (product.title) product.evidence.push(makeEvidence('title', product.title, 'json-ld', 'Schema.org Product data', 'high'))
    if (product.price !== null) product.evidence.push(makeEvidence('price', product.price, 'json-ld', 'Schema.org Product offer', 'high'))
    if (product.description) product.evidence.push(makeEvidence('description', product.description, 'json-ld', 'Schema.org Product data', 'high'))
    if (product.brand) product.evidence.push(makeEvidence('brand', product.brand, 'json-ld', 'Schema.org Product data', 'high'))
    return result(product, ['script[type="application/ld+json"]'], true, { name: record.name, material: record.material, offers: record.offers, additionalProperty: record.additionalProperty }, rejected)
  },
}
