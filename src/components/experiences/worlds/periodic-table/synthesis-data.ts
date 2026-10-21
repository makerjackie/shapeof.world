import type { SynthesisReaction } from './synthesis-graphic'
import type { ElementPhoto } from './photo-data'

/** Representative, published fusion-evaporation channels; not universal discovery claims. */
export const synthesisReactions: Record<string, SynthesisReaction> = {
  "Md": {
    "symbol": "Md",
    "beam": {
      "symbol": "He",
      "mass": 4,
      "protons": 2
    },
    "target": {
      "symbol": "Es",
      "mass": 253,
      "protons": 99
    },
    "product": {
      "symbol": "Md",
      "mass": 256,
      "protons": 101
    },
    "neutrons": 1,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, chapter 8, table 8-2",
    "context": "伯克利，1955 年",
    "contextEn": "Berkeley, 1955"
  },
  "No": {
    "symbol": "No",
    "beam": {
      "symbol": "Ca",
      "mass": 48,
      "protons": 20
    },
    "target": {
      "symbol": "Pb",
      "mass": 208,
      "protons": 82
    },
    "product": {
      "symbol": "No",
      "mass": 254,
      "protons": 102
    },
    "neutrons": 2,
    "sourceUrl": "https://meetings-archive.aps.org/haw/2023/l04/7/",
    "sourceTitle": "Water Coordination Chemistry of Nobelium and Lawrencium, APS 2023, Mallory McCarthy (LBNL)",
    "context": "伯克利，2023 年实验报告",
    "contextEn": "Berkeley, reported in 2023"
  },
  "Lr": {
    "symbol": "Lr",
    "beam": {
      "symbol": "Ca",
      "mass": 48,
      "protons": 20
    },
    "target": {
      "symbol": "Bi",
      "mass": 209,
      "protons": 83
    },
    "product": {
      "symbol": "Lr",
      "mass": 255,
      "protons": 103
    },
    "neutrons": 2,
    "sourceUrl": "https://meetings-archive.aps.org/haw/2023/l04/7/",
    "sourceTitle": "Water Coordination Chemistry of Nobelium and Lawrencium, APS 2023, Mallory McCarthy (LBNL)",
    "context": "伯克利，2023 年实验报告",
    "contextEn": "Berkeley, reported in 2023"
  },
  "Rf": {
    "symbol": "Rf",
    "beam": {
      "symbol": "C",
      "mass": 12,
      "protons": 6
    },
    "target": {
      "symbol": "Cf",
      "mass": 249,
      "protons": 98
    },
    "product": {
      "symbol": "Rf",
      "mass": 257,
      "protons": 104
    },
    "neutrons": 4,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, table 8-2",
    "context": "伯克利，1969 年",
    "contextEn": "Berkeley, 1969"
  },
  "Db": {
    "symbol": "Db",
    "beam": {
      "symbol": "N",
      "mass": 15,
      "protons": 7
    },
    "target": {
      "symbol": "Cf",
      "mass": 249,
      "protons": 98
    },
    "product": {
      "symbol": "Db",
      "mass": 260,
      "protons": 105
    },
    "neutrons": 4,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, table 8-2",
    "context": "伯克利，1970 年",
    "contextEn": "Berkeley, 1970"
  },
  "Sg": {
    "symbol": "Sg",
    "beam": {
      "symbol": "O",
      "mass": 18,
      "protons": 8
    },
    "target": {
      "symbol": "Cf",
      "mass": 249,
      "protons": 98
    },
    "product": {
      "symbol": "Sg",
      "mass": 263,
      "protons": 106
    },
    "neutrons": 4,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, table 8-2",
    "context": "伯克利与利弗莫尔合作，1974 年",
    "contextEn": "Berkeley–Livermore collaboration, 1974"
  },
  "Bh": {
    "symbol": "Bh",
    "beam": {
      "symbol": "Cr",
      "mass": 54,
      "protons": 24
    },
    "target": {
      "symbol": "Bi",
      "mass": 209,
      "protons": 83
    },
    "product": {
      "symbol": "Bh",
      "mass": 262,
      "protons": 107
    },
    "neutrons": 1,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, table 8-2",
    "context": "GSI，1981 年",
    "contextEn": "GSI, 1981"
  },
  "Hs": {
    "symbol": "Hs",
    "beam": {
      "symbol": "Fe",
      "mass": 58,
      "protons": 26
    },
    "target": {
      "symbol": "Pb",
      "mass": 208,
      "protons": 82
    },
    "product": {
      "symbol": "Hs",
      "mass": 265,
      "protons": 108
    },
    "neutrons": 1,
    "sourceUrl": "https://www2.lbl.gov/abc/wallchart/chapters/08/0.html",
    "sourceTitle": "Berkeley Lab nuclear science wallchart, table 8-2",
    "context": "GSI，1984 年",
    "contextEn": "GSI, 1984"
  },
  "Mt": {
    "symbol": "Mt",
    "beam": {
      "symbol": "Fe",
      "mass": 58,
      "protons": 26
    },
    "target": {
      "symbol": "Bi",
      "mass": 209,
      "protons": 83
    },
    "product": {
      "symbol": "Mt",
      "mass": 266,
      "protons": 109
    },
    "neutrons": 1,
    "sourceUrl": "https://www.nndc.bnl.gov/ensnds/266/Mt/adopted.pdf",
    "sourceTitle": "GSI: Elements 107–109; NNDC ENSDF: Mt-266",
    "context": "德国达姆施塔特 GSI，1982 年",
    "contextEn": "GSI Helmholtz Centre for Heavy Ion Research, Darmstadt, Germany, 1982"
  },
  "Ds": {
    "symbol": "Ds",
    "beam": {
      "symbol": "Ni",
      "mass": 62,
      "protons": 28
    },
    "target": {
      "symbol": "Pb",
      "mass": 208,
      "protons": 82
    },
    "product": {
      "symbol": "Ds",
      "mass": 269,
      "protons": 110
    },
    "neutrons": 1,
    "sourceUrl": "https://www.gsi.de/work/forschung/nustarenna/nustarenna_divisions/she_physik/research/super_heavy_elements/element_110",
    "sourceTitle": "GSI: Element 110",
    "context": "德国达姆施塔特 GSI，1994 年",
    "contextEn": "GSI Helmholtz Centre for Heavy Ion Research, Darmstadt, Germany, 1994"
  },
  "Rg": {
    "symbol": "Rg",
    "beam": {
      "symbol": "Ni",
      "mass": 64,
      "protons": 28
    },
    "target": {
      "symbol": "Bi",
      "mass": 209,
      "protons": 83
    },
    "product": {
      "symbol": "Rg",
      "mass": 272,
      "protons": 111
    },
    "neutrons": 1,
    "sourceUrl": "https://www.gsi.de/work/forschung/nustarenna/nustarenna_divisions/she_physik/research/super_heavy_elements/element_111",
    "sourceTitle": "GSI: Element 111",
    "context": "德国达姆施塔特 GSI，1994 年",
    "contextEn": "GSI Helmholtz Centre for Heavy Ion Research, Darmstadt, Germany, 1994"
  },
  "Cn": {
    "symbol": "Cn",
    "beam": {
      "symbol": "Zn",
      "mass": 70,
      "protons": 30
    },
    "target": {
      "symbol": "Pb",
      "mass": 208,
      "protons": 82
    },
    "product": {
      "symbol": "Cn",
      "mass": 277,
      "protons": 112
    },
    "neutrons": 1,
    "sourceUrl": "https://www.gsi.de/work/forschung/nustarenna/nustarenna_divisions/she_physik/research/super_heavy_elements/element_112?C=1",
    "sourceTitle": "GSI: Element 112",
    "context": "德国达姆施塔特 GSI，1996 年",
    "contextEn": "GSI Helmholtz Centre for Heavy Ion Research, Darmstadt, Germany, 1996"
  },
  "Nh": {
    "symbol": "Nh",
    "beam": {
      "symbol": "Zn",
      "mass": 70,
      "protons": 30
    },
    "target": {
      "symbol": "Bi",
      "mass": 209,
      "protons": 83
    },
    "product": {
      "symbol": "Nh",
      "mass": 278,
      "protons": 113
    },
    "neutrons": 1,
    "sourceUrl": "https://www.riken.jp/en/news_pubs/research_news/pr/2012/20120927/",
    "sourceTitle": "RIKEN: Search for element 113 concluded at last",
    "context": "日本和光市 RIKEN 仁科加速器科学研究中心，2012 年",
    "contextEn": "RIKEN Nishina Center for Accelerator-Based Science, Wako, Japan, 2012"
  },
  "Fl": {
    "symbol": "Fl",
    "beam": {
      "symbol": "Ca",
      "mass": 48,
      "protons": 20
    },
    "target": {
      "symbol": "Pu",
      "mass": 244,
      "protons": 94
    },
    "product": {
      "symbol": "Fl",
      "mass": 288,
      "protons": 114
    },
    "neutrons": 4,
    "sourceUrl": "https://www.nndc.bnl.gov/discovery/abstracts/114/288.pdf",
    "sourceTitle": "NNDC / FRIB Discovery of Nuclides: Fl-288",
    "context": "俄罗斯杜布纳 JINR 弗廖罗夫核反应实验室，与 LLNL 合作，2004 年",
    "contextEn": "Flerov Laboratory of Nuclear Reactions, JINR, Dubna, Russia; JINR–LLNL collaboration, 2004"
  },
  "Mc": {
    "symbol": "Mc",
    "beam": {
      "symbol": "Ca",
      "mass": 48,
      "protons": 20
    },
    "target": {
      "symbol": "Am",
      "mass": 243,
      "protons": 95
    },
    "product": {
      "symbol": "Mc",
      "mass": 288,
      "protons": 115
    },
    "neutrons": 3,
    "sourceUrl": "https://www.jinr.ru/posts/first-experiment-launched-at-the-superheavy-element-factory/",
    "sourceTitle": "JINR: First experiment launched at the Superheavy Element Factory",
    "context": "俄罗斯杜布纳 JINR 超重元素工厂，2020 年",
    "contextEn": "Flerov Laboratory of Nuclear Reactions, JINR Superheavy Element Factory, Dubna, Russia, 2020"
  },
  "Lv": {
    "symbol": "Lv",
    "beam": {
      "symbol": "Ti",
      "mass": 50,
      "protons": 22
    },
    "target": {
      "symbol": "Pu",
      "mass": 244,
      "protons": 94
    },
    "product": {
      "symbol": "Lv",
      "mass": 290,
      "protons": 116
    },
    "neutrons": 4,
    "sourceUrl": "https://arxiv.org/abs/2407.16079",
    "sourceTitle": "Gates et al.: Production of Livermorium with titanium-50",
    "context": "美国劳伦斯伯克利国家实验室及国际合作团队，2024 年",
    "contextEn": "Lawrence Berkeley National Laboratory, Berkeley, USA, with international collaborators, 2024"
  },
  "Og": {
    "symbol": "Og",
    "beam": {
      "symbol": "Ca",
      "mass": 48,
      "protons": 20
    },
    "target": {
      "symbol": "Cf",
      "mass": 249,
      "protons": 98
    },
    "product": {
      "symbol": "Og",
      "mass": 294,
      "protons": 118
    },
    "neutrons": 3,
    "sourceUrl": "https://www.nndc.bnl.gov/discovery/abstracts/118/294.pdf",
    "sourceTitle": "NNDC / FRIB Discovery of Nuclides: Og-294; LLNL experiment account",
    "context": "俄罗斯杜布纳 JINR，与美国 LLNL 合作，2005 年",
    "contextEn": "Flerov Laboratory of Nuclear Reactions, JINR, Dubna, Russia; JINR–LLNL collaboration, 2005"
  }
}

