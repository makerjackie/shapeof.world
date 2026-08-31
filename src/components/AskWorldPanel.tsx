import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Sparkle, X } from '@phosphor-icons/react'

import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n'
import { trackEvent } from '~/lib/analytics'
import { userFacingSources } from '~/lib/world-sources'
import 'streamdown/styles.css'
import '~/styles/AskWorldPanel.css'

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export const ASK_WORLD_EVENT = 'oneworld:ask-world'

/** 打开共享的「问问世界」抽屉。可选问题会作为第一条消息直接发出。 */
export function askWorld(worldId: string, question?: string) {
  window.dispatchEvent(new CustomEvent(ASK_WORLD_EVENT, { detail: { worldId, question } }))
}

const loadStreamdown = () => import('streamdown')
const StreamingMarkdown = lazy(async () => ({
  default: (await loadStreamdown()).Streamdown,
}))
const streamAnimation = {
  animation: 'fadeIn',
  duration: 120,
  sep: 'word',
} as const

function suggestedQuestions(
  locale: 'en' | 'zh',
  world: WorldExperience,
  worldQuestion: string,
): Array<string> {
  return locale === 'zh'
    ? [
        worldQuestion,
        '这个现象背后最关键的规律是什么？',
        '它在现实世界中能帮助我们理解什么？',
      ]
    : [
        worldQuestion,
        'What is the most important rule behind this phenomenon?',
        'What can this help us understand in the real world?',
      ]
}

function responseErrorKey(status: number): string {
  if (status === 429) return 'experience.ask.error.rateLimit'
  if (status >= 500) return 'experience.ask.error.unavailable'
  return 'experience.ask.error.generic'
}

export function AskWorldPanel({
  world,
  open,
  onClose,
  seedQuestion,
}: {
  world: WorldExperience
  open: boolean
  onClose: () => void
  /** 打开时自动作为第一条用户消息发出的问题（如来自世界内对象的「问 AI」）。 */
  seedQuestion?: string
}) {
  const { locale, t, worldText, sourceText } = useI18n()
  const [messages, setMessages] = useState<Array<ConversationMessage>>([])
  const [draft, setDraft] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const consumedSeed = useRef('')
  const askRef = useRef<(question: string, origin: 'suggestion' | 'custom') => Promise<void>>(async () => {})
  const questions = useMemo(
    () => suggestedQuestions(locale, world, worldText(world, 'question')),
    [locale, world, worldText],
  )

  useEffect(() => {
    abortRef.current?.abort()
    setMessages([])
    setDraft('')
    setErrorKey('')
    setLoading(false)
  }, [world.id])

  useEffect(() => {
    if (!open) return
    void loadStreamdown()
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: loading ? 'auto' : 'smooth',
    })
  }, [messages, loading, open])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!open) {
      consumedSeed.current = ''
      return
    }
    const seed = seedQuestion?.trim() ?? ''
    if (!seed || consumedSeed.current === seed || loading) return
    consumedSeed.current = seed
    void askRef.current(seed, 'custom')
  }, [open, seedQuestion, loading])

  async function ask(question: string, origin: 'suggestion' | 'custom') {
    const content = question.trim()
    if (!content || loading) return

    const history = [...messages, { role: 'user' as const, content }]
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    setDraft('')
    setErrorKey('')
    setLoading(true)
    setMessages([...history, { role: 'assistant', content: '' }])
    trackEvent({ event: origin === 'suggestion' ? 'ask_suggestion' : 'ask_question', worldId: world.id })

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          worldId: world.id,
          locale,
          messages: history.slice(-7),
        }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        setErrorKey(responseErrorKey(response.status))
        trackEvent({
          event: 'ask_error',
          worldId: world.id,
          value: response.status === 429 ? 'rate_limit' : 'upstream',
        })
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let answer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const event = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>
            }
            const delta = event.choices?.[0]?.delta?.content
            if (!delta) continue
            answer += delta
            setMessages([...history, { role: 'assistant', content: answer }])
          } catch {
            // Ignore non-content provider events while keeping the stream alive.
          }
        }
      }

      if (!answer.trim()) {
        setErrorKey('experience.ask.error.unavailable')
        trackEvent({ event: 'ask_error', worldId: world.id, value: 'empty' })
      } else {
        trackEvent({ event: 'ask_response', worldId: world.id })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErrorKey('experience.ask.error.network')
      trackEvent({ event: 'ask_error', worldId: world.id, value: 'network' })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  askRef.current = ask

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(draft, 'custom')
  }

  return (
    <aside
      id={`experience-ask-${world.id}`}
      className={open ? 'ask-world-panel is-open' : 'ask-world-panel'}
      role="region"
      aria-labelledby={`experience-ask-title-${world.id}`}
      aria-hidden={!open}
      inert={open ? undefined : true}
      data-experience-overlay="true"
    >
      <header className="ask-world-header">
        <div>
          <span><Sparkle aria-hidden="true" weight="fill" /> {t('experience.ask.eyebrow')}</span>
          <h2 id={`experience-ask-title-${world.id}`}>{t('experience.ask.title')}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t('experience.ask.close')}>
          <X aria-hidden="true" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="ask-world-conversation"
        aria-live="polite"
        aria-busy={loading}
      >
        <section className="ask-world-opening">
          <p>{worldText(world, 'posterTitle')}</p>
          <span>{worldText(world, 'hook')}</span>
        </section>

        {messages.length === 0 && (
          <div className="ask-world-suggestions">
            <span>{t('experience.ask.suggestions')}</span>
            {questions.map((question) => (
              <button key={question} type="button" onClick={() => void ask(question, 'suggestion')}>
                {question}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => {
          const isStreaming = loading && index === messages.length - 1 && message.role === 'assistant'
          return (
            <div
              key={`${message.role}-${index}`}
              className={`ask-world-message is-${message.role}`}
            >
              <span>{message.role === 'user' ? t('experience.ask.you') : t('experience.ask.guide')}</span>
              {message.role === 'assistant' && message.content ? (
                <Suspense fallback={<p>{message.content}</p>}>
                  <StreamingMarkdown
                    className="ask-world-markdown"
                    mode={isStreaming ? 'streaming' : 'static'}
                    isAnimating={isStreaming}
                    animated={isStreaming ? streamAnimation : false}
                    controls={false}
                  >
                    {message.content}
                  </StreamingMarkdown>
                </Suspense>
              ) : (
                <p>{message.content || (isStreaming ? t('experience.ask.thinking') : '')}</p>
              )}
            </div>
          )
        })}

        {messages.some((message) => message.role === 'assistant' && message.content) && (
          <div className="ask-world-sources">
            <span>{t('experience.ask.sources')}</span>
            {userFacingSources(world).slice(0, 3).map((source, index) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                {index + 1}. {sourceText(source)}
              </a>
            ))}
          </div>
        )}

        {errorKey && <p className="ask-world-error" role="alert">{t(errorKey)}</p>}
      </div>

      <form className="ask-world-form" onSubmit={submit}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 600))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          rows={1}
          placeholder={t('experience.ask.placeholder')}
          aria-label={t('experience.ask.placeholder')}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !draft.trim()} aria-label={t('experience.ask.send')}>
          <ArrowUp aria-hidden="true" weight="bold" />
        </button>
      </form>
      <p className="ask-world-disclaimer">{t('experience.ask.disclaimer')}</p>
    </aside>
  )
}
