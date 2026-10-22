# 02 平台级 token 总量时间序列 + 把 token 变成“书”

《最会用 AI 的人，在用 AI 干什么》（世界的形状系列，无声片，屏上每个数字须有出处）
调研日期：2026-10-22。所有网页均在 2026-10-22 当天读取。

## 读法

**强度标签**（不升级）
- **已核实（一手）**：我读到了公司/官方原页（Alphabet IR 电话会逐字稿 PDF、blog.google、Microsoft IR 逐字稿 docx、a16z / OpenRouter 研究页、DeepSeek 与 OpenAI 官方文档），数字原文在页面里。
- **二手**：只读到媒体转述官方发言/发布（括号里写明媒体）。新华社、第一财经、财联社这类转述官方发言的，可信度高，但仍按规则标二手。
- **未核实**：只有搜索摘要/聚合页/博客，或多个来源互相矛盾。

**自报声明**：Google 的一切数字是 Google 自报；Microsoft 是 Microsoft 自报；OpenAI 是 OpenAI 自报；豆包/火山引擎是火山引擎自报；全国数字是国家数据局局长在发布会上的表述，国家数据局没有公开定义“日均 Token 调用量”到底包含什么（Pebblous 报告亦指出此点，见第 6 节）。

**口径提醒（最重要）**：下面各家的“token 数”口径互不相同，不能相加，也不能直接比大小。
- Google 每月数：“across our surfaces”（含 Search、Workspace、Gemini app、API 等所有产品面）。
- Google 每分钟数：仅“第一方模型经客户直接 API 调用”。
- OpenAI 每分钟数：API 平台。
- Microsoft：仅 Foundry API。
- 豆包日均：火山引擎对“豆包大模型日均 Tokens 调用/使用量”的自报。
- 全国日均：国家数据局表述，口径未公开。
- OpenRouter：仅经 OpenRouter 路由的第三方流量，主要是海外开发者。

**换算符号**：“推算”= 我自己算的，算式写在旁边。

---

## 速查表

| 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|
| Google 每月处理 token（全产品面） | 2024-05：9.7 万亿 → 2025-05：480 万亿 → 2025-07：980 万亿 → 2025-10：1.3 千万亿（1.3 quadrillion）→ 2026-05：超 3.2 千万亿（3.2 quadrillion） | Google I/O 2025、2026 官方博客；Alphabet 2025 Q2/Q3 财报 | 已核实（一手），Google 自报 |
| Google 2026-05 月处理量同比 | 7 倍（480 万亿 → 3.2 千万亿） | blog.google I/O 2026 | 已核实（一手） |
| Google 模型 API 每分钟 | 70 亿（2025-10）→ 100 亿（2026-02）→ 160 亿（2026-04）→ 190 亿（2026-05）→ 220 亿（2026-07） | Alphabet 财报逐字稿、I/O 2026 博客 | 已核实（一手） |
| Google 内部开发者工具 | 2026-03 每天 0.5 万亿 → 2026-05 每天超 3 万亿 | blog.google I/O 2026 | 已核实（一手） |
| 累计超 1 万亿 token 的 Google Cloud 客户 | 约 150（2025Q3）→ 330（2026Q1）→ 375（I/O 2026）→ 近 500（2026Q2） | 同上 | 已核实（一手） |
| OpenAI API 每分钟 | 2025-10-06：超 60 亿（2023 年约 2 亿，见第 2 节） | TechCrunch 引 Altman；Simon Willison 现场笔记 | 二手 |
| OpenAI 折算每天 | 60 亿 × 1440 = 8.64 万亿 | 推算 | 推算 |
| ChatGPT 周活 | 2025-10：8 亿以上；2026-02-27：9 亿 | TechCrunch 引 OpenAI | 二手 |
| ChatGPT 每天提示数 | 25 亿（2025-07-21，OpenAI 告诉 Axios） | TechCrunch | 二手 |
| Microsoft Foundry | 2025 年 1–3 月季度：超 100 万亿 token（同比 5 倍），其中 3 月单月 50 万亿；FY25（至 2025-06）：超 500 万亿（同比超 7 倍） | Microsoft 财报逐字稿（Nadella） | 已核实（一手），Microsoft 自报 |
| Microsoft 之后改报客户数 | 超 250 家（2026-01）→ 超 300 家（2026-04）“有望今年处理超 1 万亿 token”；2026-07：万亿年化客户 4 倍同比 | 同上 | 已核实（一手） |
| OpenRouter | a16z×OpenRouter 研究：分析 100 万亿+ token；研究发布前一周每天超 1 万亿；编程占比从约 11%（2025 初）到超 50% | a16z.com/state-of-ai；openrouter.ai/state-of-ai | 已核实（一手） |
| OpenRouter 2026 周量 | 全球 27 万亿（2026-03-30～04-05）；中国模型 12.96 万亿 | CEIBS 杨威专栏引 OpenRouter | 二手 |
| 豆包日均 tokens | 2024-05：1200 亿 → 2024-09：1.3 万亿 → 2025-09 底：30 万亿 → 2026-03：120 万亿 → 2026-06：180 万亿（两年 1500 倍） | 火山引擎发布会，经新华社、第一财经、财联社等 | 二手（多家一致） |
| 国家数据局：全国日均 Token | 2024 年初 1000 亿 → 2025-06 底 30 万亿 → 2025 年底 100 万亿 → 2026-03 超 140 万亿 | 新华社转述国新办发布会，刘烈宏 | 二手（新华社） |
| 红楼梦字数 | 120 回 724,619 个汉字（我用 Project Gutenberg #24264 全文自数） | 自数，见第 7 节 | 推算（自测） |
| DeepSeek 官方折算 | 1 个中文字符 ≈ 0.6 token；1 个英文字符 ≈ 0.3 token | api-docs.deepseek.com | 已核实（一手） |
| OpenAI 官方折算 | 1 token ≈ 4 个英文字符 ≈ 0.75 个英文单词 | developers.openai.com | 已核实（一手） |
| 豆包 2026-06 一天 ≈ 红楼梦几部 | 约 4.1 亿部/天，约 4800 部/秒 | 180 万亿 ÷（72.5 万字 × 0.6） | 推算 |
| Google 2026-05 月处理量折算 | 约 103 万亿/天；约 2.4 亿部红楼梦/天；约 42.6 亿本《战争与和平》/月 | 3.2×10¹⁵ ÷ 31 天 ÷ 每部 token | 推算 |

