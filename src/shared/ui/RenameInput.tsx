import type { InputHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'onBlur' | 'onKeyDown' | 'autoFocus'> & {
  value: string
  /** Accessible name (there is no visible label). */
  'aria-label': string
  onChange: (value: string) => void
  /** Called on Enter or when focus leaves the field. */
  onCommit: () => void
  /** Called on Escape. */
  onCancel: () => void
}

/** A compact input that renames something in place: Enter or blur saves, Escape cancels. */
export function RenameInput({ onChange, onCommit, onCancel, className, ...rest }: Props) {
  return (
    <input
      className={cx('ds-rename', className)}
      autoFocus
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onCommit()
        } else if (e.key === 'Escape') {
          onCancel()
        }
      }}
      {...rest}
    />
  )
}
