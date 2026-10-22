# 06 · 最会用 AI 的人怎么干活，以及这样干活的人有多少（Part A 做法 / Part B 差距）

调研日期：2026-10-22。服务于《最会用 AI 的人，在用 AI 干什么》（世界的形状，无声，屏上每个数字须有来源）。

## 读法

- **强度标签**：**已核实（一手）** = 读到了一手页面/原文件，数字在上面；**二手** = 只有媒体或他人转述（已写明是谁）；**未核实** = 只有搜索摘要/聚合站，或来源互相矛盾/没取到。没有往上升级。
- **自报**：公司自己发布的自家数字。Anthropic 的一律标 **"Anthropic 自己的数据"**——本片是用 Claude 做的，存在利益冲突，上片时屏上或旁白要点明。OpenAI 标 **"OpenAI 自报"**。
- **推算**：自己算的，旁边写了算式，不是来源给的数。
- **‡** = 该页是通过"抓取+摘要"工具读到的，没有拿到原始 HTML/PDF；数字与短引已与上下文交叉，但**上片前建议人工打开原页对一遍**。没有 ‡ 的，是我下载了原始 PDF/CSV/YAML/HTML 自己读的（Microsoft 两份报告 PDF 与 CSV、CNNIC 两页与 PDF、Pew 报告 PDF、NBER 论文 PDF、METR YAML、Gallup 指标页、Stack Overflow 2026 AI 页）。
- **本次的限制**：WebSearch 额度（全会话共享 200 次）在调研中途用完，之后只能直接抓一手 URL（URL 来自一手页面里的链接或同站命名规律）。因此：OpenAI 官网全部 403（GPT-5-Codex 的 "7 小时"一手原文、ChatGPT 付费用户一手页）、McKinsey 页面超时、Codex 论文（97.9% vs 0.7%）都**没拿到**，见文末"没找到/待补"。
- 日期说明：页面没写日期的，我写"页面未标日期"，并给出推断依据，标明是推断。

---

## 速查表

| 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|
| 16 个并行 Claude 从零写出 C 编译器 | 16 个 agent；近 2,000 次 Claude Code 会话；2 周；API 费用不到 $20,000；20 亿输入 + 1.4 亿输出 token；约 10 万行 Rust；能构建可启动的 Linux 6.9（x86/ARM/RISC-V）；GCC torture 等多数测试集通过率 99% | Anthropic 工程博客，Nicholas Carlini，2026-02-05 | 已核实（一手）‡；**Anthropic 自己的数据** |
| Cursor：数百个 agent 连跑一周写浏览器 | 一周；峰值约 1,000 次提交/小时；1,000 万次工具调用；单次运行峰值数百 agent；累计"数千 agent"；>100 万行/1,000 文件 | Cursor 官方博客，2026-01-14 与 2026-02-05 | 已核实（一手）‡；自报 |
| Anthropic 内部合并量一路猛涨 | 2026 年 5 月日均约 2,500 次代码合并 → 9 月 >30,000 次/天 | Anthropic《Redesigning source control》，2026-10-13 | 已核实（一手）‡；**Anthropic 自己的数据**；原文**没说**这些改动由 agent 写 |
| Claude Sonnet 4.5 "连续专注 30 小时以上" | "more than 30 hours on complex, multi-step tasks"（原页没写它做出了什么） | Anthropic 新闻页，2025-09-29 | 已核实（一手）‡；**Anthropic 自己的数据** |
| Rakuten 让 Claude Code 自主跑 7 小时 | 7 小时；vLLM（1,250 万行代码）；数值精度 99.9%；新功能上市周期 24→5 个工作日（-79%） | Anthropic Claude 4 发布页（2025-05-22）、Rakuten 客户页 | 已核实（一手）‡；客户自述，经 Anthropic 发布 |
| GPT-5-Codex "独立工作超过 7 小时" | 7 小时（OpenAI 原文措辞未读到） | 一手页 403；Simon Willison 2025-09-15 转述 "seven hours in some cases" | 二手（Willison）；原文**未核实** |
| METR 时间视野最新测量 | Claude Mythos Preview(early) 50% 视野 1,044.8 分钟≈17.4 小时（CI 8.5–55.1 小时）；Opus 4.6 718.8 分钟≈12.0 小时；GPT-5.4 341.7 分钟≈5.7 小时 | METR time-horizons 页 + 官方 YAML | 已核实（一手，原始 YAML）；页面自称 "no longer actively updated"，">16 hrs unreliable" |
| Boris Cherny 30 天 259 个 PR | 259 PR、497 次提交、+4 万/-3.8 万行；"Every single line was written by Claude Code + Opus 4.5" | Simon Willison 引述其 2025-12-27 的 X 帖（原帖 402 打不开） | 二手（Willison 引原帖）；自报 |
| Kimi K2.5 Agent Swarm | 最多 100 子 agent、最多 1,500 次工具调用；执行时间最多快 4.5 倍；内部评测端到端运行时间降 80% | Moonshot 官方博客 | 已核实（一手）‡；自报 |
| Kimi K2.6 | 300 子 agent / 4,000 协同步骤；内部 RL 基建团队一个 agent 自主运行 5 天；一次 13 小时编码运行 | Moonshot 官方博客（页面未标日期，图片路径 2026-04-20，推断发布于此前后） | 已核实（一手）‡；自报 |
| Kimi K3 | "a single 48-hour autonomous run" 用开源 EDA 工具造出并验证一颗芯片；早期 K3 承担了团队"大部分"内核优化 | Moonshot 官方博客（约 2026-07-16，权重 7 月 27 日前放出，日期为推断） | 已核实（一手）‡；自报 |
| MiniMax 内部用自家 agent | M2.5 自主完成公司 30% 的任务；新提交代码 80% 由 M2.5 生成 | MiniMax 官方，2026-02-12 | 已核实（一手）‡；自报 |
| Manus Wide Research | 产品页："hundreds of AI agents in parallel"；示例 100 款运动鞋、250 位 NeurIPS 作者。发布博客**没写**具体数字 | Manus 官网 | 已核实（一手）‡；营销话术，"100+" **未核实** |
| 全球"用过生成式 AI"的劳动年龄人口 | 2025 上半年 15.1% → 下半年 16.3% → 2026 Q1 17.8% → Q2（6 月）18.8%；北方 28.8% / 南方 16.2% | Microsoft AI Economy Institute 报告 PDF 与博客（2026-05-07、2026-09-21） | 已核实（一手）；Microsoft 遥测，口径特殊 |
| 微软口径下的中国 | 15.4%（2025H1）→16.3%→16.4%（2026Q1）→17.5%（Q2）；**微软自己承认**多个国内常用工具未被计入，会低估 | Microsoft Q1/Q2 报告附录与 CSV | 已核实（一手）；**不可与 CNNIC 并排** |
| 美国雇员用 AI（Gallup，2026-05） | 52% 一年几次及以上；30% 每周几次及以上；15% 每天。Q1（2026-02）为 50%/28%/13% | Gallup 指标页 + Q2 文章（2026-07-20） | 已核实（一手） |
| 美国成年人用聊天机器人（Pew，2026-02） | 49% 用；24% 每天；51% 不用；在职者 38% 用于工作任务，40% 完全不用 | Pew 报告 PDF（2026-06-17） | 已核实（一手） |
| ChatGPT 周活 vs 付费 | 周活 >9 亿；消费者订阅 >5,000 万（2026-02-27 OpenAI 声明）；5,000 万÷9 亿≈5.6%（推算） | Newsweek 2026-02-28 引 OpenAI 声明 | 二手（Newsweek）；**OpenAI 自报** |
| ChatGPT 消息里"做事"占多少 | 2025-07：Asking 49% / Doing 40% / Expressing 11%；编程仅占 4.2%；非工作消息 53%（2024-06）→73%（2025-06） | NBER 工作论文 w34255（2025-09，OpenAI 经济研究团队 + 哈佛） | 已核实（一手）；**OpenAI 自报**数据 |
| 开发者用 agent 的比例（Stack Overflow 2025） | 每天用 agent 14.1%；每周 9.0%；每月或更少 7.8%；"不用也不打算用" 37.9%；每天用 AI 工具 47.1% | Stack Overflow 2025 AI 页（n=31,877/33,662） | 已核实（一手）‡；自选样本 |
| 中国生成式 AI 用户 | 2025-12：6.02 亿，占人口 42.8%；2026 上半年：>7 亿，普及率 >50% | CNNIC 第 57 次报告（2026-02-05）、《生成式人工智能应用发展报告（2026）》（2026-09-29） | 已核实（一手，原页读取） |
| 专家 vs 新手 | 新手每条指令约 5 个动作 vs 专家约 12；"已验证成功" 约 15% vs 28–33% | Anthropic，2026-06-16 | 已核实（一手）‡；**Anthropic 自己的数据** |
| 典型使用其实很短 | Claude Code 单轮中位数约 45 秒；第 99.9 百分位从 <25 分钟涨到 >45 分钟（2025 秋→2026-01） | Anthropic，2026-02-18 | 已核实（一手）‡；**Anthropic 自己的数据** |

