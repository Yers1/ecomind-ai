import { ArrowRight, Brain, Eye, Heart, Leaf, LockKey, Recycle, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import type { Page } from '../components/AppShell'
import { Brand } from '../components/Brand'
import { KoalaMascot } from '../components/KoalaMascot'
import { ScoreBadge } from '../components/ScoreBadge'
import { getProduct } from '../data/products'
import { calculateGreenScore } from '../lib/scoring'

export function LandingPage({ navigate }: { navigate: (page: Page) => void }) {
  const heroProduct = getProduct('renew-loop-tee')
  const heroScore = calculateGreenScore(heroProduct)
  return (
    <div className="landing-page">
      <section className="hero container">
        <div className="hero__copy">
          <p className="kicker">Climate clarity for online shopping</p>
          <h1>Make greener choices while you shop.</h1>
          <p className="hero__sub">A clear Green Score, honest data gaps and lower-impact options at a similar price.</p>
          <div className="hero__actions">
            <button className="button button--primary" onClick={() => navigate('demo')}>Try the product demo <ArrowRight size={18} /></button>
            <button className="button button--secondary" onClick={() => navigate('methodology')}>How the score works</button>
          </div>
        </div>
        <div className="hero__visual" aria-label="Preview of EcoMind analysing a recycled blend T-shirt">
          <div className="hero-product">
            <div className="hero-product__image"><img src={heroProduct.image} alt="Forest-green recycled blend T-shirt" /></div>
            <div className="hero-product__meta">
              <div>
                <span>Sample product</span>
                <h2>{heroProduct.shortName}</h2>
              </div>
              <strong>£{heroProduct.price.toFixed(2)}</strong>
            </div>
          </div>
          <button className="widget-preview" onClick={() => navigate('demo')} aria-label="Open the interactive EcoMind product demo">
            <KoalaMascot size={52} points={75} />
            <ScoreBadge result={heroScore} size="small" />
            <span><b>{heroScore.status}</b><small>See why</small></span>
            <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <section className="problem-strip">
        <div className="container problem-strip__inner">
          <p>Material, packaging and footprint claims are hard to compare.</p>
          <div className="problem-strip__statement">
            <span>EcoMind turns scattered product details into</span>
            <strong>one explainable score.</strong>
          </div>
          <p className="survey-placeholder">Survey finding to be added after analysis.</p>
        </div>
      </section>

      <section className="section container how-section">
        <div className="section-heading">
          <h2>Clarity in the moment that matters</h2>
          <p>Activate EcoMind on a clothing page. The koala reads the available listing details, then shows what is known and what is missing.</p>
        </div>
        <div className="how-grid">
          <article className="how-card how-card--wide">
            <div className="how-card__icon"><Eye size={25} /></div>
            <h3>Activate on a product</h3>
            <p>No account is needed for the first analysis. The prototype only uses local sample listings.</p>
            <div className="mini-store-row">
              <img src={getProduct('polyester-everyday-tee').image} alt="Charcoal performance T-shirt sample" />
              <div><span>Performance Tee</span><b>Check its impact</b></div>
              <KoalaMascot size={42} points={0} />
            </div>
          </article>
          <article className="how-card how-card--tinted">
            <div className="how-card__icon"><Brain size={25} /></div>
            <h3>Understand the evidence</h3>
            <p>Simulated AI structures the listing. The published formula calculates the numeric score.</p>
          </article>
          <article className="how-card how-card--mint">
            <div className="how-card__icon"><Recycle size={25} /></div>
            <h3>Compare without pressure</h3>
            <p>See a lower-impact option, including its price and trade-off, before deciding.</p>
          </article>
        </div>
      </section>

      <section className="section methodology-teaser">
        <div className="container methodology-teaser__inner">
          <div>
            <p className="kicker">One transparent methodology</p>
            <h2>The score is explainable by design.</h2>
            <p>Five environmental factors. Fixed weights. Confidence stays separate, so missing data never looks certain.</p>
            <button className="text-link" onClick={() => navigate('methodology')}>Read the methodology <ArrowRight size={17} /></button>
          </div>
          <div className="weight-orbit" aria-label="Green Score weights">
            <div className="weight-orbit__core"><Leaf size={30} weight="fill" /><strong>100</strong><span>points</span></div>
            <div className="weight-chip weight-chip--one"><b>35%</b><span>Materials</span></div>
            <div className="weight-chip weight-chip--two"><b>25%</b><span>Carbon</span></div>
            <div className="weight-chip weight-chip--three"><b>20%</b><span>Recycled</span></div>
            <div className="weight-chip weight-chip--four"><b>10%</b><span>Durability</span></div>
            <div className="weight-chip weight-chip--five"><b>10%</b><span>Packaging</span></div>
          </div>
        </div>
      </section>

      <section className="section container points-section">
        <div className="points-visual">
          <div className="koala-stage koala-stage--starter"><KoalaMascot size={70} points={10} /><span>Starter Koala</span></div>
          <div className="koala-stage koala-stage--explorer"><KoalaMascot size={88} points={80} /><span>Eco Explorer</span></div>
          <div className="koala-stage koala-stage--champion"><KoalaMascot size={106} points={180} /><span>Climate Champion</span></div>
        </div>
        <div className="points-copy">
          <h2>Grow your koala, not your basket</h2>
          <p>Demo EcoPoints reward meaningful choices: saving a sustainable option, repairing, reusing or deciding not to buy.</p>
          <div className="points-actions">
            <span><Heart size={18} /> Save thoughtfully</span>
            <span><ShieldCheck size={18} /> Repair and reuse</span>
            <span><Sparkle size={18} /> Complete challenges</span>
          </div>
        </div>
      </section>

      <section className="section container privacy-callout">
        <div className="privacy-callout__icon"><LockKey size={30} weight="duotone" /></div>
        <div>
          <h2>Your shopping stays yours.</h2>
          <p>EcoMind analyses only after activation. This prototype stores progress on your device and never reads payment information.</p>
        </div>
        <button className="button button--secondary" onClick={() => navigate('privacy')}>Privacy and ethics</button>
      </section>

      <section className="landing-cta">
        <div className="container landing-cta__inner">
          <Brand />
          <h2>See the full shopping journey.</h2>
          <button className="button button--primary" onClick={() => navigate('demo')}>Launch product demo <ArrowRight size={18} /></button>
          <p>Hackathon prototype. Scores and rewards use sample data and are not certifications.</p>
        </div>
      </section>
    </div>
  )
}
