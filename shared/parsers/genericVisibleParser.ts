import { applyTextEvidence, cleanText, emptyProduct, makeEvidence, parsePriceText, result, selectorText } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

const PRODUCT_PATH = /\/(?:product|products|p|item)\//i

export const genericVisibleParser: ProductPageParser = {
  id: 'generic-visible',
  canParse(document, url) { return PRODUCT_PATH.test(new URL(url).pathname) && Boolean(document.querySelector('main h1,h1')) },
  parse(document, url) {
    const matched: string[] = []
    const product = emptyProduct(url, new URL(url).hostname.replace(/^www\./, ''), 'generic-visible')
    product.title = selectorText(document, ['main h1', 'h1'], matched)
    const main = document.querySelector('main')
    const text = cleanText(main?.textContent) ?? ''
    product.description = selectorText(document, ['main [class*="description" i]', 'main [class*="details" i]'], matched)
    const priceText = selectorText(document, ['main [class*="price" i]', '[itemprop="price"]'], matched)
    const price = parsePriceText(priceText)
    product.price = price.price
    product.currency = price.currency
    const rejected = applyTextEvidence(product, text.slice(0, 12000), 'visible-page', 'Visible product page text', 'main')
    if (product.title) product.evidence.push(makeEvidence('title', product.title, 'visible-page', 'Visible product heading', 'medium', matched[0]))
    return result(product, matched, false, { title: product.title, priceText, visibleTextSample: text.slice(0, 1000) }, rejected)
  },
}
