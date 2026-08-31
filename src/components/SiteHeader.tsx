import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GithubLogo, UsersThree, X } from '@phosphor-icons/react'

import { BrandMark } from '~/components/BrandMark'
import { LocaleToggle } from '~/components/LocaleToggle'
import { SiteSearchButton } from '~/components/SiteSearch'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'
import { useI18n } from '~/i18n'
import '~/styles/about.css'

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  const { t, locale } = useI18n()
  const [communityOpen, setCommunityOpen] = useState(false)
  const panelId = useId()
  const communityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!communityOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!communityRef.current?.contains(event.target as Node)) setCommunityOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCommunityOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [communityOpen])

  // English visitors get public links; WeChat group is China-only.
  const showCommunity = locale === 'zh'

  return (
    <header className={inverse ? 'site-header site-header--inverse' : 'site-header'}>
      <Link to="/" className="wordmark" aria-label={t('nav.home')}>
        <BrandMark />
        <span>{t('brand.name')}</span>
      </Link>
      <div className="site-header-actions">
        <SiteSearchButton />
        <LocaleToggle compact />
        <a
          className="site-github"
          href={SOURCE_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t('nav.github')}
          title={t('nav.github')}
        >
          <GithubLogo aria-hidden="true" weight="thin" />
        </a>
        <nav className="site-nav" aria-label={t('nav.primary')}>
          <Link to="/" hash="home-worlds" activeOptions={{ exact: true }}>
            {t('nav.worlds')}
          </Link>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/support">{t('nav.support')}</Link>
          {showCommunity && (
            <div className="site-community" ref={communityRef}>
              <button
                type="button"
                className={communityOpen ? 'site-community-trigger is-open' : 'site-community-trigger'}
                aria-expanded={communityOpen}
                aria-controls={panelId}
                onClick={() => setCommunityOpen((open) => !open)}
              >
                <UsersThree aria-hidden="true" weight="thin" />
                <span>{t('nav.community')}</span>
              </button>
              {communityOpen && (
                <div id={panelId} className="site-community-panel" role="dialog" aria-label={t('nav.community')}>
                  <button
                    type="button"
                    className="site-community-close"
                    onClick={() => setCommunityOpen(false)}
                    aria-label={t('community.close')}
                  >
                    <X aria-hidden="true" weight="bold" />
                  </button>
                  <p className="site-community-title">{t('community.title')}</p>
                  <p className="site-community-body">{t('community.body')}</p>
                  <img
                    className="site-community-qr"
                    src="/assets/community/wechat-group.jpg"
                    alt={t('community.qrAlt')}
                    width={220}
                    height={262}
                    decoding="async"
                  />
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
