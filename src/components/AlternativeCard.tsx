import { ArrowRight, Leaf } from '@phosphor-icons/react'
import type { Product } from '../types'
import { calculateGreenScore } from '../lib/scoring'
import { ConfidenceBadge } from './ConfidenceBadge'

export function AlternativeCard({ product, onCompare, onChoose }: { product: Product; onCompare: () => void; onChoose: () => void }) {
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
        <div className="alternative-card__score"><strong>{result.score}</strong><span>/100</span><b>{result.grade}</b></div>
      </div>
      <div className="alternative-card__actions">
        <button className="button button--secondary" onClick={onCompare}>Compare</button>
        <button className="button button--primary" onClick={onChoose}>Choose greener option <ArrowRight size={17} /></button>
      </div>
    </article>
  )
}
