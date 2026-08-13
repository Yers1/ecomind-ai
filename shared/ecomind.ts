import { certificationAdjustment, type CertificationEvidence } from './certifications/certificationRegistry'

export type ConfidenceLevel = 'High' | 'Medium' | 'Low'
export type PackagingSourceType = 'product-page' | 'checkout-option' | 'retailer-policy' | 'user-provided' | 'ecomind-estimate'
export type PackagingEvidence = {
  description: string | null
  material: string | null
  recycledContentPercentage: number | null
  reducedPackagingOption: boolean | null
  sourceType: PackagingSourceType
  sourceLabel: string
  sourceUrl?: string
  applicableMarket?: string
  lastVerified?: string
  confidence: 'high' | 'medium' | 'low'
}
export type ProductPackaging = { fulfilment: PackagingEvidence | null; manufacturer: PackagingEvidence | null; legacy?: PackagingEvidence | null }
export type ScoreFactorKey = 'materials' | 'carbon' | 'recycled' | 'durability' | 'fulfilmentPackaging' | 'manufacturerPackaging'

export type DataSource = {
  label: string
  url?: string
  year?: number
  type: 'listing' | 'official' | 'open-dataset' | 'ecomind-estimate'
  note?: string
}

export interface MaterialShare {
  material: string
  percentage: number
}

export interface ProductRecord {
  id: string
  productName: string
  shortName: string
  category: 'Clothing'
  price: number
  currency: 'GBP'
  rating: number
  reviewCount: number
  color: string
  description: string
  listingText: string
  materials: MaterialShare[]
  recycledContentPercentage: number | null
  estimatedCarbonKg: number | null
  carbonValueType: 'listed' | 'estimated' | 'unavailable'
  packaging: ProductPackaging
  durabilityRating: number
  circularityRating: number
  certifications: CertificationEvidence[]
  sustainabilityClaims: string[]
  sources: DataSource[]
  factorSources: Partial<Record<ScoreFactorKey, DataSource[]>>
  missingFields: string[]
  confidenceLevel: ConfidenceLevel
  alternativeProductId: string | null
  peopleInformation: string
  mainAdvantage: string
  tradeOff: string
}

export interface ScoreBreakdownItem {
  key: ScoreFactorKey
  label: string
  score: number | null
  weight: number
  weightedPoints: number | null
  detail: string
  sources: DataSource[]
}

export interface ScoreResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'E'
  status: string
  explanation: string
  breakdown: ScoreBreakdownItem[]
  provisional: boolean
  range: { min: number; max: number } | null
  knownWeight: number
  baseScore: number
  certificationAdjustment: number
}

export const SCORE_WEIGHTS = {
  materials: 0.35,
  carbon: 0.25,
  recycled: 0.2,
  durability: 0.1,
  fulfilmentPackaging: 0.05,
  manufacturerPackaging: 0.05,
} as const

export function migrateLegacyPackaging(value: unknown): ProductPackaging {
  if (value && typeof value === 'object' && ('fulfilment' in value || 'manufacturer' in value)) return value as ProductPackaging
  if (typeof value !== 'string' || !value.trim()) return { fulfilment: null, manufacturer: null }
  const description = value.trim()
  const evidence: PackagingEvidence = { description, material: null, recycledContentPercentage: null, reducedPackagingOption: null, sourceType: 'ecomind-estimate', sourceLabel: 'Legacy packaging evidence — review required', confidence: 'low' }
  if (/polybag|branded (?:product )?box|plastic wrap|original packaging|individual packaging/i.test(description)) return { fulfilment: null, manufacturer: evidence }
  if (/delivery box|shipping box|mailer|delivery bag|fulfilment|fulfillment/i.test(description)) return { fulfilment: evidence, manufacturer: null }
  return { fulfilment: null, manufacturer: null, legacy: evidence }
}

export function packagingEvidenceLabel(evidence: PackagingEvidence | null) {
  if (!evidence) return 'Not disclosed'
  const source = evidence.sourceType === 'retailer-policy' ? 'Estimated from retailer policy' : evidence.sourceLabel
  return `${evidence.description ?? evidence.material ?? 'Packaging disclosed'} · ${source} · ${evidence.confidence} confidence`
}

const sampleListing = (note: string): DataSource => ({ label: 'Sample product listing', type: 'listing', note })
const demoEstimate = (note: string): DataSource => ({ label: 'EcoMind demo estimate', type: 'ecomind-estimate', note })
const prototypeAssumption = (note: string): DataSource => ({ label: 'Prototype assumption', type: 'ecomind-estimate', note })

