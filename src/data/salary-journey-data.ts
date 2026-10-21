/**
 * 《我的两万块从哪来》数据集：一份月薪 2 万工资条的来路与去处。
 *
 * 基准：2022 年宏观统计 + 2024 年度北京五险一金/个税公开规则。
 * 规则类数据（税率表、缴费比例）可复算；支出拆分为估算值（标注），
 * 公司成本结构为真实年报实例（腾讯 2023、华为 2023）。
 * 详细来源见 .tmp/salary-journey-research.md。
 */

/** 个人所得税月度预扣税率表（七级累进，应纳税所得额 = 月薪 − 5000 − 专项扣除 − 专项附加扣除） */
export type TaxBracket = {
  /** 该级上限（元/月），最后一级为 Infinity */
  limit: number
  rate: number
  /** 速算扣除数（元/月） */
  deduction: number
}

export const TAX_BRACKETS: Array<TaxBracket> = [
  { limit: 3000, rate: 0.03, deduction: 0 },
  { limit: 12000, rate: 0.1, deduction: 210 },
  { limit: 25000, rate: 0.2, deduction: 1410 },
  { limit: 35000, rate: 0.25, deduction: 2660 },
  { limit: 55000, rate: 0.3, deduction: 4410 },
  { limit: 80000, rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
]

/** 每月基本减除费用（起征点），元 */
export const BASIC_DEDUCTION = 5000

/** 北京五险一金缴费规则（2024 年度，公开规则） */
export const BEIJING_RULES = {
  year: 2024,
  /** 缴费基数上下限（元/月） */
  baseCap: 35283,
  baseFloor: 6821,
  pension: { personal: 0.08, unit: 0.16 }, // 养老
  medical: { personal: 0.02, personalFixed: 3, unit: 0.098 }, // 医疗（单位含生育）
  unemployment: { personal: 0.005, unit: 0.005 }, // 失业
  injury: { personal: 0, unit: 0.004 }, // 工伤（单位，按 0.4% 中档）
  housingFund: { personal: 0.12, unit: 0.12, minRate: 0.05, maxRate: 0.12 }, // 公积金
} as const

/** 默认情景：月薪 2 万、足额缴纳、公积金 12%、无专项附加扣除 */
export const DEFAULT_SALARY = 20000

/**
 * 默认计算结果（月薪 2 万，按上述规则算出的对照值）：
 * 个人三险 2,103 + 公积金 2,400 + 个税 ≈840 → 到手 14,657（73.3%）；
 * 单位另缴 ≈7,700 → 公司总用工成本 ≈27,700 ≈ 1.39× 名义工资。
 */

/** 公司视角的真实锚点（年报/官方） */
export const COMPANY_ANCHORS = {
  /** 腾讯 2023：雇员福利开支 1,076.75 亿 / 收入 6,090 亿 */
  tencentPayrollShare: 0.177,
  /** 华为 2023：雇员费用 1,818.45 亿 / 收入 7,042 亿 */
  huaweiPayrollShare: 0.258,
  /** 工信部 2023：软件业利润率 9.2%（收入 12.3 万亿、利润 1.46 万亿） */
  softwareMargin: 0.092,
  /** 统计局 2023：信息传输/软件/IT 服务业城镇非私营年均工资（全行业第一） */
  itAvgAnnualWage: 231810,
  /** 对照：2023 全行业城镇非私营年均工资 */
  allIndustryAvgAnnualWage: 120698,
} as const

/** 到手工资的去向（租房人生默认拆分，元/月，估算值；储蓄为残差） */
export type SpendingProfile = {
  rent: number
  food: number
  transport: number
  shopping: number
  culture: number
}

export const RENT_PROFILE: SpendingProfile = {
  rent: 4500, // 北京一居室估算（链家 2023 套均 6,746 全户型锚）
  food: 1500,
  transport: 400,
  shopping: 1800,
  culture: 1600,
}

/** 房贷人生分支：200 万贷款 / 30 年 / 4.85% → 月供约 10,550（估算） */
export const MORTGAGE_MONTHLY = 10550

/** 全国居民消费支出构成（2022，官方；用于"花的钱流向哪些行业"） */
export const CONSUMPTION_COMPOSITION_2022 = {
  food: 0.305, // 食品烟酒
  housing: 0.24, // 居住
  transport: 0.13, // 交通通信
  culture: 0.101, // 教育文化娱乐
  medical: 0.086, // 医疗保健
  others: 0.138, // 衣着/生活用品/其他
} as const

/** 宏观回扣（2022，官方）：每一分钱最终汇入的大循环 */
export const MACRO_CALLBACKS = {
  /** 居民消费总额，万亿元/年（支出法 GDP） */
  householdConsumption: 44.79,
  /** 住户部门净金融投资（盈余），万亿元/年（资金流量表） */
  householdNetLending: 18.47,
  /** 住户缴个人所得税，万亿元/年 */
  incomeTax: 1.49,
  /** 住户缴社保，万亿元/年 */
  socialContrib: 7.95,
  /** 全国人均可支配收入（2022，元） */
  perCapitaIncome: 36883,
  /** 全国人均消费支出（2022，元） */
  perCapitaSpending: 24538,
  /** 全国人均储蓄率（(36883−24538)/36883） */
  savingsRate: 0.335,
} as const
