// The whole film as data: where the year cursor is at each bar, what the camera does, and every event.
// Times are in bars (130 BPM). tools/cues.mjs dumps the cues for the score.
import { births, crossing, fmtWan, pct, popAt, row } from "./data";

// ---------- monotone cubic through keys (Fritsch–Carlson): smooth speed, never overshoots
export const mono = (k: [number, number][]) => {
  const n = k.length;
  const xs = k.map((p) => p[0]);
  const ys = k.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
};

export const X60 = crossing(1959); // 1960: deaths pass births
export const X22 = crossing(2021); // 2022: again

// ---------- the year cursor
export const CURSOR = mono([
  [0, 2016.2],
  [2.5, 2022.0],
  [4.2, 2022.15],
  [4.6, 2021.7],
  [5.0, 2000],
  [5.5, 1980],
  [6.0, 1960],
  [6.5, 1949],
  [8, 1949],
  [10, 1952],
  [12, 1955.5],
  [13.5, 1957],
  [15, 1958.4],
  [17, 1959.4],
  [19, 1960.0],
  [21, 1960.75],
  [22, 1961.1],
  [23, 1962.1],
  [24, 1963],
  [26, 1964.6],
  [29, 1969],
  [31, 1971],
  [33, 1974],
  [35, 1977.4],
  [37, 1980],
  [38.5, 1981],
  [40, 1982.2],
  [42, 1985.6],
  [43.5, 1987],
  [45, 1988.3],
  [47.5, 1991.6],
  [49.5, 1995],
  [52, 2000],
  [54.5, 2005],
  [57, 2010.6],
  [58.5, 2013],
  [60, 2015.3],
  [61.5, 2016],
  [62.5, 2017],
  [65, 2019.3],
  [66, 2020],
  [67.5, 2021],
  [69.5, 2022.0],
  [70.5, 2022.25],
  [71.5, 2023],
  [73.5, 2024],
  [76, 2025],
  [104, 2025],
]);

// ---------- camera: visible span in years, head position (fraction of width), tilt
export const SPAN = mono([
  [0, 9], [2.5, 7.5], [4.2, 8], [4.6, 12], [5.5, 40], [6.5, 14], [8, 7], [12, 9], [15, 9], [17, 6.5], [21, 6.2],
  [24, 8], [27, 11], [33, 15], [37, 14], [44, 16], [49, 22], [54, 26], [57, 22], [61.5, 13], [66, 11], [69.5, 9],
  [71, 10], [76, 12], [77.6, 12], [80.2, 82], [84, 82],
]);
export const HEADX = mono([[0, 0.8], [6.5, 0.8], [8, 0.62], [12, 0.8], [76, 0.8], [77.6, 0.8], [80.2, 0.95], [84, 0.95]]);
export const TILT = mono([
  [0, -10], [4, -6], [6.5, 0], [8, -12], [14, -6], [19, -14], [24, -4], [30, -10], [37, -3], [45, -12], [52, -6],
  [58, -12], [62, -4], [66, -12], [70, -2], [76, -10], [80, 0],
]);
export const TILTX = mono([[0, 8], [8, 10], [24, 4], [40, 9], [60, 5], [76, 8], [80, 0]]);

// ---------- events
export type Ev =
  | { k: "call"; at: number; out: number; tag: string; tc: string; title: string; sub?: string[]; date?: string }
  | { k: "big"; at: number; out: number; text: string; c: "up" | "down" | "gold"; sub?: string; y?: number }
  | { k: "alarm"; at: number; out: number; title: string; sub: string }
  | { k: "fire"; at: number; x: number; big?: boolean }
  | { k: "bolt"; at: number; x: number }
  | { k: "slam"; at: number; out: number; small: string; big: string }
  | { k: "mile"; at: number; out: number; v: number };

