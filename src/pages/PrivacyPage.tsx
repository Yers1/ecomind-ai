import { ArrowRight, CheckCircle, Cookie, Database, Eye, HandPalm, LockKey, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import type { Page } from '../components/AppShell'

const promises = [
  { icon: HandPalm, title: 'User activated', text: 'EcoMind analyses a product only after you activate the widget.' },
  { icon: Eye, title: 'No full browsing history', text: 'This prototype does not read or collect your complete browsing history.' },
  { icon: LockKey, title: 'No payment data', text: 'EcoMind does not collect card details or payment information.' },
  { icon: Database, title: 'Stored on your device', text: 'Wishlist, demo profile and EcoPoints use browser local storage.' },
]

export function PrivacyPage({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <div className="privacy-page page-surface">
      <header className="page-hero container privacy-header"><div><p className="kicker">Privacy by design</p><h1>Analyse a product, not a person.</h1><p>You choose when EcoMind activates, what you save and whether progress stays on this device.</p></div><div className="privacy-shield"><ShieldCheck size={64} weight="duotone" /><span>Minimum data</span></div></header>
      <div className="container privacy-content">
        <section className="privacy-grid">{promises.map((item) => { const Icon = item.icon; return <article key={item.title}><Icon size={25} /><h2>{item.title}</h2><p>{item.text}</p></article> })}</section>
        <section className="data-choice"><div><h2>Your choices stay in your control</h2><p>The prototype does not sell shopping history. You can analyse as a guest and decide whether to keep local progress.</p><div className="data-choice__list"><span><CheckCircle size={18} weight="fill" /> Analyse as a guest</span><span><CheckCircle size={18} weight="fill" /> Choose whether to save</span><span><CheckCircle size={18} weight="fill" /> Remove wishlist items</span><span><CheckCircle size={18} weight="fill" /> Clear local storage in your browser</span></div></div><div className="local-storage-card"><Cookie size={31} weight="duotone" /><h3>Local prototype storage</h3><p><code>ecomind-ai-demo-state-v2</code></p><small>Stores wishlist IDs, demo points, completed actions and demo sign-in state. The extension uses its own <code>chrome.storage.local</code> key.</small></div></section>
        <section className="extension-future"><div className="extension-future__icon"><LockKey size={28} /></div><div><h2>The extension requests only minimum permissions</h2><p><code>activeTab</code> and <code>scripting</code> are used only after the user clicks Analyse; <code>storage</code> keeps the wishlist, preferences and demo EcoPoints locally. No browsing-history or payment permission is requested.</p></div></section>
        <section className="ethics-section"><div><h2>Honest scoring matters</h2><p>Environmental information can be incomplete, inconsistent or wrong. EcoMind should make uncertainty visible and avoid judging users for affordable choices.</p></div><div className="ethics-principles"><article><WarningCircle size={20} weight="fill" /><h3>Estimate, not certification</h3><p>Scores never claim official approval or guaranteed impact.</p></article><article><Eye size={20} weight="fill" /><h3>Evidence is visible</h3><p>Users can inspect the source labels and every missing field.</p></article><article><HandPalm size={20} weight="fill" /><h3>No shame</h3><p>Suggestions acknowledge price, access and practical trade-offs.</p></article><article><ShieldCheck size={20} weight="fill" /><h3>Review before release</h3><p>Scoring data needs expert review, bias testing and user research.</p></article></div></section>
        <section className="privacy-disclaimer"><h2>Prototype disclaimer</h2><p>EcoMind AI currently uses only local sample product data. It is not connected to Amazon, retailers, payment services, open product databases or certification bodies. No official partnerships are claimed.</p></section>
        <section className="method-next"><div><h2>Try a privacy-conscious analysis</h2><p>The widget stays inactive until you choose to start.</p></div><button className="button button--primary" onClick={() => navigate('demo')}>Open product demo <ArrowRight size={18} /></button></section>
      </div>
    </div>
  )
}
