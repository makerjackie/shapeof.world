// 油价一百六十年 (data series ep 2) on EngineO (the gold film's EngineG5, re-cut for a barrel of oil).
// One question: who sets the price of oil? Each act answers with whoever held the spare barrel (or could stop the flow):
// Rockefeller -> Texas and the seven companies -> OPEC -> the exchange and Saudi Arabia -> shale and OPEC+ -> a strait.
// The cold open is a montage of six moments cut on the beat, then the title over the whole line and the rewind.
// Same score and anchors as the gold film (「兴衰」, 130 BPM). Sources: research/SOURCES.md; data: research/oildata.py.
import OD from "./oil_data.json";
import type { Pt, Spec, TableRow } from "./specG";
import { Ev, makeMusic, Music, Placed } from "./time6";
import { revealOf } from "./reveal7";

const D = OD as unknown as { series: [number, number, Pt["kind"]][]; gold: number[]; cny: [number, number][]; shares: Record<string, [number, number][]> };
export const SERIES: Pt[] = D.series.map(([y, v, kind]) => ({ y, v, kind }));

// ---------------- music (score_world8.wav, 130 BPM): loud 0-2, dip 3 (rewind), drop 4, dip 11 -> hit 12, quiet 17-19,
// dip 27-28, mellow 35-43, big return 44, quiet 58-66, rise 67, big return 72, outro 83
const BEAT = 60 / 130;
const A = (n: number) => +(0.05 + n * BEAT).toFixed(4);
const BAR = (k: number) => +(0.05 + 4 * BEAT * k).toFixed(4);
const DUR = 170.78;
export const MUSIC = makeMusic([[0, DUR]], 2.9, [{ t0: 0, t1: DUR, P: BEAT, ph: 0.05, bar: 0 }]);

const DY = (y: number, m: number, d: number) => {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const ml = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let n = d - 1;
  for (let i = 0; i < m - 1; i++) n += ml[i];
  return +(y + n / (leap ? 366 : 365)).toFixed(5);
};

export type Fx = "bolt" | "shatter" | "fw" | "fwBig" | "bills" | "closed" | "snap" | "bw" | "solve";
export type Icon = "oil" | "etf" | "virus" | "lock" | "stamp" | "rateUp" | "rateDown" | "vault" | "exchange" | "tariff" | "gavel" | "derrick" | "pump" | "strait" | "tank" | "flame" | "pumpjack" | "tanker" | "refinery" | "barrel" | "pipeline" | "car" | "offshore";
// what happens on the map at the event's pin: air strikes, burning wells, a gusher, a shale well being drilled and
// fractured, a pipeline valve closing (cuts) or opening (reserves released)
export type Anim = "strike" | "fire" | "gush" | "drill" | "valve" | "release";
export type Ev5 = Ev & { fx?: Fx[]; icon?: Icon; lab?: string; fit?: number; alarm?: string; geo?: [number, number]; pic?: Icon; place?: string; mz?: number; anim?: Anim[] };
export type P5 = Placed & { fx?: Fx[]; icon?: Icon; lab?: string; fit?: number; alarm?: string; geo?: [number, number]; pic?: Icon; place?: string; mz?: number; anim?: Anim[] };

