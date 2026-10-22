# 《焦虑的形状》调研 06：AI 浪潮里，普通人到底能做什么

调研日期：2026-10-22。范围：名人的原话建议、岗位替代与增长证据、使用鸿沟、软件与游戏变容易的证据、电脑代理、"不必做的事"。数字与引语一律回到所列页面核对：看到原文的标"已核实"，只在搜索摘要、转载页、转录镜像里看到的标"未核实"或写明"转载"。AI 焦虑问卷、劳动力市场冲击研究、生产率随机对照实验见 05（`05-ai-anxiety.md`），这里不重复。

## 速查表

| 主题 | 一句话结论 | 关键数字 | 状态 | 出处 |
|---|---|---|---|---|
| 名人建议：共识 | 几乎所有人都说"先用起来"，竞争对手是会用 AI 的人 | 黄仁勋 2025-05-06、吴恩达 2024-07 / 2026-01 同一句式 | 已核实（转载页） | NBC/CNBC；Yahoo/Business Insider |
| 名人建议：分歧 | 体力/线下工作是避风港 vs 只是另一种用 AI | 辛顿"当水管工"；黄仁勋 2026-05"电工水管工，这是你们的时代" | 辛顿未核实；黄仁勋已核实（Fortune） | 见第 1 节 |
| 岗位增长/衰减 | WEF：到 2030 新增 1.7 亿、消失 9200 万、净增 7800 万；39% 核心技能要变 | 增长最快：大数据专家、金融科技工程师、AI/机器学习专家；下降最快：邮政职员、银行柜员、数据录入员、收银员、行政秘书 | 未核实（搜索摘要引新闻稿，WEF 页面 403） | weforum.org |
| 任务 vs 整个岗位 | 微软：适用度按"任务活动"算，不是失业预测 | 最高：媒体传播 0.38、服务销售 0.35、信息与记录文员 0.33；最低：林业 0.03、设备操作 0.04、园林 0.04、护理助理 0.04 | 已核实 | arXiv 2507.07935v6 |
| GDPval | 一次性的任务，前沿模型已接近专家 | 44 个职业；Claude Opus 4.1 胜或平 47.6%（2025-09 黄金子集） | 已核实 | arXiv 2510.04374 |
| Anthropic 经济指数 | 增强略多于自动化；用的人集中在编程 | Claude.ai：增强 52%、自动化 45%（2025-11）；计算机与数学任务 34% | 已核实 | anthropic.com 2026-01 报告 |
| 全球使用率 | 约六分之一的工作年龄人口在用 | 17.8%（2026 Q1）；北方 27.5% vs 南方 15.4%；阿联酋 70.1%；美国第 21 位 31.3% | 已核实 | 微软博客 2026-05-07 |
| 中国使用率 | 用户 6.02 亿，占人口 42.8% | 2025-06 为 5.15 亿、36.5%；占网民约 53.5%（我换算） | 已核实（新华网转载） | CNNIC 经新华网 |
| 职场使用 | 美国用得少，中国员工自报用得多；一半以上藏着用 | Pew：约十分之一每天或每周几次，55% 很少或从不；KPMG：全球 58%、中国 93% 工作中用过；57% 隐瞒 | Pew 已核实；KPMG 中国值已核实、57% 未核实原页 | 见第 3 节 |
| 做软件变容易 | 供给暴增，收入向头部集中 | 新 iOS 应用 2026 上半年约 56 万 vs 2025 全年约 60 万；下载仅 +2% | 已核实（引自 indie-dev/01） | 见第 4 节 |
| 电脑代理 | 基准已饱和，真实外包项目仍只自动化一小部分 | OSWorld 人类基线 72.36%；RLI 自动化率 2.5% → 15.8% | 基线、RLI 已核实；OSWorld 最新分数未核实 | 见第 5 节 |
| 不必做的事 | 提示词小技巧边际收益小，工具不必追新 | 礼貌/命令口吻"各题差异±60 个百分点，整体抵消" | 已核实 | Wharton GAIL 2025-03 |

