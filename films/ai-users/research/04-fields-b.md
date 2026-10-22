# 《最会用 AI 的人，在用 AI 干什么》研究底稿 04：金融 / 教学 / 客服 / 政府 / 新闻

截止日期：2026-10-22。本文件只收我亲自读到原文的数字；每条都标了强度。

## 读法

- **强度标签**：**已核实（一手）** = 我读了原始页面/PDF，数字就在里面；**二手** = 只有媒体转述（已写明哪家）；**未核实** = 只有搜索摘要、聚合站，或来源互相矛盾。没有升级过任何一条。
- **自报**：公司/政府自己发布的数字，口径由发布方定义。Anthropic 数据一律写"Anthropic 自己的数据"（本文件未用到）。OpenAI 相关写"OpenAI 自报"。
- **推算** = 我自己的算术，算式都写在旁边。
- 每个例子都带"公平提示"（失败、反转、口径局限）。上片时建议把公平提示做成同一画面的第二拍，而不是脚注。
- **方法说明（重要）**：本次会话的 WebSearch 共享额度中途耗尽，我之后改用各机构自己的公开登记库/站内接口定位原文：巨潮资讯（A 股年报 PDF）、港交所披露易（港股年报）、世界银行文档库接口、GOV.UK 站内接口，再用 curl 直接读原文。因此有几个点**没能找到一手来源**，已在文末"缺口"列出，没有拿二手凑数。
- 年报页码为 PDF 页码，方便剪辑时回查。

## 速查表

| 领域 | 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|---|
| 金融 | 工商银行：AI 数字员工承担的工作量 | **5.5 万人年**（全行员工 409,758 人，推算占 13.4%）；30 余个业务领域、500 余个场景 | 工商银行 2025 年报（2026-03-28 公告）p19/p61/p114 | 已核实（一手，自报） |
| 金融 | 中国平安：AI 坐席 | **约 17.02 亿次**，覆盖 **80%** 客服总量；94% 寿险保单秒级核保 | 中国平安 2025 年报（2026-03-27）p39 | 已核实（一手，自报） |
| 金融 | 招商银行：节约人工 | **1,556 万小时**；856 个场景；运营人员"营小助"覆盖率 100% | 招商银行 2025 年报（2026-03-28）p44-45 | 已核实（一手，自报） |
| 金融 | JPMorgan：LLM Suite | CIB 部门 **65,000+** 人"actively use"；90%+ 工程师用 AI 编码助手 | JPM 2025 年报条线信（2026-04） | 已核实（一手，自报） |
| 金融 | JPMorgan：资管自动化 | 约 **75%** 股票交易自动化，称为客户省约 **40 亿美元**交易成本；研究"到洞察"时间 -80% | 同上 AWM 信 p66-67 | 已核实（一手，自报） |
| 金融 | JPMorgan 对就业的表态 | Dimon："AI will definitely eliminate some jobs"；COO："the goal is not fewer headcount" | 同上 | 已核实（一手） |
| 金融 | Morgan Stanley：财富顾问 | **98%** 顾问团队已采用；可答问题从 7,000 个到 10 万份文档语料内"任何问题" | MS 新闻稿（2024-06）；OpenAI 客户案例 | 已核实（一手，自报；后者 OpenAI 自报） |
| 金融 | Bridgewater AIA Labs | LLM 预测系统在 ForecastBench 上与人类超级预测者"统计上无差异" | arXiv 2511.07678（2025-11-10） | 已核实（一手，自报，预印本） |
| 教学 | Gallup×沃尔顿基金会：美国教师 | 6/10 教师用过 AI；每周用的约 3/10；每周用者自估省 **5.9 小时/周**，≈ **6 周/学年** | Gallup 2025-06-24 + 报告 PDF | 已核实（一手，教师自估） |
| 教学 | 世界银行尼日利亚 RCT | 综合测验 **+0.31 SD**（英语单科 0.23 SD）；折合 **1.5–2 年**常规教学；6 周、12 次×90 分钟 | World Bank PRWP 11125（2025-05） | 已核实（一手，工作论文） |
| 教学 | 科大讯飞：AI 批改/教师助手 | 星火智能批阅机 **3000+ 学校**、日均批改 **360 万份**；教师助手 **80 万+教师** | 科大讯飞 2025 年报（2026-04-29）p13-14 | 已核实（一手，自报） |
| 客服 | Klarna 2024 | 首月 **230 万**次对话 = 三分之二；等于 **700 名**全职；解决时长 11 分钟 → <2 分钟 | Klarna 新闻稿 2024-02-27 | 已核实（一手，自报） |
| 客服 | Klarna 2025 反转 | 员工约 5,000 → 近 3,000；CEO 称将重新招人工客服、承认全力押 AI 质量下降 | CNBC 2025-05-14（引述 Bloomberg 采访） | 二手 |
| 客服 | Brynjolfsson 等 | 5,179 名客服；平均 **+14%**/小时解决量；新手 **+34%**；资深几乎无增益 | NBER w31161（QJE 2025） | 已核实（一手） |
| 客服 | Salesforce | Benioff："reduced it from 9,000 heads to about 5,000"（支持岗位） | CNBC 2025-09-02 | 二手 |
| 客服 | Intercom Fin | 平均解决率 **76%**（12,000+ 客户）；每周 200 万次解决 | intercom.com/fin（2026-06 后快照） | 已核实（一手，Intercom 自报） |
| 客服 | 中国联通 | 客服智能体上线，"智能服务占比超过 85%" | 联通 2025 年报 p12 | 已核实（一手，自报；分母口径未披露） |
| 政府 | 英国 Copilot 实验 | **20,000** 公务员、12 个机构；平均省 **26 分钟/天** | GOV.UK / GDS 2025-06-02 | 已核实（一手，自述节省） |
| 政府 | 英国 Consult | **5 万+** 份意见 **约 2 小时**归类，AI 成本 **£240**，专家复核 22 小时 | GOV.UK 2025-10-16 | 已核实（一手） |
| 政府 | 美国联邦 OneGov | 约 **350 万**联邦雇员可用 AI 工具；OneGov 累计省约 $16.8 亿，其中约 $14 亿来自 AI 协议 | GSA 新闻稿 2026-09-10 | 已核实（一手；"可用"≠"在用"） |
| 政府 | 深圳福田区 | **70 名** AI 数智员工、11 类、240 场景；劳动仲裁裁决书 **≤4 分钟**（人工 4 小时以上） | 深圳政府在线 2025-02-18；新华社 2025-02-20 | 已核实（一手，政府自报） |
| 政府 | 阿尔巴尼亚 Diella | 2025-09 被任命为"AI 部长"，管公共采购 | Guardian 2025-09-11；BIRN 2025-09-16 | 二手（噱头型，非效果证据） |
| 新闻 | 路透研究所 2026 趋势报告 | 97% 出版方称后台自动化"重要"；**67%** 称 AI 尚未省下任何岗位 | Reuters Institute（约 2026-01） | 已核实（一手，行业调查） |
| 新闻 | CNET（反例） | 发布 77 篇 AI 辅助稿（约占 1%），审计后发现需更正，暂停 | CNET 总编说明（2023-01） | 已核实（一手） |
| 新闻 | 芝加哥太阳报（反例） | 2025-05 暑期书单 15 本里**只有 5 本真实存在** | NPR 2025-05-20 | 二手 |

