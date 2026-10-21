import { createFileRoute } from '@tanstack/react-router'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { useI18n } from '~/i18n'
import { getLocalizedSeo, languageDiscoveryLinks, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'
import '~/styles/logo.css'

const KIT = '/assets/brand/kit'
const MARK = '/assets/brand/app-icon.png'

const lockups = [
  { id: 'zh-dark', file: 'lockup-zh-dark.png', labelKey: 'logo.lockup.zhDark' },
  { id: 'zh-light', file: 'lockup-zh-light.png', labelKey: 'logo.lockup.zhLight' },
  { id: 'en-dark', file: 'lockup-en-dark.png', labelKey: 'logo.lockup.enDark' },
  { id: 'en-light', file: 'lockup-en-light.png', labelKey: 'logo.lockup.enLight' },
  { id: 'bi-dark', file: 'lockup-bi-dark.png', labelKey: 'logo.lockup.biDark' },
  { id: 'bi-light', file: 'lockup-bi-light.png', labelKey: 'logo.lockup.biLight' },
] as const

const markSizes = [32, 64, 128, 256, 512, 1024] as const

const printMarks = [
  { id: 'mono', file: 'mark-mono.png', labelKey: 'logo.print.mono', stage: 'dark' },
  { id: 'invert', file: 'mark-mono-invert.png', labelKey: 'logo.print.invert', stage: 'paper' },
  { id: 'stamp', file: 'mark-stamp.png', labelKey: 'logo.print.stamp', stage: 'paper' },
] as const

export const Route = createFileRoute('/logo')({
  loader: ({ context }) => ({ locale: context.locale }),
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    const copy = getLocalizedSeo('logo', locale)
    return {
      meta: seo({
        title: copy.title,
        description: copy.description,
        image: 'https://shapeof.world/assets/brand/app-icon.png',
        locale,
        url: localizedPublicUrl('https://shapeof.world/logo', locale),
      }),
      links: languageDiscoveryLinks('https://shapeof.world/logo', locale),
    }
  },
  component: LogoPage,
})

function LogoPage() {
  const { t } = useI18n()
  useLocalizedRouteSeo('logo')

  return (
    <main className="editorial-page logo-page">
      <SiteHeader />

      <section className="logo-hero">
        <h1 className="page-title">{t('logo.title')}</h1>
        <p className="lead logo-lede">{t('logo.lede')}</p>
        <div className="logo-hero-actions">
          <a className="btn-secondary" href={`${KIT}/shape-of-the-world-logo.zip`} download>
            {t('logo.downloadZip')}
          </a>
          <a className="btn-secondary" href={MARK} download="shape-of-the-world-mark.png">
            {t('logo.downloadMark')}
          </a>
        </div>
      </section>

      <section className="logo-section" aria-labelledby="logo-mark-title">
        <h2 id="logo-mark-title" className="section-title">{t('logo.mark.title')}</h2>
        <p>{t('logo.mark.body')}</p>
        <div className="logo-mark-grid">
          <figure className="logo-card">
            <div className="logo-stage logo-stage--dark">
              <img className="logo-mark" src={MARK} alt="" width={180} height={180} />
            </div>
            <figcaption>
              <span>{t('logo.mark.dark')}</span>
              <a className="logo-download" href={MARK} download="shape-of-the-world-mark.png">
                {t('logo.downloadPng')}
              </a>
            </figcaption>
          </figure>
          <figure className="logo-card">
            <div className="logo-stage logo-stage--paper">
              <img className="logo-mark" src={MARK} alt="" width={180} height={180} />
            </div>
            <figcaption>
              <span>{t('logo.mark.light')}</span>
              <a className="logo-download" href={MARK} download="shape-of-the-world-mark.png">
                {t('logo.downloadPng')}
              </a>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="logo-section" aria-labelledby="logo-print-title">
        <h2 id="logo-print-title" className="section-title">{t('logo.print.title')}</h2>
        <p>{t('logo.print.body')}</p>
        <div className="logo-mark-grid logo-mark-grid--three">
          {printMarks.map((item) => (
            <figure className="logo-card" key={item.id}>
              <div className={`logo-stage logo-stage--${item.stage}`}>
                <img
                  className="logo-mark"
                  src={`${KIT}/${item.file}`}
                  alt=""
                  width={180}
                  height={180}
                />
              </div>
              <figcaption>
                <span>{t(item.labelKey)}</span>
                <a className="logo-download" href={`${KIT}/${item.file}`} download>
                  {t('logo.downloadPng')}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="logo-section" aria-labelledby="logo-lockup-title">
        <h2 id="logo-lockup-title" className="section-title">{t('logo.lockup.title')}</h2>
        <p>{t('logo.lockup.body')}</p>
        <div className="logo-lockup-grid">
          {lockups.map((item) => (
            <figure className="logo-card" key={item.id}>
              <img
                className="logo-lockup-img"
                src={`${KIT}/${item.file}`}
                alt={t(item.labelKey)}
                width={1600}
                height={480}
              />
              <figcaption>
                <span>{t(item.labelKey)}</span>
                <a className="logo-download" href={`${KIT}/${item.file}`} download>
                  {t('logo.downloadPng')}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="logo-section" aria-labelledby="logo-size-title">
        <h2 id="logo-size-title" className="section-title">{t('logo.sizes.title')}</h2>
        <p>{t('logo.sizes.body')}</p>
        <div className="logo-size-row">
          {markSizes.map((size) => (
            <a
              key={size}
              className="logo-size"
              href={`${KIT}/mark-${size}.png`}
              download
            >
              <img src={`${KIT}/mark-${size}.png`} alt="" width={size > 128 ? 128 : size} height={size > 128 ? 128 : size} />
              <span>{size}px</span>
            </a>
          ))}
        </div>
      </section>

      <section className="logo-section" aria-labelledby="logo-use-title">
        <h2 id="logo-use-title" className="section-title">{t('logo.use.title')}</h2>
        <ul className="logo-list">
          <li>{t('logo.use.one')}</li>
          <li>{t('logo.use.two')}</li>
          <li>{t('logo.use.three')}</li>
          <li>{t('logo.use.four')}</li>
          <li>{t('logo.use.five')}</li>
        </ul>
      </section>

      <section className="logo-section" aria-labelledby="logo-font-title">
        <h2 id="logo-font-title" className="section-title">{t('logo.fonts.title')}</h2>
        <p>{t('logo.fonts.body')}</p>
        <table className="logo-table">
          <thead>
            <tr>
              <th>{t('logo.fonts.col.use')}</th>
              <th>{t('logo.fonts.col.family')}</th>
              <th>{t('logo.fonts.col.license')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('logo.fonts.zh')}</td>
              <td>Noto Serif SC / 思源宋体</td>
              <td>SIL OFL 1.1</td>
            </tr>
            <tr>
              <td>{t('logo.fonts.en')}</td>
              <td>Cormorant Garamond</td>
              <td>SIL OFL 1.1</td>
            </tr>
          </tbody>
        </table>
      </section>

      <SiteFooter />
    </main>
  )
}
