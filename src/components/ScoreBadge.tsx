import type { ScoreResult } from '../types'
import { formatScore, scoreTone } from '../lib/scoring'

export function ScoreBadge({ result, size = 'medium' }: { result: ScoreResult; size?: 'small' | 'medium' | 'large' }) {
  return (
    <div className={`score-badge score-badge--${scoreTone(result.score)} score-badge--${size}`} aria-label={`${result.provisional ? 'Provisional Green Score approximately' : 'Green Score'} ${result.score} out of 100, grade ${result.grade}`}>
      <strong>{formatScore(result)}</strong>
      <span>/100</span>
      <b>{result.grade}</b>
    </div>
  )
}
