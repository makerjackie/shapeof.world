# 03 内存与芯片：AI 把内存价格推上天——研究底稿（strand 3，《AI 到底改变了什么》/ 世界的形状）

截止日期：2026-10-22。覆盖：DRAM/NAND 价格、内存厂业绩、PC/手机被挤压、TSMC CoWoS、GPU 租赁。

## 读法

- **强度标签**：已核实（一手）= TrendForce/厂商 IR/官方统计自己的发布；已核实（二手一致）= 至少两家可信来源数字一致；自报 = 公司或当事人自述、初步数；预测 = 机构预测或公司指引；未核实 = 只有单一二手或没拿到原文；**推算** = 我用已核实数字算出来的。
- **三层价格不要混**：合约价（厂商卖给 OEM/云，TrendForce 季度环比）、现货价（颗粒/芯片，DRAMeXchange 日更）、零售价（内存条/套装，Tom's Hardware / PCPartPicker）。三层涨幅差别巨大，片子里每个数字都要标明是哪一层。
- **TrendForce 合约价口径**：TrendForce 多数季度只公布"区间预测"，实际值要等后续季度稿才"最终调整"，有的季度（4Q24、2Q25、3Q25）从未单独重述。本文每季取"TrendForce 对该季最近一次表述"，并标明是预测还是实际。
- **检索说明**：本次 WebSearch 配额（会话共享）在中途耗尽，之后全部靠直接抓取一手页面（TrendForce 新闻稿列表、厂商 IR、Samsung/SK hynix/Micron/TSMC 官网、Counterpoint/IDC 页面）。因此部分项目标"未核实"，列在文末。
- 片子的时间锚：ChatGPT 发布 2022-11-30。那一刻 DRAM 正在崩盘（见时间线 2022-09～2023-03），这是理解"AI 改变了什么"最强的前后对照。

## 速查表

| 论断 | 数字 | 来源 | 强度 |
|---|---|---|---|
| ChatGPT 发布时内存在崩盘：4Q22 全球 DRAM 营收环比 -32.5% | $12.281B；SK hynix 营业亏损 1.701 万亿韩元（自 2012 年 3Q 以来首次季度营业亏损） | https://www.trendforce.com/presscenter/news/20230302-11588.html ；https://tomshardware.com/news/sk-hynix-q4-2022-earnings | 已核实（一手） |
| 全球 DRAM 行业季度营收 4Q22 → 2Q26 | $12.28B → $154.73B，约 12.6 倍 | https://www.trendforce.com/presscenter/news/20230302-11588.html ；https://www.trendforce.com/presscenter/news/20260907-13219.html | 营收已核实（一手）；倍数 推算 |
| 通用 DRAM 合约价 1Q26 环比 | 约 +93~98%（2 月预测 +90~95%，1 月前预测 +55~60%） | https://www.trendforce.com/presscenter/news/20260601-13070.html ；https://www.trendforce.com/presscenter/news/20260202-12911.html | 已核实（一手） |
| 通用 DRAM 合约价 2Q26 / 3Q26 / 4Q26 | +58~63% / +13~18% / +10~15%（涨势在放缓，不是回落） | https://www.trendforce.com/presscenter/news/20260331-12995.html ；https://www.trendforce.com/presscenter/news/20260703-13134.html ；https://www.trendforce.com/presscenter/news/20260930-13258.html | 预测 |
| 通用 DRAM 合约价累计指数（2Q25=100） | 4Q26 ≈ 677（区间 605~755）；以 3Q23 谷底为 100 则约 1053（区间 740~1483） | 由上列 TrendForce 各季区间连乘 | 推算 |
| 4Q25 合约价预测被连续上修 | 9 月预测 +8~13% → 11 月 +45~50%（2026-02 作为实际重述） | https://www.trendforce.com/presscenter/news/20250924-12733.html ；https://www.trendforce.com/presscenter/news/20260226-12937.html | 已核实（一手） |
| DDR5 16Gb 现货 | 2025-06-23 $6.01 → 2026-10-22 $61.10（约 10 倍） | https://www.trendforce.com/news/2025/06/24/news-historic-ddr4-spot-price-rally-reportedly-doubles-ddr5-propelling-nanya-techs-inventory-windfall/ ；https://www.trendforce.com/price/dram/dram_spot | 已核实（一手）；倍数 推算 |
| DDR4 8Gb 现货 | 2023-08-03 $1.466（2666）→ 2026-10-22 $47.00（3200，规格不同） | https://www.trendforce.com/news/2023/08/02/memory-spot-prices-update-dram-still-falling-nand-flash-slows-down/ ；https://www.trendforce.com/price/dram/dram_spot | 已核实（一手）；约 32 倍 推算（规格不同，仅示意） |
| 零售：32GB DDR5 套装 | 2025-10 约 $100~200 → 2026-06 最低 $375 → 2026-10 DDR5-6000 32GB 最低 $449；2025 年中常见 <$100 | https://www.tomshardware.com/pc-components/ram/ram-price-index-2026-lowest-price-on-ddr5-and-ddr4-memory-of-all-capacities ；https://www.tomshardware.com/pc-components/ddr5/32gb-of-ddr5-now-costs-usd375-minimum-ai-shortage-continues-to-squeeze-pc-building | 已核实（二手一致）（Tom's 追踪价；零售价会随商家波动） |
| 零售：32GB (2×16GB) DDR4 套装 | 2025-10 $60~90 → 2026-01 $150~180 | 同上 Tom's 指数页 | 已核实（二手一致） |
| SK hynix 季度营业利润 | 4Q22 -1.701 万亿 → 2Q26 +60.543 万亿韩元（营业利润率 76%）；2Q26 一个季度超过 FY2025 全年（47.206 万亿） | https://news.skhynix.com/en/q2-2026-business-results/ ；https://news.skhynix.com/en/sk-hynix-announces-fy25-financial-results/ | 已核实（一手）；"超过全年"为 推算 |
| Samsung 3Q26 初步营业利润 | 107.4 万亿韩元（+782.5% 同比），营收约 195 万亿；4Q22 为 4.31 万亿；3Q26 一季超过 FY2025 全年 43.6 万亿 | https://biz.heraldcorp.com/article/10896441 ；https://news.samsung.com/global/samsung-electronics-announces-fourth-quarter-and-fy-2022-results ；https://news.samsung.com/global/samsung-electronics-announces-fourth-quarter-and-fy-2025-results | 自报（初步，全文 10-29 公布）；倍数 推算 |
| Samsung DS 部门营业利润 | 4Q23 -2.18 万亿（收入 21.69 万亿）→ 2Q26 +89.2 万亿（收入 127.5 万亿） | https://news.samsung.com/global/samsung-electronics-announces-fourth-quarter-and-fy-2023-results ；https://news.samsung.com/global/samsung-electronics-announces-second-quarter-2026-results | 已核实（一手） |
| Micron 毛利率 | FQ2-23 GAAP -32.7% → FQ4-26 GAAP 86.8%（非 GAAP 87.0%），摆幅约 119.5 个百分点；营收 $3.693B → $54.229B（14.7 倍） | https://investors.micron.com/news-releases/news-release-details/micron-technology-inc-reports-results-second-quarter-fiscal-2023 ；https://investors.micron.com/news/press-release/2026/Micron-Technology-Inc--Reports-Record-Fiscal-Fourth-Quarter-and-Full-Year-2026-Results | 已核实（一手）；摆幅/倍数 推算 |
| Micron 管理层判断 | "we do not have line of sight to when supply and demand will return to balance"；2027、2028 比 2026 "much tighter" | https://s25.q4cdn.com/621799436/files/doc_financials/2026/q4/Q4-FY26-Prepared-Remarks.pdf | 自报 |
| 涨的是价格不是量：Micron FQ4-26 DRAM | 位元出货 +中个位数%，价格 +高十几%（环比）；NAND 位元 +约10%、价格 +约30% | 同上 Prepared Remarks | 自报 |
| SK hynix 超越 Samsung（DRAM 营收） | 1Q25 起（$9.72B vs $9.10B）；4Q25 Samsung 重回第一（$19.30B vs $17.22B）；2Q26 Samsung 39.4% vs SK hynix 24.9% | https://www.trendforce.com/presscenter/news/20250603-12603.html ；https://www.trendforce.com/presscenter/news/20260226-12937.html ；https://www.trendforce.com/presscenter/news/20260907-13219.html | 已核实（一手） |
| HBM 营收份额 2Q26 | SK hynix 50%、Samsung 33%、Micron 18%（2Q25 为 64/15/21） | https://www.counterpointresearch.com/insights/global-dram-and-hbm-market-share/ | 已核实（一手）（Counterpoint 自己的口径） |
| 晶圆被 HBM 占用 | HBM 占前三大厂 DRAM 晶圆投片：约 18%（2025 末）→ 22%（2026 末）→ 30%（2027 末）；占位元供给仅约 8% → 9% → 13% | https://www.trendforce.com/presscenter/news/20260602-13074.html | 预测（2025 为估计值）；晶圆/位元倍数 2.4 倍 推算 |
| 2026 手机产量预测 | 6 月 10.51 亿部（-16.2%）→ 9 月上调到 10.7 亿部（-14%） | https://www.trendforce.com/presscenter/news/20260609-13087.html ；https://www.trendforce.com/presscenter/news/20260908-13222.html | 预测 |
| 2026 笔记本出货预测 | 7 月 -13.6% → 9 月 -9.4%；2027 低个位数下滑，成本全转嫁则可能高个位数 | https://www.trendforce.com/presscenter/news/20260701-13130.html ；https://www.trendforce.com/presscenter/news/20260904-13217.html ；https://www.trendforce.com/presscenter/news/20261008-13264.html | 预测 |
| PC 实际出货 3Q26 | 5700 万台，同比 -21%（Counterpoint）；4Q26 预计 -27% | https://www.counterpointresearch.com/en/insights/global-pc-shipments-plunge-21-percent-in-q3-2026 | 已核实（一手）（3Q 实际）；4Q 为 预测 |
| IDC 2026 预测 | PC 出货 -11.3%（收入 +1.6%）、手机出货 -12.9%（收入 -0.5%），"比我们最悲观情景还差" | https://www.idc.com/resource-center/blog/higher-asps-lower-unit-volumes-how-the-memory-crisis-is-reshaping-the-pc-and-smartphone-outlook/ | 预测（2026-02-26 发布） |
| 内存占整机成本 | HP：占 PC 物料成本 35%，上一季 15~18%（2026-02 财报会）；iPhone 18 Pro 256GB：约 10% → 34%（3Q26）→ 1H27 预计 >40%（TrendForce） | https://www.tomshardware.com/tech-industry/hp-says-memory-costs-doubled-to-35-percent-of-pc-build-materials-in-one-quarter ；https://www.trendforce.com/presscenter/news/20260810-13172.html | HP 为 自报（Tom's 转述）；iPhone 为 预测 |
| 笔记本核心部件（CPU+DRAM+SSD）占 BOM | 1Q25 约 45% → 3Q26 68%；$900 机型要保毛利率需涨价约 80% | https://www.trendforce.com/presscenter/news/20260904-13217.html | 已核实（一手）（TrendForce 估算）；"涨价 80%"为其推算 |
| Apple 官方承认涨价 | 2026-06-25 起：MacBook Neo $599→$699，MacBook Air 512GB $1,099→$1,299，MacBook Pro 1TB $1,699→$1,999，iPad Air $599→$749；声明称"从未见过零部件涨价这么多、这么快"；股价当日跌超 6% | https://www.cnbc.com/amp/2026/06/25/apple-macbook-ipad-price-hike-memory.html | 已核实（二手一致）（CNBC；价格表需以 Apple 官网为准） |
| TSMC 3Q26 | 营收 US$46.72B（美元同比 +41.2%），毛利率 66.4%，HPC 占 68%；2026 全年美元营收增速约 44%；资本开支 $60~64B | https://investor.tsmc.com/english/quarterly-results/2026/q3 | 已核实（一手） |
| TSMC 管理层点出内存挤压消费端 | "consumer and price-sensitive end market segments are being challenged due to the impact of rising component prices" | TSMC 3Q26 电话会纪要（同上 IR 页的 Transcript PDF） | 自报 |
| CoWoS 月产能 | 2024 年底约 35k 片 → 2025 年底 70~75k（目标）→ 2026 年底 TSMC 120~140k（加 OSAT 约 200k） | https://www.trendforce.com/news/2024/12/13/news-tsmc-ramps-up-cowos-capacity-across-taiwan-projected-to-nearly-triple-by-2026/ ；https://www.trendforce.com/news/2026/06/15/news-tsmc-cowos-supply-demand-gap-reportedly-seen-narrowing-from-20-to-10-by-end-2026-as-capacity-expands/ | 未核实（媒体"reportedly"，TSMC 不披露片/月） |
| Nvidia 数据中心收入 | 4Q FY23 $3.62B → 2Q FY27 $89.0B（同比 +117%）；24.6 倍 | https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2023 ；https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027 | 已核实（一手）；倍数 推算 |
| H100 租赁价（反例，但不是干净的下降） | Silicon Data：云巨头 $7.76（2H23）→ $6.26（2H25）；撮合市场 $2.58（2H24）→ $1.95（2H25）；2026-10-22 GetDeploying 按需中位数 $3.86，约比一年前高 13% | https://www.silicondata.com/blog/h100-rental-price-over-time ；https://getdeploying.com/gpus/nvidia-h100 | 已核实（二手一致）（两家聚合口径不同，趋势一致）；见"比听起来弱" |

