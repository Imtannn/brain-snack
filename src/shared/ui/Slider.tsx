import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Badge } from './Badge'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'> & {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Text above the slider; also its accessible name when it is a string. */
  label?: ReactNode
  /** Current value shown next to the label (for example `45°`). */
  valueLabel?: ReactNode
  /** Help text under the slider. */
  hint?: ReactNode
}

export const Slider = forwardRef<HTMLInputElement, Props>(function Slider(
  { value, min, max, step = 1, onChange, label, valueLabel, hint, className, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  return (
    <div className={cx('ds-slider', className)}>
      {label || valueLabel ? (
        <div className="ds-slider__head">
          <span className="ds-slider__label">{label}</span>
          {valueLabel ? <Badge>{valueLabel}</Badge> : null}
        </div>
      ) : null}
      <input
        ref={ref}
        type="range"
        className="ds-slider__control"
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
        {...rest}
      />
      {hint ? <div className="ds-slider__hint">{hint}</div> : null}
    </div>
  )
})
