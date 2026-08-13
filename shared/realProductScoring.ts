import { SCORE_WEIGHTS, type ConfidenceLevel, type ScoreFactorKey } from './ecomind'
import type { EvidenceSource, ParsedProduct } from './parsers/parserTypes'
import { certificationAdjustment } from './certifications/certificationRegistry'

export type FactorResult =
  | { status: 'known'; score: number; evidence: EvidenceSource[] }
  | { status: 'estimated'; score: number; range: [number, number]; evidence: EvidenceSource[] }
  | { status: 'unknown'; score: null; evidence: EvidenceSource[] }

export type RealProductScore = {
  score: number | null
  range: [number, number] | null
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  confidence: ConfidenceLevel
  factors: Record<ScoreFactorKey, FactorResult>
  knownFactorCount: number
  provisional: true
  canScore: boolean
  explanation: string
  baseScore: number | null
  certificationAdjustment: number
}

const MATERIAL_SCORES: Record<string, [number, number]> = {
  'Regenerative Organic Cotton': [55, 72],
  Cotton: [38, 58],
  'Organic cotton': [55, 72],
  'Recycled cotton': [72, 88],
  Polyester: [20, 38],
  'Recycled polyester': [52, 72],
  Nylon: [18, 35],
  'Recycled nylon': [50, 70],
  Elastane: [15, 32],
  Linen: [62, 82],
  Hemp: [68, 86],
  Wool: [35, 60],
  'Recycled wool': [62, 82],
  'Viscose family': [38, 62],
  Modal: [48, 68],
  Lyocell: [68, 88],
  Acrylic: [18, 34],
  Silk: [30, 55],
  Leather: [10, 30],
  'Recycled fibres': [55, 78],
}

const factorEvidence = (product: ParsedProduct, field: string) => product.evidence.filter((item) => item.field === field || (field === 'materials' && item.field === 'materials'))

function materialFactor(product: ParsedProduct): FactorResult {
  if (!product.materials.length) return { status: 'unknown', score: null, evidence: [] }
  const knownPercent = product.materials.every((item) => item.percentage !== null)
  const total = product.materials.reduce((sum, item) => sum + (item.percentage ?? 0), 0)
  const ranges = product.materials.map((item) => MATERIAL_SCORES[item.name] ?? [30, 55])
  const min = ranges.reduce((sum, range, index) => sum + range[0] * (knownPercent ? (product.materials[index].percentage ?? 0) / Math.max(total, 1) : 1 / ranges.length), 0)
  const max = ranges.reduce((sum, range, index) => sum + range[1] * (knownPercent ? (product.materials[index].percentage ?? 0) / Math.max(total, 1) : 1 / ranges.length), 0)
  const score = Math.round((min + max) / 2)
  return { status: 'estimated', score, range: [Math.round(min), Math.round(max)], evidence: [...factorEvidence(product, 'materials'), { field: 'material-factor', value: `${Math.round(min)}–${Math.round(max)}`, sourceType: 'ecomind-estimate', sourceLabel: 'EcoMind prototype material factors', confidence: 'low' }] }
}

function recycledFactor(product: ParsedProduct): FactorResult {
  if (product.recycledContentPercentage === null) return { status: 'unknown', score: null, evidence: [] }
  return { status: 'known', score: Math.round(product.recycledContentPercentage), evidence: factorEvidence(product, 'recycledContentPercentage') }
}

