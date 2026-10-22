# 调研 01：最重的个人用户，每天/每月烧多少 token、多少钱

《最会用 AI 的人，在用 AI 干什么》· 世界的形状 · 调研日期 2026-10-22

## 读法

强度标签（不升级）：

- **已核实（一手）**：我读到了原始页面/原始帖子/原始截图，数字就在上面。
- **二手**：只读到媒体或转载对原话/原数据的转述（文中写明哪家媒体）。
- **未核实**：只有搜索摘要、聚合站、自助榜单，或来源互相矛盾。

数字归属：

- 凡 Anthropic 自己说的，标"**Anthropic 自己的数据**"。本片用 Claude 制作，存在利益冲突，片中建议直接标注。
- OpenAI 员工或 OpenAI 披露的，标"**OpenAI 自报**"。
- 推算：算式写明，标 **推算**。

三条通用警告，后面不再重复：

1. **"$ 等值" 不是账单。** ccusage 和 Claude Code 的 `/usage` 都是按 token 数乘以 API 标价本地估算（Anthropic 文档原话："Claude Code computes the dollar figure locally from token counts at list price"）。Max/Pro 订阅用户并不按 token 付费，所以 "$13,000/月" 这类数字是"如果按 API 价买要多少钱"。
2. **token 数有口径之分。** 多数大数字含缓存读取（cache read），不等于"模型写了多少字"。Steinberger 的 603B token 对 7.6M 次请求，平均每次约 79,000 token（推算：603B ÷ 7.6M ≈ 79,342），说明绝大部分是重复读取的上下文。
3. **榜单和截图多为自报。** 本次未发现任何经第三方审计的个人用量数据。

本次的搜索限制：WebSearch 额度在会话中途被所有 agent 用尽，后半段改为直接抓取已知页面。OpenAI 官网（403）、NYT / WSJ / The Information（付费墙或拦截）、Linux.do 与 Indie Hackers（Cloudflare 拦截）都没能读到原文，相关数字因此降级。我没有绕过这些限制。

---

## 速查表

| 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|
| Anthropic 宣布周限额，预计影响订阅用户比例 | "less than 5% of subscribers"（2025-07-28） | @AnthropicAI 推文，经 fxtwitter 读取 | **已核实（一手）**，Anthropic 自己的数据 |
| Anthropic 称一名用户在 $200 套餐上用了"数万美元"模型用量 | "tens of thousands in model usage on a $200 plan"，至少是套餐价的 100 倍（推算：$20,000 ÷ $200） | Futurism 2025-07-30 引述 Anthropic 后续推文；Tom's Guide 2025-07-29；HN 评论称出自 Anthropic 的 Reddit 账号 | **二手**（该条推文本身我没读到），Anthropic 自己的数据 |
| Anthropic 官方的 Claude Code 企业部署均值 | 约 $13 每开发者每活跃日；$150-250 每月；90% 的用户每活跃日低于 $30 | code.claude.com/docs/en/costs（页面无发布日期，2026-10-22 抓取） | **已核实（一手）**，Anthropic 自己的数据 |
| Steinberger（OpenClaw 作者）30 天 OpenAI API 用量 | 603B token、$1,305,088.81、7.6M 次请求；折合约 20.1B token/天、$4.35 万/天（推算） | 他 2026-05-15 的推文截图（我下载并读了图）；Decoder 2026-05-16；Tom's Hardware 2026-05-17；量子位 2026-05-17 | **已核实（一手）** 截图；"费用由 OpenAI 承担"、"关闭 fast mode 降 70%" 为**二手**；**OpenAI 自报**口径 |
| 黄仁勋：工程师应有年度 token 预算 | 基础薪资"几十万美元"，再给"大约一半"的 token（GTC 主题演讲 2026-03-16） | Business Insider（经 AOL）、Fortune 2026-03-17 | **二手**（媒体引述，没读视频逐字稿） |
| 黄仁勋：$50 万工程师至少烧 $25 万 token | "$500,000 engineer ... at least $250,000 worth of tokens"，折合约 $685/天（推算：$250,000 ÷ 365） | All-In Podcast，约 2026-03-19；Business Insider（经 AOL，页面更新 2026-03-20）；R&D World 2026-03-24 | **二手** |
| Meta 内部 "Claudeonomics" 榜单 | 85,000+ 员工，30 天共 60.2T token，榜首 281B（口径不明），2026-04 上线数天后下线 | The Information 原报道（付费墙）；Fortune 2026-04-09；Pragmatic Engineer 2026-04-23；The Decoder 2026-04-07 | **二手**，榜首口径冲突 |
| 公司给工程师的真实月度 AI 花费 | 常见 $1,000-3,000/月/人；某量化公司人均约 $1,600，1 月约为 $80；人均上限 $25,000/月 | Pragmatic Engineer 2026-10-20（匿名读者提供，我读到的是免费部分） | **二手** |
| 风投合伙人 Tomasz Tunguz 的个人推理花费 | 两个季度内从 $7,200 涨到 $43,000 再到超过 $100,000 年化；曾有"$92 daily inference invoices"；每天 31 个任务 | tomtunguz.com 2026-02-17（他自己的博客） | **已核实（一手）**（自述，非审计） |
| 开发者 Vonng 自己的订阅 | 两个 MAX，约 $450/月，"买到约 $22,000 的算力"，约 49 倍（推算：22,000 ÷ 450） | blog.vonng.com 2026-04-13 | **已核实（一手）**（自述，未说明测量方式） |
| 中国开发者"搞七捻三"的月度 token | 1 月约 24.4 亿，3 月 101.4 亿，4 月 234 亿（约 7.8 亿/天，推算），5 月 4.91 亿 | 80AJ 2026-06-13 转载 Linux.do 原帖 | **二手**（自述；原帖被拦截） |
| 另一位中国开发者一个月 177 亿 token | 约 177 亿，折合约 5.9 亿/天（推算：177 亿 ÷ 30） | 80AJ 2026-10-06 转载 Linux.do | **二手** |
| 豆包全站日均 token（公司级对照） | 120 万亿/天（2026-04-02），约三个月前 63 万亿 | 量子位 2026-04-02，现场获取，非正式发布 | **二手** |
| OpenAI 某匿名员工一周 2100 亿 token | 210B/周，约 30B/天（推算：210B ÷ 7） | 量子位 2026-03-23（文中未注明出处）；Vonng 同说法无链接 | **未核实**，OpenAI 内部 |
| 公开榜单头部（自助提交） | viberank 榜首 $1.81M / 3.1T（标注 under review）；第二名 $480,071 / 521.1B；ccgather 30 天榜首 98.7B | 我读取了页面快照 | **未核实**（自助提交，无审计） |
| 1 万亿 token 俱乐部（公司级） | OpenAI DevDay 2025-10-06 的 Token Milestones 共 141 家公司；超过 30 家破 1T | Discuss 新闻稿 2025-10-13；虎嗅 2025-11-02 | **二手**，OpenAI 自报（OpenAI 官网 403） |

