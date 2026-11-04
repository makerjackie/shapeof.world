// SPECIAL INTERNAL VERSION (2026-11-04, the user's request): a copy of china7.ts that does not mention the 1959-1961 famine.
// 7 falls instead of 8, 2022 is the 8th; the data line is unchanged. Composition China7S; keep china7.ts the main version.
// 两千年中国人口 (Film7 China cut, v5: cards at the head). Every event is a reason the population went up or down.
// Times are SOURCE seconds of public/ref_full.wav; the scheduler puts each event on a beat (time6.ts).
// Sources: research/SOURCES6.md.
import DATA from "../data.json";
import type { Pt, Spec } from "./spec6";
import { Ev, Key, makeMusic, schedule } from "./time6";
import { revealOf } from "./reveal7";

// ---------------- the series (万人)
const R = (y: number, v: number): Pt => ({ y, v, kind: "rec" });
const E = (y: number, v: number): Pt => ({ y, v, kind: "est" });
const ANCIENT: Pt[] = [
  R(2, 5959.4), // 《汉书·地理志》元始二年
  R(57, 2100.8), // 《后汉书》注引《帝王世纪》光武中元二年
  R(75, 3412.5),
  R(88, 4335.6),
  R(105, 5325.6),
  R(125, 4869.1),
  R(140, 4915.0),
  R(144, 4973.1),
  R(146, 4756.7),
  R(157, 5648.7), // 永寿三年
  R(263, 766.7), // 三国在册合计：魏 443.3 万 + 蜀 94 万 (263) + 吴 230 万 (280)
  R(280, 1616.4), // 《晋书·地理志》太康元年
  R(609, 4602.0), // 《隋书·地理志》大业五年
  R(639, 1235.2), // 贞观十三年
  R(705, 3714.0),
  R(726, 4142.0),
  R(732, 4543.1),
  R(740, 4814.4),
  R(742, 4891.0),
  R(755, 5291.9), // 《通典》天宝十四载
  R(760, 1699.4), // 乾元三年
  R(764, 1690.0),
  R(820, 1576.0),
  E(980, 3250.0),
  E(1110, 12500.0), // 葛剑雄主编《中国人口史》
  E(1290, 7500.0), // 吴松弟《中国人口史》第三卷
  R(1393, 6054.6), // 《明史·食货志》洪武二十六年
  E(1630, 19250.0), // 曹树基《中国人口史》第四卷
  E(1644, 15250.0),
  E(1682, 13000.0),
  R(1741, 14341.2), // 《清高宗实录》乾隆六年
  R(1751, 18181.0),
  R(1764, 20550.0),
  R(1790, 30148.7),
  R(1805, 33218.1),
  R(1812, 36169.5),
  R(1820, 38310.0),
  R(1834, 40100.9),
  R(1844, 41281.5),
  R(1851, 43216.4), // 户部清册 咸丰元年
  E(1880, 36450.0), // 曹树基《中国人口史》第五卷
  E(1912, 41164.0), // 1912 年人口调查（陈长衡修订）
];
const MODERN: Pt[] = (DATA as any).china.map((r: any) => ({ y: r.y, v: r.pop, kind: "stat" }));
const UN: Pt[] = Object.entries((DATA as any).chinaUN as Record<string, number>)
  .map(([y, v]) => ({ y: Number(y), v: v * 10000, kind: "un" as const }))
  .filter((p) => p.y > 2025);
export const SERIES: Pt[] = [...ANCIENT, ...MODERN, ...UN];

// ---------------- music: section A (BARRETE!) to the end of the war years, section B from 1949, its last hit for the ending
export const MUSIC = makeMusic(
  [
    [0, 135.286],
    [139.7515, 170.8915],
    [195.11, 201.3],
  ],
  1.0,
);
const F = MUSIC.F;
const A = (n: number) => +(0.32 + n * 0.4654).toFixed(4); // section A beat n (source = film time)

