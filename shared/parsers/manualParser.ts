import { applyTextEvidence, emptyProduct, makeEvidence, result } from './parserUtils'
import type { ManualCorrections, ParsedProduct, ProductPageParser } from './parserTypes'

export const manualParser: ProductPageParser = {
  id: 'manual',
  canParse() { return true },
  parse(document, url) {
    const product = emptyProduct(url, new URL(url).hostname.replace(/^www\./, ''), 'manual')
    product.title = document.title || null
    return result(product, [], false, { documentTitle: document.title })
  },
}

export function applyManualCorrections(product: ParsedProduct, corrections: ManualCorrections) {
  const next: ParsedProduct = { ...product, materials: [...product.materials], evidence: [...product.evidence], missingFields: [...product.missingFields], parserUsed: product.parserUsed === 'manual' ? 'manual' : product.parserUsed }
  const missing = new Set(corrections.markNotDisclosed ?? [])
  if (corrections.title?.trim()) {
    next.title = corrections.title.trim()
    next.evidence.push(makeEvidence('title', next.title, 'manual-user-input', 'Provided by user', 'medium'))
  }
  if (missing.has('materials')) next.materials = []
  else if (corrections.materialText?.trim()) {
    next.materials = []
    next.materialCompositionUncertain = false
    applyTextEvidence(next, corrections.materialText.trim(), 'manual-user-input', 'Provided by user')
  }
  if (missing.has('recycledContent')) next.recycledContentPercentage = null
  else if (typeof corrections.recycledContentPercentage === 'number' && Number.isFinite(corrections.recycledContentPercentage)) {
    next.recycledContentPercentage = Math.max(0, Math.min(100, corrections.recycledContentPercentage))
    next.evidence.push(makeEvidence('recycledContentPercentage', next.recycledContentPercentage, 'manual-user-input', 'Provided by user', 'medium'))
  }
  if (missing.has('packaging')) next.packaging = null
  else if (corrections.packaging?.trim()) {
    next.packaging = corrections.packaging.trim()
    next.evidence.push(makeEvidence('packaging', next.packaging, 'manual-user-input', 'Provided by user', 'medium'))
  }
  const completed = result(next, [], false, { manualCorrections: corrections })
  return completed.product
}
