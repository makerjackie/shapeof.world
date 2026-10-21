import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

describe('shared world search index', () => {
  it('shares pending and successful requests per language, and permits retry after failure', async () => {
    const { loadWorldSearchIndex } = await import('./world-search-index')
    let finish!: (response: Response) => void
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve }))
      .mockResolvedValueOnce(new Response('[]'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadWorldSearchIndex('zh')).rejects.toThrow('offline')
    const homeRequest = loadWorldSearchIndex('zh')
    const headerRequest = loadWorldSearchIndex('zh')
    expect(homeRequest).toBe(headerRequest)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    finish(new Response('[]'))
    await expect(homeRequest).resolves.toEqual([])
    await expect(loadWorldSearchIndex('zh')).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await loadWorldSearchIndex('en')
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/generated/world-artifacts/search/zh.json',
      '/generated/world-artifacts/search/zh.json',
      '/generated/world-artifacts/search/en.json',
    ])
  })
})
