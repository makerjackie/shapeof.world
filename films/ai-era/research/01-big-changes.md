# 《AI 时代的形状》调研 01：AI 正在带来哪些巨大而具体的改变

调研日期：2026-10-22。范围：官方页面、公司披露、调查机构、论文与主流媒体转述。目标：找"测出来的变化"和"有出处的预测"，不收观点。

## 读法与说明

- **强度/类型**分五档，只评"这条能不能当事实讲"：
  - **已核实**：我直接读到官方/一手页面，数字对得上。
  - **已核实（二手一致）**：没读到一手原文，但多家独立媒体转述一致、且有可追溯的原始披露。
  - **自报**：公司自己说的，无第三方审计；可以讲，但要说"据公司称"。
  - **未核实**：只在单一二手/博客里出现，或各来源互相矛盾。**不要进成片**。
  - **预测**：对未来的判断，必须以区间呈现。
- 取数方式：WebSearch 汇总 + 对关键页面（Census、Gallup、FDA、METR、DeepMind AlphaFold、erdosproblems.com、IEA）用 WebFetch 读取。本次拿不到 IEA 2026 报告正文、Anthropic 官网原文、OpenAI 官方博客原文、CNNIC 原报告，这些都已在条目里标明。
- 下表每条的"来源"只列主来源；详细 URL 在后面各条。
- 与 `films/anxiety/research/05-ai-anxiety.md` 的分工：劳动力影响的细节在那边，本文件第 5 节只做链接式引用，不重复。

---

## 速查表

| 论断 | 数字 | 来源 | 强度/类型 |
|---|---|---|---|
| AlphaFold 已预测的蛋白结构 | 超过 2 亿个，几乎覆盖所有已知蛋白 | DeepMind 官网 | 已核实 |
| AlphaFold 数据库用户 | 超过 300 万研究者，190 多个国家（同页另一处写 200 万，自相矛盾） | DeepMind 官网 | 已核实（自报） |
| IMO 2025 AI 达到金牌线 | DeepMind 与 OpenAI 均 35/42 | DeepMind/OpenAI 公告，媒体转述 | 已核实（二手一致） |
| 数学开放问题被 AI 参与解决 | 2025-12 至 2026-03 约 15 个 Erdős 问题状态由开放变已解决，其中 11 个明确署名 AI；Tao 称"低垂的果实" | Tao GitHub 库；Rényi 研究所；erdosproblems.com | 已核实（二手一致），强度要降 |
| AlphaEvolve 矩阵乘法指数 | ω 上界 2.371339 降到 2.371177（第 5 位小数） | arXiv 2608.16884（2026-08-17） | 已核实（摘要）；意义小 |
| 谷歌新代码中 AI 生成的比例 | 约 25%（2024-10）→ 约 75%（2026-04） | 谷歌/Pichai 披露，TechSpot | 自报 |
| Anthropic 代码中 Claude 写的比例 | "90% 以上"（CFO Krishna Rao） | TechSpot 转述 | 自报 |
| 公开 git 记录里的 AI 共同署名 | 18 个大型开源库 2026-07 为 19.17% | 一份独立分析（经二手） | 未核实 |
| AI 任务时长（METR） | Claude Mythos Preview 50% 时间跨度"至少 16 小时"，95% 区间 8.5–55 小时；80% 跨度约 3 小时 6 分 | METR 官网 + the-decoder | 已核实（官网说 16h 以上不可靠） |
| METR 倍增时间 | 约 129–212 天，取决于拟合区间 | 二手分析 | 未核实（版本不一） |
| Anthropic 年化收入 | 2025 年底约 90 亿 → 2026-04 约 300 亿 → 官宣 470 亿（Series H）→ 彭博称 7 月底超 650 亿 | Series H 转述、Bloomberg Law | 自报（运行率，非年收入） |
| Anthropic 估值 | 650 亿美元融资，9650 亿美元投后 | Reuters 转述 | 已核实（二手一致） |
| 四大云厂商 2026 年 capex | 约 7250 亿美元；2025 年约 4100 亿（FT 口径） | FT 分析转述；各公司财报 | 已核实（二手一致），口径有分歧 |
| 英伟达市值 | 2026-10-06 约 5.7–5.84 万亿美元，距 6 万亿一步之遥 | 多家财经媒体 | 已核实（二手一致） |
| 2026-02 软件股"SaaS 末日" | 单日蒸发约 2850–3000 亿美元；各口径跌幅 8%–25% 不等 | Fortune、Implicator、Xpert | 已核实（事件），数字口径不一 |
| 2026-02-20 网安股下跌 | CrowdStrike -8%、Okta -9.2%，Global X 网安 ETF -4.9%，次周一再跌约 10% | Bloomberg 2026-02-20 | 已核实 |
| 印度 IT 外包股 | Nifty IT 自 2026-02 高点回落约 24%（至 2026-06-11） | 印度财经媒体 | 已核实（二手一致） |
| 数据中心用电 | 2025 年同比 +17%（全球总用电 +3%）；2030 年约 945 TWh（2025 报告基线） | IEA（2025 报告原文摘要；2026 报告经二手） | 17% 为二手；945 TWh 已核实 |
| 美国企业采用 AI | 19.8%（2026-05-03）；250 人以上企业 37% | Census BTOS | 已核实 |
| 美国员工使用 AI | 52% 至少偶尔用；30% 每周数次以上；15% 每天 | Gallup（2026-05） | 已核实 |
| FDA 批准的 AI 医疗器械 | 1614 个（截至 2026-06-29，第三方对 FDA 清单下载件的计数） | FDA AI 清单 | 已核实（计数为二手） |
| ChatGPT 周活 | 9 亿（2026-02，官宣）；接近 10 亿（The Information，7 月，未获官宣确认） | TechCrunch 2026-02-27 | 9 亿已核实；10 亿未核实 |
| Gemini 月活 | 7.5 亿（2026-02）→ 称 10 亿（2026-08，二手） | 谷歌财报转述 | 7.5 亿已核实；10 亿未核实 |
| 中国生成式 AI 用户 | 6.02 亿（2025 年底，渗透率 42.8%）→ 超 7 亿（2026-06，渗透率超 50%） | CNNIC | 6.02 亿已核实；7 亿二手 |
| 豆包月活 | 3.82 亿；通义 1.67 亿；DeepSeek 1.3 亿 | QuestMobile（2026-07-14） | 已核实（第三方面板） |
| 英国本科生用 AI | 95% 至少一种用法；评估作业中用 94%（2024 年为 66%） | HEPI 2026（n=1054） | 已核实 |
| App Store 新应用 | 2026 上半年约 56 万个，几乎等于 2025 全年（约 60 万）；下载量仅 +2–3% | Sensor Tower / The Information | 已核实（二手一致） |
| AI 对 GDP/生产率的长期影响 | Acemoglu 约 0.66–0.71% TFP/10 年；Goldman 7% GDP/10 年；Penn Wharton 2035 年 +1.5% | 论文与研究机构 | 预测，区间极宽 |