---

## 一、金融

### 1.1 工商银行：AI 数字员工"5.5 万人年"（最强的中文数字）
- **谁/做了什么**：工商银行开展"领航AI+"行动，千亿参数金融大模型"工银智涌"，在 30 余个业务领域落地 500 余个 AI 应用。
- **数字**：**"AI 数字员工承担工作量5.5 万人年"**。2025 年末全行员工 **409,758 人**（年报 p68）。**推算**：55,000 ÷ 409,758 = 13.4%，即相当于全行约八分之一的人力。
- **原文**（年报 p61）："开展'领航AI+'行动，推动大模型在30 余个业务领域落地500 余个场景，AI 数字员工承担工作量5.5 万人年。"p114"热点问题五"还写明四大场景：投资交易、营销拓客、风险防控、运营提效（远程银行坐席助手、智能审核、智能质检）。
- **日期/URL**：2025 年年度报告，2026-03-28 公告。https://static.cninfo.com.cn/finalpage/2026-03-28/1225047240.PDF
- **强度**：已核实（一手，工行自报）。
- **公平提示**：5.5 万"人年"是折算口径，年报**没有披露折算方法**；不是"裁了 5.5 万人"，年报也没有把它和减员挂钩。镜头里要写"折合"，不要写"替代"。

### 1.2 中国平安：AI 坐席 17 亿次，覆盖 80% 客服量
- **数字**：2025 年 **AI 坐席服务量约 17.02 亿次，覆盖平安 80% 的客服总量**；**94% 的寿险保单秒级核保**；平安产险反欺诈智能化理赔拦截减损 **105.1 亿元**；AI 代码渗透率 **35.49%**（增量代码中 AI 生成占比）。
- **原文**（p39）："平安AI坐席服务量(1)约17.02亿次，覆盖平安80%的客服总量"；脚注：服务量指语音机器人、文本机器人提供的信用卡和保险业务外呼和应答总次数。
- **日期/URL**：2025 年年度报告，2026-03-27。https://static.cninfo.com.cn/finalpage/2026-03-27/1225038263.PDF
- **强度**：已核实（一手，自报）。
- **公平提示**：口径是"次数"（含外呼），不是"人"；"覆盖 80%"的分母由平安自己定义；"减损"是内部估算的避免损失，不是现金。

