import type { ReactNode } from 'react'
import { IconMoon, IconSun } from '../../components/icons/Icons'
import { useTheme } from '../../theme/ThemeProvider'
import { Stack } from '@shared/ui'
import { AccountControls, AuthError } from './AccountControls'

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
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'Cream Foam' : 'Midnight'
  const isLight = theme === 'light'

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
          {eyebrow ? <p className="ds-eyebrow" style={{ marginTop: '2px' }}>{eyebrow}</p> : null}
        </Stack>
      </div>
      <div className="vocab-bar__actions">
        {actions}
        <AccountControls />
        <button
          type="button"
          className="vocab-theme-toggle"
          aria-label={`Switch to ${next} mode`}
          onClick={toggleTheme}
        >
          {isLight ? (
            <>
              <IconMoon size={14} />
              <span>Midnight</span>
            </>
          ) : (
            <>
              <IconSun size={14} />
              <span>Cream Foam</span>
            </>
          )}
        </button>
      </div>
    </header>
    <AuthError />
    </div>
  )
}