const performanceListing = sampleListing('Fictional Threadly listing created for the controlled demo.')
const performanceEstimate = demoEstimate('Illustrative value created locally for the prototype; not lifecycle-assessment data.')
const cottonListing = sampleListing('Fictional Threadly listing with deliberately incomplete disclosure.')
const cottonEstimate = demoEstimate('Illustrative range midpoint created locally for the prototype.')
const renewListing = sampleListing('Fictional Threadly listing created for the controlled demo.')
const renewSupplier = demoEstimate('Fictional supplier-style statement used only to demonstrate source labelling.')
const factorAssumption = prototypeAssumption('Fixed sample factor used by the published prototype formula.')

export const PRODUCT_RECORDS: ProductRecord[] = [
  {
    id: 'polyester-everyday-tee', productName: 'Northline Everyday Performance Tee', shortName: 'Performance Tee', category: 'Clothing',
    price: 14.99, currency: 'GBP', rating: 4.4, reviewCount: 318, color: 'Charcoal',
    description: 'A lightweight everyday T-shirt with quick-dry fabric and a relaxed unisex fit.',
    listingText: 'Shell: 100% polyester. Quick-dry jersey. Packed in an individual protective polybag.',
    materials: [{ material: 'Polyester', percentage: 100 }], recycledContentPercentage: 0, estimatedCarbonKg: 5.2,
    carbonValueType: 'estimated', packaging: { fulfilment: null, manufacturer: { description: 'Individual protective polybag', material: 'Plastic', recycledContentPercentage: null, reducedPackagingOption: null, sourceType: 'product-page', sourceLabel: 'Threadly sample product listing', confidence: 'high' } }, durabilityRating: 62, circularityRating: 45,
    certifications: [], sustainabilityClaims: [], sources: [performanceListing, performanceEstimate, factorAssumption],
    factorSources: { materials: [performanceListing, factorAssumption], carbon: [performanceEstimate], recycled: [performanceListing], durability: [factorAssumption], manufacturerPackaging: [performanceListing, factorAssumption] },
    missingFields: ['Manufacturing location', 'Supplier lifecycle assessment', 'End-of-life guidance'], confidenceLevel: 'Medium',
    alternativeProductId: 'renew-loop-tee', peopleInformation: 'Labour and supplier audit information is not disclosed in this demo listing.',
    mainAdvantage: 'Lowest upfront price and quick-dry fabric.', tradeOff: 'Virgin synthetic fibre and plastic packaging increase estimated impact.',
  },
  {
    id: 'cotton-classic-tee', productName: 'Willow & Thread Classic Cotton Tee', shortName: 'Cotton Tee', category: 'Clothing',
    price: 18.5, currency: 'GBP', rating: 4.6, reviewCount: 204, color: 'Natural White',
    description: 'A soft midweight cotton T-shirt with a classic fit and reinforced neckline.',
    listingText: '100% cotton jersey. Paper swing tag. Other packaging, recycled content and fibre origin are not disclosed.',
    materials: [{ material: 'Cotton', percentage: 100 }], recycledContentPercentage: null, estimatedCarbonKg: 4.1,
    carbonValueType: 'estimated', packaging: { fulfilment: null, manufacturer: null }, durabilityRating: 65, circularityRating: 55,
    certifications: [], sustainabilityClaims: [], sources: [cottonListing, cottonEstimate, factorAssumption],
    factorSources: { materials: [cottonListing, factorAssumption], carbon: [cottonEstimate], durability: [factorAssumption] },
    missingFields: ['Recycled content', 'Fulfilment packaging', 'Manufacturer packaging', 'Cotton origin', 'Supplier lifecycle assessment'], confidenceLevel: 'Low',
    alternativeProductId: 'renew-loop-tee', peopleInformation: 'Labour conditions and responsible sourcing information are not disclosed.',
    mainAdvantage: 'Familiar natural fibre and a midweight construction.', tradeOff: 'Several important product details are missing, so the result is provisional.',
  },
  {
    id: 'renew-loop-tee', productName: 'Mosswell Renew Loop Tee', shortName: 'Renew Loop Tee', category: 'Clothing',
    price: 21, currency: 'GBP', rating: 4.7, reviewCount: 126, color: 'Forest Green',
    description: 'A durable jersey T-shirt made with recycled cotton and lower-impact lyocell.',
    listingText: '60% recycled cotton, 40% lyocell. Individual recycled-card product sleeve. Recycled-paper delivery mailer. Repair patch included.',
    materials: [{ material: 'Recycled cotton', percentage: 60 }, { material: 'Lyocell', percentage: 40 }],
    recycledContentPercentage: 60, estimatedCarbonKg: 1.9, carbonValueType: 'listed', packaging: { fulfilment: { description: 'Recycled-paper delivery mailer', material: 'Recycled paper', recycledContentPercentage: null, reducedPackagingOption: true, sourceType: 'product-page', sourceLabel: 'Threadly sample delivery information', confidence: 'high' }, manufacturer: { description: 'Individual recycled-card product sleeve', material: 'Recycled cardboard', recycledContentPercentage: null, reducedPackagingOption: true, sourceType: 'product-page', sourceLabel: 'Threadly sample product listing', confidence: 'high' } },
    durabilityRating: 84, circularityRating: 86, certifications: [], sustainabilityClaims: ['Demo material claim'], sources: [renewListing, renewSupplier, factorAssumption],
    factorSources: { materials: [renewListing, factorAssumption], carbon: [renewSupplier], recycled: [renewListing], durability: [factorAssumption], fulfilmentPackaging: [renewListing, factorAssumption], manufacturerPackaging: [renewListing, factorAssumption] },
    missingFields: ['Country-specific end-of-life route'], confidenceLevel: 'High', alternativeProductId: null,
    peopleInformation: 'A fictional supplier code of conduct is listed. It is not independently verified in the prototype.',
    mainAdvantage: 'High recycled content, lower demo carbon estimate and minimal packaging.', tradeOff: 'Costs a little more than the conventional options.',
  },
]

