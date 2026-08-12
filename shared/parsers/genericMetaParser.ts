import { applyTextEvidence, cleanText, emptyProduct, makeEvidence, parsePriceText, result, selectorAttribute, selectorText } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

function meta(document: Document, property: string) {
  return cleanText(document.querySelector(`meta[property="${property}"],meta[name="${property}"]`)?.getAttribute('content'))
}

export const genericMetaParser: ProductPageParser = {
  id: 'generic-meta',
  canParse(document, url) {
    return meta(document, 'og:type') === 'product' || Boolean(document.querySelector('[itemtype*="schema.org/Product"],[itemprop="price"]')) || /\/products?\//i.test(new URL(url).pathname)
  },
  parse(document, url) {
    const matched: string[] = []
    const retailer = meta(document, 'og:site_name') ?? new URL(url).hostname.replace(/^www\d?\./, '')
    const product = emptyProduct(url, retailer, 'generic-meta')
    product.title = meta(document, 'og:title') ?? selectorText(document, ['[itemprop="name"]', 'main h1', 'h1'], matched)
    product.description = meta(document, 'og:description') ?? selectorText(document, ['[itemprop="description"]', 'main [class*="description" i]'], matched)
    product.imageUrl = meta(document, 'og:image:secure_url') ?? meta(document, 'og:image') ?? selectorAttribute(document, ['[itemprop="image"]'], 'content', matched) ?? selectorAttribute(document, ['[itemprop="image"] img', 'main img'], 'src', matched)
    product.brand = meta(document, 'product:brand') ?? selectorText(document, ['[itemprop="brand"]'], matched)
    product.category = meta(document, 'product:category') ?? selectorText(document, ['[itemprop="category"]'], matched)
    product.productId = selectorText(document, ['[itemprop="sku"]', '[itemprop="gtin"]'], matched)
    const rawPrice = meta(document, 'product:price:amount') ?? meta(document, 'og:price:amount') ?? selectorAttribute(document, ['[itemprop="price"]'], 'content', matched) ?? selectorText(document, ['[itemprop="price"]', 'main [class*="price" i]'], matched)
    const parsedPrice = parsePriceText(rawPrice)
    product.price = parsedPrice.price
    product.currency = meta(document, 'product:price:currency') ?? meta(document, 'og:price:currency') ?? selectorAttribute(document, ['[itemprop="priceCurrency"]'], 'content', matched) ?? parsedPrice.currency
    const materialText = selectorText(document, ['[itemprop="material"]', 'main [class*="material" i]', 'main [class*="composition" i]'], matched) ?? product.description ?? ''
    const rejected = applyTextEvidence(product, materialText, meta(document, 'og:type') === 'product' ? 'meta' : 'visible-page', meta(document, 'og:type') === 'product' ? 'Open Graph product metadata' : 'HTML product metadata')
    if (product.title) product.evidence.push(makeEvidence('title', product.title, meta(document, 'og:title') ? 'meta' : 'visible-page', meta(document, 'og:title') ? 'Open Graph metadata' : 'Visible product heading', meta(document, 'og:title') ? 'high' : 'medium'))
    if (product.price !== null) product.evidence.push(makeEvidence('price', product.price, meta(document, 'product:price:amount') ? 'meta' : 'visible-page', 'Product price metadata', 'high'))
    return result(product, matched, false, { title: product.title, rawPrice, materialText }, rejected)
  },
}