---

## 1. Google

### 1a. 每月处理 token（across our surfaces）

| 日期 | 数值（每月） | 口径 | 来源 URL | 强度 |
|---|---|---|---|---|
| 2024-05 | 9.7 万亿 | “across our products and APIs”（2025 年 I/O 原文）；I/O 2026 图表标 May ’24 | https://blog.google/technology/ai/io-2025-keynote/（2025-05-20）；https://blog.google/innovation-and-ai/sundar-pichai-io-2026/（2026-05-19） | 已核实（一手），Google 自报 |
| 2025-05-20 | 超 480 万亿（50 倍） | 同上 | https://blog.google/technology/ai/io-2025-keynote/ | 已核实（一手） |
| 2025-07-23 | 超 980 万亿 | “across all our surfaces”；Q2 2025 财报当天博客 | https://blog.google/inside-google/message-ceo/alphabet-earnings-q2-2025/ | 已核实（一手） |
| 2025-10-09 公布 / 2025-10-29 财报重申 | 超 1.3 千万亿（1.3 quadrillion），“一年增长超 20 倍” | “monthly tokens processed across our surfaces” | https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/gemini-enterprise-sundar-pichai/（2025-10-09）；Alphabet Q3 2025 逐字稿 https://s206.q4cdn.com/479360582/files/doc_events/2025/Oct/29/2025_Q3_Earnings_Transcript.pdf | 已核实（一手） |
| 2026-05-19 | 超 3.2 千万亿（3.2 quadrillion），同比 7 倍 | “per month”，I/O 2026 主题演讲 | https://blog.google/innovation-and-ai/sundar-pichai-io-2026/ | 已核实（一手） |

原文摘录（均不超过 25 词）：
- I/O 2025（2025-05-20）：“This time last year, we were processing 9.7 trillion tokens a month across our products and APIs.” / “Now, we’re processing over 480 trillion — that’s 50 times more.”
- Q2 2025（2025-07-23）：“Since then we have doubled that number, now processing over 980 trillion monthly tokens, a remarkable increase.”
- Q3 2025 财报逐字稿（2025-10-29）：“In July, we announced that we processed 980 trillion monthly tokens across all our surfaces. We are now processing over 1.3 quadrillion monthly tokens”
- I/O 2026（2026-05-19）：“Two years ago, we were processing 9.7 trillion tokens a month across our surfaces.” / “Fast forward to today, that number jumped 7x to over 3.2 quadrillion per month.” 文中折线图标题 “Monthly Tokens Processed Across our surfaces”，起点 9.7T（May ’24），终点 3.2Q+（May ’26）。

**重要发现：Google 在 2025 年 Q3 之后的财报电话会上不再报“每月总量”**。我下载并逐字检索了 Alphabet 2025 Q4（2026-02-04）、2026 Q1（2026-04-29）、2026 Q2（2026-07-22）三份逐字稿，里面没有任何“quadrillion”或每月 token 总量；Q4 起改报“API 每分钟 token”。2026 年唯一的月总量更新来自 2026-05-19 的 I/O 主题演讲。

**日期冲突说明**：虎嗅（2026-03-24）写 9.7 万亿是“2024 年 4 月”；Google 自己的原文是“this time last year”（2025 I/O，即 2024 年 5 月）和图表 May ’24。以 Google 原文为准，写 2024-05。
**媒体错误提醒**：爱范儿（2025-10-16）写“Google 每月消耗约 130 万亿 token”，应为 1.3 千万亿 = 1300 万亿，差 10 倍。不要引用该文。

截至 2026-10-22 我没有取得 Alphabet 2026 Q3 电话会内容（上一年 Q3 电话会在 2025-10-29）。上片前建议再查一次，若 Q3 2026 有新数字可作为最新点。

### 1b. 模型 API 每分钟 token（第一方模型，客户直接 API 调用）

| 日期 | 数值（每分钟） | 折算每天（推算，×1440） | 来源 URL | 强度 |
|---|---|---|---|---|
| 2025-10-29（Q3 2025 电话会） | 70 亿 | 10.1 万亿 | Q3 2025 逐字稿（URL 同上） | 已核实（一手） |
| 2026-02-04（Q4 2025） | 超 100 亿（“up from 7 billion last quarter”） | 14.4 万亿 | https://s206.q4cdn.com/479360582/files/doc_events/2026/Feb/04/2025_Q4_Earnings_Transcript.pdf ；https://blog.google/inside-google/message-ceo/alphabet-earnings-q4-2025/ | 已核实（一手） |
| 2026-04-29（Q1 2026） | 超 160 亿（“up from 10 billion last quarter”） | 23.0 万亿 | https://s206.q4cdn.com/479360582/files/doc_events/2026/Apr/29/2026_Q1_Earnings_Transcript.pdf | 已核实（一手） |
| 2026-05-19（I/O 2026） | 约 190 亿（“model APIs”） | 27.4 万亿 | https://blog.google/innovation-and-ai/sundar-pichai-io-2026/ | 已核实（一手） |
| 2026-07-22（Q2 2026） | 约 220 亿（“up from 16 billion just a quarter ago”） | 31.7 万亿 | https://s206.q4cdn.com/479360582/files/doc_events/2026/Jul/22/2026_Q2_Earnings_Transcript.pdf | 已核实（一手） |

