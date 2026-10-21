import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorldSummary } from '~/data/world-summaries'
let useWorldCatalog: typeof import('./use-world-catalog').useWorldCatalog

const first = { id: 'first' } as WorldSummary
const second = { id: 'second' } as WorldSummary
const initialPage = [first]
type Props = Parameters<typeof useWorldCatalog>[0]
const defaults: Props = { category: 'all', sort: 'recommended', initialPage, enabled: true, total: 2 }
let root: Root
let catalog: ReturnType<typeof useWorldCatalog>
function Harness(props: Props) {
  catalog = useWorldCatalog(props)
  return createElement('div', null, catalog.loading ? 'loading' : catalog.error ? 'error' : catalog.worlds.map((world) => world.id).join(','))
}
async function render(props: Partial<Props> = {}) {
  await act(async () => { root.render(createElement(Harness, { ...defaults, ...props })) })
}
function page(worlds: ReadonlyArray<WorldSummary>) {
  return new Response(JSON.stringify(worlds))
}

beforeEach(async () => {
  vi.resetModules()
  ;({ useWorldCatalog } = await import('./use-world-catalog'))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

describe('world catalogue browsing', () => {

  it('restores loaded pages after remount and filter toggles before continuing without duplicates', async () => {
    const third = { id: 'third' } as WorldSummary
    const fetchMock = vi.fn().mockResolvedValueOnce(page([second])).mockResolvedValueOnce(page([third]))
    vi.stubGlobal('fetch', fetchMock)
    await render({ total: 3 })
    await act(async () => catalog.loadMore())
    expect(catalog.worlds).toEqual([first, second])
    await act(async () => root.unmount())
    root = createRoot(document.createElement('div'))
    await render({ total: 3 })
    expect(catalog.worlds).toEqual([first, second])
    await render({ total: 3, enabled: false })
    await render({ total: 3 })
    expect(catalog.worlds).toEqual([first, second])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => catalog.loadMore())
    expect(catalog.worlds).toEqual([first, second, third])
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/generated/world-artifacts/pages/recommended/0002.json',
      '/generated/world-artifacts/pages/recommended/0003.json',
    ])
  })

  it('retains successful pages across a failed next page and retries that page after returning', async () => {
    const third = { id: 'third' } as WorldSummary
    const fetchMock = vi.fn().mockResolvedValueOnce(page([second]))
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([third]))
    vi.stubGlobal('fetch', fetchMock)
    await render({ total: 3 })
    await act(async () => catalog.loadMore())
    await act(async () => catalog.loadMore())
    expect(catalog.error).toBe(true)
    await act(async () => root.unmount())
    root = createRoot(document.createElement('div'))
    await render({ total: 3 })
    expect(catalog.worlds).toEqual([first, second])
    await act(async () => catalog.retry())
    expect(catalog.worlds).toEqual([first, second, third])
    expect(fetchMock.mock.calls[2][0]).toContain('/0003.json')
  })

  it('keeps existing cards on failure, prevents automatic retries, and retries the same page manually', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([second]))
    vi.stubGlobal('fetch', fetchMock)
    await render()
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => catalog.loadMore())
    expect(catalog.error).toBe(true)
    expect(catalog.worlds).toEqual([first])
    await act(async () => catalog.loadMore())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => catalog.retry())
    expect(catalog.error).toBe(false)
    expect(catalog.worlds).toEqual([first, second])
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/generated/world-artifacts/pages/recommended/0002.json',
      '/generated/world-artifacts/pages/recommended/0002.json',
    ])
  })

  it('distinguishes a loading first page from a failed first page and lets it recover', async () => {
    let fail!: (error: Error) => void
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
      .mockResolvedValueOnce(page([second]))
    vi.stubGlobal('fetch', fetchMock)
    await render({ category: 'physics' })
    expect(catalog.loading).toBe(true)
    expect(catalog.error).toBe(false)
    expect(catalog.worlds).toEqual([])
    await act(async () => fail(new Error('offline')))
    expect(catalog.loading).toBe(false)
    expect(catalog.error).toBe(true)
    await act(async () => catalog.retry())
    expect(catalog.worlds).toEqual([second])
    expect(fetchMock.mock.calls.every(([path]) => path.endsWith('/0001.json'))).toBe(true)
  })

  it('does not append an old response after leaving and returning to the same category', async () => {
    let finishOld!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finishOld = resolve }))
      .mockResolvedValueOnce(page([first]))
    vi.stubGlobal('fetch', fetchMock)
    await render({ category: 'physics' })
    await render()
    await render({ category: 'physics' })
    await act(async () => finishOld(page([second])))
    expect(catalog.worlds).toEqual([first])
  })

  it('deduplicates overlapping load triggers and treats an unexpectedly empty page as an error', async () => {
    let finish!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    await render()
    await act(async () => {
      catalog.loadMore()
      catalog.loadMore()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => finish(page([])))
    expect(catalog.error).toBe(true)
    expect(catalog.worlds).toEqual([first])
    await act(async () => catalog.loadMore())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
