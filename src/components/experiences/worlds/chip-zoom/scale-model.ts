/** Log10 of the horizontal orthographic field of view in metres. */
export const STAGES = [
  { id: 'phone', label: '手机', field: .29, width: .072, mark: '15 cm' },
  { id: 'package', label: '封装', field: .028, width: .014, mark: '14 mm' },
  { id: 'die', label: '硅片', field: .016, width: .008, mark: '8 mm' },
  { id: 'layers', label: '开放电路', field: .00034, width: .00015, mark: '150 μm' },
  { id: 'cell', label: '标准单元', field: .0000065, width: .00000176, mark: '1.76 μm' },
  { id: 'transistor', label: '晶体管', field: .0000008, width: .0000005, mark: '示意' },
  { id: 'atoms', label: '原子', field: .000000005, width: .0000000021724, mark: '0.543 nm' },
] as const
export type Stage = typeof STAGES[number]['id']
export type TransistorKind = 'planar' | 'fin' | 'gaa'
export const SCALES = STAGES.map(stage => Math.log10(stage.field))
export const SCALE_MAX = SCALES[0]
export const SCALE_MIN = SCALES.at(-1)!
export const clampScale = (s: number) => Number.isFinite(s) ? Math.max(SCALE_MIN, Math.min(SCALE_MAX, s)) : SCALE_MAX
export const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export function stageIndex(scale: number) {
  let nearest = 0
  for (let i = 1; i < SCALES.length; i++) if (Math.abs(SCALES[i] - scale) < Math.abs(SCALES[nearest] - scale)) nearest = i
  return nearest
}
export function stageWeight(index: number, scale: number) {
  const enter = index === 0 ? 1 : smooth(SCALES[index - 1], SCALES[index], scale)
  const leave = index === SCALES.length - 1 ? 1 : 1 - smooth(SCALES[index], SCALES[index + 1], scale)
  return enter * leave
}
export function formatLength(metres: number) {
  const [factor, suffix] = metres >= .01 ? [100, 'cm'] : metres >= .001 ? [1e3, 'mm'] : metres >= 1e-6 ? [1e6, 'μm'] : [1e9, 'nm']
  return `${Number((metres * factor).toPrecision(3))} ${suffix}`
}
export function ruler(scale: number, pixelWidth: number) {
  const field = 10 ** scale, target = field * .22
  const decade = 10 ** Math.floor(Math.log10(target))
  const length = [1, 2, 5].map(n => n * decade).filter(n => n <= target).at(-1) ?? decade
  return { label: formatLength(length), pixels: pixelWidth * length / field }
}
/** Diamond cubic: FCC basis plus (1/4,1/4,1/4), cropped to a 4-cell cube. */
export function siliconLattice(cells = 4) {
  const basis = [[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0],[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]]
  const atoms: [number, number, number][] = []
  for (let x=0;x<cells;x++) for (let y=0;y<cells;y++) for (let z=0;z<cells;z++) for(const b of basis) atoms.push([(x+b[0]-cells/2)*2.5,(y+b[1]-cells/2)*2.5,(z+b[2]-cells/2)*2.5])
  const bonds: [number,number][] = []
  for (let a=0;a<atoms.length;a++) for(let b=a+1;b<atoms.length;b++) {
    const d=atoms[a].reduce((sum,v,k)=>sum+(v-atoms[b][k])**2,0)
    if(Math.abs(d-3*2.5**2/16)<1e-5) bonds.push([a,b])
  }
  return { atoms, bonds }
}

/** Fit each sample to the actual canvas without changing the navigation coordinate.
 * The physical field readout includes this continuous, aspect-dependent margin.
 */
export function fittedFieldScale(scale: number, aspect: number) {
  const heights = [.16, .018, .009, .00018, .0000035, .0000003, .0000000034]
  return scale + STAGES.reduce((sum, stage, i) => sum + stageWeight(i, scale) * Math.max(0, Math.log10(heights[i] * aspect * 1.12 / stage.field)), 0)
}
