// Edit decision list. Every cut sits on the score's grid (music/score.js): 900/7 BPM, so one beat is exactly
// 14 frames at 30 fps and bar 0 starts on frame 0. `at` and `len` are in beats; `src` is seconds into the clip.
export const FPS = 30;
export const FPB = 14; // frames per beat
export const FPBAR = 4 * FPB;
export const b2f = (beats: number) => Math.round(beats * FPB);

export type Label = [zh: string, en: string];

export type Shot = {
  id: string; // footage/<id>.mp4, 1920×1080 60 fps
  at: number;
  len: number;
  src: number;
  rate?: number;
  // speed ramp: after `at` frames into the shot, play at `rate`
  ramp?: { at: number; rate: number };
  // scale over the shot (punch-in or slow push), around `origin` (fractions of the frame)
  zoom?: [number, number];
  origin?: [number, number];
  label?: Label;
};

// Section A, bars 0–3: two beats a shot. Swirl → swirl → swirl → spiral, then ring → ring on a sphere → sphere → round flame.
// Section B, bars 4–5: one beat a shot, lines and silk. Bar 6: the ink landscape, slow then fast.
// Bar 7: life and machines. Bar 8: the grid (Grid.tsx). Bar 9: out of the grid's middle tile.
// Bar 10: eighth-note recap that ends on a ring, one beat of black, then the black hole (bars 11–15).
// v2 footage (fluid-swirl, galaxy-wide, eclipse-sky, flame-gravity, ...) is recorded at ss 2, so zooms up to ~1.5
// stay sharp; v1 footage (1080p) stays at or under ~1.1.
export const SHOTS: Shot[] = [
  { id: "starry-night-flight", at: 0, len: 2, src: 3.0, rate: 1.2, ramp: { at: 20, rate: 2.2 }, zoom: [1.04, 1.1], label: ["星月夜 · 走进梵高的画", "THE STARRY NIGHT"] },
  { id: "fluid-swirl", at: 2, len: 2, src: 2.2, rate: 1.3, zoom: [1.0, 1.06], label: ["咖啡 · 搅出涡旋", "FLUID VORTEX"] },
  { id: "boids-vortex", at: 4, len: 2, src: 0.2, rate: 1.2, zoom: [1.0, 1.08], label: ["鸟群 · 没有指挥也会转圈", "FLOCKING"] },
  { id: "galaxy-wide", at: 6, len: 2, src: 0.9, rate: 1.5, zoom: [1.0, 1.1], label: ["两个星系 · 撞成一个", "GALAXY COLLISION"] },
  { id: "eclipse-sky", at: 8, len: 2, src: 1.0, zoom: [1.0, 1.25], origin: [0.5, 0.26], label: ["日全食 · 白天变黑", "TOTAL ECLIPSE"] },
  { id: "aurora-polar", at: 10, len: 2, src: 1.0, rate: 1.5, zoom: [1.0, 1.08], origin: [0.5, 0.3], label: ["极光 · 太阳风撞上磁场", "AURORA"] },
  { id: "moon-approach", at: 12, len: 2, src: 2.0, zoom: [1.0, 1.16], label: ["去月球 · 三天的航程", "TO THE MOON"] },
  { id: "flame-gravity", at: 14, len: 2, src: 0.9, rate: 1.8, zoom: [1.0, 1.05], origin: [0.5, 0.7], label: ["火焰 · 没有重力会变圆", "ZERO-G FLAME"] },

  { id: "butterfly-flow", at: 16, len: 1, src: 2.4, rate: 1.5, zoom: [1.0, 1.06], label: ["蝴蝶效应", "BUTTERFLY EFFECT"] },
  { id: "photon-slit", at: 17, len: 1, src: 1.0, rate: 1.5, zoom: [1.0, 1.08], label: ["一个光子 · 同时穿过两条缝", "DOUBLE SLIT"] },
  { id: "complex-zeta", at: 18, len: 1, src: 1.0, rate: 1.5, zoom: [1.0, 1.08], label: ["黎曼 ζ 函数", "RIEMANN ZETA"] },
  { id: "equation-blackhole", at: 19, len: 1, src: 1.0, rate: 1.5, zoom: [1.0, 1.06], label: ["公式 · 卷进黑洞", "EQUATION BLACK HOLE"] },
  { id: "three-body-gallery", at: 20, len: 1, src: 1.0, rate: 2, zoom: [1.0, 1.05], label: ["三体 · 一起跳的周期轨道", "THREE-BODY ORBITS"] },
  { id: "rain-carves-valleys", at: 21, len: 1, src: 1.0, zoom: [1.0, 1.08], label: ["雨水 · 刻出山谷", "RIVERS CARVE VALLEYS"] },
  { id: "earth-terminator", at: 22, len: 1, src: 1.0, rate: 2, zoom: [1.05, 1.1], label: ["地球 · 白天与黑夜", "EARTH"] },
  { id: "mandel-spiral", at: 23, len: 1, src: 1.0, zoom: [1.0, 1.15], label: ["曼德博集合 · 无限放大", "MANDELBROT ZOOM"] },

  { id: "ink-landscape-flight", at: 24, len: 4, src: 0.2, rate: 0.5, ramp: { at: 30, rate: 3 }, zoom: [1.0, 1.08], label: ["水墨山水 · 飞进留白", "INK LANDSCAPE"] },

  { id: "fly-neurons", at: 28, len: 1, src: 2.0, rate: 1.2, zoom: [1.35, 1.45], origin: [0.55, 0.55], label: ["果蝇 · 整个大脑的连线", "FLY CONNECTOME"] },
  { id: "human-explode", at: 29, len: 1, src: 3.3, rate: 1.5, zoom: [1.3, 1.38], origin: [0.5, 0.45], label: ["人体 · 一层层拆开", "HUMAN BODY"] },
  { id: "vegetation-forest", at: 30, len: 1, src: 2.0, rate: 1.2, zoom: [1.0, 1.05], label: ["森林 · 从树冠到根系", "FOREST"] },
  { id: "ukulele-play", at: 31, len: 1, src: 1.5, zoom: [1.0, 1.05], origin: [0.5, 0.8], label: ["尤克里里 · 自己弹", "UKULELE"] },

  // bar 8 is the grid; its middle tile is flight-network from GRID_MID_SRC
  { id: "flight-network", at: 36, len: 2, src: 1.0 + 56 / 30, zoom: [1.0, 1.08], label: ["航线 · 没有国界的地图", "FLIGHT NETWORK"] },
  { id: "weather-front", at: 38, len: 1, src: 1.5, zoom: [1.1, 1.18], label: ["冷锋 · 天气为什么会变", "COLD FRONT"] },
  { id: "rainbow-double", at: 39, len: 1, src: 1.0, zoom: [1.1, 1.18], label: ["双彩虹", "DOUBLE RAINBOW"] },

  { id: "starry-night-orbit", at: 40, len: 0.5, src: 3.0, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "equation-tunnel", at: 40.5, len: 0.5, src: 2.5, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "butterfly-flow", at: 41, len: 0.5, src: 3.3, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "fluid-swirl", at: 41.5, len: 0.5, src: 3.3, rate: 1.5, zoom: [1.15, 1.2] },
  { id: "galaxy-wide", at: 42, len: 0.5, src: 2.0, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "eclipse-sky", at: 42.5, len: 0.5, src: 2.0, zoom: [2.2, 2.4], origin: [0.499, 0.259] },
  // beat 43: one beat of black and silence

  { id: "black-hole-flyby", at: 44, len: 18, src: 0.4, rate: 0.6, zoom: [1.0, 1.18], origin: [0.5, 0.42] },
];

