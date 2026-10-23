# 发布文案：AI 的真实价格（v8）

## 标题

推荐（抖音、B站、视频号）：全球最聪明的 AI，比 DeepSeek 还便宜？

备选：
- 单价贵 17 倍的 AI，为什么反而最便宜
- 用 AI 最贵的不是 token，是你的时间
- YouTube：Is the smartest AI cheaper than DeepSeek? The real price of AI

封面：沿用 v6 的封面 A（"全球最聪明的 AI，比 DeepSeek 还便宜"，和开场第一帧同一句）。片内标题：AI 的真实价格。

## 简介

按单价，全球最聪明的 AI（Claude Opus 5.5）比 DeepSeek 贵 17 倍。可账要分三层算：

- 包月：Claude Max 每月约 ¥1,344，用满一个月按原价值约 ¥4.8 万，36 倍。平摊到单价约 ¥3.8，和 DeepSeek 闲时价差不多。
- 用量：同一套考试，Opus 用的 token 只有 DeepSeek V4 Pro 的 1/8。单价贵 5 倍，总价反而更低。
- 你的时间：AI 写的代码，10 个程序员里只有 1 个敢直接用。没做对就要返工，你再查一遍。各做 100 个编程任务、改到全对为止，聪明的 AI 要你检查约 162 次，便宜的约 216 次，你多盯 4.5 个小时。按软件业平均时薪约 ¥119 算，只看 token，DeepSeek 更省；算上你的时间，Opus 反而便宜约 ¥400，你的时间占了账单的 8 到 9 成。

但这只是今天的答案。同样聪明的 AI 每年便宜约 13 倍，中国每天用掉的 token 两年涨了 1,000 多倍，明年谁最便宜、谁最聪明，可能都换了。不管谁最便宜，账单上最贵的那一行都是你的时间：token 会越来越多，唯一不会变多的，是你的时间。

结论有前提：Opus 的便宜只对包月、而且用得满的人成立；偶尔用，或者跑大批量、不用人看的 API 任务，按量付费的 DeepSeek 仍然更省。"每次检查 5 分钟"是本片的假设，往少了算；只要每次检查超过约 1.2 分钟，结论就成立。推算的数字在画面上都标了"约"或"推算"。画面由代码逐帧生成。数据截至 2026 年 10 月 23 日。不构成购买建议。

来源：Anthropic、OpenAI、DeepSeek 官方定价页（2026）；中国外汇交易中心人民币汇率中间价（2026-10-22）；Artificial Analysis《智能指数 v4.3》《编程智能体榜 v2.0》（2026）；wokey.ai《Claude 用量实测》（2026）；Stack Overflow《2026 开发者调查》；国家统计局《2025 年城镇单位就业人员年平均工资情况》（2026）；人社部发〔2025〕2 号（2025）；Epoch AI《The plunging price of thought》（2026）；国家数据局，国新办发布会（2026-03-24）。

#vibe知识大赏 @抖音科技

## 完整来源（带链接，只放发布套件和网站，不贴到平台）

价格（2026-10-22 复核）
- Anthropic（美国 AI 公司）Claude API 定价：Opus 5.5 输入 $4、输出 $20，Sonnet 5.5 输出 $10 每百万 token。https://platform.claude.com/docs/en/about-claude/pricing
- Claude Max 计划：Max 20x $200/月。https://support.claude.com/en/articles/11049741-what-is-the-max-plan
- OpenAI GPT-6.1 Sol 输出 $10 每百万 token。https://developers.openai.com/api/docs/pricing
- DeepSeek（深度求索）API 定价：V4.1 Flash 输出高峰 ¥8、闲时 ¥4；V4 Pro 输出高峰 ¥27；闲时为工作日 9–12 点、14–18 点以外的时段，五折。https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- 汇率：2026-10-22 美元兑人民币中间价 6.7195，中国外汇交易中心。
- "智能排行第 1"：Artificial Analysis（美国 AI 评测机构）智能指数 v4.3，Claude Opus 5.5（max）57.6 分，第 1 名。https://artificialanalysis.ai/leaderboards/models

