import { getThylakoidDimensions } from './chloro-model'
import { evaluatePhotosynthesis } from './model'

/** Nanometres in the membrane frame. +Y is the stroma; −Y is the lumen. */
export const MOLECULAR_ATP_ANCHOR_NM = [28, 0, 116] as const
export const MOTOR_STOICHIOMETRY = { protonsPerRevolution: 14, atpPerRevolution: 3, protonsPerATP: 14 / 3 } as const
export const MOLECULAR_DEFAULT_TIME_SCALE = 0.001
export const ATP_GROUPS = { rotor: 0, alpha: 1, beta: 2, statorArm: 3, subunitA: 4, ligand: 5 } as const

export function isRotorGroup(group: number) { return group === ATP_GROUPS.rotor }

/** Counts are illustrative flux coupling, not a measured spinach rotation curve.
 * Maximal 100 rev/s is an order-of-magnitude reference; SOURCES records this.
 * The electronic chain runs at 1/1000. The motor has its own explicit local
 * slow motion to resolve 14 proton steps and three ATP releases per turn.
 */
export function getMolecularReadings(light: number, scale = -7.5, timeScale = MOLECULAR_DEFAULT_TIME_SCALE, playing = true) {
  const activity = Math.max(0, Math.min(1, evaluatePhotosynthesis(light).grossAssimilation / evaluatePhotosynthesis(2000).grossAssimilation))
  const actualRps = light > 0 ? 100 * activity : 0
  const requestedSpeed = Math.max(0, Number.isFinite(timeScale) ? timeScale : MOLECULAR_DEFAULT_TIME_SCALE) / MOLECULAR_DEFAULT_TIME_SCALE
  const motorRate = actualRps > 0 ? Math.min(actualRps, 1 / (6 - 3 * activity)) : 0
  const displayRps = playing ? Math.min(2, motorRate * requestedSpeed) : 0
  const dimensions = getThylakoidDimensions(light)
  return {
    actualRps, displayRps, activity, slowdown: displayRps > 0 ? actualRps / displayRps : 0,
    electronSlowdown: requestedSpeed > 0 ? 1000 / requestedSpeed : 0,
    membraneNm: dimensions.membrane * 1000, lumenNm: dimensions.lumen * 1000,
    partitionNm: dimensions.partition * 1000, repeatNm: dimensions.repeat * 1000,
    protonsPerRevolution: 14, atpPerRevolution: 3, protonsPerATP: 14 / 3,
    darkLocked: light <= 0, motorView: scale <= -7.3,
    motionCapped: motorRate * requestedSpeed > 2,
  }
}

export type MotorState = { revolutions: number; angle: number; protons: number; atp: number }
export function createMotorState(): MotorState { return { revolutions: 0, angle: 0, protons: 0, atp: 0 } }

/** Positive right-handed rotation about +Y is counterclockwise from the stroma.
 * A short eased stroke after each dwell makes c14 steps legible. The three
 * catalytic events are placed at equal 120° intervals as a visual abstraction.
 */
export function advanceMotor(state: MotorState, elapsedSeconds: number, displayRps: number): MotorState {
  const delta = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  const rate = Number.isFinite(displayRps) ? Math.max(0, displayRps) : 0
  if (rate === 0 || delta === 0) return state
  const revolutions = state.revolutions + delta * rate
  const step = revolutions * 14, fraction = step - Math.floor(step)
  const stroke = Math.max(0, Math.min(1, (fraction - 0.55) / 0.45))
  const eased = stroke * stroke * (3 - 2 * stroke)
  return { revolutions, angle: (Math.floor(step) + eased) * Math.PI * 2 / 14, protons: Math.floor(step + 1e-9), atp: Math.floor(revolutions * 3 + 1e-9) }
}

export type ProteinZone = 'appressed' | 'margin' | 'lamella' | 'outer-face'
export function canOccupyMembrane(pdb: string, zone: ProteinZone) {
  return !(['5L8R', '6FKF'].includes(pdb.toUpperCase()) && zone === 'appressed')
}

/** van der Waals radii in nm, native atomic numbers from the offline PDB pack. */
export function atomRadiusNm(element: number) {
  return ({ 6: 0.17, 7: 0.155, 8: 0.152, 15: 0.18, 16: 0.18, 12: 0.173, 26: 0.156, 25: 0.161, 20: 0.231, 29: 0.14, 17: 0.175 } as Record<number, number>)[element] ?? 0.17
}

