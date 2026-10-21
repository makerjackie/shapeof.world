import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useWorldSearchIndex } from './world-search-index'
import summaries from '~/data/generated/world-summaries.json'

it('shows search progress and errors, retries, and keeps language responses isolated', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const chineseDocuments = [{ text: '中文', world: summaries[0] }]
  let fail!: (error: Error) => void
  let finishChinese!: (response: Response) => void
  let finishEnglish!: (response: Response) => void
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishChinese = resolve }))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishEnglish = resolve }))
  vi.stubGlobal('fetch', fetchMock)
  const root = createRoot(document.createElement('div'))
  let index!: ReturnType<typeof useWorldSearchIndex>
  function Harness({ locale, query }: { locale: 'zh' | 'en'; query: string }) {
    index = useWorldSearchIndex(locale, Boolean(query))
    return null
  }
  async function render(locale: 'zh' | 'en', query = 'black hole') {
    await act(async () => root.render(createElement(Harness, { locale, query })))
  }
  try {
    await render('zh')
    expect(index.loading).toBe(true)
    expect(index.error).toBe(false)
    await render('zh', 'gravity')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => fail(new Error('offline')))
    expect(index.loading).toBe(false)
    expect(index.error).toBe(true)
    expect(index.documents).toBeUndefined()
    await act(async () => index.retry())
    expect(index.loading).toBe(true)
    expect(index.error).toBe(false)

    await render('en')
    await act(async () => finishChinese(new Response(JSON.stringify(chineseDocuments))))
    expect(index.documents).toBeUndefined()
    expect(index.loading).toBe(true)
    await act(async () => finishEnglish(new Response('[]')))
    expect(index.documents).toEqual([])
    expect(index.loading).toBe(false)
    expect(index.error).toBe(false)
    await render('zh')
    expect(index.documents).toEqual(chineseDocuments)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await render('zh', '')
    await render('zh', 'new query')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