---

## 1. 科学与数学

### 1.1 AlphaFold：蛋白结构几乎被"一次性做完"

**一句话结论**：2 亿个结构、300 万用户、一个诺奖。这是 AI 在科学里最扎实、最可视化的一件事。

**确切数字**

- 预测结构数："over 200 million protein structures"，几乎所有已知蛋白。
- 用户："used by over 3 million researchers from over 190 countries"（2025-11 条目）；超过 100 万用户在中低收入国家。
- 同一页"数据库"一节仍写"over 2 million researchers"，页面自相矛盾，成片取"300 万"需写"据 DeepMind 称"。
- 2024-10，诺贝尔化学奖授予 Demis Hassabis、John Jumper（AlphaFold）与 David Baker（计算蛋白设计）。

**出处**：https://deepmind.google/science/alphafold/（已读取）。

**局限**：用户数是 DeepMind 自报。"几乎所有已知蛋白"指序列已知的蛋白，不等于每个结构都可靠。**可信度：高（事实）/中（用户数）。**

### 1.2 IMO 2025：AI 到金牌线

**确切数字**：Gemini Deep Think 6 题解出 5 题得 35/42，经 IMO 官方协调评分认证；OpenAI 未正式参赛，由 3 位前 IMO 奖牌得主评分，同为 35 分。两者刚好卡在金牌线。

**强度**：已核实（二手一致）。我没有读到 DeepMind/OpenAI 的原始公告页，来自 Entrepreneur 等媒体转述。

**2026 年 IMO**：一篇 tech-insider 文章称华为 Celia 与小红书 dots-note 3.0 拿到 42/42。**我没找到 IMO 官方或公司原始公告，单一来源，标未核实，不要用。** 同站另一篇 7 月中的文章说当时还没有满分记录，两篇相互矛盾。

**出处**：https://www.entrepreneur.com/business-news/google-openai-models-win-gold-at-high-school-math-contest/494914

### 1.3 开放数学问题：Erdős 问题

**确切数字**

