import { Link } from '@tanstack/react-router'
import { CompassRose } from '@phosphor-icons/react'

import { LocaleToggle } from '~/components/LocaleToggle'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'
import { useI18n } from '~/i18n'

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="footer-mark">
        <CompassRose aria-hidden="true" weight="thin" />
        <span>{t('brand.name')}</span>
      </div>
      <p>{t('footer.tagline')}</p>
      <nav aria-label={t('nav.footer')}>
        <Link to="/" hash="home-worlds">{t('nav.worlds')}</Link>
        <Link to="/atlas">{t('nav.atlas')}</Link>
        <Link to="/story">{t('nav.story')}</Link>
        <Link to="/changelog">{t('nav.changelog')}</Link>
        <Link to="/failures">{t('nav.failures')}</Link>
        <Link to="/making">{t('nav.making')}</Link>
        <Link to="/sources">{t('footer.sources')}</Link>
        <Link to="/about">{t('nav.about')}</Link>
        <Link to="/support">{t('nav.support')}</Link>
        <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer">{t('nav.github')}</a>
        <a href="https://x.com/maker_jackie" target="_blank" rel="noreferrer">{t('nav.authorX')}</a>
        <Link to="/made-with">{t('nav.madeWith')}</Link>
        <a href="/third-party-notices.txt">{t('footer.licenses')}</a>
      </nav>
      <div className="footer-meta">
        <LocaleToggle compact />
        <a className="footer-legacy" href="https://v1.shapeof.world">
          {t('footer.legacy')}
        </a>
        <small>{t('footer.made')}</small>
      </div>
    </footer>
  )
}
