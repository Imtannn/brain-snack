import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> & {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Shows the "some selected" dash; `checked` still says whether the box is ticked. */
  indeterminate?: boolean
  /** Text next to the box. Without it, give the box an `aria-label`. */
  label?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { checked, onChange, indeterminate = false, label, className, disabled = false, ...rest },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className={cx('ds-checkbox', disabled && 'is-disabled', className)}>
      <input
        ref={inputRef}
        type="checkbox"
        className="ds-checkbox__control"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
        {...rest}
      />
      {label ? <span className="ds-checkbox__label">{label}</span> : null}
    </label>
  )
})
