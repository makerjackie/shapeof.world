# 《最会用 AI 的人，在用 AI 干什么》· 研究底稿 03-A：软件 / 数学 / 科学 / 医学 / 法律

调研日：2026-10-22。所有网页均在本次会话中实际打开读过（除非注明"未能打开"）。

## 读法

**强度标签**
- **已核实（一手）**：我读到了一手页面（官方博客 / 新闻稿 / arXiv·期刊摘要 / 本人发言 / 官网），数字在页面上。
- **二手**：只有媒体或转引（写明是谁）。
- **未核实**：只有搜索摘要 / 聚合站 / 来源互相矛盾 / 页面打不开。
- 公司自己的数字一律带"自报"；Anthropic 的写"Anthropic 自己的数据"；OpenAI 的写"OpenAI 自报"。资助方写在备注里。
- **推算** = 我自己的算术，已写出算式，不是来源给的数字。

**本次调研的限制（务必知道）**
1. WebSearch 的会话额度（全体 agent 共用 200 次）基本耗尽，只有零星几次成功。因此大量工作是直接打开已知一手页面、arXiv API、Europe PMC 元数据、SEC EDGAR 完成的。**中文来源覆盖偏薄**，缺口见文末"缺口 / 待补"。
2. openai.com 整站对我返回 403：凡是"OpenAI 自报"的内容，我都只能引第三方或旁证（已标）。NEJM Catalyst、X/Twitter、SCMP、Reuters、CNBC 也打不开。
3. 世界已经很新（2026-10）：Claude Mythos / Opus 5.5、GPT-5.5/5.6/6 Astra、Cursor 被 SpaceX 收购等都是真实出现在一手页面上的信息，不要用 2025 年的旧印象去"纠正"它们。

## 速查表

| 领域 | 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|---|
| 软件 | Claude Code 创造者 30 天里所有代码由 Claude Code 写 | 259 PR / 497 commit / +40k −38k 行（2025-12-27） | Boris Cherny 的 X 帖，经 Simon Willison 转引 | 二手（转引一手帖；原帖 402 打不开）；自报 |
| 软件 | OpenClaw 作者一个月 6,600+ commit | >6,600（2026 年 1 月，一个人） | Pragmatic Engineer 2026-01-28 | 二手（媒体转述其本人说法） |
| 软件 | 16 个并行 Claude 两周写出能编译 Linux 的 C 编译器 | 16 agents / ~2,000 会话 / <$20,000 / 10 万行 Rust | Anthropic 工程博客 2026-02-05 | 已核实（一手）；Anthropic 自己的数据 |
| 软件 | Anthropic 内部：合并 PR 增长 | 每工程师每天合并 PR +67%；自评生产力 +50% | Anthropic 2025-12-02 | 已核实（一手）；Anthropic 自己的数据，自评为主 |
| 软件 | Claude Code 年化收入 | >$25 亿（公司整体 $140 亿）2026-02-12 | Anthropic Series G 公告 | 已核实（一手）；自报 |
| 软件 | Mythos 找漏洞 | "thousands of high-severity vulnerabilities"（2026-04-07） | Anthropic Glasswing 页 | 已核实（一手）；Anthropic 自己的数据，第三方未验 |
| 软件（反面） | 熟练开发者用 AI 反而慢 | 16 人 / 246 任务 / 慢 19%；2026-02 更新：晚 2025 工具提速 4%–18% 但区间含 0 | METR 2025-07-10 / 2026-02 更新 | 已核实（一手） |
| 数学 | OpenAI 内部模型推翻 Erdős 单位距离猜想（Erdős 问题 #90） | 2026-05-20；9 位数学家署名人工核验版 | arXiv 2605.20695；erdosproblems.com | 已核实（一手） |
| 数学 | Tao 维基统计的 AI 贡献 | 初级贡献涉及 207 道题，其中 81 道至少有一条 🟢"完全解决"；维基数据止于 2026-06-30 | github.com/teorth/erdosproblems 维基（我数的行） | 已核实（一手）+ 推算 |
| 数学 | OpenAI 2026-10-06 一次放出 372 条证明声明 | 涉及 25 道 Erdős 题，21 道有 Lean 形式化；Bloom 尚未核验 | erdosproblems.com 博客 2026-10-08 | 已核实（一手）：核实的是"声明存在"，不是"证明正确" |
| 数学 | Claude 自主写完费马大定理的 Lean 形式化 | 11 天 / ~1,300 万行 Lean / ~60 亿输出 token（2026-09-04） | Anthropic 研究页 | 已核实（一手）；Anthropic 自己的数据；数学本身不是新的 |
| 数学 | Claude 把黎曼ζ零点"满足 RH 的比例"下界推高 | 41.6% → 67.2%（2026-08-10） | Anthropic 研究页 | 已核实（一手）；Anthropic 自己的数据，仅内部 + 2 位外部专家过目 |
| 数学 | IMO 2025 AI 金牌 | Gemini Deep Think 35/42（5/6 题），官方认证 | DeepMind 2025-07-21 | 已核实（一手）；OpenAI 同分为二手 |
| 数学 | IMO 2026 AI 满分（中国公司） | 华为 Celia、小红书 dots-note-3.0 各 42/42；人类 666 人中 7 人满分 | AFP/TechXplore 2026-07-23；IMO 官网 | AI 部分二手（AFP，公司自述官方评分）；人类部分已核实（一手） |
| 数学（中国） | 字节 / DeepSeek 形式化与证明模型 | Seed-Prover 1.5：Putnam 2025 十二题解 11；DeepSeekMath-V2：Putnam 2024 118/120 | arXiv 2512.17260 / 2511.22570 | 已核实（一手，论文自报） |
| 科学 | Kosmos AI 科学家 | 单次运行最长 12 小时；均读 1,500 篇、执行 42,000 行代码；报告陈述 79.4% 准确；20 轮≈合作者 6 个月 | arXiv 2511.02824（2025-11-04） | 已核实（一手）；Edison/FutureHouse 自报 |
| 科学 | AlphaFold 影响力 | >300 万研究者 / >190 国 / >35,000 篇论文引用（2025-11-25） | DeepMind 博客 | 已核实（一手）；自报 |
| 科学 | Google AI co-scientist | Nature 2026-05-19；AML 药物重定位体外验证 | Google 博客 2025-02-19；Europe PMC 记录 | 已核实（一手 + 期刊元数据） |
| 科学 | Evo 设计噬菌体基因组 | 测试 285 个设计，16 个成活（5.6%，推算） | Arc Institute 2025-09-17 | 已核实（一手） |
| 科学 | Claude 设计蝎毒结合蛋白 | 318,484 个设计 / 测 211 个 / 17 个达标（≈8%）；明确"不是抗蛇毒血清" | Anthropic 2026-10-20 | 已核实（一手）；Anthropic 自己的数据 |
| 医学 | Kaiser 环境 AI 病历 | 7,260 名医生 / 2,576,627 次就诊 / 约 15,791 小时（2023-10 至 2024-12） | KP 研究部页面 + AMA 转述 NEJM Catalyst | 已核实（一手：KP 自己的页面；NEJM 原文 403 未能打开）；机构自报 |
| 医学（反面） | 随机对照：AI 病历省时有限 | 238 名医生三臂 RCT：Nabla 病历时间 −9.5%，DAX −1.7%（不显著） | NEJM AI 2025-12（Europe PMC 摘要） | 已核实（一手：摘要） |
| 医学 | MAI-DxO 对 NEJM 病例 | 85.5% vs 21 名医生均值 20%（304 例，2025-06-30） | Microsoft AI 博客 | 已核实（一手）；Microsoft 自报，当时未同行评议 |
| 医学 | Penda Health × OpenAI（肯尼亚） | 39,849 次就诊 / 15 家诊所 / 诊断错误 −16% / 治疗错误 −13% | arXiv 2507.16947（2025-07-22） | 已核实（一手）；OpenAI 出资、作者含 OpenAI 员工 |
| 医学（中国） | DeepSeek 进医院 | 新华网转经济参考报："百余家医院"（2025-04-02）；medRxiv：261 家、84% 三甲；JMIR：百强院 48 家 | 新华网；medRxiv；JMIR 2025-12 | 已核实（一手：新闻原文 + 论文摘要） |
| 法律 | Harvey 官方规模 | 3,500+ 法律机构 / 85+ 国家 / 200,000+ 律师 / 80% Am Law 100（2026-09 至 10） | harvey.ai 官网与博客 | 已核实（一手）；自报 |
| 法律 | Harvey 融资 | $5.5 亿 @ $155 亿估值（2026-09-09） | Harvey 官方博客 | 已核实（一手） |
| 法律（反面） | AI 幻觉进法庭 | 2,202 起（截至 2026-10-19）：当事人自行诉讼 1,267、律师 872、法官 32 | Charlotin 数据库 | 已核实（一手） |
| 法律（中国） | 最高法"法信法律基座大模型" | 语料 3.2 亿篇 / 3.67 万亿字；深圳法院 AI 辅助审判系统 1.0 上线（2024-11-15） | court.gov.cn | 已核实（一手）；无使用量数字 |

