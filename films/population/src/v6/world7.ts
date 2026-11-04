// 两千年世界人口 (Film7 world cut, on the China v10 engine): plagues, wars and famines cut the world down again and again,
// so for 1,800 years it barely grew; then it exploded; the next fall will come from births.
// Music (v8): public/score_world8.wav, a Lyria 3.5 track re-edited to this timeline (tools/score_world8.py); BARRETE! is gone
// (copyright claim). Times are film seconds = score seconds; strict 130 BPM, beat k at 0.05 + k * 60/130, bars from beat 0.
// Sources: research/SOURCES6.md.
import WD from "./world_data.json";
import WC from "./world_countries_raw.json"; // research/countries.py
import type { Pt, Spec } from "./spec6";
import { Ev, Key, makeMusic, schedule } from "./time6";
import { revealOf } from "./reveal7";

const D = WD as unknown as { world: [number, number][]; un: [number, number][]; regions: Record<string, [number, number][]> };
export const SERIES: Pt[] = [
  ...D.world.map(([y, v]) => ({ y, v, kind: (y < 1950 ? "est" : "stat") as Pt["kind"] })),
  ...D.un.filter(([y]) => y > 2023).map(([y, v]) => ({ y, v, kind: "un" as const })),
];

// ---------------- music: score bars (1.846 s): 0-2 cold open, 3 rewind (synthesised), 4 the drop (body), 58-70 the quiet war
// section, 72 the big return (1950), 83 the outro, 89 the last hit (the brush line)
const BEAT = 60 / 130;
export const MUSIC = makeMusic([[0, 170.78]], 0.2, [{ t0: 0, t1: 170.78, P: BEAT, ph: 0.05, bar: 0 }]);
const A = (n: number) => +(0.05 + n * BEAT).toFixed(4); // beat n
const BAR = (k: number) => A(4 * k); // bar k
const H = BEAT / 2; // half a beat

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
  // 第一幕 · 帝国与瘟疫
  { y: 1, b: 4, k: "stat", tag: "公元 1 年", t: "全世界", n: "2.3 亿", s: "比今天的印度尼西亚还少", map: "w1", anchor: BAR(4), span: 140, src: "印尼：联合国《世界人口展望 2024》约 2.8 亿" },
  { y: 2, b: 3, k: "unite", tag: "公元 1 世纪", t: "罗马与汉", s: "两大帝国，占了世界人口近一半" },
  { y: 57, b: 4, k: "war", tag: "公元 57 年 · 中国", t: "王莽之乱后，东汉在册", n: "2,101 万", s: "比西汉少了 65%", at: [112.4, 34.6], src: "《后汉书》注引《帝王世纪》" },
  { y: 165, b: 4, k: "plague", tag: "165—180 年 · 罗马", t: "安东尼瘟疫", n: "500 万—1,000 万", s: "死亡人数（估计），约十分之一的人", at: ROME, anchor: BAR(8), map: "w200" },
  { y: 166, b: 3, k: "move", tag: "166 年", t: "罗马使者第一次到达汉朝", s: "“大秦王安敦遣使”，安敦就是安东尼", at: [12.5, 41.9], to: [112.4, 34.6], src: "《后汉书·西域传》" },
  { y: 171, b: 3, k: "plague", tag: "171—185 年 · 东汉", t: "同一时期，东汉大疫 5 次", s: "接着，黄巾起义", at: [113, 34], src: "《后汉书·灵帝纪》" },
  { y: 184, b: 3, k: "war", tag: "184—280 年 · 中国", t: "黄巾起义，三国混战", s: "“白骨露于野，千里无鸡鸣”", at: [115.2, 36.5], src: "曹操《蒿里行》" },
  { y: 263, b: 4, k: "war", tag: "三国 · 中国", t: "在册人口只剩", n: "767 万", s: "比东汉顶峰少了 86%", at: [110, 32] },
  { y: 300, b: 8, k: "crash", tag: "公元 300 年", t: "世界人口", n: "2.28 亿", s: "两千年里，第一次减少", pct: "−5%", big: true, go: "slam", map: "w300", anchor: BAR(12) },
  { y: 311, b: 3, k: "move", tag: "311 年起 · 中国", t: "永嘉之乱，北方人口大批南迁", s: "“衣冠南渡”", at: [112.45, 34.62], to: [118.8, 32.0] },
  { y: 376, b: 3, k: "move", tag: "376 年起", t: "匈人西进，民族大迁徙", at: [52, 47], to: [16, 47] },
  { y: 410, b: 3, k: "war", tag: "410 年", t: "西哥特人洗劫罗马", at: ROME, map: "w400" },
  { y: 476, b: 5, k: "split", tag: "476 年", t: "西罗马帝国灭亡", s: "欧洲四分五裂", map: "w500", big: true },
  { y: 500, b: 4, k: "note", tag: "5—6 世纪 · 罗马城", t: "从约 100 万人", n: "跌到几万人" },
  // 第二幕 · 草原与黑死病
  { y: 541, b: 5, k: "plague", tag: "541—549 年", t: "查士丁尼瘟疫", n: "1,500 万—1 亿", s: "死亡人数（各家估计），君士坦丁堡一天死上万人", at: [28.97, 41.01], big: true, anchor: BAR(22), src: "维基百科「流行病列表」；日死万人：普罗科匹厄斯《战争史》" },
  { y: 600, b: 3, k: "stat", tag: "500—600 年 · 意大利", t: "人口少了一半", n: "398 万 → 200 万", s: "HYDE 估算", kill: [6, 36, 19, 47, 0.5] },
  { y: 609, b: 2, k: "stat", tag: "609 年 · 隋", t: "中国在册", n: "4,602 万" },
  { y: 639, b: 3, k: "war", tag: "639 年 · 唐初", t: "隋末战乱后，在册", n: "1,235 万", at: [109, 34] },
  { y: 660, b: 3, k: "unite", tag: "632—750 年", t: "阿拉伯帝国扩张", map: "w700", at: [40, 25] },
  { y: 755, b: 4, k: "war", tag: "755—763 年 · 唐", t: "安史之乱", n: "约 1,300 万", s: "死亡人数（估计）；在册人口少了 68%", at: [116.4, 39.9], map: "w800", src: "维基百科「战争死亡人数列表」；在册：《通典》" },
  { y: 800, b: 2, k: "stat", tag: "800 年", t: "世界", n: "2.86 亿", s: "比公元 1 年只多了 5,000 多万" },
  { y: 1000, b: 3, k: "grow", tag: "1000 年", t: "中世纪温暖期", n: "3.23 亿", s: "世界人口" },
  { y: 1100, b: 3, k: "grow", tag: "1000—1300 年 · 欧洲", t: "人口翻了一倍多", n: "3,634 万 → 8,329 万", s: "重犁、三圃制，粮食增产", src: "HYDE 3.3 估算（Our World in Data）", map: "w1100" },
  { y: 1110, b: 3, k: "peak", tag: "1110 年 · 北宋", t: "中国人口第一次过亿", n: "约 1.25 亿", s: "引进占城稻，粮食增产", src: "人口：葛剑雄主编《中国人口史》；占城稻：《宋史·食货志》" },
  { y: 1206, b: 3, k: "war", tag: "1206 年", t: "成吉思汗统一蒙古", at: [107, 47], map: "w1200" },
  { y: 1219, b: 4, k: "war", tag: "1219—1221 年", t: "蒙古西征", s: "撒马尔罕、内沙布尔、梅尔夫……", at: [60, 39], big: true, go: "slam", anchor: BAR(34) },
  { y: 1235, b: 3, k: "war", tag: "1235 年 · 中国北方", t: "蒙古籍户只剩", n: "475 万", s: "金朝在册 4,582 万", at: [114, 37], kill: [105, 32, 126, 45, 0.85] },
  { y: 1279, b: 4, k: "unite", tag: "1279 年", t: "蒙古帝国", s: "人类史上最大的陆上帝国，商路从中国通到黑海", map: "w1279" },
  { y: 1300, b: 3, k: "note", tag: "1206—1368 年", t: "蒙古征服", n: "2,000 万—6,000 万", s: "死亡人数（各家估计）", src: "维基百科「战争死亡人数列表」" },
  { y: 1346, b: 4, k: "plague", tag: "1346 年 · 黑海", t: "蒙古军围攻卡法，军中暴发鼠疫", s: "商船把它带进了地中海", at: [35.4, 45.0], focus: [22, 46, 3] },
  { y: 1347, b: 4, k: "plague", tag: "1346—1353 年", t: "黑死病", n: "2,500 万—5,000 万", s: "死亡人数（估计）", at: [14, 46], big: true, go: "slam", anchor: BAR(40), focus: [12, 48, 3.2], src: "维基百科「流行病列表」" },
  { y: 1348, b: 3, k: "note", tag: "古 DNA 研究", t: "和查士丁尼瘟疫，是同一种细菌", s: "鼠疫杆菌，隔了 800 年又回来了", src: "Wagner 等，《柳叶刀·传染病》2014；Bos 等，《自然》2011" },
  { y: 1350, b: 6, k: "crash", tag: "1300 → 1400 年 · 欧洲", t: "黑死病杀死欧洲 30%—60% 的人", n: "8,329 万 → 6,072 万", s: "HYDE 估算的欧洲人口", big: true, go: "slam", kill: [-12, 35, 45, 62, 0.4], src: "死亡比例：维基百科「黑死病」" },
  { y: 1370, b: 3, k: "war", tag: "1369—1405 年", t: "帖木儿", n: "700 万—1,700 万", s: "死亡人数（估计）", at: [66.9, 39.6], map: "w1400" },
  { y: 1400, b: 4, k: "crash", tag: "1400 年", t: "世界人口", n: "4.42 亿", s: "两千年里，第二次减少", pct: "−3%", big: true, go: "slam", anchor: BAR(44) },
  // 第三幕 · 一条航线
  { y: 1492, b: 3, k: "move", tag: "1492 年", t: "哥伦布到达美洲", at: [-8, 38], to: [-72, 20], map: "w1500", focus: [-45, 24, 2.5] },
  { y: 1500, b: 2, k: "stat", tag: "1500 年 · 美洲", t: "原住民约", n: "6,000 万", s: "HYDE 估算", focus: [-78, 6, 2.0] },
  { y: 1520, b: 3, k: "plague", tag: "1519—1520 年 · 墨西哥", t: "天花", n: "500 万—800 万", s: "死亡人数；美洲人从没接触过这种病", at: [-99.1, 19.4], focus: [-86, 12, 2.5], src: "维基百科「流行病列表」" },
  { y: 1600, b: 5, k: "crash", tag: "1600 年 · 美洲", t: "一百年，少了 83%", n: "约 1,000 万", s: "HYDE 估算；也有研究认为少了九成", big: true, go: "slam", anchor: BAR(48), map: "w1600", kill: [-170, -56, -30, 72, 0.83], focus: [-76, 6, 1.9], src: "Koch 等，《第四纪科学评论》2019" },
  { y: 1610, b: 3, k: "move", tag: "1501—1866 年", t: "大西洋奴隶贸易", n: "约 1,250 万", s: "非洲人被运往美洲，途中死了约 180 万", at: [3, 7], to: [-42, -8], focus: [-20, 4, 2.2], src: "SlaveVoyages 跨大西洋奴隶贸易数据库" },
  { y: 1618, b: 4, k: "war", tag: "1618—1648 年", t: "三十年战争", n: "450 万—800 万", s: "死亡人数（估计）", at: [11, 51], anchor: BAR(50) },
  { y: 1644, b: 3, k: "war", tag: "1618—1683 年 · 中国", t: "明清易代", n: "约 2,500 万", s: "死亡人数（估计）", at: [116, 38], anchor: BAR(51), src: "维基百科「战争死亡人数列表」" },
  { y: 1750, b: 3, k: "grow", tag: "同一条航线，反方向", t: "玉米、土豆、番薯传遍旧大陆", s: "清朝人口：1741 年 1.4 亿 → 1851 年 4.3 亿", map: "w1700", at: [-70, 5], to: [105, 30], focus: [15, 25, 1.25], src: "清朝人口：《清实录》、户部清册" },
  { y: 1775, b: 3, k: "famine", tag: "1769—1793 年 · 印度", t: "三场大饥荒", n: "各约 1,000 万", s: "孟加拉、恰利萨、骷髅饥荒，饿死人数（估计）", at: [88, 23], ats: [[78, 28], [79, 17]], src: "维基百科「饥荒列表」" },
  { y: 1796, b: 3, k: "grow", tag: "1796 年 · 英国", t: "琴纳发明牛痘接种", s: "天花第一次可以预防", at: [-2.3, 51.7], src: "世界卫生组织：天花" },
  // 第四幕 · 机器与战争
  { y: 1804, b: 3, k: "peak", tag: "约 1804 年", t: "世界人口第一次", n: "10 亿", s: "用了 1,800 年", map: "w1800" },
  { y: 1851, b: 3, k: "war", tag: "1850—1864 年 · 中国", t: "太平天国战争", n: "2,000 万—7,000 万", s: "死亡人数（估计）", at: [117, 31], map: "w1880", src: "维基百科「战争死亡人数列表」" },
  { y: 1877, b: 3, k: "famine", tag: "1876—1879 年 · 中国北方", t: "丁戊奇荒", n: "900 万—1,300 万", s: "饿死（估计）；同一场大旱，印度饿死约 550 万", at: [112, 36], ats: [[78, 14]], focus: [95, 27, 2.6], src: "维基百科「饥荒列表」" },
  { y: 1880, b: 3, k: "move", tag: "1815—1933 年", t: "欧洲人大批移民美洲", n: "约 6,500 万", s: "离开欧洲，大多去了美洲；到美国的约 3,200 万", at: [8, 50], to: [-82, 40], focus: [-38, 40, 2.4], src: "维基百科「欧洲移民」" },
  { y: 1894, b: 3, k: "plague", tag: "1855—1960 年", t: "鼠疫第三次大流行", n: "约 1,500 万", s: "死亡人数，印度约 1,000 万", at: [114.2, 22.3], ats: [[102.7, 25], [73, 19], [78, 26]], focus: [95, 25, 2.6], src: "维基百科「第三次鼠疫大流行」" },
  { y: 1900, b: 4, k: "stat", tag: "1900 年", t: "世界", n: "16.3 亿", anchor: BAR(58), map: "none", span: 60 },
  { y: 1914, b: 4, k: "war", tag: "1914—1918 年", t: "第一次世界大战", n: "1,500 万—2,200 万", s: "死亡人数（估计）", at: [3, 50], ats: [[24, 52], [13, 46], [26.4, 40.2], [44, 33], [36, -6]], anchor: BAR(59), focus: [22, 40, 2.4], src: "维基百科「战争死亡人数列表」" },
  { y: 1915, b: 3, k: "war", tag: "1909—1915 年 · 哈伯", t: "合成氨：化肥，也是炸药和毒气", s: "化肥今天养活约一半人类；1915 年他主持了毒气战", at: [2.9, 50.85], src: "化肥：Erisman 等，《自然·地球科学》2008" },
  { y: 1918, b: 3, k: "plague", tag: "1918—1920 年", t: "西班牙流感", n: "约 5,000 万", s: "随军队调动传遍世界", at: [2, 48], ats: [[-95, 39], [78, 22], [110, 32], [-47, -15], [26, -28], [53, 32], [110, -7]], focus: [15, 18, 1.15], src: "死亡：美国疾控中心估计；这几年的世界人口是插值估算，曲线看不出短期起伏" },
  { y: 1927, b: 2, k: "stat", tag: "1927 年", t: "世界", n: "20 亿", s: "第二个 10 亿，只用了 123 年" },
  { y: 1937, b: 4, k: "war", tag: "1937—1945 年 · 中国", t: "抗日战争", n: "1,400 万—2,000 万", s: "中国死亡人数（估计）；官方统计军民伤亡 3,500 万", at: [116, 35], ats: [[119.5, 31.5], [112, 28], [106.5, 29.6], [113, 23]], focus: [112, 32, 3.2], src: "维基百科「第二次世界大战伤亡」；3,500 万：中国官方数字" },
  { y: 1939, b: 5, k: "war", tag: "1939—1945 年", t: "第二次世界大战", n: "7,000 万—8,500 万", s: "死亡人数（估计）；战火从欧洲烧到太平洋", at: [5, 50], ats: [[32, 52], [20, 31], [114, 32], [100, 15], [122, 13], [110, -6], [137, 36], [160, -9.5]], anchor: BAR(63), focus: [70, 28, 2.0], src: "维基百科「第二次世界大战」" },
  { y: 1941, b: 4, k: "war", tag: "1941—1945 年 · 苏联", t: "苏德战争", n: "2,000 万—2,700 万", s: "苏联死亡人数（估计）", at: [37, 54], ats: [[30, 50], [44, 48.7]], src: "维基百科「第二次世界大战伤亡」" },
  { y: 1942, b: 4, k: "war", tag: "1941—1945 年", t: "纳粹大屠杀", n: "约 600 万", s: "犹太人遇难", at: [19.2, 50.0], src: "美国大屠杀纪念馆" },
  { y: 1944, b: 3, k: "grow", tag: "1928 年发现，1943 年量产", t: "青霉素", s: "战场上，第一次大批救回伤兵", at: [-0.17, 51.5] },
  { y: 1945, b: 4, k: "note", tag: "1939—1945 年", t: "死去的人，占当时世界人口", n: "约 3%", s: "每 30 多个人里，就有 1 个", anchor: BAR(67), src: "维基百科「第二次世界大战」：约占 1940 年世界人口（23 亿）的 3%" },
  { y: 1945.6, b: 4, k: "note", tag: "1939—1945 年", t: "可这 6 年，世界人口还多了", n: "1.1 亿", s: "每年出生的人，比死去的多", anchor: BAR(69), src: "Gapminder 估算（Our World in Data）：22.7 亿 → 23.9 亿" },
  { y: 1946, b: 4, k: "grow", tag: "1940 年代起", t: "抗生素、疫苗普及", s: "死亡率骤降" },
  // 第五幕 · 爆炸与转折
  { y: 1950, b: 3, k: "stat", tag: "1950 年", t: "世界", n: "25 亿", anchor: BAR(72), span: 30 },
  { y: 1955, b: 3, k: "grow", tag: "1950 → 2023 年", t: "人均寿命", n: "46 岁 → 73 岁", src: "Our World in Data（联合国《世界人口展望 2024》）" },
  { y: 1959, b: 3, k: "famine", tag: "1959—1961 年 · 中国", t: "大饥荒", n: "1,500 万—5,500 万", s: "非正常死亡（各家估计）", src: "维基百科「饥荒列表」" },
  { y: 1960, b: 1, k: "stat", tag: "1960 年", t: "", n: "30 亿" },
  { y: 1963, b: 3, k: "peak", tag: "1963 年", t: "增长最快：一年多了", n: "7,000 万人", s: "增速 2.2%" },
  { y: 1970, b: 3, k: "policy", tag: "1960—1970 年代", t: "绿色革命：良种加化肥", s: "《人口炸弹》预言的数亿人饿死，没有发生" },
  { y: 1974, b: 1, k: "stat", tag: "1974 年", t: "", n: "40 亿" },
  { y: 1981, b: 3, k: "plague", tag: "1981 年起", t: "艾滋病", n: "约 4,230 万", s: "死亡人数，截至 2023 年", src: "联合国艾滋病规划署 2024 年数据" },
  { y: 1987, b: 1, k: "stat", tag: "1987 年", t: "", n: "50 亿" },
  { y: 1990, b: 3, k: "grow", tag: "1950 → 2023 年", t: "活不到 5 岁的孩子", n: "23% → 3.6%", src: "Our World in Data（联合国儿童死亡率估算组）" },
  { y: 1999, b: 1, k: "stat", tag: "1999 年", t: "", n: "60 亿" },
  { y: 2011, b: 1, k: "stat", tag: "2011 年", t: "", n: "70 亿" },
  { y: 2020, b: 2, k: "plague", tag: "2020—2021 年", t: "新冠疫情", n: "约 1,490 万", s: "超额死亡（世界卫生组织）" },
  { y: 2022, b: 4, k: "peak", tag: "2022 年 11 月 15 日", t: "世界人口", n: "80 亿", s: "最近 10 亿，只用了 11 年", anchor: BAR(79), span: 25 },
  { y: 2023, b: 2, k: "note", tag: "2023 年", t: "印度超过中国", s: "成为人口第一大国", anchor: BAR(80) },
  { y: 2024, b: 2, k: "note", tag: "2024 年", t: "全球生育率", n: "2.25", s: "1960 年代超过 5" },
  { y: 2084, b: 4, k: "peak", tag: "联合国预测 · 2084 年", t: "峰值", n: "约 103 亿", anchor: BAR(81), span: 120 },
  { y: 2100, b: 4, k: "note", tag: "联合国预测 · 2100 年", t: "开始减少", n: "约 102 亿", s: "中国约 6.3 亿，尼日利亚约 4.8 亿", anchor: BAR(82), src: "联合国《世界人口展望 2024》中方案" },
];