---

# Part A · 最会用 AI 的人怎么干活

## A1. Carlini：并行 Claude 团队写 C 编译器

- **来源**：Anthropic 工程博客《Building a C compiler with a team of parallel Claudes》，作者 Nicholas Carlini（Anthropic Safeguards 团队），**2026-02-05**。https://www.anthropic.com/engineering/building-c-compiler
- **数字**：16 个并行 agent；近 2,000 次 Claude Code 会话；两周；API 费用 "just under $20,000"；20 亿输入 token + 1.4 亿输出 token；模型 Opus 4.6；产出约 10 万行、除 Rust 标准库外无依赖的编译器。
- **短引**："Over nearly 2,000 Claude Code sessions and $20,000 in API costs, the agent team produced a 100,000-line compiler." / "The 100,000-line compiler can build a bootable Linux 6.9 on x86, ARM, and RISC-V."
- **做法细节（适合做画面）**：一个"把 Claude 塞进简单循环"的脚本，一个会话结束立刻开下一个；多个 agent 反复修同一个 bug、互相覆盖，后来用 **GCC 作为"已知正确的编译器"当裁判**——大部分内核文件交给 GCC 编，只有一部分交给 Claude 的编译器，各 agent 才能分头修不同的 bug；另有一个 agent 专门合并重复代码。
- **诚实的边界（原文自己写的）**：没有自己的 16 位 x86 编译器（"lacks the 16-bit x86 compiler that is necessary to boot Linux out of real mode"，这一步由 GCC 完成）；没有自己的汇编器和链接器（演示用的是 GCC 的）；生成代码效率低。"Without active human intervention" 指运行期间，人仍写了循环脚本、测试和判定器。
- **推算**：$20,000 ÷ 约 2,000 会话 ≈ **$10/会话**；$20,000 ÷ 10 万行 ≈ **$0.2/行**（只是成本量级，不是工程价值）。
- **强度**：已核实（一手）‡。**Anthropic 自己的数据**，自报；媒体标题"零人工"（Analytics Vidhya）不可取，InfoQ 标题用的是 "almost"。

## A2. Cursor：数百 agent、连续一周

- **文 1**《Scaling long-running autonomous coding》，Wilson Lin，**2026-01-14**。https://cursor.com/blog/scaling-agents
  - 数百个并发 agent 在同一项目上；浏览器项目 "writing over 1 million lines of code across 1,000 files"；"trillions of tokens"；浏览器约一周；Solid→React 迁移三周以上、+266K/-193K 行；一个长跑 agent 把视频渲染提速 25 倍。
  - 其他长跑项目：Java LSP 7.4K 提交/55 万行；Windows 7 模拟器 14.6K 提交/120 万行；Excel 12K 提交/160 万行。
  - 反面教训（原文）："Twenty agents would slow down to the effective throughput of two or three."（锁竞争把 20 个 agent 拖成 2-3 个的产出，后来改成"规划者-执行者-裁判"层级）。
- **文 2**《Towards self-driving codebases》，**2026-02-05**。https://cursor.com/blog/self-driving-codebases
  - 短引："The system peaked at ~1,000 commits per hour across 10M tool calls over a period of one week." / "most runs would peak at several hundred agents"；累计"many thousands of agents"。
  - 作者明确写这是研究项目、"not intended to be used externally"（不是可用产品）。起先用 Opus 4.5，后因指令遵循更好换 GPT-5.1/5.2。
- **推算**：1,000 万次工具调用 ÷ 7×24×3600 秒 ≈ **每秒 16.5 次**；峰值 1,000 提交/小时 ≈ 每 3.6 秒一次提交。
- **强度**：已核实（一手）‡；自报。没有第三方复核代码质量；不要把"能跑一周"写成"做出了好浏览器"。

## A3. 最长的自主运行：实验室说法 + METR 度量