---

## 1. 名人到底建议了什么（原话）

说明：WebFetch 返回的是摘要，不是原始 HTML。"已核实"指页面文字中出现了该引语。X/Twitter、Axios、部分访谈原页打不开，已逐条注明。

### 主题 A：先用起来，对手是会用 AI 的人（共识最强）

- **黄仁勋**，米尔肯研究院全球大会，2025-05-06："You're not going to lose your job to an AI, but you're going to lose your job to someone who uses AI."
  - 状态：已核实（NBC/CNBC 转载，2025-05-28），不是米尔肯讲稿原件。
  - URL：https://www.nbclosangeles.com/news/business/money-report/nvidia-ceo-you-wont-lose-your-job-to-ai-youll-lose-your-job-to-somebody-who-uses-ai/3710590
  - 注意：另有媒体把同一句话挂在 2025-10 的 GTC 场合，场合有分歧，成片只引"2025 年 5 月米尔肯"，并标"据 CNBC 转载"。
- **吴恩达**，2024-07 曼谷朱拉隆功大学相关演讲（Business Insider 2024-07-28 报道）："It also means AI won't replace people, but maybe people that use AI will replace people that don't."
  - 状态：已核实（Yahoo 转载）。https://tech.yahoo.com/ai/articles/ai-wont-replace-human-workers-202300190.html
  - 2026-01 达沃斯同类说法与"许多岗位 AI 只能做 30–40% 的工作"：未核实（仅见 Storyboard18 二手报道）。
- **山姆·奥特曼**，Stratechery 访谈，2025-03-20，回答"高中毕业生该怎么办"："The obvious tactical thing is just get really good at using AI tools."
  - 状态：已核实。https://stratechery.com/2025/an-interview-with-openai-ceo-sam-altman-about-building-a-consumer-tech-company/
- **德米斯·哈萨比斯**（2026-02-01 Yahoo Finance 文章）："I'd be telling them to get really, unbelievably proficient with these tools"
  - 状态：已核实（二手媒体）。https://finance.yahoo.com/news/demis-hassabis-tells-undergrads-unbelievably-223108561.html
  - "学会如何学习"、数理计算机：未核实（仅搜索摘要）。
- **Ethan Mollick**：《Co-Intelligence》第一条原则 "always invite AI to the table"，他在博文里称这是读者反馈影响最大的一条（One Useful Thing，2024-06-06，已核实但句子被截断）。四条原则的完整措辞未核实。https://www.oneusefulthing.org/p/doing-stuff-with-ai-opinionated-midyear
- **李开复**（中国视角）：《人民日报》英文客户端专访（腾讯新闻转载页 2025-02-07，已核实转载）："首先，我们必须将消极的焦虑转化为积极的自我提升"；"提升自己、使自己成为人工智能的老师，会是最好的工作。" https://news.qq.com/rain/a/20250207A03Q2I00
- **周鸿祎**，与罗永浩对话（虎嗅 2025-09-24 转载，已核实转载）："大家不用去争论说哪个行业，哪个岗位会被淘汰，我觉得这个焦虑没有用，应该想想怎么用AI提升你的能力"。https://www.huxiu.com/article/4784454.html
  - 同一场合他还说，要求用 AI 之后"拒绝用AI的人，那我就有理由裁掉他了"。这是老板视角，值得对照。

### 主题 B：体力、线下、"在场"的工作是避风港

- **杰弗里·辛顿**，Diary of a CEO，约 2025-06-16："A good bet would be to be a plumber."（语境："it's going to be a long time before it's as good at physical manipulation as us."）
  - 状态：未核实。只在自动转录镜像上看到（https://iamtypist.dev/youtube-transcript/giT0ytynSqg ，约 50 分钟处），播出日期来自播客列表。上屏前必须对 YouTube 原视频核对。
