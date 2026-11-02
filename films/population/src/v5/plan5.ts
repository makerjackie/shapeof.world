// Film5 (v3 cut, ~2:17): the reference soundtrack re-edited on bar lines, and every story beat placed on one of its accents.
// Times written F(x) are SOURCE seconds in public/ref_full.wav; F() maps them to film seconds through the EDL.
import { SERIES, val } from "./series5";

// ---------------- music edit (source seconds, cut on bar lines; 15 ms equal-power crossfades)
export const EDL: [number, number][] = [
  [0.0, 14.8], [18.5, 35.11], [42.5, 51.72], [59.12, 70.19], [77.6, 92.49], [99.93, 116.67],
  [136.92, 143.78], [150.84, 160.0], [164.56, 180.84], [187.76, 196.86], [206.09, 212.63], [227.75, 232.22],
];
export const TAIL = 1.8;
// longer crossfades into some segments (index -> seconds); the rest use 15 ms
export const XFADE: Record<number, number> = { 6: 0.4 };
const STARTS: number[] = [];
{
  let s = 0;
  for (const [a, b] of EDL) {
    STARTS.push(s);
    s += b - a;
  }
}
export const MUSIC_DUR = EDL.reduce((s, [a, b]) => s + b - a, 0);
export const DUR = +(MUSIC_DUR + TAIL).toFixed(3);
export const F = (src: number) => {
  for (let i = 0; i < EDL.length; i++) {
    const [a, b] = EDL[i];
    if (src >= a - 1e-6 && src <= b + 1e-6) return +(STARTS[i] + src - a).toFixed(3);
  }
  throw new Error(`source time ${src} is not in the EDL`);
};

// ---------------- the year cursor: piecewise, each key says how we ARRIVE at it
//   lin = steady drift · io = ease in-out (a move) · in = accelerate into the key (a slam) · out = burst then settle
type Ease = "lin" | "io" | "in" | "out";
const EASE: Record<Ease, (x: number) => number> = {
  lin: (x) => x,
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  in: (x) => Math.pow(x, 2.4),
  out: (x) => 1 - Math.pow(1 - x, 3),
};
export const CUR_KEYS: [number, number, Ease][] = [
  [0, 1741, "lin"],
  [F(1.84), 1851, "out"], // the Qing boom (清实录 counts) in two seconds
  [F(2.8), 1851, "lin"],
  [F(4.74), 1880, "in"], // Taiping: slam
  [F(5.58), 1880, "lin"],
  [F(6.47), 2, "io"], // rewind: the whole line runs backwards to 公元 2 年
  [F(9.27), 2, "lin"],
  [F(12.02), 57, "in"], // 新莽: slam
  [F(13.3), 57, "lin"],
  [F(19.18), 157, "io"], // 光武中兴 (across the 14.80 seam)
  [F(20.56), 157, "lin"],
  [F(22.18), 220, "io"],
  [F(23.09), 226, "lin"],
  [F(25.28), 280, "in"], // 三国: slam
  [F(29.56), 280, "lin"],
  [F(30.49), 311, "io"],
  [F(31.42), 311, "lin"],
  [F(34.86), 609, "in"], // 南北朝: three centuries, landing on 隋
  [F(42.5) + 0.95, 609, "lin"],
  [F(45.23), 639, "in"], // 隋末: slam
  [F(47.1), 639, "lin"],
  [F(59.12), 755, "io"], // 唐 rise -> 天宝
  [F(61.41), 755, "lin"],
  [F(64.63), 760, "in"], // 安史: slam on the drop
  [F(70.19), 760, "lin"],
  [F(79.44), 1110, "in"], // 350 years in 1.8 s, landing on 1 亿
  [F(83.17), 1110, "lin"],
  [F(84.56), 1290, "in"], // 宋金元: slam
  [F(86.9), 1290, "lin"],
  [F(99.93), 1630, "io"], // 明 (across the 92.49 seam)
  [F(101.77), 1630, "lin"],
  [F(103.17), 1644, "in"], // 明末: slam
  [F(104.35), 1644, "lin"],
  [F(105.49), 1682, "io"],
  [F(107.36), 1761, "io"], // 2 亿
  [F(108.29), 1790, "lin"], // 3 亿
  [F(109.23), 1833, "lin"], // 4 亿
  [F(111.1), 1851, "out"],
  [F(112.5), 1851, "lin"],
  [F(112.91), 1880, "in"], // Taiping again: slam on the drop
  [F(114.8), 1880, "lin"],
  [F(116.67), 1912, "io"],
  [F(141.47), 1949, "in"], // the new song starts with 1949
  [F(142.62), 1949, "lin"],
  [F(150.84), 1960.6, "in"], // 三年困难时期: slam
  [F(153.16), 1963, "io"],
  [F(155.46), 1971, "io"],
  [F(157.78), 1981, "io"],
  [F(159.5), 2005, "lin"], // 10 -> 13 亿 in under two seconds
  [F(165.7), 2016, "io"],
  [F(167.9), 2021, "io"],
  [F(169.4), 2021, "lin"],
  [F(169.72), 2022, "in"], // 2022: the turn, on the drop
  [F(173.75), 2025, "io"],
  [F(176.09), 2025, "lin"],
  [F(178.53), 2100, "io"], // the forecast
  [DUR, 2100, "lin"],
];
export const CUR = (t: number) => {
  const K = CUR_KEYS;
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) {
    const [t1, y1, e] = K[i];
    if (t <= t1) {
      const [t0, y0] = K[i - 1];
      const x = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return y0 + (y1 - y0) * EASE[e](Math.max(0, Math.min(1, x)));
    }
  }
  return K[K.length - 1][1];
};
export const SPEED = (t: number) => Math.abs(CUR(t) - CUR(t - 1 / 30)) * 30; // years per second

