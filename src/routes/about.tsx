import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowRight } from '@phosphor-icons/react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { useI18n } from '~/i18n'
import '~/styles/about.css'
import { getLocalizedSeo, languageDiscoveryLinks, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { worldThumbnail } from '~/lib/posters'
import { seo } from '~/utils/seo'

const DEV_SITE = 'https://makerjackie.com'

const getAboutWorlds = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadCuratedWorlds } = await import('~/data/world-artifacts.server')
  return (await loadCuratedWorlds())?.about
})

export const Route = createFileRoute('/about')({
  loader: async ({ context }) => {
    const worlds = await getAboutWorlds()
    if (!worlds) throw notFound()
    return { worlds, locale: context.locale }
  },
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const copy = getLocalizedSeo('about', locale)
    const pageUrl = 'https://shapeof.world/about'
    return ({
      meta: seo({
      ...copy,
      image: 'https://shapeof.world/assets/oneworld-og.jpg',
      locale,
      url: localizedPublicUrl(pageUrl, locale),
    }),
    links: languageDiscoveryLinks(pageUrl, locale),
    })
  },
  component: AboutPage,
})

function AboutPage() {
  const { worlds } = Route.useLoaderData()
  const { locale, t } = useI18n()
  useLocalizedRouteSeo('about')
  const horizonWorlds = worlds.slice(0, 8)

  return (
    <main className="editorial-page about-page">
      <SiteHeader />
      <section className="about-prologue" aria-labelledby="about-prologue-title">
        <div className="home-stars" aria-hidden="true" />
        <div className="about-prologue-copy">
          <h1 id="about-prologue-title" className="page-title">{t('about.title')}</h1>
          <p className="about-prologue-body">{t('about.body')}</p>
        </div>
        <div className="about-prologue-horizon" aria-hidden="true">
          {horizonWorlds.map((world) => (
            <img
              key={world.id}
              src={worldThumbnail(world)}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      </section>

      <div className="about-credits">
        <section className="about-creators" aria-labelledby="about-creators-title">
          <h2 id="about-creators-title" className="section-title">{t('about.creatorsTitle')}</h2>
          <p className="about-creators-body">{t('about.creatorsBody')}</p>
          <div className="about-creator-grid">
            <a className="about-creator-card" href={DEV_SITE} target="_blank" rel="noreferrer">
              <span className="about-creator-photo about-creator-photo--jackie">
                <img src="/assets/team/makerjackie.jpg" alt="" width={144} height={144} decoding="async" />
              </span>
              <div>
                <strong>{t('about.creator.devName')}</strong>
                <span>{t('about.creator.devRole')}</span>
                <p>{t('about.creator.devBio')}</p>
                <em>{t('about.creator.devCta')} <ArrowRight aria-hidden="true" /></em>
              </div>
            </a>
          </div>
          <p className="about-creators-past">{t('about.pastContributors')}</p>
        </section>

        <section className="about-sponsor" aria-labelledby="about-sponsor-title">
          <h2 id="about-sponsor-title" className="section-title">{t('about.sponsorTitle')}</h2>
          <p className="about-sponsor-body">{t('about.sponsorBody')}</p>
          <ul className="about-sponsor-logos">
            <li className="about-sponsor-tile">
              <img
                className="about-sponsor-logo about-sponsor-logo--superposition"
                src="/assets/sponsors/superposition-black.svg"
                alt={t('about.sponsor.superpositionAlt')}
                width={360}
                height={171}
                decoding="async"
              />
            </li>
            <li className="about-sponsor-tile">
              <img
                className="about-sponsor-logo about-sponsor-logo--quantsparkle"
                src="/assets/sponsors/quantsparkle-black.png"
                alt={t('about.sponsor.quantsparkleAlt')}
                width={420}
                height={107}
                decoding="async"
              />
            </li>
          </ul>
        </section>
      </div>

      {locale === 'zh' ? (
        <section className="about-community" aria-labelledby="about-community-title">
          <div className="about-community-copy">
            <h2 id="about-community-title" className="section-title">{t('about.communityTitle')}</h2>
            <p>{t('about.communityBody')}</p>
          </div>
          <img
            className="about-community-qr"
            src="/assets/community/wechat-group.jpg"
            alt={t('community.qrAlt')}
            width={240}
            height={286}
            decoding="async"
          />
        </section>
      ) : (
        <p className="about-community-en-note">{t('about.communityZhOnly')}</p>
      )}

      <nav className="about-links" aria-label={t('about.links.title')}>
        <h2 className="label about-links-title">{t('about.links.title')}</h2>
        <ul>
          <li>
            <Link to="/making">
              <span className="about-links-name">{t('nav.making')}</span>
              <span className="about-links-desc">{t('about.links.making')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/logo">
              <span className="about-links-name">{t('nav.logo')}</span>
              <span className="about-links-desc">{t('about.links.logo')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/changelog">
              <span className="about-links-name">{t('nav.changelog')}</span>
              <span className="about-links-desc">{t('about.links.changelog')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/sources">
              <span className="about-links-name">{t('footer.sources')}</span>
              <span className="about-links-desc">{t('about.links.sources')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
      <SiteFooter />
    </main>
  )
}
