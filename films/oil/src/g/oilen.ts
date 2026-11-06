// 160 Years of Oil Prices (English cut): the same timeline, music, map and effects as oil.ts, with every on-screen word
// in English for viewers outside China. No yuan-per-litre chip; a barrel is also given in US gallons; the strait in km
// and miles. Event text is laid over oil.ts's events one for one (same order, same timing).
import type { Spec } from "./specG";
import { MONTAGE, OIL, PLACED, P5 } from "./oil";

type T = { tag: string; t?: string; n?: string; s?: string; lab?: string; place?: string; src?: string; alarm?: string };
const EIA = "US EIA: US crude oil, annual average";
const EI = "Energy Institute, Statistical Review of World Energy";
const PRIZE = "Daniel Yergin, The Prize";
const EN: T[] = [
  { tag: "1859 · Pennsylvania, USA", t: "The first modern oil well. A barrel sold for", n: "$16", s: "1 barrel = 159 litres (42 US gallons)", place: "Titusville, Pennsylvania", src: EIA },
  { tag: "1861", t: "Everyone drilled, and oil fell to", n: "49¢", s: "At times the oil was worth less than its barrel", place: "Pennsylvania oil region", src: PRIZE },
  { tag: "1879 · Rockefeller", t: "Standard Oil runs 90% of US refining", s: "The first man who could steer the price", lab: "MONOPOLY", place: "Cleveland · Standard Oil", src: PRIZE },
  { tag: "1901 · Spindletop, Texas", t: "A gusher flows for 9 days, about", n: "100,000 bbl/day", s: "The Texas oil age begins", lab: "GUSHER", place: "Beaumont, Texas", src: "Texas State Historical Association" },
  { tag: "1908 · Ford Model T", t: "Cars arrive, and oil becomes fuel", s: "15 million Model Ts sold by 1927", lab: "DEMAND", place: "Detroit · Ford", src: "Ford Motor Company" },
  { tag: "1911 · US Supreme Court", t: "Standard Oil is broken up", s: "Into 34 companies", place: "Washington · Supreme Court", src: "US Supreme Court ruling" },
  { tag: "1931 · Great Depression", t: "A giant East Texas field, and oil falls to", n: "65¢", s: "At the bottom: 10¢ a barrel", place: "East Texas oil field", src: EIA },
  { tag: "August 1931 · Texas", t: "Troops shut the wells", s: "From then on, Texas set each well's output", place: "East Texas oil field", src: "Texas State Historical Association" },
  { tag: "1948 · Saudi Arabia", t: "The Ghawar oil field is discovered", s: "Still the largest oil field in the world", lab: "DISCOVERY", place: "Ghawar, Saudi Arabia", src: "Saudi Aramco" },
  { tag: "1930s–1960s", t: "Texas and 7 majors fix the price", s: "Texas sets output; for 20 years the price barely moves", lab: "PRICE SETTERS", place: "Texas" },
  { tag: "September 1960 · Baghdad", t: "5 oil producers found OPEC", s: "Tired of the oil companies cutting prices", place: "Baghdad", src: "OPEC" },
  { tag: "1970 · USA", t: "US oil output peaks", s: "Texas has no spare oil left", place: "Texas", src: "US EIA" },
  { tag: "October 1973 · Yom Kippur War", t: "Arab producers embargo the US", s: "Mideast oil: $3 → $11.65", lab: "EMBARGO", place: "Saudi Arabia · Persian Gulf", src: "Saudi Arabian Light official price" },
  { tag: "January 1974", t: "US oil climbs to", n: "$10.11", lab: "SURGE", place: "USA" },
  { tag: "1974 · USA", t: "Gas lines and odd-even rationing", place: "USA" },
  { tag: "1975 · USA", t: "The US builds an oil reserve", s: "In the next crisis, open the taps", place: "Louisiana · Strategic Reserve", src: "Energy Policy and Conservation Act" },
  { tag: "1977 · North Sea, Alaska", t: "Offshore rigs open new fields", s: "High prices forced out new oil", lab: "TECH", place: "North Sea fields" },
  { tag: "1979 · Iranian Revolution", t: "Iran's oil stops", s: "The second oil crisis", place: "Iran" },
  { tag: "April 1980", t: "Oil climbs to", n: "$39.50", s: "×10 in under 7 years", lab: "SURGE" },
  { tag: "September 1980", t: "The Iran–Iraq War begins", s: "Two oil giants bomb each other's fields", place: "Iran–Iraq border" },
  { tag: "March 1983 · New York", t: "Crude oil futures start trading", s: "From now on, the price moves every second", place: "NYMEX, New York", src: "New York Mercantile Exchange" },
  { tag: "1981–1985 · Saudi Arabia", t: "Saudi cuts and cuts to hold the price", s: "Its output cut by two-thirds", lab: "CUTS", place: "Saudi Arabia", src: EI },
  { tag: "1986 · Saudi stops cutting", t: "It opens the taps, and oil falls to", n: "$11.58", place: "Saudi Arabia" },
  { tag: "August 1990 · Iraq invades Kuwait", t: "In two months, oil climbs to", n: "$35.92", place: "Kuwait" },
  { tag: "Jan 17, 1991 · Gulf War", t: "The US strikes. In one day, oil falls", n: "33%", s: "Saudi pumps flat out and fills the gap", place: "Kuwait", src: "WTI spot price" },
  { tag: "1998 · Asian financial crisis", t: "Demand collapses, and oil falls to", n: "$11.28", s: "OPEC had just raised output", place: "Asia" },
  { tag: "March 1999", t: "OPEC cuts together", s: "A year later, oil is back at $30", lab: "CUTS", place: "Vienna · OPEC HQ" },
  { tag: "March 2003", t: "The Iraq War", place: "Iraq" },
  { tag: "2004 · OPEC", t: "Spare capacity is down to", n: "≈1.2M bbl/day", s: "The least in 30 years", place: "Saudi Arabia", src: "International Energy Agency" },
  { tag: "2002–2008 · China", t: "Of the world's new oil demand", n: "nearly 40%", s: "came from China", src: EI },
  { tag: "Feb 19, 2008", t: "Oil closes above, for the first time,", n: "$100", lab: "$100", place: "New York" },
  { tag: "Jul 3, 2008", t: "All-time high", n: "$145.29", s: "At the end of 2001, it was $17", lab: "HIGH", src: "Close; intraday high $147.27 (Jul 11)" },
  { tag: "Sep 15, 2008", t: "Lehman Brothers goes bankrupt", s: "The global financial crisis begins", lab: "CRISIS", place: "New York · Lehman Brothers" },
  { tag: "Jul → Dec 2008", t: "In under half a year, oil falls to", n: "$33.87" },
  { tag: "December 2008 · OPEC", t: "Its biggest cut ever", n: "4.2M bbl/day", s: "A year later, oil had doubled", lab: "CUTS", place: "Oran, Algeria", src: "OPEC" },
  { tag: "2011 · Arab Spring", t: "Civil war in Libya, and oil is back at", n: "$113.93", place: "Libya" },
  { tag: "2008–2014 · US shale", t: "Horizontal drilling + fracking", s: "US output up 70% in 6 years", place: "Permian Basin, Texas", src: EI },
  { tag: "Nov 27, 2014 · OPEC", t: "Saudi refuses to cut. One-day crash:", n: "10%", s: "Low prices to squeeze out shale", place: "Vienna · OPEC HQ", src: "Reuters" },
  { tag: "Feb 11, 2016", t: "Oil falls to", n: "$26.21", s: "Shale survived" },
  { tag: "December 2016", t: "OPEC brings in Russia: OPEC+", s: "They cut together", lab: "ALLIANCE", place: "Vienna", src: "OPEC" },
  { tag: "Sep 14, 2019", t: "Saudi's biggest oil plant is hit", s: "Half its output stops; oil +15% in a day", place: "Abqaiq, Saudi Arabia", src: "Reuters" },
  { tag: "March 2020 · Covid + price war", t: "Saudi and Russia fall out. One-day crash:", n: "25%", place: "Riyadh" },
  { tag: "Apr 12, 2020 · OPEC+", t: "A record cut: 9.7M bbl/day", s: "But the whole world is in lockdown", lab: "CUTS", place: "Vienna", src: "OPEC" },
  { tag: "Apr 20, 2020", t: "Oil goes negative", n: "−$37.63", s: "Storage was almost full: sellers paid buyers", place: "Cushing · biggest US oil hub", src: "The day before the May WTI contract expired" },
  { tag: "The next day", t: "Oil is back at $10", s: "Negative oil lasted one day", place: "Cushing" },
  { tag: "2021", t: "Covid fades, oil climbs back to $70", s: "OPEC+ adds only a little oil each month" },
  { tag: "Feb 24, 2022 · Russia–Ukraine war", t: "Sanctions on Russia, and oil hits", n: "$123.70", place: "Russia" },
  { tag: "Mar 31, 2022 · USA", t: "The US releases 180M barrels", s: "A record at the time", place: "US Strategic Reserve", src: "The White House" },
  { tag: "April 2023 · OPEC+", t: "A surprise cut: oil +6% in a day", lab: "CUTS", place: "OPEC+", src: "Reuters" },
  { tag: "2025 · USA", t: "Record crude output", n: "13.6M bbl/day", s: "40% more than Russia or Saudi Arabia", place: "Permian Basin, Texas", src: "US EIA" },
  { tag: "June 2025 · Israel strikes Iran", t: "A 12-day war: oil rises, then falls", s: "The Strait of Hormuz stays open", place: "Iran" },
  { tag: "December 2025 · OPEC+ adds output", t: "Oil falls to", n: "$55.27", s: "The lowest in nearly 5 years" },
  { tag: "Feb 28, 2026", t: "The US and Israel strike Iran", lab: "WAR", place: "Iran" },
  { tag: "March 2026 · Strait of Hormuz", t: "Iran closes the strait", s: "About a fifth of the world's oil passes here", lab: "CLOSED", place: "Strait of Hormuz", src: "US EIA", alarm: "HORMUZ · CLOSED" },
  { tag: "Mar 2 → 6, 2026", t: "In one week, oil soars", n: "36%", s: "The biggest weekly gain since oil futures began", lab: "SURGE", place: "Strait of Hormuz", src: "Reuters" },
  { tag: "Mar 11, 2026 · IEA", t: "Nations release 400M barrels", s: "A record, more than double 2022", place: "Paris · IEA", src: "International Energy Agency" },
  { tag: "Apr 7, 2026", t: "Oil climbs to", n: "$112.95", s: "Before the war: $67", lab: "SURGE" },
  { tag: "Apr 8, 2026", t: "US–Iran ceasefire. One-day crash:", n: "16%", place: "Strait of Hormuz" },
  { tag: "Apr 17, 2026", t: "Iran reopens the strait: another −11%", s: "Three days later, it tightened again", place: "Strait of Hormuz" },
  { tag: "June 2026", t: "Tankers pass the strait again", s: "Oil falls back to $70", place: "Strait of Hormuz" },
  { tag: "Sep–Oct 2026", t: "War again: oil back above $100", place: "Strait of Hormuz" },
  { tag: "Nov 4, 2026", t: "Markets bet on US–Iran talks: −8% in a day", n: "$88.12", place: "Washington", src: "CNBC" },
];
if (EN.length !== PLACED.length) throw new Error(`oilen: ${EN.length} texts for ${PLACED.length} events`);
const EVENTS: P5[] = PLACED.map((e, i) => ({ ...e, ...EN[i], lab: EN[i].lab, place: e.place ? EN[i].place : undefined, alarm: EN[i].alarm }));

