# 05 能源线：AI 到底吃了多少电，电从哪来，谁在付账

> 《AI 到底改变了什么》第 5 条线（能源）。采集日：2026-10-22。时间轴：ChatGPT 发布（2022-11-30）至今，再接带标签的预测。
> 状态：v1 完整稿。说明：本次采集中途 WebSearch 额度被全局耗尽（多个 agent 共用 200 次上限），之后只用 WebFetch 打开已知一手 URL；凡未能核实的条目都放进末尾"未核实"。

## 读法

- 强度标签只有五种：已核实（一手）／已核实（二手一致）／自报／未核实／预测。
- 公司公布的"每次提问耗电""承诺 GW""合同 MW"一律不是独立测量：每次提问的数字是自报，合作协议是公司宣布。
- 区分四个"GW"：电网并网容量、数据中心设施总功率、IT 负载、芯片合同口径。OpenAI 的 10 GW 类说法多是后两种，而且是意向。
- "容量拍卖价"不是电费账单。PJM 自己说容量只是批发成本的一部分，批发成本又只是零售账单的一部分。
- 我自己做的算术（倒推、折算、倍数）在文中标"计算/估算"，不是来源给的数。

---

## 速查表

论断 | 数字 | 来源 | 强度
--- | --- | --- | ---
2024 全球数据中心用电 | 约 415 TWh，占全球用电约 1.5%；美 45%、中 25%、欧 15% | IEA《Energy and AI》2025-04-10 https://www.iea.org/reports/energy-and-ai/executive-summary | 已核实（一手）
近五年增速 | 数据中心用电年均约 +12%（IEA 原话"过去五年"） | IEA https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai | 已核实（一手）
2025 实际增长 | 数据中心用电 +17%，全球总用电 +3%；AI 型数据中心增速更快；IEA 6 月幻灯片文字写"近 20%"，图上标 +17% | IEA 新闻稿 2026-04-16 https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions ；IEA 幻灯片 2026-06-11（ADB 转载）https://asiacleanenergyforum.adb.org/wp-content/uploads/2026/06/Key-questions-on-energy-and-AI.pdf | 已核实（一手）
2025 的 TWh 绝对值 | 约 486 TWh（计算：415 × 1.17，IEA 未在文本里给出 2025 总量） | 计算 | 未核实
2030 基准情景 | 约 945 TWh，约占全球用电近 3%，"略多于日本全国用电"；比 2024 翻一番多（2.3 倍） | IEA 2025 | 预测
2035 | 基准约 1,200 TWh；各情景 700–1,700 TWh（高效约 970、逆风约 700 平台、Lift-Off 超 1,700） | IEA 2025 | 预测
2024→2030 增量 | 美 +240 TWh（+130%）；中 +175 TWh（+170%）；欧 +45 TWh（+70%）；日 +15 TWh（+80%）；中美合计近 80% 增量；数据中心只占全球用电需求增量的"不到 10%" | IEA https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai | 预测
2026 对 2030 的判断 | 中央展望"接近 2025 年报告的轨迹"，因为能源与技术供应链瓶颈压住近期；数据中心用电 2030 前翻番、AI 型约 3 倍 | IEA 2026-04-16 与 2026-06 幻灯片 | 预测
大科技资本开支 | 五家公司 2025 年超 4,000 亿美元，2026 年再增约 75%（约 7,000 亿，计算）；IEA 称已超过全球油气生产投资 | IEA 2026-04-16 | 已核实（一手）
美国 2023 | 176 TWh，约占美国电力 4.4%；2014 年 58 TWh；2028 预计占 6.7–12%，增量 325–580 TWh | DOE/LBNL 2024-12-20 https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers | 已核实（一手）；2028 为预测
PJM 容量价（美元/MW·天） | 2024/25：28.92 → 2025/26：269.92 → 2026/27：329.17（触顶）→ 2027/28：333.44（触顶）→ 2028/29：325（触顶） | PJM 新闻稿 2025-07-22、2025-12-17、2026-07-14；2024/25 价见 IEEFA | 已核实（一手）（2025/26 起各年）；2024/25 的 28.92 仅见 IEEFA 摘要，未核实
PJM 2027/28 | 若无上限 RTO 价会是 529.80；缺口 6,623 MW，首次全网低于可靠性要求；预测峰值负荷比上次 +5,250 MW，其中近 5,100 MW 归因于数据中心；成交额 164 亿美元 | PJM 2025-12-17 https://www.pjm.com/-/media/DotCom/about-pjm/newsroom/2025-releases/20251217-pjm-auction-procures-134479-mw-of-generation-resources.pdf | 已核实（一手）
PJM 2028/29 | 价 325（降 2.5%，第三次触顶）；缺口 6,831 MW；成交额 164 亿美元；PJM 计划 9 月办"后备采购" | PJM 2026-07-14 https://www.pjm.com/-/media/DotCom/about-pjm/newsroom/2026-releases/20260714-pjm-capacity-auction-procures-138318-mw-of-generation-resources.pdf | 已核实（一手）
PJM 对账单的说法 | 2026/27 触顶价预计使部分客户账单同比 +1.5–5%（因各州/供电商分摊而异），个别区可能下降 | PJM 2025-07-22 | 已核实（一手）
监测机构（IMM）的归因 | 预测的数据中心负荷使 2025/26–2027/28 三次拍卖多收 231 亿美元；2028/29 约 63 亿（占 164 亿的 38%）；最近四次合计 294 亿/636 亿（46%）；认为前三次"不具竞争性" | Monitoring Analytics（Bowring），转引 Utility Dive 2026-03-13、2026-07-20 https://utilitydive.com/news/pjm-data-centers-capacity-auction-imm-bowring/825626 | 已核实（二手一致）；是监测机构估算，非 PJM 结论
美国居民电价（美分/kWh，名义） | 2022：15.04；2023：16.00；2024：16.48；2025：17.30；2026（预测）：18.21；2027（预测）：18.68 | EIA Electric Power Annual Table 2.4 https://www.eia.gov/electricity/annual/html/epa_02_04.html ；EIA STEO 2026-10 https://www.eia.gov/outlooks/steo/tables/pdf/7ctab.pdf | 已核实（一手）；2026–27 为预测
电价涨幅（计算） | 2022→2025 +15.0%；2022→2026e +21.1%；2025→2026e +5.3%；未做通胀调整 | 计算 | 已核实（一手）（输入）
美国并网排队 | 2024 年底约 2,290 GW（发电 1,400 + 储能 890），同比 −12%，2023 年底约 2,600 GW（倒推）；约为美国现有装机的近两倍；2024 年投产的项目中位用时 55 个月；2000–2019 年申请的项目只有 19% 投产 | LBNL《Queued Up 2025》2025-12-15 https://emp.lbl.gov/publications/queued-2025-edition-characteristics | 已核实（一手）
燃气轮机 | GE Vernova 燃气设备积压+产能预定 116 GW（2026Q2），预计年底 ≥125 GW；年产能 2026Q3 到 20 GW、2028 年 24 GW、2030 年 30 GW | GE Vernova 8-K 2026-07-22 https://www.sec.gov/Archives/edgar/data/0001996810/000199681026000147/gevpressrelease2q26.htm | 已核实（一手）
自备燃气 | 美国数据中心自备天然气电站项目管线合计 47 GW（多数处于早期） | IEA 幻灯片 2026-06-11 | 已核实（一手）
SMR 意向 | 与 SMR 的"有条件承购协议"由 2024 年底 25 GW 增至 2026-04 的 45 GW；科技业占 2025 年企业可再生 PPA 约 40% | IEA 2026-04-16 | 已核实（一手）
美国核电目标 | 总统令 14300（2025-05-23）：核电从 2024 年约 100 GW 增至 2050 年 400 GW；新堆审批 ≤18 个月 | 白宫 https://www.whitehouse.gov/presidential-actions/2025/05/ordering-the-reform-of-the-nuclear-regulatory-commission/ | 已核实（一手）
每次提问耗电 | Google：中位 Gemini 文本提示 0.24 Wh（另有仅计活跃芯片的 0.10 Wh）；Altman：平均 0.34 Wh；Epoch：GPT-4o 典型 0.3 Wh | Google arXiv 2508.15734 2025-08-21；Altman《The Gentle Singularity》2025-06；Epoch 2025-02-07 | 自报（Google、OpenAI）；Epoch 为外部推算，标 未核实
Google 公司用电 | 2025 年总用电 43.6 TWh（+37%，2024 为 31.7）；数据中心 42.4 TWh（2024 为 30.6）；运营排放 −2%，供应链排放约 +25% | Google 2026 环境报告，经 Paperjam/S&P Global 转述 | 自报（公司报告；二手转述一致）
Microsoft 排放 | FY2025 总排放 20.29 Mt CO2e，比 FY2024 的 16.21 Mt 高约 25%，"主要由数据中心扩张"及不再使用非增量绑定外 REC 所致 | Microsoft 2026 环境报告，经 Facilities Dive 2026-07-14 | 自报（公司报告；二手转述）
电力是瓶颈 | Nadella：算力不缺，缺的是电；"芯片堆在库里插不上电" | BG2 播客，2025-11 初，多家媒体转述 | 已核实（二手一致）（大意）；逐字措辞未核对
中国装机 | 2025 年底累计发电装机 38.9 亿 kW（+16.1%）；风光累计 18.4 亿 kW；2025 年风电+光伏新增超 4.3 亿 kW（光伏约 315 GW、风电约 119 GW） | 国家能源局 2026-01-28 发布，经中文媒体与 pv-magazine 转述 | 已核实（二手一致）
美国装机 | 2025 年新增 53 GW（搜索摘要称为 2002 年以来最大单年，未在原文核到），其中光伏 27.2 GW、储能 15 GW；2026 年计划 86 GW，其中燃气仅 6.3 GW | EIA Today in Energy 2026-02-20 https://www.eia.gov/todayinenergy/detail.php?id=67205 | 已核实（一手）；2026 为计划

