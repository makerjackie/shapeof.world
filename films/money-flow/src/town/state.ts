// Scene-level values per film time, and per-house overrides on top of the year model (sim.ts):
// highlights in the reveal, savings into the bank, loans out and interest back, the US section, the ending.
import * as THREE from "three";
import { CAST, House, YOU_RANK } from "./layout";
import { finalOf, capOf, HouseState, machineryAt } from "./sim";
import { T, VISIT, VISIT_HOLD, clamp, ramp, win } from "../timing";

const GOLD = new THREE.Color("#ffb53d");
const LOAN = new THREE.Color("#8fc4ff");

export type HouseView = { level: number; hi: number; red: number; flow: number; dir: number; flowCol: THREE.Color; coins: number; coinDir: number; dimHouse: number };
// a flow through the air from one household to another (rent, shop takings, dividends, loans, interest)
export type Pt = number | "hub" | "bank";
export type ArcFlow = { from: Pt; to: Pt; k: number; col?: THREE.Color; n?: number; lift?: number; speed?: number };

// who pays whom, in the air above the streets
function arcsAt(t: number): ArcFlow[] {
  const v = (k: keyof typeof VISIT) => win(t, VISIT[k] - 0.6, VISIT[k] + VISIT_HOLD + 0.4, 0.6, 0.6);
  const c = CAST;
  const out: ArcFlow[] = [];
  const add = (from: Pt, to: Pt, k: number, o: Partial<ArcFlow> = {}) => {
    if (k > 0.01) out.push({ from, to, k, ...o });
  };
  // chapter 3 visits
  add("hub", c.rider, v("rider") * 0.8, { n: 14 });
  add(c.rider, c.landlord, v("rider"), { lift: 9 });
  add(c.rider, "hub", v("rider") * 0.8, { n: 16 });
  add("hub", c.worker, v("worker") * 0.8, { n: 14 });
  add(c.worker, "hub", v("worker") * 0.8, { n: 16 });
  add("hub", c.coder, v("coder"), { n: 22 });
  add(c.coder, "bank", v("coder"), { n: 16, col: LOAN });
  for (const r of [c.rider, c.worker, 66, 71, 38]) add(r, c.landlord, v("landlord") * (r === c.rider ? 1 : 0.7), { lift: 9, n: 14 });
  for (const r of [c.rider, c.worker, c.coder, 52, 63, 80]) add(r, c.boss, v("boss") * 0.8, { lift: 8, n: 12 });
  add("hub", c.holder, v("holder"), { n: 40, lift: 10, speed: 11 });
  // chapter 6: savings into the bank, a loan to the coder, interest back up the hill
  const save = win(t, T.c6 + 10.5, T.c6 + 16.5, 0.8, 1.2);
  const loan = win(t, T.c6 + 12.5, T.c6 + 18, 1, 1.5);
  const interest = win(t, T.c6 + 16, T.c7 + 1, 0.8, 1.2);
  add(c.holder, "bank", save, { n: 30, lift: 10 });
  add(c.boss, "bank", save, { n: 30, lift: 10 });
  add(c.landlord, "bank", save * 0.7, { n: 18, lift: 8 });
  add("bank", c.coder, loan, { n: 30, lift: 8, col: LOAN });
  add("bank", c.rider, loan * 0.6, { n: 16, lift: 8, col: LOAN });
  add(c.coder, "bank", interest, { n: 18, lift: 6 });
  add(c.rider, "bank", interest * 0.7, { n: 12, lift: 6 });
  add("bank", c.holder, interest, { n: 26, lift: 10 });
  add("bank", c.boss, interest * 0.8, { n: 20, lift: 10 });
  return out;
}
export type SceneState = {
  arcs: ArcFlow[];
  us: number;
  dim: number;
  glow: number;
  towerHi: number;
  assetRise: number;
  stockRise: number;
  hubHot: number;
  us2008: number;
  checks: number;
  savingsToBank: number;
  toAssets: number;
  loans: number;
  interest: number;
  bands: number;
  grow: number;
  house: (h: House, s: HouseState) => HouseView;
};