---

## 一、软件

### S1. Boris Cherny（Claude Code 创造者）：30 天 259 个 PR
- **做了什么**：2025-12-27 发帖称，过去 30 天他合并 259 个 PR，**全部**由 Claude Code + Opus 4.5 写成。
- **数字**：259 PR；497 commit；+40k / −38k 行。
- **引文**："In the last thirty days, I landed 259 PRs -- 497 commits, 40k lines added, 38k lines removed." / "Every single line was written by Claude Code + Opus 4.5."
- **推算**：259 ÷ 30 ≈ 8.6 PR/天；净增行数 40k − 38k ≈ +2k 行（说明大量是改写而非新增）。
- **URL**：转引页 https://simonwillison.net/2025/Dec/27/boris-cherny ；原帖 https://x.com/bcherny/status/2004887829252317325（打开返回 402，**我没读到原帖**）。
- **强度**：**二手**（Simon Willison 直接引用并链接原帖）；本人自报。
- **保留**：自报、且本人是工具创造者；PR 数不等于价值；"每一行"无独立验证。后续有报道称他"每天 20–30 个 PR / 8 个月没手写代码"，我只在二手摘要里见过，**未核实，别用**。

### S2. Peter Steinberger（OpenClaw）：一个人一个月 6,600+ commit
- **做了什么**：2026 年 1 月以一个人的身份提交 6,600+ 次，同时跑 5–10 个 agent；偏爱 Codex 做长任务；把 PR 当成"prompt request"。
- **数字**：>6,600 commit（2026-01）；OpenClaw 仓库现为 392.7k stars、main 分支 116,951 次提交（GitHub 页面，2026-10-22 读取）。2026-02-14 宣布加入 OpenAI，项目转入基金会（TechCrunch 2026-02-15）。
- **推算**：6,600 ÷ 31 ≈ 213 commit/天。
- **引文**："From the commits, it might appear like it's a company. But it's not."
- **URL**：https://newsletter.pragmaticengineer.com/p/the-creator-of-clawd-i-ship-code ；https://github.com/openclaw/openclaw ；https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/
- **强度**：6,600 为**二手**（Gergely Orosz 的节目摘要，出自本人口述）；star/commit 数为**已核实（一手）**（GitHub 页面）。
- **保留**：Pragmatic Engineer 原文明确说这只是"一个人密集工作的一个月"，不代表典型；项目是实验性的、"move fast and break things"。另有博客称"每天 600+ commit"，与 6,600/月互相矛盾，**不要用**。

### S3. Nicholas Carlini（Anthropic）：16 个 Claude 并行写 C 编译器
- **做了什么**：16 个并行 Claude 实例，约两周、近 2,000 次 Claude Code 会话，写出 10 万行 Rust 的 C 编译器，可构建能启动的 Linux 6.9（x86 / ARM / RISC-V），还编译了 QEMU、FFmpeg、SQLite、Postgres、Redis，并跑起 Doom。多数编译器测试集通过率约 99%。
- **数字**：16 agents；~2,000 会话；<$20,000 API 费用；20 亿输入 + 1.4 亿输出 token；Opus 4.6；2026-02-05。
- **推算**：$20,000 ÷ 100,000 行 ≈ $0.20/行；$20,000 ÷ 2,000 会话 ≈ $10/会话。
- **引文**：作者自称"not yet a drop-in replacement for a real compiler"。
- **URL**：https://www.anthropic.com/engineering/building-c-compiler
- **强度**：**已核实（一手）**；Anthropic 自己的数据。
- **保留**（作者自己写的）：16 位 x86 代码生成要调 GCC（他称之为"cheating"）；没有自己的汇编器/链接器；生成代码比关优化的 GCC 还慢；新功能常破坏旧功能；"测试通过会给人虚假信心"。

### S4. Anthropic 内部调查：合并 PR +67%
- **数字**：132 名工程师/研究员调查（2025-08 采集）：日常工作使用 Claude 的比例 28% → 59%；自评生产力提升 +20% → +50%；27% 的 Claude 辅助工作"本来不会做"；Claude Code 采用后每工程师每天合并 PR **+67%**（这一项是行为数据，非自评）。
- **URL**：https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic （2025-12-02）
- **强度**：**已核实（一手）**；Anthropic 自己的数据。
- **保留**（页面自述）：样本部分是便利抽样（68 条来自 Slack 帖）、不匿名、早期采用者；他们自己引用 METR 研究说"有经验的开发者高估了 AI 带来的提速"。

