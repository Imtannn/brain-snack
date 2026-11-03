import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import type { SpaceToken } from './Stack'

type Props = HTMLAttributes<HTMLElement> & {
  /** The element to render (a form, a section...). */
  as?: 'div' | 'section' | 'article' | 'aside' | 'form'
  /** Inner padding: `true` is the normal size. */
  pad?: boolean | 'sm' | 'lg'
  quiet?: boolean
  /** A stronger shadow, for a card that floats on a page (sign-in). */
  raised?: boolean
  /** Lays the children out in a column with this gap. */
  stack?: SpaceToken
  children: ReactNode
}

export function Surface({
  as: Tag = 'div',
  pad = false,
  quiet = false,
  raised = false,
  stack,
  className,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Tag
      className={cx(
        'ds-surface',
        pad === true && 'ds-surface--pad',
        pad === 'sm' && 'ds-surface--pad-sm',
        pad === 'lg' && 'ds-surface--pad-lg',
        quiet && 'ds-surface--quiet',
        raised && 'ds-surface--raised',
        stack && 'ds-stack',
        className,
      )}
      style={stack ? { gap: `var(--space-${stack})`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