- erdosproblems.com 数据库共 1221 个问题（页面直接读到）。页面博客有"Problem 728 and the use of AI on Erdős problems"（2026-01-26）、"Erdős problems in the OpenAI proofs"（Thomas Bloom，2026-10-08，正文未读到）；论坛"AI Contributions"系列帖三串合计 632 + 425 + 75 条回复。
- 2026-01：Tao 的 GitHub 记录显示 GPT-5.2 Pro / Thinking 给出 205、652 号问题的完整解答，另有三个由 GPT-5.2 Pro 完成。397 号被推翻，并用 Harmonic 的 Aristotle 做了 Lean 形式化后经 Tao 确认。
- 法国媒体（2026-03）：2025-12 以来约 15 个问题由开放变已解决，其中 11 个的解答明确署名 AI；AlphaEvolve 在 2025-11 已有早期自主解答。
- Tao 的评价：解答"近乎自主"，AI 能力确有进步；但他同时说这些是标准技术就能解决的"低垂的果实"，不是深刻突破。

**强度**：已核实（二手一致），但**强度要降一档**：问题本身多属长期无人认真看的冷门题，不能写成"AI 攻克了数学难题"。一篇博客称 GPT-5.4 证明了一个 60 年老的 Erdős 问题且获 Tao 称赞，我没找到一手来源，**未核实**。

**出处**：https://renyi.hu/en/news/we-are-midst-historic-moment-erdos-problems-solved-chatgpt ；https://www.erdosproblems.com/ ；https://www.gigazine.net/gsc_news/en/20260114-gpt-5-2-pro-solved-erdos-problem ；https://www.journaldugeek.com/2026/03/09/une-ia-dopenai-resout-un-probleme-qui-cassait-la-tete-des-matheux-depuis-des-decennies/

### 1.4 AlphaEvolve：算法与界

**确切数字**

- 2025-05 发布；4×4 复数矩阵的 48 次乘法方案，是自 Strassen（1969）以来的第一次改进。
- arXiv 2608.16884（2026-08-17）：矩阵乘法指数 ω 的上界由 2.371339 降到 2.371177。作者含 Alman、Vassilevska Williams 与 DeepMind 研究者；AlphaEvolve 只是流水线的最后一步，改进在第 5 位小数，论文不声称紧。

**强度**：已核实（只读到摘要级转述）；意义小，别配"AI 改写数学"。

**出处**：https://aiweekly.co/alerts/alphaevolve-helps-push-matrix-multiplication-to-2371177 ；https://www.alphaxiv.org/abs/2608.16884

### 1.5 AI 合作科学家系统

- Google 的 I/O 2026 研究博客称 Co-Scientist 与 ERA 两篇论文在同一周发表于 Nature，Gemini for Science 建立其上。一份谷歌云幻灯片称 AML 药物重定位预测经过湿实验验证。**Nature 原文我没取到；日期来自 LinkedIn 帖，需复核。**
- FutureHouse Robin：多智能体假设生成与数据分析系统；"准确率降到 15%"的说法只见于 LinkedIn，**未核实**。
- Sakana AI Scientist、OpenAI for Science、Anthropic 的科研项目：本次**没有搜到可核实的一手数字**。如成片要用，需单独补查。

**出处**：https://research.google/blog/a-new-era-of-innovation-google-research-at-io-2026

---

## 2. 软件

### 2.1 代码有多少是 AI 写的

| 公司 | 说法 | 日期 | 说话人 | 类型 |
|---|---|---|---|---|
| 谷歌 | 约 25% 新代码 → 约 75%，"AI 生成并经工程师审阅" | 2024-10 → 2026-04 | Pichai | 自报 |
| Anthropic | "90% 以上"由 Claude 写 | 2026 年夏 | CFO Krishna Rao | 自报 |
| 微软 | 20–30% | 2025-04 | Nadella | 自报；本次未找到 2026 新数字 |

- 一份 2026-09-18 的汇总（共 28 个数字、13 家公司）指出：各家分母不同（新代码/仓库代码/提交/PR/token），谷歌的口径 18 个月内换了三次；**只有 Anthropic 披露了一个可复现方法**：Claude"主导"其 AI 研发工作的 26%（按人时、378 类任务加权，由 Claude 判定）。无一经审计，6 家公司在卖被衡量的产品。
- 独立证据：18 个大型开源库的公开 git 记录里，AI 共同署名在 2026-07 为 19.17%（经二手，未核实）。Amodei 2025-03 的"3–6 个月内 90%"预测与此对照，被一篇文章标题概括为"只有 1.42% 的提交承认"，这是该文标题，**数字我没核到**。

**怎么讲才不过头**：只能说"谷歌自称约四分之三的新代码由 AI 生成、工程师审阅"，必须带"自称"和定义。

