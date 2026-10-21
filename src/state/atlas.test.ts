import { describe, expect, it } from 'vitest'

import { applyPersistedAtlasUpdate, loadAtlasState } from './atlas'

describe('atlas persistence', () => {
  it('persists an update synchronously before returning it to React', () => {
    let stored = ''
    const storage = {
      get: () => null,
      set: (_key: string, value: string) => {
        stored = value
        return true
      },
      remove: () => true,
    }
    const current = loadAtlasState(storage)
    const next = applyPersistedAtlasUpdate(current, (state) => ({
      ...state,
      completed: ['periodic-table'],
      completedIssues: ['elements-have-many-orders'],
    }), storage)

    expect(JSON.parse(stored)).toEqual(next)
    expect(next.completedIssues).toEqual(['elements-have-many-orders'])
  })

  it('migrates a valid v1 record when no v2 record exists', () => {
    const storage = {
      get: (key: string) => key === 'oneworld.atlas.v1'
        ? JSON.stringify({
            completed: ['apollo-eleven', 'apollo-eleven', 17],
            visited: ['living-earth'],
            completedIssues: ['earth-never-rests'],
            visitedIssues: ['earth-never-rests'],
          })
        : null,
      set: () => true,
      remove: () => true,
    }

    expect(loadAtlasState(storage)).toEqual({
      completed: ['apollo-eleven'],
      visited: ['living-earth'],
      completedIssues: ['earth-never-rests'],
      visitedIssues: ['earth-never-rests'],
      issueCompletionDates: {},
    })
  })

  it('prefers v2, validates completion dates, and falls back to v1 if v2 is corrupt', () => {
    const validV2 = JSON.stringify({
      visited: ['solar-system'],
      issueCompletionDates: {
        'inside-a-real-ct': '2026-07-11T08:00:00.000Z',
        invalid: 'not-a-date',
      },
    })
    const legacy = JSON.stringify({ visited: ['living-earth'] })
    const createStorage = (current: string | null) => ({
      get: (key: string) => key === 'oneworld.atlas.v2' ? current : legacy,
      set: () => true,
      remove: () => true,
    })

    expect(loadAtlasState(createStorage(validV2))).toMatchObject({
      visited: ['solar-system'],
      issueCompletionDates: { 'inside-a-real-ct': '2026-07-11T08:00:00.000Z' },
    })
    expect(loadAtlasState(createStorage('{broken'))).toMatchObject({
      visited: ['living-earth'],
      issueCompletionDates: {},
    })
  })

  it('returns an independent empty state when storage access is denied', () => {
    const denied = {
      get: () => { throw new DOMException('Storage denied', 'SecurityError') },
      set: () => false,
      remove: () => false,
    }

    const first = loadAtlasState(denied)
    first.visited.push('mutated-only-in-this-result')
    const second = loadAtlasState(denied)

    expect(second).toEqual({
      completed: [],
      visited: [],
      completedIssues: [],
      visitedIssues: [],
      issueCompletionDates: {},
    })
  })
})
