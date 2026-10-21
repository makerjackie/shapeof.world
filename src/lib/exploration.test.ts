import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectUnvisitedId } from './exploration'

afterEach(() => vi.restoreAllMocks())

describe('continuous exploration', () => {
  it('reaches every eligible world without repeating before completion', () => {
    const ids = Array.from({ length: 169 }, (_, index) => `world-${index}`)
    const visited: string[] = ['private-world', 'museum-world']
    for (let index = 0; index < ids.length; index += 1) {
      const next = selectUnvisitedId(ids, visited, visited.at(-1))!
      expect(ids).toContain(next)
      expect(visited).not.toContain(next)
      visited.push(next)
    }
    expect(new Set(visited).size).toBe(171)
  })
  it('excludes the current world before its visit is recorded', () => {
    expect(selectUnvisitedId(['current', 'next'], [], 'current')).toBe('next')
  })
  it('revisits after completion without choosing the current world', () => {
    expect(selectUnvisitedId(['first', 'last'], ['first', 'last'], 'last')).toBe('first')
  })
  it('includes newly published worlds after previous completion', () => {
    expect(selectUnvisitedId(['old', 'new'], ['old'], 'old')).toBe('new')
  })
  it('has no next target when only the current world is eligible', () => {
    expect(selectUnvisitedId(['only'], ['only'], 'only')).toBeUndefined()
    expect(selectUnvisitedId([], [])).toBeUndefined()
  })
  it('shares successful requests and allows retry after failure', async () => {
    vi.resetModules()
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify(['public', 'public', 'other'])))
    vi.stubGlobal('fetch', fetchMock)
    const { loadExplorationIds } = await import('./exploration')
    await expect(loadExplorationIds()).rejects.toThrow('offline')
    expect(await loadExplorationIds()).toEqual(['public', 'other'])
    expect(await loadExplorationIds()).toEqual(['public', 'other'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
})
