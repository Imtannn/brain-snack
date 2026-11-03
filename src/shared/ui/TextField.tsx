import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  hideLabel?: boolean
  /** `sm` is the compact control used in side panels and tables. */
  size?: 'md' | 'sm'
  /** A short symbol inside the left edge of the input, for example a currency sign. */
  leading?: ReactNode
  /** Extra class for the input itself (the label wrapper takes `className`). */
  controlClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  {
    label,
    hint,
    error,
    hideLabel = false,
    size = 'md',
    leading,
    controlClassName,
    id,
    className,
    ...rest
  },
  ref,
) {
  const fieldId = id
  const invalid = Boolean(error)

  return (
    <label
      className={cx('ds-field', size === 'sm' && 'ds-field--sm', invalid && 'is-invalid', className)}
      htmlFor={fieldId}
    >
      <span className={cx('ds-field__label', hideLabel && 'visually-hidden')}>
        {label}
      </span>
      <span className="ds-field__box">
        {leading ? <span className="ds-field__leading">{leading}</span> : null}
        <input
          ref={ref}
          id={fieldId}
          className={cx('ds-field__control', Boolean(leading) && 'has-leading', controlClassName)}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      </span>
      {error ? <p className="ds-field__error">{error}</p> : null}
      {!error && hint ? <p className="ds-field__hint">{hint}</p> : null}
    </label>
  )
})