| 说法 | 内容 | 来源/日期 | 强度 |
|---|---|---|---|
| Sonnet 4.5 | "we've observed it maintaining focus for more than 30 hours on complex, multi-step tasks"（**原页没写它做出了什么**；某客户称 "30+ hours of autonomous coding"） | https://www.anthropic.com/news/claude-sonnet-4-5 ，2025-09-29 | 已核实（一手）‡；**Anthropic 自己的数据**；"做出一个聊天应用"之类说法未在原页，**未核实** |
| Rakuten 7 小时 | "demanding open-source refactor running independently for 7 hours"；客户页：vLLM "12.5 million lines of code"，99.9% 数值精度，"I didn't write any code during those seven hours."；新功能上市 24→5 个工作日 | https://www.anthropic.com/news/claude-4 ，2025-05-22；https://claude.com/customers/rakuten（无日期） | 已核实（一手）‡；客户自述 |
| GPT-5-Codex 7 小时 | OpenAI 页 403 打不开；Willison 写 "OpenAI report Codex crunching for seven hours in some cases!"（是他的转述，非 OpenAI 原话） | https://simonwillison.net/2025/Sep/15/gpt-5-codex/ ，2025-09-15 | 二手；原文**未核实** |
| Kimi K2.6 | 内部 RL 基建团队的 agent "operated autonomously for 5 days"（监控、故障处理）；另一次 13 小时运行："iterated through 12 optimization strategies"，1,000+ 工具调用，改动 4,000+ 行；另一个任务 12 小时+/4,000+ 工具调用 | https://www.kimi.com/blog/kimi-k2-6 （页面未标日期，图片路径 2026-04-20，**推断**） | 已核实（一手）‡；自报 |
| Kimi K3 | "In a single 48-hour autonomous run, K3 built, optimized, and verified the chip using open-source EDA tools"；仿真吞吐 >8,700 token/s，100 MHz 收敛（均为仿真） | https://www.kimi.com/blog/kimi-k3 （页面未标日期，权重 2026-07-27 前放出，**推断**约 7 月中旬） | 已核实（一手）‡；自报；"verified" 的检查方式原文未定义 |
| Cursor | 连续一周（见 A2） | 2026-02-05 | 已核实（一手）‡ |
| Anthropic 编译器 | 两周，但是约 2,000 个会话串联，不是单次连续运行 | 2026-02-05 | 已核实（一手）‡ |

**METR 时间视野（最新）**——一手：https://metr.org/time-horizons/ 与 https://metr.org/assets/benchmark_results_1_1.yaml（我读了原始 YAML）

- 定义（METR 原话）："the 50%-time horizon is the duration at which an agent is predicted to succeed half the time."——指**任务按人类耗时的长度**，不是 agent 实际跑了多久。
- 最新条目（METR-Horizon-v1.1，p50，分钟→小时，95% CI）：
  - Claude Mythos Preview (early)，发布 2026-04-07：1,044.78 分钟 = **17.4 小时**（CI 508.9–3,304.3 分钟 = 8.5–55.1 小时）
  - Claude Opus 4.6，2026-02-05：718.81 分钟 = **12.0 小时**（CI 316.7–3,633.8 分钟 = 5.3–60.6 小时）
  - Gemini 3.1 Pro 384.2 分钟 = 6.4 小时；GPT-5.2 352.3 = 5.9 小时；GPT-5.3 Codex 349.5 = 5.8 小时；GPT-5.4 341.7 = 5.7 小时；Claude Opus 4.5 293.0 = 4.9 小时；GPT-5 203.0 = 3.4 小时；o3 119.7 = 2.0 小时；GPT-4（2023-03）约 4 分钟。（以上小时数均为推算：分钟÷60。）
  - 翻倍时间：2023 年以来 128.7 天（CI 104.4–158.0 天，≈4.2 个月，推算 128.7÷30.4）；YAML 注明该估计"排除 p50>16 小时的点"。
- **页面状态**：更新日志最后一条（2026-09-08）写明 "This page is no longer actively updated"；页面警告 "Measurements above 16 hrs are unreliable with our current task suite"。所以**没有 2026-10 的更新**；METR 之后只发布了 Claude Opus 5.5（2026-09-22）、GPT-5.6 Sol（2026-06-26）的部署前评估摘要，其中**没有时间视野数字**（我读了 Opus 5.5 那篇）。
- 上片注意：Mythos 的 17.4 小时已超过 METR 自己说的可靠上限（16 小时），置信区间跨度 6 倍以上，只能说"数量级是十几个小时"。

**对照：典型会话其实很短**（Anthropic，《Measuring agent autonomy》，2026-02-18，https://www.anthropic.com/research/measuring-agent-autonomy）：Claude Code 单轮中位数 "around 45 seconds"；第 99.9 百分位 "nearly doubled, from under 25 minutes to over 45 minutes"（2025 秋→2026-01）。**Anthropic 自己的数据**，已核实（一手）‡。——这是"极端尾部的几小时/几天"与"普通使用的几十秒"之间的差距，对本片很关键。

## A4. Boris Cherny：30 天、259 个 PR

- **原话**（Simon Willison 2025-12-27 转引其 X 帖）："In the last thirty days, I landed 259 PRs -- 497 commits, 40k lines added, 38k lines removed." / "Every single line was written by Claude Code + Opus 4.5."
- 原帖：https://twitter.com/bcherny/status/2004887829252317325 （我这边抓取 HTTP 402，**没读到原帖**）；转引页 https://simonwillison.net/2025/Dec/27/boris-cherny
- 推算：259 PR ÷ 30 天 ≈ **8.6 个 PR/天**；497 提交 ÷ 30 ≈ 16.6 次/天；净增 40k−38k = 约 2,000 行（说明他的 PR 大量是改写/重构而不是净新增）。
- 注意：这是**他本人的 PR**，不是 Anthropic 全公司；也没有独立审计。
- 强度：二手（Willison 引原帖）；自报。

## A5. 中国：Kimi / Manus / MiniMax（智谱未取到）

