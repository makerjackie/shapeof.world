// 金价两百年 v4: the v3 story (1792-2026, five acts, the same events and sources) on the new stage (Engine4):
// a 3D price wall, a camera that serves each event (out for long spans, in to single trading days with red/green candles),
// and an FX of our own per event. Music: 「兴衰」 (score_world8.wav), the same anchors as v3 / 两千年世界人口.
// Sources: research/SOURCES.md. Every event lands on a beat (time6.schedule); the cursor holds, then lunges into the beat.
import { Ev, makeMusic, schedule, Placed } from "./time6";

const BEAT = 60 / 130;
export const A = (n: number) => +(0.05 + n * BEAT).toFixed(4);
export const BAR = (k: number) => +(0.05 + 4 * BEAT * k).toFixed(4);
const DUR = 170.78;
export const MUSIC = makeMusic([[0, DUR]], 2.9, [{ t0: 0, t1: DUR, P: BEAT, ph: 0.05, bar: 0 }]);
export const yf = (y: number, m: number, d: number) => {
  const doy = (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000 + 1;
  return +(y + (doy - 0.5) / (y % 4 === 0 ? 366 : 365)).toFixed(5);
};

export type Fx = "spark" | "bigspark" | "drip" | "frame" | "crack" | "bills" | "lock" | "freeze" | "snap" | "ring";
export type View = { span?: number; x?: [number, number]; m?: number };
export type Ev4 = Ev & { fx?: Fx[]; v?: View; macro?: "cpi" | "fed" | "walcl"; lab?: string };
export type P4 = Placed & Ev4;

// ---------------- cold open: the whole line (log), eight spikes on eight beats, the question, the rewind
export const COLD = [
  { y: 1864.5, t: "南北战争", p: "金价翻倍" },
  { y: 1934.5, t: "罗斯福", p: "美元贬值 41%" },
  { y: 1971.62, t: "尼克松", p: "美元与黄金脱钩" },
  { y: 1980.05464, t: "石油危机", p: "850 美元" },
  { y: yf(2008, 3, 17), t: "金融危机", p: "破 1,000 美元" },
  { y: yf(2011, 8, 22), t: "美债降级", p: "1,889 美元" },
  { y: yf(2020, 8, 6), t: "新冠疫情", p: "2,069 美元" },
  { y: yf(2026, 1, 29), t: "2026 年 1 月", p: "5,318 美元" },
].map((c, i) => ({ ...c, at: A(i) }));
export const COLD_Q: [number, number] = [A(9), A(12)];
export const REWIND: [number, number] = [A(12), A(16)];

// ---------------- the body
const EVS: Ev4[] = [
  // 第一幕 · 黄金就是钱
  { y: 1792.5, b: 6, k: "stat", tag: "1792 年 · 美国", t: "法律规定：1 盎司黄金", n: "19.39 美元", s: "1 美元，就是一小块金子", anchor: BAR(4), v: { span: 60, m: 0.3 }, src: "美国 1792 年《铸币法》" },
  { y: 1834.5, b: 5, k: "policy", tag: "1834 年", t: "改定为 20.67 美元", s: "此后整整一百年，法定金价没再动过", v: { span: 70 }, src: "美国 1834 年《铸币法》" },
  { y: 1849, b: 5, k: "note", tag: "1848 年起 · 加州", t: "淘金热", s: "挖出的金子再多，价格也不变：法律定死了", v: { span: 70 } },
  { y: 1864.5, b: 5, k: "war", tag: "1861—1865 年 · 南北战争", t: "政府印纸币打仗", n: "42 美元", s: "用纸币买黄金，价格翻了一倍", pct: "+103%", anchor: BAR(8), fx: ["crack", "spark"], v: { span: 60 }, src: "纽约市场年均价（MeasuringWorth）" },
  { y: 1879.5, b: 3, k: "turn", tag: "1879 年", t: "纸币重新能换成黄金", s: "金价回到 20.67 美元", v: { span: 70 } },
  { y: 1914.6, b: 3, k: "war", tag: "1914 年 · 第一次世界大战", t: "欧洲各国停止用钞票兑换黄金", s: "打仗要钱，就先印钱", fx: ["crack"], v: { span: 90 } },
  { y: 1933.3, b: 5, k: "policy", tag: "1933 年 4 月 · 大萧条", t: "罗斯福：美国人必须上交黄金", s: "私藏者最高罚款 1 万美元、坐牢 10 年", fx: ["lock"], v: { span: 90 }, src: "美国第 6102 号行政令" },
  // 第二幕 · 美元的锚
  { y: 1934.5, b: 6, k: "peak", tag: "1934 年 1 月", t: "收完黄金，金价改为", n: "35 美元", s: "同一张美元，能换的金子少了 41%", pct: "+69%", big: true, go: "slam", anchor: BAR(12), fx: ["snap", "bigspark"], v: { span: 50 }, src: "《黄金储备法》；美联储" },
  { y: 1944.5, b: 5, k: "policy", tag: "1944 年 · 布雷顿森林", t: "44 国约定：美元挂钩黄金", s: "各国货币挂钩美元，35 美元换 1 盎司", fx: ["lock"], v: { span: 40 } },
  { y: 1950.5, b: 5, k: "stat", tag: "1950 年 · 美国金库", t: "官方黄金", n: "20,279 吨", s: "约占各国官方黄金的三分之二（不含苏联）", v: { span: 40 }, src: "国际货币基金组织《国际金融统计》" },
  { y: 1965.5, b: 5, k: "note", tag: "1950 → 1965 年 · 法国", t: "把手里的美元换成黄金", n: "588 → 4,182 吨", v: { span: 40 }, src: "国际货币基金组织《国际金融统计》" },
  { y: 1968.2, b: 5, k: "turn", tag: "1968 年 3 月", t: "抢金潮，伦敦黄金市场关闭两周", s: "从此，市场金价不再听官方的", v: { span: 30 } },
  { y: 1971.0, b: 6, k: "note", tag: "1950 → 1971 年 · 美国金库", t: "黄金流走一半多", n: "20,279 → 9,070 吨", v: { span: 30 }, src: "国际货币基金组织《国际金融统计》" },
  // 第三幕 · 脱缰
  { y: 1971.62, b: 7, k: "split", tag: "1971 年 8 月 15 日 · 尼克松", t: "美元不再兑换黄金", s: "黄金和美元，从此脱钩", big: true, go: "slam", anchor: BAR(22), fx: ["snap", "frame"], v: { span: 20, m: 0.35 } },
  { y: 1973.4, b: 4, k: "peak", tag: "1973 年 5 月", t: "金价第一次突破", n: "100 美元", fx: ["spark"], v: { span: 6 } },
  { y: 1973.8, b: 4, k: "war", tag: "1973 年 10 月", t: "第一次石油危机", s: "油价涨到原来的 4 倍，物价飞涨", fx: ["crack"], v: { span: 6 } },
  { y: 1975.0, b: 4, k: "policy", tag: "1974 年 12 月 31 日", t: "美国人 41 年后，重新可以买黄金", v: { span: 6 } },
  { y: 1976.62, b: 4, k: "crash", tag: "1974 → 1976 年", t: "金价跌回", n: "110 美元", pct: "−40%", fx: ["drip"], v: { span: 6 } },
  { y: 1979.1, b: 4, k: "war", tag: "1979 年", t: "伊朗革命，第二次石油危机", fx: ["crack"], v: { span: 5 } },
  { y: 1979.9, b: 4, k: "stat", tag: "1979 年 · 美国", t: "一年物价上涨", n: "13.3%", s: "1980 年 3 月升到 14.8%", macro: "cpi", v: { span: 4 }, src: "美国劳工统计局 CPI" },
  { y: 1979.98, b: 4, k: "war", tag: "1979 年 11—12 月", t: "伊朗人质危机，苏联入侵阿富汗", fx: ["crack"], v: { span: 3 } },
  { y: 1980.05464, b: 6, k: "peak", tag: "1980 年 1 月 21 日", t: "历史最高", n: "850 美元", s: "9 年，涨到原来的 24 倍", pct: "×24", big: true, go: "slam", anchor: BAR(34), fx: ["bigspark"], v: { x: [1970.3, 1981.6] }, src: "伦敦下午定盘价" },
  { y: 1981.0, b: 4, k: "policy", tag: "1979—1981 年 · 美联储主席沃尔克", t: "把利率加到近 20%", s: "存钱的利息，终于跑赢了通胀", macro: "fed", v: { span: 6 }, src: "美联储" },
  { y: 1982.46, b: 4, k: "crash", tag: "1982 年", t: "金价跌到", n: "315 美元", pct: "−63%", fx: ["drip"], macro: "fed", v: { span: 6 } },
  { y: 1990.5, b: 4, k: "note", tag: "1980—1990 年代", t: "通胀降了，股市大涨", s: "黄金，冷了二十年", v: { span: 16 } },
  { y: 1999.45, b: 4, k: "policy", tag: "1999—2002 年 · 英国", t: "卖掉一半黄金", n: "395 吨", s: "均价约 275 美元，卖在了 20 年来的低点附近", v: { span: 22 }, src: "英国财政部" },
  // 第四幕 · 危机与印钞
  { y: 2001.12, b: 6, k: "crash", tag: "2001 年 2 月", t: "金价只剩", n: "255 美元", s: "比 1980 年的最高点，跌了 70%", pct: "−70%", big: true, go: "slam", anchor: BAR(40), fx: ["drip", "frame"], v: { x: [1978.6, 2002.6] } },
  { y: 2004.88, b: 4, k: "policy", tag: "2004 年 11 月", t: "第一只黄金 ETF 在美国上市", s: "买黄金，像买股票一样容易", v: { span: 6 } },
  { y: yf(2008, 1, 2), b: 5, k: "turn", tag: "2008 年 1 月 2 日 · 857 美元", t: "终于回到 1980 年的最高点", n: "28 年", lab: "解套", s: "在 850 美元买金的人，等了 28 年才回本", fx: ["spark"], v: { x: [1978.6, 2008.7] } },
  { y: yf(2008, 3, 17), b: 4, k: "peak", tag: "2008 年 3 月 · 贝尔斯登倒下", t: "金价第一次突破", n: "1,000 美元", fx: ["spark"], v: { span: 1.4 } },
  { y: yf(2008, 11, 13), b: 6, k: "crash", tag: "2008 年 9—11 月 · 雷曼倒闭", t: "什么都在卖，黄金也被卖掉换现金", n: "705 美元", pct: "−30%", big: true, go: "slam", anchor: BAR(44), fx: ["crack", "drip", "frame"], macro: "fed", v: { span: 0.55 } },
  { y: 2009.2, b: 4, k: "policy", tag: "2008 → 2014 年", t: "美联储大规模印钱救市", n: "0.9 → 4.5 万亿美元", s: "美联储的资产", fx: ["bills"], macro: "walcl", v: { span: 2.2 }, src: "美联储资产负债表（H.4.1）" },
  { y: yf(2011, 8, 5), b: 4, k: "turn", tag: "2011 年 8 月 5 日", t: "美国国债信用评级第一次被下调", s: "标普：AAA → AA+", fx: ["crack"], v: { span: 0.9 } },
  { y: yf(2011, 8, 22), b: 6, k: "peak", tag: "2011 年 8 月", t: "新高", n: "1,889 美元", s: "不到 3 年，涨了 1.7 倍", pct: "+168%", big: true, go: "slam", anchor: BAR(48), fx: ["bigspark"], v: { x: [2008.55, 2011.95] }, src: "收盘价；盘中最高约 1,921 美元（9 月 6 日）" },
  { y: yf(2013, 4, 15), b: 5, k: "crash", tag: "2013 年 4 月 15 日", t: "一天暴跌", n: "9%", s: "两个交易日，跌了 13%", big: true, fx: ["drip", "frame"], v: { span: 0.3 } },
  { y: yf(2013, 4, 22), b: 5, k: "note", tag: "2013 年 4 月 · 中国", t: "金店排长队，「中国大妈」抄底", v: { span: 0.45 } },
  { y: 2013.5, b: 4, k: "stat", tag: "2013 年 · 中国", t: "全年买进黄金", n: "1,176 吨", s: "第一次超过印度，世界第一", v: { span: 2 }, src: "中国黄金协会" },
  { y: 2013.99, b: 4, k: "crash", tag: "2013 年", t: "金价全年下跌", n: "28%", s: "1981 年以来最大年跌幅", fx: ["drip"], v: { span: 2.6 } },
  { y: yf(2015, 12, 17), b: 5, k: "crash", tag: "2015 年 12 月 · 美联储 9 年来首次加息", t: "金价跌到", n: "1,051 美元", s: "按国际金价，2013 年抄底的人要到 2019 年才回本", pct: "−44%", fx: ["drip"], macro: "fed", v: { x: [2011.0, 2016.6] } },
  { y: 2019.6, b: 5, k: "note", tag: "2019 年 8 月", t: "全球负利率债券", n: "约 17 万亿美元", s: "把钱借出去，还要倒贴利息", v: { span: 5 }, src: "彭博全球综合债券指数" },
  // 第五幕 · 央行的选择
  { y: yf(2020, 3, 19), b: 5, k: "crash", tag: "2020 年 3 月 · 新冠疫情", t: "股市暴跌，金价也先跌了", n: "12%", anchor: BAR(58), fx: ["drip"], macro: "fed", v: { span: 0.4 } },
  { y: 2020.45, b: 5, k: "policy", tag: "2020 年 3—6 月", t: "美联储 3 个半月", n: "多放出 3 万亿美元", s: "资产从 4.2 万亿涨到 7.2 万亿", fx: ["bills"], macro: "walcl", v: { span: 0.9 }, src: "美联储资产负债表（H.4.1）" },
  { y: yf(2020, 8, 6), b: 5, k: "peak", tag: "2020 年 8 月", t: "新高", n: "2,069 美元", fx: ["spark"], v: { span: 1.2 } },
  { y: yf(2022, 2, 28), b: 6, k: "war", tag: "2022 年 2 月 · 俄乌冲突", t: "俄罗斯约 3,000 亿美元外汇储备被冻结", lab: "冻结", s: "存在别国的钱，可以一夜动不了", anchor: BAR(63), fx: ["freeze"], v: { span: 2.2 } },
  { y: 2022.5, b: 5, k: "policy", tag: "2022—2023 年", t: "美联储连续加息", s: "利率从接近 0 加到 5% 以上", macro: "fed", v: { span: 2.2 }, src: "美联储" },
  { y: 2022.84, b: 5, k: "turn", tag: "2022 年 11 月起", t: "利率还在涨，金价也开始涨", s: "因为这一次，买黄金的是各国央行", macro: "fed", v: { span: 2.4 } },
  { y: 2023.0, b: 5, k: "note", tag: "2022—2024 年 · 各国央行", t: "每年买进黄金", n: "超过 1,000 吨", s: "是 2010—2021 年平均的 2 倍多", v: { span: 2.6 }, src: "世界黄金协会" },
  { y: 2023.3, b: 5, k: "note", tag: "2022 年 11 月起 · 中国人民银行", t: "连续 18 个月增持黄金", v: { span: 2.6 }, src: "中国人民银行" },
  // the big return
  { y: 2024.5, b: 4, k: "peak", tag: "2024 年", t: "金价创新高", n: "45 次", s: "全年涨了 27%", big: true, anchor: BAR(72), fx: ["bigspark"], v: { span: 1.3 }, src: "COMEX 收盘新高次数" },
  { y: yf(2025, 3, 14), b: 4, k: "peak", tag: "2025 年 3 月", t: "突破", n: "3,000 美元", s: "从 2,000 到 3,000：4 年半", fx: ["spark"], v: { span: 1.2 } },
  { y: 2025.45, b: 4, k: "note", tag: "2025 年 6 月 · 欧洲央行", t: "各国央行手里，黄金超过了欧元", s: "成为第二大储备资产，仅次于美元", v: { span: 1.2 }, src: "欧洲央行《欧元的国际地位》2025" },
  { y: 2025.67, b: 4, k: "peak", tag: "2025 年 9 月", t: "按购买力，终于超过 1980 年", s: "1980 年的 850 美元 ≈ 今天 3,680 美元", fx: ["spark"], v: { span: 1.6 }, src: "按美国 CPI 换算" },
  { y: yf(2025, 10, 7), b: 4, k: "peak", tag: "2025 年 10 月", t: "突破", n: "4,000 美元", s: "从 3,000 到 4,000：7 个月", fx: ["spark"], v: { span: 0.8 } },
  { y: yf(2026, 1, 6), b: 4, k: "peak", tag: "2026 年 1 月 6 日 · 上海", t: "上海金交所金价突破", n: "1,000 元/克", s: "金店首饰金，已标到约 1,390 元/克", fx: ["spark"], v: { span: 0.4 }, src: "上海黄金交易所 Au99.99；当日金店牌价" },
  { y: yf(2026, 1, 29), b: 4, k: "peak", tag: "2026 年 1 月 29 日", t: "历史最高", n: "5,318 美元", s: "从 4,000 到 5,000：只用了 3 个半月", big: true, fx: ["bigspark"], v: { span: 0.16 }, src: "收盘价；盘中最高约 5,595 美元" },
  { y: yf(2026, 1, 30), b: 4, k: "crash", tag: "2026 年 1 月 30 日", t: "一天暴跌", n: "11%", s: "1983 年以来最大单日跌幅", big: true, go: "slam", anchor: BAR(79), fx: ["drip", "frame"], v: { span: 0.12 }, src: "路透社" },
  { y: yf(2026, 1, 30) + 0.0004, b: 4, k: "note", tag: "那一天", t: "美国总统提名了新的美联储主席", s: "外界对美联储独立性的担心，一下少了", anchor: BAR(80), v: { span: 0.2 }, src: "CNBC、路透社" },
  { y: yf(2026, 3, 20), b: 4, k: "war", tag: "2026 年 2 月 28 日起", t: "美国、以色列空袭伊朗", n: "−14%", s: "油价暴涨 → 怕通胀，不降息 → 金价反跌", anchor: BAR(81), fx: ["crack", "drip"], v: { span: 0.4 }, src: "3 月 2 日 → 3 月 20 日收盘" },
  { y: 2026.8411, b: 4, k: "stat", tag: "2026 年 11 月", t: "现在", n: "约 4,058 美元", s: "比最高点低了约四分之一", anchor: BAR(82), v: { span: 1.4 } },
];
export const END_T = BAR(83);
export const CRED_T = BAR(91);
export const CARD_T = BAR(91) + 3.0;
export const PLACED = schedule(EVS, MUSIC, BAR(4), BAR(83)) as P4[];

// the threshold wires: a fixed price (a peg) or a past high; drawn while the head is between y0 and y1
export type Wire = { v: number; y0: number; y1: number; label: string; snapAt?: number; litAt?: number; tone: "gold" | "white" };
export const WIRES: Wire[] = [
  { v: 20.67, y0: 1834.5, y1: 1933.95, label: "法定金价 · 1 盎司 = 20.67 美元", snapAt: 1934.5, tone: "white" },
  { v: 35, y0: 1934.5, y1: 1971.4, label: "美元的锚 · 1 盎司 = 35 美元", snapAt: 1971.62, tone: "gold" },
  { v: 850, y0: 1980.05464, y1: yf(2008, 9, 1), label: "1980 年最高点 · 850 美元", litAt: yf(2008, 1, 2), tone: "gold" },
  { v: 3680, y0: 2025.2, y1: 2025.8, label: "1980 年的 850 美元，按今天的物价 ≈ 3,680 美元", litAt: 2025.67, tone: "white" },
];

export const ENDING = {
  lines: [
    { t0: END_T + 0.1, t1: BAR(85.5) - 0.05, a: "两百多年，1 盎司黄金", b: "从 19 美元，到 4,000 美元" },
    { t0: BAR(85.5), t1: BAR(88) - 0.05, a: "1971 年的 1 美元", b: "今天只值约 12 美分" },
    { t0: BAR(88), t1: CRED_T - 0.05, a: "人们不再相信钱，金价就涨", b: "又信了一点，它就跌", gold: true },
  ],
  troughs: [
    { y: 1864.5, t: "南北战争" },
    { y: 1934.5, t: "罗斯福" },
    { y: 1980.05464, t: "1980" },
    { y: 2001.12, t: "2001", dn: true },
    { y: yf(2011, 8, 22), t: "2011" },
    { y: yf(2026, 1, 29), t: "2026" },
  ],
  credits: [
    "金价：MeasuringWorth（1792—1967）",
    "伦敦金价月均（德意志联邦银行，1968—2000）",
    "COMEX 黄金期货收盘价（2000 年起）",
    "央行储备：国际货币基金组织、世界黄金协会",
    "物价：美国劳工统计局；利率、汇率：美联储",
    "配乐：原创，AI 生成（Google Lyria）",
  ],
};
export const ACT = (y: number) => (y < 1933.9 ? "第一幕 · 黄金就是钱" : y < 1971.6 ? "第二幕 · 美元的锚" : y < 2001 ? "第三幕 · 脱缰" : y < 2020 ? "第四幕 · 危机与印钞" : "第五幕 · 央行的选择");
export const SERIES_SRC = (y: number) => (y < 1967.99 ? "纽约市场年均价（MeasuringWorth）" : y < 2000.66 ? "伦敦金价月均（德意志联邦银行）" : "COMEX 黄金期货收盘价");

// the shape the sound tools (tools/cues6.mjs) read
export const GOLD = {
  music: MUSIC,
  events: PLACED,
  cold: { crashes: COLD.map((c) => ({ at: c.at })), lines: [{ t0: COLD_Q[0], tone: "gold" }], rewind: REWIND },
  noRiser: true,
  musicSrc: "score_world8.wav",
  body: [PLACED[0].t0, END_T] as [number, number],
  ending: { lines: ENDING.lines.map((l) => ({ t0: l.t0, brush: false })), card: CARD_T },
};
