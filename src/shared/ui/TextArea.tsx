import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  hideLabel?: boolean
  /** Extra class for the textarea itself (the label wrapper takes `className`). */
  controlClassName?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(function TextArea(
  {
    label,
    hint,
    error,
    hideLabel = false,
    controlClassName,
    id,
    className,
    rows = 4,
    ...rest
  },
  ref,
) {
  const invalid = Boolean(error)

  return (
    <label
      className={cx('ds-field', invalid && 'is-invalid', className)}
      htmlFor={id}
    >
      <span className={cx('ds-field__label', hideLabel && 'visually-hidden')}>
        {label}
      </span>
      <textarea
        ref={ref}
        id={id}
        className={cx('ds-field__control', controlClassName)}
        rows={rows}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {error ? <p className="ds-field__error">{error}</p> : null}
      {!error && hint ? <p className="ds-field__hint">{hint}</p> : null}
    </label>
  )
})
