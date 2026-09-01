import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowRight } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { useI18n } from '~/i18n'
import '~/styles/about.css'
import { getLocalizedSeo, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { worldThumbnail } from '~/lib/posters'
import { seo } from '~/utils/seo'

const DEV_SITE = 'https://makerjackie.com'
const DESIGN_SITE = 'https://yusually.it.com/'

const getAboutWorlds = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadCuratedWorlds } = await import('~/data/world-artifacts.server')
  return (await loadCuratedWorlds())?.about
})

export const Route = createFileRoute('/about')({
  loader: async () => {
    const worlds = await getAboutWorlds()
    if (!worlds) throw notFound()
    return { worlds }
  },
  head: ({ matches }) => {
    const copy = getLocalizedSeo('about', localeFromRouteMatches(matches))
    return ({
      meta: seo({
      ...copy,
      image: 'https://shapeof.world/assets/oneworld-og.jpg',
      url: 'https://shapeof.world/about',
    }),
    links: [{ rel: 'canonical', href: 'https://shapeof.world/about' }],
    })
  },
  component: AboutPage,
})

function AboutPage() {
  const { worlds } = Route.useLoaderData()
  const { locale, t, worldText } = useI18n()
  useLocalizedRouteSeo('about')
  const glimpseWorlds = worlds.slice(0, 6)
  const horizonWorlds = worlds.slice(6, 14)

  return (
    <main className="editorial-page about-page">
      <SiteHeader inverse />
      <section className="about-prologue" aria-labelledby="about-prologue-title">
        <div className="home-stars" aria-hidden="true" />
        <div className="about-prologue-copy">
          <p className="eyebrow">{t('about.eyebrow')}</p>
          <h1 id="about-prologue-title">{t('about.title')}</h1>
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

      <section className="about-principles" aria-label={t('about.principlesTitle')}>
        <p className="eyebrow">{t('about.principlesTitle')}</p>
        <div className="about-principles-grid">
          <div className="about-principle">
            <strong>{t('about.principle1Title')}</strong>
            <p>{t('about.principle1Body')}</p>
          </div>
          <div className="about-principle">
            <strong>{t('about.principle2Title')}</strong>
            <p>{t('about.principle2Body')}</p>
          </div>
          <div className="about-principle">
            <strong>{t('about.principle3Title')}</strong>
            <p>{t('about.principle3Body')}</p>
          </div>
        </div>
        <p className="about-origin">{t('about.origin')}</p>
      </section>

      <section className="about-glimpse" aria-labelledby="about-glimpse-title">
        <div className="about-glimpse-head">
          <p className="eyebrow" id="about-glimpse-title">{t('about.glimpse.title')}</p>
          <p>{t('about.glimpse.body')}</p>
        </div>
        <div className="about-glimpse-row">
          {glimpseWorlds.map((world) => (
            <Link
              key={world.id}
              to="/explore/$worldId"
              params={{ worldId: world.id }}
              className="about-glimpse-card"
              style={{ '--world-accent': world.accent } as CSSProperties}
            >
              <img
                src={worldThumbnail(world)}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span>{worldText(world, 'posterTitle')}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="about-creators" aria-labelledby="about-creators-title">
        <p className="eyebrow">{t('about.creatorsTitle')}</p>
        <h2 id="about-creators-title">{t('about.creatorsTitle')}</h2>
        <p className="about-creators-body">{t('about.creatorsBody')}</p>
        <div className="about-creator-grid">
          <a className="about-creator-card" href={DEV_SITE} target="_blank" rel="noreferrer">
            <img src="/assets/team/makerjackie.jpg" alt="" width={144} height={144} decoding="async" />
            <div>
              <strong>{t('about.creator.devName')}</strong>
              <span>{t('about.creator.devRole')}</span>
              <p>{t('about.creator.devBio')}</p>
              <em>{t('about.creator.devCta')} <ArrowRight aria-hidden="true" /></em>
            </div>
          </a>
          <a className="about-creator-card" href={DESIGN_SITE} target="_blank" rel="noreferrer">
            <img src="/assets/team/designer.jpg" alt="" width={144} height={144} decoding="async" />
            <div>
              <strong>{t('about.creator.designName')}</strong>
              <span>{t('about.creator.designRole')}</span>
              <p>{t('about.creator.designBio')}</p>
              <em>{t('about.creator.designCta')} <ArrowRight aria-hidden="true" /></em>
            </div>
          </a>
        </div>
      </section>

      <section className="about-sponsor" aria-labelledby="about-sponsor-title">
        <p className="eyebrow" id="about-sponsor-title">{t('about.sponsorTitle')}</p>
        <p className="about-sponsor-body">{t('about.sponsorBody')}</p>
        <ul className="about-sponsor-logos">
          <li>
            <img
              className="about-sponsor-logo about-sponsor-logo--superposition"
              src="/assets/sponsors/superposition-black.svg"
              alt={t('about.sponsor.superpositionAlt')}
              width={280}
              height={133}
              decoding="async"
            />
          </li>
          <li>
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

      {locale === 'zh' ? (
        <section className="about-community" aria-labelledby="about-community-title">
          <div className="about-community-copy">
            <p className="eyebrow">{t('about.communityEyebrow')}</p>
            <h2 id="about-community-title">{t('about.communityTitle')}</h2>
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
        <p className="eyebrow">{t('about.links.title')}</p>
        <ul>
          <li>
            <Link to="/making">
              <span className="about-links-name">{t('nav.making')}</span>
              <span className="about-links-desc">{t('about.links.making')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/failures">
              <span className="about-links-name">{t('nav.failures')}</span>
              <span className="about-links-desc">{t('about.links.failures')}</span>
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
          <li>
            <Link to="/story">
              <span className="about-links-name">{t('nav.story')}</span>
              <span className="about-links-desc">{t('about.links.story')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
      <SiteFooter />
    </main>
  )
}
