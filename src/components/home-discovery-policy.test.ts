import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(import.meta.dirname, 'HomeDiscovery.tsx'), 'utf8')
const journey = readFileSync(resolve(import.meta.dirname, 'PathJourney.tsx'), 'utf8')
const styles = readFileSync(resolve(import.meta.dirname, 'HomeDiscovery.css'), 'utf8')

/** Every `name: value` declaration inside the style rules that list `selector`. */
function declarationsFor(selector: string) {
  const found: Array<[string, string]> = []
  const uncommented = styles.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, selectors, body] of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const listed = selectors.split(',').map((item) => item.trim().replace(/\s+/g, ' '))
    if (!listed.includes(selector)) continue
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon > 0) found.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()])
    }
  }
  return found
}

/** The base (first-declared, outside any media query override) value of a property. */
const valueOf = (selector: string, property: string) =>
  declarationsFor(selector).find(([name]) => name === property)?.[1]

describe('home world directory policy', () => {
  it('does not fetch desktop experience posters on the first homepage paint', () => {
    expect(source).not.toContain('posterDesktop ?? world.poster')
    expect(source).not.toContain('srcSet={`${worldThumbnail(world)} 1x')
  })

  it('goes from the hero to the series and then the full catalogue, with no picked-works rail', () => {
    expect(source).not.toContain('<HomeFeatured')
    expect(source).not.toContain('home-fresh-section')
    expect(source.indexOf('<HomeSeries')).toBeLessThan(source.indexOf('id="home-worlds"'))
    expect(source).not.toContain('<HomeTopics')
    expect(source).not.toContain('<PathJourney')
    expect(source).not.toContain('PathShowcase')
    expect(source).not.toContain('worldOfTheWeek')
    expect(source).not.toContain('home-recommendation-tabs')
  })

  it('lets accordion storyboards follow pointer intent while standalone routes keep stable cards', () => {
    expect(journey).toContain('members.map((world, position)')
    expect(journey).toContain('onMouseMove={accordion ? moveStoryboardWithPointer : undefined}')
    expect(journey).toContain('viewport.scrollLeft = maxScroll * pointerProgress')
    expect(journey).not.toContain('members.slice(0, 4)')
    expect(source).not.toContain('home-catalogue-index')
  })

  it('lays the open route out as one row of information beside its world rail', () => {
    for (const part of ['expanded', 'info', 'panel', 'foot']) {
      expect(journey).toContain(`className="path-accordion-${part}"`)
    }
    expect(journey).not.toContain('className="path-accordion-intro"')
    // The row is a two-column grid on wide screens and collapses to one column.
    expect(valueOf('.path-accordion-expanded', 'display')).toBe('grid')
    expect(valueOf('.path-accordion-expanded', 'grid-template-columns')).toContain('minmax(0, 1fr)')
  })

  it('keeps the complete public catalogue behind every search, filter, and sort', () => {
    expect(source).toContain('const matchingWorlds = useMemo(')
    expect(source).toContain('const activeCategory = category')
    expect(source).toContain('useWorldCatalog({')
    expect(source).toContain('useWorldSearchIndex(locale, useIndexedResults)')
    expect(source).toContain('worldMatchesSearch(world, normalizedQuery)')
    expect(source).toContain('type WorldCatalogSort')
    expect(source).toContain('compareDefaultCatalogOrder')
    expect(source).not.toContain('worldSummaries as worlds')
    expect(source).not.toContain('starterWorldIds')
    expect(source).not.toContain('starterCollectionWorlds')
    expect(source).not.toContain('showAllWorlds')
    expect(source).not.toContain('setShowAllWorlds')
  })

  it('combines search, category and viewed filters across the complete index', () => {
    expect(source).toContain('const activeCategory = category')
    expect(source).not.toContain('disabled={Boolean(normalizedQuery)}')
    expect(source).toContain("viewFilter === 'all' || visitedSet.has(world.id) === (viewFilter === 'viewed')")
  })

  it('reveals the complete result set progressively without hiding it behind another route', () => {
    expect(source).toContain("rootMargin: '600px 0px'")
    expect(source).toContain('onClick={directoryError ? retryDirectory : revealMoreWorlds}')
    expect(source).toContain('home-collection-more-btn')
    expect(source).not.toContain('home-galaxy')
    expect(source).toContain("t('worlds.results', { value: matchingTotal })")
    expect(source).not.toContain('to="/worlds" className="home-collection-more"')
    for (const retired of ['home-weekly-grid', 'home-fresh-log', 'home-fresh-world-action']) {
      expect(source, retired).not.toContain(retired)
    }
  })

  it('dates recently added or updated worlds on their catalogue card', () => {
    expect(source).toContain('<WorldCard')
    expect(source).toContain('className="home-recent-date" dateTime={releasedOn}')
    expect(source).toContain('recent={recentIds.has(world.id)}')
    expect(valueOf('.home-page > .home-section .home-section-head p', 'font-family')).toBe('var(--home-font-ui)')
  })

  it('keeps live search anchored and does not restart every visible card animation', () => {
    expect(source).toContain('resetScroll: false')
    expect(source).toContain("useScrollReveal<HTMLDivElement>('.work-card'")
    expect(source).toContain('contentKey: worldWindowKey')
    expect(source.match(/new IntersectionObserver\(/g)).toHaveLength(1)
    expect(source).not.toContain('new MutationObserver(')
  })

  it('protects CJK IME composition from URL search sync', () => {
    expect(source).toContain('isComposingRef')
    expect(source).toContain('onCompositionStart')
    expect(source).toContain('onCompositionEnd')
    expect(source).toContain('if (isComposingRef.current) return')
    expect(source).toContain('syncSearchQuery(next)')
  })

  it('keeps category filtering usable when browser storage is blocked', () => {
    expect(source).toContain("import { safeLocalStorage, safeSessionStorage } from '~/lib/storage'")
    expect(source).toContain('safeLocalStorage.get(CATEGORY_FILTER_KEY)')
    expect(source).toContain('safeLocalStorage.set(CATEGORY_FILTER_KEY, next)')
    expect(source).not.toContain('window.localStorage')
  })

  it('restricts homepage random discovery to public approved works', () => {
    expect(source).toContain('await loadExplorationIds()')
    expect(source).toContain('recommendedWorldIds.filter((id) => ids.includes(id))')
    expect(source).toContain('selectUnvisitedId(candidates, visited)')
    expect(source).toContain("collection: 'featured'")
  })

  it('opens route pages at the first unexplored world in path order', () => {
    expect(journey).toContain('firstUnexploredWorldIndex')
    expect(journey).toContain('scrollStoryboardTo')
    expect(journey).toContain('setActiveWorldIndex(nextWorldIndex)')
    expect(journey).not.toContain("storyboardRef.current?.scrollTo({ left: 0, behavior: 'smooth' })")
  })

  it('keeps the home page on semantic type tokens instead of ad hoc title sizing', () => {
    const scale: Record<string, string> = {
      '--home-type-display': 'var(--fs-display)',
      '--home-type-section-title': 'var(--fs-section)',
      '--home-type-feature-title': 'var(--fs-section)',
      '--home-type-card-title': 'var(--fs-card)',
      '--home-type-lead': 'var(--fs-lead)',
      '--home-type-body': 'var(--fs-body)',
      '--home-type-support': 'var(--fs-support)',
      '--home-type-label': 'var(--fs-label)',
      '--home-type-micro': 'var(--fs-label)',
    }
    for (const [token, target] of Object.entries(scale)) {
      expect(valueOf('.home-page', token), token).toBe(target)
    }
    // Headlines draw from the scale rather than literal sizes.
    expect(valueOf('.home-page .home-hero-copy h1', 'font-size')).toBe('var(--home-type-display)')
    expect(valueOf('.home-page > .home-section .home-section-head h2', 'font-size')).toBe('var(--home-type-section-title)')
    expect(valueOf('.path-accordion-name strong', 'font-size')).toBe('var(--home-type-feature-title)')
    expect(valueOf('.path-storyboard-copy strong', 'font-size')).toBe('var(--home-type-card-title)')
  })

  it('switches the home page to a CJK serif without Latin tracking on Chinese pages', () => {
    const zh = "html[lang^='zh'] .home-page"
    expect(valueOf('.home-page', '--home-serif-cjk')).toBe("'Songti SC', 'STSong', 'Noto Serif SC', serif")
    expect(valueOf(zh, '--home-face-display')).toBe('var(--home-serif-cjk)')
    expect(valueOf(zh, '--home-face-title')).toBe('var(--home-serif-cjk)')
    expect(valueOf(zh, '--home-display-tracking')).toBe('0')
    expect(valueOf(zh, '--home-title-tracking')).toBe('0')
  })

  it('keeps home page type at readable sizes and on the four approved weights', () => {
    const weights = [...styles.matchAll(/font-weight:\s*(\d+)/g)].map(([, weight]) => Number(weight))
    expect(weights.length).toBeGreaterThan(0)
    expect(weights.filter((weight) => ![400, 500, 600, 700].includes(weight))).toEqual([])

    const literalSizes = [...styles.matchAll(/font-size:\s*([\d.]+)px/g)].map(([, size]) => Number(size))
    expect(literalSizes.filter((size) => size < 11)).toEqual([])
    expect(styles).not.toMatch(/font-size:\s*clamp/)
  })
})
