/** Local coordinates and every length in this module are micrometres. */
export const CHLOROPLAST_RADII = [3, 1.9, 1.15] as const
export const GRANUM_REPEAT_UM = 0.018
export type ChloroplastPoint = readonly [number, number, number]
export type Granum = {
  id: string
  center: ChloroplastPoint
  radius: number
  layers: number
  phase: number
}

/** The deepest camera enters a deliberately unobstructed, reproducible section. */
export const ENTRY_GRANUM: Granum = {
  id: 'entry-granum', center: [0.75, -0.82, 0.12], radius: 0.235, layers: 22, phase: 0,
}
export const GRANUM_SECTION_Y = ENTRY_GRANUM.center[1] - ENTRY_GRANUM.radius * 0.58
export const GRANUM_SECTION_ANCHOR_LOCAL: ChloroplastPoint = [ENTRY_GRANUM.center[0], GRANUM_SECTION_Y, ENTRY_GRANUM.center[2]]

export const STARCH_LENSES = [
  { center: [-1.3, -0.46, 0.18] as ChloroplastPoint, radii: [0.72, 0.43, 0.105] as ChloroplastPoint, angle: 0.32 },
  { center: [1.1, 0.64, -0.2] as ChloroplastPoint, radii: [0.56, 0.32, 0.085] as ChloroplastPoint, angle: -0.4 },
  { center: [-0.1, 0.95, 0.35] as ChloroplastPoint, radii: [0.36, 0.25, 0.07] as ChloroplastPoint, angle: 0.2 },
]

/** Kirchhoff et al., PNAS 2011, Fig. 1: Arabidopsis at dark / 500 µmol m⁻² s⁻¹.
 * This illustrative equilibrium interpolation is not a measured spinach response.
 * R = 2M + L + P is preserved; membrane and partition thickness also change.
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC3250138/
 */
export function getThylakoidDimensions(light = 400) {
  const fraction = Math.max(0, Math.min(1, Number.isFinite(light) ? light / 500 : 0.8))
  const adaptation = fraction * fraction * (3 - 2 * fraction)
  const membrane = (4 - 0.7 * adaptation) / 1000
  const lumen = (4.7 + 4.5 * adaptation) / 1000
  const partition = (3.6 - 0.3 * adaptation) / 1000
  return { membrane, lumen, partition, repeat: 2 * membrane + lumen + partition, adaptation }
}

export function chloroplastRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function createChloroplastMorphology() {
  const random = chloroplastRandom(623014)
  const grana: Granum[] = [ENTRY_GRANUM]
  for (let attempt = 0; grana.length < 50 && attempt < 25000; attempt++) {
    const x = (random() * 2 - 1) * 2.54
    const y = (random() * 2 - 1) * 1.46
    const radius = 0.155 + random() * 0.07
    if ((x / 2.65) ** 2 + (y / 1.62) ** 2 > 1) continue
    // Keep the foreground of the selected section open to the incoming camera.
    if (y < ENTRY_GRANUM.center[1] && Math.abs(x - ENTRY_GRANUM.center[0]) < 0.43) continue
    if (STARCH_LENSES.some(({ center, radii }) => ((x - center[0]) / (radii[0] + 0.07)) ** 2 + ((y - center[1]) / (radii[1] + 0.07)) ** 2 < 1)) continue
    if (grana.some((other) => Math.hypot(x - other.center[0], y - other.center[1]) < radius + other.radius + 0.025)) continue
    const z = (random() - 0.5) * 0.12
    const layers = 5 + Math.floor(random() * 21)
    const top = Math.abs(z) + layers * 0.0191 / 2
    // Check the stack's perimeter and height, not just its centre, against the lens.
    if (Array.from({ length: 16 }, (_, i) => i * Math.PI / 8).some((angle) => ((x + Math.cos(angle) * radius) / 3) ** 2 + ((y + Math.sin(angle) * radius) / 1.9) ** 2 + (top / 1.15) ** 2 > 0.98)) continue
    grana.push({ id: `granum-${grana.length}`, center: [x, y, z], radius, layers, phase: random() * Math.PI * 2 })
  }
  const connections: [number, number][] = []
  const connected = new Set<string>()
  grana.forEach((granum, index) => {
    const nearest = grana.map((other, i) => ({ i, distance: Math.hypot(granum.center[0] - other.center[0], granum.center[1] - other.center[1]) }))
      .filter(({ i }) => i !== index).sort((a, b) => a.distance - b.distance).slice(0, 2)
    for (const other of nearest) {
      const pair: [number, number] = [Math.min(index, other.i), Math.max(index, other.i)]
      if (!connected.has(pair.join(':'))) { connections.push(pair); connected.add(pair.join(':')) }
    }
  })
  return { grana, connections }
}
