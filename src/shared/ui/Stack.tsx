import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

const SPACE = {
  '0': 'var(--space-0)',
  '1': 'var(--space-1)',
  '2': 'var(--space-2)',
  '3': 'var(--space-3)',
  '4': 'var(--space-4)',
  '5': 'var(--space-5)',
  '6': 'var(--space-6)',
  '8': 'var(--space-8)',
  '10': 'var(--space-10)',
  '12': 'var(--space-12)',
  '16': 'var(--space-16)',
} as const

export type SpaceToken = keyof typeof SPACE

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: SpaceToken
  children: ReactNode
}

type InlineProps = HTMLAttributes<HTMLDivElement> & {
  gap?: SpaceToken
  children: ReactNode
}

export function Stack({
  gap = '3',
  style,
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx('ds-stack', className)}
      style={{ gap: SPACE[gap], ...style } satisfies CSSProperties}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Inline({
  gap = '2',
  style,
  className,
  children,
  ...rest
}: InlineProps) {
  return (
    <div
      className={cx('ds-inline', className)}
      style={{ gap: SPACE[gap], ...style } satisfies CSSProperties}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Separator({
  vertical = false,
  className,
}: {
  vertical?: boolean
  className?: string
}) {
  if (vertical) {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cx('ds-separator', 'ds-separator--vert', className)}
      />
    )
  }
  return <hr className={cx('ds-separator', className)} />
}