---

## 时间线

日期 | 事件 | 数字 | 来源 | 强度
--- | --- | --- | --- | ---
2022-11-30 | ChatGPT 发布（本片起点） | 基线：美国居民电价 2022 年均 15.04 美分/kWh | EIA | 已核实（一手）
2023（全年） | 美国数据中心用电 | 176 TWh，约占美国电力 4.4% | DOE/LBNL 2024-12-20 | 已核实（一手）
2024-03 | Amazon 买下 Talen 的 Cumulus 数据中心园区（Susquehanna 核电旁） | 960 MW 园区（WNN 称"去年"出售，未给价格与日期） | WNN 2025-06-12 https://world-nuclear-news.org/articles/new-supply-agreement-expands-talen-amazon-partnership | 已核实（二手一致）（价格 6.5 亿美元与具体日未核）
2024-07-30 | PJM 2025/26 拍卖结果公布 | RTO 价 269.92（PJM 稿已证实）；前一年 28.92（仅见 IEEFA 摘要），约 9.3 倍（计算） | PJM 2025-07-22 新闻稿的回顾；IEEFA | 已核实（一手）（269.92）；28.92 未核实
2024-09-20 | Microsoft–Constellation：重启三哩岛 1 号机组（更名 Crane Clean Energy Center） | 约 835 MW，20 年 PPA，原定 2028 上线；牌照续期至少到 2054 | Constellation 新闻稿 http://www.constellationenergy.com/news/2024/Constellation-to-Launch-Crane-Clean-Energy-Center-Restoring-Jobs-and-Carbon-Free-Power-to-the-Grid.html | 已核实（一手）（宣布）；上线为 预测
2024-10-14 | Google–Kairos Power | 最多 500 MW 新增 24/7 无碳电力；首座 SMR 争取 2030，之后部署到 2035 | Google 博客 https://blog.google/outreach-initiatives/sustainability/google-kairos-power-nuclear-energy-agreement/ | 自报
2024-10-16 | Amazon–X-energy | 约 5 亿美元 C-1 轮（Amazon 气候基金牵头）；目标 2039 年前 5 GW；首个 Energy Northwest 项目 4 台共 320 MW，可扩到 12 台 960 MW；另与 Dominion 签 300 MW SMR 备忘 | X-energy/BusinessWire 2024-10-16 | 自报
2024-12-20 | LBNL 美国数据中心用电报告 | 2023：176 TWh；2028：6.7–12% | DOE | 已核实（一手）
2025-01-21 | Stargate 宣布（OpenAI/Oracle/SoftBank） | 4 年 5,000 亿美元（OpenAI 公布，本次未取得原文） | OpenAI | 自报
2025-04-10 | IEA《Energy and AI》 | 415 → 945 TWh | IEA | 已核实（一手）；2030 为预测
2025-05-23 | 总统令 14300 | 400 GW by 2050；18 个月审批 | 白宫 | 已核实（一手）
2025-06-03 | Meta–Constellation：Clinton 核电站 | 1,121 MW，20 年，2027-06 起；另加 30 MW 增容 | Constellation 新闻稿 http://www.constellationenergy.com/news/2025/constellation-meta-sign-20-year-deal-for-clean-reliable-nuclear-energy-in-illinois.html | 已核实（一手）
2025-06（约 10 日） | Altman《The Gentle Singularity》 | 平均查询约 0.34 Wh（"烤箱一秒多一点"）；约 0.000085 加仑水（约 0.32 mL，计算）；无方法论 | https://blog.samaltman.com/the-gentle-singularity | 自报
2025-06-11/12 | Talen–Amazon 扩大 PPA（Susquehanna） | 1,920 MW，至 2042 年；最晚 2032 年达到满量；2026 春改为表前接入 | WNN https://world-nuclear-news.org/articles/new-supply-agreement-expands-talen-amazon-partnership | 已核实（二手一致）
2025-07-22 | PJM 2026/27 拍卖 | 329.17（触顶）；预测峰值负荷 +5,400 MW，主因数据中心、电气化、经济增长；账单预计 +1.5–5% | PJM（已核） | 已核实（一手）
2025-08-18 | Google–Kairos–TVA | Hermes 2 提供 TVA 最多 50 MW，2030 运行；TVA 为首个购买 GEN-IV 堆电力的美国公用事业 | WNN/ANS | 已核实（二手一致）
2025-08-21 | Google 发布 Gemini 单次提示环境数据 | 0.24 Wh、0.26 mL 水、0.03 gCO2e；12 个月内能耗降 33 倍、碳足迹降 44 倍 | arXiv 2508.15734 https://arxiv.org/abs/2508.15734 | 自报
2025-09-22 | OpenAI–Nvidia 意向书 | 至少 10 GW；Nvidia"拟"逐 GW 投入最多 1,000 亿美元；首期 2026 下半年；意向书一般无法律约束 | Nvidia 投资者页 https://investor.nvidia.com/news/press-release-details/2025/OpenAI-and-NVIDIA-Announce-Strategic-Partnership-to-Deploy-10-Gigawatts-of-NVIDIA-Systems/ ；DCD | 自报
2025-10 | Google–NextEra：重启 Duane Arnold（爱荷华） | 615 MW，25 年 PPA，最早 2029 年运行 | DCD、Power 等 | 已核实（二手一致）（具体日未核）
2025-10-06 | OpenAI–AMD | 6 GW，首个 1 GW 自 2026 年下半年 | DCD（日期取自任务简报） | 自报
2025-10-13 | OpenAI–Broadcom | 10 GW OpenAI 自研加速器，机架部署 2026 下半年起、2029 年底前完成，财务条款未披露 | OpenAI/Broadcom 新闻稿 | 自报
2025-11 初 | Nadella 谈电力瓶颈 | "我受电力约束，不是芯片供应约束"；有芯片放在库里插不上电 | BG2 播客；DCD/Zerohedge 等转述 | 已核实（二手一致）
2025-11-12 | Microsoft Fairwater 亚特兰大 | 数十万块 GB200/GB300；机架约 140 kW；未披露园区 GW | Microsoft 博客 https://blogs.microsoft.com/blog/2025/11/12/infinite-scale-the-architecture-behind-the-azure-ai-superfactory/ | 自报
2025-12-15 | LBNL Queued Up 2025 | 2,290 GW（发电 1,400 + 储能 890） | LBNL | 已核实（一手）
2025-12-17 | PJM 2027/28 拍卖 | 333.44（触顶）；缺口 6,623 MW；Bresler："这次拍卖不留任何疑问：数据中心的用电需求仍远超新增供给" | PJM | 已核实（一手）
2026-01-09 | Meta 三项核电协议 | 最多 6.6 GW 至 2035：Vistra 2,176 MW 20 年 PPA（Perry、Davis-Besse，另有 Beaver Valley 增容，合计 2,609 MW 至 2034）；Oklo 1.2 GW 园区（俄亥俄 Pike County，首期或 2030、满载 2034）；TerraPower 最多 8 台 Natrium（2 台 690 MW 最早 2032，再 6 台 2.1 GW 目标 2035） | WNN https://world-nuclear-news.org/articles/meta-announces-landmark-agreements-for-new-nuclear | 自报
2026-01-28 | 国家能源局发布 2025 全国电力统计 | 累计装机 38.9 亿 kW；风光新增 >4.3 亿 kW | 国家能源局，经媒体转述 | 已核实（二手一致）
2026-02-20 | EIA：美国 2025 新增装机 | 53 GW；2026 计划 86 GW | EIA | 已核实（一手）
2026-03-12 | IMM《2025 年市场状况》 | 2025 年 PJM 批发电力成本 670 亿美元，比 2024 年 435 亿高 54%（Utility Dive 单源）；容量成本占比 16%，2024 年为 6.5% | Utility Dive https://www.utilitydive.com/news/pjm-capacity-energy-market-reliability-monitoring-analytics/814647/ | 未核实（仅一家转述）
2026-03-27 | Meta–Entergy：再建 7 座燃气电站（共 10 座） | 10 座合计 7.5 GW，约 110 亿美元，相当于路易斯安那全州装机增 30% 以上；另协助出资最多 2.5 GW 可再生；合同 15 年；7 座仍需州监管批准；Hyperion 由 Meta–Blue Owl 合资，开发成本最多 270 亿美元 | Fortune 2026-03-27 https://www.fortune.com/2026/03/27/meta-hyperion-10-gas-power-plants-louisiana-entergy/ | 已核实（二手一致）（Entergy 称"超 7 GW"）
2026-04-16 | IEA《Key Questions on Energy and AI》 | 2025 年数据中心用电 +17% | IEA | 已核实（一手）
2026-04-17/23 | Epoch：Stargate 美国站点 | 7 个站点计划合计 >9 GW（相加约 9.6，计算）；Abilene 运行约 0.3 GW、计划 1.2 GW；其余 6 站均未运行，预计多在 2028Q4 | Epoch https://epoch.ai/blog/openai-stargate-where-the-us-sites-stand | 已核实（二手一致）（卫星图+估算）
2026-06-01 | FERC 批准 Crane 的接入权转移豁免；2026-06 NRC 发布环评初稿 | 仍盯 2027 年重启，PJM 曾称部分输电升级到 2031 | ANS/WNN | 已核实（二手一致）
2026-07-08 | Palisades 仍无重启日期 | Holtec 原称 2026-02 底并网，已错过；>800 MW | ANS https://www.ans.org/news/2026-07-08/article-8187/ | 已核实（二手一致）
2026-07-14 | PJM 2028/29 拍卖 | 325；缺口 6,831 MW | PJM | 已核实（一手）
2026-07-14 | Microsoft 2026 环境报告 | 排放 +25% | Facilities Dive | 自报
2026-07-20 | IMM：2028/29 约 63 亿美元（38%）、四次合计 294 亿（46%） | Bowring："这确实是范式转变" | Utility Dive | 已核实（二手一致）
2026-07-22 | GE Vernova Q2 | 116 GW；数据中心订单年内超 50 亿美元，是 2025 全年的两倍多 | SEC 8-K | 已核实（一手）
2026-10-01 | EIA STEO（10 月） | 居民电价 2025：17.30；2026：18.21；2027：18.68（美分/kWh） | EIA | 已核实（一手）；2026–27 为预测
2026-12-15（预定） | PJM 2029/30 拍卖（价格带延至该次） | 尚未发生 | Renewable Energy World | 预测