## 时间线

| 日期 | 事件 | 数字 | 来源 | 强度 |
|---|---|---|---|---|
| 2022-09-22 | TrendForce：4Q22 DRAM 价格降幅扩大到 13~18% | -13~18% | https://www.trendforce.com/presscenter/news/20220922-11391.html | 预测 |
| 2022-11-30 | ChatGPT 发布（片子起点；非本条线资料） | — | — | — |
| 2023-01-31 | Samsung 4Q22：营收 70.46 万亿，营业利润 4.31 万亿；"存储业务因价格下跌和客户去库存收益大幅下降" | 4.31 万亿韩元 | https://news.samsung.com/global/samsung-electronics-announces-fourth-quarter-and-fy-2022-results | 已核实（一手） |
| 2023-03-02 | TrendForce：4Q22 全球 DRAM 营收 -32.5%，预计 1Q23 供应商"由盈转亏" | $12.281B；Samsung $5.54B、SK hynix $3.398B、Micron $2.829B | https://www.trendforce.com/presscenter/news/20230302-11588.html | 已核实（一手） |
| 2023-03-02 | Micron FQ2-23 结束：GAAP 毛利率 -32.7%（本轮谷底） | 营收 $3.693B | https://investors.micron.com/news-releases/news-release-details/micron-technology-inc-reports-results-second-quarter-fiscal-2023 | 已核实（一手） |
| 2023-03-28 | TrendForce：DRAM ASP 1Q23 "暴跌 20%"，预计 2Q23 再降 10~15%（5 月改为 13~18%） | -20% | https://www.trendforce.com/presscenter/news/20230328-11626.html | 已核实（一手） |
| 2023-04-26/27 | SK hynix 1Q23 营业亏损 3.402 万亿；Samsung DS 亏损 4.58 万亿 | 营收 5.088 万亿 / 13.73 万亿 | https://www.storagenewsletter.com/2023/04/26/sk-hynix-fiscal-1q23-financial-results/ ；https://news.samsung.com/global/samsung-electronics-announces-first-quarter-2023-results | 已核实（一手/二手一致） |
| 2023-07-05 | TrendForce：3Q23 DRAM ASP 降幅收窄到 0~5% | -0~5% | https://www.trendforce.com/presscenter/news/20230705-11743.html | 预测 |
| 2023-08-03 | DDR4 8Gb(1Gx8) 2666 现货均价 $1.466（本轮低点附近） | $1.466 | https://www.trendforce.com/news/2023/08/02/memory-spot-prices-update-dram-still-falling-nand-flash-slows-down/ | 已核实（一手） |
| 2023-12-04 | TrendForce：合约价"在三季度见底"；3Q23 营收 $13.48B（+18%）；预计 4Q23 +13~18% | $13.48B | https://www.trendforce.com/presscenter/news/20231204-11942.html | 已核实（一手） |
| 2024-01（4Q23 财报） | SK hynix 4Q23 营业利润 +0.346 万亿（转正）；Samsung DS 4Q23 仍亏 2.18 万亿 | 营收 11.3055 万亿 | https://news.skhynix.com/sk-hynix-announces-1q24-financial-results/ ；https://news.samsung.com/global/samsung-electronics-announces-fourth-quarter-and-fy-2023-results | 已核实（一手） |
| 2024-03-05 | TrendForce：4Q23 营收 $17.46B（+29.6%）；预计 1Q24 合约价近 +20% | $17.46B | https://www.trendforce.com/presscenter/news/20240305-12060.html | 已核实（一手） |
| 2024-08-15 | TrendForce：2Q24 营收 $22.9B；2Q 最终合约价 +13~18%；3Q24 上调至 +8~13% | $22.9B | https://www.trendforce.com/presscenter/news/20240815-12254.html | 已核实（一手） |
| 2024-10-09 | TrendForce：4Q24 通用 DRAM 预计 +0~5%（PC DRAM 持平） | 0~5% | https://www.trendforce.com/presscenter/news/20241009-12325.html | 预测 |
| 2024-11-26 | TrendForce：3Q24 营收 $26.02B（+13.6%），合约价 +8~13% | $26.02B | https://www.trendforce.com/presscenter/news/20241126-12380.html | 已核实（一手） |
| 2024-12-30 | TrendForce：1Q25 通用 DRAM 预计 -8~13%（含 HBM 为 0~-5%）；4Q24 消费级 DRAM 价格已开始下跌 | -8~13% | https://www.trendforce.com/presscenter/news/20241230-12424.html | 预测 |
| 2025-03-25 | TrendForce：2Q25 通用 DRAM 预计 0~-5%（含 HBM +3~8%） | 0~-5% | https://www.trendforce.com/presscenter/news/20250325-12528.html | 预测 |
| 2025-06-03 | TrendForce：1Q25 营收 $27.01B（-5.5%），SK hynix 首次超过 Samsung 登顶 | $9.72B vs $9.10B | https://www.trendforce.com/presscenter/news/20250603-12603.html | 已核实（一手） |
| 2025-06-23 | DDR5 16Gb 现货 $6.01，DDR4 16Gb 现货 $12（DDR4 16Gb 价格近 DDR5 两倍，DRAM 史上首次） | $6.01 / $12 | https://www.trendforce.com/news/2025/06/24/news-historic-ddr4-spot-price-rally-reportedly-doubles-ddr5-propelling-nanya-techs-inventory-windfall/ | 已核实（一手） |
| 2025-07-07 | TrendForce：3Q25 通用 DRAM +10~15%（含 HBM +15~20%），消费级 DDR4 +40~45% | +10~15% | https://www.trendforce.com/presscenter/news/20250707-12633.html | 预测 |
| 2025-09-24 | TrendForce：4Q25 通用 DRAM +8~13%；"3Q25 消费级 DDR4 价格近乎翻倍" | +8~13% | https://www.trendforce.com/presscenter/news/20250924-12733.html | 预测 / 已核实（一手） |
| 2025-10 | 32GB (2×16GB) DDR5 套装约 $100~200；32GB DDR4 套装 $60~90 | — | https://www.tomshardware.com/pc-components/ram/ram-price-index-2026-lowest-price-on-ddr5-and-ddr4-memory-of-all-capacities | 已核实（二手一致） |
| 2025-11-19 | TrendForce：DDR5 16Gb 现货自 9 月初涨 307%，DDR4 8Gb 涨 158% | +307% | https://www.trendforce.com/news/2025/11/19/insights-memory-spot-price-update-ddr5-prices-up-307-since-september-as-module-costs-poised-to-surge/ | 已核实（一手） |
| 2025-11-26 | TrendForce：3Q25 营收 $41.4B（+30.9%）；4Q25 预测上调至 +45~50%（含 HBM +50~55%） | +45~50% | https://www.trendforce.com/presscenter/news/20251126-12802.html | 预测 |
| 2025-12-01/05 | Raspberry Pi 涨价（Pi 5 16GB +$25）；Dell 最早 12 月中旬起涨至少 15~20%，Lenovo 报价 2026-01-01 失效 | +15~20% | https://www.pcworld.com/article/2997505/ai-driven-ram-shortage-hits-raspberry-pi-price-hikes-and-a-new-budget-model.html ；https://www.trendforce.com/news/2025/12/05/exclusive-memory-crunch-hits-pcs-dell-hikes-prices-15-20-mid-december-lenovo-from-january-2026/ | 已核实（二手一致）（Dell 幅度为行业消息） |
| 2026-01-28 | SK hynix 4Q25：营收 32.827 万亿、营业利润 19.170 万亿；FY25 营业利润 47.206 万亿 | 58% 利润率 | https://news.skhynix.com/en/sk-hynix-announces-fy25-financial-results/ | 已核实（一手） |
| 2026-02-02 | TrendForce：1Q26 通用 DRAM 预测由 +55~60% 上调至 +90~95%，NAND +55~60%，PC DRAM 超 +100% | +90~95% | https://www.trendforce.com/presscenter/news/20260202-12911.html | 预测 |
| 2026-02-25/26 | HP：内存占 PC 物料成本 35%（上季 15~18%）；IDC 下调 2026 PC -11.3%、手机 -12.9% | 35% | https://www.tomshardware.com/tech-industry/hp-says-memory-costs-doubled-to-35-percent-of-pc-build-materials-in-one-quarter ；https://www.idc.com/resource-center/blog/higher-asps-lower-unit-volumes-how-the-memory-crisis-is-reshaping-the-pc-and-smartphone-outlook/ | 自报 / 预测 |
| 2026-02-26 | TrendForce：4Q25 营收 $53.58B（+29.4%），Samsung 重回第一（$19.30B/36%） | $53.58B | https://www.trendforce.com/presscenter/news/20260226-12937.html | 已核实（一手） |
| 2026-03-12 | 美国最便宜的 32GB DDR5 套装 $360，比两个月前（$290~325）高约 20% | $360 | https://www.techradar.com/computing/memory/ddr5-ram-hits-painful-new-high-in-pricing-and-it-looks-like-the-relentless-price-hike-misery-will-continue | 已核实（二手一致） |
| 2026-03-31 | TrendForce：2Q26 通用 DRAM +58~63%，NAND +70~75% | +58~63% | https://www.trendforce.com/presscenter/news/20260331-12995.html | 预测 |
| 2026-04-10 | TechSpot：3 月 DDR5 现货当月近 -30%（16Gb 现货 $37.20），DDR4 16Gb 现货 -5% 至 $74.10，近一年首降 | $37.20 / $74.10 | https://www.techspot.com/news/112030-memory-prices-finally-falling-but-ram-remain-unaffordable.html | 未核实（单一二手，转述亚洲供应链消息） |
| 2026-04-23 | SK hynix 1Q26：营收 52.576 万亿、营业利润 37.610 万亿（72%） | — | https://news.skhynix.com/q1-2026-business-results/ | 已核实（一手） |
| 2026-04-30 | Samsung 1Q26：营收 133.9 万亿、营业利润 57.2 万亿；DS 营收 81.7 万亿、营业利润 53.7 万亿 | — | https://news.samsung.com/global/samsung-electronics-announces-first-quarter-2026-results | 已核实（一手） |
| 2026-05-14 | TrendForce：2Q26 LPDDR5X +78~83%、LPDDR4X +70~75%；手机规格降级（高端回到 12GB、中端 8GB、入门 4GB） | +78~83% | https://www.trendforce.com/presscenter/news/20260514-13044.html | 预测 |
| 2026-06-01 | TrendForce：1Q26 营收 $97B（+81%），通用 DRAM 合约价实际约 +93~98%；HBM 合约价 2026 年下降限制了 SK hynix ASP | $97B | https://www.trendforce.com/presscenter/news/20260601-13070.html | 已核实（一手） |
| 2026-06-03 | Tom's Hardware：最便宜 32GB DDR5 $375，"曾经不到 $100 的东西现在贵近 4 倍" | $375 | https://www.tomshardware.com/pc-components/ddr5/32gb-of-ddr5-now-costs-usd375-minimum-ai-shortage-continues-to-squeeze-pc-building | 已核实（二手一致） |
| 2026-06-10 | Nvidia 把 Vera Rubin 模块的 SOCAMM 容量减半；供应商早期分配只够满足其 LPDRAM 需求的约 60% | -50% / 60% | https://www.trendforce.com/presscenter/news/20260610-13090.html | 已核实（一手）（TrendForce 报道） |
| 2026-06-25 | Apple 宣布 Mac/iPad 全线涨价；Cook 对 WSJ："a hundred-year flood" | +$100~300 | https://www.cnbc.com/amp/2026/06/25/apple-macbook-ipad-price-hike-memory.html | 已核实（二手一致） |
| 2026-06-26 | Xbox 宣布 8 月涨价：入门款 $400→$499（+$100），称内存/存储近期涨 2.5 倍 | +$100 | https://www.trendforce.com/news/2026/06/26/news-apple-price-hikes-erode-neos-cost-edge-as-xbox-cites-2-5x-memory-surge-for-new-increase/ | 未核实（单一二手转述） |
| 2026-06-29 | 美国 17 名消费者起诉 Samsung、SK hynix、Micron 操纵 DRAM 供应（原告称价格 4 年涨约 700%） | 约 700%（原告主张） | https://www.trendforce.com/news/2026/06/29/news-samsung-sk-hynix-micron-face-u-s-class-action-lawsuit-over-alleged-dram-supply-manipulation/ | 自报（原告指控，未裁决） |
| 2026-07-03 | TrendForce：3Q26 通用 DRAM +13~18%，NAND +10~15%；"消费需求走弱、基数变高" | +13~18% | https://www.trendforce.com/presscenter/news/20260703-13134.html | 预测 |
| 2026-07-28/29 | SK hynix 2Q26：营收 79.319 万亿、营业利润 60.543 万亿（76%） | — | https://news.skhynix.com/en/q2-2026-business-results/ | 已核实（一手） |
| 2026-07-30 | Samsung 2Q26：营收 171.5 万亿、营业利润 89.5 万亿；DS 营收 127.5 万亿、营业利润 89.2 万亿 | — | https://news.samsung.com/global/samsung-electronics-announces-second-quarter-2026-results | 已核实（一手） |
| 2026-08-18 | Tom's Hardware：DDR5 套装 12 个月内最高涨约 500%，128GB DDR5-6400 从历史最低 $329 到 $3,399 | $329→$3,399 | https://hwbusters.com/news/ddr5-memory-prices-are-up-500-in-a-year-and-a-128gb-kit-now-lists-at-3399/ | 已核实（二手一致）（HWBusters 转述 Tom's） |
| 2026-09-04 | TrendForce：2026 笔记本出货降幅收窄到 -9.4%；核心部件占 BOM 由 1Q25 约 45% 升至 3Q26 68% | -9.4% | https://www.trendforce.com/presscenter/news/20260904-13217.html | 预测 |
| 2026-09-07 | TrendForce：2Q26 DRAM 营收 $154.73B（+59.5%）；Samsung $60.98B/39.4%、SK hynix $38.59B/24.9%、Micron $36.0B/23.3% | $154.73B | https://www.trendforce.com/presscenter/news/20260907-13219.html | 已核实（一手） |
| 2026-09-08 | TrendForce：2026 手机产量预测由 10.51 亿上调至 10.7 亿部（降幅 -16.2% → -14%）；2Q26 产量 2.75 亿部（-8%） | 10.7 亿 | https://www.trendforce.com/presscenter/news/20260908-13222.html | 预测 |
| 2026-09-30 | TrendForce：4Q26 通用 DRAM +10~15%，NAND +15~20%，企业级 SSD 是唯一加速项 | +10~15% | https://www.trendforce.com/presscenter/news/20260930-13258.html | 预测 |
| 2026-09-30 | Micron FQ4-26：营收 $54.229B（+31% 环比、+379% 同比），毛利率 86.8%（GAAP），FQ1-27 指引 $61.5B | 营业利润率 82.3% | https://investors.micron.com/news/press-release/2026/Micron-Technology-Inc--Reports-Record-Fiscal-Fourth-Quarter-and-Full-Year-2026-Results | 已核实（一手） |
| 2026-10-08 | Samsung 3Q26 初步：营业利润 107.4 万亿（+782.5%），营收约 195 万亿；媒体估计 MX 亏约 1.5 万亿 | 55.1% 利润率 | https://biz.heraldcorp.com/article/10896441 ；https://www.trendforce.com/news/?p=65017 | 自报（初步）；MX 为 未核实 |
| 2026-10-15 | TSMC 3Q26：营收 US$46.72B（+41.2%），HPC 68% | 66.4% 毛利率 | https://investor.tsmc.com/english/quarterly-results/2026/q3 | 已核实（一手） |
| 2026-10-19 | Counterpoint：中国手机 3Q26 出货同比 -10%，为 2012 年以来最低；Huawei 自 9 月 1 日起官方涨价 | -10% | https://www.counterpointresearch.com/en/insights/china-smartphone-shipments-hit-14-year-low-in-q3-2026 | 已核实（一手） |
| 2026-10-22 | Counterpoint：全球 PC 3Q26 出货 5700 万台，同比 -21%，4Q 预计 -27%；TrendForce 现货：DDR5 16Gb $61.10 | -21% | https://www.counterpointresearch.com/en/insights/global-pc-shipments-plunge-21-percent-in-q3-2026 ；https://www.trendforce.com/price/dram/dram_spot | 已核实（一手） |
| 2026-10-29（待发） | Samsung 3Q26 完整财报；SK hynix 3Q26 财报截至今天未发布 | 分析师预期营业利润约 70~78 万亿（未核实） | — | 未核实 |

