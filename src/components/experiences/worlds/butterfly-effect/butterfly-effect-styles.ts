/**
 * 蝴蝶效应世界的视觉风格系统：同一只吸引子，几种看数学之美的方式。
 * 纯数据 + 纯函数（不依赖 three.js），材质装配在组件侧完成。
 *
 * - ember     余烬：粒子拖尾，速度着色的发光余烬，默认的电影感霓虹
 * - aurora    极光：粒子拖尾，靛青 → 青绿的冷色光带
 * - spectrum  光谱：粒子拖尾，按空间位置绕色环，直接读出几何结构
 * - silk      流光：连续丝线而非粒子——一根被速度点燃的发光线
 * - blueprint 蓝图：藏青底上的工程线稿，极坐标网格打底，冷静克制
 */

import type { AttractorDef, Vec3 } from './butterfly-effect-model'

export type VisualStyleId = 'ember' | 'aurora' | 'spectrum' | 'silk' | 'blueprint'

export type Rgb = [number, number, number]

export type VisualStyle = {
  id: VisualStyleId
  /** 中文名（tx key）与英文名 */
  name: string
  nameEn: string
  /** 舞台背景色 */
  background: string
  /** Bloom 强度（0 = 关闭辉光） */
  bloom: number
  /** 加法混合（暗底发光）还是普通混合 */
  additive: boolean
  trailOpacity: number
  trailSize: number
  /** true 时隐藏粒子拖尾，改用连续丝线（THREE.Line） */
  lines?: boolean
  /** true 时显示极坐标网格（工程图底色） */
  grid?: boolean
  /** A/B 彗星头与彗尾的颜色 */
  headA: Rgb
  headB: Rgb
  /** 双胞胎连线的 CSS 颜色 */
  tether: string
  /**
   * 拖尾/丝线着色：输入当前世界坐标与瞬时速度，输出 RGB。
   * twin 用于需要区分两条轨迹的风格（如光谱里 B 降亮度）。
   */
  color: (def: AttractorDef, w: Vec3, speed: number, twin: 'a' | 'b') => Rgb
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** 与初版一致的速度归一：|v| 开平方后落到 [speedLo, speedHi]。 */
function speedT(def: AttractorDef, v: number): number {
  const lo = Math.sqrt(def.speedLo)
  const hi = Math.sqrt(def.speedHi)
  return clamp01((Math.sqrt(v) - lo) / (hi - lo))
}

type Ramp = Array<[number, Rgb]>

function ramp(stops: Ramp, t: number): Rgb {
  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1]
      const [t1, c1] = stops[i]
      const k = (t - t0) / (t1 - t0)
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k]
    }
  }
  return stops[stops.length - 1][1]
}

/** h ∈ [0,1), s/l ∈ [0,1] → RGB（各通道 0–1）。 */
export function hsl(h: number, s: number, l: number): Rgb {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]
}

/** 余烬：翼尖徘徊处暗红，穿越中心的热流白金色（初版配色）。 */
const EMBER_STOPS: Ramp = [
  [0, [0.14, 0.04, 0.19]],
  [0.38, [0.62, 0.13, 0.36]],
  [0.72, [1.0, 0.46, 0.17]],
  [1, [1.0, 0.94, 0.8]],
]

/** 极光：深靛 → 青 → 翠绿 → 近白的极地光带。 */
const AURORA_STOPS: Ramp = [
  [0, [0.05, 0.07, 0.3]],
  [0.35, [0.06, 0.4, 0.58]],
  [0.7, [0.22, 0.9, 0.6]],
  [1, [0.82, 1.0, 0.9]],
]

/** 流光 A：慢处紫晶，快处白金的火线。 */
const SILK_A_STOPS: Ramp = [
  [0, [0.28, 0.1, 0.42]],
  [0.5, [0.85, 0.3, 0.5]],
  [1, [1.0, 0.9, 0.62]],
]

/** 流光 B：冰蓝对照组，亮度压一档。 */
const SILK_B_STOPS: Ramp = [
  [0, [0.08, 0.2, 0.38]],
  [0.5, [0.25, 0.55, 0.85]],
  [1, [0.65, 0.92, 1.0]],
]

