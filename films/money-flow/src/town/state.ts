// v7 scene state per film time: who pays whom through the air (each flow carries a word for what the money is), and
// per-house overrides (tank level, glow, red) on top of the CHFS-calibrated end-of-year split (sim.ts finalOf).
import * as THREE from "three";
import { CAST, House, HOUSES, Pt, YOU_RANK } from "./layout";
import { finalOf, capOf, HouseState } from "./sim";
import { B, T, clamp, ramp, win } from "../timing";

const GOLD = new THREE.Color("#ffb53d");
const LOAN = new THREE.Color("#8fc4ff");
const PUB = new THREE.Color("#9fe0c0"); // public money: pensions, services

export type HouseView = { level: number; hi: number; red: number; flow: number; dir: number; flowCol: THREE.Color; coins: number; coinDir: number; dimHouse: number };
export type ArcFlow = { from: Pt; to: Pt; k: number; col?: THREE.Color; n?: number; lift?: number; speed?: number; label?: string };
export type { Pt };

const YOU = YOU_RANK;
// today's retirees (illustrative): the employer's pension share is paid out to them the same month
export const RETIREES = [33, 44, 66, 82, 93];
// a few other ordinary households that spend at the market and are paid wages from it
const FRONT = [26, 38, 52, 63, 71, 80, 88, 97];
const BUYERS = [CAST.coder, 18, 27, 41, 49];

// a flow that is bright in its own bar and stays on, dimmer, until `until`
const step = (t: number, a: number, until: number, rest = 0.35) => {
  const on = win(t, a - 0.05, until, 0.25, 0.5);
  return on * (t < a + BAR_ ? 1 : rest + (1 - rest) * (1 - ramp(t, a + BAR_, a + BAR_ + 0.6)));
};
const BAR_ = B(1) - B(0);

