import { useState, useEffect } from 'react'
import { ThemeProvider } from './theme/ThemeProvider'
import { VocabularyPage } from './pages/vocabulary/VocabularyPage'
import { VisualizerPage } from './pages/VisualizerPage'

export default function App() {
  const [view, setView] = useState<'app' | 'visualizer'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'visualizer' || window.location.pathname.includes('visualizer')) {
        return 'visualizer'
      }
    }
    return 'app'
  })

  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search)
      setView(params.get('view') === 'visualizer' ? 'visualizer' : 'app')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  return (
    <ThemeProvider>
      {view === 'visualizer' ? (
        <VisualizerPage onBack={() => setView('app')} />
      ) : (
        <VocabularyPage onOpenVisualizer={() => setView('visualizer')} />
      )}
    </ThemeProvider>
  )
}
