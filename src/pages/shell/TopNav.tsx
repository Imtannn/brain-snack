import { useEffect, useRef, useState } from 'react'
import { Button, Menu, MenuItem } from '@shared/ui'
import { IconMoon, IconSun } from '../../components/icons/Icons'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { useTheme } from '../../theme/ThemeProvider'
import { LoginModal } from '../vocabulary/LoginModal'
import { SettingsModal } from '../vocabulary/SettingsModal'

export function TopNav({
  showHome = false,
  onHome,
}: {
  showHome?: boolean
  onHome?: () => void
}) {
  const { theme, toggleTheme } = useTheme()
  const { user, ready, signOutUser } = useAuth()
  const { key, setKey } = useGeminiKey()
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const next = theme === 'dark' ? 'Cream Foam' : 'Midnight'
  const isLight = theme === 'light'
  const name = user?.displayName || user?.email || 'Signed in'

  useEffect(() => {
    if (!menuOpen) return
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <div className="top-nav__brand">
          <button
            type="button"
            className="top-nav__brand-btn"
            onClick={() => {
              if (showHome && onHome) onHome()
            }}
            aria-label={showHome ? 'Go home' : 'Brain Snack'}
          >
            <span className="top-nav__icon" aria-hidden="true">
              🧠
            </span>
            <span className="top-nav__title">Brain Snack</span>
            <span className="vocab-badge-pill">Bite</span>
          </button>
          {showHome && onHome ? (
            <Button size="sm" variant="quiet" className="btn-pop" onClick={onHome}>
              Home
            </Button>
          ) : null}
        </div>

        <div className="top-nav__actions">
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

          {!ready ? <span className="vocab-account__wait">Checking sign-in</span> : null}

          {ready && !user ? (
            <Button size="sm" variant="quiet" className="btn-pop" onClick={() => setLoginOpen(true)}>
              Log in
            </Button>
          ) : null}

          {ready && user ? (
            <div className="top-nav__account" ref={menuRef}>
              <button
                type="button"
                className="top-nav__account-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="top-nav__account-name" title={name}>
                  {name}
                </span>
              </button>
              {menuOpen ? (
                <Menu>
                  <MenuItem
                    onClick={() => {
                      setMenuOpen(false)
                      setSettingsOpen(true)
                    }}
                  >
                    Settings
                  </MenuItem>
                  <MenuItem
                    danger
                    onClick={() => {
                      setMenuOpen(false)
                      void signOutUser()
                    }}
                  >
                    Log out
                  </MenuItem>
                </Menu>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        initialKey={key}
        onClose={() => setSettingsOpen(false)}
        onSave={setKey}
      />
    </header>
  )
}

export function AuthErrorBanner() {
  const { error } = useAuth()
  if (!error) return null
  return <p className="vocab-auth-error top-nav__error" role="alert">{error}</p>
}