摘录：
- Q3 2025：“Our first party models, like Gemini, now process seven billion tokens per minute, via direct API use by our customers.”
- Q4 2025：“Our first-party models, like Gemini, now process over 10 billion tokens per m[inute]”（逐字稿 PDF；博客同句，写明“up from 7 billion last quarter”）。
- Q1 2026：“Our first party models now process more than 16 billion tokens per minute via direct API use by our customers, up from 10 billion last quarter.”
- I/O 2026：“Our model APIs are now processing roughly 19 billion tokens per minute.”
- Q2 2026：“Our model APIs are now processing approximately 22 billion tokens per minute.”

折算每天的前提是全天保持同一速率，只是数量级参考，标推算。注意：“每分钟”口径（仅 API）比“每月”口径（全产品面）窄得多。同期 2026-05 的月总量折合约 103 万亿/天，对比 API 190 亿/分钟折合 27.4 万亿/天，说明 API 只占总量的约四分之一量级（两个数字时点相同，但口径不同，仅作量级提示）。

### 1c. 其他 Google 相关数字（均为 Google 自报，一手）

| 日期 | 内容 | 来源 | 强度 |
|---|---|---|---|
| 2025-10-29 | 过去 12 个月，近 150 家 Google Cloud 客户各处理约 1 万亿 token | Q3 2025 逐字稿 | 已核实（一手） |
| 2026-02-04 | “In December alone, nearly 350 customers each processed more than 100 billion tokens.” | Q4 2025 逐字稿 | 已核实（一手） |
| 2026-04-29 | 过去 12 个月，330 家客户各处理超 1 万亿 token，35 家到达 10 万亿 | Q1 2026 逐字稿 | 已核实（一手） |
| 2026-05-19 | “Over the past 12 months, over 375 Google Cloud customers each processed more than one trillion tokens.” | I/O 2026 博客 | 已核实（一手） |
| 2026-07-22 | 近 500 家客户各处理超 1 万亿；过去 12 个月超 2000 家企业消耗超 1000 亿 | Q2 2026 逐字稿 | 已核实（一手） |
| 2026-03 → 2026-05 | “In March we were processing half a trillion tokens a day internally across our AI developer tools.” / “Now, we’re processing more than three trillion tokens a day.” | I/O 2026 博客 | 已核实（一手） |

I/O 2026 博客还写了一句“top companies are processing about 1 trillion tokens a day”，我只读到摘要句，上下文没完全确认，不建议上屏。

Cloud Next 2026（2026-04）：没有找到 Kurian 主题演讲里的明确 token 数字。网上有说 Pichai 同期博客写了“16 billion”，我只在聚合页看到，不采用。

---

## 2. OpenAI

| 日期 | 数值 | 口径 | 来源 URL | 强度 |
|---|---|---|---|---|
| 2023（DevDay 2023，Altman 回顾对照） | 约 2 亿 token/分钟 | API | https://simonwillison.net/2025/Oct/6/openai-devday-live-blog/（Simon Willison 现场笔记：“200m tokens/minute in the API”） | 二手（非逐字稿；2023 的精确日期没有核实） |
| 2025-10-06（DevDay 2025） | 超 60 亿 token/分钟 | API 平台 | https://techcrunch.com/2025/10/06/sam-altman-says-chatgpt-has-hit-800m-weekly-active-users/ ；Simon Willison 笔记“6b tokens/minute through the API” | 二手（TechCrunch 引 Altman），OpenAI 自报 |
| 2025-10 折算每天 | 8.64 万亿 | 60 亿 × 1440 | a16z 研究页另写“OpenAI’s entire API averaged about 8.6 trillion tokens per day in October”（https://a16z.com/state-of-ai/，a16z 为第三方转引） | 推算；与 a16z 一致 |
| 2026-04（Azeem Azhar 笔记） | 150 亿 token/分钟（15 billion，约 2025-10 的 2.5 倍），折算每天 21.6 万亿（推算） | API | https://substack.com/@exponentialview/note/c-239157898（2026-04-06 Substack 笔记，未给原始出处） | 未核实 |

- TechCrunch 引语：“More than 800 million people use ChatGPT every week, and we process over 6 billion tokens per minute on the API.”（2025-10-06）
- OpenAI 官方页面（openai.com/devday、openai.com/news）对我的抓取返回 403，所以没有读到一手页面。要上片的话请人工打开 DevDay 2025 官方页（它列出“6B tokens per minute on the API platform”据搜索摘要），截图核对。
- 2026 年没有找到任何 OpenAI 官方的 token/分钟更新。开发者博客（developers.openai.com/blog）列出的 32 篇文章标题里没有用量里程碑。

### ChatGPT 使用量（OpenAI 自报）

| 日期 | 数值 | 来源 URL | 强度 |
|---|---|---|---|
| 2025-07-21 | 每天 25 亿条提示（其中约 3.3 亿来自美国）：“ChatGPT receives 2.5 billion prompts from global users every day, OpenAI told Axios.” | https://techcrunch.com/2025/07/21/chatgpt-users-send-2-5-billion-prompts-a-day/ | 二手（TechCrunch 转 Axios） |
| 2025-10-06 | 周活 8 亿以上；开发者 400 万 | TechCrunch 同上 | 二手 |
| 2026-02-27 | 周活 9 亿，付费订阅 5000 万 | https://techcrunch.com/2026/02/27/chatgpt-reaches-900m-weekly-active-users | 二手 |
| 2025-07（NBER 论文） | “每周 180 亿条消息”只来自搜索摘要，原论文我没读到 | — | 未核实 |

---

## 3. Microsoft（Foundry，Nadella 在财报电话会上的原话）

