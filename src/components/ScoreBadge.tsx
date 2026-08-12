import type { ScoreResult } from '../types'
import { scoreTone } from '../lib/scoring'

export function ScoreBadge({ result, size = 'medium' }: { result: ScoreResult; size?: 'small' | 'medium' | 'large' }) {
  return (
    <div className={`score-badge score-badge--${scoreTone(result.score)} score-badge--${size}`} aria-label={`Green Score ${result.score} out of 100, grade ${result.grade}`}>
      <strong>{result.score}</strong>
      <span>/100</span>
      <b>{result.grade}</b>
    </div>
  )
}