// The grid (bar 8): 3×3 tiles, appearing on sixteenths from the middle outwards, then the push into the middle.
export const GRID_AT = 32;
export type Tile = { id: string; src: number; zoom?: number; origin?: [number, number] };
export const GRID: Tile[] = [
  { id: "periodic-wall", src: 1.0, zoom: 1.1 },
  { id: "black-hole-ring", src: 1.0, zoom: 1.7, origin: [0.47, 0.5] },
  { id: "kakeya-turn", src: 1.0, zoom: 1.1 },
  { id: "money-banknote", src: 1.0, zoom: 1.2, origin: [0.5, 0.45] },
  { id: "flight-network", src: 1.0, zoom: 1.0 },
  { id: "radio-sweep", src: 1.0, zoom: 1.35, origin: [0.5, 0.55] },
  { id: "cow-cubes", src: 1.0, zoom: 1.2, origin: [0.42, 0.4] },
  { id: "solar-system-orbits", src: 2.0, zoom: 1.7 },
  { id: "chokepoint-suez", src: 1.0, zoom: 1.1 },
];
export const GRID_ORDER = [4, 0, 1, 2, 5, 8, 7, 6, 3];
export const GRID_LABEL: Label = ["物理 · 生命 · 地球 · 艺术", "PHYSICS · LIFE · EARTH · ART"];

// The closing line, on the anthem (bars 11–12), and the brand card from bar 13.
export const LINES: { at: number; until: number; zh: string; en: string }[] = [
  { at: 44, until: 47.6, zh: "这些都不是视频", en: "NONE OF THIS IS VIDEO" },
  { at: 48, until: 51.7, zh: "每个世界，都能亲手玩", en: "EVERY WORLD HERE IS PLAYABLE" },
];
export const CARD_AT = 52;
export const FILM_FRAMES = b2f(62);
