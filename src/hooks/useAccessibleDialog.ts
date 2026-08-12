import { useEffect, useRef } from 'react'

let openDialogCount = 0

export function useAccessibleDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeHandlerRef = useRef(onClose)
  useEffect(() => { closeHandlerRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const appRoot = document.querySelector<HTMLElement>('#root')
    openDialogCount += 1
    appRoot?.setAttribute('inert', '')
    appRoot?.setAttribute('aria-hidden', 'true')

    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusInitial = () => {
      const dialog = dialogRef.current
      const initial = dialog?.querySelector<HTMLElement>('[data-dialog-initial]') ?? dialog?.querySelector<HTMLElement>(focusableSelector)
      initial?.focus()
    }
    window.requestAnimationFrame(focusInitial)

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeHandlerRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hidden)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      openDialogCount = Math.max(0, openDialogCount - 1)
      if (openDialogCount === 0) {
        appRoot?.removeAttribute('inert')
        appRoot?.removeAttribute('aria-hidden')
      }
      if (trigger?.isConnected) window.requestAnimationFrame(() => trigger.focus())
    }
  }, [open])

  return dialogRef
}
