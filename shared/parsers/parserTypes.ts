export type EvidenceSourceType =
  | 'json-ld'
  | 'meta'
  | 'visible-page'
  | 'amazon-selector'
  | 'manual-user-input'
  | 'ecomind-estimate'

export type EvidenceSource = {
  field: string
  value: string | number | null
  sourceType: EvidenceSourceType
  sourceLabel: string
  selector?: string
  confidence: 'high' | 'medium' | 'low'
}

export type ParsedMaterial = {
  name: string
  percentage: number | null
  evidence: string
  originalName?: string
}

export type ParserId =
  | 'amazon'
  | 'hm'
  | 'nike'
  | 'shopify'
  | 'generic-json-ld'
  | 'generic-meta'
  | 'generic-visible'
  | 'threadly'
  | 'manual'

export type ParsedProduct = {
  url: string
  retailer: string
  productId: string | null
  title: string | null
  brand: string | null
  category: string | null
  price: number | null
  currency: string | null
  imageUrl: string | null
  description: string | null
  featureText: string[]
  materials: ParsedMaterial[]
  materialCompositionUncertain: boolean
  recycledContentPercentage: number | null
  certifications: string[]
  weightGrams: number | null
  packaging: string | null
  countryOfOrigin: string | null
  careInstructions: string | null
  evidence: EvidenceSource[]
  missingFields: string[]
  parserUsed: ParserId
  isProduct: boolean
  isClothing: boolean
}

export type ParserDiagnostics = {
  url: string
  parserSelected: ParserId
  matchedSelectors: string[]
  jsonLdProductFound: boolean
  rawFields: Record<string, unknown>
  normalisedFields: Record<string, unknown>
  rejectedFields: string[]
  missingFields: string[]
}

export type ParserResult = {
  product: ParsedProduct
  diagnostics: ParserDiagnostics
}

export interface ProductPageParser {
  id: ParserId
  canParse(document: Document, url: string): boolean
  parse(document: Document, url: string): ParserResult
}

export type ManualCorrections = {
  title?: string | null
  materialText?: string | null
  recycledContentPercentage?: number | null
  packaging?: string | null
  markNotDisclosed?: Array<'materials' | 'recycledContent' | 'packaging'>
}