export const synthesisAssets: Record<string,string> = {
  "Md": "/assets/worlds/periodic-table/synthesis/Md.svg",
  "No": "/assets/worlds/periodic-table/synthesis/No.svg",
  "Lr": "/assets/worlds/periodic-table/synthesis/Lr.svg",
  "Rf": "/assets/worlds/periodic-table/synthesis/Rf.svg",
  "Db": "/assets/worlds/periodic-table/synthesis/Db.svg",
  "Sg": "/assets/worlds/periodic-table/synthesis/Sg.svg",
  "Bh": "/assets/worlds/periodic-table/synthesis/Bh.svg",
  "Hs": "/assets/worlds/periodic-table/synthesis/Hs.svg",
  "Mt": "/assets/worlds/periodic-table/synthesis/Mt.svg",
  "Ds": "/assets/worlds/periodic-table/synthesis/Ds.svg",
  "Rg": "/assets/worlds/periodic-table/synthesis/Rg.svg",
  "Cn": "/assets/worlds/periodic-table/synthesis/Cn.svg",
  "Nh": "/assets/worlds/periodic-table/synthesis/Nh.svg",
  "Fl": "/assets/worlds/periodic-table/synthesis/Fl.svg",
  "Mc": "/assets/worlds/periodic-table/synthesis/Mc.svg",
  "Lv": "/assets/worlds/periodic-table/synthesis/Lv.svg",
  "Og": "/assets/worlds/periodic-table/synthesis/Og.svg"
}

export const synthesisImages: Record<string,ElementPhoto> = Object.fromEntries(Object.values(synthesisReactions).map(r=>[r.symbol,{
 src:synthesisAssets[r.symbol],kind:'diagram',
 caption:'根据实验记录绘制的核合成示意。大小、颜色与时间为示意，非元素实拍。',
 captionEn:'Nuclear synthesis drawn from an experiment record. Size, colour and time are schematic; this is not a specimen photograph.',
 credit:'Shape of the World',license:'CC BY-NC 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc/4.0/',sourceUrl:r.sourceUrl,
}]))
