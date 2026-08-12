import { LockKey, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

export function LoginModal({ open, onClose, onContinue, actionLabel }: { open: boolean; onClose: () => void; onContinue: () => void; actionLabel: string }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-layer modal-layer--login" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button ref={closeRef} className="icon-button modal__close" onClick={onClose} aria-label="Close sign-in dialog"><X size={21} /></button>
        <div className="modal-icon"><LockKey size={27} weight="duotone" /></div>
        <p className="kicker">Keep your progress</p>
        <h2 id="login-title">Continue with a demo profile</h2>
        <p>You can analyse products without an account. A profile is only needed when you want to {actionLabel.toLowerCase()}, save progress or collect demo EcoPoints.</p>
        <button className="button button--primary button--full" onClick={onContinue}>Continue as demo user</button>
        <button className="button button--text button--full" onClick={onClose}>Not now</button>
        <small>No email or personal information is collected.</small>
      </section>
    </div>
  )
}
