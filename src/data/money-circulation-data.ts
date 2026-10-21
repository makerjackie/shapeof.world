/**
 * 《钱的大循环》数据集：中国宏观经济五部门循环（单位：万亿元人民币，名义值，当年价格）。
 *
 * 部门：住户 households · 企业 firms（含非金融企业与金融机构经营口径的简化）
 * · 政府 government · 金融机构 banks · 国外 abroad。
 * 每条流量是"一年内从 from 部门流向 to 部门的钱"，锚点年份之间由组件线性插值。
 *
 * 口径与来源（2021 / 2022 为官方锚点）：
 * - 居民消费、政府消费、资本形成、净出口：国家统计局支出法 GDP，《中国统计年鉴 2023》表3-10/3-11。
 * - 劳动者报酬、生产税净额、社保缴款/福利、实物社会转移、分部门资本形成：
 *   资金流量表（实物交易），年鉴2023/2024 表3-15（官方滞后约 2 年，最新公开为 2022 年表）。
 * - 住户存款/贷款、企事业单位贷款、政府债券净融资：中国人民银行年度金融统计与社融报告。
 * - 进出口（GDP 口径）：年鉴2023 表3-10。
 *
 * 简化与估算（已在 ⓘ 面板文案声明）：
 * - 劳动者报酬拆分为 企业→住户（wages，含金融机构付薪 36.9，2022）与 政府→住户（govWages，10.7，2022）；
 *   住户部门自雇报酬（15.9，2022）属部门内部，不入图。
 * - firmTax = 生产税净额（企业缴纳）+ 企业所得税；hhTax = 个人所得税 + 社保缴款；
 *   govTransfers = 社保福利 + 实物社会转移；govPurchases = 政府消费 − 公共部门劳动报酬。
 * - 2000 / 2010 / 2015 / 2020 四个锚点：支出法分项为官方值；部门间流量（wages、hhTax 等）
 *   官方资金流量表未逐年覆盖，按占 GDP 比例估算（标注「估算」），用于时间轴演示。
 * - 金融部门内部"存款→贷款→派生存款"循环、资本账户流动未展开（属金融交易表口径）。
 */

export type SectorId = 'households' | 'firms' | 'government' | 'banks' | 'abroad'

export type FlowId =
  | 'wages' // 企业→住户：劳动者报酬（企业部门付薪）
  | 'consumption' // 住户→企业：居民消费
  | 'hhTax' // 住户→政府：个税与社保缴款
  | 'govTransfers' // 政府→住户：社保福利与实物社会转移
  | 'firmTax' // 企业→政府：生产税净额与企业所得税
  | 'govPurchases' // 政府→企业：政府购买与补贴
  | 'hhDeposits' // 住户→金融：住户新增存款
  | 'hhLoans' // 金融→住户：住户新增贷款（房贷等）
  | 'firmLoans' // 金融→企业：企事业单位新增贷款
  | 'exports' // 国外→企业：出口货款流入（GDP 口径）
  | 'imports' // 企业→国外：进口货款流出（GDP 口径）
  | 'firmInvestment' // 企业→企业：资本形成（自循环）
  | 'govWages' // 政府→住户：公共部门劳动报酬
  | 'govBonds' // 金融→政府：政府债券净融资

export type FlowEndpoints = { from: SectorId; to: SectorId }

export const FLOW_ENDPOINTS: Record<FlowId, FlowEndpoints> = {
  wages: { from: 'firms', to: 'households' },
  consumption: { from: 'households', to: 'firms' },
  hhTax: { from: 'households', to: 'government' },
  govTransfers: { from: 'government', to: 'households' },
  firmTax: { from: 'firms', to: 'government' },
  govPurchases: { from: 'government', to: 'firms' },
  hhDeposits: { from: 'households', to: 'banks' },
  hhLoans: { from: 'banks', to: 'households' },
  firmLoans: { from: 'banks', to: 'firms' },
  exports: { from: 'abroad', to: 'firms' },
  imports: { from: 'firms', to: 'abroad' },
  firmInvestment: { from: 'firms', to: 'firms' },
  govWages: { from: 'government', to: 'households' },
  govBonds: { from: 'banks', to: 'government' },
}

export const FLOW_IDS: Array<FlowId> = [
  'wages',
  'consumption',
  'hhTax',
  'govTransfers',
  'firmTax',
  'govPurchases',
  'hhDeposits',
  'hhLoans',
  'firmLoans',
  'exports',
  'imports',
  'firmInvestment',
  'govWages',
  'govBonds',
]

/** 某部门一年的"过水量"（流入+流出之和），驱动水库水位与发光强度 */
export type CirculationYear = {
  year: number
  /** 名义 GDP，万亿元（支出法，年鉴修订序列） */
  gdp: number
  flows: Record<FlowId, number>
}

