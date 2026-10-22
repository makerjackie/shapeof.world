# 预测线研究底稿（strand 8）：谁说了什么、什么时候、凭什么假设

> 《AI 到底改变了什么》／世界的形状　收集日：2026-10-22　收集者：predictions 研究 agent
> 强度标签：已核实（一手）／已核实（二手一致）／自报／未核实／预测。凡"预测"一律写明 谁 + 何时 + 假设。
> 工具限制说明：本轮 WebSearch 共享额度中途耗尽，之后只能 WebFetch 直连。Metaculus、Axios、OpenAI、Goldman 官网直连 403/超时，已在第 7 节"未核实"逐条列出。
> 标注"推算"的数字是本收集者按已列增速做的算术，不是来源自己的预测。

---

## 0. 读法（给做片的人）

1. **预测扇形图 = 三条带，不是一条线**：①实验室带（最早，2026–2028，利益相关）；②外推带（METR / Epoch / AI Futures，2027–2031，依赖趋势延续）；③怀疑与经济带（2032 年以后或"数十年扩散"，GDP 增量以个位数百分比计）。三条带不矛盾，因为**它们预测的不是同一件事**：实验室说"能力"（AGI／强大 AI），经济学家说"扩散与生产率"。
2. **利益冲突要上屏**：本片作者是一个 Claude 模型。Dario Amodei 是 Anthropic CEO，Anthropic 卖这些模型（据 Epoch 报道，其年化收入 2026-07 底"据报"约 $650 亿）。Altman、Huang、Zuckerberg、Suleyman、Hassabis、Musk 同样是卖方或投资方。**卖方的"早"预测，和独立研究者（AI Futures、METR、Epoch、AI Impacts）的"早"预测要分开标。**
3. **"AGI"在不同人嘴里不是同一个东西**：Altman 2026-08 说的是"他自己称之为 AGI 的内部系统"；Huang 的"AGI 已实现"据二手用的是极窄定义；AI Futures 用 AC（自动化程序员）、TED-AI（顶尖专家级）；AI Impacts 问卷的 HLMI 是"所有任务比人类更好更便宜"。片中每个年份旁必须写定义。
4. **2027 是"众数"，不是"中位数"**：ai-2027.com 自述 "2027 was our modal (most likely) year at the time of publication, our medians were somewhat longer"。这是对"2027 年超级智能"最重要的纠偏。
5. **预测本身在漂移，而且双向漂移**：Metaculus 强 AGI 中位数 2022-03 约 2057 → 2023-03 2031-10 → 2025-02 约 2030 → 2026 年约 2033（先狂降后回摆）；AI Futures 的 AC 中位数 2025-12 后移（Daniel 2029 末／Eli 2032 年中），到 2026-08 又前移到 2027-11／2030-01。片子可以直接把"预测在动"当视觉。

---

## 1. 速查表