export function scene(t: number): SceneState {
  const mc = machineryAt(t);
  const us = win(t, T.c9 + 0.5, T.c10 + 1, 1.5, 1.5);
  const s: SceneState = {
    arcs: arcsAt(t),
    us,
    dim: Math.max(win(t, T.c8 + 1, T.c9, 1, 1.2) * 0.75, win(t, T.c5 + 1, T.c6, 1, 1) * 0.25, ramp(t, T.sources - 1, T.sources + 1)),
    glow: ramp(t, T.c11 + 12.5, T.c11 + 16.5),
    towerHi: win(t, T.c1 + 1, T.c1 + 12, 1, 2) + win(t, T.c9 + 4, T.c9 + 16, 1, 2),
    assetRise: ramp(t, T.c7 + 2, T.c7 + 13) * (1 - us),
    stockRise: ramp(t, T.c9 + 9, T.c9 + 20) * us,
    hubHot: win(t, T.c9 + 35, T.c10 + 1, 1.5, 1.5),
    us2008: win(t, T.c9 + 5, T.c9 + 21, 1, 2),
    checks: win(t, T.c9 + 29, T.c9 + 38, 0.8, 1.5),
    savingsToBank: win(t, T.c6 + 11, T.c7 + 1, 1, 2),
    toAssets: win(t, T.c7 + 1, T.c7 + 16, 1, 2),
    loans: win(t, T.c6 + 12.5, T.c6 + 18, 1, 1.5),
    interest: win(t, T.c6 + 16, T.c7 + 1, 0.8, 1.2),
    grow: ramp(t, T.c5 + 18.5, T.c5 + 30) * (1 - ramp(t, T.c6 + 2, T.c6 + 5)),
    bands: ramp(t, T.c5 + 4.5, T.c5 + 6.5) * (1 - ramp(t, T.c6 - 0.5, T.c6 + 0.5)),
    house: () => null as unknown as HouseView,
  };

  s.house = (h, hs) => {
    const fin = finalOf(h) / capOf(h);
    const v: HouseView = { level: hs.level, hi: 0, red: hs.red, flow: hs.flow, dir: hs.dir, flowCol: GOLD, coins: 0, coinDir: 1, dimHouse: 0 };
    // chapter 3: the household the camera is with glows a little
    if (t >= T.c3 && t < T.c4) {
      for (const [r, at] of Object.entries(VISIT)) if (CAST[r as keyof typeof CAST] === h.rank) v.hi = 0.5 * win(t, at - 0.4, at + VISIT_HOLD + 0.4, 0.5, 0.5);
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
      const g34 = win(t, T.c4 + 13.4, T.c4 + 24.4, 0.6, 0.8);
      const mine = h.g === 0 ? g0 : h.g <= 2 ? g12 : g34;
      const any = Math.max(g0, g12, g34);
      v.hi = mine;
      v.dimHouse = any * (1 - mine) * 0.9;
      if (h.red) v.red = 0.25 + 0.75 * Math.max(win(t, T.c4 + 18.9, T.c5 + 1, 0.4, 0.8), 1 - any);
    }
    // chapter 5: the middle mansion (rank 2) in focus
    if (t >= T.c5 && t < T.c6 + 1) {
      const k = win(t, T.c5 + 1, T.c6 + 1, 1, 1);
      v.hi = h.rank === CAST.holder ? 0.6 * k : 0;
      v.dimHouse = h.rank === CAST.holder ? 0 : 0.6 * k;
    }
    // chapter 6: savings flow out of the hill into the bank, loans go to the front rows, interest comes back up
    if (t >= T.c6 && t < T.c7 + 1) {
      const out = win(t, T.c6 + 10.5, T.c6 + 16.5, 0.8, 1.2);
      const interest = win(t, T.c6 + 16, T.c7 + 1, 0.8, 1.2);
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
    }
    // chapter 7: the hill overflows toward the asset district
    if (t >= T.c7 && t < T.c8) {
      if (h.g === 0) {
        v.flow = s.toAssets;
        v.dir = 1;
        v.coins = s.toAssets;
      }
    }
    // chapter 8: everything dim except the middle house the floor plan belongs to
    if (t >= T.c8 && t < T.c9) v.dimHouse = 0.7 * win(t, T.c8 + 0.5, T.c9, 1, 1) * (h.rank === CAST.coder ? 0 : 1);
    // chapter 9: the US. 2008: tanks dim, money goes to Wall Street. 2020: checks to every door, spent at the shops.
    if (t >= T.c9 && t < T.c10 + 1) {
      v.dimHouse = 0.5 * us;
      v.level = fin * (1 - 0.6 * us);
      v.red = 0;
      const ck = s.checks;
      if (ck > 0) {
        const ph = clamp((t - (T.c9 + 29)) / 8);
        const inK = clamp(ph / 0.35);
        const outK = clamp((ph - 0.45) / 0.4);
        v.level += (h.g >= 2 ? 0.35 : 0.08) * (inK - outK) * us;
        v.flow = ck * (ph < 0.42 ? 0.8 : 0.6);
        v.dir = ph < 0.42 ? -1 : 1;
        v.coins = ck * (h.g >= 2 ? 0.6 : 0.2);
        v.coinDir = v.dir;
      }
    }
    // chapter 10: settle back
    if (t >= T.c10 && t < T.c11) v.red = h.red ? 1 - ramp(t, T.c10, T.c10 + 1.5) : 0;
    if (t >= T.c10 + 1 && t < T.c11) {
      v.dimHouse = 0.2;
      // "不放水，失业会更多": a third of the ordinary houses go dark for a moment
      const off = win(t, T.c10 + 13.4, T.c10 + 18.4, 0.6, 0.9);
      if (h.g >= 3 && h.seed < 0.38) v.dimHouse = Math.max(v.dimHouse, 0.95 * off);
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
