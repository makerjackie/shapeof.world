# 发布文案：AI 的真实价格（v6，约 2 分钟）

## 标题

推荐（抖音、B站、视频号）：全球最聪明的 AI，比 DeepSeek 还便宜？

备选：
- 单价贵 17 倍的 AI，为什么反而最便宜
- 付 $200，用掉 $7,121：AI 订阅的真实价格
- 最贵的 token，是你的时间（偏情绪，用片尾金句）
- YouTube：The smartest AI is the cheapest — the real price of AI tokens

片内标题：AI 的真实价格。

## 简介

按 API 单价，全球智能指数第一的 Claude Opus 5.5 是 DeepSeek 的 17 倍。可大多数人不是按 token 付钱，而是包月；而且聪明的模型做同一道题，用的 token 更少。

这支片子把账拆开：
- 包月：$200 的 Claude Max 20x，用满能用掉约 $7,121 的 API 额度（实测中位数），同价比 ChatGPT Pro 多 3–5 倍。
- 中转站：「¥1 = $1 · 1.5 倍率」的中转站，反而比自己包月用满贵 7.5 倍。
- 省 token：同一套考试，Opus 打出 4 行小票，DeepSeek V4 Pro 打出 33 行。
- 说句公道话：只按 API 算，最新的 DeepSeek V4.1 Flash 是真便宜。
- 两个原因叠在一起，最聪明的反而最便宜。
- 最后：公式里还漏了最贵的一项——你的时间。

结论有前提：订阅只对用得多的人划算；偶尔用、或者跑大批量 API 任务，按量付费的 DeepSeek 仍然更省。画面由代码逐帧生成。数据截至 2026 年 10 月 21 日。不构成购买建议。

## 数据来源

价格
- Claude API 定价（Opus 5.5 $4 / $20，Sonnet 5.5 $2 / $10，每百万 token）：https://platform.claude.com/docs/en/about-claude/pricing
- DeepSeek API 定价与更新日志（V4.1 Flash 高峰 $0.30 / $1.20，闲时五折；V4 Pro $1.32 / $3.96）：https://api-docs.deepseek.com/zh-cn/quick_start/pricing 、https://api-docs.deepseek.com/zh-cn/updates
- 其余模型：各家官方定价页，2026-10-21。
- Claude Opus 5.5（max）为 Artificial Analysis 智能指数 v4.3 第 1 名（57.6）：https://artificialanalysis.ai/leaderboards/models

01 包月
- Max 计划说明（5x / 20x 指每 5 小时的额度，另有每周上限）：https://support.claude.com/en/articles/11049741-what-is-the-max-plan
- 实测：Max 20x 用满一周 $1,643 API 等值，17 个账号中位数，×4.33 周 ≈ $7,121 / 月：wokey.ai，2026-10-12～19 周。https://wokey.ai/claude-usage-limits
- 理论上限：Max 20x $11,726 / 月；ChatGPT Pro $200 $2,084（GPT-6.1 Sol）～ $2,897（GPT-6 Astra）：SemiAnalysis 2026-10-05，转引自 https://explainx.ai/blog/semianalysis-claude-vs-chatgpt-subscription-api-value-limit-testing-2026
- ChatGPT Pro $200 自 2026-09-29 起为 10× Plus（此前 20×）：OpenAI Codex 负责人公开说明，见 https://winbuzzer.com/2026/09/30/openai-adds-500-chatgpt-pro-cuts-allowance-new-200-subscribers-a005-xcxwbn/
- 顶配模型（Fable 5.1 vs GPT-6 Astra）两家额度相当；2026 年 6 月时 ChatGPT Pro 曾多于 Claude Max：SemiAnalysis，转引自 GIGAZINE 2026-06-12。
- 中转站计费公式（官方价 × 分组倍率 × 充值汇率 ÷ 市场汇率）：开源项目 new-api 文档；汇率按 1 USD ≈ 7.2 CNY。偷换模型的研究：arXiv 2504.04715。

02 省 token
- 跑完整套智能指数：Opus 5.5（low）输出 2,000 万 token、花费 $860、42 分；DeepSeek V4 Pro（max）1.63 亿 token、$1,122、36 分（按今日官方价）：Artificial Analysis 智能指数 v4.3，2026-10-21。
- 平均每道题花费：DeepSeek V4.1 Flash $0.26（45 分），Claude Opus 5.5 默认档 $1.34（51 分）：同上。

叠在一起
- Opus 每题 $1.34 ÷ 36 ≈ $0.04；36 = Max 20x 用满时的实测倍数（wokey.ai）。

你的时间
- 写代码 Agent 解决一道题：Claude Code + Sonnet 5.5（high）每次 $1.24、通过率 55%，平均试 1.8 次：Artificial Analysis Coding Agent Index v1.5，2026-10-21。https://artificialanalysis.ai/agents/coding-agents
- 每次人工检查按 5 分钟、时薪 $100 估算（本片假设），得出 token $2.25、你的时间 $15.15。

## 配乐

《千年之后（氛围版）》，和乐府。来源：https://music.01mvp.com/ （标注"抖音授权：收藏者声明"）。授权以收藏者声明为准，未单独核实是否允许商用；音频不进 Git。

## 授权

代码按仓库的 AGPL-3.0-only，片中原创的文案和画面按 CC BY-NC 4.0；配乐、字体和数据按各自的许可。名称和标志不随代码授权。
