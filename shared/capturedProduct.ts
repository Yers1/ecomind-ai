import { applyTextEvidence, emptyProduct, finaliseProduct, makeEvidence, parsePriceText } from './parsers/parserUtils'
import type { ParsedProduct } from './parsers/parserTypes'

export type CaptureSource = 'pasted-visible-text' | 'screenshot-ocr'

function valueAfterLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label.replace(/\s+/g, '\\s+')}\\s*:?\\s*([^\\n]{2,160})`, 'i'))
    if (match) return match[1].trim()
  }
  return null
}

function likelyTitle(text: string) {
  const excluded = /^(£|\$|€|price|colour|color|size|fabric|material|care|origin|delivery|shipping|certif)/i
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  return lines.find((line) => line.length >= 6 && line.length <= 150 && !excluded.test(line))
    ?? lines.find((line) => line.length >= 3 && line.length <= 150 && !excluded.test(line))
    ?? null
}

export function productFromCapturedText(rawText: string, url: string, source: CaptureSource): ParsedProduct {
  const text = rawText.replace(/\u00a0/g, ' ').trim()
  const parsedUrl = url.trim() ? new URL(url.trim()) : new URL('https://manual.local/product')
  const isAmazon = /(^|\.)(amazon\.com|amazon\.co\.uk)$/i.test(parsedUrl.hostname)
  const product = emptyProduct(parsedUrl.toString(), isAmazon ? (parsedUrl.hostname.endsWith('.co.uk') ? 'Amazon UK' : 'Amazon') : 'User-provided product', 'manual')
  product.title = valueAfterLabel(text, ['Product name', 'Title']) ?? likelyTitle(text)
  const priceLine = text.match(/(?:GBP\s*)?[£$€]\s*\d[\d.,]*|(?:GBP|USD|EUR)\s*\d[\d.,]*/i)?.[0] ?? null
  const price = parsePriceText(priceLine)
  product.price = price.price
  product.currency = price.currency ?? (/\bGBP\b/i.test(text) ? 'GBP' : /\bUSD\b/i.test(text) ? 'USD' : /\bEUR\b/i.test(text) ? 'EUR' : null)
  product.description = text.slice(0, 3000)
  product.featureText = [text]
  const sourceLabel = source === 'screenshot-ocr' ? 'Local screenshot OCR — review required' : 'Visible text pasted by user'
  applyTextEvidence(product, text, 'manual-user-input', sourceLabel)
  product.countryOfOrigin = valueAfterLabel(text, ['Country of origin', 'Origin'])
  product.careInstructions = valueAfterLabel(text, ['Care instructions', 'Care'])
  product.certifications = product.certifications.map((item) => ({ ...item, status: 'unverified', evidenceSource: 'user-provided', sourceLabel, confidence: 'low', affectsEnvironmentalScore: false }))
  if (product.title) product.evidence.push(makeEvidence('title', product.title, 'manual-user-input', sourceLabel, source === 'screenshot-ocr' ? 'low' : 'medium'))
  if (product.price !== null) product.evidence.push(makeEvidence('price', product.price, 'manual-user-input', sourceLabel, source === 'screenshot-ocr' ? 'low' : 'medium'))
  return finaliseProduct(product)
}

export function isSupportedMobileUrl(value: string) {
  try {
    const url = new URL(value)
    return /(^|\.)(amazon\.com|amazon\.co\.uk)$/i.test(url.hostname) && /\/(?:dp|gp\/product)\//i.test(url.pathname)
  } catch { return false }
}