---

## 一、Anthropic：周限额与"数万美元"用户（2025-07-28）

### 事实

- **邮件**（订阅用户收到，我读到的是 HN 用户贴出的全文，时间 2025-07-28 18:27 UTC）：
  - "Next month, we're introducing new weekly rate limits for Claude subscribers, affecting less than 5% of users based on current usage patterns."（邮件原话，略有删节）
  - 邮件点名两类问题：账号共享/转售，以及"running Claude 24/7 in the background"。
  - 8 月 28 日生效，新增"总周限额"和"Opus 4 周限额"。
  - 邮件给的参考量：Max 5x 用户约 140-280 小时 Sonnet 4、15-35 小时 Opus 4。
- **@AnthropicAI 首条推文**，2025-07-28 18:23:25 UTC（fxtwitter 读取，一手）：
  - 原文第二句："We estimate they'll apply to less than 5% of subscribers based on current usage."
  - 链接：https://x.com/AnthropicAI/status/1949898502688903593
  - 这条是单推，不属于 thread，当时 233 万次浏览。
- **后续推文**（Futurism 2025-07-30 引述，称为 "In a subsequent tweet"）：
  - "a few outlying cases are very costly to support. For example, one user consumed tens of thousands in model usage on a $200 plan."
  - 同条还说有些最大的粉丝在"continuously in the background, 24/7"运行 Claude Code。
  - 链接：https://futurism.com/anthropic-users-melt-down-usage
- HN 上有人贴出同一句，称出自"Anthropic's Reddit account"（时间 2025-07-28 20:05 UTC），后半句还有："our new rate limits will ensure a more equitable experience for all users"。链接：https://news.ycombinator.com/item?id=44714948
- TechCrunch（Maxwell Zeff，2025-07-28）：发言人 Amie Rotherham 称影响不到 5% 的订阅用户；全文**没有**"tens of thousands"。
- Tom's Guide（Jeff Parsons，2025-07-29，经 Yahoo 转载）：写到 Anthropic "notes one user consumed 'tens of thousands in model usage' on a $200 plan"。

### 数字与推算

- "数万美元" ÷ $200 套餐价 ≥ 100 倍（推算，取下限 $20,000）。
- Anthropic 没说这名用户的 token 数，也没说是哪个月。

### 注意

- **Anthropic 自己的数据**，口径、窗口均未披露。
- 我没能抓到那条后续推文本身（只拿到前两条的 ID），所以逐字引文走 Futurism，强度只能是**二手**。
- HN 评论区有人说某用户晒出 "$13,200 of spend for his $200 account"，评论者自己都找不到原推，**不要用**。