// ---------------- smooth camera keys (monotone cubic)
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
      const q = 3 / Math.sqrt(s);
      m[i] = q * a * d[i];
      m[i + 1] = q * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const q = (x - xs[i]) / h;
    const q2 = q * q;
    const q3 = q2 * q;
    return (2 * q3 - 3 * q2 + 1) * ys[i] + (q3 - 2 * q2 + q) * h * m[i] + (-2 * q3 + 3 * q2) * ys[i + 1] + (q3 - q2) * h * m[i + 1];
  };
};

export const END_T = F(187.76); // the ending starts (overview)
export const SPAN = mono([
  [0, 45], [F(1.84), 150], [F(4.74), 110], [F(5.58), 110], [F(5.95), 1100], [F(6.36), 700], [F(6.47), 8], [F(9.27), 12],
  [F(12.02), 70], [F(19.18), 170], [F(25.28), 290], [F(30.49), 300], [F(34.86), 380], [F(45.23), 330], [F(59.12), 230], [F(64.63), 190],
  [F(70.19), 210], [F(79.44), 470], [F(84.56), 400], [F(99.93), 380], [F(103.17), 240], [F(105.49), 220], [F(111.1), 220],
  [F(112.91), 190], [F(141.47), 140], [F(150.84), 45], [F(159.5), 60], [F(169.72), 70], [F(178.53), 150],
  [END_T, 150], [END_T + 1.7, 2150], [DUR, 2150],
]);
export const HX = mono([
  [0, 0.72], [F(5.58), 0.72], [F(6.36), 0.7], [F(6.47), 0.5], [F(9.27), 0.54], [F(12.02), 0.72], [END_T, 0.74], [END_T + 1.7, 0.95], [DUR, 0.95],
]);
export const LOGB = (t: number) => Math.max(0, Math.min(1, (t - END_T - 0.2) / 1.5)); // the ending morphs to a log axis

// ---------------- what a hit looks and sounds like
export type HitKind = "blood" | "ash" | "gold" | "turn";
export type Hit = { t: number; kind: HitKind; size?: number };
export const HITS: Hit[] = [
  { t: F(4.74), kind: "blood", size: 1 }, // 太平天国 (cold open)
  { t: F(12.02), kind: "ash" }, // 新莽
  { t: F(25.28), kind: "blood", size: 1 }, // 三国
  { t: F(34.86), kind: "gold" }, // 隋 统一
  { t: F(45.23), kind: "ash" }, // 隋末
  { t: F(64.63), kind: "blood", size: 1.1 }, // 安史
  { t: F(79.44), kind: "gold" }, // 1 亿
  { t: F(84.56), kind: "ash" }, // 宋金元
  { t: F(103.17), kind: "ash" }, // 明末
  { t: F(111.1), kind: "gold" }, // 1851 顶点
  { t: F(112.91), kind: "blood", size: 0.75 }, // 太平天国 again
  { t: F(141.47), kind: "gold" }, // 1949
  { t: F(150.84), kind: "ash" }, // 1960
  { t: F(169.72), kind: "turn" }, // 2022
];

