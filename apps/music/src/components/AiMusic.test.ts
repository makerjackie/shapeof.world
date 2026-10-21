// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { AiMusic } from './AiMusic'
import { I18nProvider } from '~/i18n'
import { musicPrompt } from '~/lib/ai-prompt'

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
async function render(locale: 'en' | 'zh') {
  await act(async () => root.render(createElement(I18nProvider, { locale, setLocale: () => {}, children: createElement(AiMusic, { shorts: true }) })))
}
afterEach(async () => { await act(async () => root.render(null)); vi.restoreAllMocks() })
it('copies the current localized retrieval brief and resets feedback after a language change', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await render('en')
  await act(async () => container.querySelector('button')!.click())
  expect(writeText).toHaveBeenCalledWith(musicPrompt('en', true))
  expect(container.querySelector('button')!.textContent).toContain('Copied')
  expect(container.querySelector('textarea')!.value).toBe(musicPrompt('en', true))
  await render('zh')
  expect(container.querySelector('button')!.textContent).toContain('复制 Prompt')
  await act(async () => container.querySelector('button')!.click())
  expect(writeText).toHaveBeenLastCalledWith(musicPrompt('zh', true))
})
it('exposes the complete selectable prompt when clipboard permission is denied', async () => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true })
  await render('zh')
  await act(async () => container.querySelector('button')!.click())
  const field = container.querySelector('textarea')!
  expect(field.readOnly).toBe(true)
  expect(field.value).toBe(musicPrompt('zh', true))
  expect(container.textContent).toContain('手动复制')
})