---

## 二、Anthropic 官方的"正常人"基线

- 来源：https://code.claude.com/docs/en/costs （中文版 https://code.claude.com/docs/zh-CN/costs 数字一致）。页面是活文档，没有发布日期，我 2026-10-22 抓取。**Anthropic 自己的数据**。
- 原话（两段各自引用）："the average cost is around $13 per developer per active day"；"costs remaining below $30 per active day for 90% of users"。
- 同页："$150-250 per developer per month"，范围限定为企业部署。
- 同页提醒 agent teams 在 plan mode 下 token 约为标准会话的 7 倍。
- 搜索摘要里曾看到更早的版本"约 $6 每人每天、90% 低于 $12"，但我读到的当前页面（中英文）都是 $13 / $30，旧数字**未核实**，不要用。
- 用途：片中的"普通人"一档。拿它对照第三节，倍数写在第三节的推算里。

---

## 三、Peter Steinberger（OpenClaw 作者，现为 OpenAI 员工）：603B token / 30 天

### 原始证据（我亲自读了截图）

- 推文：https://x.com/steipete/status/2055346265869721905 ，2026-05-15 17:55:10 UTC，文字只有 "The latest CodexBar update renders API costs wayyyy nicer."，附一张 CodexBar（他自己写的菜单栏用量工具）截图。我下载了图片，读到：
  - OpenAI API（Admin API）视图：**30d spend $1,305,088.81**；**30d tokens 603B**；**30d requests 7.6M**。
  - 7d spend $249,661.09。
  - 当日（May 15）：$19,985.84、19B token、206K 请求。
  - Top model：gpt-5.5-2026-04-23。
- 他的辩护帖（2026-05-15 21:48 UTC）：https://x.com/steipete/status/2055405041843052792
  - 原话："People freaking out over my AI spend."
  - 核心问题："How would we build software in the future if tokens don't matter?"
  - 内容："We constant run ~100 codex in the cloud, reviewing every PR, every issue."，另有每次提交的安全审查、issue 去重、自动开 PR、会议中自动起活等。
  - 结论："All that automation allows us to run this project extremely lean."

### 推算

- 603B ÷ 30 = **20.1B token/天**。与截图当日 19B 吻合。
- $1,305,088.81 ÷ 30 ≈ **$43,500/天**；7d 口径 $249,661.09 ÷ 7 ≈ $35,700/天。
- 对照第二节 Anthropic 官方基线 $13/活跃日：$43,503 ÷ 13 ≈ 3,300 倍。**这是组织账号 vs 个人开发者均值，量级对照，不是同口径比较。**
- 603B ÷ 7.6M ≈ 79,000 token/次请求（口径警告 2）。
- 关闭 fast mode 后的数：他称可降 70%（量子位转述）。$1,305,089 × 0.30 ≈ $391,500（推算）。Tom's Hardware 写"约 $300,000"，36氪/量子位写"约 $400,000"，各家不一致，片中用"约 30-40 万美元"并标二手。

### 谁付钱、谁在用

- 账号是**组织级 Admin API 视图**：Decoder、Tom's Hardware 均称约 100 个云端 Codex 实例、三人团队。这不是"一个人敲键盘烧的"。
- Business Insider Japan（2026-05-20）：他确认账单是自己账号的（"至少这个账号是"），费用由雇主 OpenAI 承担，他称之为"OpenAI 支持 OpenClaw 的福利"。链接：https://www.businessinsider.jp/article/2605-openclaw-peter-steinberger-ai-token-bill/
- Tom's Hardware（Luke James，2026-05-17）：转述他的后续帖，称这是 Codex "Fast Mode" 价格，关闭后约 $300,000。链接：https://www.tomshardware.com/tech-industry/artificial-intelligence/openclaw-creator-burns-through-1-3-million-in-openai-api-tokens-in-a-single-month
- The Decoder（2026-05-16）：https://the-decoder.com/for-1-3-million-a-month-openclaw-founder-peter-steinberger-runs-100-ai-agents-that-code-review-prs-and-find-bugs/
- 量子位（2026-05-17，作者署名页未取到；36氪英文站转载 2026-05-18）：《龙虾之父月烧940万元的token！要不是入职OpenAI还真用不起》，换算约 940 万元人民币。链接：https://www.qbitai.com/2026/05/418822.html 、https://eu.36kr.com/en/p/3814369099292417。其中 fast mode 的引文是量子位中译："我可以关闭快速模式，这样成本会降低70%。"

### 强度与注意