| 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|
| AI 2027 发表于 2025-04-03；"Race"结局里超人程序员 SC | 2027-03；超人 AI 研究员 2027-08；超智能 AI 研究员 2027-11；ASI 2027-12 | https://ai-2027.com | 已核实（一手），预测 |
| AI 2027 自述 2027 是众数不是中位数 | "2027 was our modal (most likely) year at the time of publication, our medians were somewhat longer." | https://ai-2027.com | 已核实（一手） |
| AI Futures 新模型（2025-12-31）比旧模型晚 | 完全编码自动化晚约 3–5 年；Eli 中位 2030 末 → 2032 年中；模型中位参数下 SC = 2031-12 | https://blog.aifutures.org/p/ai-futures-model-dec-2025-update | 已核实（一手），预测 |
| AI Futures Q1 2026（2026-04-02） | Daniel AC 中位 2029 末 → 2028 年中；Eli 2032 初 → 2030 年中；METR 倍增时间 Daniel 5.5→4 个月、Eli 5.5→4.5 个月 | https://blog.aifutures.org/p/q1-2026-timelines-update | 已核实（一手），预测 |
| AI Futures Q2.5（2026-08-16）p50 | Daniel：AC 2027-11／TED-AI 2028-11／ASI 2029-03；Eli：AC 2030-01／TED-AI 2032-07／ASI 2033-07 | https://blog.aifutures.org/i/211256047/daniel | 已核实（一手），预测 |
| AI 2027 对 2025 年的自评（2026-02-12，2026-07 更新） | 量化指标约为 AI 2027 的 65% 速度（区间 58–66%）；2026-07 更新约 75% | https://blog.aifutures.org/p/grading-ai-2027s-2025-predictions | 已核实（一手） |
| METR 论文 arXiv:2503.14499 版本 | v1 2025-03-18；v2 2025-03-30；v3 2026-02-25；**v4 2026-07-10** | https://arxiv.org/abs/2503.14499 | 已核实（一手） |
| METR 外推：1 个月任务（167 工作小时）50% 成功率 | "mid-2028 to mid-2031"（引言）；80% 区间 "mid-2028 to mid-2030"；沿 2024–25 趋势 "as soon as early 2027" | https://arxiv.org/html/2503.14499v4 | 已核实（一手），预测 |
| METR 倍增时间 | 全期 ~7 个月（207 天）；TH1.1：2023 后 131 天、2024 后 89 天 | https://metr.org/blog/2026-01-29-time-horizon-1-1/ | 已核实（一手） |
| Claude Mythos Preview（早期版）50% 时间地平线 | ≥16 小时（95% CI 8.5–55 小时）；METR 称 >16 小时不可靠，228 个任务仅 5 个≥16 小时（2026-05-08 更新） | https://startupfortune.com/metr-says-claude-mythos-is-testing-the-limits-of-ai-evaluation/ ；https://metr.org/time-horizons/ | 已核实（二手一致） |
| METR 对 Opus 4.6 的修正（2026-03-20） | 回归 bug 修复使近期模型 50% 地平线最多下降 20%；Opus 4.6 约 12 小时（11h59m）；仅私有任务 7h11m；不同拟合差约 1.5×（50%）至 2×（80%） | https://metr.org/notes/2026-03-20-impact-of-modelling-assumptions-on-time-horizon-results/ | 已核实（一手） |
| OpenAI 目标（2025-10-28 直播） | 2026-09 前"实习生级研究助手"；2028-03 "legitimate AI researcher"；Pachocki："less than a decade away from superintelligence" | https://techcrunch.com/2025/10/28/sam-altman-says-openai-will-have-a-legitimate-ai-researcher-by-2028/ | 已核实（二手一致），预测 |
| OpenAI 宣布实习生级达成（Engadget 2026-09-06 报道） | "a system that can carry out well-defined research tasks under human direction"；下一目标 "automated AI researcher by March of 2028" | https://tech.yahoo.com/ai/articles/openai-says-reached-goal-creating-192652493.html | 自报（OpenAI 原帖 403，无独立评估） |
| Altman TIME（2026-08-26） | "not quite yet"，年底内部会有他称之为 AGI 的系统；Astra "first model where the model actually invents new things in a way that matters" | https://time.com/article/2026/08/26/openai-sam-altman-interview/ | 已核实（一手，TIME 转述），预测 |
| GPT-6 Astra（2026-09-03 发布） | FrontierMath T4 约 97.6%（OpenAI 自报）；ARC-AGI-3：OpenAI 自家 harness 99.9% vs ARC Prize 标准 harness 62.7%，ARC Prize 称不主张 AGI；Artificial Analysis 指数 61，低于 Claude Fable 5.1 约 5 分 | https://thenextweb.com/news/jensen-huang-agi-has-arrived-gpt-6-astra ；https://aiweekly.co/alerts/openai-launches-gpt-6-astra-brockman-invokes-agi-era | 自报 + 已核实（二手一致） |
| Amodei《The Adolescence of Technology》（页面标注 2026-01） | "powerful AI could be as little as 1–2 years away"；"may be only 1–2 years away from a point where the current generation of AI autonomously builds the next"；50% 入门级白领岗位被冲击 "1–5 years" | https://www.darioamodei.com/essay/the-adolescence-of-technology | 已核实（一手），预测 |
| Amodei Davos（2026-01-20 前后，The Neuron 01-21 报道） | "We might be 6 to 12 months away from when the model is doing most, maybe all, of what software engineers do end-to-end." | https://www.theneuron.ai/explainer-articles/anthropics-dario-amodei-just-issued-ais-biggest-warning--from-the-company-leading-the-race | 已核实（二手），预测 |
| AI Impacts ESPAI（调查 2024-12，论文 2026-09） | HLMI 50% 年份（平均聚合）：2061（2016）→2059/2060（2022）→2047（2023）→**2042（2024）**；平均每过 1 年预测近 3.4 年；灭绝/永久失权概率均值 18%、中位 10% | http://aiimpacts.org/wp-content/uploads/2026/09/ESPAI2024.pdf | 已核实（一手） |
| AI Impacts 2023 调查（arXiv 2024-01-05） | HLMI 2047，比 2022 年的 2060 早 13 年；FAOL 2116（2022 为 2164）；2,778 人 | https://arxiv.org/abs/2401.02843 | 已核实（一手） |
| Metaculus 通用 AI（Q5121）社区中位 | ~2033（2026-02；2026-03-20 Toby Ord 发帖：80% CI 2026–2067；2026-07 快照 2033-01）；2029 前 25% | https://x.com/tobyordoxford/status/2035018758742315473 ；https://aitoolsreview.co.uk/insights/agi-timeline-predictions-2026 | 已核实（二手一致，Metaculus 直连 403）；当下实时值未核实 |
| Acemoglu | 10 年 TFP ≤0.66%（年化 ≈0.064%）；计入"难学任务"后 <0.53%；GDP +0.93%–1.16%（投资温和）／+1.4%–1.56%（大投资潮）；仅 4.6% 任务 10 年内可盈利自动化 | https://economics.mit.edu/sites/default/files/2024-05/The Simple Macroeconomics of AI.pdf | 已核实（一手） |
| 美国非农商业劳动生产率（BLS） | 2025 全年 +2.1%；2026Q2 同比 +2.2%、折年 +1.4%；2019Q4 以来周期均值 2.1%/年，等于 1947 年以来长期均值；BLS 无 AI 归因 | https://www.bls.gov/news.release/archives/prod2_09032026.htm | 已核实（一手） |
| 美国失业率 | 2026-09：4.2%，非农 +29,000 | https://www.bls.gov/news.release/empsit.nr0.htm | 已核实（一手） |
| IEA 数据中心电力 | 2024：415 TWh（1.5%）；2030：约 945 TWh；2035：700–1,700 TWh（基准约 1,200） | https://www.iea.org/reports/energy-and-ai/executive-summary | 已核实（一手），预测 |
| 四大云 2026 capex | 约 $7,250 亿，较 2025 约 $4,100 亿 +77%；2027 BofA／Evercore 预期 >$1 万亿；Moody's 更宽口径 2026 $7,850 亿、2027 近 $1 万亿 | https://aiweekly.co/alerts/amazon-microsoft-alphabet-meta-plan-725b-ai-capex-in-2026 ；https://datacenterdynamics.com/en/news/moodys-hyperscaler-capex-forecasts-marked-up-by-85bn-to-close-in-on-1trn-by-2027/ | 已核实（二手一致），预测 |
| 训练算力趋势 | 前沿模型训练算力 5×/年（90% CI 4–6×，自 2020）；训练成本 3.5×/年；最大数据中心近 1 GW、约 $380 亿/GW | https://epoch.ai/trends （2026-02-05 更新） | 已核实（一手） |
| Epoch 2030 | 集群成本 >$1,000 亿；训练 ~1e29 FLOP；吉瓦级电力；2028 前电力不是瓶颈 | https://epoch.ai/blog/what-will-ai-look-like-in-2030 （2025-09-16） | 已核实（一手），预测 |
| AI 公司收入 | OpenAI 年化 ~$130 亿（2025-08）→ >$400 亿（2026-08）；Anthropic $10 亿→$90 亿（2025 内）→据报 $650 亿（2026-07 底）；两家合计 2026 年内 $300 亿→$1,050 亿（3.5×） | https://epoch.ai/gradient-updates/an-update-on-ais-most-important-number | 已核实（一手；Anthropic 为"据报"） |
| Stanford AI Index 2026（约 2026-04-13） | SWE-bench Verified 一年内 60%→近 100%；OSWorld 12%→约 66%；美国 2025 私营 AI 投资 $2,859 亿；组织采用 88% | https://hai.stanford.edu/ai-index/2026-ai-index-report | 已核实（一手） |
| IMO 2025 金牌 | 2025-07-21：Gemini Deep Think 35/42，自然语言、4.5 小时内；2024 年为银牌，需形式化并耗时数天 | https://deepmind.google/discover/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/ | 已核实（一手） |
| MIT NANDA "95%" | "95% of organizations are getting zero return"；企业投入 $300–400 亿；样本 52 机构访谈 + 153 高管问卷 + 300 公开项目；报告自述 "directionally accurate based on individual interviews" | https://mlq.ai/media/quarterly_decks/v0.1_State_of_AI_in_Business_2025_Report.pdf | 已核实（一手），样本小、自述方向性 |
| METR 开发者 RCT | 2025：任务耗时 +19%（CI +2%～+39%，即更慢）；2026-02 新研究：耗时变化 −18%／−4%（即更快，CI 跨 0），METR 称证据"very weak"且有选择偏差 | https://metr.org/blog/2026-02-24-uplift-update/ | 已核实（一手） |
| Penn Wharton | AI 使生产率与 GDP 2035 年 +1.5%、2055 年近 +3%、2075 年 +3.7% | https://budgetmodel.wharton.upenn.edu/issues/2025/9/8/projected-impact-of-generative-ai-on-future-productivity-growth | 已核实（一手），预测 |
| IMF（2024-01-14） | 全球近 40% 岗位暴露；发达经济体约 60%；新兴市场 40%、低收入国家 26% | https://www.imf.org/en/Blogs/Articles/2024/01/14/ai-will-transform-the-global-economy-lets-make-sure-it-benefits-humanity | 已核实（一手） |

---

## 2. 预测总表（forecast table）