const MONT_EN: Record<string, [string, string, string]> = {
  "1973": ["Yom Kippur War", "OIL EMBARGO", "Lines at gas stations"],
  "1991": ["Gulf War", "WELLS ON FIRE", "Kuwait"],
  "2008": ["All-time high", "$145", ""],
  "2020": ["Storage full", "−$37.63", "Sellers paid buyers"],
  "2022": ["Sanctions on Russia", "$123.70", ""],
  "2026": ["Iran war", "STRAIT CLOSED", "Hormuz"],
};
const MONTAGE_EN = MONTAGE.map((m) => ({ ...m, tag: MONT_EN[m.year][0], big: MONT_EN[m.year][1], sub: MONT_EN[m.year][2] }));

// every fixed on-screen string of the engine and of oil.ts (labels, pegs, the 2008 wire, country names)
export const I18N_EN: Record<string, string> = {
  世界的形状: "Shape of the World",
  "美元 / 桶": "USD / barrel",
  "数据：": "Data: ",
  "0 美元": "$0",
  "最窄处约 33 公里": "33 km (21 mi) at its narrowest",
  波斯湾: "Persian Gulf",
  阿拉伯海: "Arabian Sea",
  竖着钻: "Drill down",
  "拐弯，横着钻": "Turn sideways",
  压裂: "Frack",
  油出来了: "Oil flows up",
  解套: "BREAKEVEN",
  油价暴涨: "OIL SOARS",
  油价暴跌: "OIL CRASHES",
  禁运: "EMBARGO",
  战争: "WAR",
  封锁: "CLOSED",
  关税: "TARIFF",
  上涨: "RISE",
  暴跌: "CRASH",
  脱钩: "SPLIT",
  政策: "POLICY",
  转折: "TURN",
  "1 桶 = 159 升": "1 barrel = 159 litres",
  "牌价 2.57 美元": "Posted price $2.57",
  "牌价 2.97 美元": "Posted price $2.97",
  "牌价 3.56 美元": "Posted price $3.56",
  "2008 年最高 145 美元": "2008 high: $145",
  美国: "US", 俄罗斯: "Russia", 沙特: "Saudi", 伊朗: "Iran", 伊拉克: "Iraq", 委内瑞拉: "Venez.", 墨西哥: "Mexico", 科威特: "Kuwait",
  阿联酋: "UAE", 加拿大: "Canada", 中国: "China", 挪威: "Norway", 英国: "UK", 罗马尼亚: "Romania", 印尼: "Indonesia", 尼日利亚: "Nigeria",
  利比亚: "Libya", 巴西: "Brazil", 哈萨克斯坦: "Kazakh.", 卡塔尔: "Qatar", 阿尔及利亚: "Algeria", 安哥拉: "Angola", 特立尼达: "Trinidad",
  阿根廷: "Argentina", 哥伦比亚: "Colombia", 埃及: "Egypt", 阿曼: "Oman",
};