- 数字本身：**已核实（一手）**（我读了他发的原图）。
- 但这是 **OpenAI 自报口径**：他是 OpenAI 员工，帖子带宣传性质，Tom's Hardware 提到有评论者认为是营销。
- 评估价值时注意 fast mode 溢价，$1.3M 不等于"标准价"。
- 同一张图只有 30 天窗口，不是日历月，片中写"30 天"，不要写"一个月"。

---

## 四、黄仁勋：给工程师发 token 当薪水

### GTC 2026 主题演讲，2026-03-16（周一，San Jose）

- Fortune（2026-03-17）引述："I could totally imagine in the future every single engineer in our company will need an annual token budget."
- Business Insider（Katherine Li，2026-03-17，经 AOL）引述：
  - 基础薪资："They're going to make a few hundred thousand dollars a year, their base pay."
  - 预算："I'm going to give them probably half of that on top of it as tokens so that they could be amplified 10X."
  - 招聘："It is now one of the recruiting tools in Silicon Valley: How many tokens comes along with my job?"
- 注意："annual token budget" 在 BI 中是记者措辞，这一条在 Fortune 里才是黄仁勋原话。
- 链接：https://fortune.com/2026/03/17/jensen-huang-ai-infrastructure-buildout-1-trillion-dollars 、https://www.aol.com/articles/jensen-huang-floats-giving-engineers-040201686.html

### All-In Podcast（GTC 最后一天，约 2026-03-19）

- Business Insider（Lee Chong Ming，页面更新 2026-03-20，经 AOL）引述："If that $500,000 engineer did not consume at least $250,000 worth of tokens, I am going to be deeply alarmed."
- 若工程师答复只花了 $5,000："If that person said $5,000, I will go ape something else."
- 被问 Nvidia 工程团队是否在花 $20 亿 token，他答："We're trying to."（注意：BI 原文是 "spending $2 billion on tokens for its engineering team"，没有"每年"；这不是确认数字，不要写成"Nvidia 每年 token 花费 20 亿"。）
- R&D World（2026-03-24）与 The Decoder（2026-03-21 标题）独立报道了同一说法。
- 链接：https://www.aol.com/news/jensen-huang-says-deeply-alarmed-040314321.html 、https://www.rdworldonline.com/nvidia-ceo-jensen-huang-says-spend-250k-on-ai-tokens-annually-or-hell-go-ape/

### Computex（台北，2026-06-02 当周）

- The Next Web（2026-06-02）转述，称出处是 Tom's Hardware：工程师每年应使用约一半年薪的 token。TNW 自己说没有逐字引文。**二手的二手**，不要用。

### 推算

- $250,000 ÷ 365 ≈ **$685/天**（按自然日）。若按 250 个工作日算则为 $1,000/工作日。后者带假设，片里用前者并写明。
- 比例：$250,000 ÷ $500,000 = 50% 薪资。

### 强度与注意

- **二手**：我读到的是媒体对原话的引用，没看视频或逐字稿，两处引文在 BI、R&D World、The Decoder 之间一致。
- 这是 CEO 的"期望/愿景"，不是 Nvidia 已执行的政策。中文站 noqta.tn 等把它写成"每位员工都已获得"，属夸大，**不要用**。
- 这与黄仁勋卖算力的商业利益相关（Nvidia 是卖硬件的）。

---

## 五、Meta "Claudeonomics"：公司榜单

- The Information 报道（约 2026-04-06 周一，这个日期是我从 Fortune 的发布日推的，原文没写），Fortune 2026-04-09 跟进：Meta 内部用户做了一个 token 排行榜，名字是 Claude 与 economics 的合成。
  - 覆盖 **85,000+** 员工，展示前 **250** 名；称号有 "Token Legend"、"Model Connoisseur"、"Cache Wizard"。
  - **30 天内合计 60.2 万亿 token**（Pragmatic Engineer 2026-04-23 引 The Information）；约 2.0 万亿/天（推算：60.2T ÷ 30）。
  - Gergely Orosz 的估算：按 Anthropic API 标价约 $9 亿，打折后可能 $1 亿以上。**这是他的估算，不是 Meta 的数字。**
  - 榜首用户 "averaged 281 billion tokens"（Fortune/Yahoo、The Decoder、People Matters 同句）。**口径不明**：Yahoo 转载的 Fortune 明说没写是日均还是 30 天均值。若是 30 天总量，约 9.4B/天（推算：281B ÷ 30）；若是日均，30 天就是 8.4T，占全公司 14%，不太可能。**不要在片中写成"每天"。**
  - Meta 对 Fortune 说："The employee took down the dashboard at their discretion; Meta did not request this action."
