// Scene-level values per film time, and per-house overrides on top of the year model (sim.ts):
// who pays whom through the air (with a word for what the money is), the reveal, savings into the bank, loans out and
// interest back, the housing wave, the next waves, the world, the ending.
import * as THREE from "three";
import { CAST, House, Pt, YOU_RANK } from "./layout";
import { finalOf, capOf, HouseState, machineryAt } from "./sim";
import { HOLD, RIVER, SALES, T, TECH, VISIT, WORLD, clamp, ramp, salesAt, win, yearAt } from "../timing";

const GOLD = new THREE.Color("#ffb53d");
const LOAN = new THREE.Color("#8fc4ff");

export type HouseView = { level: number; hi: number; red: number; flow: number; dir: number; flowCol: THREE.Color; coins: number; coinDir: number; dimHouse: number };
// a flow through the air from one place to another (wages, rent, the restaurant's takings, dividends, loans, interest)
export type ArcFlow = { from: Pt; to: Pt; k: number; col?: THREE.Color; n?: number; lift?: number; speed?: number; label?: string };
export type { Pt };

// households that buy new homes in the housing wave, and buy the new things in the next waves
const BUYERS = [12, 18, 21, 27, 33, 41, 48, 55, 62, 70, 78, 86];
const TECH_BUYERS = [15, 22, 30, 44, 52, 66, 75, 90];
export const STAFF = [61, 71]; // the restaurant's cook and waiter
export const river = (t: number) => (t < RIVER.a - 0.5 || t > RIVER.end ? 0 : win(t, RIVER.a - 0.5, RIVER.end, 0.8, 1.5) * (0.15 + 0.85 * (salesAt(yearAt(t)) / 181930)));
const CUM = SALES.map((_, i) => SALES.slice(0, i + 1).reduce((a, [, v]) => a + v, 0));
// the developer's towers: how much has been built, as a share of everything sold 1998–2025
export const builtAt = (t: number) => {
  if (t < RIVER.a) return 0;
  const y = yearAt(t);
  const i = Math.min(SALES.length - 1, Math.floor(y - 1998));
  const f = y - Math.floor(y);
  const c = CUM[i] + (i + 1 < SALES.length ? SALES[i + 1][1] * f : 0);
  return clamp(c / CUM[CUM.length - 1]);
};
export const techStart = (i: number) => TECH.a + 0.6 + i * 1.7;