export const CIRCULATION_ANCHORS: Array<CirculationYear> = [
  {
    year: 2000,
    gdp: 9.98,
    flows: {
      wages: 5.2, // 估算
      consumption: 4.69, // 官方
      hhTax: 0.6, // 估算
      govTransfers: 1.0, // 估算
      firmTax: 1.1, // 估算
      govPurchases: 0.8, // 估算（政府消费 1.69 − 公共劳动报酬）
      hhDeposits: 0.5, // 估算
      hhLoans: 0.1, // 估算
      firmLoans: 0.6, // 估算
      exports: 2.1, // 估算（净出口 0.24 官方）
      imports: 1.9, // 估算
      firmInvestment: 2.3, // 估算（资本形成 3.37 官方）
      govWages: 0.9, // 估算
      govBonds: 0.2, // 估算
    },
  },
  {
    year: 2010,
    gdp: 40.85,
    flows: {
      wages: 21.2,
      consumption: 14.15,
      hhTax: 2.7,
      govTransfers: 4.5,
      firmTax: 4.5,
      govPurchases: 2.4,
      hhDeposits: 4.3,
      hhLoans: 2.9,
      firmLoans: 5.0,
      exports: 10.5,
      imports: 9.0,
      firmInvestment: 13.1,
      govWages: 3.6,
      govBonds: 1.4,
    },
  },
  {
    year: 2015,
    gdp: 69.21,
    flows: {
      wages: 36.0,
      consumption: 26.02,
      hhTax: 4.5,
      govTransfers: 7.8,
      firmTax: 7.6,
      govPurchases: 5.1,
      hhDeposits: 4.4,
      hhLoans: 3.9,
      firmLoans: 9.4,
      exports: 13.6,
      imports: 11.4,
      firmInvestment: 20.2,
      govWages: 6.1,
      govBonds: 3.6,
    },
  },
  {
    year: 2020,
    gdp: 102.56,
    flows: {
      wages: 53.3,
      consumption: 38.72,
      hhTax: 7.3,
      govTransfers: 12.4,
      firmTax: 11.3,
      govPurchases: 8.3,
      hhDeposits: 11.3,
      hhLoans: 7.9,
      firmLoans: 11.9,
      exports: 18.8,
      imports: 16.3,
      firmInvestment: 29.9,
      govWages: 9.1,
      govBonds: 8.3,
    },
  },
  {
    // 官方基准年：资金流量表 2021（年鉴2023 表3-15）+ 支出法 2021 + 央行 2021 报告
    year: 2021,
    gdp: 114.53,
    flows: {
      wages: 36.9, // 资金流量表：非金融 34.4 + 金融 2.5
      consumption: 43.8, // 支出法居民消费
      hhTax: 8.2, // 个税 1.4 + 社保缴款 6.8（人社部口径）
      govTransfers: 13.7, // 社保福利 6.3 + 实物社会转移 7.4（估算）
      firmTax: 14.1, // 生产税净额 9.9 + 企业所得税 4.2
      govPurchases: 8.0, // 政府消费 18.2 − 公共劳动报酬 10.2（估算）
      hhDeposits: 9.9, // 央行
      hhLoans: 7.9, // 央行
      firmLoans: 12.0, // 央行
      exports: 22.9, // GDP 口径
      imports: 19.9, // GDP 口径
      firmInvestment: 29.9, // 资金流量表：非金融 29.7 + 金融 0.2
      govWages: 10.2, // 估算（2022 官方 10.7 按 GDP 回推）
      govBonds: 7.0, // 社融政府债券净融资
    },
  },
  {
    // 官方锚点：资金流量表 2022（年鉴2024 表3-15，最新公开）+ 支出法 2022 + 央行 2022 报告
    year: 2022,
    gdp: 120.5,
    flows: {
      wages: 36.9, // 非金融 34.4 + 金融 2.5
      consumption: 44.79,
      hhTax: 9.4, // 个税 1.5 + 社保缴款 7.95
      govTransfers: 14.6, // 社保福利 6.6 + 实物社会转移 8.0
      firmTax: 13.8, // 生产税净额（企业缴纳 9.4）+ 企业所得税 4.4
      govPurchases: 8.7, // 政府消费 19.4 − 公共劳动报酬 10.7
      hhDeposits: 17.8,
      hhLoans: 3.8,
      firmLoans: 17.1,
      exports: 25.0,
      imports: 21.1,
      firmInvestment: 34.1, // 非金融 33.8 + 金融 0.3
      govWages: 10.7,
      govBonds: 7.1,
    },
  },
]
