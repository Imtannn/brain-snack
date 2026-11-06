import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from './cx'

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'quiet'
  | 'danger'
  | 'signal'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
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
      className={cx(
        'ds-btn',
        `ds-btn--${variant}`,
        size !== 'md' && `ds-btn--${size}`,
        block && 'ds-btn--block',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
