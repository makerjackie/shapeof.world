// The only place on-screen numbers come from. `src` is the line printed at the
// bottom-left of the frame. Sources with URLs: ../DESCRIPTION.md.
export const F = {
  // ── Cold open ───────────────────────────────────────────────────────────
  cheaper: { perYear: 13, src: 'Epoch AI《The plunging price of thought》· 2026-09-22 · 同等能力的成本，五项基准平均' },
  capex: {
    value: 732.5e9, parts: [['微软', 175e9], ['谷歌', 200e9], ['亚马逊', 220e9], ['Meta', 137.5e9]],
    src: '四家公司 2026 年资本开支指引（区间取中点）· 2026 年 7 月财报会',
  },

  // ── 1 · People and usage ────────────────────────────────────────────────
  worldPop: { value: 8.3e9, src: '联合国《世界人口展望》2026 年预测值' },
  aiUsers: { value: 2.0e9, src: 'Menlo Ventures 估算 · 2026-09-16 · 过去 6 个月用过 AI' },
  apps: {
    rows: [['ChatGPT', '每周', 12e8, 'OpenAI 2026-09-29'], ['Gemini', '每月', 10e8, 'Google 2026-08-11'], ['豆包', '每月', 3.82e8, 'QuestMobile 2026-06']],
    src: 'OpenAI 2026-09-29（周活）· Google 2026-08-11（月活）· QuestMobile 2026 年 6 月（豆包移动端月活）',
  },
  chinaUsers: { value: 7e8, src: 'CNNIC《生成式人工智能应用发展报告（2026）》· 2026-09-29 · 普及率超 50%' },
  paid: { chatgpt: 5e7, spend: 4e10, perUser: 20, src: 'OpenAI 2026-02-27（消费者订阅，此后未更新）· Menlo Ventures 2026-09-16（全球消费者支出，估）' },
  tokens: {
    google: [['2024.5', 9.7e12], ['2025.5', 480e12], ['2026.5', 3200e12]],
    doubao: [['2024.5', 1.2e11], ['2025.12', 50e12], ['2026.6', 180e12]],
    china: [['2026.3', 140e12]], chinaGrowth: 1000,
    src: 'Google I/O 2026（每月）· 豆包大模型日均：新华社 2024-05、上海证券报 2025-12、火山引擎 2026-06 · 国家数据局 2026-03（全国日均）',
  },
  googlePerSec: { value: 3200e12 / (365.25 / 12 * 86400), src: '由 Google 每月 3200 万亿 token 换算（I/O 2026）' },
  gpqa: { from: 0.30, to: 0.0004, ratio: 725, months: 18, src: 'Epoch AI · 2026-09-22 · GPQA Diamond 拿到 75% 分的每题成本：o3（2025-01）vs GPT-5.6 Luna' },
  dnaFaster: { value: 4, src: 'Epoch AI · 2026-09-22 · 与 DNA 测序、算力、锂电池的降价速度比较' },

  // ── 2 · Money ───────────────────────────────────────────────────────────
  labRevenue: { from: 30e9, to: 105e9, src: 'State of AI Report 2026 · 2026-10-08 · OpenAI 与 Anthropic 年化收入合计，年初 → 夏末' },
  anthropicRR: { feb: 14e9, may: 47e9, src: 'Anthropic 官方公告 · 2026-02-12 与 2026-05-28 · 年化收入' },
  valuation: { anthropic: 965e9, openai: 852e9, src: 'Anthropic 2026-05-28 · OpenAI 2026-03-31 · 最近一轮投后估值' },
  nvidia: { cap: 5.17e12, dcQuarter: 89.0e9, gm: 75.0, src: '英伟达市值：2026-10-16 收盘' },
  apollo: { value: 323e9, ratio: 2.3, src: '行星协会：阿波罗计划 1960–1973 年总花费，按 CPI 换算到 2026 年约 3230 亿美元' },
  sweden: { value: 745.08e9, src: 'IMF《世界经济展望》2026 年 10 月 · 瑞典 2026 年 GDP 7451 亿美元' },
  consumerSpend: { value: 40e9, src: 'Menlo Ventures 估算 · 2026-09-16 · 全球消费者 AI 支出' },
  aiCode: { google: 75, googleBefore: 50, anthropic: 80, src: 'Google CEO Pichai 2026-04-22（新代码中 AI 生成并经工程师批准）· Anthropic 2026-06-04（合并进代码库的代码）' },
  pay: {
    openaiStock: 1.5e6, openaiStockTotal: 6e9, revenueShare: 46, rmbPerUsd: 6.68,
    stockSrc: '《华尔街日报》2025-12-31 · 约 4000 名员工（2025 年底）的股票激励平均值，不含现金工资 · 占收入约 46% 为 WSJ 预计值',
    openaiMedian: 875e3, usAvg: 245e3, cnMonthly: 63160,
    src: 'Levels.fyi 2025 年报（OpenAI 软件工程师总包中位数）· Levels.fyi 2025-07-17（美国 AI 方向工程师平均总包）· 脉脉 2026-09-16（中国新发 AI 岗位平均招聘月薪，2026 年 1–7 月）· 按 1 美元 = 6.68 元换算',
  },
  blocked: { projects: 45, usd: 68e9, src: 'Data Center Watch，经 State of AI Report 2026 · 2026 年二季度因当地反对被阻止或推迟的项目' },
  oppose: { dc: 71, nuclear: 53, src: 'Gallup 2026 年 3 月，经 State of AI Report 2026 · 反对在本地建设的美国人比例' },

  // ── 3 · Model scale ─────────────────────────────────────────────────────
  params: {
    rows: [
      ['GPT-1', 2018, 1.17e8, 'us'], ['GPT-2', 2019, 1.5e9, 'us'], ['GPT-3', 2020, 1.75e11, 'us'],
      ['悟道 2.0', 2021, 1.75e12, 'cn'], ['PaLM', 2022, 5.4e11, 'us'],
      ['GPT-4', 2023, null, 'us'], ['DeepSeek-V3', 2024, 6.71e11, 'cn'], ['Kimi K2', 2025, 1.04e12, 'cn'],
      ['Kimi K3', 2026, 2.8e12, 'cn'],
    ],
    src: '各模型论文与模型卡（OpenAI、Google DeepMind、清华/智源、DeepSeek、月之暗面）· GPT-4 未公开参数',
  },
  moe: { total: 2.8e12, active: 1.04e11, src: '月之暗面 Kimi K3 模型卡 · 2026-07 · 总参数与每个 token 激活的参数' },
  trainTokens: { gpt3: 3e11, flash: 45e12, stock: 300e12, src: 'GPT-3 论文 2020 · DeepSeek V4.1 Flash 模型卡 2026 · Epoch AI 估计的公开人类文本存量约 300 万亿 token' },
  compute: { transformer: 7.42e18, astra: 9.4e26, src: 'Epoch AI 模型数据库 · 2026-10-16 · 训练算力估计（FLOP）' },
  trainCost: { rows: [['Transformer', 2017, 438], ['GPT-3', 2020, 2.06e6], ['GPT-4', 2023, 3.73e7], ['Grok 4', 2025, 3.878e8]], src: 'Epoch AI 训练成本估计（按硬件摊销）' },
  brain: { neurons: 86e9, synapses: 150e12, watts: 20, src: 'Herculano-Houzel 2009（神经元）· Pakkenberg 2003（新皮层突触）· 人脑功率约 20 瓦' },
  grok4Energy: { gwh: 310, lifetimes: 22000, src: 'Epoch AI 2025-09-12（Grok 4 训练耗电 310 GWh）· 按人脑 20 瓦 × 80 年 = 14 MWh 换算' },

  // ── 4 · Ability ─────────────────────────────────────────────────────────
  horizon: { gpt4Min: 4, hours: 12, doublingMonths: 4, src: 'METR · 2026-09-08 · AI 有一半把握完成的任务，按人类专家耗时计' },
  frontierMath: { from: 2.4, fromWhen: '2025.8', to: 100, toWhen: '2026.9', src: 'Epoch AI · FrontierMath 4 级（43 道研究级数学题）· Claude Opus 4.1 → GPT-6.1 Sol' },
  imo: { ai: 42, humansPerfect: 7, src: '华为、小红书 2026-07-22 宣布（经 AFP 报道）· IMO 官方成绩：人类满分 7 人' },
  arc3: { launch: 0.51, now: 62.7, human: 100, src: 'ARC Prize · ARC-AGI-3 标准评测 · 2026-03-25 与 2026-09-03（GPT-6 Astra）' },
  gap: {
    a: 'Claude Opus 5.5', b: 'DeepSeek V4.1 Flash',
    price: { a: 20, b: 1.2, ratio: 17 },
    rows: [
      { name: '抽象推理', bench: 'ARC-AGI-2', a: 93.3, b: 72.9 },
      { name: '高难数学', bench: 'FrontierMath 1–3 级', a: 91.2, b: 67.4 },
      { name: '研究级数学', bench: 'FrontierMath 4 级', a: 95.0, b: 26.8 },
    ],
    src: 'ARC Prize 2026-10-15 · Epoch AI 2026-10-18 · 各取最高档推理 · 价格为每百万 token 输出官方价',
  },

  // ── 5 · Powers ──────────────────────────────────────────────────────────
  investment: { us: 285.88e9, cn: 12.41e9, ratio: 23, src: '斯坦福 AI Index 2026 · 2025 年私人投资 · 中国不含政府引导基金' },
  computeShare: { us: 74.5, cn: 14.1, rest: 11.4, src: 'Epoch AI · 已追踪 GPU 集群算力份额 · 数据截至 2025-05（最新一版）' },
  chips: { ratio: 26, src: 'Epoch AI · 2026-09-24 · 2026 年产量预估，按 H100 等效算力（英伟达 2300 万 vs 华为 88 万）' },
  top10: { us: 10, cn: 0, src: 'LMArena 文本总榜前 10 行 · 2026-10-15' },
  revenue: { us: 105e9, cn: 11e9, src: 'State of AI Report 2026（OpenAI+Anthropic）· Epoch AI 2026-10-06（中国六家合计约为其 10%）' },
  score: {
    rows: [
      { name: 'AI 私人投资（2025）', us: '2859 亿美元', cn: '124 亿美元', win: 'us', src: '斯坦福 AI Index 2026' },
      { name: 'AI 算力份额', us: '75%', cn: '14%', win: 'us', src: 'Epoch AI（2025-05）' },
      { name: '2026 年 AI 芯片产量（按算力）', us: '26 倍', cn: '1', win: 'us', src: 'Epoch AI 2026-09-24（英伟达 vs 华为）' },
      { name: 'AI 收入（年化）', us: '1050 亿美元', cn: '约 110 亿美元', win: 'us', src: 'State of AI Report 2026 · Epoch AI 2026-10-06' },
      { name: '最强的 10 个模型', us: '10', cn: '0', win: 'us', src: 'LMArena 2026-10-15' },
      { name: '被引最多的 100 篇 AI 论文', us: '46', cn: '41', win: 'us', src: '斯坦福 AI Index 2026（2024 年）' },
      { name: '数据中心容量（吉瓦）', us: '56', cn: '24', win: 'us', src: 'SemiAnalysis 2026-09-25' },
      { name: 'NeurIPS 作者的本科所在地', us: '12%', cn: '约一半', win: 'cn', src: '经济学人 2026-03-25（2019 年：美 20%，中 29%）' },
      { name: '活跃 AI 研究者', us: '1.4 万', cn: '5.1 万', win: 'cn', src: 'Nature 2026-10-14，引 Digital Science' },
      { name: 'AI 专利占全球', us: '12%', cn: '74%', win: 'cn', src: '斯坦福 AI Index 2026（2024 年授权）' },
      { name: '开源模型累计下载', us: '7.2 亿', cn: '11.5 亿', win: 'cn', src: 'ATOM 报告 2026-04（截至 2026-03，Hugging Face）' },
      { name: '发电量（太瓦时，2025）', us: '4430', cn: '10575', win: 'cn', src: '美国 EIA · 国家统计局' },
      { name: '工业机器人年装机（2025）', us: '3.85 万', cn: '35.4 万', win: 'cn', src: 'IFR《世界机器人报告 2026》' },
      { name: '认为 AI 利大于弊', us: '38%', cn: '85%', win: 'cn', src: 'Ipsos AI Monitor 2026（2026 年 3–4 月）' },
    ],
  },
  // The tug of war in chapter 5, in the order the pulls land. `ratio` is how
  // many times ahead the winning side is; the rope moves by log10(ratio), so
  // a 23× lead pulls much further than a 1.6× one. 10:0 counts as 30×.
  tug: [
    { side: 'us', ratio: 30, name: '最强的 10 个模型', claim: '10 : 0', detail: 'LMArena 文本总榜前 10，全是美国公司的', src: 'LMArena 2026-10-15' },
    { side: 'us', ratio: 23, name: 'AI 私人投资（2025）', claim: '美国是中国的 23 倍', detail: '2859 亿 vs 124 亿美元（中国不含政府引导基金）', src: '斯坦福 AI Index 2026' },
    { side: 'us', ratio: 26, name: 'AI 芯片产量（2026，按算力）', claim: '英伟达是华为的 26 倍', detail: '约 2300 万 vs 88 万块 H100 的算力', src: 'Epoch AI 2026-09-24' },
    { side: 'cn', ratio: 3.6, name: '活跃 AI 研究者', claim: '中国是美国的 3.6 倍', detail: '5.1 万 vs 1.4 万', src: 'Nature 2026-10-14，引 Digital Science' },
    { side: 'cn', ratio: 4.2, name: '顶尖 AI 论文作者的本科', claim: '约一半在中国读', detail: '在美国读的只有 12%（NeurIPS 2025 作者）', src: '经济学人 2026-03-25' },
    { side: 'cn', ratio: 2.4, name: '发电量（2025）', claim: '中国是美国的 2.4 倍', detail: '10575 vs 4430 太瓦时', src: '国家统计局 2026-02-28 · 美国 EIA 2026-03-05' },
    { side: 'cn', ratio: 9.2, name: '工业机器人年装机（2025）', claim: '中国是美国的 9 倍', detail: '35.4 万 vs 3.85 万台', src: 'IFR《世界机器人报告 2026》' },
    { side: 'cn', ratio: 1.6, name: '开源模型累计下载', claim: '中国 11.5 亿，美国 7.2 亿', detail: 'Hugging Face，截至 2026 年 3 月', src: 'ATOM 报告 2026-04' },
    { side: 'us', ratio: 9.5, name: 'AI 收入（年化）', claim: '美国约是中国的 10 倍', detail: '1050 亿 vs 约 110 亿美元', src: 'State of AI Report 2026 · Epoch AI 2026-10-06' },
    { side: 'us', ratio: 5.3, name: 'AI 算力份额', claim: '美国 75%，中国 14%', detail: '已追踪的 GPU 集群算力', src: 'Epoch AI（数据截至 2025-05）' },
  ],
  lag: { months: 7, range: '4–14', src: 'Epoch AI《US vs China ECI》· 2026-01-02 · 按 Epoch 能力指数，中国最强模型追平美国前沿平均晚约 7 个月（4–14 个月）' },
  choke: {
    rows: [
      { place: '中国台湾地区', who: '台积电', num: '95%', what: '全世界 3 纳米级芯片', src: 'Yole，经 EE Times 2026-04-13' },
      { place: '荷兰', who: 'ASML', num: '100%', what: '全球 EUV 光刻机，只有它能造', src: 'ASML 2026 年三季度电话会 · heise 2026-09-08' },
      { place: '韩国', who: 'SK 海力士 + 三星', num: '83%', what: 'HBM 高带宽内存', src: 'Counterpoint 2026-09-03（2026 年二季度营收份额）' },
      { place: '日本', who: '东京电子', num: '91%', what: '芯片厂的涂胶显影设备', src: '东京电子投资者资料 2026-04-30 · TrendForce 2025-12-03' },
    ],
  },
  rest: {
    europeModels: 2, euDeriv: [58, 4], sovereign: 138e9, saudi: 6, korea: 8.4,
    planSrc: 'State of AI Report 2026（主权 AI 承诺）· MEED 2026-05-04（沙特 Humain 园区）· 韩联社 2026-07-16（韩国 2029 年规划）',
    src: '斯坦福 AI Index 2026 · ATOM 报告 2026-04（欧洲底座衍生模型份额峰值 → 2026-02）· State of AI Report 2026（主权 AI 承诺）',
  },

  // ── 6 · Physical world ──────────────────────────────────────────────────
  colossus: { mw: 946, homes: 1e6, src: 'Epoch AI 数据中心库 · 2026-10-12 · IT 功率估计；“1 吉瓦约 100 万户”为 Epoch 的换算' },
  dcTotal: { sites: 94, gw: 18.3, nyc: 11, src: 'Epoch AI · 2026-10-12 · 已追踪 AI 数据中心设施总功率，对比纽约市用电高峰' },
  dcShare: { us2030: 11.8, cn2025: 1.6, cn2030: 6, src: '劳伦斯伯克利国家实验室 2026-06（美国 2030 年预测）· 国家能源局 2026-05-29（中国 2025 年与 2030 年预测）' },
  notableModels: { us: 59, cn: 35, eu: 2, src: '斯坦福 AI Index 2026 · 2025 年发布的知名模型' },
}