### S5. 产品规模：Claude Code、Cursor
- **Claude Code**：年化收入 >$25 亿，较 2026 年初翻倍以上；Anthropic 整体年化 $140 亿；>500 家客户年支出 >$100 万（2026-02-12）。https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation — **已核实（一手）；自报**。
- **Cursor**：2025-11-13 Series D，"crossed $1B in annualized revenue"，估值 $293 亿 — https://cursor.com/blog/series-d — **已核实（一手）；自报**。2026-08-14 官方博客宣布"已被 SpaceX 收购" — https://cursor.com/blog/joining-spacex — **已核实（一手）**。收购价 $600 亿、ARR $20 亿（2026-03，Bloomberg）、$30 亿（2026-05，Bloomberg）来自 Wikipedia 引注，Bloomberg 原文我没打开 — **二手**。
- **Codex / TRAE**：Codex 数字因 openai.com 403 **未核实**。TRAE 官网与 IT之家 2026-10-10 报道（TraeWork 与 TraeCode 合并）都**没有任何用户数**，**未核实**。https://www.ithome.com/1/011/176.htm

### S6. Mythos：找出"成千上万个高危漏洞"
- **数字**：2026-04-07 发布；"thousands of high-severity vulnerabilities"，含每个主流操作系统与浏览器的零日；最老一个是 OpenBSD 27 年前的漏洞，另有一个 FFmpeg 16 年前的漏洞，自动化测试工具"撞过它 500 万次却没发现"；SWE-bench Verified 93.9% vs Opus 4.6 的 80.8%；12 家发起方；另有 40+ 机构获得访问。
- **URL**：https://www.anthropic.com/glasswing
- **强度**：**已核实（一手）**；Anthropic 自己的数据。
- **保留**：漏洞数量是 Anthropic 自称；很多只公布了哈希；SWE-bench 有题目被记忆筛查标记；不会通用开放。

### S7. "AI 写了多少代码"的公司口径（多数未核实）
- **OpenAI 总裁 Brockman**：称智能体编程工具能写的代码比例"去年 12 月从约 20% 升到约 80%"。IT之家 2026-05-01 转引《商业内幕》/红杉对谈。https://www.ithome.com/0/945/828.htm — **二手；OpenAI 自报**。
- **Google "75% 新代码由 AI 生成"（2026-04）**：只在一个聚合站的搜索摘要里见到，**未核实**。**Microsoft "20–30%"**：CNBC 页面 403，**未核实**。
- **中国公司（百度/腾讯/字节/阿里/美团）**：我查了百度 2025-Q4、2026-Q1、2026-Q2 的财报新闻稿（SEC EDGAR）和 Q2 电话会纪要，**没有"AI 生成代码占比"数字**；腾讯 2026-Q2 财报（2026-08-12）只说 CodeBuddy "breakout user growth"、国内领先，**没有数字**（https://www.tencent.com/wp-content/uploads/2026/08/Tencent-Announces-2026-Second-Quarter-Results.pdf）。字节/阿里/美团的占比数字**我没能找到一手来源 → 未核实**。
- **YC 2025 冬季批**：25% 的创业公司代码库 95% 由 AI 生成（TechCrunch 2025-03-06，经 Wikipedia 转引）— **二手**。

### S8. 反面：METR 随机对照
- **2025-07-10**：16 位资深开源开发者、246 个真实 issue、随机分配"可用 AI / 不可用"：可用 AI 时**慢 19%**；开发者事前预计提速 24%，事后仍认为提速 20%。
- **2026-02 更新**（页面上有"已过时"提示，更新文在 metr.org/blog/2026-02-24-uplift-update/）：57 位开发者 / 143 个仓库 / 800+ 任务；回头的 10 位估计提速 18%（置信区间含 0），新招的估计 4%（含 0）；METR 自称"只是非常弱的证据"，且很多开发者因不想在没有 AI 的条件下工作而拒绝参加（偏向低估）。
- **URL**：https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ ；https://metr.org/blog/2026-02-24-uplift-update/
- **强度**：**已核实（一手）**。

---

## 二、数学

### M1. Erdős 单位距离猜想被推翻（Erdős 问题 #90）——本片数学部分最硬的一条
- **事件**：2026-05-20，OpenAI 宣布其内部通用推理模型推翻了 Erdős 1946 年的平面单位距离猜想：存在 n 点集，单位距离对数至少为 n^(1+c)（c>0 为绝对常数）。同日，**9 位外部数学家**（Alon、Bloom、Gowers、Litt、Sawin、Shankar、Tsimerman、Wang、Wood）在 arXiv 发布"人工核验、精简过的版本"。
- **一手来源**：arXiv 2605.20695《Remarks on the disproof of the unit distance conjecture》，2026-05-20 提交 — https://arxiv.org/abs/2605.20695 ；erdosproblems.com/90 页面状态为"disproved"，页面上列出 OpenAI 托管的 PDF、Sawin 的 arXiv 2605.20579 — https://www.erdosproblems.com/90 ；Bloom 的博客 https://www.erdosproblems.com/forum/thread/blog:6（2026-05-31）。
- **引文**：Bloom："The ideas presented above are already substantially simpler than the raw proof first generated by AI."
- **二手补充**（The Decoder 2026-05-21、Understanding AI）：Gowers 称其"a milestone in AI mathematics"，并说会"毫不犹豫"推荐 Annals 接收；Litt："the first example of a result produced autonomously by an AI that I find exciting in itself"；Sawin 之后把下界推到约 n^1.014；Erdős 当年为此悬赏 $500。
- **强度**：**已核实（一手）**（arXiv + erdosproblems.com）；Gowers/Litt 的评语为**二手**。OpenAI 原帖 403，没读到。
- **保留**：是"推翻"，不是"完全解决"——上界仍是约 n^(4/3)；用的是已有的代数数论思想（Golod–Shafarevich、Ellenberg–Venkatesh 等），不是全新工具；Bloom 说人类作者显著改进了证明；据 Understanding AI，即便给满预算，模型也只有约一半的时间能解出；Anthropic 的 Mythos 另给出一个自称独立得到的论证（Bloom 转述）。

### M2. Tao 的 Erdős 问题"AI 贡献"维基——当前数字（注意：维基已停更）
- **页面自述**："The wiki is no longer updated. The latest data is as of Jun 30, 2026."（没有给原因）。页面还强调："Keep selection bias in mind when drawing conclusions about success rates of AI systems." 并且"不是基准测试"。
- **我数了页面原始 markdown（2026-06-30 数据）**——推算，方法：按章节统计表格行：
  - 初级贡献（1a–1d）涉及 **207 道不同的题**；其中 **81 道**至少有一条 🟢"完全解决"记录（1(a) 独立完成 18 道；1(b) 与文献并行 14 道；1(c) 在文献基础上 18 道；1(d) 与人类协作 36 道；各节有重叠，故不是简单相加）。
  - 1(a) 共 61 行：🟢 19、🟡（部分）23、🔴（错误）10、⚪（未验证）9。
  - 次级贡献：文献检索 2(a) 84 行，其中 37 道"在文献里找到完整解答"；形式化 2(b) 185 行（173 行 🟢）。
  - 日期范围：最早 2025-08-09，最晚 2026-06-30。
