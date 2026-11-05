import type { ReactNode } from 'react'
import { Stack } from '@shared/ui'

export function VocabChrome({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="vocab-chrome">
      <header className="vocab-bar">
        <div className="vocab-brand-lockup">
          <div className="vocab-brand-icon" aria-hidden="true">
            🧠
          </div>
          <Stack gap="0">
            <div className="vocab-title-wrap">
              <h1 className="ds-title">{title}</h1>
              <span className="vocab-badge-pill">Bite</span>
            </div>
            {subtitle ? <p className="ds-subtitle">{subtitle}</p> : null}
            {eyebrow ? (
              <p className="ds-eyebrow" style={{ marginTop: '2px' }}>
                {eyebrow}
              </p>
            ) : null}
          </Stack>
        </div>
        {actions ? <div className="vocab-bar__actions">{actions}</div> : null}
      </header>
    </div>
  )
}
