import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export type BadgeTone = 'default' | 'signal' | 'inverse' | 'success' | 'warning' | 'danger' | 'info' | 'glass'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Badge({
  tone = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: Props) {
  return (
    <span
      className={cx('ds-badge', tone !== 'default' && `ds-badge--${tone}`, size === 'sm' && 'ds-badge--sm', className)}
      {...rest}
    >
      {children}
    </span>
  )
}
