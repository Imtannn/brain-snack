import { useEffect, useState, type CSSProperties } from 'react'

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
  className = 'progress-loader-bar',
  fillClassName = 'progress-loader-bar-fill',
  bgClassName = 'progress-loader-bar-bg',
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

/**
 * Soft progress while assets load — creeps toward ~88%, then snaps to 100%
 * when `ready`.
 */
export function useProgressCreep(ready = false, min = 8, cap = 88): number {
  const [progress, setProgress] = useState(min)

  useEffect(() => {
    if (ready) {
      setProgress(100)
      return
    }
    setProgress(min)
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= cap) return prev
        const step = prev < 40 ? 3.5 : prev < 70 ? 2 : 0.8
        return Math.min(cap, prev + step)
      })
    }, 280)
    return () => window.clearInterval(id)
  }, [ready, min, cap])

  return progress
}
