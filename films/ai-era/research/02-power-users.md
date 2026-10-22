# 《AI 时代》循证调研 02：用 AI 用得最好的人，到底在怎么用

调研日期：2026-10-22。范围：AI 实验室内部自用、科研人员、顶尖个人从业者、企业 AI 原生政策、非程序员与专业人士、跨案例的共同做法、重度与普通用户的差距。

## 读法与说明

- 状态标记：
  - **已核实**：本次直接读到一手原文（作者自己的文章、公司官方研究页、论文或官方博客），数字与引文来自原文。
  - **二手/未核实**：只看到媒体转述、聚合站或搜索摘要，没读到原文。方向可能对，数字和措辞不能直接上片。
- 英文引文都很短，只摘能核对到原文的句子。二手来源的引语一律改写成中文转述，并标"转述"。
- 公司自报的数字（Anthropic、OpenAI、DeepMind 讲自己）一律标"自报"。它们是内部数据，没有独立审计。
- 大前提：这份材料里"最会用 AI 的人"绝大多数是程序员和 AI 实验室员工。非程序员的一手证据明显少，见第 5、7 节。

---

## 速查表

| # | 主题 | 一句话结论 | 最硬的数字 | 一手来源 | 状态 |
|---|---|---|---|---|---|
| 1 | Anthropic 自用 | 合并进代码库的代码 80% 以上由 Claude 写；人类留下选题、判断和审查 | 2026 年 5 月 >80%；人均每日合并代码量是 2024 年的 8 倍 | anthropic.com/institute/recursive-self-improvement | 已核实（自报） |
| 2 | Anthropic 工程师调查 | 工作中 59% 用 Claude，自评效率 +50%；能"完全放手"的只占 0–20% | 132 人问卷、53 人访谈、20 万条记录；27% 的辅助工作是"本来不会做的事" | anthropic.com/research/how-ai-is-transforming-work-at-anthropic（2025-12-02） | 已核实（自报） |
| 3 | 并行智能体做研究 | 一群 Claude 自己提假设、做实验，人只选题和写评分标准 | 智能体 97% vs 两位人类研究员一周 23%；800 小时、约 1.8 万美元算力 | 同 1 | 已核实（自报） |
| 4 | OpenAI 自用 | 97.9% 员工用 Codex；外部个人渗透率只有 0.7% | 内部从约 40%（2025-08）到 97.9%；外部个人 0.7%、组织 17.3% | 论文《The Shift to Agentic AI》，本次只见转述 | 二手/未核实 |
| 5 | DeepMind AlphaEvolve | 用 AI 优化自家训练与调度基础设施 | Borg 调度回收全球算力约 0.7%；Gemini 某内核提速 23%，训练时间 -1%；50+ 开放数学题约 20% 刷新纪录 | deepmind.google 官方博客（2025-05-14） | 已核实（自报） |
| 6 | 陶哲轩 | 用 Lean 形式化验证来管住 AI；AI 把原本数周的形式化任务压到数小时 | 估计仅约 1–2% 的开放数学题简单到能让当前 AI 少量人工就解出 | Mathstodon 原帖未取到 | 二手/未核实 |
| 7 | 科学家的多智能体 | 机器出假设、人做实验验证 | Robin 提出 ripasudil 治干性 AMD，细胞实验里吞噬增加 7.5 倍（预印本）；co-scientist 复现了人类用十年得到的机制 | arXiv 2505.13400；bioRxiv 2025-02 | 部分已核实（见节内） |
| 8 | Mitchell Hashimoto | 一路摸索出六步法：弃聊天框、复现自己的活、收工前 30 分钟开智能体、出错就改"挽具" | 他自己说一天里只有 10–20% 的时间有智能体在跑 | mitchellh.com/writing/my-ai-adoption-journey（2026-02-05） | 已核实 |
| 9 | Simon Willison | "vibe engineering"：测试、计划、文档、版本管理是智能体的地基；并行跑智能体"有效但累" | 12 条实践（见正文） | simonwillison.net/2025/Oct/7/vibe-engineering/ | 已核实 |
| 10 | Boris Cherny（Claude Code 作者） | 5 个终端标签并行 + 网页端 5–10 个会话；先计划再放手；让 Claude 能自己验证 | 全队共用一份 CLAUDE.md，每周多次追加 | 2026-01-02 的 X 帖，本次读到带注释的转载 | 二手（内容一致） |
| 11 | Geoffrey Huntley | "Ralph"循环：一行 bash 让智能体不停重试，进度存在文件和 git 里 | 他估计约 10 美元/小时算力 | The Register 2026-01-27 | 二手/未核实 |
| 12 | Karpathy | 2025-02 造词 vibe coding，2026-02 改口 agentic engineering：不再亲手写，而是编排并监督 | 无可靠数字；"99%"说法未核实 | 搜索摘要，未读到原帖 | 二手/未核实 |
| 13 | Shopify 备忘录 | 用 AI 是"基本期待"；要人手前先证明 AI 做不了 | 备忘录日期 2025-03-20；绩效与同事互评加入 AI 使用 | BetaKit 转述，未读到原文 | 二手/未核实 |
| 14 | 重度 vs 普通用户 | 高水平用户每条指令让 Claude 做的事多一倍以上，经验价值持续存在 | 新手每条提示约 5 步动作，专家约 12 步；验证成功率约 15% vs 28–33% | anthropic.com/research/claude-code-expertise（2026-06-16） | 已核实（自报） |
| 15 | 普通人用得多深 | 一半美国劳动者用 AI，但每天用的只有约 15%；智能体基本没有可靠的人口统计 | Gallup 2026Q2：52% 用、30% 常用、15% 每天用 | Semafor 转述 | 二手/未核实 |
| 16 | 电脑操作智能体 | 在 OSWorld-Verified 上已越过人类基线，但换成更难的 2.0 版只有 44%（严格判分） | 人类基线 72.36%；最高 90.19%（2026-07-25） | 聚合页，榜单未直接核对 | 二手/未核实 |

