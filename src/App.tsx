import { AuthProvider } from './lib/auth/AuthProvider'
import { GeminiKeyProvider } from './lib/auth/GeminiKeyProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { VocabularyPage } from './pages/vocabulary/VocabularyPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeminiKeyProvider>
          <VocabularyPage />
        </GeminiKeyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