## 1. DRAM / NAND 价格怎么涨的

**合约价（TrendForce，通用 DRAM，季度环比）**
- 谷底到起飞：2023 年 3Q 合约价见底（TrendForce 2023-12 稿），之后 2024 年每季 +8~20%，2024 年 4Q–2025 年 2Q 小幅回落，2025 年 3Q 起加速：3Q25 预测 +10~15%（消费级 DDR4 近乎翻倍）、4Q25 +45~50%、1Q26 +93~98%、2Q26 预测 +58~63%。3Q26/4Q26 预测 +13~18% / +10~15%。
- 4Q25 预测被连续上修：2025-09-24 +8~13% → 11 月初 +18~23% → 2025-11-26 +45~50%（后为实际）。（注：中间一步 18~23% 来自搜索摘要，未直接核对原稿）
- 分项（2026-02-02）：1Q26 PC DRAM 预测超 +100%，服务器 DRAM 约 +90%，LPDDR 约 +90%，NAND +55~60%，企业级 SSD +53~58%。
- 服务器 DRAM：2H25 累计 +64%，2026 预计约 +270%；企业级 SSD 2H25 约 +35%，2026 预计累计 +235%；2027 HBM 合约价可能再涨 70~140%（TrendForce 2026-08-25 稿 https://www.trendforce.com/presscenter/news/20260825-13198.html ，预测）。
- NAND：2026 年 1Q +55~60%（预测）、2Q +70~75%（预测）、3Q +10~15%、4Q +15~20%。2027 下半年 NAND 供给宽松，价格承压；DRAM 紧张延续（https://www.trendforce.com/presscenter/news/20260730-13158.html ，预测）。
- TrendForce 全球存储市场：2026 年预计 $889.3B（DRAM $618.7B，+303%），2027 年 >$1.28T（https://www.trendforce.com/presscenter/news/20260529-13068.html ，预测）。