### 1.3 招商银行：节约人工 1,556 万小时
- **数字**：2025 年大模型在零售、批发、风控、运营、办公等领域落地 **856 个场景应用**；"人工效能提升方面节约人工 **1,556 万小时**"；运营人员使用"营小助"覆盖率 **100%**，对公客户经理 80.13%、信贷人员 80.32%；研发人员"编码小助"覆盖率超 97%；日均 Tokens 吞吐较 2024 年增长 10.1 倍。
- **推算**（假设每人每年 2,000 工时，该假设是我加的）：15,560,000 ÷ 2,000 = **约 7,780 人年**；年报称研发人员 11,051 人占员工总数 9.09%，故总员工约 11,051 ÷ 0.0909 ≈ 121,600 人，7,780 ÷ 121,600 ≈ 6.4%。
- **日期/URL**：2025 年年度报告（p44-45），2026-03-28。https://static.cninfo.com.cn/finalpage/2026-03-28/1225047590.PDF
- **强度**：已核实（一手，自报）。
- **公平提示**：节约小时数是内部估算；上面的"人年"换算是我的推算，不要当作招行口径出片。

### 1.4 中国联通 / 中国电信（客服占比，放在客服部分也可）
- 中国联通 2025 年报 p12："推出客服智能体，智能服务占比超过85%"。https://static.cninfo.com.cn/finalpage/2026-03-20/1225078768.PDF（已核实一手，自报；分母口径未披露）。
- 中国电信 2025 年报 p14："智能客服占比较2024 年底提升5.2pp"；AI 代码生成占比 40%、研发效率 +20%、网络故障处置效率 +30%、上线应用超 250 个。https://static.cninfo.com.cn/finalpage/2026-03-25/1225027302.PDF（已核实一手，自报；无绝对值）。

### 1.5 JPMorgan（2025 年报条线信，2026-04）
- **数字（全部已核实一手，JPM 自报）**：
  - CIB 信："Over 90% of our engineers now use AI code assistants, and more than 65,000 CIB colleagues actively use LLM Suite, our generative AI platform."
  - 同信：交易筛查中"AI has enabled us to review more than double the volume while halving the number of manual operator checks."
  - 资管（AWM）信：SpectrumIQ "automated nearly 75% of equity trading (saving clients about $4 billion in trading costs since inception)"；Smart Monitor"compressing time-to-insight by 80%"；Connect Coach 服务 12,000 用户、含 25 个专门 AI agent。
  - 消费银行（Marianne Lake）："nearly 60% increase in value from AI and machine learning (ML) year-over-year"；运营目标"more than 40% gross productivity efficiency by 2030"。
  - COO 信："the goal is not fewer headcount; the goal is compounding performance with a growth-first mindset"。2026 技术预算约 $19.8 billion。
  - Dimon 股东信（2026-04-06）："AI will definitely eliminate some jobs, while it enhances others."；"There is a possibility that AI deployment will move faster than workforce adaptation to new job creation."
- **URL**：条线信 PDF https://www.jpmorganchase.com/content/dam/jpmc/jpmorgan-chase-and-co/investor-relations/documents/line-of-business-ceo-letters-to-shareholders-2025.pdf ；CEO 信 https://www.jpmorganchase.com/ir/annual-report/2025/ar-ceo-letters
- **没能核实的（不要上片）**："价值 15–20 亿美元""15 万/20 万员工每周在用 LLM Suite""Dimon 说 AI 已回本"。我在 CEO 信全文 PDF 里搜"LLM Suite"零命中，条线信里只有上面 CIB 一处。二手搜索摘要里出现过"2025-10 Dimon 称每年在 AI 上花约 20 亿美元"（Decrypt 转引 Business Insider 的说法，我没读到原话），属于**花费**而非收益。
- **公平提示**：Dimon 自己写明会减岗；COO 写"目标不是减人"。两句并列本身就是最诚实的画面。

### 1.6 Morgan Stanley：财富顾问助手
- **数字**：**98% 的顾问团队已采用** AI @ Morgan Stanley Assistant；OpenAI 页面："We went from being able to answer 7,000 questions to a place where we can now effectively answer any question from a corpus of 100,000 documents"（David Wu）。Debrief（会议纪要工具，Whisper+GPT-4）新闻稿中顾问原话："saving me about half an hour per meeting just by handling all the notetaking"（Don Whitehead，属推荐语）。
- **日期/URL**：MS 新闻稿（2024-06，据 BusinessWire 链接日期 2024-06-25）https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch ；OpenAI 客户案例 https://openai.com/index/morgan-stanley/（页面写"over 98% of advisor teams actively use"）。
- **强度**：已核实（一手；MS 自报 / OpenAI 自报）。
- **公平提示**：98% 指"团队采用"，不是每个人每天用；"半小时"是顾问个人感言，不是测量；我没找到 MS 2026 年的更新数字。

