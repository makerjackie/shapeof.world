# 发布文案：AI 的真实价格（v9）

## 标题

推荐（抖音、B站、视频号）：全球最聪明的 AI，比 DeepSeek 还便宜？

备选：
- 单价贵 17 倍的 AI，为什么反而最便宜
- 用 AI 最贵的不是 token，是你的时间
- YouTube：Is the smartest AI cheaper than DeepSeek? The real price of AI

封面：沿用已发布版的封面 A（"全球最聪明的 AI，比 DeepSeek 还便宜"，和开场第一帧同一句）。片内标题：AI 的真实价格。

## 简介

按 API 单价，全球智能指数第一的 Claude Opus 5.5 是 DeepSeek 的 17 倍。可大多数人不是按 token 付钱，而是包月；而且聪明的模型做同一道题，用的 token 更少。

这支片子把账拆开：
- 包月：¥1,344 的 Claude Max 20x，用满能用掉约 ¥4.8 万的 API 额度（实测中位数），36 倍，同价比 ChatGPT Pro 多 3–5 倍。平摊到单价约 ¥3.8，和 DeepSeek 闲时价差不多。中转站反而比自己包月贵 8 倍。
- 省 token：同一套考试，Opus 打出 4 行小票，DeepSeek V4 Pro 打出 33 行。单价贵 5 倍，总价反而更低。
- DeepSeek 这边：只按 API 算，最新的 V4.1 Flash 是真便宜，而且不是亏本卖。
- 两个原因叠在一起，最聪明的反而最便宜。
- 公式里还漏了最贵的一项：你的时间。AI 写完代码你要检查，没做对就返工、再查一遍；Opus 平均要查 1.6 次，做对一道题，你的时间占了账单的 82%。

但这只是今天的答案。同等能力的 AI 每年便宜约 13 倍，我们用得却越来越多，明年谁最便宜、谁最聪明都还不一定。不变的是：token 会越来越多，唯一不会变多的，是你的时间。最便宜的 AI，是最省你时间的那个。

结论有前提：订阅只对用得多的人划算；偶尔用，或者跑大批量、不用人看的 API 任务，按量付费的 DeepSeek 仍然更省。"每次检查 5 分钟"是本片的假设。美元价按 2026-10-22 汇率 6.7195 换成人民币。画面由代码逐帧生成。数据截至 2026 年 10 月 23 日。不构成购买建议。

#vibe知识大赏 @抖音科技

## 数据来源

价格（2026-10-22 复核）
- Claude API 定价（Opus 5.5 $4 / $20，Sonnet 5.5 $2 / $10，每百万 token）：https://platform.claude.com/docs/en/about-claude/pricing
- DeepSeek API 定价与更新日志（V4.1 Flash 输出高峰 ¥8、闲时五折；V4 Pro 输出 ¥27）：https://api-docs.deepseek.com/zh-cn/quick_start/pricing 、https://api-docs.deepseek.com/zh-cn/updates
- 其余模型：各家官方定价页（美元价），Kimi K3 按 OpenRouter 上的月之暗面官方端点。
- 汇率：2026-10-22 美元兑人民币中间价 6.7195，中国外汇交易中心。
- Claude Opus 5.5（max）为 Artificial Analysis 智能指数 v4.3 第 1 名（57.6）：https://artificialanalysis.ai/leaderboards/models

