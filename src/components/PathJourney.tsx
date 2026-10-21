import { worldRoute } from '~/lib/world-urls'
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Minus, Play, Plus } from '@phosphor-icons/react'

import type { Path } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import {
  firstUnexploredWorldIndex,
  pathDurationMinutes,
  pathMembers,
} from '~/lib/path-progress'
import { worldThumbnail } from '~/lib/posters'
import { warmWorldOnIntent, worldIntentHandlers } from '~/lib/world-prefetch'
import { useAtlas } from '~/state/atlas'

import './HomeDiscovery.css'

function scrollStoryboardTo(viewport: HTMLDivElement | null, index: number) {
  const item = viewport?.querySelectorAll<HTMLElement>('.path-storyboard > li')[index]
  if (!viewport || !item) return
  viewport.scrollLeft = item.offsetLeft
}

export function PathJourney({
  path,
  worldById,
  accordion,
}: {
  path: Path
  worldById: ReadonlyMap<string, WorldSummary>
  accordion?: {
    order: number
    expanded: boolean
    onToggle: () => void
  }
}) {
  const { locale, t, pathText, worldText } = useI18n()
  const atlas = useAtlas()
  const storyboardRef = useRef<HTMLDivElement>(null)
  const members = pathMembers(path, worldById)
  const nextWorldIndex = firstUnexploredWorldIndex(members, atlas.visited)
  const [activeWorldIndex, setActiveWorldIndex] = useState(nextWorldIndex)
  const [alignment, setAlignment] = useState({ index: nextWorldIndex })
  const visitedKey = atlas.visited.join('\0')
  const isOpen = accordion?.expanded ?? true

  useEffect(() => {
    if (!isOpen || !atlas.ready) return
    const worlds = pathMembers(path, worldById)
    if (worlds.length === 0) return
    const visited = visitedKey ? visitedKey.split('\0') : []
    const target = firstUnexploredWorldIndex(worlds, visited)
    setActiveWorldIndex(target)
    setAlignment({ index: target })
  }, [atlas.ready, isOpen, path, visitedKey, worldById])

  useLayoutEffect(() => {
    if (isOpen && accordion) scrollStoryboardTo(storyboardRef.current, alignment.index)
  }, [alignment, isOpen, accordion])

  useEffect(() => {
    const viewport = storyboardRef.current
    if (!accordion || !isOpen || !viewport || typeof ResizeObserver === 'undefined') return
    let width = viewport.clientWidth
    const observer = new ResizeObserver(() => {
      if (viewport.clientWidth === width) return
      width = viewport.clientWidth
      scrollStoryboardTo(viewport, activeWorldIndex)
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [activeWorldIndex, isOpen, accordion])

  const exploredCount = members.filter((world) => atlas.visited.includes(world.id)).length
  const nextWorld = members[nextWorldIndex] ?? members[0]
  if (!nextWorld) return null
  const nextIndex = nextWorldIndex + 1
  const minutes = pathDurationMinutes(members)

  const moveStoryboardWithPointer = (event: MouseEvent<HTMLDivElement>) => {
    const viewport = storyboardRef.current
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return
    const bounds = viewport.getBoundingClientRect()
    const pointerProgress = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    viewport.scrollLeft = maxScroll * pointerProgress
  }

  const resetStoryboard = () => {
    setActiveWorldIndex(nextWorldIndex)
    setAlignment({ index: nextWorldIndex })
  }

  return (
    <article className={`path-accordion${isOpen ? ' is-open' : ''}${accordion ? '' : ' path-journey'}`}>
      {accordion && (
        <button
          type="button"
          className={isOpen ? 'path-accordion-collapse' : 'path-accordion-trigger'}
          aria-label={pathText(path, 'title')}
          aria-expanded={isOpen}
          aria-controls={`path-panel-${path.id}`}
          onClick={accordion.onToggle}
        >
          {isOpen ? <Minus aria-hidden="true" /> : (
            <>
              <span className="path-accordion-order">{String(accordion.order).padStart(2, '0')}</span>
              <span className="path-accordion-name">
                <strong>{pathText(path, 'title')}</strong>
                <small>{t('home.paths.exploredCount', { current: exploredCount, total: members.length })}</small>
              </span>
              <span className="path-accordion-symbol" aria-hidden="true"><Plus /></span>
            </>
          )}
        </button>
      )}
      <div id={`path-panel-${path.id}`} hidden={!isOpen}>
        {isOpen && (
          <div className="path-accordion-expanded">
            <aside className="path-accordion-info">
              <div className="path-accordion-identity">
                {accordion && <span className="path-accordion-order">{String(accordion.order).padStart(2, '0')}</span>}
                <span className="path-accordion-name">
                  <strong>{pathText(path, 'title')}</strong>
                  {locale === 'zh' && <em>{path.titleEn}</em>}
                  <small>
                    {t('home.paths.worldCount', { value: members.length })}
                    {' · '}
                    {t('home.paths.minutes', { value: minutes })}
                    {' · '}
                    {t('home.paths.exploredCount', { current: exploredCount, total: members.length })}
                  </small>
                </span>
              </div>
              <p>{pathText(path, 'description')}</p>
              <div className="path-accordion-foot">
                <div className="path-accordion-progress" aria-hidden="true">
                  {members.map((world, position) => (
                    <i
                      key={world.id}
                      className={atlas.visited.includes(world.id) ? 'is-done' : position === nextIndex - 1 ? 'is-next' : undefined}
                    />
                  ))}
                </div>
                <Link
                  to={worldRoute}
                  params={{ worldId: nextWorld.id }}
                  search={{ path: path.id }}
                  className="btn-primary path-accordion-cta"
                  {...worldIntentHandlers(nextWorld.id)}
                >
                  <Play aria-hidden="true" weight="fill" />
                  {exploredCount === 0
                    ? t('home.paths.startExplore')
                    : exploredCount >= members.length
                      ? t('home.paths.again')
                      : t('home.paths.continue', { value: nextIndex })}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </aside>
            <div className="path-accordion-panel">
              <div
                ref={storyboardRef}
                className="path-storyboard-viewport"
                onMouseMove={accordion ? moveStoryboardWithPointer : undefined}
                onMouseLeave={resetStoryboard}
              >
                <ul className="path-storyboard" aria-label={pathText(path, 'title')}>
                  {members.map((world, position) => {
                    const explored = atlas.visited.includes(world.id)
                    return (
                      <li key={world.id}>
                        <Link
                          to={worldRoute}
                          params={{ worldId: world.id }}
                          search={{ path: path.id }}
                          className={`${explored ? 'path-storyboard-item is-explored' : 'path-storyboard-item'}${activeWorldIndex === position ? ' is-active' : ''}`}
                          onMouseEnter={() => {
                            setActiveWorldIndex(position)
                            warmWorldOnIntent(world.id)
                          }}
                          onPointerEnter={() => warmWorldOnIntent(world.id)}
                          onTouchStart={() => warmWorldOnIntent(world.id)}
                      onFocus={(event) => {
                        setActiveWorldIndex(position)
                        setAlignment({ index: position })
                        const link = event.currentTarget
                        window.requestAnimationFrame(() => link.scrollIntoView({
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                          block: 'nearest',
                          inline: 'center',
                        }))
                            warmWorldOnIntent(world.id)
                          }}
                          onPointerDown={() => warmWorldOnIntent(world.id)}
                        >
                          <span className="path-storyboard-media">
                            <img src={worldThumbnail(world)} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                            <span className="path-storyboard-order" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                            {explored && <span className="path-storyboard-done" aria-hidden="true"><Check weight="bold" /></span>}
                          </span>
                          <span className="path-storyboard-copy">
                            <strong>{worldText(world, 'posterTitle')}</strong>
                            {position === nextIndex - 1 && <small>{t('home.paths.continue', { value: nextIndex })}</small>}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
