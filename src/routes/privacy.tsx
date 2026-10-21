import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { analyticsPreference, analyticsPreferenceKey } from '~/lib/analytics-preference'
import { feedbackEmail } from '~/lib/feedback'
import { seo } from '~/utils/seo'
import '~/styles/site-forms.css'

export const Route = createFileRoute('/privacy')({
  loader: ({ context }) => ({ locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const title = locale === 'zh' ? '隐私与数据' : 'Privacy and data'
    return { meta: seo({ title, description: title, locale, url: localizedPublicUrl('https://shapeof.world/privacy', locale) }), links: languageDiscoveryLinks('https://shapeof.world/privacy', locale) }
  },
  component: PrivacyPage,
})
function PrivacyPage() {
  const { t } = useI18n()
  const [sessionOnly, setSessionOnly] = useState(false)
  const [disabled, setDisabled] = useState(false)
  useEffect(() => {
    const sync = () => setDisabled(analyticsPreference.disabled())
    const onStorage = (event: StorageEvent) => { if (event.key === analyticsPreferenceKey || event.key === null) sync() }
    sync()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return <main className="editorial-page site-utility-page"><SiteHeader />
    <article className="site-form-page privacy-copy">
      <h1 className="page-title">{t('privacy.title')}</h1>
      <p>{t('privacy.updated')}</p>
      {['operator', 'local', 'analytics', 'feedback'].map((section) => <section key={section}>
        <h2 className="section-title">{t(`privacy.${section}Title`)}</h2><p>{t(`privacy.${section}Body`)}</p>
        {section === 'analytics' && <label className="privacy-toggle"><input type="checkbox" checked={disabled} onChange={(event) => { setDisabled(event.target.checked); setSessionOnly(!analyticsPreference.setDisabled(event.target.checked)) }} />{t('privacy.optOut')}</label>}
      </section>)}
      {sessionOnly && <p role="status">{t('privacy.sessionOnly')}</p>}
      <p>{t('privacy.hosting')}</p><p>{t('privacy.contact')} <a href={`mailto:${feedbackEmail}`}>{feedbackEmail}</a></p>
    </article><SiteFooter />
  </main>
}