数据来自 Microsoft 逐字稿 docx（Microsoft 官方 CDN，我下载后逐句检索）。下表“…/”均指 https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/ ；短链 aka.ms/transcriptfy25q3、aka.ms/transcriptfy26q3、aka.ms/transcriptfy26q4 也可打开。

| 日期（电话会） | 原话（≤25 词） | 口径 | 来源 URL | 强度 |
|---|---|---|---|---|
| 2025-04-30（FY25 Q3） | “We processed over 100 trillion tokens this quarter, up 5X year-over-year – including a record 50 trillion tokens last month alone.” | Foundry，2025 年 1–3 月季度 | https://www.microsoft.com/en-us/investor/events/fy-2025/earnings-fy-2025-q3.aspx ；逐字稿 https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptFY25Q3 | 已核实（一手），Microsoft 自报 |
| 2025-07-30（FY25 Q4） | “…just the number of tokens served by Foundry APIs, we processed over 500 trillion this year, up over 7X.” | Foundry API，FY25（2024-07～2025-06） | 逐字稿 https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/TranscriptQandAFY25q4.docx | 已核实（一手） |
| 2025-10-29（FY26 Q1） | 没有总量，只说 GPT-4.1、GPT-5 每 GPU 的 token 吞吐提升超 30% | — | …/TranscriptFY26Q1 | 已核实（一手；无总量） |
| 2026-01-28（FY26 Q2） | “over 250 customers are on track to process over one trillion tokens on Foundry this year.” | 客户数 | …/TranscriptQandAFY26q2 | 已核实（一手） |
| 2026-04-29（FY26 Q3） | “over 300 customers are on track to process over one trillion tokens on Foundry this year, accelerating 30% quarter-over-quarter.” | 客户数 | https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3.aspx ；…/TranscriptQandAFY26Q3 | 已核实（一手） |
| 2026-07-29（FY26 Q4） | “the number of Foundry customers at a one trillion token annualized run rate increased 4X year-over-year.” | 客户数 | https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4.aspx ；…/TranscriptFY26Q4 | 已核实（一手） |

**发现**：Microsoft 在 2025 年 7 月之后不再披露总 token 数，改为披露“万亿 token 客户数”。FY25 的 500 万亿折合约 1.37 万亿/天（推算：500÷365），比 Google、豆包小两个数量级，因为它只算 Foundry API。

折算（推算）：100 万亿 ÷ 90 天 ≈ 1.11 万亿/天；3 月 50 万亿 ÷ 31 天 ≈ 1.61 万亿/天。

---

## 4. OpenRouter

| 日期 | 数值 | 口径 | 来源 URL | 强度 |
|---|---|---|---|---|
| 2025-12-04 | 研究分析 100 万亿+ token（13 个月，至 2025-11） | 研究样本，非月度总量 | https://a16z.com/state-of-ai/ ；https://openrouter.ai/state-of-ai | 已核实（一手） |
| 2025-12-04 前一周 | “processed more than 1 trillion tokens every single day” | OpenRouter 平台日量 | https://a16z.com/state-of-ai/（读取摘要句，非整页逐字） | 已核实（一手），第三方研究 |
| 2025 全年趋势 | 平台“from handling roughly 10 trillion tokens per year to more than 100 trillion as of mid-2025” | 年度量级 | 同上 | 已核实（一手） |
| 2025-11 前后 | 编程类“roughly 11% of total token volume in early 2025 and exceeded 50% in recent weeks” | 占比 | https://openrouter.ai/state-of-ai | 已核实（一手） |
| 2025-11 前后 | 推理模型占比“negligible slice… now exceeds fifty percent” | 占比 | 同上 | 已核实（一手） |
| 2026-03 第三周 | 全球总调用量 20.4 万亿 token；中国 7.359 万亿（36%） | 周量 | 爱范儿 2026-04-02 引 OpenRouter：https://www.ifanr.com/1660703 | 二手 |
| 2026-03-30～04-05 | 全球 27 万亿，中国模型 12.96 万亿（约 48%） | 周量 | CEIBS 杨威专栏 2026-04-16 引 OpenRouter：https://www.ceibs.edu/new-papers-columns/28826 | 二手 |
| 2026-04 前后 | “OpenRouter processes about three trillion tokens daily” | 日量 | 同上 | 二手 |

要点与缺口：
- openrouter.ai/rankings 页面写着“Usage data through Oct 21, 2026”，但数字由前端图表渲染，我的抓取读不到。
- OpenRouter 有公开数据接口（需要 API key）：`GET /api/v1/datasets/rankings-daily` 返回每日每模型 total_tokens，数据从 2025-01-01 起；协议 CC BY 4.0；引用格式“Source: OpenRouter (openrouter.ai/rankings), as of <meta.as_of>”。文档：https://openrouter.ai/docs/cookbook/administration/data-api 。**建议主线程注册一个 key 自己拉一条 2025-01-01 至今的周总量曲线，比转述的媒体数字强得多，也是真正一手。**
- 两个 2026 周量（20.4、27 万亿）是不同周，也可能口径略有差别，不要连成同一条曲线。

---

## 5. 字节跳动 火山引擎 / 豆包大模型 日均 token

说明：下面“来源”是我读到的媒体页，转述的是火山引擎发布会上谭待（火山引擎总裁）的发言/公布数据。火山引擎官网新闻页只列到 2025-10-15，没有找到更早的官方原页，所以全部按二手标。