- **黄仁勋**，卡内基梅隆大学 2026 届毕业典礼，2026-05-10（Fortune 2026-05-11）："AI gives America the opportunity to build again. Electricians, plumbers, iron workers, technicians, builders—this is your time."
  - 状态：已核实，但工具提示该段超出 125 字限制，措辞按大意处理。https://fortune.com/2026/05/11/jensen-huang-tells-electricians-and-plumbers-this-is-your-time/
- **Tyler Cowen**，Sana AI 峰会主题演讲（Fortune 2026-05-22）："Being in the world and being human and being physical will be more the thing."
  - 状态：已核实（Fortune）。https://www.fortune.com/2026/05/22/tyler-cowen-ai-economy-not-mass-unemployment-adjustment/
- **李开复**（同上专访）："专注于所谓的软技能，即沟通、同理心、理解、建立联系和产生信任的能力，这些是人类独有的。"（已核实转载）

### 主题 C：主动性与适应力

- **Tyler Cowen**，同一演讲："The people who will win are the people who are best at taking initiative, figuring out how AI works"（引文被工具截断，后半句缺失）。已核实。
- **奥特曼**，《温和的奇点》（2025-06）："we will figure out new things to do and new things to want"。已核实。https://blog.samaltman.com/the-gentle-singularity 页面同时写："There will be very hard parts like whole classes of jobs going away"。
- **Karpathy**："vibe coding"（2025-02-02 X 帖）和 YC AI Startup School 演讲 "Software Is Changing (Again)"（2025-06-18）：X 帖和 YC 页打不开，只在转录镜像看到 "it's a very good idea to be fluent in all of them"（指三种编程范式）。未核实，只能当线索。

### 主题 D：保持人在回路里，别把判断外包

- **Mollick**，《15 Times to use AI, and 5 Not to》，2024-12-09："Asking for a summary is not the same as reading for yourself."（已核实）https://www.oneusefulthing.org/p/15-times-to-use-ai-and-5-not-to

### 主题 E：该学代码还是不该学代码

- **吴恩达**，The Batch 第 292 期，2025-03-12："Statements discouraging people from learning to code are harmful!"（已核实）https://www.deeplearning.ai/the-batch/issue-292/
- **杨立昆（Yann LeCun）**，VivaTech，2024-05（VentureBeat 2024-05-22，已核实）："You should work on next-gen AI systems that lift the limitations of LLMs."  这是对 AI 研究者说的，不是对普通人。对普通人的看法见 Newsweek 2025-04-02（已核实）："Everybody will become a CEO of some kind, or at least a manager… they may be smarter than us, but they will do our bidding."

### 主题 F：问题在结构，不只在个人

- **Dario Amodei**，Axios 2025-05-28：警告一半入门级白领岗位可能消失、失业率 10–20%、批评行业"粉饰"。原页 403，只见多家二手报道：未核实原话。
- 《The Adolescence of Technology》（2026-01，已核实）："Humanity needs to wake up."；"we need to break the link between the generation of economic value and self-worth and meaning."  建议对象是公司、政府和富人，没有对普通劳动者的具体建议。https://www.darioamodei.com/essay/the-adolescence-of-technology
- **Noah Smith**，《Plentiful, high-paying jobs in the age of AI》，2024-03-17（已核实）："I accept that AI may someday get better than humans at every conceivable task."；比较优势指"做一件事相对做其他事更强"。https://www.noahpinion.blog/p/plentiful-high-paying-jobs-in-the
- **雷军**，《中国新闻周刊》（IT之家 2026-03-07 转载，已核实转载）："在人工智能时代，或许很多规则将被重写，但同时又会产生很多新的岗位。"
- **国务院**《关于深入实施"人工智能+"行动的意见》（2025-08-26，新华网）：与就业相关的唯一一句是"涌现一批新基础设施、新技术体系、新产业生态、新就业岗位等"，文中未出现"劳动者"或"技能培训"。已核实。

