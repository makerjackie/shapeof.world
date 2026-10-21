import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '~/components/SiteHeader'
import { SiteFooter } from '~/components/SiteFooter'
import { useI18n } from '~/i18n'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { feedbackEmail } from '~/lib/feedback'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'
import '~/styles/site-forms.css'

export const Route = createFileRoute('/terms')({
  loader: ({ context }) => ({ locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const title = locale === 'zh' ? '使用条款' : 'Terms of use'
    return { meta: seo({ title, description: title, locale, url: localizedPublicUrl('https://shapeof.world/terms', locale) }), links: languageDiscoveryLinks('https://shapeof.world/terms', locale) }
  },
  component: TermsPage,
})

function TermsPage() {
  const { t, locale } = useI18n()
  return <main className="editorial-page site-utility-page"><SiteHeader />
    <article className="site-form-page privacy-copy">
      <h1 className="page-title">{t('terms.title')}</h1>
      <p>{t('terms.updated')}</p>
      <p>{t('terms.intro')}</p>
      {(['operator', 'free', 'license', 'science', 'warranty', 'changes'] as const).map((section) => <section key={section}>
        <h2 className="section-title">{t(`terms.${section}Title`)}</h2><p>{t(`terms.${section}Body`)}</p>
        {section === 'license' && <p><a href={locale === 'en' ? '/en/sources' : '/sources'}>{t('terms.sourcesLink')}</a></p>}
      </section>)}
      <p>{t('terms.privacy')} <a href={locale === 'en' ? '/en/privacy' : '/privacy'}>{t('privacy.title')}</a></p>
      <p>{t('terms.contact')} <a href={`mailto:${feedbackEmail}`}>{feedbackEmail}</a></p>
    </article><SiteFooter />
  </main>
}