const EIA = "美国能源信息署：美国原油年均价";
const EI = "Energy Institute《世界能源统计年鉴》";
const EVS: Ev5[] = [
  // 第一幕 · 野蛮生长 (black and white)
  { y: 1859.5, pic: "derrick", place: "宾夕法尼亚 · 泰特斯维尔", mz: 4, geo: [-79.7, 41.6], anim: ["gush"], b: 4, k: "stat", tag: "1859 年 · 美国宾夕法尼亚", t: "第一口现代油井出油，1 桶卖", n: "16 美元", s: "1 桶 = 159 升", anchor: BAR(4), span: 40, icon: "derrick", src: EIA },
  { y: 1861.5, pic: "derrick", place: "宾夕法尼亚油区", mz: 4, geo: [-79.7, 41.6], b: 2, k: "crash", tag: "1861 年", t: "人人都去打井，油价跌到", n: "49 美分", s: "有时，油比装它的木桶还便宜", pct: "−97%", fx: ["bolt"], src: "丹尼尔·耶金《石油大博弈》" },
  { y: 1879.5, pic: "refinery", place: "克利夫兰 · 标准石油", mz: 3.5, geo: [-81.7, 41.5], b: 2, k: "turn", tag: "1879 年 · 洛克菲勒", t: "标准石油，控制了美国九成炼油", s: "第一个能左右油价的人", lab: "垄断", src: "丹尼尔·耶金《石油大博弈》" },
  { y: 1901.03, pic: "derrick", place: "得州 · 博蒙特", mz: 4, geo: [-94.1, 30.0], anim: ["gush"], b: 2, k: "stat", tag: "1901 年 · 得州纺锤顶", t: "一口井喷了 9 天，一天约", n: "10 万桶", s: "得州石油时代开始", lab: "井喷", src: "得州州史协会" },
  { y: 1908.75, pic: "car", place: "底特律 · 福特", mz: 3.5, geo: [-83.05, 42.35], b: 4, k: "turn", tag: "1908 年 · 福特 T 型车", t: "汽车来了，石油从点灯变成烧油", s: "到 1927 年，T 型车卖了 1,500 万辆", icon: "car", lab: "需求", src: "福特汽车公司" },
  { y: 1911.4, pic: "gavel", place: "华盛顿 · 最高法院", mz: 3.5, geo: [-77, 38.9], b: 2, k: "policy", tag: "1911 年 · 美国最高法院", t: "标准石油被拆成 34 家公司", icon: "gavel", src: "美国最高法院判决" },
  // 第二幕 · 定价的人
  { y: 1931.5, pic: "pumpjack", place: "东得州油田", mz: 4, geo: [-95, 32.3], anim: ["gush"], b: 6, k: "crash", tag: "1931 年 · 大萧条", t: "又挖出东得州大油田，油价跌到", n: "65 美分", s: "最低时，1 桶卖 10 美分", pct: "−45%", big: true, go: "slam", anchor: BAR(8), span: 40, fx: ["bolt"], src: EIA },
  { y: 1931.75, pic: "pumpjack", place: "东得州油田", mz: 4.5, geo: [-95, 32.3], anim: ["valve"], b: 4, k: "policy", tag: "1931 年 8 月 · 得州", t: "州长派军队，关停油井", s: "此后，得州给每口井定产量", src: "得州州史协会" },
  { y: 1948.5, pic: "derrick", place: "沙特 · 加瓦尔", mz: 3.5, geo: [49.3, 25.4], anim: ["gush"], b: 4, k: "stat", tag: "1948 年 · 沙特", t: "发现加瓦尔油田", s: "至今仍是世界最大的油田", lab: "发现", src: "沙特阿美" },
  { y: 1955.5, pic: "pumpjack", place: "得州", mz: 3, geo: [-95, 32.3], b: 4, k: "policy", tag: "1930—1960 年代", t: "得州定产量，七大石油公司定牌价", s: "油价 20 多年几乎不动", lab: "定价" },
  { y: 1960.7, pic: "barrel", place: "巴格达", mz: 3.5, geo: [44.4, 33.3], b: 4, k: "turn", tag: "1960 年 9 月 · 巴格达", t: "5 个产油国成立 OPEC", s: "不满石油公司压价", src: "石油输出国组织" },
  { y: 1970.6, pic: "pumpjack", place: "得州", mz: 3, geo: [-95, 32.3], b: 4, k: "turn", tag: "1970 年 · 美国", t: "美国石油产量见顶", s: "得州再也没有多余的油", src: "美国能源信息署" },
  // 第三幕 · OPEC (colour)
  { y: DY(1973, 10, 17), pic: "tanker", place: "沙特 · 波斯湾", mz: 3, geo: [49.6, 25.9], b: 8, k: "split", tag: "1973 年 10 月 · 第四次中东战争", t: "阿拉伯产油国：对美国禁运", s: "中东油价：3 美元 → 11.65 美元", big: true, go: "slam", anchor: BAR(12), span: 14, fx: ["snap"], icon: "tanker", lab: "禁运", src: "沙特阿拉伯轻质原油官价" },
  { y: 1974.05, pic: "pump", place: "美国", mz: 2.4, geo: [-77, 38.9], b: 4, k: "peak", tag: "1974 年 1 月", t: "美国油价涨到", n: "10.11 美元", pct: "×2.8", lab: "暴涨" },
  { y: 1974.4, pic: "pump", place: "美国", mz: 2.4, geo: [-77, 38.9], b: 4, k: "note", tag: "1974 年 · 美国", t: "加油站排长队，单双号加油", icon: "pump" },
  { y: 1975.95, pic: "tank", place: "路易斯安那 · 战略储备", mz: 3.5, geo: [-93.5, 29.8], anim: ["release"], b: 4, k: "policy", tag: "1975 年 · 美国", t: "建立战略石油储备", s: "以后出事，就开仓放油", icon: "tank", src: "美国《能源政策和节约法》" },
  { y: 1977.6, pic: "offshore", place: "北海油田", mz: 3, geo: [2.0, 57.5], b: 4, k: "note", tag: "1977 年 · 北海、阿拉斯加", t: "钻井平台立进大海，新油田出油", s: "高油价，逼出了新油田", icon: "offshore", lab: "技术" },
  { y: 1979.05, pic: "flame", place: "伊朗", mz: 3.5, geo: [51.4, 35.7], b: 6, k: "war", tag: "1979 年 · 伊朗革命", t: "伊朗石油停产", s: "第二次石油危机", icon: "flame" },
  { y: 1980.29, b: 6, k: "peak", tag: "1980 年 4 月", t: "油价涨到", n: "39.50 美元", s: "不到 7 年，涨了 10 倍", pct: "×11", big: true, go: "slam", anchor: BAR(23), span: 20, fx: ["fwBig"], lab: "暴涨" },
  { y: 1980.72, pic: "flame", place: "两伊边境", mz: 4, geo: [48.2, 30.4], anim: ["strike", "fire"], b: 4, k: "war", tag: "1980 年 9 月", t: "两伊战争爆发", s: "两大产油国，互炸油田", icon: "flame" },
  { y: 1983.25, pic: "exchange", place: "纽约商品交易所", mz: 3.5, geo: [-74, 40.7], b: 4, k: "policy", tag: "1983 年 3 月 · 纽约", t: "原油期货开始交易", s: "油价，从此每秒都在变", icon: "exchange", src: "纽约商品交易所" },
  { y: 1985.3, pic: "pumpjack", place: "沙特", mz: 3.5, geo: [49.6, 25.9], anim: ["valve"], b: 6, k: "turn", tag: "1981—1985 年 · 沙特", t: "沙特一再减产，独自撑油价", s: "产量砍掉了三分之二", lab: "减产", src: EI },
  { y: 1986.55, pic: "tanker", place: "沙特", mz: 3, geo: [49.6, 25.9], b: 6, k: "crash", tag: "1986 年 · 沙特不再减产", t: "开闸放油，油价跌到", n: "11.58 美元", pct: "−62%", big: true, go: "slam", anchor: BAR(29), span: 14, fx: ["bolt"] },
  // 第四幕 · 交易所里的油价
  { y: 1990.79, pic: "flame", place: "科威特", mz: 4.5, geo: [47.9, 29.4], anim: ["strike"], b: 6, k: "war", tag: "1990 年 8 月 · 伊拉克入侵科威特", t: "两个月，油价涨到", n: "35.92 美元", pct: "+93%", icon: "flame", span: 10 },
  { y: 1991.05, pic: "flame", place: "科威特", mz: 4.5, geo: [47.9, 29.4], anim: ["strike", "fire"], b: 4, k: "crash", tag: "1991 年 1 月 17 日 · 海湾战争", t: "美军开打，油价一天跌了", n: "33%", s: "沙特开足马力，补上了缺口", fx: ["bolt"], src: "WTI 现货价" },
  { y: 1998.95, pic: "tanker", place: "亚洲", mz: 2, geo: [105, 12], b: 6, k: "crash", tag: "1998 年 · 亚洲金融危机", t: "需求骤降，油价跌到", n: "11.28 美元", s: "OPEC 偏偏刚加了产" },
  { y: 1999.4, pic: "barrel", place: "维也纳 · OPEC 总部", mz: 3.5, geo: [16.4, 48.2], anim: ["valve"], b: 4, k: "policy", tag: "1999 年 3 月", t: "OPEC 联手减产", s: "一年后，油价回到 30 美元", lab: "减产" },
  { y: DY(2003, 3, 20), pic: "flame", place: "伊拉克", mz: 4, geo: [44.4, 33.3], anim: ["strike"], b: 4, k: "war", tag: "2003 年 3 月", t: "伊拉克战争", icon: "flame", span: 6 },
  { y: 2004.6, pic: "pumpjack", place: "沙特", mz: 3, geo: [49.6, 25.9], b: 6, k: "stat", tag: "2004 年 · OPEC", t: "多余的产能，只剩", n: "约 120 万桶/天", s: "30 年来最少", anchor: BAR(37), span: 6, src: "国际能源署" },
  { y: 2006.5, b: 6, k: "stat", tag: "2002—2008 年 · 中国", t: "全世界新增的石油需求", n: "近四成", s: "来自中国", span: 5, src: EI },
  { y: DY(2008, 2, 19), pic: "exchange", place: "纽约", mz: 3.5, geo: [-74, 40.7], b: 4, k: "peak", tag: "2008 年 2 月 19 日", t: "收盘第一次突破", n: "100 美元", fx: ["fw"], span: 3, lab: "破百" },
  { y: DY(2008, 7, 3), b: 6, k: "peak", tag: "2008 年 7 月 3 日", t: "历史最高", n: "145.29 美元", s: "2001 年底，还只有 17 美元", big: true, go: "slam", anchor: BAR(44), span: 2, fx: ["fwBig"], lab: "新高", src: "收盘价；盘中最高 147.27 美元（7 月 11 日）" },
  { y: DY(2008, 9, 15), pic: "exchange", place: "纽约 · 雷曼兄弟", mz: 3.5, geo: [-74, 40.7], b: 4, k: "war", tag: "2008 年 9 月 15 日", t: "雷曼兄弟破产", s: "全球金融危机爆发", lab: "危机", fx: ["shatter"], span: 1.2 },
  { y: DY(2008, 12, 19), b: 6, k: "crash", tag: "2008 年 7 月 → 12 月", t: "不到半年，油价跌到", n: "33.87 美元", pct: "−77%", fx: ["bolt"], span: 2 },
  { y: 2009.3, pic: "barrel", place: "阿尔及利亚 · 奥兰", mz: 3.5, geo: [-0.6, 35.7], anim: ["valve"], b: 4, k: "policy", tag: "2008 年 12 月 · OPEC", t: "史上最大减产", n: "420 万桶/天", s: "一年后，油价翻了一倍", lab: "减产", span: 3, src: "石油输出国组织" },
  { y: DY(2011, 4, 29), pic: "flame", place: "利比亚", mz: 4, geo: [13.2, 32.9], anim: ["strike"], b: 6, k: "war", tag: "2011 年 · 阿拉伯之春", t: "利比亚内战，油价回到", n: "113.93 美元", anchor: BAR(50), span: 5, icon: "flame" },
  { y: 2013.4, pic: "pumpjack", place: "二叠纪盆地 · 得州", mz: 4, geo: [-102.5, 31.8], anim: ["drill"], b: 6, k: "stat", tag: "2008—2014 年 · 美国页岩油", t: "水平钻井 + 压裂", s: "美国产量 6 年涨了七成", icon: "derrick", span: 6, src: EI },
  { y: DY(2014, 11, 28), pic: "barrel", place: "维也纳 · OPEC 总部", mz: 3.5, geo: [16.4, 48.2], b: 6, k: "crash", tag: "2014 年 11 月 27 日 · OPEC", t: "沙特拒绝减产，一天暴跌", n: "10%", s: "要用低油价，挤垮页岩油", big: true, go: "slam", anchor: BAR(52), span: 2.5, fx: ["bolt"], src: "路透社" },
  { y: DY(2016, 2, 11), b: 6, k: "crash", tag: "2016 年 2 月 11 日", t: "油价跌到", n: "26.21 美元", s: "页岩油熬了过来", pct: "−76%", span: 4 },
  { y: DY(2016, 12, 12), pic: "barrel", place: "维也纳", mz: 3.5, geo: [16.4, 48.2], anim: ["valve"], b: 4, k: "policy", tag: "2016 年 12 月", t: "OPEC 拉上俄罗斯，组成 OPEC+", s: "一起减产", lab: "联手", span: 4, src: "石油输出国组织" },
  { y: DY(2019, 9, 16), pic: "flame", place: "沙特 · 阿布盖格", mz: 5, geo: [49.7, 25.9], anim: ["strike", "fire"], b: 4, k: "war", tag: "2019 年 9 月 14 日", t: "沙特最大的石油设施遇袭", s: "一半产量停摆，油价一天 +15%", icon: "flame", span: 2, src: "路透社" },
  // 第五幕 · 页岩、OPEC+ 和海峡
  { y: DY(2020, 3, 9), pic: "barrel", place: "利雅得", mz: 3, geo: [46.7, 24.7], b: 6, k: "crash", tag: "2020 年 3 月 · 新冠 + 价格战", t: "沙特、俄罗斯谈崩，一天暴跌", n: "25%", anchor: BAR(58), span: 0.6, icon: "virus", fx: ["bw"] },
  { y: DY(2020, 4, 13), pic: "barrel", place: "维也纳", mz: 3.5, geo: [16.4, 48.2], anim: ["valve"], b: 4, k: "policy", tag: "2020 年 4 月 12 日 · OPEC+", t: "减产 970 万桶/天，史上最多", s: "可全世界都封城了", lab: "减产", span: 0.3, src: "石油输出国组织" },
  { y: DY(2020, 4, 20), pic: "tank", place: "库欣 · 美国最大油库", mz: 4.5, geo: [-96.8, 36.0], b: 8, k: "crash", tag: "2020 年 4 月 20 日", t: "油价跌成负数", n: "−37.63 美元", s: "油库快满了，卖油的倒贴钱", big: true, go: "slam", span: 0.25, fx: ["shatter"], src: "5 月 WTI 期货合约到期前一天" },
  { y: DY(2020, 4, 21), pic: "tank", place: "库欣", mz: 4.5, geo: [-96.8, 36.0], b: 2, k: "note", tag: "第二天", t: "油价回到 10 美元", s: "负油价，只有一天", span: 0.25 },
  { y: 2021.55, b: 4, k: "note", tag: "2021 年", t: "疫情退潮，油价涨回 70 美元", s: "OPEC+ 每月只多放一点油", span: 3 },
  { y: DY(2022, 3, 8), pic: "pipeline", place: "俄罗斯", mz: 2.6, geo: [37.6, 55.8], b: 6, k: "war", tag: "2022 年 2 月 24 日 · 俄乌冲突", t: "制裁俄罗斯，油价冲到", n: "123.70 美元", anchor: BAR(63), span: 1.5, fx: ["fw"], icon: "pipeline" },
  { y: DY(2022, 3, 31), pic: "tank", place: "美国战略储备", mz: 3, geo: [-77, 38.9], anim: ["release"], b: 4, k: "policy", tag: "2022 年 3 月 31 日 · 美国", t: "开仓放出 1.8 亿桶储备", s: "当时史上最多", icon: "tank", span: 2, src: "白宫" },
  { y: DY(2023, 4, 3), pic: "barrel", place: "OPEC+", mz: 2.5, geo: [16.4, 48.2], anim: ["valve"], b: 4, k: "policy", tag: "2023 年 4 月 · OPEC+", t: "突然宣布减产，油价一天 +6%", lab: "减产", span: 3, src: "路透社" },
  { y: 2024.9, pic: "pumpjack", place: "二叠纪盆地 · 得州", mz: 4, geo: [-102.5, 31.8], b: 6, k: "stat", tag: "2025 年 · 美国", t: "原油产量创纪录", n: "1,360 万桶/天", s: "比俄罗斯、沙特都多四成", anchor: BAR(67), span: 4, icon: "derrick", src: "美国能源信息署" },
  { y: DY(2025, 6, 24), pic: "flame", place: "伊朗", mz: 3.5, geo: [51.4, 35.7], anim: ["strike"], b: 4, k: "war", tag: "2025 年 6 月 · 以色列空袭伊朗", t: "12 天战争，油价先涨后跌", s: "霍尔木兹海峡，没被封", span: 2, icon: "flame" },
  { y: DY(2025, 12, 16), b: 4, k: "crash", tag: "2025 年 12 月 · OPEC+ 加产", t: "油价跌到", n: "55.27 美元", s: "近 5 年最低", span: 2 },
  { y: DY(2026, 3, 2), pic: "flame", place: "伊朗", mz: 3.5, geo: [51.4, 35.7], anim: ["strike"], b: 6, k: "war", tag: "2026 年 2 月 28 日", t: "美国、以色列空袭伊朗", big: true, go: "slam", anchor: BAR(72), span: 0.8, icon: "flame", lab: "战争" },
  { y: DY(2026, 3, 4), pic: "strait", place: "霍尔木兹海峡", mz: 6, geo: [56.3, 26.6], b: 6, k: "war", tag: "2026 年 3 月 · 霍尔木兹海峡", t: "伊朗封锁海峡", s: "全世界约五分之一的石油走这里", icon: "strait", fx: ["closed"], span: 0.5, lab: "封锁", alarm: "霍尔木兹 · 封锁", src: "美国能源信息署" },
  { y: DY(2026, 3, 6), pic: "tanker", place: "霍尔木兹海峡", mz: 6, geo: [56.3, 26.6], b: 4, k: "peak", tag: "2026 年 3 月 2 日 → 6 日", t: "一周暴涨", n: "36%", s: "有原油期货以来最大周涨幅", fx: ["fw"], span: 0.5, lab: "暴涨", src: "路透社" },
  { y: DY(2026, 3, 11), pic: "tank", place: "巴黎 · 国际能源署", mz: 3.5, geo: [2.35, 48.86], anim: ["release"], b: 4, k: "policy", tag: "2026 年 3 月 11 日 · 国际能源署", t: "各国放出 4 亿桶储备", s: "史上最多，是 2022 年的两倍多", icon: "tank", span: 0.6, src: "国际能源署" },
  { y: DY(2026, 4, 7), b: 6, k: "peak", tag: "2026 年 4 月 7 日", t: "油价涨到", n: "112.95 美元", s: "战前是 67 美元", pct: "+69%", big: true, span: 1.2, fx: ["fwBig"], lab: "暴涨" },
  { y: DY(2026, 4, 8), pic: "strait", place: "霍尔木兹海峡", mz: 6, geo: [56.3, 26.6], b: 4, k: "crash", tag: "2026 年 4 月 8 日", t: "美伊停火，一天暴跌", n: "16%", anchor: BAR(79), span: 0.3, fx: ["bolt"] },
  { y: DY(2026, 4, 17), pic: "strait", place: "霍尔木兹海峡", mz: 6, geo: [56.3, 26.6], b: 4, k: "crash", tag: "2026 年 4 月 17 日", t: "伊朗宣布开放海峡，再跌 11%", s: "三天后，又收紧了", span: 0.6 },
  { y: DY(2026, 6, 24), pic: "tanker", place: "霍尔木兹海峡", mz: 6, geo: [56.3, 26.6], b: 4, k: "note", tag: "2026 年 6 月", t: "油轮重新通过海峡", s: "油价跌回 70 美元", span: 2 },
  { y: DY(2026, 10, 16), pic: "flame", place: "霍尔木兹海峡", mz: 5, geo: [56.3, 26.6], anim: ["strike"], b: 4, k: "war", tag: "2026 年 9—10 月", t: "战火又起，油价再过 100 美元", span: 2, icon: "flame" },
  { y: DY(2026, 11, 4), pic: "barrel", place: "华盛顿", mz: 3, geo: [-77, 38.9], b: 4, k: "stat", tag: "2026 年 11 月 4 日", t: "市场押注美伊和谈，一天跌 8%", n: "88.12 美元", span: 1.6, src: "CNBC" },
];