**现货价（颗粒；TrendForce/DRAMeXchange）**见"图表数据 B"。要点：现货比合约价更剧烈、更早、也更早松动（2026 年 3 月 DDR5 现货当月近 -30% 之后又回升）；TrendForce 自己提醒现货不是观察价格趋势的最佳指标。

**零售（Tom's Hardware 最低价追踪 / PCPartPicker）**见"图表数据 C"。Tom's 2026-10-19 更新的指数页：DDR5-6000 32GB 美国最低价 $449（追踪期内最低 $72）、DDR5-6400 128GB $4,099（最低 $329）、DDR4-3600 16GB $132（最低 $29）。注意"追踪期内最低"不是同一个时间窗口。

**中国市场**：2025-10，16GB DDR4 内存条约 RMB 200 → 350~520；Lenovo 16GB DDR5 约 RMB 300 → 599；Samsung 16GB DDR5 约 RMB 400（9 月）→ 738（一财转述，经 TrendForce 2025-11-06 稿 https://www.trendforce.com/news/2025/11/06/news-chinas-memory-market-reportedly-sees-daily-price-hikes-16gb-ddr4-module-soars-160-in-october/ ，未核实（单一二手））。OPPO 2026-03-16 起涨价最多 RMB 500（https://www.trendforce.com/news/2026/03/10/news-chinese-smartphone-price-hikes-begin-oppo-announces-increases-from-mar-16-reportedly-up-to-%c2%a5500/ ，未核实）。Huawei 2026-09-01 起官方涨价（Counterpoint，已核实（一手））。