/** 蓝图 A：白到工程青。 */
const BLUEPRINT_A_STOPS: Ramp = [
  [0, [0.16, 0.38, 0.58]],
  [1, [0.88, 0.96, 1.0]],
]

/** 蓝图 B：更暗一档的纯青。 */
const BLUEPRINT_B_STOPS: Ramp = [
  [0, [0.1, 0.26, 0.44]],
  [1, [0.42, 0.78, 0.88]],
]

export const VISUAL_STYLES: Record<VisualStyleId, VisualStyle> = {
  ember: {
    id: 'ember',
    name: '余烬',
    nameEn: 'Ember',
    background: '#04050a',
    bloom: 1.05,
    additive: true,
    trailOpacity: 0.95,
    trailSize: 0.03,
    headA: [1.0, 0.78, 0.4],
    headB: [0.45, 0.9, 1.0],
    tether: '#ffffff',
    color: (def, _w, v) => ramp(EMBER_STOPS, speedT(def, v)),
  },
  aurora: {
    id: 'aurora',
    name: '极光',
    nameEn: 'Aurora',
    background: '#020713',
    bloom: 1.18,
    additive: true,
    trailOpacity: 0.95,
    trailSize: 0.032,
    headA: [0.55, 1.0, 0.8],
    headB: [0.8, 0.62, 1.0],
    tether: '#b8fff0',
    color: (def, _w, v) => ramp(AURORA_STOPS, speedT(def, v)),
  },
  spectrum: {
    id: 'spectrum',
    name: '光谱',
    nameEn: 'Spectrum',
    background: '#050511',
    bloom: 0.85,
    additive: true,
    trailOpacity: 0.9,
    trailSize: 0.03,
    headA: [1.0, 1.0, 1.0],
    headB: [1.0, 0.85, 0.45],
    tether: '#e8e4ff',
    color: (_def, w, _v, twin) => {
      // 绕竖轴的方位角决定色相，高度做轻微偏移——颜色直接对应空间位置，
      // 双翼、环带、分层会以色块的形式显形。B 轨迹降亮度以保持可分辨。
      const angle = Math.atan2(w.z, w.x) / (Math.PI * 2) + 0.5
      const height = clamp01(w.y / 4.5 + 0.5)
      const hue = (angle * 0.85 + height * 0.15) % 1
      const [r, g, b] = hsl(hue, 0.85, 0.58)
      const dim = twin === 'b' ? 0.5 : 1
      return [r * dim, g * dim, b * dim]
    },
  },
  silk: {
    id: 'silk',
    name: '流光',
    nameEn: 'Silk',
    background: '#03040c',
    bloom: 1.3,
    additive: true,
    trailOpacity: 0.9,
    trailSize: 0.03,
    lines: true,
    headA: [1.0, 0.85, 0.5],
    headB: [0.5, 0.8, 1.0],
    tether: '#ffe9c4',
    color: (def, _w, v, twin) => ramp(twin === 'b' ? SILK_B_STOPS : SILK_A_STOPS, speedT(def, v)),
  },
  blueprint: {
    id: 'blueprint',
    name: '蓝图',
    nameEn: 'Blueprint',
    background: '#0a1a2e',
    bloom: 0.15,
    additive: false,
    trailOpacity: 0.9,
    trailSize: 0.03,
    lines: true,
    grid: true,
    headA: [0.92, 0.97, 1.0],
    headB: [0.45, 0.8, 0.9],
    tether: '#7fb8d8',
    color: (def, _w, v, twin) => ramp(twin === 'b' ? BLUEPRINT_B_STOPS : BLUEPRINT_A_STOPS, speedT(def, v)),
  },
}

export const VISUAL_STYLE_ORDER: Array<VisualStyleId> = ['ember', 'aurora', 'spectrum', 'silk', 'blueprint']

export const DEFAULT_STYLE: VisualStyleId = 'ember'

export function isVisualStyleId(value: string | null): value is VisualStyleId {
  return (
    value === 'ember' || value === 'aurora' || value === 'spectrum' || value === 'silk' || value === 'blueprint'
  )
}