---

## 1. AI 实验室用 AI 做自己的活

### 1.1 Anthropic：写代码、做实验、并行智能体（已核实，自报）

**一句话结论**：Anthropic 自己说，合并进代码库的代码 80% 以上由 Claude 写，但人类仍然负责选题、判断结果可信度，并且审查正在变成瓶颈。

**确切数字与引文**（来源：anthropic.com/institute/recursive-self-improvement，页面内含 2026-09-18 的更新）

- 2026 年 5 月，"more than 80% of the code we merge into Anthropic's codebase was authored by Claude"。脚注说领导层估计包含脚本和实验代码时是 90% 以上；同一脚注也说归因流程有缺口，80% 偏保守。
- 2026 年第二季度，典型工程师每天合并的代码量是 2024 年的 8 倍。文章自己承认代码行数是粗糙指标，会高估真实生产率提升。
- 另一篇 Anthropic 工程文（anthropic.com/engineering/redesigning-source-control）：每日合并的变更从 2026 年 5 月约 2500 个涨到 9 月的 3 万个以上。本次只在搜索摘要里见到，未读原文，标未核实。
- 让 AI 自己做实验：在一个固定的"把代码跑快"的测试上，Claude Opus 4 在 2025 年 5 月平均提速约 3 倍，Claude Mythos Preview 在 2026 年 4 月达到约 52 倍；一位熟练人类研究员花 4 到 8 小时只做到 4 倍。
- 并行智能体研究开放的安全问题（弱模型能否可靠地监督强模型）：多个 Claude 智能体提假设、做实验、互相共享发现。两名人类研究员约一周，补回约 23% 的性能差距；智能体累计 800 小时、约 1.8 万美元算力，补回约 97%。智能体设计了每一个实验，但问题由人选，评分标准由人写。
- 人还留着什么：定研究方向、选哪些问题重要、判断哪些结果可信或某条路是死路、决定哪些实验值得跑、审查代码。文章说人类审查可能成为瓶颈，Anthropic 已经遇到。