**出处**：https://www.techspot.com/news/112152-google-ai-now-generates-75-new-code-up.html ；https://www.techspot.com/news/112408-anthropic-more-than-90-code-now-written-ai.html ；https://www.digitalapplied.com/blog/ai-share-of-own-work-tech-companies-disclosed-figures

### 2.2 编码智能体的收入

- Anthropic 运行率：2025 年底约 90 亿 → 2026-02 约 140 亿 → 2026-04 约 300 亿 → 2026-05-07 官宣 470 亿（随 Series H：融资 650 亿美元，投后估值 9650 亿美元，Altimeter、Dragoneer、Greenoaks、Sequoia 领投）→ 彭博称 2026 年 7 月底超 650 亿，路透、Axios 据称佐证；2026 Q2 初步收入约 115 亿（经 Benzinga）。
- Claude Code 据称发布 6 个月内年化收入破 10 亿美元；有分析估计约占 Anthropic 收入的 10%。
- **口径提醒**：运行率 = 最近一个月年化，不是已入账年收入，也未经审计。Anthropic 官方仍只认 470 亿。已传出秘密递交 IPO。
- 本次**没有取到 OpenAI、Cursor 的可核实 2026 数字**（搜索没覆盖），需补查。

**出处**：https://news.bgov.com/legal-ops-and-tech/anthropic-revenue-run-rate-surpasses-65-billion-ahead-of-ipo ；https://simonwillison.net/2026/may/29/anthropic/ ；https://aiweekly.co/alerts/anthropic-hits-30b-run-rate-leads-cnbc-disruptor-50

### 2.3 新应用与游戏

- Sensor Tower：2025 年 App Store 新应用约 60 万（+30%）；2026 上半年约 56 万，几乎追平 2025 全年；The Information 报 2026 Q1 新应用 235,800 个，同比 +84%；有报道称 2026 年有望超 100 万，超过 2016 年纪录 89 万。
- Appfigures：2026 Q1 全球应用发布同比 +60%（iOS +80%）。
- **但需求没跟上**：App Store 下载量去年仅 +3%，今年至今 +2%。Naavik：移动游戏发布 2025-12 至 2026-02 增 77%，月收入超 2 万美元的游戏只增 14%。Apple 称 90% 应用 48 小时内过审。
- Steam 数据：未找到。

**出处**：https://www.techspot.com/news/113213-apple-app-store-inundated-low-quality-vibecoded-apps.html ；https://aiweekly.co/alerts/ft-ai-coding-boom-fuels-surge-in-new-mobile-game-releases

### 2.4 METR：任务时长

**确切数字**

- METR 页面（2026-09-08 起标注"不再主动更新"）：最新加入模型为 Claude Mythos Preview（早期版，2026-05-08）、Gemini 3.1 Pro（04-15）、GPT-5.4（04-10）、Claude Opus 4.6 与 GPT-5.3-Codex（02-20）。官方称"16 小时以上的测量不可靠"。GPT-5 为 2 小时 17 分（2025-08）。
- Mythos Preview：50% 时间跨度"至少 16 小时"，95% 区间约 8.5–55 小时（早期版本，2026-03 测试）；228 个任务里只有 5 个在 16 小时以上；80% 跨度约 3 小时 6 分。（the-decoder、Wikipedia 转述）。DataLearner 排行榜写 1044.78 分钟，非官方。
- **倍增时间**：原论文约 212 天；二手分析给出全期约 188 天、2023 年后约 129 天（约 3.5–4 个月）；有评论预期 2026 年底放缓。**METR 页面自己没给倍增时间**，只说指数拟合优于线性和双曲，所以成片的"每 X 个月翻倍"要写"据 METR 数据拟合"并标区间。
- 注意：这只测编码类任务，且是"AI 成功率 50% 时的任务长度"，不是"AI 能连续工作 16 小时"。
- **METR 的 2025 年开发者随机对照试验**：16 名资深开源开发者、246 个任务，用 AI 反而慢 19%，而他们自以为快 20%。METR 在 2026-02 进度报告里称该结论已成历史，因新模型带来"明显加速"，且该实验方法现已不可靠（有开发者拒绝把预期被加速的工作放进实验，并发使用多智能体）。**所以别再引用"AI 让程序员慢 19%"。**

**出处**：https://metr.org/time-horizons/ ；https://metr.org/february-2026-progress-report.pdf ；https://the-decoder.com/metr-says-it-can-barely-measure-claude-mythos-palo-alto-networks-warns-of-autonomous-ai-attackers/

---

## 3. 市场与资金

### 3.1 云厂商资本开支

**确切数字**（2026-04-29 财报季后口径）