// who pays whom, in the air above the streets
function arcsAt(t: number): ArcFlow[] {
  const v = (k: keyof typeof VISIT, d0 = 0, d1 = 0) => win(t, VISIT[k] - 0.6 + d0, VISIT[k] + HOLD[k] + 0.4 + d1, 0.6, 0.6);
  const c = CAST;
  const out: ArcFlow[] = [];
  const add = (from: Pt, to: Pt, k: number, o: Partial<ArcFlow> = {}) => {
    if (k > 0.01) out.push({ from, to, k, ...o });
  };
  // chapter 3 visits
  add("hub", c.rider, v("rider"), { n: 14, label: "工资" });
  add(c.rider, c.landlord, v("rider"), { lift: 9, label: "房租" });
  add(c.rider, c.boss, v("rider"), { lift: 8, n: 12, label: "吃饭" });
  add("hub", c.worker, v("worker"), { n: 14, label: "工资" });
  add(c.worker, "hub", v("worker"), { n: 16, label: "吃住、日用" });
  add("hub", c.coder, v("coder"), { n: 22, label: "工资" });
  add(c.coder, "bank", v("coder"), { n: 16, col: LOAN, label: "房贷" });
  for (const r of [c.rider, c.worker, 66, 71, 38]) add(r, c.landlord, v("landlord"), { lift: 9, n: 14, label: r === c.rider ? "房租" : undefined });
  // the restaurant: takings come in, then the receipt splits them, row by row
  const b = VISIT.boss;
  const bIn = win(t, b - 0.6, b + HOLD.boss + 0.4, 0.6, 0.6);
  for (const r of [c.rider, c.worker, c.coder, 52, 63, 80]) add(r, c.boss, bIn * (1 - 0.55 * ramp(t, b + 1.0, b + 2.0)), { lift: 6, n: 10, label: r === c.rider ? "饭钱" : undefined });
  const row = (d: number) => win(t, b + d, b + HOLD.boss + 0.4, 0.6, 0.6);
  add(c.boss, "hub", row(1.2), { n: 22, lift: 7, label: "食材 42.1" });
  add(c.boss, STAFF[0], row(2.4), { n: 12, lift: 5, label: "人工 22.2" });
  add(c.boss, STAFF[1], row(2.4), { n: 10, lift: 5 });
  add(c.boss, c.landlord, row(3.6), { n: 10, lift: 5, label: "房租 9.7" });
  add(c.boss, "gov", row(6.2), { n: 6, lift: 13, label: "税费 1.8" });
  add("hub", c.holder, v("holder"), { n: 40, lift: 10, speed: 11, label: "分红" });
  // chapter 6: savings into the bank, a loan to the coder, interest back up the hill
  const save = win(t, T.c6 + 10.5, T.c6 + 16.5, 0.8, 1.2);
  const loan = win(t, T.c6 + 12.5, T.c6 + 18, 1, 1.5);
  const interest = win(t, T.c6 + 16, T.c6 + 28.4, 0.8, 1.2);
  add(c.holder, "bank", save, { n: 30, lift: 10, label: "存款" });
  add(c.boss, "bank", save, { n: 30, lift: 10 });
  add(c.landlord, "bank", save * 0.7, { n: 18, lift: 8 });
  add("bank", c.coder, loan, { n: 30, lift: 8, col: LOAN, label: "房贷" });
  add("bank", c.rider, loan * 0.6, { n: 16, lift: 8, col: LOAN });
  add(c.coder, "bank", interest, { n: 18, lift: 6, label: "利息" });
  add(c.rider, "bank", interest * 0.7, { n: 12, lift: 6 });
  add("bank", c.holder, interest, { n: 26, lift: 10, label: "利息" });
  add("bank", c.boss, interest * 0.8, { n: 20, lift: 10 });
  // chapter 7: the river of money into new homes, and from the developer to the land sellers
  const rv = river(t);
  BUYERS.forEach((r, i) => add(r, "dev", rv * (0.55 + 0.45 * ((i * 7) % 5) / 4), { n: 8, lift: 10 + (i % 3) * 2, speed: 8, label: i === 4 ? "买房" : undefined }));
  add("dev", "gov", win(t, RIVER.peak - 6, RIVER.hold + 1, 1, 1.2), { n: 22, lift: 9, label: "卖地" });
  // chapter 9: the next waves: everyone buys the new thing; the profit goes up the hill to the owners
  for (let i = 0; i < 4; i++) {
    const s = techStart(i);
    const k = win(t, s, TECH.b, 0.8, 1.2);
    TECH_BUYERS.forEach((r, j) => {
      if ((j + i) % 2 === 0) add(r, `t${i}` as Pt, k * 0.8, { n: 6, lift: 8, speed: 8 });
    });
    add(`t${i}` as Pt, i % 2 === 0 ? 1 : 2, win(t, s + 2.2, TECH.b, 0.8, 1.2), { n: 18, lift: 6, label: i === 1 ? "利润" : undefined });
  }
  return out;
}

export type SceneState = {
  arcs: ArcFlow[];
  dim: number;
  glow: number;
  towerHi: number;
  built: number; // developer towers 0..1
  devDim: number;
  tech: number[]; // the four new towers 0..1
  savingsToBank: number;
  loans: number;
  interest: number;
  bands: number;
  grow: number;
  world: number;
  house: (h: House, s: HouseState) => HouseView;
};

