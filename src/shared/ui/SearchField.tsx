import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Accessible name (there is no visible label). */
  'aria-label': string
  /** Shows a clear button while `value` is not empty. */
  onClear?: () => void
}

export const SearchField = forwardRef<HTMLInputElement, Props>(function SearchField(
  { className, value, onClear, ...rest },
  ref,
) {
  return (
    <label className={cx('ds-search', className)}>
      <svg className="ds-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input ref={ref} type="search" className="ds-search__input" value={value} {...rest} />
      {onClear && value ? (
        <button type="button" className="ds-search__clear" aria-label="Clear search" onClick={onClear}>
          ×
        </button>
      ) : null}
    </label>
  )
})
