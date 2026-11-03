import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  signal?: boolean
  asChild?: boolean
  label: string
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    {
      active = false,
      signal = false,
      asChild = false,
      label,
      className,
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
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
      </Comp>
    )
  },
)
