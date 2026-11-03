import { ThemeProvider } from './theme/ThemeProvider'
import { VocabularyPage } from './pages/vocabulary/VocabularyPage'

export default function App() {
  return (
    <ThemeProvider>
      <VocabularyPage />
    </ThemeProvider>
  )
}
