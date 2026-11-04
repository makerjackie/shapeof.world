// 两千年世界人口 (Film7 world cut, on the China v10 engine): plagues, wars and famines cut the world down again and again,
// so for 1,800 years it barely grew; then it exploded; the next fall will come from births.
// Times are SOURCE seconds of public/ref_full.wav; the scheduler puts each event on a beat (time6.ts).
// Sources: research/SOURCES6.md.
import WD from "./world_data.json";
import type { Pt, Spec } from "./spec6";
import { Ev, Key, makeMusic, schedule } from "./time6";
import { revealOf } from "./reveal7";

const D = WD as unknown as { world: [number, number][]; un: [number, number][]; regions: Record<string, [number, number][]> };
export const SERIES: Pt[] = [
  ...D.world.map(([y, v]) => ({ y, v, kind: (y < 1950 ? "est" : "stat") as Pt["kind"] })),
  ...D.un.filter(([y]) => y > 2023).map(([y, v]) => ({ y, v, kind: "un" as const })),
];

// ---------------- music: the China cut, minus 8 beats in the cold open (source 7.77-11.49) so the rewind sits on the
// music's own rewind gesture (rising chirps 5.9-6.45, tape-stop to 7.6) and the build lands straight into the body
export const MUSIC = makeMusic(
  [
    [0, 7.7664],
    [11.4896, 135.286],
    [139.7515, 170.8915],
    [195.11, 201.3],
  ],
  1.0,
);
const F = MUSIC.F;
const A = (n: number) => +(0.32 + n * 0.4654).toFixed(4);
const H = 0.2327; // half a beat

// ---------------- cold open: the whole line in four seconds, eight catastrophes on eight beats, one line, then the rewind
const COLD_CRASHES = [
  { y: 165, t: "安东尼瘟疫", p: "死亡 500—1,000 万" },
  { y: 541, t: "查士丁尼瘟疫", p: "死亡上千万" },
  { y: 1219, t: "蒙古征服", p: "死亡 2,000—6,000 万" },
  { y: 1347, t: "黑死病", p: "欧洲死亡 30%—60%" },
  { y: 1520, t: "美洲天花", p: "美洲人口 −83%" },
  { y: 1618, t: "三十年战争", p: "死亡 450—800 万" },
  { y: 1851, t: "太平天国", p: "死亡 2,000—7,000 万" },
  { y: 1939, t: "两次世界大战", p: "死亡约 1 亿" },
].map((c, i) => ({ ...c, at: A(i) }));
const COLD_KEYS: Key[] = [
  { t: 0, y: 0, p: 1 },
  ...COLD_CRASHES.map((c) => ({ t: c.at, y: c.y, p: 1.4 })),
  { t: A(8), y: 2025, p: 1.4 },
  { t: A(12), y: 2025, p: 1 },
  { t: A(16), y: 0, p: 1.7 },
];