### 1.7 Goldman Sachs（弱项，只作辅助）
- Fox Business 2025-06-23 报道 CIO Marco Argenti 备忘录：GS AI Assistant 面向全公司上线；"Thousands of our people are already using the GS AI Assistant"；2025-01 曾向 **10,000** 名员工推出；可调用 GPT-4o、Gemini、Claude 3.7 Sonnet 等多个模型。https://www.foxbusiness.com/technology/goldman-sachs-announces-firmwide-launch-ai-assistant
- 强度：二手（Fox Business 引述内部备忘录）。没拿到高盛自己的使用人数，不建议当主力镜头。

### 1.8 Bridgewater AIA Labs：对冲基金自己造"超级预测者"
- **数字**：AIA Forecaster 在 ForecastBench 上"achieves performance equal to human superforecasters"（正文："statistically indistinguishable from human superforecasters"）。
- **日期/URL**：2025-11-10，作者署名 Bridgewater AIA Labs。https://arxiv.org/abs/2511.07678
- **强度**：已核实（一手，自报，预印本，未同行评审）。
- **公平提示**：论文自己写，在 1,610 道取自预测市场的更难题目上"lags slightly behind market consensus"（略逊于市场共识），只有"AI+市场"的组合才胜过市场。这是难得的诚实反例，镜头可用。

---

## 二、教学

### 2.1 Gallup × 沃尔顿家庭基金会：教师每周省 5.9 小时
- **谁/怎么做**：2025-03-18 至 04-11，网络调查 **2,232 名**美国公立 K-12 教师（RAND 美国教师固定样本，概率抽样）。
- **数字**：2024-25 学年**六成**教师用过 AI 工具；**32%** 至少每周用；每周用者**估计每周省 5.9 小时**；"Over the course of a 37.4-week school year, these time savings add up to the equivalent of six weeks"。
- **算式（Gallup 报告 p21）**：5.9 × 37.4 = 220.66 小时；按每周合同工时 37.5 小时折算 ≈ 5.9 周，Gallup 取"约六周"。
- **日期/URL**：2025-06-24。https://news.gallup.com/poll/691967/three-teachers-weekly-saving-six-weeks-year.aspx ；报告 PDF https://www.gallup.com/file/analytics/691922/Walton-Family-Foundation-Gallup-Teachers-AI-Report.pdf
- **强度**：已核实（一手，教师自估；基金会与 Gallup 合作研究，基金会为教育慈善机构，非 AI 厂商）。
- **公平提示**：5.9 小时只代表"每周用"的那约三成教师，不是全体教师平均；是教师自己估的，不是计时；调查里 7% 以下说用 AI 更费时，16% 以下说质量下降。**我没找到 2026 年的后续调查**（Gallup 教育专题页未见），所以不要写"2026 年显示"。

### 2.2 世界银行尼日利亚随机对照试验
- **谁/怎么做**：贝宁城 9 所公立中学，高一学生放学后 12 次、每次 90 分钟，在老师指导下用 Microsoft Copilot（GPT-4）学英语，共 6 周。
- **数字**：综合测验 **+0.31 个标准差**（含英语、AI 技能、数字技能三部分）；**主要结果英语单科 +0.23 SD**（摘要口径；引言里英语分项为 0.24）；折合"**1.5 到 2 年**常规教学"；每 100 美元带来 3.2 个"等效就学年"；第三学期期末英语考试仍有 +0.21 SD。最终样本：实验组 422 人、对照组 337 人。
- **原文**（摘要）："equating to 1.5 to 2 years of 'business-as-usual' schooling"。博客（2025-01-09）："nearly two years of typical learning in just six weeks"。
- **日期/URL**：Policy Research Working Paper 11125，2025-05。https://documents.worldbank.org/curated/en/099548105192529324/pdf/IDU-c09f40d8-9ff8-42dc-b315-591157499be7.pdf ；博客 https://blogs.worldbank.org/en/education/From-chalkboards-to-chatbots-Transforming-learning-in-Nigeria
- **强度**：已核实（一手，工作论文，未经同行评审）。
- **公平提示（四条都要知道）**：①0.31 是**含 AI/数字技能题的综合分**，主要结果英语是 0.23；②对照组"没有任何干预"，不是和"没有 AI 的课后辅导"比；③这是老师在场的课后项目，不是"AI 单独教"；④论文承认实验组与对照组流失率差异显著，学生是自愿报名后抽签。"两年"是用成本效益框架换算的，不是学生真的多学了两年。另：效果在女生和原本成绩更好的学生身上更大。

### 2.3 科大讯飞：AI 批改和教师助手（中文规模数字）
- **数字**（2025 年报 p13-14）：**星火智能批阅机已服务 3000 余所学校，市占率 75% 以上，日均批改作业超 360 万份**；批改服务续费率超 80%；"星火教师助手……已服务全国超 80 万名教师，日均互动率达 75%"；"数据跟踪显示……教师批改负担下降达 90% 以上，单班级单学科的学情分析从半小时缩短至 1 分钟内"。
- **推算**：3,600,000 ÷ 3,000 = 约 1,200 份/校/日（3000"余"所，是上限估算）。
- **日期/URL**：2025 年年度报告，2026-04-29。https://static.cninfo.com.cn/finalpage/2026-04-29/1225233581.PDF
- **强度**：已核实（一手，科大讯飞自报）。
- **公平提示**：是销售设备的厂商自己的"数据跟踪"，未披露样本与口径；"负担下降 90%"不是第三方评估。

