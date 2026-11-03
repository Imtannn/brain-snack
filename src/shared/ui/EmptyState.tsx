import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** `block` is a dashed panel with heading; `inline` is a single muted line inside a list. */
  size?: 'block' | 'inline'
  icon?: ReactNode
  title?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function EmptyState({ size = 'block', icon, title, actions, className, children, ...rest }: Props) {
  if (size === 'inline') {
    return (
      <p className={cx('ds-empty', 'ds-empty--inline', className)} {...rest}>
        {children}
      </p>
    )
  }
  return (
    <div className={cx('ds-empty', className)} {...rest}>
      {icon ? <div className="ds-empty-icon" aria-hidden>{icon}</div> : null}
      {title ? <h3 className="ds-empty-title">{title}</h3> : null}
      {children ? <p className="ds-empty-text">{children}</p> : null}
      {actions ? <div className="ds-empty-actions">{actions}</div> : null}
    </div>
  )
}
