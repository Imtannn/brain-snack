import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export interface TabOption<T extends string> {
  readonly id: T
  readonly label: ReactNode
  /** Dim figure after the label, for example a count. */
  readonly count?: ReactNode
  /** Small icon before the label. */
  readonly icon?: ReactNode
  /** Second line under the label (`card` variant). */
  readonly hint?: ReactNode
  readonly title?: string
  readonly ariaLabel?: string
  readonly disabled?: boolean
}

export type TabsVariant = 'pill' | 'underline' | 'card'

export interface TabsProps<T extends string> {
  /** Accessible name of the tab list. */
  readonly label: string
  /** The selected tab; `null` when none is. */
  readonly value: T | null
  readonly options: readonly TabOption<T>[]
  readonly onChange: (value: T) => void
  /** `pill`: grey track with a raised active tab. `underline`: text tabs with a rule. `card`: tabs with a title and a hint. */
  readonly variant?: TabsVariant
  /** Shrink to the content instead of filling the row (`pill` only). */
  readonly fit?: boolean
  readonly disabled?: boolean
  readonly className?: string
}

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

export function Tabs<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = 'pill',
  fit = false,
  disabled = false,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  const move = (from: number, step: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + step * i + options.length * i) % options.length
      if (!options[next].disabled) {
        onChange(options[next].id)
        listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
        return
      }
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((opt) => opt.id === value)
    if (e.key in ARROW_STEP) move(index, ARROW_STEP[e.key])
    else if (e.key === 'Home') move(-1, 1)
    else if (e.key === 'End') move(options.length, -1)
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cx(variant === 'pill' ? 'ds-segmented' : 'ds-tabs', variant === 'pill' && fit && 'ds-segmented--fit', variant !== 'pill' && `ds-tabs--${variant}`, className)}
      onKeyDown={onKeyDown}
    >
      {options.map((opt, index) => {
        const selected = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected || (value === null && index === 0) ? 0 : -1}
            title={opt.title}
            disabled={disabled || opt.disabled}
            className={cx(variant === 'pill' ? 'ds-segmented__btn' : 'ds-tabs__tab', selected && 'is-active')}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon}
            {variant === 'card' ? <strong>{opt.label}</strong> : opt.label}
            {opt.hint ? <span className="ds-tabs__hint">{opt.hint}</span> : null}
            {opt.count != null ? <span className="ds-tabs__count">{opt.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