// the 2008 high, drawn across while the price is under it (never beaten since)
export const WIRES = [{ v: 145.29, y0: DY(2008, 7, 3), show: 2008.62, solve: 9999, name: "2008 年最高 145 美元", days0: "2008-07-03" }];
// the posted prices that sat still for years: nails on the line; the last ones pop when the embargo hits
export const PEGS = [
  { v: 2.57, y0: 1948.04, y1: 1953.41, label: "牌价 2.57 美元" },
  { v: 2.97, y0: 1959.2, y1: 1964.5, label: "牌价 2.97 美元" },
  { v: 3.56, y0: 1970.96, y1: 1973.62, label: "牌价 3.56 美元" },
];
export const BW_UNTIL = DY(1973, 10, 17);

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

// ---------------- cold open: six moments, two beats each, cut on the beat (the number slams on the second beat), then
// the title lands over the whole 160-year line and it rewinds to 1859. COLD5 keeps its shape for the engine's cursor,
// but nothing of the old window is drawn.
export type Shot = { at: number; year: string; tag: string; pic: Icon; big: string; sub: string; tone: "gold" | "red"; fx: string; anim: "stamp" | "fire" | "fw" | "drip" | "x" | "rise" };
export const MONTAGE: Shot[] = [
  { at: A(0), year: "1973", tag: "第四次中东战争", pic: "pump", big: "石油禁运", sub: "加油站排长队", tone: "red", fx: "stamp", anim: "stamp" },
  { at: A(2), year: "1991", tag: "海湾战争", pic: "flame", big: "油井大火", sub: "科威特", tone: "red", fx: "bolt", anim: "fire" },
  { at: A(4), year: "2008", tag: "历史最高", pic: "exchange", big: "145 美元", sub: "1 桶", tone: "gold", fx: "pop", anim: "fw" },
  { at: A(6), year: "2020", tag: "油库爆满", pic: "tank", big: "−37.63 美元", sub: "卖油的倒贴钱", tone: "red", fx: "ceil", anim: "drip" },
  { at: A(8), year: "2022", tag: "制裁俄罗斯", pic: "pipeline", big: "123.70 美元", sub: "1 桶", tone: "gold", fx: "pop", anim: "rise" },
  { at: A(10), year: "2026", tag: "伊朗战争", pic: "strait", big: "封锁海峡", sub: "霍尔木兹", tone: "red", fx: "closed", anim: "x" },
];
export const SHOT_BEAT = BEAT;
export const COLD5 = {
  titleIn: A(12),
  title: [A(14.4), A(15.3)] as [number, number],
  era: "",
  win: [2017.95, 2026.95] as [number, number],
  vmin: -45,
  vmax: 150,
  floor: { v: 0, y: DY(2020, 4, 20), at: -9 },
  keys: [
    [0, DY(2026, 11, 4)],
    [A(12), DY(2026, 11, 4)],
  ] as [number, number][],
  marks: [] as { y: number; at: number; a: string; b: string; red?: boolean; top?: boolean }[],
  neg: { at: -9, until: -9, a: "", b: "", c: "" },
};
export const COIN = { t0: 1e9, t1: 1e9 };
// the biggest swings, pulled back to decades so they read at their true size: from = the first year in view,
// a = the high the price fell from (the drop is marked), ref = old highs to measure a new one against
export const WIDE: { y: number; from: number; a?: number; ref?: number[] }[] = [
  { y: 1986.55, from: 1946, a: 1985.85 },
  { y: 2008.964, from: 1975, a: 2008.503 },
  { y: 2016.112, from: 1975, a: 2014.466 },
  { y: 2020.301, from: 1975, a: 2020.014 },
  { y: 2026.263, from: 1975, ref: [2008.503, 2022.181] },
];
export const NEXT = { a: "下一集 · 中美 GDP", b: "中国经济，离美国还有多远？" };
export const SWEEP = { t0: BAR(88), dur: 1.3 };
export const RATES = { t0: 1e9, t1: 1e9, split: 1973.8, a: ["", ""], b: ["", ""] };
const COLD_LINES: { t0: number; t1: number; a: string; b: string; bBeats: number; tone: "white" }[] = [];

