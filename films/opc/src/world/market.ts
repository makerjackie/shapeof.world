// The night market: every stall is a one-person company. The hero street runs along x at z = 0; parallel streets
// repeat every STREET_GAP metres to the horizon, with low buildings in the blocks between them. Stalls stand on both
// sides, facing the street, each under its own lamp, its sign naming what it sells.
// Near streets get full stall geometry; the rest of the market is only lamps (glow sprites) seen through haze.
// All layout is deterministic (seeded), so every render draws the same market.

export const STREET_GAP = 26; // m between parallel streets
export const SIDE = 5; // stall line distance from the street centre
export const PITCH = 3.6; // mean m between stalls along a street
export const NEAR_K = 3; // streets |k| <= NEAR_K get geometry...
export const NEAR_X = 200; // ...within |x| <= NEAR_X
export const FAR_K = 46; // lamps on streets |k| <= FAR_K
export const FAR_X = 1400;
export const CROSS = 128; // a cross street every CROSS m (no stalls there)

// What the stalls sell: the sign atlas (8 x 8 cells). Desks take 0..55, food carts 56..63.
export const SIGNS = [
  "AI 写作", "接设计单", "做小程序", "代写简历", "AI 配音", "做网站", "视频剪辑", "AI 头像",
  "法律咨询", "英语翻译", "Excel 定制", "PPT 代做", "数据分析", "手绘插画", "做 App", "店铺代运营",
  "AI 客服", "短视频脚本", "Logo 设计", "程序外包", "论文润色", "商品详情页", "AI 绘本", "在线家教",
  "心理咨询", "AI 证件照", "播客剪辑", "3D 建模", "修图调色", "副业陪跑", "跨境小店", "手工饰品",
  "AI 写歌", "产品文案", "公众号排版", "字幕翻译", "模板商店", "自动化脚本", "上门喂猫", "私房烘焙",
  "独立游戏", "AI 漫画", "电子书", "表情包", "直播切片", "记账报税", "插件开发", "AI 建站",
  "AI 面试陪练", "编程课", "AI 起名", "旅行攻略", "健身计划", "婚礼策划", "租房避坑", "选品顾问",
  "煎饼果子", "烤冷面", "手抓饼", "炒粉", "烤肠", "糖水", "鸡蛋灌饼", "凉皮",
];
export const SIGN_BUILD = 47; // "AI 建站": the opening stall
export const SIGN_JIANBING = 56;

// Hero places on the hero street (k = 0).
export const HERO = {
  laptop: { x: 0, side: -1 }, // the stall of the opening
  cart: { x: -64, side: -1 }, // the 煎饼 cart, at a corner of the west cross street
  plazaFrom: 15, // a gap in the south stall line for the company building
  plazaTo: 42,
  company: { x: 28.5, z: -13.5, w: 24, d: 8, h: 15 }, // the office building that folds into one stall
  folded: { x: 28.5, side: -1 }, // the one stall left where the company stood
};

export type Stall = {
  x: number;
  z: number;
  rot: number; // radians; 0 faces +z
  seed: number;
  kind: 0 | 1; // 0 laptop desk, 1 food cart
  hue: number;
  sign: number; // index into SIGNS
  s: number; // success 0..1 (power law): a few very bright, most dim
  k: number; // street index
  near: boolean;
  id: number;
  tint: number; // lamp colour: 0 warm .. 1 cool
  jit: number; // brightness jitter
};

export type Block = { x: number; z: number; w: number; d: number; h: number; seed: number };

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let n = Math.imul(s ^ (s >>> 15), 1 | s);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};

const R = rng(20261030);

const crossDist = (x: number) => Math.abs((((x + CROSS / 2) % CROSS) + CROSS) % CROSS - CROSS / 2);

export const STALLS: Stall[] = [];
export const NEAR: Stall[] = [];