| 日期（数据口径时点 / 公布日） | 数值（日均） | 原文（≤25 字） | 来源 URL | 强度 |
|---|---|---|---|---|
| 2024-05（发布，2024-05-15） | 约 1200 亿 | 谭待：“2024年5月1200亿tokens”（2025-10 发布会回顾） | 第一财经 2025-10-16 https://www.yicai.com/news/102866248.html ；界面新闻 2026-04-02 https://www.jiemian.com/article/14203212.html | 二手（第一财经、界面新闻） |
| 2024-07 | 超 5000 亿 | “截至 2024 年 7 月，豆包大模型日均 Tokens 使用量超过 5000 亿” | 爱范儿 2024-08-21 https://www.ifanr.com/dasheng/1597126.md | 二手（爱范儿） |
| 2024-09（2024-09-24 深圳站） | 超 1.3 万亿 | “截至今年9月，豆包大模型日均Tokens使用量超过1.3万亿” | 财联社 2024-09-24 https://www.cls.cn/detail/1808154 | 二手（财联社） |
| 2024-12 | “超 4 万亿”（题设已知点） | 本次没读到页面 | — | 未核实；另有海通国际称“2024 年底 2 万亿”，两者矛盾（见下） |
| 2025-03 | “12.7 万亿”（题设已知点） | 没读到页面 | — | 未核实 |
| 2025-05 底 | “16.4 万亿”（题设已知点） | 没读到页面 | — | 未核实；见交叉印证 |
| 2025-09 底（2025-10-16 发布） | 超 30 万亿，较 5 月底增长超 80% | “截至 2025 年 9 月底，豆包大模型日均 Tokens 调用量已突破 30 万亿，相比今年 5 月底增长超 80%” | IT之家 https://www.ithome.com/0/889/985.htm ；第一财经 https://www.yicai.com/news/102866248.html ；数据猿 https://datayuan.substack.com/p/tokens30 | 二手（三家一致） |
| 2025-12 / 2026-01 | 约 60 万亿（63 万亿） | 爱范儿：“三个月前，这个数字是 60 万亿”；新华社：“在过去三个月内增长一倍”；海通国际：“2026年1月的63万亿” | https://www.ifanr.com/1660703 ；https://www.news.cn/tech/20260403/c4f28c9bcccd4ed98456c07122f03a0b/c.html ；https://finance.sina.com.cn/stock/marketresearch/2026-02-13/doc-inhmscxc8828097.shtml | 未核实（60 万亿由 120 万亿“增长一倍”倒推，新华社没给绝对值；海通口径不明） |
| 2026-03（2026-04-02 公布） | 超 120 万亿，三个月翻倍，较发布时 1000 倍 | “豆包大模型日均Token（词元）调用量已于今年3月突破120万亿，在过去三个月内增长一倍” | 新华社/科技日报 2026-04-03 https://www.news.cn/tech/20260403/c4f28c9bcccd4ed98456c07122f03a0b/c.html ；界面新闻 2026-04-02 ；China Daily 2026-04-02 https://www.chinadaily.com.cn/a/202604/02/WS69ce3326a310d6866eb41733.html | 二手（新华社等四家一致） |
| 2026-06（2026-06-23 FORCE 原动力大会） | 超 180 万亿，两年 1500 倍，去年一年增长超 10 倍 | “豆包大模型日均Tokens(词元)使用量现已突破180万亿，相较2024年5月1200亿的初始规模，两年间涨幅达1500倍” | 同花顺/财联社 https://news.10jqka.com.cn/20260623/c677639006.shtml ；中国基金报 https://www.chnfund.com/article/AR06f805eb-d264-a3ca-81d5-3a2205a8a4e4 ；IT之家 2026-06-26 https://www.ithome.com/0/968/809.htm | 二手（四家一致） |

交叉印证（推算）：
- 1200 亿 × 253 = 30.36 万亿，与“253 倍至 30 万亿”一致（第一财经）。
- 180 万亿 ÷ 1200 亿 = 1500，与“1500 倍”一致；120 万亿 ÷ 1200 亿 = 1000，与“1000 倍”一致。
- 30 万亿 ÷ 1.8 = 16.7 万亿，说明 2025-05 底 ≤ 16.7 万亿，与题设 16.4 万亿不矛盾；2026-06“一年增长超 10 倍”→ 2025-06 约 ≤ 18 万亿，同样不矛盾。这只是自洽检查，不能替代原文，所以 16.4 万亿仍标未核实。
- 2024-12 的 4 万亿与 2024-05 的 1200 亿之间若是 33 倍，则 1200 亿 × 33 ≈ 4 万亿，自洽；但我没读到页面，且海通国际写“2024 年底 2 万亿”。两者口径可能不同（“使用量”与“调用量”，或不同日期），**不要用 2024-12 这个点**，直到读到火山引擎 2024-12 大会原文。
- 财联社提醒：2024-05 的 1200 亿是“调用量”，2024-09 的 1.3 万亿是“Tokens 使用量”，两者口径不同，所以“10 倍”不能直接当作 token 增速。上片时从 2025-09 起的序列更稳（口径都是“日均 Tokens 调用量/使用量”）。

其他火山引擎自报数字：
- 累计 Token 超 1 万亿的企业：2025 年底 100 家 → 2026-03 140 家（新华社 2026-04-03，二手）。
- IDC 公有云大模型市场份额：火山引擎 49.2%（2025 上半年，第一财经 2025-10-16 引 IDC 9 月报告）；49.5%（2026-06 发布会，火山引擎披露）。属自报转引，不要当独立数据。
- 驱动因素：谭待称“AI 视频创作的爆发与 AI 智能体的加速普及”（新华社 2026-04-03）。

---

## 6. 中国全国口径与其他

### 6a. 国家数据局（刘烈宏）

