import { describe, expect, it } from 'vitest'
import { makeGraph, permutationCount, traceSearch, verifyRoute } from './pnp-model'
describe('Hamiltonian route certificates', () => {
  for (const size of [6, 9, 12]) it(`search produces a valid certificate for ${size} vertices`, () => {
    const graph = makeGraph(size)
    const frames = traceSearch(graph)
    expect(verifyRoute(graph, graph.solution)).toBe(true)
    expect(frames.some(frame => frame.backtrack)).toBe(true)
    expect(verifyRoute(graph, frames.at(-1)!.path)).toBe(true)
    for (const frame of frames) {
      expect(new Set(frame.path).size).toBe(frame.path.length)
      expect(frame.path.every((v, i) => i === 0 || graph.edges[frame.path[i - 1]][v])).toBe(true)
    }
  })
  it('rejects incomplete, repeated and out-of-range certificates', () => {
    const g = makeGraph(6)
    expect(verifyRoute(g, g.solution.slice(1))).toBe(false)
    expect(verifyRoute(g, [0, 0, 1, 2, 3, 4])).toBe(false)
    expect(verifyRoute(g, [0, 1, 2, 3, 4, 7])).toBe(false)
    expect(permutationCount(12)).toBe(479001600)
  })
})
