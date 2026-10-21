import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { formatMessage, useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { feedbackEmail } from '~/lib/feedback'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'
import '~/styles/site-forms.css'

export const Route = createFileRoute('/collaborate')({
  loader: ({ context }) => ({ locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const title = formatMessage(locale, 'collaborate.title')
    const description = formatMessage(locale, 'collaborate.metaDescription')
    return { meta: seo({ title, description, locale, url: localizedPublicUrl('https://shapeof.world/collaborate', locale) }), links: languageDiscoveryLinks('https://shapeof.world/collaborate', locale) }
  },
  component: CollaboratePage,
})

function CollaboratePage() {
  const { t, locale } = useI18n()
  const subject = encodeURIComponent(locale === 'zh' ? '合作咨询' : 'Collaboration enquiry')
  return <main className="editorial-page site-utility-page"><SiteHeader />
    <article className="site-form-page privacy-copy">
      <h1 className="page-title">{t('collaborate.title')}</h1>
      <p>{t('collaborate.lead')}</p>
      <section>
        <h2 className="section-title">{t('collaborate.whatTitle')}</h2>
        <h3>{t('collaborate.what1Title')}</h3><p>{t('collaborate.what1Body')}</p>
        <h3>{t('collaborate.what2Title')}</h3><p>{t('collaborate.what2Body')}</p>
        <h3>{t('collaborate.what3Title')}</h3><p>{t('collaborate.what3Body')}</p>
      </section>
      <section>
        <h2 className="section-title">{t('collaborate.whoTitle')}</h2>
        <p>{t('collaborate.whoBody')}</p>
      </section>
      <section>
        <h2 className="section-title">{t('collaborate.howTitle')}</h2>
        <p>{t('collaborate.howBody')}</p>
      </section>
      <p className="site-form-contact"><a href={`mailto:${feedbackEmail}?subject=${subject}`}>{t('collaborate.emailLabel')}</a></p>
    </article><SiteFooter />
  </main>
}
