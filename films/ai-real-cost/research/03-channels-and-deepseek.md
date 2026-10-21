# 03 — 第三方渠道的真实价格 & DeepSeek 自己的账本

调研日期：2026-10-21。标记说明：**[已核实]** = 本次直接抓取官方/一手页面；**[二手]** = 媒体/博客转述；**[存疑]** = 来源冲突、未证实或属于我自己的推算。

---

## 0. 基准价（后面所有对比都以此为准）

### Claude 官方 API（每百万 token，美元）[已核实：Anthropic 官方 SDK 文档的价格表，2026-10-06 缓存]
| 模型 | 输入 | 输出 |
|---|---|---|
| Claude Fable 5.1 | $10 | $50 |
| Claude Opus 5.5 | $4 | $20 |
| Claude Opus 5 / 4.8 / 4.7 / 4.6 | $5 | $25 |
| Claude Sonnet 5.5 / Sonnet 5 | $2 | $10 |
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Haiku 5.5 | $0.10 | $0.50 |

Opus 5.5 缓存读取 $0.20/M。Bedrock 和 Vertex 上的 Claude 由合作方另行定价。

### Claude 订阅（claude.com/pricing，2026-10-21 抓取）[已核实]
- Pro：月付 $20（年付折合 $17/月）
- Max 5x：$100/月，含每月 $100 API 额度
- Max 20x：$200/月，含每月 $200 API 额度
- 用量按滚动 5 小时窗口和每周上限计算，Anthropic 还可另设上限。
- https://claude.com/pricing

### DeepSeek 官方 API（每百万 token，人民币）[已核实：api-docs.deepseek.com/zh-cn/quick_start/pricing，2026-10-21 抓取]
| 模型 | 时段 | 输入（缓存命中） | 输入（未命中） | 输出 |
|---|---|---|---|---|
| deepseek-flash（当前由 DeepSeek-V4.1-Flash-1017 提供） | 高峰 | 0.04 | 2 | 8 |
| deepseek-flash | 闲时 | 0.02 | 1 | 4 |
| deepseek-v4-pro | 高峰 | 0.30 | 9 | 27 |
| deepseek-v4-pro | 闲时 | 0.15 | 4.5 | 13.5 |

