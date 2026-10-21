import { describe, expect, it } from 'vitest'

import {
  selectEditorialNextWorld,
  selectHomeWorld,
  selectNextWorld,
  selectRandomWorldCandidates,
} from './next-world'

const worlds = [
  { id: 'flagship-a' },
  { id: 'solid-b' },
  { id: 'solid-c' },
  { id: 'archive-visible' },
]

const flagshipIds = new Set(['flagship-a'])
const discoverable = (world: { id: string }) => world.id !== 'archive-visible'

describe('selectEditorialNextWorld', () => {
  const issue = { id: 'issue' }
  const path = { id: 'path' }
  const related = { id: 'related' }
  const recommended = { id: 'recommended' }

  it('gives an issue continuation the highest priority', () => {
    expect(selectEditorialNextWorld({ issue, path, related, recommended })).toEqual({
      world: issue,
      kind: 'issue',
    })
  })

  it('falls back to the Path continuation when there is no issue continuation', () => {
    expect(selectEditorialNextWorld({ issue: null, path, related, recommended })).toEqual({
      world: path,
      kind: 'path',
    })
  })

  it('falls back to a related world when issue and Path continuations are absent', () => {
    expect(selectEditorialNextWorld({ related, recommended })).toEqual({
      world: related,
      kind: 'related',
    })
  })

  it('returns the recommendation when it is the only continuation', () => {
    expect(selectEditorialNextWorld({ recommended })).toEqual({
      world: recommended,
      kind: 'recommended',
    })
  })

  it('still resolves the current world when every editorial next id is missing', () => {
    expect(selectEditorialNextWorld({
      issue: null,
      path: null,
      related: null,
      recommended: undefined,
    })).toBeUndefined()
  })
})

describe('selectRandomWorldCandidates', () => {
  it('filters the current and undiscoverable worlds and deduplicates ids', () => {
    const candidates = selectRandomWorldCandidates(
      [
        { id: 'current', version: 1 },
        { id: 'solid-a', version: 1 },
        { id: 'solid-a', version: 2 },
        { id: 'archive-visible', version: 1 },
        { id: 'solid-b', version: 1 },
      ],
      'current',
      10,
      { random: () => 0, isDiscoverable: discoverable },
    )

    expect(candidates).toHaveLength(2)
    expect(new Set(candidates.map((world) => world.id))).toEqual(new Set(['solid-a', 'solid-b']))
    expect(candidates.find((world) => world.id === 'solid-a')?.version).toBe(1)
  })

  it('never returns more than the requested limit and randomizes return order', () => {
    const candidates = selectRandomWorldCandidates(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      'current',
      4,
      { random: () => 0, isDiscoverable: () => true },
    )

    expect(candidates.map((world) => world.id)).toEqual(['b', 'c', 'd', 'a'])
    expect(selectRandomWorldCandidates(
      Array.from({ length: 20 }, (_, index) => ({ id: `world-${index}` })),
      'current',
      3,
      { random: () => 0.5, isDiscoverable: () => true },
    )).toHaveLength(3)
  })

  it('returns an empty pool for non-positive or unusable limits', () => {
    const source = [{ id: 'a' }]
    const options = { isDiscoverable: () => true }

    expect(selectRandomWorldCandidates(source, 'current', 0, options)).toEqual([])
    expect(selectRandomWorldCandidates(source, 'current', -1, options)).toEqual([])
    expect(selectRandomWorldCandidates(source, 'current', 0.5, options)).toEqual([])
    expect(selectRandomWorldCandidates(source, 'current', Number.NaN, options)).toEqual([])
    expect(selectRandomWorldCandidates(source, 'current', Number.POSITIVE_INFINITY, options)).toEqual([])
  })

  it('remains total when an injected random source is invalid, out of range, or throws', () => {
    const source = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const invalidRandomSources = [
      () => Number.NaN,
      () => Number.NEGATIVE_INFINITY,
      () => -100,
      () => 100,
      () => { throw new Error('broken random source') },
    ]

    for (const random of invalidRandomSources) {
      const candidates = selectRandomWorldCandidates(source, 'current', 2, {
        random,
        isDiscoverable: () => true,
      })
      expect(candidates).toHaveLength(2)
      expect(new Set(candidates.map((world) => world.id)).size).toBe(2)
    }
  })
})

describe('selectNextWorld', () => {
  it('prefers discoverable worlds that have not been visited', () => {
    expect(selectNextWorld(worlds, 'flagship-a', ['solid-c'], { random: () => 0, isDiscoverable: discoverable })).toEqual({ id: 'solid-b' })
  })

  it('does not choose the current world or archive-visible worlds', () => {
    expect(selectNextWorld(worlds, 'flagship-a', [], { random: () => 0.99, isDiscoverable: discoverable })).toEqual({ id: 'solid-c' })
  })

  it('falls back to any discoverable non-current world after all are visited', () => {
    expect(selectNextWorld(worlds, 'flagship-a', ['solid-b', 'solid-c'], { random: () => 0, isDiscoverable: discoverable })).toEqual({ id: 'solid-b' })
  })

  it('does not repeat or return to the current world while unvisited options remain', () => {
    const route = [{ id: 'world-a' }, { id: 'world-b' }, { id: 'world-c' }, { id: 'world-d' }]
    const visited = new Set(['world-a'])
    let currentId = 'world-a'
    const picked: Array<string> = []

    for (let step = 0; step < route.length - 1; step += 1) {
      const next = selectNextWorld(route, currentId, visited, { random: () => 0 })
      expect(next).toBeDefined()
      expect(next?.id).not.toBe(currentId)
      expect(next ? visited.has(next.id) : true).toBe(false)
      if (!next) break
      picked.push(next.id)
      visited.add(next.id)
      currentId = next.id
    }

    expect(picked).toEqual(['world-b', 'world-c', 'world-d'])
    expect(new Set(picked).size).toBe(picked.length)
  })

  it('returns undefined when no non-current discoverable world exists', () => {
    expect(selectNextWorld([{ id: 'only' }], 'only', [], { random: () => 0 })).toBeUndefined()
  })
})

describe('selectHomeWorld', () => {
  it('prefers an unvisited flagship, then any unvisited world', () => {
    expect(selectHomeWorld(worlds, ['solid-b'], flagshipIds, { random: () => 0 })).toEqual({ id: 'flagship-a' })
    expect(selectHomeWorld(worlds, ['flagship-a'], flagshipIds, { random: () => 0 })).toEqual({ id: 'solid-b' })
  })

  it('keeps archive-visible worlds out of the homepage pool', () => {
    expect(selectHomeWorld(worlds, [], new Set(), {
      random: () => 0.99,
      isDiscoverable: discoverable,
    })).toEqual({ id: 'solid-c' })
  })

  it('returns to flagship after all worlds are visited', () => {
    expect(selectHomeWorld(worlds, worlds.map((world) => world.id), flagshipIds, { random: () => 0 })).toEqual({ id: 'flagship-a' })
  })

  it('handles an empty collection and clamps injected random values', () => {
    expect(selectHomeWorld([], [], flagshipIds, { random: () => 0 })).toBeUndefined()
    expect(selectHomeWorld(worlds.slice(0, 2), [], new Set(), { random: () => 1 })).toEqual({ id: 'solid-b' })
  })
})
