import { ArrowRight, BookmarkSimple, GitDiff, Leaf, Trash, WarningCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Page } from '../components/AppShell'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { ProductComparison } from '../components/ProductComparison'
import { ScoreBadge } from '../components/ScoreBadge'
import { getProduct, getRecommendedProduct } from '../data/products'
import { calculateGreenScore } from '../lib/scoring'
import { useEcoMind } from '../state/EcoMindContext'
import type { Product } from '../types'
import { packagingEvidenceLabel } from '../../shared/ecomind'

export function WishlistPage({ navigate }: { navigate: (page: Page) => void }) {
  const { wishlist, removeProduct, authenticated, recordComparison, saveProduct } = useEcoMind()
  const savedProducts = wishlist.map(getProduct)
  const [comparison, setComparison] = useState<{ current: Product; alternative: Product } | null>(null)

  const compareFor = (product: Product) => {
    const alternative = getRecommendedProduct(product)
    if (alternative) {
      recordComparison(product.id, alternative.productName)
      setComparison({ current: product, alternative })
    }
  }

  return (
    <div className="wishlist-page page-surface">
      <header className="page-hero container compact-page-hero"><div><p className="kicker">Saved locally</p><h1>Your thoughtful shortlist</h1><p>Return to scores, compare options and remove anything you no longer need.</p></div><div className="wishlist-count"><BookmarkSimple size={23} weight="fill" /><strong>{savedProducts.length}</strong><span>saved products</span></div></header>
      <div className="container wishlist-content">
        {!authenticated && <div className="inline-notice"><WarningCircle size={20} /><p>You are viewing a guest profile. Saving from the product demo creates a local demo profile.</p></div>}
        {savedProducts.length === 0 ? (
          <section className="empty-wishlist">
            <div className="empty-wishlist__art"><BookmarkSimple size={45} weight="duotone" /><Leaf size={24} weight="fill" /></div>
            <h2>Your wishlist is ready when you are.</h2>
            <p>Analyse a product first, then save it if you want to compare or revisit it later.</p>
            <button className="button button--primary" onClick={() => navigate('demo')}>Analyse a sample product <ArrowRight size={18} /></button>
          </section>
        ) : (
          <div className="wishlist-grid">
            {savedProducts.map((product) => {
              const score = calculateGreenScore(product)
              return (
                <article className="wishlist-card" key={product.id}>
                  <div className="wishlist-card__image"><img src={product.image} alt={product.productName} /></div>
                  <div className="wishlist-card__body">
                    <div className="wishlist-card__top"><span>£{product.price.toFixed(2)}</span><ScoreBadge result={score} confidence={product.confidenceLevel} size="small" /></div>
                    <h2>{product.productName}</h2>
                    <ConfidenceBadge level={product.confidenceLevel} />
                    <p>{score.explanation}</p>
                    <div className="wishlist-evidence"><span><b>Fulfilment · 5%</b>{packagingEvidenceLabel(product.packaging.fulfilment)}</span><span><b>Manufacturer · 5%</b>{packagingEvidenceLabel(product.packaging.manufacturer)}</span><span><b>Certification</b>{product.certifications.find((item) => item.status === 'verified')?.displayedName ?? 'No verified certification found'}</span></div>
                    {product.alternativeProductId ? <span className="alternative-available"><Leaf size={16} weight="fill" /> Greener alternative available</span> : <span className="best-match"><Leaf size={16} /> Best local match</span>}
                    <div className="wishlist-card__actions"><button className="button button--secondary" onClick={() => compareFor(product)}><GitDiff size={17} /> Compare</button><button className="icon-button icon-button--danger" onClick={() => removeProduct(product.id)} aria-label={`Remove ${product.productName} from wishlist`}><Trash size={19} /></button></div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      {comparison && <ProductComparison current={comparison.current} alternative={comparison.alternative} open onClose={() => setComparison(null)} onSave={() => { saveProduct(comparison.alternative.id, comparison.alternative.productName, true); setComparison(null) }} onView={() => { sessionStorage.setItem('ecomind-demo-product-to-view', comparison.alternative.id); setComparison(null); navigate('demo') }} />}
    </div>
  )
}
