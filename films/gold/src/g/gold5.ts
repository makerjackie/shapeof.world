// 金价两百年 v5 (EngineG5): v3's look and story, re-timed. The cold open is the last 25 years (2001 → 2026) rocketing on
// the beats, one crash, the question, the rewind. 1792-1971 is a fast black-and-white prologue (the law nails the price);
// colour comes back when Nixon cuts the dollar loose. 2001-2026 gets about 100 s: crises zoom in to daily candles,
// big views pull out with the old high drawn across, every event lands on a half-bar of 「兴衰」 and has its own effect.
// Sources: research/SOURCES.md; data: research/golddata.py -> gold_data.json, gold4data.py -> gold5_ohlc.json.
import GD from "./gold_data.json";
import CPI_RAW from "./gold5_cpi.json";
import type { Pt, Spec, TableRow } from "./specG";
import { Ev, makeMusic, Music, Placed } from "./time6";
import { revealOf } from "./reveal7";

const D = GD as unknown as { series: [number, number, Pt["kind"]][]; cny: [number, number][]; reserves: Record<string, [number, number][]> };
export const SERIES: Pt[] = D.series.map(([y, v, kind]) => ({ y, v, kind }));

// ---------------- music (score_world8.wav, 130 BPM): loud 0-2, dip 3 (rewind), drop 4, dip 11 -> hit 12, quiet 17-19,
// dip 27-28, mellow 35-43, big return 44, quiet 58-66, rise 67, big return 72, outro 83
const BEAT = 60 / 130;
const A = (n: number) => +(0.05 + n * BEAT).toFixed(4);
const BAR = (k: number) => +(0.05 + 4 * BEAT * k).toFixed(4);
const DUR = 170.78;
export const MUSIC = makeMusic([[0, DUR]], 2.9, [{ t0: 0, t1: DUR, P: BEAT, ph: 0.05, bar: 0 }]);

// a calendar day as the data's year fraction: year + (day of year - 1) / days in year
const DY = (y: number, m: number, d: number) => {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const ml = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let n = d - 1;
  for (let i = 0; i < m - 1; i++) n += ml[i];
  return +(y + n / (leap ? 366 : 365)).toFixed(5);
};

// ---------------- events: k / tag / t / n / s as in v3, plus
// fx: own effects (bolt, shatter, fw = fireworks, fwBig, bills, closed, snap, bw, solve), icon: the event's symbol,
// lab: the chip text instead of the kind's, fit: a price the view must keep in frame (an old high)
export type Fx = "bolt" | "shatter" | "fw" | "fwBig" | "bills" | "closed" | "snap" | "bw" | "solve";
export type Icon = "oil" | "etf" | "virus" | "lock" | "stamp" | "rateUp" | "rateDown" | "vault" | "exchange" | "tariff" | "gavel";
export type Ev5 = Ev & { fx?: Fx[]; icon?: Icon; lab?: string; fit?: number };
export type P5 = Placed & { fx?: Fx[]; icon?: Icon; lab?: string; fit?: number };

