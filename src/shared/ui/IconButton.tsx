import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  signal?: boolean
  label: string
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    {
      active = false,
      signal = false,
      label,
      className,
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={rest.title ?? label}
        className={cx(
          'ds-btn',
          'ds-btn--icon',
          active && 'is-active',
          signal && 'is-signal',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
