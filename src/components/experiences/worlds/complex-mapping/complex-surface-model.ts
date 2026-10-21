import { complexFunctionById } from './complex-mapping-model'
import type { Complex, ComplexFnId } from './complex-mapping-model'

export type SurfaceComponent = 're' | 'im' | 'abs'

export type SurfaceOptions = {
  component?: SurfaceComponent
  heightClip?: number
  poleRadius?: number
}

export type SurfaceSample = {
  input: Complex
  value: Complex
  x: number
  y: number
  z: number
  height: number
  magnitude: number
  phase: number
  phaseDefined: boolean
  visible: boolean
  reason: 'pole' | 'non-finite' | 'height-clip' | null
}

export const SURFACE_DEFAULT_HEIGHT_CLIP = 3.8
export const SURFACE_DEFAULT_POLE_RADIUS = 0.085

export function distanceToSurfacePole(id: ComplexFnId, input: Complex): number {
  if (id === 'inv') return Math.hypot(input.re, input.im)
  if (id === 'zeta') return Math.hypot(input.re - 1, input.im)
  if (id !== 'tan') return Infinity
  const nearestPole = Math.PI / 2 + Math.round((input.re - Math.PI / 2) / Math.PI) * Math.PI
  return Math.hypot(input.re - nearestPole, input.im)
}

export function sampleComplexSurface(
  id: ComplexFnId,
  input: Complex,
  options: SurfaceOptions = {},
): SurfaceSample {
  const { component = 're', heightClip = SURFACE_DEFAULT_HEIGHT_CLIP, poleRadius = SURFACE_DEFAULT_POLE_RADIUS } = options
  if (!Number.isFinite(heightClip) || heightClip <= 0) throw new RangeError('heightClip must be finite and positive')
  if (!Number.isFinite(poleRadius) || poleRadius < 0) throw new RangeError('poleRadius must be finite and non-negative')

  const value = complexFunctionById(id).apply(input)
  const magnitude = Math.hypot(value.re, value.im)
  const height = component === 'abs' ? magnitude : value[component]
  const finite = [input.re, input.im, value.re, value.im, height].every(Number.isFinite)
  const phaseDefined = finite && magnitude > 0
  const phase = phaseDefined ? Math.atan2(value.im, value.re) : 0
  const nearPole = distanceToSurfacePole(id, input) <= poleRadius
  const reason = nearPole ? 'pole' : !finite ? 'non-finite' : Math.abs(height) > heightClip ? 'height-clip' : null

  // Clipped samples keep their actual height so the renderer cannot turn the cut into a false plateau.
  return {
    input: { ...input }, value,
    x: input.re, y: height, z: input.im,
    height, magnitude, phase, phaseDefined,
    visible: reason === null, reason,
  }
}

export type SurfaceGridOptions = SurfaceOptions & {
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  xSteps?: number
  ySteps?: number
}

export type SurfaceGrid = {
  points: Array<SurfaceSample>
  width: number
  depth: number
}

export function sampleSurfaceGrid(id: ComplexFnId, options: SurfaceGridOptions = {}): SurfaceGrid {
  const {
    xMin = -Math.PI, xMax = Math.PI, yMin = -Math.PI, yMax = Math.PI,
    xSteps = 120, ySteps = 120,
  } = options
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite) || xMin >= xMax || yMin >= yMax) {
    throw new RangeError('Surface bounds must be finite and increasing')
  }
  if (![xSteps, ySteps].every((steps) => Number.isInteger(steps) && steps > 0 && steps <= 1024)) {
    throw new RangeError('Surface steps must be integers between 1 and 1024')
  }
  const points: Array<SurfaceSample> = []
  for (let row = 0; row <= ySteps; row += 1) {
    const im = yMin + (yMax - yMin) * row / ySteps
    for (let column = 0; column <= xSteps; column += 1) {
      const re = xMin + (xMax - xMin) * column / xSteps
      points.push(sampleComplexSurface(id, { re, im }, options))
    }
  }
  return { points, width: xSteps + 1, depth: ySteps + 1 }
}
