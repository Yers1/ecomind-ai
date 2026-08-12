import { BookmarkSimple, CheckCircle, Eye, X } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import type { Product } from '../types'
import { packagingLabels } from '../data/products'
import { calculateGreenScore, formatScore } from '../lib/scoring'
import { ConfidenceBadge } from './ConfidenceBadge'
import { useAccessibleDialog } from '../hooks/useAccessibleDialog'

const formatMaterials = (product: Product) => product.materials.map((item) => `${item.percentage}% ${item.material}`).join(', ')
const formatCarbon = (product: Product) => product.estimatedCarbonKg === null ? 'Not disclosed' : `About ${product.estimatedCarbonKg.toFixed(1)} kg CO2e (${product.carbonValueType})`

export function ProductComparison({ current, alternative, open, onClose, onSave, onView }: { current: Product; alternative: Product; open: boolean; onClose: () => void; onSave: () => void; onView?: () => void }) {
  const dialogRef = useAccessibleDialog(open, onClose)
  if (!open) return null
  const currentScore = calculateGreenScore(current)
  const alternativeScore = calculateGreenScore(alternative)
  const rows = [
    ['Green Score', `${formatScore(currentScore)}/100, ${currentScore.grade}${currentScore.provisional ? ' provisional' : ''}`, `${formatScore(alternativeScore)}/100, ${alternativeScore.grade}${alternativeScore.provisional ? ' provisional' : ''}`],
    ['Materials', formatMaterials(current), formatMaterials(alternative)],
    ['Recycled content', current.recycledContentPercentage === null ? 'Not disclosed' : `${current.recycledContentPercentage}%`, alternative.recycledContentPercentage === null ? 'Not disclosed' : `${alternative.recycledContentPercentage}%`],
    ['Estimated carbon', formatCarbon(current), formatCarbon(alternative)],
    ['Packaging', current.packagingType ? packagingLabels[current.packagingType] : 'Not disclosed', alternative.packagingType ? packagingLabels[alternative.packagingType] : 'Not disclosed'],
    ['Price', `£${current.price.toFixed(2)}`, `£${alternative.price.toFixed(2)}`],
    ['Main advantage', current.mainAdvantage, alternative.mainAdvantage],
    ['Trade-off', current.tradeOff, alternative.tradeOff],
  ]
  return createPortal(
    <div className="modal-layer modal-layer--comparison" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal comparison-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <button data-dialog-initial className="icon-button modal__close" onClick={onClose} aria-label="Close comparison"><X size={22} /></button>
        <p className="kicker">Side-by-side</p>
        <h2 id="compare-title">Compare the details, not just the score</h2>
        <p className="comparison-modal__support">The lower-impact option is a suggestion, not a judgement. Price and practicality matter too.</p>
        <div className="comparison-products">
          <div className="comparison-product">
            <img src={current.image} alt={current.productName} />
            <div><span>Current item</span><h3>{current.shortName}</h3><ConfidenceBadge level={current.confidenceLevel} /></div>
          </div>
          <div className="comparison-product comparison-product--recommended">
            <img src={alternative.image} alt={alternative.productName} />
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
          <div className="comparison-modal__actions">
            {onView && <button className="button button--secondary" onClick={onView}><Eye size={17} /> View greener product</button>}
            <button className="button button--primary" onClick={onSave}><BookmarkSimple size={17} /> Save lower-impact option</button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
