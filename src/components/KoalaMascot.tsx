import type { CSSProperties } from 'react'

export type KoalaLevel = 'Starter Koala' | 'Eco Explorer' | 'Climate Champion'

export function getKoalaLevel(points: number): KoalaLevel {
  if (points >= 40) return 'Climate Champion'
  if (points >= 15) return 'Eco Explorer'
  return 'Starter Koala'
}

export function getNextKoalaLevel(points: number) {
  if (points < 15) return { name: 'Eco Explorer', target: 15, remaining: 15 - points }
  if (points < 40) return { name: 'Climate Champion', target: 40, remaining: 40 - points }
  return { name: 'Climate Champion', target: 40, remaining: 0 }
}

export function KoalaMascot({ points = 0, size = 64, label }: { points?: number; size?: number; label?: string }) {
  const level = getKoalaLevel(points)
  return (
    <div
      className={`koala koala--${level.toLowerCase().replaceAll(' ', '-')}`}
      style={{ '--koala-size': `${size}px` } as CSSProperties}
      role="img"
      aria-label={label ?? `${level} mascot`}
    >
      <span className="koala__ear koala__ear--left" />
      <span className="koala__ear koala__ear--right" />
      <span className="koala__face">
        <span className="koala__brow koala__brow--left" />
        <span className="koala__brow koala__brow--right" />
        <span className="koala__eye koala__eye--left" />
        <span className="koala__eye koala__eye--right" />
        <span className="koala__nose" />
        <span className="koala__smile" />
      </span>
      {level !== 'Starter Koala' && <span className="koala__leaf" />}
      {level === 'Climate Champion' && <span className="koala__crown">★</span>}
    </div>
  )
}
