export type CertificationCategory =
  | 'environmental-material'
  | 'recycled-material'
  | 'organic-material'
  | 'chemical-safety'
  | 'social-and-labour'
  | 'multi-criteria'

export type CertificationDefinition = {
  id: string
  officialName: string
  aliases: string[]
  category: CertificationCategory
  environmentalScoreEligible: boolean
  peopleInformationEligible: boolean
  verificationRequirements: string[]
  officialUrl?: string
  notes?: string
}

export type CertificationEvidence = {
  certificationId: string | null
  displayedName: string
  rawClaim: string
  status: 'verified' | 'partially-verified' | 'seller-claim' | 'unverified' | 'not-found'
  evidenceSource: 'structured-data' | 'product-details' | 'sustainability-section' | 'badge' | 'manufacturer-link' | 'user-provided'
  sourceLabel: string
  sourceUrl?: string
  certificationIdValue?: string
  confidence: 'high' | 'medium' | 'low'
  affectsEnvironmentalScore: boolean
  affectsPeopleInformation: boolean
}

export const MAX_CERTIFICATION_ADJUSTMENT = 3

export const CERTIFICATION_REGISTRY: CertificationDefinition[] = [
  {
    id: 'fair-trade-certified',
    officialName: 'Fair Trade Certified',
    aliases: ['Fair Trade Certified', 'Fairtrade Certified'],
    category: 'social-and-labour',
    environmentalScoreEligible: false,
    peopleInformationEligible: true,
    verificationRequirements: ['Exact certification name', 'Clear statement applying the certification to this product or its practices'],
    notes: 'Shown as People information. It does not add environmental points in the current prototype.',
  },
  {
    id: 'oeko-tex-standard-100',
    officialName: 'OEKO-TEX® STANDARD 100',
    aliases: ['OEKO-TEX® STANDARD 100', 'OEKO-TEX STANDARD 100', 'STANDARD 100 by OEKO-TEX', 'OEKO TEX STANDARD 100'],
    category: 'chemical-safety',
    environmentalScoreEligible: false,
    peopleInformationEligible: false,
    verificationRequirements: ['Exact STANDARD 100 name', 'Certificate or label number', 'Successful OEKO-TEX Label Check'],
    officialUrl: 'https://www.oeko-tex.com/en/our-standards/oeko-tex-standard-100',
    notes: 'Independent harmful-substance testing evidence. It is useful product-safety information but does not by itself prove lower lifecycle impact, so it adds no Green Score points.',
  },
  {
    id: 'oeko-tex-made-in-green',
    officialName: 'OEKO-TEX® MADE IN GREEN',
    aliases: ['OEKO-TEX® MADE IN GREEN', 'OEKO-TEX MADE IN GREEN', 'MADE IN GREEN by OEKO-TEX', 'OEKO TEX MADE IN GREEN'],
    category: 'multi-criteria',
    environmentalScoreEligible: true,
    peopleInformationEligible: true,
    verificationRequirements: ['Exact MADE IN GREEN product label', 'Unique product ID or label number', 'Successful OEKO-TEX Label Check for this product'],
    officialUrl: 'https://www.oeko-tex.com/en/our-standards/oeko-tex-made-in-green',
    notes: 'Eligible for a small prototype adjustment only after product-specific verification through the official OEKO-TEX Label Check. Seller wording alone adds zero points.',
  },
  // Add the mentor-verified Amazon certification list here after the exact names are supplied.
]

const vagueClaimPattern = /\b(sustainable|eco[- ]?friendly|conscious|responsible|green|natural|better materials|environmentally friendly)\b/i

export function detectCertificationEvidence(rawText: string, sourceLabel: string, evidenceSource: CertificationEvidence['evidenceSource'], sourceUrl?: string): { certifications: CertificationEvidence[]; sustainabilityClaims: string[] } {
  const text = rawText.replace(/\s+/g, ' ').trim()
  const found: CertificationEvidence[] = []
  for (const definition of CERTIFICATION_REGISTRY) {
    const alias = definition.aliases.find((candidate) => new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+')}\\b`, 'i').test(text))
    if (!alias) continue
    const claim = text.match(new RegExp(`[^.!?]{0,100}\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+')}\\b[^.!?]{0,140}`, 'i'))?.[0]?.trim() ?? alias
    const productSpecific = /\b(made with|this product|product is|certified (?:product|materials?|fabric)|carries|labelled|labeled|practices)\b/i.test(claim)
    const certificationIdValue = text.match(/\b(?:[A-Z]{2,6}\d{2,5}\s+\d{5,9}|[A-Z0-9]{2,4}\.[A-Z0-9]{3,5}\.[A-Z0-9]{4,8})\b/i)?.[0] ?? undefined
    const officialLabelCheck = Boolean(sourceUrl && /^https:\/\/(?:www\.)?oeko-tex\.com\/[^\s]*label-check/i.test(sourceUrl))
    const independentlyVerified = productSpecific && evidenceSource === 'manufacturer-link' && officialLabelCheck && Boolean(certificationIdValue)
    const status: CertificationEvidence['status'] = independentlyVerified ? 'verified' : productSpecific ? 'seller-claim' : 'partially-verified'
    found.push({ certificationId: definition.id, displayedName: definition.officialName, rawClaim: claim, status, evidenceSource, sourceLabel, ...(sourceUrl ? { sourceUrl } : {}), ...(certificationIdValue ? { certificationIdValue } : {}), confidence: independentlyVerified ? 'high' : productSpecific ? 'medium' : 'low', affectsEnvironmentalScore: independentlyVerified && definition.environmentalScoreEligible, affectsPeopleInformation: definition.peopleInformationEligible })
  }
  const genericCertified = text.match(/[^.!?]{0,100}\b(?:certified materials?|certified recycled fabric|regenerative organic certified|certification|climate pledge friendly)\b[^.!?]{0,140}/gi) ?? []
  const materialClaims = text.match(/\bmade with\s+(?:regenerative\s+)?(?:organic|recycled)\s+(?:cotton|polyester|fabric|materials?)\b/gi) ?? []
  const claims = [...genericCertified.filter((claim) => !found.some((item) => item.rawClaim === claim.trim())), ...materialClaims, ...(vagueClaimPattern.test(text) ? (text.match(/[^.!?]{0,80}\b(?:sustainable|eco[- ]?friendly|conscious|responsible|green|natural|better materials|environmentally friendly)\b[^.!?]{0,100}/gi) ?? []) : [])]
    .map((claim) => claim.trim())
  return { certifications: deduplicateCertificationEvidence(found), sustainabilityClaims: [...new Set(claims)] }
}

export function deduplicateCertificationEvidence(items: CertificationEvidence[]) {
  const seen = new Set<string>()
  return items.filter((item) => { const key = item.certificationId ?? `${item.displayedName.toLowerCase()}:${item.rawClaim.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true })
}

export function certificationAdjustment(items: CertificationEvidence[]) {
  const eligible = deduplicateCertificationEvidence(items).filter((item) => item.status === 'verified' && item.affectsEnvironmentalScore && item.certificationId)
  return Math.min(MAX_CERTIFICATION_ADJUSTMENT, eligible.length === 0 ? 0 : eligible.length === 1 ? 2 : 3)
}
