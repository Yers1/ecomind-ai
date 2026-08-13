import { applyTextEvidence, cleanText, emptyProduct, makeEvidence, parsePriceText, parseWeightGrams, result, selectorAttribute, selectorText } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

export const AMAZON_HOSTS = /(^|\.)(amazon\.com|amazon\.co\.uk)$/i

export const AMAZON_SELECTORS = {
  title: ['#productTitle', '#title'],
  image: ['#landingImage', '#imgBlkFront'],
  price: ['#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice'],
  features: ['#feature-bullets', '#productFactsDesktopExpander', '#productFactsMobileExpander'],
  description: ['#productDescription', '#aplus'],
  details: ['#productFactsDesktopExpander', '#detailBullets_feature_div', '#detailBulletsWrapper_feature_div', '#productDetails_detailBullets_sections1', '#productDetails_techSpec_section_1', '#productOverview_feature_div'],
} as const

function labelledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label.replace(/\s+/g, '\\s+')}\\s*:?\\s*([^\\n]{2,250})`, 'i')
    const match = text.match(pattern)
    if (match) return cleanText(match[1])
  }
  return null
}

export const amazonParser: ProductPageParser = {
  id: 'amazon',
  canParse(_document, url) { return AMAZON_HOSTS.test(new URL(url).hostname) && /\/(?:dp|gp\/product)\//i.test(new URL(url).pathname) },
  parse(document, url) {
    const matched: string[] = []
    const product = emptyProduct(url, new URL(url).hostname.endsWith('.co.uk') ? 'Amazon UK' : 'Amazon', 'amazon')
    product.title = selectorText(document, [...AMAZON_SELECTORS.title], matched)
    product.imageUrl = selectorAttribute(document, [...AMAZON_SELECTORS.image], 'src', matched) ?? selectorAttribute(document, [...AMAZON_SELECTORS.image], 'data-old-hires', matched)
    const priceText = selectorText(document, [...AMAZON_SELECTORS.price], matched)
    const price = parsePriceText(priceText)
    product.price = price.price
    product.currency = price.currency
    product.productId = document.querySelector<HTMLInputElement>('input#ASIN')?.value || new URL(url).pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1] || null
    product.brand = selectorText(document, ['#bylineInfo', '#brand'], matched)?.replace(/^Visit the | Store$/gi, '') ?? null
    product.category = selectorText(document, ['#wayfinding-breadcrumbs_feature_div', '#nav-subnav'], matched)
    product.description = selectorText(document, [...AMAZON_SELECTORS.description], matched)
    const featureBlocks = AMAZON_SELECTORS.features.map((selector) => { const value = cleanText(document.querySelector(selector)?.textContent); if (value) matched.push(selector); return value }).filter((value): value is string => Boolean(value))
    const detailBlocks = AMAZON_SELECTORS.details.map((selector) => { const value = cleanText(document.querySelector(selector)?.textContent); if (value) matched.push(selector); return value }).filter((value): value is string => Boolean(value))
    product.featureText = [...new Set([...featureBlocks, ...detailBlocks])]
    const evidenceText = [product.description, ...product.featureText].filter(Boolean).join(' \n ')
    const rejected = applyTextEvidence(product, evidenceText, 'amazon-selector', 'Amazon product details', matched.find((item) => item.includes('productFacts')) ?? matched.find((item) => item.includes('feature-bullets')))
    product.weightGrams = parseWeightGrams(evidenceText)
    product.countryOfOrigin = labelledValue(evidenceText, ['Country of origin', 'Origin'])
    product.careInstructions = labelledValue(evidenceText, ['Care instructions', 'Care'])
    product.shipperSeller = labelledValue(evidenceText, ['Shipper / seller', 'Ships from and sold by'])
    const genericPackaging = labelledValue(evidenceText, ['Packaging', 'Package type'])
    if (genericPackaging && !product.packaging.fulfilment && !product.packaging.manufacturer) rejected.push('Packaging wording was ambiguous and was not duplicated across both packaging stages.')
    if (product.title) product.evidence.push(makeEvidence('title', product.title, 'amazon-selector', 'Amazon product title', 'high', matched.find((item) => AMAZON_SELECTORS.title.includes(item as never))))
    if (product.price !== null) product.evidence.push(makeEvidence('price', product.price, 'amazon-selector', 'Amazon current price', 'high', matched.find((item) => AMAZON_SELECTORS.price.includes(item as never))))
    if (product.countryOfOrigin) product.evidence.push(makeEvidence('countryOfOrigin', product.countryOfOrigin, 'amazon-selector', 'Amazon product details', 'high'))
    if (product.careInstructions) product.evidence.push(makeEvidence('careInstructions', product.careInstructions, 'amazon-selector', 'Amazon product details', 'high'))
    if (product.shipperSeller) product.evidence.push(makeEvidence('shipperSeller', product.shipperSeller, 'amazon-selector', 'Amazon product details', 'high'))
    return result(product, matched, false, { title: product.title, priceText, productId: product.productId, evidenceText: evidenceText.slice(0, 3000) }, rejected)
  },
}
