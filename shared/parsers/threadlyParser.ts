import { PRODUCT_RECORDS, calculateConfidence, type DataSource, type ProductRecord } from '../ecomind'
import { applyTextEvidence, cleanText, emptyProduct, makeEvidence, parsePriceText, result } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

function jsonValue<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

export const threadlyParser: ProductPageParser = {
  id: 'threadly',
  canParse(document) { return Boolean(document.querySelector('[data-ecomind-demo-product="true"]')) },
  parse(document, url) {
    const matched = ['[data-ecomind-demo-product="true"]']
    const container = document.querySelector<HTMLElement>('[data-ecomind-demo-product="true"]')!
    const local = PRODUCT_RECORDS.find((item) => item.id === container.dataset.productId)
    const product = emptyProduct(url, 'Threadly demo', 'threadly')
    product.productId = local?.id ?? container.dataset.productId ?? null
    product.title = cleanText(container.querySelector('.product-info h1')?.textContent)
    const price = parsePriceText(cleanText(container.querySelector('.product-price')?.textContent))
    product.price = price.price
    product.currency = container.dataset.currency ?? price.currency
    product.imageUrl = container.querySelector<HTMLImageElement>('.product-gallery__main img')?.src ?? null
    const paragraphs = container.querySelectorAll<HTMLElement>('.store-details p')
    product.description = cleanText(paragraphs[0]?.textContent)
    const listingText = cleanText(paragraphs[1]?.textContent) ?? container.dataset.listingText ?? ''
    product.featureText = listingText ? [listingText] : []
    const rejected = applyTextEvidence(product, listingText, 'visible-page', 'Threadly sample product listing', '.store-details')
    product.recycledContentPercentage = container.dataset.recycledContent && container.dataset.recycledContent !== 'null' ? Number(container.dataset.recycledContent) : null
    product.packaging = local?.packaging ?? { fulfilment: null, manufacturer: null }
    product.certifications = local?.certifications ?? []
    product.category = local?.category ?? 'Clothing'
    product.brand = product.title?.split(' ')[0] ?? null
    const sources = jsonValue<DataSource[]>(container.dataset.sources, local?.sources ?? [])
    for (const source of sources) product.evidence.push(makeEvidence('demo-source', source.note ?? source.label, source.type === 'listing' ? 'visible-page' : 'ecomind-estimate', source.label, source.type === 'listing' ? 'high' : 'low'))
    if (product.title) product.evidence.push(makeEvidence('title', product.title, 'visible-page', 'Threadly sample product listing', 'high', '.product-info h1'))
    return result(product, matched, false, { localProductId: local?.id, listingText, storedConfidence: local ? calculateConfidence(local as ProductRecord) : null }, rejected)
  },
}