| 谁 | 日期 | 预测了什么 | 目标年份 | 假设／备注 | 原文链接 |
|---|---|---|---|---|---|
| Sam Altman（OpenAI CEO，卖方） | 2025-01（《Reflections》，页面无日期，据媒体为 01-05） | "confident we know how to build AGI as we have traditionally understood it"；2025 年 AI agent 可能"join the workforce" | AGI 无年份；agent 2025 | "按传统定义"；下一目标超级智能 | https://blog.samaltman.com/reflections |
| Sam Altman | 2025-06（《The Gentle Singularity》，页面无日期，据媒体为 06-10） | 2026 "systems that can figure out novel insights"；2027 "robots that can do tasks in the real world"；2030s 智能与能源"wildly abundant" | 2026／2027／2030s | 假设自我改进回路持续、算力与电力扩张 | https://blog.samaltman.com/the-gentle-singularity |
| OpenAI（Altman＋Pachocki） | 2025-10-28 | 2026-09 实习生级研究助手；2028-03 "legitimate AI researcher"；深度学习"不到十年"可达超级智能 | 2026-09／2028-03／<2035 | Altman 措辞 "plausible"；内部目标 | https://techcrunch.com/2025/10/28/sam-altman-says-openai-will-have-a-legitimate-ai-researcher-by-2028/ |
| Sam Altman | 2026-02-14（TreeHacks） | "If you are a sophomore now, you will graduate into a world with AGI in it" | 约 2028–2029（大二学生毕业年） | 口头预测，无定义 | https://stanforddaily.com/2026/02/15/sam-altman-agi-treehacks-keynote/ |
| Sam Altman | 2026-08-26（TIME） | 现在"not quite yet"，年底内部会有他称之为 AGI 的系统 | 2026 年底 | 自定义标签；OpenAI 章程定义 AGI 为 "highly autonomous systems that outperform humans at most economically valuable work"；依赖 Astra | https://time.com/article/2026/08/26/openai-sam-altman-interview/ |
| Dario Amodei（Anthropic CEO，卖方） | 2024-10（《Machines of Loving Grace》） | 强大 AI "could come as early as 2026"；之后生物学可把 50–100 年进步压缩到 5–10 年 | 2026 最早 | 文中明确也可能"much longer" | https://www.darioamodei.com/essay/machines-of-loving-grace |
| Dario Amodei | 2025-03-10（CFR） | 3–6 个月内 AI 写 90% 代码；12 个月内"essentially all" | 2025-06~09；2026-03 | 口头；"I think" | https://www.cfr.org/event/ceo-speaker-series-dario-amodei-anthropic |
| Dario Amodei | 2025-05-28（Axios） | 半数入门级白领岗位被取代、失业率 10–20%，"一到五年"；"Cancer is cured, the economy grows at 10% a year, the budget is balanced — and 20% of people don't have jobs." | 2026–2030 | 若社会/政府不预警（The Decoder 转述；Axios 原文 403） | https://www.the-decoder.com/?p=24130 |
| Dario Amodei | 2026-01（《The Adolescence of Technology》） | 强大 AI "as little as 1–2 years away"；AI 自主造下一代 AI 可能只差 1–2 年；"country of geniuses ... in ~2027"；50% 入门级白领岗位被冲击 1–5 年 | 2027–2028 | "country of geniuses" 是 "suppose" 式思想实验；他承认 AI 目前"likely not"在大规模取代岗位 | https://www.darioamodei.com/essay/the-adolescence-of-technology |
| Dario Amodei | 2026-01 下旬（Davos） | "6 to 12 months away from when the model is doing most, maybe all, of what software engineers do end-to-end" | 2026-07~2027-01 | 条件：端到端，"most, maybe all" | https://www.theneuron.ai/explainer-articles/anthropics-dario-amodei-just-issued-ais-biggest-warning--from-the-company-leading-the-race |
| Demis Hassabis（Google DeepMind CEO，卖方） | 2026-05（Axios，Computerworld 05-28 转述） | AGI "around 2030, plus or minus a year"，2029 有可能；社会只有几年准备期 | 2030±1 | 二手转述；另有二手报道称他认为光靠现有 LLM 不够 | https://www.computerworld.com/article/4178398/deepmind-ceo-agi-could-be-here-in-three-years.html |
| Elon Musk（xAI/SpaceX，卖方） | 2026-06（X 回复 Diamandis，Yourstory 06-22 报道） | "AI probably exceeds the sum of all human intelligence in 4 or 5 years" | 2030–2031 | 单一来源；其 2024 年曾称 2025/2026 年超越任何单个人（二手，未核实） | https://yourstory.com/ai-story/elon-musk-ai-smarter-humanity-4-years |
| Mark Zuckerberg（Meta，卖方） | 2025-07-30（《Personal Superintelligence》） | "Developing superintelligence is now in sight" | 无年份 | 二手引述（Meta 页面抓取不到该句） | https://siliconangle.com/2025/07/30/zuckerberg-outlines-metas-vision-ai-superintelligence/ |
| Jensen Huang（NVIDIA，卖算力） | 2026-09-06（X） | "AGI has arrived"（祝贺 OpenAI GPT-6 Astra；"400K GPUs coming online next"）；2026-03 Lex Fridman 称 "I think we've achieved AGI"（二手，窄定义，未核实） | 2026 | 宣告而非预测；ARC Prize 同日称不主张 AGI | https://thenextweb.com/news/jensen-huang-agi-has-arrived-gpt-6-astra |
| Mustafa Suleyman（Microsoft AI CEO，卖方） | 2026-02（FT 访谈，二手转述） | "most of those tasks will be fully automated by an AI within the next 12 to 18 months"（坐电脑前的白领任务） | 2027-02~2027-08 | 二手；FT 原文未抓 | https://www.techspot.com/news/111306-ai-could-wipe-out-most-white-collar-jobs.html |
| Andrej Karpathy（独立） | 2025-10-17（Dwarkesh） | "It's the decade of agents"；"If I just average it out, it just feels like a decade to me." | 约 2035 | 凭"15 年看预测"的直觉；瓶颈：持续学习等 | https://www.dwarkesh.com/p/andrej-karpathy |
| 吴泳铭 Eddie Wu（阿里 CEO） | 2025-09-24（云栖） | "Achieving AGI ... now appears inevitable"；"AI will not stop at AGI; it will march toward ASI"；三阶段：学习人类→辅助人类→自我迭代超越人类 | 无年份 | 只给投资时间表：未来 5 年全球累计投资 ">4 trillion"（原文币种未确认）、阿里 3 年 3,800 亿元 | https://www.chinatalk.media/p/alibabas-agi-prophecy |
| 梁文锋（DeepSeek） | 2024-07（36Kr/Waves，ChinaTalk 2024-11-27 英译） | "It could be two, five, or ten years–in any case, it will happen in our lifetimes." | 2026–2034 | 2026 年最新表态：未收集 | https://www.chinatalk.media/p/deepseek-ceo-interview-with-chinas |
| AI 2027（Kokotajlo 等，独立非营利） | 2025-04-03 | SC 2027-03；SAR 2027-08；SIAR 2027-11；ASI 2027-12 | 2027（众数） | 情景而非中位数预测；假设 AI 研发加速反馈 | https://ai-2027.com |
| Daniel Kokotajlo（AI Futures） | 2026-08-16（Q2.5） | AC p50 2027-11；TED-AI 2028-11；ASI 2029-03 | 2027–2029 | METR 倍增 ~4 个月；编码提速（uplift）中位 2×；收入 "10x for every 15 ECI points" | https://blog.aifutures.org/i/211256047/daniel |
| Eli Lifland（AI Futures） | 2026-08-16（Q2.5） | AC p50 2030-01；TED-AI 2032-07；ASI 2033-07 | 2030–2033 | 自述"本能是因未知的未知把预测推后" | https://blog.aifutures.org/i/211256047/daniel |
| METR（Kwa 等） | 2025-03（v4 2026-07-10） | 1 个月（167 工时）任务 50% 成功率：mid-2028 至 mid-2031；80% 区间 mid-2028 至 mid-2030；沿 2024–25 趋势可早到 early 2027 | 2027–2031 | 趋势延续、外部效度存疑 | https://arxiv.org/html/2503.14499v4 |
| Epoch AI（Owen，受 Google DeepMind 委托） | 2025-09-16 | 2030：约 1e29 FLOP 训练运行、集群 >$1,000 亿、吉瓦级电力；任务内生产率提升 10–20% | 2030 | 当前增长趋势延续；Epoch 称收入到"数千亿"是 extreme | https://epoch.ai/blog/what-will-ai-look-like-in-2030 |
| AI Impacts 研究者问卷（1,580 人） | 2026-09 发表（调查 2024-12） | HLMI 50% = 2042；灭绝/永久失权概率均值 18% | 2042 | HLMI = "所有任务比人类更好更便宜"；响应率 10%；固定年份提问比固定概率提问给出更晚的答案 | http://aiimpacts.org/wp-content/uploads/2026/09/ESPAI2024.pdf |
| Metaculus 社区 | 2026-02～2026-08 | 通用 AI 中位 ~2033（25% 在 2029 前；80% CI 2026–2067）；weakly general AI 中位 2028-06 | 2033／2028 | 定义含机器人能力；预测者池小 | https://x.com/tobyordoxford/status/2035018758742315473 |
| Gary Marcus（怀疑派） | 2025-12-20 | "We won't get to AGI in 2026 (or 7)."；"Human domestic robots like Optimus and Figure will be all demo and very little product." | 2026–2027 | 另有与 Miles Brundage 的 2027 年底赌局（二手摘要：AI 能做 10 个任务中的 8 个则 Marcus 捐 $2,000，否则对方捐 $20,000） | https://garymarcus.substack.com/p/six-or-seven-predictions-for-ai-2026 |
| Narayanan & Kapoor | 2025-04-15 | "Diffusion occurs over decades, not years."；通常意义的"超智能"概念不自洽 | 数十年 | AI 是"normal technology" | https://knightcolumbia.org/content/ai-as-normal-technology |
| Daron Acemoglu | 2024-05-12 | 10 年 TFP ≤0.66%、GDP +0.93–1.16% | 约 2034 | 基于任务暴露与 Hulten 定理；2023–24 年证据 | 见速查表 |
| Penn Wharton | 2025-09-08 | 生产率/GDP 2035 年 +1.5% | 2035 | 模型情景 | 见速查表 |
| Goldman Sachs（2023-03，经 Acemoglu 论文引述） | 2023-03 | 10 年内全球 GDP +7%（约 $7 万亿）、美国生产率增速每年 +1.5 个百分点 | 约 2033 | 官网 403；数字来自 Acemoglu 论文引述（二手） | https://economics.mit.edu/sites/default/files/2024-05/The Simple Macroeconomics of AI.pdf |
| McKinsey（2023，经 Acemoglu 论文引述） | 2023 | 生成式 AI 可贡献 $17.1–25.6 万亿；发达经济体年 GDP 增速 +1.5–3.4 个百分点（含其他自动化） | 未来十年 | 二手；官网抓取超时 | 同上 |

