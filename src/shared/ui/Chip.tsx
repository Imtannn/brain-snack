import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
  /** Toggle state for chips that filter or select (adds `aria-pressed`). */
  selected?: boolean
  /** `suggestion` is the dashed "+ add this" chip. */
  variant?: 'default' | 'suggestion'
  tone?: 'default' | 'danger'
  /** Makes it a removable tag: the label is plain text and a small × button calls this. */
  onRemove?: () => void
  removeLabel?: string
}

export function Chip({
  selected,
  variant = 'default',
  tone = 'default',
  onRemove,
  removeLabel = 'Remove',
  className,
  children,
  ...rest
}: Props) {
  const classes = cx(
    'ds-chip',
    variant === 'suggestion' && 'ds-chip--suggestion',
    tone === 'danger' && 'ds-chip--danger',
    selected && 'is-active',
    className,
  )
  if (onRemove) {
    return (
      <span className={classes}>
        {children}
        <button type="button" className="ds-chip__remove" aria-label={removeLabel} onClick={onRemove}>
          ×
        </button>
      </span>
    )
  }
  return (
    <button type="button" className={classes} aria-pressed={selected} {...rest}>
      {children}
    </button>
  )
}