---

## 1 数据中心用电：规模、增速、国别

**主数字（IEA，一手）**
- 2024：约 415 TWh，占全球用电约 1.5%。美 45%、中 25%、欧 15%。
- 近五年年均约 +12%；2025 年 +17%（全球总用电 +3%）。IEA 2026-06 幻灯片文字写"近 20%"，图上标 +17%；两者差异应在成片里取 17%（新闻稿正文口径），或写"约 17–20%"。
- 2030（基准）：约 945 TWh，略多于日本全国用电，约占全球用电不足 3%。IEA 供给章节用另一口径（疑为含损耗的发电量，页面未写明）：2024 约 460 TWh、2030 年 >1,000 TWh，2035 年 1,300 TWh；与"用电量口径"的 415/945/1,200 不同，不要混用。
- 数据中心占 2024–2030 全球用电需求增量"不到 10%"。美国国内数据中心占其需求增量近一半。
- 美国：2024 人均数据中心用电约 540 kWh，2030 年超 1,200 kWh（IEA）。
- 供给：到 2030 年，新增的数据中心用电里，可再生约占近一半，天然气和煤合计超 40%；美国新增主要靠气（+130 TWh）和可再生（+110 TWh）；中国煤与可再生各约 +90 TWh。数据中心电力的现有结构：全球煤 30%、可再生 27%、气 26%、核 15%；美国气 40% 以上；中国煤近 70%。SMR 2030 年后才进入电力结构（IEA 供给章节）。
- IEA 2026 的新判断：瓶颈（燃气轮机、变压器、并网、新输电线、存储芯片、先进封装）把近期展望压住；效率提升"比能源史上任何技术都快"；但代理型任务耗能高，总量仍涨。