- **URL**：https://github.com/teorth/erdosproblems/wiki/AI-contributions-to-Erd%C5%91s-problems （原始文件：raw.githubusercontent.com/wiki/teorth/erdosproblems/AI-contributions-to-Erd%C5%91s-problems.md）
- **强度**：**已核实（一手）**（原始数据）+ **推算**（我的计数）。**别把 81 说成"AI 解决了 81 个 Erdős 问题"**：很多是已有文献里的旧结果被重新发现（1(b) 表格直接列了文献出处）、或是"变体问题"；🔴 错误记录在 1(a)+1(d) 里也有 17 行。
- **佐证与反面**：
  - Bloom 2026-01-19 博文：站点 1,135 题；AI 自 2025-10 起先做"超级文献检索"，年底开始出现 AI 生成的解答；"Plucking the low-hanging fruit is rapidly becoming an automated process." https://www.erdosproblems.com/forum/thread/blog:1
  - Bloom 2026-10-06《Changes》：站点 1,221 题、近 2,000 注册用户；他宣布**暂停**新评论与证明声明、撤掉题目状态标签，理由是"一堆未经解释的 AI 解答"在挤走真正关心数学的人；并称 AI 在不到一年里从"essentially useless"变成能帮助解决一些难题。https://www.erdosproblems.com/forum/thread/blog:9
  - Scientific American 2026-02-12：据 Tao 发起的页面，"AI 帮助把约 100 道 Erdős 问题移入'已解决'栏"（自 2025-10 起）——**二手**，口径与我的计数不同（含文献检索发现），**别和 81 混用**。https://www.scientificamerican.com/article/ai-uncovers-solutions-to-erdos-problems-moving-closer-to-transforming-math/

### M3. OpenAI 2026-10-06 的"大批量投放"——正在争议中，只能当"声明"
- **事实**（Bloom 2026-10-08《Erdős problems in the OpenAI proofs》）：OpenAI 在 2026-10-06 放出 **372 条证明声明**；其中 **25 道 Erdős 问题**有"实质性声明"（#3、#90、#120、#138、#148 ……）；25 道里 **21 道**已 Lean 形式化；PDF 共 1,347 页（≈54 页/题）。
- **Bloom 的态度**：他"没有认真核对证明或 Lean 形式化"，一律当"声明"；"none should be viewed as closing the problem"；论文"very poorly written, in the usual AI fashion"，但预期多数正确；指出有抄袭/署名争议。https://www.erdosproblems.com/forum/thread/blog:10
- **数学界的反应**：美国数学会相关的"AHM"声明（经 Tao 博客转载，2026-10-07）称发布"over 700 files"，并说："We reject OpenAI's assertion that this release advances our subject."；呼吁数学家"停止与 OpenAI 合作"。https://terrytao.wordpress.com/2026/10/07/ahm-statement-on-openais-october-6-release-of-mathematical-documents/ 。另一篇 Tao 博客客座文（2026-10-18）称这次试了约 4,000 题，成功"some hundreds"（作者读 OpenAI 公告所得，**未核实**）。
- **强度**：Bloom/AHM 的页面是**已核实（一手）**；OpenAI 声明本身 = **OpenAI 自报、未经同行核验**。
- **用法**：只能说"OpenAI 称……，数学家们尚在核对"。其中一篇涉及"Landau–Siegel 零点不存在"的预印本，Tao 2026-10-19 说"仍在被消化"（"still in the process of being fully digested"）——**一定不要说成已被证明**。

### M4. Anthropic：费马大定理 Lean 形式化、黎曼ζ零点比例
- **FLT（2026-09-04）**：Claude 在约 **11 天**里基本自主写出"第一份端到端、机器检查的 FLT 证明"（Lean）；约 **1,300 万行** Lean，最终证明含 29,500 个中间定理；约 60 亿输出 token；Buzzard 事后评论为"extraordinary autoformalization achievement"。https://www.anthropic.com/research/formalizing-fermats-last-theorem — **已核实（一手）；Anthropic 自己的数据**。**保留**：数学本身不是新的（新颖处在验证）；早期多 agent 尝试失败；证明"很可能比必要的长得多"；Buzzard 并没有指导过程，只是事后审阅。
- **黎曼ζ（2026-08-10，8-13 更新）**：未发布的研究版 Claude 把"黎曼ζ零点中满足黎曼猜想的比例"下界从 **41.6% 推到 67.2%**；两位 Anthropic 数学家验证，Conrey 与 Goldston"examined"（页面未说他们背书）；还做了 Lean 形式化。https://www.anthropic.com/research/riemann-zeta — **已核实（一手）；Anthropic 自己的数据**。**引文**："We don't expect that the techniques Claude used will lead to proving the Riemann hypothesis." **保留**：模型未发布；约 31M 输出 token、先试了约 650 个失败想法、后来用约 60 个子 agent；它没有证明黎曼猜想。

### M5. IMO：2025 金牌 → 2026 满分
- **2025（一手）**：Gemini Deep Think 在 IMO 2025 得 **35/42**（解出 5/6 题），自然语言、4.5 小时内，IMO 官方协调员评分。IMO 主席 Gregor Dolinar："We can confirm that Google DeepMind has reached the much-desired milestone" https://deepmind.google/discover/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/ （2025-07-21）— **已核实（一手）**。
- **OpenAI 2025 同为 35/42**：只在第三方文章里见到（TechXplore 2026-07-23："Google 和 OpenAI 达到金牌水平"；Digital Applied 称 OpenAI 的答卷由三位前奖牌得主评分，而非官方评分）— **二手；OpenAI 自报**；原帖我没读到。
- **2026（上海，7 月 10–21 日）**：官方页面——**666 名选手、117 国、7 人满分** — https://www.imo-official.org/editions/2026/ （**已核实（一手）**；页面对 AI 参赛**没有任何说明**）。AI：AFP（TechXplore，2026-07-23）报道**华为 Celia** 与**小红书 dots-note-3.0** 各得 **42/42**；小红书称答卷提交给 IMO 组织方评分、"any form of human intervention was strictly prohibited"；报道中**没有 IMO 官员的话** — https://techxplore.com/news/2026-07-ai-humans-score-math-contest.html — **二手**。
- **旁证（非官方）**：Menlo Ventures 的 Deedy Das 自测，四个模型（OpenAI、Anthropic、Axiom、Kimi K3）都是 42/42，但评分者是 Claude 系 agent；Das 说："The frontier of AI has officially moved well past IMO math."——**非官方，别当 IMO 结果**。
- **保留**：完美的奥赛分数只说明"定义清晰、限时的题"已被攻克，不等于研究数学被攻克；2025 年 IMO 主席也说过他们无法核实 AI 的算力用量与是否有人介入。