| 日期 | 数值（全国日均） | 原话 | 场合 | 来源 URL | 强度 |
|---|---|---|---|---|---|
| 2024 年初 | 1000 亿 | “2024年初，我国日均Token的消耗量为1千亿” | 2025-08-14 国新办“高质量完成‘十四五’规划”系列发布会 | 新华网转载《人民邮电报》 https://www.news.cn/info/20250814/bc764f22819c4087bfc5939cfedc7f49/c.html ；IT之家 https://www.ithome.com/0/875/414.htm | 二手（新华网） |
| 2025-06 底 | 超 30 万亿（1 年半增长 300 多倍） | “截至今年6月底，日均Token消耗量已经突破30万亿，1年半时间增长了300多倍” | 同上 | 同上 | 二手（新华网） |
| 2025 年底 | 100 万亿 | “相比2025年底的100万亿，三个月时间又增长了40%多” | 2026-03-24 国新办发布会（新华社北京 3 月 24 日电） | https://www.news.cn/tech/20260324/050774b26bc54f429fce2d21e284949a/c.html | 二手（新华社） |
| 2026-03 | 超 140 万亿（较 2024 年初 1000 亿增长 1000 多倍） | “到今年3月，我国日均词元（Token）调用量已超过140万亿” | 同上；同一表述中文名定为“词元” | 同上；中新社 https://cj.sina.com.cn/articles/view/1784473157/6a5ce64502003hmii | 二手（新华社、中新社） |

注意：
- **场合有出入**：多数财经媒体（含中新社）把 140 万亿说成 2026-03-23“中国发展高层论坛 2026 年年会”期间的讲话，新华社写的是 2026-03-24 国新办发布会。建议片中只写“国家数据局局长刘烈宏，2026 年 3 月”，不写具体场合。
- 国家统计局副局长毛盛勇 2026-04 与中国信通院副院长魏亮（央视财经预告，2026-07-18 IT之家转引）重复了 140 万亿，都是同一个数字，不是新数据。截至 2026-10-22，我没有找到比 2026-03 更新的官方全国数字。国家数据局官网首页（nda.gov.cn，抓到 2026-10-21 的条目）没有 token 相关新闻。
- Pebblous 报告（2026-07）提醒：没有一手来源定义这个总量到底包含训练、推理还是 Agent 流量；并指出 140 万亿如果按“较 2024 年初 1000 亿”精确计算是 1400 倍，官方说“千倍以上”。

### 6b. 口径对不上的全国/企业数字（别用，或要带大幅警告）

| 日期 | 数值 | 来源 | 强度 / 原因 |
|---|---|---|---|
| 2026-02 | 全国“主流大模型合计日均 180 万亿级别” | 海通国际研报 2026-02-12，新浪财经 https://finance.sina.com.cn/stock/marketresearch/2026-02-13/doc-inhmscxc8828097.shtml | 未核实：高于国家数据局 3 月的 140 万亿，口径不明 |
| 2026-03-19 | 华为李鹏：“中国日均token消耗量已跃升至180万亿” | 虎嗅 2026-03-24 转述 https://www.huxiu.com/article/4845041.html | 未核实：与国家数据局数字冲突，虎嗅自己也注明测算口径不同 |
| 2025 H1 / H2 | 企业平均日均 token：H1 10.2 万亿，H2 37.0 万亿（+263%） | Frost & Sullivan × 头豹，2026-02-13，https://www.frostchina.com/content/insight/detail/698f2db65971ce70d9c73d07 | 二手：调研机构，样本为 870 份企业问卷，不是平台实测 |
| 2025 H1 | 中国公有云大模型调用量 536.7 万亿 tokens（半年） | 第一财经 2025-10-16 引 IDC 9 月报告 | 二手：折算约 3 万亿/天（推算：536.7 万亿 ÷ 181 天），与国家数据局同期 30 万亿/天差 10 倍，说明口径差异巨大 |

### 6c. 阿里等

- 阿里云外部客户 2025 年日均 token 调用“接近 5 万亿”，2026 年目标 15–20 万亿：海通国际研报转述（新浪财经 2026-02-13），**二手，且没有阿里官方原话**，我没找到阿里财报/云栖大会的官方日均数字。归未核实。
- 百度、腾讯：没有找到官方日均数字（Fortune 2026-04-12 明确写“未披露”）。

---

## 7. token → 书：换算（每个假设都写来源）

### 7a. 折算系数

| 编号 | 假设 | 来源 | 强度 |
|---|---|---|---|
| A1 | DeepSeek：“1 English character ≈ 0.3 token.” / “1 Chinese character ≈ 0.6 token.” 并注明不同模型分词不同，实际以返回的 usage 为准 | https://api-docs.deepseek.com/quick_start/token_usage | 已核实（一手） |
| A2 | OpenAI：“As a rough rule of thumb, 1 token is approximately 4 characters or 0.75 words for English text.” | https://developers.openai.com/api/docs/concepts | 已核实（一手） |
| A3 | 火山/豆包没有找到官方“每字多少 token”。财新 2024-05-15 标题称“花1元可处理200万汉字”（https://www.caixin.com/2024-05-15/102196499.html，付费墙，只读到标题）。若 1 元对应 125 万 token（按我记忆里的 0.0008 元/千 token，未核实），则约 1.6 字/token ≈ 0.625 token/字，与 DeepSeek 的 0.6 接近 | 财新标题（二手）；价格未核实 | 未核实，仅作旁证，不要上屏 |
| A4 | 《红楼梦》120 回，724,619 个汉字（见 7b） | 自数 | 推算（自测） |
| A5 | 《战争与和平》约 56.3 万词（见 7b） | 自数 | 推算（自测） |
| A6 | 不同版本、不同分词器误差：我用 0.6 token/字为主，给出 0.5–1.0 的敏感区间 | — | 假设 |

### 7b. 两部书的字数

