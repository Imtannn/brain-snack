import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  size?: 'sm' | 'md'
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    {
      checked,
      onChange,
      disabled = false,
      label,
      size = 'md',
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'ds-switch',
          checked && 'is-checked',
          size === 'sm' && 'ds-switch--sm',
          className,
        )}
        {...rest}
      >
        <span className="ds-switch__thumb" aria-hidden="true" />
      </button>
    )
  },
)
