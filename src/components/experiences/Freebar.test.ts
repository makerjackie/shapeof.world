import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ExperienceI18nProvider } from '~/i18n/experience'
import { I18nProvider } from '~/i18n/index'

import { Freebar, FreebarTabs } from './Freebar'

function worldSource(pascal: string) {
  const worlds = resolve(import.meta.dirname, 'worlds')
  for (const entry of readdirSync(worlds, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(worlds, entry.name, `${pascal}.tsx`)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error(`Missing world source ${pascal}.tsx`)
}

function worldCss(pascal: string) {
  const worlds = resolve(import.meta.dirname, 'worlds')
  for (const entry of readdirSync(worlds, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(worlds, entry.name, 'styles', `${pascal}.css`)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error(`Missing world css ${pascal}.css`)
}

describe('Freebar', () => {
  it('renders desktop secondary content open even when the phone default is closed', () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        {
          initialLocale: 'en',
          children: createElement(
            ExperienceI18nProvider,
            {
              dictionary: {},
              children: createElement(
                Freebar,
                {
                  ariaLabel: 'World controls',
                  className: 'world-freebar',
                  mainClassName: 'world-freebar-main',
                  primaryControlBudget: 4,
                  secondaryDefault: 'closed',
                  mobileDensity: 'comfortable',
                  secondary: createElement('button', { type: 'button' }, 'Secondary'),
                  children: createElement('button', { type: 'button' }, 'Primary'),
                },
              ),
            },
          ),
        },
      ),
    )

    expect(html).toContain('data-experience-overlay="true"')
    expect(html).toContain('data-freebar-primary-count="4"')
    expect(html).toContain('data-freebar-primary-limit="4"')
    expect(html).toContain('data-freebar-mobile-secondary-default="closed"')
    expect(html).toContain('data-freebar-mobile-density="comfortable"')
    expect(html).toContain('class="experience-freebar has-freebar-disclosure is-freebar-open world-freebar"')
    expect(html).toContain('role="group" aria-label="World controls"')
    // Desktop is the first-render baseline: secondary content is visible and
    // the phone-only `closed` preference cannot hide it.
    expect(html).toContain('class="experience-freebar-summary"')
    expect(html).toContain('aria-expanded="true"')
    // Open desktop tray: only the current disclosure label is rendered (Collapse).
    expect(html).toContain('Collapse')
    expect(html).not.toContain('>Expand<')
    expect(html.indexOf('Primary')).toBeLessThan(html.indexOf('experience-freebar-summary'))
    expect(html).toContain('Secondary')
  })

  it('renders an intentional two-row bar open on the first frame', () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        {
          initialLocale: 'en',
          children: createElement(
            ExperienceI18nProvider,
            {
              dictionary: {},
              children: createElement(
                Freebar,
                {
                  ariaLabel: 'World controls',
                  secondaryDefault: 'open',
                  secondary: createElement('button', { type: 'button' }, 'Secondary'),
                  children: createElement('button', { type: 'button' }, 'Primary'),
                },
              ),
            },
          ),
        },
      ),
    )

    expect(html).toContain('data-freebar-open="true"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Secondary')
  })

  it('applies a closed preference only on a phone viewport', () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const resizeObserver = class {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', resizeObserver)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(max-width: 720px)',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    })))

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          {
            initialLocale: 'en',
            children: createElement(
              ExperienceI18nProvider,
              {
                dictionary: {},
                children: createElement(
                  Freebar,
                  {
                    ariaLabel: 'World controls',
                    secondaryDefault: 'closed',
                    secondary: createElement('button', { type: 'button' }, 'Phone secondary'),
                    children: createElement('button', { type: 'button' }, 'Primary'),
                  },
                ),
              },
            ),
          },
        ),
      )
    })

    const disclosure = container.querySelector<HTMLButtonElement>('.experience-freebar-summary')!
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(disclosure.getAttribute('aria-label')).toBe('Expand')
    expect(container.textContent).not.toContain('Phone secondary')

    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('keeps a complex auto tray closed on a phone viewport', () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const resizeObserver = class {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', resizeObserver)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(max-width: 720px)',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    })))
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(120)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          {
            initialLocale: 'en',
            children: createElement(
              ExperienceI18nProvider,
              {
                dictionary: {},
                children: createElement(
                  Freebar,
                  {
                    ariaLabel: 'World controls',
                    secondary: createElement('div', null, 'Three-row content'),
                    children: createElement('button', { type: 'button' }, 'Primary'),
                  },
                ),
              },
            ),
          },
        ),
      )
    })

    const disclosure = container.querySelector<HTMLButtonElement>('.experience-freebar-summary')!
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(container.textContent).not.toContain('Three-row content')

    act(() => root.unmount())
    container.remove()
    scrollHeight.mockRestore()
    vi.unstubAllGlobals()
  })

  it('renders accessible category tabs only when a complex tray opts into them', () => {
    const html = renderToStaticMarkup(
      createElement(FreebarTabs, {
        activeId: 'layers',
        ariaLabel: 'Parameter categories',
        onChange: () => undefined,
        tabs: [
          { id: 'playback', label: 'Playback' },
          { id: 'view', label: 'View' },
          { id: 'layers', label: 'Layers' },
        ],
      }),
    )

    expect(html).toContain('class="experience-freebar-tabs"')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="Parameter categories"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('tabindex="0"')
  })

  it('opens and closes from the single shared disclosure button', () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    vi.useFakeTimers()
    const resizeObserver = class {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', resizeObserver)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(max-width: 720px)',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    })))

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          {
            initialLocale: 'en',
            children: createElement(
              ExperienceI18nProvider,
              {
                dictionary: {},
                children: createElement(
                  Freebar,
                  {
                    ariaLabel: 'World controls',
                    secondaryDefault: 'closed',
                    secondary: createElement('button', { type: 'button' }, 'Secondary'),
                    children: createElement('button', { type: 'button' }, 'Primary'),
                  },
                ),
              },
            ),
          },
        ),
      )
    })

    const disclosure = container.querySelector<HTMLButtonElement>('.experience-freebar-summary')!
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(disclosure.getAttribute('aria-label')).toBe('Expand')
    expect(container.querySelector('.experience-freebar-grip')).toBeNull()

    act(() => {
      disclosure.click()
      vi.advanceTimersByTime(400)
    })
    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(disclosure.getAttribute('aria-label')).toBe('Collapse')
    expect(container.textContent).toContain('Secondary')

    act(() => {
      disclosure.click()
      vi.advanceTimersByTime(400)
    })
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(container.textContent).not.toContain('Secondary')

    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps migrated high-density worlds on the shared disclosure policy', () => {
    const worlds = [
      'BoidsFlocking',
      'SolarSystem',
    ]

    for (const world of worlds) {
      const source = worldSource(world)
      expect(source, world).toContain("from '~/components/experiences/Freebar'")
      expect(source, world).toContain('<Freebar')
      expect(source, world).toContain('secondary={')
      expect(source, world).toContain('data-freebar-clearance="true"')
    }
  })

  it('declares no more than five primary controls for the four new migrations', () => {
    /** SolarSystem keeps playback and both reference frames primary; the phone tray adapts to its measured height. */
    const solar = worldSource('SolarSystem')
    expect(solar).toContain('primaryControlBudget={3}')
    expect(solar).toContain('secondaryDefault="auto"')
    expect(solar).toContain('mobileDensity="comfortable"')
    expect(solar).toContain('className="ss-tools-strip"')
    expect(solar).not.toContain('className="ss-tools-utility"')
    expect(solar).not.toContain('<FreebarTabs')

    /** Rainbow is the simple pilot: its secondary tray has no category rail. */
    const rainbow = worldSource('Rainbow')
    expect(rainbow).toContain('primaryControlBudget={3}')
    expect(rainbow).toContain('className="experience-freebar-seg"')
    expect(rainbow).toContain('className="rb-tray"')
    expect(rainbow).not.toContain('<FreebarTabs')
  })

  it('keeps neural tools centered and restores real phone swipe rails', () => {
    const source = worldSource('NeuralPlayground')
    const css = worldCss('NeuralPlayground')

    expect(source).toContain('primaryControlBudget={2}')
    expect(source).toContain('secondaryDefault="closed"')
    expect(source).toContain('<FreebarTabs')
    expect(css).toMatch(/\.neural-freebar-shell \.experience-freebar-primary\s*\{[^}]*justify-content:\s*center;/s)
    expect(css).toMatch(
      /\.neural-freebar-shell \.experience-freebar-secondary \.neural-chip-rail,[\s\S]*?overflow-x:\s*auto\s*!important;[\s\S]*?touch-action:\s*pan-x;/s,
    )
  })

  it('keeps independent phone secondary chip rails swipeable', () => {
    const rails = [
      ['Rainbow', 'styles/Rainbow.css', 'rb-chip-rail'],
    ] as const

    for (const [world, , rail] of rails) {
      const css = worldCss(world)
      expect(css, world).toContain(`.experience-freebar-secondary .${rail}`)
      expect(css, world).toMatch(/overflow-x:\s*auto\s*!important;/)
      expect(css, world).toContain('touch-action: pan-x;')
      expect(css, world).toContain('justify-content: flex-start !important;')
    }
  })

  it('keeps every mobile freebar bounded and its disclosure scrollable', () => {
    const css = readFileSync(resolve(import.meta.dirname, 'styles/Freebar.css'), 'utf8')

    expect(css).toMatch(
      /\.experience-freebar\s*\{[^}]*max-height:\s*min\(50dvh,\s*340px\);/s,
    )
    expect(css).toMatch(
      /\.experience-freebar\.has-freebar-disclosure\s*\{[^}]*max-height:\s*min\(50dvh,\s*340px\);[^}]*overflow:\s*visible;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar\.has-freebar-disclosure \.experience-freebar-main\s*\{[^}]*overflow:\s*hidden;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar\.has-freebar-disclosure \.experience-freebar-secondary\s*\{[^}]*max-height:\s*max\([^}]*overflow-y:\s*auto;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-primary\s*\{[^}]*order:\s*3;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-main\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-secondary\s*\{[^}]*order:\s*2;[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar\.has-freebar-disclosure \.experience-freebar-secondary\s*\{[^}]*overflow-y:\s*auto;[^}]*touch-action:\s*pan-y;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*touch-action:\s*pan-x;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-primary\s*>\s*\.experience-freebar-summary\s*\{[^}]*width:\s*40px\s*!important;[^}]*min-height:\s*40px\s*!important;/s,
    )
    expect(css).not.toContain('.experience-freebar-grip')
    const component = readFileSync(resolve(import.meta.dirname, 'Freebar.tsx'), 'utf8')
    expect(component).not.toContain('onPointerDown')
    expect(component).not.toContain('onPointerMove')
    expect(component).toContain("open ? '折叠' : '展开'")
    expect(component).not.toContain("'更多参数'")
    expect(component).not.toContain("'收起参数'")
    expect(css).toMatch(
      /\[data-freebar-mobile-density='comfortable'\] input\[type='range'\]\s*\{[^}]*height:\s*32px;/s,
    )
    expect(css).toMatch(
      /\[data-freebar-mobile-density='comfortable'\] input\[type='range'\]::\-webkit-slider-thumb\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s,
    )
    /**
     * Clearance is keyed to the bar's measured height, not to the tray being
     * open. The old rule only made room once the extra controls were expanded,
     * which left readouts completely hidden behind tall collapsed bars on a
     * phone — invisible on desktop, so it went unnoticed.
     */
    expect(css).toContain("[data-freebar-clearance='true']")
    expect(css).toContain('var(--experience-freebar-height')
    expect(component, 'the Freebar must publish its height for that rule to work')
      .toContain('--experience-freebar-height')
    expect(css).toMatch(
      /\.experience-freebar-primary\s*>\s*\[class\*='field'\][^{]*\{[^}]*flex:\s*0 1 100%;/s,
    )
    expect(css).toMatch(
      /\.experience-freebar-secondary\s*>\s*\[class\*='field'\][^{]*\{[^}]*flex:\s*0 1 100%;/s,
    )
    // Phone chip rails stay one-row horizontal scroll (no wrap towers).
    expect(css).toMatch(
      /\.experience-freebar-chips(?::not\([^)]*\)){0,2}\s*\{[^}]*flex-wrap:\s*nowrap\s*!important;/s,
    )
  })
})
