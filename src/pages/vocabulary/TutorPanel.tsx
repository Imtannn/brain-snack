import { useEffect, useState } from 'react'
import { Button, Stack, TextArea } from '@shared/ui'
import type { GeminiContent, GeminiPart } from '../../lib/gemini/client'
import {
  continueTutorChat,
  explainedBy,
  explainMiss,
  explanationPrompt,
  tutorFileError,
} from '../../lib/gemini/tutor'
import type { QuizQuestion, RevealReason } from '../../lib/vocabulary/types'

type ChatMessage = {
  id: string
  role: 'user' | 'model'
  text: string
  parts: GeminiPart[]
  fileName?: string
  previewUrl?: string
}

let messageCount = 0

function nextMessageId(): string {
  messageCount += 1
  return `tutor-${messageCount}`
}

export function TutorPanel({
  apiKey,
  question,
  reason,
  selectedLabel,
}: {
  apiKey: string
  question: QuizQuestion
  reason: Exclude<RevealReason, 'correct'>
  selectedLabel: string | null
}) {
  const [explanation, setExplanation] = useState('')
  const [modelLine, setModelLine] = useState('')
  const [explainError, setExplainError] = useState('')
  const [explaining, setExplaining] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const prompt = explanationPrompt(question, reason, selectedLabel)

  useEffect(() => {
    const controller = new AbortController()
    setExplaining(true)
    explainMiss(apiKey, question, reason, selectedLabel, controller.signal)
      .then((reply) => {
        if (controller.signal.aborted) return
        setExplanation(reply.text)
        setModelLine(explainedBy(reply.model, reply.fallback))
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setExplainError(err instanceof Error ? err.message : 'Gemini could not explain this one.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setExplaining(false)
      })
    return () => controller.abort()
  }, [apiKey, question, reason, selectedLabel])

  async function send() {
    const text = draft.trim()
    if ((!text && !file) || sending) return
    if (file) {
      const problem = tutorFileError(file)
      if (problem) {
        setFileError(problem)
        return
      }
    }
    setSending(true)
    setChatError('')
    try {
      const attachment = file ? await readAttachment(file) : null
      const userParts: GeminiPart[] = []
      if (text) userParts.push({ text })
      if (attachment) userParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } })
      const history: GeminiContent[] = []
      if (explanation) {
        history.push({ role: 'user', parts: [{ text: prompt }] })
        history.push({ role: 'model', parts: [{ text: explanation }] })
      }
      for (const message of messages) {
        history.push({ role: message.role, parts: message.parts })
      }
      history.push({ role: 'user', parts: userParts })
      const reply = await continueTutorChat(apiKey, history)
      const replyParts: GeminiPart[] = [{ text: reply.text }]
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'user',
          text: text || attachment?.name || 'Attachment',
          parts: userParts,
          fileName: attachment?.name,
          previewUrl: attachment?.previewUrl,
        },
        { id: nextMessageId(), role: 'model', text: reply.text, parts: replyParts },
      ])
      setDraft('')
      setFile(null)
      setModelLine(explainedBy(reply.model, reply.fallback))
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Gemini could not reply.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="vocab-tutor" aria-label="AI tutor">
      <p className="ds-eyebrow">AI tutor</p>
      {explaining ? <p className="ds-body">Asking Gemini…</p> : null}
      {explanation ? <p className="ds-body">{explanation}</p> : null}
      {explainError ? <p className="vocab-auth-error" role="alert">{explainError}</p> : null}
      {modelLine ? <p className="ds-subtitle">{modelLine}</p> : null}

      <div className="vocab-chat" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`vocab-chat__bubble is-${message.role}`}>
            <p className="ds-eyebrow">{message.role === 'user' ? 'You' : 'Gemini'}</p>
            <p className="ds-body">{message.text}</p>
            {message.previewUrl ? <img src={message.previewUrl} alt="" className="vocab-chat__preview" /> : null}
            {message.fileName && !message.previewUrl ? <p className="ds-subtitle">{message.fileName}</p> : null}
          </article>
        ))}
      </div>

      <Stack gap="3">
        <TextArea
          label="Ask about this concept"
          rows={3}
          value={draft}
          disabled={sending}
          placeholder="Ask a follow-up. Shift+Enter adds a line."
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            event.stopPropagation()
            void send()
          }}
        />
        <div className="vocab-chat__tools">
          <label className="vocab-quick-btn">
            Attach image or text
            <input
              type="file"
              accept="image/*,text/plain,text/markdown,.txt,.md,.csv,.json"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null
                event.target.value = ''
                if (!next) return
                const problem = tutorFileError(next)
                setFileError(problem ?? '')
                setFile(problem ? null : next)
              }}
            />
          </label>
          {file ? (
            <button type="button" className="vocab-quick-btn" onClick={() => setFile(null)}>
              Remove {file.name}
            </button>
          ) : null}
          <Button type="button" className="btn-pop" disabled={sending || explaining || (!draft.trim() && !file)} onClick={() => void send()}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
        {fileError ? <p className="vocab-auth-error" role="alert">{fileError}</p> : null}
        {chatError ? <p className="vocab-auth-error" role="alert">{chatError}</p> : null}
      </Stack>
    </section>
  )
}

async function readAttachment(file: File): Promise<{ mimeType: string; data: string; name: string; previewUrl?: string }> {
  const dataUrl = await readAsDataUrl(file)
  const comma = dataUrl.indexOf(',')
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : ''
  if (!data) throw new Error('Could not read that file.')
  const mimeType = file.type || 'text/plain'
  return {
    mimeType,
    data,
    name: file.name,
    previewUrl: mimeType.startsWith('image/') ? dataUrl : undefined,
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}