## 2. 为什么：HBM 与服务器吃掉晶圆

- **晶圆与位元的错位**：TrendForce 数据显示 HBM 占前三大厂 DRAM 晶圆投片 18%（2025 末）→ 22%（2026 末）→ 30%（2027 末），但占位元供给仅 8% → 9% → 13%。→ 2026 年 HBM 每位元占用晶圆约为平均的 22/9≈2.4 倍（2025：18/8≈2.25 倍）（推算）。业内常说的"约 3:1"本次没有拿到一手来源（见未核实）。
- **HBM 与 RDIMM 一起占位元**：HBM 与 RDIMM 合计占 2026 年 DRAM 位元供给的 51%（TrendForce 2026-08-25 稿，预测）。2027 年服务器 DRAM 与 HBM 合计位元供给 +27%。
- **是缺货，不是需求爆炸**：2026 年 DRAM 供给满足率约 -1%~-2%（TrendForce 2026-07-30，预测）；Micron 预计 2026 行业 DRAM 位元出货增长"mid-20s%"，2027/2028 约"low-20s%"。服务器出货量 2026 年增长约 17%（TrendForce）/"high-teens%"（Micron）。营收翻几倍靠的是价格。
- **云厂资本开支把需求推高**：九大 CSP 2026 年资本开支预测 $830B（2026-05-06 稿）→ $957B（2026-10-14 稿，+106% 同比），2027 年预测 >$1.5T（+60%）；AI 服务器 2026 年约 $479B，2027 年近 $920B（https://www.trendforce.com/presscenter/news/20261014-13269.html ，预测）。TrendForce 另称 DRAM+NAND 占主要 CSP 资本开支比重 2026 年 47% → 2027 年 68%（https://www.trendforce.com/presscenter/news/20260825-13198.html ，口径未核对原文，预测）。
- **连 Nvidia 也被卡**：2026-06-10，Nvidia 把 Vera Rubin 模块的 SOCAMM 容量减半，原因是供应商 2027 初步分配只够满足其约 60% 的 LPDRAM 需求；2026-08-04，Nvidia 评估为 Rubin Ultra 降低 HBM 配置（12-Hi HBM4e 基线，备选 8-Hi 或 HBM4）（https://www.trendforce.com/presscenter/news/20260610-13090.html ；https://www.trendforce.com/presscenter/news/20260804-13166.html ，已核实（一手））。
- **HBM 自己并没有涨价**：TrendForce 2026-06-01：SK hynix ASP 增长"partially constrained by declining HBM contract prices in 2026"；2026-06-02：1Q26 HBM 晶圆收入被 DDR5 64GB RDIMM 超越，HBM 盈利能力低于 DDR5 64GB RDIMM；2027 年 HBM 混合 ASP 预计 +121%（2026-09-29）。Micron 称已锁定 2027 年 HBM 位元供给的绝大部分，价格同比"significant"上涨。
- **消费端供给退出**：TrendForce 2Q26 稿称消费级 DRAM"supply shortages persist due to major suppliers' gradual exit"（https://www.trendforce.com/presscenter/news/20260331-12995.html ）。
- **扩产在路上但不够快**：Micron：新增洁净室产出要到 2027 年中（ID1）、2028 年（ID2、日本）、2030 年（纽约）；"we do not have line of sight to when supply and demand will return to balance"。TrendForce：DRAM 有意义的产能爬坡在 2H27，实质贡献在 2028。

## 3. 内存厂业绩

**SK hynix（官方 IR，已核实（一手））**见"图表数据 D"。要点：2Q26 营收 79.319 万亿（+257% 同比）、营业利润 60.543 万亿（+557%）、营业利润率 76%；净利润 93.923 万亿（含非经营性收益，净利润率 118%）；2Q26 HBM4 开始量产出货；与约 10 家客户签订长期协议；1Q26 起首次单季营收破 50 万亿。2025 年 3Q 是首次营业利润破 10 万亿。3Q26 财报尚未发布。

**Samsung（官方，已核实（一手））**：合并营业利润 4Q22 4.31 万亿 → 1Q23 0.64 万亿 → 4Q25 20.1 万亿 → 1Q26 57.2 万亿 → 2Q26 89.5 万亿 → 3Q26 初步 107.4 万亿（自报）。3Q26 的 DS 部门数据未披露，媒体估计半导体营业利润 >100 万亿、存储接近 110 万亿、非存储亏损（Hankyung 估计经 Herald 转述，未核实）。共识预期：LSEG 106.1 万亿（TrendForce）vs Herald 称市场最初预期 >120 万亿并已下修——两家说法冲突。

**Micron（官方，已核实（一手））**：FQ4-26（截至 2026-09-03）营收 $54.229B：DRAM $39.8B（占 73%）、NAND $14.1B；毛利率 GAAP 86.8%；营业利润 $43.8B（GAAP）；FY26 营收 $133.2B（+256%），DRAM 营收 >$100B；已签 26 份 SCA（take-or-pay），RPO 约 $150B，客户承诺金额 $32B，多数是现金押金。FQ3-26 毛利率 84.9%（CNBC，对比一年前 39%）。

**份额**：见"图表数据 D"。TrendForce：SK hynix 1Q25 首次超越 Samsung，1Q25–3Q25 连续第一（3Q25 为 33.2% vs 32.6%，差距极小），4Q25 Samsung 重回第一。Counterpoint 同口径给出 2Q26 DRAM 营收份额 Samsung 38%/SK hynix 25%/Micron 24%，HBM 份额 SK hynix 50%/Samsung 33%/Micron 18%。

**市值（CompaniesMarketCap，2026-10-21，二手聚合）**：SK hynix $672.66B（2022 年末 $40.65B，约 16.5 倍）；Samsung $1.054T（2022 年末 $293.0B，约 3.6 倍）；Micron $1.033T（2022 年末 $54.53B，约 18.9 倍）；TSMC $2.239T（2022 年末 $386.31B，2024 年末 $1.045T）。倍数 推算。取的是"2022 年末"不是"2022-11"。

## 4. PC 与手机被挤压

