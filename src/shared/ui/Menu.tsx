import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'
import { IconButton } from './IconButton'

/** The popup list itself; position it with a class on the parent or on the menu. */
export const Menu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Menu(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('ds-menu', className)} role="menu" {...rest}>
      {children}
    </div>
  )
})

export function MenuItem({
  danger = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" role="menuitem" className={cx(danger && 'danger', className)} {...rest} />
}

type RowMenuProps = {
  /** Name of the row the actions belong to ("Actions for <name>"). */
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Stop the press from following a link the row sits in. */
  preventDefault?: boolean
  className?: string
  children: ReactNode
}

/** A "..." button that opens a menu of actions for one row. Only the open row shows its menu. */
export function RowMenu({ name, open, onOpenChange, preventDefault = false, className, children }: RowMenuProps) {
  const label = `Actions for ${name}`
  return (
    <div
      className={cx('project-menu', className)}
      onClick={(e) => {
        if (preventDefault) e.preventDefault()
        e.stopPropagation()
      }}
    >
      <IconButton
        className="file-menu-btn"
        label={label}
        title={label}
        aria-expanded={open}
        onClick={(e) => {
          if (preventDefault) e.preventDefault()
          e.stopPropagation()
          onOpenChange(!open)
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </IconButton>
      {open ? <Menu onClick={(e) => e.stopPropagation()}>{children}</Menu> : null}
    </div>
  )
}