- 高峰时段：北京时间工作日 9:00-12:00 和 14:00-18:00，其余时间（含周末、法定节假日）均为闲时。
- 2026 年价格变动时间线：
  - 4 月 24 日 V4 发布。Pro $1.74/$3.48，Flash $0.14/$0.28。Pro 有限时 2.5 折。[二手：Simon Willison、Decrypt、Bloomberg 2026-04-27]
  - 5 月下旬起 Pro 永久降价。[二手：IT之家]
  - 8 月 13 日宣布涨价，8 月 17 日 00:00 生效，涨幅 50%–1100%，同时引入峰谷价。
    - Pro 未命中输入 3→9 元，输出 6→27 元（高峰）。
    - 1100% 的涨幅出现在 Pro 高峰时段的缓存命中价：0.025→0.3 元。
    - 官方给出的理由是缓解日间算力拥堵。
    - 来源：[界面](https://m.jiemian.com/article/14933595.html)、[The Star/Reuters 2026-08-13](https://www.thestar.com.my/tech/tech-news/2026/08/13/deepseek-raises-api-pricing-for-its-v4-models)
  - 9 月 10 日发布 V4.1 Flash，Flash 系列重新定价（闲时 1/4 元）。[TechNode 2026-09-10](https://technode.com/2026/09/10/deepseek-formally-launches-v4-1-flash-routes-v4-pro-requests-to-flash/)
- **[存疑]** TechNode 和 IT之家称，自 9 月 14 日中午起 V4-Pro 的请求会路由到 V4.1 Flash，并按 Flash 价计费。但官方价格页目前仍单独列出 deepseek-v4-pro（高峰 9/27），阿里云百炼也上架了 `deepseek-v4-pro-0813`。现在调 v4-pro 实际由哪个模型服务、按哪档价格计费，要以控制台账单为准。

---

## 1. 中文 API 中转站（new-api / one-api 系）

### 1.1 new-api 的三个倍率怎么算 [已核实：官方文档]
文档：https://docs.newapi.ai/en/docs/guide/console/settings/rate-settings（旧地址 newapi.ai 会 308 跳转到这里）

- **额度单位**：1 美元 = 500,000 quota（配额点）。
- **按量计费公式**：`配额消耗 = (输入token + 输出token × 补全倍率) × 模型倍率 × 分组倍率`
- **按次计费公式**：`模型固定价格 × 分组倍率 × 500,000`
- **模型倍率**：
  - 模型倍率 1 ≙ 输入 $2 / 百万 token，即 $0.002 / 1K。one-api 源码注释原文是 `1 === $0.002 / 1K tokens`（relay/billing/ratio/model.go）。
  - 换算规则：模型倍率 × 2 = 官方输入单价（$/M）。
  - 例 1：gpt-4o 的倍率是 1.25，对应 $2.5/M。
  - 例 2：中转站 FAQ 中 claude-opus-4-6 的倍率是 2.5，对应 $5/M。来源：https://docs.apiyi.com/faq/model-multiplier.md
- **补全倍率**：输出价 ÷ 输入价。例如 Claude 是 5（$25/$5），gpt-4o 是 4。
- **分组倍率**：站长按用户组设置的整体乘数，就是中转站对外宣传的「0.5x 分组」「1.5x 分组」「Max 组」等。文档示例：internal-test 0.5、standard 1.0、enterprise 0.8、trial 2.0。最终乘数 = 模型倍率 × 分组倍率，用户个人倍率优先于组倍率。
- **计费流程**：先按预估量预扣费，请求结束后按实际 token 结算并多退少补。
- **坑**：one-api 的 `GetModelRatio` 在找不到某个模型的倍率时，会回退为 **30**（相当于 $60/M 输入），会悄悄多扣钱。来源：https://www.ssdnodes.com/learn/lang/zh-hans/one-api-billing-multipliers-and-quota-math
- **缓存计费**：倍率页没有写缓存倍率。不同站点对 prompt caching 的扣费逻辑各不相同，社区抱怨很多（见 1.4）。

### 1.2 用户实际付多少钱 = 充值汇率 × 分组倍率
- 中转站的「余额」以美元额度计价，但用人民币充值。常见报价：
  - **¥1 = $1 额度**（俗称「1 元 1 刀」）
  - ¥1.2 = $1
  - 「官 key」¥1.8 = $1
  - 低价站约 ¥0.5 = $1
- 来源：
  - NodeSeek 商家帖（帖子写明「Max 特价版仅 CLI 可用 1CNY=1刀、按量 1.2CNY=1刀、官 key 1.8CNY=1刀」）[二手，商家广告，未验证]
  - codepick.dev 选型指南（2026-03-02 发布，页脚标 2026-10 更新）：SSSAiCode 约 ¥0.5/$，编程类中转站常见倍率 1.0x–1.5x。https://codepick.dev/zh/compare/api-relay-guide/
- **实际价格占官方价的比例** = 充值汇率(¥/$) × 分组倍率 ÷ 市场汇率(¥/$)。USD/CNY 按约 7.1–7.2 计，**[存疑]**，请在发片前更新。

| 场景 | 每「官方 $1」实付 | 相对官方 API 价 |
|---|---|---|
| 官方 API（信用卡直付） | ≈ ¥7.2 | 100% |
| ¥1=$1，分组 1.0x | ¥1.0 | ≈ 14% |
| **¥1=$1，分组 1.5x** | **¥1.5** | **≈ 21%（约官方 2 折）** |
| ¥1.8=$1（官 key），1.0x | ¥1.8 | ≈ 25% |
| ¥7.3=$1（按市场汇率充值），1.5x | ¥10.95 | ≈ 150%（比官方贵一半） |

例：Claude Opus 5.5 官方价是输入 $4/M、输出 $20/M。
- 在「1 元 1 刀 + 1.5x」的站上，实际是输入 ¥6/M、输出 ¥30/M。
- 官方折合约输入 ¥28.8/M、输出 ¥144/M。

结论：同样标「1.5 倍率」，便宜还是贵完全取决于充值汇率。80aj 的经验法则是「低于约 0.2 元/刀才有真正成本优势」，**[存疑]** 原文另一句「高于约 0.6 元/刀性价比明显低于官方正价」与官方约 7.2 元/刀的事实矛盾，疑似原文是在和 Max 订阅或官方充值套餐比较，引用时需注意。来源：https://www.80aj.com/2026/05/16/api-proxy-guide-claude/ （2026-05-16）

### 1.3 和买 Claude Max 比
- Max 20x 每月 $200（约 ¥1,440）。重度 Claude Code 用户每月消耗的量，按 API 价计算常常是订阅费的数倍到十几倍。
- **[二手/个人实测]** NodeSeek 上一位用户合买了尼日利亚区 Max（2 个 5x，后来换成 1 个 20x），通过 sub2api 分给朋友用。几乎每周都用满额度的情况下，他测得「成本倍率约 0.1」，即每 1 美元 API 等价用量只花约 $0.1。他自己也承认这里有官方重置额度和尼区低价的因素。https://www.nodeseek.com/post-799403-1 （403，未能直接抓取，内容来自搜索摘要）
- **我的推算 [存疑]**：
  - 如果号池成本约 0.1 刀/刀（≈ ¥0.72 每官方 $1），中转站按「1 元 1 刀 × 1.5」（¥1.5）卖出，毛利约一倍。这就是低价中转站的商业模式：**把订阅制的包月额度切碎成按量 API 转卖**。
  - 社区也有人抱怨「Max 组倍率都在 1 左右甚至更高，比自己再订一个套餐还贵」。对单个重度用户来说，自己买 Max 往往比走中转更便宜也更安全。
- codepick 的价格表把多个中转站的月费折算成「相当于官方 Max $200 的 5%–50%」。[二手]

### 1.4 风险
1. **号池 / 封号**：
   - 低价货源主要有几类：Claude Max 订阅号池（sub2api 等工具把 OAuth 订阅转成 API）、AWS Bedrock、Kiro，以及「逆向」Cursor/Antigravity 等接口。
   - Anthropic 在 2025-09-04/05 更新销售条款，禁止中国控股（直接或间接持股 >50%）的实体在全球范围内使用 Claude。来源：[CRN Asia](https://www.crnasia.com/news/2025/artificial-intelligence/anthropic-tightens-ai-access-rules)
   - 2026 年有报道称，Claude Code 某个版本会读取本地时区和代理地址中的关键词，用来识别转售。Anthropic 员工称这是一项打击未授权转售和蒸馏的实验，之后会移除。来源：[The Decoder](https://the-decoder.com/claude-codes-complicated-china-problem-involves-bans-on-both-sides-of-the-pacific/) [二手]
   - 社区传言新注册账号平均只能存活约 1 小时，多家中转站因此停摆。[存疑，「业内人士透露」级别] https://www.80aj.com/2026/03/19/claude-api-crisis-2/
2. **模型替换 / 掺水**：
   - 学术依据：UC Berkeley 论文 *Are You Getting What You Pay For? Auditing Model Substitution in LLM APIs*（Cai, Shi, Zhao, Song；arXiv 2504.04715，2025-04-07 首发、09-29 修订，NeurIPS 2025）。论文指出，供应商可以暗中换成量化版或更小的模型。仅凭输出文本做统计检测需要大量查询，而且抓不到细微替换；logprob 方法会被推理的不确定性干扰。作者建议用 TEE 硬件证明。https://arxiv.org/abs/2504.04715
   - 社区实测：
     - Linux.do 博主发现，多家标榜 Claude Opus 的中转接口，输出和推理链与另一模型（文中称 GPT 5.4）高度一致。[二手] https://www.80aj.com/2026/03/27/claude-gpt-shell-scam/
     - 常见手法：opus 请求暗中路由到 haiku 或开源/国产模型，再回填 `model` 字段；截短上下文；去掉多模态但照样返回 200。[二手] https://aicoding.csdn.net/6a44780010ee7a33f285443e.html
     - 检测工具：cc-proxy-detector（判断后端是 Anthropic、Bedrock、Vertex 还是伪装）；Claude Detector（19 个探针）。
3. **缓存计费乱象**：
   - 有用户反馈，「纯 Max」中转的后台缓存数据异常：缓存读取量固定为 18,729 token，写入远大于读取。[二手]
   - 有的站干脆没有缓存，长对话 Agent 的实际花费远高于标价。
4. **隐私**：所有代码和 prompt 都经过中转方。
5. **跑路**：社区普遍建议「小额高频」充值，每次 5–10 元。

---

## 2. 在 Agent / IDE 里用 DeepSeek，平台会不会加价？

| 平台 | 计费方式 | 相对 DeepSeek 官方价 |
|---|---|---|
| **Claude Code + DeepSeek Anthropic 兼容端点** | 用户自带 DeepSeek key，按 DeepSeek 官方价扣费 | **等于官方价**。`ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`。官方映射规则：`claude-opus*` → deepseek-v4-pro（按 V4 Pro 价计费）；`claude-sonnet*`/`claude-haiku*`/其他 `claude*` → deepseek-flash；不以 `claude` 开头的模型名直接 400。不支持或会忽略的功能：`cache_control`（DeepSeek 自动缓存）、document 块、MCP 块、citations 等。[已核实] https://api-docs.deepseek.com/guides/anthropic_api 。**注意**：Claude Code 默认主模型是 Opus 系时，会全部按较贵的 V4 Pro 计费。 |
| **Cline / Roo Code** | BYOK，直连 DeepSeek 或 OpenRouter | 直连时就是官方价，经 OpenRouter 则按 OpenRouter 定价。**[存疑：本次未重新抓取 Cline/Roo 文档，此为常识性描述]** |
| **Cursor** | 个人 Premium/Super/Ultra 方案：第三方模型按「API 刊例价，从预付额度扣」；Teams/Enterprise 在刊例价上再加 **Cursor Token Rate $0.25/M token**。Cursor 模型页目前**没有列出 DeepSeek**。 | 个人版无加价，团队版有加价。[已核实] https://cursor.com/docs/models |
| **Trae（字节）** | 2026-02-24 起改为按 token 计费：真实成本 = token × 模型刊例价。档位：Free（$3 用量）、Lite $3/月（$5 用量）、Pro $10/月（$20 用量）、Pro+ $30/月（$80 用量）、Ultra $100/月（$400 用量）。 | 订阅本身是补贴：Pro 花 $10 得 $20 刊例价用量。文中没有提 DeepSeek 的单价，也没说是否加价。[二手：IT之家] https://www.ithome.com/0/923/234.htm 。另外，Anthropic 收紧政策后 Trae 已下架 Claude。 |
| **腾讯 CodeBuddy（国际版）** | Free 每月 100 credits；Pro $10/月共 2,000 credits（1,000 基础 + 1,000 赠送），年付 $96；Team $40/席/月，每席 1,000 credits；Pro 加购 500 credits = $15。 | **官方没有公开 credit 与 token 的换算，也没有逐模型 credit 表**，只说明「高级模型单价更高」。因此无法确认 DeepSeek 在 CodeBuddy 里是否比官方 API 贵。[已核实，页面 2026-08-07 更新] https://www.tencentcloud.com/document/product/1256/77270 、/77271 |
| **腾讯 WorkBuddy（国内）** | 标准版 ¥70/月，4,000 积分；进阶 ¥140 得 9,000 积分（约 1.6 分/积分）；积分包 ¥10/200、¥50/1,000、¥250/5,000、¥500/10,000（有效期 1 个月）；免费版每月 500 积分，每日签到 100。企业标准坐席 ¥198/月，25,000 Credits。 | **[二手/存疑]** 官方从未公布积分与 token 的换算。虎嗅 2026-08-10 的作者实测约 1 积分 ≈ 4,100 token（以 Kimi K3 为主）；按 Kimi 官方价估算，WorkBuddy 价格约为 API 价的 1/5–1/10，即**补贴而非加价**。也有文章称混元一次请求（约 8k 输入 + 500 输出）约消耗 3.18 Credits。NodeSeek 用户称海外版 $10 = 2,000 积分，且同一 DeepSeek 模型在海外版的倍率比国内版低（凭记忆，无官方依据）。**没有找到 DeepSeek 在 WorkBuddy 的官方积分单价。** 北京日报报道过「8.88 元买 5000 积分」之类的灰产骗局。来源：https://m.huxiu.com/article/4881987.html 、https://www.woshipm.com/ai/6457232.html 、https://www.nodeseek.com/post-989270-1 |

**小结**：
- 自带 key（Claude Code 兼容端点、Cline、Roo）就是 DeepSeek 原价。
- Cursor 个人版按刊例价收费，团队版每百万 token 多收 $0.25。
- Trae、WorkBuddy、CodeBuddy 是订阅加积分制，目前看到的证据都是**平台在补贴**，名义用量大于订阅费，但积分黑盒、换算不透明。DeepSeek 本身已经很便宜，所以补贴对它的意义不如对 Kimi、Claude 这类贵模型大。

---

## 3. 云厂商转售 DeepSeek 的价格

| 渠道 | 模型 | 输入 / 输出（每 M） | 对比官方 | 可信度 |
|---|---|---|---|---|
| DeepSeek 官方 | V4.1 Flash | ¥2 / ¥8（高峰），¥1 / ¥4（闲时） | 基准 | 已核实 |
| 硅基流动 SiliconFlow | DeepSeek-V4.1-Flash | ¥2 / ¥8（0–2 点、8–24 点），¥1 / ¥4（2–8 点），缓存 ¥0.04 / ¥0.02 | 单价与官方相同，但闲时只有凌晨 2–8 点，比官方的闲时窗口窄得多 | 已核实 siliconflow.cn/pricing |
| 硅基流动 | DeepSeek-V4-Pro | ¥12 / ¥24，缓存 ¥1 | 等于 V4 发布时的「原价」；与官方现价（高峰 9/27、闲时 4.5/13.5）相比，输入更贵、输出更便宜，缓存贵 3–6 倍 | 已核实 |
| 硅基流动 | DeepSeek-V4-Flash（旧） | ¥3 / ¥9 | 比官方 V4.1 Flash 贵 | 已核实 |
| 硅基流动 | DeepSeek-V3.2 | ¥4 / ¥6，缓存 ¥0.4 | — | 已核实 |
| AWS Bedrock | DeepSeek-V3.2 | $0.62 / $1.85（美区）；欧洲和孟买 $0.74 / $2.22 | DeepSeek 官方 V3.2（2025-09 起）约为 $0.28 / $0.42。**[存疑：官方 V3.2 价凭记忆，本次未重新核实]** 由此看，Bedrock 输入约贵 2.2 倍、输出约贵 4.4 倍 | 二手（futureagi / typingmind 聚合站） |
| Azure AI Foundry | DeepSeek-V3.2 | $0.58 / $1.68（2026-06-02 核实）；V3.1 为 $1.23 / $4.94 | 同上，约贵 2–4 倍 | 二手（cloudprice.net） |
| Google Vertex AI MaaS | DeepSeek-V3.2 | $0.56 / $1.68；V3.1 官宣价为 $0.60 / $1.70 | 同上 | 二手 |
| 火山引擎方舟 | DeepSeek-V4 | **未取到**（文档页 JS 渲染）。第三方页面显示「火山 Coding Plan」中 V4 Pro 标 $0，但那是套餐，不是按量价 | — | 未核实 |
| 阿里云百炼 | deepseek-v4-pro-0813、deepseek-v4.1-flash | 已上架，**价格未取到** | — | 部分核实 |

**解读**：
- 海外云（Bedrock、Azure、Vertex）卖 DeepSeek 一般比 DeepSeek 官方贵 2–4 倍。客户付的是合规、数据不出境（不进中国）、企业账单和 SLA 的钱，再加上它们用自己的 GPU 跑开源权重，没有 DeepSeek 自研推理栈的规模效率。
- 国内聚合商（硅基流动）对 V4.1 Flash 基本跟官方同价，但闲时窗口更苛刻；对 V4 Pro 则沿用了更高的「原价」。

---

## 4. DeepSeek 自己披露的经济账

### 4.1 2025 开源周 Day 6：「One More Thing」推理系统概览 [已核实]
来源：https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md （2025-03-01 发布）

- **统计窗口**：北京时间 2025-02-27 12:00 至 02-28 12:00，共 24 小时，V3 与 R1 合计。
- **算力**：
  - 峰值占用 **278 个节点**，平均 **226.75 个节点**，每节点 **8 张 H800**，平均约 1,814 张卡。
  - 白天高峰时全部节点用于推理，夜间低负载时把部分节点挪去做研究和训练。
- **成本假设**：**按 H800 每卡每小时 $2 的租赁价计算**，日成本 **$87,072**。验算：226.75 × 8 × 24 × 2 = 87,072。
- **token 量**：
  - 输入 **608B**，其中 **342B（56.3%）命中硬盘 KV 缓存**；输出 **168B**。
  - 平均输出速度 20–22 tok/s。
  - 单节点吞吐：prefill 约 73.7k tok/s（含缓存命中），decode 约 14.8k tok/s。
- **理论收入**：如果全部按 R1 价格计费（缓存命中 $0.14/M、未命中 $0.55/M、输出 $2.19/M），一天是 **$562,027**，**成本利润率 545%**。
- **DeepSeek 自己列出的保留意见**（实际收入「substantially lower」）：
  1. V3 比 R1 便宜得多；
  2. 只有部分服务收费，网页和 App 免费；
  3. 夜间有自动折扣。
- **成本只算了什么？** 这个 $87,072 **只是推理用 GPU 的假设租金**（甚至不是 DeepSeek 自有集群的实际折旧）。不含训练和研究算力、人员、带宽、存储、电力等的单独核算（租金价里已隐含一部分），也不含免费 App 和网页的用户。所以 545% 是「理论毛利」，不是公司利润。

### 4.2 2026 年的新披露 / 报道
- **财务（媒体援引知情人士，未经审计，DeepSeek 未置评）[二手]**：
  - The Information 2026-08 报道：2026 年 1–7 月营收约 **¥4.75 亿（约 $70.7M）**，约为 2025 全年的 10 倍；同期净亏损约 ¥7.15 亿（2025 全年亏损 ¥9.35 亿）。
  - **整体毛利率 44.6%，API 调用业务毛利率 82.9%**，报道将其归因于基础设施效率，即用更少的芯片跑模型。
  - 来源：[The Standard HK](https://www.thestandard.com.hk/finance/article/341002/DeepSeeks-first-seven-month-revenue-surged-tenfold-to-475-million-yuan-report-says)、[华尔街见闻](https://wallstreetcn.com/articles/3780340)、[Newsquawk](https://www.newsquawk.com/headlines/deepseek-revenue-is-around-usd-70mln-ytd-10x-the-fy25-figure-the-information-reports-citing-sources)
  - 后续报道称，截至 2026 年 9 月年化营收约 **$10 亿**，并在推进新一轮融资，金额和估值各家报道不一致。[二手，存疑] [Crypto Briefing](https://cryptobriefing.com/deepseek-1b-revenue-75b-valuation/)
  - **注意**：82.9% 的 API 毛利率（报道值）和 2025 年「545% 成本利润率」口径不同。545% 是 (收入−成本)/成本；换算成毛利率为 545/645 ≈ 84.5%，两者量级其实一致。
- **调用量 / 算力紧张 [二手]**：
  - 券商和媒体分析称，8 月 3–9 日当周 V4-Flash 周调用量达 **8.83 万亿 token**，环比 +570%；8 月 4 日起 API 频繁报「容量不足」，随后 DeepSeek 涨价并引入峰谷价。https://m.huxiu.com/article/4886242.html
  - 界面报道把年初的宕机归因于「用户增长 66.7%，算力只增长 8.3%」。
  - 一篇 Medium 类文章称，2026-08-01 某编程工具 24 小时内通过 V4 Flash 跑了约 8 万亿 token。[存疑，来源弱]
  - OpenRouter 侧观测数据（不是 DeepSeek 的总量）：2026-08-26 单日 875.6B token，30 日均值 394B。https://routers.vantage.sh/providers/deepseek
  - 国家数据局数据：全国日均 token 调用量从 2024 年初的 1,000 亿增长到 2026 年 3 月的 140 万亿。[二手转引]
  - Caixin 2026-03-30 报道 DeepSeek 宕机约 10 小时。https://www.caixinglobal.com/2026-03-30/deepseek-goes-out-for-10-hours-amid-chinas-ai-demand-surge-102428989.html
- **集群规模**：本次**没有找到** DeepSeek 在 2026 年官方披露的推理集群节点数或日 token 总量，即类似 Day 6 那样的一手数据。
  - V4 论文（2026-04）只给出相对效率：1M 上下文下，V4-Pro 的计算量约为 V3.2 的 27%，KV cache 约为 10%。
  - Decrypt 报道 V4 部分在华为昇腾上训练，Pro 的价格预计在新超节点上线后会下调。推理用什么芯片，没有找到官方说明。[二手]

---

## 5. 给视频用的要点（我的归纳）
1. 中转站标的「1.5 倍率」只是乘数，真实折扣 = 充值汇率 × 倍率 ÷ 7.2。「1 元 1 刀 × 1.5」约等于官方价两折；按市场汇率充值再乘 1.5，就比官方贵 50%。
2. 中转站能做到两折，主要是把 Max 订阅（包月、不限 token 计价）切碎转卖，代价是封号、掺水和隐私风险，Anthropic 的条款也明令禁止。
3. 在 Agent 里用 DeepSeek：自带 key 就是原价；订阅制 IDE（Trae、WorkBuddy、CodeBuddy）目前是补贴，但积分是黑盒；Cursor 团队版每 M token 多收 $0.25；海外大云卖 DeepSeek 贵 2–4 倍。
4. DeepSeek 的「545% 利润率」是理论值：只算 GPU 租金（$2/卡时），收入假设全部按 R1 计价。2026 年媒体报道的 API 毛利率 82.9% 与之量级一致，但公司整体仍在亏损（1–7 月亏 ¥7.15 亿）。
5. 「便宜」不是永久的：2026 年 8 月算力吃紧后，DeepSeek 自己把 V4 Pro 的价格最高上调了 1100%（单项），并引入峰谷价。