// ---------------- cold open: the whole line in four seconds, eight crashes on eight beats, then the question
const COLD_KEYS: Key[] = [
  { t: 0, y: 2, p: 1 },
  { t: A(0), y: 57, p: 1.4 },
  { t: A(1), y: 263, p: 1.4 },
  { t: A(2), y: 639, p: 1.4 },
  { t: A(3), y: 760, p: 1.4 },
  { t: A(4), y: 1290, p: 1.4 },
  { t: A(5), y: 1682, p: 1.4 },
  { t: A(6), y: 1880, p: 1.4 },
  { t: A(7), y: 2025, p: 1.4 },
  { t: A(8), y: 2025, p: 1 },
  { t: A(22), y: 2025, p: 1 },
  { t: A(25), y: 2, p: 1.7 },
];
const COLD_CRASHES = [
  { y: 57, t: "新莽", p: "−65%" },
  { y: 263, t: "三国", p: "−86%" },
  { y: 639, t: "隋末", p: "−73%" },
  { y: 760, t: "安史", p: "−68%" },
  { y: 1290, t: "宋元", p: "−40%" },
  { y: 1682, t: "明清", p: "−32%" },
  { y: 1880, t: "太平天国", p: "−16%" },
].map((c, i) => ({ ...c, at: A(i) }));