// ---------------- the body
const ROME: [number, number] = [12.5, 41.9];
const EVS: Ev[] = [
  // 罗马与汉
  { y: 1, b: 4, k: "stat", tag: "公元 1 年", t: "全世界", n: "2.3 亿", s: "比今天的印度尼西亚还少", map: "w1", anchor: 12.42, span: 140, src: "印尼：联合国《世界人口展望 2024》约 2.8 亿" },
  { y: 2, b: 3, k: "unite", tag: "公元 1 世纪", t: "罗马与汉", s: "两大帝国，占了世界人口近一半" },
  { y: 165, b: 4, k: "plague", tag: "165—180 年 · 罗马", t: "安东尼瘟疫", n: "500 万—1,000 万", s: "约十分之一的人死去", at: ROME, anchor: 19.87, map: "w200" },
  { y: 250, b: 3, k: "plague", tag: "249—262 年 · 罗马", t: "西普里安瘟疫", s: "罗马城高峰时一天死 5,000 人", at: ROME },
  { y: 263, b: 4, k: "war", tag: "东汉末到三国 · 中国", t: "在册人口只剩", n: "767 万", s: "比东汉顶峰少了 86%", at: [110, 32] },
  { y: 300, b: 8, k: "crash", tag: "公元 300 年", t: "世界人口", n: "2.28 亿", s: "两千年里，第一次减少", pct: "−5%", big: true, go: "slam", map: "w300", anchor: 29.18 },
  // 中世纪
  { y: 311, b: 3, k: "move", tag: "311 年起 · 中国", t: "永嘉之乱，北方人口大批南迁", s: "“衣冠南渡”", at: [112.45, 34.62], to: [118.8, 32.0] },
  { y: 376, b: 3, k: "move", tag: "376 年起", t: "匈人西进，民族大迁徙", at: [52, 47], to: [16, 47], map: "w400" },
  { y: 476, b: 5, k: "split", tag: "476 年", t: "西罗马帝国灭亡", s: "欧洲四分五裂", map: "w500", big: true },
  { y: 500, b: 4, k: "note", tag: "5—6 世纪 · 罗马城", t: "从约 100 万人", n: "跌到几万人" },
  { y: 541, b: 5, k: "plague", tag: "541 年起", t: "查士丁尼瘟疫", s: "君士坦丁堡高峰时一天死上万人", at: [28.97, 41.01], big: true, anchor: 45.93 },
  { y: 639, b: 3, k: "war", tag: "639 年 · 唐初", t: "隋末战乱后，中国在册", n: "1,235 万", s: "隋大业五年还有 4,602 万", at: [109, 34], map: "w700" },
  { y: 755, b: 3, k: "war", tag: "755—763 年 · 唐", t: "安史之乱", s: "在册人口 5 年少了 68%", at: [116.4, 39.9], map: "w800" },
  { y: 800, b: 3, k: "stat", tag: "800 年", t: "世界", n: "2.86 亿", s: "比公元 1 年只多了 5,000 多万" },
  { y: 1000, b: 3, k: "grow", tag: "1000 年", t: "中世纪温暖期", n: "3.23 亿", s: "世界人口" },
  { y: 1100, b: 4, k: "grow", tag: "1000—1300 年 · 欧洲", t: "人口翻了一倍多", n: "3,634 万 → 8,329 万", s: "重犁、三圃制，粮食增产", src: "HYDE 3.3 估算（Our World in Data）", map: "w1100" },
  { y: 1110, b: 4, k: "peak", tag: "1110 年 · 北宋", t: "世界人口最多的国家", n: "约 1.25 亿", s: "引进占城稻，粮食增产", src: "人口：葛剑雄主编《中国人口史》；占城稻：《宋史·食货志》" },
  { y: 1219, b: 4, k: "war", tag: "1219—1221 年", t: "蒙古西征", s: "撒马尔罕、内沙布尔、梅尔夫……", at: [60, 39], big: true, go: "slam", anchor: 66.41, map: "w1200" },
  { y: 1235, b: 3, k: "war", tag: "1235 年 · 中国北方", t: "蒙古籍户只剩", n: "475 万", s: "金朝在册 4,582 万", at: [114, 37], kill: [105, 32, 126, 45, 0.85] },
  { y: 1300, b: 4, k: "note", tag: "13 世纪", t: "蒙古征服", n: "2,000 万—6,000 万", s: "死亡人数（各家估计）", map: "w1279" },
  { y: 1346, b: 4, k: "plague", tag: "1346 年", t: "黑死病来到黑海", s: "克里米亚 · 卡法", at: [35.4, 45.0], focus: [22, 46, 3] },
  { y: 1347, b: 4, k: "plague", tag: "1347—1351 年", t: "黑死病横扫欧洲", at: [14, 46], big: true, go: "slam", anchor: 77.58, focus: [12, 48, 3.2] },
  { y: 1350, b: 6, k: "crash", tag: "1300 → 1400 年 · 欧洲", t: "黑死病杀死欧洲 30%—60% 的人", n: "8,329 万 → 6,072 万", s: "HYDE 估算的欧洲人口", big: true, go: "slam", kill: [-12, 35, 45, 62, 0.4], src: "死亡比例：维基百科「黑死病」" },
  { y: 1370, b: 3, k: "war", tag: "1370—1405 年", t: "帖木儿", n: "700 万—1,700 万", s: "死亡人数（估计）", at: [66.9, 39.6], map: "w1400" },
  { y: 1400, b: 5, k: "crash", tag: "1400 年", t: "世界人口", n: "4.42 亿", s: "两千年里，第二次减少", pct: "−3%", big: true, go: "slam", anchor: 86.88 },
  // 大航海
  { y: 1492, b: 3, k: "move", tag: "1492 年", t: "哥伦布到达美洲", at: [-8, 38], to: [-72, 20], map: "w1500" },
  { y: 1500, b: 3, k: "stat", tag: "1500 年 · 美洲", t: "原住民约", n: "6,000 万", s: "HYDE 估算" },
  { y: 1520, b: 4, k: "plague", tag: "1520 年起", t: "天花", s: "美洲人从没接触过的病", at: [-99.1, 19.4] },
  { y: 1600, b: 6, k: "crash", tag: "1600 年 · 美洲", t: "一百年，少了 83%", n: "约 1,000 万", s: "HYDE 估算；也有研究认为少了九成", big: true, go: "slam", anchor: 94.33, map: "w1600", kill: [-170, -56, -30, 72, 0.83], src: "Koch 等，《第四纪科学评论》2019" },
  { y: 1618, b: 4, k: "war", tag: "1618—1648 年", t: "三十年战争", n: "450 万—800 万", s: "死亡人数（估计）", at: [11, 51], anchor: 98.05 },
  { y: 1644, b: 3, k: "war", tag: "1644 年 · 中国", t: "明清易代", n: "约 2,500 万", s: "死亡人数（估计）", at: [116, 38], anchor: 99.92 },
  { y: 1750, b: 3, k: "policy", tag: "18 世纪", t: "玉米、土豆、番薯传遍世界", s: "养活了更多的人", map: "w1700" },
  { y: 1770, b: 3, k: "policy", tag: "18 世纪后期", t: "工业革命", at: [-2, 53] },
  { y: 1796, b: 3, k: "grow", tag: "1796 年 · 英国", t: "琴纳发明牛痘接种", s: "天花第一次可以预防", at: [-2.3, 51.7], src: "世界卫生组织：天花" },
  { y: 1804, b: 3, k: "peak", tag: "约 1804 年", t: "世界人口第一次", n: "10 亿", s: "用了 1,800 年", anchor: 105.5, map: "w1800" },
  { y: 1851, b: 3, k: "war", tag: "1851—1864 年 · 中国", t: "太平天国战争", n: "2,000 万—7,000 万", s: "死亡人数（估计）", at: [117, 31], big: true, map: "w1880" },
  { y: 1854, b: 3, k: "grow", tag: "1854 年 · 伦敦", t: "霍乱地图：病从脏水来", s: "城市开始修下水道、供净水", at: [-0.14, 51.51], src: "约翰·斯诺 1854 年宽街霍乱调查" },
  { y: 1877, b: 3, k: "famine", tag: "1876—1879 年", t: "中国、印度大旱", s: "饿死上千万人", at: [100, 28] },
  // 20 世纪
  { y: 1900, b: 4, k: "stat", tag: "1900 年", t: "世界", n: "16.3 亿", anchor: 111.08, map: "none", span: 60 },
  { y: 1914, b: 6, k: "war", tag: "1914—1918 年", t: "第一次世界大战", n: "1,500 万—2,200 万", s: "死亡人数", at: [5, 50], anchor: 112.95, focus: [10, 48, 3] },
  { y: 1918, b: 4, k: "plague", tag: "1918—1920 年", t: "西班牙流感", n: "约 5,000 万", s: "死亡人数（估计）", at: [-30, 30], src: "死亡：美国疾控中心估计；这几年的世界人口是插值估算，曲线看不出短期起伏" },
  { y: 1927, b: 2, k: "stat", tag: "1927 年", t: "世界", n: "20 亿", s: "第二个 10 亿，只用了 123 年" },
  { y: 1939, b: 4, k: "war", tag: "1939—1945 年", t: "第二次世界大战", n: "7,000 万—8,500 万", s: "死亡人数（估计）", at: [15, 51], anchor: 120.39, focus: [40, 42, 1.6] },
  { y: 1942, b: 3, k: "war", tag: "1941—1945 年", t: "纳粹大屠杀", n: "约 600 万", s: "犹太人遇难", at: [19.2, 50.0], src: "美国大屠杀纪念馆" },
  { y: 1945, b: 4, k: "war", tag: "1945 年 8 月", t: "广岛、长崎", n: "约 21 万", s: "到 1945 年底的死亡人数", at: [132.5, 34.4], anchor: 127.84 },
  { y: 1945.6, b: 4, k: "note", tag: "1939—1945 年", t: "可这 6 年，世界人口还多了", n: "1.1 亿", s: "每年出生的人，比死去的多", anchor: 131.56, table: true, src: "Gapminder 估算（Our World in Data）：22.7 亿 → 23.9 亿" },
  { y: 1946, b: 4, k: "grow", tag: "1940 年代起", t: "抗生素、疫苗普及", s: "死亡率骤降" },
  // 爆炸
  { y: 1950, b: 4, k: "stat", tag: "1950 年", t: "世界", n: "25 亿", anchor: 139.7515, span: 30 },
  { y: 1955, b: 3, k: "grow", tag: "1950 → 2023 年", t: "人均寿命", n: "46 岁 → 73 岁", src: "Our World in Data（联合国《世界人口展望 2024》）" },
  { y: 1960, b: 2, k: "stat", tag: "1960 年", t: "", n: "30 亿" },
  { y: 1963, b: 3, k: "peak", tag: "1963 年", t: "增长最快：一年多了", n: "7,000 万人", s: "增速 2.2%" },
  { y: 1968, b: 3, k: "note", tag: "1968 年", t: "《人口炸弹》", s: "预言 70 年代数亿人会饿死" },
  { y: 1970, b: 3, k: "policy", tag: "1960—1970 年代", t: "绿色革命", s: "合成化肥、良种，粮食大增产" },
  { y: 1974, b: 1, k: "stat", tag: "1974 年", t: "", n: "40 亿" },
  { y: 1987, b: 1, k: "stat", tag: "1987 年", t: "", n: "50 亿" },
  { y: 1990, b: 3, k: "grow", tag: "1950 → 2023 年", t: "活不到 5 岁的孩子", n: "23% → 3.6%", src: "Our World in Data（联合国儿童死亡率估算组）" },
  { y: 1999, b: 1, k: "stat", tag: "1999 年", t: "", n: "60 亿" },
  { y: 2011, b: 1, k: "stat", tag: "2011 年", t: "", n: "70 亿" },
  { y: 2020, b: 3, k: "plague", tag: "2020—2021 年", t: "新冠疫情", n: "约 1,490 万", s: "超额死亡（世界卫生组织）" },
  { y: 2022, b: 4, k: "peak", tag: "2022 年 11 月 15 日", t: "世界人口", n: "80 亿", s: "最近 10 亿，只用了 11 年", anchor: 153.59, span: 25 },
  { y: 2023, b: 2, k: "note", tag: "2023 年", t: "印度超过中国", s: "成为人口第一大国", anchor: 155.32 },
  { y: 2024, b: 2, k: "note", tag: "2024 年", t: "全球生育率", n: "2.25", s: "1960 年代超过 5" },
  { y: 2084, b: 4, k: "peak", tag: "联合国预测 · 2084 年", t: "峰值", n: "约 103 亿", anchor: 157.05, span: 120 },
  { y: 2100, b: 4, k: "note", tag: "联合国预测 · 2100 年", t: "开始减少", n: "约 102 亿", anchor: 158.78 },
];

