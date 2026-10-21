import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider, useI18n } from './index'
import { ExperienceI18nProvider, useExperienceI18n, type ExperienceTextTranslator } from './experience'
import { localeCookieName } from '~/lib/locale'

type ActGlobal = typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }

const resetBrowserState = () => {
  window.localStorage.removeItem(localeCookieName)
  document.cookie = `${localeCookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  window.history.replaceState({}, '', '/')
}

function BrandLine() {
  const i18n = useI18n()
  return createElement('p', { 'data-locale': i18n.locale }, i18n.t('brand.name'))
}

describe('I18nProvider locale handling', () => {
  const host = document.createElement('div')
  let root: Root | undefined

  const mount = (tree: ReactNode) => {
    act(() => root!.render(tree))
  }

  beforeEach(() => {
    ;(globalThis as ActGlobal).IS_REACT_ACT_ENVIRONMENT = true
    resetBrowserState()
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    host.remove()
    resetBrowserState()
  })

  it('uses the locale chosen on the server for rendering and the document language', () => {
    window.history.replaceState(null, '', '/en/explore/seasons')

    mount(createElement(I18nProvider, { initialLocale: 'en', children: createElement(BrandLine) }))

    const line = host.querySelector('p')
    expect(line?.getAttribute('data-locale')).toBe('en')
    expect(line?.textContent).toBe('Shape of the World')
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps one canvas element while retained translators follow locale changes', () => {
    const seen = new Set<ExperienceTextTranslator>()
    function Stage() {
      const translate = useExperienceI18n()
      seen.add(translate)
      return createElement('canvas', { 'aria-label': translate('波源') })
    }
    const show = (locale: 'zh' | 'en', english: string) => mount(
      createElement(I18nProvider, {
        initialLocale: locale,
        children: createElement(ExperienceI18nProvider, {
          dictionary: { '波源': english },
          children: createElement(Stage),
        }),
      }),
    )
    const expectAll = (expected: string) => {
      for (const translate of seen) expect(translate('波源')).toBe(expected)
    }

    show('zh', 'Wave source')
    const firstCanvas = host.querySelector('canvas')
    show('en', 'Wave source')
    expect(host.querySelector('canvas')).toBe(firstCanvas)
    expect(firstCanvas?.getAttribute('aria-label')).toBe('Wave source')
    expectAll('Wave source')

    show('zh', 'Wave source')
    expectAll('波源')
    show('en', 'Source')
    expectAll('Source')
  })
})