- 链接：https://the-decoder.com/meta-employees-compete-for-token-consumption-on-an-internal-ai-leaderboard/ 、https://finance.yahoo.com/sectors/technology/articles/meta-just-killed-dashboard-let-084400197.html 、https://newsletter.pragmaticengineer.com/p/the-pulse-tokenmaxxing-as-a-weird-6b2
- 强度：**二手**（原报道付费墙）。
- 旁证（均不给个人数字）：Pragmatic Engineer 称有员工空转 agent "刷榜"；Vonng 引到同样的说法；量子位 2026-06-02 称亚马逊因员工刷 token 取消了内部榜单（引自《金融时报》，原文未读，**未核实**）。

---

## 六、公司里的真实个人花费（Pragmatic Engineer，2026-10-20）

来源：https://newsletter.pragmaticengineer.com/p/whats-the-roi-of-software-engineers （我读到免费部分；公司基本匿名，来自读者投稿）。**二手**。

| 公司（匿名描述） | 人均月花费 | 备注 |
|---|---|---|
| 欧洲两人 .NET 公司（Ix Technologies） | 约 $3,000 | 表中最高人均；主要是 Claude Opus 和 GitHub Copilot |
| 约 100 人 AI SaaS，美国 | $2,000 额度 | 实际被当成硬上限 |
| 约 200 工程师的酒店科技公司 | $1,500 默认上限 | 9 月有一人花了 $2,200 |
| 量化交易公司，约 2,000 开发 | 约 $1,600 均值 | 1 月约 $80；总花费 1 月 $50 万/月、9 月 $800 万/月（约 16 倍，推算：800 ÷ 50） |
| 上市公司，约 5,000 开发 | 约 $1,000 均值 | 在考虑 $1,000 软上限 |
| 跨国公司，万人以上 | 约 $1,000 均值 | $4,000 硬上限，少有人接近 |

- 量化公司的人均上限是 **$25,000/月**；交易员是最大的用户群体。
- 文中说各公司 6-7 月用量见顶，之后在 API 计费的公司"roughly halved"。
- 同一作者 2026-04-23 那期：Salesforce 内部要求"至少 $170/月 token 否则被标记"，上限 $250（Claude Code）/ $170（Cursor）；数字在原文里有互相对不上之处（$100+$70 vs $170），我读不到付费部分，**未核实**。
- 价值：这是"普通到偏重的工程师"一档的最佳公开数据，数量级是**每月几千美元**，而不是 Steinberger 那种几十万。

---

## 七、个人自述的重度用户

### Tomasz Tunguz（Theory Ventures，风投合伙人，非工程师）

- 来源：https://tomtunguz.com/inference-as-compensation/ ，2026-02-17，他自己的博客。**已核实（一手）**（自述）。
- 原话："Within two quarters, my inference spend grew from $7,200 to $43,000 to over $100,000 run rate."
- 原话："$92 daily inference invoices started arriving."；"31 tasks a day at $12k annually."
- 摘要："My AI inference costs hit $100k annualized. Then I cut them 88% in a weekend."（迁移到开源模型，降到原成本的 12%。）
- 推算：$100,000 ÷ 365 ≈ $274/天；$92 × 365 ≈ $33,600/年。这两个数对应的时间点不同（他没给 $92 是哪一天），别混用。
- 他自述职业是 "Venture Capitalist at Theory Ventures"，但他自己搭 agent，算"半程序员"。**严格意义的非程序员重度用户，我没有找到有明确用量的已核实案例。**

### Vonng（冯若航，Pigsty 作者，中国开发者）

- 来源：https://blog.vonng.com/en/ai/tokenmaxxing/ ，2026-04-13。**已核实（一手）**（自述）。
- 原话："I have two MAX subscriptions myself, and I usually burn them close to the limit every week."
- 他算的账：约 $450/月买到约 $22,000 的算力，约 49 倍（推算：22,000 ÷ 450）。文中未说明测量方式（没提 ccusage）。
- 他写朋友 Jiang "burning hundreds of millions of tokens a day"（朋友的话，他转述，未核实）。
- 同文写 "someone there burned 210 billion tokens in a single week"（OpenAI），**无出处**，见第十节。

### Boris Cherny（Claude Code 创始工程师，Anthropic）

- 没有读到他本人的 token 数。36氪 2026-03 左右那篇写他"每天开 5 个终端标签，每天能提交 20-30 个 PR"，不含 token 数。
- 搜索摘要里有"自 3 月以来用了 80 亿 token"（据称 2026-06 Scale 的对谈），**只有搜索摘要，未核实**，不要用。

---

## 八、公开榜单（ccusage / viberank / ccgather / CostHawk）

**强度全部：未核实**。我读到了页面快照，但数据是用户自助提交的，无审计，且多为 ccusage 的"$ 等值"（口径警告 1）。

