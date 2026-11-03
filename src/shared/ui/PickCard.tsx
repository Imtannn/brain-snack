/** Shared select card for catalog + character pickers (outline, Unselect, media). */

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

export type PickAction = {
  label: string
  onClick: () => void
  primary?: boolean
}

/** Backwards-compatible alias */
export type TryOnPickAction = PickAction

export type PickCardProps = {
  selected: boolean
  /** Equipped / wearing — keeps outline + Unselect even when not the active pick. */
  wearing?: boolean
  title: string
  subtitle?: string
  imageUrl?: string
  imagePosition?: string
  /** Custom media (e.g. look collage) — replaces background-image thumb. */
  media?: ReactNode
  brandLabel?: string
  mediaLabel: string
  disabled?: boolean
  loading?: boolean
  onMediaClick: () => void
  actions?: PickAction[]
  /** e.g. wishlist heart */
  overlay?: ReactNode
}

/** Backwards-compatible alias */
export type TryOnPickCardProps = PickCardProps

export function PickCard({
  selected,
  wearing = false,
  title,
  subtitle,
  imageUrl,
  imagePosition = 'center',
  media,
  brandLabel,
  mediaLabel,
  disabled = false,
  loading = false,
  onMediaClick,
  actions,
  overlay,
}: PickCardProps) {
  const showActions = Boolean(actions && actions.length > 0)
  const showBrand = Boolean(brandLabel) && !showActions
  const hasThumb = Boolean(imageUrl) || Boolean(media)
  const thumbStyle: CSSProperties | undefined =
    !media && imageUrl
      ? {
          backgroundImage: `url(${imageUrl})`,
          backgroundPosition: imagePosition,
        }
      : undefined

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onMediaClick()
    }
  }

  return (
    <div
      className={`pick-card room-tryon-card${selected ? ' is-selected' : ''}${wearing ? ' is-wearing' : ''}${loading ? ' is-loading' : ''}`}
      role="option"
      aria-selected={selected}
    >
      <div
        className="room-tryon-card-media"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={mediaLabel}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) onMediaClick()
        }}
        onKeyDown={onKeyDown}
      >
        <span
          className={`room-tryon-card-thumb${hasThumb ? ' has-image' : ''}${media ? ' has-media' : ''}`}
          style={thumbStyle}
        >
          {media}
        </span>
        {showBrand && brandLabel ? (
          <span className="room-tryon-card-brand">
            <span className="room-tryon-card-brand-mark" aria-hidden>
              {(brandLabel[0] || '?').toUpperCase()}
            </span>
            <span>{brandLabel}</span>
          </span>
        ) : null}
        {showActions && actions ? (
          <div className="room-tryon-card-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`room-tryon-card-action${action.primary ? ' is-primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick()
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        {loading ? (
          <span className="room-tryon-card-spinner" aria-hidden="true" />
        ) : null}
      </div>
      {overlay}
      <div className="room-tryon-card-meta">
        <strong>{title}</strong>
        {subtitle ? <em>{subtitle}</em> : null}
      </div>
    </div>
  )
}

export function pickUnselectAction(onClick: () => void): PickAction {
  return { label: 'Unselect', onClick }
}