const fp = (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}%`;
const b = (y: number) => row(y).b;

export const TAG = { 政策: "#ffb547", 灾难: "#ff4d5e", 人口: "#ff6f86", 世界: "#5fc8ff", 观点: "#c9a8ff", 开端: "#ffd166", 普查: "#7fe3c4" } as const;

export const EVENTS: Ev[] = [
  // cold open
  { k: "alarm", at: 2.5, out: 4.4, title: "死亡人数，超过了出生", sub: `2022 · 出生 ${fmtWan(b(2022))} 万 · 死亡 ${fmtWan(row(2022).d)} 万` },
  { k: "slam", at: 4.45, out: 4.95, small: "上一次这样", big: "是哪一年？" },
  { k: "slam", at: 5.0, out: 5.45, small: "回到", big: "2000" },
  { k: "slam", at: 5.5, out: 5.95, small: "回到", big: "1980" },
  { k: "slam", at: 6.0, out: 6.45, small: "回到", big: "1960" },
  { k: "slam", at: 6.5, out: 8.0, small: "中国人口", big: "1949 → 2025" },
  // 1949-1958
  { k: "call", at: 8.1, out: 9.9, tag: "开端", tc: TAG.开端, title: "新中国成立", sub: ["1949 年末 · 5.4 亿人", "这一年出生约 1900 万"] },
  { k: "call", at: 10.1, out: 12.6, tag: "人口", tc: TAG.人口, title: "死亡率，八年降一半", sub: ["1949 年 20‰ → 1957 年 10.8‰", "战乱结束，防疫普及"] },
  { k: "call", at: 13.0, out: 15.2, tag: "观点", tc: TAG.观点, title: "马寅初《新人口论》", sub: ["1957.07 · 人民日报", "主张控制人口，随后受到批判"] },
  // the crisis
  { k: "bolt", at: 16.5, x: 1959.2 },
  { k: "call", at: 16.6, out: 18.8, tag: "灾难", tc: TAG.灾难, title: "三年困难时期", sub: ["1959—1961", "出生骤减，死亡骤增"] },
  { k: "alarm", at: 19.0, out: 21.4, title: "死亡 > 出生", sub: `1960 · 总人口减少 ${fmtWan(row(1959).pop - row(1960).pop)} 万` },
  { k: "bolt", at: 19.0, x: 1960 },
  { k: "big", at: 21.5, out: 22.55, text: fp(pct(b(1957), b(1961))), c: "down", sub: `1961 年出生 ${fmtWan(b(1961))} 万 · 比 1957 年` },
  // the boom
  { k: "call", at: 22.6, out: 23.9, tag: "人口", tc: TAG.人口, title: "补偿性生育", sub: ["1962 年，出生翻倍"] },
  { k: "fire", at: 24.0, x: 1963, big: true },
  { k: "big", at: 24.0, out: 26.6, text: `${fmtWan(b(1963))} 万`, c: "up", sub: "1963 · 新中国出生最多的一年" },
  { k: "call", at: 26.8, out: 29.0, tag: "人口", tc: TAG.人口, title: "连续 9 年，每年出生超 2500 万", sub: ["1963—1971"] },
  { k: "call", at: 30.6, out: 33.0, tag: "政策", tc: TAG.政策, title: "计划生育开始", sub: ["1971 · 国务院转发计划生育报告", "1973 · 提倡“晚、稀、少”"] },
  { k: "big", at: 34.2, out: 36.4, text: fp(pct(b(1971), b(1979))), c: "down", sub: "1971 → 1979 · 每年出生" },
  { k: "call", at: 37.0, out: 39.3, tag: "政策", tc: TAG.政策, title: "提倡只生一个", sub: ["1980.09.25 · 《公开信》", "提倡一对夫妇只生育一个孩子"] },
  { k: "call", at: 39.5, out: 41.6, tag: "普查", tc: TAG.普查, title: "计划生育，定为基本国策", sub: ["1982 · 同年第三次人口普查", "10.08 亿人"] },
  { k: "fire", at: 43.5, x: 1987 },
  { k: "big", at: 43.5, out: 45.6, text: `${fmtWan(b(1987))} 万`, c: "up", sub: "1987 · 第二个高峰" },
  { k: "call", at: 45.8, out: 47.6, tag: "人口", tc: TAG.人口, title: "60 年代出生的人，当了父母", sub: ["高峰的回声"] },
  { k: "call", at: 51.6, out: 53.8, tag: "人口", tc: TAG.人口, title: "进入老龄化社会", sub: ["2000 · 65 岁以上约占 7%"] },
  { k: "call", at: 55.2, out: 57.2, tag: "人口", tc: TAG.人口, title: "每年出生，稳在约 1600 万", sub: ["2003—2010"] },
  { k: "call", at: 57.5, out: 59.3, tag: "政策", tc: TAG.政策, title: "单独二孩", sub: ["2013.11 · 夫妻一方是独生子女，可生二孩"] },
  { k: "call", at: 59.5, out: 61.4, tag: "政策", tc: TAG.政策, title: "全面二孩", sub: ["2016.01.01 起施行"] },
  { k: "fire", at: 61.5, x: 2016 },
  { k: "big", at: 61.5, out: 63.4, text: `${fmtWan(b(2016))} 万`, c: "up", sub: "2016 · 二孩第一年" },
  { k: "bolt", at: 66.0, x: 2020 },
  { k: "big", at: 66.0, out: 67.4, text: fp(pct(b(2019), b(2020))), c: "down", sub: `2020 · 出生 ${fmtWan(b(2020))} 万` },
  { k: "call", at: 67.5, out: 69.3, tag: "政策", tc: TAG.政策, title: "三孩政策", sub: ["2021.05.31", `这一年末：${fmtWan(row(2021).pop)} 万人，到顶`] },
  { k: "alarm", at: 69.5, out: 71.3, title: "死亡 > 出生", sub: "2022 · 62 年来第一次" },
  { k: "bolt", at: 69.5, x: 2022 },
  { k: "call", at: 71.5, out: 73.4, tag: "世界", tc: TAG.世界, title: "印度人口超过中国", sub: ["2023.04 · 联合国"] },
  { k: "call", at: 73.5, out: 74.9, tag: "人口", tc: TAG.人口, title: "龙年，小小回升", sub: [`2024 · 出生 ${fmtWan(b(2024))} 万`] },
  { k: "call", at: 74.9, out: 76.0, tag: "政策", tc: TAG.政策, title: "育儿补贴", sub: ["2025.07 · 3 岁以下每孩每年 3600 元"] },
  { k: "bolt", at: 76.0, x: 2025 },
  { k: "big", at: 76.0, out: 78.4, text: `${fmtWan(b(2025))} 万`, c: "down", sub: "2025 · 1949 年以来出生最少" },
  // the whole picture
  { k: "big", at: 80.4, out: 84.0, text: fp(pct(b(1963), b(2025))), c: "down", sub: "1963 → 2025 · 每年出生的人", y: 600 },
];

// population milestones: when the header passes 6亿 … 14亿
export const cursorAt = (bar: number) => CURSOR(bar);
const MILES: Ev[] = [];
for (let v = 60000; v <= 140000; v += 10000) {
  for (let t = 8; t < 76; t += 0.02) {
    const c0 = CURSOR(t);
    const c1 = CURSOR(t + 0.02);
    if (popAt(c0) < v && popAt(c1) >= v) {
      MILES.push({ k: "mile", at: t + 0.02, out: t + 1.6, v });
      break;
    }
  }
}
export const MILESTONES = MILES;
export const ALL_EVENTS = [...EVENTS, ...MILES];

// hits for the score: bar, kind
export const CUES = ALL_EVENTS.map((e) => ({ at: e.at, k: e.k }));
export const peakBirths = births(1963);