function arcsAt(t: number): ArcFlow[] {
  const c = CAST;
  const out: ArcFlow[] = [];
  const add = (from: Pt, to: Pt, k: number, o: Partial<ArcFlow> = {}) => {
    if (k > 0.01) out.push({ from, to, k, ...o });
  };
  // DROP: the employer (the factory at the market) pays the 2,570 out, one item per bar
  const end1 = B(16);
  add("hub", "bank", step(t, B(8), end1), { n: 22, lift: 9, label: "公积金 800" });
  add("hub", "gov", step(t, B(9), end1), { n: 14, lift: 7, label: "养老·个人 400" });
  add("hub", "gov", step(t, B(10), end1), { n: 22, lift: 11, label: "养老·单位 800" });
  RETIREES.forEach((r, i) => add("gov", r, win(t, B(10) + 0.5 + i * 0.12, end1, 0.3, 0.5) * (t < B(11) ? 1 : 0.4), { n: 10, lift: 9, col: PUB, label: i === 2 ? "养老金" : undefined }));
  add("hub", "gov", step(t, B(11), end1), { n: 16, lift: 14, label: "医保 500" });
  add("hub", "gov", step(t, B(12), end1), { n: 6, lift: 5, label: "失业、工伤 70" });
  add("hub", YOU, win(t, B(13), B(16), 0.3, 0.5), { n: 30, lift: 8, label: "到手 4,075" });
  // the 4,075 is spent: rent, food and the rest; the shop passes VAT on to the government
  add(YOU, c.landlord, win(t, B(16), B(20), 0.3, 0.5), { n: 14, lift: 9, label: "房租" });
  add(YOU, "hub", win(t, B(16) + 0.3, B(20), 0.3, 0.5), { n: 18, lift: 7, label: "吃穿用" });
  add("hub", "gov", win(t, B(17) + 0.6, B(20), 0.3, 0.5), { n: 18, lift: 9, label: "增值税" });
  // lift: everyone's spending is someone's wage; the market's takings split three ways
  const lift = win(t, B(20), B(32), 0.6, 0.6);
  FRONT.forEach((r, i) => {
    add(r, "hub", lift * (0.55 + 0.45 * ((i * 5) % 3) / 2), { n: 8, lift: 7 + (i % 3), label: i === 3 ? "花钱" : undefined });
    add("hub", r, lift * 0.6 * win(t, B(21), B(32), 0.5, 0.6), { n: 6, lift: 5 + (i % 2), label: i === 6 ? "工资" : undefined });
  });
  add("hub", "gov", win(t, B(21) + 0.5, B(26), 0.4, 0.6), { n: 16, lift: 10, label: "税" });
  add("hub", c.holder, win(t, B(22), B(27), 0.4, 0.6), { n: 30, lift: 12, speed: 10, label: "利润" });
  add("hub", c.boss, win(t, B(22) + 0.3, B(27), 0.4, 0.6), { n: 16, lift: 10 });
  add("hub", c.holder, win(t, B(24), B(27), 0.3, 0.6), { n: 36, lift: 14, speed: 11, label: "分红" });
  add("hub", "gov", win(t, B(26), B(27), 0.3, 0.4), { n: 20, lift: 13, label: "国企利润" });
  // savings → the bank → the young buyers; interest back up the hill
  add(c.holder, "bank", win(t, B(36), B(42), 0.4, 0.6), { n: 30, lift: 10, label: "存款" });
  add(c.boss, "bank", win(t, B(36) + 0.2, B(42), 0.4, 0.6), { n: 20, lift: 10 });
  add(c.landlord, "bank", win(t, B(36) + 0.4, B(42), 0.4, 0.6), { n: 16, lift: 8 });
  BUYERS.forEach((r, i) => add("bank", r, win(t, B(38) + i * 0.15, B(42), 0.4, 0.6), { n: i ? 12 : 28, lift: 8, col: LOAN, label: i ? undefined : "房贷" }));
  add(c.coder, "bank", win(t, B(40), B(47), 0.4, 0.6), { n: 18, lift: 6, label: "利息" });
  add("bank", c.holder, win(t, B(40) + 0.4, B(47), 0.4, 0.6), { n: 24, lift: 10, label: "利息" });
  // breather: wages to you; rent, interest and dividends up the hill; new loans to the builders first
  add("hub", YOU, win(t, B(48), B(50), 0.3, 0.5), { n: 20, lift: 7, label: "工资" });
  add(c.coder, c.holder, win(t, B(48) + 0.4, B(50), 0.3, 0.5), { n: 14, lift: 11, label: "房租" });
  add("bank", c.holder, win(t, B(48) + 0.6, B(50), 0.3, 0.5), { n: 14, lift: 11, label: "利息" });
  add("hub", c.holder, win(t, B(48) + 0.8, B(50), 0.3, 0.5), { n: 18, lift: 13, label: "分红" });
  add("bank", "dev", win(t, B(53), B(55.5), 0.3, 0.6), { n: 30, lift: 9, col: LOAN, speed: 9, label: "新贷款" });
  add("bank", "hub", win(t, B(53) + 0.3, B(55.5), 0.3, 0.6), { n: 24, lift: 9, col: LOAN, speed: 9 });
  // PEAK: the whole circulation, switched on two bars at a time
  const P = (n: number) => win(t, B(n) - 0.05, T.c11 + BAR_ * 2, 0.25, 1.2);
  const fullOn = (n: number) => P(n) * (t < B(n) + BAR_ * 2 ? 1 : 0.55);
  [YOU, ...FRONT].forEach((r, i) => {
    add("hub", r, fullOn(57) * (i ? 0.7 : 1), { n: i ? 6 : 16, lift: 6 + (i % 3), label: i ? undefined : "工资" });
    add(r, "hub", fullOn(57) * 0.6, { n: 6, lift: 8 + (i % 2) });
  });
  [YOU, 38, 63, 80].forEach((r, i) => add(r, c.landlord, fullOn(59) * 0.8, { n: 8, lift: 10 + i, label: i ? undefined : "房租" }));
  add(c.coder, "bank", fullOn(59), { n: 14, lift: 7, label: "利息" });
  add("bank", c.holder, fullOn(59), { n: 22, lift: 11 });
  add("hub", c.holder, fullOn(59), { n: 30, lift: 14, speed: 11, label: "分红" });
  add("hub", "gov", fullOn(61), { n: 20, lift: 10, label: "税" });
  [...RETIREES, ...FRONT.slice(0, 4)].forEach((r, i) => add("gov", r, fullOn(61) * 0.75 * win(t, B(62), T.c11 + BAR_ * 2, 0.3, 1.2), { n: 7, lift: 8 + (i % 3), col: PUB, label: i === 1 ? "学校·医院·养老金" : undefined }));
  add("bank", "dev", fullOn(63), { n: 26, lift: 9, col: LOAN, label: "新贷款" });
  add("bank", "hub", fullOn(63) * 0.8, { n: 20, lift: 9, col: LOAN });
  return out;
}

export type SceneState = {
  arcs: ArcFlow[];
  dim: number;
  glow: number;
  towerHi: number;
  built: number;
  devDim: number;
  tech: number[];
  savingsToBank: number;
  loans: number;
  interest: number;
  bands: number;
  grow: number;
  world: number;
  land: number;
  house: (h: House, s: HouseState) => HouseView;
};

// screen-filling cards dim the town under them
export const CARD_DIM = (t: number) =>
  Math.max(
    win(t, B(0), B(8), 0.01, 0.05) * 0.55, // payslip
    win(t, B(32) + BAR_ * 0.25, B(33), 0.15, 0.25) * 0.55, // 那钱，停在了哪？
    win(t, B(47) + BAR_ * 0.25, B(48), 0.1, 0.25) * 0.85, // why do the rich get richer?
    win(t, B(50), B(53), 0.3, 0.4) * 0.5, // the tax table
    win(t, B(18), B(20), 0.2, 0.3) * 0.55, // the tax bar
    win(t, B(40), B(45), 0.25, 0.3) * 0.4, // rates, thirty years of interest
    win(t, B(55), B(57), 0.4, 0.05) * 0.45, // 所以…
  );

