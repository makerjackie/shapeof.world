import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeedbackPage } from './feedback'

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => () => ({ useSearch: () => ({ world: 'ferrofluid', kind: 'problem' }) }), Link: ({ children }: { children: React.ReactNode }) => createElement('a', null, children) }))
vi.mock('~/components/SiteHeader', () => ({ SiteHeader: () => null }))
vi.mock('~/components/SiteFooter', () => ({ SiteFooter: () => null }))
vi.mock('~/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('~/i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'zh' }) }))
vi.mock('~/i18n/seo', () => ({ languageDiscoveryLinks: () => [], localeFromRouteMatches: () => 'zh' }))
afterEach(() => vi.unstubAllGlobals())

describe('feedback form recovery', () => {
  it('retains input on failure, permits retry, and acknowledges only confirmed acceptance', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(Response.json({ status: 'accepted', reference: 'test-reference' }))
    vi.stubGlobal('fetch', fetcher)
    const container = document.createElement('div'); document.body.appendChild(container)
    const root = createRoot(container)
    try {
      await act(async () => root.render(createElement(FeedbackPage)))
      const textarea = container.querySelector('textarea')!
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, '页面一直停在加载画面。')
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('feedback.error')
      expect(textarea.value).toBe('页面一直停在加载画面。')
      expect(container.textContent).not.toContain('feedback.success')
      await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      expect(container.textContent).toContain('feedback.success')
      expect(container.textContent).toContain('test-reference')
      expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ message: '页面一直停在加载画面。', worldId: 'ferrofluid', replyTo: '' })
    } finally { act(() => root.unmount()); container.remove() }
  })
})
