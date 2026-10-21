/**
 * 《财富堆成的山》数据集：中国住户财富与收入分布。
 *
 * 主结构：9 层财富金字塔（14 亿人），脊柱为 WID 全国财富份额
 * （前 10%≈68%、中间 40%≈25.6%、后 50%≈6.4%、前 1%≈30.6%），
 * 顶端三层为胡润实测户数，总量锚为社科院居民部门净财富 512.6 万亿元（2019）。
 *
 * ⚠️ 诚实标注：④⑥⑦⑧层的份额拆分与全部「人均净资产」列为建模推算
 * （按 WID 总份额以合理斜率切分），不是任何单一报告的原始数字；
 * ①②③层户数为胡润实测，但其份额同为建模估计。多来源拼接口径年份不一
 * （央行城镇 2019 / 统计局 2023 / 胡润 2025 / WID 近年），ⓘ 面板必须声明。
 */

export type WealthLayer = {
  id: string
  /** 人数占比（0-1） */
  populationShare: number
  /** 占全国财富份额（0-1，建模值） */
  wealthShare: number
  /** 人均净资产（万元，建模推算，仅供视觉比例） */
  perCapitaWealthWan: number
  /** 层内典型资产构成（组件 tx 翻译键用的短 id，不存中文） */
  assetKind: 'equity' | 'multi-property' | 'property-finance' | 'property-mixed' | 'urban-property' | 'one-home' | 'county-home' | 'rural' | 'none'
  /** 该层人数（亿） */
  people: number
  /** 数据来源标注 id（ⓘ 用） */
  sourceKind: 'hurun' | 'wid-hurun' | 'wid' | 'wid-model' | 'pbc-model' | 'nbs'
}

/** 全国总人口按 14 亿、家庭约 4.9 亿户建模；净财富总量 512.6 万亿（社科院 2019） */
export const TOTAL_NET_WEALTH = 512.6
export const TOTAL_POPULATION_YI = 14

export const WEALTH_LAYERS: Array<WealthLayer> = [
  { id: 'summit', populationShare: 0.0003, wealthShare: 0.04, perCapitaWealthWan: 5126, assetKind: 'equity', people: 0.004, sourceKind: 'hurun' }, // ① 亿元家庭 12.6 万户（胡润实测）
  { id: 'ten-million', populationShare: 0.004, wealthShare: 0.1, perCapitaWealthWan: 1281, assetKind: 'multi-property', people: 0.06, sourceKind: 'hurun' }, // ② 千万–亿元 188 万户
  { id: 'six-million', populationShare: 0.007, wealthShare: 0.08, perCapitaWealthWan: 586, assetKind: 'property-finance', people: 0.1, sourceKind: 'hurun' }, // ③ 600–1,000 万 306 万户
  { id: 'top1-rest', populationShare: 0.0027, wealthShare: 0.086, perCapitaWealthWan: 400, assetKind: 'property-finance', people: 0.004, sourceKind: 'wid-hurun' }, // ④ 前 1% 夹心（拼接）
  { id: 'top9', populationShare: 0.09, wealthShare: 0.374, perCapitaWealthWan: 150, assetKind: 'urban-property', people: 1.26, sourceKind: 'wid' }, // ⑤ 前 1%–10%
  { id: 'upper-mid', populationShare: 0.2, wealthShare: 0.16, perCapitaWealthWan: 41, assetKind: 'one-home', people: 2.8, sourceKind: 'wid-model' }, // ⑥ 前 10%–30%
  { id: 'mid', populationShare: 0.2, wealthShare: 0.1, perCapitaWealthWan: 25, assetKind: 'county-home', people: 2.8, sourceKind: 'wid-model' }, // ⑦ 前 30%–50%
  { id: 'lower-mid', populationShare: 0.3, wealthShare: 0.055, perCapitaWealthWan: 9, assetKind: 'rural', people: 4.2, sourceKind: 'wid-model' }, // ⑧ 后 50% 上半
  { id: 'base', populationShare: 0.177, wealthShare: 0.015, perCapitaWealthWan: 3, assetKind: 'none', people: 2.4, sourceKind: 'pbc-model' }, // ⑨ 底座后 20%
]

/** 收入五等份（统计局，元/人/年，全体居民，零拼接备选结构） */
export const INCOME_QUINTILES: Array<{ year: number; groups: [number, number, number, number, number] }> = [
  { year: 2015, groups: [5221, 11894, 19320, 29437, 54544] },
  { year: 2020, groups: [7869, 16443, 26249, 41172, 80294] },
  { year: 2023, groups: [9215, 20442, 32195, 50220, 95055] },
]

/** 央行 2019 城镇家庭资产负债调查（仅城镇口径，最权威微观数据） */
export const PBC_URBAN_2019 = {
  meanTotalAssetsWan: 317.9, // 户均总资产
  medianTotalAssetsWan: 163.0,
  meanNetAssetsWan: 289.0,
  bottom20Share: 0.026, // 最低 20% 资产份额
  top10Share: 0.475, // 最高 10% 资产份额
  top1NetShare: 0.171, // 净资产最高 1% 份额
  housingShare: 0.591, // 住房占总资产
  homeOwnership: 0.96, // 住房拥有率
  debtParticipation: 0.565, // 负债参与率
  mortgageShareOfDebt: 0.759, // 房贷占负债
} as const

/** 高净值实测（胡润 2025，截至 2025-01-01） */
export const HURUN_2025 = {
  sixMwWanHouseholds: 506, // 600 万资产家庭，万户
  tenMwWanHouseholds: 200.5, // 千万资产家庭，万户
  hundredMwWanHouseholds: 12.6, // 亿元资产家庭，万户
} as const

/** 国际对标（WID / UBS） */
export const GLOBAL_BENCHMARKS = {
  chinaTop10Share: 0.68, // WID
  chinaBottom50Share: 0.064,
  chinaTop1Share: 0.306,
  usTop1ShareUbs: 0.342, // UBS GWR2023
  chinaTop1ShareUbs: 0.311,
} as const

/** 统计局 2023 低收入组人均可支配收入（元/年） */
export const LOW_INCOME_GROUP_2023 = 9215
