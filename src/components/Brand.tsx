import { KoalaMascot } from './KoalaMascot'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand" aria-label="EcoMind AI home">
      <KoalaMascot size={compact ? 34 : 40} points={65} label="" />
      <span className="brand__text">EcoMind <strong>AI</strong></span>
    </span>
  )
}