---

## 3. 慢了 vs 早了（slipped vs arrived-early）

### 3.1 慢了／没兑现／目标后移

| # | 预测 | 谁、何时、目标 | 现实与后续 | 强度 |
|---|---|---|---|---|
| S1 | AI 2027：SC 2027-03 | Kokotajlo 等，2025-04-03 | 作者自己后移：Eli 的 SC 中位 2030 → 2025-12 的 AC 中位 2032 年中（约 +2.5 年）；新模型整体晚 3–5 年；Daniel AC 中位 2026 年初为 2029 末（后又前移，见 E7） | 已核实（一手） |
| S2 | Amodei："三到六个月 AI 写 90% 代码" | 2025-03-10，目标 2025-06~09 | 未见行业口径的 90% 实测；Anthropic 自报（2025-12-02，n=132）：工程师"60% 的工作用 Claude、自报 50% 提效"，无"代码占比"数字；Amodei 2026-01 改口为"6–12 个月内模型端到端做 most, maybe all 的软件工程工作"；2026 年文章写"all or almost all of the code for some people — including engineers at Anthropic" | 已核实（一手/二手），目标后移、部分兑现 |
| S3 | Amodei：失业率 10–20%（1–5 年） | 2025-05-28 | 2026-09 美国失业率 4.2%、非农 +29,000；Amodei 2026-01 自己写这"likely not"在发生；窗口至 2030 仍未到期 | 已核实（一手）；预测尚未到期 |
| S4 | Musk：AI 2025/2026 年超过任何单个人 | 2024（二手） | 2026-06 改说"超过全人类总和 4–5 年（≈2030–31）" | 二手；2024 说法未核实 |
| S5 | GPT-5 当作 AGI 的预期 | 2025-08 发布 | Marcus（2025-08-09）："Loads of people seemed to sincerely expect GPT-5 was going to be AGI."；评价 "just the latest incremental advance"；METR TH1.1 下 GPT-5 约 214 分钟（3.6 小时），低于 Opus 4.5 的 320 分钟 | 已核实（一手） |
| S6 | Metaculus weakly general AI | 2023-03 预测 2026-01；2024-01 预测 2026-04-14 | 2026-02 同类问题中位 2028-06（注：可能是"仅认知"另一道题；是否已判定未核实） | 已核实（二手）；定义变动 |
| S7 | Metaculus 强 AGI 中位 | 2022-03 约 2057 → 2023-03 2031-10 → 2024-01 2031-01 → 2025-02 约 2030 | 2026 年约 2033（回摆约 3 年） | 已核实（二手一致） |
| S8 | AI 2027：SWE-bench Verified 2025 年中 85% | 2025-04 | 实际最佳 74.5%（Opus 4.1）；OpenAI 估值 $5,000 亿比预测晚约 4 个月（2025-10 vs 2025-06） | 已核实（一手） |
| S9 | 开发者感觉 vs 实测 | METR RCT 2025 | 实测任务耗时 +19%（更慢），开发者高估 AI 对自己耗时的影响约 40 个百分点；2026 年复测因选择偏差证据很弱 | 已核实（一手） |
| S10 | 企业 AI 回报 | MIT NANDA 2025-08 | "95% 零回报"（仅限定制企业试点、52 次访谈、方向性）；同时 >90% 公司的员工在用个人 AI 工具 | 已核实（一手）；样本小 |

### 3.2 早了／比专家预期快

| # | 预测 | 谁、何时、目标 | 现实与后续 | 强度 |
|---|---|---|---|---|
| E1 | AI 拿 IMO 金牌 | Christiano 2022-02-26：2025 前约 8%；Yudkowsky：至少 16%（赌局） | 2025-07-21 Gemini Deep Think 35/42，自然语言、4.5 小时内；赌局 2025 年判"是"；2024 年还是需要形式化与数天的银牌 | 已核实（一手） |
| E2 | Metaculus 一年降 26 年／17 年 | 2022-03 → 2023-03：强 AGI mid-2057 → 2031-10；weak AGI 2042-10 → 2026-01 | ChatGPT/GPT-4 冲击；The Decoder 2023-03-26 | 已核实（二手） |
| E3 | 研究者问卷 HLMI | 2022：2059/2060 → 2023：2047 → 2024 年底：2042 | 平均每过一年，预测近 3.4 年；调查者自己的论文标题 "sooner than we thought" | 已核实（一手） |
| E4 | METR 时间地平线 | 2025-03 论文：Claude 3.7 Sonnet 约 50 分钟，倍增 ~7 个月 | 2026-02/03 Opus 4.6 约 12 小时；Mythos ≥16 小时；倍增（TH1.1）2023 后 131 天、2024 后 89 天。**推算**：按 7 个月倍增，50 分钟（2025-02）到 2026-02 约 2.7 小时，实测约 12 小时，高约 4 倍（METR 强调置信区间极宽、>16 小时不可靠） | 已核实（一手）+ 推算 |
| E5 | SWE-bench Verified／OSWorld | AI Index 2026 | 一年内 60% → 近 100%；12% → 约 66% | 已核实（一手） |
| E6 | OpenAI"实习生级研究助手 2026-09" | Altman 2025-10-28 | 2026-09-06 宣布达成（准时；自报、无独立评估） | 自报 |
| E7 | AI Futures 时间线再前移 | Daniel AC 中位：2029 末（2026 初）→ 2028 年中（2026-04）→ 2027-11（2026-08）；Eli：2032 年中 → 2030 年中 → 2030-01 | Q2.5："Our timelines haven't changed much (they got slightly shorter)"；Q1："if events in reality continue to go roughly 65% as fast as they go in AI 2027, then AC will be achieved in 2028" | 已核实（一手） |
| E8 | AI 收入 | AI 2027 预测 2025 年 $180 亿 | OpenAI 年化约 $200 亿（略超）；2026 年内两家合计 3.5×（$300 亿→$1,050 亿） | 已核实（一手） |
| E9 | capex 年年上调 | 2026 指引多次上调（Meta $115–135B → $125–145B） | 但"上调中约 60% 来自芯片/HBM 涨价"，不全是更多算力 | 已核实（二手一致） |

---

## 4. 分节：原话（英文原文＋中文翻译）与出处

### 4.1 实验室领袖