- **预测一路下修，又在 9 月局部上修**：TrendForce 笔记本 2026 预测 2025-12 由 +1.7% 降到 -2.4%（Dell/Lenovo 稿）→ 2026-07 -13.6% → 2026-09 -9.4%（CPU 供给改善）；手机产量 2026-06 10.51 亿（-16.2%）→ 2026-09 10.7 亿（-14%）。IDC（2026-02-26）PC -11.3%、手机 -12.9%，是"比我们最悲观情景还差"。Counterpoint 3Q26 PC 实际 -21%、4Q 预测 -27%，2027 持平。口径不同（TrendForce 是笔记本/手机生产量，Counterpoint 是全球 PC 出货），方向一致、幅度差距大。
- **花更多钱买更少东西**：IDC 2026 PC 收入 +1.6% 而出货 -11.3%，手机收入 -0.5% 而出货 -12.9%；Micron："PC and mobile industry revenue remain on track to grow this calendar year ... despite potential double-digit overall unit declines in both markets"。
- **内存在 BOM 里占多大**：HP 35%（上季 15~18%）；iPhone 18 Pro 256GB 约 10% → 34%（3Q26）→ >40%（1H27）；BOM 同比 +38%，内存价格自 2025 年初涨 5~7 倍；新机预计涨价 10~20%（TrendForce 2026-08-10/09-03）。笔记本 CPU+DRAM+SSD 合计占 BOM 1Q25 约 45% → 3Q26 68%。
- **OEM 涨价**：Dell、Lenovo（2025-12/2026-01）、HP、Raspberry Pi（2025-12）、Apple（2026-06-25，苹果声明"never seen a component price increase this much, this quickly"）、Xbox（2026-08 起 +$100）、OPPO（2026-03）、Huawei（2026-09-01）。Counterpoint 估计内存涨价让每部 iPhone 成本多约 $200（CNBC 转述）。
- **规格降级**：IDC 举例 12GB/256GB 手机可能变 8GB/128GB 同价；TrendForce 2026-05：高端手机 12GB 成主流、16GB 占比下降，中端回到 8GB，入门多为 4GB；2026 年手机平均 DRAM 容量预计 8.5GB（+10%）；笔记本品牌可能通过降低内存容量控 BOM（TrendForce 2026-10-08）。
- **反过来压到上游**：TSMC 3Q26 电话会："consumer and price-sensitive end market segments are being challenged due to the impact of rising component prices"，对 2027 "prudent"。
- **价格抬升传到零售**：见速查表；也传到 GPU/显存：TrendForce 2026-09-30 稿称 GDDR6 供给收缩、GDDR7 产出有限，显存价格上行（预测）。（GPU 成品价与 Framework/Xiaomi 涨价幅度本次未取得，见未核实）

## 5. TSMC / CoWoS / Nvidia

- **TSMC（官方 IR）**：3Q26 营收 US$46.72B（+41.2% 美元同比），毛利率 66.4%、营业利润率 58.7%；2nm 占晶圆收入 8%、3nm 33%、5nm 28%、7nm 10%，先进制程合计 79%；HPC 占营收 68%；2026 全年营收预计增长约 44%（美元）；2026 资本开支 $60~64B；4Q26 营收指引 $52.3~54.3B。AI accelerator（窄口径，不含 CPU）CAGR 2024-2029 指引"mid- to high 50s%"，CEO："probably will be higher"。TSMC 2026-10 的 AI accelerator 占营收百分比本次未取得（见未核实）。
- **CoWoS 产能（均为媒体转述）**：见"图表数据 E"。TSMC 官方只给增速（2022-2026 CAGR >50%，SEMICON Taiwan 2024-09；Reuters 称 2022-2027 CAGR >80%）与"5x 光罩尺寸已量产、9x/14x 在开发"。CoWoS 供需缺口约 20%，预计 2026 年底收窄到约 10%（经济日报，TrendForce 转载）。Nvidia 占 2025 年 CoWoS-L 产能 >70%（经济日报，TrendForce 转载 2025-02-24）。TrendForce 2026-09-18：CoWoS-L 到 2028 年仍是主流；2026 年 Nvidia 高端 GPU 出货预计增长约 30%（https://www.trendforce.com/presscenter/news/20260918-13241.html ）；2026-04-08：Blackwell 将占 Nvidia 2026 年高端 GPU 出货 70% 以上。
- **Nvidia（官方）**：2Q FY27（2026-07-26 季度，8 月 26 日公布）营收 $96.2B（+106%），数据中心 $89.0B（+117%），毛利率 75.0%；3Q FY27 指引 $108.0B±2%（不含中国数据中心计算收入）。对照 4Q FY23（2023-01 季度）：营收 $6.05B、数据中心 $3.62B。
- **TSMC 市值 $1 万亿的日期**：本次没有取得可靠日期（CompaniesMarketCap 只显示 2024 年末 $1.045T），见未核实。

## 6. GPU 租赁价：一个不干净的"反例"

- **Silicon Data H100 租赁指数（按 GPU·小时）**：云巨头 2023-08~12 中位数 $7.76；2024-06~12 $9.34；2025-07~12 $6.26。撮合市场（marketplace）2024-06~12 $2.58；2025-07~12 $1.95。Neocloud 2025-07~12 $3.33。（https://www.silicondata.com/blog/h100-rental-price-over-time ，二手聚合，口径为其自家指数）
- **最新**：GetDeploying 2026-10-22：H100 按需中位数 $3.86（37 家供应商），最低 $1.80，约比一年前高 13%；ComputePrices 同日按在库挂牌我自己粗算 SXM 中位数约 $3.17、均价约 $3.65（推算，页面不给汇总）。（https://getdeploying.com/gpus/nvidia-h100 ；https://computeprices.com/gpus/h100 ）
- **结论**：流传的"H100 $8 → $2"是把 2023 云巨头价格与 2025 撮合市场价格拼在一起；同口径内，云巨头 2023→2025 下降约 19%（推算），撮合市场 2024→2025 下降约 24%（推算），且 2026 年已回升。作为"算力变便宜"的反例只能小心使用。

---

## 图表数据

### A. TrendForce 通用 DRAM 合约价环比（%）与推算累计指数

说明：每季取 TrendForce 最近一次表述（预测/最终/实际）；区间两端来自同一表述；指数由区间端点连乘，误差会累积，故给低/中/高。**推算**。

```csv
quarter,qoq_low_pct,qoq_high_pct,basis,source_date,idx_3Q23_low,idx_3Q23_mid,idx_3Q23_high
4Q22,-18,-13,预测,2022-09-22,,,
1Q23,-20,-20,实际(ASP),2023-03-28,,,
2Q23,-18,-13,预测,2023-05-09,,,
3Q23,-5,0,预测,2023-07-05,100,100,100
4Q23,13,18,预测,2023-12-04,113,116,118
1Q24,13,23,预测(近+20%),2024-03-05,128,136,145
2Q24,13,18,最终,2024-08-15,144,157,171
3Q24,8,13,最终,2024-11-26,156,174,194
4Q24,-5,5,预测(0~+5; 实际转弱, 取区间),2024-10-09,148,174,203
1Q25,-13,-8,预测,2024-12-30,129,156,187
2Q25,-5,5,预测(0~-5; DDR4后被上修, 取区间),2025-03-25,122,156,196
3Q25,10,15,预测(实际更高,消费DDR4近乎翻倍),2025-07-07,135,175,226
4Q25,45,50,实际重述,2026-02-26,195,258,339
1Q26,93,98,实际,2026-06-01,377,505,671
2Q26,58,63,预测(实际未单独重述),2026-03-31,595,811,1093
3Q26,13,18,预测,2026-07-03,673,936,1290
4Q26,10,15,预测,2026-09-30,740,1053,1483
```

更窄的基点（2Q25=100）：3Q25 112，4Q25 166，1Q26 324，2Q26 521，3Q26 601，4Q26 677（区间 605~755）。**推算**。（2Q26 若用 TrendForce 之外的转述"约 60%"，结果相同。）