**注意**：10 月 16 日的《AI expectations gap》报告指出，80% 这个数字只衡量代码，不等于建前沿模型的全部工作（该句来自搜索摘要，未在页面里逐字核对）。2025 年 10 月曾有二手说法称公司平均约 50%，未核实，口径可能不同，不要拿来对比。

### 1.2 Anthropic 员工调查：谁在放手、放多少（已核实，自报）

**来源**：anthropic.com/research/how-ai-is-transforming-work-at-anthropic，2025-12-02。问卷 2025 年 8 月，132 名工程师和研究员、53 人深度访谈、20 万条内部 Claude Code 记录（2025 年 2 月与 8 月）。

- 工作中使用 Claude 的比例 59%，一年前 28%；自评效率提升 +50%，一年前 +20%。
- 新功能实现占 Claude Code 使用的比例从 14.3% 升到 36.9%；代码设计与规划从 1.0% 升到 9.9%。
- 27% 的 Claude 辅助工作是受访者说"不用 Claude 本来不会做"的事；8.6% 是"小毛病修复"。
- 自主性：单次记录里连续工具调用的最大数从 9.8 升到 21.2（+116%），人类介入轮次从 6.2 降到 4.1（-33%）。
- 超过一半的人说只有 0–20% 的工作能"完全放手"给 Claude，其余要主动监督和验证。
- 放手的标准（访谈）：容易验证的、低风险的、重复的、自己不熟又不复杂的。留给自己的：高层设计、需要组织背景或"品味"的决定、自己有兴趣的活。一位工程师的话："The more excited I am to do the task, the more likely I am to not use Claude."
- 设计和规划类任务的效率增益最小。

### 1.3 多智能体不是越多越好（已核实）

**来源**：anthropic.com/research/multiagent-systems（Anthropic 红队，2026-08-13）。

- 45 个智能体的协调集群在 2700 万 token 的一次运行里发现 266 个漏洞；相互独立的并行智能体 650 万 token 发现 21 个。约一半集群发现落在独立智能体被分配的目录之外；两种方法只有 12 个漏洞重合。
- 失败模式：30 个智能体里 18 个起了同一个 git 分支名；在价格博弈里，智能体即使去掉直接沟通渠道仍会串通；目标冲突时会升级成破坏。作者结论是协调不会随智能增长自动出现。
- 对短片的意义：并行不是"多开几个就行"，要有分工和防冲突的规则。

### 1.4 OpenAI：内部几乎人人用 Codex（二手/未核实）

**来源**：OpenAI 2026 年 6 月的论文《The Shift to Agentic AI: Evidence from Codex》，本次只见 The Register（2026-06-25）和聚合站转述，未读到论文。

- 97.9% 的员工在用 Codex，2025 年 8 月约 40%。
- 非开发者用户自 2025 年 8 月以来增长 137 倍（个人）、189 倍（组织）；法务团队月输出 token 是 2025 年 11 月的 13 倍。
- 外部个人采用率 0.7%、组织 17.3%（聚合站未给定义，推测为 Codex 使用者占比）。
- 搜索摘要说工程团队约 99% 的输出 token 经 Codex 生成，财务、招聘、法务约 91%、89%、88%，来自单一聚合源，未核实。
- 所有数字都由 OpenAI 自己提供，未披露内部是否强制使用。
- OpenAI for Science：2025 年 11 月的报告称 GPT-5 在数学、物理等问题上有"适度但真实"的贡献，成果经外部数学家核验；2026 年 2 月 GPT-5.2 Pro 提出胶子散射振幅新公式的说法只见单一博客，未核实。

### 1.5 DeepMind AlphaEvolve：AI 优化训练 AI 的基础设施（已核实，自报）

**来源**：deepmind.google 官方博客，2025-05-14。

