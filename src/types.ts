export type ConfidenceLevel = 'High' | 'Medium' | 'Low'
export type PackagingType = 'plastic-mailer' | 'recycled-paper' | 'minimal-recycled-cardboard'

export interface MaterialShare {
  material: string
  percentage: number
}

export interface Product {
  id: string
  productName: string
  shortName: string
  category: 'Clothing'
  image: string
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
  sourceLabels: string[]
  missingFields: string[]
  confidenceLevel: ConfidenceLevel
  alternativeProductId: string | null
  peopleInformation: string
  mainAdvantage: string
  tradeOff: string
}

export interface ScoreBreakdownItem {
  key: 'materials' | 'carbon' | 'recycled' | 'durability' | 'packaging'
  label: string
  score: number
  weight: number
  weightedPoints: number
  detail: string
}

export interface ScoreResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'E'
  status: string
  explanation: string
  breakdown: ScoreBreakdownItem[]
}

export interface ActivityItem {
  id: string
  title: string
  detail: string
  points: number
  date: string
}