const ERA_SRC: [number, string][] = [
  [0, "美国原油年均价（美国能源信息署）"],
  [1946, "WTI 原油月均价（美联储圣路易斯分行数据库）"],
  [2000.64, "NYMEX WTI 原油期货收盘价"],
];
const END_T = BAR(83);
const CRED_T = BAR(91);
const CARD_T = BAR(91) + 3.0;
const CREDITS = [
  "油价：美国能源信息署（1859—1945 年均价）",
  "WTI 月均价（美联储圣路易斯分行，1946—2000）",
  "NYMEX WTI 原油期货收盘价与日线（2000 年起）",
  "产量：Energy Institute《世界能源统计年鉴》",
  "事件：国际能源署、OPEC、路透社、CNBC 等",
  "配乐：原创，AI 生成（Google Lyria）",
];

const RC: Record<string, string> = {
  美国: "#6fa8dc", 俄罗斯: "#c9605e", 沙特: "#3fa66f", 伊朗: "#d9b36c", 伊拉克: "#b5c46a", 委内瑞拉: "#e0a35f", 墨西哥: "#7fc27a",
  科威特: "#5fb7aa", 阿联酋: "#8e83d6", 加拿大: "#d27a92", 中国: "#ffc94d", 挪威: "#5aa1b8", 英国: "#a98bd6", 罗马尼亚: "#9aa5b1",
  印尼: "#c2a24f", 尼日利亚: "#4fae8a", 利比亚: "#c99ddc", 巴西: "#7f9bd6", 哈萨克斯坦: "#6cbfa0", 卡塔尔: "#a58a63", 阿尔及利亚: "#b88a6e",
  安哥拉: "#8fb36c", 特立尼达: "#7fb0c4", 阿根廷: "#9db8d9", 哥伦比亚: "#c7b55a", 埃及: "#c4a07a", 阿曼: "#83a5a0",
};
const resAt = (p: [number, number][], y: number) => {
  if (y < p[0][0] - 1) return 0;
  if (y <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (y <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (y - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
  return p[p.length - 1][1];
};
const TABLE = (y: number): TableRow[] => Object.entries(D.shares).map(([n, p]) => ({ n, v: resAt(p, y), c: RC[n] ?? "#9aa5b1" }));

export const PLACED = schedule2(EVS, MUSIC, BAR(4), BAR(83));
const tOf = (y: number) => PLACED.find((e) => Math.abs(e.y - y) < 1e-4)!.t0;
// the floor map: in to the Gulf when the war starts, the strait shut (tankers stop) until they sail again in June
export const MAPFX = { zIn: tOf(DY(2026, 3, 2)), zOut: tOf(DY(2026, 6, 24)) + 1.4, z: 5, lon: 54.5, lat: 26.5, close: tOf(DY(2026, 3, 4)), open: tOf(DY(2026, 6, 24)), closeY: DY(2026, 3, 4), openY: DY(2026, 6, 24) };
export const REVEALS = PLACED.map((e) => ({ k: e.k, big: !!e.big, y: e.y, ...revealOf(e, MUSIC.beats) }));

export const fwBursts = (t0: number, big: boolean) => (big ? [t0 + 0.16, t0 + 0.16 + BEAT * 0.5, t0 + 0.16 + BEAT] : [t0 + 0.16]);
export const FXCUES: { t: number; fx: string }[] = [
  ...MONTAGE.flatMap((m) => [{ t: m.at, fx: "icon" }, ...(m.fx === "pop" ? fwBursts(m.at + BEAT, false) : [m.at + BEAT]).map((t) => ({ t, fx: m.fx }))]),
  { t: COLD5.titleIn, fx: "title" },
  { t: SWEEP.t0, fx: "sweep" },
  ...PLACED.flatMap((e) => [
    ...(e.fx ?? []).flatMap((f) => (f === "fw" || f === "fwBig" ? fwBursts(e.t0, f === "fwBig").map((t) => ({ t, fx: "pop" })) : [{ t: e.t0, fx: f as string }])),
    ...(e.icon ? [{ t: e.t0, fx: e.icon === "lock" ? "lock" : e.icon === "stamp" || e.icon === "gavel" ? "stamp" : "icon" }] : []),
  ]),
];

// when each pull-back starts: once the card has been told, leaving it a beat and a bit before the next event
export const WIDE_AT = WIDE.map((w) => {
  const e = PLACED.reduce((b, x) => (Math.abs(x.y - w.y) < Math.abs(b.y - w.y) ? x : b), PLACED[0]);
  const R = revealOf(e, MUSIC.beats);
  return Math.min(Math.max(R.title, R.num ?? 0, R.sub ?? 0) + 0.6, e.t1 - 1.15);
});
FXCUES.push(...WIDE_AT.map((t) => ({ t, fx: "wide" })));

export const OIL: Spec = {
  id: "gold",
  brand: "油价一百六十年",
  series: SERIES,
  music: MUSIC,
  events: PLACED,
  cold: {
    keys: COLD5.keys.map(([t, y]) => ({ t, y, p: 1 })),
    // the drums under the montage: one on each slam
    crashes: MONTAGE.map((m) => ({ y: 0, t: m.year, p: m.big, at: m.at + BEAT, tone: m.tone })),
    lines: COLD_LINES,
    rewind: [A(12), A(16)],
    start: "1859 年",
  },
  dyn: [
    [1859, 1911.4, "洛克菲勒", 1],
    [1911.4, 1973.8, "得州 · 七大公司", 0],
    [1973.8, 1986, "OPEC", 1],
    [1986, 2014.9, "交易所 · 沙特", 2],
    [2014.9, 2026.85, "页岩油 · OPEC+", 1],
  ],
  body: [PLACED[0].t0, END_T],
  ending: {
    t0: END_T,
    lines: [
      { t0: END_T + 0.1, t1: BAR(85.5) - 0.05, text: "一百六十多年，1 桶油", text2: "跌到过负数，也冲到过 145 美元", tone: "white" },
      { t0: BAR(85.5), t1: BAR(88) - 0.05, text: "谁手里有多余的油", text2: "谁就能定油价", tone: "white" },
      { t0: BAR(88), t1: CRED_T - 0.05, text: "今天，它卡在一条海峡上", text2: "最窄处，只有 33 公里", tone: "gold" },
    ],
    troughs: [
      { y: 1861.5, t: "49 美分", tone: "red" },
      { y: 1864.5, t: "南北战争", tone: "gold" },
      { y: 1931.5, t: "大萧条", tone: "red" },
      { y: 1980.29, t: "1980", tone: "gold", dx: -20 },
      { y: 1998.95, t: "1998", tone: "red" },
      { y: DY(2008, 7, 3), t: "145", tone: "gold", dx: -26 },
      { y: DY(2020, 4, 20), t: "−37.63", tone: "red" },
      { y: DY(2026, 4, 7), t: "2026", tone: "gold", dx: -10, dy: -30 },
    ],
    card: CARD_T,
    credits: { t0: CRED_T, title: "信息来源", lines: CREDITS },
    slogan: "看见世界如何运行",
    maker: "MakerJackie",
  },
  era: (y) => (y < 1911.4 ? "第一幕 · 野蛮生长" : y < 1973.79 ? "第二幕 · 定价的人" : y < 1986.4 ? "第三幕 · OPEC" : y < 2014.9 ? "第四幕 · 交易所里的油价" : "第五幕 · 页岩、OPEC+ 和海峡"),
  kindLabel: { a: "美国原油 · 年均价", m: "WTI · 月均价", d: "WTI 期货 · 收盘价", p: "" },
  log: [0.3, 300],
  cny: D.cny,
  cnyFrom: 2000.6,
  table: TABLE,
  tableTitle: "各国产油 · 占全世界",
  tableRows: 6,
  tableBack: 10,
  tableFrom: 1900,
  tableNote: (y) => (y < 1992 ? "* 1992 年前为俄国、苏联" : y > 2024.5 ? "* 产量为 2024 年数据" : undefined),
  srcEnd: "数据：美国能源信息署、美联储圣路易斯分行、NYMEX、Energy Institute",
  src: (y) => {
    let s = ERA_SRC[0][1];
    for (const [a, t] of ERA_SRC) if (y >= a - 1e-6) s = t;
    return s;
  },
  rewindLabel: "倒回 1859 年……",
  musicSrc: "score_world8.wav",
  noRiser: true,
};
// cues6.mjs looks for GOLD
export const GOLD = OIL;
