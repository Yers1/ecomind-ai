import { ArrowRight, Brain, CheckCircle, Database, Leaf, Package, Recycle, ShieldCheck, WarningCircle, Wind } from '@phosphor-icons/react'
import type { Page } from '../components/AppShell'
import { getProduct } from '../data/products'
import { calculateGreenScore, SCORE_WEIGHTS } from '../lib/scoring'

const factors = [
  { icon: Leaf, name: 'Material impact', weight: SCORE_WEIGHTS.materials, text: 'A weighted score from the material mix using sample textile factors.' },
  { icon: Wind, name: 'Estimated carbon footprint', weight: SCORE_WEIGHTS.carbon, text: 'A simple demo scale using listed or estimated kg CO2e values.' },
  { icon: Recycle, name: 'Recycled content', weight: SCORE_WEIGHTS.recycled, text: 'The disclosed recycled-fibre percentage. Missing values remain unknown and make the result provisional.' },
  { icon: ShieldCheck, name: 'Durability and circularity', weight: SCORE_WEIGHTS.durability, text: 'The average of two demo ratings for product life and end-of-life potential.' },
  { icon: Package, name: 'Packaging', weight: SCORE_WEIGHTS.packaging, text: 'A sample factor for plastic, paper or minimal recycled-card packaging.' },
]

export function MethodologyPage({ navigate }: { navigate: (page: Page) => void }) {
  const sample = getProduct('renew-loop-tee')
  const result = calculateGreenScore(sample)
  return (
    <div className="methodology-page page-surface">
      <header className="page-hero container method-header"><div><p className="kicker">Published EcoMind methodology</p><h1>One score. Five visible factors.</h1><p>The numeric Green Score is deterministic. AI interprets listing text but never decides the score.</p></div><div className="method-score"><strong>{result.score}</strong><span>/100</span><b>{result.grade}</b><small>sample calculation</small></div></header>
      <div className="container method-content">
        <section className="formula-card"><div><h2>The formula</h2><p>Each factor is normalised from 0 to 100, multiplied by its fixed weight, then rounded to the nearest whole number.</p></div><code>Green Score = M × 0.35 + C × 0.25 + R × 0.20 + D × 0.10 + P × 0.10</code></section>
        <section className="factor-list">
          <div className="section-heading"><h2>Factor definitions</h2><p>These weights stay the same across every clothing product in the prototype.</p></div>
          {factors.map((factor) => { const Icon = factor.icon; return <article key={factor.name}><div className="factor-icon"><Icon size={22} /></div><div><h3>{factor.name}</h3><p>{factor.text}</p></div><strong>{Math.round(factor.weight * 100)}%</strong></article> })}
        </section>
        <section className="worked-example">
          <div className="worked-example__product"><img src={sample.image} alt={sample.productName} /><div><span>Worked demo example</span><h2>{sample.shortName}</h2><p>All numbers below are sample or estimated data.</p></div></div>
          <div className="worked-example__math">
            {result.breakdown.map((item) => <div key={item.key}><span>{item.label}</span><code>{item.score === null ? 'Not disclosed' : `${Math.round(item.score)} × ${Math.round(item.weight * 100)}%`}</code><strong>{item.weightedPoints === null ? 'Unknown' : `${item.weightedPoints.toFixed(1)} pts`}</strong></div>)}
            <div className="worked-example__total"><span>Rounded total</span><code>{result.breakdown.map((item) => item.weightedPoints?.toFixed(1) ?? 'unknown').join(' + ')}</code><strong>{result.score}/100</strong></div>
          </div>
        </section>
        <section className="confidence-method">
          <div><h2>Confidence is separate</h2><p>Confidence explains how complete and reliable the available product information is. It never increases a Green Score.</p></div>
          <div className="confidence-levels"><article><CheckCircle size={20} weight="fill" /><div><h3>High</h3><p>Most relevant fields are available.</p></div></article><article><Database size={20} weight="fill" /><div><h3>Medium</h3><p>Some values are missing or estimated.</p></div></article><article><WarningCircle size={20} weight="fill" /><div><h3>Low</h3><p>Important product information is unavailable.</p></div></article></div>
        </section>
        <section className="ai-boundary"><Brain size={29} weight="duotone" /><div><h2>Where interpretation helps</h2><p>Local deterministic logic extracts materials, structures fields, flags uncertainty and writes a plain-language explanation. Real products are compared only with other products the user has analysed; the fictional alternative remains confined to Threadly.</p></div><div className="ai-boundary__rule"><strong>Rules interpret.</strong><span>The formula scores.</span></div></section>
        <section className="method-caveats"><h2>Important limitations</h2><div><p><strong>Prototype weights.</strong> The five weights are assumptions and have not been scientifically validated.</p><p><strong>Possible overlap.</strong> Material-impact and carbon factors may represent some of the same underlying impacts.</p><p><strong>Missing means unknown.</strong> EcoMind displays “Not disclosed”, reduces confidence and shows a provisional range instead of treating unknown as zero.</p><p><strong>Not a certification.</strong> EcoMind is an educational decision-support tool, not a lifecycle assessment or official label.</p><p><strong>People information stays separate.</strong> Labour ethics is not included in this environmental score.</p><p><strong>Expert review required.</strong> Factors, thresholds, confidence rules and wording require independent review before real-world use.</p></div></section>
        <section className="source-catalogue">
          <div><h2>Source labels used in this demo</h2><p>Every value is attached to a source type. None of these labels imply an external partnership or verified dataset.</p></div>
          <div>{sample.sources.map((source) => <article key={`${source.type}-${source.label}`}><span>{source.type.replaceAll('-', ' ')}</span><h3>{source.label}</h3><p>{source.note}</p></article>)}</div>
        </section>
        <section className="future-data"><h2>Real-page evidence</h2><p>The extension can structure fields disclosed on an active clothing product page after user activation. A material-based factor may use a clearly labelled EcoMind prototype range; carbon and durability remain unknown unless supporting evidence exists. Retailer markup changes, user corrections are labelled separately, and every real-page result remains provisional.</p></section>
        <section className="future-data"><h2>What production data would require</h2><p>A real release could use reviewed lifecycle-assessment data, environmental-footprint datasets, licensed textile datasets, independently checked certifications and permissioned retailer product information. EcoMind would need provenance, versioning, geographic relevance and expert review before using any source in a consumer-facing score.</p></section>
        <section className="method-next"><div><h2>See the methodology in action</h2><p>Compare products with high, medium and low confidence.</p></div><button className="button button--primary" onClick={() => navigate('demo')}>Open product demo <ArrowRight size={18} /></button></section>
      </div>
    </div>
  )
}
