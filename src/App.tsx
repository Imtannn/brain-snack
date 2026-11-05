import { AuthProvider } from './lib/auth/AuthProvider'
import { GeminiKeyProvider } from './lib/auth/GeminiKeyProvider'
import { AppShell } from './pages/shell/AppShell'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeminiKeyProvider>
          <AppShell />
        </GeminiKeyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