- **Kimi K2.5 Agent Swarm**（https://www.kimi.com/blog/kimi-k2-5，页面未标日期；HF 模型卡关联论文 arXiv 2602.02276 标 2 月 2 日）：K2.5 可 "self-direct an agent swarm with up to 100 sub-agents"，"parallel workflows across up to 1,500 tool calls"；"reduces execution time by up to 4.5x"；内部评测 "80% reduction in end-to-end runtime"。HF 卡：BrowseComp 带 Swarm 78.4，对比标准 60.6、带上下文管理 74.9。已核实（一手）‡，自报。**你已知的 "100 子 agent / ~1,500 工具调用" 核实无误。**
- **Kimi K2.6**：升级到 300 子 agent / 4,000 协同步骤；内部 agent 自主运行 5 天；见 A3。已核实（一手）‡。
- **Kimi K3**：48 小时自主造芯片、早期 K3 承担团队内核优化的"大部分"；一次 391 个引力波事件分析用了 "20+ concurrent subagents"。已核实（一手）‡。
- **MiniMax M2.5**（https://www.minimax.io/news/minimax-m25 ，页面日期 2026-02-12）："30% of overall tasks are autonomously completed by M2.5"（覆盖研发、产品、销售、人事、财务）；"M2.5-generated code accounting for 80% of newly committed code"；用户已建 1 万+ 个"Experts"。已核实（一手）‡，自报。——和 Anthropic 的 ">80% 合并代码由 Claude 写" 是同一类"公司自用"证据，中国版。
- **Manus Wide Research**：官网功能页写 "hundreds of AI agents in parallel"，示例"100 款运动鞋对比""250 位 NeurIPS 2024 作者画像"；发布博客（https://manus.im/blog/introducing-wide-research ，写 "Thursday, July 31"，无年份，按星期推算为 **2025-07-31**）**没有给 agent 数**，只说每个子 agent 是 "a fully capable, general-purpose Manus instance"。已核实（一手）‡；"100+" **未核实**（页面写的是"数百"，且是营销语）。
- **智谱 / GLM**：我抓的 z.ai/blog/glm-5 页面返回空，**没取到**。
- **"国内公司夜里批量跑 agent"** 的一手量化证据：除上述 Kimi 内部 5 天 agent 与 MiniMax 30%/80% 外，**没有找到**更大规模的中国公司披露（搜索额度用尽，未覆盖字节/阿里/腾讯）。

## A6. 验证回路：为什么"能走开"取决于"能自己判对错"

1. **Anthropic 官方文档**（https://code.claude.com/docs/en/best-practices ）："Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from." 另："Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available."（无数字；官方文档，一手）。
2. **编译器**（A1）：判定器必须几乎完美——"it's important that the task verifier is nearly perfect, otherwise Claude will solve the wrong problem."；多 agent 卡在同一 bug 时，用 GCC 当 oracle 才能并行。
3. **Anthropic《Harness design for long-running application development》**（2026-03-24，https://www.anthropic.com/research/harness-design-long-running-apps）‡：同一个任务（2D 复古游戏制作器）——单个 agent 20 分钟/$9，游戏模式是坏的（实体出现但不响应输入）；完整 harness（规划+构建+用 Playwright 测运行中应用的评估员）6 小时/$200，"The harness was over 20x more expensive" 但 "the core thing worked, which the solo run did not manage."。另一个浏览器 DAW 例子：约 3 小时 50 分/$124.7，其中 QA 三轮合计约 25 分钟/$10.4，抓到了构建者漏掉的缺陷（片段不能移动、缺乐器面板等）。Opus 4.6 后评估员改为末尾一次性检查，原文说评估员的成本在任务"超出当前模型独立可靠完成的范围"时才值得。**Anthropic 自己的数据**；这是**单案例对比**，不是统计。
4. **Anthropic 专家研究**（2026-06-16，《Agentic coding and persistent returns to expertise》，https://www.anthropic.com/research/claude-code-expertise）‡：约 40 万次交互会话、约 23.5 万人，数据 2025-10 至 2026-04。"已验证成功"（判定成功 + 至少一个硬信号，如测试通过、提交、用户明确肯定）：新手约 **15%**，中级及以上 **28–33%**；"至少部分成功"：新手约 77%，中级及以上 91–92%；放弃率：新手 19%，其他 5–7%。**Anthropic 自己的数据**；注意是观察性数据，不能说"验证导致成功"。
5. **自动批准随经验上升**（同 A3 的 02-18 研究）：新手（<50 次会话）约 20% 会话用完全自动批准，到约 750 次会话后 >40%；打断率从约 5%（≈10 次会话）升到约 9%（经验更多）——老手少逐步点头、多在关键处出手。**Anthropic 自己的数据**。
6. **Terence Tao + Lean**：
   - Tao 维护的 Erdős 问题 AI 贡献维基（https://github.com/teorth/erdosproblems/wiki/AI-contributions-to-Erd%C5%91s-problems ，页面注明 "no longer updated. The latest data is as of Jun 30, 2026"）‡：列有 Lean 验证的完整解答，如 #205（Aristotle + GPT-5.2 Thinking，Lean-verified，2026-01-10）、#125（DeepMind prover agent，Lean-verified，2026-03-30）、#619（Claude Fable 5、Codex、GPT-5.5，Lean-verified，2026-06-09）；同时也列出**被判错误**的声称（如 #11、#51、#616、#647、#888；#333 声称的证明有误；#851 "Confused with another problem"）。维基**没有汇总总数**，我没有自己数。
   - Tao 等《Mathematical exploration and discovery at scale》（arXiv 2511.02864，2025-11-03 v1，v3 为 2025-12-22）：用 AlphaEvolve（"generic evolutionary coding agent"，LLM 生成 + 自动评估的循环）测 **67 个**问题，多数重现最佳已知解、若干有改进。摘要**没有提 Lean**。‡
   - 结论：**"能被形式化机器检查"的领域，agent 的产出可以被信任；检查不了的地方（维基里的错误条目）恰恰出错。** 没有找到"验证使成功率从 X% 变 Y%"的受控对照数字，上面 3、4 是最接近的。

## A7. 非编码的"整件事交出去"

