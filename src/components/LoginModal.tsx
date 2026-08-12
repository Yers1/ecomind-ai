import { LockKey, X } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import { useAccessibleDialog } from '../hooks/useAccessibleDialog'

export function LoginModal({ open, onClose, onContinue, actionLabel }: { open: boolean; onClose: () => void; onContinue: () => void; actionLabel: string }) {
  const dialogRef = useAccessibleDialog(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="modal-layer modal-layer--login" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button data-dialog-initial className="icon-button modal__close" onClick={onClose} aria-label="Close sign-in dialog"><X size={21} /></button>
        <div className="modal-icon"><LockKey size={27} weight="duotone" /></div>
        <p className="kicker">Keep your progress</p>
        <h2 id="login-title">Continue with a demo profile</h2>
        <p>You can analyse products without an account. A profile is only needed when you want to {actionLabel.toLowerCase()}, save progress or collect demo EcoPoints.</p>
        <button className="button button--primary button--full" onClick={onContinue}>Continue as demo user</button>
        <button className="button button--text button--full" onClick={onClose}>Not now</button>
        <small>No email or personal information is collected.</small>
      </section>
    </div>,
    document.body,
  )
}
