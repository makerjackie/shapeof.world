// Every number on screen, with its source. Full notes and links: research/01–07 and PLAN.md.
// Dates are ISO strings; `yr()` turns them into fractional years for the time axes.

export const yr = (d: string) => {
  const [y, m = 1, day = 15] = d.split("-").map(Number);
  return y + (m - 1) / 12 + (day - 1) / 365;
};

export const START = "2022-11-30"; // ChatGPT release
export const TODAY = "2026-10-22";
export const T0 = yr(START);
export const T1 = yr(TODAY);

export type Pt = [string, number];

// ── Lane 1, 钱: Nvidia month-end market cap, trillion USD (close × SEC cover shares; research/02 chart A) ──
export const NVDA: Pt[] = [
  ["2022-11-30", 0.42], ["2022-12-30", 0.36], ["2023-01-31", 0.48], ["2023-02-28", 0.57], ["2023-03-31", 0.69],
  ["2023-04-28", 0.69], ["2023-05-31", 0.93], ["2023-06-30", 1.04], ["2023-07-31", 1.15], ["2023-08-31", 1.22],
  ["2023-09-29", 1.07], ["2023-10-31", 1.01], ["2023-11-30", 1.16], ["2023-12-29", 1.22], ["2024-01-31", 1.52],
  ["2024-02-29", 1.98], ["2024-03-28", 2.26], ["2024-04-30", 2.16], ["2024-05-31", 2.7], ["2024-06-28", 3.04],
  ["2024-07-31", 2.88], ["2024-08-30", 2.93], ["2024-09-30", 2.98], ["2024-10-31", 3.26], ["2024-11-29", 3.39],
  ["2024-12-31", 3.29], ["2025-01-24", 3.5], ["2025-01-27", 2.9], ["2025-01-31", 2.94], ["2025-02-28", 3.05],
  ["2025-03-31", 2.64], ["2025-04-04", 2.3], ["2025-04-30", 2.66], ["2025-05-30", 3.3], ["2025-06-30", 3.85],
  ["2025-07-31", 4.34], ["2025-08-29", 4.23], ["2025-09-30", 4.53], ["2025-10-31", 4.92], ["2025-11-28", 4.3],
  ["2025-12-31", 4.53], ["2026-01-30", 4.64], ["2026-02-27", 4.31], ["2026-03-31", 4.24], ["2026-04-30", 4.85],
  ["2026-05-29", 5.11], ["2026-06-30", 4.84], ["2026-07-31", 4.86], ["2026-08-31", 5.32], ["2026-09-30", 5.5],
  ["2026-10-06", 5.77], ["2026-10-21", 5.35],
];
// Milestones: first close (or intraday where noted) above each trillion.
export const NVDA_MILES: { d: string; v: number; t: string }[] = [
  { d: "2023-05-30", v: 1, t: "1 万亿" },
  { d: "2024-02-23", v: 2, t: "2 万亿" },
  { d: "2024-06-05", v: 3, t: "3 万亿" },
  { d: "2025-07-09", v: 4, t: "4 万亿" },
  { d: "2025-10-29", v: 5, t: "5 万亿" },
];
// Quarterly revenue, billion USD (Nvidia IR), fiscal quarters FY23 Q3 → FY27 Q2.
export const NVDA_REV: Pt[] = [
  ["2022-10", 5.93], ["2023-01", 6.05], ["2023-04", 7.19], ["2023-07", 13.51], ["2023-10", 18.12], ["2024-01", 22.1],
  ["2024-04", 26.04], ["2024-07", 30.04], ["2024-10", 35.08], ["2025-01", 39.33], ["2025-04", 44.06], ["2025-07", 46.74],
  ["2025-10", 57.01], ["2026-01", 68.13], ["2026-04", 81.62], ["2026-07", 96.22],
];