### 观点冲突

1. **失业规模**：Amodei（半数入门白领、10–20%）对 Cowen（不会大规模失业，但"心理代价"大）、吴恩达（"到目前为止的 AI 导致失业被夸大"，未核实）。
2. **避风港在哪**：辛顿说去做体力活，黄仁勋也说电工水管工"这是你们的时代"，但理由不同：辛顿的是"AI 暂时做不了"，黄仁勋的是"AI 基建需要人建"。李开复则把"人际与同理心"当避风港。
3. **谁该负责**：黄仁勋、吴恩达、奥特曼、周鸿祎把答案放在个人（学会用 AI）；Amodei、Noah Smith 放在制度和比较优势。周鸿祎同时是用人方，说"拒绝用AI的人，我有理由裁掉他"，个人建议和雇主压力是同一件事的两面。
4. **学不学代码**：吴恩达说"学代码是有史以来最好的时机"；Karpathy 的 vibe coding 是"不必细学"的方向，但他自己强调要懂多种范式。
5. **利益相关**：黄仁勋卖 GPU、奥特曼和 Amodei 卖模型，"人人都要用 AI"这个建议对他们有商业利益，成片里引用时应注明身份。

---

## 2. 被替代的是什么，增长的是什么

### 2.1 世界经济论坛《2025 未来就业报告》（2025-01）

状态：未核实。WEF 页面打不开（403），下列内容来自搜索摘要对新闻稿与报告章节的转述，尚未在 WEF 原页看到。成片使用前请直接打开 PDF：https://reports.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf

- 到 2030 年，岗位变动相当于现有岗位的 22%；新增 1.7 亿、消失 9200 万、净增 7800 万。1.7 亿相当于现有就业的 14%。
- 雇主预计 39% 的工人核心技能到 2030 年会变化（2023 年版为 44%）。
- 增长最快：大数据专家、金融科技工程师、AI 与机器学习专家。下降最快：邮政职员、银行柜员及相关文员、数据录入员、收银员与售票员、行政助理与行政秘书。
- 调查基数：1000 多家雇主，覆盖 1400 多万员工，22 个行业、55 个经济体。
- 核心技能排名：分析性思维居首，七成企业视为必需，其后是韧性与灵活、领导力与社会影响。

### 2.2 微软研究院《Working with AI》（2025-07，arXiv 2507.07935，v6）

状态：已核实（arXiv HTML 版 Table 1）。

- 数据：约 20 万条匿名 Bing Copilot 对话，用 O*NET 工作活动匹配到职业，算"AI 适用度"。
- 适用度最高的小类：媒体与传播从业者 0.38、服务类销售代表 0.35、信息与记录文员 0.33。最低：林业与保育工人 0.03，设备与系统操作员、园林维护工人、家庭健康助理与护理助理各 0.04。这是小类的就业加权平均，不是单个职业。
- 论文原句："AI's effects on employment and wages will depend on hard-to-predict business decisions."  也就是说它测的是任务重合度，不是预测失业。
- 局限：来源单一（一个平台的用户），职业匹配靠 LLM 流水线。
- 用户最常见目标：学习、沟通、教学/解释、写作。

### 2.3 OpenAI GDPval（2025-09，arXiv 2510.04374）

状态：已核实。

- 44 个职业，覆盖美国 GDP 最大的 9 个行业，任务由平均 14 年经验的从业者出题。
- 原话："the current best frontier models are approaching industry experts in deliverable quality"
- 黄金子集上，Claude Opus 4.1 的交付物被评为优于或持平人类的比例为 47.6%。
- 局限（原文）：任务背景在提示里一次给全，真实工作要自己摸清情境；作者称这是对知识工作任务"有限的初步切片"。GDPval 覆盖约 14.15% 的 O*NET 任务（表 6 的 208/1470，我从表中读出，非原文句子）。
- 论文称"前沿模型加人工把关"可能比独立专家更快更便宜，但"计入审核与返工后，收益缩水"：GPT-5 朴素情形下速度 90 倍、成本 474 倍，"多试 n 次"方案下降为速度 1.39 倍、成本 1.63 倍（表 2）。
- 更新的成绩（GPT-5.2 约 70.9%）来自二手周刊，未核实。