包月
- Max 计划说明（5x / 20x 指每 5 小时的额度，另有每周上限）：https://support.claude.com/en/articles/11049741-what-is-the-max-plan
- 实测：Max 20x 用满一个月按 API 原价值 $7,121（约 ¥4.8 万），17 个账号中位数：wokey.ai，2026-10。https://wokey.ai/claude-usage-limits
- 理论上限：Max 20x $11,726 / 月；ChatGPT Pro $200 $2,084（GPT-6.1 Sol）～ $2,897（GPT-6 Astra）：SemiAnalysis 2026-10-05，转引自 https://explainx.ai/blog/semianalysis-claude-vs-chatgpt-subscription-api-value-limit-testing-2026
- ChatGPT Pro $200 自 2026-09-29 起为 10× Plus（此前 20×）：见 https://winbuzzer.com/2026/09/30/openai-adds-500-chatgpt-pro-cuts-allowance-new-200-subscribers-a005-xcxwbn/
- 平摊单价：¥134.4 × $200 ÷ $7,121 ≈ ¥3.8（推算）。
- 中转站计费公式（官方价 × 分组倍率 × 充值汇率 ÷ 市场汇率）：开源项目 new-api 文档。"¥1 = $1、1.5 倍率"实付官方价的 22%，自己包月用满是 2.8%，约 8 倍（推算）。偷换模型的研究：arXiv 2504.04715。

省 token
- 跑完整套智能指数：Opus 5.5（low）输出约 2,000 万 token、$860（约 ¥5,781）、42 分；DeepSeek V4 Pro（max）约 1.63 亿 token、$1,122（约 ¥7,541）、36 分：Artificial Analysis 智能指数 v4.3，2026-10-22。
- 平均每道题花费：DeepSeek V4.1 Flash $0.26（约 ¥1.8，45 分），Claude Opus 5.5 默认档 $1.34（约 ¥9.0，51 分）：同上。

DeepSeek 的账本
- 理论成本利润率 545%（成本只算 $2 / 卡时租金）：DeepSeek 开源周 Day 6，2025-03-01。
- 单个集群每天 155 万亿 token（含缓存命中）：2026-10-20 DeepInfer 开源时披露，转引自投资界 https://news.pedaily.cn/202610/570589.shtml 。原始报告未能打开。
- 2026-08-17 起涨价 50%–1100% 并改为峰谷价：DeepSeek 更新日志。

叠在一起
- Opus 每题 ¥9.0 ÷ 36 ≈ ¥0.25；36 = Max 20x 用满时的实测倍数（wokey.ai）。

你的时间
- 一次做对的比例（pass@1）：Claude Code + Opus 5.5（max）61.7%，每次 $11.42：Artificial Analysis 编程智能体榜 v2.0，2026-10-22。https://artificialanalysis.ai/agents/coding-agents 平均检查次数 = 1 ÷ 61.7% ≈ 1.6（推算）。
- 每次检查按 5 分钟：本片假设，往少了算。
- 时薪约 ¥119：国家统计局《2025 年城镇单位就业人员年平均工资情况》，城镇非私营单位"信息传输、软件和信息技术服务业"248,752 元（2026-05-15），按人社部发〔2025〕2 号"小时工资 = 月工资 ÷（21.75 天 × 8 小时）"折算。https://www.stats.gov.cn/sj/zxfb/202605/t20260515_1963707.html
- 做对一道题：token 约 ¥3.5（按 Max 包月用满折算），你的时间约 ¥16（1.6 次 × 5 分钟 × ¥119），你的时间占 82%（推算）。

未来
- 同等能力的成本每年约降 13 倍：Epoch AI《The plunging price of thought》，2026-09-22。https://epoch.ai/publications/the-plunging-price-of-thought
- Google 每月处理 token：9.7 万亿（2024 年 5 月）→ 3,200 万亿以上（2026 年 5 月）：Google I/O 2026。https://blog.google/innovation-and-ai/sundar-pichai-io-2026/
- Claude Code 人均每活跃日花费约 $13（2025 年文档为 $6）：https://code.claude.com/docs/en/costs

## 配乐

《千年之后（氛围版）》，和乐府。来源：https://music.01mvp.com/ （标注"抖音授权：收藏者声明"）。授权以收藏者声明为准，未单独核实是否允许商用；音频不进 Git。

## 授权

代码按仓库的 AGPL-3.0-only，片中原创的文案和画面按 CC BY-NC 4.0；配乐、字体和数据按各自的许可。名称和标志不随代码授权。
