import { useEffect, useRef, useState } from 'react'
import { Button, Menu, MenuItem } from '@shared/ui'
import { IconMoon, IconSun } from '../../components/icons/Icons'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useGeminiKey } from '../../lib/auth/GeminiKeyProvider'
import { useSpeechLang } from '../../lib/speech/SpeechLangProvider'
import { isSpeechLang, SPEECH_LANGS } from '../../lib/speech/speechLang'
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
  const { lang, setLang } = useSpeechLang()
  const { user, signOutUser } = useAuth()
  const { key, setKey } = useGeminiKey()
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const next = theme === 'dark' ? 'Cream Foam' : 'Midnight'
  const isLight = theme === 'light'
  const name = user?.email || 'Signed in'

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

        <div className="top-nav__tools">
          <label className="speech-lang">
            <span className="speech-lang__label">Hear</span>
            <select
              aria-label="Pronunciation language"
              value={lang}
              onChange={(event) => {
                const next = event.target.value
                if (isSpeechLang(next)) setLang(next)
              }}
            >
              {SPEECH_LANGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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

        <div className="top-nav__auth">
          {!user ? (
            <Button size="sm" variant="quiet" className="btn-pop top-nav__login" onClick={() => setLoginOpen(true)}>
              Log in
            </Button>
          ) : (
            <div className="top-nav__account" ref={menuRef}>
              <button
                type="button"
                className="top-nav__account-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={name}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="top-nav__account-name" title={name}>
                  <span className="top-nav__account-name-full">{name}</span>
                  <span className="top-nav__account-name-short">Account</span>
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
          )}
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