**国别比较（用于画面）**
- 945 TWh ≈ 日本全国用电（IEA 原话）。
- 中国数据中心：IEA 口径 2024 约 25% × 415 ≈ 104 TWh（估算），2030 增 175 TWh（+170%）即约 280 TWh（估算）。未取得中国官方数据中心用电数。
- 美国：IEA 口径 45% × 415 ≈ 187 TWh（估算），与 LBNL 的 2023 年 176 TWh 在量级上吻合。

**美国（LBNL，一手）**
- 2014：58 TWh → 2023：176 TWh（4.4%）→ 2028：增 325–580 TWh（6.7%–12%）。
- 2026 年未找到 LBNL 的更新版（见"未核实/缺口"）。

**公司自己的账（自报）**
- Google：2025 年总用电 43.6 TWh（+37%，2024 年 31.7，此前 2024 年为 +27%），其中数据中心 42.4 TWh；占 IEA 全球数据中心用电的约 9%（估算：42.4 / 486）。运营排放（市场法）−2%，供应链排放约 +25%。https://en.paperjam.lu/article/googles-electricity-consumption-rose-by-37-in-2025
- Microsoft：FY2025 排放 20.29 Mt，比 16.21 Mt 高约 25%；范围 2（市场法）由约 0.26 Mt 升至约 2.7 Mt，原因包括不再使用"非增量"的绑定外可再生证书，所以不全是"AI 用电变多"。自称全球"水为正"（补水大于取水）。Brad Smith 与 Melanie Nakagawa："可持续解决方案规模化的速度赶不上需求。"https://www.facilitiesdive.com/news/microsofts-data-center-expansion-drove-25-emissions-spike-2025-environmental-sustainability-report/825142/
- 同期：Amazon 排放 +16%，Google +18%（按 Register 引述，未逐一核对）。