const EVS: Ev5[] = [
  // 第一幕 · 黄金就是钱 (black and white: the law holds the price)
  { y: 1792.5, b: 4, k: "stat", tag: "1792 年 · 美国", t: "法律规定：1 盎司黄金", n: "19.39 美元", s: "1 美元，就是一小块金子", anchor: BAR(4), span: 90, src: "美国 1792 年《铸币法》" },
  { y: 1834.5, b: 4, k: "policy", tag: "1834 年", t: "改定为 20.67 美元", s: "此后一百年，金价被法律钉死", src: "美国 1834 年《铸币法》" },
  { y: 1864.5, b: 4, k: "war", tag: "1861—1865 年 · 南北战争", t: "政府印纸币打仗", n: "42 美元", pct: "+103%", src: "纽约市场年均价（MeasuringWorth）" },
  { y: 1933.3, b: 4, k: "policy", tag: "1933 年 4 月 · 大萧条", t: "罗斯福：美国人必须上交黄金", s: "私藏黄金，最高坐牢 10 年", src: "美国第 6102 号行政令" },
  // 第二幕 · 美元的锚
  { y: 1934.5, b: 4, k: "peak", tag: "1934 年 1 月", t: "收完黄金，金价改为", n: "35 美元", s: "美元一夜贬值 41%", pct: "+69%", big: true, go: "slam", anchor: BAR(8), span: 60, lab: "改价", src: "《黄金储备法》；美联储" },
  { y: 1944.5, b: 4, k: "policy", tag: "1944 年 · 布雷顿森林", t: "44 国约定：美元挂钩黄金", s: "35 美元换 1 盎司", icon: "vault" },
  { y: 1968.2, b: 4, k: "turn", tag: "1968 年 3 月 · 抢金潮", t: "伦敦黄金市场关闭两周", s: "市场金价，从此不听官方", fx: ["closed"], span: 30 },
  { y: 1971.0, b: 4, k: "note", tag: "1950 → 1971 年 · 美国金库", t: "各国拿美元换走黄金", n: "20,279 → 9,070 吨", src: "国际货币基金组织《国际金融统计》" },
  // 第三幕 · 脱缰 (colour)
  { y: 1971.62, b: 8, k: "split", tag: "1971 年 8 月 15 日 · 尼克松", t: "美元不再兑换黄金", s: "黄金和美元，从此脱钩", big: true, go: "slam", anchor: BAR(12), span: 14, fx: ["snap"] },
  { y: 1973.4, b: 4, k: "peak", tag: "1973 年 5 月", t: "金价第一次突破", n: "100 美元", fx: ["fw"], span: 9 },
  { y: 1973.8, b: 4, k: "war", tag: "1973 年 10 月", t: "第一次石油危机", s: "油价翻了两番", icon: "oil" },
  { y: 1975.0, b: 4, k: "policy", tag: "1974 年 12 月 31 日", t: "美国人重新可以买黄金", s: "禁了 41 年" },
  { y: 1976.62, b: 6, k: "crash", tag: "1974 → 1976 年", t: "金价跌回", n: "110 美元", pct: "−40%", fx: ["bolt"] },
  { y: 1979.1, b: 4, k: "war", tag: "1979 年", t: "伊朗革命，第二次石油危机", icon: "oil" },
  { y: 1979.9, b: 6, k: "stat", tag: "1979 年 · 美国", t: "一年物价上涨", n: "13.3%", src: "美国劳工统计局 CPI" },
  { y: 1979.98, b: 6, k: "war", tag: "1979 年 11—12 月", t: "人质危机，苏联入侵阿富汗" },
  { y: 1980.055, b: 6, k: "peak", tag: "1980 年 1 月 21 日", t: "历史最高", n: "850 美元", s: "9 年，涨到原来的 24 倍", pct: "×24", big: true, go: "slam", anchor: BAR(23), span: 26, fx: ["fwBig"], src: "伦敦下午定盘价" },
  { y: 1981.0, b: 4, k: "policy", tag: "1979—1981 年 · 美联储", t: "把利率加到近 20%", s: "存钱终于跑赢通胀", icon: "rateUp", src: "美联储" },
  { y: 1982.46, b: 4, k: "crash", tag: "1982 年", t: "金价跌到", n: "315 美元", pct: "−63%", fx: ["bolt"] },
  { y: 1990.5, b: 4, k: "note", tag: "1980—1990 年代", t: "通胀降了，股市大涨", s: "黄金，冷了二十年", span: 22 },
  { y: 1999.45, b: 6, k: "policy", tag: "1999—2002 年 · 英国", t: "卖掉一半黄金", n: "395 吨", s: "卖在了 20 年来的最低点附近", src: "英国财政部" },
  // 第四幕 · 危机与印钞
  { y: 2001.12, b: 6, k: "crash", tag: "2001 年 2 月", t: "金价只剩", n: "255 美元", s: "1980 年买的人，亏了 70%", big: true, go: "slam", anchor: BAR(29), span: 30, fit: 850 },
  { y: DY(2002, 10, 30), b: 4, k: "policy", tag: "2002 年 10 月 · 上海", t: "上海黄金交易所开业", s: "此前，金价由央行统一定", icon: "exchange", span: 6, src: "上海黄金交易所" },
  { y: DY(2004, 11, 18), b: 6, k: "policy", tag: "2004 年 11 月", t: "第一只黄金 ETF 在美国上市", s: "买黄金，像买股票一样容易", icon: "etf" },
  { y: DY(2006, 6, 14), b: 4, k: "crash", tag: "2006 年 5 → 6 月", t: "一个月，金价跌了", n: "22%", s: "720 → 562 美元", fx: ["bolt"], span: 4 },
  { y: DY(2007, 8, 9), b: 4, k: "war", tag: "2007 年 8 月 · 美国", t: "次贷危机爆发", s: "房贷还不上，银行出事", lab: "危机", span: 7 },
  { y: DY(2008, 1, 2), b: 6, k: "peak", tag: "2008 年 1 月 2 日 · 857 美元", t: "1980 年买的人，终于回本", s: "等了近 28 年，还没算通胀", lab: "解套", anchor: BAR(37), span: 10, fx: ["solve"], fit: 850 },
  { y: DY(2008, 3, 17), b: 6, k: "peak", tag: "2008 年 3 月 17 日 · 贝尔斯登倒下", t: "金价第一次突破", n: "1,000 美元", fx: ["fw"], span: 3 },
  { y: DY(2008, 7, 11), b: 6, k: "note", tag: "2008 年 7 月", t: "油价冲到 147 美元", s: "随后，油价金价一起跌", icon: "oil", span: 1.2 },
  { y: DY(2008, 9, 7), b: 6, k: "war", tag: "2008 年 9 月 7 日", t: "房利美、房地美被政府接管", s: "美国一半房贷在它们手里", lab: "危机", span: 0.5 },
  { y: DY(2008, 9, 11), b: 4, k: "crash", tag: "2008 年 3 月 → 9 月 11 日", t: "金价从 1,000 美元跌到", n: "741 美元", pct: "−26%", fx: ["bolt"], span: 0.3 },
  { y: DY(2008, 9, 15), b: 4, k: "war", tag: "2008 年 9 月 15 日", t: "雷曼兄弟破产", s: "全球金融危机爆发", big: true, go: "slam", anchor: BAR(44), span: 0.25, lab: "危机", fx: ["shatter"] },
  { y: DY(2008, 9, 17), b: 4, k: "peak", tag: "2008 年 9 月 17 日", t: "危机来了，先买黄金", n: "一天 +9%", span: 0.25, lab: "暴涨" },
  { y: DY(2008, 11, 13), b: 4, k: "crash", tag: "2008 年 10—11 月", t: "恐慌抛售，黄金也被卖掉", n: "705 美元", pct: "−30%", span: 0.6, fx: ["bolt"] },
  { y: DY(2008, 11, 25), b: 4, k: "policy", tag: "2008 年 11 月 25 日", t: "美联储开始印钱", n: "0.9 → 2.2 万亿美元", s: "3 个月翻了一倍多", span: 2.5, fx: ["bills"], lab: "印钞", src: "美联储资产负债表（H.4.1）" },
  { y: DY(2008, 12, 16), b: 4, k: "policy", tag: "2008 年 12 月 16 日", t: "利率降到零", s: "钱，从没这么便宜过", icon: "rateDown", span: 3, src: "美联储" },
  { y: DY(2011, 8, 5), b: 4, k: "turn", tag: "2011 年 8 月 5 日", t: "美国国债第一次被降级", s: "标普：AAA → AA+", icon: "stamp", span: 3 },
  { y: DY(2011, 8, 22), b: 8, k: "peak", tag: "2011 年 8 月 22 日", t: "新高", n: "1,889 美元", s: "不到 3 年，涨了 1.7 倍", pct: "+168%", big: true, go: "slam", anchor: BAR(50), span: 4, fx: ["fwBig"], src: "收盘价；盘中最高约 1,921 美元（9 月 6 日）" },
  { y: DY(2013, 4, 15), b: 6, k: "crash", tag: "2013 年 4 月 15 日", t: "一天暴跌", n: "9%", s: "两天跌了 13%", big: true, go: "slam", anchor: BAR(52), span: 0.3, fx: ["bolt"] },
  { y: DY(2013, 4, 25), b: 4, k: "note", tag: "2013 年 4 月 · 中国", t: "金店排长队，「中国大妈」抄底", span: 0.6 },
  { y: 2013.5, b: 4, k: "stat", tag: "2013 年 · 中国", t: "全年买进黄金", n: "1,176 吨", s: "第一次超过印度，世界第一", span: 2, src: "中国黄金协会" },
  { y: DY(2015, 12, 16), b: 6, k: "crash", tag: "2015 年 12 月 · 美联储加息", t: "金价跌到", n: "1,051 美元", s: "2011 年买的人，亏了 44%", span: 6, fit: 1888.7 },
  { y: 2019.6, b: 4, k: "note", tag: "2019 年 8 月", t: "全球负利率债券", n: "约 17 万亿美元", s: "借钱给别人，还要倒贴利息", span: 9, src: "彭博全球综合债券指数" },
  // 第五幕 · 央行的选择
  { y: DY(2020, 3, 18), b: 6, k: "crash", tag: "2020 年 3 月 · 新冠疫情", t: "股市暴跌，金价也先跌了", n: "12%", anchor: BAR(58), span: 0.4, icon: "virus", fx: ["bw"] },
  { y: 2020.45, b: 4, k: "policy", tag: "2020 年 3—6 月", t: "美联储 3 个半月", n: "多放出 3 万亿美元", span: 1.2, fx: ["bills"], lab: "印钞", src: "美联储资产负债表（H.4.1）" },
  { y: DY(2020, 7, 23), b: 6, k: "peak", tag: "2020 年 7 月 23 日 · 1,890 美元", t: "2011 年买的人，终于回本", s: "等了 8 年 11 个月", lab: "解套", span: 10, fx: ["solve"], fit: 1888.7 },
  { y: DY(2020, 8, 6), b: 4, k: "peak", tag: "2020 年 8 月 6 日", t: "新高", n: "2,069 美元", span: 2, fx: ["fw"] },
  { y: DY(2022, 2, 28), b: 8, k: "war", tag: "2022 年 2 月 · 俄乌冲突", t: "俄罗斯储备被冻结，约 3,000 亿美元", s: "各国发现：美元资产也不安全", anchor: BAR(63), span: 1.6, icon: "lock" },
  { y: 2022.5, b: 8, k: "policy", tag: "2022—2023 年", t: "美联储连续加息", s: "从 0 加到 5% 以上", span: 1.8, icon: "rateUp", src: "美联储" },
  { y: 2022.84, b: 6, k: "turn", tag: "2022 年 11 月起", t: "加息，也没压住金价", s: "各国央行开始抢购黄金", anchor: BAR(67), span: 3 },
  { y: 2023.0, b: 6, k: "note", tag: "2022—2024 年 · 各国央行", t: "每年买进黄金", n: "超过 1,000 吨", s: "是以前的 2 倍多", span: 4, icon: "vault", src: "世界黄金协会" },
  { y: 2023.3, b: 8, k: "note", tag: "2022 年 11 月起 · 中国人民银行", t: "连续 18 个月增持黄金", span: 4, src: "中国人民银行" },
  // the big return
  { y: 2024.5, b: 4, k: "peak", tag: "2024 年", t: "金价创新高", n: "45 次", s: "全年涨了 27%", big: true, anchor: BAR(72), span: 5, fx: ["fwBig"], src: "COMEX 收盘新高次数" },
  { y: DY(2025, 3, 13), b: 4, k: "peak", tag: "2025 年 3 月", t: "突破", n: "3,000 美元", s: "从 2,000 到 3,000：4 年半", span: 3, fx: ["fw"] },
  { y: DY(2025, 4, 21), b: 4, k: "turn", tag: "2025 年 4 月 · 关税战", t: "美国总统公开施压美联储", s: "4 月 7 日 → 21 日", pct: "+15%", lab: "推手", span: 1.5, icon: "tariff", src: "路透社" },
  { y: DY(2025, 9, 2), b: 6, k: "peak", tag: "2025 年 9 月 2 日 · 3,592 美元", t: "扣掉通胀，1980 年买的人才真回本", s: "等了 45 年 7 个月", lab: "真解套", span: 3, fx: ["solve"], fit: 3600, src: "按美国劳工统计局 CPI 换算：1980 年的 850 美元 ≈ 2025 年的 3,550 美元" },
  { y: DY(2025, 10, 6), b: 4, k: "peak", tag: "2025 年 10 月", t: "突破", n: "4,000 美元", s: "美国政府停摆，市场押注降息", span: 2, fx: ["fw"] },
  { y: DY(2026, 1, 12), b: 4, k: "turn", tag: "2026 年 1 月 12 日", t: "美联储主席被司法部调查", s: "怕美联储不再独立，金价首破 4,600", lab: "推手", span: 1, icon: "gavel", src: "美联储主席声明；路透社" },
  { y: DY(2026, 1, 29), b: 4, k: "peak", tag: "2026 年 1 月 29 日", t: "历史最高", n: "5,318 美元", s: "4,000 到 5,000：3 个半月", big: true, span: 0.2, fx: ["fwBig"], src: "收盘价；盘中最高约 5,595 美元" },
  { y: DY(2026, 1, 30), b: 4, k: "crash", tag: "2026 年 1 月 30 日", t: "一天暴跌", n: "11%", s: "1983 年以来最大单日跌幅", big: true, go: "slam", anchor: BAR(79), span: 0.15, fx: ["bolt"], src: "路透社" },
  { y: 2026.0805, b: 4, k: "note", tag: "那一天", t: "总统提名新的美联储主席", s: "对美联储的担心，一下少了", span: 0.2, src: "CNBC、路透社" },
  { y: DY(2026, 3, 20), b: 4, k: "war", tag: "2026 年 2 月 28 日起", t: "美国、以色列空袭伊朗", n: "−14%", s: "油价涨 → 不降息 → 金价跌", span: 1, icon: "oil", src: "3 月 2 日 → 3 月 20 日收盘" },
  { y: 2026.8411, b: 4, k: "stat", tag: "2026 年 11 月", t: "现在", n: "约 4,058 美元", s: "比最高点低了约四分之一", span: 2.4 },
];

