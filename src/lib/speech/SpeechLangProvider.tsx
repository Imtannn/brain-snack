import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { primeSpeech } from './speak'
import { readSpeechLang, writeSpeechLang, type SpeechLang } from './speechLang'

type SpeechLangValue = {
  lang: SpeechLang
  setLang: (lang: SpeechLang) => void
}

const SpeechLangContext = createContext<SpeechLangValue | null>(null)

export function SpeechLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SpeechLang>(() => readSpeechLang())

  useEffect(() => {
    primeSpeech()
  }, [])

  const value = useMemo<SpeechLangValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next)
        writeSpeechLang(next)
      },
    }),
    [lang],
  )

  return <SpeechLangContext.Provider value={value}>{children}</SpeechLangContext.Provider>
}

export function useSpeechLang(): SpeechLangValue {
  return useContext(SpeechLangContext) ?? { lang: 'en-US', setLang: () => {} }
}