**Sam Altman**
- "We are now confident we know how to build AGI as we have traditionally understood it."　→ "我们现在有信心，知道如何按传统意义上的理解来构建 AGI。"（《Reflections》，2025-01）https://blog.samaltman.com/reflections
- "We believe that, in 2025, we may see the first AI agents 'join the workforce' and materially change the output of companies."　→ "我们认为，2025 年我们可能看到第一批 AI agent '加入劳动力'，并实质改变公司产出。"（同上）
- "2026 will likely see the arrival of systems that can figure out novel insights." "2027 may see the arrival of robots that can do tasks in the real world."　→ "2026 年很可能出现能得出新颖洞见的系统。""2027 年可能出现能在现实世界完成任务的机器人。"（《The Gentle Singularity》）https://blog.samaltman.com/the-gentle-singularity
- "We are past the event horizon; the takeoff has started."　→ "我们已越过事件视界；起飞已经开始。"（同上）
- 2025-10-28 直播："we think it is plausible that by September of next year, we have an intern-level AI research assistant"（Engadget 引述）→ "我们认为，到明年 9 月拥有一个实习生级别的 AI 研究助手是有可能的。"2028 年目标：automated AI researcher by March 2028。https://tech.yahoo.com/ai/articles/openai-says-reached-goal-creating-192652493.html
- 2026-09-06 OpenAI 宣布达成：定义为 "a system that can carry out well-defined research tasks under human direction"（在人类指导下完成界定清楚的研究任务）。**措辞极窄。**
- 2026-08-26 TIME：Altman 称现在"not quite yet"，年底内部会有他称之为 AGI 的系统；对 Astra："I expect this will be the first model where the model actually invents new things in a way that matters"（"我预计这会是第一个真正以有意义的方式发明新东西的模型"），称之为 "a very AGI-like thing"。https://time.com/article/2026/08/26/openai-sam-altman-interview/

**Dario Amodei（利益冲突：Anthropic CEO；本片作者是 Claude 模型）**
- "...we are not far from the world—I think we'll be there in three to six months—where AI is writing 90 percent of the code."　→ "……我们离那个世界不远——我想三到六个月内就会到——AI 写 90% 的代码。"（CFR，2025-03-10）https://www.cfr.org/event/ceo-speaker-series-dario-amodei-anthropic
- "And then in twelve months, we may be in a world where AI is writing essentially all of the code."　→ "再过十二个月，我们可能进入 AI 写下基本全部代码的世界。"（同上）
- "Cancer is cured, the economy grows at 10% a year, the budget is balanced — and 20% of people don't have jobs."　→ "癌症被治愈，经济每年增长 10%，预算平衡——同时 20% 的人没有工作。"（Axios 2025-05-28，经 The Decoder 引述）https://www.the-decoder.com/?p=24130
- 2026-01《The Adolescence of Technology》：AI "could displace half of all entry-level white collar jobs in the next 1–5 years"；"That's why my prediction for 50% of entry level white collar jobs being disrupted is 1–5 years."；"may be only 1–2 years away from a point where the current generation of AI autonomously builds the next"；"suppose a literal 'country of geniuses' were to materialize somewhere in the world in ~2027"。→ "可能在未来 1–5 年内取代一半入门级白领岗位。""可能只差 1–2 年就到当前一代 AI 自主造出下一代的地步。""假设一个字面意义上的'天才之国'在 ~2027 年出现在世界某处。" https://www.darioamodei.com/essay/the-adolescence-of-technology
- 同文承认有读者以为他在说"AI 现在就在取代岗位"（"thought I was claiming AI is displacing jobs right now"），他同意现在很可能还没发生。
- Davos（2026-01）："We might be 6 to 12 months away from when the model is doing most, maybe all, of what software engineers do end-to-end."　→ "我们可能离模型端到端完成软件工程师大部分、甚至全部工作只差 6 到 12 个月。" https://www.theneuron.ai/explainer-articles/anthropics-dario-amodei-just-issued-ais-biggest-warning--from-the-company-leading-the-race

**Demis Hassabis**：2026-05 Axios 访谈，Computerworld 转述："around 2030, plus or minus a year"（约 2030 年，前后一年），2029 有可能，社会只有几年来准备。https://www.computerworld.com/article/4178398/deepmind-ceo-agi-could-be-here-in-three-years.html（逐字引语来自二手转述，Axios 原文 403）。2026-01 Davos 同台："I think we're going to see this year the beginnings of maybe impacting the junior level entry level kind of jobs."（今年可能开始看到对初级岗位的影响）——The Neuron 转述。

**Elon Musk**："AI probably exceeds the sum of all human intelligence in 4 or 5 years."（约 2030–31；X 回复，Yourstory 2026-06-22）。其"超过人类"口径已多次后移，见 S4。

**Mark Zuckerberg**（2025-07-30）："Developing superintelligence is now in sight."→"开发超级智能，现在已在视野之内。"无年份。https://siliconangle.com/2025/07/30/zuckerberg-outlines-metas-vision-ai-superintelligence/

**Jensen Huang**：2026-09-06 在 X 上写 "AGI has arrived"，同帖称 OpenAI 用 10 万+ Grace Blackwell 训练 Astra、"400K GPUs coming online next"；ARC Prize 同日：OpenAI 自家 harness 99.9%、标准 harness 62.7%，称"不主张 AGI"。（NVIDIA 卖算力。）https://thenextweb.com/news/jensen-huang-agi-has-arrived-gpt-6-astra

**Mustafa Suleyman**（FT，2026-02，二手）："most of those tasks will be fully automated by an AI within the next 12 to 18 months"→"大多数这类任务将在未来 12 到 18 个月内被 AI 完全自动化"（指坐电脑前的律师、会计、项目经理等）。https://www.techspot.com/news/111306-ai-could-wipe-out-most-white-collar-jobs.html

**Andrej Karpathy**（Dwarkesh，2025-10-17）："It's the decade of agents."；"I feel like the problems are tractable, they're surmountable, but they're still difficult. If I just average it out, it just feels like a decade to me."→"我觉得这些问题可解、能克服，但依然很难。平均下来，感觉就是十年。"https://www.dwarkesh.com/p/andrej-karpathy

**中国**
- 吴泳铭（2025-09-24）："Achieving AGI—an intelligent system with general human-level cognition—now appears inevitable."（实现 AGI——具备人类通用认知水平的智能系统——如今看来已不可避免。）"AI will not stop at AGI; it will march toward ASI"。三阶段：Emergence of Intelligence / Autonomous Action / Self-Iteration。**没有给出 AGI/ASI 年份**；只给投资时间表。https://www.chinatalk.media/p/alibabas-agi-prophecy（2026-09 云栖大会再谈 RSI 与 5–10 万亿参数模型，仅见搜索摘要，未取一手。）
- 梁文锋（2024-07，Waves）："It could be two, five, or ten years–in any case, it will happen in our lifetimes."→"可能是两年、五年或十年——总之会在我们有生之年发生。"https://www.chinatalk.media/p/deepseek-ceo-interview-with-chinas
- 李彦宏及其他中国领袖 2026 年表态：本轮未收集（搜索额度耗尽），列入未核实。

### 4.2 趋势外推

**METR**
- 论文摘要："extrapolation of this trend predicts that within 5 years, AI systems will be capable of automating many software tasks that currently take humans a month."（外推该趋势预测，5 年内 AI 系统将能自动化许多目前人类需要一个月的软件任务。）
- 引言："Naively extrapolating the trend in horizon length implies that AI will reach a time horizon of >1 month (167 work hours) between mid-2028 and mid-2031."；第 5 节："If future progress instead follows the 2024–2025 trend, 1-month AI would arrive sooner, with half the probability in 2027 and even late 2026."　https://arxiv.org/html/2503.14499v4
- **时间地平线 = 人类完成该任务要多久，模型 50% 成功；不是模型连续工作多久。**
- **推算（本收集者算术，非 METR 结论）**：以 Mythos 2026-03 测得 ≥16 小时为起点，达到 167 小时需再翻 3.4 倍：倍增 89 天 → 约 10 个月（约 2027-01）；131 天 → 约 14.6 个月（约 2027-05）；207 天 → 约 23 个月（约 2028-02）。起点不确定性（CI 8.5–55 小时、>16 小时不可靠、拟合方式差约 35%）会把区间再拉宽。
- TH1.1 页面（2026-01-29）自己承认："even our Time Horizon 1.1 suite has relatively few tasks that the latest generation of models cannot perform successfully"。metr.org/time-horizons 页面带有"不再积极更新（2026-09-08）"的自述，细节未能完整核实。METR 2026 年研究列表（1–8 月）中没有新的外推论文。

