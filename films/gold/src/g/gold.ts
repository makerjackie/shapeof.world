// 金价两百年 (EngineG): one ounce of gold, 1792-2026. For 140 years the law fixed its price; every time people stopped
// trusting paper money (war, printing, inflation, crisis, sanctions) it jumped; every time trust came back it fell.
// The ounce never changed: the floor shows how many one-dollar bills it takes.
// Music: public/score_world8.wav (the series theme 「兴衰」, Lyria 3.5), the same 130 BPM edit and accents as 两千年世界人口:
// the big events sit on that film's anchor bars. Sources: research/SOURCES.md; data: research/golddata.py -> gold_data.json.
import GD from "./gold_data.json";
import type { Pt, Spec, TableRow } from "./specG";
import { Ev, Key, makeMusic, schedule } from "./time6";
import { revealOf } from "./reveal7";

const D = GD as unknown as { series: [number, number, Pt["kind"]][]; cny: [number, number][]; reserves: Record<string, [number, number][]> };
export const SERIES: Pt[] = D.series.map(([y, v, kind]) => ({ y, v, kind }));

// ---------------- music: score bars (1.846 s): 0-2 cold open, 3 rewind, 4 the drop (body), 58-70 the quiet section,
// 72 the big return, 83 the outro, 89 the last hit (the brush line)
const BEAT = 60 / 130;
const A = (n: number) => +(0.05 + n * BEAT).toFixed(4);
const BAR = (k: number) => +(0.05 + 4 * BEAT * k).toFixed(4);
const DUR = 170.78;
export const MUSIC = makeMusic([[0, DUR]], 2.9, [{ t0: 0, t1: DUR, P: BEAT, ph: 0.05, bar: 0 }]);

// ---------------- cold open: the whole line on a log axis, eight spikes on eight beats, the question, the rewind
const COLD_CRASHES = [
  { y: 1864.5, t: "南北战争", p: "金价翻倍" },
  { y: 1934.5, t: "罗斯福", p: "美元贬值 41%" },
  { y: 1971.62, t: "尼克松", p: "美元与黄金脱钩" },
  { y: 1980.055, t: "石油危机", p: "850 美元" },
  { y: 2008.21, t: "金融危机", p: "破 1,000 美元" },
  { y: 2011.64, t: "美债降级", p: "1,889 美元" },
  { y: 2020.6, t: "新冠疫情", p: "2,069 美元" },
  { y: 2026.077, t: "2026 年 1 月", p: "5,318 美元" },
].map((c, i) => ({ ...c, at: A(i), tone: "gold" as const }));
const FIRST_Y = SERIES[0].y;
const LAST_Y = SERIES[SERIES.length - 1].y;
const COLD_KEYS: Key[] = [
  { t: 0, y: FIRST_Y, p: 1 },
  ...COLD_CRASHES.map((c) => ({ t: c.at, y: c.y, p: 1.4 })),
  { t: A(8), y: LAST_Y, p: 1.4 },
  { t: A(12), y: LAST_Y, p: 1 },
  { t: A(16), y: FIRST_Y, p: 1.7 },
];