// old highs drawn across the chart while the price is under them; solve = the day a close gets back above
export const WIRES = [
  { v: 850, y0: 1980.055, show: 1981.2, solve: DY(2008, 1, 2), name: "1980 年最高 850 美元", days0: "1980-01-21" },
  { v: 1888.7, y0: DY(2011, 8, 22), show: 2011.75, solve: DY(2020, 7, 23), name: "2011 年最高 1,889 美元", days0: "2011-08-22" },
  { v: 5318.4, y0: DY(2026, 1, 29), show: 2026.1, solve: 9999, name: "2026 年最高 5,318 美元", days0: "2026-01-29" },
];
// the prices the law fixed: nails on the line while it sits on them; the last ones pop at Nixon
export const PEGS = [
  { v: 20.67, y0: 1834.5, y1: 1933.3, label: "法定 20.67 美元" },
  { v: 35, y0: 1934.08, y1: 1971.62, label: "法定 35 美元" },
];
export const BW_UNTIL = 1971.62;

// ---------------- scheduler: every event starts on a half-bar (beat 1 or 3 of the bar); anchors on bar lines
const schedule2 = (evs: Ev5[], m: Music, startSrc: number, endSrc: number): P5[] => {
  const HB = 2 * BEAT;
  const hbOf = (src: number) => Math.round((src - 0.05) / HB);
  const h0 = hbOf(startSrc);
  const pins: [number, number][] = [[0, h0]];
  evs.forEach((e, i) => {
    if (i > 0 && e.anchor !== undefined) pins.push([i, hbOf(e.anchor)]);
  });
  pins.push([evs.length, hbOf(endSrc)]);
  const u = evs.map((e) => Math.max(1, Math.round(e.b / 2)));
  for (let p = 0; p < pins.length - 1; p++) {
    const [ia, ha] = pins[p];
    const [ib, hb] = pins[p + 1];
    const want = hb - ha;
    const idx = Array.from({ length: ib - ia }, (_, q) => ia + q);
    if (want < idx.length) throw new Error(`anchor ${ib}: ${idx.length} events, only ${want} half-bars`);
    let have = idx.reduce((s, i) => s + u[i], 0);
    let guard = 0;
    while (have !== want && guard++ < 10000) {
      if (have > want) {
        const i = idx.reduce((a, c) => (u[c] > u[a] ? c : a), idx[0]);
        if (u[i] <= 1) break;
        u[i]--;
        have--;
      } else {
        const i = idx.reduce((a, c) => (u[c] / evs[c].b < u[a] / evs[a].b ? c : a), idx[0]);
        u[i]++;
        have++;
      }
    }
    if (have !== want) throw new Error(`segment ${p} does not fit`);
  }
  const out: P5[] = [];
  let h = h0;
  evs.forEach((e, i) => {
    const bi = 2 * h;
    const nb = 2 * (h + u[i]);
    out.push({ ...e, b: 2 * u[i], i, t0: m.beats[bi].t, t1: nb < m.beats.length ? m.beats[nb].t : m.dur, bi });
    h += u[i];
  });
  return out;
};

