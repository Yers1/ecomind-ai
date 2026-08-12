import type { ProductRecord } from '../shared/ecomind'

export type {
  ConfidenceLevel,
  DataSource,
  MaterialShare,
  PackagingType,
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
}
