import { CheckCircle, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { Product } from '../types'
import { packagingLabels } from '../data/products'
import { calculateGreenScore } from '../lib/scoring'
import { ConfidenceBadge } from './ConfidenceBadge'

const formatMaterials = (product: Product) => product.materials.map((item) => `${item.percentage}% ${item.material}`).join(', ')
const formatCarbon = (product: Product) => product.estimatedCarbonKg === null ? 'Not disclosed' : `About ${product.estimatedCarbonKg.toFixed(1)} kg CO2e (${product.carbonValueType})`

export function ProductComparison({ current, alternative, open, onClose, onChoose }: { current: Product; alternative: Product; open: boolean; onClose: () => void; onChoose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
  if (!open) return null
  const currentScore = calculateGreenScore(current)
  const alternativeScore = calculateGreenScore(alternative)
  const rows = [
    ['Green Score', `${currentScore.score}/100, ${currentScore.grade}`, `${alternativeScore.score}/100, ${alternativeScore.grade}`],
    ['Materials', formatMaterials(current), formatMaterials(alternative)],
    ['Recycled content', current.recycledContentPercentage === null ? 'Not disclosed' : `${current.recycledContentPercentage}%`, alternative.recycledContentPercentage === null ? 'Not disclosed' : `${alternative.recycledContentPercentage}%`],
    ['Estimated carbon', formatCarbon(current), formatCarbon(alternative)],
    ['Packaging', current.packagingType ? packagingLabels[current.packagingType] : 'Not disclosed', alternative.packagingType ? packagingLabels[alternative.packagingType] : 'Not disclosed'],
    ['Price', `£${current.price.toFixed(2)}`, `£${alternative.price.toFixed(2)}`],
    ['Main advantage', current.mainAdvantage, alternative.mainAdvantage],
    ['Trade-off', current.tradeOff, alternative.tradeOff],
  ]
  return (
    <div className="modal-layer modal-layer--comparison" role="presentation">
      <section className="modal comparison-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <button ref={closeRef} className="icon-button modal__close" onClick={onClose} aria-label="Close comparison"><X size={22} /></button>
        <p className="kicker">Side-by-side</p>
        <h2 id="compare-title">Compare the details, not just the score</h2>
        <p className="comparison-modal__support">The lower-impact option is a suggestion, not a judgement. Price and practicality matter too.</p>
        <div className="comparison-products">
          <div className="comparison-product">
            <img src={current.image} alt="" />
            <div><span>Current item</span><h3>{current.shortName}</h3><ConfidenceBadge level={current.confidenceLevel} /></div>
          </div>
          <div className="comparison-product comparison-product--recommended">
            <img src={alternative.image} alt="" />
            <div><span><CheckCircle size={16} weight="fill" /> Lower-impact option</span><h3>{alternative.shortName}</h3><ConfidenceBadge level={alternative.confidenceLevel} /></div>
          </div>
        </div>
        <div className="comparison-table" role="table" aria-label="Product sustainability comparison">
          {rows.map(([label, left, right]) => (
            <div className="comparison-row" role="row" key={label}>
              <strong role="rowheader">{label}</strong>
              <span role="cell">{left}</span>
              <span role="cell">{right}</span>
            </div>
          ))}
          <div className="comparison-row comparison-row--confidence" role="row">
            <strong role="rowheader">Confidence</strong>
            <span role="cell"><ConfidenceBadge level={current.confidenceLevel} /></span>
            <span role="cell"><ConfidenceBadge level={alternative.confidenceLevel} /></span>
          </div>
        </div>
        <div className="comparison-modal__footer">
          <small>All values are sample or estimated data for this prototype.</small>
          <button className="button button--primary" onClick={onChoose}>Choose greener option</button>
        </div>
      </section>
    </div>
  )
}