export function scene(t: number): SceneState {
  const reveal = ramp(t, B(33), B(34)); // the tanks fill to where the year's saving stops
  const s: SceneState = {
    arcs: arcsAt(t),
    dim: Math.max(CARD_DIM(t), ramp(t, T.sources - 1, T.sources + 1)),
    glow: win(t, T.peak, T.c11 + 4, 0.2, 2),
    towerHi: 0,
    built: 0.55,
    devDim: 0,
    tech: [0, 0, 0, 0],
    savingsToBank: win(t, B(36), B(42), 0.5, 0.8),
    loans: win(t, B(38), B(42), 0.5, 0.8),
    interest: win(t, B(40), B(47), 0.5, 0.8),
    bands: 0,
    grow: 0.6 * win(t, B(65), B(69), 0.6, 1.0),
    world: 0,
    land: win(t, B(53) + 0.6, B(55.5), 0.5, 0.6),
    house: () => null as unknown as HouseView,
  };

  s.house = (h, hs) => {
    const fin = finalOf(h) / capOf(h);
    // before the reveal every tank sits low (a little everywhere); from the reveal on, the saved split
    const low = 0.06 + 0.05 * h.seed;
    const v: HouseView = { level: low + (fin - low) * reveal, hi: 0, red: 0, flow: hs.flow, dir: hs.dir, flowCol: GOLD, coins: 0, coinDir: 1, dimHouse: 0 };
    // the worker ("你"): payday fills the tank, the month empties it
    if (h.rank === YOU) {
      const paid = ramp(t, B(13) + 0.6, B(14) + 0.4);
      const spent = ramp(t, B(16), B(20)) * 0.7 + ramp(t, B(30), B(31.5)) * 0.3;
      v.level = clamp(0.04 + 0.55 * paid * (1 - spent) + (t > B(48) ? 0.25 * win(t, B(48), B(50), 0.4, 0.8) : 0) + (t > T.peak ? 0.22 * (0.5 + 0.5 * Math.sin((t - T.peak) * 2.9)) * win(t, T.peak, T.sources, 0.5, 1) : 0));
      v.hi = Math.max(0.6 * win(t, B(13), B(16.5), 0.3, 0.5), 0.6 * win(t, B(30), B(32), 0.3, 0.5), 0.5 * win(t, T.c11 - 1, T.sources, 0.5, 1));
      v.red = win(t, B(30.6), B(32.5), 0.4, 0.5);
      if (t > T.peak) {
        v.flow = 0.7 * win(t, T.peak, T.sources, 0.4, 1);
        v.dir = Math.sin((t - T.peak) * 2.9) > 0 ? -1 : 1;
        v.coins = v.flow;
        v.coinDir = v.dir;
      }
    }
    // today's retirees glow while their pension arrives
    if (RETIREES.includes(h.rank)) v.hi = Math.max(v.hi, 0.5 * win(t, B(10) + 0.4, B(11.5), 0.3, 0.5));
    // month end: about four in ten households spent more than they earned
    if (h.red) v.red = Math.max(v.red, 0.85 * win(t, B(30.8), B(32.6), 0.4, 0.5), t >= B(33) && t < B(36) ? 0.4 + 0.6 * win(t, B(34.5), B(36), 0.3, 0.5) : 0);
    // who holds the shares: the hill glows, the rest dims
    const shares = win(t, B(27), B(30), 0.5, 0.6);
    if (shares > 0) {
      v.hi = Math.max(v.hi, h.g <= 1 ? shares : 0);
      v.dimHouse = Math.max(v.dimHouse, h.g <= 1 ? 0 : 0.5 * shares);
    }
    // reveal: the top five, then the next twenty, then the rest (red ones flagged)
    if (t >= B(33) && t < B(36)) {
      const g0 = win(t, B(33), B(34.5), 0.3, 0.4);
      const g12 = win(t, B(34.5), B(36), 0.3, 0.4);
      const mine = h.g === 0 ? g0 : h.g <= 2 ? g12 : 0;
      v.hi = Math.max(v.hi, mine);
      v.dimHouse = Math.max(g0, g12) * (1 - mine) * 0.7;
    }
    // savers on the hill, then the young buyers
    if (h.g === 0) v.hi = Math.max(v.hi, 0.45 * win(t, B(36), B(38), 0.3, 0.4));
    if (BUYERS.includes(h.rank)) v.hi = Math.max(v.hi, 0.55 * win(t, B(38), B(47), 0.4, 0.5));
    // peak: the top ten grow and glow
    if (t >= B(65) && t < B(69)) {
      const w = win(t, B(65), B(69), 0.5, 0.8);
      v.hi = Math.max(v.hi, h.g <= 1 ? w : 0);
      v.dimHouse = Math.max(v.dimHouse, h.g <= 1 ? 0 : 0.45 * w);
    }
    return v;
  };
  return s;
}

export { HOUSES };
