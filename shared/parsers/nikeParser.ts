import { genericJsonLdParser } from './genericJsonLdParser'
import { applyTextEvidence, cleanText, makeEvidence, parsePriceText, result, selectorAttribute } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

export const nikeParser: ProductPageParser = {
  id: 'nike',
  canParse(_document, url) { return /(^|\.)nike\.com$/i.test(new URL(url).hostname) && /\/t\//i.test(new URL(url).pathname) },
  parse(document, url) {
    const base = genericJsonLdParser.canParse(document, url) ? genericJsonLdParser.parse(document, url) : null
    const product = base?.product ?? genericJsonLdParser.parse(document, url).product
    product.parserUsed = 'nike'
    product.retailer = 'Nike'
    const matched = [...(base?.diagnostics.matchedSelectors ?? [])]
    const headings = [...document.querySelectorAll<HTMLElement>('h2,h3,h4')]
    const productDetailsHeading = headings.find((heading) => /^Product Details$/i.test(cleanText(heading.textContent) ?? ''))
    const detailsContainer = productDetailsHeading?.parentElement
    const detailsText = cleanText(detailsContainer?.textContent) ?? cleanText(document.querySelector('main')?.textContent) ?? ''
    if (detailsContainer) matched.push('Nike Product Details section')
    const rejected = applyTextEvidence(product, detailsText, 'visible-page', 'Nike Product Details section')
    product.careInstructions = detailsText.match(/\b(Machine wash(?: [^\n·]*)?)/i)?.[1] ?? (/machine wash/i.test(detailsText) ? 'Machine wash' : null)
    product.countryOfOrigin = /\bImported\b/i.test(detailsText) ? 'Imported; country not disclosed' : null
    product.productId = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? product.productId
    product.imageUrl = product.imageUrl ?? selectorAttribute(document, ['meta[property="og:image"]'], 'content', matched)
    if (product.price === null) {
      const priceText = cleanText(document.querySelector('main')?.textContent)?.match(/[$£€]\s?\d+(?:[.,]\d{2})?/)?.[0]
      const price = parsePriceText(priceText)
      product.price = price.price
      product.currency = price.currency
    }
    if (product.careInstructions) product.evidence.push(makeEvidence('careInstructions', product.careInstructions, 'visible-page', 'Nike Product Details section', 'high'))
    return result(product, matched, true, { ...(base?.diagnostics.rawFields ?? {}), detailsText: detailsText.slice(0, 1800) }, [...(base?.diagnostics.rejectedFields ?? []), ...rejected])
  },
}
