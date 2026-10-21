import { act, createElement, useState, type AnchorHTMLAttributes } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { paths, type Path } from '~/data/content-graph'
import { worldSummaries, type WorldSummary } from '~/data/world-summaries'
import { PathJourney } from './PathJourney'

const atlas = vi.hoisted(() => ({ ready: true, visited: [] as string[] }))
vi.mock('~/state/atlas', () => ({ useAtlas: () => atlas }))
vi.mock('~/lib/world-prefetch', () => ({ warmWorldOnIntent: vi.fn(), worldIntentHandlers: () => ({}) }))
vi.mock('~/i18n', () => ({
  useI18n: () => ({
    locale: 'zh',
    pathText: (path: Path, field: 'title' | 'description') => path[field],
    worldText: (world: WorldSummary, field: 'posterTitle') => world[field],
    t: (key: string, values?: Record<string, number>) => `${key} ${JSON.stringify(values ?? {})}`,
  }),
}))

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
  params: { worldId: string }
  search: { path: string }
}
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to: _to, params, search, ...props }: LinkProps) => createElement(
    'a', { ...props, href: `/${params.worldId}?path=${search.path}` },
  ),
}))

const path = paths[0]
const worldById = new Map(worldSummaries.map((world) => [world.id, world]))

function Accordion() {
  const [expanded, setExpanded] = useState(true)
  return createElement(PathJourney, { path, worldById, accordion: {
    order: 1,
    expanded,
    onToggle: () => setExpanded((value) => !value),
  } })
}

describe('curated journey accordion', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    atlas.visited = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('retains keyboard focus while collapsing and reopening the same route', () => {
    act(() => root.render(createElement(Accordion)))
    const toggle = container.querySelector('button')!
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!
    toggle.focus()

    act(() => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(panel.hidden).toBe(true)
    expect(container.querySelector('.path-storyboard')).toBeNull()
    expect(document.activeElement).toBe(toggle)

    act(() => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(panel.hidden).toBe(false)
    expect(document.activeElement).toBe(toggle)
    expect(container.querySelectorAll('ul.path-storyboard > li > a')).toHaveLength(path.worldIds.length)
  })

  it('marks an out-of-order visit at its actual stop and continues at the first unvisited world', () => {
    atlas.visited = [path.worldIds[2]]
    act(() => root.render(createElement(Accordion)))
    const marks = [...container.querySelectorAll('.path-accordion-progress i')]
    expect(marks.map((mark) => mark.classList.contains('is-done')))
      .toEqual(path.worldIds.map((_, index) => index === 2))
    expect(marks[0].classList.contains('is-next')).toBe(true)
    expect(container.querySelector('.path-accordion-cta')?.getAttribute('href'))
      .toBe(`/${path.worldIds[0]}?path=${path.id}`)
  })

  it('keeps standalone route details expanded with navigable poster links', () => {
    act(() => root.render(createElement(PathJourney, { path, worldById })))
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelectorAll('ul.path-storyboard > li > a')).toHaveLength(path.worldIds.length)
    expect(container.querySelector('.path-journey.is-open')).not.toBeNull()
  })

  it('aligns the next stop after its expanded width has been rendered', () => {
    act(() => root.render(createElement(Accordion)))
    const stops = [...container.querySelectorAll<HTMLElement>('.path-storyboard > li')]
    stops.forEach((stop, index) => Object.defineProperty(stop, 'offsetLeft', {
      get: () => stops.slice(0, index).reduce((sum, previous) =>
        sum + (previous.querySelector('.is-active') ? 504 : 135) + 6, 0),
    }))

    atlas.visited = [path.worldIds[0]]
    act(() => root.render(createElement(Accordion)))
    expect(stops[1].querySelector('.is-active')).not.toBeNull()
    expect(container.querySelector('.path-storyboard-viewport')?.scrollLeft).toBe(141)
  })
})
