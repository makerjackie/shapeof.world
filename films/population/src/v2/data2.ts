// Test-clip data (万人). Sources in research/SOURCES2.md.
// HAN: registered population (户口登记), 《汉书·地理志》《后汉书·郡国志》注 etc.
// QING: registered 民数 (清实录 / 户部清册), peak 1851 = 43,216 万; 1880 = 36,450 万 (曹树基《中国人口史》第五卷; Gapminder 366M agrees).
export type P = [number, number];
export const HAN: P[] = [
  [2, 5959.4], [57, 2100.8], [75, 3412.5], [88, 4335.6], [105, 5325.6], [125, 4869.1],
  [140, 4915.0], [144, 4973.1], [145, 4952.4], [146, 4756.7], [157, 5648.7],
];
export const QING: P[] = [
  [1741, 14341], [1751, 18181], [1764, 20550], [1790, 30149], [1805, 33218], [1812, 36170],
  [1820, 38310], [1834, 40101], [1844, 41281], [1851, 43216], [1880, 36450],
];
const lerpS = (s: P[], y: number) => {
  if (y <= s[0][0]) return s[0][1];
  for (let i = 0; i < s.length - 1; i++) {
    const [a, va] = s[i];
    const [b, vb] = s[i + 1];
    if (y <= b) return va + ((vb - va) * (y - a)) / (b - a);
  }
  return s[s.length - 1][1];
};
export const val = (y: number) => (y < 1000 ? lerpS(HAN, y) : lerpS(QING, y));

// World panel: OWID long-run population (HYDE 3.3 before 1800, Gapminder after), today's borders, 万人.
const WORLD: Record<string, P[]> = {
  印度: [[0, 7500], [100, 7900], [200, 8200], [1770, 19100], [1780, 19400], [1800, 20100], [1851, 23700], [1860, 24300], [1870, 25100], [1880, 25600]],
  墨西哥: [[0, 800], [100, 800], [200, 800]],
  意大利: [[0, 700], [100, 700], [200, 700]],
  巴西: [[0, 600], [100, 700], [200, 700]],
  俄罗斯: [[1770, 2700], [1780, 2900], [1800, 3100], [1851, 4200], [1860, 4500], [1870, 4900], [1880, 5400]],
  日本: [[1770, 2900], [1780, 2800], [1800, 2800], [1851, 3200], [1860, 3300]],
  法国: [[1770, 2600], [1780, 2700], [1800, 2900], [1851, 3600], [1860, 3700], [1870, 3800], [1880, 3900]],
  德国: [[1770, 2000], [1780, 2100], [1851, 3400], [1860, 3600], [1870, 4000], [1880, 4400]],
  美国: [[1870, 4000], [1880, 5000]],
};
const inRange = (s: P[], y: number) => {
  const era = (x: number) => (x < 1000 ? 0 : 1);
  const pts = s.filter((p) => era(p[0]) === era(y));
  if (!pts.length || y < pts[0][0] || y > pts[pts.length - 1][0] + 1) return undefined;
  return lerpS(pts, y);
};
export const top5 = (y: number) => {
  const rows: [string, number][] = [["中国", val(y)]];
  for (const [n, s] of Object.entries(WORLD)) {
    const v = inRange(s, y);
    if (v !== undefined) rows.push([n, v]);
  }
  return rows.sort((a, b) => b[1] - a[1]).slice(0, 5);
};
export const fmtPop = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(2)} 亿` : `${Math.round(v).toLocaleString("en-US")} 万`);
export const yearLabel = (y: number) => (y < 1000 ? `公元 ${Math.max(1, Math.floor(y))} 年` : `${Math.floor(y)} 年`);
