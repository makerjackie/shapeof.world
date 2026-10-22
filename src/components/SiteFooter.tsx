import { Link } from '@tanstack/react-router'
import { BrandMark } from '~/components/BrandMark'
import { LocaleToggle } from '~/components/LocaleToggle'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'
import { webBuild } from '~/lib/web-build'
import { useI18n } from '~/i18n'

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link to="/" className="footer-mark"><BrandMark /><span>{t('brand.name')}</span></Link>
        <p>{t('footer.tagline')}</p>
      </div>
      <nav className="footer-navigation" aria-label={t('nav.footer')}>
        <div className="footer-group">
          <h2>{t('footer.explore')}</h2>
          <Link to="/" hash="home-worlds">{t('nav.worlds')}</Link>
          <Link to="/routes">{t('nav.routes')}</Link>
          <Link to="/films">{t('nav.films')}</Link>
        </div>
        <div className="footer-group">
          <h2>{t('footer.creation')}</h2>
          <Link to="/making">{t('nav.making')}</Link>
          <Link to="/changelog">{t('nav.changelog')}</Link>
          <Link to="/sources">{t('footer.sources')}</Link>
        </div>
        <div className="footer-group">
          <h2>{t('footer.contact')}</h2>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/collaborate">{t('collaborate.navLabel')}</Link>
          <Link to="/feedback">{t('feedback.title')}</Link>
          <div className="footer-social">
            <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://x.com/maker_jackie" aria-label={t('nav.authorX')} target="_blank" rel="noreferrer">X</a>
          </div>
        </div>
      </nav>
      <div className="footer-meta">
        <small>© {new Date().getFullYear()} {t('brand.name')}</small>
        <Link to="/privacy">{t('privacy.title')}</Link>
        <Link to="/terms">{t('terms.title')}</Link>
        <a href="/third-party-notices.txt">{t('footer.licenses')}</a>
        <Link to="/changelog" data-web-version={webBuild.version}>{t('footer.version')} {webBuild.version}</Link>
        <LocaleToggle compact />
      </div>
    </footer>
  )
}