- **ccusage**（github.com/ryoppippi/ccusage）：README 无准确性承诺，价格取自 LiteLLM 价格表，支持 Claude Code 和 Codex 等；它自己没有榜单。
- **viberank**（https://www.viberank.app ，2026-10-22 读取，页面未标时间窗，疑为 "All"）：
  - 页头："1.3K developers"、"$19.5M tracked"、"25.2T tokens"。
  - 第 1 名 metalcorpe：$1,810,970.98 / 3.1T，标注 **"(under review)"**。
  - 第 2 名 B-EtterDigital：$480,071.26 / 521.1B。
  - 第 3 名 mattw90：$458,532.57 / 741.7B。
  - 第 4 名 StartupBros：$451,121.29 / 440.8B。
  - 第 5 名 dprvda：$429,190.18 / 513.5B。
  - 平均每人 $15,000（推算：$19.5M ÷ 1,300）。
  - 它是**累计**还是区间，我读不出来，所以**不能折算成每天**。
- **ccgather**（https://ccgather.com/leaderboard ，抓取时筛选为 30D）：
  - 榜首 michael-huffaker：98.7B token（$26.7K）。
  - 98.7B ÷ 30 ≈ **3.3B token/天**（推算）。
  - 同一榜单里 DHxWhy 是 $26.8K / 77.1B，榜首按 token 排而不是按美元排。
  - 页面显示 "Loading..." 占位，实时变动，快照时间未知。
- **CostHawk 匿名榜**（36氪转载 InfoQ，2026-06-01）：100 名 operator 合计约 4,159 亿 token，Claude Code 占 88.9%；榜首匿名用户 "LunarCircuit" 约 525 亿，窗口未说明。我直接抓 costhawk.ai 页面是空的，无法核对。**不要用榜首数。**
- viberank 的 HN 评论者本人也"later doubted"该榜，说明刷榜风险是公认的。

---

## 九、中国的个人与公司

### 个人自述（Linux.do，经 80AJ 转载；**二手**，原帖被 Cloudflare 拦截）

- "搞七捻三"，2026 年 1-5 月（80AJ 2026-06-13，原帖 https://linux.do/t/topic/2391875 ）：
  - 月度：1 月约 24.4 亿，2 月约 18.24 亿（原文称含假期及估算），**3 月 101.4 亿，4 月 234 亿**，5 月 4.91 亿（长假回落）。
  - 4 月日均约 7.8 亿（推算：234 亿 ÷ 30）。
  - 他的合计写 403.49 亿，但分月相加只有约 382.95 亿，差约 20.5 亿，原文没解释。**写总数时要么不用，要么注明不一致。**
  - 工具：Claude Code 与 OpenAI 相关模型；统计覆盖台式机、笔记本和云端。
  - 链接：https://www.80aj.com/2026/06/13/ai-programming-token-usage/
- 另一位开发者，一个月约 177 亿 token（80AJ 2026-10-06，原帖 https://linux.do/t/topic/2988391 ）：
  - 原话："开发过程累计消耗约177亿个gpt-6-astra ultra模式Token"。
  - 约 5.9 亿/天（推算：177 亿 ÷ 30）。
  - 没有统计方式、没有金额。
  - 链接：https://www.80aj.com/2026/10/06/ai-harness-token-burn/
- 一位用户在 Google Antigravity 上注册三个账号，七天约 24 亿 token（80AJ 2026-10-06，原帖 https://linux.do/t/topic/2986144 ），约 3.4 亿/天（推算：24 亿 ÷ 7）。免费额度，无花费。
- 一位开发者用 DeepSeek：峰值单日 5 亿 token，成本约 8-10 元/亿，单日支出"超过 32 元"（80AJ 2026-08-31，原帖 https://linux.do/t/topic/2799183 ）。注意：5 亿 × 8-10 元/亿 = 40-50 元，与"超过 32 元"并不一致，**二手且自相矛盾**。标题写"日均 5 亿"，正文是"高峰期单日"，**别写成日均**。
- Linux.do 一位用户实测 Claude Pro：Opus 连续对话烧完一个 5 小时窗口，约占周额度 14%，据此估 5 小时窗口约 1 亿 token、每周约 7 亿（80AJ 2026-09-23，原帖 https://linux.do/t/topic/2938401 ）。约 1 亿/天（推算：7 亿 ÷ 7）。是**理想缓存命中下的估算**、单人样本，Anthropic 没有公布官方 token 额度。**这是"订阅套餐能装下多少"的参考，不是实际消耗。**

### 公司级对照（不是个人）

- 豆包大模型日均 token：量子位 2026-04-02 称"已突破 120 万亿"，对比三个月前 63 万亿，作者在火山引擎武汉站现场获取，**非正式发布，二手**。链接：https://www.qbitai.com/2026/04/395202.html
  - 量级对照（推算）：120 万亿 ÷ 20.1B（Steinberger 日均）≈ 6,000 倍。
