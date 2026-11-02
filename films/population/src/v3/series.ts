// Two thousand years of Chinese population (万人). Every point has a kind and a source; research/SOURCES.md mirrors this list.
//   rec  = 正史/实录 户口登记 (registered)          est = 学者估算 (scholarly reconstruction)
//   stat = 国家统计局 年末人口                       un  = 联合国《世界人口展望 2024》中方案
import DATA from "../data.json";

export type Kind = "rec" | "est" | "stat" | "un";
export type Pt = { y: number; v: number; kind: Kind; src: string };

const R = (y: number, v: number, src: string): Pt => ({ y, v, kind: "rec", src });
const E = (y: number, v: number, src: string): Pt => ({ y, v, kind: "est", src });

const ANCIENT: Pt[] = [
  R(2, 5959.4, "《汉书·地理志》元始二年"),
  R(57, 2100.8, "《后汉书·郡国志》注引《帝王世纪》"),
  R(75, 3412.5, "《后汉书》注引"),
  R(88, 4335.6, "《后汉书》注引"),
  R(105, 5325.6, "《后汉书》注引"),
  R(125, 4869.1, "《后汉书》注引"),
  R(140, 4915.0, "《后汉书·郡国志》"),
  R(144, 4973.1, "《后汉书》注引"),
  R(145, 4952.4, "《后汉书》注引"),
  R(146, 4756.7, "《后汉书》注引"),
  R(157, 5648.7, "《晋书·地理志》《通典》"),
  R(280, 1616.4, "《晋书·地理志》太康元年"),
  R(609, 4602.0, "《隋书·地理志》大业五年"),
  R(639, 1235.2, "贞观十三年 (冻国栋)"),
  R(705, 3714.0, "神龙元年"),
  R(726, 4142.0, "开元十四年"),
  R(732, 4543.1, "开元二十年"),
  R(740, 4814.4, "开元二十八年"),
  R(742, 4891.0, "天宝元年"),
  R(755, 5291.9, "《通典》天宝十四载"),
  R(760, 1699.4, "乾元三年"),
  R(764, 1690.0, "《旧唐书》广德二年"),
  R(820, 1576.0, "元和十五年"),
  E(980, 3250.0, "《太平寰宇记》户数推算"),
  E(1110, 12500.0, "葛剑雄主编《中国人口史》"),
  R(1290, 5883.5, "《元史·地理志》至元二十七年"),
  R(1393, 6054.6, "《明史·食货志》洪武二十六年"),
  E(1630, 19250.0, "曹树基《中国人口史》第四卷"),
  E(1644, 15250.0, "曹树基《中国人口史》第四卷"),
  E(1682, 13000.0, "葛剑雄"),
  R(1741, 14341.2, "《清高宗实录》乾隆六年"),
  R(1751, 18181.0, "清实录"),
  R(1764, 20550.0, "清实录"),
  R(1790, 30148.7, "清实录"),
  R(1805, 33218.1, "清实录"),
  R(1812, 36169.5, "清实录"),
  R(1820, 38310.0, "清实录"),
  R(1834, 40100.9, "《清宣宗实录》道光十四年"),
  R(1844, 41281.5, "《清宣宗实录》"),
  R(1851, 43216.4, "户部清册 咸丰元年"),
  E(1880, 36450.0, "曹树基《中国人口史》第五卷"),
  E(1912, 41164.0, "1912 年人口调查 (陈长衡修订)"),
];
// Ming registers: flat for two centuries while the real population grew (drawn as a thin side line)
export const MING_REG: [number, number][] = [
  [1381, 5987.3], [1393, 6054.6], [1403, 6659.8], [1479, 7185.0], [1491, 5328.1], [1504, 6010.6], [1578, 6069.3], [1602, 5630.5], [1620, 5165.5],
];

const MODERN: Pt[] = (DATA as any).china.map((r: any) => ({ y: r.y, v: r.pop, kind: "stat" as Kind, src: "国家统计局" }));
const UN: Pt[] = Object.entries((DATA as any).chinaUN as Record<string, number>)
  .map(([y, v]) => ({ y: Number(y), v: v * 10000, kind: "un" as Kind, src: "联合国 WPP 2024" }))
  .filter((p) => p.y > 2025);

export const SERIES: Pt[] = [...ANCIENT, ...MODERN, ...UN];
export const FIRST = SERIES[0].y;
export const LAST = SERIES[SERIES.length - 1].y;
export const GAP_YEARS = 25; // longer than this between points = no national count in between

// segment index for year y
const segOf = (y: number) => {
  let lo = 0;
  let hi = SERIES.length - 1;
  if (y <= SERIES[0].y) return 0;
  if (y >= SERIES[hi].y) return hi - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (SERIES[m].y <= y) lo = m;
    else hi = m;
  }
  return lo;
};
export const isGap = (i: number) => SERIES[i + 1].y - SERIES[i].y > GAP_YEARS;
// how fast the giant slip lands at the end of a gap (years)
const landYears = (a: Pt, b: Pt) => Math.min(6, 0.035 * (b.y - a.y));