for (let k = -FAR_K; k <= FAR_K; k++) {
  const zc = k * STREET_GAP;
  const near0 = Math.abs(k) <= NEAR_K;
  for (const side of [-1, 1]) {
    let x = -FAR_X + R() * PITCH;
    while (x < FAR_X) {
      const step = PITCH * (0.8 + 0.45 * R());
      x += step;
      if (crossDist(x) < 8) continue;
      if (k === 0 && side < 0 && x > HERO.plazaFrom && x < HERO.plazaTo) continue;
      if (R() < 0.07) continue; // an empty pitch now and then
      const u = R();
      // success: power law; most stalls barely lit, a handful blazing
      const s = Math.min(1, 0.06 / Math.pow(Math.max(1e-4, R()), 0.62));
      const near = near0 && Math.abs(x) <= NEAR_X;
      const kind: 0 | 1 = u < 0.1 ? 1 : 0;
      const st: Stall = {
        x,
        z: zc + side * (SIDE + (R() - 0.5) * 0.5),
        rot: (side < 0 ? 0 : Math.PI) + (R() - 0.5) * 0.12,
        seed: R(),
        kind,
        hue: R(),
        sign: kind === 1 ? 56 + Math.floor(R() * 8) : Math.floor(R() * 56),
        s,
        k,
        near,
        id: STALLS.length,
        tint: R() < 0.82 ? R() * 0.25 : 0.6 + R() * 0.4,
        jit: 0.7 + 0.6 * R(),
      };
      STALLS.push(st);
      if (near) NEAR.push(st);
    }
  }
}

// pin the hero stalls (nearest to their places)
const pin = (x: number, side: number, kind: 0 | 1, sign: number) => {
  let best = -1;
  let bd = 1e9;
  for (const st of NEAR) {
    if (st.k !== 0 || Math.sign(st.z) !== side) continue;
    const d = Math.abs(st.x - x);
    if (d < bd) {
      bd = d;
      best = st.id;
    }
  }
  const st = STALLS[best];
  st.x = x;
  st.z = side * SIDE;
  st.rot = side < 0 ? 0 : Math.PI;
  st.kind = kind;
  st.sign = sign;
  st.tint = 0.05;
  st.jit = 1;
  // clear neighbours that would now overlap
  for (const o of NEAR) if (o.id !== best && o.k === 0 && Math.sign(o.z) === side && Math.abs(o.x - x) < 2.6) o.x += o.x > x ? 1.6 : -1.6;
  return best;
};
const heroLaptop = pin(HERO.laptop.x, HERO.laptop.side, 0, SIGN_BUILD);
const heroCart = pin(HERO.cart.x, HERO.cart.side, 1, SIGN_JIANBING);
// the folded company's stall: added in the plaza gap (hidden until the fold)
const folded: Stall = { x: HERO.folded.x, z: -SIDE, rot: 0, seed: 0.5, kind: 0, hue: 0.1, sign: 12, s: 0.3, k: 0, near: true, id: STALLS.length, tint: 0.05, jit: 1 };
STALLS.push(folded);
NEAR.push(folded);

export const HERO_IDS = { laptop: heroLaptop, cart: heroCart, folded: folded.id };

// The brightest stalls near the hero street: where the customers go after the turn.
export const STARS: number[] = STALLS.filter((s) => Math.abs(s.k) <= 8 && Math.abs(s.x) < 700 && s.kind === 0)
  .sort((a, b) => b.s - a.s)
  .slice(0, 48)
  .map((s) => s.id);
// make one of them the hero street's star, in view of the opening stall
{
  const near = NEAR.filter((s) => s.k === 0 && s.z > 0 && s.x > 8 && s.x < 22 && s.kind === 0);
  if (near.length) {
    near[0].s = 1;
    near[0].sign = 0;
    STARS.unshift(near[0].id);
  }
}
export const STAR = STARS[0];

// Low buildings in the blocks between streets (near the hero street only).
export const BLOCKS: Block[] = [];
for (let k = -9; k <= 8; k++) {
  const z0 = k * STREET_GAP + 8.6; // just behind the south stalls of street k+1... the block between k and k+1
  for (let x = -520; x < 520; ) {
    const w = 7 + R() * 14;
    if (crossDist(x + w / 2) < 10) {
      x += 6;
      continue;
    }
    // two rows: one facing each street
    for (const row of [0, 1]) {
      const d = 3.2 + R() * 1.0;
      const z = row === 0 ? z0 + d / 2 : (k + 1) * STREET_GAP - 8.6 - d / 2;
      const h = 3.4 + Math.pow(R(), 2.2) * 11;
      if (k === -1 && x + w > HERO.plazaFrom - 4 && x < HERO.plazaTo + 4) continue; // the company's lot
      BLOCKS.push({ x: x + w / 2, z, w: w - 0.6, d, h, seed: R() });
    }
    x += w;
  }
}

// Local stall-space offsets (before rotation) of the lamp bulb, per kind.
export const BULB = [
  [0, 1.68, 0.12],
  [0, 1.86, 0.1],
] as const;

export const stallWorld = (st: Stall, lx: number, ly: number, lz: number): [number, number, number] => {
  const c = Math.cos(st.rot);
  const s = Math.sin(st.rot);
  return [st.x + lx * c + lz * s, ly, st.z - lx * s + lz * c];
};
