// 2,000 Years of World Population: the English overseas cut (World7E). Same timeline, picture and sound as the overseas
// Chinese cut (WORLD_INTL in world7.ts, which keeps the 1959-61 famine); only the words change. Sources are names only.
import type { Spec } from "./spec6";
import type { Ev } from "./time6";
import { MUSIC, WORLD_INTL } from "./world7";
import { revealOf } from "./reveal7";
export { SERIES, MUSIC } from "./world7";

type T = Pick<Ev, "tag" | "t" | "n" | "s" | "src">;
const EV: Record<number, T> = {
  1: { tag: "AD 1", t: "The world", n: "230 million", s: "Fewer than Indonesia today", src: "Indonesia: UN World Population Prospects 2024, about 280 million" },
  2: { tag: "1st century", t: "Rome and Han", s: "Nearly half of humanity" },
  57: { tag: "AD 57 · China", t: "After Wang Mang's fall, Han registers", n: "21 million", s: "65% fewer than in AD 2", src: "Book of the Later Han (citing Diwang Shiji)" },
  165: { tag: "165–180 · Rome", t: "Antonine Plague", n: "5–10 million", s: "dead (est.), about one in ten" },
  166: { tag: "166", t: "First Roman envoy reaches Han China", s: "“Andun of Daqin” = Antoninus", src: "Book of the Later Han, Western Regions" },
  171: { tag: "171–185 · Han China", t: "Five epidemics strike Han China", s: "Then the Yellow Turbans rise", src: "Book of the Later Han, Annals of Emperor Ling" },
  184: { tag: "184–280 · China", t: "Yellow Turbans, then Three Kingdoms", s: "“Bones lie bare in the fields”", src: "Cao Cao, Hao Li Xing" },
  263: { tag: "Three Kingdoms · China", t: "Registered population left", n: "7.67 million", s: "86% below the Han peak" },
  300: { tag: "AD 300", t: "World population", n: "228 million", s: "Its first fall in 2,000 years" },
  311: { tag: "From 311 · China", t: "North China flees south", s: "The Yongjia catastrophe" },
  376: { tag: "From 376", t: "The Huns push west" },
  410: { tag: "410", t: "The Visigoths sack Rome" },
  476: { tag: "476", t: "The Western Roman Empire falls", s: "Europe breaks apart" },
  500: { tag: "5th–6th century · Rome", t: "The city: from about 1 million", n: "to tens of thousands" },
  541: { tag: "541–549", t: "Plague of Justinian", n: "15–100 million", s: "dead; 10,000 a day at the peak", src: "Wikipedia, List of epidemics; Procopius, History of the Wars" },
  600: { tag: "500–600 · Italy", t: "Population halved", n: "4.0 → 2.0 million", s: "HYDE estimate" },
  609: { tag: "609 · Sui China", t: "Registered", n: "46 million" },
  639: { tag: "639 · early Tang", t: "After the Sui wars, registered", n: "12.35 million" },
  660: { tag: "632–750", t: "The Arab conquests" },
  755: { tag: "755–763 · Tang", t: "An Lushan Rebellion", n: "~13 million", s: "dead (est.); registers fell 68%", src: "Wikipedia, List of wars by death toll; Tongdian" },
  800: { tag: "800", t: "World", n: "286 million", s: "Only 56 million more than in AD 1" },
  1000: { tag: "1000", t: "Medieval Warm Period", n: "323 million", s: "world population" },
  1100: { tag: "1000–1300 · Europe", t: "Population more than doubles", n: "36 → 83 million", s: "Better ploughs, more grain", src: "HYDE 3.3 (Our World in Data)" },
  1110: { tag: "1110 · Northern Song", t: "China passes 100 million", n: "~125 million", s: "Champa rice: more harvests", src: "Ge Jianxiong (ed.), History of Chinese Population; History of Song" },
  1206: { tag: "1206", t: "Genghis Khan unites the Mongols" },
  1219: { tag: "1219–1221", t: "The Mongols ride west", s: "Samarkand, Nishapur, Merv…" },
  1235: { tag: "1235 · North China", t: "The Mongol census counts only", n: "4.75 million", s: "Jin registers: 45.8 million" },
  1279: { tag: "1279", t: "The Mongol Empire", s: "Largest land empire ever" },
  1300: { tag: "1206–1368", t: "Mongol conquests", n: "20–60 million", s: "dead (estimates)", src: "Wikipedia, List of wars by death toll" },
  1346: { tag: "1346 · Black Sea", t: "Plague hits the Mongols besieging Caffa", s: "Ships carry it west" },
  1347: { tag: "1346–1353", t: "Black Death", n: "25–50 million", s: "dead (est.)", src: "Wikipedia, List of epidemics" },
  1348: { tag: "Ancient DNA", t: "The same germ as Justinian's plague", s: "Yersinia pestis, 800 years later", src: "Wagner et al., Lancet Infectious Diseases 2014; Bos et al., Nature 2011" },
  1350: { tag: "1300 → 1400 · Europe", t: "It kills 30–60% of Europe", n: "83 → 61 million", s: "HYDE estimate of Europe", src: "Death share: Wikipedia, Black Death" },
  1370: { tag: "1369–1405", t: "Timur", n: "7–17 million", s: "dead (est.)" },
  1400: { tag: "1400", t: "World population", n: "442 million", s: "Its second fall in 2,000 years" },
  1492: { tag: "1492", t: "Columbus reaches the Americas" },
  1500: { tag: "1500 · Americas", t: "Native population", n: "~60 million", s: "HYDE estimate" },
  1520: { tag: "1519–1520 · Mexico", t: "Smallpox", n: "5–8 million", s: "dead; a disease new to the Americas", src: "Wikipedia, List of epidemics" },
  1600: { tag: "1600 · Americas", t: "Down 83% in a century", n: "~10 million", s: "HYDE; some studies say 90%", src: "Koch et al., Quaternary Science Reviews 2019" },
  1610: { tag: "1501–1866", t: "The Atlantic slave trade", n: "~12.5 million", s: "shipped; 1.8 million died at sea", src: "SlaveVoyages, Trans-Atlantic Slave Trade Database" },
  1618: { tag: "1618–1648", t: "Thirty Years' War", n: "4.5–8 million", s: "dead (est.)" },
  1644: { tag: "1618–1683 · China", t: "Ming falls to Qing", n: "~25 million", s: "dead (est.)", src: "Wikipedia, List of wars by death toll" },
  1750: { tag: "The same route, the other way", t: "American crops feed the Old World", s: "Qing: 140 → 430 million, 1741–1851", src: "Qing Veritable Records; Board of Revenue registers" },
  1775: { tag: "1769–1793 · India", t: "Three great famines", n: "~10 million each", s: "Bengal, Chalisa, Doji bara (est.)", src: "Wikipedia, List of famines" },
  1796: { tag: "1796 · England", t: "Jenner's smallpox vaccine", s: "Smallpox becomes preventable", src: "WHO: Smallpox" },
  1804: { tag: "about 1804", t: "World population reaches", n: "1 billion", s: "It took 1,800 years" },
  1851: { tag: "1850–1864 · China", t: "Taiping Rebellion", n: "20–70 million", s: "dead (est.)", src: "Wikipedia, List of wars by death toll" },
  1877: { tag: "1876–1879 · North China", t: "The Great Famine", n: "9–13 million", s: "starved; India: 5.5 million more", src: "Wikipedia, List of famines" },
  1880: { tag: "1815–1933", t: "Europeans pour into the Americas", n: "~65 million", s: "left; 32 million went to the US", src: "Wikipedia, European emigration" },
  1894: { tag: "1855–1960", t: "Third plague pandemic", n: "~15 million", s: "dead; about 10 million in India", src: "Wikipedia, Third plague pandemic" },
  1900: { tag: "1900", t: "World", n: "1.63 billion" },
  1914: { tag: "1914–1918", t: "World War I", n: "15–22 million", s: "dead (est.)", src: "Wikipedia, List of wars by death toll" },
  1915: { tag: "1909–1915 · Fritz Haber", t: "Ammonia: fertilizer, explosives, poison gas", s: "Its fertilizer feeds half of us", src: "Fertilizer: Erisman et al., Nature Geoscience 2008" },
  1918: { tag: "1918–1920", t: "Spanish flu", n: "~50 million", s: "carried around the world by troops", src: "Deaths: US CDC; world population here is interpolated, short dips don't show" },
  1927: { tag: "1927", t: "World", n: "2 billion", s: "The second billion took 123 years" },
  1937: { tag: "1937–1945 · China", t: "War against Japan", n: "14–20 million", s: "Chinese dead (est.)", src: "Wikipedia, World War II casualties; official Chinese figure: 35 million casualties" },
  1939: { tag: "1939–1945", t: "World War II", n: "70–85 million", s: "dead, from Europe to the Pacific", src: "Wikipedia, World War II" },
  1941: { tag: "1941–1945 · USSR", t: "The Eastern Front", n: "20–27 million", s: "Soviet dead (est.)", src: "Wikipedia, World War II casualties" },
  1942: { tag: "1941–1945", t: "The Holocaust", n: "~6 million", s: "Jews murdered", src: "United States Holocaust Memorial Museum" },
  1944: { tag: "Found 1928, mass-produced 1943", t: "Penicillin", s: "Wounded soldiers survive" },
  1945: { tag: "1939–1945", t: "The dead, as a share of the world", n: "~3%", s: "one in every 30-odd people", src: "Wikipedia, World War II: about 3% of the 1940 world (2.3 billion)" },
  1945.6: { tag: "1939–1945", t: "Yet in those 6 years the world grew by", n: "110 million", s: "Births still outnumbered deaths", src: "Gapminder (Our World in Data): 2.27 → 2.39 billion" },
  1946: { tag: "From the 1940s", t: "Antibiotics and vaccines spread", s: "Death rates plunge" },
  1950: { tag: "1950", t: "World", n: "2.5 billion" },
  1955: { tag: "1950 → 2023", t: "Life expectancy", n: "46 → 73 years", src: "Our World in Data (UN WPP 2024)" },
  1959: { tag: "1959–1961 · China", t: "Three Years of Difficulty", n: "−10 million", s: "China's population fell in 1960", src: "National Bureau of Statistics of China" },
  1960: { tag: "1960", t: "", n: "3 billion" },
  1963: { tag: "1963", t: "Fastest growth: in one year", n: "+70 million", s: "2.2% a year" },
  1970: { tag: "1960s–1970s", t: "Green Revolution: seeds and fertilizer", s: "The predicted famine never came" },
  1974: { tag: "1974", t: "", n: "4 billion" },
  1981: { tag: "From 1981", t: "HIV/AIDS", n: "~42.3 million", s: "dead, to 2023", src: "UNAIDS 2024" },
  1987: { tag: "1987", t: "", n: "5 billion" },
  1990: { tag: "1950 → 2023", t: "Children who die before 5", n: "23% → 3.6%", src: "Our World in Data (UN IGME)" },
  1999: { tag: "1999", t: "", n: "6 billion" },
  2011: { tag: "2011", t: "", n: "7 billion" },
  2020: { tag: "2020–2021", t: "COVID-19", n: "~14.9 million", s: "excess deaths (WHO)" },
  2022: { tag: "15 November 2022", t: "World population", n: "8 billion", s: "The last billion took 11 years" },
  2023: { tag: "2023", t: "India passes China", s: "Now the most populous country" },
  2024: { tag: "2024", t: "Global fertility", n: "2.25", s: "Over 5 in the 1960s" },
  2084: { tag: "UN projection · 2084", t: "Peak", n: "~10.3 billion" },
  2100: { tag: "UN projection · 2100", t: "Falling", n: "~10.2 billion", s: "China ~630M, Nigeria ~480M", src: "UN World Population Prospects 2024, medium variant" },
};
const COLD: Record<string, [string, string]> = {
  安东尼瘟疫: ["Antonine Plague", "5–10 million dead"],
  查士丁尼瘟疫: ["Plague of Justinian", "tens of millions dead"],
  蒙古征服: ["Mongol conquests", "20–60 million dead"],
  黑死病: ["Black Death", "30–60% of Europe dead"],
  美洲天花: ["Smallpox in the Americas", "Americas −83%"],
  三十年战争: ["Thirty Years' War", "4.5–8 million dead"],
  太平天国: ["Taiping Rebellion", "20–70 million dead"],
  两次世界大战: ["Two World Wars", "about 100 million dead"],
};
const ERA: Record<string, string> = {
  "第一幕 · 帝国与瘟疫": "Act I · Empires and plagues",
  "第二幕 · 草原与黑死病": "Act II · The steppe and the Black Death",
  "第三幕 · 一条航线": "Act III · One sea route",
  "第四幕 · 机器与战争": "Act IV · Machines and war",
  "第五幕 · 爆炸与转折": "Act V · Explosion and turn",
};
const SRC: Record<string, string> = {
  "HYDE 3.3 历史估算（Our World in Data），每百年一个数": "HYDE 3.3 estimate (Our World in Data), one value per century",
  "HYDE 3.3 历史估算（Our World in Data），每十年一个数": "HYDE 3.3 estimate (Our World in Data), one value per decade",
  "Gapminder 估算（Our World in Data）": "Gapminder estimate (Our World in Data)",
  "联合国《世界人口展望 2024》": "UN World Population Prospects 2024",
  "联合国《世界人口展望 2024》中方案 · 预测": "UN World Population Prospects 2024, medium · projection",
};
const COUNTRY: Record<string, string> = {
  中国: "China", 印度: "India", 美国: "USA", 俄罗斯: "Russia", 日本: "Japan", 印尼: "Indonesia", 法国: "France", 德国: "Germany",
  意大利: "Italy", 土耳其: "Turkey", 埃及: "Egypt", 伊朗: "Iran", 英国: "UK", 西班牙: "Spain", 墨西哥: "Mexico", 巴西: "Brazil",
  巴基斯坦: "Pakistan", 孟加拉国: "Bangladesh", 尼日利亚: "Nigeria", 埃塞俄比亚: "Ethiopia", "刚果（金）": "DR Congo",
};
const I18N: Record<string, string> = {
  世界的形状: "Shape of the World", "回到两千年前……": "Back 2,000 years…", 公元: "AD", 联合国预测: "Projection", 预测: "Projected",
  减少: "Decline", 统计: "Count", 增长: "Growth", 战乱: "War", 崩塌: "Collapse", 瘟疫: "Plague", 饥荒: "Famine", 分裂: "Split",
  统一: "Empire", 迁徙: "Migration", 政策: "Change", 转折: "Turn", 人口激增: "Boom", 人口减少: "Decline", 人口崩塌: "Collapse",
  倒回: "Rewind", "数据：": "Data: ", 实际: "Actual", 疆域示意: "Approximate borders",
  // map labels
  东哥特: "Ostrogoths", 东晋: "Eastern Jin", 东汉: "Eastern Han", 东罗马: "Eastern Rome", 伊尔汗国: "Ilkhanate", 俄国: "Russia", 元: "Yuan",
  匈人: "Huns", 匈奴: "Xiongnu", 北宋: "Northern Song", 北魏: "Northern Wei", 十六国: "Sixteen Kingdoms", 南宋: "Southern Song",
  南朝: "Southern Dynasties", 印加: "Inca", 吐蕃: "Tibetan Empire", 唐: "Tang", 回鹘: "Uyghur Khaganate", 基辅罗斯: "Kievan Rus'",
  塞尔柱: "Seljuks", 奥斯曼: "Ottomans", 安息: "Parthia", 察合台汗国: "Chagatai Khanate", 巴西: "Brazil", 帖木儿: "Timurids",
  德里: "Delhi Sultanate", 拜占庭: "Byzantium", 明: "Ming", 查理曼帝国: "Carolingians", 汉: "Han", 汪达尔: "Vandals", 法兰克: "Franks",
  法蒂玛: "Fatimids", 清: "Qing", 神圣罗马: "Holy Roman Empire", 笈多: "Gupta", 罗马: "Rome", "罗马 · 四帝共治": "Rome · Tetrarchy",
  美国: "USA", 英属印度: "British India", 莫卧儿: "Mughals", 莫斯科: "Muscovy", 萨法维: "Safavids", 萨珊波斯: "Sasanian Persia",
  蒙古: "Mongols", 西哥特: "Visigoths", 西夏: "Western Xia", 西属秘鲁: "Spanish Peru", 西属美洲: "Spanish America", 西晋: "Western Jin",
  西罗马: "Western Rome", 西辽: "Qara Khitai", 辽: "Liao", 金: "Jin", 金帐汗国: "Golden Horde", 阿兹特克: "Aztecs",
  阿拉伯帝国: "Arab Caliphate", 阿拔斯: "Abbasids", 马拉塔: "Marathas", 马穆鲁克: "Mamluks",
};

