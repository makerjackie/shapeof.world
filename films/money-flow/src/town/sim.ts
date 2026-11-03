// The year as a model. Money has no serial numbers; this is the simple circuit the film says it is:
// each month the money still moving is paid out as income to the 100 households (and through firms and the
// government, which pay it on), each household keeps a share and spends the rest, and what is spent moves on.
//
// Calibrated so that after a year the money that stopped is split the way Chinese households' saving was split in the
// China Household Finance Survey (CHFS 2015, 2014 data): top 5% of households by income 50.6% of all household saving,
// top 10% 62.4%, top 25% 77.1%; about 40% of households spent more than they earned.
// Income shares and saving rates per group are chosen to be consistent with that and with an overall household saving
// rate of about a third (NBS flow of funds 2023: 274,770 / 786,891 ≈ 35%). They are visual only: not shown on screen.
import { HOUSES, House } from "./layout";
import { MONTHS, T, clamp, ramp, ss, win } from "../timing";

export const YI = 1e8;
// final share of the 1 亿 that stops with each group (sums to 1)
export const FINAL = [0.506, 0.118, 0.147, 0.229, 0] as const; // groups 3 and 4 together hold 22.9%; see below
// per-group share of income and saving rate (consistent with FINAL at an overall saving rate ≈ 0.33)
const INC = [0.23, 0.09, 0.18, 0.28, 0.22];
const SAVE = [0.72, 0.43, 0.27, 0.27, 0.0];
const S_BAR = INC.reduce((a, x, i) => a + x * SAVE[i], 0); // ≈ 0.33

// capacity of a tank (yuan when full), by group
const CAP = [1.12e7, 2.9e6, 1.4e6, 1.2e6, 1.2e6];

const count = [0, 0, 0, 0, 0];
HOUSES.forEach((h) => count[h.g]++);
// households that end with money: in groups 3–4 the non-red ones share 22.9%; red ones end at zero
const keepers34 = HOUSES.filter((h) => h.g >= 3 && !h.red).length;
const keepers2 = HOUSES.filter((h) => h.g === 2 && !h.red).length;
export const finalOf = (h: House) => {
  if (h.red) return 0;
  if (h.g === 0) return (FINAL[0] * YI) / count[0];
  if (h.g === 1) return (FINAL[1] * YI) / count[1];
  if (h.g === 2) return (FINAL[2] * YI) / keepers2;
  return (FINAL[3] * YI) / keepers34;
};
export const capOf = (h: House) => CAP[h.g];

// fraction of the year's saving done by the end of month m (0..12), geometric decay of the money still moving
const cumSaved = (m: number) => (1 - Math.pow(1 - S_BAR, m)) / (1 - Math.pow(1 - S_BAR, 12));
// money still moving at the start of month m (share of 1 亿)
const moving = (m: number) => Math.pow(1 - S_BAR, m);

export type HouseState = { level: number; flow: number; dir: number; red: number };

// month clock during chapter 3: m in [0, 12]
export const monthAt = (t: number) => clamp((t - MONTHS.start) / (MONTHS.end - MONTHS.start)) * 12;

// one household at time t (chapters 3 and after; before that tanks are empty)
export function houseAt(h: House, t: number): HouseState {
  const fin = finalOf(h) / capOf(h);
  if (t < MONTHS.start) return { level: 0, flow: 0, dir: 1, red: 0 };
  const m = monthAt(t);
  const mi = Math.min(11, Math.floor(m));
  const ph = m - mi; // phase within the month: 0–0.45 income arrives, 0.5–0.95 spending leaves
  const per = count[h.g];
  const income = (INC[h.g] * moving(mi) * YI) / per / capOf(h);
  const kept = fin * (cumSaved(mi + 1) - cumSaved(mi));
  const base = fin * cumSaved(mi);
  const inK = ss(ph / 0.45);
  const outK = ss((ph - 0.5) / 0.45);
  // the spending part arrives and leaves; the kept part arrives and stays
  const transit = Math.max(0, income - kept);
  let level = base + kept * inK + transit * (inK - outK);
  let flow = 0;
  let dir = 1;
  if (ph < 0.48) {
    flow = Math.sin(Math.PI * clamp(ph / 0.45)) * clamp(income * 2.2, 0.15, 1);
    dir = 1;
  } else if (ph < 0.97) {
    flow = Math.sin(Math.PI * clamp((ph - 0.5) / 0.45)) * clamp(transit * 2.2, 0.05, 1);
    dir = -1;
  }
  let red = 0;
  if (h.red) {
    // spends more than comes in: the tank drains past empty and the warning light comes on
    level = Math.max(0, level - outK * income * 0.4);
    red = ramp(m, 1.5, 4) * (0.55 + 0.45 * Math.sin(Math.PI * clamp((ph - 0.5) / 0.45)));
  }
  if (m >= 12) {
    level = fin;
    flow = 0;
    red = h.red ? 1 : 0;
  }
  return { level: clamp(level, 0, 1.02), flow, dir, red };
}

// what the 1 亿 is doing in the machinery before the year starts (0–1 intensities per named pipe)
export function machineryAt(t: number) {
  const k = (a: number, b: number) => win(t, a, b, 0.8, 1.2);
  return {
    torrent: win(t, T.hook - 1, T.c1 + 4, 0.5, 1.5),
    towerBank: k(T.c1 + 3.8, T.c1 + 30),
    bankShanty: k(T.c1 + 13.8, T.c2 + 6),
    shantyGold: win(t, T.c1 + 19.2, T.c2 + 9, 1.5, 2.5),
    demolish: ramp(t, T.c2 + 5, T.c2 + 10.5),
    shantyDev: k(T.c2 + 4.5, T.c2 + 16),
    devGov: k(T.c2 + 8.8, T.c2 + 20),
    devHub: k(T.c2 + 14.4, T.c2 + 26),
    govHub: k(T.c2 + 14.4, T.c2 + 26),
    hubSpine: k(T.c2 + 19.8, T.c3 + 30),
    hubGov: k(T.c2 + 19.8, T.c3 + 30),
    split: win(t, T.c2 + 19.8, T.c3 + 2, 0.8, 1.0),
    devRise: ramp(t, T.c2 + 4.5, T.c2 + 15),
  };
}

// circulation strength through the trunks during the year (fades as money stops)
export const circulation = (t: number) => {
  if (t < MONTHS.start) return 0;
  const m = monthAt(t);
  return m >= 12 ? 0 : Math.pow(1 - S_BAR, m) * 0.9 + 0.1;
};

// how much of the money passed through a household's hands over the year (all its income from the 1 亿, every round)
export const passedOf = (h: House) => {
  let sum = 0;
  for (let m = 0; m < 12; m++) sum += moving(m);
  return ((INC[h.g] * sum) / count[h.g]) * YI;
};
