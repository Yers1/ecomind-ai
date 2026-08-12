import { CheckCircle, Info, WarningCircle } from '@phosphor-icons/react'
import type { ConfidenceLevel } from '../types'

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const Icon = level === 'High' ? CheckCircle : level === 'Medium' ? Info : WarningCircle
  return (
    <span className={`confidence confidence--${level.toLowerCase()}`}>
      <Icon size={15} weight="fill" aria-hidden="true" />
      {level} confidence
    </span>
  )
}
