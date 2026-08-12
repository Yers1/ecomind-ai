import { Leaf, Package, Recycle, ShieldCheck, Wind } from '@phosphor-icons/react'
import type { ScoreResult } from '../types'

const icons = {
  materials: Leaf,
  carbon: Wind,
  recycled: Recycle,
  durability: ShieldCheck,
  packaging: Package,
}

export function ScoreBreakdown({ result }: { result: ScoreResult }) {
  return (
    <div className="score-breakdown">
      {result.breakdown.map((item) => {
        const Icon = icons[item.key]
        return (
          <article className="breakdown-item" key={item.key}>
            <div className="breakdown-item__icon"><Icon size={20} aria-hidden="true" /></div>
            <div className="breakdown-item__body">
              <div className="breakdown-item__heading">
                <h4>{item.label}</h4>
                <span>{item.score === null ? 'Not disclosed' : `${Math.round(item.score)}/100`}</span>
              </div>
              <p>{item.detail}</p>
            </div>
            <span className="breakdown-item__weight">{Math.round(item.weight * 100)}% weight</span>
          </article>
        )
      })}
    </div>
  )
}