---

## 2 电价与电网

**PJM 容量拍卖（美元/MW·天，一手）**
- 2024/25：28.92 → 2025/26：269.92（BGE、Dominion 区 466.35、444.26）→ 2026/27：329.17 → 2027/28：333.44 → 2028/29：325。
- 价格从第三次起被"价格带"限住：上限 2026/27 与 2027/28 分别为 329.17 与 333.44。若无上限，2027/28 的 RTO 价为 529.80（PJM），2028/29 为 554.72（Power Engineering 转述 PJM，未在 PJM 新闻稿里找到）。
- 2027/28：成交容量 134,479 MW，加 FRR 共 145,777 MW，缺 6,623 MW（预留率 14.8% 对 20% 目标）。负荷预测 +5,250 MW，其中近 5,100 MW 是数据中心。
- 2028/29：成交 138,318 MW，加 FRR 共 149,182 MW，缺 6,831 MW，预留率 14.7%。"价格带"限制 4 次拍卖，现为第 3 次，PJM 7 月称将申请 9 月"后备采购"，并推进"连接并管理"（大负荷接入但必要时弹性运行）和长期双边合同。
- PJM 自己的表述："数据中心的用电需求仍远超新增供给"（Bresler，2025-12-17）；"用电需求继续比供给增长更快"（CEO David Mills，2026-07-14）。
- 总成交额 164 亿美元，但 PJM 强调"并非用户总成本"，自供给与双边合同的负荷不暴露于出清价。

**IMM（监测机构）的归因（二手一致，需标为监测机构估算）**
- 预测的数据中心负荷：2025/26–2027/28 三次拍卖多收 231 亿美元；2028/29 约 63 亿（占 164 亿的 38%）；四次合计 294 亿/636 亿 = 46%。
- Bowring 结论：前三次拍卖"主要因纳入数据中心预测需求，不具竞争性"；主张把数据中心负荷移出容量市场，通过单独拍卖或自带发电解决；要求大负荷按 15 年合同采购。引语："PJM 仍在照常办事"；"这确实是范式转变"。
- 注意：231 亿是"预测负荷"的归因，含尚未建成的数据中心；这是 IMM 的反事实估算，PJM 与行业有异议。Utility Dive 在正文称"三次拍卖"，图注称"两次"，已按正文处理。
- 单一来源、未能打开原文的细节：2025/26 一次 93 亿美元、63% 归因数据中心（IEEFA 摘要）；"投机性预测使价格高 61%，现有与已承诺数据中心仅 4%"（2026-01 IMM 报告，搜索摘要）。放入"未核实"。

**零售电价（EIA，一手）**
- 居民电价（名义，美分/kWh）：2022：15.04；2023：16.00；2024：16.48；2025：17.30；2026e：18.21；2027e：18.68。2025→2026 约 +5%，与 2024→2025 相近（EIA 5 月 STEO 原话"nearly 5%"）。
- EIA 的归因措辞：电价在"商业部门（含数据中心）等需求增长"、"更高的燃料价格"、"加固输电网抵御极端天气的开支"下上涨；东岸地区未来两年年均增速可达 7%。EIA 没有说数据中心是居民电价上涨的主因。https://www.utilitydive.com/news/data-centers-electricity-residential-rates-eia/820342/
- IEA 2026 的反向提醒：2019–2024 年间，实际零售电价变化与需求增长并无必然同向（图示美国各州、爱尔兰、韩国、新加坡等）；负荷率与容量利用率是关键。

**并网与排队**
- 美国：2,290 GW 在排队，同比 −12%；2024 年撤出 >700 GW，新申请约 500 GW；新增申请比 2023 年少近一半；气电申请 +72% 至 136 GW；408 GW 已有协议但未投产；中位 IR→投产 55 个月。
- PJM：2023 年起处理 >170 GW 申请；57 GW 已拿到或被提供并网协议，但"当地反对、许可、供应链、融资"拖住；新"周期制"2026-04 启动，与 Google Tapestry 合作用 AI 缩短研究。
- 国际排队/暂停（爱尔兰 EirGrid、Dominion/北弗吉尼亚、荷兰、新加坡）：本次未取得一手资料，见"未核实/缺口"。

**燃气轮机**
- GE Vernova：积压 53 GW + 产能预定 63 GW = 116 GW（2026Q2）；2026 年底 ≥125 GW；当时年产能目标 20 GW，约合 5.8 年的产出（计算）。2026Q1 的 100 GW 中，约 20% 明确绑定数据中心负荷（Power Engineering 转述，二手）；"产能紧到 2029–2030"为该报道措辞。Siemens Energy、三菱未取得。

---

## 3 核电与其他交易（合同 ≠ 电）