### M6. 中国的数学 / 形式化证明模型
- **字节 Seed-Prover**（arXiv 2507.23726，2025-07-31）：IMO 2025 **完全证明 5/6 题**（Lean 形式化），形式化往届 IMO 题 78.1%，PutnamBench >50%。**Seed-Prover 1.5**（arXiv 2512.17260，2025-12-19）：PutnamBench 88%；**Putnam 2025 十二题解出 11 道（9 小时内）**。**已核实（一手）；论文自报**。
- **DeepSeekMath-V2**（arXiv 2511.22570，2025-11-27）：摘要称 IMO 2025 与 CMO 2024"gold-level"，Putnam 2024 "118/120"（"with scaled test-time compute"）。**已核实（一手）；论文自报**。
- **保留**：这些是模型基准/竞赛成绩，没有"解决公开问题"的成果；"北大 / 中科院用 AI 做证明"的具体案例我**没能找到一手来源 → 未核实**。

### M7. FrontierMath（只当"基准本身也不干净"的反面用）
- Epoch 官方页：2026-06-12 发布 v2，Tier 4 **修正 12 题、删 7 题、剩 43 题**；页面称 v2"addressed errors in 42% of problems"。https://epoch.ai/frontiermath/tiers-1-4 — **已核实（一手）**。
- "GPT-6 Astra 在 Tier 4 得 97.6%""Epoch 宣布 Tier 4 饱和"：只见于量子位（经 36氪 2026-09-11）和 KuCoin 转载，且称 97.6% 为 OpenAI 自报 — https://eu.36kr.com/en/p/3978639480617733 — **二手 / 未核实**（Epoch 页面打不开分数）。该文还说"Astra 在 68 道 FrontierMath-Erdős 题里解出 2 道"（二手）。

---

## 三、科学 / 生物

### Sc1. Kosmos（Edison Scientific / FutureHouse）——你提到的那组数字，已核对
- **数字（论文摘要原文）**：运行"up to 12 hours"；每次运行 200 个 agent rollout；**平均执行 42,000 行代码、平均阅读 1,500 篇论文**；独立科学家评审其报告中 **79.4%** 的陈述准确；**一次 20 轮运行≈合作者平均 6 个月的研究时间**；7 项发现，其中 3 项独立复现了未发表/预印本结果，4 项是新贡献。
- **URL**：https://arxiv.org/abs/2511.02824 （v1 2025-11-04）；Edison 2026-03-16 博文（称"6 个月工作量一天做完、80% 可复现"，搜索 1.75 亿篇文献）https://edisonscientific.com/news/accelerating-science-at-scale
- **强度**：**已核实（一手）**；作者即公司人员 → **自报**。
- **保留**：①"6 个月"是合作者的估计，不是实测；②**79.4% 准确 = 约每 5 条陈述有 1 条不准（推算：100% − 79.4% = 20.6%）**；③1,500 篇与 42,000 行是"每次运行的平均值"，不是保证；④7 项发现中 3 项是复现。"12 小时≈6 个月"这个说法**摘要里是"20 轮运行≈6 个月"，不是"12 小时"**——镜头文案请照论文措辞。

### Sc2. AlphaFold
- **数字**：>300 万研究者用过 AlphaFold 数据库（其中 >100 万在中低收入国家）；"more than 190 countries"；被 >35,000 篇论文引用；AlphaFold Server 产出 >800 万次折叠；Innovation Growth Lab 的独立分析发现，研究者提交的新实验蛋白结构增加 >40%（2025-11-25）。
- **URL**：https://deepmind.google/blog/alphafold-five-years-of-impact/ ；EMBL-EBI 数据库页自述"over 260 million protein structure predictions"（同页背景段仍写"over 200 million"，不一致）https://alphafold.ebi.ac.uk/
- **强度**：**已核实（一手）**；**自报**（除 IGL 的 40% 为 DeepMind 转述的第三方研究）。2024 年诺贝尔化学奖页面 403 未打开，**不在此背书**。

### Sc3. Google AI co-scientist
- **事实**：Google 博客 2025-02-19 发布；**Nature 2026-05-19** 发表《Accelerating scientific discovery with Co-Scientist》（DOI 10.1038/s41586-026-10644-y；Europe PMC 记录摘要：AML 药物重定位候选与协同组合"通过体外实验验证"）。
- **URL**：https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/ ；https://doi.org/10.1038/s41586-026-10644-y
- **强度**：**已核实（一手）**（博客 + 期刊元数据）；我没读到 Nature 全文。
- **保留（博客自述）**：三个"验证"里，**抗菌素耐药（cf-PICI）那一项是"重新发现"**——团队在用系统之前就已实验验证；肝纤维化结果当时没完整披露；三项都有专家参与；专家评估样本很小（11–15 个研究目标）。

### Sc4. Robin（FutureHouse）：ripasudil 治干性 AMD
- **事实**：多 agent 系统（Crow/Falcon/Finch）提出 ripasudil（临床上治青光眼的 ROCK 抑制剂）作为干性 AMD 候选；原始公告 2025-05-20；页面头部显示已于 **2026-05-19 发表在 Nature**；在原代人 RPE 干细胞里验证；"人类研究者执行实体实验，但智力框架完全由 AI 驱动"。
- **URL**：https://www.futurehouse.org/research-announcements/demonstrating-end-to-end-scientific-discovery-with-robin-a-multi-agent-system
- **强度**：**已核实（一手）**；自报。
- **保留**：只有体外细胞实验，**没有体内/临床**；页面没有给效应量；FutureHouse 自己的公告。

### Sc5. Arc Institute：Evo 设计噬菌体基因组
- **数字**：测试 **285** 个设计，**16** 个成活并通过测序验证（2025-09-17）；16 个都只感染 E. coli C。**推算**：16 ÷ 285 ≈ 5.6%。
- **URL**：https://arcinstitute.org/news/hie-king-first-synthetic-phage
- **强度**：**已核实（一手）**。bioRxiv 摘要页 429 未能打开，只用了 Arc 的新闻稿。
- **保留**：成功率约 5.6%；是细菌病毒，不感染人类。

### Sc6. Anthropic 自己做的科学（2026 年 8–10 月）——全部"Anthropic 自己的数据"
- **蝎毒结合蛋白（2026-10-20）**：内部研究模型 64 小时生成 **318,484** 个设计、挑 180 个 + 补 31 个 = **211** 个送测（Adaptyv Bio、Twist Bioscience 做表面等离子共振）；**17 个（≈8%）**达标；最强两个 KD 为个位数 nM。引文："we do not claim to have produced an antivenom"。保留：只测了重组毒素，没做细胞/动物中和；多毒素设计全部失败。https://www.anthropic.com/research/claude-scorpion-toxin-binder-design
- **新酶系统 ART（2026-09-23）**：agent 收集 20 万+ 逆转录酶、筛 3,500 个候选、20 个出报告；一次搜索约 950 个 agent、21 小时、2.1 亿 token；Feng Zhang 评价"genuinely intriguing and merits further investigation"。保留：预印本；**功能未知**；实验全部由人在 Anthropic 实验室做。https://www.anthropic.com/research/claude-discovers-novel-enzyme-system
- **火星漫游车路线（2025-12-08/10 两个 sol）**：Claude 规划约 400 米路线，用 50 万+ 变量的仿真检验；JPL 工程师"估计"路径规划时间减半。保留：是估计、不是实测；Claude 的计划需微调（沙纹）。https://www.anthropic.com/features/claude-on-mars
- **强度**：**已核实（一手）**；全是自家发布。