// ---------------- the body
const EVS: Ev[] = [
  // 第一幕 · 黄金就是钱
  { y: 1792.5, b: 6, k: "stat", tag: "1792 年 · 美国", t: "法律规定：1 盎司黄金", n: "19.39 美元", s: "1 美元，就是一小块金子", anchor: BAR(4), span: 90, src: "美国 1792 年《铸币法》" },
  { y: 1834.5, b: 5, k: "policy", tag: "1834 年", t: "改定为 20.67 美元", s: "此后整整一百年，法定金价没再动过", src: "美国 1834 年《铸币法》" },
  { y: 1849, b: 5, k: "note", tag: "1848 年起 · 加州", t: "淘金热", s: "挖出的金子再多，价格也不变：法律定死了" },
  { y: 1864.5, b: 5, k: "war", tag: "1861—1865 年 · 南北战争", t: "政府印纸币打仗", n: "42 美元", s: "用纸币买黄金，价格翻了一倍", pct: "+103%", anchor: BAR(8), src: "纽约市场年均价（MeasuringWorth）" },
  { y: 1879.5, b: 3, k: "turn", tag: "1879 年", t: "纸币重新能换成黄金", s: "金价回到 20.67 美元" },
  { y: 1914.6, b: 3, k: "war", tag: "1914 年 · 第一次世界大战", t: "欧洲各国停止用钞票兑换黄金", s: "打仗要钱，就先印钱" },
  { y: 1933.3, b: 5, k: "policy", tag: "1933 年 4 月 · 大萧条", t: "罗斯福：美国人必须上交黄金", s: "私藏者最高罚款 1 万美元、坐牢 10 年", src: "美国第 6102 号行政令" },
  // 第二幕 · 美元的锚
  { y: 1934.5, b: 6, k: "peak", tag: "1934 年 1 月", t: "收完黄金，金价改为", n: "35 美元", s: "同一张美元，能换的金子少了 41%", pct: "+69%", big: true, go: "slam", anchor: BAR(12), span: 60, src: "《黄金储备法》；美联储" },
  { y: 1944.5, b: 5, k: "policy", tag: "1944 年 · 布雷顿森林", t: "44 国约定：美元挂钩黄金", s: "各国货币挂钩美元，35 美元换 1 盎司" },
  { y: 1950.5, b: 5, k: "stat", tag: "1950 年 · 美国金库", t: "官方黄金", n: "20,279 吨", s: "约占各国官方黄金的三分之二（不含苏联）", src: "国际货币基金组织《国际金融统计》" },
  { y: 1965.5, b: 5, k: "note", tag: "1950 → 1965 年 · 法国", t: "把手里的美元换成黄金", n: "588 → 4,182 吨", src: "国际货币基金组织《国际金融统计》" },
  { y: 1968.2, b: 5, k: "turn", tag: "1968 年 3 月", t: "抢金潮，伦敦黄金市场关闭两周", s: "从此，市场金价不再听官方的" },
  { y: 1971.0, b: 6, k: "note", tag: "1950 → 1971 年 · 美国金库", t: "黄金流走一半多", n: "20,279 → 9,070 吨", src: "国际货币基金组织《国际金融统计》" },
  // 第三幕 · 脱缰
  { y: 1971.62, b: 7, k: "split", tag: "1971 年 8 月 15 日 · 尼克松", t: "美元不再兑换黄金", s: "黄金和美元，从此脱钩", big: true, go: "slam", anchor: BAR(22), span: 14 },
  { y: 1973.4, b: 4, k: "peak", tag: "1973 年 5 月", t: "金价第一次突破", n: "100 美元" },
  { y: 1973.8, b: 4, k: "war", tag: "1973 年 10 月", t: "第一次石油危机", s: "油价涨到原来的 4 倍，物价飞涨" },
  { y: 1975.0, b: 4, k: "policy", tag: "1974 年 12 月 31 日", t: "美国人 41 年后，重新可以买黄金" },
  { y: 1976.62, b: 4, k: "crash", tag: "1974 → 1976 年", t: "金价跌回", n: "110 美元", pct: "−40%" },
  { y: 1979.1, b: 4, k: "war", tag: "1979 年", t: "伊朗革命，第二次石油危机" },
  { y: 1979.9, b: 4, k: "stat", tag: "1979 年 · 美国", t: "一年物价上涨", n: "13.3%", s: "1980 年 3 月升到 14.8%", src: "美国劳工统计局 CPI" },
  { y: 1979.98, b: 4, k: "war", tag: "1979 年 11—12 月", t: "伊朗人质危机，苏联入侵阿富汗" },
  { y: 1980.055, b: 6, k: "peak", tag: "1980 年 1 月 21 日", t: "历史最高", n: "850 美元", s: "9 年，涨到原来的 24 倍", pct: "×24", big: true, go: "slam", anchor: BAR(34), span: 26, src: "伦敦下午定盘价" },
  { y: 1981.0, b: 4, k: "policy", tag: "1979—1981 年 · 美联储主席沃尔克", t: "把利率加到近 20%", s: "存钱的利息，终于跑赢了通胀", src: "美联储" },
  { y: 1982.46, b: 4, k: "crash", tag: "1982 年", t: "金价跌到", n: "315 美元", pct: "−63%" },
  { y: 1990.5, b: 4, k: "note", tag: "1980—1990 年代", t: "通胀降了，股市大涨", s: "黄金，冷了二十年" },
  { y: 1999.45, b: 4, k: "policy", tag: "1999—2002 年 · 英国", t: "卖掉一半黄金", n: "395 吨", s: "均价约 275 美元，卖在了 20 年来的低点附近", src: "英国财政部" },
  // 第四幕 · 危机与印钞
  { y: 2001.12, b: 6, k: "crash", tag: "2001 年 2 月", t: "金价只剩", n: "255 美元", s: "比 1980 年的最高点，跌了 70%", pct: "−70%", big: true, go: "slam", anchor: BAR(40), span: 14 },
  { y: 2004.88, b: 4, k: "policy", tag: "2004 年 11 月", t: "第一只黄金 ETF 在美国上市", s: "买黄金，像买股票一样容易" },
  { y: 2008.21, b: 5, k: "peak", tag: "2008 年 3 月 · 贝尔斯登倒下", t: "金价第一次突破", n: "1,000 美元" },
  { y: 2008.87, b: 6, k: "crash", tag: "2008 年 9—11 月 · 雷曼倒闭", t: "什么都在卖，黄金也被卖掉换现金", n: "705 美元", pct: "−30%", big: true, go: "slam", anchor: BAR(44), span: 10 },
  { y: 2009.2, b: 4, k: "policy", tag: "2008 → 2014 年", t: "美联储大规模印钱救市", n: "0.9 → 4.5 万亿美元", s: "美联储的资产", src: "美联储资产负债表（H.4.1）" },
  { y: 2011.6, b: 4, k: "turn", tag: "2011 年 8 月 5 日", t: "美国国债信用评级第一次被下调", s: "标普：AAA → AA+" },
  { y: 2011.64, b: 6, k: "peak", tag: "2011 年 8 月", t: "新高", n: "1,889 美元", s: "不到 3 年，涨了 1.7 倍", pct: "+168%", big: true, go: "slam", anchor: BAR(48), src: "收盘价；盘中最高约 1,921 美元（9 月 6 日）" },
  { y: 2013.29, b: 5, k: "crash", tag: "2013 年 4 月 15 日", t: "一天暴跌", n: "9%", s: "两个交易日，跌了 13%", big: true },
  { y: 2013.32, b: 5, k: "note", tag: "2013 年 4 月 · 中国", t: "金店排长队，「中国大妈」抄底" },
  { y: 2013.5, b: 4, k: "stat", tag: "2013 年 · 中国", t: "全年买进黄金", n: "1,176 吨", s: "第一次超过印度，世界第一", src: "中国黄金协会" },
  { y: 2013.99, b: 4, k: "crash", tag: "2013 年", t: "金价全年下跌", n: "28%", s: "1981 年以来最大年跌幅" },
  { y: 2015.96, b: 5, k: "crash", tag: "2015 年 12 月 · 美联储 9 年来首次加息", t: "金价跌到", n: "1,051 美元", s: "按国际金价，2013 年抄底的人要到 2019 年才回本", pct: "−44%" },
  { y: 2019.6, b: 5, k: "note", tag: "2019 年 8 月", t: "全球负利率债券", n: "约 17 万亿美元", s: "把钱借出去，还要倒贴利息", src: "彭博全球综合债券指数" },
  // 第五幕 · 央行的选择
  { y: 2020.21, b: 5, k: "crash", tag: "2020 年 3 月 · 新冠疫情", t: "股市暴跌，金价也先跌了", n: "12%", anchor: BAR(58), span: 8 },
  { y: 2020.45, b: 5, k: "policy", tag: "2020 年 3—6 月", t: "美联储 3 个半月", n: "多放出 3 万亿美元", s: "资产从 4.2 万亿涨到 7.2 万亿", src: "美联储资产负债表（H.4.1）" },
  { y: 2020.6, b: 5, k: "peak", tag: "2020 年 8 月", t: "新高", n: "2,069 美元" },
  { y: 2022.15, b: 6, k: "war", tag: "2022 年 2 月 · 俄乌冲突", t: "俄罗斯约 3,000 亿美元外汇储备被冻结", s: "存在别国的钱，可以一夜动不了", anchor: BAR(63) },
  { y: 2022.5, b: 5, k: "policy", tag: "2022—2023 年", t: "美联储连续加息", s: "利率从接近 0 加到 5% 以上", src: "美联储" },
  { y: 2022.84, b: 5, k: "turn", tag: "2022 年 11 月起", t: "利率还在涨，金价也开始涨", s: "因为这一次，买黄金的是各国央行" },
  { y: 2023.0, b: 5, k: "note", tag: "2022—2024 年 · 各国央行", t: "每年买进黄金", n: "超过 1,000 吨", s: "是 2010—2021 年平均的 2 倍多", src: "世界黄金协会" },
  { y: 2023.3, b: 5, k: "note", tag: "2022 年 11 月起 · 中国人民银行", t: "连续 18 个月增持黄金", src: "中国人民银行" },
  // the big return
  { y: 2024.5, b: 4, k: "peak", tag: "2024 年", t: "金价创新高", n: "45 次", s: "全年涨了 27%", big: true, anchor: BAR(72), span: 5, src: "COMEX 收盘新高次数" },
  { y: 2025.2, b: 4, k: "peak", tag: "2025 年 3 月", t: "突破", n: "3,000 美元", s: "从 2,000 到 3,000：4 年半" },
  { y: 2025.45, b: 4, k: "note", tag: "2025 年 6 月 · 欧洲央行", t: "各国央行手里，黄金超过了欧元", s: "成为第二大储备资产，仅次于美元", src: "欧洲央行《欧元的国际地位》2025" },
  { y: 2025.67, b: 4, k: "peak", tag: "2025 年 9 月", t: "按购买力，终于超过 1980 年", s: "1980 年的 850 美元 ≈ 今天 3,680 美元", src: "按美国 CPI 换算" },
  { y: 2025.77, b: 4, k: "peak", tag: "2025 年 10 月", t: "突破", n: "4,000 美元", s: "从 3,000 到 4,000：7 个月" },
  { y: 2026.01, b: 4, k: "peak", tag: "2026 年 1 月 6 日 · 上海", t: "上海金交所金价突破", n: "1,000 元/克", s: "金店首饰金，已标到约 1,390 元/克", src: "上海黄金交易所 Au99.99；当日金店牌价" },
  { y: 2026.077, b: 4, k: "peak", tag: "2026 年 1 月 29 日", t: "历史最高", n: "5,318 美元", s: "从 4,000 到 5,000：只用了 3 个半月", big: true, span: 2.2, src: "收盘价；盘中最高约 5,595 美元" },
  { y: 2026.0795, b: 4, k: "crash", tag: "2026 年 1 月 30 日", t: "一天暴跌", n: "11%", s: "1983 年以来最大单日跌幅", big: true, go: "slam", anchor: BAR(79), src: "路透社" },
  { y: 2026.0805, b: 4, k: "note", tag: "那一天", t: "美国总统提名了新的美联储主席", s: "外界对美联储独立性的担心，一下少了", anchor: BAR(80), src: "CNBC、路透社" },
  { y: 2026.215, b: 4, k: "war", tag: "2026 年 2 月 28 日起", t: "美国、以色列空袭伊朗", n: "−14%", s: "油价暴涨 → 怕通胀，不降息 → 金价反跌", anchor: BAR(81), src: "3 月 2 日 → 3 月 20 日收盘" },
  { y: 2026.8411, b: 4, k: "stat", tag: "2026 年 11 月", t: "现在", n: "约 4,058 美元", s: "比最高点低了约四分之一", anchor: BAR(82), span: 2.4 },
];