- **Anthropic Economic Index《Cadences》**（2026-06-26，https://www.anthropic.com/research/economic-index-june-2026-report ，数据 2026-04-10 至 06-10）‡：同样写博客——Claude Code 里中位数是**一条人类指令**，聊天/Cowork 里是 **13 轮**来回；Claude Code 在 31 类产出中的 26 类自主度更高（1–5 分制，平均高 0.37 分）；工作类会话里文档/报告是最大产出（20%），邮件草稿 7%，分析/摘要 6%；税务相关会话在 4 月 14 日是 5 月日均的 8 倍。调查样本约 9,700 人。**Anthropic 自己的数据**，用户群不代表一般人群（计算机/数学职业占样本约 30% vs 美国就业 4%）。
- **Gallup Q2 2026**（2026-07-20，https://www.gallup.com/workplace/712736/organizational-adoption-jumps-six-points.aspx ）‡：在 AI 用户中，"coding assistance and automation, each cited by 16% of AI users"；频繁用户中 22%（编程）/21%（自动化），低频用户均 8%；这两类用户 77% 说对生产力有正面影响，是所有用途里最高。推算：16% × 52%（全部雇员中的 AI 用户）≈ **8.3% 的美国雇员**用 AI 做编程或"自动化"各一类（口径：Gallup 未定义"自动化"）。
- **OpenAI / Google 的 agent 模式（深度研究、ChatGPT agent 等）用量**：**没有找到可引的一手数字**（OpenAI 官网 403，搜索额度用完）。不要编。
- **Microsoft Work Trend Index 2025**（2025-04-23，https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born ）‡：31,000 名知识工作者/31 个市场；46% 的"领导者"称公司用 agent "to fully automate workflows or processes"。这是微软自己的调查、领导者自评，口径宽，**不建议上片**（见"不要用"）。

---

# Part B · 差距：这样干活的人有多少

## B1. Microsoft AI Economy Institute 的 AI Diffusion

- **定义**（原文）：全球 15–64 岁人口中 "have used a generative AI product during the reported period"；来自**微软聚合匿名遥测**，并按操作系统/设备份额、互联网普及率、人口调整。
- **全球**：2025 上半年 **15.1%** → 下半年 **16.3%** → 2026 Q1 **17.8%** → Q2（6 月）**18.8%**。北方/南方：Q1 27.5%/15.4%（2025H1 22.9%/…；表中南方 H1 为 9.8%、H2 10.6%、Q1 12.1% 对应的是"差距"行，不要混读）；Q2 **28.8% / 16.2%**。
  - 来源：Q1 报告 PDF（2026-05，https://www.microsoft.com/en-us/research/wp-content/uploads/2026/05/Microsoft-AI-Diffusion-Report-2026-Q1.pdf ）与博客（2026-05-07，https://blogs.microsoft.com/on-the-issues/2026/05/07/the-state-of-global-ai-diffusion-in-2026/ ）；Q2 报告 PDF（2026-09，https://www.microsoft.com/en-us/research/wp-content/uploads/2026/09/Microsoft-AI-Diffusion-Report-2026-Q2.pdf ）与博客（2026-09-21，https://blogs.microsoft.com/on-the-issues/2026/09/21/the-continued-state-of-global-ai-diffusion-in-2026/ ）。数据集：https://raw.githubusercontent.com/microsoft/ai-diffusion-report/main/data/AI_Diffusion_Q22026_Update.csv
- **前列国家**（2025H1 / H2 / 2026Q1 / Q2，CSV）：阿联酋 59.4 / 64.0 / 70.1 / **73.3**；新加坡 58.6 / 60.9 / 63.4 / **64.3**；挪威 45.3 / 46.4 / 48.6 / 49.4；爱尔兰 41.7 / 44.6 / 48.4 / 49.9；法国 40.9 / 44.0 / 47.8 / 49.6；韩国 25.9 / 30.7 / 37.1 / 40.6（Q2 绝对增幅最大 +3.5 个百分点）。
- **美国**：排名 21（Q1、Q2 均第 21）；Q1 博客写 31.3%，Q1 报告排行榜表写 31.1%，Q2 排行榜 **32.3%**，CSV 里是 33.0%——**微软自己的几份文件之间有 0.2–0.7 个百分点出入**，上片取"约 32–33%"或直接用整数"三成多"。
- **中国**：15.4%（2025H1）→16.3%→16.4%（2026Q1，仅 +0.1）→**17.5%**（Q2，+1.1）（Q1 报告附录表与 Q2 CSV/附录）。**微软自己的警告（Q2 报告原文）**：新增工具覆盖后，"broader coverage will raise measured diffusion across nearly all countries, with the largest effect in China, where several widely used domestic tools are currently not included."——**这个数低估了中国**，不能当"中国人用 AI 少"来讲。
- 强度：已核实（一手，原始 PDF/CSV）；Microsoft 遥测，口径特殊，只覆盖其可观测的产品。

## B2. Gallup

- **指标页**（https://www.gallup.com/699797/indicator-artificial-intelligence.aspx ，原页读取）："As of May 2026, 15% of U.S. employees use AI daily in their role, 30% use it a few times a week or more, and 52% use it a few times a year or more."
- **Q2 2026 文章**（2026-07-20；May 6–20；n=22,573；误差 ±0.9）：52% / 30% / 15%；47% 称所在组织已整合 AI 工具（上季 41%）。Q1 2026 文章（2026-04-12；Feb 4–19；n=23,717）：50% / 28% / 13%。https://www.gallup.com/workplace/704225/rising-adoption-spurs-workforce-changes.aspx
- **按行业每日使用**（指标页原文）："technology (42%), finance (27%) and professional services (22%) … the remaining seven industries ranges from 9% to 15%."
- **Gallup 另一项调查**（2026-10-06 发布，1 月 26–3 月 24 日；15,482 名雇员，https://news.gallup.com/poll/714602/benefits-work-unevenly-distributed.aspx ）‡：**28%** 至少每周用；**54%** 说在工作中没用过 AI；大学毕业 40% vs 非毕业 17%（每天或每周）；管理者 37% vs 个人贡献者 25%。（口径"每周"≠指标页"每周几次"，不可混。）
- **推算**：每日 15% ÷ 总用户 52% ≈ **29% 的 AI 用户每天用**；每周几次及以上 30 ÷ 52 ≈ 58%。
- **Q3 2026**：指标页最新标注就是 Q2 2026，**没有找到 Q3 数据**（截至 2026-10-22）。
- **agent/复杂任务**：Gallup 没有"agent"口径；最接近的是上面 A7 的"编程/自动化各占 AI 用户 16%"。
- 强度：已核实（一手）。

## B3. Pew

- **最新**：《Americans and AI 2026》，**2026-06-17**，调查 **2026-02-17 至 02-23**，n=5,119 成年人（读 PDF 原文与 topline）。https://www.pewresearch.org/wp-content/uploads/sites/20/2026/06/PI_2026.06.17_Americans-and-AI_REPORT.pdf
  - 用聊天机器人：**49%**（"No, I do not" 51%）；**每天用 24%**（几乎一直 4% + 一天数次 12% + 一天一次 8%）；每周数次 10%；更少 15%。
  - **在职成年人**（N=3,038）：**38%** 用聊天机器人处理工作任务；22% 用但不用于工作；**40% 完全不用**。
  - ChatGPT 44%（2025 年 34%）；Gemini 约四分之一；Claude 等"十分之一或更少"。
  - 提醒：2026 年之前的问法是"用过 AI 聊天机器人吗"且只问听说过的人，**2026 年改了问法，与 2024 年的 33% 不严格可比**（Pew 脚注自述）。
