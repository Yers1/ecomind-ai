import { ArrowDown, ChartBar, CheckCircle, Info, LockKey, Package, Recycle, SealCheck, ShirtFolded, Storefront } from '@phosphor-icons/react'

const materialData = [
  { label: 'Recycled polyester', value: 68 },
  { label: 'Organic cotton', value: 61 },
  { label: 'Linen', value: 44 },
  { label: 'Lyocell', value: 37 },
]

const categoryData = [
  { label: 'T-shirts', value: 31 }, { label: 'Outerwear', value: 24 }, { label: 'Denim', value: 19 }, { label: 'Activewear', value: 16 }, { label: 'Accessories', value: 10 },
]

function BarChart({ title, data, suffix = '%' }: { title: string; data: Array<{ label: string; value: number }>; suffix?: string }) {
  return <section className="insight-panel" aria-labelledby={`${title.replaceAll(' ', '-')}-title`}>
    <div className="insight-panel__heading"><div><span>Fictional sample</span><h2 id={`${title.replaceAll(' ', '-')}-title`}>{title}</h2></div><ChartBar size={24} weight="duotone" /></div>
    <div className="insight-bars">{data.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>{item.value}{suffix}</strong></div><div className="insight-bar" aria-label={`${item.label}: ${item.value}${suffix}`}><i style={{ width: `${item.value}%` }} /></div></div>)}</div>
  </section>
}

export function RetailerInsightsPage() {
  return <div className="insights-page page-surface">
    <header className="page-hero container insights-hero"><div><p className="kicker">Retailer Insights Demo</p><h1>Signals for better product decisions.</h1><p>A future-facing B2B concept showing how anonymous, aggregated preferences could help retailers improve materials, packaging and circular choices.</p></div><div className="prototype-flag"><Info size={19} /><span>Fictional demo data only<br /><small>Not real, representative or connected to users</small></span></div></header>
    <main className="container insights-content">
      <section className="insights-boundary"><LockKey size={24} weight="duotone" /><div><strong>No personal or behavioural records</strong><p>This concept contains no names, emails, browsing history, individual purchases or product-level user histories. Every number below is invented solely to demonstrate a possible aggregated view.</p></div></section>

      <section className="insight-metrics" aria-label="Fictional aggregated summary">
        <article><Recycle size={23} /><span>Recycled fibre interest</span><strong>72%</strong><small>fictional preference signal</small></article>
        <article><Package size={23} /><span>Reduced packaging interest</span><strong>64%</strong><small>fictional preference signal</small></article>
        <article><SealCheck size={23} /><span>Certification interest</span><strong>58%</strong><small>fictional preference signal</small></article>
        <article><Storefront size={23} /><span>Second-hand demand</span><strong>41%</strong><small>fictional preference signal</small></article>
      </section>

      <div className="insight-grid">
        <BarChart title="Preferred materials" data={materialData} />
        <section className="insight-panel fibre-panel"><div className="insight-panel__heading"><div><span>Fictional sample</span><h2>Recycled versus virgin fibres</h2></div><Recycle size={24} weight="duotone" /></div><div className="fibre-split" role="img" aria-label="Fictional sample: recycled fibres 62 percent, virgin fibres 38 percent"><div><strong>62%</strong><span>Recycled</span></div><div><strong>38%</strong><span>Virgin</span></div></div><p>A demonstration of how an aggregate materials preference could be compared—not a measurement of real demand.</p></section>
        <section className="insight-panel preference-list"><div className="insight-panel__heading"><div><span>Fictional sample</span><h2>Packaging preferences</h2></div><Package size={24} weight="duotone" /></div><ul><li><CheckCircle size={17} weight="fill" /><span>Minimal fulfilment packaging</span><strong>67%</strong></li><li><CheckCircle size={17} weight="fill" /><span>Recyclable manufacturer packaging</span><strong>59%</strong></li><li><CheckCircle size={17} weight="fill" /><span>Reusable mailer option</span><strong>36%</strong></li></ul></section>
        <section className="insight-panel preference-list"><div className="insight-panel__heading"><div><span>Fictional sample</span><h2>Certification interest</h2></div><SealCheck size={24} weight="duotone" /></div><ul><li><CheckCircle size={17} weight="fill" /><span>OEKO-TEX® STANDARD 100</span><strong>63%</strong></li><li><CheckCircle size={17} weight="fill" /><span>GOTS</span><strong>57%</strong></li><li><CheckCircle size={17} weight="fill" /><span>Fairtrade Textile Standard</span><strong>42%</strong></li></ul></section>
        <BarChart title="Product categories compared" data={categoryData} />
        <section className="insight-panel secondhand-panel"><ShirtFolded size={30} weight="duotone" /><span>Fictional sample</span><strong>41%</strong><h2>Would explore a second-hand alternative</h2><p>This demo signal could help a future retailer decide where to surface resale or repair pathways.</p></section>
      </div>

      <section className="insights-download"><div><p className="kicker">Export the demonstration</p><h2>Inspect the sample aggregate dataset.</h2><p>The CSV repeats the fictional/demo label in its metadata and contains aggregate categories only.</p></div><a className="button button--primary" href="/downloads/ecomind-retailer-insights-demo.csv" download><ArrowDown size={18} /> Download sample CSV</a></section>
      <section className="insights-future"><Info size={22} /><p><strong>Potential future B2B concept.</strong> This dashboard is not currently connected to EcoMind users, retailers, analytics or live data. Any real version would require explicit consent, privacy review, minimum aggregation thresholds and statistical validation.</p></section>
    </main>
  </div>
}