const ERA_SRC: [number, string][] = [
  [0, "纽约市场年均价（MeasuringWorth）"],
  [1967.99, "伦敦金价月均（德意志联邦银行）"],
  [2000.66, "COMEX 黄金期货收盘价"],
];
const END_T = BAR(83);
const CRED_T = BAR(91);
const CARD_T = BAR(91) + 3.0;
const CREDITS = [
  "金价：MeasuringWorth（1792—1967）",
  "伦敦金价月均（德意志联邦银行，1968—2000）",
  "COMEX 黄金期货收盘价（2000 年起）",
  "央行储备：国际货币基金组织、世界黄金协会",
  "物价：美国劳工统计局；汇率：美联储",
  "配乐：原创，AI 生成（Google Lyria）",
];

// official gold reserves, tonnes, year end (IMF IFS; 2025-26 from the central banks, see SOURCES.md)
const RC: Record<string, string> = {
  美国: "#6fa8dc", 德国: "#9aa5b1", 法国: "#7f9bd6", 意大利: "#b5c46a", 瑞士: "#d27a92", 英国: "#a98bd6", 荷兰: "#e0a35f", 比利时: "#c2a24f",
  中国: "#ffc94d", 俄罗斯: "#c9605e", 日本: "#e39a4f", 印度: "#6cbfa0", 加拿大: "#5fb7aa", 葡萄牙: "#7fc27a", 委内瑞拉: "#58b368",
  土耳其: "#d9b36c", 波兰: "#8e83d6", 西班牙: "#e0a35f", 奥地利: "#5aa1b8", 巴西: "#3fa66f", 南非: "#4fae8a", 沙特: "#6aa36b",
  中国台湾: "#a58a63", 黎巴嫩: "#6fb0c4", 哈萨克斯坦: "#c99ddc", 乌兹别克斯坦: "#7fb67a",
};
const resAt = (p: [number, number][], y: number) => {
  if (y < p[0][0] - 1) return 0;
  if (y <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (y <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (y - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
  return p[p.length - 1][1];
};
const TABLE = (y: number): TableRow[] =>
  Object.entries(D.reserves).map(([n, p]) => ({ n, v: resAt(p, y), c: RC[n] ?? "#9aa5b1", tag: n === "中国" && y > 2001.5 && y < 2016 ? "*" : undefined }));

const placed = schedule(EVS, MUSIC, BAR(4), BAR(83));
export const REVEALS = placed.map((e) => ({ k: e.k, big: !!e.big, y: e.y, ...revealOf(e, MUSIC.beats) }));
export const GOLD: Spec = {
  id: "gold",
  brand: "金价两百年",
  series: SERIES,
  music: MUSIC,
  events: placed,
  cold: {
    keys: COLD_KEYS,
    crashes: COLD_CRASHES,
    lines: [{ t0: A(9), t1: A(12) - 0.05, a: "战争、印钞、危机", b: "金子没变，金价凭什么涨？", bBeats: 1, tone: "gold" }],
    rewind: [A(12), A(16)],
    promise: "一条曲线，看尽钱的兴衰",
    start: "1792 年",
    soloLabels: true,
  },
  dyn: [
    [1792, 1933.3, "金本位", 1],
    [1934, 1971.6, "美元挂钩黄金", 1],
    [1971.6, 2026.84, "自由浮动", 2],
  ],
  body: [placed[0].t0, END_T],
  ending: {
    t0: END_T,
    lines: [
      { t0: END_T + 0.1, t1: BAR(85.5) - 0.05, text: "两百多年，1 盎司黄金", text2: "从 19 美元，到 4,000 美元", tone: "white" },
      { t0: BAR(85.5), t1: BAR(88) - 0.05, text: "1971 年的 1 美元", text2: "今天只值约 12 美分", tone: "white" },
      { t0: BAR(88), t1: CRED_T - 0.05, text: "人们不再相信钱，金价就涨", text2: "又信了一点，它就跌", tone: "gold" },
    ],
    troughs: [
      { y: 1864.5, t: "南北战争", tone: "gold" },
      { y: 1934.5, t: "罗斯福", tone: "gold" },
      { y: 1980.055, t: "1980", tone: "gold", dx: -20 },
      { y: 2001.12, t: "2001", tone: "red" },
      { y: 2011.64, t: "2011", tone: "gold", dx: -26 },
      { y: 2026.077, t: "2026", tone: "gold", dx: -10, dy: -30 },
    ],
    card: CARD_T,
    credits: { t0: CRED_T, title: "信息来源", lines: CREDITS },
    slogan: "看见世界如何运行",
    maker: "MakerJackie",
  },
  era: (y) => (y < 1933.9 ? "第一幕 · 黄金就是钱" : y < 1971.6 ? "第二幕 · 美元的锚" : y < 2001 ? "第三幕 · 脱缰" : y < 2020 ? "第四幕 · 危机与印钞" : "第五幕 · 央行的选择"),
  kindLabel: { a: "纽约市场 · 年均价", m: "伦敦金价 · 月均", d: "COMEX 期货 · 收盘价", p: "" },
  log: [12, 9000],
  cny: D.cny,
  cnyFrom: 2002,
  table: TABLE,
  tableTitle: "各国央行黄金储备 · 吨",
  tableRows: 6,
  tableBack: 10,
  tableFrom: 1950,
  tableNote: (y) => (y < 1992 ? "* 苏联不公布黄金储备，不在表中" : y > 2001.5 && y < 2016 ? "* 中国 2009、2015 年才一次性公布多年增持" : undefined),
  srcEnd: "数据：MeasuringWorth、德意志联邦银行、COMEX、国际货币基金组织、世界黄金协会",
  src: (y) => {
    let s = ERA_SRC[0][1];
    for (const [a, t] of ERA_SRC) if (y >= a - 1e-6) s = t;
    return s;
  },
  rewindLabel: "倒回 1792 年……",
  musicSrc: "score_world8.wav",
  noRiser: true,
};