- Meta：区间上调为 1250–1450 亿美元（原 1150–1350 亿）；理由为零部件涨价与新增数据中心成本。
- 微软：约 1900 亿美元（日历 2026 年）；有分析称其中约 250 亿是零部件涨价。
- 谷歌：1800–1900 亿美元（原 1750–1850 亿）。
- 亚马逊：约 2000 亿美元（2026-02 已发布，维持）。
- 合计：约 7250 亿美元（财报前约 6700 亿），FT 分析称较 2025 年约 4100 亿美元增 77%。路透口径另有"超过 6000 亿"的说法，**各方总数不一，7250 亿是证据最多的口径**。
- 2026-Q3 财报（10 月下旬）的更新数字本次未取到。

**局限**：一部分涨幅是芯片/内存涨价，不是算力同比等量增加。**强度**：已核实（二手一致）。

**出处**：https://finance.yahoo.com/sectors/technology/articles/hyperscalers-hit-700-billion-2026-111243744.html ；https://om.co/2026/04/30/what-i-learned-about-hyperscalers-ai-spend/

### 3.2 英伟达市值

- 2026-10-05 收盘 238.90 美元（纪录），2026-10-06 市值约 5.7–5.84 万亿美元（时点与股本口径不同）；约 241 亿股，约 249 美元对应 6 万亿；今年至 10 月是标普 500 约 14% 涨幅的最大单一贡献者；2026-09-28 新增 1500 亿美元回购授权。**本次未能确认 10 月下旬是否破 6 万亿。**
- 中国占英伟达收入已从 20% 以上降到约 5%（FY2026 文件，经二手）。

**出处**：https://www.insiderfinance.io/news/nvidia-market-cap-near-6-trillion ；https://www.crowdfundinsider.com/?p=316268

### 3.3 能力发布 → 市场反应（事件 + 报道中的因果说法）

**A. "SaaS 末日"（2026-01-30 至 02 月）**

- 触发：Anthropic Cowork 11 个插件（2026-01-30）；2026-02-05/06 Claude Opus 4.6 发布时再度承压（Fortune 标题把抛售与升级联系起来）。
- 数字（来源口径不一）：最坏一天蒸发约 2850 亿（Xpert）–3000 亿美元（Implicator）；另有简报称 2-04 当日损失约 8300 亿，部分个股最多 -16%；Cyber Daily：S&P 软件与服务指数初段约 -8%、自 1-28 起损失约 1 万亿美元；Ainslie：自 1-12 到 2 月底约 -25%。波及亚洲：TCS 约 -6%、Xero -16%。
- 报道的因果说法：投资者担心智能体将"取代而非补充"传统 SaaS。反方：Wedbush 认为抛售过头，OpenAI/Anthropic 变成完整企业软件巨头的担心牵强；Implicator 标题称"Anthropic 只是借口"（单日 3000 亿，另有估值/利率原因）。
- **强度**：事件已核实；因果只能写"被广泛归因于"，不要写"Anthropic 一个产品抹掉了 X"。

**B. 网安股（2026-02-20）**

- Anthropic 发布 Claude Code Security（有限研究预览）当日（Bloomberg）：CrowdStrike -8%、Cloudflare -8.1%、Okta -9.2%、SailPoint -9.4%；Global X 网络安全 ETF -4.9%，创 2023 年 11 月以来最低。2-23 周一续跌：CrowdStrike 约 -10.6%（盘中），路透口径 CrowdStrike、Datadog、Zscaler 约 -11%。
- 背景：CrowdStrike 此前约 21 倍市销率；其 CEO 公开称该工具与 Falcon 平台不直接竞争；Calcalist 认为对网安公司的威胁有限。2026 年 Claude Mythos 泄露时美网安股再度下挫（HL 标题，细节未读）。
- **强度**：已核实（Bloomberg 数字）；因果为媒体归因。

**C. 印度 IT 外包**

- 2026-02-13：Nifty IT 跌至 2023-10 以来最低，年内约 -17%，报道称起因为 Anthropic 升级模型；2026-05 跌 3.7% 至 2023-05 以来最低；2026-06-11 收于 27,827.50，较 2 月高点 -24%；TCS 较高点约 -33%、HCLTech 约 -36%、Infosys 约 -27%。
- **强度**：已核实（二手一致）。机制：担心应用开发、测试、维护这些外包主业被替代。

**出处**：https://fortune.com/2026/02/06/anthropic-claude-opus-4-6-stock-selloff-new-upgrade/ ；https://www.implicator.ai/software-lost-300-billion-in-a-day-anthropic-was-just-the-excuse/ ；https://www.bloomberg.com/news/articles/2026-02-20/cyber-stocks-slide-as-anthropic-unveils-claude-code-security ；https://www.barchart.com/story/news/1229566/the-selloffs-in-servicenow-and-salesforce-stocks-are-disconnected-says-wedbush-should-you-buy-the-dips ；https://www.outlookbusiness.com/markets/it-stocks-sink-nifty-it-falls-to-3-year-low-on-openai-us-rate-worries

