import type { ReactNode } from 'react'
import { cx } from './cx'

export interface SegmentedOption<T extends string | number> {
  readonly id: T
  /** Text, or an icon (then give `ariaLabel`). */
  readonly label: ReactNode
  readonly title?: string
  readonly ariaLabel?: string
  readonly disabled?: boolean
}

export interface SegmentedControlProps<T extends string | number> {
  /** Accessible name of the group. */
  readonly label?: string
  /** The selected option; `null` when none is (for example a custom value between presets). */
  readonly value: T | null
  readonly options: readonly SegmentedOption<T>[]
  readonly onChange: (value: T) => void
  readonly disabled?: boolean
  /** Shrink to the content instead of filling the row. */
  readonly fit?: boolean
  readonly className?: string
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  fit = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cx('ds-segmented', fit && 'ds-segmented--fit', className)} role="group" aria-label={label}>
      {options.map((opt) => {
        const isSelected = opt.id === value
        return (
          <button
            key={String(opt.id)}
            type="button"
            aria-pressed={isSelected}
            aria-label={opt.ariaLabel ?? (typeof opt.label === 'string' ? opt.label : undefined)}
            title={opt.title}
            disabled={disabled || opt.disabled}
            className={cx('ds-segmented__btn', isSelected && 'is-active')}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