const W0 = WORLD_INTL.WORLD;
const must = <V,>(m: Record<string, V>, k: string, what: string): V => {
  if (m[k] === undefined) throw new Error(`world7e: no English for ${what} "${k}"`);
  return m[k];
};
const events = W0.events.map((e) => {
  const o = EV[e.y];
  if (!o) throw new Error(`world7e: no English card for ${e.y}`);
  return { ...e, tag: o.tag, t: o.t, n: o.n, s: o.s, src: o.src };
});
export const REVEALS = events.map((e) => ({ k: e.k, big: !!e.big, y: e.y, ...revealOf(e, MUSIC.beats) }));
const EL = W0.ending.lines;
export const WORLD: Spec = {
  ...W0,
  lang: "en",
  i18n: I18N,
  brand: "2,000 Years of World Population",
  events,
  cold: {
    ...W0.cold,
    crashes: W0.cold.crashes.map((c) => {
      const [t, p] = must(COLD, c.t, "cold crash");
      return { ...c, t, p };
    }),
    lines: W0.cold.lines.map((l) => ({ ...l, a: "Plague. War. Famine.", b: "What will make it fall next time?" })),
    promise: "One line: the rise and fall of humankind",
    start: "AD 1",
  },
  dyn: (W0.dyn ?? []).map(([a, b, n, k]) => [a, b, n ? must({ 古代: "Ancient", 中世纪: "Medieval", 近代: "Modern" }, n, "era band") : n, k] as [number, number, string, 0 | 1 | 2]),
  ending: {
    ...W0.ending,
    lines: [
      { ...EL[0], text: "In 2,000 years, the world shrank only twice", text2: "Both times: plague and war" },
      { ...EL[1], text: "Projected: after 2084, a third time", text2: "This time, no catastrophe" },
      { ...EL[2], text: "Global fertility: from 5 children", text2: "down to 2.25" },
      { ...EL[3], text: "For the first time,\nhumanity chooses to shrink" },
    ],
    troughs: W0.ending.troughs.map((tr) => ({ ...tr, t: must({ "罗马危机 · 三国": "Rome's crisis · Three Kingdoms", 黑死病: "Black Death" }, tr.t, "trough") })),
    credits: {
      t0: W0.ending.credits!.t0,
      title: "Sources",
      lines: [
        "World population: HYDE 3.3, Gapminder",
        "UN World Population Prospects 2024",
        "Countries: HYDE 3.3, Maddison Project",
        "Ancient China: registers; Ge Jianxiong (ed.)",
        "Death tolls: published estimates, as ranges",
        "Music: original, AI-generated (Google Lyria)",
      ],
    },
    slogan: "See how the world works",
  },
  era: (y) => must(ERA, W0.era(y), "act"),
  kindLabel: { rec: "Records", est: "Estimate (HYDE)", stat: "UN statistics", un: "UN projection" },
  srcEnd: "Data: HYDE 3.3, Gapminder (Our World in Data), Maddison Project, UN World Population Prospects 2024",
  src: (y) => must(SRC, W0.src!(y), "source"),
  tableTitle: "Most populous countries · today's borders",
  tableNote: (y) => (y < 1600 ? "* India before 1600: no records, scholars' estimate" : undefined),
  table: (y) => W0.table!(y).map((r) => ({ ...r, n: must(COUNTRY, r.n, "country"), tag: r.tag === "在册" ? "reg." : r.tag })),
};
