import { Link } from '@tanstack/react-router'

import { useI18n, type Locale } from '~/i18n'
import { useTheme } from '~/state/theme'
import { cleanSearch } from '~/lib/locale'

export function Header() {
  const { locale, setLocale, t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const other: Locale = locale === 'zh' ? 'en' : 'zh'

  return (
    <header className="site-header">
      <Link to="/" search={cleanSearch} className="brand">
        <img className="brand-emblem" src="/brand/app-icon-112.webp" width={40} height={40} alt="" aria-hidden="true" />
        <span className="brand-title">{locale === 'zh' ? '世界的形状' : 'Shape of the World'}</span>
        <span className="brand-kicker">{t('site.kicker')}</span>
      </Link>
      <nav className="site-nav" aria-label="primary">
        <Link to="/" search={cleanSearch}>{t('nav.catalog')}</Link>
        <Link to="/packs" search={cleanSearch}>{t('audio.packs')}</Link>
        <Link to="/album/volume-1" search={cleanSearch}>{t('nav.album')}</Link>
        <Link to="/handoff" search={cleanSearch}>{t('nav.assign')}</Link>
        <a href="https://shapeof.world/">{t('nav.world')}</a>
        <button type="button" className="theme-toggle" aria-label={t(theme === 'dark' ? 'theme.light' : 'theme.dark')} title={t(theme === 'dark' ? 'theme.light' : 'theme.dark')} onClick={toggleTheme}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20 15.2A8.8 8.8 0 0 1 8.8 4a8.8 8.8 0 1 0 11.2 11.2Z" />}
          </svg>
        </button>
        <button
          type="button"
          className="lang-toggle"
          aria-label={t('nav.language')}
          onClick={() => setLocale(other)}
        >
          <span className={locale === 'zh' ? 'is-on' : undefined}>中</span>
          <span aria-hidden="true"> / </span>
          <span className={locale === 'en' ? 'is-on' : undefined}>EN</span>
        </button>
      </nav>
    </header>
  )
}