### Sc7. 中国
- **上海 AI Lab 书生 Intern-S1**（arXiv 2508.15763，2025-08-21）：2,410 亿总参数 / 280 亿激活；5T token 预训练（含 2.5T 科学数据）；称在分子合成路线规划、反应条件预测、晶体热力学稳定性预测上超过闭源模型。**已核实（一手）；自报**；arXiv 页面没列机构，需另行确认归属；**没有"改变了什么"的影响数字**。
- 深势科技官网无任何用户/客户数字；百图生科、中科院等**我没能找到一手数字 → 未核实**。

---

## 四、医学

### Md1. Kaiser Permanente：环境 AI 病历（Abridge 等）
- **数字**：2023-10 至 2024-12（63 周）：**7,260 名** Permanente 医生使用，**2,576,627 次**就诊；估计节省文书时间 **15,791 小时**（≈1,794 个 8 小时工作日；KP 页面写"nearly 16,000 hours"）；10 周试点 3,442 名医生、30 万+ 次就诊。调查：102 名医生里 88% 说对问诊互动有正面影响（KP 页面口径；AMA 稿写 84% 正面体验——两处口径不同，**用之前请二选一并注明出处**）；118 名患者里 47% 认为医生看电脑的时间变少。
- **URL**：KP 研究部（2025-04-01）https://divisionofresearch.kaiserpermanente.org/ai-assisted-notetaking-gains-steady-support-from-kaiser-permanente-physicians/ ；AMA（2025-06-11）https://www.ama-assn.org/practice-management/digital-health/ai-scribes-save-15000-hours-and-restore-human-side-medicine ；研究：NEJM Catalyst，doi:10.1056/CAT.25.0040（**页面 403，我没读到原文**）。
- **强度**：**已核实（一手）**（KP 自己的页面 + AMA 转述）；机构自报。2026 年更新：本次未找到。
- **推算（建议作为保留一并上片）**：15,791 小时 ÷ 7,260 名医生 ≈ **2.2 小时/人**（15 个月内）；15,791 × 3,600 秒 ÷ 2,576,627 次 ≈ **22 秒/次就诊**。（口径提醒：该"节省时间"是相对未使用者的估计，不一定能这样平摊。）
- **保留**：时间节省是估计；满意度来自自填问卷；研究中途换过供应商；低频用户抱怨模板整合差、改 AI 草稿比自己打字慢（AMA 稿）。
- **随机对照的反面证据**：**NEJM AI 2025-12**（Lukac 等，DOI 10.1056/aioa2501000）：238 名医生三臂 RCT（Nabla / DAX / 常规）：Nabla 使病历时间 **−9.5%**（95% CI −17.2 至 −1.8），DAX **−1.7%（不显著）**；JAMIA 2026-05（Chowdhury 等，DOI 10.1093/jamia/ocag018）：随机交叉，两款产品之间每天差 3.19 分钟。**已核实（一手：Europe PMC 摘要）**。
- **厂商自述**：Abridge 官网（无日期）：300+ 医疗系统、每年 100M+ 次对话——**自报，无日期，别当事实**。https://www.abridge.com/

### Md2. Microsoft MAI-DxO
- **数字**：在 304 个 NEJM 病例（转成 Sequential Diagnosis Benchmark）上，MAI-DxO 配 OpenAI o3"correctly solved 85.5% of the NEJM benchmark cases"；21 位有 5–20 年经验的美英医生"a mean accuracy of 20% across completed cases"。2025-06-30。
- **URL**：https://microsoft.ai/new/the-path-to-medical-superintelligence/
- **强度**：**已核实（一手）**；Microsoft 自报。
- **保留（Microsoft 自己写的）**："research demonstrations only"；当时未同行评议；医生被禁止使用同事、教科书和生成式 AI；病例是罕见疑难题，需要在日常常见病上再测；未获临床使用批准。

### Md3. Penda Health × OpenAI AI Consult（内罗毕）
- **数字**：39,849 次就诊、15 家诊所；有 AI 的医生**诊断错误少 16%、治疗错误少 13%**；作者推算 Penda 全年可避免约 22,000 次诊断错误和 29,000 次治疗错误；所有受访使用者都说改善了诊疗，75% 说"显著"。
- **设计**：质量改进研究，诊所内医生随机分到有/无 AI；5,666 次就诊由 108 位医生盲评（1–5 分，≤2 记为错误）。
- **URL**：https://arxiv.org/abs/2507.16947 （2025-07-22）；全文 https://arxiv.org/html/2507.16947
- **强度**：**已核实（一手）**；**OpenAI 出资、多位作者是 OpenAI 员工、评审医生由 OpenAI 选定**（论文自述）。
- **推算**：论文给出诊断的 NNT = 18.1，约 1 ÷ 18.1 ≈ 5.5 个百分点绝对差。
- **保留**：评分者一致性只是"fair"（κ 0.22–0.29）；**患者结局无统计显著差异**（8 天随访：AI 组 3.8% vs 非 AI 组 4.3% 说"没好转"），且约 60% 的结局数据缺失；论文未发现 AI 直接致害案例；是预印本。

### Md4. OpenAI 关于"多少人在 ChatGPT 问健康问题"
- **我没能核实**：openai.com 全部 403；Wikipedia 只确认 ChatGPT Health 于 2026-01-07 推出、ChatGPT 2026-02 周活 9 亿（引 Wikipedia，**二手**），没有"问健康问题的人数"。我记忆中 OpenAI 2026-01 的报告给过"每天约 4,000 万人"，**这只是记忆，未核实，不要上片**，需要人工去 OpenAI 原文核对。

