/** Drippy-style app / scene progress loader (logo + quotes + bar). */

import { useEffect, useState } from 'react'
import {
  DEFAULT_LOADING_LABEL,
  QUOTE_ROTATE_MS,
  createLoadingLabelRotation,
  drippyMarkSrc,
} from './loadingQuotes'
import { ProgressBar, useProgressCreep } from './ProgressBar'
import './progress-loader.css'

export type ProgressLoaderProps = {
  /** When true, fill completes and the overlay can fade out via `done`. */
  ready?: boolean
  /** Hide after reveal (parent unmounts or CSS `.is-done`). */
  done?: boolean
  /** Cover the viewport (session / route boot) instead of a relative stage. */
  page?: boolean
}

/**
 * Full-screen or overlay progress loader with animated quotes and progress bar.
 */
export function ProgressLoader({
  ready = false,
  done = false,
  page = false,
}: ProgressLoaderProps) {
  const progress = useProgressCreep(ready)
  const [status, setStatus] = useState(DEFAULT_LOADING_LABEL)
  const [rotation] = useState(() => createLoadingLabelRotation())

  useEffect(() => {
    let index = 0
    setStatus(rotation[0] ?? DEFAULT_LOADING_LABEL)
    const id = window.setInterval(() => {
      index = (index + 1) % rotation.length
      setStatus(rotation[index] ?? DEFAULT_LOADING_LABEL)
    }, QUOTE_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [rotation])

  const [fadedOut, setFadedOut] = useState(false)

  useEffect(() => {
    if (ready && done) {
      const timer = window.setTimeout(() => {
        setFadedOut(true)
      }, 400)
      return () => window.clearTimeout(timer)
    }
    if (done) {
      setFadedOut(true)
    } else {
      setFadedOut(false)
    }
  }, [ready, done])

  const rootClass = [
    'progress-loader',
    page ? 'is-page' : '',
    fadedOut ? 'is-done' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-label={status}
    >
      <div className="progress-loader-overlay">
        <div className="progress-loader-logo-stage">
          <img
            className="progress-loader-logo"
            src={drippyMarkSrc()}
            alt=""
            width={124}
            height={124}
            decoding="async"
          />
        </div>
        <div className="progress-loader-status">
          <div className="progress-loader-label">{status}</div>
          <ProgressBar progress={progress} aria-label={status} />
        </div>
      </div>
    </div>
  )
}
