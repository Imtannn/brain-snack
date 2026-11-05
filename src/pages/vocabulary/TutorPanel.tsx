import { useEffect, useState } from 'react'
import { Button, Stack, TextArea } from '@shared/ui'
import type { GeminiContent, GeminiPart } from '../../lib/gemini/client'
import {
  continueTutorChat,
  explainedBy,
  explainMiss,
  explanationPrompt,
} from '../../lib/gemini/tutor'
import type { QuizQuestion, RevealReason } from '../../lib/vocabulary/types'
import { MarkdownText } from './MarkdownText'

type ChatMessage = {
  id: string
  role: 'user' | 'model'
  text: string
  parts: GeminiPart[]
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
        setExplainError(err instanceof Error ? err.message : 'Brainy could not explain this one.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setExplaining(false)
      })
    return () => controller.abort()
  }, [apiKey, question, reason, selectedLabel])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setChatError('')
    try {
      const userParts: GeminiPart[] = [{ text }]
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
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'user', text, parts: userParts },
        { id: nextMessageId(), role: 'model', text: reply.text, parts: [{ text: reply.text }] },
      ])
      setDraft('')
      setModelLine(explainedBy(reply.model, reply.fallback))
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Brainy could not reply.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="vocab-tutor" aria-label="Brainy tutor">
      <p className="ds-eyebrow">Brainy · Our AI agent</p>
      {explaining ? <p className="ds-body">Asking Brainy…</p> : null}
      {explanation ? <MarkdownText text={explanation} className="ds-body" /> : null}
      {explainError ? <p className="vocab-auth-error" role="alert">{explainError}</p> : null}
      {modelLine ? <p className="ds-subtitle">{modelLine}</p> : null}

      <div className="vocab-chat" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`vocab-chat__bubble is-${message.role}`}>
            <p className="ds-eyebrow">{message.role === 'user' ? 'You' : 'Brainy'}</p>
            {message.role === 'model' ? (
              <MarkdownText text={message.text} className="ds-body" />
            ) : (
              <p className="ds-body">{message.text}</p>
            )}
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
          <Button type="button" className="btn-pop" disabled={sending || explaining || !draft.trim()} onClick={() => void send()}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
        {chatError ? <p className="vocab-auth-error" role="alert">{chatError}</p> : null}
      </Stack>
    </section>
  )
}
