import { Check, ExclamationMark, Minus, Question } from '@phosphor-icons/react'
import { TRAFFIC_LIGHT_LEGEND, formatTrafficLightScore, getTrafficLightStatus, trafficLightAccessibleText, type TrafficLightColour } from '../../shared/trafficLight'

const Icon = ({ colour, size = 16 }: { colour: TrafficLightColour; size?: number }) => colour === 'green'
  ? <Check size={size} weight="bold" aria-hidden="true" />
  : colour === 'amber'
    ? <Minus size={size} weight="bold" aria-hidden="true" />
    : colour === 'red'
      ? <ExclamationMark size={size} weight="bold" aria-hidden="true" />
      : <Question size={size} weight="bold" aria-hidden="true" />

export function TrafficLightMark({ colour, size = 'medium' }: { colour: TrafficLightColour; size?: 'small' | 'medium' | 'large' }) {
  return <span className={`traffic-mark traffic-mark--${colour} traffic-mark--${size}`} aria-hidden="true"><Icon colour={colour} size={size === 'large' ? 22 : size === 'small' ? 12 : 16} /></span>
}

export function TrafficLightResult({ score, hasSufficientEvidence, provisional, confidence, grade, range, compact = false }: { score: number | null; hasSufficientEvidence: boolean; provisional: boolean; confidence: string; grade?: string | null; range?: [number, number] | null; compact?: boolean }) {
  const status = getTrafficLightStatus(score, hasSufficientEvidence)
  const accessible = trafficLightAccessibleText(status, score, provisional, confidence, range)
  return (
    <div className={`traffic-result traffic-result--${status.colour}${compact ? ' traffic-result--compact' : ''}`} role="img" aria-label={accessible} title={status.shortExplanation}>
      <TrafficLightMark colour={status.colour} size={compact ? 'small' : 'medium'} />
      <span className="traffic-result__copy">
        <strong>{formatTrafficLightScore(score, provisional, compact ? null : range)}{grade ? ` · ${grade}` : ''}</strong>
        <span>{status.label}{provisional && score !== null ? ' · Provisional' : ''}</span>
        <small>{confidence} confidence</small>
      </span>
      <span className="sr-only">{accessible}</span>
    </div>
  )
}

export function TrafficLightLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`traffic-legend${compact ? ' traffic-legend--compact' : ''}`} aria-label="How to read the traffic light">
      {!compact && <h3>How to read the traffic light</h3>}
      <ul>
        {TRAFFIC_LIGHT_LEGEND.map((item) => <li key={item.colour}><TrafficLightMark colour={item.colour} size="small" /><span><strong>{item.label}:</strong> {item.description}</span></li>)}
      </ul>
      {!compact && <p>Traffic lights evaluate disclosed product information—not people. A green light is a lower-impact prototype result, not a certification.</p>}
    </div>
  )
}