### 2.4 Anthropic 经济指数（2026-01 报告，数据截至 2025-11）

状态：已核实（anthropic.com 报告页）。

- Claude.ai：增强（augmentation）52%，自动化 45%。增强重新超过自动化。API 流量以自动化为主。
- 计算机与数学类任务约占 Claude.ai 对话的三分之一（34%，2025-03 峰值 40%），API 约 46%。教学类 15%。最常见任务是修 bug，占 6%。
- 国家差异：人均 GDP 每高 1%，人均使用量约高 0.7%。全球集中度在两次报告间基本没变。
- 复杂任务的成功率会降：Claude.ai 上约 70% 降到约 66%；API 上低于一小时的任务约 60%，五小时以上约 45%。按成功率折算后，预计生产率增益约减半。
- 任务层面，作者称多数职业"在任务层面被去技能化"，但也有职业被抬升（例如房地产经理）。作者强调这是任务级模式，不是岗位级结果。

### 小结：任务 ≠ 岗位

三份研究一致：AI 替代的是任务，而且是"信息的创建、处理、沟通"这一类；它们都明说自己不测岗位消失。GDPval 的任务是一次性给全的，Anthropic 的成功率随任务变长而降。WEF 的"净增 7800 万"和 Anthropic/微软的"任务重合度高"并不矛盾，一个说岗位总量，一个说岗位里的内容在变。Stanford "Canaries in the Coal Mine"（修订于 2026-08-12，已核实）发现：22–25 岁、AI 暴露度高的岗位就业比预期低 19%，来自少招年轻人；"We find no evidence of widespread, economy-wide job displacement."；数据到 2026-06，作者自称"早期的、描述性的指标"，非因果估计。（该研究也可能被 05 引用，避免重复请两边口径对齐。）

---

## 3. 使用鸿沟

- **全球**（微软 AI 经济研究所，《全球 AI 扩散报告》2026 Q1，2026-05-07，已核实）："AI usage increased by 1.5 percentage points from 16.3% to 17.8% of the world's working age population."  北方 27.5%，南方 15.4%；阿联酋 70.1%；美国第 21 位（从第 24 位上升），31.3%；26 个经济体超过 30%。口径：15–64 岁人群中"在报告期内用过生成式 AI 产品"的比例，来自微软匿名遥测并按系统份额、网络普及率和人口校正，所以是估计，不是问卷。https://blogs.microsoft.com/on-the-issues/2026/05/07/the-state-of-global-ai-diffusion-in-2026/ 页面未提及中国。2026 年下半年可能已有更新，未查。
- **中国**（CNNIC，经新华网转载，已核实转载；cnnic.cn 的 PDF 是压缩流，工具读不出文字）：
  - 《生成式人工智能应用发展报告（2025）》，2025-10-18：截至 2025 年 6 月用户 5.15 亿，较 2024-12 增长 2.66 亿，普及率 36.5%（占人口）。https://www.news.cn/fortune/20251018/95ddc306f29f494fb188ed41ad8e5cca/c.html
  - 第 57 次《中国互联网络发展状况统计报告》（截至 2025-12，新华网 2026-03-02）：用户 6.02 亿，普及率 42.8%；网民 11.25 亿。6.02 ÷ 11.25 ≈ 53.5% 是我换算的，官方没这样说。https://www.news.cn/tech/20260302/66c4ab06b6f34f8d806b416b3acc9f0b/c.html
  - 《生成式人工智能应用发展报告（2026）》据搜索摘要称 2026-09 发布、用户超 7 亿：未核实。