// ---------------- the body
const L = {
  luoyang: [112.45, 34.62] as [number, number],
  changan: [108.94, 34.34] as [number, number],
  kaifeng: [114.3, 34.8] as [number, number],
  jiankang: [118.8, 32.06] as [number, number],
  beijing: [116.4, 39.9] as [number, number],
  chengdu: [104.07, 30.67] as [number, number],
};
const EVS: Ev[] = [
  // 汉
  { y: 2, b: 4, k: "stat", tag: "公元 2 年 · 西汉", t: "现存最早的全国户口", n: "5,959 万", s: "差不多今天一个湖北省", map: "xihan", anchor: 12.42, span: 80, src: "湖北：第七次全国人口普查 5,775 万" },
  { y: 9, b: 3, k: "war", tag: "公元 9 年", t: "王莽篡汉", s: "被网友叫作“穿越者”，改制失败，天下大乱", at: L.changan },
  { y: 11, b: 2, k: "famine", tag: "公元 11 年", t: "黄河决口改道", s: "河决魏郡，泛滥数郡", at: [115.4, 36.2] },
  { y: 17, b: 2, k: "war", tag: "公元 17 年", t: "绿林、赤眉起义", s: "饥民四起", at: [113.0, 32.0] },
  { y: 23, b: 3, k: "war", tag: "公元 23 年", t: "昆阳之战", s: "刘秀以少胜多，莽军“溺死者以万数”", at: [113.36, 33.62], src: "《后汉书·光武帝纪》" },
  { y: 25, b: 2, k: "unite", tag: "公元 25 年", t: "刘秀称帝，东汉建立", s: "又打了 11 年，才重新统一", map: "donghan" },
  { y: 57, b: 7, k: "crash", tag: "公元 57 年 · 东汉", t: "王莽之乱过后", n: "2,101 万", s: "55 年间，在册人口少了 65%", pct: "−65%", big: true, go: "slam", anchor: 19.87 },
  { y: 88, b: 3, k: "grow", tag: "公元 88 年", t: "明章之治", n: "4,336 万", s: "31 年，翻了一倍" },
  { y: 105, b: 2, k: "grow", tag: "公元 105 年", t: "快回到西汉的水平", n: "5,326 万" },
  { y: 157, b: 3, k: "peak", tag: "公元 157 年", t: "东汉顶峰", n: "5,649 万", s: "100 年，多了 3,548 万", pct: "+169%", big: true, anchor: 25.45 },
  // 汉末三国
  { y: 184, b: 3, k: "war", tag: "184 年", t: "黄巾起义", s: "“苍天已死，黄天当立”", at: [115.2, 37.0], span: 120, src: "《后汉书·皇甫嵩传》" },
  { y: 190, b: 2, k: "move", tag: "190 年", t: "董卓焚洛阳", s: "驱数百万口西迁长安，积尸盈路", at: L.luoyang, to: L.changan, src: "《后汉书·董卓传》" },
  { y: 193, b: 2, k: "war", tag: "193 年", t: "曹操攻徐州", s: "杀男女数十万，泗水为之不流", at: [117.2, 34.26], src: "《后汉书·陶谦传》" },
  { y: 196, b: 2, k: "split", tag: "190 年代", t: "群雄割据", s: "示意", map: "qunxiong" },
  { y: 200, b: 3, k: "war", tag: "200 年", t: "官渡之战", s: "袁绍大败，“前后所杀八万人”", at: [114.2, 34.75], src: "《后汉书·袁绍传》" },
  { y: 205, b: 3, k: "quote", t: "白骨露于野，千里无鸡鸣", s: "曹操《蒿里行》" },
  { y: 208, b: 3, k: "plague", tag: "208 年", t: "赤壁之战", s: "曹军遭遇大疫，“吏士多死者”", at: [113.9, 29.85], src: "《三国志·武帝纪》" },
  { y: 220, b: 3, k: "split", tag: "220 年", t: "三国鼎立", map: "sanguo" },
  { y: 263, b: 2, k: "stat", tag: "263 年", t: "魏", n: "443 万" },
  { y: 263, b: 1, k: "stat", tag: "263 年", t: "蜀", n: "94 万" },
  { y: 263, b: 1, k: "stat", tag: "280 年", t: "吴", n: "230 万" },
  { y: 263, b: 8, k: "crash", tag: "三国在册人口合计", t: "比东汉顶峰少了 86%", n: "767 万", s: "不到今天上海的三分之一", pct: "−86%", big: true, go: "slam", anchor: 38.48, src: "上海：第七次全国人口普查 2,487 万" },
  { y: 270, b: 4, k: "note", tag: "人都去哪了？", t: "死于战乱、瘟疫、饥荒", s: "还有大批人逃亡、藏匿，从户籍上消失", anchor: 44.07 },
  { y: 280, b: 4, k: "unite", tag: "280 年", t: "西晋统一", n: "1,616 万", s: "17 年，翻了一倍", pct: "+111%", map: "jin", anchor: 45.93 },
  // 两晋南北朝
  { y: 291, b: 2, k: "war", tag: "291—306 年", t: "八王之乱", s: "宗室混战 16 年", at: L.luoyang, span: 160 },
  { y: 311, b: 3, k: "war", tag: "311 年", t: "永嘉之乱 · 洛阳陷落", s: "百官士庶死者三万余人", at: L.luoyang, big: true, src: "《晋书》" },
  { y: 317, b: 4, k: "move", tag: "4 世纪", t: "衣冠南渡", n: "约 90 万人", s: "北方人口南迁", at: [113.5, 35.2], to: L.jiankang, src: "估算：谭其骧《晋永嘉丧乱后之民族迁徙》" },
  { y: 320, b: 4, k: "split", tag: "304—439 年", t: "五胡十六国", s: "北方先后 20 多个政权 · 示意", map: "shiliu" },
  { y: 439, b: 2, k: "unite", tag: "439 年", t: "北魏统一北方", s: "南北朝对峙", map: "nanbei" },
  { y: 548, b: 4, k: "war", tag: "548 年", t: "侯景之乱", s: "千里绝烟，人迹罕见，白骨成聚", at: L.jiankang, src: "《南史·侯景传》" },
  { y: 577, b: 2, k: "unite", tag: "577 年", t: "北周灭北齐", n: "得口 2,001 万", map: "zhouchen", src: "北齐承光元年户口" },
  { y: 585, b: 3, k: "policy", tag: "585 年 · 隋", t: "大索貌阅", n: "164 万", s: "挨户核对，查出隐匿人口", src: "《隋书·食货志》" },
  { y: 589, b: 2, k: "unite", tag: "589 年", t: "隋灭陈，天下一统", map: "sui" },
  { y: 609, b: 4, k: "peak", tag: "609 年 · 大业五年", t: "隋朝顶峰", n: "4,602 万", s: "329 年，涨到近 3 倍", pct: "+185%", big: true },
  { y: 612, b: 3, k: "war", tag: "612 年", t: "三征高句丽", n: "113 万大军", s: "号称 200 万", at: [124.5, 40.5], src: "《隋书·炀帝纪》" },
  { y: 613, b: 3, k: "split", tag: "613 年起", t: "隋末 · 群雄并起", s: "示意", map: "suimo" },
  { y: 639, b: 8, k: "crash", tag: "639 年 · 唐贞观十三年", t: "在册人口", n: "1,235 万", s: "30 年，少了 73%", pct: "−73%", big: true, go: "slam", anchor: 68.27, map: "tang" },
  // 唐
  { y: 649, b: 4, k: "note", tag: "627—649 年", t: "贞观之治", s: "轻徭薄赋，休养生息", anchor: 71.99 },
  { y: 705, b: 1, k: "grow", tag: "705 年", t: "", n: "3,714 万" },
  { y: 726, b: 1, k: "grow", tag: "726 年", t: "", n: "4,142 万" },
  { y: 742, b: 2, k: "grow", tag: "742 年", t: "开元盛世", n: "4,891 万" },
  { y: 755, b: 4, k: "peak", tag: "755 年 · 天宝十四载", t: "唐朝顶峰", n: "5,292 万", s: "116 年，涨到 4 倍多", pct: "+328%", big: true },
  { y: 755.9, b: 2, k: "war", tag: "755—763 年", t: "安史之乱", s: "范阳起兵，两京陷落", at: L.beijing, big: true, go: "slam", anchor: 77.58, map: "anshi", span: 60 },
  { y: 760, b: 6, k: "crash", tag: "760 年 · 乾元三年", t: "在册人口", n: "1,699 万", s: "5 年，少了 68%", pct: "−68%", big: true, go: "slam" },
  { y: 763, b: 2, k: "split", tag: "763 年后", t: "藩镇割据", map: "fanzhen", span: 200 },
  { y: 875, b: 2, k: "war", tag: "875—884 年", t: "黄巢起义", s: "转战半个中国", at: [115.0, 35.0] },
  { y: 907, b: 3, k: "split", tag: "907 年", t: "唐亡 · 五代十国", s: "53 年换了 5 个朝代 · 示意", map: "wudai" },
  // 宋金元
  { y: 960, b: 2, k: "unite", tag: "960 年", t: "北宋", map: "song" },
  { y: 1012, b: 2, k: "policy", tag: "1012 年", t: "引进占城稻", s: "早熟耐旱，南方粮食大增", at: [119.5, 30.5], src: "《宋史·食货志》" },
    { y: 1110, b: 6, k: "peak", tag: "1110 年 · 北宋大观四年", t: "第一次突破 1 亿", n: "约 1.25 亿", s: "是唐朝顶峰的 2.4 倍", pct: "+285%", big: true, anchor: 85.02, span: 260 },
  { y: 1127, b: 2, k: "war", tag: "1127 年", t: "靖康之变", s: "金军攻破开封", at: L.kaifeng, map: "songjin" },
  { y: 1128, b: 3, k: "move", tag: "1127 年后", t: "建炎南渡", s: "北方人口又一次大南迁", at: L.kaifeng, to: [120.15, 30.28] },
  { y: 1207, b: 2, k: "stat", tag: "1207 年 · 金泰和七年", t: "金 · 北方在册", n: "4,582 万", src: "金泰和七年户口" },
  { y: 1211, b: 2, k: "war", tag: "1211 年", t: "蒙古攻金", at: [115.5, 40.5], map: "mengjin", big: true },
  { y: 1232, b: 3, k: "plague", tag: "1232 年", t: "汴京大疫", n: "90 余万", s: "五十日，诸门出死者九十余万人", at: L.kaifeng, src: "《金史·哀宗纪》" },
  { y: 1235, b: 6, k: "crash", tag: "1235 年 · 蒙古乙未籍户", t: "北方在册只剩", n: "475 万", s: "金泰和七年 4,582 万", pct: "−90%", big: true, go: "slam", src: "蒙古乙未年（1235）籍户", kill: [104, 32.6, 128, 46, 0.88] },
  { y: 1279, b: 2, k: "war", tag: "1279 年", t: "崖山 · 南宋亡", at: [113.1, 22.2] },
  { y: 1290, b: 6, k: "crash", tag: "1290 年 · 元", t: "全国人口", n: "约 7,500 万", s: "比北宋少了 40%（学者估算）", pct: "−40%", big: true, go: "slam", anchor: 94.33, map: "yuan" },
  { y: 1351, b: 2, k: "war", tag: "1351 年", t: "红巾起义", s: "元末大乱", at: [116.0, 32.5], anchor: 98.05 },
  // 明清
  { y: 1393, b: 3, k: "stat", tag: "1393 年 · 洪武二十六年", t: "明 · 在册", n: "6,055 万", map: "ming" },
  { y: 1593, b: 2, k: "policy", tag: "16 世纪", t: "番薯、玉米传入", s: "山地也能养活人", span: 300 },
  { y: 1630, b: 3, k: "peak", tag: "1630 年 · 明末", t: "明末顶峰", n: "约 1.93 亿", s: "学者估算" },
  { y: 1633, b: 1, st: "mm", k: "famine", tag: "1630 年代", t: "崇祯大旱", s: "小冰期，连年大旱", at: [110.0, 35.5], span: 80 },
  { y: 1641, b: 1, st: "mm", k: "war", tag: "1640 年代", t: "李自成、张献忠", at: L.changan },
  { y: 1643, b: 1, st: "mm", k: "plague", tag: "1643 年", t: "北京大疫", n: "20 余万", s: "约占城中人口五分之一", at: L.beijing, src: "史料记载，学者估算" },
  { y: 1644, b: 1, st: "mm", k: "split", tag: "1644 年", t: "清军入关", map: "mingmo", big: true },
  { y: 1645, b: 1, st: "mm", k: "war", tag: "1645 年", t: "扬州十日", s: "《扬州十日记》称死者八十余万", at: [119.4, 32.4], src: "王秀楚《扬州十日记》" },
  { y: 1673, b: 1, st: "mm", k: "war", tag: "1673—1681 年", t: "三藩之乱", at: [110.0, 27.0] },
  { y: 1682, b: 5, k: "crash", tag: "1682 年 · 清初", t: "全国人口", n: "约 1.3 亿", s: "比明末少了 32%（学者估算）", pct: "−32%", big: true, go: "slam", anchor: 105.5, map: "qing1" },
  { y: 1690, b: 2, k: "move", tag: "清初", t: "湖广填四川", at: [112.5, 30.0], to: L.chengdu, span: 120 },
  { y: 1712, b: 2, k: "policy", tag: "1712 年", t: "盛世滋生人丁，永不加赋" },
  { y: 1759, b: 2, k: "unite", tag: "1759 年", t: "疆域最大", s: "约 1,300 万平方公里", map: "qing2" },
  { y: 1790, b: 3, k: "peak", tag: "1790 年 · 乾隆五十五年", t: "50 年翻了一倍", n: "3.01 亿", pct: "+110%", big: true },
  { y: 1851, b: 4, k: "peak", tag: "1851 年 · 咸丰元年", t: "约占世界三分之一", n: "4.32 亿", s: "比清初多了 3 亿", pct: "+232%", big: true },
  // 晚清民国
  { y: 1851.6, b: 4, k: "war", tag: "1851—1864 年", t: "太平天国", s: "战火波及十八省", at: L.jiankang, map: "taiping", big: true, go: "slam", anchor: 112.95, span: 60, focus: [114, 31, 1.5] },
  { y: 1862, b: 2, k: "war", tag: "1862—1873 年", t: "西北战乱", at: [106.0, 36.5] },
  { y: 1864, b: 4, k: "note", tag: "太平天国战争", t: "死亡人数", n: "2,000—7,000 万", s: "各家估计相差很大", src: "学者估算" },
  { y: 1877, b: 4, k: "famine", tag: "1876—1879 年", t: "丁戊奇荒", n: "约 1,000 万", s: "华北大旱，饿死人数", at: [112.5, 36.0], src: "学者估算 950—1,300 万" },
  { y: 1880, b: 6, k: "crash", tag: "1880 年 · 光绪六年", t: "30 年，少了约 6,800 万", n: "3.65 亿", s: "学者估算", pct: "−16%", big: true, go: "slam", map: "qing3" },
  { y: 1890, b: 2, k: "move", tag: "清末到民国", t: "闯关东", s: "近百年，数千万人", at: [117.5, 36.5], to: [125.5, 44.5] },
  { y: 1912, b: 2, k: "stat", tag: "1912 年 · 民国", t: "61 年，还没回到 1851 年", n: "4.12 亿", map: "none" },
  { y: 1920, b: 2, k: "war", tag: "1916—1928 年", t: "军阀混战", span: 40, at: [113.5, 33.5] },
  { y: 1937, b: 4, k: "war", tag: "1937 年", t: "全面抗战", big: true, go: "slam", anchor: 127.84, at: [117.5, 35.5] },
  { y: 1942, b: 4, k: "famine", tag: "1942 年", t: "河南大饥荒", n: "约 300 万", s: "饿死", at: [113.6, 34.0], src: "通行估计" },
  { y: 1945, b: 4, k: "note", tag: "抗日战争", t: "中国军民伤亡", n: "3,500 万", anchor: 131.56, src: "中国官方数字" },
  { y: 1946, b: 4, k: "war", tag: "1946—1949 年", t: "内战", at: [117.0, 35.0] },
  // 1949—
  { y: 1949, b: 6, k: "stat", tag: "1949 年", t: "中华人民共和国成立", n: "5.42 亿", anchor: 139.7515, span: 30 },
  { y: 1957, b: 2, k: "grow", tag: "1949—1957 年", t: "死亡率减半", n: "20‰ → 10.8‰" },
  { y: 1963, b: 7, k: "peak", tag: "1963 年", t: "一年出生", n: "2,959 万", s: "1949 年以来最多", src: "国家统计局（出生率 × 人口）" },
  { y: 1969, b: 1, k: "grow", tag: "1969 年", t: "", n: "8 亿" },
  { y: 1971, b: 2, k: "policy", tag: "1971 年", t: "计划生育开始" },
  { y: 1974, b: 1, k: "grow", tag: "1974 年", t: "", n: "9 亿" },
  { y: 1980, b: 2, k: "policy", tag: "1980 年", t: "提倡只生一个" },
  { y: 1981, b: 3, k: "peak", tag: "1981 年", t: "突破 10 亿", n: "10 亿", s: "32 年，多了 4.6 亿", pct: "+85%", big: true },
  { y: 1987, b: 2, k: "peak", tag: "1987 年", t: "第二次出生高峰", n: "2,529 万", src: "国家统计局（出生率 × 人口）" },
  { y: 1988, b: 1, k: "grow", tag: "1988 年", t: "", n: "11 亿" },
  { y: 1995, b: 1, k: "grow", tag: "1995 年", t: "", n: "12 亿" },
  { y: 2005, b: 1, k: "grow", tag: "2005 年", t: "", n: "13 亿" },
  { y: 2016, b: 2, k: "policy", tag: "2016 年", t: "全面二孩" },
  { y: 2021, b: 4, k: "peak", tag: "2021 年", t: "峰值", n: "14.13 亿", anchor: 153.59, span: 25 },
  { y: 2022, b: 4, k: "turn", tag: "2022 年", t: "总人口开始减少", n: "−85 万", s: "死亡 1,041 万 > 出生 956 万", anchor: 155.32, src: "国家统计局 · 统计公报" },
  { y: 2025, b: 4, k: "stat", tag: "2025 年", t: "出生人口", n: "792 万", s: "1949 年以来最少", anchor: 157.05, src: "国家统计局 · 统计公报" },
  { y: 2100, b: 4, k: "note", tag: "2100 年", t: "预测：约等于 1956 年", n: "6.33 亿", anchor: 158.78, span: 180 },
];