- **Pew 2025-02-25**（调查 2024-10；https://www.pewresearch.org/internet/2025/02/25/workers-experience-with-ai-chatbots-in-their-jobs/ ）‡：工作者里 **9%** 每天或每周几次用，7% 每月几次，**55%** "rarely or never"，29% 没听说过。
- 其余数字（"约一半用、约四分之一每天用"）原文表述一致。
- 强度：已核实（一手）。

## B4. ChatGPT：周活 vs 付费；"问"与"做"

- **最新官方（经媒体）**：OpenAI 在 2026-02-27 的融资声明里称 "more than 900M weekly active users"、"more than 50 million consumer subscribers"（Newsweek 2026-02-28 引述，https://www.newsweek.com/openai-hits-900-million-weekly-users-raises-110b-in-fresh-funding-11596631 ）。**OpenAI 自报**；OpenAI 官网我打不开（403），所以是**二手**；之后是否有更新的数字，**没找到**。
- **推算**：5,000 万 ÷ 9 亿 ≈ **5.6%**。口径不齐（周活按账号/设备，订阅是消费者订阅，企业席位未计），只能说"约二十分之一"。
- **《How People Use ChatGPT》**（NBER w34255，2025-09，Chatterji、Cunningham、Deming、Hitzig 等；数据到 2025-07；读 PDF 原文，https://www.nber.org/papers/w34255 ）：
  - "18 billion messages were being sent each week by 700 million users, representing around 10% of the global adult population."（2025-07）
  - "about 49% of messages are Asking, 40% are Doing, and 11% are Expressing"；**工作相关消息中 "nearly 56%" 是 Doing**，Asking 35%、Expressing 9%；"Doing" 里近四分之三是写作。
  - 编程："only 4.2% of ChatGPT messages are related to computer programming, compared to 33% of work-related Claude conversations"。
  - 非工作消息 53%（2024-06）→ **73%**（2025-06）。2025-06 末的三分法：Asking 51.6% / Doing 34.6% / Expressing 13.8%——**"Doing" 的占比在下降**（Asking 和 Expressing 增长更快）。
  - 注意：论文的 "Doing" = 让 ChatGPT 产出一段东西（写邮件、写代码），**不是**"把多步任务整件委托给 agent"。上片不要把 Doing 40% 讲成"40% 的人在用 agent"。
- **OpenAI 自报**（数据由 OpenAI 经济研究团队提供，哈佛 IRB 批准）。

## B5. Anthropic Economic Index（**Anthropic 自己的数据**，用户群不代表一般人群）

| 报告 | 日期 | 要点 |
|---|---|---|
| 2025-09 版（V3，2025-08 数据）https://www.anthropic.com/research/anthropic-economic-index-september-2025-report ‡ | 2025-09-15 | Claude.ai 上"整件交付"（directive）从 27%（V1，2024 末）升到 **39%**，首次自动化用法超过增强用法；API 流量 **77%** 是自动化模式；人均使用指数：以色列 7.0、新加坡 4.57；美国州：DC 3.82、犹他 3.78、加州 2.13 |
| 2026-01 版（2025-11 数据）https://www.anthropic.com/research/anthropic-economic-index-january-2026-report ‡ | 2026-01-15 | Claude.ai：增强 52% / 自动化 45%；directive **回落到 32%**（8 月为 39%）；编程占 34%（2025-03 峰值 40%）。**API：directive 64%、约四分之三自动化、编程 46%**。前 10 类任务占 Claude.ai 对话的 24%（API 32%）；美国前五个州占用量 50%，却只占劳动年龄人口 38%；全球用量"与 GDP 强相关" |
| 2026-06 版《Cadences》（2026-04-10 至 06-10 数据）https://www.anthropic.com/research/economic-index-june-2026-report ‡ | 2026-06-26 | 代码/技术类产出约占对话六分之一；调查样本约 9,700 人，其中计算机/数学职业约 30%（美国就业占 4%）、管理岗 23%（美国就业 7%）；Claude Code 自主度更高（见 A7） |

- 解读要点：**企业/API 一侧"整件交给 AI"（64–77%）远高于个人聊天一侧（32–39%）**——会"整件交"的主要是写代码接 API 的人，不是普通聊天用户。注意 2026-01 版在 Claude.ai 上 directive 其实**下降**了。
- 2026 年另有更新页 https://www.anthropic.com/economic-index （标 "Last updated: June 26, 2026"，数据为动态加载，我没拿到更多表格）。

## B6. 对"agent 使用"的直接度量

| 来源 | 数字 | 说明 | 强度 |
|---|---|---|---|
| **Stack Overflow 2025** https://survey.stackoverflow.co/2025/ai ‡ | AI agent：**每天用 14.1%**、每周 9.0%、每月或更少 7.8%；"否，但打算用" 17.4%；"否，只用 copilot/补全" 13.8%；"否且不打算用" **37.9%**（n=31,877）。AI 工具总体：每天 47.1%、每周 17.7%、每月 13.7%、不打算用 16.2%（n=33,662） | 页面自己的总结："AI agents are not yet mainstream."；自选的开发者样本，不代表所有开发者更不代表所有劳动者；调查日期页上未写 | 已核实（一手）‡ |
| 推算 | 14.1% ÷ 47.1% ≈ **30%**：每天用 AI 工具的人里，约 30% 的量级对应每天用 agent（两题 n 不同，只能当量级） | | 推算 |
| **Stack Overflow 2026** https://survey.stackoverflow.co/2026/ai | 页面写 "The overwhelming majority of respondents now use coding assistants and agents daily (73%)"，"Of the over 70% of respondents who use AI daily, 31% use it over four hours per day"；"Claude Code (66%) and GitHub Copilot (59%) are the leaders for coding agents" | 30,903 份有效问卷，169 国，**2026-06-23 至 08-05**，"promoted through stackoverflow.com, stackoverflow.blog and our email list"（自选）；**页面没写 73% 的分母**（所有人？还是 AI 用户？），Claude Code 66% 同样没写分母 | 已核实（一手）；**分母不明，不要单独上片** |
| **Gallup Q2 2026** | AI 用户中 16% 用于编程辅助、16% 用于"自动化"（≈ 全部雇员的 8%，推算） | 见 A7 | 已核实（一手）‡ |
| **Pew 2026** | 在 "first type of AI that comes to mind" 的开放题里，"AI agents and agentic AI" 约 **1%** | topline 文本表格列错位，只能确定落在 1% 这一档 | 已核实（一手），**排版错位，慎用** |
| **McKinsey State of AI 2025** | 页面超时/被挡，**没拿到** | | **未核实**（凭记忆有"约六成至少在试 agent、约两成多在规模化"之类说法，不可用） |
| **Microsoft WTI 2025** | 46% 领导者称公司用 agent 完全自动化流程 | 领导者自评、微软自家调查 | 已核实（一手）‡；**不建议用** |

