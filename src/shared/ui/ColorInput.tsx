import type { InputHTMLAttributes, MouseEventHandler } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> & {
  /** `#rrggbb`. */
  value: string
  /** Accessible name and tooltip, for example "Custom border color". */
  label: string
  onChange: (value: string) => void
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'square'
  /** What the swatch shows, when it differs from the value the picker opens with. */
  swatch?: string
  onClick?: MouseEventHandler<HTMLLabelElement>
}

/** A colour swatch that opens the browser's colour picker when pressed. */
export function ColorInput({
  value,
  label,
  onChange,
  size = 'md',
  shape = 'circle',
  swatch,
  className,
  disabled,
  onClick,
  ...rest
}: Props) {
  return (
    <label
      className={cx('ds-color', `ds-color--${size}`, shape === 'square' && 'ds-color--square', disabled && 'is-disabled', className)}
      style={{ backgroundColor: swatch ?? value }}
      title={label}
      onClick={onClick}
    >
      <input
        type="color"
        className="ds-color__input"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </label>
  )
}