// risers that pull into a hit: [arrival, length] (not where the music already dives or breaks on its own)
export const RISERS: [number, number][] = [
  [F(12.02), 1.6], [F(25.28), 1.8], [F(34.86), 1.8], [F(45.23), 1.2], [F(79.44), 1.8], [F(84.56), 1.3], [F(103.17), 1.2],
  [F(141.47), 1.6], [F(150.84), 1.1],
];

// ---------------- bottom-left information blocks
export type Info = {
  t0: number;
  t1: number;
  tag: string;
  title?: string;
  big?: string;
  bigAt?: number; // the big line lands later (on its own accent)
  bigTone?: "ash" | "gold" | "paper";
  counter?: { from: number; to: number; t0: number; t1: number; unit: string; final: string };
  sub?: string;
  subAt?: number;
  sub2?: string;
  src?: string;
  tone: "gold" | "ash";
  third?: boolean; // three little people: 1 in 3 of the world
};
export const INFOS: Info[] = [
  { t0: F(1.84) - 0.5, t1: F(2.8) - 0.05, tag: "1851 · 咸丰元年 · 4.32 亿", title: "世界每 3 个人", sub: "就有 1 个在中国", tone: "gold", third: true },
  { t0: F(2.8), t1: F(6.47) - 0.05, tag: "1851—1878 · 太平天国 · 回民战争 · 丁戊奇荒", counter: { from: 0, to: 11600, t0: F(2.8), t1: F(4.74), unit: "万", final: "−1.16 亿" }, bigTone: "ash", sub: "死于战乱、饥荒与瘟疫", sub2: "接近今天整个日本的人口", src: "曹树基《中国人口史》第五卷", tone: "ash" },
  { t0: F(6.47), t1: F(9.27) - 0.05, tag: "公元 2 年 · 西汉元始二年", title: "第一次全国户口统计", big: "5,959 万", bigTone: "gold", bigAt: F(6.47) + 0.45, src: "《汉书·地理志》", tone: "gold" },
  { t0: F(9.27), t1: F(12.02) - 0.05, tag: "公元 9—23 年 · 新莽", title: "王莽篡汉，天下大乱", sub: "绿林、赤眉起兵 · 饥荒连年", tone: "ash" },
  { t0: F(12.02), t1: F(13.3) - 0.05, tag: "公元 57 年 · 东汉", big: "−64.75%", bigTone: "ash", sub: "登记户口 5,959 万 → 2,101 万", src: "《后汉书·郡国志》注引《帝王世纪》", tone: "ash" },
  { t0: F(13.3), t1: F(20.56) - 0.05, tag: "东汉 · 光武中兴", title: "一百年，人口回来了", big: "5,649 万", bigTone: "gold", bigAt: F(19.18), sub: "公元 157 年", subAt: F(19.18), src: "《晋书·地理志》", tone: "gold" },
  { t0: F(20.56), t1: F(22.18) - 0.05, tag: "184 · 黄巾起义", title: "群雄逐鹿", sub: "董卓之乱 · 官渡 · 赤壁", tone: "ash" },
  { t0: F(22.18), t1: F(25.28) - 0.05, tag: "220—280", title: "三国鼎立", sub: "魏 · 蜀 · 吴，打了六十年", tone: "ash" },
  { t0: F(25.28), t1: F(29.56) - 0.05, tag: "公元 280 年 · 西晋统一", big: "−71%", bigTone: "ash", sub: "登记户口 5,649 万 → 1,616 万", src: "《晋书·地理志》", tone: "ash" },
  { t0: F(29.56), t1: F(31.42) - 0.05, tag: "311 · 永嘉之乱", title: "五胡入华，衣冠南渡", tone: "ash" },
  { t0: F(31.42), t1: F(34.86) - 0.05, tag: "317—589 · 南北朝", title: "近 300 年", sub: "没有一次全国户口", tone: "ash" },
  { t0: F(34.86), t1: F(42.5) + 0.9, tag: "609 · 隋大业五年", title: "重新统一", big: "4,602 万", bigTone: "gold", src: "《隋书·地理志》", tone: "gold" },
  { t0: F(42.5) + 0.95, t1: F(45.23) - 0.05, tag: "611—618 · 隋末", title: "三征高句丽，群雄并起", tone: "ash" },
  { t0: F(45.23), t1: F(47.1) - 0.05, tag: "639 · 唐贞观十三年", big: "−73%", bigTone: "ash", sub: "4,602 万 → 1,235 万", src: "贞观十三年户口（冻国栋）", tone: "ash" },
  { t0: F(47.1), t1: F(49.89) - 0.05, tag: "627—649", title: "贞观之治", sub: "705 年登记 3,714 万", tone: "gold" },
  { t0: F(49.89), t1: F(59.12) - 0.05, tag: "713—741", title: "开元盛世", sub: "742 年登记 4,891 万", tone: "gold" },
  { t0: F(59.12), t1: F(61.41) - 0.05, tag: "755 · 天宝十四载", title: "登记 5,292 万", sub: "学者估计实际 8,000 万以上", src: "葛剑雄《中国人口发展史》", tone: "gold" },
  { t0: F(61.41), t1: F(64.63) - 0.05, tag: "755—763 · 安史之乱", title: "范阳起兵，两京陷落", tone: "ash" },
  { t0: F(64.63), t1: F(70.19) - 0.05, tag: "760 · 乾元三年", big: "−68%", bigTone: "ash", sub: "5,292 万 → 1,699 万", sub2: "死于战火，也逃离了户籍", tone: "ash" },
  { t0: F(77.6), t1: F(79.44) - 0.05, tag: "907—960 · 五代十国", title: "又是五十年分裂", tone: "ash" },
  { t0: F(79.44), t1: F(83.17) - 0.05, tag: "1110 · 北宋大观四年", title: "第一次突破 1 亿", big: "约 1.25 亿", bigTone: "gold", sub: "户口只记男丁，这是学者推算", src: "葛剑雄主编《中国人口史》", tone: "gold" },
  { t0: F(83.17), t1: F(84.56) - 0.05, tag: "1127—1279", title: "靖康之变 · 蒙古南下", tone: "ash" },
  { t0: F(84.56), t1: F(86.9) - 0.05, tag: "1290 · 元至元二十七年", big: "−40%", bigTone: "ash", sub: "约 1.25 亿 → 约 7,500 万", src: "吴松弟《中国人口史》第三卷", tone: "ash" },
  { t0: F(86.9), t1: F(99.93) - 0.05, tag: "1368—1644 · 明", title: "户口册两百年没怎么变", sub: "登记一直在 6,000 万上下", tone: "gold" },
  { t0: F(99.93), t1: F(101.77) - 0.05, tag: "1630 · 崇祯三年", title: "实际已近 2 亿", sub: "同期户口册：5,166 万", src: "曹树基《中国人口史》第四卷", tone: "gold" },
  { t0: F(101.77), t1: F(103.17) - 0.05, tag: "1630—1644 · 明末", title: "旱灾 · 鼠疫 · 李自成 · 张献忠", tone: "ash" },
  { t0: F(103.17), t1: F(104.35) - 0.05, tag: "1644 · 清军入关", big: "−21%", bigTone: "ash", sub: "约 1.93 亿 → 1.53 亿", src: "曹树基《中国人口史》第四卷", tone: "ash" },
  { t0: F(104.35), t1: F(105.49) - 0.05, tag: "1645—1683 · 清初", title: "南明 · 三藩 · 迁界", sub: "1682 年约 1.3 亿", src: "葛剑雄", tone: "ash" },
  { t0: F(105.49), t1: F(111.1) - 0.05, tag: "1683—1850 · 清", title: "番薯、玉米上山", sub: "摊丁入亩 · 1741 年起按“人口”统计", tone: "gold" },
  { t0: F(111.1), t1: F(112.91) - 0.05, tag: "1851 · 古代的顶点", title: "4.32 亿", sub: "世界每 3 人，就有 1 个在中国", tone: "gold", third: true },
  { t0: F(112.91), t1: F(116.67) - 0.05, tag: "1851—1878 · 太平天国 · 回民战争 · 丁戊奇荒", big: "−1.16 亿", bigTone: "ash", sub: "此后又是三十年战乱", src: "曹树基《中国人口史》第五卷", tone: "ash" },
  { t0: F(136.92), t1: F(141.47) - 0.05, tag: "1912—1949 · 中华民国", title: "战乱不止", sub: "军阀混战 · 抗日战争 · 内战", tone: "ash" },
  { t0: F(141.47), t1: F(142.62) + 0.3, tag: "1949", big: "5.42 亿", bigTone: "gold", sub: "从这一年起，每年都有统计", src: "国家统计局", tone: "gold" },
  { t0: F(150.84), t1: F(153.16) - 0.05, tag: "1959—1961 · 三年困难时期", big: "−1,000 万", bigTone: "ash", sub: "1960 年；1961 年又减少 348 万", src: "国家统计局", tone: "ash" },
  { t0: F(153.16), t1: F(155.46) - 0.05, tag: "1963 · 婴儿潮", big: "2,959 万", bigTone: "gold", sub: "一年出生，1949 年以来最多", tone: "gold" },
  { t0: F(155.46), t1: F(157.78) - 0.05, tag: "1971—1982", title: "计划生育", sub: "1980 年公开信：提倡一对夫妇只生育一个孩子", tone: "gold" },
  { t0: F(157.78), t1: F(165.2) - 0.05, tag: "1981 → 2005", title: "10 亿到 13 亿", sub: "只用了 24 年", tone: "gold" },
  { t0: F(165.2), t1: F(167.6) - 0.05, tag: "2016 · 全面二孩", big: "1,883 万", bigTone: "gold", sub: "出生人口，二孩放开第一年", tone: "gold" },
  { t0: F(167.6), t1: F(169.72) - 0.05, tag: "2021", title: "14.13 亿：见顶", sub: "同年放开三孩", tone: "gold" },
  { t0: F(169.72), t1: F(173.75) - 0.05, tag: "2022 · 61 年来首次负增长", big: "−85 万", bigTone: "ash", sub: "死亡 1,041 万 > 出生 956 万", src: "国家统计局", tone: "ash" },
  { t0: F(173.75), t1: F(176.09) - 0.05, tag: "2025", big: "792 万", bigTone: "ash", sub: "出生人口，1949 年以来最少", src: "国家统计局", tone: "ash" },
  { t0: F(176.09), t1: END_T - 0.1, tag: "联合国预测 · 中方案", title: "2100 年：约 6.3 亿", sub: "≈ 1956 年的人口", src: "联合国《世界人口展望 2024》", tone: "ash" },
];

