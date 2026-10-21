import { useEffect, useState } from 'react'
import { useI18n } from '~/i18n'
import { musicPrompt } from '~/lib/ai-prompt'

export function AiMusic({ shorts = false }: { shorts?: boolean }) {
  const { locale, t } = useI18n()
  const [state, setState] = useState<'ready' | 'copied' | 'fallback'>('ready')
  const [expanded, setExpanded] = useState(false)
  const prompt = musicPrompt(locale, shorts)
  useEffect(() => { setState('ready') }, [prompt])
  async function copy() {
    setExpanded(true)
    try {
      await navigator.clipboard.writeText(prompt)
      setState('copied')
    } catch {
      setState('fallback')
      setExpanded(true)
    }
  }
  return <section className="ai-music" aria-label={t('ai.title')}>
    <div className="ai-music-copy"><p className="kicker">AI / CODEX</p><h2>{t('ai.title')}</h2><p>{t('ai.description')}</p></div>
    <div className="ai-music-actions"><button type="button" className="btn-solid" onClick={() => void copy()}>{state === 'copied' ? t('handoff.copied') : t('ai.copy')} <span aria-hidden="true">↗</span></button><button className="clear-filter" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? t('ai.hide') : t('ai.view')}</button></div>
    {state === 'fallback' ? <p className="ai-music-status" role="status">{t('ai.fallback')}</p> : <span className="sr-only" role="status">{state === 'copied' ? t('handoff.copied') : ''}</span>}
    {expanded ? <label className="ai-music-prompt"><span>{t('ai.prompt')}</span><textarea readOnly value={prompt} onFocus={e => e.currentTarget.select()} rows={3} /></label> : null}
  </section>
}