交易 | 宣布日 | MW | 期限/时间 | 状态（截至 2026-10） | 强度
--- | --- | --- | --- | --- | ---
Microsoft–Constellation Crane（三哩岛 1 号机组重启） | 2024-09-20 | 约 835 | 20 年 PPA；原定 2028，现称 2027 | FERC 2026-06-01 批准接入权豁免；NRC 2026-06 环评初稿；未见最终批准 | 自报（宣布）+ 二手追踪
Amazon–Talen Susquehanna | 2024 春买园区；2025-06-11 PPA | 960（园区）；1,920（PPA） | 至 2042；2032 前满量 | 表前接入 2026 春 | 已核实（二手一致）
Google–Kairos | 2024-10-14 | 最多 500 | 首座 2030、全部 2035；Hermes 2 为 50 MW（TVA PPA，2025-08-18） | 技术未商用 | 自报
Amazon–X-energy | 2024-10-16 | 5,000（目标）；320（首个项目） | 2039 | 未建成 | 自报
Meta–Constellation Clinton | 2025-06-03 | 1,121（+30 增容） | 20 年，2027-06 起 | 在役电厂延寿 | 已核实（一手）
Google–NextEra Duane Arnold | 2025-10 | 615 | 25 年；最早 2029 | 需 NRC 批准 | 已核实（二手一致）
Palisades（Holtec） | — | >800 | 原称 2026-02 底并网 | 2026-07-08 仍无重启日期 | 已核实（二手一致）
Meta–Vistra / Oklo / TerraPower | 2026-01-09 | 2,176（PPA）/ 1,200 / 2,800+1,200 储能 | 2026 起 / 2034 / 2032–2035 | 多为 2030 后 | 自报
美国总统令 14300 | 2025-05-23 | 100 → 400 GW（2050） | 18 个月审批 | 政策目标 | 已核实（一手）（文本）；目标为 预测

**读法**
- 1 GW ≈ 一座大型核电机组：Clinton 1,121 MW，Crane 约 835 MW，Duane Arnold 615 MW。
- 1 GW 的户数（计算）：以美国平均家庭年用电约 10.8 MWh（EIA，本次未重新核对）估算，1 GW 满负荷运行一年约 8.76 TWh，约够 81 万户。Fortune 称 7.5 GW 可供"500 万以上家庭"，即约每 GW 67 万户（二手）。
- 大部分核电合同是延寿或重启（Clinton、Susquehanna、Vistra），不是新增电源；新堆（Kairos、Oklo、TerraPower、X-energy）多数在 2030 年后。IEA：美国首批 SMR 预计 2030 年后投运；科技公司计划为超过 20 GW 的 SMR 提供资金。
- Amazon–Talen 的价格、Talen 称合同价值约 180 亿美元的说法：本次未找到一手确认，不使用。

**算力园区与 GW**
- Stargate（OpenAI/Oracle/SoftBank，宣布 2025-01-21）：Epoch 估算美国 7 个站点计划 >9 GW。Abilene（德州）计划 1.2 GW，截至 2026-04-23 估约 0.3 GW 已运行（Oracle 的一篇帖子暗示 4 月 22 日仅 200 MW IT 负载运行；Epoch 预计 5 月底约 0.6 GW、2026Q4 达 1.2 GW）。其他站点：Shackelford 2.0、Doña Ana 2.2、Milam 1.2、Port Washington 1.3、Saline 1.4、Lordstown <0.3，均在 2028Q4 前后，供电以自备气为主。Epoch 的容量口径为设施总功率，状态来自卫星图。
- OpenAI 的"芯片 GW"：Nvidia 10 GW（意向书，无约束力，"最多 1,000 亿美元"）+ AMD 6 GW + Broadcom 10 GW = 26 GW 合计（计算）。这是计划部署的系统功率，开始时间多在 2026 下半年，Broadcom 到 2029 年底。
- Meta Hyperion（路易斯安那）：10 座新建燃气电站合计 7.5 GW，约 110 亿美元，外加 2.5 GW 可再生；园区开发成本最多 270 亿美元（Blue Owl 合资）；"约 5 GW 算力"仅见 TechLeap 一家转述，不单独使用。
- Microsoft Fairwater（威斯康星、亚特兰大）：未披露 GW；数十万块 GB200/GB300。
- xAI Colossus（孟菲斯/Southaven）：本次只拿到 Wikipedia 级别的三手信息，见"未核实"。

---

## 4 单次查询耗电与水（有争议）

数字（全是自报，Epoch 为外部估算）
来源 | 数字 | 口径 | 强度
--- | --- | --- | ---
Google，2025-08-21 | 中位 Gemini 文本提示 0.24 Wh；0.26 mL 水（约五滴）；0.03 gCO2e（市场法）；仅计活跃芯片则为 0.10 Wh / 0.12 mL / 0.02 gCO2e；12 个月内能耗降 33 倍、碳足迹降 44 倍 | 全栈口径（含空闲、冷却等），不含嵌入排放；未给提示长度 | 自报
Altman，2025-06 | 平均 0.34 Wh；约 0.000085 加仑水 | 未披露方法 | 自报
Epoch，2025-02-07 | GPT-4o 典型文本查询约 0.3 Wh（约 500 输出 token）；10,000 token 输入约 2.5 Wh；100,000 token 输入近 40 Wh；旧估算 3 Wh 偏高 | 外部推算，假设 H100 约 1,500 W/卡含开销 | 未核实（外部估算）

**对比（计算）**
- 烧开 1 升水（20→100 °C，理论值）约 93 Wh：约等于 390 次 Google 中位提示，或 270 次 Altman 平均查询。
- 0.24 Wh 约等于看电视不到 9 秒（Google 自己的比喻）；0.3 Wh 与 Google 2009 年自报的单次搜索 0.3 Wh 同量级（Epoch 的比较，该数很旧）。
- 反方：Shaolei Ren（UC Riverside）称 Google 的数字"隐藏了关键信息"；有分析认为位置法下排放约 0.09 gCO2e 而不是 0.03（单一来源）。
- IEA 的框架：文本生成每次约 0.3–0.4 Wh 量级，但"代理型任务"每次可到数十 Wh（图轴 0–60 Wh，具体读数未取得）；单次变便宜，但总量由"新模式（代理）"推高。