### 2.4 教育部（政策背景，无使用量）
- 教育部网站 2026-10-10"人工智能赋能教师发展现场会举行"：升级上线国家智慧教育平台教师发展中心，启动**教师人工智能素养全覆盖培训**。http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202610/t20261011_1453584.html ；《中国教育报》2026-10-14 报道：新版设 AI 素养专区。http://www.moe.gov.cn/jyb_xwfb/s5147/202610/t20261014_1454119.html
- 强度：已核实（一手，政策表态；**没有使用量数字**）。可作为"现在国家层面已把它当必修课"的一句字幕。
- **缺口**：国家智慧教育平台 AI 功能使用量、学而思/作业帮 AI 批改规模，我没找到可核实的一手数字（作业帮未上市；学而思未检索到）。

---

## 三、客服

### 3.1 Klarna：先吹后"回调"，一对镜头
- **2024-02-27 新闻稿（Klarna 自报）**："The AI assistant has had 2.3 million conversations, two-thirds of Klarna's customer service chats"；"doing the equivalent work of 700 full-time agents"；"on par with human agents in regard to customer satisfaction score"；重复咨询下降 25%；"resolve their errands in less than 2 mins compared to 11 mins previously"；预估 2024 年带来 4,000 万美元利润改善。https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ （已核实，一手，自报）
- **2025-05 反转（二手，CNBC）**：CEO Siemiatkowski 对 CNBC 说公司"从约 5,000 人缩到近 3,000 人"（推算 -40%，部分来自招聘冻结和自然流失）；CNBC 写他在一周前的 Bloomberg 采访中说会"以 Uber 式"重新招募真人客服，并承认全面转向 AI 客服导致质量下降。https://www.cnbc.com/2025/05/14/klarna-ceo-says-ai-helped-company-shrink-workforce-by-40percent.html （二手）
- **未核实**：Bloomberg 原文（2025-05-08）返回 403，我没读到原话，所以不要引用 Bloomberg 里的具体措辞。
- **公平提示**：700 人等效是 Klarna 自己的口径；之后公司自己承认质量问题并回头补人工。这是整片"客服"段最重要的公平性镜头。

### 3.2 Brynjolfsson、Li、Raymond：生成式 AI 给新手加了 34%
- **数字**：5,179 名客服；"productivity, as measured by issues resolved per hour, by 14% on average, including a 34% improvement for novice and low-skilled workers but with minimal impact on experienced and highly skilled workers"。
- **日期/URL**：NBER Working Paper 31161（2023-04，2023-11 修订）；已发表于 QJE 2025 年第 140 卷第 2 期 889-942 页。https://www.nber.org/papers/w31161 （已核实，一手；研究经费来自斯坦福数字经济实验室）
- **公平提示**：单一公司、单一岗位；对资深员工几乎没用；AI 把高手的做法"复制"给新手，这也意味着高手的优势被压缩。

### 3.3 Salesforce：Benioff 称支持岗位 9,000 → 5,000
- **数字**："I've reduced it from 9,000 heads to about 5,000, because I need less heads"（Benioff，Logan Bartlett Show 访谈，节目于 2025-08-29 播出，CNBC 2025-09-02 报道）。推算：4,000 ÷ 9,000 = 44%。
- **URL**：https://www.cnbc.com/2025/09/02/salesforce-ceo-confirms-4000-layoffs-because-i-need-less-heads-with-ai.html
- **强度**：二手（CNBC/NBC Bay Area 转述；我没读到播客原音）。
- **公平提示**：Salesforce 同时对媒体称"we no longer need to actively backfill support engineer roles"、"支持工单数量下降"，说明一部分是不补缺；CNBC 引述分析师 Ed Zitron，认为科技公司把疫情期间过度招聘归因到 AI。

### 3.4 Intercom Fin：厂商自报 76% 解决率
- **数字**：官网："averaging 76% across 12,000+ customers, with many seeing over 85%"；"Currently at 2 million weekly resolutions"；"the average resolution rate increases 1% every month"。
- **日期/URL**：页面 2026-10-22 抓取（页内最新时间点 2026-06）。https://www.intercom.com/fin
- **强度**：已核实（一手，Intercom 自报）。
- **公平提示（关键口径）**：Intercom 帮助中心定义，"resolution"包含"assumed resolution"——客户"exits the conversation without requesting further assistance"（离开且没再求助）也算解决。所以 76% 不是满意度。https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-resolutions

### 3.5 中国：平安、联通、电信（见 1.2、1.4）
- 平安 80% 客服量由 AI 坐席覆盖；联通"智能服务占比超过 85%"；电信智能客服占比较 2024 年底 +5.2 个百分点。三者均为年报一手、自报。
- **没查到可引用的**：京东言犀、美团、阿里、中国移动的 AI 客服占比。我读了京东 2025 年报（港交所）、美团 2025 年报、中国移动 2025 年报全文关键词，没有量化占比；未用。