// ---------------- the hook line, the quotes, the brush characters, the paintings
export const HOOK = { t0: F(5.05), t1: F(6.4), text: "这不是第一次。" };
export type Quote = { t0: number; t1: number; lines: string[]; by: string };
export const QUOTES: Quote[] = [
  { t0: F(25.28) + 0.35, t1: F(29.56) - 0.1, lines: ["白骨露于野", "千里无鸡鸣"], by: "曹操《蒿里行》" },
  { t0: F(64.63) + 0.5, t1: F(70.19) - 0.1, lines: ["国破山河在", "城春草木深"], by: "杜甫《春望》" },
];
// big brush characters behind the chart (only for the unified dynasties and the great splits)
export type Mark = { t0: number; t1: number; chars: string[] };
export const MARKS: Mark[] = [
  { t0: F(6.47), t1: F(20.56), chars: ["汉"] },
  { t0: F(22.18), t1: F(25.28), chars: ["魏", "蜀", "吴"] },
  { t0: F(25.28), t1: F(31.42), chars: ["晋"] },
  { t0: F(31.42), t1: F(34.86), chars: ["南", "北"] },
  { t0: F(34.86), t1: F(45.23), chars: ["隋"] },
  { t0: F(45.23), t1: F(77.6), chars: ["唐"] },
  { t0: F(79.44), t1: F(84.56), chars: ["宋"] },
  { t0: F(84.56), t1: F(86.9), chars: ["元"] },
  { t0: F(86.9), t1: F(103.17), chars: ["明"] },
  { t0: F(103.17), t1: F(116.67), chars: ["清"] },
];
export const REWIND_MARKS: [number, string][] = [[1644, "清"], [1368, "明"], [618, "唐"], [8, "汉"]];
export type Art = { t0: number; t1: number; src: string; title: string; note: string; ratio: number; focus: number; pan?: boolean };
export const ARTS: Art[] = [
  { t0: F(48.25), t1: F(61.41), src: "art/bunian.jpg", title: "阎立本《步辇图》", note: "唐太宗接见吐蕃使者", ratio: 2.0, focus: 0.5 },
  { t0: F(65.5), t1: F(70.19), src: "art/minghuang.jpg", title: "《明皇幸蜀图》", note: "安史之乱，玄宗逃往蜀地", ratio: 1.957, focus: 0.45 },
  { t0: F(79.9), t1: F(83.17), src: "art/qingming.jpg", title: "张择端《清明上河图》（局部）", note: "北宋都城汴京", ratio: 2.0, focus: 0.5 },
  { t0: F(85.0), t1: F(86.9), src: "art/kublai.jpg", title: "刘贯道《元世祖出猎图》", note: "忽必烈", ratio: 0.569, focus: 0.62 },
  { t0: F(103.65), t1: F(106.43), src: "art/liumin.jpg", title: "周臣《流民图》（1516）", note: "明代饥民", ratio: 9.54, focus: 0.5, pan: true },
  { t0: F(106.43), t1: F(111.1), src: "art/nanxun.jpg", title: "徐扬等《乾隆南巡图》（局部）", note: "盛世：人口突破 3 亿", ratio: 2.047, focus: 0.5 },
];
// the population-light floor (with the Taiping provinces going dark) only where it carries the story
export const MAP_ON: [number, number][] = [[0, F(5.58)], [F(111.1), F(116.67)]];
export const QING_CRASHES = [{ t0: F(2.8) + 0.1, d: 1.0 }, { t0: F(112.91) - 0.05, d: 0.6 }];
export type MapLabel = { t0: number; t1: number; lon: number; lat: number; txt: string };
export const MAP_LABELS: MapLabel[] = [
  { t0: F(3.0), t1: F(5.58), lon: 117.6, lat: 31.6, txt: "太平天国" },
  { t0: F(3.4), t1: F(5.58), lon: 106.0, lat: 37.0, txt: "回民战争" },
  { t0: F(3.8), t1: F(5.58), lon: 112.8, lat: 35.0, txt: "丁戊奇荒" },
  { t0: F(112.91), t1: F(116.67), lon: 117.6, lat: 31.6, txt: "太平天国" },
  { t0: F(113.2), t1: F(116.67), lon: 106.0, lat: 37.0, txt: "回民战争" },
  { t0: F(113.5), t1: F(116.67), lon: 112.8, lat: 35.0, txt: "丁戊奇荒" },
];
// wind under the worst stretches
export const WINDS: [number, number][] = [
  [F(2.8), F(6.3)], [F(9.27), F(13.3)], [F(20.56), F(29.56)], [F(42.5), F(47.1)], [F(61.41), F(70.19)],
  [F(83.17), F(87.1)], [F(101.77), F(105.49)], [F(112.91), F(141.47)], [F(150.84), F(153.16)], [F(169.72), F(173.75)],
];

