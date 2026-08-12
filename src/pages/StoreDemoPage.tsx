import { Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from '@phosphor-icons/react'
import { useCallback, useState } from 'react'
import { EcoWidget } from '../components/EcoWidget'
import { LoginModal } from '../components/LoginModal'
import { Toast } from '../components/Toast'
import { getKoalaLevel } from '../components/KoalaMascot'
import { products } from '../data/products'
import { calculateGreenScore } from '../lib/scoring'
import { useEcoMind } from '../state/EcoMindContext'
import type { Product } from '../types'

type PendingAction = { type: 'save' | 'choose'; product: Product } | null

export function StoreDemoPage() {
  const [selectedId, setSelectedId] = useState(products[0].id)
  const [quantity, setQuantity] = useState(1)
  const [forceError, setForceError] = useState(false)
  const [pending, setPending] = useState<PendingAction>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { authenticated, login, saveProduct, chooseAlternative, points } = useEcoMind()
  const product = products.find((item) => item.id === selectedId) ?? products[0]

  const perform = useCallback((action: NonNullable<PendingAction>) => {
    if (action.type === 'save') {
      const eligible = calculateGreenScore(action.product).score >= 65
      saveProduct(action.product.id, action.product.productName, eligible)
      setToast(eligible ? `${action.product.shortName} saved. +15 demo EcoPoints.` : `${action.product.shortName} saved. EcoPoints reward lower-impact saves.`)
    } else {
      const levelBefore = getKoalaLevel(points)
      chooseAlternative(action.product.id, action.product.productName)
      const levelAfter = getKoalaLevel(points + 35)
      setToast(levelBefore !== levelAfter ? `+35 demo EcoPoints. ${levelAfter} unlocked!` : '+35 demo EcoPoints for choosing a lower-impact option.')
    }
  }, [chooseAlternative, points, saveProduct])

  const requireProfile = (action: NonNullable<PendingAction>) => {
    if (authenticated) perform(action)
    else setPending(action)
  }

  const continueLogin = () => {
    login()
    if (pending) perform(pending)
    setPending(null)
  }

  return (
    <div className="store-demo-page">
      <div className="demo-banner">
        <span>Interactive prototype</span>
        <p>Local sample data only. Activate the koala to start an analysis.</p>
        <div className="demo-state-controls" aria-label="Prototype state controls">
          <button className={!forceError ? 'is-active' : ''} onClick={() => setForceError(false)}>Normal state</button>
          <button className={forceError ? 'is-active' : ''} onClick={() => setForceError(true)}>Test error</button>
        </div>
      </div>
      <div className="store-header">
        <button className="store-logo">Threadly</button>
        <div className="store-search">Search clothing and accessories</div>
        <button className="store-bag" aria-label="View shopping bag"><ShoppingBag size={21} /><span>Bag</span></button>
      </div>
      <nav className="store-categories" aria-label="Store categories"><span>New in</span><span>Clothing</span><span>Basics</span><span>Active</span><span>Offers</span></nav>
      <div className="product-switcher" aria-label="Choose a sample product">
        <span>Sample products</span>
        {products.map((item) => {
          const score = calculateGreenScore(item)
          return <button key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => { setSelectedId(item.id); setForceError(false) }}><img src={item.image} alt="" /><span>{item.shortName}<small>Demo score {score.score}</small></span></button>
        })}
      </div>
      <div className="store-breadcrumb container">Clothing <span>/</span> T-shirts <span>/</span> {product.shortName}</div>
      <section className="product-page container" key={product.id}>
        <div className="product-gallery">
          <div className="product-gallery__main"><img src={product.image} alt={`${product.productName} in ${product.color}`} /></div>
          <div className="product-gallery__note"><ShieldCheck size={18} /> Product image generated for this local demo</div>
        </div>
        <div className="product-info">
          <span className="product-info__brand">Threadly collection</span>
          <h1>{product.productName}</h1>
          <div className="product-rating"><span>{product.rating}</span><div aria-label={`${product.rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} size={15} weight="fill" />)}</div><button>{product.reviewCount} reviews</button></div>
          <p className="product-price">£{product.price.toFixed(2)}</p>
          <p className="product-tax">Includes taxes. Free standard delivery over £30.</p>
          <div className="product-color"><span>Colour</span><b>{product.color}</b><button style={{ backgroundColor: product.id === 'polyester-everyday-tee' ? '#31383b' : product.id === 'cotton-classic-tee' ? '#ecebe4' : '#254b3a' }} aria-label={`${product.color} selected`}><Check size={15} /></button></div>
          <fieldset className="size-picker"><legend>Choose a size</legend>{['XS','S','M','L','XL'].map((size) => <button key={size} className={size === 'M' ? 'is-active' : ''}>{size}</button>)}</fieldset>
          <div className="purchase-row">
            <div className="quantity"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><span>{quantity}</span><button onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity"><Plus size={16} /></button></div>
            <button className="store-add" onClick={() => setToast('Added to the demo bag. Store purchases do not earn EcoPoints.')}><ShoppingBag size={19} /> Add to bag</button>
            <button className="store-heart" aria-label="Add to store favourites"><Heart size={21} /></button>
          </div>
          <div className="delivery-note"><Truck size={21} /><div><strong>Estimated delivery in 3-5 days</strong><span>Free returns within 30 days</span></div></div>
          <details className="store-details" open><summary>Product details</summary><p>{product.description}</p><p>{product.listingText}</p></details>
          <details className="store-details"><summary>Care instructions</summary><p>Wash cool with similar colours. Air dry where practical. Demo listing text.</p></details>
        </div>
      </section>
      <section className="store-recommendations container"><h2>You might also like</h2><p>Product recommendations are not part of the EcoMind analysis.</p></section>
      <EcoWidget product={product} forceError={forceError} onSave={(item) => requireProfile({ type: 'save', product: item })} onChoose={(item) => requireProfile({ type: 'choose', product: item })} />
      <LoginModal open={pending !== null} actionLabel={pending?.type === 'save' ? 'save this product' : 'keep this choice'} onClose={() => setPending(null)} onContinue={continueLogin} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