// ---------------- cold open: 2001 -> 2026 on a fixed window; the title holds two beats, six highs on six beats,
// the top with fireworks, the crash with lightning, the question, the rewind
export const COLD5 = {
  // the line is already climbing on the first frame; the title slams in on beat 2, holds, then flies into the header
  titleIn: A(3),
  title: [A(4.1), A(4.7)] as [number, number], // big until, in the header by
  startY: 2001.1233,
  win: [2000.62, 2026.2] as [number, number],
  vmax: 4000, // the window tops out at $4,000: the line breaks through it
  ceil: 4000,
  keys: [
    [0, 2025.62],
    [A(1), DY(2025, 10, 6)],
    [A(2), DY(2026, 1, 29)],
    [A(4.6), DY(2026, 1, 29)],
    [A(5), DY(2026, 1, 30)],
  ] as [number, number][],
  marks: [
    { y: DY(2008, 3, 17), at: -1, a: "2008 年", b: "破 1,000 美元" },
    { y: DY(2011, 8, 22), at: -1, a: "2011 年", b: "1,889 美元" },
    { y: DY(2020, 8, 6), at: -1, a: "2020 年", b: "2,069 美元" },
    { y: DY(2025, 3, 13), at: -1, a: "2025 年 3 月", b: "破 3,000 美元" },
    { y: DY(2025, 10, 6), at: A(1), a: "2025 年 10 月", b: "破 4,000 美元" },
    { y: DY(2026, 1, 29), at: A(2), a: "2026 年 1 月 29 日", b: "5,318 美元", top: true },
  ],
  crash: { y: DY(2026, 1, 30), at: A(5), a: "第二天", b: "−11%" },
  times: "25 年，×21",
};
// one ounce, held up while the question is asked
export const COIN = { t0: A(6), t1: A(12) - 0.05 };
// the old high in today's money: 850 dollars of January 1980, carried forward by the US CPI
export const CPI = CPI_RAW as [number, number][];
export const REAL = { v0: 850, y0: 1980.055, name: "1980 年最高 850 美元" };
// the two rates the ending sets side by side
export const RATES = { t0: BAR(83) + 0.1 + 4 * BEAT, t1: BAR(88), split: 1971.62, a: ["前 179 年", "年均 +0.3%"], b: ["后 55 年", "年均 +9%"] };
export const NEXT = { a: "下一集 · 石油", b: "1 盎司黄金，能换几桶油？" };
export const SWEEP = { t0: BAR(88), dur: 1.3 };
const COLD_LINES = [{ t0: A(6), t1: A(12) - 0.05, a: "1792 年，1 盎司黄金只要 19 美元", b: "金子没变，金价凭什么涨？", bBeats: 2, tone: "white" as const }];

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
  "COMEX 黄金期货收盘价与日线（2000 年起）",
  "央行储备：国际货币基金组织、世界黄金协会",
  "物价：美国劳工统计局；汇率、利率：美联储",
  "配乐：原创，AI 生成（Google Lyria）",
];

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