function packagingFactor(product: ParsedProduct, stage: 'fulfilment' | 'manufacturer'): FactorResult {
  const packaging = product.packaging[stage]
  const field = stage === 'fulfilment' ? 'fulfilmentPackaging' : 'manufacturerPackaging'
  if (!packaging) return { status: 'unknown', score: null, evidence: [] }
  const lower = `${packaging.description ?? ''} ${packaging.material ?? ''}`.toLowerCase()
  const score = /plastic[- ]free|minimal|recycled card|recycled paper/.test(lower) || packaging.reducedPackagingOption === true ? 82 : /paper|card/.test(lower) ? 65 : /plastic|polybag/.test(lower) ? 25 : 50
  const evidence = [...factorEvidence(product, field), { field: `${field}-factor`, value: score, sourceType: 'ecomind-estimate' as const, sourceLabel: 'EcoMind prototype packaging factors', confidence: 'low' as const }]
  const estimated = packaging.sourceType === 'retailer-policy' || packaging.sourceType === 'ecomind-estimate' || packaging.confidence === 'low'
  return estimated ? { status: 'estimated', score, range: [Math.max(0, score - 15), Math.min(100, score + 15)], evidence } : { status: 'known', score, evidence }
}

export function scoreRealProduct(product: ParsedProduct): RealProductScore {
  const factors: Record<ScoreFactorKey, FactorResult> = {
    materials: materialFactor(product),
    carbon: { status: 'unknown', score: null, evidence: [] },
    recycled: recycledFactor(product),
    durability: { status: 'unknown', score: null, evidence: [] },
    fulfilmentPackaging: packagingFactor(product, 'fulfilment'),
    manufacturerPackaging: packagingFactor(product, 'manufacturer'),
  }
  const known = (Object.keys(factors) as ScoreFactorKey[]).filter((key) => factors[key].status !== 'unknown')
  const knownWeight = known.reduce((sum, key) => sum + SCORE_WEIGHTS[key], 0)
  const weightedMid = known.reduce((sum, key) => sum + (factors[key].score ?? 0) * SCORE_WEIGHTS[key], 0)
  const baseScore = knownWeight > 0 ? Math.round(weightedMid / knownWeight) : null
  const adjustment = certificationAdjustment(product.certifications)
  const score = baseScore === null ? null : Math.min(100, baseScore + adjustment)
  const lowerKnown = known.reduce((sum, key) => { const factor = factors[key]; const value = factor.status === 'estimated' ? factor.range[0] : factor.score ?? 0; return sum + value * SCORE_WEIGHTS[key] }, 0)
  const upperKnown = known.reduce((sum, key) => { const factor = factors[key]; const value = factor.status === 'estimated' ? factor.range[1] : factor.score ?? 0; return sum + value * SCORE_WEIGHTS[key] }, 0)
  const unknownWeight = 1 - knownWeight
  const range: [number, number] | null = score === null ? null : [Math.min(100, Math.floor(lowerKnown) + adjustment), Math.min(100, Math.ceil(upperKnown + unknownWeight * 100) + adjustment)]
  const hasCompleteComposition = product.materials.length > 0
    && product.materials.every((material) => material.percentage !== null)
    && !product.materialCompositionUncertain
  const canScore = product.isClothing && hasCompleteComposition
  const grade = !canScore || score === null ? null : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : score >= 25 ? 'D' : 'E'
  const packagingMissing = !product.packaging.fulfilment || !product.packaging.manufacturer
  const hasEstimatedPackaging = [product.packaging.fulfilment, product.packaging.manufacturer].some((item) => item?.sourceType === 'retailer-policy' || item?.confidence === 'low')
  const confidence: ConfidenceLevel = known.length >= 5 && !packagingMissing && !hasEstimatedPackaging && !product.materialCompositionUncertain ? 'High' : known.length >= 2 && !product.materialCompositionUncertain ? 'Medium' : 'Low'
  const explanation = !product.isProduct ? 'EcoMind could not confirm that this is a product page.' : !product.isClothing ? 'Product detected, but EcoMind currently scores clothing and textile products.' : !canScore ? 'A complete, internally consistent percentage composition is needed before EcoMind can calculate a provisional score.' : `${known.length} of 6 factors contain sufficient evidence. Missing fulfilment or manufacturer packaging stays unknown and can change the score.`
  return { score: canScore ? score : null, range: canScore ? range : null, grade, confidence, factors, knownFactorCount: known.length, provisional: true, canScore, explanation, baseScore: canScore ? baseScore : null, certificationAdjustment: adjustment }
}