// ── Lane 2, 芯片: global DRAM industry revenue per quarter, billion USD (TrendForce; 2Q23 and 4Q24 back-solved) ──
export const DRAM_REV: Pt[] = [
  ["2022-11-30", 12.28], ["2023-05-15", 11.42], ["2023-08-15", 13.48], ["2023-11-15", 17.46], ["2024-02-15", 18.35],
  ["2024-05-15", 22.9], ["2024-08-15", 26.02], ["2024-11-15", 28.58], ["2025-02-15", 27.01], ["2025-05-15", 31.63],
  ["2025-08-15", 41.4], ["2025-11-15", 53.58], ["2026-02-15", 97.0], ["2026-05-15", 154.73],
];
// DDR5 16Gb (2Gx8) spot, USD per chip (TrendForce / DRAMeXchange).
export const DDR5_SPOT: Pt[] = [
  ["2025-06-23", 6.01], ["2026-08-31", 53.92], ["2026-10-05", 58.07], ["2026-10-22", 61.1],
];
// DDR4 8Gb spot, USD per chip (2666 grade in 2023, 3200 grade from 2025; the grade change makes it indicative).
export const DDR4_SPOT: Pt[] = [
  ["2023-08-03", 1.47], ["2023-11-29", 1.71], ["2025-11-18", 12.76], ["2025-12-09", 17.06], ["2026-06-09", 35.9],
  ["2026-08-31", 44.37], ["2026-10-22", 47.0],
];

// ── Lane 3, 电: PJM capacity price by auction result date, USD/MW-day (PJM releases) ──
export const PJM: { d: string; v: number; dy: string; cap?: boolean }[] = [
  { d: "2022-06-21", v: 34.13, dy: "2023/24" },
  { d: "2023-02-28", v: 28.92, dy: "2024/25" },
  { d: "2024-07-30", v: 269.92, dy: "2025/26" },
  { d: "2025-07-22", v: 329.17, dy: "2026/27", cap: true },
  { d: "2025-12-17", v: 333.44, dy: "2027/28", cap: true },
  { d: "2026-07-14", v: 325, dy: "2028/29", cap: true },
];
// Global data-centre electricity, TWh (IEA 2025 report; 2025 = 415 × 1.17 from IEA's +17%; 2030 base case).
export const DC_TWH = { y2024: 415, y2025: 486, y2030: 945, growth2025: 17, world2025: 3 };

// ── Lane 4, 工作: US unemployment rate, % (BLS LNS14000000; 2025-10 not published) ──
export const UNRATE: Pt[] = [
  ["2022-11", 3.6], ["2022-12", 3.5], ["2023-01", 3.5], ["2023-02", 3.6], ["2023-03", 3.5], ["2023-04", 3.4],
  ["2023-05", 3.6], ["2023-06", 3.6], ["2023-07", 3.5], ["2023-08", 3.7], ["2023-09", 3.7], ["2023-10", 3.9],
  ["2023-11", 3.7], ["2023-12", 3.8], ["2024-01", 3.7], ["2024-02", 3.9], ["2024-03", 3.9], ["2024-04", 3.9],
  ["2024-05", 3.9], ["2024-06", 4.1], ["2024-07", 4.2], ["2024-08", 4.2], ["2024-09", 4.1], ["2024-10", 4.1],
  ["2024-11", 4.2], ["2024-12", 4.1], ["2025-01", 4.0], ["2025-02", 4.2], ["2025-03", 4.2], ["2025-04", 4.2],
  ["2025-05", 4.3], ["2025-06", 4.1], ["2025-07", 4.3], ["2025-08", 4.3], ["2025-09", 4.4], ["2025-11", 4.5],
  ["2025-12", 4.4], ["2026-01", 4.3], ["2026-02", 4.4], ["2026-03", 4.3], ["2026-04", 4.3], ["2026-05", 4.3],
  ["2026-06", 4.2], ["2026-07", 4.1], ["2026-08", 4.1], ["2026-09", 4.2],
];

