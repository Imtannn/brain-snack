/** Custom dropdown matching Atelier ds-menu pickers (not native <select>). */

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Badge } from './Badge'

export type MenuSelectOption<T extends string = string> = {
  value: T
  label: string
  description?: string
  badge?: string
  icon?: ReactNode
  disabled?: boolean
  group?: string
}

export function MenuSelect<T extends string = string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Choose…',
  className = '',
  menuClassName = '',
  'aria-label': ariaLabel,
}: {
  label?: string
  value: T
  options: readonly MenuSelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  menuClassName?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const selected = options.find((o) => o.value === value)
  const triggerLabel = selected?.label || placeholder

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={`menu-select${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      {label ? (
        <span className="menu-select-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        className="menu-select-trigger"
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? ariaLabel || placeholder : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {selected?.icon ? (
          <span className="menu-select-trigger-icon" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {selected.icon}
          </span>
        ) : null}
        <span className={!selected ? 'is-placeholder' : undefined} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerLabel}
        </span>
        {selected?.badge ? (
          <Badge tone="default" size="sm">{selected.badge}</Badge>
        ) : null}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open ? (
        <div
          className={`ds-menu menu-select-menu${menuClassName ? ` ${menuClassName}` : ''}`}
          role="listbox"
          aria-label={ariaLabel || label || placeholder}
        >
          {options.map((option, idx) => {
            const prevOption = options[idx - 1]
            const isFirstInGroup = Boolean(
              option.group && (!prevOption || prevOption.group !== option.group),
            )

            return (
              <Fragment key={option.value}>
                {isFirstInGroup && (
                  <div className="menu-select-group-header" role="presentation">
                    {option.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  className={`${option.value === value ? 'is-active' : ''}${option.disabled ? ' is-disabled' : ''}`.trim() || undefined}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
              {(() => {
                const optionBody = (
                  <>
                    <div className="menu-select-option-row">
                      <span className="menu-select-option-label">{option.label}</span>
                      {option.badge ? (
                        <Badge tone="default" size="sm">{option.badge}</Badge>
                      ) : null}
                    </div>
                    {option.description ? (
                      <span className="menu-select-option-desc">{option.description}</span>
                    ) : null}
                  </>
                )
                if (!option.icon) return optionBody
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', width: '100%' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      {option.icon}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: 0 }}>
                      {optionBody}
                    </div>
                  </div>
                )
              })()}
            </button>
          </Fragment>
        )
      })}
        </div>
      ) : null}
    </div>
  )
}