补充序列（TrendForce 其它口径，已核实（一手））：
```csv
quarter,global_dram_revenue_usd_bn,qoq_pct,note
4Q22,12.281,-32.5,TrendForce 20230302
2Q23,11.42,,由 3Q23=13.48 与 +18% 反推 (推算)
3Q23,13.48,18.0,TrendForce 20231204
4Q23,17.46,29.6,TrendForce 20240305
1Q24,18.35,5.1,TrendForce 20240613
2Q24,22.9,24.8,TrendForce 20240815
3Q24,26.02,13.6,TrendForce 20241126
4Q24,28.58,,由 1Q25=27.01 与 -5.5% 反推 (推算)
1Q25,27.01,-5.5,TrendForce 20250603
2Q25,31.63,17.1,TrendForce 20250902
3Q25,41.4,30.9,TrendForce 20251126
4Q25,53.58,29.4,TrendForce 20260226
1Q26,97.0,81.0,TrendForce 20260601
2Q26,154.73,59.5,TrendForce 20260907
```

### B. 现货价点（TrendForce / DRAMeXchange，美元/颗粒）

```csv
date,item,price_usd,source,strength
2023-08-03,DDR4 8Gb(1Gx8) 2666,1.466,TrendForce news 2023-08-02(周对比 1.479→1.468),已核实（一手）
2023-11-29,DDR4 8Gb(1Gx8) 2666,1.712,DRAMeXchange Daily Express,已核实（一手）
2024-04-24,DDR5 16Gb(2Gx8) 4800/5600,4.85,TrendForce 价格页快照(经搜索摘要),未核实
2025-06-23,DDR5 16Gb(2Gx8) 4800/5600,6.01,TrendForce news 2025-06-24,已核实（一手）
2025-06-23,DDR4 16Gb(1Gx16) 3200,12.00,同上,已核实（一手）
2025-11-18,DDR4 8Gb(1Gx8) 3200,12.757,TrendForce news 2025-11-19,已核实（一手）
2025-12-09,DDR4 8Gb(1Gx8) 3200,17.064,TrendForce news 2025-12-10,已核实（一手）
2026-03(约),DDR5 16Gb,37.20,TechSpot 2026-04-10(转述),未核实
2026-06-09,DDR4 8Gb(1Gx8) 3200,35.90,DRAMeXchange 日报(经搜索摘要)与 MuyComputer 一致,已核实（二手一致）
2026-08-31,DDR5 16Gb 4800/5600,53.92,BuySellRAM 引 TrendForce,已核实（二手一致）
2026-08-31,DDR4 8Gb 3200,44.37,同上,已核实（二手一致）
2026-10-05,DDR5 16Gb 4800/5600,58.07,同上,已核实（二手一致）
2026-10-22,DDR5 16Gb 4800/5600,61.10,TrendForce 价格页,已核实（一手）
2026-10-22,DDR4 8Gb 3200,47.00,同上,已核实（一手）
2026-10-22,DDR4 16Gb 3200,83.117,同上,已核实（一手）
```
2023 年谷底的 DDR5 16Gb 现货价没有取得（见未核实）。2025-09 初到 2025-11-18：DDR5 16Gb +307%、DDR4 8Gb +158%（百分比已核实（一手），基数未给）。DDR4 8Gb 在 2023 为 2666 规格、2025 起主流为 3200 规格，跨规格比较只能示意。

### C. 零售内存套装点（美国，最低价追踪）

```csv
date,item,price_usd,source,strength
2025-08(均价),DDR5-6000 2x32GB 64GB,222,Tom's 数据经 HWBusters 转述,已核实（二手一致）
2025-10,32GB(2x16GB) DDR5,100~200,Tom's Hardware 指数页,已核实（二手一致）
2025-10,32GB(2x16GB) DDR4,60~90,Tom's Hardware 指数页,已核实（二手一致）
2026-01,32GB(2x16GB) DDR5,350起,Tom's Hardware 指数页,已核实（二手一致）
2026-01,32GB(2x16GB) DDR4,150~180,Tom's Hardware 指数页,已核实（二手一致）
2026-03-12,32GB DDR5 最便宜,360,TechRadar 转述 Tom's/Amazon（两个月前 290~325）,已核实（二手一致）
2026-06-03,32GB DDR5 最便宜,375,Tom's Hardware(PCPartPicker 追踪),已核实（二手一致）
2026-08(均价),DDR5-6000 2x32GB 64GB,1272,Tom's 数据经 HWBusters(+473% 同比),已核实（二手一致）
2026-10-19,DDR5-6000 32GB,449,Tom's 指数页(最后更新 2026-10-19),已核实（一手）（Tom's 自己的追踪）
2026-10-19,DDR5-6000 16GB,279,同上,已核实（一手）
2026-10-19,DDR4-3200 16GB,104,同上,已核实（一手）
2026-10-19,DDR4-3600 16GB,132,同上(追踪期内最低 $29),已核实（一手）
2026-10-19,DDR5-6400 128GB,4099,同上(追踪期内最低 $329),已核实（一手）
```
"2025 年中 32GB DDR5 常 <$100"：Tom's 2026-06-03 称"曾经不到 $100"；追踪期内 DDR5-6000 32GB 最低 $72（时间点未标）。PCPartPicker 的价格曲线是图片，数值没取到。NAND/SSD 零售价序列没有取得；SSD 方面只有合约价：NAND 1Q26 +55~60%、2Q26 +70~75%、3Q26 +10~15%、4Q26 +15~20%（均为 TrendForce 预测，1Q26 另见 2026-02-02 稿）。

### D. 厂商季度数据

SK hynix（万亿韩元，K-IFRS，已核实（一手））：
```csv
quarter,revenue_trn_krw,op_profit_trn_krw,op_margin_pct
4Q22,7.699,-1.701,
1Q23,5.088,-3.402,
2Q23,7.3059,-2.8821,-39
3Q23,9.0662,-1.792,-20
4Q23,11.3055,0.346,3
1Q24,12.4296,2.886,23
2Q24,16.4233,5.4685,33
3Q24,17.5731,7.030,40
4Q24,19.7670,8.0828,41
1Q25,17.6391,7.4405,42
2Q25,22.2320,9.2129,41
3Q25,24.4489,11.3834,47
4Q25,32.8267,19.1696,58
1Q26,52.5763,37.6103,72
2Q26,79.3187,60.5426,76
```
Samsung DS 部门（万亿韩元，已核实（一手）；2Q24、3Q24 页面未能读取，未列）：
```csv
quarter,ds_revenue_trn_krw,ds_op_profit_trn_krw,consolidated_op_trn_krw
4Q22,,,4.31
1Q23,13.73,-4.58,0.64
2Q23,14.73,-4.36,0.67
3Q23,16.44,-3.75,
4Q23,21.69,-2.18,
1Q24,23.14,1.91,6.61
4Q24,30.1,2.9,6.5
1Q25,25.1,1.1,6.7
2Q25,27.9,0.4,4.7
3Q25,33.1,7.0,
4Q25,44.0,16.4,20.1
1Q26,81.7,53.7,57.2
2Q26,127.5,89.2,89.5
3Q26(初步),,,107.4
```
Micron（美元，已核实（一手））：FQ2-23 营收 3.693B、GAAP 毛利率 -32.7%；FQ3-23 3.752B、-17.8%；FQ3-26 毛利率 84.9%（CNBC）；FQ4-26 营收 54.229B、GAAP 毛利率 86.8%、非 GAAP 87.0%；FQ1-27 指引 61.5B、约 86.25%。其余 2023-2025 财季未取得。

