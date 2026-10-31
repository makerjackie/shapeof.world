// The shapes the income pillars draw over the near stalls (NEAR order). Heights are metres above the pillar base,
// 1 m = US$5,000 of revenue a year, so the levels sit at 2 m (US$10,000), 20 m (US$100,000) and 200 m (US$1 million).
import { NEAR, STAR } from "../world/market";

export const USD_M = 5000;
export const LEVEL_10K = 10000 / USD_M;
export const LEVEL_100K = 100000 / USD_M;
export const LEVEL_1M = 1e6 / USD_M;

// IRS Statistics of Income, tax year 2020, nonfarm sole proprietorships by size of business receipts (Table 3):
// [upper bound of the class in dollars, cumulative share of the 28,353,367 returns]. The first class starts at $300,
// the open top class is drawn up to $20 million.
const IRS: [number, number][] = [
  [300, 0],
  [2500, 0.2571],
  [5000, 0.3708],
  [10000, 0.5035],
  [25000, 0.6961],
  [50000, 0.8167],
  [100000, 0.9015],
  [200000, 0.9511],
  [500000, 0.9834],
  [1e6, 0.9939],
  [2.5e6, 0.9985],
  [5e6, 0.9995],
  [2e7, 1],
];

// Revenue at quantile q of the IRS distribution (log-linear inside each class).
export const irsReceipts = (q: number) => {
  for (let i = 1; i < IRS.length; i++) {
    const [x1, c1] = IRS[i];
    const [x0, c0] = IRS[i - 1];
    if (q <= c1) {
      const u = (q - c0) / (c1 - c0);
      return Math.exp(Math.log(x0) + u * (Math.log(x1) - Math.log(x0)));
    }
  }
  return 2e7;
};

const h01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Each near stall's quantile: brighter lamps stand higher; the hero street's star is the very top.
const order = NEAR.map((st, i) => ({ i, k: st.id === STAR ? 9 : st.s + st.seed * 1e-3 })).sort((a, b) => a.k - b.k);
export const Q = new Float32Array(NEAR.length);
order.forEach((o, r) => (Q[o.i] = (r + 0.5) / NEAR.length));

// The new shape: one year's revenue, as the IRS counts it.
export const H_NOW = Float32Array.from(Q, (q) => irsReceipts(q) / USD_M);
// The old shape (illustrative): every top between a floor and a ceiling.
export const FLOOR = 1.4;
export const CEIL = 4.6;
export const H_OLD = Float32Array.from(NEAR, (st, i) => FLOOR + 0.35 + (CEIL - FLOOR - 0.7) * h01(st.id + 0.5 * i * 0));
// No profit (31.2% in tax year 2023): the bottom quarter, and some of the rest (the IRS size table puts the losses
// mostly in the smallest classes).
export const LOSS = Uint8Array.from(Q, (q, i) => (q < 0.25 || h01(NEAR[i].id * 3.1) < 0.083 ? 1 : 0));
// China's small shops (PKU survey, Q3 2024): 20.7% at a loss, 20.9% only breaking even, by quantile.
export const CN_TINT = Float32Array.from(Q, (q) => (q < 0.207 ? 1 : q < 0.416 ? 2 : 0));

// More stalls, thinner slices (IRS 2005 -> 2023: 45% more returns, average real profit about 38% lower).
export const STEEP = Float32Array.from(Q, (q) => (q > 0.985 ? 2.2 : q > 0.9 ? 1.25 : 0.6));