- 米哈游郑银河"某个 Agent 项目上线后一晚上烧掉 200 万元 token"：出自量子位 2026-06-02，**未注明场合与日期，未核实**。链接：https://www.qbitai.com/2026/06/427541.html

### 中国的 token 排行榜

- 没有找到公开的、个人级的**中文** token 排行榜，也没找到官方公众号或新华社发布的个人用量数据。
- 量子位 2026-03-11 那篇（OpenRouter 数据，上周中国大模型周调用 4.19 万亿 token）是**模型级**排名，不是用户级。
- 36氪的 CostHawk 榜单是国际匿名榜（见第八节）。

---

## 十、其他线索

### OpenAI DevDay 2025（2025-10-06）：百万亿级客户（公司，不是个人）

- Discuss 的新闻稿（GlobeNewswire，2025-10-13）：在 OpenAI 的 Token Milestones 名单里，"a total of 141 companies that have reached the 10 billion, 100 billion, and 1 trillion token milestones"。141 是三档合计，不是 1T 一档的数量。
- 虎嗅（陈伊凡，2025-11-02；快科技转载 2025-11-03）：称 OpenAI 在 10 月 DevDay"泄露"了 Top100+ 客户清单，其中**超过 30 家**破 1 万亿 token；文中点名 Cognition、Genspark、Perplexity、Duolingo、WHOOP、Read AI、Harvey、Decagon，另把 JetBrains、Salesforce、Zendesk、Ramp、Glean 归为 ToB 类客户，但**没有明确说每一家都过了 1T**。
- 虎嗅自己的估算（**不是 OpenAI 数字**）：按 GPT-5 价格、输入输出比 10:1，每家 1T token 费用在 6,000 万美元以上。
- Analytics India Magazine 那篇写"30 家公司和个人"，列了 Uber、Duolingo、Salesforce 等，但页面日期显示 2025-08-10（早于 DevDay），正文也不说出处，**日期与来源矛盾，不要用**。
- OpenAI 官网（openai.com/devday）返回 403，我没能读到原始名单。**OpenAI 自报，二手**。
- "给个人开发者发 token 奖牌"：没有找到任何来源。

### OpenAI 某员工一周 2100 亿 token

- 量子位 2026-03-23（作者梦晨）：原话"一位匿名员工，上周处理了2100亿Tokens，是全公司之最"，标题是"一人烧掉33个维基百科"。文中没有注明出自哪篇引用。链接：https://www.qbitai.com/2026/03/391061.html
- Vonng 的博客有同一说法且无链接。我没能找到原始出处，**未核实**。如果它是真的：210B ÷ 7 = 30B/天（推算），相当于 Steinberger 组织日均的 1.5 倍。
- 同一篇量子位还写："在隔壁Anthropic一位Claude Code用户单月账单超过15万美元"，**没有出处，未核实**。

### Geoffrey Huntley

- 线索"约 $10/小时"我没能核实。我读了他的 Ralph 博文（https://ghuntley.com/ralph/ ，2025-07-14）和 VentureBeat（2026-01-06），没找到小时价。
- 能核实的是另一句他嵌入博文的推文（2025-07-11）："Cost of a $50k USD contract, delivered, MVP, tested + reviewed with @ampcode. $297 USD." 这是一个第三方给他的 iMessage，价值是"外包价对 token 价"，不是个人用量。

---

## 最适合上片的

按"数字醒目 + 来源硬 + 能讲清楚"排序。

1. **Steinberger：30 天 603B token、$1,305,088.81、760 万次请求，约 200 亿 token/天。**
   - 强度最高：我读了他本人发的原图。
   - 能直接做成画面：CodexBar 那张截图的三个数。
   - 必须同屏讲清：这是 OpenAI 员工用 OpenAI 付费的组织账号，约 100 个云端 Codex，且含 fast mode 溢价，他称关掉可降 70%。
   - 片里的回答是"他在用 AI 干什么"：不是聊天，是 100 个 agent 轮流审每一个 PR、每一个 issue、每一次提交。

2. **Anthropic 自己：正常人每活跃日约 $13，而同一家公司说有人在 $200 套餐上用了"数万美元"（≥100 倍）。**
   - 一边是 Anthropic 官方文档，一边是 2025-07-28 的限额公告（<5% 用户受影响，推文一手）。
   - 要标"Anthropic 自己的数据"。逐字引文是二手，可在画面注明"据 Futurism 引述 Anthropic 推文"。

3. **黄仁勋：$50 万的工程师"至少烧 $25 万的 token，否则 deeply alarmed"（≈$685/天）。**
   - 引文简短有力，三家媒体一致，日期明确（GTC 2026-03-16；All-In 约 03-19）。
   - 片里加一句：这是卖 GPU 的人说的。

