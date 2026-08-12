import { ArrowRight, Leaf, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { getProduct } from '../data/products'
import { calculateGreenScore } from '../lib/scoring'
import { KoalaMascot } from './KoalaMascot'
import { ScoreDrawer } from './ScoreDrawer'
import { ProductComparison } from './ProductComparison'

type AnalysisState = 'idle' | 'loading' | 'success' | 'error'

export function EcoWidget({
  product,
  forceError,
  onAnalysed,
  onSave,
  onCompare,
  onView,
}: {
  product: Product
  forceError: boolean
  onAnalysed: (product: Product) => void
  onSave: (product: Product) => void
  onCompare: (current: Product, alternative: Product) => void
  onView: (product: Product) => void
}) {
  const [state, setState] = useState<AnalysisState>('idle')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const result = calculateGreenScore(product)
  const alternative = product.alternativeProductId ? getProduct(product.alternativeProductId) : null

  useEffect(() => {
    setDrawerOpen(false)
    setCompareOpen(false)
    setState(forceError ? 'error' : 'idle')
  }, [product.id, forceError])

  useEffect(() => {
    if (state !== 'loading') return
    const timer = window.setTimeout(() => {
      setState('success')
      setDrawerOpen(true)
      onAnalysed(product)
    }, 950)
    return () => window.clearTimeout(timer)
  }, [state, onAnalysed, product])

  const activate = () => {
    if (state === 'idle') setState('loading')
    if (state === 'success') setDrawerOpen(true)
    if (state === 'error') setState('loading')
  }

  return (
    <>
      <button className={`eco-widget eco-widget--${state}`} onClick={activate} aria-label={state === 'success' ? `Open EcoMind analysis. Green Score ${result.score} out of 100, grade ${result.grade}` : state === 'loading' ? 'EcoMind is analysing this product' : state === 'error' ? 'EcoMind analysis failed. Try again' : 'Activate EcoMind product analysis'}>
        <KoalaMascot size={58} points={state === 'success' ? result.score : 0} />
        {state === 'idle' && <span className="eco-widget__message"><b>Check its impact</b><small>Activate EcoMind</small></span>}
        {state === 'loading' && <span className="eco-widget__message eco-widget__message--loading"><b>Analysing listing</b><small>Finding materials and data gaps</small><i /></span>}
        {state === 'error' && <span className="eco-widget__message"><b>Could not analyse</b><small>Try again</small></span>}
        {state === 'error' ? <WarningCircle className="eco-widget__end" size={22} /> : state === 'success' ? (
          <>
            <span className={`eco-widget__score eco-widget__score--${result.grade.toLowerCase()}`}><b>{result.score}</b><small>/100</small><strong>{result.grade}</strong></span>
            <span className="eco-widget__message"><b>{result.status}</b><small>{product.confidenceLevel} confidence</small></span>
            <ArrowRight className="eco-widget__end" size={20} />
          </>
        ) : state === 'idle' ? <Leaf className="eco-widget__end" size={21} weight="fill" /> : null}
      </button>
      <ScoreDrawer
        product={product}
        result={result}
        alternative={alternative}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCompare={() => {
          if (!alternative) return
          onCompare(product, alternative)
          setDrawerOpen(false)
          setCompareOpen(true)
        }}
        onSave={() => {
          setDrawerOpen(false)
          onSave(product)
        }}
      />
      {alternative && (
        <ProductComparison
          current={product}
          alternative={alternative}
          open={compareOpen}
          onClose={() => { setCompareOpen(false); setDrawerOpen(true) }}
          onSave={() => {
            setCompareOpen(false)
            onSave(alternative)
          }}
          onView={() => { setCompareOpen(false); onView(alternative) }}
        />
      )}
    </>
  )
}