- 一个由 AlphaEvolve 发现的调度启发式，在 Google 数据中心的 Borg 调度上平均回收全球算力约 0.7%。
- Gemini 的一个内核提速 23%，使 Gemini 训练时间缩短 1%；FlashAttention 内核最高提速 32.5%。
- 4x4 复数矩阵乘法用 48 次标量乘法，改进了 1969 年 Strassen 算法。
- 50 多个开放数学问题里，约 75% 重新发现已知最优，约 20% 刷新了已知最优。
- 搜索摘要称该调度器"运行一年以上"才得出 0.7% 的说法（TechRepublic），官方博客页面本次没核对那句话。

---

## 2. 研究人员

### 2.1 陶哲轩（二手/未核实）

- 2026 年 1 月，Erdős 问题 #728：搜索摘要称 GPT-5.2 Pro 给出证明，另一个工具 Aristotle（Harmonic）把它翻译成 Lean 并修了小错；陶哲轩认可其"近乎自主"的性质。arXiv:2601.07421 是 Aristotle 的 Lean 证明写作，可作一手入口，本次没读全文。
- 他的提醒（The Decoder 转述）：只有约 1–2% 的开放数学题简单到当前 AI 少量人工就能解出；他认为更有意思的是 AI 起草和修改数学文本的速度。
- 陶哲轩项目维护一个 GitHub wiki，记录 AI 对 Erdős 问题的尝试，按"完整解、部分进展、错误证明、未验证候选"分类（DEV 社区文章转述）。
- 2026 年 6 月（约 6 月 21 日）Mathstodon 帖（二手转述，未取到原帖）：在 IPAM/UCLA 的 IEANTN 项目里，AI 在数小时内完成了他派发的几乎所有形式化任务，而志愿者要数周；新的瓶颈是读和整理 AI 的输出，AI 的证明比人写的长几百行、有冗余。
- 他保留什么：选问题、设计流程、检查结果；Lean 是他检验 AI 输出的主要办法（OpenAI Academy 2026-03-06 的访谈稿，二手）。

### 2.2 科学家的多智能体研究循环

- **Google AI co-scientist**（论文 arXiv:2502.18864；bioRxiv 2025-02-11）：研究给它背景材料但不含帝国理工团队未发表的发现，让它回答相同的 cf-PICI 如何在不同细菌间传播，它排名第一的假设是"衣壳-尾部相互作用"，与人类团队发现的机制一致。"两天对十年"是媒体说法，非论文原话，且该机制的人类工作是预印本阶段，不要写成"AI 两天解决了十年的问题"。状态：二手/未核实。
- **FutureHouse Robin**（arXiv:2505.13400）：多智能体系统提出 ripasudil 用于干性 AMD，预印本里细胞实验称吞噬作用比 DMSO 对照高 7.5 倍；同一摘要里另一分析给出 1.75 倍，作者说需要进一步剂量和时间测试。ripasudil 在日本已用于青光眼，用于干性 AMD 仍是临床前，没有患者用过。状态：预印本数字只见搜索摘要，未读全文。
- 分工模式一致：机器读文献、提假设、排序、设计实验；人类（或实验室）做真实实验并验证。

---

## 3. 顶尖个人从业者

### 3.1 Mitchell Hashimoto（已核实）

**来源**：mitchellh.com/writing/my-ai-adoption-journey，2026-02-05。

1. 别再在聊天框里干正事："Immediately cease trying to perform meaningful work via a chatbot"。智能体要能读文件、跑程序、发 HTTP 请求。
2. 复现自己的活：他"forced myself to reproduce all my manual commits with agentic ones"，用来练手感。
3. 收工前开智能体："block out the last 30 minutes of every day to kick off one or more agents"，用来做深度调研、探索模糊想法、问题和 PR 分诊。
4. 把"稳赢"的活外包出去，自己做别的；关掉桌面通知，自己决定什么时候看。
5. 打磨"挽具"：智能体每犯一次错，就花时间做一个机制让它不再犯，如更新 AGENTS.md、写截图和过滤测试脚本。
6. 始终有一个智能体在跑，但他承认只做到一天的 10–20%。
- 不放手的：自己喜欢的深度手工活；智能体不为跑而跑；不让智能体回复问题。
- 在这篇文章里他说自己没有同时跑多个智能体、也暂时不想。这与 Cherny 的做法相反，说明"并行"不是所有高手的共识。

