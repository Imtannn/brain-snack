import { useState } from 'react'
import type { AuthUser } from '../../lib/auth/AuthProvider'
import { saveSnack, snackErrorMessage, updateSnack } from '../../lib/snacks/store'
import { snackTitle, type SavedSnack } from '../../lib/snacks/snackRecord'
import { useSpeechLang } from '../../lib/speech/SpeechLangProvider'
import { clampQuizSeconds } from '../../lib/vocabulary/quiz'
import type { QuizQuestion } from '../../lib/vocabulary/types'
import type { VocabPhase } from './quizPhase'

const recentRawStart = new Map<string, number>()

/** One claim per snack so Strict Mode cannot ask Brainy twice for the same list. */
export function claimRawStart(id: string): boolean {
  const now = Date.now()
  const previous = recentRawStart.get(id) ?? 0
  if (now - previous < 1500) return false
  recentRawStart.set(id, now)
  return true
}

export function useSnackSave({
  user,
  restudySnack,
  paste,
  secondsText,
  smartAnswers,
  canUseSmartAnswers,
  phase,
  setError,
}: {
  user: AuthUser | null
  restudySnack: SavedSnack | null
  paste: string
  secondsText: string
  smartAnswers: boolean
  canUseSmartAnswers: boolean
  phase: VocabPhase
  setError: (value: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(restudySnack))
  const [saveTitle, setSaveTitle] = useState(restudySnack?.title ?? '')
  const [saveError, setSaveError] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(restudySnack?.id ?? null)
  const [attachQuestions, setAttachQuestions] = useState(
    Boolean(restudySnack && restudySnack.questions.length === 0),
  )
  const { lang } = useSpeechLang()

  function rememberQuestions(questions: readonly QuizQuestion[], model: string | null) {
    if (!user || !savedId || !attachQuestions || questions.length === 0) return
    setAttachQuestions(false)
    void updateSnack(user.uid, savedId, {
      questions: questions.slice(),
      model,
      smartAnswers: false,
    }).catch(() => {
      // The current run still uses these questions. The next Crunch Again retries the save.
      setAttachQuestions(true)
    })
  }

  function detach() {
    setSaved(false)
    setSavedId(null)
    setAttachQuestions(false)
    setSaveOpen(false)
  }

  function openSave() {
    if (!paste.trim()) {
      setError('Paste a list, notes, or a topic before saving.')
      return
    }
    setSaveTitle((current) => current.trim() || snackTitle(paste))
    setSaveOpen(true)
    setSaveError('')
    setError('')
  }

  async function saveList() {
    if (!user || saving || saved) return
    const text = paste.trim()
    if (!text) {
      setError('Paste a list, notes, or a topic before saving.')
      return
    }
    const title = saveTitle.trim() || snackTitle(text)
    setSaving(true)
    setSaveError('')
    try {
      const id = await saveSnack(user.uid, {
        title,
        rawText: text,
        seconds: clampQuizSeconds(Number(secondsText)),
        questions: [],
        model: null,
        smartAnswers: Boolean(canUseSmartAnswers && smartAnswers),
        speechLang: lang,
      })
      setSavedId(id)
      setAttachQuestions(true)
      setSaveTitle(title)
      setSaved(true)
      setSaveOpen(false)
    } catch (err) {
      setSaveError(snackErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveCurrent() {
    if (!user || phase.kind !== 'done' || saving || saved) return
    const title = saveTitle.trim()
    if (!title) {
      setSaveError('Name this snack before saving.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await saveSnack(user.uid, {
        title,
        rawText: phase.rawText,
        seconds: phase.seconds,
        questions: phase.questions,
        model: phase.model,
        smartAnswers: false,
        speechLang: lang,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(snackErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    saved,
    saveTitle,
    saveError,
    saveOpen,
    setSaveTitle,
    setSaveError,
    rememberQuestions,
    detach,
    openSave,
    saveList,
    saveCurrent,
  }
}
