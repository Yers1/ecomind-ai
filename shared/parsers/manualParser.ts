import { applyTextEvidence, emptyProduct, makeEvidence, result } from './parserUtils'
import type { PackagingEvidence } from '../ecomind'
import { CERTIFICATION_REGISTRY, detectCertificationEvidence } from '../certifications/certificationRegistry'
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
  const next: ParsedProduct = { ...product, materials: [...product.materials], certifications: [...product.certifications], sustainabilityClaims: [...product.sustainabilityClaims], packaging: { ...product.packaging }, evidence: [...product.evidence], missingFields: [...product.missingFields], parserUsed: product.parserUsed === 'manual' ? 'manual' : product.parserUsed }
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
  const manualPackaging = (description: string, source: string | null | undefined, uncertain: boolean | undefined): PackagingEvidence => ({ description, material: description.match(/recycled[- ]?(?:cardboard|card|paper)|cardboard|paper|plastic/i)?.[0] ?? null, recycledContentPercentage: null, reducedPackagingOption: /reduced|minimal|plastic[- ]free/i.test(description) ? true : null, sourceType: 'user-provided', sourceLabel: source?.trim() ? `User-provided · ${source.trim()}` : 'User-provided', confidence: uncertain ? 'low' : 'medium' })
  if (missing.has('fulfilmentPackaging')) next.packaging.fulfilment = null
  else if (corrections.fulfilmentPackaging?.trim()) {
    next.packaging.fulfilment = manualPackaging(corrections.fulfilmentPackaging.trim(), corrections.fulfilmentPackagingSource, corrections.fulfilmentPackagingUncertain)
    next.evidence.push(makeEvidence('fulfilmentPackaging', corrections.fulfilmentPackaging.trim(), 'manual-user-input', 'Provided by user', corrections.fulfilmentPackagingUncertain ? 'low' : 'medium'))
  }
  if (missing.has('manufacturerPackaging')) next.packaging.manufacturer = null
  else if (corrections.manufacturerPackaging?.trim()) {
    next.packaging.manufacturer = manualPackaging(corrections.manufacturerPackaging.trim(), corrections.manufacturerPackagingSource, corrections.manufacturerPackagingUncertain)
    next.evidence.push(makeEvidence('manufacturerPackaging', corrections.manufacturerPackaging.trim(), 'manual-user-input', 'Provided by user', corrections.manufacturerPackagingUncertain ? 'low' : 'medium'))
  }
  if (corrections.certificationNotDisclosed) next.certifications = []
  else if (corrections.certificationClaim?.trim()) {
    const rawClaim = corrections.certificationClaim.trim()
    const detected = detectCertificationEvidence(rawClaim, 'User-provided evidence', 'user-provided').certifications[0]
    const definition = detected ? CERTIFICATION_REGISTRY.find((item) => item.id === detected.certificationId) : null
    next.certifications = [{ certificationId: detected?.certificationId ?? null, displayedName: detected?.displayedName ?? 'Unverified sustainability claim', rawClaim, status: corrections.certificationAsSellerClaim ? 'seller-claim' : 'unverified', evidenceSource: 'user-provided', sourceLabel: 'User-provided evidence', ...(corrections.certificationSourceUrl?.trim() ? { sourceUrl: corrections.certificationSourceUrl.trim() } : {}), confidence: 'low', affectsEnvironmentalScore: false, affectsPeopleInformation: definition?.peopleInformationEligible ?? false }]
  }
  const completed = result(next, [], false, { manualCorrections: corrections })
  return completed.product
}
