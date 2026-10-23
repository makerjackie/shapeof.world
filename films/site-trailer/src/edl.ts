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

// Section A, bars 0–3: two beats a shot. Swirl → swirl → spiral → spiral, then ring → sphere → sphere → round flame.
// Section B, bars 4–5: one beat a shot, lines and silk. Bar 6: the ink landscape, slow then fast.
// Bar 7: life and machines. Bar 8: the grid (Grid.tsx). Bar 9: out of the grid's middle tile.
// Bar 10: eighth-note recap that ends on a ring, one beat of black, then the black hole (bars 11–15).
export const SHOTS: Shot[] = [
  { id: "starry-night-flight", at: 0, len: 2, src: 3.0, rate: 1.2, ramp: { at: 20, rate: 2.2 }, zoom: [1.04, 1.1], label: ["星月夜 · 走进梵高的画", "THE STARRY NIGHT"] },
  { id: "coffee-vortex", at: 2, len: 2, src: 3.0, rate: 1.3, zoom: [1.16, 1.24], origin: [0.5, 0.15], label: ["咖啡 · 搅出涡旋", "FLUID VORTEX"] },
  { id: "equation-mobius", at: 4, len: 2, src: 1.0, rate: 1.2, zoom: [1.0, 1.22], label: ["公式 · 卷成漩涡", "EQUATION TUNNEL"] },
  { id: "galaxy-collision-top", at: 6, len: 2, src: 2.4, rate: 1.1, zoom: [1.3, 1.45], label: ["两个星系 · 撞成一个", "GALAXY COLLISION"] },
  { id: "eclipse-corona", at: 8, len: 2, src: 1.0, zoom: [1.0, 1.28], label: ["日全食 · 白天变黑", "TOTAL ECLIPSE"] },
  { id: "earth-terminator", at: 10, len: 2, src: 1.0, rate: 2, zoom: [1.16, 1.26], label: ["地球 · 白天与黑夜", "EARTH"] },
  { id: "moon-approach", at: 12, len: 2, src: 2.0, zoom: [1.0, 1.16], label: ["去月球 · 三天的航程", "TO THE MOON"] },
  { id: "flame-zero-g", at: 14, len: 2, src: 2.2, rate: 1.6, zoom: [1.0, 1.1], origin: [0.5, 1.0], label: ["火焰 · 没有重力会变圆", "ZERO-G FLAME"] },

  { id: "formula-ribbon", at: 16, len: 1, src: 2.0, rate: 1.5, zoom: [1.1, 1.18], label: ["一个公式 · 一条丝带", "FORMULA RIBBON"] },
  { id: "attractor-dadras", at: 17, len: 1, src: 2.0, rate: 1.5, zoom: [1.05, 1.12], label: ["三行方程 · 一团丝", "DADRAS ATTRACTOR"] },
  { id: "attractor-thomas", at: 18, len: 1, src: 3.5, rate: 1.5, zoom: [1.05, 1.12], label: ["奇异吸引子", "STRANGE ATTRACTOR"] },
  { id: "butterfly-lorenz", at: 19, len: 1, src: 2.0, rate: 1.5, zoom: [1.15, 1.22], label: ["蝴蝶效应", "BUTTERFLY EFFECT"] },
  { id: "three-body-3d", at: 20, len: 1, src: 2.0, rate: 2, zoom: [1.05, 1.12], label: ["三体", "THREE-BODY"] },
  { id: "light-cone", at: 21, len: 1, src: 2.0, rate: 1.5, zoom: [1.1, 1.2], label: ["光锥 · 宇宙的速度上限", "LIGHT CONE"] },
  { id: "complex-exp", at: 22, len: 1, src: 3.0, rate: 1.5, zoom: [1.08, 1.16], label: ["复变函数", "COMPLEX MAPPING"] },
  { id: "mandelbrot-julia", at: 23, len: 1, src: 2.0, zoom: [1.2, 1.5], label: ["Julia 集", "JULIA SET"] },

  { id: "ink-landscape-flight", at: 24, len: 4, src: 0.2, rate: 0.5, ramp: { at: 30, rate: 3 }, zoom: [1.0, 1.08], label: ["水墨山水 · 飞进留白", "INK LANDSCAPE"] },

  { id: "fly-neurons", at: 28, len: 1, src: 2.0, rate: 1.2, zoom: [1.35, 1.45], origin: [0.55, 0.55], label: ["果蝇 · 整个大脑的连线", "FLY CONNECTOME"] },
  { id: "human-explode", at: 29, len: 1, src: 3.3, rate: 1.5, zoom: [1.3, 1.38], origin: [0.5, 0.45], label: ["人体 · 一层层拆开", "HUMAN BODY"] },
  { id: "neural-spiral", at: 30, len: 1, src: 1.0, rate: 1.5, zoom: [1.05, 1.12], label: ["神经网络 · 自己学会分类", "NEURAL NETWORK"] },
  { id: "cnn-layers", at: 31, len: 1, src: 3.6, rate: 1.2, zoom: [1.2, 1.3], label: ["卷积网络 · 认出手写数字", "CNN"] },

  // bar 8 is the grid; its middle tile is flight-network from GRID_MID_SRC
  { id: "flight-network", at: 36, len: 2, src: 1.0 + 56 / 30, zoom: [1.0, 1.08], label: ["航线 · 没有国界的地图", "FLIGHT NETWORK"] },
  { id: "weather-front", at: 38, len: 1, src: 1.5, zoom: [1.1, 1.18], label: ["冷锋 · 天气为什么会变", "COLD FRONT"] },
  { id: "rainbow-double", at: 39, len: 1, src: 1.0, zoom: [1.1, 1.18], label: ["双彩虹", "DOUBLE RAINBOW"] },

  { id: "starry-night-orbit", at: 40, len: 0.5, src: 3.0, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "equation-tunnel", at: 40.5, len: 0.5, src: 2.5, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "attractor-dadras", at: 41, len: 0.5, src: 4.0, rate: 1.5, zoom: [1.1, 1.15] },
  { id: "coffee-vortex", at: 41.5, len: 0.5, src: 4.3, rate: 1.5, zoom: [1.2, 1.25], origin: [0.5, 0.15] },
  { id: "three-body-3d", at: 42, len: 0.5, src: 3.5, rate: 2, zoom: [1.1, 1.15] },
  { id: "eclipse-corona", at: 42.5, len: 0.5, src: 3.0, zoom: [1.35, 1.45] },
  // beat 43: one beat of black and silence

  { id: "black-hole-flyby", at: 44, len: 18, src: 0.4, rate: 0.6, zoom: [1.0, 1.18], origin: [0.5, 0.42] },
];

// The grid (bar 8): 3×3 tiles, appearing on sixteenths from the middle outwards, then the push into the middle.
export const GRID_AT = 32;
export type Tile = { id: string; src: number; zoom?: number; origin?: [number, number] };
export const GRID: Tile[] = [
  { id: "quark-weight", src: 1.0, zoom: 1.7, origin: [0.3, 0.45] },
  { id: "black-hole-ring", src: 1.0, zoom: 1.7, origin: [0.47, 0.5] },
  { id: "photon-double-slit", src: 2.0, zoom: 1.25 },
  { id: "three-body-gallery", src: 1.0, zoom: 1.1 },
  { id: "flight-network", src: 1.0, zoom: 1.0 },
  { id: "radio-sweep", src: 1.0, zoom: 1.35, origin: [0.5, 0.55] },
  { id: "rain-carves-valleys", src: 1.0, zoom: 1.1 },
  { id: "solar-system-orbits", src: 2.0, zoom: 1.7 },
  { id: "galaxy-collision-merge", src: 0.5, zoom: 1.5 },
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
