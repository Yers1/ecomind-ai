import { Leaf } from '@phosphor-icons/react'
import type { Product } from '../types'
import { calculateGreenScore } from '../lib/scoring'
import { ConfidenceBadge } from './ConfidenceBadge'
import { TrafficLightResult } from './TrafficLight'

export function AlternativeCard({ product }: { product: Product }) {
  const result = calculateGreenScore(product)
  return (
    <article className="alternative-card">
      <div className="alternative-card__intro">
        <span className="alternative-card__icon"><Leaf size={18} weight="fill" /></span>
        <div>
          <h3>Here is a lower-impact option at a similar price.</h3>
          <p>It costs a little more, so compare the trade-off and choose what works for you.</p>
        </div>
      </div>
      <div className="alternative-card__product">
        <img src={product.image} alt={product.productName} />
        <div>
          <span>Suggested alternative</span>
          <h4>{product.productName}</h4>
          <div className="alternative-card__meta">
            <b>£{product.price.toFixed(2)}</b>
            <ConfidenceBadge level={product.confidenceLevel} />
          </div>
        </div>
        <TrafficLightResult score={result.score} hasSufficientEvidence={result.knownWeight >= .35} provisional={result.provisional} confidence={product.confidenceLevel} grade={result.grade} compact />
      </div>
      <div className="recommendation-reasons"><strong>Why EcoMind recommends this product</strong><ul><li>{product.materials.map((item) => `${item.percentage}% ${item.material.toLowerCase()} disclosed`).join(', ')}</li><li>{product.certifications.some((item) => item.status === 'verified' && item.affectsEnvironmentalScore) ? 'Relevant verified environmental certification evidence available' : 'No verified environmental certification used'}</li><li>{product.confidenceLevel} data confidence</li><li>Similar price to the current demo product</li></ul></div>
    </article>
  )
}