## B7. 中国：CNNIC

- **第 57 次《中国互联网络发展状况统计报告》**（2026-02-05，截至 2025-12，页面原文 https://www.cnnic.net.cn/n4/2026/0304/c88-11549.html ）："生成式人工智能用户规模达6.02亿人，较2024年底增长141.7%；普及率达42.8%，大幅提高25.2个百分点。" 网民规模 11.25 亿，互联网普及率 80.1%。
  - 推算：6.02 ÷ 11.25 ≈ **53.5% 的网民**；2024 年底 ≈ 6.02 ÷ 2.417 ≈ 2.49 亿、普及率 42.8−25.2 = 17.6%。
- **《生成式人工智能应用发展报告（2026）》**（CNNIC 政策与国际合作所，2026-09-29 发布，页面 2026-10-08，https://www.cnnic.net.cn/n4/2026/1008/c88-11704.html ，原页读取）："截至2026年上半年，我国生成式人工智能用户规模突破7亿人，普及率超50%。"
  - 用途：**76.0%** 的用户让它回答问题；处理图片/视频 47.8%、文本 37.6%、**工作总结/会议纪要/PPT 32.5%**；AI 综合助手、AI 效率办公类应用使用次数同比增长均超 100%。
  - 同页：本土模型调用榜单前六全部来自中国团队；规上制造业企业 AI 技术应用普及率超三成。
  - **页面没有**使用频率（每天用多少）、agent 使用、职场深度使用的数据。PDF 全文的中文在我这边无法抽取文字（字体编码），**未读到 PDF 正文**。
- **口径差异（必须说明）**：CNNIC 的普及率分母是**全人口**（42.8%、>50%）且"用户"是用过即算；Microsoft 的分母是 15–64 岁、遥测、不含多个国内工具（中国 17.5%）。两者相差三倍，**不能并排当"同一件事"**。
- **中国职场用户使用深度/agent 使用的专项调查**：**没有找到**（搜索额度用尽，未覆盖 QuestMobile、极光、麦肯锡中国等）。目前最接近的一手是 CNNIC 的 32.5%（办公文本类用途）。
- 强度：已核实（一手）。

## B8. OpenAI Codex 论文 "97.9% 员工 vs 0.7% 外部个人"

- **没找到**。OpenAI 官网 403、搜索额度用完，无法定位论文本身，也就无法核实定义（"use" 是怎么界定的、分母是谁、统计期）。强度：**未核实**。**不要用这个数字。**

---

## 漏斗：世界人口 → AI 用户 → 每周 → 每天 → 付费 → agent 用户

**警告：下面这条"拼接漏斗"每一层来源、口径、时间都不同，不能当一条严格的比例链。** 能上片的是后面两条"单一来源漏斗"。

### 拼接漏斗（仅供理解，口径混杂）

| 层 | 数字 | 来源/日期 | 口径与问题 | 强度 |
|---|---|---|---|---|
| 世界（15–64 岁） | 100% 基数 | Microsoft 分母 | 报告未给绝对人数，我没自己补 | — |
| 用过生成式 AI | **18.8%**（2026-06） | Microsoft Q2 2026 报告 | 微软遥测；"报告期内用过"；漏掉部分国内工具，中国被低估 | 已核实（一手） |
| 每周用（只有单品牌） | ChatGPT >9 亿周活（2026-02）；2025-07 为 7 亿 ≈ "全球成人的约 10%" → 推算 9 亿 ≈ **12.9%**（900÷700×10，假设分母不变） | OpenAI 自报；NBER；Newsweek | 单个产品，账号计数，与上一层不同口径 | 二手/推算 |
| 每天用（无全球数字） | 美国：**24%** 成年人每天用聊天机器人（Pew，2026-02）；**15%** 雇员每天用 AI（Gallup，2026-05） | Pew；Gallup | 只有美国；两个分母不同（成年人 vs 雇员） | 已核实（一手） |
| 付费 | ChatGPT 消费者订阅 >5,000 万 ≈ 周活的 **5.6%**（推算 50÷900） | Newsweek 引 OpenAI | 订阅人数 vs 周活账号，不同口径 | 二手/推算 |
| agent 用户 | 开发者里每天用 agent **14.1%**（SO 2025）；美国雇员里"自动化"用途约 **8%**（推算 16%×52%，Gallup） | SO；Gallup | 前者是自选的开发者样本；后者"自动化"未定义；**没有全球数字** | 已核实（一手）‡ / 推算 |

### 漏斗 A：美国雇员（同一来源 Gallup Q2 2026，口径一致）

| 步骤 | 占全体雇员 | 说明 |
|---|---|---|
| 全体雇员 | 100% | |
| 一年用几次及以上 | **52%** | |
| 每周几次及以上 | **30%** | |
| 每天 | **15%** | 行业：科技 42%，金融 27%，专业服务 22%，其余 9–15% |
| 用 AI 做"自动化"（或做编程辅助） | 约 **8%**（各自，推算 16%×52%） | "自动化"口径 Gallup 未定义；占 AI 用户 16%，频繁用户 21–22% |

### 漏斗 B：开发者（Stack Overflow 2025，自选样本）

| 步骤 | 占受访者 | 来源题 |
|---|---|---|
| 在用或打算用 AI 工具 | 84% | n=33,662 |
| 每天用 AI 工具 | **47.1%** | n=33,662 |
| 用过 AI agent（每天+每周+每月或更少） | **30.9%**（推算 14.1+9.0+7.8） | n=31,877 |
| 每天用 agent | **14.1%** | n=31,877 |
| 不用也不打算用 agent | 37.9% | n=31,877 |

### 再往上：用 agent 的人里，差距还在

