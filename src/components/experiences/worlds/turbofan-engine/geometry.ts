import * as T from 'three'

/** A lofted, twisted airfoil with a symmetric NACA thickness distribution.
 * Original teaching geometry, not a manufacturer's aerodynamic surface. */
export function bladeGeometry(root: number, tip: number, chord: number, twist = .55, sweep = .16) {
  const vertices: number[] = [], indices: number[] = []
  const spanSteps = 10, chordSteps = 16
  for (let side = 0; side < 2; side++) for (let j = 0; j <= spanSteps; j++) {
    const span = j / spanSteps, r = root + (tip - root) * span
    const width = chord * (1 - span * .32)
    const angle = twist * (1 - span * .65)
    for (let i = 0; i <= chordSteps; i++) {
      const u = i / chordSteps
      const thick = 5 * .12 * (.2969 * Math.sqrt(u) - .126 * u - .3516 * u * u + .2843 * u ** 3 - .1036 * u ** 4)
      const x = (u - .5) * width, z = (side ? -1 : 1) * thick * width + .035 * Math.sin(Math.PI * u) * width
      vertices.push(x * Math.cos(angle) - z * Math.sin(angle) + span * span * sweep, r, x * Math.sin(angle) + z * Math.cos(angle))
    }
  }
  const row = chordSteps + 1, layer = (spanSteps + 1) * row
  for (let side = 0; side < 2; side++) for (let j = 0; j < spanSteps; j++) for (let i = 0; i < chordSteps; i++) {
    const a = side * layer + j * row + i, b = a + 1, c = a + row, d = c + 1
    indices.push(...(side ? [a, c, b, b, c, d] : [a, b, c, b, d, c]))
  }
  // Join root/tip and both edges so metal has closed, well-lit edges.
  for (const j of [0, spanSteps]) for (let i = 0; i < chordSteps; i++) {
    const a = j * row + i, b = a + 1
    indices.push(a, a + layer, b, b, a + layer, b + layer)
  }
  for (const i of [0, chordSteps]) for (let j = 0; j < spanSteps; j++) {
    const a = j * row + i, b = a + row
    indices.push(a, b, a + layer, b, b + layer, a + layer)
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

export function shellGeometry(profile: readonly (readonly [number, number])[], cutaway = true) {
  return new T.LatheGeometry(profile.map(([x, r]) => new T.Vector2(r, x)), 80, cutaway ? Math.PI * .29 : 0, cutaway ? Math.PI * 1.42 : Math.PI * 2)
}

export const CORE_PROFILE: [number, number][] = [
  [-3.7, .84], [-3, .92], [-1.8, .89], [-.5, .82], [.1, .89], [1.25, .91], [1.8, .88],
  [3, .98], [3.7, .9], [4.4, .68], [4.5, .67], [3.7, .85], [3, .93], [1.8, .83], [1.25, .86], [.1, .84], [-.5, .77], [-1.8, .84], [-3, .87], [-3.7, .79], [-3.7, .84],
]
export const NACELLE_PROFILE: [number, number][] = [
  [-5.1, 2.06], [-5.24, 2.12], [-5.16, 2.24], [-4.8, 2.37], [-3.7, 2.4], [-2.3, 2.26], [-.4, 1.91], [1.9, 1.49], [2.5, 1.29],
  [2.5, 1.25], [1.9, 1.44], [-.4, 1.84], [-2.3, 2.17], [-3.7, 2.29], [-4.8, 2.25], [-5.04, 2.13], [-5.1, 2.06],
]