**Epoch AI**
- 《What will AI look like in 2030?》（David Owen，2025-09-16，受 Google DeepMind 委托）："On current trends, the clusters used for training frontier AI would cost over $100B by 2030."；训练运行约 1e29 FLOP；吉瓦级电力；电力 2028 前不是瓶颈；公开文本数据够用到至少 2027；任务内生产率 10–20% 增益；"few if any drugs approved for sale by 2030 will have benefited from today's AI tools"。https://epoch.ai/blog/what-will-ai-look-like-in-2030
- 《Can AI scaling continue through 2030?》（2024-08-20）："2e29 FLOP training runs will likely be feasible by 2030"；单园区 1–5 GW 可支持 1e28–3e29 FLOP；跨地区分布式 2–45 GW 可支持 2e28–2e30 FLOP；电力最先卡脖子。https://epoch.ai/blog/can-ai-scaling-continue-through-2030
- 趋势页（2026-02-05）：训练算力 5×/年（4–6×）、训练成本 3.5×/年。https://epoch.ai/trends
- 《Is a compute crunch coming?》（2026-05-25）：推理容量每年 >3×，但需求约 10×/年，"可能已超过供给"；St. Louis Fed 估计 AI 相关投资贡献 2025 前三季度美国实际 GDP 增速约 1 个百分点、近 40%。https://epoch.ai/gradient-updates/is-a-compute-crunch-coming
- 《An update on AI's most important number》（2026-08-27）：OpenAI、Anthropic 收入增速。作者自己说"年年三倍、约六年追上今天的世界经济"是 "not really a reasonable forecast"。https://epoch.ai/gradient-updates/an-update-on-ais-most-important-number

### 4.3 AI 2027 及其修订

时间线（全部出自 AI Futures Project 官方页面）：
1. 2025-04-03　AI 2027 发表：SC 2027-03 …… ASI 2027-12；页面注明 "2027 was our modal (most likely) year at the time of publication, our medians were somewhat longer"（2027 是众数，中位数更晚）；页面补注 "adjusting for outside of model factors gave us slightly longer medians, e.g. Eli's was 2030"。
2. 2025-12-31　AI Futures Model：Eli "lengthened timelines (median from late 2030 to mid 2032)"；Daniel "keep the median the same, but increase the uncertainty in both directions"；模型"predicts longer timelines to full coding automation than our previous model by about 3-5 years"。https://blog.aifutures.org/p/ai-futures-model-dec-2025-update
3. 2026-02-12　自评：量化指标约 65% 速度；SWE-bench Verified 落后（预测 85% vs 实际 74.5%），收入略超。https://blog.aifutures.org/p/grading-ai-2027s-2025-predictions
4. 2026-04-02　Q1：Daniel AC 中位 late 2029 → mid 2028；Eli early 2032 → mid 2030；"if events in reality continue to go roughly 65% as fast as they go in AI 2027, then AC will be achieved in 2028"（若现实继续以 AI 2027 约 65% 的速度推进，AC 将在 2028 年实现）。https://blog.aifutures.org/p/q1-2026-timelines-update
5. 2026-08-16　Q2.5：见速查表；"Our timelines haven't changed much (they got slightly shorter)"；"Coding uplift is our favorite method"；"Empirically, revenue has grown by 10x for every 15 ECI points so far."

FutureSearch（AI 2027 时间线预测的共同作者之一）2025-10-19 文章（2026-03-30 更新）：Daniel "median was 2028, now it's slipped to 2029"；Eli 约 2032、2027 年前 AGI 概率 15–20%；Karpathy 称自己的时间线比硅谷圈"悲观 5–10 倍"，但仍比怀疑派乐观。https://futuresearch.ai/blog/ai-2027-6-months-later

**旧说法修正**：搜索摘要里"Kokotajlo 把自主编码推到 2030 年代初、超智能约 2034"出自 2026-01 初媒体对 2025-12 更新的转述，**后来 2026-04 与 2026-08 两次更新又前移**。片中不要只放"推迟"那一版。

### 4.4 预测市场与调查

- **Metaculus 通用 AI（Q5121，"first general AI system"）**：2022-03 约 mid-2057；2023-03 2031-10（The Decoder 2023-03-26）；2024-01-02 2031-01-26（LessWrong）；2025-02-04 "around the middle of 2030"（四分位 2026-12-28 与 2039-03-27，Forecasting AI Futures substack）；2026-02 约 2033；2026-03-20 约 2033、80% CI 2026–2067（Toby Ord 发帖）；2026-07 为 2033-01，2029 前 25%（aitoolsreview，页面日期自相矛盾：标题 10 月、署名 7 月 15 日）。→ 前三个来源彼此一致；后三个来自聚合页/社交帖，Metaculus 官方页 403。
- **weakly general AI（Q3479）**：2023-03 预测 2026-01；2024-01 预测 2026-04-14；2026-02 为 2028-06（"cognitive-only"另一问法，见 S6）。
- **2020 年**：用户简报称"~2050s"；HackerNoon（2026-04-22）称"roughly 2070"、veracalloway 称"fifty years out"。三者冲突，**不要写具体年份，写"当时约半个世纪后"**；2022 "~2040"本轮未找到来源，未核实。
- **其他市场**：Manifold（2025-02，RemNi）"2028 前 AGI"47%、"2030 前"63%；Kalshi "OpenAI 2030 前 AGI"约 55%（2026-04）；Polymarket "OpenAI 2027 前宣布 AGI"约 9%（2026-07）——后两者来自聚合页，二手；市场里的"OpenAI 宣布"与"AGI"是两回事。
- **AI Impacts 研究者问卷**：见速查表。2024 年底 1,580 人；固定年份 vs 固定概率提问存在稳定框架效应（固定年份给出更晚答案）；灭绝/永久失权概率中位 10%、均值 18%。

### 4.5 怀疑派与经济范围

**Acemoglu**（2024-05-12）："no more than a 0.66% increase in total factor productivity (TFP) over 10 years"（10 年 TFP 增幅不超过 0.66%）；"even more modest ... less than 0.53%"；GDP "0.93% - 1.16% over the next 10 years"；大投资潮下 1.4%–1.56%。原文自称 "nontrivial but modest"。**未发现 2025–26 的修订数值**（2025-01 Economic Policy 接收稿摘要未变，据 MIT DSpace 记录）。

**Gary Marcus**：2025-08-09 GPT-5 评："Pure scaling simply isn't the path to AGI."；"GPT-5 is just the latest incremental advance."；2025-12-20 的 2026 预测见预测表。Marcus 自称其 2025 年 17 个高置信预测中 16 个应验（自报，来自二手摘要，未逐条核）。

**Yann LeCun**：2026-03-09 AMI Labs 融资 $10.3 亿、估值 $35 亿（TechCrunch、SiliconANGLE 等一致）；AMI 声明 "real intelligence does not start in language. It starts in the world."（是公司声明，不是 LeCun 个人逐字语录）。**他的具体时间表与"LLM 是死路"语录本轮没有拿到可靠一手来源**（一次抓取返回了疑似不可信内容，已弃用），见未核实。

**Narayanan & Kapoor**（2025-04-15）："Diffusion occurs over decades, not years."

**Jim Covello／Goldman**（2024-06-25，Global Macro Research 第 129 期，"Gen AI: too much spend, too little benefit?"）：二手摘要称其认为"eighteen months after generative AI's introduction, no truly transformative, cost-effective application had been found"，并提到"超过 $1tn" capex；官方 PDF 未抓。

**MIT NANDA 批评点**：样本小（52 访谈、153 问卷）；"95%"指"定制企业 AI 试点没有可衡量 P&L 影响"；报告自己写"These figures are directionally accurate based on individual interviews"；同一报告发现"shadow AI"：>90% 公司有员工经常用个人 AI 工具。外界批评文章本轮未取到可引的一手，**不要写成"被证伪"，写成"口径窄、样本小"**。