---

## 4. 能源与基础设施

- IEA《Energy and AI》（2025-04）执行摘要：数据中心用电"more than double to around 945 TWh by 2030"，2035 年基线约 1200 TWh；2024 年约 415 TWh（约占全球 1.5%）。
- IEA《Key Questions on Energy and AI》（2026-04-16，页面日期已读，**正文未取到**）：据 IET 等转述，2025 年数据中心用电 +17%，全球总用电 +3%；2030 年数据中心用电翻倍、AI 专用部分翻三倍；燃气轮机、变压器、先进芯片短缺收紧。**17% 为二手**。注意 945 TWh 来自 2025 年报告，不要说成 2026 年新数。
- Epoch AI：最大前沿训练运行的功耗每年增长超过 2 倍，按趋势 2030 年达数吉瓦（2025-08 分析，经二手）。
- 芯片地缘（简述）：美国 2026-01 改为个案许可，客户每家至多 7.5 万片 H200，另有 25% 关税、出口量不超过同产品对美出货的 50%；Reuters（2026-05-14）称自 2025-12 授权后一片都没发出；北京方面成为瓶颈；8 月有称字节、腾讯各收到约 1 万片（来自厂商博客，需谨慎）。

**出处**：https://www.iea.org/reports/energy-and-ai/executive-summary ；https://engx.theiet.org/b/articles/posts/iea-warns-ai-data-centre-electricity-use-will-triple-by-2030 ；https://www.implicator.ai/nvidia-h200-deliveries-to-china-remain-stalled-after-trump-xi-summit/

---

## 5. 工作（细节见兄弟文件）

劳动力的测量证据见 `films/anxiety/research/05-ai-anxiety.md`，本文不重复。这里只给采用率：

- **Census BTOS**：2026-05-03 美国企业 AI 使用率 19.8%（2025-12 至 2026-05 区间 17–20%）；250 人以上企业 37%，100–249 人 32%，4 人以下低于 20%；信息业 39.7%、金融保险 33.9%、零售约 14%。**口径警告**：2025-11-17 起问法由"用于生产商品或服务"改为"用于任何业务功能"，含写邮件等小事，与此前约 10% 的旧序列不可直接比。7 月后的读数（约 21.7%–22.4%）来自二手。
- **Gallup**（2026-05）：美国员工 52% 至少一年几次用 AI，30% 每周数次以上，15% 每天；2026-02 调查（n=23,717）为 50% 用、13% 每天。**页面标签 QTR3 与"2026-05"自相矛盾，按 5 月数据用。**
- Pew：二手称 21% 的美国劳动者部分工作借助 AI（上年 16%），**未在 Pew 官网核对**。

**出处**：https://census.gov/library/stories/2026/05/ai-use-businesses.html ；https://www.gallup.com/699797/indicator-artificial-intelligence.aspx ；https://semafor.com/article/07/21/2026/more-us-employees-are-using-ai-poll-finds

---

## 6. 教育、媒体、健康、日常

**学生**：HEPI/Kortext 英国本科生调查（Savanta，2025-12，n=1054）：95% 以任一方式用 AI，94% 用 AI 辅助评估作业（2024 年任一用法 66%）；仅 36% 觉得学校鼓励，38% 称学校提供 AI 工具。加拿大 Academica 的 StudentVu：84%（论坛帖转述）。Pew、College Board 美国青少年数据本次**没搜到**。出处：https://www.hepi.ac.uk/reports/student-generative-ai-survey-2026/

**医疗**：FDA AI 医疗器械清单共 1614 个（截至 2026-06-29，第三方对 FDA 下载件的计数；清单内最近决定日 06/29/2026 我已在 FDA 页读到）；2026 Q1 末为 1524；放射科约 1164 个（76%）；2025 年批 335 个，2026 上半年已 181 个。FDA 称清单不穷尽，且会补录旧器械。出处：https://www.fda.gov/medical-devices/artificial-intelligence-enabled-medical-devices/list-artificial-intelligence-enabled-medical-devices

**AI 生成内容的总量**：本次**没有找到可核实的全网占比数字**，不要在成片里用任何"互联网内容一半是 AI 生成"的说法。

**用户规模**