**《红楼梦》**
- 我下载了 Project Gutenberg eBook #24264《紅樓夢》（曹雪芹，繁体，录入 Wei-yi Kao，发布 2008-01-12，https://www.gutenberg.org/ebooks/24264），确认含第一回至第一二零回，用正则统计 CJK 汉字：**724,619 字**（含回目标题；不含标点）。标点另有 10 万个以上（不计入）。
- 流行说法“约 73 万字”：与我的自数（72.5 万）吻合，但我没找到权威出处（豆瓣页“人民文学出版社 1982-3 版”只有页数 1606、没有字数；维基中文页没有字数），所以“73 万”标未核实，不要写成“人民文学出版社版 73 万字”。
- 版本提醒：Gutenberg 这份是 120 回通行本文本；人民文学出版社版以庚辰本为底本（前 80 回）并参校他本，字数会有小幅差异，量级不变。

**《战争与和平》**
- 我下载了 Project Gutenberg #2600（Louise & Aylmer Maude 英译，https://www.gutenberg.org/ebooks/2600），去掉 Gutenberg 头尾后：空格分词 563,286 词；按字母数字串切分 575,638 词。常见说法“约 587,287 词”我没读到出处，标未核实。后面用 563,286 词（偏保守）。
- 每本折 token：563,286 ÷ 0.75 = 751,048 token（A2）。

### 7c. 每部书折多少 token（推算）

- 《红楼梦》：724,619 字 × 0.6 token/字 = **434,771 token**（约 43.5 万）。用 73 万字则 438,000，差别不到 1%。
- 《战争与和平》：563,286 词 ÷ 0.75 = **751,048 token**（约 75 万）。

### 7d. 豆包（最新：2026-06，日均 180 万亿）

算式（推算）：
- 180 万亿 = 1.8 × 10¹⁴ token/天。
- 1.8 × 10¹⁴ ÷ 434,771 = 4.14 × 10⁸ 部/天，即 **约 4.1 亿部《红楼梦》每天**。
- 每秒：4.14 × 10⁸ ÷ 86,400 ≈ **4,792 部/秒**（也就是每秒约 20.8 亿 token：1.8 × 10¹⁴ ÷ 86,400）。
- 敏感区间：0.5 token/字 → 4.97 亿部/天；0.6 → 4.14 亿；1.0（极保守，等于一字一 token）→ 2.48 亿部/天。写片时说“**2.5 到 5 亿部**”或“约 4 亿部”都站得住。
- 2026-03 的 120 万亿：1.2 × 10¹⁴ ÷ 434,771 = 2.76 亿部/天。
- 增长对照：2024-05 的 1200 亿 ÷ 434,771 ≈ 27.6 万部/天。两年间从 27.6 万部到 4.1 亿部（即 1500 倍）。

### 7e. Google（最新月量：2026-05，3.2 千万亿/月）

- 3.2 quadrillion = 3.2 × 10¹⁵ token/月。
- 每天：3.2 × 10¹⁵ ÷ 31 = 1.03 × 10¹⁴ token/天（≈ 103 万亿/天；若按 30 天平均则 106.7 万亿/天）。
- 折《红楼梦》：1.03 × 10¹⁴ ÷ 434,771 = 2.37 亿部/天；整月 3.2 × 10¹⁵ ÷ 434,771 = 73.6 亿部/月。
- 折英文：3.2 × 10¹⁵ token × 0.75 词/token = 2.4 × 10¹⁵ 词/月；÷ 563,286 词 = 4.26 × 10⁹，即 **约 42.6 亿本《战争与和平》每月**（约 1.37 亿本/天）。
- 只算 API（2026-07，220 亿/分钟）：2.2 × 10¹⁰ × 1440 = 3.17 × 10¹³ token/天 ÷ 434,771 = 约 7,290 万部红楼梦/天。
- 警告：Google 的 token 含多模态、推理（thinking）等，不是纯“读过的文字”，英文系数（0.75 词/token）只适用英文文本。所以“相当于”是体量类比，不是“AI 读了这么多书”。

**对比（推算，口径不同）**：豆包 180 万亿/天（2026-06）比 Google 全产品面月量折日均 103 万亿/天（2026-05）大，约 1.7 倍；但豆包是火山引擎自报的“使用量”，Google 是全产品面，两者口径、时点都不同，片中不要做“谁更多”的结论。

### 7f. 人类阅读对照（可选，这一项来源不足）

- 我没有读到可引用的中文成人阅读速度权威来源。维基“Words per minute”页只给了 17 种语言朗读的平均（184±29 词/分钟或 863±234 字符/分钟，Trauzettel-Klosinski & Dietz 2012），并说汉字等文字的数字更低，没有给汉字值。维基“Speed reading”页写“normal reading for comprehension (around 200–230 wpm)”，页面本身对这句无引用。Brysbaert 2019（成人默读 238 词/分钟）我这边抓取被 403，没读到原文。
- 所以下面的算例只是**参数化演示**，速度取题设的 250 字/分钟，**来源未核实**，要上片须先补一个可引用的中文阅读速度出处。

算例（推算，250 字/分钟）：
- 一个人读一部《红楼梦》：724,619 ÷ 250 = 2,898 分钟 ≈ 48.3 小时，每天读 8 小时约 6 天。
- 豆包一天的量折成汉字：1.8 × 10¹⁴ ÷ 0.6 = 3.0 × 10¹⁴ 字。
- 一个人不眠不休一天读 250 × 60 × 24 = 36 万字。所以读完豆包一天的量需要 3.0 × 10¹⁴ ÷ 360,000 = 8.33 亿人·天，即 **约 8.3 亿人不眠不休读整整一天**；或者 8.33 亿 ÷（80 年 × 365 = 29,200 天）≈ **2.85 万个“从出生起不眠不休读到 80 岁”的人生**。
- 速度取 200 或 300 字/分钟时，分别是 3.57 万、2.38 万个人生。
- 警告：token 里包含大量输入、重复上下文、代码、工具返回，不是“新写出来的文字”，所以这是体量类比。

---

## 最适合上片的

