# 调研：只留故事要用的

2026-10-30。每条都回到一手页面或权威报道核过；"核"一栏写怎么核的。知乎只当观点收集器（`ZHIHU-NOTES.md`，Codex 读了 37 个问题、505 个回答、457 位答主），片子里的事实不来自知乎。

搜索工具：Mac mini 上的 `grok`（Grok Build CLI 1.0.52，`grok -p "<问题>"`）和 `dsh`（`.zshrc` 别名 `npx -y @deepseek-ai/dsh web`，非交互用 `npx -y @deepseek-ai/dsh headless "<任务>"`）在这台机器上都没登录（grok 报 "Not signed in"，dsh 缺 DeepSeek API key），已请作者登录。下面这一轮用的是我自己的网页搜索和直接打开原文。

## 片中用到的数字

| 片中说法 | 一手来源怎么写 | 核 |
|---|---|---|
| 一个人创办，半年，8000 万美元 | TechCrunch 2025-06-18《6-month-old, solo-owned vibe coder Base44 sells to Wix for $80M cash》：创始人 Maor Shlomo 一人持股、没融资（bootstrapped），成立 6 个月，现金交易；Wix 确认交易时有 8 名员工，8000 万里 2500 万作为留任奖金分给他们 | 打开原文。片中写"一个人创办""卖掉时团队 8 人"，不说"一个人卖了" |
| 约 5.4 亿元 | 8000 万 × 6.72（2026-10 人民币对美元中间价约 6.72–6.74，中国外汇交易中心） | 换算，标"约" |
| 他之前就在创业圈有名；边做边在网上公开记录，口口相传 | TechCrunch 同文："Base44 spread mostly through word of mouth as Shlomo shared his building journey on LinkedIn and Twitter"；"already known in Israeli startup circles through his previous company, Explorium" | 打开原文 |
| 5,079 个公开收入的小生意，一半每月不到 $169（约 1,100 元） | Indie Hackers《I analyzed 5,079 Stripe-verified startups》（2026-03，TrustMRR 数据）："Median monthly revenue across all 5,079 projects: $169" | 旧片 10-21 核过原文；本轮复核摘要一致。是自愿公开收入的样本，片中说"公开收入的" |
| 1.25 亿户个体工商户 | 市场监管总局：截至 2024 年 6 月底，全国登记在册个体工商户 1.25 亿户，占经营主体总量 66.9%（央视网 2024-07-31、求是网 2024-08-26）；另有报道称 2025 年 3 月底为 1.26 亿户（新浪财经 2025-06-14），未见总局原文，不用 | 多家报道一致；个体工商户按《促进个体工商户发展条例》是"以个人或者家庭形式从事工商业经营" |
| 每月新上线的订阅 App：2,000 → 14,700 | RevenueCat《State of Subscription Apps 2026》："~2,000 new subscription apps launched per month in Jan 2022; 14,700+ by Jan 2026"（数据来自 Appfigures） | 打开原文 |
| 工信部：鼓励各地对"一人公司"给予包容支持 | 工信部办公厅 2026-09-04 印发《人工智能中小企业创业支持计划（2026—2028 年）》："鼓励各地对依托智能工具开展敏捷创业的'一人公司'、超级个体等微型主体给予包容支持" | 澎湃新闻转载原文 |
| 广东：到 2028 年建成 100 个人工智能 OPC 生态社区 | 广东省发改委 2026-03-16《广东省支持人工智能 OPC 创新发展行动方案（2026—2028 年）》：2028 年建成百个人工智能 OPC 生态社区、培育千家标杆企业；报道称是全国首个省级专项政策；方案还提出搭"场景池" | 多家媒体转载一致，未见省发改委原文页面，片中只用目标数 |
| 成都：免租、算力券每年最高 500 万 | 《成都市支持人工智能 OPC 创新发展若干措施（征求意见稿）》（36 氪 2026-03-23）："3 月免租 + 3 月减半"；算力券补贴不超过购买费用的 60%，每年最高 500 万元 | 征求意见稿，片中标明 |
| 头部一人公司赚的，是普通的 61 倍（四年前 34 倍） | Stripe 博客 2026-05-28（Jesse Carey，Stripe Atlas）："Four years ago, top-decile solo founders made about 34 times the revenue of the median solo founder in their first six months. In 2025, that figure had grown to 61 times." | 打开原文。口径：Stripe Atlas 上的单人创始公司，头 6 个月收入 |
| 做得最好的，第一个月的客人下个月近 3 成回来；普通的 8% | Stripe 同文："Nearly 30% of top-decile customers returned the following month, versus 8% for middle-decile startups." | 打开原文 |
| 第二年，这些老客人比刚来时多花 47% | Stripe 同文："By the start of year two, first-month customers at top-decile startups were spending 47% more than initially" | 打开原文 |
| 电视台开起来后，挤进全美收入前 1% 的演员多了一倍，娱乐业工作少了约 13%，中间的人掉得最多 | Felix Koenig《Technical Change and Superstar Effects: Evidence from the Rollout of Television》，American Economic Review: Insights 2023-06；AEA 研究摘要："the share of entertainers in the top 1 percent of the US wage distribution doubled"；"Overall entertainment jobs fell by roughly 13 percent, with middle-income jobs suffering the heaviest losses"；电视前"an entertainer's audience was limited by the number of people that could fit in an auditorium" | AEA 摘要原文 |
| 一人公司的老板要自己证明公司的钱和家里的钱分开，证明不了要一起还 | 《公司法》（2023 修订，2024-07-01 施行）第二十三条第三款："只有一个股东的公司，股东不能证明公司财产独立于股东自己的财产的，应当对公司债务承担连带责任。" | 法条原文。知乎上有人说成"必然无限责任"，那是错的，片中照法条说 |
| 社保：公司那份、个人那份，都是你出 | 灵活就业参加职工养老保险，缴费比例约 20%（其中 12% 进统筹、8% 进个人账户），全部由本人缴（广东省人社厅等）；在自己的公司参保，单位部分也由公司（即老板自己的钱）出 | 地方文件；片中不写具体比例，只说两份都是你出 |

