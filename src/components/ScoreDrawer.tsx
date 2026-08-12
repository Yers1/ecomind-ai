import { ArrowSquareOut, BookmarkSimple, Brain, CheckCircle, Database, Info, Question, Warning, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { Product, ScoreResult } from '../types'
import { AlternativeCard } from './AlternativeCard'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ScoreBadge } from './ScoreBadge'
import { ScoreBreakdown } from './ScoreBreakdown'

export function ScoreDrawer({
  product,
  result,
  alternative,
  open,
  onClose,
  onCompare,
  onSave,
  onChoose,
}: {
  product: Product
  result: ScoreResult
  alternative: Product | null
  open: boolean
  onClose: () => void
  onCompare: () => void
  onSave: () => void
  onChoose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="score-drawer" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
        <header className="score-drawer__header">
          <div><span className="drawer-brand">EcoMind analysis</span><ConfidenceBadge level={product.confidenceLevel} /></div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close product analysis"><X size={22} /></button>
        </header>
        <div className="score-drawer__content">
          <div className="drawer-product">
            <img src={product.image} alt={product.productName} />
            <div><span>Sample listing</span><h2 id="analysis-title">{product.productName}</h2><p>£{product.price.toFixed(2)}</p></div>
          </div>
          <section className={`score-hero score-hero--${result.grade.toLowerCase()}`}>
            <ScoreBadge result={result} size="large" />
            <div><span>{result.status}</span><h3>{result.explanation}</h3><p>Estimated score based on available sample product information.</p></div>
          </section>
          <div className="ai-method-note">
            <Brain size={20} weight="duotone" />
            <p><strong>Simulated AI analysis</strong> AI helps interpret product information. The score is calculated using the published EcoMind methodology.</p>
          </div>
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
              </div>
            </div>
          </section>
          <section className="drawer-section source-section">
            <div className="drawer-section__heading"><h3>Sources and confidence</h3><ConfidenceBadge level={product.confidenceLevel} /></div>
            <p>Confidence describes the quality and completeness of the available data. It does not change the Green Score.</p>
            <div className="source-labels">
              {product.sourceLabels.map((source) => <span key={source}><Database size={15} /> {source}</span>)}
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
          {alternative && <AlternativeCard product={alternative} onCompare={onCompare} onChoose={onChoose} />}
          {!alternative && (
            <div className="best-local-option"><CheckCircle size={22} weight="fill" /><div><h3>Best local match in this demo</h3><p>No stronger alternative was found in the sample dataset. You could also repair, reuse or skip a new purchase.</p></div></div>
          )}
          <p className="drawer-disclaimer">Scores are estimates, not official certifications. Product listings can be incomplete or incorrect.</p>
        </div>
        <footer className="score-drawer__footer">
          <button className="button button--secondary" onClick={onSave}><BookmarkSimple size={18} /> Save</button>
          {alternative ? <button className="button button--primary" onClick={onCompare}>Compare <ArrowSquareOut size={18} /></button> : <button className="button button--primary" onClick={onSave}>Save product</button>}
        </footer>
      </aside>
    </div>
  )
}