---

## 四、政府

### 4.1 英国政府 Copilot 实验：20,000 人，每天省 26 分钟
- **数字**：2024-09-30 至 12-31，**20,000** 名公务员、12 个机构；"Trial participants saved an average of 26 minutes a day when using M365 Copilot."；报告推算"replicated across a full working year, users could save 13 days"；82% 不愿回到没有 Copilot 的状态；超过 70% 同意减少了搜索信息和琐碎事务的时间；17% 没感到明显省时。
- **日期/URL**：GDS，2025-06-02 发布。https://www.gov.uk/government/publications/microsoft-365-copilot-experiment-cross-government-findings-report （HTML 版 .../microsoft-365-copilot-experiment-cross-government-findings-report-html）
- **强度**：已核实（一手）。
- **公平提示**：26 分钟来自用户自述区间的中点，不是计时；报告自己写"it was not possible to identify how time saved was spent"；Excel 和 PowerPoint 的最高采用率只有 23% 和 24%；政策类团队处理"含相互矛盾意见的材料"时吃力，报告写明对复杂、数据密集的工作"limitations"。

### 4.2 英国 Humphrey 工具箱：Consult 两小时归类 5 万份意见
- **数字**（2025-10-16 官方新闻稿）：独立水务委员会（Independent Water Commission）征求意见，**5 万多份**回应，Consult "categorised responses into themes in around 2 hours, costing £240 and experts only needed 22 hours to check the results"；与两组专家"almost 83%"一致，而两组专家彼此只有 **55%** 一致。**推算**：£240 ÷ 50,000 ≈ 0.48 便士/份。
- 之前（2025-05-14）苏格兰政府非手术美容咨询：2,000+ 份回应，AI 主题排序与专家"nearly identical"。
- 官方预测"可省 **75,000 个工作日**、£2,000 万/年"，这是**推广后的潜在数字**，不是已实现。
- **URL**：https://www.gov.uk/government/news/ground-breaking-use-of-ai-saves-taxpayers-money-and-delivers-greater-government-efficiency ；https://www.gov.uk/government/news/government-built-humphrey-ai-tool-reviews-responses-to-consultation-for-first-time-in-bid-to-save-millions
- **强度**：已核实（一手，政府自报）。
- **公平提示**：£240 是 AI 运行成本，不含开发和 22 小时专家复核、也不含并行做的人工详细审阅（新闻稿写明团队另对利益相关方回应做了人工精读）。同一页还有 Minute（会议纪要）：25 个地方议会试用，早期研究显示每个 1 小时会议省"60 分钟行政事务"（2025-05-23）；2026-06-16 规划文件数字化工具 Extract 向英格兰所有议会开放，另一个试点原型"aims to halve"住宅类申请处理时间（8 周到 4 周），仅在 3 个郡早期测试，**还是目标**。https://www.gov.uk/government/news/ai-tool-to-slash-planning-decision-times-as-government-accelerates-push-to-build-15-million-homes

### 4.3 美国联邦：OneGov / GSA
- **数字**（GSA 2026-09-10 新闻稿）："Since its inception, OneGov has achieved approximately $1.68 billion in cost savings … approximately $1.4 billion stems from AI agreements that have expanded access to AI tools for roughly 3.5 million federal employees."；新协议给 OpenAI ChatGPT 模型 **50% 折扣**、按用量计费、2026-10-01 生效、27 个月。**推算**：1.4 ÷ 1.68 = 83% 的节省来自 AI 协议。
- **URL**：https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-expands-onegov-ai-offerings-with-discounted-openais-chatgpt-09102026
- **强度**：已核实（一手，政府自报）。
- **公平提示**：350 万是"获得访问权"的人数，不是实际在用的人数；"节省"是相对目录价的折扣，不是生产率收益。GSA 也自己说这些优惠到期后要续约。

### 4.4 深圳福田区：70 名"AI 数智员工"
- **数字**：2025-02 福田区上线首批 **70 名**基于 DeepSeek 的 AI 数智员工，涉及 **11 大类**，解析 **240 个**政务场景；公文格式修正"准确率超95%，审核时间缩短90%，错误率控制在5%以内"；民生诉求分拨"准确率从70%提升至95%"；个性化定制生成时间"从5天压缩至分钟级"；AI 任务督办助手跨部门任务分派效率 +80%、按时完成率 +25%；数智融合平台汇聚近十年政务数据 **1.2 亿条**。
- **新华社实地采访**（2025-02-20）：一份劳动仲裁裁决书"全程不超过4分钟"，人工"一份文书往往需要花费4小时以上"。**推算**：4 小时 = 240 分钟，240 ÷ 4 = 至少 60 倍（人工"4 小时以上"是下限）。
- **日期/URL**：深圳政府在线（来源：福田区，2025-02-18，新华社稿）https://www.sz.gov.cn/cn/xxgk/zfxxgj/gqdt/content/post_12006997.html ；新华视点 2025-02-20（中证网转载）https://cs.com.cn/5g/202502/t20250220_6475668.html
- **强度**：已核实（一手，福田区政府自报；新华社记者现场体验）。
- **公平提示**：全部是区政府自报，我没找到独立第三方评估，也没找到上线 20 个月后的更新数字；"准确率"口径是格式修正/分拨，不是办案结论；工作人员仍要核实调整（新华社写明）；官方措辞是 AI 从"替代人力"到"激活人力"，**不要在片里写成"替代了公务员"**。