包月
- Max 20x 用满一个月按 API 原价值 $7,121：wokey.ai 17 个用满周额度账号的中位数（2026-10），约 36 倍。https://wokey.ai/claude-usage-limits
- 平摊单价：$20 × $200 ÷ $7,121 × 6.7195 ≈ ¥3.8（推算）。

用量
- 跑完整套智能指数 v4.3：Opus 5.5（低推理档）输出约 1,960 万 token、$860.33、42 分；DeepSeek V4 Pro（最高档）约 1.63 亿 token、$1,122.27、36 分。Artificial Analysis，2026-10-22。

你的时间
- 拿到 AI 写的答案后"直接用"的占 9.6%（"Only 10% use answers as-is"），其余先在本地跑、对照代码库、看测试：Stack Overflow（程序员问答网站）2026 开发者调查，13,162 人回答，可多选。https://survey.stackoverflow.co/2026/ai
- 一次做对的比例（pass@1）：Claude Code + Opus 5.5（最高档）61.7%，每轮花费 $11.42；DeepSeek 自家工具 DeepSeek Harness + V4.1 Flash 1017（最高档）46.3%，每轮 $0.30（高峰价）：Artificial Analysis 编程智能体榜 v2.0（FrontierCode、Terminal-Bench 4.0、SWE-Atlas-QnA 三套题），2026-10-22。https://artificialanalysis.ai/agents/coding-agents
- 检查次数 = 100 ÷ 一次做对的比例（推算，假定每轮相互独立；实际上弱模型在难题上常常一错再错，这个算法对它偏宽）。
- 每次检查 5 分钟：本片假设。
- 时薪：国家统计局《2025 年城镇单位就业人员年平均工资情况》，城镇非私营单位"信息传输、软件和信息技术服务业"248,752 元（2026-05-15）。https://www.stats.gov.cn/sj/zxfb/202605/t20260515_1963707.html 按人社部发〔2025〕2 号"小时工资 = 月工资 ÷（21.75 天 × 8 小时）"折算，约 ¥119/小时（推算）。
- 账单：token = 每轮花费 × 检查次数；Opus 按 Max 包月用满折算（÷36），按 API 原价则约 ¥1.25 万；DeepSeek 按它的 token 用量和闲时人民币价算。你的时间 = 检查次数 × 5 分钟 × ¥119。全部为推算。
- 盈亏点：每次检查超过约 1.2 分钟，包月用满的 Opus 就比闲时的 DeepSeek 更省（推算）。

未来
- 同样水平的 AI 每年便宜约 13 倍：Epoch AI《The plunging price of thought》（Luke Emberson、David Roodman，2026-09-22），"The cost of achieving a given level of AI performance has fallen about 47% per quarter since 2023, or 13× per year"，算的是跑完测试的真实花费，含用掉的 token。片中"明年约 ¥7.7、后年约 ¥0.6"是按同样速度往后推算。https://epoch.ai/publications/the-plunging-price-of-thought
- 中国日均 token（词元）调用量：2024 年初约 1,000 亿，2025 年底 100 万亿，2026 年 3 月超过 140 万亿，两年增长超千倍。国家数据局局长刘烈宏，国务院新闻办公室发布会，2026-03-24；新华网转载《经济参考报》，2026-04-01。https://www.news.cn/tech/20260401/49aa331c84a547c09620d806f87ee0cd/c.html
- "你的时间占账单 82% → 98% → 99.9%"：以片中 Opus 的账单为例，你的时间不变，token 按每年便宜 13 倍推算。

## 配乐和音效

- 配乐：《千年之后（氛围版）》，和乐府。来源：https://music.01mvp.com/ （标注"抖音授权：收藏者声明"）。授权以收藏者声明为准，未单独核实是否允许商用。
- 音效和环境声：世界的形状曲库 https://music.shapeof.world/ ，CC0。

## 授权

代码按仓库的 AGPL-3.0-only，片中原创的文案和画面按 CC BY-NC 4.0；配乐、字体和数据按各自的许可。名称和标志不随代码授权。