4. **Pragmatic Engineer 的公司账：一般工程师每月 $1,000-3,000，某量化公司人均 $80 涨到 $1,600，单人上限 $25,000/月。**
   - 数据新（2026-10-20），能补上"中间那一档"，避免全片只剩极端个例。
   - 缺点：匿名、二手。

5. **Meta 85,000 人、30 天 60.2 万亿 token 的 "Claudeonomics" 榜，几天后被下线。**
   - 讲"烧 token 变成了比赛"，配 Meta 那句 "took down the dashboard at their discretion"。
   - **别用榜首 281B**，口径不明。

6. **Tunguz：$7,200 到 $43,000 到 $100,000 年化，然后一个周末砍掉 88%。**
   - 一手，是我找到的最接近"非工程师重度用户"的例子（风投合伙人）。
   - 好处是它带了"怎么降"，能收到升华：烧得多不等于做得多。

7. **中国个人：一位开发者 4 月单月 234 亿 token（约 7.8 亿/天），另一位一个月 177 亿。**
   - 国内的真实个人尺度，量级在 Steinberger 的约 1/30（推算：7.8 亿 ÷ 200 亿 ≈ 1/26 到 5.9 亿 ÷ 200 亿 ≈ 1/34）。
   - 但全部是 Linux.do 自述、经 80AJ 转载，只能画"自述"并标二手；可与豆包日均 120 万亿（公司级）并排给尺度。

可选第 8：Vonng"$450/月买到约 $22,000 算力（约 49 倍）"，一手，适合讲订阅套餐的"套利"，但他本人说没测量。

**一条可直接画的阶梯（每天，美元，均为推算或自述，不同口径，片中必须加"口径不同"）：**

| 档位 | 每天 | 来源 |
|---|---|---|
| 企业均值 | 约 $13 / 活跃日 | Anthropic 官方文档 |
| 量化公司人均 | 约 $53（$1,600 ÷ 30，推算） | Pragmatic Engineer |
| Tunguz 峰值期 | 约 $274（$100,000 ÷ 365，推算） | 他自己的博客 |
| 黄仁勋的期望 | 约 $685（$250,000 ÷ 365，推算） | BI 引述 |
| Steinberger 组织 | 约 $43,500（推算） | 他自己的截图 |

---

## 不要用

- **"$13,200 花在一个 $200 账号上"**：HN 评论者自己说找不到原推，且怀疑 viberank。
- **Indie Hackers "一个月用了 $30,983、约 170 亿 token、$200 套餐"**：只有搜索摘要，原页被 Cloudflare 拦截，来源又是另一个榜（tokenflex.ing）。
- **viberank 榜首 metalcorpe $1.81M / 3.1T**：页面自己标了 "under review"。
- **ccgather 页面里的 User1-User5（$54K / 15.0B）**：是占位数据。
- **Meta 榜首"每天 281B"**：口径不明，不要写"每天"。
- **CostHawk 榜首 LunarCircuit 525 亿**：无时间窗，无法核对原榜。
- **OpenAI 员工"一周 2100 亿 token"**：无出处，两家转述互相引用或没有链接。
- **"Claude Code 用户单月账单超过 15 万美元"**：量子位无出处。
- **Boris Cherny"自 3 月起 80 亿 token"**：只有搜索摘要。
- **Geoffrey Huntley"约 $10/小时"**：未找到原文；能找到的只有"$50K 合同 $297"。
- **Steve Yegge、Simon Willison、Karpathy 的个人花费**：Yegge 的 Medium 页面 403；另两位本次没找到可核的原话。
- **黄仁勋"Nvidia 每年花 $20 亿 token"**：他只答了 "We're trying to"，是对记者的问句的回答，不是确认。
- **"每位 Nvidia 员工已获得年度 token 预算"（noqta.tn 等）**：主流媒体都写成愿景或招聘设想。
- **TNW 2026-06-02 的 Computex 转述**：二手的二手，没有逐字引文。
- **Levels.fyi "Apple 每天 $300 token 上限"**：来自 LinkedIn 帖，只在搜索摘要里看到。
- **Analytics India Magazine 的 "30 家公司和个人" 名单**：页面日期早于 DevDay，自相矛盾。
- **米哈游"一晚 200 万元"**：量子位无场合与日期。
- **Salesforce 的 $100/$70/$170 门槛**：原文数字自相矛盾，付费部分读不到。
- **任何"中文 token 个人排行榜"**：本次没有找到可用的。
- **"OpenAI 给个人开发者的 token 奖牌"**：没有来源。
- **所有"非程序员重度用户"**：没找到有明确用量的已核实案例，需要后续补查（等搜索额度恢复后，可查 Claude Cowork、ChatGPT 个人账号的自述）。