### 4.5 阿尔巴尼亚 AI"部长"Diella（噱头级，慎用）
- **事实**：2025-09-11 总理 Edi Rama 宣布 Diella 成为"首位由 AI 虚拟创造的内阁成员"，负责公共采购；Rama 称要让 Albania 成为"a country where public tenders are 100% free of corruption"。Diella 自 2025-01 起在 e-Albania 门户做语音助手。Guardian 2025-09-11：https://www.theguardian.com/world/2025/sep/11/albania-diella-ai-minister-public-procurement
- **公平提示**：BIRN 2025-09-16 评论称"没有法律框架和保障"，是"risky innovation"：https://balkaninsight.com/2025/09/16/albanias-headline-grabbing-ai-minister-is-a-risky-innovation/ 。"100% 无腐败"是承诺，不是结果。
- 强度：二手（Guardian）。维基百科称截至 2025 年中已协助获取"3.6 万份文件、近 1,000 项服务"，**我没读到一手，未核实，不要用**。

### 4.6 缺口
- 各地政务接入 DeepSeek 的"总数"：没有找到统一统计。我读到的只有北京青年报/新华网 2025-02-19 报道北京丰台区"丰小政"数智助手上线（单点案例）。https://www.news.cn/local/20250219/92e940caa34f4f4f8008d6ab1888389d/c.html
- 北京/上海 12345 热线 AI、爱沙尼亚：没有读到一手来源。

---

## 五、新闻

### 5.1 路透研究所《新闻、媒体与技术趋势与预测 2026》
- **数字**：对 51 个国家 280 位数字业务负责人的调查：后台自动化被 **97%** 认为"重要"；新闻采集类用例 **82%**（第二重要）；AI 编程和产品开发 81%；44% 称本机构 AI 项目结果"promising"，**42% 称"limited"**；**67%** 称**至今没有因 AI 效率省下任何岗位**，16% 略有减员，9% 反而新增了岗位/成本。
- **日期/URL**：约 2026-01 发布（页面抽取不到具体日期，数据含 2025-11）。https://reutersinstitute.politics.ox.ac.uk/journalism-media-and-technology-trends-and-predictions-2026
- **强度**：已核实（一手，行业调查，样本为"战略抽样"而非随机）。
- **用法**：这条本身就是"最会用 AI 的新闻人到底多会用"的冷水：几乎都在用，但多数没省出人头。

### 5.2 AP：本地新闻 AI 项目（定性）
- AP 官网："AP developed five AI projects in 2023 as part of its Local News AI initiative, which was funded by the John S. and James L. Knight Foundation"：自动写公共安全事件稿、西语天气警报翻译、视频自动转写生成稿件初稿、读者线索分拣、会议记录工具等。https://www.ap.org/solutions/artificial-intelligence/ （已核实，一手，但**没有规模数字**）
- **AP 自动化财报稿的规模**：我只在维基百科（转引 AP/Automated Insights）看到"自 2014 年起""产量增加十倍以上"，没读到 AP 一手页面，Automated Insights 页面 403。**未核实，不要引用具体篇数**。

### 5.3 反例一：CNET（2023）
- CNET 总编 Connie Guglielmo 说明："We started small and published 77 short stories using the tool, about 1% of the total content"；一篇被指出事实错误后全面审计："We identified additional stories that required correction, with a small number requiring substantial correction"；"We've paused and will restart using the AI tool when we feel confident"。https://www.cnet.com/tech/cnet-is-testing-an-ai-engine-heres-what-weve-learned-mistakes-and-all/
- 强度：已核实（一手，页面正文未显示具体日期，外界报道为 2023-01）。
- **未核实**：媒体广泛报道"77 篇中 41 篇需更正"，该页面没有这个数字，我没读到出处，不要写。

### 5.4 反例二：芝加哥太阳报"暑期书单"（2025-05）
- NPR 2025-05-20："Only five of the 15 titles on the list are real."；该书单属于 King Features（赫斯特旗下）授权内容，作者 Marco Buscaglia 承认用了 AI 并未核查；404 Media 报道其原话："I can't believe I missed it because it's so obvious. No excuses"。
- URL：https://www.npr.org/2025/05/20/nx-s1-5405022/fake-summer-reading-list-ai ；https://www.404media.co/chicago-sun-times-prints-ai-generated-summer-reading-list-with-books-that-dont-exist/
- 强度：二手（NPR、404 Media 均为媒体报道，但内容含当事人承认）。