### Md5. 中国：DeepSeek 进医院——速度与"没人评估"的反差
- **新华网（转经济参考报，2025-04-02）**："据初步统计，目前全国已有20多个省份的百余家医院实现DeepSeek本地化部署"；同日发布《医疗机构部署DeepSeek专家共识》。https://www.news.cn/tech/20250402/f02b65e2bed64001ae8f2d892bcf1c96/c.html — **已核实（一手：新闻原文）**；统计方法未说明。
- **medRxiv 预印本**（Yuan 等，2025-05-16）：数据采集 2025-01-01 至 03-08；**261 家**医院报告本地部署 DeepSeek-R1，覆盖 93.5% 的省份，**三级医院占 84%**，671B 版本最常见（45.2%）；**全国整体部署率仅 0.7%**。https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1101/2025.05.15.25326843&format=json&resultType=core （页面 medrxiv.org 403，此为元数据摘要）— **已核实（一手：摘要）**；未同行评议。
- **JMIR（Jiang 等，2025-12-05，DOI 10.2196/80770）**：中国百强医院中 **48 家**部署了 58 个 DeepSeek 模型；首例 2025-02-10，**一个月内 37 家**；用途以临床决策支持（诊断/治疗建议）为主；**只有 36%（21/58）提到上线前评估，22%（13/58）报告了评估结果，9%（5/58）识别了风险**；结论：部署快、潜在患者安全风险，需更严格验证与透明报告。**已核实（一手：摘要）**。
- **保留**：这是"部署"而非"有效"；公开披露往往只报好处。**很适合当片尾前的"升华"反差**：1 个月 37 家 vs. 9% 谈风险。

### Md6. 未核实 / 暂不可用
- 清华 Agent Hospital：arXiv 2405.02957 摘要**没有任何准确率数字**（只说"数以万计的患者 agent"、在 MedQA 上优于已有医疗 agent 方法），且 arXiv 页面不显示单位 → 数字与"紫荆智康"落地情况**未核实**。
- 瑞金医院 RuiPath、北京/上海 AI 预问诊的具体人次：**我没能找到一手来源 → 未核实**。

---

## 五、法律

### L1. Harvey（官方数字，2026 年 9–10 月）
- **官网（2026-10-22 读取）**：首页"3,500+"法律机构、"85+"国家、"80+" Am Law 100 律所、"200,000+"专业人士使用、"25+"小时/用户/月（注意：首页写的是 professionals，客户页写"More than 200,000 lawyers across 3,500+ organizations in 85+ countries"）。https://www.harvey.ai/ ；https://www.harvey.ai/customers
- **融资**：**2026-09-09，$5.5 亿、估值 $155 亿**，Diffusion 与 Lightspeed 领投；稿中写"80% of Am Law 100 law firms use Harvey"、"five of the Fortune 10"。引文："80% of Am Law 100 law firms use Harvey"。https://www.harvey.ai/blog/harvey-raises-dollar550m-at-a-dollar155b-valuation-to-help-legal-teams-own-their-intelligence
- **估值路径**：$30 亿（2025-02）→ $50 亿（2025-06）→ $80 亿（2025-12，a16z 领投，TechCrunch 2025-12-04 已核对）→ $110 亿（2026-03，GIC/Sequoia）→ $155 亿（2026-09）——除 2025-12 与 2026-09 外，其余来自 Wikipedia 引注，**二手**。
- **ARR**：TechCrunch 2025-12-04："surpassed $100 million in annual recurring revenue back in August"（2025-08，Harvey 向 TechCrunch 的说法）。2026 年的 ARR **没有找到 Harvey 官方数字**；Sacra 的"2026-08 突破 $4 亿"是**估算（二手）**，不要当公司数字。
- **Am Law 100 覆盖率**：2025-09 为 50 家（TechCrunch 转述 Harvey 披露）→ 2026-09 官方称 80% = 80 家 → **推算：一年增加约 30 家**。
- **强度**：**已核实（一手）**，全部**自报**。
- **保留**：这是 Harvey 的销售口径，"使用"不等于"每天依赖"；不同来源的客户数口径不一（Sacra 的"1,500+ 客户 / 142,000 律师 / 50% Am Law 100"是旧数，已被官网数字超过，**不要混用**）。
- **早期锚点**：A&O（现 A&O Shearman）2023-02-15 公告：试用期约 3,500 名律师、约 40,000 次查询、43 个办公室；引文："In our trial, we saw some amazing results." — https://www.aoshearman.com/en/news/ao-announces-exclusive-launch-partnership-with-harvey — **已核实（一手）**，但是 2023 年的旧数据，且公告没给量化结果。

### L2. 反面：AI 幻觉进法庭（Damien Charlotin 数据库）
- **数字**：**2,202 起**（页面标注 2026-10-19 更新）。按当事人：自行诉讼者 1,267、律师 872、法官 32、专家 17、检察官 5……；按国家：美国 1,501、加拿大 234、澳大利亚 112、英国 76、以色列 58、巴西 41、**中国 5、香港 5**。
- **推算**：律师 872 ÷ 2,202 ≈ 39.6%；美国 1,501 ÷ 2,202 ≈ 68%。
- **URL**：https://www.damiencharlotin.com/hallucinations
- **强度**：**已核实（一手）**；页面各分项加总（2,200 / 2,204）与总数 2,202 略有出入，建议上片只用总数并注明"截至 2026-10-19"。
- **保留**：该库收录的是"被法庭发现/处理的"案例，不是发生率。

### L3. 对照研究（学术）
- **Stanford RegLab**（arXiv 2405.20362，2024-05-30）：Lexis+ AI 与 Westlaw 的 AI 工具"between 17% and 33%"的时间会幻觉。**已核实（一手：摘要）**；注意是 2024 年的产品版本。
- **随机对照试验**（Schwarcz、Manning、Prescott、Barry 等，2025，密歇根大学法学院工作论文 No.772）：法学院高年级学生完成法律任务，分 Vincent AI（RAG 工具）/ OpenAI o1-preview / 不用 AI：6 项任务里 5 项产出显著提升，**生产力提升约 50%–130%**，质量显著提高；Vincent AI 未比不用 AI 增加幻觉。https://repository.law.umich.edu/pub_law_archive/772 — **已核实（一手：摘要）**。**保留**：被试是法学生，不是执业律师；页面未给样本量与资助方；摘要未提 Vincent 供应商。
- **Ashurst**：5 个月、400+ 员工的试验，AI 起草初稿用时约为人工一半、法律准确度"至少同样正确"（Bloomberg Law 2024-06-11）— **二手**（付费墙）；律所自报。

### L4. 中国
- **最高法"法信法律基座大模型"**（2024-11-15 新闻发布会）：语料 **3.2 亿篇、3.67 万亿字**；以清华成果转化的"千亿参数"通用大模型为基座；2024-10-21 完成生成式 AI 备案；**深圳法院人工智能辅助审判系统 1.0 版**已以它为底层上线；引文："有力提升了审判工作质效"（页面**没有任何使用量、法官人数、案件量数字**）。https://www.court.gov.cn/zixun/xiangqing/447711.html — **已核实（一手）**。2025-03-29 中关村论坛再次展示。https://www.court.gov.cn/zixun/xiangqing/460311.html
- **官方立场**：2026-03 最高法工作报告提出"稳慎研发人工智能辅助审判系统"，坚持"辅助"定位、责任主体只能是法官（转述自第一财经评论文 2026-09-28，**二手**；工作报告原文我没读到）https://www.yicai.com/news/103380194.html 。2026-04-20 最高法副院长陶凯元："最高人民法院正在抓紧起草关于依法妥善审理涉人工智能纠纷案件的意见"（界面新闻，**二手**）https://m.jiemian.com/article/14278492.html 。
- **律所（金杜/中伦等）部署数字**：**没有找到一手来源 → 未核实**。法律 AI 产品的国内用户数：**未找到**。
- **保留**：中国法院口径是"辅助"，且官方没有给出效果量化数字。