const SRC_PTS: [number, string][] = [
  [-99, "HYDE 3.3 历史估算（Our World in Data），每百年一个数"],
  [1700, "HYDE 3.3 历史估算（Our World in Data），每十年一个数"],
  [1800, "Gapminder 估算（Our World in Data）"],
  [1950, "联合国《世界人口展望 2024》"],
  [2025.5, "联合国《世界人口展望 2024》中方案 · 预测"],
];
const placed = schedule(EVS, MUSIC, 12.42, 160.51);
export const REVEALS = placed.map((e) => ({ k: e.k, big: !!e.big, ...revealOf(e, MUSIC.beats) }));
const END_T = F(160.51);
const REG = D.regions;
const regAt = (rows: [number, number][], y: number) => {
  if (y <= rows[0][0]) return rows[0][1];
  for (let i = 1; i < rows.length; i++)
    if (y <= rows[i][0]) {
      const [y0, v0] = rows[i - 1];
      const [y1, v1] = rows[i];
      return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
    }
  return rows[rows.length - 1][1];
};

export const WORLD: Spec = {
  id: "world",
  brand: "两千年世界人口",
  series: SERIES,
  music: MUSIC,
  events: placed,
  cold: {
    keys: COLD_KEYS,
    crashes: COLD_CRASHES,
    lines: [
      { t0: A(9), t1: A(12) - 0.05, a: "瘟疫、战争、饥荒", b: "下一次人口减少，会因为什么？", bBeats: 1, tone: "red" },
    ],
    rewind: [A(12), A(16)],
    promise: "一条曲线，看尽人类兴衰",
    start: "公元 1 年",
    cam: { lon: 45, lat: 32, z: 1.15 },
    soloLabels: true,
    // the empire of each catastrophe on its beat; the rewind runs them backwards
    maps: [
      [0, "w1"],
      [A(0), "w200", true],
      [A(1), "w500", true],
      [A(2), "w1200", true],
      [A(2) + H, "w1279"],
      [A(3), "w1400", true],
      [A(4), "w1500", true],
      [A(4) + H, "w1600"],
      [A(5), "w1700", true],
      [A(6), "w1880", true],
      [A(7), "none", true],
    ],
    mapYears: [
      [-300, "w1"], [150, "w200"], [250, "w300"], [350, "w400"], [450, "w500"], [600, "w700"], [750, "w800"], [1000, "w1100"],
      [1150, "w1200"], [1250, "w1279"], [1350, "w1400"], [1450, "w1500"], [1550, "w1600"], [1650, "w1700"], [1750, "w1800"], [1850, "w1880"], [1900, "none"],
    ],
  },
  dyn: [
    [0, 476, "古代", 1],
    [476, 1492, "中世纪", 1],
    [1492, 1900, "近代", 1],
    [1900, 2025, "", 2],
  ],
  body: [placed[0].t0, END_T],
  ending: {
    t0: END_T,
    lines: [
      { t0: END_T + 0.1, t1: F(163.97) - 0.05, text: "两千年，世界人口只少过 2 次", text2: "都因为瘟疫和战争", tone: "white" },
      { t0: F(163.97), t1: F(167.43) - 0.05, text: "预测：2084 年后，第 3 次", text2: "这一次，没有灾难", tone: "white" },
      { t0: F(167.43), t1: F(170.8915) - 0.05, text: "全球生育率，从 5 个孩子", text2: "降到 2.25 个", tone: "white" },
      { t0: F(196.84), t1: MUSIC.dur, text: "下一次，由我们自己决定", brush: true, tone: "gold" },
    ],
    troughs: [
      { y: 300, t: "罗马危机 · 三国" },
      { y: 1400, t: "黑死病" },
    ],
    card: F(198.57),
  },
  era: (y) => (y < 476 ? "罗马与汉" : y < 1492 ? "中世纪" : y < 1800 ? "大航海时代" : y < 1945 ? "工业时代" : "现代"),
  kindLabel: { rec: "史料", est: "历史估算（HYDE）", stat: "联合国统计", un: "联合国预测" },
  noGapChip: true,
  noRiser: true, // the music carries the rewind itself
  // the population table only on the counts (stat, crash, peak, or table: true); the event cards stand alone
  tableOn: (e) => e.k === "stat" || e.k === "crash" || e.k === "peak" || !!e.table,
  // respect for the dead: from the Second World War to its end the music sinks low (source seconds)
  hush: [[120.1, 135.286]],
  srcEnd: "数据：HYDE 3.3、Gapminder（Our World in Data）、联合国《世界人口展望 2024》",
  src: (y) => {
    let s = SRC_PTS[0][1];
    for (const [a, t] of SRC_PTS) if (y >= a - 1e-6) s = t;
    return s;
  },
  mapOff: 1950,
  map: { lon: 60, lat: 30, zoom: 1 },
  table: (y) =>
    Object.entries(REG).map(([n, rows], i) => ({ n, v: regAt(rows, Math.min(y, 2023)), c: ["#ffc94d", "#5fb7aa", "#e39a4f", "#c9605e", "#8e83d6"][i] })),
};