// Canaries (Brynjolfsson, Chandar & Chen, Aug 2026): ADP employment index, Nov 2022 = 1. Text: the two most exposed
// quintiles fell about 11% for ages 22–25, the three least exposed grew about 10%. Series read off the paper's figures
// (±0.005); "exposed" = mean of quintiles 4 and 5.
const CAN_D = ["2022-11", "2023-02", "2023-05", "2023-08", "2023-11", "2024-02", "2024-05", "2024-08", "2024-11", "2025-02", "2025-05", "2025-08", "2025-11", "2026-02", "2026-05", "2026-06"];
const zip = (vals: number[]): Pt[] => vals.map((v, i) => [CAN_D[i], v]);
export const YOUNG_EXPOSED = zip([1, 0.998, 0.986, 0.992, 1.001, 0.984, 0.972, 0.974, 0.972, 0.952, 0.933, 0.936, 0.935, 0.922, 0.897, 0.896]);
export const YOUNG_SAFE = zip([1, 1.02, 1.029, 1.041, 1.084, 1.077, 1.088, 1.09, 1.123, 1.104, 1.1, 1.098, 1.115, 1.1, 1.099, 1.096]);
export const MID_ALL = zip([1, 1.014, 1.025, 1.03, 1.048, 1.055, 1.066, 1.074, 1.091, 1.093, 1.099, 1.104, 1.117, 1.118, 1.117, 1.114]);
export const DEV_YOUNG = zip([1, 0.966, 0.922, 0.926, 0.903, 0.886, 0.868, 0.881, 0.853, 0.828, 0.833, 0.861, 0.834, 0.809, 0.789, 0.812]);
export const DEV_SENIOR = zip([1, 1.013, 1.033, 1.04, 1.053, 1.062, 1.08, 1.088, 1.102, 1.119, 1.159, 1.163, 1.187, 1.19, 1.2, 1.202]);

// ── Money chapter ──
// Calendar-year cash capex, billion USD (SEC cash-flow statements; 2026 = company guidance, mixed bases).
export const CAPEX: { y: string; msft: number; goog: number; amzn: number; meta: number; guide?: boolean }[] = [
  { y: "2022", msft: 24.8, goog: 31.5, amzn: 63.6, meta: 31.2 },
  { y: "2023", msft: 35.2, goog: 32.3, amzn: 52.7, meta: 27.0 },
  { y: "2024", msft: 55.6, goog: 52.5, amzn: 83.0, meta: 37.3 },
  { y: "2025", msft: 83.1, goog: 91.4, amzn: 131.8, meta: 69.7 },
  { y: "2026", msft: 175, goog: 200, amzn: 220, meta: 140, guide: true },
];
export const CAPEX_CO = [
  { k: "amzn", name: "亚马逊", color: "#ff9f43" },
  { k: "goog", name: "Alphabet", color: "#ffbe7a" },
  { k: "msft", name: "微软", color: "#d97a2b" },
  { k: "meta", name: "Meta", color: "#ffd9b0" },
] as const;

export const VALUATIONS = {
  openai: [
    { d: "2024-10", v: 1570 },
    { d: "2025-03", v: 3000 },
    { d: "2025-10", v: 5000 },
    { d: "2026-03", v: 8520 },
  ],
  anthropic: [
    { d: "2025-03", v: 615 },
    { d: "2025-09", v: 1830 },
    { d: "2026-02", v: 3800 },
    { d: "2026-05", v: 9650 },
  ],
};

// Stack Overflow new questions per month (Stack Exchange API, pulled 2026-10-22).
export const SO: Pt[] = [
  ["2022-01", 119167], ["2022-02", 113640], ["2022-03", 123262], ["2022-04", 113932], ["2022-05", 115911], ["2022-06", 111157],
  ["2022-07", 110579], ["2022-08", 112526], ["2022-09", 103417], ["2022-10", 105744], ["2022-11", 109120], ["2022-12", 96161],
  ["2023-01", 96624], ["2023-02", 85569], ["2023-03", 87126], ["2023-04", 68351], ["2023-05", 66341], ["2023-06", 63492],
  ["2023-07", 62557], ["2023-08", 59938], ["2023-09", 52684], ["2023-10", 52334], ["2023-11", 50273], ["2023-12", 42284],
  ["2024-01", 47572], ["2024-02", 45925], ["2024-03", 44708], ["2024-04", 42361], ["2024-05", 40021], ["2024-06", 31930],
  ["2024-07", 31436], ["2024-08", 27781], ["2024-09", 24731], ["2024-10", 23162], ["2024-11", 20806], ["2024-12", 17915],
  ["2025-01", 18182], ["2025-02", 15500], ["2025-03", 15075], ["2025-04", 11385], ["2025-05", 9645], ["2025-06", 7748],
  ["2025-07", 6621], ["2025-08", 5021], ["2025-09", 5072], ["2025-10", 5264], ["2025-11", 5349], ["2025-12", 4167],
  ["2026-01", 3627], ["2026-02", 3080], ["2026-03", 2989], ["2026-04", 2323], ["2026-05", 1990], ["2026-06", 1705],
  ["2026-07", 1175], ["2026-08", 1019], ["2026-09", 971],
];

