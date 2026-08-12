import { CheckCircle, LockKey } from '@phosphor-icons/react'
import { getKoalaLevel, getNextKoalaLevel, KoalaMascot } from './KoalaMascot'

export function KoalaProgress({ points }: { points: number }) {
  const level = getKoalaLevel(points)
  const next = getNextKoalaLevel(points)
  const start = level === 'Starter Koala' ? 0 : level === 'Eco Explorer' ? 60 : 150
  const progress = next.remaining === 0 ? 100 : Math.min(100, ((points - start) / (next.target - start)) * 100)
  return (
    <section className="koala-progress">
      <div className="koala-progress__mascot"><KoalaMascot size={118} points={points} /></div>
      <div className="koala-progress__body">
        <span>Your koala level</span>
        <h2>{level}</h2>
        <p>{next.remaining > 0 ? `${next.remaining} demo EcoPoints until ${next.name}.` : 'All demo koala accessories unlocked.'}</p>
        <div className="koala-progress__bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${next.name}`}><i style={{ width: `${progress}%` }} /></div>
        <div className="koala-progress__levels">
          {['Starter', 'Explorer', 'Champion'].map((name, index) => <span key={name} className={points >= [0,60,150][index] ? 'is-unlocked' : ''}>{points >= [0,60,150][index] ? <CheckCircle size={15} weight="fill" /> : <LockKey size={14} />}{name}</span>)}
        </div>
      </div>
    </section>
  )
}
