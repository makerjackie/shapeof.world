import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const bootstrap = readFileSync(new URL('../../public/lang.js', import.meta.url), 'utf8')
function boot({ languages = ['en-US'], language = languages[0], dark = false, saved = {} as Record<string, string>, url = 'https://music.shapeof.world/', blocked = false }: { languages?: string[]; language?: string; dark?: boolean; saved?: Record<string, string>; url?: string; blocked?: boolean } = {}) {
  const attrs = { lang: 'en', dataset: {} as Record<string, string> }
  let cleanedUrl = url
  runInNewContext(bootstrap, {
    URL, navigator: { language, languages }, document: { documentElement: attrs },
    localStorage: { getItem: (key: string) => { if (blocked) throw new Error('blocked'); return saved[key] }, setItem: (key: string, value: string) => { if (blocked) throw new Error('blocked'); saved[key] = value } },
    window: { location: { href: url }, matchMedia: () => ({ matches: dark }) },
    history: { state: null, replaceState: (_state: unknown, _title: string, value: string) => { cleanedUrl = value } },
  })
  return { attrs, saved, cleanedUrl }
}
describe('music preferences bootstrap', () => {
  it('detects Chinese variants and the ordered browser language list', () => {
    expect(boot({ languages: ['zh-TW', 'en-US'] }).attrs.lang).toBe('zh-CN')
    expect(boot({ languages: ['en-GB', 'zh-CN'], language: 'zh-CN' }).attrs.lang).toBe('en')
    expect(boot({ languages: ['fr-FR', 'zh-HK'] }).attrs.lang).toBe('zh-CN')
    expect(boot({ languages: ['de-DE'] }).attrs.lang).toBe('en')
  })
  it('follows the system theme until a valid manual preference exists', () => {
    expect(boot({ dark: true }).attrs.dataset.theme).toBe('dark')
    expect(boot().attrs.dataset.theme).toBe('light')
    expect(boot({ dark: true, saved: { 'music.theme': 'light' } }).attrs.dataset.theme).toBe('light')
    expect(boot({ saved: { 'music.theme': 'invalid' } }).attrs.dataset.theme).toBe('light')
  })
  it('retains manual language and cleans legacy links without dropping other URL state', () => {
    const result = boot({ url: 'https://music.shapeof.world/track/example?lang=zh&ref=friend#details', saved: { 'music.language': 'en' } })
    expect(result.attrs.lang).toBe('en')
    expect(result.cleanedUrl).toBe('/track/example?ref=friend#details')
    expect(boot({ url: 'https://music.shapeof.world/?lang=zh' }).saved['music.language']).toBe('zh')
    expect(boot({ url: 'https://music.shapeof.world/?language=zh' }).cleanedUrl).toBe('/')
  })
  it('still initializes and cleans links when storage is blocked', () => {
    const result = boot({ blocked: true, languages: ['zh-CN'], dark: true, url: 'https://music.shapeof.world/?lang=zh' })
    expect(result.attrs.lang).toBe('zh-CN')
    expect(result.attrs.dataset.theme).toBe('dark')
    expect(result.cleanedUrl).toBe('/')
  })
})
