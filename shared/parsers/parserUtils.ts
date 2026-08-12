import { extractMaterials, extractRecycledPercentage } from './materialExtraction'
import type { EvidenceSource, ParsedProduct, ParserDiagnostics, ParserId, ParserResult } from './parserTypes'

export const CLOTHING_TERMS = /\b(t-?shirt|shirt|tee|top|dress|skirt|trouser|pants|jeans|jacket|coat|hoodie|sweater|jumper|cardigan|shorts|sock|underwear|bra|apparel|clothing|fashion|garment|shoe|sneaker|trainer|scarf|hat|cap|glove|flannel|overshirt)\b/i
const UNSUPPORTED_TERMS = /\b(laptop|phone|smartphone|tablet|television|camera|headphone|speaker|cosmetic|lipstick|shampoo|food|supplement|furniture|sofa|mattress|appliance|toy)\b/i

export function cleanText(value?: string | null) {
  return value?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() || null
}

export function selectorText(document: Document, selectors: string[], matched: string[]) {
  for (const selector of selectors) {
    const value = cleanText(document.querySelector(selector)?.textContent)
    if (value) { matched.push(selector); return value }
  }
  return null
}

export function selectorAttribute(document: Document, selectors: string[], attribute: string, matched: string[]) {
  for (const selector of selectors) {
    const value = cleanText(document.querySelector(selector)?.getAttribute(attribute))
    if (value) { matched.push(`${selector}[${attribute}]`); return value }
  }
  return null
}

export function parsePriceText(value?: string | null): { price: number | null; currency: string | null } {
  if (!value) return { price: null, currency: null }
  const currency = /HK\$/i.test(value) ? 'HKD' : /KZT/i.test(value) ? 'KZT' : /₹|\bRs\.?/i.test(value) ? 'INR' : /£/.test(value) ? 'GBP' : /€/.test(value) ? 'EUR' : /\$/.test(value) ? 'USD' : null
  const number = value.match(/\d[\d.,]*/)?.[0]
  if (!number) return { price: null, currency }
  const lastComma = number.lastIndexOf(',')
  const lastDot = number.lastIndexOf('.')
  let normalised = number
  if (lastComma > lastDot && number.length - lastComma <= 3) normalised = number.replace(/\./g, '').replace(',', '.')
  else normalised = number.replace(/,/g, '')
  const price = Number(normalised)
  return { price: Number.isFinite(price) ? price : null, currency }
}

export function parseWeightGrams(text: string) {
  const grams = text.match(/(?:item\s+|net\s+)?weight\s*:?\s*(\d+(?:\.\d+)?)\s*(g|kg|oz|lb)\b/i)
  if (!grams) return null
  const value = Number(grams[1])
  return grams[2].toLowerCase() === 'kg' ? value * 1000 : grams[2].toLowerCase() === 'oz' ? value * 28.3495 : grams[2].toLowerCase() === 'lb' ? value * 453.592 : value
}

export function makeEvidence(field: string, value: string | number | null, sourceType: EvidenceSource['sourceType'], sourceLabel: string, confidence: EvidenceSource['confidence'], selector?: string): EvidenceSource {
  return { field, value, sourceType, sourceLabel, confidence, ...(selector ? { selector } : {}) }
}

export function emptyProduct(url: string, retailer: string, parserUsed: ParserId): ParsedProduct {
  return { url, retailer, productId: null, title: null, brand: null, category: null, price: null, currency: null, imageUrl: null, description: null, featureText: [], materials: [], materialCompositionUncertain: false, recycledContentPercentage: null, certifications: [], weightGrams: null, packaging: null, countryOfOrigin: null, careInstructions: null, evidence: [], missingFields: [], parserUsed, isProduct: false, isClothing: false }
}

export function evidenceText(product: ParsedProduct) {
  return [product.title, product.category, product.description, ...product.featureText, ...product.materials.map((item) => `${item.percentage ?? ''}% ${item.name}`)].filter(Boolean).join(' ')
}

export function finaliseProduct(product: ParsedProduct) {
  const text = evidenceText(product)
  product.isProduct = Boolean(product.title && (product.price !== null || product.productId || product.imageUrl || product.description))
  product.isClothing = product.materials.length > 0 || (CLOTHING_TERMS.test(text) && !UNSUPPORTED_TERMS.test(text))
  const required: Array<[string, unknown]> = [['Product title', product.title], ['Price', product.price], ['Material composition', product.materials.length ? product.materials : null], ['Recycled content', product.recycledContentPercentage], ['Packaging', product.packaging], ['Country of origin', product.countryOfOrigin], ['Care instructions', product.careInstructions], ['Product weight', product.weightGrams]]
  product.missingFields = required.filter(([, value]) => value === null || value === undefined).map(([label]) => label)
  return product
}

export function buildDiagnostics(product: ParsedProduct, matchedSelectors: string[], jsonLdProductFound: boolean, rawFields: Record<string, unknown>, rejectedFields: string[] = []): ParserDiagnostics {
  return { url: product.url, parserSelected: product.parserUsed, matchedSelectors: [...new Set(matchedSelectors)], jsonLdProductFound, rawFields, normalisedFields: { title: product.title, brand: product.brand, category: product.category, price: product.price, currency: product.currency, materials: product.materials, recycledContentPercentage: product.recycledContentPercentage, weightGrams: product.weightGrams, packaging: product.packaging, countryOfOrigin: product.countryOfOrigin, careInstructions: product.careInstructions }, rejectedFields, missingFields: product.missingFields }
}

export function applyTextEvidence(product: ParsedProduct, text: string, sourceType: EvidenceSource['sourceType'], sourceLabel: string, selector?: string) {
  const extraction = extractMaterials(text)
  if (extraction.materials.length) {
    product.materials = extraction.materials
    product.materialCompositionUncertain = extraction.uncertain
    product.evidence.push(makeEvidence('materials', text, sourceType, sourceLabel, extraction.uncertain ? 'medium' : 'high', selector))
  }
  product.recycledContentPercentage = extractRecycledPercentage(text, product.materials)
  if (product.recycledContentPercentage !== null) product.evidence.push(makeEvidence('recycledContentPercentage', product.recycledContentPercentage, sourceType, sourceLabel, 'high', selector))
  return extraction.rejected
}

export function result(product: ParsedProduct, matched: string[], jsonLd: boolean, raw: Record<string, unknown>, rejected: string[] = []): ParserResult {
  finaliseProduct(product)
  return { product, diagnostics: buildDiagnostics(product, matched, jsonLd, raw, rejected) }
}
