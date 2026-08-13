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
  // Add the mentor-verified Amazon certification list here after the exact names are supplied.
]

const vagueClaimPattern = /\b(sustainable|eco[- ]?friendly|conscious|responsible|green|natural|better materials|environmentally friendly)\b/i

export function detectCertificationEvidence(rawText: string, sourceLabel: string, evidenceSource: CertificationEvidence['evidenceSource']): { certifications: CertificationEvidence[]; sustainabilityClaims: string[] } {
  const text = rawText.replace(/\s+/g, ' ').trim()
  const found: CertificationEvidence[] = []
  for (const definition of CERTIFICATION_REGISTRY) {
    const alias = definition.aliases.find((candidate) => new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+')}\\b`, 'i').test(text))
    if (!alias) continue
    const claim = text.match(new RegExp(`[^.!?]{0,100}\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+')}\\b[^.!?]{0,140}`, 'i'))?.[0]?.trim() ?? alias
    const productSpecific = /\b(made with|this product|certified (?:materials?|fabric)|practices)\b/i.test(claim)
    found.push({ certificationId: definition.id, displayedName: definition.officialName, rawClaim: claim, status: productSpecific ? 'verified' : 'partially-verified', evidenceSource, sourceLabel, confidence: productSpecific ? 'high' : 'medium', affectsEnvironmentalScore: productSpecific && definition.environmentalScoreEligible, affectsPeopleInformation: definition.peopleInformationEligible })
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