### 3.2 Simon Willison（已核实）

**来源**：simonwillison.net/2025/Oct/7/vibe-engineering/（2025-10-07）；2026-02-23 他注明"agentic engineering"这个词在流行。

- 核心：专业人士用 AI 编码工具，但对交付的软件负责，区别于只靠提示的 vibe coding。
- 实践清单：自动化测试（"Test-first development is particularly effective with agents that can iterate in a loop"）；先把计划打磨好再交给智能体；文档；干净的版本历史；CI、格式化、预览部署；快速的代码审查文化；像管人一样给清楚的指令和上下文；人工 QA；先调研再写；知道哪些该外包、哪些自己做；调整估时。
- 并行：他起初怀疑，现在自己也这么做，"surprisingly effective, if mentally exhausting"。
- 总论：AI 放大已有的专业能力，经验越多，结果越好。

### 3.3 Boris Cherny 与 Claude Code 团队（二手，内容与多个转载一致）

**来源**：Cherny 2026-01-02 的 X 帖。X 页面本次取不到（HTTP 402），读到的是带注释的 Readwise 转载，其他博客转述一致。

- 终端里 5 个 Claude 实例，标签编号 1–5，要输入时系统通知；另外在 claude.ai/code 上同时跑 5–10 个会话，iOS 也起一些。
- 全用 Opus 4.5 加思考，理由：虽然更大更慢，但更少需要纠偏，总体反而更快。
- 全队共用一份 CLAUDE.md 并检入 git，队里每周多次在 Claude 犯错时追加；他会在同事的 PR 里 @Claude 添加条目。
- 多数会话从 Plan 模式开始，改到满意再切到自动接受编辑："A good plan is really important!"
- 最后一条建议："give Claude a way to verify its work"，如用浏览器扩展自己测试；每个领域都值得投入强验证。

### 3.4 Geoffrey Huntley 与 Ralph 循环（二手/未核实）

**来源**：The Register，2026-01-27；他命名帖《Ralph Wiggum as a "software engineer"》2025-07-14（搜索摘要）。

- 核心是一行 bash：`while :; do cat PROMPT.md | claude-code ; done`。每轮都是全新上下文，进度靠文件和 git 保存。
- 他的话（The Register 引述）："It is brute force meets persistence."；"The days of being a Jira ticket monkey are over."
- 他自估约 10 美元/小时的算力与 SaaS 成本。项目：给 ZX Spectrum 做的税务应用、Atlassian 某产品的逆向克隆、名为 Cursed 的编程语言。
- 限制：克隆需要源码、规格或产品文档，没有规格时第一次结果"不太好"。Anthropic 出了 Ralph Wiggum 插件，Cherny 说他也用。
- 搜索结果里关于"某合同 5 万美元、成本 297 美元"的说法在 The Register 原文里没有，不要用。

### 3.5 Andrej Karpathy（二手/未核实）

- 2025 年 2 月造词 vibe coding；2026 年 2 月称因模型更强，vibe coding 已过时，改叫"agentic engineering"：默认不再亲手写代码，而是编排智能体并做监督，且其中有"艺术、科学和专业性"（The New Stack、搜索摘要转述；原帖未读到）。
- 2026 年 4 月 Sequoia AI Ascent：转述称智能体"fallible and stochastic"，每一步需要专业监督（StartupHub）；中文二手称他已想不起上次改 AI 生成代码是什么时候，只见一个来源，不可用。
- "99% 的时间不亲手写"这句话找不到英文来源，不要作引文。

### 3.6 Ethan Mollick（部分已核实）

- 《Co-Intelligence》四条规则（多个来源一致）：始终请 AI 上桌；做回路里的人；把 AI 当人，但说清楚是哪种人；假设现在这个是你用过最差的 AI。
- 哈佛/BCG 实验（arXiv 2406.10942 的"Centaur"论文条目；数字取自一篇 Substack 转述）：758 名 BCG 顾问，用 GPT-4 的多完成约 12.2% 任务、快 25.1%、质量高 40%；低分者受益（43%）大于高分者（17%）。状态：数字二手/未核实，且这是 2023 年的老模型。
- 未找到 Mollick 2026 年关于智能体与委派的具体论述，不要编。

