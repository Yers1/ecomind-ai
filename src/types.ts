import type { ProductRecord } from '../shared/ecomind'
export type { CertificationCategory, CertificationDefinition, CertificationEvidence } from '../shared/certifications/certificationRegistry'

export type {
  ConfidenceLevel,
  DataSource,
  MaterialShare,
  PackagingEvidence,
  PackagingSourceType,
  ProductPackaging,
  ProductRecord,
  ScoreBreakdownItem,
  ScoreFactorKey,
  ScoreResult,
} from '../shared/ecomind'

export interface Product extends ProductRecord {
  image: string
}

export interface ActivityItem {
  id: string
  title: string
  detail: string
  points: number
  date: string
  timestamp?: string
}
