import type { ScoreResult } from '../types'
import { TrafficLightResult } from './TrafficLight'

export function ScoreBadge({ result, confidence = 'Medium', size = 'medium' }: { result: ScoreResult; confidence?: string; size?: 'small' | 'medium' | 'large' }) {
  return <TrafficLightResult score={result.score} hasSufficientEvidence={result.knownWeight >= 0.35} provisional={result.provisional} confidence={confidence} grade={result.grade} range={result.range ? [result.range.min, result.range.max] : null} compact={size === 'small'} />
}