// ---------------- the ending (overview, then the question)
export const ENDING = {
  labels: [189.49, 190.08, 190.65, 191.22, 191.8, 192.39, 192.96, 193.56].map(F), // trough labels, one per beat
  textA: [F(194.53), F(206.09) - 0.1] as [number, number], // 跌下去，又涨回来
  textB: [F(206.09), F(208.34) - 0.1] as [number, number], // 2022 年，又开始往下走
  textC: [F(208.34), F(210.46) - 0.1] as [number, number], // 这一次，没有战争，没有饥荒
  textD: [F(210.46), F(229.94) - 0.15] as [number, number], // 还会回来吗？
  card: F(229.94),
};
export const TROUGHS: { y: number; name: string }[] = [
  { y: 57, name: "新莽" }, { y: 280, name: "三国" }, { y: 639, name: "隋末" }, { y: 760, name: "安史" },
  { y: 1290, name: "宋元" }, { y: 1682, name: "明末清初" }, { y: 1880, name: "太平天国" }, { y: 1961, name: "1960" },
];

// ---------------- gold stamps when the line first crosses each 亿 (not inside a gap with no data)
export const MILESTONES: { t: number; n: number }[] = (() => {
  const out: { t: number; n: number }[] = [];
  let best = 0; // the main story restarts from 公元 2 年 (the cold open is not counted)
  const pts = SERIES.filter((p) => p.kind !== "un");
  for (const p of pts) {
    const n = Math.floor(p.v / 10000);
    if (n <= best) continue;
    // stamp the highest new 亿 reached at this count, when the cursor gets there (after the rewind)
    let tHit = -1;
    for (let f = Math.round(F(6.5) * 30); f < Math.round(END_T * 30); f++) {
      if (CUR(f / 30) >= p.y - 1e-6) {
        tHit = f / 30;
        break;
      }
    }
    if (tHit < 0) continue;
    for (let k = best + 1; k <= n; k++) if (k === n || p.kind === "stat") out.push({ t: tHit, n: k });
    best = n;
  }
  // when several land on one count (e.g. 1949 passes 5 亿), keep only the highest
  return out.filter((m, i) => !out.some((q, j) => j !== i && q.t === m.t && q.n > m.n));
})();
