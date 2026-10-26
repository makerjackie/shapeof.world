export type Vec3 = [number, number, number]
export type FieldId = 'temperature' | 'heat' | 'soot' | 'fuel' | 'air' | 'speed' | 'vorticity' | 'age'
export type Slice = { enabled: boolean; horizontal: boolean; offset: number; field: FieldId; opacity: number; cut: boolean; ambient: boolean }
export type Camera = { pos: number[]; fwd: number[]; right: number[]; up: number[]; fovY: number }
// Five samples of the public-domain Inferno map (Smith & van der Walt, 2015).
export const HEAT_COLORS = ['#000004', '#57106e', '#bc3754', '#f98e09', '#fcffa4']
export const COOL_COLORS = ['#101b2c', '#254f79', '#358aa1', '#7ecbbb', '#edf8d4']
export const FIELDS: { id: FieldId; label: string; unit: string; min: number; max: number; colors: string[] }[] = [
  { id: 'temperature', label: '温度', unit: 'K', min: 293, max: 1800, colors: HEAT_COLORS },
  { id: 'heat', label: '放热 · 燃烧升温率', unit: 'K/s', min: 0, max: 15000, colors: HEAT_COLORS },
  { id: 'soot', label: '烟炱', unit: 'ppm', min: 0, max: 1, colors: COOL_COLORS },
  { id: 'fuel', label: '燃料气', unit: '%', min: 0, max: 15, colors: COOL_COLORS },
  { id: 'air', label: '可用空气（含氧）', unit: '%', min: 0, max: 100, colors: COOL_COLORS },
  { id: 'speed', label: '速度', unit: 'm/s', min: 0, max: 6, colors: COOL_COLORS },
  { id: 'age', label: '气体年龄', unit: 'ms', min: 0, max: 200, colors: COOL_COLORS },
  { id: 'vorticity', label: '涡量', unit: 's⁻¹', min: 0, max: 100, colors: COOL_COLORS },
]
export const INITIAL_SLICE: Slice = { enabled: false, horizontal: false, offset: 0, field: 'temperature', opacity: 1, cut: true, ambient: false }
export type Reading = {
  position: Vec3; time: number; temperature: number; celsius: number; fuel: number; air: number;
  oxygenMassEstimate: number; soot: number; heatingRate: number; thermalPowerDensityEstimate: number;
  velocity: Vec3; speed: number; vorticity: number; age: number | null; solid: boolean; coTag: number; smoke: number;
}
export function decodeSample(raw: ArrayLike<number>, position: Vec3, time: number, dx: number): Reading {
  const temperature = 293 + raw[0] * 1000
  const air = Math.max(0, Math.min(1, 1 - raw[1] - raw[4]))
  const velocity: Vec3 = [raw[8], raw[9], raw[10]]
  const z = raw[1] + raw[4]
  return { position, time, temperature, celsius: temperature - 273.15, fuel: raw[1], air,
    oxygenMassEstimate: .232 * air, soot: raw[2], heatingRate: raw[3] * 10000,
    // Matches upstream profile(): rho*cp*q with rho*cp = 354800/T; thermal proxy, NOT chemical HRR.
    thermalPowerDensityEstimate: 354800 / temperature * raw[3] * 10000,
    velocity, speed: Math.hypot(...velocity), vorticity: Math.hypot(raw[12], raw[13], raw[14]) / dx,
    age: z > 1e-4 ? raw[5] / z : null, solid: raw[18] > .5, coTag: raw[7], smoke: raw[6] }
}
export function explainReading(r: Reading): string {
  if (r.solid) return '这里是木柴。气体网格不测量木头内部的温度。'
  if (r.temperature < 400 && r.heatingRate < 100) return '周围的空气。燃料很少，几乎没有燃烧放热。'
  if (r.heatingRate > 500 && r.soot < .015) return '这里正在燃烧，但烟炱很少。蓝光不需要炽热的烟炱。'
  if (r.heatingRate > 500) return '燃料和空气在这里相遇，反应正在释放热量。'
  if (r.air < .08 && r.fuel > .01) return '这里燃料较多、可用空气少，燃烧受到供氧限制。'
  if (r.soot > .025 && r.temperature > 1000) return '这里的烟炱正在发光。亮度还取决于颗粒多少和视线厚度。'
  if (r.temperature > 500) return '热气仍在流动，但这里的燃烧放热已较弱。'
  return '气体正在与周围空气混合、冷却。'
}
export function slicePoint(camera: Camera, u: number, v: number, aspect: number, slice: Slice): Vec3 | null {
  const t = Math.tan(camera.fovY / 2)
  const ray = camera.fwd.map((x, i) => x + camera.right[i] * (u * 2 - 1) * t * aspect + camera.up[i] * (1 - v * 2) * t)
  const axis = slice.horizontal ? 1 : 2
  if (Math.abs(ray[axis]) < 1e-6) return null
  const d = (slice.offset - camera.pos[axis]) / ray[axis]
  if (d <= 0) return null
  const p = camera.pos.map((x, i) => x + ray[i] * d) as Vec3
  return p[0] >= -.6 && p[0] <= .6 && p[1] >= 0 && p[1] <= 1.8 && p[2] >= -.6 && p[2] <= .6 ? p : null
}
export function projectPoint(camera: Camera, p: Vec3, aspect: number): [number, number] | null {
  const delta = p.map((x, i) => x - camera.pos[i])
  const dot = (a: number[]) => a.reduce((sum, x, i) => sum + x * delta[i], 0)
  const depth = dot(camera.fwd)
  if (depth <= 0) return null
  const s = depth * Math.tan(camera.fovY / 2)
  return [.5 + dot(camera.right) / (2 * s * aspect), .5 - dot(camera.up) / (2 * s)]
}
