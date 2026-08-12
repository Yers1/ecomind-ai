export type ConfidenceLevel = 'High' | 'Medium' | 'Low'
export type PackagingType = 'plastic-mailer' | 'recycled-paper' | 'minimal-recycled-cardboard'
export type ScoreFactorKey = 'materials' | 'carbon' | 'recycled' | 'durability' | 'packaging'

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
  packagingType: PackagingType | null
  durabilityRating: number
  circularityRating: number
  certifications: string[]
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
}

export const SCORE_WEIGHTS = {
  materials: 0.35,
  carbon: 0.25,
  recycled: 0.2,
  durability: 0.1,
  packaging: 0.1,
} as const

export const packagingLabels: Record<PackagingType, string> = {
  'plastic-mailer': 'Individual plastic mailer',
  'recycled-paper': 'Recycled paper wrap',
  'minimal-recycled-cardboard': 'Minimal recycled-card packaging',
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
    carbonValueType: 'estimated', packagingType: 'plastic-mailer', durabilityRating: 62, circularityRating: 45,
    certifications: [], sources: [performanceListing, performanceEstimate, factorAssumption],
    factorSources: { materials: [performanceListing, factorAssumption], carbon: [performanceEstimate], recycled: [performanceListing], durability: [factorAssumption], packaging: [performanceListing, factorAssumption] },
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
    carbonValueType: 'estimated', packagingType: null, durabilityRating: 65, circularityRating: 55,
    certifications: [], sources: [cottonListing, cottonEstimate, factorAssumption],
    factorSources: { materials: [cottonListing, factorAssumption], carbon: [cottonEstimate], durability: [factorAssumption] },
    missingFields: ['Recycled content', 'Packaging type', 'Cotton origin', 'Supplier lifecycle assessment'], confidenceLevel: 'Low',
    alternativeProductId: 'renew-loop-tee', peopleInformation: 'Labour conditions and responsible sourcing information are not disclosed.',
    mainAdvantage: 'Familiar natural fibre and a midweight construction.', tradeOff: 'Several important product details are missing, so the result is provisional.',
  },
  {
    id: 'renew-loop-tee', productName: 'Mosswell Renew Loop Tee', shortName: 'Renew Loop Tee', category: 'Clothing',
    price: 21, currency: 'GBP', rating: 4.7, reviewCount: 126, color: 'Forest Green',
    description: 'A durable jersey T-shirt made with recycled cotton and lower-impact lyocell.',
    listingText: '60% recycled cotton, 40% lyocell. Plastic-free recycled-card packaging. Repair patch included.',
    materials: [{ material: 'Recycled cotton', percentage: 60 }, { material: 'Lyocell', percentage: 40 }],
    recycledContentPercentage: 60, estimatedCarbonKg: 1.9, carbonValueType: 'listed', packagingType: 'minimal-recycled-cardboard',
    durabilityRating: 84, circularityRating: 86, certifications: ['Demo material claim'], sources: [renewListing, renewSupplier, factorAssumption],
    factorSources: { materials: [renewListing, factorAssumption], carbon: [renewSupplier], recycled: [renewListing], durability: [factorAssumption], packaging: [renewListing, factorAssumption] },
    missingFields: ['Country-specific end-of-life route'], confidenceLevel: 'High', alternativeProductId: null,
    peopleInformation: 'A fictional supplier code of conduct is listed. It is not independently verified in the prototype.',
    mainAdvantage: 'High recycled content, lower demo carbon estimate and minimal packaging.', tradeOff: 'Costs a little more than the conventional options.',
  },
]

export const getProductRecord = (id: string) => PRODUCT_RECORDS.find((product) => product.id === id) ?? PRODUCT_RECORDS[0]

const materialFactors: Record<string, number> = { Polyester: 28, Cotton: 48, 'Recycled cotton': 80, Lyocell: 88 }
const packagingFactors: Record<PackagingType, number> = { 'plastic-mailer': 25, 'recycled-paper': 75, 'minimal-recycled-cardboard': 90 }
const clamp = (value: number) => Math.min(100, Math.max(0, value))

