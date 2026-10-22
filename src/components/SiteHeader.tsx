import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CaretDown, GithubLogo, List, UsersThree, X } from '@phosphor-icons/react'

import { BrandMark } from '~/components/BrandMark'
import { LocaleToggle } from '~/components/LocaleToggle'
import { SiteSearchButton } from '~/components/SiteSearch'
import { SOURCE_REPOSITORY_URL } from '~/lib/site'
import { useI18n } from '~/i18n'
import '~/styles/about.css'
import './SiteHeader.css'

export function SiteHeader() {
  const { t, locale } = useI18n()
  const [communityOpen, setCommunityOpen] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationId = useId()
  const navigationPanelRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)
  const communityTriggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const communityRef = useRef<HTMLDivElement>(null)

  const closeNavigation = () => {
    setNavigationOpen(false)
    setCommunityOpen(false)
  }

  useEffect(() => {
    const panel = navigationPanelRef.current
    if (!panel) return
    if (!navigationOpen) {
      panel.hidePopover()
      return
    }
    const header = navigationTriggerRef.current?.closest('header')
    panel.style.top = `${(header?.getBoundingClientRect().bottom ?? 72) + 4}px`
    panel.showPopover()
    const close = () => {
      setNavigationOpen(false)
      setCommunityOpen(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close)
    }
  }, [navigationOpen])

  useEffect(() => {
    if (!navigationOpen) return
    const onPointer = (event: PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setNavigationOpen(false)
        setCommunityOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !communityOpen) {
        setNavigationOpen(false)
        navigationTriggerRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [navigationOpen, communityOpen])

  useEffect(() => {
    if (!communityOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!communityRef.current?.contains(event.target as Node)) setCommunityOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommunityOpen(false)
        communityTriggerRef.current?.focus()
      }
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
    <header className="site-header">
      <Link to="/" className="wordmark" aria-label={t('nav.home')}>
        <BrandMark />
        <span>{t('brand.name')}</span>
      </Link>
      <div className="site-header-actions">
        <nav
          className="site-nav"
          aria-label={t('nav.primary')}
          ref={navigationRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeNavigation()
          }}
        >
          <Link to="/" hash="home-worlds" activeOptions={{ exact: true }} onClick={closeNavigation}>
            {t('nav.worlds')}
          </Link>
          <Link to="/routes" onClick={closeNavigation}>{t('nav.routes')}</Link>
          <Link to="/films" onClick={closeNavigation}>{t('nav.films')}</Link>
          <div className="site-header-tools" onPointerDownCapture={closeNavigation}>
            <SiteSearchButton />
            <LocaleToggle compact />
            <a className="site-header-github" href={SOURCE_REPOSITORY_URL}
              target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
              <GithubLogo aria-hidden="true" weight="regular" />
            </a>
          </div>
          <button
            type="button"
            className="site-navigation-trigger"
            ref={navigationTriggerRef}
            aria-label={t('nav.more')}
            aria-expanded={navigationOpen}
            aria-controls={navigationId}
            onClick={() => {
              setNavigationOpen((open) => !open)
              setCommunityOpen(false)
            }}
          >
            <span className="site-navigation-label">{t('nav.more')}</span>
            <CaretDown className="site-navigation-caret" aria-hidden="true" />
            {navigationOpen ? <X className="site-navigation-mobile-icon" aria-hidden="true" /> : <List className="site-navigation-mobile-icon" aria-hidden="true" />}
          </button>
          <div id={navigationId} ref={navigationPanelRef} popover="manual" className="site-navigation-links" data-open={navigationOpen}>
            <div className="site-navigation-mobile-primary">
              <Link to="/" hash="home-worlds" activeOptions={{ exact: true }} onClick={closeNavigation}>{t('nav.worlds')}</Link>
              <Link to="/routes" onClick={closeNavigation}>{t('nav.routes')}</Link>
              <Link to="/films" onClick={closeNavigation}>{t('nav.films')}</Link>
                </div>
            <Link to="/about" onClick={closeNavigation}>{t('nav.about')}</Link>
            <Link to="/feedback" onClick={closeNavigation}>{t('feedback.nav')}</Link>
            {showCommunity && (
              <div className="site-community" ref={communityRef}>
                <button
                  type="button"
                  className={communityOpen ? 'site-community-trigger is-open' : 'site-community-trigger'}
                  ref={communityTriggerRef}
                  aria-label={t('nav.community')}
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
          </div>
        </nav>
      </div>
    </header>
  )
}