const SRC_PTS: [number, string][] = [
  [-99, "HYDE 3.3 历史估算（Our World in Data），每百年一个数"],
  [1700, "HYDE 3.3 历史估算（Our World in Data），每十年一个数"],
  [1800, "Gapminder 估算（Our World in Data）"],
  [1950, "联合国《世界人口展望 2024》"],
  [2025.5, "联合国《世界人口展望 2024》中方案 · 预测"],
];
const placed = schedule(EVS, MUSIC, BAR(4), BAR(83));
export const REVEALS = placed.map((e) => ({ k: e.k, big: !!e.big, y: e.y, ...revealOf(e, MUSIC.beats) }));
const END_T = BAR(83);
// the most populous countries (today's borders): Maddison 2020 (1, 1000, 1500, 1600), HYDE 1700-1790, Gapminder 1800-1949,
// UN 1950-2023 and its medium projection to 2100; China to 1949 is the China film's own series (records marked 在册)
type CP = [number, number, string];
const CN: Record<string, [string, string]> = {
  China: ["中国", "#ffc94d"], India: ["印度", "#e39a4f"], "United States": ["美国", "#6fa8dc"], Russia: ["俄罗斯", "#8e83d6"],
  Japan: ["日本", "#d27a92"], Indonesia: ["印尼", "#5fb7aa"], France: ["法国", "#7f9bd6"], Germany: ["德国", "#9aa5b1"],
  Italy: ["意大利", "#b5c46a"], Turkey: ["土耳其", "#c9605e"], Egypt: ["埃及", "#d9b36c"], Iran: ["伊朗", "#6cbfa0"],
  "United Kingdom": ["英国", "#a98bd6"], Spain: ["西班牙", "#e0a35f"], Mexico: ["墨西哥", "#7fc27a"], Brazil: ["巴西", "#58b368"],
  Pakistan: ["巴基斯坦", "#4fae8a"], Bangladesh: ["孟加拉国", "#6aa36b"], Nigeria: ["尼日利亚", "#3fa66f"], Ethiopia: ["埃塞俄比亚", "#c2a24f"],
  "Democratic Republic of Congo": ["刚果（金）", "#5aa1b8"],
};
const CTRY = Object.entries(WC as unknown as Record<string, CP[]>).map(([k, p]) => ({ n: CN[k][0], c: CN[k][1], p }));
const ctryAt = (p: CP[], y: number): { v: number; rec: boolean } | null => {
  if (y <= p[0][0]) return y === p[0][0] || p[0][0] <= 2 ? { v: p[0][1], rec: p[0][2] === "rec" } : null;
  for (let i = 1; i < p.length; i++)
    if (y <= p[i][0]) {
      const [y0, v0, k0] = p[i - 1];
      const [y1, v1, k1] = p[i];
      const f = (y - y0) / (y1 - y0);
      return { v: v0 + (v1 - v0) * f, rec: (f < 0.5 ? k0 : k1) === "rec" };
    }
  return { v: p[p.length - 1][1], rec: false };
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
      { t0: END_T + 0.1, t1: BAR(85) - 0.05, text: "两千年，世界人口只少过 2 次", text2: "都因为瘟疫和战争", tone: "white" },
      { t0: BAR(85), t1: BAR(87) - 0.05, text: "预测：2084 年后，第 3 次", text2: "这一次，没有灾难", tone: "white" },
      { t0: BAR(87), t1: BAR(89) - 0.05, text: "全球生育率，从 5 个孩子", text2: "降到 2.25 个", tone: "white" },
      { t0: BAR(89), t1: MUSIC.dur, text: "下一次，由我们自己决定", brush: true, tone: "gold" },
    ],
    troughs: [
      { y: 300, t: "罗马危机 · 三国" },
      { y: 1400, t: "黑死病" },
    ],
    card: BAR(90),
  },
  // five acts of the rise and fall: the label above the year
  era: (y) => (y < 520 ? "第一幕 · 帝国与瘟疫" : y < 1450 ? "第二幕 · 草原与黑死病" : y < 1800 ? "第三幕 · 一条航线" : y < 1949.5 ? "第四幕 · 机器与战争" : "第五幕 · 爆炸与转折"),
  kindLabel: { rec: "史料", est: "历史估算（HYDE）", stat: "联合国统计", un: "联合国预测" },
  noGapChip: true,
  noRiser: true, // the score carries the rewind itself (synthesised in tools/score_world8.py)
  musicSrc: "score_world8.wav",
  // respect for the dead, one rule for every modern catastrophe (from 1850: war, famine, plague): no drums or hits, a low bell;
  // the great wars (Taiping, WWI, WWII) get one bar of silence when their card lands
  solemnFrom: 1850,
  rests: [1851, 1914, 1939],
  srcEnd: "数据：HYDE 3.3、Gapminder（Our World in Data）、麦迪逊项目 2020、联合国《世界人口展望 2024》",
  src: (y) => {
    let s = SRC_PTS[0][1];
    for (const [a, t] of SRC_PTS) if (y >= a - 1e-6) s = t;
    return s;
  },
  mapOff: 1950,
  map: { lon: 60, lat: 30, zoom: 1 },
  tableTitle: "人口最多的国家 · 今日国界",
  tableRows: 6,
  table: (y) =>
    CTRY.flatMap((k) => {
      const a = ctryAt(k.p, Math.min(y, 2100));
      return a ? [{ n: k.n, v: a.v, c: k.c, tag: a.rec ? "在册" : undefined }] : [];
    }),
};