### 3.7 其他

- Steve Yegge、Armin Ronacher：本次未检索到可核实内容，留空，没有编造。

---

## 4. 公司的 AI 原生政策

- **Shopify**（二手/未核实）：Tobi Lütke 的备忘录，BetaKit 记为 2025-03-20，2025-04-07 因外泄而在 X 公开。转述要点：用 AI 是"每个人的基本期待"；"在申请更多人手和资源前，团队必须证明为什么用 AI 做不到"；AI 使用问题加入绩效与同事互评问卷；建议把 AI 当"思考伙伴、深度研究者、批评者、导师或结对程序员"；"停滞几乎是必然的，停滞是慢动作的失败"（BetaKit 引文）。X 原帖取不到。
- **Duolingo**（二手/未核实）：2025 年 4 月 Luis von Ahn 的内部信，后发 LinkedIn。转述要点：AI 能做的工作逐步不再用外包；招聘和绩效考虑 AI 使用；只有团队无法再自动化时才批新人手。von Ahn 说目的是消除瓶颈而非替换员工。没有新的外包人数。
- **人均收入**（二手，口径混乱）：Bessemer AI Supernovas 中位数约 113 万美元 ARR/人，公共 SaaS 中位数约 28.3 万；Cursor 估计从 330 万到约 4000 万美元/人不等，差距来自人数和 ARR 假设；Midjourney 约 1250 万/人（单一来源）。结论：方向对，具体数字不能上片。
- **Anthropic 的收入**（单一聚合来源，未核实）：2025 年底约 90 亿美元年化，2026 年 5 月约 450 亿美元，不要用。

---

## 5. 非程序员与专业人士

### 5.1 电脑操作智能体（OSWorld）

- 人类基线 72.36%（OSWorld-Verified，多个来源一致）。
- 时间线（来自聚合页 presenc.ai，榜单未直接核对）：2025-07-28 发布 Verified；2026-05-21 Pointer Agent + Opus 4.7 为 83.64%；2026-07-25 Intelligence-Indeed Agent 90.19%（页面称当前最高）；2026-08-01 Claude Fable 5 为 85.96%。
- 其他来源给出 86% 左右的最高值，榜单与厂商自报混在一起。结论保守写："已越过人类基线"稳，最高数字不稳。
- 更难的 OSWorld 2.0（2026-06-26 发布，108 个长流程）：Opus 5 最高努力档严格判分 44.33%，宽松（部分得分）77.67%；Anthropic 报告 Opus 5.5 在 v2.1 上部分得分 81.8%。严格与宽松差很大。
- 2024 年的约 12%：本次没有核实到，不要写。

### 5.2 医生

- Goh 等，JAMA Netw Open 2024（doi:10.1001/jamanetworkopen.2024.40969）：50 名医生随机分组，有 GPT-4 辅助与没有，在 6 个病例上诊断推理没有显著差异；GPT-4 单独的得分高于两组医生。（我记忆中是 92% 对 76%，本次未核实到，不要用数字。）说明：把工具给人不等于结果更好，人怎么用才关键。
- 环境 AI 病历记录员（2026）：UW Health 阶梯式随机试验约 66 名医务人员，倦怠下降约 20%，下班后在病历系统的时间平均少约 30 分钟；JAMIA 2026-05 的 160 名医生交叉试验，两个产品都降低倦怠。夏威夷的非随机试点无显著倦怠差异。状态：搜索摘要，未读原文。

### 5.3 教师与学生

- 世界银行尼日利亚试验（Policy Research Working Paper 11125，2025-05）：约 800 名高一学生，随机分到课后英语班，用 Copilot（GPT-4）辅助，六周；总测验提升 0.31 个标准差，英语 0.23；作者估算相当于 1.5–2 年常规教学。注意对照组没有课后班，所以部分效果来自额外教学时间和老师监督。状态：搜索摘要，未读原文。
- 教师用 AI 的节省时间：本次没检索到可靠研究，不要写。