| 产品 | 数字 | 日期 | 强度 |
|---|---|---|---|
| ChatGPT | 周活 9 亿、付费 5000 万 | 2026-02（官宣；2025-10 为 8 亿） | 已核实 |
| ChatGPT | 周活接近 10 亿（The Information，内部数据，比预期晚 7 个月；OpenAI 未置评）；一则 AFP 摘要称 OpenAI 宣布"模型触达超过 10 亿活跃用户，200 万企业" | 2026-07 / 无日期 | 未核实 |
| Gemini | 月活 7.5 亿（2026-02）；称 9.5 亿（2026-07-22）；称 10 亿（2026-08）| 谷歌披露经二手 | 7.5 亿已核实；其余未核实 |
| Claude | 无可用用户数 | — | — |
| 中国生成式 AI 用户 | 6.02 亿，渗透率 42.8%（2025-12，CNNIC 第 57 次报告；网民 11.25 亿，80.1%）；超 7 亿，渗透率过半（CNNIC，2026-09-29 发布，二手） | | 前者已核实 |
| 豆包 / 通义 / DeepSeek | 月活 3.82 亿 / 1.67 亿 / 1.3 亿（QuestMobile，2026-07-14；中国 AI 原生应用合计 4.99 亿，同比 +85.4%） | 2026-05 或 06 | 第三方面板 |

DeepSeek 2025 年峰值约 1.4 亿，此后基本持平。QuestMobile 是移动端面板估算，不是公司披露。

**出处**：https://techcrunch.com/2026/02/27/chatgpt-reaches-900m-weekly-active-users ；https://technode.com/2026/07/14/questmobile-chinas-ai-native-apps-reach-499-million-monthly-active-users/ ；https://letsdatascience.com/news/chinas-generative-ai-user-base-passes-700-million-cnnic-repo-8e77087e ；https://www.turkiyetoday.com/business/generative-ai-users-reach-602m-in-china-as-internet-penetration-hits-801-3214091

---

## 7. 可信预测：一个区间，而非一个结论

| 阵营 | 说法 | 来源 | 备注 |
|---|---|---|---|
| Amodei（Anthropic） | "强大 AI"（"数据中心里的天才之国"）可能在 2026–2027 | 二手转述，无原文 | 本次没读到原始文字 |
| Hassabis（DeepMind） | 约 2030 年前后，误差一年；早先（2025-04）说"5–10 年" | 斯坦福活动，Decrypt | 二手 |
| Altman | AGI 已"呼啸而过"；OpenAI"知道怎么造" | 二手 | 无原文 |
| AI 2027（Kokotajlo） | 自主编程里程碑推迟，自主 AI 研究约 2030 年代初，"超级智能"约 2034；2025-08 中位数 2028→2029；他称 2027 只是众数 | Wikipedia、eWeek 转述 | 二手 |
| Metaculus | "弱通用 AI"问题的社区中位数在 2026-10 至 2027-04 之间（不同快照）；完整 AGI 问题约 2031-01（缓存），另一用户生成页称 2033-07（不可靠）；三年内曾从 2042 提前 | metaculus.com/questions/3479 | **实时值未核实** |
| Epoch AI | 前沿算力与功耗持续指数增长；Sevilla 与 Edelman 的 2040 预测含编程自动化、10% GDP 增速，2035 年后极度不确定 | epoch.ai | 本次未核对原文 |
| 保守经济学 | Acemoglu《Simple Macroeconomics of AI》：约 4.6% 的任务受影响、受影响任务成本节省约 27%；TFP 最多 +0.66%（早期版本 0.71%）/10 年，年增速约 +0.064 个百分点，GDP 约 +0.93–1.16%/10 年 | MIT 论文（2024-04）；Project Syndicate | 论文版本间有差异；出自 2024 年 |
| 机构乐观 | Goldman：10 年全球 GDP +7%（约 7 万亿美元），生产率增速 +1.5 个百分点；McKinsey：年 GDP 增速 +3–4 个百分点（至 2040） | 二手 | 假设一致性差 |
| Penn Wharton | 2035 年 TFP 与 GDP 水平 +1.5%（约每年 +0.15%） | 二手（tracker 摘要） | 未读原文 |
| 怀疑派（Marcus、LeCun） | **本次没搜到可核实的 2026 年原话** | — | 需补查 |
| 事实性反例 | 斯坦福 AI Index 2026（2026-04-13）：赢 IMO 金牌的模型读模拟时钟只有 50.1%；SWE-bench Verified 一年内由 60% 到接近 100%；只有 23% 的美国公众认为对劳动力市场影响为正（媒体转述） | hai.stanford.edu | 二手 |

