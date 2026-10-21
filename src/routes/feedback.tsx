import { worldRoute } from '~/lib/world-urls'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { feedbackCategories, feedbackEmail, feedbackSearch, newFeedbackSubmission, feedbackSubmissionPattern, type FeedbackCategory } from '~/lib/feedback'
import { trackEvent } from '~/lib/analytics'
import { safeSessionStorage } from '~/lib/storage'
import { requestDeadline } from '~/lib/request-deadline'
import { seo } from '~/utils/seo'
import '~/styles/site-forms.css'

export const Route = createFileRoute('/feedback')({
  validateSearch: feedbackSearch,
  loader: ({ context }) => ({ locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const title = locale === 'zh' ? '反馈与建议' : 'Feedback and suggestions'
    return { meta: seo({ title, description: title, locale, url: localizedPublicUrl('https://shapeof.world/feedback', locale) }), links: languageDiscoveryLinks('https://shapeof.world/feedback', locale) }
  },
  component: FeedbackPage,
})

export function FeedbackPage() {
  const { t, locale } = useI18n()
  const { world, kind } = Route.useSearch()
  const [category, setCategory] = useState<FeedbackCategory>(kind ?? 'suggestion')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'limited' | 'pending' | 'unconfirmed' | 'success'>('idle')
  const [reference, setReference] = useState('')
  const submissionRef = useRef('')
  const sendingRef = useRef(false)
  const [draftReady, setDraftReady] = useState(false)
  const draftKey = `oneworld.feedback.draft.v1.${world ?? 'website'}`
  const [copyStatus, setCopyStatus] = useState('')
  useEffect(() => { trackEvent({ event: 'feedback_open', worldId: world }) }, [world])
  useEffect(() => {
    setDraftReady(false)
    setStatus('idle'); setMessage(''); setReplyTo(''); setCategory(kind ?? 'suggestion'); submissionRef.current = ''
    try {
      const saved = JSON.parse(safeSessionStorage.get(draftKey) ?? 'null')
      if (saved && typeof saved.message === 'string' && saved.message.length <= 3000 && typeof saved.replyTo === 'string' && saved.replyTo.length <= 254 && feedbackCategories.includes(saved.category)) {
        setMessage(saved.message); setReplyTo(saved.replyTo); setCategory(saved.category)
        if (typeof saved.submission === 'string' && feedbackSubmissionPattern.test(saved.submission)) submissionRef.current = saved.submission
      }
    } catch { /* Invalid local drafts must not block the form. */ }
    setDraftReady(true)
  }, [draftKey, kind])
  useEffect(() => {
    if (!draftReady) return
    if (status === 'success' || (!message && !replyTo)) safeSessionStorage.remove(draftKey)
    else safeSessionStorage.set(draftKey, JSON.stringify({ category, message, replyTo, submission: submissionRef.current }))
  }, [category, message, replyTo, status, draftKey, draftReady])
  const edited = () => { submissionRef.current = ''; setStatus('idle') }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sendingRef.current) return
    sendingRef.current = true
    submissionRef.current ||= newFeedbackSubmission()
    setStatus('sending')
    const deadline = requestDeadline(20_000)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': submissionRef.current },
        body: JSON.stringify({ category, message, replyTo: replyTo.trim(), worldId: world ?? '', locale, website }),
        signal: deadline.signal,
      })
      const result = await response.json<{ status?: string; reference?: string; error?: string }>()
      if (result.status === 'pending' || result.status === 'unconfirmed' || result.error === 'submission_expired') {
        if (result.error === 'submission_expired') submissionRef.current = ''
        setStatus(result.status === 'pending' ? 'pending' : 'unconfirmed'); return
      }
      if (result.status === 'rejected') submissionRef.current = ''
      if (!response.ok) {
        setStatus(response.status === 429 ? 'limited' : 'error')
        trackEvent({ event: 'feedback_error', worldId: world, value: response.status === 429 ? 'rate_limit' : 'send_failed' })
        return
      }
      if (result.status !== 'accepted' || !result.reference) throw new Error('Unconfirmed feedback')
      safeSessionStorage.remove(draftKey)
      setReference(result.reference)
      setStatus('success')
      trackEvent({ event: 'feedback_submit', worldId: world, value: category })
    } catch {
      setStatus('error')
      trackEvent({ event: 'feedback_error', worldId: world, value: 'network' })
    } finally { deadline.dispose(); sendingRef.current = false }
  }

  const emailDraft = `mailto:${feedbackEmail}?${Object.entries({
    subject: `[Shape of the World][${category}] ${world ?? 'website'}`,
    body: [message, '', `World: ${world ?? 'website'}`, `Language: ${locale}`].join('\n'),
  }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`
  async function copyEmail() {
    try { await navigator.clipboard.writeText(feedbackEmail); setCopyStatus('feedback.copied') }
    catch { setCopyStatus('feedback.copyFailed') }
  }
  return <main className="editorial-page site-utility-page">
    <SiteHeader />
    <section className="site-form-page" aria-labelledby="feedback-title">
      <h1 id="feedback-title" className="page-title">{t('feedback.title')}</h1>
      <p className="site-form-lede">{t('feedback.body')}</p>
      {world && <p><Link to={worldRoute} params={{ worldId: world }}>{t('feedback.backWorld')}</Link></p>}
      {status === 'success' ? <div className="site-form-success" role="status">
        <h2 className="section-title">{t('feedback.success')}</h2>
        <p>{t('feedback.reference')}: <code>{reference}</code></p>
        <button className="btn-secondary" type="button" onClick={() => { setMessage(''); setReplyTo(''); submissionRef.current = ''; setStatus('idle') }}>{t('feedback.another')}</button>
      </div> : <form className="site-feedback-form" onSubmit={(event) => void submit(event)}>
        <label>{t('feedback.category')}<select value={category} onChange={(event) => { edited(); setCategory(event.target.value as FeedbackCategory) }} disabled={status === 'sending'}>
          {feedbackCategories.map((item) => <option key={item} value={item}>{t(`feedback.${item}`)}</option>)}
        </select></label>
        <label>{t('feedback.message')}<textarea required minLength={5} maxLength={3000} rows={6} value={message} onChange={(event) => { edited(); setMessage(event.target.value) }} aria-describedby="feedback-hint" disabled={status === 'sending'} /></label>
        <p id="feedback-hint" className="site-form-note">{t('feedback.hint')}</p>
        <label>{t('feedback.email')}<input type="email" maxLength={254} autoComplete="email" value={replyTo} onChange={(event) => { edited(); setReplyTo(event.target.value) }} disabled={status === 'sending'} /></label>
        <div className="site-form-trap" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
        <p className="site-form-note">{t('feedback.context')} <Link to="/privacy">{t('privacy.title')}</Link></p>
        {(status === 'error' || status === 'limited') && <p role="alert" className="site-form-error">{t(status === 'limited' ? 'feedback.rateLimit' : 'feedback.error')}</p>}
        {(status === 'pending' || status === 'unconfirmed') && <p role="status">{t(`feedback.${status}`)}</p>}
        <button type="submit" className="btn-primary" disabled={status === 'sending' || !draftReady}>{t(status === 'sending' ? 'feedback.sending' : status === 'pending' || status === 'unconfirmed' ? 'feedback.checkStatus' : 'feedback.send')}</button>
      </form>}
      <div className="site-form-contact">
        <p>{t('feedback.note')}</p>
        <a className="btn-text" href={emailDraft}>{t('feedback.direct')}</a>
        <button type="button" className="btn-text" onClick={() => void copyEmail()}>{t('feedback.copyEmail')}</button>
        <p role="status">{copyStatus && t(copyStatus)}</p>
      </div>
    </section>
    <SiteFooter />
  </main>
}
