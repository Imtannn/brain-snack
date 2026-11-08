import { useEffect, useRef, useState } from 'react'
import { randomUnit } from '../../lib/core/clock'
import { uid } from '../../lib/core/uid'
import { generateQuizFromNotes } from '../../lib/gemini/generateQuiz'
import { useSpeechLang } from '../../lib/speech/SpeechLangProvider'
import type { SavedSnack } from '../../lib/snacks/snackRecord'
import { DEFAULT_SECONDS, QUIZ_CHOICE_COUNT } from '../../lib/vocabulary/constants'
import { parseVocabularyPaste } from '../../lib/vocabulary/parseNotes'
import { buildMeaningQuiz, clampQuizSeconds, shuffleQuestions } from '../../lib/vocabulary/quiz'
import type { QuizQuestion, VocabNote } from '../../lib/vocabulary/types'
import { claimRawStart } from './useSnackSave'
import type { VocabPhase } from './quizPhase'

function notesFromPaste(text: string): VocabNote[] {
  const notes: VocabNote[] = []
  for (const note of parseVocabularyPaste(text).notes) {
    const word = note.word.trim()
    const definition = note.definition.trim()
    if (!word || !definition) continue
    notes.push({ id: uid('note'), word, definition, context: '' })
  }
  return notes
}

function quizError(count: number): string {
  if (count < QUIZ_CHOICE_COUNT) {
    return `Need at least ${QUIZ_CHOICE_COUNT} word: meaning pairs for free mode — or turn on Brainy: Smart Answers if you have a key.`
  }
  return `Need at least ${QUIZ_CHOICE_COUNT} different English meanings so each question has ${QUIZ_CHOICE_COUNT} choices.`
}

/** Saved Brainy/local questions, reused on Crunch Again unless the paste changed. */
export function savedQuestionsToReplay(snack: SavedSnack | null, paste: string): QuizQuestion[] | null {
  if (!snack?.questions.length) return null
  if (paste.trim() !== snack.rawText.trim()) return null
  return snack.questions
}

function initialPhase(snack: SavedSnack | null): { phase: VocabPhase; error: string } {
  if (!snack) return { phase: { kind: 'input' }, error: '' }
  const seconds = clampQuizSeconds(snack.seconds)
  if (snack.questions.length > 0) {
    return {
      phase: {
        kind: 'quiz',
        runId: uid('run'),
        questions: shuffleQuestions(snack.questions),
        seconds,
        rawText: snack.rawText,
        pro: Boolean(snack.model),
        model: snack.model,
      },
      error: '',
    }
  }
  if (snack.smartAnswers) return { phase: { kind: 'input' }, error: '' }
  const notes = notesFromPaste(snack.rawText)
  const questions = buildMeaningQuiz(notes, randomUnit)
  if (questions.length === 0) return { phase: { kind: 'input' }, error: quizError(notes.length) }
  return {
    phase: {
      kind: 'quiz',
      runId: uid('run'),
      questions,
      seconds,
      rawText: snack.rawText,
      pro: false,
      model: null,
    },
    error: '',
  }
}

export function useQuizRun(
  restudySnack: SavedSnack | null,
  geminiKey: string,
  canUseSmartAnswers: boolean,
  onBuilt: (questions: readonly QuizQuestion[], model: string | null) => void,
  onReady: () => void,
) {
  const opening = useRef<{ phase: VocabPhase; error: string } | null>(null)
  if (!opening.current) opening.current = initialPhase(restudySnack)
  const [paste, setPaste] = useState(restudySnack?.rawText ?? '')
  const [secondsText, setSecondsText] = useState(String(restudySnack?.seconds ?? DEFAULT_SECONDS))
  const [smartAnswers, setSmartAnswers] = useState(Boolean(restudySnack?.smartAnswers))
  const [error, setError] = useState(opening.current.error)
  const [phase, setPhase] = useState<VocabPhase>(opening.current.phase)
  const [generating, setGenerating] = useState(false)
  const { lang, setLang } = useSpeechLang()
  const onBuiltRef = useRef(onBuilt)
  const onReadyRef = useRef(onReady)
  onBuiltRef.current = onBuilt
  onReadyRef.current = onReady

  function startLocalQuiz(seconds: number) {
    const notes = notesFromPaste(paste)
    const questions = buildMeaningQuiz(notes, randomUnit)
    if (questions.length === 0) {
      setError(quizError(notes.length))
      setPhase({ kind: 'input' })
      return
    }
    setError('')
    onReadyRef.current()
    setPhase({
      kind: 'quiz',
      runId: uid('run'),
      questions,
      seconds,
      rawText: paste,
      pro: false,
      model: null,
    })
    onBuiltRef.current(questions, null)
  }

  async function startProQuiz(seconds: number, studyLang = lang) {
    const text = paste.trim()
    if (!text) {
      setError('Paste a list, notes, or a topic before asking Brainy.')
      setPhase({ kind: 'input' })
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await generateQuizFromNotes(geminiKey, text, studyLang)
      if (result.questions.length === 0) {
        setError('Brainy did not return any usable questions. Try clearer notes or a topic.')
        setPhase({ kind: 'input' })
        return
      }
      onReadyRef.current()
      setPhase({
        kind: 'quiz',
        runId: uid('run'),
        questions: result.questions,
        seconds,
        rawText: text,
        pro: true,
        model: result.model,
      })
      onBuiltRef.current(result.questions, result.model)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brainy could not build this snack.')
      setPhase({ kind: 'input' })
    } finally {
      setGenerating(false)
    }
  }

  function replay(
    questions: readonly QuizQuestion[],
    seconds: number,
    rawText: string,
    pro: boolean,
    model: string | null,
  ) {
    setError('')
    onReadyRef.current()
    setPhase({
      kind: 'quiz',
      runId: uid('run'),
      questions: shuffleQuestions(questions),
      seconds,
      rawText,
      pro,
      model,
    })
  }

  function startQuiz() {
    if (generating) return
    if (phase.kind === 'done' && phase.questions.length > 0) {
      replay(phase.questions, phase.seconds, phase.rawText, phase.pro, phase.model)
      return
    }
    const seconds = clampQuizSeconds(Number(secondsText))
    setSecondsText(String(seconds))
    const saved = savedQuestionsToReplay(restudySnack, paste)
    if (saved && restudySnack) {
      replay(saved, seconds, restudySnack.rawText, Boolean(restudySnack.model), restudySnack.model)
      return
    }
    if (canUseSmartAnswers && smartAnswers) {
      void startProQuiz(seconds)
      return
    }
    startLocalQuiz(seconds)
  }

  useEffect(() => {
    if (restudySnack?.speechLang) setLang(restudySnack.speechLang)
  }, [restudySnack?.id, restudySnack?.speechLang, setLang])

  useEffect(() => {
    if (!restudySnack || restudySnack.questions.length > 0) return
    if (restudySnack.smartAnswers) {
      if (!claimRawStart(restudySnack.id)) return
      const seconds = clampQuizSeconds(restudySnack.seconds)
      if (geminiKey) void startProQuiz(seconds, restudySnack.speechLang || lang)
      else startLocalQuiz(seconds)
      return
    }
    if (phase.kind === 'quiz') onBuiltRef.current(phase.questions, phase.model)
    // First restudy of a question-less list. Later Crunch Again must reuse the saved questions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    paste,
    setPaste,
    secondsText,
    setSecondsText,
    smartAnswers,
    setSmartAnswers,
    error,
    setError,
    phase,
    setPhase,
    generating,
    startQuiz,
  }
}
