export type TrafficLightColour = 'green' | 'amber' | 'red' | 'grey'

export type TrafficLightStatus = {
  colour: TrafficLightColour
  label: string
  shortExplanation: string
}

export const TRAFFIC_LIGHT_THRESHOLDS = {
  green: { min: 70, max: 100, label: 'Lower impact', shortExplanation: 'Lower impact according to the EcoMind prototype methodology and available evidence.' },
  amber: { min: 40, max: 69, label: 'Mixed impact', shortExplanation: 'A mix of stronger and weaker factors according to the available evidence.' },
  red: { min: 0, max: 39, label: 'Higher impact', shortExplanation: 'Higher impact according to the EcoMind prototype methodology and available evidence.' },
  grey: { label: 'Not enough information', shortExplanation: 'EcoMind does not have sufficient evidence for a reliable traffic-light result.' },
} as const

export function getTrafficLightStatus(score: number | null, hasSufficientEvidence: boolean): TrafficLightStatus {
  if (score === null || !hasSufficientEvidence) return { colour: 'grey', label: TRAFFIC_LIGHT_THRESHOLDS.grey.label, shortExplanation: TRAFFIC_LIGHT_THRESHOLDS.grey.shortExplanation }
  if (score >= TRAFFIC_LIGHT_THRESHOLDS.green.min) return { colour: 'green', label: TRAFFIC_LIGHT_THRESHOLDS.green.label, shortExplanation: TRAFFIC_LIGHT_THRESHOLDS.green.shortExplanation }
  if (score >= TRAFFIC_LIGHT_THRESHOLDS.amber.min) return { colour: 'amber', label: TRAFFIC_LIGHT_THRESHOLDS.amber.label, shortExplanation: TRAFFIC_LIGHT_THRESHOLDS.amber.shortExplanation }
  return { colour: 'red', label: TRAFFIC_LIGHT_THRESHOLDS.red.label, shortExplanation: TRAFFIC_LIGHT_THRESHOLDS.red.shortExplanation }
}

export function formatTrafficLightScore(score: number | null, provisional: boolean, range?: [number, number] | null) {
  if (score === null) return 'Score unavailable'
  const scoreText = `${provisional ? '~' : ''}${Math.round(score)}/100`
  return range ? `${scoreText} · range ${range[0]}–${range[1]}` : scoreText
}

export function trafficLightAccessibleText(status: TrafficLightStatus, score: number | null, provisional: boolean, confidence: string, range?: [number, number] | null) {
  const scoreText = score === null ? 'score unavailable' : `${provisional ? 'provisional score approximately ' : 'score '}${Math.round(score)} out of 100${range ? `, possible range ${range[0]} to ${range[1]}` : ''}`
  return `Traffic-light status: ${status.colour}, ${status.label.toLowerCase()}, ${scoreText}. ${confidence} confidence.`
}

export const TRAFFIC_LIGHT_LEGEND = [
  { colour: 'green' as const, label: 'Green', description: 'Lower impact based on available evidence' },
  { colour: 'amber' as const, label: 'Amber', description: 'Mixed environmental impact' },
  { colour: 'red' as const, label: 'Red', description: 'Higher environmental impact' },
  { colour: 'grey' as const, label: 'Grey', description: 'Not enough information' },
]
