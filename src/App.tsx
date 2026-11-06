import { AuthProvider } from './lib/auth/AuthProvider'
import { GeminiKeyProvider } from './lib/auth/GeminiKeyProvider'
import { SpeechLangProvider } from './lib/speech/SpeechLangProvider'
import { AppShell } from './pages/shell/AppShell'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeminiKeyProvider>
          <SpeechLangProvider>
            <AppShell />
          </SpeechLangProvider>
        </GeminiKeyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