### 5.5 缺口（新闻领域是本批最弱的一块）
- **没有拿到**可核实的"调查记者用 AI 筛百万级文件"的具体案例数字（ICIJ、NYT、WSJ、ProPublica 均未取得一手页面）；路透/彭博工具、新华社/人民日报 AI 主播与写稿规模，同样**没有一手数字**。需要补：建议下一轮单独查 ICIJ 官网方法说明、ProPublica Nerd 博客、新华社年度数据。

---

## 最适合上片的 10 条（按"画面冲击 × 核实强度 × 可讲故事"排序）

1. **工商银行 AI 数字员工承担 5.5 万人年**（一手年报；推算约占全行员工 13.4%）。中文观众最熟悉的机构，数字大而且有出处。镜头写"折合"，配 409,758 人对比。
2. **英国 Consult：5 万多份意见，2 小时，£240，专家复核 22 小时**（GOV.UK 一手）。成本小到荒诞，又自带可信度检验（83% 对 55%）。注意加"AI 成本，不含复核和人工精读"。
3. **平安 AI 坐席 17.02 亿次，覆盖 80% 客服量**（一手年报）。一个数字就能撑一整屏，且是客服领域最硬的中文证据。
4. **福田区 70 名数智员工：裁决书 4 分钟 vs 4 小时**（政府网站+新华社实地）。画面感最强；必须同屏标"区政府自报""官方称激活而非替代人力"。
5. **世界银行尼日利亚：6 周，+0.31 SD，折合 1.5–2 年**（一手论文）。教学领域唯一的随机对照证据，必须带"英语单科 0.23、老师在场、对照组无干预"的二拍。
6. **Klarna：700 名等效 → 回调补人工**（一手新闻稿+CNBC 二手）。整片最好的"先升后收"叙事，也是公平性的锚。
7. **JPMorgan：65,000 人在用，Dimon 写"会消灭一些岗位"，COO 写"目标不是减人"**（一手）。同一份年报里的两种口径并列，比任何旁白都有力。
8. **美国联邦 350 万雇员可用，OneGov 累计省约 $14 亿（AI 协议）**（GSA 一手）。体量最大；写"可用"而非"在用"。
9. **科大讯飞：日均批改 360 万份作业、80 万名教师在用**（一手年报，自报）。给教学段补一个中文规模数字，标注厂商自报。
10. **Gallup：每周用 AI 的教师每周省 5.9 小时 ≈ 一学年六周**（一手；仅限每周用者、自估）。数字好记，且 Gallup 自己把算式写在 p21。

备选：Brynjolfsson 等的 +14%/+34%（NBER 一手，经典）、Bridgewater AIA（"与超级预测者无差异"但"略逊于市场"）、招商银行 1,556 万小时、中国联通 85%、Reuters Institute 的"67% 没省下任何岗位"（作为全片冷静收束）。

## 不要用

- **JPM "价值 15–20 亿美元""15 万/20 万人每周用 LLM Suite""AI 已回本"**：未核实；CEO 信全文无 LLM Suite 字样。"20 亿美元"最多只找到二手的"年度 AI 花费"说法。
- **高盛"46,000 人"之类全员数字**：只有二手且互相不一致；高盛只确认过"数千人在用"和 1 月 1 万人试点。
- **"教师平均每年省六周"**：只对"每周用 AI"的约三成教师成立，且是自估；不能说所有老师。
- **"AI 补习等于多学两年"**不带限定：综合分含 AI/数字技能题，英语 0.23；对照组无干预；是老师在场的课后项目。
- **Klarna 的 700 人等效单独放**：必须配 2025 年自己承认质量问题并回头补人工。Bloomberg 原话我没读到，不要引。
- **Salesforce 4,000 人写成"被 AI 取代"**：公司自己说的是"不再补缺"，工单量下降；且为二手。
- **Intercom 76% 当作客户满意**：口径含"assumed resolution"，且是厂商自报。
- **英国"75,000 个工作日、£2,000 万"当成已实现**：是官方预测；"8 周减到 4 周"的规划原型只是目标。
- **26 分钟/天当成计时结果**：是自述区间中点。
- **Diella 当作效果证据**：只是任命，"100% 无腐败"是承诺；维基百科的 3.6 万份文件数字未核实。
- **福田区"替代公务员"**：官方说法是"激活人力"，全为自报，无第三方评估。
- **AP 自动化财报篇数**：只有维基百科转引，未读到一手。
- **招行 1,556 万小时折算成 7,780 人年**：只是我的推算（假设 2,000 工时/年），不是招行口径。
- **CNET"77 篇中 41 篇出错"**：该一手页面没有"41"，未核实。
- **梅州 12345 热线接入 DeepSeek 的等待时间数字、广州/辽宁案例**：只见到搜索摘要，没有读到原文，未核实。