// where the count the head last passed comes from (research/SOURCES3.md, SOURCES.md)
const SRC_PTS: [number, string][] = [
  [-99, "《汉书·地理志》元始二年户口"],
  [57, "《后汉书·郡国志》注引《帝王世纪》"],
  [75, "《后汉书》注引历年户口"],
  [157, "《晋书·地理志》《通典》永寿三年户口"],
  [263, "《三国志》注、《晋书》：魏、蜀、吴在册户口合计"],
  [280, "《晋书·地理志》太康元年户口"],
  [609, "《隋书·地理志》大业五年户口"],
  [639, "贞观十三年户口（冻国栋《中国人口史》第二卷）"],
  [705, "《通典》《旧唐书》历年户口"],
  [980, "学者估算：据《太平寰宇记》户数推算"],
  [1110, "学者估算：葛剑雄主编《中国人口史》"],
  [1290, "学者估算：吴松弟《中国人口史》第三卷"],
  [1393, "《明史·食货志》洪武二十六年户口"],
  [1630, "学者估算：曹树基《中国人口史》第四卷"],
  [1682, "学者估算：葛剑雄主编《中国人口史》"],
  [1741, "《清实录》历年民数"],
  [1851, "户部清册 · 咸丰元年"],
  [1880, "学者估算：曹树基《中国人口史》第五卷"],
  [1912, "1912 年人口调查（陈长衡修订）"],
  [1949, "国家统计局 · 年末总人口"],
  [2025.5, "联合国《世界人口展望 2024》中方案 · 预测"],
];
const placed = schedule(EVS, MUSIC, 12.42, 160.51);
export const REVEALS = placed.map((e) => ({ k: e.k, big: !!e.big, ...revealOf(e, MUSIC.beats) }));
const END_T = F(160.51);