- **美国职场**（Pew，2025-02-25，2024-10-07 至 13 调查 5273 名在职美国成年人，已核实）：约十分之一每天或每周几次用聊天机器人，7% 每月几次，55% 很少或从不；16% 说至少部分工作已由 AI 完成；18–29 岁中 23% 至少每月几次，其他年龄段不超过 17%。52% 担忧、36% 期待。注意调查是 2024 年 10 月的，已过去两年，数字已偏旧。https://www.pewresearch.org/social-trends/2025/02/25/u-s-workers-are-more-worried-than-hopeful-about-future-ai-use-in-the-workplace/
- **国际职场**（毕马威与墨尔本大学，2025-05-22，约 4.8 万人、47 国，调查期 2024-11 至 2025-01）：工作中用过 AI，中国 93%、全球 58%；每周或每天用，中国 50%、全球 31%（已核实，毕马威中国新闻稿）。https://kpmg.com/cn/en/media/press-releases/2025/05/global-study-reveals-trust-of-ai-remains-a-critical-challenge-reflecting-tension-between-benefits-and-risks.html
  - 同一研究：57% 的工人隐瞒过 AI 使用、把 AI 内容当自己做的；47% 接受过正式培训；三分之二不核查 AI 回答的准确性。以上来自多家媒体转述，原报告页未打开：未核实。
- **ADP 全球劳动力调查**（2026-07-14，36 个市场、3.9 万余员工，已核实）：中国 73% 每周多次用、26% 几乎每天用，从未接触过的 1.7%（全球 15%）。https://hk.adp.com/about-adp/press-centre/ai-usage-among-chinese-workers-significantly-exceeds-the-global-average.aspx
- **解读提示**：微软是遥测估计，Pew 和 KPMG 是自报问卷，口径不同，不能直接并排比大小。同一个"中国"，微软不报，CNNIC 说占人口 42.8%，KPMG 说职场 93%，三个口径指向三个人群。

---

## 4. 做软件和游戏变容易了，然后呢

本节的市场数字沿用 `films/indie-dev/research/01-market-shape.md`（2026-10-21，其内标注为已核实），我没有重新打开原页，只读了该文件的前 80 行。Steam 年发行量等未在这 80 行内，需要的话去该文件后半或 02、04 查。

- 新上架 iOS 应用：2026 上半年约 56 万，2025 全年约 60 万；下载只增 +2%（Sensor Tower 经 NYT/9to5Mac，2026-07-20）。
- 订阅类应用：24 个月内 17.3% 达到月收入 1000 美元，4.6% 达到 1 万美元；上线一年后的收入中位数约每月 72 美元；月新增发布从 2022-01 约 2000 个升到 2026-01 约 14700 个（RevenueCat 2026）。
- Stripe Atlas 独立创始人：2025 年相对 2024 年，前 6 个月收入中位数下降 23%，而前 10% 的收入上升 19%（Stripe 博客，2026-05-28）。
- 手游发行量 +77%，而收入超过 2 万美元的游戏只 +14%（Naavik，2026-04-19）。
- 单创始人占新创企业比例：23.7% 升到 36.3%（Carta，2025-12-09）。
- Lovable：每周 100 万个新项目，ARR 超过 5 亿美元，自报（TechCrunch，2026-06-09）。其他 Lovable、Replit、Bolt 的 ARR 与用户数只见于通讯稿或估算（Sacra），未核实，不建议上片。
- AI 写代码占比：Google 约 75% 的新代码由 AI 生成、工程师审核（MobileSyrup 引 Business Insider，2026-04-24，页面已核实但属二手；Pichai 称一次代码迁移比一年前纯人工"快六倍"）。Nadella 2025-04 称微软仓库里"20%、30%"的代码可能由 AI 写：未核实（只见搜索摘要）。
- 效率研究：METR 随机对照实验（2025-07-10，16 名资深开源开发者、246 个任务）：用 AI 后慢 19%，而他们事前预期快 24%，事后仍自认快约 20%（已核实）。https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ 更新（2026-02-24，57 人、800 多个任务）：2025 年末估计偏向变快（原开发者 -18%，置信区间 -38% 到 +9%；新开发者 -4%，置信区间 -15% 到 +9%，负数表示更快），METR 自称是"very weak evidence"，并指出选择偏差。https://metr.org/blog/2026-02-24-uplift-update/
- 要点：造东西的门槛确实掉了，但供给增长（上架量、独立创始人数）远快于需求（下载 +2%），结果是头部拿走更多。这对"普通人能做什么"是双面信息：能做出东西不再稀缺，被看见和变现才稀缺。