export function calculateConfidence(product: Pick<ProductRecord, 'materials' | 'estimatedCarbonKg' | 'recycledContentPercentage' | 'packagingType' | 'carbonValueType' | 'missingFields'>): ConfidenceLevel {
  const missingScoreFactors = [!product.materials.length, product.estimatedCarbonKg === null, product.recycledContentPercentage === null, product.packagingType === null].filter(Boolean).length
  if (missingScoreFactors >= 2 || product.missingFields.length >= 4) return 'Low'
  if (missingScoreFactors === 1 || product.carbonValueType === 'estimated' || product.missingFields.length >= 2) return 'Medium'
  return 'High'
}

export function calculateGreenScore(product: ProductRecord): ScoreResult {
  const materialScore = product.materials.length ? product.materials.reduce((total, item) => total + (materialFactors[item.material] ?? 40) * (item.percentage / 100), 0) : null
  const carbonScore = product.estimatedCarbonKg === null ? null : clamp(100 - product.estimatedCarbonKg * 12)
  const recycledScore = product.recycledContentPercentage
  const durabilityScore = Number.isFinite(product.durabilityRating) && Number.isFinite(product.circularityRating) ? (product.durabilityRating + product.circularityRating) / 2 : null
  const packagingScore = product.packagingType ? packagingFactors[product.packagingType] : null
  const scores: Record<ScoreFactorKey, number | null> = { materials: materialScore, carbon: carbonScore, recycled: recycledScore, durability: durabilityScore, packaging: packagingScore }
  const details: Record<ScoreFactorKey, string> = {
    materials: product.materials.length ? product.materials.map((item) => `${item.percentage}% ${item.material.toLowerCase()}`).join(', ') : 'Not disclosed',
    carbon: product.estimatedCarbonKg === null ? 'Not disclosed' : `${product.estimatedCarbonKg.toFixed(1)} kg CO2e, ${product.carbonValueType === 'listed' ? 'sample listing claim' : 'EcoMind demo estimate'}`,
    recycled: product.recycledContentPercentage === null ? 'Not disclosed — unknown is not treated as 0%' : `${product.recycledContentPercentage}% disclosed recycled content`,
    durability: durabilityScore === null ? 'Not disclosed' : `Prototype durability ${product.durabilityRating}/100, circularity ${product.circularityRating}/100`,
    packaging: product.packagingType ? packagingLabels[product.packagingType] : 'Not disclosed — unknown is not treated as plastic',
  }
  const labels: Record<ScoreFactorKey, string> = { materials: 'Material impact', carbon: 'Estimated carbon', recycled: 'Recycled content', durability: 'Durability and circularity', packaging: 'Packaging' }
  const breakdown = (Object.keys(SCORE_WEIGHTS) as ScoreFactorKey[]).map((key) => ({
    key, label: labels[key], score: scores[key], weight: SCORE_WEIGHTS[key],
    weightedPoints: scores[key] === null ? null : scores[key] * SCORE_WEIGHTS[key], detail: details[key], sources: product.factorSources[key] ?? [],
  }))
  const known = breakdown.filter((item) => item.score !== null)
  const knownWeight = known.reduce((total, item) => total + item.weight, 0)
  const knownPoints = known.reduce((total, item) => total + (item.weightedPoints ?? 0), 0)
  const provisional = knownWeight < 0.999
  const score = Math.round(knownWeight > 0 ? knownPoints / knownWeight : 0)
  const range = provisional ? { min: Math.floor(knownPoints), max: Math.ceil(knownPoints + (1 - knownWeight) * 100) } : null
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : score >= 25 ? 'D' : 'E'
  const status = provisional ? 'Provisional estimate' : grade === 'A' ? 'Lower impact' : grade === 'B' ? 'Good choice' : grade === 'C' ? 'Mixed impact' : 'Higher impact'
  const strongest = [...known].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const weakest = [...known].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
  const explanation = provisional
    ? `Available evidence suggests about ${score}/100, but undisclosed factors could move the result into the ${range?.min}–${range?.max} range.`
    : `${strongest.label} helps this score, while ${weakest.label.toLowerCase()} is the main area for improvement.`
  return { score, grade, status, explanation, breakdown, provisional, range, knownWeight }
}

export const scoreTone = (score: number) => (score >= 65 ? 'positive' : score >= 45 ? 'mixed' : 'concern')
export const formatScore = (result: ScoreResult) => `${result.provisional ? '~' : ''}${result.score}`