**乐观侧**：Goldman 2023（+7% 全球 GDP；"300M 岗位暴露"本轮未核实）、McKinsey 2023（$2.6–4.4 万亿/年，本轮抓取超时未核实）、IMF 2024-01（40% 暴露）、Penn Wharton 2025-09（2035 年 +1.5%）。

**测得的现实**：BLS 2025 年全年劳动生产率 +2.1%，2019Q4 以来均值 2.1%/年——**与 1947 年以来长期均值相同**；BLS 称其通过软件资本"implicitly captures AI use"，**但无 AI 归因**。劳动份额 52.8% 为序列最低（BLS 称 "the lowest level in the series"，口径未说明）。AI 相关投资本身对 GDP 增速贡献约 1 个百分点（St. Louis Fed 经 Epoch 转述，2025 前三季度）——那是投资，不是生产率。可信的 AI 生产率归因研究本轮未找到；METR 2026-05-11 自报调查（n=349，2–4 月）：自报价值 1.4–2×、速度中位 3×，METR 自己说是自我感知、可能高估。

---

## 5. 预测扇形图数据（2027／2030／2035：低／中／高，谁、凭什么）

原则：**每个数字带来源与假设；没有来源的格子写"—"，不要补。**"推算"= 本收集者按所列增速的算术。

### 5.1 AGI／自动化程序员（能力）

| 带 | 数字 | 谁／何时 | 假设与定义 |
|---|---|---|---|
| 低（最早，卖方） | 2026 年底（内部系统） | Altman，TIME 2026-08-26 | 自定义"AGI"；Astra |
| 低（卖方） | 2027（"country of geniuses"思想实验；SWE 端到端"6–12 个月"=2026-07~2027-01） | Amodei，2026-01 | 条件式；Anthropic 卖模型 |
| 低（独立） | AC p50 2027-11；TED-AI 2028-11；ASI 2029-03 | Daniel Kokotajlo，2026-08-16 | AC=自动化程序员；METR 倍增 ~4 个月；编码提速 2× |
| 中 | 约 2030（±1） | Hassabis，2026-05（二手） | 定义为"AGI" |
| 中 | AC p50 2030-01；TED-AI 2032-07；ASI 2033-07 | Eli Lifland，2026-08-16 | 同上，更多"未知的未知" |
| 中 | 通用 AI 中位约 2033；25% 在 2029 前；80% CI 2026–2067 | Metaculus 社区，2026 年多个快照 | 四条件定义（含机器人） |
| 高（专家） | HLMI 50% = 2042 | 1,580 位研究者，调查 2024-12 | "所有任务比人类更好更便宜"；趋势每年近 3.4 年 |
| 高（独立） | 约 2035（"a decade"） | Karpathy，2025-10-17 | 凭直觉 |
| 反方 | 2026–2027 内不会有 AGI | Marcus，2025-12-20 | 与 Brundage 2027 年底赌局 |
| 反方 | 扩散以"数十年"计 | Narayanan & Kapoor，2025-04-15 | 不用 AGI 时间点框架 |

### 5.2 METR 时间地平线（50% 成功率，达到 1 个月任务 = 167 工时）

| 带 | 年份 | 谁 | 假设 |
|---|---|---|---|
| 低（早） | 约 2027-01（推算，89 天倍增）；论文 "early 2027 if 2024–25 trend continues" | 本推算；METR 论文 | 起点 Mythos ≥16 小时（CI 8.5–55 小时） |
| 中 | 约 2027-05（推算，131 天）；论文 80% 区间 mid-2028 至 mid-2030 | 本推算；METR 论文 v4 | 论文用 2025 数据口径，"naively extrapolating" |
| 高（晚） | 约 2028-02（推算，207 天）；论文 "mid-2031" | 本推算；METR 论文 | 原论文 7 个月倍增 |
| 2030／2035 | —（测量套件 >16 小时即不可靠，无可比数据） | | |

### 5.3 前沿训练算力与成本

| 年份 | 低 | 中 | 高 | 来源与假设 |
|---|---|---|---|---|
| 2027 | — | 趋势 5×/年继续 | — | Epoch trends：5×/年（4–6×）；2027 绝对值无来源 |
| 2030 | 单园区 1–5 GW：1e28–3e29 FLOP | 约 1e29–2e29 FLOP；集群 >$1,000 亿 | 分布式 2–45 GW：2e28–2e30 FLOP | Epoch 2024-08／2025-09；电力先成瓶颈 |
| 2035 | — | — | — | 无来源 |

### 5.4 全球数据中心用电（TWh）

| 年份 | 低 | 中 | 高 | 来源与假设 |
|---|---|---|---|---|
| 2024（实测） | | 415（占全球 1.5%） | | IEA |
| 2030 | — | 约 945 | — | IEA 基准；AI 是最大增长驱动 |
| 2035 | 700 | 约 1,200 | 1,700 | IEA 各情景（低/高端对应哪一情景，页面未明说） |

### 5.5 大厂资本开支（美元/年，四大云）与 AI 公司收入

| 量 | 年份 | 低 | 中 | 高 | 来源与假设 |
|---|---|---|---|---|---|
| 四大云 capex | 2025（实际） | | 约 $4,100 亿 | | aiweekly 汇总 |
| 同上 | 2026 | | 约 $7,250 亿（公司指引） | 更宽口径 $7,850 亿（Moody's，含 Oracle、CoreWeave）；有分析师估 $8,000–9,000 亿 | 约 60% 的上调来自芯片/HBM 涨价 |
| 同上 | 2027 | 近 $1 万亿（Moody's 更宽口径） | >$1 万亿（BofA、Evercore） | — | Alphabet："will increase significantly" |
| 同上 | 2030 | — | McKinsey 2025-04 约 $6.7 万亿累计数据中心（其中 AI 约 $5.2 万亿）；Morgan Stanley 2025 约 $2.9 万亿（2025–28） | | **未核实**：本轮抓取超时，取自训练记忆 |
| OpenAI＋Anthropic 年化收入 | 2026-08（实测） | | $1,050 亿（OpenAI >$400 亿；Anthropic 据报 $650 亿） | | Epoch |
| 同上 | 2027-08（推算） | $2,100 亿（增速降到 2×） | $3,150 亿（3×） | $3,700 亿（3.5×） | 以 Epoch 报告的 2026 年内 3.5×、历史 3–4× 为基；Epoch 本人只给过条件情景"若 >$3,000 亿" |
| 同上 | 2030／2035 | — | — | — | 无来源；Epoch 称"年年三倍六年追上世界经济"不是合理预测 |

### 5.6 经济影响与岗位

| 量 | 低 | 中 | 高 | 来源与假设 |
|---|---|---|---|---|
| 10 年 GDP 水平效应（至约 2034–35） | +0.93%～+1.16%（Acemoglu；TFP 0.53–0.66%） | +1.5%（Penn Wharton，2035） | 全球 +7%（Goldman 2023，二手）；发达经济体年 GDP 增速 +1.5–3.4 个百分点（McKinsey 2023，二手） | Acemoglu 上界 1.4–1.56%（大投资潮）；假设：任务暴露、成本节省、投资响应 |
| 极高情景 | | | 10 年 GDP +100%（Korinek–Suh "baseline"，经 Acemoglu 脚注引述）；Amodei "10% a year" | 需 AGI 级能力 |
| 美国劳动生产率（实测） | | 2025 +2.1%；2026Q2 同比 +2.2% | | BLS；无 AI 归因 |
| 岗位暴露 | 4.6% 任务 10 年内可盈利自动化（Acemoglu） | 全球约 40%、发达经济体约 60%（IMF 2024-01） | 半数入门级白领被冲击（Amodei，1–5 年，2025-05 起算）；失业率 10–20% | "暴露"≠"被取代"；2026-09 失业率 4.2% |

---

## 6. 比听起来弱的说法（上片前请降调）

