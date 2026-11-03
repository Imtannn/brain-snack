import { useState } from 'react'
import { Button, Stack } from '@shared/ui'
import { useTheme } from '../theme/ThemeProvider'

export type FontOption = {
  id: string
  name: string
  displayFamily: string
  bodyFamily: string
  tag: string
  badge: string
  description: string
  sampleWord: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'bricolage',
    name: 'Bricolage Grotesque',
    displayFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    tag: 'Quirky Neo-Pop',
    badge: '🍉 Top Pick',
    description: 'Deep ink-traps, flared letterforms, and playful tactile character. Feels like modern candy packaging or an indie design game.',
    sampleWord: "l'éclair",
  },
  {
    id: 'space',
    name: 'Space Grotesk',
    displayFamily: "'Space Grotesk', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    tag: 'Mechanical Precision',
    badge: '⌨️ Tech-Toy',
    description: 'Born from monospace proportions. Pairs seamlessly with the mechanical switch keycaps [ 1 ] - [ 4 ] and retro countdown timers.',
    sampleWord: 'éphémère',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    displayFamily: "'Outfit', system-ui, sans-serif",
    bodyFamily: "'Outfit', system-ui, sans-serif",
    tag: 'Bouncy Geometric',
    badge: '🍬 Friendly',
    description: 'Warm, perfectly rounded geometry without looking childish. Modern consumer app feel like Monzo or Duolingo.',
    sampleWord: 'papillon',
  },
  {
    id: 'rubik',
    name: 'Rubik',
    displayFamily: "'Rubik', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    tag: 'Chunky Block',
    badge: '🧱 Solid',
    description: 'Subtle rounded corners with thick, heavy strokes. Feels chunky, toy-like, and weighted.',
    sampleWord: 'coucher de soleil',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    displayFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    tag: 'Clean Geometric',
    badge: '⚡️ Tech Standard',
    description: 'Crisp, contemporary tech-forward sans. Sharp and balanced.',
    sampleWord: 'étincelle',
  },
]

