import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { CaretDown } from '@phosphor-icons/react'

import { useExperienceI18n } from '~/i18n/experience'
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities'

type FreebarProps = Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'children'> & {
  ariaLabel: string
  mainClassName?: string
  /**
   * Visible focusable controls allowed in the primary row. The shared
   * disclosure button is excluded.
   */
  primaryControlBudget?: 1 | 2 | 3 | 4 | 5
  /**
   * Phone-only initial state. Desktop always opens secondary content by
   * default; callers must group it into a single second row instead of hiding
   * an unresolved desktop layout behind a closed tray.
   *
   * `auto` opens only when both primary and secondary fit one compact row.
   */
  secondaryDefault?: 'auto' | 'open' | 'closed'
  /**
   * `comfortable` raises phone hit targets without forcing the same visual
   * density onto worlds that have not completed the responsive migration.
   */
  mobileDensity?: 'compact' | 'comfortable'
  secondary?: ReactNode
  secondaryClassName?: string
  children: ReactNode
}

type FreebarTab<T extends string> = {
  id: T
  label: string
}

type FreebarTabsProps<T extends string> = {
  activeId: T
  ariaLabel: string
  className?: string
  onChange: (id: T) => void
  tabs: Array<FreebarTab<T>>
}

/**
 * Shared category rail for genuinely complex secondary trays.
 *
 * Simple trays render their controls directly and never mount this component.
 * The rail scrolls sideways only when its labels cannot fit; parameter content
 * can scroll vertically only in an over-height phone tray.
 */