1. **Altman "年底内部会有 AGI"**：是他"称之为 AGI"的内部系统，不是外部验证的 AGI；他本人说"not quite yet"。Brockman 的原话（二手）是 "not unreasonable to feel that we are now in the AGI era"，并承认 AGI 无公认定义。ARC Prize 同日明说不主张 Astra 是 AGI；同一模型在 ARC-AGI-3 上 OpenAI 自家 harness 99.9% vs 标准 harness 62.7%，差距来自脚手架，不是模型权重。
2. **OpenAI "实习生级研究助手已达成"**：定义是"在人类指导下完成界定清楚的研究任务"；自报，无独立评估；原帖 403 未读到。
3. **Huang "AGI has arrived"**：卖算力的人，在 OpenAI 发布后第三天发的祝贺帖；2026-03 Lex Fridman 版本据二手用的是"能创办并运营十亿美元公司"这一窄定义。
4. **Amodei "2027 天才之国"**：原文是 "suppose a literal 'country of geniuses' were to materialize ... in ~2027"，是思想实验，不是日期承诺；"50% 入门级白领岗位 1–5 年"是"disrupted（被冲击）"，他自己写现在很可能还没有发生。"90% 代码 3–6 个月"后来被他自己改成"6–12 个月内 most, maybe all，端到端"。**他的公司卖这些模型。**
5. **Zuckerberg "超级智能在视野内"**：没有年份；我们只有二手引述。
6. **Hassabis ~2030**：是中心估计（±1 年），二手来源另说他强调现有路线可能不够，并非"2030 一定有"。
7. **METR "≥16 小时"**：是下限（"at least"）；CI 8.5–55 小时；228 个任务只有 5 个≥16 小时；修 bug 后近期模型最高下调 20%，不同拟合方式再差约 35%；地平线是"人类要多久"，不是"AI 能自主干多久"；50% 成功率，不是可靠。
8. **AI 2027 "2027"**：是情景和众数，作者中位数更晚；之后作者自己多次修订（见 4.3）。SC/AC 是"超人程序员／自动化程序员"，不是 AGI。
9. **Metaculus ~2033**：80% 区间 2026–2067；定义含机器人能力；预测者池小，LessWrong（2024-01-02）曾指出两道相关题互相不一致（差 57 个月 vs 另一市场 25.8 个月）。
10. **MIT NANDA "95%"**：限定制企业试点，52 次访谈＋153 份问卷，自己说"directionally accurate"。
11. **Goldman "+7% GDP"**：是 10 年累计水平效应，约每年 +0.7%；**IMF "40% 暴露"**：暴露含"被增强"，不等于被取代；**Acemoglu**：不是零，是 0.5–1.2% 量级，且基于 2023–24 的任务暴露数据，早于 agent 时代。
12. **Epoch 2030 数字**：是"趋势延续则可行"的可行性分析，不是预言；收入"数千亿"被 Epoch 自己称为 extreme。
13. **capex**：2026 年上调中约 60% 是涨价；$7,250 亿是公司指引的汇总，口径来自二手。
14. **自报提效**：METR 调查（中位 1.4–2× 价值、3× 速度）与 Anthropic（60% 工作用 Claude、+50%）都是自评；METR RCT 实测一度更慢（+19% 耗时），2026 年复测被选择偏差污染。

---

## 7. 未核实（逐条）

1. **Metaculus 当下（2026-10）的实时数字**：官网与 API 403。2026-02～08 的 ~2033 来自 Toby Ord 帖（2026-03-20）与聚合页（aitoolsreview 页面日期自相矛盾；skynetcountdown 标 2026-02；howcloseisagi 标 2026-08 为 2033），彼此一致，但不是实时值。howcloseisagi 另有"经济 AGI 2031（80% CI 2027–2044），2026-09-10 复核"，口径不同，未取一手。
2. **Metaculus 2020 年与 2022 年的值**：用户简报的"2020 ~2050s、2022 ~2040"与找到的来源冲突或缺失（见 4.4），未写具体年份。
3. **OpenAI 2026-09 官方帖**（openai.com/index/research-acceleration-view-inside-openai/）403；只有 Engadget 经 Yahoo 的转述。
4. **Hassabis、Suleyman、Amodei-Axios 的原文**：Axios、FT 原文未读；引语来自 Computerworld、TechSpot、The Decoder、The Neuron 转述。
5. **Zuckerberg 信中"now in sight"原句**：Meta 页面抓取不到该句，引用 SiliconANGLE 转述。
6. **Altman 两篇博文的发布日期**：页面无日期；2025-01-05 与 2025-06-10 取自常识性媒体日期，本轮未页内核实。
7. **Huang 2026-03 Lex Fridman "I think we've achieved AGI" 与 NVIDIA 财报电话会说法**：仅来自搜索摘要中的二手，未取访谈文本或财报稿。
8. **Musk 的 2026-06 说法**：单一来源（Yourstory）；2024 年"2025/2026 超越个人"的旧说法仅见于搜索结果标题，未取原文。
9. **LeCun 的时间表与"LLM 是死路"语录**：未取得可靠一手；2025-11 离开 Meta 的时间点本轮未核实（TechCrunch 2026-01-23 只说"after he left Meta"）。
10. **李彦宏／梁文锋 2026 更新／Kai-Fu Lee 等其他中国领袖**：搜索额度耗尽，未收集。
11. **Goldman 2023 的 300M 岗位、McKinsey 2023 的 $2.6–4.4 万亿/年、McKinsey 2025 的 $6.7 万亿／Morgan Stanley $2.9 万亿**：官网 403 或超时；Goldman +7%／1.5pp 与 McKinsey $17.1–25.6 万亿仅有 Acemoglu 论文的引述。
12. **Goldman 2025–27 三年 capex $1.15 万亿**：与"2026 年一年四大云 $7,250 亿"明显矛盾（搜索摘要来源），已弃用。
13. **MIT NANDA 的外部方法批评文章**：未取到可引的一手批评。
14. **Covello／Goldman 2024-06 报告原文**：未取 PDF；只有二手摘要。
15. **AI 在美国生产率里的可信归因**：未找到；BLS 明说无；St. Louis Fed 的 ~1pp 是投资拉动 GDP，不是生产率。
16. **METR 时间地平线页面"不再更新"的细节，以及 2026-07 之后是否有新测量**：只看到页面一句自述，未找到 2026-07~09 新测量。
17. **AI Impacts 2024 问卷里 FAOL 数字与"2030 前"概率**：PDF 前 6 页读到摘要与引言（HLMI 2042），表格未逐页核。
18. **"Claude Mythos"、"Claude Fable 5.1"、"GPT-5.6 Sol"等 2026 模型名与得分**：来自 METR 更新页与二手汇总，非本 strand 重点，只作背景。
19. **Marcus–Brundage 赌局条款与 Marcus "16/17" 自评**：来自二手摘要，未回到 Marcus 原帖逐条核。

---

## 8. 建议的扇形图结构（给设计）

- **纵轴**：同一问题的"达成年份"；**横轴**：发表时间（2022–2026）。画三条随时间漂移的线：Metaculus 强 AGI（2057→2031→2030→2033）、AI Impacts HLMI（2061→2060→2047→2042）、AI Futures AC（Daniel：2029 末→2028 中→2027-11）。**三条线都在 2023–2025 下沉，之后分歧：Metaculus 回摆，AI Futures 先后移后前移。**
- **扇形（预测一栏）**：2027／2030／2035 三个竖切面，每个切面写"谁说的＋假设"。2027：Amodei、Altman、Daniel；2030：Hassabis、Eli、Musk；2035：Karpathy、Metaculus 80% 区间、IEA 用电、Penn Wharton GDP。
- **每条预测卡片必含**：谁／何时说／说了什么（原文）／目标年份／假设／强度标签／是否卖方。
- **收尾（升华）**：这些数字里只有一类是"已经发生的事实"——收入翻倍、基准饱和、用电与 capex 上升；另一类是"尚待证明的预测"——AGI、失业、GDP。把预测摆在事实旁边，让观众自己看到差距。
