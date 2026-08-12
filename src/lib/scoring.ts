import type { Product, ScoreResult } from '../types'
import { packagingLabels } from '../data/products'

export const SCORE_WEIGHTS = {
  materials: 0.35,
  carbon: 0.25,
  recycled: 0.2,
  durability: 0.1,
  packaging: 0.1,
} as const

const materialFactors: Record<string, number> = {
  Polyester: 28,
  Cotton: 48,
  'Recycled cotton': 80,
  Lyocell: 88,
}

const packagingFactors: Record<string, number> = {
  'plastic-mailer': 25,
  'recycled-paper': 75,
  'minimal-recycled-cardboard': 90,
}

const clamp = (value: number) => Math.min(100, Math.max(0, value))

export function calculateGreenScore(product: Product): ScoreResult {
  const materialScore = product.materials.reduce(
    (total, item) => total + (materialFactors[item.material] ?? 40) * (item.percentage / 100),
    0,
  )
  const carbonScore = product.estimatedCarbonKg === null ? 20 : clamp(100 - product.estimatedCarbonKg * 12)
  const recycledScore = product.recycledContentPercentage ?? 0
  const durabilityScore = (product.durabilityRating + product.circularityRating) / 2
  const packagingScore = product.packagingType ? packagingFactors[product.packagingType] : 30

  const breakdown = [
    {
      key: 'materials' as const,
      label: 'Material impact',
      score: materialScore,
      weight: SCORE_WEIGHTS.materials,
      weightedPoints: materialScore * SCORE_WEIGHTS.materials,
      detail: product.materials.map((item) => `${item.percentage}% ${item.material.toLowerCase()}`).join(', '),
    },
    {
      key: 'carbon' as const,
      label: 'Estimated carbon',
      score: carbonScore,
      weight: SCORE_WEIGHTS.carbon,
      weightedPoints: carbonScore * SCORE_WEIGHTS.carbon,
      detail:
        product.estimatedCarbonKg === null
          ? 'Not disclosed'
          : `${product.estimatedCarbonKg.toFixed(1)} kg CO2e, ${product.carbonValueType === 'listed' ? 'demo supplier value' : 'EcoMind estimate'}`,
    },
    {
      key: 'recycled' as const,
      label: 'Recycled content',
      score: recycledScore,
      weight: SCORE_WEIGHTS.recycled,
      weightedPoints: recycledScore * SCORE_WEIGHTS.recycled,
      detail:
        product.recycledContentPercentage === null
          ? 'Not disclosed'
          : `${product.recycledContentPercentage}% listed recycled content`,
    },
    {
      key: 'durability' as const,
      label: 'Durability and circularity',
      score: durabilityScore,
      weight: SCORE_WEIGHTS.durability,
      weightedPoints: durabilityScore * SCORE_WEIGHTS.durability,
      detail: `Demo durability ${product.durabilityRating}/100, circularity ${product.circularityRating}/100`,
    },
    {
      key: 'packaging' as const,
      label: 'Packaging',
      score: packagingScore,
      weight: SCORE_WEIGHTS.packaging,
      weightedPoints: packagingScore * SCORE_WEIGHTS.packaging,
      detail: product.packagingType ? packagingLabels[product.packagingType] : 'Not disclosed',
    },
  ]

  const score = Math.round(breakdown.reduce((total, item) => total + item.weightedPoints, 0))
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : score >= 25 ? 'D' : 'E'
  const status = grade === 'A' ? 'Lower impact' : grade === 'B' ? 'Good choice' : grade === 'C' ? 'Mixed impact' : 'Higher impact'
  const strongest = [...breakdown].sort((a, b) => b.score - a.score)[0]
  const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0]
  const explanation = `${strongest.label} helps this score, while ${weakest.label.toLowerCase()} is the main area for improvement.`

  return { score, grade, status, explanation, breakdown }
}

export const scoreTone = (score: number) => (score >= 65 ? 'positive' : score >= 45 ? 'mixed' : 'concern')
