import type { ReactNode } from 'react'
import { IconMoon, IconSun } from '../../components/icons/Icons'
import { useTheme } from '../../theme/ThemeProvider'
import { IconButton, Stack } from '@shared/ui'

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
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <header className="vocab-bar">
      <Stack gap="1">
        {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
        <h1 className="ds-title">{title}</h1>
        {subtitle ? <p className="ds-subtitle">{subtitle}</p> : null}
      </Stack>
      <div className="vocab-bar__actions">
        {actions}
        <IconButton label={`Switch to ${next} mode`} onClick={toggleTheme}>
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </IconButton>
      </div>
    </header>
  )
}
