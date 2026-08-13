import { PRODUCT_RECORDS, rankRecommendationCandidates } from '../../shared/ecomind'
import type { Product } from '../types'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
const productImages: Record<string, string> = {
  'polyester-everyday-tee': asset('/products/polyester-tee.png'),
  'cotton-classic-tee': asset('/products/cotton-tee.png'),
  'renew-loop-tee': asset('/products/recycled-tee.png'),
}

export const products: Product[] = PRODUCT_RECORDS.map((product) => ({ ...product, image: productImages[product.id] }))
export const getProduct = (id: string) => products.find((product) => product.id === id) ?? products[0]
export const getRecommendedProduct = (current: Product) => rankRecommendationCandidates(current, products)[0] as Product | undefined
