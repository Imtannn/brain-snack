import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'

/** Renders children in `document.body`, so an ancestor's transform cannot break a fixed overlay's centering. */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Open modals, oldest first: only the top one reacts to Escape. */
const openModals: symbol[] = []

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden]'))
}

export type ModalProps = {
  open: boolean
  title: ReactNode
  onClose: () => void
  /** While busy the modal can't be dismissed (Escape, backdrop and close button are ignored). */
  busy?: boolean
  /** Extra class names for the `.modal` element. */
  className?: string
  backdropClassName?: string
  zIndex?: number
  role?: 'dialog' | 'alertdialog'
  /** Id of the element describing the dialog (alert dialogs). */
  describedBy?: string
  /** Classes of the head: `modal-head` (default) or the compact `modal-folder-head`, plus any layout class. */
  headClassName?: string
  /** Controls shown beside the close button, grouped with it in a wrapper using `headActionsClassName`. */
  headActions?: ReactNode
  headActionsClassName?: string
  /** Renders the frame as a `<form>` with this submit handler. */
  onSubmit?: (e: FormEvent) => void
  /** Skip the portal when the modal is already rendered at the document root. */
  portal?: boolean
  children: ReactNode
}

/** Shared modal chrome: backdrop, Escape/backdrop dismissal, titled head with a close button. */
export function Modal({
  open,
  title,
  onClose,
  busy = false,
  className = '',
  backdropClassName = '',
  zIndex,
  role = 'dialog',
  describedBy,
  headClassName = 'modal-head',
  headActions,
  headActionsClassName,
  onSubmit,
  portal = true,
  children,
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const id = Symbol('modal')
    openModals.push(id)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && openModals.at(-1) === id) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openModals.splice(openModals.indexOf(id), 1)
    }
  }, [open, onClose, busy])

  // Move focus into the dialog (unless a field inside already took it) and give it back on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) (focusableIn(dialog)[0] ?? dialog).focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  if (!open) return null

  /** Keeps Tab and Shift+Tab inside the dialog. */
  const trapTab = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = focusableIn(dialogRef.current)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const dialogProps = {
    className: `modal ${className}`.trim(),
    role,
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': describedBy,
    tabIndex: -1,
    onKeyDown: trapTab,
    ref: (el: HTMLElement | null) => {
      dialogRef.current = el
    },
  } as const
  const closeButton = (
    <IconButton type="button" title="Close" disabled={busy} onClick={onClose} label="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </IconButton>
  )
  const head = (
    <div className={headClassName}>
      <h2 id={titleId}>{title}</h2>
      {headActions ? (
        <div className={headActionsClassName}>
          {headActions}
          {closeButton}
        </div>
      ) : (
        closeButton
      )}
    </div>
  )
  const backdrop = (
    <div
      className={`modal-backdrop ${backdropClassName}`.trim()}
      role="presentation"
      style={zIndex ? { zIndex } : undefined}
      onClick={(e) => {
        if (!busy && e.target === e.currentTarget) onClose()
      }}
    >
      {onSubmit ? (
        <form {...dialogProps} onSubmit={onSubmit}>
          {head}
          {children}
        </form>
      ) : (
        <div {...dialogProps}>
          {head}
          {children}
        </div>
      )}
    </div>
  )
  return portal ? <ModalPortal>{backdrop}</ModalPortal> : backdrop
}