Anthropic 的专家研究（2026-06-16）：同样叫"用 Claude Code"，新手每条指令约 5 个动作、专家约 12 个；已验证成功率约 15% vs 28–33%；每条用户指令平均触发约 10 个 Claude 动作，最多超过 100；人做约 70% 的规划决策，却只做约 20% 的执行决策。**Anthropic 自己的数据**。

---

## 最适合上片的

1. **编译器**：16 个 agent / 近 2,000 次会话 / 2 周 / <$20,000 / 约 10 万行 / 能启动 Linux 6.9。理由：数字全、一手、最具体、可视化强（"一个循环 + 一个裁判"）；上片要同时写"仍借用 GCC 的汇编器和链接器"。**Anthropic 自己的数据**，需标注利益冲突。
2. **Cursor 一周长跑**：约 1,000 次提交/小时、1,000 万次工具调用、数百 agent。理由：另一家公司的独立例子，可与 1 对照（避免只有 Anthropic 一家）。写明 "not intended to be used externally"。
3. **中位 45 秒 vs 尾部 45 分钟 vs 48 小时**：Claude Code 单轮中位约 45 秒，第 99.9 百分位 >45 分钟（Anthropic，2026-02），Kimi K3 的 48 小时自主运行（自报，2026-07），METR 对 Opus 4.6 约 12 小时的任务视野。理由：同时讲清"最强的能做到什么"和"大多数人其实只让它跑几十秒"，是整部片"差距"的核心画面。要注意各数含义不同（轮次时长 vs 单次运行 vs 任务视野）。
4. **美国雇员漏斗（Gallup）**：52% → 30% → 15% → 约 8% 做自动化。理由：同一来源、口径一致、一手；叠加"科技业每天 42% vs 其他 9–15%"一眼看出差距。
5. **开发者里 agent 还是少数（SO 2025）**：每天用 AI 47.1%，每天用 agent 14.1%，不打算用 37.9%。理由：连"最会用的行业"里也只有约七分之一每天用 agent；注明自选样本。
6. **专家 vs 新手（Anthropic）**：每条指令 5 vs 12 个动作；已验证成功率约 15% vs 28–33%；放弃率 19% vs 5–7%。理由：把"会用的人怎么不同"量化；上片须标"Anthropic 自己的数据"和"观察性，不是因果"。
7. **验证决定能不能走开**：单 agent 20 分钟/$9 做出一个玩不了的游戏，vs 带评估员的 harness 6 小时/$200 做出能玩的（Anthropic 2026-03）；编译器"判定器必须几乎完美"；Tao 的 Erdős 维基里 Lean 验证过的解答与被判错的声称并列。理由：给"升华"（每部片结尾必须有）提供落脚点——"AI 的产出值多少，取决于你能不能检查"。
8. **中国一格**：Kimi K2.6 的 agent 自主运行 5 天（内部 RL 基建监控）、MiniMax"30% 任务由自家模型自主完成、80% 新提交代码由其生成"（2026-02）。再配 CNNIC：6.02 亿用户（2025-12，42.8%）→ >7 亿（2026H1，>50%），其中 32.5% 做工作总结/会议纪要/PPT。理由：国内一手证据，且能讲"用的人很多，深度用的人少"（但**深度**这一环没有中国一手数据，不要编）。

## 不要用

- **"Manus 100+ 个 agent"**：官网写的是 "hundreds"，发布博客没有数字，是营销语。
- **GPT-5-Codex "独立工作 7 小时"当作 OpenAI 原话**：一手页没读到，只有 Willison 的转述。
- **Sonnet 4.5 "做出了一个聊天应用"之类**：原页只写了"30 多小时保持专注"，没写做了什么。
- **编译器"零人工"**：原文是 "without active human intervention"，人写了循环、测试和 GCC 对照；InfoQ 标题用了 "almost"。
- **Cherny "100% 代码由 Claude 写" 当成 Anthropic 全公司**：他说的是自己 30 天的 PR；公司整体口径用你已有的 ">80% 合并代码"（RSI 页，2026-05）。
- **Anthropic "日合并 2,500→30,000" 说成"agent 写的"**：原文没这么说，只写了合并到 monorepo 的变更数；只能写"合并量"。
- **METR "agent 能自己工作 17 小时"**：METR 的是任务按人类耗时的长度；Mythos 17.4 小时已超过其自称可靠上限 16 小时，置信区间 8.5–55 小时；该页已停止更新。
- **把 Microsoft 的中国 17.5% 与 CNNIC 的 >50% 并排**：分母、口径、覆盖都不同，微软自己说国内工具未计入。
- **Stack Overflow 2026 "73% 每天用 coding assistants and agents"、"Claude Code 66%"**：页面没写分母；自选样本。
- **OpenAI 论文 "Doing 40%" 当作委托 agent 的比例**：Doing = 让它产出一段内容，不是多步委托；且 Doing 占比在 2025 年下降。
- **Microsoft WTI "46% 领导者用 agent 完全自动化"**：领导者自评、微软自家调查、2025-04。
- **Codex 论文 97.9% / 0.7%**：没找到论文，未核实。
- **McKinsey 的 agent 比例**：页面没打开，未核实。
- **Pew "1% 提到 agent"**：topline 文本列错位，需人工看原表。
- **聚合/博客站的数字**（fourweekmba、Analytics Vidhya、Towards AI、各类 "AI 统计"站）：未当来源用。
- **用户已排除**："MakerJackie" 没有使用。

## 没找到 / 待补（需要 WebSearch 额度恢复，或你提高 CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION）

1. OpenAI Codex 论文（97.9% vs 0.7%）本身与定义。
2. GPT-5-Codex "over 7 hours" 的 OpenAI 原文（openai.com 对抓取返回 403；可以人工打开 https://openai.com/index/introducing-upgrades-to-codex/ ）。
3. ChatGPT 付费用户数的 OpenAI 一手页；2026-02 之后的更新数字。
4. McKinsey State of AI 2025/2026 的 agent 比例。
5. Gallup Q3 2026（截至今日页面最新为 Q2）。
6. 中国职场深度使用 / agent 使用的专项调查；智谱、字节、阿里、腾讯的"夜间/批量 agent"披露。
7. OpenAI / Google agent 模式（深度研究、ChatGPT agent）的官方用量。
8. Cherny 原帖（X 抓取 402）。
9. CNNIC 两份报告 PDF 的中文正文（字体编码，文本抽取为空；需 OCR 或人工）。