1. **豆包日均 token：1200 亿（2024-05）→ 180 万亿（2026-06），两年 1500 倍。**
   同一家公司、同一发布会体系、连续披露，是最干净的一条曲线；1500 倍和 1000 倍两个“倍数”都能用原文反推核对。标“火山引擎自报”，来源写新华社/第一财经/财联社。建议曲线只用 2025-09（30 万亿）→ 2026-03（120 万亿）→ 2026-06（180 万亿）和 2024-05 起点，中间未核实的点不画。
2. **Google 每月 token：9.7 万亿（2024-05）→ 3.2 千万亿（2026-05）。**
   Google 自己做了这条图（I/O 2026 主题演讲博客，折线图 May ’24 到 May ’26），一手、可截图、有日期。写“Google 自报，2026-05-19”。注意不要和“每分钟”混用。
3. **国家数据局全国日均：1000 亿（2024 初）→ 30 万亿（2025-06）→ 100 万亿（2025 底）→ 140 万亿（2026-03）。**
   官方发言、新华社可引，适合做“国家尺度”收尾。必须配一句“口径未公开”，且别和豆包、Google 相加。
4. **“一秒”类比：豆包每秒约 4,800 部《红楼梦》。**
   最容易被观众感知（一个人读一部要 48 小时，豆包一秒读 4,800 部）。必须在屏上标“推算：180 万亿 ÷ 86,400 ÷（72.5 万字 × 0.6 token）”，并注明 0.6 token/字来自 DeepSeek 官方文档、字数为自数。给出区间 2.5–5 亿部/天更稳。
5. **Google 内部开发者工具：每天 0.5 万亿（2026-03）→ 超 3 万亿（2026-05）。**
   贴合本片主题（“最会用 AI 的人在干什么”：写代码、跑 Agent），一手原话，两个月 6 倍。
6. **OpenRouter×a16z：编程占 token 比例从约 11%（2025 初）到超 50%（近几周）。**
   一手研究页，直接回答“token 都花在了什么上”；100 万亿 token 的样本量也可写，但要标“只代表经 OpenRouter 的第三方流量”。
7. **“万亿 token 俱乐部”平行计数：Google 约 150 家（2025-10）→ 近 500 家（2026-07）；Microsoft 250 家（2026-01）→ 300 家（2026-04）；火山 100 家（2025 底）→ 140 家（2026-03）。**
   Google、Microsoft 一手逐字稿；火山为新华社转述。三家各用各的口径（Google 过去 12 个月、Microsoft“有望今年”、火山累计），要分开画，不要拼成一条线。
8. **Google 每分钟 API：70 亿（2025-10）→ 220 亿（2026-07）。**
   五个点都是一手逐字稿，适合做屏上“滴答计数器”（220 亿 ÷ 60 ≈ 每秒 3.67 亿 token）。必须标“仅 API，不含 Search 等”。

## 不要用

- **Google“2024 年 4 月 9.7 万亿”**（虎嗅写法）：Google 原文是 2024-05；以原文为准。
- **爱范儿“Google 每月消耗约 130 万亿”**：把 1.3 千万亿（1300 万亿）少写了一个数量级。
- **Google“43 万亿/天”**（虎嗅、Robonomics 引用）：是作者用 1.3 千万亿 ÷ 30 自己折的，不是披露值。需要日均时请用我们自己的推算并标注。
- **豆包 2024-12“4 万亿”、2025-03“12.7 万亿”、2025-05“16.4 万亿”**：题设已知点，我没有读到任何页面，与海通国际“2024 年底 2 万亿”矛盾，暂不上屏。
- **豆包 2025-12“60 万亿”**：只是由“三个月翻倍”倒推，新华社没给绝对数；海通 63 万亿口径不明。
- **全国 180 万亿**（海通 2026-02、华为李鹏 2026-03-19）：与国家数据局 2026-03 的 140 万亿冲突，口径不明。
- **阿里云日均“接近 5 万亿”**：只有券商研报转述，没有阿里官方原话。
- **OpenAI 2026-04“150 亿 token/分钟”**（Exponential View 笔记）：无原始出处。
- **OpenAI 2023 年“2 亿 token/分钟”与“30 倍”**：只来自 Simon Willison 的现场笔记，不是逐字稿，且 2023 的具体日期未核实。
- **ChatGPT“每周 180 亿条消息”（NBER）**：只有搜索摘要，原论文没读到。
- **豆包和 Google 谁更多、豆包占全国多少**：口径与时点都不同（Pebblous 估豆包 4 月占全国 3 月约 86% 属不同月份相比），不要做对比结论。
- **“人民文学出版社版 73 万字”这一表述**：没有出处。
- **读完整部《红楼梦》要几小时、几个人生**：中文阅读速度没有可引用来源，在补到出处前不要上屏。
- Frost & Sullivan 的企业日均 37 万亿（问卷调研）、IDC 的 536.7 万亿（H1 2025 公有云调用量）：口径特殊，容易和全国数字打架，不要放在同一张图里。

## 待补缺口（给主线程）

1. 火山引擎 2024-12（Force 冬季）、2025-03、2025-05/06（Force 夏季）、2025-12（Force 冬季）四个官方点：本次搜索额度用完（会话上限 200 次，被多个代理共用），没能读到页面。建议找 2025-06-11、2025-12-18 发布会的新华社/36氪/火山引擎公众号原文。
2. 国家数据局 2026-03 讲话的国新办官网实录（scio.gov.cn 的证书错误，我这边打不开），可补一手逐字稿。
3. 中文成人阅读速度可引用出处；《红楼梦》出版社字数。
4. OpenAI 2026 的官方 token/分钟数字；OpenAI DevDay 2025 官方页面截图。
5. Alphabet 2026 Q3 财报电话会（若已召开）。
6. OpenRouter 用 API key 自拉 2025-01-01 至今的周总量。