const ERA_SRC: [number, string][] = [
  [0, "US crude oil, annual average (US EIA)"],
  [1946, "WTI crude, monthly average (St. Louis Fed, FRED)"],
  [2000.64, "NYMEX WTI crude futures, close"],
];
const TROUGH: Record<string, string> = { "49 美分": "49¢", 南北战争: "Civil War", 大萧条: "Depression" };

export const OILEN: Spec & { i18n: Record<string, string>; en: true; montage: typeof MONTAGE } = {
  ...OIL,
  brand: "160 Years of Oil Prices",
  events: EVENTS,
  i18n: I18N_EN,
  en: true,
  montage: MONTAGE_EN,
  dyn: [
    [1859, 1911.4, "Rockefeller", 1],
    [1911.4, 1973.8, "Texas · Seven Sisters", 0],
    [1973.8, 1986, "OPEC", 1],
    [1986, 2014.9, "Exchange · Saudi", 2],
    [2014.9, 2026.85, "Shale · OPEC+", 1],
  ],
  ending: {
    ...OIL.ending,
    lines: [
      { ...OIL.ending.lines[0], text: "In 160-odd years, a barrel of oil", text2: "fell below zero, and hit $145" },
      { ...OIL.ending.lines[1], text: "Whoever holds the spare oil", text2: "sets the price" },
      { ...OIL.ending.lines[2], text: "Today, it hangs on one strait", text2: "33 km (21 miles) at its narrowest" },
    ],
    troughs: OIL.ending.troughs.map((x) => ({ ...x, t: TROUGH[x.t] ?? x.t })),
    credits: {
      t0: OIL.ending.credits!.t0,
      title: "Sources",
      lines: [
        "Oil: US EIA (US crude, annual average, 1859–1945)",
        "WTI monthly average (St. Louis Fed, FRED, 1946–2000)",
        "NYMEX WTI crude futures, closes and daily bars (2000–)",
        "Output: Energy Institute, Statistical Review of World Energy",
        "Events: IEA, OPEC, Reuters, CNBC and others",
        "Music: original, AI-generated (Google Lyria)",
      ],
    },
    slogan: "See how the world works",
    maker: "MakerJackie",
  },
  era: (y) => (y < 1911.4 ? "Act I · The wild years" : y < 1973.79 ? "Act II · The price setters" : y < 1986.4 ? "Act III · OPEC" : y < 2014.9 ? "Act IV · The exchange" : "Act V · Shale, OPEC+ and a strait"),
  kindLabel: { a: "US crude · annual avg", m: "WTI · monthly avg", d: "WTI futures · close", p: "" },
  cny: undefined,
  cnyFrom: undefined,
  tableTitle: "Oil output · share of world",
  tableNote: (y) => (y < 1992 ? "* Before 1992: Russian Empire / USSR" : y > 2024.5 ? "* Output: 2024 data" : undefined),
  srcEnd: "Data: US EIA, St. Louis Fed (FRED), NYMEX, Energy Institute",
  src: (y) => {
    let s = ERA_SRC[0][1];
    for (const [a, t] of ERA_SRC) if (y >= a - 1e-6) s = t;
    return s;
  },
  rewindLabel: "Rewind to 1859…",
  body: [EVENTS[0].t0, OIL.body[1]],
};