export type MolecularPoint = [number, number, number]
export type ProteinPose = { position: MolecularPoint; rotation?: MolecularPoint; scale?: number; phase?: number; zone?: ProteinZone; layer?: number; lower?: boolean }
export type MembranePdb = '3JCU' | '1RWT' | '6RQF'
export const PACKING_PATCH_NM = { minX: -85, maxX: 85, minZ: -42, maxZ: 63 } as const

/** Identical repeatable patch on both faces. These are placements, not an EM
 * reconstruction. Its occupied area is tested against the deposited surface
 * silhouettes at 0.5 nm resolution, rather than inferred from protein count. */
export function createAppressedPatch(): Record<MembranePdb, ProteinPose[]> {
  const result: Record<MembranePdb, ProteinPose[]> = { '3JCU': [], '1RWT': [], '6RQF': [] }
  for (let row = -2; row <= 2; row++) for (let col = -4; col <= 4; col++) {
    const x = col * 21.5, z = row * 26.5
    result['3JCU'].push({ position: [x, 0, z], rotation: [0, 0, 0], zone: 'appressed' })
    result['1RWT'].push({ position: [x + 10.75, 0, z + 13.25], rotation: [0, Math.PI / 3, 0], zone: 'appressed' })
    if ((col + row + 6) % 3 === 0) result['6RQF'].push({ position: [x + 10.75, 0, z], rotation: [0, Math.PI / 2, 0], zone: 'appressed' })
  }
  return result
}

export interface ProteinFootprint { step: number; minX: number; minZ: number; width: number; depth: number; cells: Uint8Array }
/** Rasterizes the projected deposited molecular surface onto the membrane. This
 * retains pores and irregular outlines and measures the rendered Gaussian
 * surface, not a bounding ellipse. This is projected areal occupancy, not a
 * lipid-volume fraction. Union coverage avoids double counting. */
export function molecularFootprint(positions: ArrayLike<number>, indices: ArrayLike<number>, step = .5): ProteinFootprint {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) { minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]); minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]) }
  minX = Math.floor(minX / step) * step; minZ = Math.floor(minZ / step) * step
  const width = Math.ceil((maxX - minX) / step) + 1, depth = Math.ceil((maxZ - minZ) / step) + 1, cells = new Uint8Array(width * depth)
  const cross = (a: MolecularPoint, b: MolecularPoint, x: number, z: number) => (b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [0, 1, 2].map(k => { const p = indices[i + k] * 3; return [positions[p], positions[p + 1], positions[p + 2]] as MolecularPoint })
    const poly = triangle
    for (let j = 1; j + 1 < poly.length; j++) {
      const a = poly[0], b = poly[j], c = poly[j + 1]
      const area = cross(a, b, c[0], c[2]); if (Math.abs(area) < 1e-8) continue
      const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0], c[0]) - minX) / step)), x1 = Math.min(width - 1, Math.ceil((Math.max(a[0], b[0], c[0]) - minX) / step))
      const z0 = Math.max(0, Math.floor((Math.min(a[2], b[2], c[2]) - minZ) / step)), z1 = Math.min(depth - 1, Math.ceil((Math.max(a[2], b[2], c[2]) - minZ) / step))
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const px = minX + (x + .5) * step, pz = minZ + (z + .5) * step
        if (cross(a, b, px, pz) * area >= 0 && cross(b, c, px, pz) * area >= 0 && cross(c, a, px, pz) * area >= 0) cells[z * width + x] = 1
      }
    }
  }
  return { step, minX, minZ, width, depth, cells }
}

export function measureAppressedCoverage(footprints: Record<MembranePdb, ProteinFootprint>) {
  const patch = createAppressedPatch(), step = .5
  let occupied = 0, overlapping = 0, total = 0
  for (let z = PACKING_PATCH_NM.minZ + step / 2; z < PACKING_PATCH_NM.maxZ; z += step) for (let x = PACKING_PATCH_NM.minX + step / 2; x < PACKING_PATCH_NM.maxX; x += step) {
    let hits = 0
    for (const id of ['3JCU', '1RWT', '6RQF'] as const) for (const pose of patch[id]) {
      const angle = pose.rotation?.[1] ?? 0, dx = x - pose.position[0], dz = z - pose.position[2], f = footprints[id]
      const u = Math.floor((Math.cos(angle) * dx - Math.sin(angle) * dz - f.minX) / f.step), v = Math.floor((Math.sin(angle) * dx + Math.cos(angle) * dz - f.minZ) / f.step)
      if (u >= 0 && u < f.width && v >= 0 && v < f.depth && f.cells[v * f.width + u]) hits++
    }
    total++; if (hits) occupied++; if (hits > 1) overlapping++
  }
  return { coverage: occupied / total, overlap: overlapping / total, resolutionNm: step, areaNm2: total * step * step }
}
