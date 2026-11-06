import type { CSSProperties } from 'react'

export type ProgressBarProps = {
  progress: number
  className?: string
  fillClassName?: string
  bgClassName?: string
  style?: CSSProperties
  'aria-label'?: string
}

export function ProgressBar({
  progress,
  className,
  fillClassName,
  bgClassName,
  style,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div
      className={className}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={ariaLabel}
      style={style}
    >
      <div className={bgClassName} aria-hidden />
      <div
        className={fillClassName}
        style={{
          width: `${clamped}%`,
        }}
        aria-hidden
      />
    </div>
  )
}