export function FreebarTabs<T extends string>({
  activeId,
  ariaLabel,
  className,
  onChange,
  tabs,
}: FreebarTabsProps<T>) {
  const moveFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return

    event.preventDefault()
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const next = tabs[nextIndex]
    onChange(next.id)
    window.requestAnimationFrame(() => buttons?.[nextIndex]?.focus())
  }

  const classes = ['experience-freebar-tabs', className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={classes} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'is-active' : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => moveFocus(event, index)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Shared bottom control shell for free exploration.
 *
 * Callers keep their existing controls as children and move less-frequent
 * controls into `secondary`. The disclosure toggle lives at the end of the
 * primary row. The expanded tray grows upward; only an over-height phone tray
 * scrolls inside the capped bar. The primary row never scrolls away.
 */
export function Freebar({
  ariaLabel,
  className,
  mainClassName,
  primaryControlBudget,
  secondaryDefault = 'auto',
  mobileDensity = 'comfortable',
  secondary,
  secondaryClassName,
  children,
  ...rootProps
}: FreebarProps) {
  const tx = useExperienceI18n()
  const secondaryId = useId()
  useRegisterExperienceCapabilities(`freebar:${secondaryId}`, { hasFreeControls: true })
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLDivElement>(null)
  const lastBudgetWarningRef = useRef('')
  const userToggledRef = useRef(false)
  // Bias the first render toward desktop: desktop is the always-open default.
  // A layout effect applies the phone rule before paint on compact viewports.
  const initiallyOpen = Boolean(secondary)
  const [open, setOpen] = useState(initiallyOpen)
  const [trayMounted, setTrayMounted] = useState(initiallyOpen)
  const [trayPx, setTrayPx] = useState<number | null>(null)
  const primaryBudget = primaryControlBudget

  /**
   * 托盘只由主行末尾的 disclosure 控制。过渡完成后，展开态交还
   * CSS 弹性布局，收起态卸载内容；页面滚动不会改变收展状态。
   */
  const trayRef = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  const clearSettle = () => {
    window.clearTimeout(settleTimer.current)
    settleTimer.current = undefined
  }

  const measureTray = () => trayRef.current?.scrollHeight ?? 200
  const visibleTray = () => trayRef.current?.getBoundingClientRect().height ?? 0

  /** 展开：从当前可视高度补间到内容全高，随后交还 CSS 弹性布局 */
  const expandTray = () => {
    if (open && trayPx === null) return
    clearSettle()
    setTrayMounted(true)
    setTrayPx(trayMounted ? visibleTray() : 0)
    // 40ms 而不是 rAF：重负载/后台标签页里 rAF 可能被无限期推迟，
    // 用 timeout 保证状态最终正确；多数情况下浏览器来得及先绘出 0 帧，补间照常。
    settleTimer.current = window.setTimeout(() => {
      setOpen(true)
      setTrayPx(measureTray())
      settleTimer.current = window.setTimeout(() => setTrayPx(null), 280)
    }, 40)
  }

  /** 收起：从当前可视高度补间到 0，随后卸载托盘 */
  const collapseTray = () => {
    if (!open && trayPx === null) return
    clearSettle()
    setOpen(false)
    setTrayPx(visibleTray())
    settleTimer.current = window.setTimeout(() => {
      setTrayPx(0)
      settleTimer.current = window.setTimeout(() => {
        setTrayMounted(false)
        setTrayPx(null)
      }, 280)
    }, 40)
  }

  const toggleTray = () => {
    userToggledRef.current = true
    if (open) collapseTray()
    else expandTray()
  }

  /**
   * Responsive default belongs to the shared module:
   * - desktop: always open on entry;
   * - phone: one primary row + one secondary row may open, otherwise close.
   *
   * User choice wins until the viewport crosses the shared breakpoint.
   */
  useLayoutEffect(() => {
    if (!secondary) return
    if (typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(max-width: 720px)')
    const setImmediately = (nextOpen: boolean) => {
      clearSettle()
      setOpen(nextOpen)
      setTrayMounted(nextOpen)
      setTrayPx(null)
    }

    const applyResponsiveDefault = (compact: boolean) => {
      if (userToggledRef.current) return
      if (!compact) {
        setImmediately(true)
        return
      }

      const primaryHeight = primaryRef.current?.getBoundingClientRect().height ?? 0
      const secondaryHeight = measureTray()
      const primaryHasHorizontalOverflow = Boolean(
        primaryRef.current && primaryRef.current.scrollWidth > primaryRef.current.clientWidth + 1,
      )
      const secondaryHasHorizontalOverflow = Boolean(
        trayRef.current && trayRef.current.scrollWidth > trayRef.current.clientWidth + 1,
      )
      const shouldOpen = secondaryDefault === 'open'
        || (
          secondaryDefault === 'auto'
          && primaryHeight <= 64
          && secondaryHeight <= 64
          && !primaryHasHorizontalOverflow
          && !secondaryHasHorizontalOverflow
        )
      setImmediately(shouldOpen)
    }

    applyResponsiveDefault(media.matches)
    const onBreakpointChange = (event: MediaQueryListEvent) => {
      userToggledRef.current = false
      applyResponsiveDefault(event.matches)
    }
    media.addEventListener('change', onBreakpointChange)
    return () => media.removeEventListener('change', onBreakpointChange)
  }, [secondary, secondaryDefault])

  /**
   * `primaryControlBudget` is an acceptance budget, not a self-reported count.
   * Publish the real visible count for browser audits and warn during local
   * development when a world exceeds the budget it declared.
   */
  useEffect(() => {
    const primary = primaryRef.current
    const root = rootRef.current
    if (!primary || !root) return

    const publishCount = () => {
      const isScrollableHorizontalRail = (element: HTMLElement) => {
        let ancestor = element.parentElement
        while (ancestor && ancestor !== primary) {
          const style = window.getComputedStyle(ancestor)
          if (
            ['auto', 'scroll', 'overlay'].includes(style.overflowX)
            && ancestor.scrollWidth > ancestor.clientWidth + 1
          ) {
            return true
          }
          ancestor = ancestor.parentElement
        }
        return false
      }

      root.style.setProperty(
        '--experience-freebar-primary-height',
        `${Math.ceil(primary.getBoundingClientRect().height)}px`,
      )
      const focusable = Array.from(primary.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => {
        if (element.classList.contains('experience-freebar-summary')) return false
        if (element.closest('.experience-freebar-rail') || isScrollableHorizontalRail(element)) return false
        if (element.closest('.experience-freebar-story, .experience-freebar-reset')) return false
        const style = window.getComputedStyle(element)
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && element.getClientRects().length > 0
      })
      const actual = focusable.length
      root.dataset.freebarPrimaryActual = String(actual)

      if (primaryBudget === undefined) return

      if (import.meta.env.DEV && actual > primaryBudget) {
        const warning = `${ariaLabel}:${actual}/${primaryBudget}`
        if (lastBudgetWarningRef.current !== warning) {
          lastBudgetWarningRef.current = warning
          console.warn(
            `[Freebar] ${ariaLabel} exposes ${actual} primary controls; the declared budget is ${primaryBudget}.`,
          )
        }
      } else {
        lastBudgetWarningRef.current = ''
      }
    }

    publishCount()
    const resizeObserver = new ResizeObserver(publishCount)
    resizeObserver.observe(primary)
    const mutationObserver = new MutationObserver(publishCount)
    mutationObserver.observe(primary, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['aria-hidden', 'class', 'disabled', 'hidden', 'style'],
    })
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      root.style.removeProperty('--experience-freebar-primary-height')
    }
  }, [ariaLabel, primaryBudget])

  /**
   * Publish the bar's real height so passive readouts can sit above it.
   */
  useEffect(() => {
    const element = mainRef.current
    if (!element) return
    const stage = element.closest<HTMLElement>('.experience-stage') ?? document.documentElement
    let last = -1
    const publish = () => {
      const height = Math.round(element.getBoundingClientRect().height)
      if (Math.abs(height - last) < 2) return
      last = height
      stage.style.setProperty('--experience-freebar-height', `${height}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      stage.style.removeProperty('--experience-freebar-height')
    }
  }, [])

  /**
   * ResizeObserver can coalesce an animated max-height change in throttled
   * headless tabs. Publish at state boundaries as well, including once after
   * the 280ms tray transition, so HUD clearance never keeps the collapsed
   * height while the tray is already open.
   */
  useEffect(() => {
    const element = mainRef.current
    if (!element) return
    const stage = element.closest<HTMLElement>('.experience-stage') ?? document.documentElement
    const publish = () => {
      stage.style.setProperty(
        '--experience-freebar-height',
        `${Math.round(element.getBoundingClientRect().height)}px`,
      )
    }
    publish()
    const frame = window.requestAnimationFrame(publish)
    const settled = window.setTimeout(publish, 340)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settled)
    }
  }, [open, trayMounted, trayPx])

  const rootClasses = [
    'experience-freebar',
    secondary ? 'has-freebar-disclosure' : '',
    secondary && open ? 'is-freebar-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const mainClasses = ['experience-freebar-main', mainClassName ?? ''].filter(Boolean).join(' ')
  const secondaryClasses = [
    'experience-freebar-secondary',
    secondaryClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...rootProps}
      ref={rootRef}
      className={rootClasses}
      data-experience-overlay="true"
      data-freebar-primary-count={primaryBudget}
      data-freebar-primary-limit={primaryBudget}
      data-freebar-mobile-secondary-default={secondary ? secondaryDefault : undefined}
      data-freebar-mobile-density={mobileDensity}
      data-freebar-open={secondary && (open || (trayMounted && trayPx !== 0)) ? 'true' : undefined}
    >
      <div ref={mainRef} className={mainClasses} role="group" aria-label={ariaLabel}>
        <div ref={primaryRef} className="experience-freebar-primary">
          {children}
          {secondary && (
            <button
              type="button"
              className="experience-freebar-summary"
              aria-expanded={open}
              aria-controls={secondaryId}
              aria-label={tx(open ? '折叠' : '展开')}
              onClick={toggleTray}
            >
              {/* 只渲染当前文案，避免「展开折叠」叠在同一按钮里（含读屏）。 */}
              <span className={open ? 'experience-freebar-summary-less' : 'experience-freebar-summary-more'}>
                {tx(open ? '折叠' : '展开')}
              </span>
              <CaretDown weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
        {secondary && trayMounted && (
          <div
            id={secondaryId}
            ref={trayRef}
            className={secondaryClasses}
            style={trayPx !== null ? { maxHeight: trayPx, overflow: 'hidden' } : undefined}
          >
            {secondary}
          </div>
        )}
      </div>
    </div>
  )
}