export function VisualizerPage({ onBack }: { onBack?: () => void }) {
  const [selectedFont, setSelectedFont] = useState<FontOption>(FONT_OPTIONS[0]!)
  const [activeChoice, setActiveChoice] = useState<number | null>(1)
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <main className="vocab-page">
      <div className="vocab-wrap" style={{ maxWidth: '46rem' }}>
        
        {/* Header */}
        <header className="vocab-bar">
          <div className="vocab-brand-lockup">
            <div className="vocab-brand-icon" aria-hidden="true">
              🧠
            </div>
            <Stack gap="0">
              <div className="vocab-title-wrap">
                <h1
                  className="ds-title"
                  style={{ fontFamily: selectedFont.displayFamily, letterSpacing: '-0.02em' }}
                >
                  Typeface Visualizer
                </h1>
                <span className="vocab-badge-pill">Lab</span>
              </div>
              <p className="ds-subtitle">
                Compare typography options live in the Cream Foam design system.
              </p>
            </Stack>
          </div>

          <div className="vocab-bar__actions">
            {onBack ? (
              <Button variant="quiet" onClick={onBack}>
                Back to Quiz
              </Button>
            ) : null}
            <button
              type="button"
              className="vocab-theme-toggle"
              onClick={toggleTheme}
            >
              {isLight ? '🌙 Midnight' : '☀️ Cream Foam'}
            </button>
          </div>
        </header>

        {/* Font Selector Cards */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span className="ds-eyebrow" style={{ color: 'var(--melon)', fontWeight: 800 }}>
              Select a typeface candidate:
            </span>
            <span className="ds-eyebrow">
              {selectedFont.name} ({selectedFont.tag})
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
            }}
          >
            {FONT_OPTIONS.map((font) => {
              const active = font.id === selectedFont.id
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setSelectedFont(font)}
                  className="btn-pop"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '16px',
                    border: active ? '2px solid var(--ink)' : '2px solid var(--border)',
                    background: active ? 'var(--ink)' : 'var(--bg-subtle)',
                    color: active ? 'var(--bg-elevated)' : 'var(--ink)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: active ? '0 4px 0 var(--border-strong, #888)' : '0 3px 0 var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85 }}>
                    {font.badge}
                  </span>
                  <span
                    style={{
                      fontFamily: font.displayFamily,
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      lineHeight: 1.2,
                    }}
                  >
                    {font.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Typeface Info Card */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '2px solid var(--border)',
            borderRadius: '18px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✨</span>
            <h3
              style={{
                fontFamily: selectedFont.displayFamily,
                fontSize: '1.15rem',
                fontWeight: 900,
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              {selectedFont.name} — {selectedFont.tag}
            </h3>
          </div>
          <p className="ds-body" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
            {selectedFont.description}
          </p>
        </div>

        {/* LIVE MOCKUP QUIZ CARD */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--bg-subtle)',
            border: '2px solid var(--border)',
            borderRadius: '24px',
            padding: '20px',
          }}
        >
          {/* Top Bar of Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  background: 'var(--melon)',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '11px',
                  boxShadow: '0 2px 0 var(--melon-shadow)',
                }}
              >
                1
              </span>
              <span
                style={{
                  fontFamily: selectedFont.displayFamily,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ink-muted)',
                }}
              >
                Bite 1 of 6
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-elevated)',
                padding: '6px 14px',
                borderRadius: '16px',
                border: '2px solid var(--border)',
                boxShadow: '0 2px 0 var(--border)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800 }}>
                ⏳ 10.4s
              </span>
              <span
                style={{
                  fontFamily: selectedFont.displayFamily,
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  color: 'var(--marigold-shadow)',
                }}
              >
                CRUNCH
              </span>
            </div>
          </div>

          {/* Target Word Showcase */}
          <div className="vocab-target-box">
            <span
              style={{
                fontFamily: selectedFont.displayFamily,
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--melon)',
              }}
            >
              ✨ Target Word ✨
            </span>
            <div
              style={{
                fontFamily: selectedFont.displayFamily,
                fontSize: '2.75rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--ink)',
                margin: '4px 0',
              }}
            >
              {selectedFont.sampleWord}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
              Foreign word to English active recall
            </div>
          </div>

          {/* 4 Choices */}
          <div className="vocab-choices">
            {[
              { id: 0, text: 'the gentle rainbow after rain' },
              { id: 1, text: 'flash of lightning (literally lightning speed)' },
              { id: 2, text: 'loud rumble of distant thunder' },
              { id: 3, text: 'warm candlelight in a window' },
            ].map((choice) => {
              const isSelected = activeChoice === choice.id
              const isCorrect = choice.id === 1
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setActiveChoice(choice.id)}
                  className={`vocab-choice ds-btn ${
                    isSelected ? (isCorrect ? 'ds-btn--primary' : 'ds-btn--danger') : ''
                  }`}
                  style={{
                    fontFamily: selectedFont.bodyFamily,
                  }}
                >
                  <span className="vocab-choice__key">{choice.id + 1}</span>
                  <span className="vocab-choice__label" style={{ fontWeight: 600 }}>
                    {choice.text}
                  </span>
                  {isSelected ? (
                    <span style={{ fontWeight: 900, fontSize: '1rem', marginLeft: 'auto' }}>
                      {isCorrect ? '✓' : '✕'}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Feedback Drawer */}
          <div
            className={`vocab-reveal ${
              activeChoice === 1 ? 'is-correct' : 'is-wrong'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: selectedFont.displayFamily,
                  fontWeight: 900,
                  fontSize: '0.95rem',
                }}
              >
                {activeChoice === 1 ? '✓ Crunch! That’s spot on.' : '✕ Not quite! Keep practicing.'}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: selectedFont.bodyFamily,
              }}
            >
              The English meaning is “flash of lightning (literally lightning speed)”.
            </p>
          </div>
        </section>

      </div>
    </main>
  )
}
