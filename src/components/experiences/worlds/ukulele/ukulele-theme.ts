// Two looks for the same instrument. A theme is pure data: the 3D scene, the post grade and the canvas
// HUD all read from the current one, and switching is instant at runtime.

export type ThemeId = 'amber' | 'neon'

type Pair = readonly [color: number, intensity: number]

export type Theme = {
  id: ThemeId
  /** Chinese label; the interface translates it with `tx()`. */
  label: string
  bg: number
  fog: number
  fogDensity: number
  env: { key: Pair; rim: Pair; top: Pair; bounce: Pair; bg: number }
  hemi: readonly [sky: number, ground: number, intensity: number]
  key: Pair
  fill: Pair
  rim: Pair
  inner: number
  topTint: number
  woodTint: number
  table: number
  tableEnv: number
  tableRough: number
  string: number
  stringGlow: number
  /** Per string G C E A: halo, fret glow, sparks. */
  strings: ReadonlyArray<string>
  fret: number
  pool: number
  ripple: number
  note: number
  bokeh: { hues: ReadonlyArray<number>; spread: number; sat: number }
  mote: number
  grid: boolean
  post: {
    shadow: readonly [number, number, number]
    sat: number
    high: readonly [number, number, number]
    ca: number
    bloom: number
    threshold: number
    vig: number
  }
  hud: {
    /** r,g,b triplets for canvas rgba() strings */
    accent: string
    ink: string
    dim: string
    paper: string
    note: string
    noteInk: string
    hotInk: string
    /** Canvas font for chord names; `{s}` is replaced by the pixel size. Only fonts the site already loads. */
    chordFont: string
    perString: boolean
  }
}

export const THEMES: Record<ThemeId, Theme> = {
  // warm wood under a tungsten softbox
  amber: {
    id: 'amber',
    label: '琥珀',
    bg: 0x070504,
    fog: 0x0a0604,
    fogDensity: 0.9,
    env: { key: [0xffd9a8, 2.6], rim: [0xffc488, 2.2], top: [0xffb878, 0.35], bounce: [0xc87a3c, 0.25], bg: 0x070402 },
    hemi: [0xffe0b8, 0x1b0e07, 0.12],
    key: [0xffdcae, 1.35],
    fill: [0xffc88a, 0.12],
    rim: [0xffd8a8, 0.3],
    inner: 0xff8a3a,
    topTint: 0xffffff,
    woodTint: 0xffffff,
    table: 0x140e0a,
    tableEnv: 0.2,
    tableRough: 0.8,
    string: 0xf4ecd8,
    stringGlow: 0xffd08a,
    strings: ['#ffb35c', '#ffb35c', '#ffb35c', '#ffb35c'],
    fret: 0xff9a40,
    pool: 0xff9a52,
    ripple: 0xffbe78,
    note: 0xffcc80,
    bokeh: { hues: [0.07], spread: 0.05, sat: 0.75 },
    mote: 0xffd99a,
    grid: false,
    post: { shadow: [0.02, 0.01, 0.003], sat: 1.1, high: [1, 1, 1], ca: 0, bloom: 0.55, threshold: 0.9, vig: 0.38 },
    hud: { accent: '240,160,80', ink: '243,207,166', dim: '201,171,134', paper: '16,10,7', note: '26,18,12', noteInk: '#f5e6cf', hotInk: '#1a0e06', chordFont: "italic 500 {s}px 'Cormorant Garamond', Georgia, serif", perString: false },
  },
  // a club stage at midnight: cool key, magenta rim, every string its own neon colour
  neon: {
    id: 'neon',
    label: '霓虹',
    bg: 0x05040c,
    fog: 0x07061a,
    fogDensity: 1.1,
    env: { key: [0x8fb4ff, 1.6], rim: [0xff3fb0, 3.0], top: [0x7a5cff, 0.5], bounce: [0x1fd6ff, 0.35], bg: 0x030212 },
    hemi: [0x9ab0ff, 0x10061c, 0.14],
    key: [0xc4ccff, 1.15],
    fill: [0x2fd8ff, 0.3],
    rim: [0xff3fa8, 0.7],
    inner: 0x29d4ff,
    topTint: 0x9d93b4,
    woodTint: 0x6e6280,
    table: 0x05040e,
    tableEnv: 0.02,
    tableRough: 1.0,
    string: 0xe8f0ff,
    stringGlow: 0x9fe8ff,
    strings: ['#b6ff5a', '#ff4fd1', '#3ee6ff', '#ffd64a'],
    fret: 0x3ee6ff,
    pool: 0x7b4dff,
    ripple: 0x6fe9ff,
    note: 0xff7ad9,
    bokeh: { hues: [0.53, 0.53, 0.75, 0.9], spread: 0.03, sat: 0.9 },
    mote: 0xa8e8ff,
    grid: true,
    post: { shadow: [0.006, 0.004, 0.03], sat: 1.22, high: [0.97, 0.99, 1.04], ca: 0.25, bloom: 0.75, threshold: 0.8, vig: 0.46 },
    hud: { accent: '62,230,255', ink: '226,236,255', dim: '150,160,210', paper: '10,8,28', note: '14,12,36', noteInk: '#e6eeff', hotInk: '#05040c', chordFont: "700 {s}px Manrope, system-ui, sans-serif", perString: true },
  },
}

export const THEME_ORDER: ReadonlyArray<ThemeId> = ['amber', 'neon']

export const hexCss = (n: number) => `#${n.toString(16).padStart(6, '0')}`
export const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')
