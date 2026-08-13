import { genericJsonLdParser } from './genericJsonLdParser'
import { applyTextEvidence, cleanText, makeEvidence, result } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

function looksShopify(document: Document, url: string) {
  return /\/products\//i.test(new URL(url).pathname) && (Boolean(document.querySelector('script[src*="shopify" i],link[href*="cdn.shopify.com" i]')) || /Shopify/i.test(document.documentElement.innerHTML.slice(0, 10000)))
}

export const shopifyParser: ProductPageParser = {
  id: 'shopify',
  canParse(document, url) { return looksShopify(document, url) },
  parse(document, url) {
    const base = genericJsonLdParser.canParse(document, url) ? genericJsonLdParser.parse(document, url) : null
    const product = base?.product ?? genericJsonLdParser.parse(document, url).product
    product.parserUsed = 'shopify'
    product.retailer = cleanText(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')) ?? product.retailer
    const matched = [...(base?.diagnostics.matchedSelectors ?? [])]
    const mainText = cleanText(document.querySelector('main')?.textContent) ?? ''
    const detailSection = [...document.querySelectorAll<HTMLElement>('main div,main section')].filter((element) => element.children.length < 30 && /(?:Details|Care|Content|Composition)/i.test(element.textContent || '') && element.textContent!.length < 5000).sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0)).at(-1)
    const detailText = cleanText(detailSection?.textContent) ?? mainText.slice(0, 10000)
    if (detailSection) matched.push('Shopify visible product details')
    const rejected = applyTextEvidence(product, detailText, 'visible-page', `${product.retailer} visible product details`)
    product.careInstructions = detailText.match(/\b(Machine wash[^.·\n]*)/i)?.[1]?.trim() ?? null
    product.countryOfOrigin = detailText.match(/\bMade (?:responsibly |with love )?in\s+([A-Za-z ]+)/i)?.[1]?.trim() ?? null
    if (product.countryOfOrigin) product.evidence.push(makeEvidence('countryOfOrigin', product.countryOfOrigin, 'visible-page', `${product.retailer} visible product details`, 'high'))
    return result(product, matched, true, { ...(base?.diagnostics.rawFields ?? {}), detailText: detailText.slice(0, 2500) }, [...(base?.diagnostics.rejectedFields ?? []), ...rejected])
  },
}