水与排放：Google 公司用水量、LBNL 的数据中心耗水量本次未取得；Microsoft 自报"全球水为正"；排放见第 1 节。

---

## 5 电力是瓶颈：带日期的话

- 2025-11 初，Nadella（BG2 播客）：说自己"受电力约束，不是芯片供应约束"，有芯片放在库里"插不上电"。多家媒体转述一致；各媒体对同场播客和主持人写法不一，逐字措辞未核对。
- 2025-12-17，PJM 的 Stu Bresler："这次拍卖不留任何疑问：数据中心的用电需求仍远超新增供给。"（一手）
- 2026-07-14，PJM CEO David Mills："用电需求继续比供给增长更快。"（一手）
- 2026-07-14，Brad Smith 与 Melanie Nakagawa（Microsoft 报告）："可持续解决方案规模化的速度赶不上 AI 基础设施增长。"
- 2026-04-16，IEA：燃气轮机、变压器、先进芯片的供应链"过去一年收紧"，项目管线"拖住了并网和其他必要审批"。
- Zuckerberg、Musk 的"电力是限制"类引语：本次未核到带日期的原话，见"未核实/缺口"。

**中国对美国的新增装机**
- 中国：2025 年底累计发电装机 38.9 亿 kW（+16.1%）；风光累计 18.4 亿 kW；2025 年风光新增 >4.3 亿 kW（光伏约 315 GW，风电约 119 GW）。按 2024 年底约 33.5 亿 kW 倒推，全年净增约 5.4 亿 kW（估算，国家能源局未给单一"新增总量"）。碳信用媒体称新增煤电+气电约 93 GW（另有 CREA/GEM 称煤电 78 GW，口径不同）。
- 美国：2025 年新增 53 GW（EIA 实际），其中光伏 27.2 GW、储能 15 GW；2026 年计划 86 GW，其中燃气仅 6.3 GW。
- 倍数（计算）：约 540 GW 对 53 GW，约 10 倍；风光新增 430 对美国光伏+风电约 33 GW（27.2 + 不足 5.9，计算），约 13 倍。口径警告：中国数字包含分布式光伏（约 153 GW）和铭牌容量，美国数字为公用事业规模；容量不等于发电量。2024 年两国新增值未取得。

---

## 图表数据

### A. 数据中心用电（TWh）

年份 | TWh | 说明 | 强度
--- | --- | --- | ---
2017–2019 | — | 未取得 IEA 逐年值 | —
2020–2023 | 约 263 / 295 / 330 / 370 | 按 IEA"近五年年均 +12%"自 2024 的 415 倒推，仅示意 | 未核实（估算）
2024 | 415 | IEA，占全球 1.5% | 已核实（一手）
2025 | 约 486 | 415 × 1.17（IEA 称 +17%） | 估算
2026–2029 | 约 555 / 634 / 724 / 827 | 2025 与 2030 之间年复合约 +14.2% 插值，仅示意 | 预测（估算）
2030 | 945 | IEA 基准情景 | 预测
2035 | 700（逆风平台）/ 970（高效）/ 1,200（基准）/ >1,700（Lift-Off） | IEA 用电量口径 | 预测

画图时：2024 以前用实线，2025 用实线但标"IEA +17%推算"，2026 之后改虚线并写"预测"。分区域增量用 2024→2030：美 +240、中 +175、欧 +45、日 +15（TWh）。

### B. PJM 容量价（美元/MW·天，一手）

交付年 | RTO 价 | 备注
--- | --- | ---
2024/25 | 28.92 | 2022 年拍卖（日期未核）
2025/26 | 269.92 | 2024-07 拍卖；BGE 466.35，Dominion 444.26
2026/27 | 329.17 | 2025-07-22；触顶
2027/28 | 333.44 | 2025-12-17；触顶；无上限 529.80
2028/29 | 325 | 2026-07-14；触顶；无上限 554.72（二手）
2029/30 | 待定 | 2026-12-15 拍卖

成交额：2027/28 与 2028/29 均约 164 亿美元（PJM）。IMM 归因：数据中心 2028/29 约 63 亿（38%）。

### C. 核电交易（MW 与日期）

见第 3 节表。画图建议两个系列：已存在/延寿（Susquehanna 1,920、Clinton 1,121、Vistra 2,176、Crane 835、Duane Arnold 615）与新堆（TerraPower 2.8 GW + 1.2 储能、Oklo 1.2 GW、Kairos 500、X-energy 320 首期/5,000 目标）；横轴用"最早上线年"：2027 起，新堆 2030 起。

### D. AI 园区 GW

项目 | 计划 GW | 已运行 | 口径 | 强度
--- | --- | --- | --- | ---
Stargate Abilene | 1.2 | 约 0.3（2026-04） | 设施总功率 | 已核实（二手一致）
Stargate Shackelford | 2.0 | 0 | 总功率估算 | 已核实（二手一致）
Stargate Doña Ana | 2.2 | 0 | 同上 | 已核实（二手一致）
Stargate Milam | 1.2 | 0 | 同上 | 已核实（二手一致）
Stargate Port Washington | 1.3 | 0 | 同上 | 已核实（二手一致）
Stargate Saline | 1.4 | 0 | 同上 | 已核实（二手一致）
Stargate Lordstown | <0.3 | 0 | 估算 | 已核实（二手一致）
Meta Hyperion 供电 | 7.5（气）+ 2.5（可再生） | — | 电源容量，非算力 | 已核实（二手一致）
OpenAI 芯片合同 | 10 + 6 + 10 = 26 | 0（首批 2026 下半年） | 系统功率，意向 | 自报

