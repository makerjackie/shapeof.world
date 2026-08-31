import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookmarkSimple,
  ChatCircleDots,
  CornersIn,
  CornersOut,
  DiceFive,
  DotsThree,
  Info,
  Pause,
  Play,
  ShareNetwork,
  X,
} from '@phosphor-icons/react'

import { BrandMark } from '~/components/BrandMark'
import { LocaleToggle } from '~/components/LocaleToggle'
import { SiteBgmToggle } from '~/components/SiteBgmToggle'
import { ExperienceCapabilitiesProvider, useExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities'
import { getWorldExperiencePolicy } from '~/data/worlds/experience-policy'
import { ASK_WORLD_EVENT, AskWorldPanel } from '~/components/AskWorldPanel'
import { FollowStayPrompt, hasDismissedFollowPrompt } from '~/components/FollowStayPrompt'
import { MomentCard } from '~/components/MomentCard'
import {
  createShareStateStore,
  ShareStateContext,
} from '~/components/experiences/useShareableState'
import {
  GUIDE_AUTOPLAY_STATE_EVENT,
  setGuideAutoplay,
} from '~/components/experiences/GuideTour'
import { getAiModelLabel } from '~/data/ai-models'
import { getRootCategory } from '~/data/content-graph'
import { localizeIssue } from '~/data/issue-localization'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { getWorldSearchProfile } from '~/data/world-search-profiles'
import { useI18n } from '~/i18n'
import { useLocalizedMetadata } from '~/i18n/seo'
import { trackEvent } from '~/lib/analytics'
import { worldThumbnail } from '~/lib/posters'
import { userFacingSources } from '~/lib/world-sources'
import { attributedShareUrl } from '~/lib/share-url'
import { withShareState } from '~/lib/share-state'
import {
  exitMobileBrowserFullscreen,
  requestMobileBrowserFullscreen,
} from '~/lib/mobile-browser-fullscreen'
import { worldOwnsMusic } from '~/lib/world-music'
import { useAtlas } from '~/state/atlas'

export type ExperienceControls = {
  interacted: boolean
  complete: boolean
  registerInteraction: () => void
  /** @deprecated Legacy compatibility hook. Mounting is not a user interaction. */
  completeOnboarding: () => void
  finish: () => void
}

function automatedDemoIsDriving(): boolean {
  return typeof document !== 'undefined'
    && (
      document.documentElement.hasAttribute('data-oneworld-ghost-active')
      || document.documentElement.hasAttribute('data-oneworld-guide-action-active')
    )
}

export type ExperienceNavigation = {
  nextWorld?: WorldExperience
  nextIssue?: DailyIssue
  nextKind?: 'issue' | 'path' | 'related' | 'recommended'
  randomWorldIds: Array<string>
  pathPosition?: {
    id: string
    title: string
    titleEn: string
    order: number
    total: number
  }
  displayPosition?: number
  displayTotal: number
  worldIssues: Array<DailyIssue>
}

export function ExperienceShell({
  world,
  issue,
  navigation,
  isPublic,
  children,
}: {
  world: WorldExperience
  issue?: DailyIssue
  navigation: ExperienceNavigation
  isPublic: boolean
  children: (controls: ExperienceControls) => ReactNode
}) {
  return (
    <ExperienceCapabilitiesProvider>
      <ExperienceShellView
        world={world}
        issue={issue}
        navigation={navigation}
        isPublic={isPublic}
      >
        {children}
      </ExperienceShellView>
    </ExperienceCapabilitiesProvider>
  )
}

function ExperienceShellView({
  world,
  issue,
  navigation,
  isPublic,
  children,
}: {
  world: WorldExperience
  issue?: DailyIssue
  navigation: ExperienceNavigation
  isPublic: boolean
  children: (controls: ExperienceControls) => ReactNode
}) {
  const atlas = useAtlas()
  const { locale, t, worldText, sourceText, categoryText } = useI18n()
  const capabilities = useExperienceCapabilities()
  const experiencePolicy = getWorldExperiencePolicy(world)
  const issueCopy = issue ? localizeIssue(issue, locale) : undefined
  const searchCopy = getWorldSearchProfile(world.id)?.[locale]
  useLocalizedMetadata({
    title: `${issueCopy?.question ?? searchCopy?.title ?? worldText(world, 'question')} — ${t('brand.name')}`,
    description: issueCopy?.hook ?? searchCopy?.description ?? worldText(world, 'hook'),
  })
  const [interacted, setInteracted] = useState(false)
  const [complete, setComplete] = useState(() => isPublic && (
    issue ? atlas.isIssueComplete(issue.id) : atlas.isComplete(world.id)
  ))
  const [introOpen, setIntroOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [askSeed, setAskSeed] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [overlaysHidden, setOverlaysHidden] = useState(false)
  const [guideAutoplay, setGuideAutoplayPlaying] = useState(false)
  const [essentialChrome, setEssentialChrome] = useState(experiencePolicy.shellMode === 'standard')
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const askButtonRef = useRef<HTMLButtonElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMoreButtonRef = useRef<HTMLButtonElement>(null)
  const moreSheetRef = useRef<HTMLDivElement>(null)
  const introCloseRef = useRef<HTMLButtonElement>(null)
  const introCopyRef = useRef<HTMLDivElement>(null)
  const nextLinkRef = useRef<HTMLAnchorElement>(null)
  const browserFullscreenOwnedRef = useRef(false)
  const immersiveRequestedRef = useRef(false)
  const { nextIssue, nextKind, nextWorld, pathPosition, worldIssues } = navigation
  const rootCategory = getRootCategory(world.primaryCategoryId)
  const nextIssueCopy = nextIssue ? localizeIssue(nextIssue, locale) : undefined
  const [shareOpen, setShareOpen] = useState(false)
  const [followChipOpen, setFollowChipOpen] = useState(false)
  /**
   * Holds whatever the mounted world last published via `useShareableState`.
   * A ref-backed store rather than state: worlds update it on every slider
   * move, and re-rendering the shell for each one would be wasteful.
   */
  const shareStoreRef = useRef(createShareStateStore())
  const shareStore = shareStoreRef.current

  const nextLabel = nextKind === 'path' && pathPosition
    ? t('experience.next.path', {
        path: locale === 'zh' ? pathPosition.title : pathPosition.titleEn,
        current: String(pathPosition.order + 1),
        total: String(pathPosition.total),
      })
    : nextKind === 'issue'
      ? t('experience.next.issue')
      : t('experience.next.recommended')
  const nextShortTitle = nextWorld ? worldText(nextWorld, 'posterTitle') : ''
  const nextTitle = nextIssueCopy?.question ?? nextShortTitle
  const mobileNextEyebrow = nextKind === 'path' && pathPosition
    ? nextLabel
    : categoryText(rootCategory, 'title')
  const randomWorldId = navigation.randomWorldIds.find((candidateId) => (
    candidateId !== nextWorld?.id && !atlas.visited.includes(candidateId)
  )) ?? navigation.randomWorldIds.find((candidateId) => candidateId !== nextWorld?.id)
  const displayIndex = navigation.displayPosition
    ? String(navigation.displayPosition).padStart(2, '0')
    : (world.index ?? '')
  const displayTotal = navigation.displayTotal
  const showDefaultMusic = !worldOwnsMusic(world.id)
  const initialModelId = world.provenance && 'initialModel' in world.provenance
    ? world.provenance.initialModel
    : undefined
  const initialModelLabel = initialModelId
    ? getAiModelLabel(initialModelId)
    : undefined
  const adaptationModelId = world.provenance?.origin === 'open-source-adaptation'
    ? world.provenance.adaptationModel
    : undefined
  const adaptationModelLabel = adaptationModelId
    ? getAiModelLabel(adaptationModelId)
    : undefined
  const modelCollectionId = initialModelId ?? adaptationModelId
  const modelCollectionLabel = initialModelLabel ?? adaptationModelLabel

  useEffect(() => {
    const shellClass = 'experience-shell-active'
    document.documentElement.classList.add(shellClass)
    document.body.classList.add(shellClass)
    return () => {
      document.documentElement.classList.remove(shellClass)
      document.body.classList.remove(shellClass)
    }
  }, [])

  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement !== document.documentElement) {
        browserFullscreenOwnedRef.current = false
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      immersiveRequestedRef.current = false
      if (!browserFullscreenOwnedRef.current) return
      browserFullscreenOwnedRef.current = false
      void exitMobileBrowserFullscreen()
    }
  }, [])

  useEffect(() => {
    if (!isPublic || !atlas.ready) return
    setComplete(issue ? atlas.isIssueComplete(issue.id) : atlas.isComplete(world.id))
    atlas.visitWorld(world.id)
    if (issue) atlas.visitIssue(issue.id)
    trackEvent({ event: 'experience_open', worldId: world.id, issueId: issue?.id })
  }, [atlas.ready, isPublic, issue?.id, world.id])

  useEffect(() => {
    // Long-form lessons can opt into a clean, deterministic recording view.
    // The timeline keeps its own subtitles visible while shell chrome stays out.
    const captureMode = new URLSearchParams(window.location.search).get('capture') === '1'
    immersiveRequestedRef.current = captureMode
    if (!captureMode && browserFullscreenOwnedRef.current) {
      browserFullscreenOwnedRef.current = false
      void exitMobileBrowserFullscreen()
    }
    setOverlaysHidden(captureMode)
    setGuideAutoplayPlaying(false)
    setGuideAutoplay(world.id, false)
  }, [world.id])

  useEffect(() => {
    if (!moreOpen) return
    const frame = window.requestAnimationFrame(() => {
      const sheet = moreSheetRef.current
      if (!sheet) return
      const first = Array.from(sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).find((element) => element.getClientRects().length > 0)
      first?.focus({ preventScroll: true })
    })

    function trapMoreSheetFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const sheet = moreSheetRef.current
      if (!sheet) return
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1) ?? first
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', trapMoreSheetFocus)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', trapMoreSheetFocus)
    }
  }, [moreOpen])

  // 与 GuideTour 同步自动播放状态（沉浸角标上的播放键）
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId?: string; playing?: boolean }>).detail
      if (detail?.worldId !== world.id) return
      setGuideAutoplayPlaying(Boolean(detail.playing))
    }
    window.addEventListener(GUIDE_AUTOPLAY_STATE_EVENT, handler)
    return () => window.removeEventListener(GUIDE_AUTOPLAY_STATE_EVENT, handler)
  }, [world.id])

  useEffect(() => {
    if (experiencePolicy.shellMode === 'standard') {
      setEssentialChrome(true)
      return
    }
    setEssentialChrome(false)
    let hideTimer = 0
    let visible = false
    const reveal = () => {
      visible = true
      setEssentialChrome(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => {
        visible = false
        setEssentialChrome(false)
      }, 2800)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (introOpen || askOpen || moreOpen || shareOpen) {
        setIntroOpen(false)
        setAskOpen(false)
        setMoreOpen(false)
        setShareOpen(false)
        return
      }
      if (!visible) {
        reveal()
        return
      }
      window.location.assign('/')
    }
    window.addEventListener('pointermove', reveal)
    window.addEventListener('pointerdown', reveal)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(hideTimer)
      window.removeEventListener('pointermove', reveal)
      window.removeEventListener('pointerdown', reveal)
      window.removeEventListener('keydown', onKey)
    }
  }, [askOpen, experiencePolicy.shellMode, introOpen, moreOpen, shareOpen])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId?: string; question?: string }>).detail
      if (detail?.worldId !== world.id) return
      setAskSeed(detail.question ?? '')
      setIntroOpen(false)
      setMoreOpen(false)
      setShareOpen(false)
      setAskOpen(true)
      trackEvent({ event: 'ask_open', worldId: world.id, issueId: issue?.id })
    }
    window.addEventListener(ASK_WORLD_EVENT, handler)
    return () => window.removeEventListener(ASK_WORLD_EVENT, handler)
  }, [world.id, issue?.id])

  useEffect(() => {
    if (!atlas.ready || atlas.visited.length < 2 || shareOpen) return
    if (hasDismissedFollowPrompt()) return
    setFollowChipOpen(true)
  }, [atlas.ready, atlas.visited.length, shareOpen, world.id])

  useEffect(() => {
    let visibleSeconds = 0
    const emitted = new Set<number>()
    const thresholds = [5, 15, 30]
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      visibleSeconds += 1
      for (const threshold of thresholds) {
        if (visibleSeconds < threshold || emitted.has(threshold)) continue
        emitted.add(threshold)
        trackEvent({
          event: 'experience_engaged',
          worldId: world.id,
          issueId: issue?.id,
          value: `${threshold}s`,
        })
      }
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [issue?.id, world.id])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && askOpen) {
        event.preventDefault()
        closeAsk()
        return
      }
      if (event.key === 'Escape' && moreOpen) {
        event.preventDefault()
        closeMore()
        return
      }
      if (event.key === 'Escape' && introOpen) {
        event.preventDefault()
        closeIntro()
        return
      }
      if (event.defaultPrevented || introOpen || askOpen || moreOpen || shareOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
      if (event.key !== 'ArrowDown' && event.key !== 'PageDown') return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, a, input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      nextLinkRef.current?.click()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [askOpen, introOpen, moreOpen, shareOpen, world.id])

  useEffect(() => {
    if (!introOpen) return
    introCopyRef.current?.scrollTo({ top: 0 })
  }, [introOpen])

  function registerInteraction() {
    if (interacted || automatedDemoIsDriving()) return
    setInteracted(true)
    trackEvent({ event: 'experience_start', worldId: world.id, issueId: issue?.id })
    trackEvent({ event: 'first_interaction', worldId: world.id, issueId: issue?.id })
  }

  function completeOnboarding() {
    // Kept temporarily for older experiences. Readiness is not interaction.
  }

  function finish() {
    if (automatedDemoIsDriving()) return
    if (!complete) {
      setComplete(true)
      if (isPublic) {
        if (issue) atlas.completeIssue(issue.id, world.id)
        else atlas.completeWorld(world.id)
      }
    }
  }

  function openIntro() {
    setAskOpen(false)
    setMoreOpen(false)
    setShareOpen(false)
    setIntroOpen(true)
    window.requestAnimationFrame(() => {
      introCopyRef.current?.scrollTo({ top: 0 })
      introCloseRef.current?.focus({ preventScroll: true })
    })
  }

  function closeIntro() {
    setIntroOpen(false)
    window.requestAnimationFrame(() => {
      focusVisibleControl(infoButtonRef.current, mobileMoreButtonRef.current, moreButtonRef.current)
    })
  }

  /** 资料按钮再点一次即关闭，符合开关心智 */
  function toggleIntro() {
    if (introOpen) closeIntro()
    else openIntro()
  }

  function openAsk() {
    setAskSeed('')
    setIntroOpen(false)
    setMoreOpen(false)
    setShareOpen(false)
    setAskOpen(true)
    trackEvent({ event: 'ask_open', worldId: world.id, issueId: issue?.id })
  }

  function closeAsk() {
    setAskSeed('')
    setAskOpen(false)
    window.requestAnimationFrame(() => {
      focusVisibleControl(askButtonRef.current, mobileMoreButtonRef.current, moreButtonRef.current)
    })
  }

  function toggleAsk() {
    if (askOpen) closeAsk()
    else openAsk()
  }

  function openMore() {
    setIntroOpen(false)
    setAskOpen(false)
    setShareOpen(false)
    setMoreOpen(true)
  }

  function closeMore() {
    setMoreOpen(false)
    window.requestAnimationFrame(() => {
      focusVisibleControl(mobileMoreButtonRef.current, moreButtonRef.current)
    })
  }

  function focusVisibleControl(...candidates: Array<HTMLElement | null | undefined>) {
    const target = candidates.find((element) => element?.getClientRects().length)
    target?.focus({ preventScroll: true })
  }

  function toggleMore() {
    if (moreOpen) closeMore()
    else openMore()
  }

  function toggleImmersive() {
    const next = !overlaysHidden
    setMoreOpen(false)
    immersiveRequestedRef.current = next
    if (next) {
      setIntroOpen(false)
      setAskOpen(false)
      void requestMobileBrowserFullscreen().then((entered) => {
        if (!entered) return
        if (immersiveRequestedRef.current) {
          browserFullscreenOwnedRef.current = true
          return
        }
        void exitMobileBrowserFullscreen()
      })
    } else if (browserFullscreenOwnedRef.current) {
      browserFullscreenOwnedRef.current = false
      void exitMobileBrowserFullscreen()
    }
    setOverlaysHidden(next)
    if (!next) {
      setGuideAutoplay(world.id, false)
      setGuideAutoplayPlaying(false)
    }
  }

  function toggleCinemaPlay() {
    const next = !guideAutoplay
    if (next && !overlaysHidden) setOverlaysHidden(true)
    setGuideAutoplay(world.id, next)
    setGuideAutoplayPlaying(next)
    trackEvent({
      event: next ? 'guide_autoplay_start' : 'guide_autoplay_pause',
      worldId: world.id,
      issueId: issue?.id,
    })
  }

  /**
   * Build the link at the moment of sharing, folding in whatever state the
   * mounted world last published. Worlds that publish nothing still share a
   * clean link, so this is safe for all of them.
   */
  function buildShareUrl() {
    const base = attributedShareUrl(window.location.href, locale, {
      worldId: world.id,
      content: 'moment',
    })
    return withShareState(base, shareStore.current.packed)
  }

  function openShare() {
    setIntroOpen(false)
    setAskOpen(false)
    setMoreOpen(false)
    setShareOpen(true)
    trackEvent({ event: 'share_open', worldId: world.id, issueId: issue?.id })
  }

  function closeShare() {
    setShareOpen(false)
  }

  function trackNextNavigation() {
    if (!nextWorld) return
    const event = nextKind === 'path'
      ? 'path_next_click' as const
      : nextKind === 'issue'
        ? 'issue_next_click' as const
        : 'recommended_next_click' as const
    trackEvent({
      event,
      worldId: world.id,
      issueId: issue?.id,
      value: nextWorld.id,
    })
  }

  function trackRandomNavigation() {
    if (!randomWorldId) return
    trackEvent({
      event: 'random_world_click',
      worldId: world.id,
      issueId: issue?.id,
      value: randomWorldId,
    })
  }

  return (
    <main
      className="experience-page"
      data-world-id={world.id}
      data-shell-mode={experiencePolicy.shellMode}
      data-entry-mode={experiencePolicy.entryMode}
      data-essential-chrome={essentialChrome ? 'true' : 'false'}
      data-overlays-hidden={overlaysHidden ? 'true' : 'false'}
      data-guide-autoplay={guideAutoplay ? 'true' : 'false'}
      data-panel-open={introOpen || askOpen || moreOpen || shareOpen ? 'true' : 'false'}
      style={{ '--world-accent': world.accent } as CSSProperties}
    >
      <header className="experience-header" inert={moreOpen ? true : undefined}>
        <Link
          to="/"
          search={issue ? { issue: issue.id } : {}}
          className="experience-brand"
          aria-label={t('experience.back')}
          title={t('experience.back')}
          viewTransition
        >
          <BrandMark />
          <span>{t('brand.name')}</span>
        </Link>

        {/* 进度仅供读屏：视觉顶栏保持极简，不挂长标题与学科 chip */}
        <p className="experience-progress-sr">
          {t('experience.position', {
            current: displayIndex,
            total: String(displayTotal).padStart(2, '0'),
          })}
          {pathPosition ? ` · ${pathPosition.order}/${pathPosition.total}` : ''}
          {` · ${categoryText(rootCategory, 'title')}`}
        </p>

        <div className="experience-header-actions experience-header-actions--desktop">
          <button
            ref={infoButtonRef}
            type="button"
            className="experience-header-icon experience-info-button"
            onClick={toggleIntro}
            aria-expanded={introOpen}
            aria-controls={`experience-intro-${world.id}`}
            title={introOpen ? t('experience.sourcesClose') : t('experience.sources')}
            aria-label={introOpen ? t('experience.sourcesClose') : t('experience.sources')}
          >
            <Info aria-hidden="true" weight="regular" />
          </button>
          <button
            ref={askButtonRef}
            type="button"
            className="experience-header-icon experience-ask-button"
            onClick={toggleAsk}
            aria-expanded={askOpen}
            aria-controls={`experience-ask-${world.id}`}
            title={askOpen ? t('experience.ask.close') : t('experience.ask.title')}
            aria-label={askOpen ? t('experience.ask.close') : t('experience.ask.title')}
          >
            <ChatCircleDots aria-hidden="true" weight="regular" />
          </button>
          {/*
            Share sits in the top bar, not inside the ⓘ drawer. It is the one
            action the whole growth model depends on, and two taps behind an
            info panel is where growth mechanisms go to die.
          */}
          <button
            type="button"
            className="experience-header-icon experience-share-button"
            onClick={openShare}
            title={t('experience.share')}
            aria-label={t('experience.share')}
          >
            <ShareNetwork aria-hidden="true" weight="regular" />
          </button>
          {showDefaultMusic && <SiteBgmToggle />}
          <button
            ref={moreButtonRef}
            type="button"
            className="experience-header-icon experience-more-button"
            onClick={toggleMore}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={`experience-more-${world.id}`}
            title={t('experience.more')}
            aria-label={t('experience.more')}
          >
            <DotsThree aria-hidden="true" weight="bold" />
          </button>
          <button
            type="button"
            className="experience-header-icon experience-overlay-toggle"
            onClick={toggleImmersive}
            aria-pressed={overlaysHidden}
            title={overlaysHidden ? t('experience.overlays.show') : t('experience.overlays.hide')}
            aria-label={overlaysHidden ? t('experience.overlays.show') : t('experience.overlays.hide')}
          >
            {overlaysHidden
              ? <CornersIn aria-hidden="true" weight="regular" />
              : <CornersOut aria-hidden="true" weight="regular" />}
          </button>
          {/* 沉浸角标：播放 = 自动把 GuideTour 整段演完，像动态科普片 */}
          {overlaysHidden && capabilities.hasGuide && (
            <button
              type="button"
              className="experience-header-icon experience-cinema-toggle"
              onClick={toggleCinemaPlay}
              aria-pressed={guideAutoplay}
              title={guideAutoplay ? t('experience.cinema.pause') : t('experience.cinema.play')}
              aria-label={guideAutoplay ? t('experience.cinema.pause') : t('experience.cinema.play')}
            >
              {guideAutoplay
                ? <Pause aria-hidden="true" weight="fill" />
                : <Play aria-hidden="true" weight="fill" />}
            </button>
          )}
          <nav
            className="experience-discovery-nav"
            aria-label={t('experience.discoveryNav')}
            data-experience-overlay="true"
          >
            {nextWorld && (
            <Link
              ref={nextLinkRef}
              to="/explore/$worldId"
              params={{ worldId: nextWorld.id }}
              search={nextIssue
                ? { issue: nextIssue.id }
                : pathPosition && nextKind === 'path'
                  ? { path: pathPosition.id }
                  : {}}
              className="experience-next-link"
              viewTransition
              style={{ '--next-world-accent': nextWorld.accent } as CSSProperties}
              title={`${nextLabel}: ${nextTitle}`}
              aria-label={`${t('experience.next')}: ${nextTitle}`}
              onClick={trackNextNavigation}
            >
              <img
                className="experience-next-thumb"
                src={worldThumbnail(nextWorld)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <span className="experience-next-copy">
                <small>{nextLabel}</small>
                <strong className="experience-next-title-full">{nextTitle}</strong>
                <strong className="experience-next-title-short">{nextShortTitle}</strong>
              </span>
              <ArrowRight aria-hidden="true" weight="regular" />
            </Link>
            )}
          </nav>
        </div>

        <div className="experience-mobile-toolbar">
          {nextWorld && (
          <Link
            to="/explore/$worldId"
            params={{ worldId: nextWorld.id }}
            search={nextIssue
              ? { issue: nextIssue.id }
              : pathPosition && nextKind === 'path'
                ? { path: pathPosition.id }
                : {}}
            className="experience-mobile-next-link"
            viewTransition
            style={{ '--next-world-accent': nextWorld.accent } as CSSProperties}
            title={`${nextLabel}: ${nextTitle}`}
            aria-label={`${t('experience.next')}: ${nextTitle}`}
            onClick={trackNextNavigation}
          >
            <img
              className="experience-mobile-next-thumb"
              src={worldThumbnail(nextWorld)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
            <span className="experience-mobile-next-copy">
              <small>{mobileNextEyebrow}</small>
              <strong>{nextTitle}</strong>
            </span>
            <span className="experience-mobile-next-arrow" aria-hidden="true">→</span>
          </Link>
          )}

          <button
            type="button"
            className="experience-header-icon experience-share-button experience-mobile-share"
            onClick={openShare}
            title={t('experience.share')}
            aria-label={t('experience.share')}
          >
            <ShareNetwork aria-hidden="true" weight="regular" />
          </button>
          {showDefaultMusic && <SiteBgmToggle className="experience-header-icon experience-mobile-sound" />}
          <button
            ref={mobileMoreButtonRef}
            type="button"
            className="experience-header-icon experience-mobile-more-button"
            onClick={toggleMore}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={`experience-more-${world.id}`}
            title={t('experience.more')}
            aria-label={t('experience.more')}
          >
            <DotsThree aria-hidden="true" weight="bold" />
          </button>
        </div>
      </header>

      {moreOpen && (
        <div className="experience-more-layer" data-experience-overlay="true">
          <div
            className="experience-more-backdrop"
            onClick={closeMore}
            aria-hidden="true"
          />
          <div
            ref={moreSheetRef}
            id={`experience-more-${world.id}`}
            className="experience-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`experience-more-title-${world.id}`}
          >
            <div className="experience-more-heading">
              <h2 id={`experience-more-title-${world.id}`}>{t('experience.more')}</h2>
              <button type="button" onClick={closeMore} aria-label={t('experience.more.close')}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="experience-more-actions">
              <button
                type="button"
                className="experience-more-action experience-more-phone-only"
                onClick={openIntro}
              >
                <Info aria-hidden="true" weight="regular" />
                <span>{t('experience.sources')}</span>
              </button>
              <button
                type="button"
                className="experience-more-action experience-more-phone-only"
                onClick={openAsk}
              >
                <ChatCircleDots aria-hidden="true" weight="regular" />
                <span>{t('experience.ask.title')}</span>
              </button>
              {isPublic && (
                <button
                  type="button"
                  className="experience-more-action"
                  onClick={() => {
                    if (atlas.isSaved(world.id)) atlas.removeWorld(world.id)
                    else atlas.saveWorld(world.id)
                    closeMore()
                  }}
                >
                  <BookmarkSimple aria-hidden="true" weight={atlas.isSaved(world.id) ? 'fill' : 'regular'} />
                  <span>{atlas.isSaved(world.id) ? t('experience.saved') : t('experience.save')}</span>
                </button>
              )}
              <div className="experience-more-action experience-more-locale">
                <LocaleToggle />
                <span>{t('header.language')}</span>
              </div>
              <button type="button" className="experience-more-action" onClick={toggleImmersive}>
                <CornersOut aria-hidden="true" weight="regular" />
                <span>{t('experience.overlays.hide')}</span>
              </button>
              {randomWorldId && (
                <Link
                  to="/explore/$worldId"
                  params={{ worldId: randomWorldId }}
                  search={{}}
                  className="experience-more-action experience-more-random"
                  viewTransition
                  onClick={() => {
                    setMoreOpen(false)
                    trackRandomNavigation()
                  }}
                >
                  <DiceFive aria-hidden="true" weight="regular" />
                  <span>{t('experience.random')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="experience-layout is-started" inert={moreOpen ? true : undefined}>
        <div className="experience-stage" tabIndex={-1}>
          <ShareStateContext.Provider value={shareStore}>
            {children({ interacted, complete, registerInteraction, completeOnboarding, finish })}
          </ShareStateContext.Provider>
        </div>

        <aside
          id={`experience-intro-${world.id}`}
          className={introOpen ? 'experience-intro is-open' : 'experience-intro'}
          role="region"
          aria-labelledby={`experience-intro-title-${world.id}`}
          aria-hidden={!introOpen}
          inert={introOpen ? undefined : true}
        >
          <button ref={introCloseRef} type="button" className="experience-intro-close" onClick={closeIntro} aria-label={t('experience.closeReveal')}>
            <X aria-hidden="true" />
          </button>
          <div className="experience-intro-index" aria-hidden="true">
            <span>{displayIndex}</span>
            <i />
          </div>
          <div ref={introCopyRef} className="experience-intro-copy">
            <p className="eyebrow">
              {displayIndex} / {String(displayTotal).padStart(2, '0')}
              {' · '}
              {worldText(world, 'topicLabel')}
              {' · '}
              {worldText(world, 'evidence')}
            </p>
            <h1 id={`experience-intro-title-${world.id}`}>{issueCopy?.question ?? worldText(world, 'posterTitle')}</h1>
            <p className="experience-hook">{issueCopy?.hook ?? worldText(world, 'hook')}</p>
            {!issueCopy && (
              <p className="experience-payoff">{worldText(world, 'payoff')}</p>
            )}
            {!issueCopy && world.fieldNotes && world.fieldNotes.length > 0 && (
              <div className="experience-field-notes">
                {world.fieldNotes.map((note) => (
                  <section key={note.label} className="experience-field-note">
                    <span>{locale === 'zh' ? note.label : note.labelEn}</span>
                    <p>{locale === 'zh' ? note.body : note.bodyEn}</p>
                  </section>
                ))}
              </div>
            )}
            {!issueCopy && searchCopy && (
              <section className="experience-search-answer" aria-label={locale === 'zh' ? '简要答案' : 'Quick answer'}>
                <strong>{locale === 'zh' ? '简要答案' : 'Quick answer'}</strong>
                <p>{searchCopy.answer}</p>
              </section>
            )}
            {worldIssues.length > 1 && (
              <div className="experience-chapters">
                <span>{locale === 'zh' ? `这个世界的 ${worldIssues.length} 条探索路径` : `${worldIssues.length} paths through this world`}</span>
                {worldIssues.map((item, index) => {
                  const copy = localizeIssue(item, locale)
                  const current = item.id === issue?.id
                  return (
                    <Link
                      key={item.id}
                      to="/explore/$worldId"
                      params={{worldId: world.id}}
                      search={{issue: item.id}}
                      className={current ? 'is-current' : ''}
                      aria-current={current ? 'page' : undefined}
                      onClick={closeIntro}
                    >
                      <small>{String(index + 1).padStart(2, '0')}</small>
                      <strong>{copy.question}</strong>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="experience-source-list">
              <span>{t('experience.sources')}</span>
              {userFacingSources(world).map((source) => {
                const note = locale === 'zh' ? source.note : source.noteEn
                return (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    <span>
                      <b>{sourceText(source)}</b>
                      {note ? <small>{note}</small> : null}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </a>
                )
              })}
            </div>
            {world.provenance && (
              <div className="experience-provenance">
                <span>{t('experience.provenance.label')}</span>
                {world.provenance.origin === 'ai-prototype' && initialModelLabel && (
                  <p>{t('experience.provenance.aiPrototype', { model: initialModelLabel })}</p>
                )}
                {world.provenance.origin === 'multi-model' && (
                  <p>{initialModelLabel
                    ? t('experience.provenance.multiModel', { model: initialModelLabel })
                    : t('experience.provenance.multiModelUnknown')}</p>
                )}
                {world.provenance.origin === 'open-source-adaptation' && (
                  <>
                    <a href={world.provenance.sourceUrl} target="_blank" rel="noreferrer">
                      {t('experience.provenance.openSource', { project: world.provenance.sourceProject })}
                      <ArrowRight aria-hidden="true" />
                    </a>
                    {adaptationModelLabel && (
                      <p>{t('experience.provenance.openSourceModel', { model: adaptationModelLabel })}</p>
                    )}
                  </>
                )}
                {world.provenance.origin === 'human-led' && (
                  <p>{t('experience.provenance.humanLed')}</p>
                )}
                {modelCollectionId && modelCollectionLabel && (
                  <Link to="/made-with/$modelId" params={{ modelId: modelCollectionId }}>
                    {t(world.provenance.origin === 'open-source-adaptation'
                      ? 'experience.provenance.exploreAdaptationModel'
                      : 'experience.provenance.exploreModel', { model: modelCollectionLabel })}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </aside>
        <AskWorldPanel world={world} open={askOpen} onClose={closeAsk} seedQuestion={askSeed} />
      </section>

      <MomentCard
        open={shareOpen}
        onClose={closeShare}
        capture={shareStore.capture}
        url={shareOpen ? buildShareUrl() : ''}
        question={issueCopy?.question ?? worldText(world, 'question')}
        summary={shareStore.current.summary}
        posterUrl={world.posterDesktop ?? world.poster}
        accent={world.accent}
        onShared={() => trackEvent({ event: 'share', worldId: world.id, issueId: issue?.id })}
      />
      {followChipOpen && !shareOpen && (
        <FollowStayPrompt
          origin="second_world"
          layout="chip"
          onDismiss={() => setFollowChipOpen(false)}
        />
      )}

    </main>
  )
}