---

## 5. 电脑代理：能做多少办公室里的活

- Anthropic 2024-10-22 首次发布 computer use：Claude 3.5 Sonnet 在 OSWorld 上 14.9%（只用截图），给更多步数 22.0%（已核实）。https://www.anthropic.com/news/3-5-models-and-computer-use
- OSWorld 官网："Human performance over 72.36%"；原论文最好模型 12.24%（已核实，排行榜表格没加载出来，读不到分数）。http://osworld-v1.xlang.ai/ 2025-07-28 发布 OSWorld-Verified，2026-06-26 页面提到 OSWorld 2.0。
- 排行榜最新分数：第三方镜像称 OSWorld-Verified 最高 90.19%（2026-07-25），Claude Fable 5 为 85.96%；OSWorld 2.0 最好的官方二值完成率 44.33%。全部未核实（只见镜像 presenc.ai，没打开官方榜）。可以谨慎地说"这个基准已被追平甚至超过人类基线，后继的 2.0 版难得多"，但具体分数别上屏。
- Remote Labor Index（Scale AI 与 CAIS，真实外包项目，"AI 成果被判至少与专业人员一样好"的比例）：CAIS 2026-07-01 博文称最高自动化率为 15.8%（Fable 5），"The frontier has more than quadrupled in under eight months"。已核实该博文；2025-10 发布时的 2.5% 来自论文（arXiv 2510.26787），仅见搜索摘要，未核实。https://safe.ai/blog/significant-increase-in-digital-labor-automation
- METR 时间视野（AI 能独立完成的任务时长）约每 7 个月翻一番，更新的拟合更快：二手博客数字互相矛盾，未核实，需读 METR 原页。
- 企业采用：McKinsey 2025 年 AI 现状调查，23% 在某处规模化部署代理系统，39% 在试验，任何单一职能中规模化的不超过 10%。未核实（页面超时，只见搜索摘要）。
- 要点：基准分数与真实项目完成率之间还有很大落差，这就是"任务"和"岗位"的差距在代理身上的表现。

---

## 6. "不必做的事"：证据与专家观点

- **提示词技巧在贬值**：
  - Wharton 提示科学报告（Meincke、Mollick 等，2025-03-04，已核实）：单题上，把"请"换成"我命令你"可使成绩向任一方向变化"up to 60 percentage points"，但在整个数据集上相互抵消；原话："Being polite or commanding yields question-specific differences rather than global improvements"。https://gail.wharton.upenn.edu/research-and-insights/tech-report-prompt-engineering-is-complicated-and-contingent/
  - OpenAI 推理模型最佳实践文档（页面无日期，已核实）："Keep prompts simple and direct." 和 "Avoid chain-of-thought prompts"。https://developers.openai.com/api/docs/guides/reasoning-best-practices
  - Mollick《Using AI Right Now》（2025-06-23，已核实）：直接对话即可，"just approach the AI conversationally rather than getting too worried about saying exactly the right thing"；选 Claude、Gemini、ChatGPT 之一，"you can't go wrong with any of them"；也提醒"the free versions are demos, not tools"。https://www.oneusefulthing.org/p/using-ai-right-now-a-quick-guide
  - Karpathy 2025-06-25 "+1 for context engineering over prompt engineering"：未核实（X 打不开）。