---

## 比听起来弱的说法

1. "AI 在吞掉全世界的电"：2024 年占全球用电约 1.5%，2024–2030 只占全球需求增量不到 10%，2030 年基准情景约 3%。集中度才是问题：美国 2030 年数据中心占其需求增量近一半；PJM 2027/28 的新增预测峰值几乎全是数据中心。
2. "每问一次 ChatGPT = 10 倍搜索"：3 Wh 的旧数偏高（Epoch 估约 0.3 Wh）。但这只适用于短文本；长上下文（10,000 token 约 2.5 Wh）、推理和代理型任务耗能高得多。
3. "电价涨都是数据中心的错"：EIA 把居民电价上涨归因于燃料、输电加固、需求增长（含商业部门）；PJM 说容量只占批发成本一部分，2026/27 的触顶价只使部分账单 +1.5–5%；IEA 说负荷增长不必然抬高单位电价。IMM 的 294 亿美元是对"预测负荷"的反事实估算，含未建成的项目，不是账单。
4. "PJM 价格涨了 10 倍"：从 28.92 到 269.92 约 9.3 倍属实，但此后被价格带限在约 325–333；若无上限则为 529.80–554.72。总成交额 164 亿美元不等于用户付的钱。
5. "945 TWh 已成定局"：这是基准情景。2035 年范围 700–1,700 TWh；IEA 2026 说瓶颈在压近期展望；基准轨迹没变，是"推迟而非改向"。
6. "核电重启意味着马上有电"：Crane 由 2028 提前称 2027，仍受 PJM 输电升级牵制（PJM 曾称部分升级到 2031）；Palisades 错过 2026-02；Duane Arnold 最早 2029；SMR 多在 2030 年后。IEA 的 45 GW SMR 承购是"有条件的"。
7. "OpenAI 签了 26 GW"：Nvidia 10 GW 是意向书，"最多 1,000 亿美元"逐 GW 投入；GW 是系统功率；Stargate 美国站点 2026-04 运行约 0.3 GW，对比计划 >9 GW。
8. "Meta Hyperion 5 GW"：来源口径是算力；电源侧是 7.5 GW 燃气（其中 7 座尚待批准）加 2.5 GW 可再生。
9. "Microsoft 排放 +25% 全因 AI"：公司说"主要由数据中心扩张"与不再使用非增量绑定外证书；市场法范围 2 从约 0.26 Mt 升到约 2.7 Mt 含核算变化。
10. "每次提问只要 0.24 Wh 所以不用担心"：这是自报的中位数，不含训练和嵌入排放，未给提示长度；IEA 的重点是总量被"新模式"推高，不是单次。

---

## 未核实 / 缺口

- 中途 WebSearch 额度耗尽，以下条目未能补查：
  - Dominion/北弗吉尼亚并网等待年限、爱尔兰 EirGrid 暂停（记忆：2021 年起对都柏林新数据中心并网的限制，未核实）与 CRU 新政、荷兰、新加坡的暂停与配额；
  - Siemens Energy、三菱重工的燃气轮机排期（"售罄到 2028–2030"的说法，GE Vernova 自己的表述只到"机会预留"，没有"售罄"字样）；
  - Zuckerberg、Musk 关于电力是限制的带日期原话；
  - xAI Colossus（孟菲斯 Tulane Road、Southaven）：仅见 Wikipedia 级别信息——涡轮数量 50–70 台之说无引用；Mississippi 对 1.2 GW、41 台涡轮的永久电厂 2026-03 许可（Wired/Gizmodo 经 Wikipedia）；2026-04 NAACP 起诉；2026-06 DOJ 介入；孟菲斯+Southaven 约 1 GW 算力（Epoch 经 Wikipedia）。成片需用原始来源（Shelby County 卫生局、Wired、NYT）核对后才能用；
  - IEA《Electricity 2026》与 WEO-2025 对数据中心的具体表述，未取得；
  - LBNL 在 2026 年是否有对 2024 报告的更新，未找到；
  - 中国数据中心用电的官方数字（只有 IEA 份额推算）；
  - 2024 年中国、美国新增装机（记忆：中国约 4.3 亿 kW、美国约 49 GW），未核实，不使用；
  - 谷歌公司用水总量、LBNL 报告里的数据中心耗水量（记忆：2023 年约 660 亿升直接耗水），未核实，不使用；
  - Amazon–Talen 2025-06 PPA 合同价值（说法 180 亿美元）、2024-03 Cumulus 交易价（6.5 亿美元）与确切日期，Talen 官网 403，未核实；
  - AMD 6 GW 的确切日期（2025-10-06 取自简报，DCD 文章未写日）、Duane Arnold 的确切日期（约 2025-10-27，未核）；
  - Stargate 的 5,000 亿美元与 2025-01-21：OpenAI 页面 403，仅见 Epoch 间接涉及；
  - Utility Dive 转述的 IMM 数字：2025 年 PJM 批发成本 670 亿美元（+54%，2024 为 435 亿）、容量占 16%（2024 为 6.5%）、2026/27 缺口约 210 MW → 2027/28 约 6,520 MW（IMM 口径与 PJM 的 6,623 MW 不同），均为单家转述；IEEFA 转述的 2025/26 一次 93 亿美元与 63%、2026-01 IMM 报告的 61%/4%，只见搜索摘要；
  - 2024/25 拍卖日期（记忆为 2022-12）。
- 近期节点：PJM 2029/30 拍卖预定 2026-12-15；PJM"后备采购"2026-09 提案后的结果未查；Constellation Crane 最终 NRC 批准未见。