// the value the film shows for year y (gaps hold the last count, then land on the next one)
export const val = (y: number) => {
  const i = segOf(y);
  const a = SERIES[i];
  const b = SERIES[i + 1];
  if (y <= a.y) return a.v;
  if (y >= b.y) return b.v;
  if (isGap(i)) {
    const L = landYears(a, b);
    if (y < b.y - L) return a.v;
    const k = (y - (b.y - L)) / L;
    return a.v + (b.v - a.v) * k * k * (3 - 2 * k);
  }
  return a.v + ((b.v - a.v) * (y - a.y)) / (b.y - a.y);
};
export const pointAt = (y: number) => SERIES[segOf(y)];
export const gapAt = (y: number) => {
  const i = segOf(y);
  return isGap(i) && y > SERIES[i].y && y < SERIES[i + 1].y ? { a: SERIES[i], b: SERIES[i + 1] } : null;
};
export const kindAt = (y: number): Kind => {
  const i = segOf(y);
  return y >= SERIES[i + 1].y ? SERIES[i + 1].kind : SERIES[i].kind === "un" || SERIES[i + 1].kind === "un" ? "un" : SERIES[i + 1].kind;
};

// dynasties (for the card, the header and the seals)
export type Dyn = { n: string; seal: string; a: number; b: number; cap: string };
export const DYNS: Dyn[] = [
  { n: "西汉", seal: "汉", a: -202, b: 8, cap: "都长安" },
  { n: "新", seal: "新", a: 9, b: 23, cap: "都长安" },
  { n: "东汉", seal: "汉", a: 25, b: 220, cap: "都洛阳" },
  { n: "三国", seal: "三国", a: 220, b: 280, cap: "魏 · 蜀 · 吴" },
  { n: "晋", seal: "晋", a: 280, b: 420, cap: "西晋都洛阳 · 东晋都建康" },
  { n: "南北朝", seal: "南北", a: 420, b: 589, cap: "南北对峙" },
  { n: "隋", seal: "隋", a: 589, b: 618, cap: "都大兴" },
  { n: "唐", seal: "唐", a: 618, b: 907, cap: "都长安" },
  { n: "五代十国", seal: "五代", a: 907, b: 960, cap: "群雄割据" },
  { n: "北宋", seal: "宋", a: 960, b: 1127, cap: "都开封" },
  { n: "南宋 · 金", seal: "宋金", a: 1127, b: 1279, cap: "南北分治" },
  { n: "元", seal: "元", a: 1279, b: 1368, cap: "都大都" },
  { n: "明", seal: "明", a: 1368, b: 1644, cap: "都南京 → 北京" },
  { n: "清", seal: "清", a: 1644, b: 1912, cap: "都北京" },
  { n: "中华民国", seal: "民国", a: 1912, b: 1949, cap: "" },
  { n: "中华人民共和国", seal: "新中国", a: 1949, b: 2101, cap: "" },
];
export const dynAt = (y: number) => {
  for (let i = DYNS.length - 1; i >= 0; i--) if (y >= DYNS[i].a) return DYNS[i];
  return DYNS[0];
};
const REIGNS: [string, number, number][] = [
  ["平帝", 1, 5], ["王莽", 6, 23], ["光武帝", 25, 57], ["明帝", 58, 75], ["章帝", 76, 88], ["和帝", 89, 105], ["安帝", 107, 125], ["顺帝", 126, 144], ["桓帝", 147, 167], ["灵帝", 168, 189],
  ["炀帝", 605, 618], ["太宗", 627, 649], ["高宗", 650, 683], ["武则天", 690, 705], ["玄宗", 712, 756], ["肃宗", 756, 762], ["宪宗", 806, 820],
  ["太祖", 960, 976], ["徽宗", 1101, 1125],
  ["洪武", 1368, 1398], ["永乐", 1403, 1424], ["万历", 1573, 1620], ["崇祯", 1628, 1644],
  ["顺治", 1644, 1661], ["康熙", 1662, 1722], ["雍正", 1723, 1735], ["乾隆", 1736, 1795], ["嘉庆", 1796, 1820], ["道光", 1821, 1850], ["咸丰", 1851, 1861], ["同治", 1862, 1874], ["光绪", 1875, 1908], ["宣统", 1909, 1911],
];
export const reignAt = (y: number) => REIGNS.find(([, a, b]) => y >= a && y < b + 1)?.[0] ?? "";
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
export const ganzhi = (y: number) => {
  const n = Math.floor(y) - 4;
  return STEMS[((n % 10) + 10) % 10] + BRANCHES[((n % 12) + 12) % 12];
};
export const fmtPop = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(2)} 亿` : `${Math.round(v).toLocaleString("en-US")} 万`);