### 5.4 律师

- 本次没有检索到研究支撑的律师案例；OpenAI 法务团队月输出 token 是去年 11 月的 13 倍（上面 1.4，二手）是目前唯一数据。

---

## 6. 反复出现的共同做法（提炼）

| # | 做法 | 最强真实例子 | 来源 | 状态 |
|---|---|---|---|---|
| 1 | 委派整件事，不是一句提示 | 专家每条指令 Claude 做约 12 步，新手约 5 步；Ralph 循环把一条提示变成持续迭代 | anthropic.com/research/claude-code-expertise；The Register | 已核实（自报）/二手 |
| 2 | 并行，多开几个 | Anthropic 并行智能体 800 小时补回 97% 差距；Cherny 5+5–10 个会话；Willison"有效但累" | RSI 页；Cherny 帖；Willison | 已核实/二手 |
| 3 | 让智能体能自己验证 | Cherny："give Claude a way to verify its work"；Willison：测试优先；陶哲轩用 Lean | 同上 | 已核实/二手 |
| 4 | 写规格、计划、上下文文件 | 先 Plan 模式再自动执行；全队共用 CLAUDE.md；Hashimoto 的 AGENTS.md | Cherny；Hashimoto | 二手/已核实 |
| 5 | 出一次错就改一次"挽具" | Hashimoto 第 5 步；Cherny 团队每周追加 CLAUDE.md | mitchellh.com | 已核实 |
| 6 | 人留下品味、选题和判断 | Anthropic：智能体设计每个实验，人选问题并写评分标准；工程师留下设计与"品味" | RSI 页；员工调查页 | 已核实（自报） |
| 7 | 只放手易验证、低风险的活 | 超过一半员工只能完全放手 0–20%；放手标准：易验证、低风险、重复 | 员工调查页 | 已核实（自报） |
| 8 | 让智能体在你不在时工作 | Hashimoto 收工前 30 分钟；Ralph 循环；Anthropic 智能体 800 小时 | 同上 | 已核实/二手 |
| 9 | 先在工作上练手，再外推 | Hashimoto 复现自己的所有手工提交；Mollick"成为你熟悉任务上最懂 AI 的人"（转述） | mitchellh.com | 已核实/二手 |
| 10 | 经验越多，收益越多 | 验证成功率 新手约 15%，中级以上 28–33%；Willison"AI 放大已有专业" | claude-code-expertise；Willison | 已核实 |

### 正在褪色或有争议的"最佳实践"

- **提示技巧**：没有直接的一手数据证明它在褪色，本次不下结论。能支持的是旁证：Anthropic 的专家优势来自"每条指令放更多活、能纠偏、知道验什么"（见上），不是措辞技巧；Mollick 的"当前模型是你用过最差的"也在提醒一年前的经验会过期（二手）。
- **vibe coding**：Karpathy 自己改口为 agentic engineering（二手）；Willison 也用 vibe engineering/agentic engineering 区分。
- **并行是不是共识**：Hashimoto（2026-02）说自己不并行；Cherny、Willison、Anthropic 在并行。另外 Anthropic 红队的数据说明并行需要分工，否则冲突。
- **速度提升是否真实**：METR 2025 年随机试验：16 名有经验开发者、246 个真实任务，用 AI 反而慢 19%，开发者事前预期快 24%、事后以为快了 20%。2026 年后续（搜索摘要，二手）：老队列约快 18%、新招募约快 4%，置信区间都含零，样本小且有选择偏差，METR 自己也标了不可靠。结论保守：速度问题没有定论，感觉不等于测量。

---

## 7. 缺口：重度用户与普通用户差多远

**已有的硬数据**