export function scene(t: number): SceneState {
  const mc = machineryAt(t);
  const world = win(t, WORLD.a + 2.6, WORLD.b, 1.2, 1.5);
  const s: SceneState = {
    arcs: arcsAt(t),
    dim: Math.max(win(t, T.c5 + 1, T.c6, 1, 1) * 0.25, ramp(t, T.sources - 1, T.sources + 1)),
    glow: ramp(t, T.c11 + 12.5, T.c11 + 16.5),
    towerHi: win(t, T.c1 + 1, T.c1 + 12, 1, 2),
    built: builtAt(t),
    devDim: ramp(t, RIVER.hold, RIVER.b) * (1 - 0.5 * ramp(t, T.c9 + 2, T.c9 + 6)),
    tech: [0, 1, 2, 3].map((i) => ramp(t, techStart(i), techStart(i) + 3.2)),
    savingsToBank: win(t, T.c6 + 11, T.c6 + 28, 1, 2),
    loans: win(t, T.c6 + 12.5, T.c6 + 18, 1, 1.5),
    interest: win(t, T.c6 + 16, T.c6 + 28.4, 0.8, 1.2),
    grow: ramp(t, T.c5 + 18.5, T.c5 + 30) * (1 - ramp(t, T.c6 + 2, T.c6 + 5)),
    bands: ramp(t, T.c5 + 4.5, T.c5 + 6.5) * (1 - ramp(t, T.c5 + 17, T.c5 + 18.5)),
    world,
    house: () => null as unknown as HouseView,
  };

  s.house = (h, hs) => {
    const fin = finalOf(h) / capOf(h);
    const v: HouseView = { level: hs.level, hi: 0, red: hs.red, flow: hs.flow, dir: hs.dir, flowCol: GOLD, coins: 0, coinDir: 1, dimHouse: 0 };
    // chapter 3: the household the camera is with glows a little
    if (t >= T.c3 && t < T.c4) {
      for (const [r, at] of Object.entries(VISIT)) if (CAST[r as keyof typeof CAST] === h.rank) v.hi = 0.5 * win(t, at - 0.4, at + HOLD[r as keyof typeof HOLD] + 0.4, 0.5, 0.5);
    }
    // first split (chapter 2): wages run out to every house
    if (t < T.c3 + 3 && mc.split > 0) {
      v.flow = mc.split * (h.g === 0 ? 0.9 : 0.55);
      v.dir = -1;
      v.coins = mc.split * (h.g === 0 ? 0.9 : 0.35);
      v.coinDir = -1;
    }
    if (t >= T.c4 - 2) {
      v.level = fin;
      v.red = h.red ? 1 : 0;
    }
    // reveal: the top five, the next twenty, the other seventy-five, then the red ones
    if (t >= T.c4 && t < T.c5 + 1) {
      const g0 = win(t, T.c4 + 2.8, T.c4 + 8.6, 0.5, 0.8);
      const g12 = win(t, T.c4 + 8.1, T.c4 + 13.9, 0.6, 0.8);
      const g34 = win(t, T.c4 + 13.4, T.c4 + 19.4, 0.6, 0.8);
      const mine = h.g === 0 ? g0 : h.g <= 2 ? g12 : g34;
      const any = Math.max(g0, g12, g34);
      v.hi = mine;
      v.dimHouse = any * (1 - mine) * 0.9;
      if (h.red) v.red = 0.25 + 0.75 * Math.max(win(t, T.c4 + 13.6, T.c4 + 19.6, 0.4, 0.8), 1 - any);
      // years of this: wealth. The top ten glow.
      const w = win(t, T.c4 + 19.2, T.c4 + 24.2, 0.6, 0.6);
      if (w > 0) {
        v.hi = Math.max(v.hi, h.g <= 1 ? w : 0);
        v.dimHouse = Math.max(v.dimHouse, h.g <= 1 ? 0 : 0.55 * w);
      }
    }
    // chapter 5: the richest house in focus
    if (t >= T.c5 && t < T.c6 + 1) {
      const k = win(t, T.c5 + 1, T.c5 + 23, 1, 1);
      v.hi = h.rank === CAST.holder ? 0.6 * k : 0;
      v.dimHouse = h.rank === CAST.holder ? 0 : 0.6 * k;
      // ordinary households: their income is mostly wages
      const o = win(t, T.c5 + 23.2, T.c6 + 0.4, 0.8, 0.8);
      if (o > 0 && h.g >= 3) v.hi = 0.4 * o;
    }
    // chapter 6: savings flow out of the hill into the bank, loans go to the front rows, interest comes back up
    if (t >= T.c6 && t < T.c7 + 1) {
      const out = win(t, T.c6 + 10.5, T.c6 + 16.5, 0.8, 1.2);
      const interest = s.interest;
      if (h.g === 0) {
        v.flow = Math.max(out, interest);
        v.dir = out > interest ? 1 : -1;
        v.coins = v.flow;
        v.coinDir = v.dir;
        v.level = fin * (1 - 0.06 * out) + 0.06 * fin * interest;
      } else if (h.g >= 3) {
        const loan = s.loans * (h.red ? 1 : 0.6);
        if (loan > interest) {
          v.flow = loan * 0.8;
          v.dir = -1;
          v.flowCol = LOAN;
          v.coins = loan * 0.6;
          v.coinDir = -1;
        } else {
          v.flow = interest * 0.7;
          v.dir = 1;
          v.coins = interest * 0.55;
          v.coinDir = 1;
        }
      }
      if (h.rank === CAST.coder) v.hi = 0.5 * win(t, T.c6 + 21, T.c7 - 0.2, 0.8, 0.8);
    }
    // chapter 7: the buyers glow while the river runs; at the end, the 2021 buyer's tank turns red
    if (t >= T.c7 && t < T.c9) {
      v.red = h.red ? 1 - ramp(t, T.c7, T.c7 + 2) : 0;
      if (BUYERS.includes(h.rank)) v.hi = 0.45 * river(t);
      if (h.rank === CAST.coder) {
        const r21 = win(t, T.c7 + 34.2, T.c9 + 0.4, 0.6, 0.8);
        v.red = Math.max(v.red, r21);
        v.hi = Math.max(v.hi, 0.6 * r21);
        v.level = fin * (1 - 0.7 * r21);
      }
    }
    // chapter 9: the world. The richest ten tanks brim, the lower half almost empty.
    if (t >= T.c9 && t < T.c10 + 1) {
      if (h.g <= 1) {
        v.hi = Math.max(v.hi, world);
        v.level = fin + (1.0 - fin) * world * 0.9;
      } else if (h.rank >= 50) {
        v.dimHouse = 0.55 * world;
        v.level = fin * (1 - 0.85 * world);
      } else v.dimHouse = 0.25 * world;
      v.red = 0;
    }
    // chapter 10: settle back; without the new money, a third of the ordinary houses go dark for a moment; then the
    // small boss, who is paid last and loses first
    if (t >= T.c10 && t < T.c11) {
      v.red = 0;
      v.dimHouse = 0.2;
      const off = win(t, T.c10 + 5.2, T.c10 + 12.2, 0.6, 0.9);
      if (h.g >= 3 && h.seed < 0.38) v.dimHouse = Math.max(v.dimHouse, 0.95 * off);
      const boss = win(t, T.c10 + 12.4, T.c10 + 18.6, 0.6, 0.8);
      if (h.rank === CAST.boss) {
        v.red = Math.max(v.red, boss);
        v.hi = 0.5 * boss;
        v.level = fin * (1 - 0.5 * boss);
        v.flow = boss * 0.8;
        v.dir = 1;
        v.coins = boss * 0.7;
      }
    }
    // ending: one ordinary house; a little gold in its tank runs away to the rest of the town
    if (t >= T.c11) {
      v.red = h.red ? 0.15 * (1 - ramp(t, T.c11, T.c11 + 3)) : 0;
      const k = win(t, T.c11 + 2, T.sources + 2, 1.5, 1);
      if (h.rank === YOU_RANK) {
        v.hi = 0.5 * k;
        v.level = 0.22 * (1 - ramp(t, T.c11 + 7, T.c11 + 14)) + 0.02;
        v.flow = 0.6 * k;
        v.dir = 1;
        v.coins = 0.7 * k;
        v.coinDir = 1;
      } else {
        v.dimHouse = 0.35 * k * (1 - s.glow);
        v.flow = 0.7 * s.glow;
        v.coins = 0.5 * s.glow;
        v.coinDir = h.g === 0 ? -1 : 1;
        v.dir = h.g === 0 ? -1 : 1;
      }
    }
    return v;
  };
  return s;
}