- **不必追每个新模型**：只找到 Mollick 上面那篇"挑一个稳定工具"的建议。吴恩达、Cowen、Karpathy 没找到可引用的"别追新"原话，不要编。
- **什么相对耐久**：专家说法集中在"人际与同理心"（李开复）、"主动性"与"在场、人、身体"（Cowen）、"学会学习"（哈萨比斯，未核实）、判断与把关（Mollick）。能支持"判断、品味、关系、体力工作更耐久"的定量研究，这轮没找到。Stanford 的"金丝雀"研究只表明：AI 是补充的岗位，尤其是有经验的工人，就业持平或上升；受冲击的主要是年轻新人。Dell'Acqua 等"锯齿状前沿"（HBS 2023）和 Noy 与 Zhang（MIT 2023）两篇页面被拦或读不出，数字未核实，应以 05 的生产率 RCT 部分为准。

---

## 7. 对成片的建议

**最容易讲清的三句话（均已核实）**

1. 被 AI 吃掉的是任务，不是整份工作（微软、GDPval、Anthropic 都明说自己不测失业）。
2. 全球约 17.8% 的工作年龄人口在用 AI，北方 27.5%、南方 15.4%；会用本身还有差距。
3. 做出东西不再稀缺，被看见才稀缺（新 iOS 应用 56 万 vs 下载 +2%）。

**最出人意料的三点**

1. 中国员工自报"工作中用过 AI"93%，美国 Pew 里 55% 的工人很少或从不用聊天机器人。同一个议题，口径和时间不同，差距大得像两个世界（不要直接并排比，口径不同）。
2. METR 的实验：资深开发者用 AI 反而慢了 19%，且自己感觉快了 20%；后来更新倾向变快，但证据"很弱"。
3. 黄仁勋 2025 年的说法是"你会输给会用 AI 的人"，到 2026-05 又对毕业生说"电工、水管工，这是你们的时代"。卖 GPU 的人现在说该去建数据中心。

**成片里要避开的坑**

- 辛顿"当水管工"未核实；Amodei 的 Axios 原话未核实；WEF 数字未核实；OSWorld 最新分数未核实。
- 不要把"微软的使用率"和"CNNIC 的普及率"和"毕马威的职场使用率"当成同一个量。
- 名人建议里的商业利益要说清楚。

## 未核实与不能用的说法

- 辛顿"Train to be a plumber"（Ai4 场合，Free Press Journal 摘要）；"A good bet would be to be a plumber"（仅转录镜像）。
- Amodei Axios 原话；"一半入门白领、10–20%"只见二手报道。
- WEF：1.7 亿 / 9200 万 / 22% / 39% 及岗位排行（搜索摘要）。
- 吴恩达 2026-01 达沃斯的两句话（Storyboard18）。
- 李开复 2026-02 央视"不是工具淘汰你，而是时代淘汰不用工具的人"：转载页上可能是整理者概括，非逐字原话。周鸿祎"AI 不会淘汰人，但会淘汰不会使用 AI 的人"（新华网）同样可能是记者转述。
- 李开复"15 年内约 40% 岗位"（《AI 超级大国》）没找到原页。他 2017 年说"约 50%"（Fortune 2024-05-25 引述，已核实）。
- 李彦宏、张一鸣、王小川、姚期智、朱啸虎：没找到可用的原话页。
- OSWorld 最新排行榜分数、METR 时间视野、McKinsey 代理数据、Lovable/Replit/Bolt 的 ARR 与用户数、Nadella 的 20–30%、Pichai 的 25%/30%。
- 毕马威"57% 隐瞒 AI 使用"的原报告页。
- 本文所有 WebFetch 结果由小模型摘要，引语逐字性以"摘要中出现"为准；上屏前建议对原页复核。