export const PLACED = schedule2(EVS, MUSIC, BAR(4), BAR(83));
export const REVEALS = PLACED.map((e) => ({ k: e.k, big: !!e.big, y: e.y, ...revealOf(e, MUSIC.beats) }));

// fireworks: a rocket from the head, then bursts (big highs: three)
export const fwBursts = (t0: number, big: boolean) => (big ? [t0 + 0.16, t0 + 0.16 + BEAT * 0.5, t0 + 0.16 + BEAT] : [t0 + 0.16]);
// sound cues for the effects (tools/cues6.mjs -> tools/sfx_film6.py)
export const FXCUES: { t: number; fx: string }[] = [
  ...fwBursts(COLD5.marks[5].at, true).map((t) => ({ t, fx: "pop" })),
  { t: COLD5.crash.at, fx: "bolt" },
  { t: COLD5.marks[4].at, fx: "ceil" },
  { t: A(6), fx: "coin" },
  { t: COLD5.titleIn, fx: "title" },
  { t: BAR(88), fx: "sweep" },
  ...PLACED.flatMap((e) => [
    ...(e.fx ?? []).flatMap((f) =>
      f === "fw" || f === "fwBig" ? fwBursts(e.t0, f === "fwBig").map((t) => ({ t, fx: "pop" })) : [{ t: e.t0, fx: f as string }],
    ),
    ...(e.icon ? [{ t: e.t0, fx: e.icon === "lock" ? "lock" : e.icon === "stamp" || e.icon === "gavel" ? "stamp" : "icon" }] : []),
  ]),
];

export const GOLD5: Spec = {
  id: "gold",
  brand: "金价两百年",
  series: SERIES,
  music: MUSIC,
  events: PLACED,
  cold: {
    keys: COLD5.keys.map(([t, y]) => ({ t, y, p: 1 })),
    crashes: [...COLD5.marks.filter((m) => m.at >= 0).map((m) => ({ y: m.y, t: m.a, p: m.b, at: m.at, tone: "gold" as const })), { y: COLD5.crash.y, t: COLD5.crash.a, p: COLD5.crash.b, at: COLD5.crash.at, tone: "red" as const }],
    lines: COLD_LINES,
    rewind: [A(12), A(16)],
    start: "1792 年",
  },
  dyn: [
    [1792, 1933.3, "金本位", 1],
    [1934, 1971.6, "美元挂钩黄金", 1],
    [1971.6, 2026.84, "自由浮动", 2],
  ],
  body: [PLACED[0].t0, END_T],
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
// cues6.mjs looks for GOLD
export const GOLD = GOLD5;