export const CHINA: Spec = {
  id: "china",
  brand: "两千年中国人口",
  series: SERIES,
  music: MUSIC,
  events: placed,
  cold: {
    keys: COLD_KEYS,
    crashes: COLD_CRASHES,
    lines: [
      { t0: A(10), t1: A(14) - 0.05, a: "两千年，7 次人口大跌", b: "每一次，都伴着战乱、饥荒、瘟疫", tone: "red" },
      { t0: A(14), t1: A(18) - 0.05, a: "公元 2 年，在册 5,959 万人", b: "此后 1,000 多年，再没超过", tone: "white" },
      { t0: A(18), t1: A(22) - 0.05, a: "汉、隋、唐的盛世，都没超过", b: "人都去哪了？", tone: "gold" },
    ],
    rewind: [A(22), A(25)],
    promise: "一条曲线，看尽王朝兴衰",
    counter: "次人口大跌",
    ceiling: { v: 5959.4, y0: 2, y1: 900, t0: A(14), peaks: [[157, A(18)], [609, A(18) + 0.2327], [755, A(19)]], names: ["东汉", "隋", "唐"] },
    // the territory on the beat: the realm before each fall on the lunge, the broken map on the hit
    maps: [
      [0, "xihan"],
      [A(0), "donghan", true],
      [A(1), "sanguo", true],
      [A(1) + 0.2327, "sui"],
      [A(2), "suimo", true],
      [A(2) + 0.2327, "tang"],
      [A(3), "anshi", true],
      [A(3) + 0.2327, "song"],
      [A(4), "mengjin", true],
      [A(4) + 0.2327, "ming"],
      [A(5), "mingmo", true],
      [A(5) + 0.2327, "qing2"],
      [A(6), "taiping", true],
      [A(6) + 0.2327, "none"],
      [A(14), "xihan"],
      [A(18), "donghan"],
      [A(18) + 0.2327, "sui"],
      [A(19), "tang"],
    ],
    mapYears: [
      [-300, "xihan"], [25, "donghan"], [220, "sanguo"], [280, "jin"], [317, "shiliu"], [439, "nanbei"], [589, "sui"], [618, "tang"],
      [763, "fanzhen"], [907, "wudai"], [960, "song"], [1127, "songjin"], [1279, "yuan"], [1368, "ming"], [1644, "qing1"], [1759, "qing2"], [1912, "none"],
    ],
  },
  dyn: [
    [-206, 220, "汉", 1],
    [220, 589, "魏晋南北朝", 0],
    [589, 618, "", 1],
    [618, 907, "唐", 1],
    [907, 960, "", 0],
    [960, 1279, "宋", 1],
    [1279, 1368, "元", 1],
    [1368, 1644, "明", 1],
    [1644, 1912, "清", 1],
    [1912, 1949, "", 0],
    [1949, 2025, "", 2],
  ],
  body: [placed[0].t0, END_T],
  ending: {
    t0: END_T,
    lines: [
      { t0: END_T + 0.1, t1: F(163.97) - 0.05, text: "两千年，跌下去 7 次", text2: "每一次，都是战乱、饥荒、瘟疫", tone: "white" },
      { t0: F(163.97), t1: F(167.43) - 0.05, text: "2022 年，第 8 次", text2: "这一次，没有灾难", tone: "white" },
      { t0: F(167.43), t1: F(170.8915) - 0.05, text: "从“只生一个”", text2: "到“不想多生”", tone: "white" },
      { t0: F(196.84), t1: MUSIC.dur, text: "人口曲线，就是历史", brush: true, tone: "gold" },
    ],
    troughs: [
      { y: 57, t: "新莽" },
      { y: 263, t: "三国" },
      { y: 639, t: "隋末" },
      { y: 760, t: "安史" },
      { y: 1290, t: "宋元" },
      { y: 1682, t: "明清" },
      { y: 1880, t: "太平天国", dx: -30 },
    ],
    card: F(198.57),
  },
  era: (y) => {
    const D: [number, string][] = [
      [-300, "西汉"], [9, "新"], [25, "东汉"], [220, "三国"], [280, "西晋"], [317, "东晋 · 十六国"], [420, "南北朝"], [589, "隋"], [618, "唐"],
      [907, "五代十国"], [960, "北宋"], [1127, "南宋 · 金"], [1279, "元"], [1368, "明"], [1644, "清"], [1912, "中华民国"], [1949, "中华人民共和国"],
    ];
    let n = D[0][1];
    for (const [a, s] of D) if (y >= a) n = s;
    return n;
  },
  kindLabel: { rec: "户口登记", est: "学者估算", stat: "国家统计局", un: "联合国预测" },
  mapOff: 1949,
  src: (y) => {
    let s = SRC_PTS[0][1];
    for (const [a, t] of SRC_PTS) if (y >= a - 1e-6) s = t;
    return s;
  },
  map: { lon: 106, lat: 35.5, zoom: 1 },
};
