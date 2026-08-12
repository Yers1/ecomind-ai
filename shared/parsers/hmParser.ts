import { genericJsonLdParser } from './genericJsonLdParser'
import { applyTextEvidence, cleanText, makeEvidence, parseWeightGrams, result } from './parserUtils'
import type { ProductPageParser } from './parserTypes'

export const hmParser: ProductPageParser = {
  id: 'hm',
  canParse(_document, url) { return /(^|\.)hm\.com$/i.test(new URL(url).hostname) && /productpage\./i.test(new URL(url).pathname) },
  parse(document, url) {
    const base = genericJsonLdParser.canParse(document, url) ? genericJsonLdParser.parse(document, url) : null
    const product = base?.product ?? { ...genericJsonLdParser.parse(document, url).product }
    product.parserUsed = 'hm'
    product.retailer = 'H&M'
    const matched = [...(base?.diagnostics.matchedSelectors ?? [])]
    const materialSection = document.querySelector('#section-materialsAndCareAccordion') ?? [...document.querySelectorAll<HTMLElement>('main div,main section')].find((element) => /Composition/i.test(element.textContent || '') && /Care instructions/i.test(element.textContent || '') && element.textContent!.length < 5000)
    const detailsSection = [...document.querySelectorAll<HTMLElement>('main div,main section')].find((element) => /Art\. No\./i.test(element.textContent || '') && /Description/i.test(element.textContent || '') && element.textContent!.length < 5000)
    const materialText = cleanText(materialSection?.textContent) ?? ''
    const detailText = cleanText(detailsSection?.textContent) ?? ''
    if (materialSection) matched.push(materialSection.id ? `#${materialSection.id}` : 'H&M material accordion')
    const rejected = applyTextEvidence(product, materialText, 'visible-page', 'H&M Material & Care section', materialSection?.id ? `#${materialSection.id}` : undefined)
    product.weightGrams = parseWeightGrams(detailText)
    product.productId = url.match(/productpage\.(\d+)\.html/i)?.[1] ?? product.productId
    product.countryOfOrigin = detailText.match(/(?:Country of production|Imported)\s*:?\s*([A-Za-z ]+)/i)?.[1]?.trim() ?? null
    product.careInstructions = materialText.match(/Care instructions\s*(.*?)(?:Bring your|Material:|Materials in this|$)/i)?.[1]?.trim() ?? null
    if (product.weightGrams !== null) product.evidence.push(makeEvidence('weightGrams', Math.round(product.weightGrams), 'visible-page', 'H&M Description & fit', 'high'))
    if (product.careInstructions) product.evidence.push(makeEvidence('careInstructions', product.careInstructions, 'visible-page', 'H&M Material & Care section', 'high'))
    return result(product, matched, true, { ...(base?.diagnostics.rawFields ?? {}), materialText: materialText.slice(0, 1800), detailText: detailText.slice(0, 1800) }, [...(base?.diagnostics.rejectedFields ?? []), ...rejected])
  },
}