## 备用（不一定上屏）

- Carta《Solo Founders Report 2025》（2025-12-09）：美国 Carta 平台上新公司里单人创始的比例，2019 年 23.7% → 2025 年上半年 36.3%；单人公司占 2024 年新公司 30%，只拿到定价融资金额的 14.7%。
- Stripe 同文：2026 年第二季度 Stripe Atlas 上新成立的 C 类公司里，单人创始占 63%，历史最高；头部单人公司开张第一个月平均卖到 10 个国家，普通的 3 个。
- RevenueCat 同报告：两年内月收入到过 $1,000 的 17.3%，到过 $10,000 的 4.6%。

## 不用的

- Medvi（"两兄弟 4 亿美元营收"）：有 FDA 警告信和造假账号的报道，不用。
- 知乎上的"30 个里 28 个半年注销""90% 被淘汰""1600 万家一人公司"等：没有可查的样本和口径，不用。
- 各地政策里的"最高 1000 万""免费住宿"等：多是汇总帖，未见正式文件，不用。
- "园区去库存""为了收税"：知乎答主对动机的推测，不当事实说。
- "生病了公司就停"：有人住院期间靠外包照常经营（知乎老刀），不说成定律。

## 知乎里对故事最有用的

- 读者第二关心的就是"做出来卖给谁、客户凭什么信我、为什么续费"（至少 64 个回答明确谈到），高频原话："AI 最大的盲区：它能帮你生产，但不能帮你成交。"
- 吵得最凶的一条："一人公司是新组织形态，还是个体户换了个名字"。片子的煎饼车段正面回答它：一个人做生意不新，新的是街没了。
- "大家用的是同一个 AI，凭什么买我的？"：竞争与护城河是第七大关切。
- "一人"通常是一个经营者加外部网络（外包、平台、云）：和"手可以租"一致。
- 政策争论的核心是"增加供给不保证消费"。片子只说政策降的是哪一块成本，不评价动机。