export const getProductRecord = (id: string) => PRODUCT_RECORDS.find((product) => product.id === id) ?? PRODUCT_RECORDS[0]

const materialFactors: Record<string, number> = { Polyester: 28, Cotton: 48, 'Recycled cotton': 80, Lyocell: 88 }
const clamp = (value: number) => Math.min(100, Math.max(0, value))

export function calculateConfidence(product: Pick<ProductRecord, 'materials' | 'estimatedCarbonKg' | 'recycledContentPercentage' | 'packaging' | 'carbonValueType' | 'missingFields'>): ConfidenceLevel {
  const missingScoreFactors = [!product.materials.length, product.estimatedCarbonKg === null, product.recycledContentPercentage === null, product.packaging.fulfilment === null, product.packaging.manufacturer === null].filter(Boolean).length
  if (missingScoreFactors >= 2 || product.missingFields.length >= 4) return 'Low'
  if (missingScoreFactors === 1 || product.carbonValueType === 'estimated' || product.missingFields.length >= 2) return 'Medium'
  return 'High'
}

export function calculateGreenScore(product: ProductRecord): ScoreResult {
  const materialScore = product.materials.length ? product.materials.reduce((total, item) => total + (materialFactors[item.material] ?? 40) * (item.percentage / 100), 0) : null
  const carbonScore = product.estimatedCarbonKg === null ? null : clamp(100 - product.estimatedCarbonKg * 12)
  const recycledScore = product.recycledContentPercentage
  const durabilityScore = Number.isFinite(product.durabilityRating) && Number.isFinite(product.circularityRating) ? (product.durabilityRating + product.circularityRating) / 2 : null
  const packageScore = (evidence: PackagingEvidence | null) => {
    if (!evidence) return null
    const text = `${evidence.description ?? ''} ${evidence.material ?? ''}`.toLowerCase()
    if (/plastic|polybag/.test(text)) return 25
    if (evidence.reducedPackagingOption === true) return 90
    if (/recycled card|recycled paper/.test(text)) return 85
    if (/paper|card/.test(text)) return 65
    return evidence.material || evidence.description ? 50 : null
  }
  const fulfilmentPackagingScore = packageScore(product.packaging.fulfilment)
  const manufacturerPackagingScore = packageScore(product.packaging.manufacturer)
  const scores: Record<ScoreFactorKey, number | null> = { materials: materialScore, carbon: carbonScore, recycled: recycledScore, durability: durabilityScore, fulfilmentPackaging: fulfilmentPackagingScore, manufacturerPackaging: manufacturerPackagingScore }
  const details: Record<ScoreFactorKey, string> = {
    materials: product.materials.length ? product.materials.map((item) => `${item.percentage}% ${item.material.toLowerCase()}`).join(', ') : 'Not disclosed',
    carbon: product.estimatedCarbonKg === null ? 'Not disclosed' : `${product.estimatedCarbonKg.toFixed(1)} kg CO2e, ${product.carbonValueType === 'listed' ? 'sample listing claim' : 'EcoMind demo estimate'}`,
    recycled: product.recycledContentPercentage === null ? 'Not disclosed — unknown is not treated as 0%' : `${product.recycledContentPercentage}% disclosed recycled content`,
    durability: durabilityScore === null ? 'Not disclosed' : `Prototype durability ${product.durabilityRating}/100, circularity ${product.circularityRating}/100`,
    fulfilmentPackaging: product.packaging.fulfilment?.description ?? 'Not disclosed — retailer or delivery packaging remains unknown',
    manufacturerPackaging: product.packaging.manufacturer?.description ?? 'Not disclosed — supplier packaging remains unknown',
  }
  const labels: Record<ScoreFactorKey, string> = { materials: 'Material impact', carbon: 'Estimated carbon', recycled: 'Recycled content', durability: 'Durability and circularity', fulfilmentPackaging: 'Fulfilment packaging', manufacturerPackaging: 'Manufacturer packaging' }
  const breakdown = (Object.keys(SCORE_WEIGHTS) as ScoreFactorKey[]).map((key) => ({
    key, label: labels[key], score: scores[key], weight: SCORE_WEIGHTS[key],
    weightedPoints: scores[key] === null ? null : scores[key] * SCORE_WEIGHTS[key], detail: details[key], sources: product.factorSources[key] ?? [],
  }))
  const known = breakdown.filter((item) => item.score !== null)
  const knownWeight = known.reduce((total, item) => total + item.weight, 0)
  const knownPoints = known.reduce((total, item) => total + (item.weightedPoints ?? 0), 0)
  const provisional = knownWeight < 0.999
  const baseScore = Math.round(knownWeight > 0 ? knownPoints / knownWeight : 0)
  const adjustment = certificationAdjustment(product.certifications)
  const score = Math.min(100, baseScore + adjustment)
  const range = provisional ? { min: Math.min(100, Math.floor(knownPoints) + adjustment), max: Math.min(100, Math.ceil(knownPoints + (1 - knownWeight) * 100) + adjustment) } : null
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : score >= 25 ? 'D' : 'E'
  const status = provisional ? 'Provisional estimate' : grade === 'A' ? 'Lower impact' : grade === 'B' ? 'Good choice' : grade === 'C' ? 'Mixed impact' : 'Higher impact'
  const strongest = [...known].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const weakest = [...known].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
  const explanation = provisional
    ? `Available evidence suggests about ${score}/100, but undisclosed factors could move the result into the ${range?.min}–${range?.max} range.`
    : `${strongest.label} helps this score, while ${weakest.label.toLowerCase()} is the main area for improvement.`
  return { score, grade, status, explanation, breakdown, provisional, range, knownWeight, baseScore, certificationAdjustment: adjustment }
}

export const scoreTone = (score: number) => (score >= 65 ? 'positive' : score >= 45 ? 'mixed' : 'concern')
export const formatScore = (result: ScoreResult) => `${result.provisional ? '~' : ''}${result.score}`

export function rankRecommendationCandidates(current: ProductRecord, candidates: ProductRecord[]) {
  const confidenceRank: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 }
  const completeness = (product: ProductRecord) => 10 - product.missingFields.length
  const verifiedEnvironmental = (product: ProductRecord) => product.certifications.filter((item) => item.status === 'verified' && item.affectsEnvironmentalScore).length
  return candidates
    .filter((product) => product.id !== current.id && calculateGreenScore(product).score > calculateGreenScore(current).score)
    .sort((left, right) => {
      const scoreDifference = calculateGreenScore(right).score - calculateGreenScore(left).score
      if (Math.abs(scoreDifference) > 5) return scoreDifference
      return completeness(right) - completeness(left)
        || confidenceRank[right.confidenceLevel] - confidenceRank[left.confidenceLevel]
        || verifiedEnvironmental(right) - verifiedEnvironmental(left)
        || Math.abs(left.price - current.price) - Math.abs(right.price - current.price)
        || Number(right.materials.length > 0) - Number(left.materials.length > 0)
    })
}
