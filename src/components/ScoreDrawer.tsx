import { ArrowsLeftRight, BookmarkSimple, Brain, CheckCircle, Database, Info, Question, Warning, X } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import type { Product, ScoreResult } from '../types'
import { AlternativeCard } from './AlternativeCard'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ScoreBadge } from './ScoreBadge'
import { ScoreBreakdown } from './ScoreBreakdown'
import { useAccessibleDialog } from '../hooks/useAccessibleDialog'
import { TrafficLightLegend } from './TrafficLight'

export function ScoreDrawer({
  product,
  result,
  alternative,
  open,
  onClose,
  onCompare,
  onSave,
}: {
  product: Product
  result: ScoreResult
  alternative: Product | null
  open: boolean
  onClose: () => void
  onCompare: () => void
  onSave: () => void
}) {
  const dialogRef = useAccessibleDialog(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} className="score-drawer" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
        <header className="score-drawer__header">
          <div><span className="drawer-brand">EcoMind analysis</span><ConfidenceBadge level={product.confidenceLevel} /></div>
          <button data-dialog-initial className="icon-button" onClick={onClose} aria-label="Close product analysis"><X size={22} /></button>
        </header>
        <div className="score-drawer__content">
          <div className="drawer-product">
            <img src={product.image} alt={product.productName} />
            <div><span>Sample listing</span><h2 id="analysis-title">{product.productName}</h2><p>£{product.price.toFixed(2)}</p></div>
          </div>
          <section className={`score-hero score-hero--${result.grade.toLowerCase()}`}>
            <ScoreBadge result={result} confidence={product.confidenceLevel} size="large" />
            <div><span>{result.status}</span><h3>{result.explanation}</h3><p>{result.range ? `Estimated range: ${result.range.min}–${result.range.max}/100. Missing values are not treated as confirmed zero.` : 'Estimated score based on available sample product information.'}</p></div>
          </section>
          <details className="traffic-help"><summary><Info size={18} /> How to read the traffic light</summary><TrafficLightLegend /></details>
          <div className="ai-method-note">
            <Brain size={20} weight="duotone" />
            <p><strong>Simulated AI analysis</strong> AI helps interpret product information. The score is calculated using the published EcoMind methodology.</p>
          </div>
          <details className="ai-extraction">
            <summary><span><Brain size={19} /> See what AI extracted</span><Info size={18} /></summary>
            <div className="ai-extraction__body">
              <div><span>Product listing text</span><blockquote>“{product.listingText}”</blockquote></div>
              <dl>
                <div><dt>Material</dt><dd>{product.materials.map((item) => item.material).join(', ') || 'Not disclosed'}</dd></div>
                <div><dt>Material percentage</dt><dd>{product.materials.map((item) => `${item.percentage}%`).join(', ') || 'Not disclosed'}</dd></div>
                <div><dt>Packaging</dt><dd>{product.packagingType ? product.packagingType.replaceAll('-', ' ') : 'Not disclosed'}</dd></div>
                <div><dt>Manufacturing location</dt><dd>Not disclosed</dd></div>
                <div><dt>Supplier lifecycle assessment</dt><dd>Not disclosed</dd></div>
                <div><dt>Confidence</dt><dd>{product.confidenceLevel}</dd></div>
              </dl>
              <p>AI helps extract and structure product information. The published EcoMind formula calculates the Green Score; no missing environmental facts are invented.</p>
            </div>
          </details>
          <section className="drawer-section">
            <div className="drawer-section__heading"><h3>Score breakdown</h3><span>Weighted to 100</span></div>
            <ScoreBreakdown result={result} />
          </section>
          <section className="drawer-section evidence-section">
            <div className="drawer-section__heading"><h3>Information behind this score</h3></div>
            <div className="evidence-grid">
              <div className="evidence-box evidence-box--used">
                <h4><CheckCircle size={18} weight="fill" /> Information used</h4>
                <ul>
                  <li>{product.materials.map((item) => `${item.percentage}% ${item.material}`).join(', ')}</li>
                  <li>{product.estimatedCarbonKg === null ? 'Carbon: Not disclosed' : `Carbon: about ${product.estimatedCarbonKg.toFixed(1)} kg CO2e (${product.carbonValueType})`}</li>
                  <li>{product.packagingType ? 'Packaging details available' : 'Packaging: Not disclosed'}</li>
                  <li>Demo durability and circularity ratings</li>
                </ul>
              </div>
              <div className="evidence-box evidence-box--missing">
                <h4><Warning size={18} weight="fill" /> Missing information</h4>
                {product.missingFields.length ? <ul>{product.missingFields.map((field) => <li key={field}>{field}: Not disclosed</li>)}</ul> : <p>No major gaps in this demo listing.</p>}
                {product.missingFields.length > 0 && <p className="missing-explanation">Absence of information does not prove poor performance; it lowers confidence and may widen the provisional range.</p>}
              </div>
            </div>
          </section>
          <section className="drawer-section source-section">
            <div className="drawer-section__heading"><h3>Sources and confidence</h3><ConfidenceBadge level={product.confidenceLevel} /></div>
            <p>Confidence describes the quality and completeness of the available data. It does not change the Green Score.</p>
            <div className="source-labels">
              {product.sources.map((source) => <span key={`${source.type}-${source.label}`} title={source.note}><Database size={15} /> {source.label} · {source.type.replaceAll('-', ' ')}</span>)}
            </div>
          </section>
          <details className="method-details">
            <summary><span><Question size={19} /> How we calculate the score</span><Info size={18} /></summary>
            <p><code>Score = materials × 35% + carbon × 25% + recycled content × 20% + durability and circularity × 10% + packaging × 10%</code></p>
            <p>The demo uses fixed material factors and a simple carbon scale. It is not a lifecycle assessment or certification.</p>
          </details>
          <section className="drawer-section people-section">
            <div className="drawer-section__heading"><h3>People information</h3><span>Separate from score</span></div>
            <p>{product.peopleInformation}</p>
          </section>
          {alternative && <AlternativeCard product={alternative} />}
          {!alternative && (
            <div className="best-local-option"><CheckCircle size={22} weight="fill" /><div><h3>Best local match in this demo</h3><p>No stronger alternative was found in the sample dataset. You could also repair, reuse or skip a new purchase.</p></div></div>
          )}
          <p className="drawer-disclaimer">Scores are estimates, not official certifications. Product listings can be incomplete or incorrect.</p>
        </div>
        <footer className="score-drawer__footer">
          <button className="button button--secondary" onClick={onSave}><BookmarkSimple size={18} /> Save item</button>
          {alternative ? <button className="button button--primary" onClick={onCompare}>Compare greener alternative <ArrowsLeftRight size={18} /></button> : <button className="button button--primary" onClick={onSave}>Save product</button>}
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