DRAM 营收份额（TrendForce 一手，营收 $B/份额）：
```csv
quarter,samsung,sk_hynix,micron,rank1
4Q22,5.54/~45%(推算),3.398/~28%(推算),2.829/~23%(推算),Samsung
1Q24,8.05/43.9%,5.70/31.1%,3.95/21.5%,Samsung
1Q25,9.10/33.7%(推算),9.72/36.0%(推算),6.58/24.4%(推算),SK hynix
2Q25,10.35/32.7%,12.23/38.7%,6.95/22.0%,SK hynix
3Q25,13.5/32.6%,13.75/33.2%,10.65/25.7%,SK hynix
4Q25,19.30/36.0%,17.22/32.1%,11.98/22.4%,Samsung
1Q26,37.32/38.5%,27.98/28.8%,21.75/22.4%,Samsung
2Q26,60.98/39.4%,38.59/24.9%,36.0/23.3%,Samsung
```
HBM 营收份额（Counterpoint）：SK hynix/Samsung/Micron：2Q25 64/15/21；3Q25 56/23/21；4Q25 57/22/21；1Q26 58/21/21；2Q26 50/33/18。

### E. CoWoS 月产能（片/月，12 英寸；均为媒体转述）

```csv
year_end,tsmc_cowos_wpm,note,source,strength
2023,,未取得可引用来源,,未核实
2024,~35000,Commercial Times 引机构投资人,TrendForce news 2024-12-13,未核实
2025,70000~75000,目标/预测(Commercial Times 70k; 经济日报 75k),TrendForce news 2024-12-13 / 2025-01-02,未核实
2026,120000~140000,TSMC 自有(+OSAT 5~6万,合计约20万),TrendForce news 2026-06-15 引经济日报,未核实
```
TSMC 官方：CoWoS 产能 2022-2026 CAGR >50%（2024-09）；2026 年底前供需缺口约 20% → 约 10%（媒体）。

### F. 预测下修轨迹（出货，%）

```csv
date,source,metric,value_pct
2025-12-05,TrendForce,2026 笔记本出货,-2.4 (此前 +1.7)
2026-02-26,IDC,2026 PC 出货,-11.3
2026-02-26,IDC,2026 手机出货,-12.9
2026-06-09,TrendForce,2026 手机产量,-16.2 (10.51 亿)
2026-07-01,TrendForce,2026 笔记本出货,-13.6
2026-09-04,TrendForce,2026 笔记本出货,-9.4
2026-09-08,TrendForce,2026 手机产量,-14 (10.7 亿)
2026-10-22,Counterpoint,PC 3Q26 实际同比,-21 (4Q26 预测 -27)
2026-10-19,Counterpoint,中国手机 3Q26 同比,-10
```

---

## 比听起来弱的说法

1. **"内存涨了 X 倍"要先问哪一层。** 合约价（2Q25=100）到 4Q26 约 6.8 倍（推算，含预测）；零售 32GB DDR5 套装从不到 $100~200 到 $449（约 2.2~4.5 倍）；DDR4 16Gb 颗粒现货从 $3.20 到 $83（约 26 倍）。"2,200%"那类说法是 DDR4 现货，基数本来就被压到历史低位（2023 年 DDR4 8Gb 现货约 $1.47）。
2. **"HBM 抢产能所以内存涨价"只对一半。** HBM 自己的合约价 2026 年在下降（TrendForce 2026-06-01），1Q26 HBM 晶圆收入被 DDR5 64GB RDIMM 超越；涨得最凶的是通用 DRAM/NAND。HBM 只占 2026 年位元供给约 9%，但占晶圆投片约 22%——被挤走的是消费级/老制程产能。
3. **"约 3:1 的晶圆置换比"没有一手来源。** 本轮只能从 TrendForce 的晶圆/位元份额推出 2.25~2.4 倍（推算）。
4. **营收暴涨靠价格，不靠量。** Micron FQ4-26 DRAM 位元出货只增 +中个位数%，价格 +高十几%；行业 2026 年 DRAM 位元增长约 mid-20s%，而 TrendForce 估计 DRAM 市场规模同比 +303%。这是缺货型行情，不是"用量翻几十倍"。
5. **"SK hynix 超过 Samsung"是短暂的。** 仅 1Q25–3Q25 三个季度，3Q25 差距只有 0.6 个百分点（33.2% vs 32.6%）；4Q25 起 Samsung 重回第一，2Q26 已是 39.4% vs 24.9%。SK hynix 仍是 HBM 老大（2Q26 约 50%）。
6. **"Samsung 利润 107 万亿"是初步数，而且没有 DS 拆分。** 存储利润近 110 万亿、手机亏损等来自媒体估计；共识预期有 106.1 万亿（LSEG）与 >120 万亿（Herald）两种说法；财报日后才能定。
7. **PC/手机"出货暴跌"各机构口径差很大。** TrendForce 笔记本 2026 年 -9.4%，Counterpoint PC 3Q26 单季 -21%，IDC 2 月全年 -11.3%。别把单季、全年、生产量和出货量混在一张图里。
8. **"花更多钱买更少东西"才是准确表述。** IDC：PC 收入 +1.6%、出货 -11.3%；Micron：PC/手机行业收入仍增长，单位量下降两位数。
9. **GPU "$8→$2"并非干净下降。** 见第 6 节；2026 年 H100 租赁价反而在回升（约比一年前高 13%）。
10. **现货价下跌不等于见顶。** 2026 年 3 月 DDR5 现货当月近 -30%，随后继续回升；TrendForce 自己说现货不是趋势的最佳指标。4Q26 合约价预测 +10~15% 是"增速放缓"，水平仍在高位。TrendForce 2026-07-03 称消费需求走弱、基数变高。
11. **市值倍数是聚合站数字，且基准是 2022 年末，不是 2022-11。**
12. **CoWoS 片/月全是"reportedly"。** TSMC 不披露具体产能数字；各家转述的区间互相不一致（2025 年底 70k vs 75k）。
13. **诉讼里的"4 年涨 700%"是原告指控，** 不是裁决，也不是 TrendForce 数据。

## 未核实

- 2023 年谷底的 DDR5 16Gb 现货价（最近的是 2024-04-24 约 $4.85，经搜索摘要）；2025 年中的 DDR4 8Gb（只有 DDR4 16Gb $12 与 2025 年初"16GB 颗粒 $3.20"）；2025 年末（12 月）的 DDR5 16Gb 现货绝对价。
- 4Q24、2Q25、3Q25 的**实际**通用 DRAM 合约价环比：只拿到预测；2Q26 实际也没有被单独重述（只有 58~63% 预测；HWBusters/iconnect007 转述"约 60%"）。累计指数里这几季已用区间覆盖。
- 2023 年底 CoWoS 月产能（市场常说约 13~15k，本次无来源）；CoWoS 2024~2026 的全部数字均为媒体转述。
- TSMC AI accelerator 占营收的百分比（本轮只拿到 CAGR 指引）；TSMC 市值首次破万亿的日期；Nvidia 在 CoWoS 总产能（而非 CoWoS-L）的份额。
- "晶圆置换约 3:1"（业内常见说法，一手来源未取得）；HBM 占 DRAM 营收份额（TrendForce 未给；Counterpoint 只给 HBM 内部份额）。
- Gartner 2026-02-26 稿（网站 403，仅经 Wikipedia 转述为 PC -10~11%、手机 -8~9%）；Canalys 2026 预测；IDC 3Q26 实际出货。
- Samsung 2Q24、3Q24 的 DS 营业利润（页面未能读取）；Samsung 3Q26 DS/MX 拆分（媒体估计）；SK hynix 3Q26 实际数（尚未发布；分析师预期约 70~78 万亿韩元，来源 stockhub.kr 转述，未核实）。
- 零售 SSD 价格序列；PCPartPicker 的数值序列（曲线是图片）；DDR4 16GB 套装 2025 年中的价格点（只有 32GB DDR4 套装 $60~90 与 DDR4-3600 16GB"追踪期内最低 $29"）。
- Xiaomi、Framework、显卡成品涨价幅度；Xbox 涨价与 TechSpot 2026-04 现货回落均为单一二手转述；中国零售（中关村在线/IT之家）具体价格未取得。
- 2022-11 当月的三家市值（只有 2022 年末）。
- Micron 2023-2025 其余财季毛利率；Samsung/SK hynix 800 万亿韩元扩产、Stargate "占全球 DRAM 产出 40%"等仅见标题/Wikipedia 转述，未核对。