**区间怎么给**：经济影响的区间约为"10 年 +0.7%（Acemoglu）到 +7%（Goldman）"，相差约 10 倍；AGI 时间线的区间约为"2026–27（实验室 CEO）到 2030 前后（Hassabis）到 2034（AI 2027 修订后）"，且最近的修订方向是**往后推**。没有哪一端被数据证伪。

---

## 十大最震撼的变化（每条一个数字，可视化）

1. **16 小时**：METR 测得 Claude Mythos Preview 能以 50% 成功率完成的任务时长（下限，区间 8.5–55 小时）。对比 2025-08 的 GPT-5 为 2 小时 17 分。可视化：一根增长的时间条。
2. **7250 亿美元**：四大云厂商 2026 年的资本开支，对比 2025 年约 4100 亿。可视化：两根柱子加人均换算。（需注明口径，一部分是涨价。）
3. **2 亿个蛋白结构**：AlphaFold，一次预测几乎覆盖已知蛋白；300 万研究者在用。可视化：一整面结构点阵。
4. **650 亿美元年化收入**：Anthropic，由约 90 亿（2025 年底）一年内增加约 7 倍（彭博，运行率口径，需标"自报"）。
5. **3000 亿美元，一天**：2026-02 软件股单日蒸发（口径 2850–3000 亿）。可视化：一个事件日的 K 线。
6. **约 75%**：谷歌称新代码由 AI 生成（2024-10 约 25%）。可视化：占比条，必须写"自称，经工程师审阅"。
7. **9 亿**：ChatGPT 周活（2026-02 官宣；2025-10 为 8 亿）；接近 10 亿的报道未获官宣确认。可视化：世界地图上一亿一格。
8. **7 亿**：中国生成式 AI 用户（2026-06，CNNIC，二手）；由 5.15 亿（2025-06）到 6.02 亿（2025-12）再到 7 亿以上（2026-06）。需先补一手核对。
9. **+17%**：2025 年数据中心用电同比（全球总用电 +3%），2030 年约 945 TWh。可视化：用电曲线。
10. **56 万个**：2026 上半年 App Store 新应用，几乎等于 2025 全年，但下载量只涨 2–3%。可视化：供给暴增、需求没动，这是最有"形状"的一幅图。

**备选**：1614 个 FDA 批准的 AI 医疗器械；95% 的英国本科生用 AI；35/42（IMO 2025 金牌线）。

---

## 比听起来弱的说法（务必标注或放弃）

1. **"AI 攻克了数学难题"**：Erdős 问题多为冷门题，Tao 自己称"低垂的果实"。AlphaEvolve 的 ω 改进在第 5 位小数。
2. **"AI 写了 X% 的代码"**：全是自报，口径各异，谷歌的口径 18 个月换了三次；独立抽查（开源库 git 记录）只有约 19%（未核实）。
3. **"AI 让程序员慢 19%"**：METR 自己已于 2026-02 称该结论过时、方法不可靠。方向反过来也别过度宣称。
4. **"年收入 650 亿"**：是运行率，不是年收入；官方只认 470 亿。
5. **"软件股蒸发 X 万亿"**：不同来源 285 亿到 8300 亿不等，起止日不同；也有人认为 AI 只是借口（估值、利率）。
6. **"METR 倍增时间 X 个月"**：METR 页面自己没给；二手版本 129–212 天，且 16 小时以上测量不可靠，测量天花板已到。
7. **"ChatGPT 10 亿周活"、"Gemini 10 亿月活"、"IMO 2026 满分"**：本次均无法核实一手。
8. **"企业采用率翻倍"**：Census 2025-11 改了问法，前后不可比。
9. **应用数量暴增**：下载量没涨，游戏里"赚到钱"的只涨了 14%。
10. **预测的方向**：AI 2027 的作者自己往后推了时间线，不是越来越近。

---

## 未核实与本次未覆盖

- 没有取到：OpenAI、Cursor 的 2026 数字；微软的 2026 新数字；英伟达 FY2027 数据中心收入；OpenAI/Anthropic 的"科学"项目的可核实成果；Sakana AI Scientist；LeCun、Marcus 的 2026 原话；AI 生成内容占比；Steam 数据；Pew 青少年数据；IMO 2026 官方结果；Metaculus 的实时值；Epoch 官方预测原文。
- 需要二次验证再进成片：IEA 2026 报告的 +17%，CNNIC 的 7 亿，Gemini 的 10 亿，Anthropic 的 650 亿，英伟达是否已破 6 万亿，2026-Q3 财报后的 capex 总数。
- 本文件大量数字来自二手汇总页（WebSearch 摘要），我只对 Census、Gallup、FDA、METR、DeepMind、erdosproblems、IEA 页面做了一手读取。引用时请把"强度"栏当作硬约束。