---

## 最适合上片的（按"够震撼 + 已核实 + 能一屏讲清"排序）

1. **Erdős 单位距离猜想被 AI 推翻（2026-05-20）**——一手（arXiv 2605.20695 + erdosproblems.com）。一屏讲法：1946 年的猜想 → 9 位数学家署名核验 → Gowers"AI 数学的里程碑"（二手引语）。必带保留：是推翻、不是完全解决；人类显著改进了证明；OpenAI 另有 372 条声明还在被核对（别混为一谈）。
2. **Kaiser：7,260 名医生、2,576,627 次就诊、约 15,791 小时**——一手（KP 自己的页面）。**强烈建议并排放保留**：RCT（NEJM AI 2025-12）里病历时间只少 9.5%；推算每次就诊约 22 秒。"大数字 vs 小增量"本身就是一个好镜头。
3. **Kosmos：最长 12 小时、读 1,500 篇、跑 42,000 行代码、79.4% 准确**——一手（arXiv 2511.02824），自报。按论文措辞："20 轮运行≈6 个月合作者时间"，并给出"每 5 条陈述有 1 条不准"。
4. **DeepSeek 进医院：一个月内百强院 37 家，但只有 9% 的医院谈风险**——一手（JMIR 摘要 + medRxiv 摘要 + 新华网）。中国样本、有速度也有反差，适合收在医学段尾。
5. **IMO：2025 年 35/42（Gemini Deep Think，官方认证）→ 2026 年两家中国 AI（华为 Celia、小红书 dots-note-3.0）报 42/42**——2025 为一手；2026 为二手（AFP，公司称官方评分）；人类 666 人中仅 7 人满分（官方）。上片时 2026 部分要标"AFP 报道，公司自述"。
6. **16 个 Claude 两周写出能编译 Linux 的 C 编译器（<$20,000、10 万行 Rust）**——一手（Anthropic 自己的数据）。保留：GCC 兜底 16 位部分、无自家汇编/链接器、"不是真编译器的替代品"。
7. **Claude 11 天写完费马大定理的 Lean 形式化（~1,300 万行）；黎曼ζ零点比例 41.6% → 67.2%**——一手（Anthropic 自己的数据）。保留：FLT 数学不新、ζ 结果非 RH；仅内部与两位外部专家过目。
8. **Penda Health：39,849 次就诊，诊断错误 −16%、治疗错误 −13%**——一手（arXiv），**但 OpenAI 出资且患者结局无显著差异**，必须带这句。
9. **Harvey：80% 的 Am Law 100、估值 $155 亿（2026-09-09）  vs  2,202 起 AI 幻觉案例（2026-10-19）**——一手；同一屏正反并列。
10. **AlphaFold：>300 万研究者、>190 国、>35,000 篇论文引用（2025-11-25）**——一手，自报；Kosmos/co-scientist/Robin 之外的"科学底座"。

**有条件可用（二手，上片须标注）**
- **Boris Cherny：30 天 259 个 PR、"每一行都是 Claude Code 写的"**——转引一手帖，原帖我没读到；自报；净增仅约 +2k 行（推算）。
- **Peter Steinberger：2026 年 1 月 6,600+ commit**——Pragmatic Engineer 转述；OpenClaw 现 392.7k star（GitHub，一手）。

## 不要用

- **"Steinberger 每天 600+ commit"**：与"6,600/月≈213/天"互相矛盾。
- **Cherny 的后续说法**（"每天 20–30 个 PR""8 个月没手写代码"）：只见于二手摘要。
- **所有"公司 X% 新代码由 AI 写成"**：Google 75%（搜索摘要）、Microsoft 20–30%（页面 403）、百度/腾讯/字节/阿里/美团（一手里没有数字）。Brockman 的 20%→80% 是 OpenAI 自报、二手。
- **Harvey ARR $3 亿 / $4 亿**（Sacra 估算）；**Sacra 的 1,500+ 客户 / 142,000 律师 / 50% Am Law 100**（旧、与官网冲突）。
- **FrontierMath "Astra 97.6%""Tier 4 饱和""几天解一个千禧年难题"**：只见于量子位/36氪转述，后者无证据；Epoch 官方页面只证实了 v2 修正（12 题改、7 题删、42% 题目有错误）。
- **IMO 2026"四家模型 42/42""GPT-5.6 一次性解出"**：非官方评分（评分者是 Claude agent）或个人博客。
- **"AI 解决了 81 / 100 道 Erdős 问题"**：81 是我数的"至少一条 🟢"，含旧文献重新发现与变体问题；"约 100 道"是 Scientific American 对 Tao 页面的转述。两者都不是"AI 独立解决了这么多道开放难题"。
- **OpenAI 2026-10-06 的 372 条声明**当作"已证明"（含 Landau–Siegel 零点）：Bloom 说尚未核对，Tao 说仍在消化，AHM 在公开反对。
- **Google co-scientist 的 cf-PICI 当作"AI 新发现"**：那是重新发现。
- **Tao"只有 1–2% 的开放问题适合当前 AI"、Dwarkesh"一年 50 道"**：只在搜索摘要中见到，未核实。
- **OpenAI"每天 4,000 万人问健康问题"**：仅记忆，未核实。
- **Abridge 官网 300+ 医疗系统 / 100M+ 对话**：无日期、厂商营销数字。
- **Agent Hospital / 紫荆智康 / 瑞金 RuiPath / AI 预问诊人次**：没有一手数字。
- **金杜 / 中伦 AI 部署数字**、**法律 AI 产品国内用户数**：没有找到。
- **MAI-DxO 的 85.5% vs 20%** 不带"医生没有同事/书/AI 可用、非同行评议"的单独使用。

## 缺口 / 待补（给主线程）
1. 中国公司 AI 写代码占比（百度、腾讯、字节、阿里、美团）的一手数字——需要财报电话会纪要或官方公众号原文；本次搜索额度用尽。
2. 字节 TRAE、Codex 的用户/收入数字（2026）。
3. OpenAI 的健康问题人数（需人工打开 openai.com 原文）。
4. 中国医学：瑞金 RuiPath、紫荆智康、AI 预问诊的官方数字；中国法律：金杜/中伦/法律 AI 产品。
5. 中国科学：深势科技、百图生科、中科院的可量化成果。
6. IMO 2026 的官方说法（华为、小红书的官方公告或 IMO 声明）以及 OpenAI/Google 2026 是否参赛。
7. NEJM Catalyst 原文（KP 数据）与 2026 年的更新；Harvey 2026 官方 ARR。
