# 调研 00：上片数字总表（逐条复核）

复核日期：2026-10-22。`01`–`06` 是分头收集的底稿，这一份只收进片子的数字。每一条都由主线（Opus）亲自打开原始页面、PDF 或逐字稿复核过，标"二手"的除外。

## 读法

- **强度**：
  - **一手**：读到原始页面、年报 PDF、逐字稿或论文。
  - **二手**：只读到媒体转述，屏上要标"据报道"。
  - **推算**：自己算的，屏上标"推算"，算式写在这里。
- **利益冲突**：本片用 Claude 制作。Anthropic 讲自己的数字，屏上标"Anthropic 自己的数据"。其他公司讲自己的数字，标"公司称"或"自报"。

## 速查表

| 场景 | 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|---|
| S02 | AI 推翻 Erdős 单位距离猜想，9 位数学家人工核验 | 9 位作者；arXiv 2605.20695，2026-05-20；摘要原话 "human-verified version of the recent OpenAI-generated counterexample" | arXiv | 一手 |
| S02 | 猜想提出年份 | 1946 | Erdős, On sets of distances of n points, 1946 | 一手（常识级文献） |
| S05 | Steinberger 30 天用量 | 603B token；$1,305,088.81；7.6M 次请求；约 100 个 Codex；三人；OpenAI 付费；关 Fast 模式省 70% | 本人截图（经 01 底稿读图）；The Decoder 2026-05-16 | 一手（截图）/ 二手（Decoder） |
| S05 | 他每天 | 约 $43,500；约 200 亿 token | 1,305,088.81 ÷ 30；603B ÷ 30 | 推算 |
| S05 | 企业开发者平均 | 约 $13 / 活跃日；90% 低于 $30 | code.claude.com/docs/en/costs | 一手，Anthropic 自己的数据 |
| S06 | 1 个汉字 ≈ 0.6 token | "1 Chinese character ≈ 0.6 token" | api-docs.deepseek.com | 一手 |
| S06 | 《红楼梦》字数 | 724,619 字（120 回，Project Gutenberg #24264，不含标点） | 02 底稿自数 | 推算 |
| S06 | 一天 ≈ 4.6 万部 | 20.1B ÷ (724,619 × 0.6) = 46,232 | | 推算 |
| S07 | 豆包日均 token | 2024-05：1,200 亿 → 2026-06：超 180 万亿，"两年间涨幅达 1500 倍"（谭待，FORCE 大会 2026-06-23） | 同花顺转财联社 | 二手（多家一致） |
| S07 | 豆包中间点 | 2025-09 底：超 30 万亿；2026-03：超 120 万亿 | 第一财经、IT之家；新华社 2026-04-03 | 二手 |
| S07 | 每秒约 4,800 部《红楼梦》 | 1.8×10¹⁴ ÷ 86,400 ÷ 434,771 = 4,792 | | 推算 |
| S07 | Google 每月 token | 两年前 9.7 万亿；现超 3.2 千万亿（"7x"） | blog.google I/O 2026，2026-05-19 | 一手，公司称 |
| S07 | 中国全国日均 | 超 140 万亿（2026-03），2025 年底 100 万亿 | 新华社 2026-03-24，国家数据局刘烈宏 | 二手（新华社） |
| S08 | 工商银行 | AI 数字员工承担工作量 5.5 万人年；员工 409,758 人 | 工行 2025 年报（2026-03-28），pdftotext 检索 | 一手，自报 |
| S08 | 平安 | AI 坐席服务量约 17.02 亿次，覆盖 80% 客服总量 | 平安 2025 年报（2026-03-27） | 一手，自报 |
| S08 | 摩根大通 | "more than 65,000 CIB colleagues actively use LLM Suite" | JPM 2025 条线致股东信 | 一手，自报 |
| S08 | Kaiser Permanente | 7,260 名医生；2,576,627 次就诊；2023-10 至 2024-12；医生可审改 AI 草稿 | KP 研究部 2025-04-01 | 一手 |
| S08 | 英国 Consult | 5 万多份；约 2 小时；£240；专家复核 22 小时；与专家一致约 83%，两组专家彼此 55% | GOV.UK 2025-10-16 | 一手 |
| S08 | 深圳福田 | 70 名 AI 数智员工（2025-02-18）；裁决书核实后一键生成"全程不超过 4 分钟"，手工"4 小时以上" | 深圳政府在线；新华社 2025-02-20 | 一手 |
| S09 | Kosmos | 最长 12 小时；平均每次 42,000 行代码、1,500 篇论文；79.4% 陈述准确 | arXiv 2511.02824 | 一手，自报 |
| S09 | AlphaFold | 300 万+ 研究者；190+ 国家 | DeepMind 2025-11-25 | 一手，自报 |
| S09 | 费马大定理 Lean 证明 | 11 天，基本自主；1,300 万行 Lean；约 60 亿输出 token；数学本身不新，新的是验证 | anthropic.com 2026-09-04 | 一手，Anthropic 自己的数据 |
| S09 | Harvey | "80% of Am Law 100 law firms use Harvey"；$5.5 亿 @ $155 亿 | harvey.ai 2026-09-09 | 一手，自报 |
| S09 | 科大讯飞 | 日均批改作业超 360 万份；教师助手服务超 80 万名教师 | 讯飞 2025 年报 | 一手，自报 |
| S09 | 世界银行尼日利亚 | 6 周；+0.31 SD（英语单科 0.23）；约 1.5–2 年常规教学 | PRWP 11125（04 底稿读原文） | 一手（工作论文，未同行评议） |
| S10 | Netflix | 2025-07："10x faster"；2026-07：约 300 部作品用过生成式 AI 流程；17 分钟素材快一倍、成本减半 | Netflix 电话会逐字稿 PDF | 一手，公司称 |
| S10 | 快手可灵 | 2025-12 月收入超 2,000 万美元，年化 2.4 亿美元 | 快手 2025 年度业绩公告（港交所） | 一手，自报 |
| S10 | fly.pieter.com | 2025-02-22 开工，17 天年化收入 100 万美元；"my first vibe coded game" | levels.io | 一手，本人自报 |
| S10 | Base44 | 8,000 万美元现金；成立 6 个月；8 名员工；创始人 Maor Shlomo；2026-03 年化收入 1 亿美元 | TechCrunch 2025-06-18；Wix SEC 6-K | 二手 / 一手 |
| S10 | Manus | 年化收入破 1 亿美元，上线 8 个月，105 人 | manus.im 2025-12-17 | 一手，自报 |
| S10 | Deezer | 每天近 9 万首全 AI 曲目；高峰日超一半上传；只占播放 1–3% | Deezer 2026-07-21 | 一手 |
| S11 | John Deere | 2025 季超 500 万英亩；除草剂平均少用近 50%；约 3,100 万加仑 | Deere 新闻稿，HPJ 转载 2025-11 | 二手（转载全文） |
| S11 | 美的 | 员工自建 13,500 个智能体，效率提升超 1,500 万工时，降本 7 亿元 | 美的 2025 年报（港交所） | 一手，自报 |
| S11 | 海尔 | 空调样机测试调整周期 15 天 → 7 天 | 海尔 2025 年报致股东信 | 一手，自报 |
| S11 | Gallup 教师 | 6 成用过；32% 每周用；每周用者自估省 5.9 小时/周，约一学年 6 周；2,232 名教师 | Gallup 2025-06-24 | 一手 |
| S11 | 医院账单 | $195,000；Claude（另用 ChatGPT）；最终 $33,000（MeinMMO）或 $37,000（Gigazine） | 媒体转述 2025-10 | 二手，金额不一 → 屏上只写"砍掉八成" |
| S13 | Anthropic 工程师 | 能"完全交给 Claude"的工作 0–20% | anthropic.com 2025-12-02 | 一手，Anthropic 自己的数据 |
| S13 | Klarna | 2024-02：230 万次对话、相当于 700 名全职；2025-05：员工约 5,000 降到近 3,000，CEO 称要重新招真人客服 | Klarna 新闻稿；CNBC 2025-05-14 | 一手 / 二手 |
| S13 | AI 病历 RCT | 238 名医生；Nabla −9.5%（95% CI −17.2 至 −1.8）；DAX −1.7%（不显著） | NEJM AI 2025-12，Europe PMC 摘要 | 一手（摘要） |
| S13 | AI 幻觉进法庭 | 2,202 起；律师 872 起（截至 2026-10-19） | Charlotin 数据库 | 一手 |
| S14 | Gallup 美国在职者 | 52% 一年几次以上；30% 每周几次以上；15% 每天（2026-05） | Gallup 指标页 | 一手 |
| S14 | CNNIC | 7 亿+ 用户，普及率超 50%（2026 上半年）；76.0% 让它回答问题 | CNNIC 2026-10-08 | 一手 |
| S15 | OpenAI 10-06 发布 | 372 份重要证明声明；涉及 25 道 Erdős 题，21 道有 Lean；PDF 共 1,347 页 | Bloom，erdosproblems.com 2026-10-08 | 一手 |
| S15 | Bloom 原话 | "I have not yet looked at in any serious way any of the proofs in this release." | 同上 | 一手 |
| S15 | 题库暂停收稿 | "I will freeze new problem comments and proof claims"；原因 "a wave of AI-produced solutions provided with no explanation"（2026-10-06） | erdosproblems.com blog:9 | 一手 |
| S16 | C 编译器 | 16 个 agent；近 2,000 次会话；两周；不到 $20,000；20 亿输入 + 1.4 亿输出 token；10 万行；能构建可启动的 Linux 6.9（x86/ARM/RISC-V）；"task verifier is nearly perfect"；无自己的汇编器、链接器 | anthropic.com 2026-02-05 | 一手，Anthropic 自己的数据 |
| S17 | Cursor | 峰值约每小时 1,000 次提交，1,000 万次工具调用，连跑一周，多数运行峰值数百个 agent；研究项目，不对外 | cursor.com 2026-02-05 | 一手，自报 |
| S17 | Kimi K3 | "In a single 48-hour autonomous run, K3 built, optimized, and verified the chip" | kimi.com 2026-07 | 一手，自报 |
| S17 | Hashimoto | 每天最后 30 分钟启动 agent | mitchellh.com 2026-02-05 | 一手（见 ai-era/02） |
| S17 | Cherny | 30 天 259 个 PR、497 次提交；"Every single line was written by Claude Code + Opus 4.5" | Simon Willison 转引，2025-12-27 | 二手（转引原帖） |
| S18 | 高手 vs 新手 | 约 40 万会话、23.5 万人；每条提示 5 vs 12 个动作；验证成功 15% vs 28–33%；放弃 19% vs 5–7% | anthropic.com 2026-06-16 | 一手，Anthropic 自己的数据，观察性 |
| S20 | IMO 2025 | Gemini Deep Think 35/42，6 题解 5，IMO 协调员官方评分 | DeepMind 2025-07-21 | 一手 |

## 不进片的

01–06 底稿里标了"不要用"的条目，片里都不用。另外这几条主动放弃：

- **AHM 声明"拒绝 OpenAI 的说法"**：AHM 是 Association for Human Mathematics，页面没有成员数和签名数，不能写成"数学家集体拒收"。
- **Rosie 的狗疫苗**：只有二手，且非治愈、单例。
- **Penda Health**：方向是"AI 检查医生"，和本片的题、答、阅结构相反，放进来容易误读。
- **Levels 的 Photo AI（月收入 10.5 万美元）**：原文没说代码是 AI 写的。
- **Base44 "约 1.5 亿美元 ARR"**：Wix 6-K 里只核到 1 亿。
