import { CheckCircle, X } from '@phosphor-icons/react'

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircle size={22} weight="fill" />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification"><X size={18} /></button>
    </div>
  )
}