// Drawdown from the window high (closing prices; window 2025-06 → 2026-10, Chegg from its 2021 peak).
export const LOSERS: { g: string; rows: { n: string; v: number; note?: string }[] }[] = [
  { g: "教育 · 自由职业", rows: [{ n: "Chegg", v: -99, note: "2021 峰值起" }, { n: "Duolingo", v: -83 }, { n: "Fiverr", v: -75 }] },
  { g: "信息服务 · 法律", rows: [{ n: "Gartner", v: -71 }, { n: "Thomson Reuters", v: -64 }, { n: "Wolters Kluwer", v: -64 }] },
  { g: "IT 外包", rows: [{ n: "Globant", v: -73 }, { n: "Accenture", v: -61 }, { n: "Nifty IT 指数", v: -35 }] },
  { g: "软件", rows: [{ n: "HubSpot", v: -72 }, { n: "Intuit", v: -68 }, { n: "Adobe", v: -54 }] },
];

// ── People chapter ──
// METR 50% time horizon, minutes (metr.org benchmark_results_1_1.yaml).
export const METR: { d: string; m: string; v: number; show?: boolean }[] = [
  { d: "2023-03-14", m: "GPT-4", v: 3.99, show: true },
  { d: "2024-05-13", m: "GPT-4o", v: 6.99 },
  { d: "2024-06-20", m: "Claude 3.5 Sonnet", v: 11.4 },
  { d: "2024-09-12", m: "o1-preview", v: 20.3 },
  { d: "2024-12-05", m: "o1", v: 38.8 },
  { d: "2025-02-24", m: "Claude 3.7 Sonnet", v: 60.4 },
  { d: "2025-04-16", m: "o3", v: 119.7 },
  { d: "2025-08-07", m: "GPT-5", v: 203, show: true },
  { d: "2025-11-24", m: "Claude Opus 4.5", v: 293 },
  { d: "2025-12-11", m: "GPT-5.2", v: 352 },
  { d: "2026-02-05", m: "Claude Opus 4.6", v: 719, show: true },
  { d: "2026-04-07", m: "Claude Mythos Preview", v: 1045, show: true },
];

// ChatGPT weekly active users, 亿 (OpenAI, self-reported).
export const WAU: Pt[] = [
  ["2023-11-06", 1], ["2024-08-29", 2], ["2024-12-04", 3], ["2025-02-20", 4], ["2025-03-31", 5], ["2025-08-04", 7],
  ["2025-10-06", 8], ["2026-02-27", 9], ["2026-09-29", 12],
];

// Deezer: share of daily uploads that are fully AI-generated, % (Deezer newsroom, self-reported).
export const DEEZER: Pt[] = [
  ["2025-01", 10], ["2025-04", 18], ["2025-09", 28], ["2025-11", 34], ["2026-01", 39], ["2026-04", 44], ["2026-06", 50],
];

// Challenger, Gray & Christmas: announced US job cuts that cite AI.
export const AI_CUTS = [
  { y: "2023", v: 4247 },
  { y: "2024", v: 12742 },
  { y: "2025", v: 54836 },
  { y: "2026 1–9 月", v: 120136 },
];

// ── Forecasts ──
export const AGI_RULER: { who: string; when: number; label: string; seller?: boolean; up: boolean; h: number }[] = [
  { who: "Altman", when: 2026.95, label: "2026 年底（公司内部）", seller: true, up: true, h: 60 },
  { who: "Amodei", when: 2027.5, label: "1–2 年（2026-01 说）", seller: true, up: false, h: 50 },
  { who: "Kokotajlo", when: 2027.85, label: "2027-11（自动化程序员）", up: true, h: 160 },
  { who: "Hassabis", when: 2030, label: "2030 ± 1 年", seller: true, up: false, h: 150 },
  { who: "Metaculus", when: 2033, label: "约 2033（社区中位数）", up: true, h: 80 },
  { who: "Karpathy", when: 2035, label: "约 2035（“十年”）", up: false, h: 60 },
  { who: "研究者问卷", when: 2042, label: "2042（50% 概率）", up: true, h: 110 },
  { who: "Narayanan & Kapoor", when: 2050, label: "几十年", up: false, h: 70 },
];

// PJM steps for the time axes: the first price (set in June 2022) is drawn from the axis start, 2022-11-30.
export const PJM_PLOT: Pt[] = PJM.map((p, i) => [i === 0 ? START : p.d, p.v]);
