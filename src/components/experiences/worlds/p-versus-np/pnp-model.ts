export type RouteGraph = { size: number; edges: boolean[][]; solution: number[] }
export type SearchFrame = { path: number[]; backtrack: boolean }
export function makeGraph(size: number): RouteGraph {
  if (!Number.isInteger(size) || size < 3 || size > 12) throw new RangeError('size must be 3..12')
  const solution = [0, ...Array.from({ length: size - 1 }, (_, i) => i + 1).sort((a, b) => ((a * 7) % size) - ((b * 7) % size))]
  const edges = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const link = (a: number, b: number) => { edges[a][b] = true; edges[b][a] = true }
  for (let i = 1; i < size; i++) link(solution[i - 1], solution[i])
  for (let i = 0; i < size; i++) for (let j = i + 1; j < size; j++) if ((i * 11 + j * 7) % 9 < 2) link(i, j)
  link(0, size - 2)
  link(2, size - 1)
  return { size, edges, solution }
}
export function verifyRoute(graph: RouteGraph, path: readonly number[]): boolean {
  if (path.length !== graph.size || new Set(path).size !== graph.size) return false
  if (path.some(i => !Number.isInteger(i) || i < 0 || i >= graph.size)) return false
  return path.every((node, i) => i === 0 || graph.edges[path[i - 1]][node])
}
export function traceSearch(graph: RouteGraph): SearchFrame[] {
  const frames: SearchFrame[] = []
  const path = [0]
  const walk = (): boolean => {
    frames.push({ path: [...path], backtrack: false })
    if (path.length === graph.size) return true
    const last = path[path.length - 1]
    for (let next = graph.size - 1; next >= 0; next--) {
      if (!graph.edges[last][next] || path.includes(next)) continue
      path.push(next)
      if (walk()) return true
      path.pop()
      frames.push({ path: [...path], backtrack: true })
    }
    return false
  }
  walk()
  return frames
}
export function permutationCount(size: number): number {
  return Array.from({ length: size }, (_, i) => i + 1).reduce((a, b) => a * b, 1)
}