- Anthropic（2026-06-16，anthropic.com/research/claude-code-expertise，自报）：约 40 万个交互式 Claude Code 会话、约 23.5 万人，2025 年 10 月到 2026 年 4 月。新手每条提示约 5 个动作、600 字输出；专家约 12 个动作、3200 字，动作链多一倍以上、输出约五倍。验证成功率新手约 15%、中级以上 28–33%；至少部分成功 77% 对 91–92%。陷入困境的会话里，新手验证成功 4%，专家 15%；零行代码就放弃的，新手 19%，其他人 5–7%。作者提醒专家的困境会话可能是更难的问题；专业度由 Claude 对每个任务评分，不是用户自报。大部分增益发生在新手到中级。
- Anthropic 经济指数（2026-01-15，自报，数据 2025 年 11 月 13–20 日）：Claude.ai 任务成功约 67%、API 约 49%；Claude.ai 上增强（52%）略高于自动化（45%），API 里约四分之三是自动化；全球使用集中度基本没变，国家人均使用量随人均 GDP 上升（GDP 每高 1%，使用多约 0.7%）。该报告没有按用户经验的分析。
- Anthropic《AI expectations gap》（2026-10-16，美国成年人调查 2026-08-11 至 23）：约五分之一受访者在工作中经常用 AI。美国人预计 AI 能做自己工作时长的 28%，Anthropic 员工预计 75%；预计 AI 做自己 80% 以上工作的美国劳动者约 5%，员工超过一半；工作中用 AI 的美国成年人里，26% 说任务用 AI 只要四分之一时间甚至更少，员工是 59%。注意：这是 Anthropic 员工与公众的对比，员工是最重的用户。
- Gallup（二手，经 Semafor 2026-07-21 转述）：2026 年第二季度 52% 的美国劳动者在工作中用 AI，30% 常用，15% 每天用；2025 年秋季调查（2026 年 1 月报道）每天用的是 12%。SurveyMonkey 2026Q1：34% 的全职工作者每天或每周用，62% 至少试过一次。
- OpenAI（二手）：内部 97.9% 用 Codex，外部个人 0.7%。

**没找到的**

- 使用智能体的人在总人口中的比例：没有可靠的人口统计，上面的 Gallup 与 Anthropic 都没有给；OpenAI 的 0.7% 只是一个产品、一家公司的口径。**不要在片里说"只有 X% 的人用过智能体"。**
- 按用户经验划分的自动化/增强比例：没找到。

---

## 开场/素材候选与不能用的说法

**可以用（已核实，标"据 Anthropic 自己说"）**

- 合并进代码库的代码 80% 以上由 Claude 写；典型工程师每天合并的代码是 2024 年的 8 倍。
- 800 小时、约 1.8 万美元，一群智能体补回 97% 的差距，两名人类研究员一周补回 23%；但问题由人选，评分标准由人写。
- 专家与新手：同一个工具，专家每条指令让它做的事多一倍以上，验证成功率约两倍。
- Hashimoto 的"收工前 30 分钟开智能体"，本人原文。

**不要用**

- "Karpathy 99% 不亲手写代码"：无英文来源。
- "5 万美元合同花 297 美元"：The Register 原文没有。
- Anthropic 收入 450 亿、Cursor 人均 4000 万：单一聚合来源/假设混乱。
- GPT-4 对医生"92% 对 76%"：本次未核实。
- OSWorld 2024 年约 12%：本次未核实。
- "co-scientist 两天解决十年的问题"：是媒体说法，且对应的人类工作当时是预印本。

## 本次来源清单

一手：anthropic.com/institute/recursive-self-improvement；/research/how-ai-is-transforming-work-at-anthropic；/research/claude-code-expertise；/research/multiagent-systems；/research/ai-expectations-gap；/research/anthropic-economic-index-january-2026-report；deepmind.google AlphaEvolve 博客；mitchellh.com/writing/my-ai-adoption-journey；simonwillison.net/2025/Oct/7/vibe-engineering/。
二手：The Register（Ralph、OpenAI Codex 论文）、BetaKit（Shopify）、The Decoder（陶哲轩）、The New Stack（Karpathy）、Semafor（Gallup）、presenc.ai（OSWorld）、Readwise 转载（Cherny）、多个搜索摘要。
