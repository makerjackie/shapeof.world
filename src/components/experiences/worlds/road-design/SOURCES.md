# 路口与立交 · 模型与来源

核对日期：2026-10-24。单位为米、秒、辆；界面将速度换算为 km/h，将流量换算为辆/时。十三种道路是参数化示意设计；黄桷湾采用 OSM 真实线形与公开 DEM，但高度是约束推断。全部需求和交通流参数均未经过实地调查标定。黄桷湾的数据许可、来源、计数与高程推断详见 [HUANGJUEWAN-SOURCES.md](./HUANGJUEWAN-SOURCES.md)。

## 跟车与换道

- **IDM 原始论文**：Treiber, Hennecke & Helbing (2000), *Congested Traffic States in Empirical Observations and Microscopic Simulations*, Physical Review E 62, 1805–1824，DOI [10.1103/PhysRevE.62.1805](https://doi.org/10.1103/PhysRevE.62.1805)。[作者预印本](https://arxiv.org/pdf/cond-mat/0002177)，公式 6–7、Table I。速度差取本车减前车，间距是保险杠之间的净距离；加速度指数取 4。原论文 Table I 的一组参数为 v0=120 km/h、T=1.6 s、a=0.73 m/s²、b=1.67 m/s²、s0=2 m。这不是本世界所有道路的默认参数。
- **实现解释**：[Treiber 的 IDM 技术说明](https://mtreiber.de/MicroApplet/IDM.html)，Model Parameters / Simulation。作者说明不同司机与车型可以使用不同参数；红灯可以表示为停止线处的静止虚拟车。其说明给出日常加速与舒适减速约 1–2 m/s²、静止净距 2 m，数值步长小于 0.5 s。本实现采用更小的固定步长 1/30 s，并限制非负速度及紧急减速度；这些是数值实现措施，不代表已完成碰撞安全认证。
- **MOBIL 原始论文**：Kesting, Treiber & Helbing (2007), *General Lane-Changing Model MOBIL for Car-Following Models*, Transportation Research Record 1999, 86–94，DOI [10.3141/1999-10](https://doi.org/10.3141/1999-10)。[作者提供的论文](https://akesting.de/download/MOBIL_TRR_2007.pdf)。换道依据本车收益、旧/新后车加速度变化，以及新后车制动安全条件。
- **MOBIL 参数解释**：[Treiber 的 MOBIL 技术说明](https://mtreiber.de/MicroApplet/MOBIL.html)。文中给出礼让系数约 0–0.5、安全减速度 4 m/s²、激励阈值示例 0.2 m/s²、靠右偏置示例 0.2 m/s²。本世界的 p=0.2、阈值 0.1 m/s² 是选定的演示参数；紧急路线换道放宽到 6 m/s²、500/150 m 路线预判距离、横向平滑插值与转向灯动画属于本实现扩展。

本世界参数（可在 `sim/idm.ts`、`sim/mobil.ts` 与各设计数据中核对）：

| 参数 | 城市道路 | 高速主线 | 性质 |
| --- | --- | --- | --- |
| 期望速度 v0 | 50 km/h | 110 km/h | 场景设定；车辆可有个体差异 |
| 期望时距 T | 1.2 s | 1.3 s | 仿真校准参数，不是法规规定的安全距离 |
| 静止净距 s0 | 2 m | 2 m | IDM 常用量级 |
| 加速度 a | 1.5 m/s² | 1.2 m/s² | 仿真设定 |
| 舒适减速度 b | 2 m/s² | 2 m/s² | 仿真设定 |

4.6 m 小汽车、12 m 大型车、90%/10% 车型混合、个体期望速度浮动、转弯横向加速度约 2.5 m/s²，均是本世界的可解释假设，并非原始 IDM 论文给出的中国车队统计结果。匝道限速按几何约束，不能把高速 v0 直接用于环形匝道。

## 信号、让行与校准

- **饱和流率**：[FHWA HPMS Field Manual, Appendix N](https://www.fhwa.dot.gov/ohim/hpmsmanl/appn6.cfm)，信号路口简化容量式以 1900 作为基础值，再乘车道数、车道宽度、重车、绿信比等因子。本世界的 1700–2000 辆/时/车道测试检查的是持续绿灯下排队车辆的稳定放行，不是包含红灯的全周期路口通过量。
- **临界间隙与跟进时距**：同一 FHWA 页面 Table 11 明列次要道路右转 **6.2 / 3.3 s**、直行 **6.5 / 4.0 s**、左转 **7.1 / 3.5 s**。页面明确说明其基于 **HCM 2000** 的简化方法；本次未逐页访问 HCM 第 6 版原书，不能把该来源描述为已直接核对第 6 版。
- 主路左转 **4.1 / 2.2 s** 保留为本世界基准假设；以上已打开的 FHWA Table 11 不包含主路左转行，因此此行的 HCM 原表版本仍待直接核验。所有间隙值都未用中国本地观测重新估计。
- 两车道主路的基准间隙用于多车道 T 字场景时是简化。实际应用还应考虑跨越车道数、重车比例、坡度和分阶段穿越；不能从本世界的读数推断某真实路口的设计容量。
- 黄灯 3 s、全红 2 s、固定两相位配时是场景设定。黄灯按是否能舒适制停处理是交通仿真策略；并不等同于中国法规对越过停止线资格的逐字复现。许可左转仍检查对向直行间隙。红灯期间的右转是否被放行由本世界的流向相位控制决定。
- 泊松到达、默认左/直/右需求比例、画面外等待队列、5 分钟滑动统计、8 s 僵局仲裁、冲突区预留与出口空间检查，是本模型明确选定的生成、统计与调度规则。它们不是 HCM 的完整容量计算程序。僵局仲裁也不是道路通行法律新增的优先权。

## 中国道路通行规则

依据国家市场监督管理总局公开的[《中华人民共和国道路交通安全法实施条例》](https://www.samr.gov.cn/zljds/zcfg/art/2023/art_5c212e15369443b3b2bea4e17a1c565b.html)，本世界抽取机动车之间的规则：

- 第 52 条：无信号灯、无交警指挥时，有标志标线先按优先权；完全没有优先控制时先停车观察并让右侧道路来车；转弯让直行；**相对方向**的右转让左转。最后一条不应实现成所有右转一概让所有左转。
- 第 51 条第 7 项：普通无方向指示信号的路口，转弯仍让直行；相对方向右转仍让左转。
- 第 53 条：前方路口阻塞时在路口外等待；排队或缓行条件下的车道减少采用每车道一辆交替进入。
- 第 38 条：黄灯仅允许已经越过停止线的车辆继续；普通红灯允许不妨碍其他被放行交通的右转。仿真中未完整纳入行人、非机动车以及所有灯型的例外。

## 冲突点的口径

[FHWA, *Signalized Intersections: Informational Guide*, FHWA-HRT-04-091 (2004), Chapter 3.2, Figure 17](https://www.fhwa.dot.gov/publications/research/safety/04091/03.cfm) 直接给出：

| 机动车流向示意 | 交叉 | 合流 | 分流 | 合计 |
| --- | ---: | ---: | ---: | ---: |
| 三岔 T 字 | 3 | 3 | 3 | 9 |
| 四岔十字 | 16 | 8 | 8 | 32 |

数字是机动车左/直/右流向之间的潜在冲突，不包括掉头、行人及逐车道细分。实际 T 字主路有两条同向车道时，面板仍采用每个方向一条示意流向路径的统一比较口径。程序按路径交点和共同进出口拓扑计算，以上数字仅作为回归验收，不能替代几何求交。不同高度的交叉不算平面冲突；信号分时是管理潜在冲突，不是删除几何冲突。苜蓿叶交织段作为独立现象显示，未加入传统交叉/合流/分流总数；“交叉为 0”不表示不存在换道冲突或事故风险。

## 几何尺寸

下列值直接检查了交通运输部公开 PDF 的原页，而非仅依据搜索摘要。

**[《公路工程技术标准》JTG B01—2014](https://xxgk.mot.gov.cn/2020/jigou/glj/202006/P020230628577830212881.pdf)**：

- 表 4.0.2（印刷页 11，PDF 第 17 页）：80–120 km/h 车道宽 3.75 m；40–60 km/h 为 3.50 m。
- 表 4.0.5-1（页 12 / PDF 18）：高速右侧硬路肩一般值 3.00 m，存在车型与条件例外。
- 第 3.6 节建筑限界说明第 3 项（页 9 / PDF 15）：高速、一级、二级公路净高 5.00 m。净高测量应扣除上方梁体，不是两层路面间距。

**[《公路立体交叉设计细则》JTG/T D21—2014](https://xxgk.mot.gov.cn/jigou/glj/202006/P020240611387130375167.pdf)**：

- 表 4.3.2（页 10 / PDF 16）：枢纽互通的环形匝道设计速度 40 km/h。
- 表 8.2.1（页 48 / PDF 54）：40 km/h 对应圆曲线一般最小半径 60 m、极限值 50 m；60 km/h 一般值 150 m；80 km/h 一般值 280 m。55 m 不能描述为 40 km/h 的一般最小值。
- 表 8.3.1（页 49 / PDF 55）：40 km/h 出口上坡、入口下坡最大纵坡 5%，出口下坡、入口上坡 4%，困难地形另有条件性放宽。
- 表 9.2.5（页 56 / PDF 62）：在最大超高取 6% 的工况下，40 km/h、50≤R<70 m 对应超高 6%。不能只给小半径而省略超高和过渡。

城市路缘半径、中心隔离带宽、层间距、桥墩与箱梁尺寸、灯杆高度及间距，是为维持比例而选的示意值；尚未做桥梁结构验算、照度计算、标线逐条规范审查或真实工程合规校核。平滑样条/纵断面只是可视化几何生成，不能宣称替代公路设计中的完整回旋线、视距和竖曲线校核。

## 环岛参数的口径差异

[FHWA-SA-15-070, *Assessment of Roundabout Capacity Models for the Highway Capacity Manual*](https://highways.dot.gov/sites/fhwa.dot.gov/files/2022-06/fhwasa15070_0.pdf)，Table 19 给出单车道环岛的实测校准模型 `c = 1380 exp(-0.00102 vc)`，单位 pc/h。Table 13 的跟进时距加权平均为 2.6 s；更早 NCHRP 572 的 3.2 s 是另一组样本与模型。若按 `A=3600/tf`、`B=(tc-tf/2)/3600` 反推这条容量式，得到 tf≈2.61 s、tc≈4.98 s。因此不能把 5.2/3.2 s 与这条容量式同时当成同一套自洽参数；本轮使用设计稿的 5.2 / 3.2 s 作为可复现的参数假设，尚未用观测数据校准容量曲线。

## 视觉与适用范围

所有道路、车辆、楼体、标线和光照为代码生成。相机方向加权的前尾灯光带、最小像素宽度、曝光淡出、HDR 强度、地平线辉光与局部光照贴图是摄影感的渲染近似；不是完整光度学或相机传感器积分。吞吐、排队、延误是此微观模型的输出；本世界不输出人民币造价、事故率或真实道路安全结论。

## 核心区检测与压力测试

通过量由路口核心区出口断面计数，窗口是开始观测以来的时间与 300 s 中的较小值；不等待车辆走完远处引道。热启动先运行 120 s 填充道路，再重置观测窗口、运行 120 s；车辆、种子和道路保持连续。延误只累计核心区内实际经过的时间减去该段按车道限速和车辆期望速度计算的自由行驶时间。道路自由流距离不会被算成延误，等待仍会保留。

压力测试使用各设计的默认 OD 表，从 0.25× 起，预热后在 20 分钟模拟时间内线性增至 2.5×，默认 16 倍速。每 10 s 采样一次。图的横轴使用同一滑动观测窗内的平均请求需求，纵轴使用断面通过量及已离开核心区车辆的平均延误，避免把瞬时输入与滞后输出直接对齐。过饱和时尚未离开核心区的车辆不进入完成车辆的平均延误，仍反映在在网车辆及画面外排队中；这些曲线是动态爬升响应，不是稳态容量曲线。切换设计后保留已跑过的曲线，重新测试同一设计会覆盖它的旧曲线。

## 菱形与 DDI


The source for the conventional diamond / DDI comparison is the primary **NCHRP Research Report 959, _Diverging Diamond Interchange Informational Guide, Second Edition_ (2021)**, Chapter 4, printed pages 59–60, Exhibits 4-1–4-3.

- [National Academies publication and DOI](https://www.nationalacademies.org/publications/26027)
- [Official NCDOT-hosted complete guide PDF](https://connect.ncdot.gov/projects/Roadway/RoadwayDesignAdministrativeDocuments/NCHRP-959%20Diverging%20Diamond%20Interchange%20Informational%20Guide-2nd%20Edition.pdf)
- [TxDOT Roadway Design Manual conflict-count table](https://www.txdot.gov/manuals/des/tsp/chapter-11-interchange-analysis/11-3-interchange-configuration-evaluation--ice-/11-3-7-stage-2-safety-performance-and-ice/11-3-7-1-conflict-points.html)

| Boundary and permitted vehicle movements | Crossing | Merging | Diverging | Total |
| --- | ---: | ---: | ---: | ---: |
| Conventional diamond, including off-ramp → on-ramp straight movement | 10 | 8 | 8 | 26 |
| Conventional diamond, excluding that straight movement | 6 | 6 | 6 | 18 |
| DDI | 2 | 6 | 6 | 14 |

The diagrams count the two **arterial / ramp terminal** junctions. They do not include the four freeway mainline ramp merge/diverge locations, pedestrians, bicycles, U-turns, or lane-changing conflicts. Our `schematicMovements` are the actual local connector paths plus common 26 m approach/departure sections, using that same boundary. The count is computed from these paths; the three reference totals occur only in assertions. The full simulation routes continue onto the motorway and across both terminals. The conventional diamond allows a small off-ramp → on-ramp bypass stream; the `includeRampThrough=false` variant removes those two physical connector lanes and their movements.

The generated geometry is an educational layout, not a surveyed site: 210 m between ramp terminals, two lanes per direction on the arterial and on the freeway, a maximum motorway deck height of 8 m above the local road datum (8.12 m world elevation), and smooth approach grades below 3.01%. The DDI's arterial centerlines are 12 m apart, with approximately 45-degree opposing crossover angles; its separate one-way pavement strips preserve a central median. The DDI reverses the arterial driving side between its two crossover nodes and physically prevents off-ramp → on-ramp straight traversal. The two fixed DDI phases alternate eastbound / westbound crossover movements; ramp exits use gaps in receiving traffic. These timings are illustrative and are not a capacity-calibrated signal plan.

All meshes, façade shaders, city lights and road geometry are generated by this project. The guide's copyrighted figures were inspected locally as reference and are not redistributed.

## 几何代价的测量边界

面板和对比表直接遍历生成路面：层数取非负层号的不同值；最高路面相对当地展示地面；桥面面积累加离地 > 2.5 m 的路段三维长度乘总宽，跨阈值段线性分割；匝道长度统计 ramp 中线，不按车道重复。桥面、铺装、长度按完整模型测量。

第 5 轮占地改用 `sim/land-footprint.ts`：路面含路肩，每侧再外扩 10 m，按 2 m 网格中心采样；从外边界四邻接洪水填充，未抵达的单元为**路面及边界缓冲 + 围住的空地**。不再把开敞象限填成凸包。主线裁到本车行道邻近匝道端点投影的最外侧分合流位置；城市路口取连接段、停止线和渠化实线段。真实 OSM 主线利用共享节点，剪去悬挂引道，并取匝道接点之间的最短主线路径，避免沿相连城市道路绕到远处的闭环；限制在取样半径内，逐图核对接点完整，保留外侧分合流点之间的路段。两者采用相同宽度/缓冲/栅格/填充口径，但示意道路边界使用几何投影、OSM 使用共享节点。原凸包仅保留在离线审计，不再作为界面占地。

这是**二维道路阻隔的代理指标**，并非征地红线、法律可开发面积或工程 ROW。高架的投影也阻隔洪水填充，因此会计入现实中可能经桥下进入的地块；未扣除可通行桥洞、城市道路穿越和坡地用途。10 m 是统一比较假设，不是按实际边坡坡率测得的界限。黄桷湾使用其 OSM / DEM 线形，边界仍是示意图裁剪。

图纸视图有五层填色、1.5 CSS 像素路缘、沿车道运动的箭头和层号。箭头展示通行方向，不是另一套交通模拟。城市和远景楼群为程序生成的背景，不是 OSM 建筑测绘；遮挡核心的楼整栋隐藏，避免透明哈希噪点。黄桷湾 DEM 边界以外的地面和西北侧河流是远景示意，不用于坡度、净空或代价计算。

## 新增的参数化设计

These are dimensioned generative interchange examples, not surveyed existing sites. Motorway lane width is 3.75 m, urban lanes 3.5 m, freeway shoulders 3 m. Longitudinal routes join at matching world-space endpoints; acceleration lanes join laterally over their shared road segment. No per-design conflict total is substituted into the algorithm.

- Stack: two 3+3 freeways at 0/8 m, direct left ramps at 16/26 m; circular horizontal left-turn radius 150 m; tangent grade transitions at most 4%. 16 computed conflicts (0 crossing, 8 merge, 8 diverge). The upper deck uses 26 m, within the requested 25–35 m range.
- Turbine: the same four 3-lane highway approaches, but left turns follow asymmetric rotating cubic alignments, minimum horizontal radius about 192 m, rising through 8.8/16 m over locally raised 0/8 m mainlines. No weaving; 16 conflicts (0/8/8). This is a three-level procedural variant, not a reproduction of a particular turbine interchange.
- Trumpet: one 270-degree loop of radius 66.125 m and a separate semidirectional ramp. The east–west mainline has 3 lanes each way and the terminating stem one lane each way. This intentional road-class imbalance produces 10,500 veh/h total assumed demand at 1× (4,500+4,500+1,500), using the lower end of the requested motorway demand range; a three-lane dead-end stem at 4,800 would overload the receiving motorway even without a junction bottleneck. The compact driven example currently uses three elevation bands (ground, 8 m motorway, 16 m semidirectional ramp), rather than the conventional minimal two-level trumpet. This difference must be disclosed, not called a surveyed or minimal-cost layout. 6 conflicts (0/3/3).
- Parclo: two diagonally opposite 74.875 m radius loop entrances replace the arterial-to-motorway left turns. The loops climb 8 m and merge into actual split motorway lane links; all other routes remain connected. Signals remain at the two service terminals. Its conflict diagram covers the complete interchange including freeway merge/diverge points, unlike the 26/18/14 NCHRP two-terminal comparison boundary used for diamond/DDI. Computed from one representative driven route per O-D: 22 (6 crossing, 8 merge, 8 diverge). Parallel physical arterial lanes are normalized to a single representative path for the static diagram.
- Partial continuous-flow intersection: displaced north/south left turns cross opposing traffic from station 140 to 105 m upstream. Those crossover gates run in the east/west phase; displaced left-turn storage discharges in the north/south main phase. East/west left turns remain permissive. Main control has two 36 s greens with 3 s yellow and 2 s all-red each. Physical receiving lanes have separate upstream gates, so vehicles cannot drive through a red upstream crossover. Its one-lane-per-direction schematic yields 28 (12/8/8). Main and upstream nodes are represented separately with their respective signal phases; this allows phase-separated crossover conflicts to display hollow rings.
- Diamond/DDI: terminal spacing remains 210 m; arterial now has two independently driven lanes in each direction, with right turns assigned to the outer lane and two through routes per O-D. The pre-existing one-lane-per-approach schematic is intentionally unchanged, preserving the independently tested NCHRP 26/18/14 counts. Default demand is 3,200+3,200 freeway and 1,200+1,200 arterial = 8,800 veh/h before any root demand changes.

All default demand tables are planning assumptions, not measured traffic. Except for the round-four cloverleaf turning-share adjustment below, they use createDefaultOD: 1,600 veh/h/highway entry lane, 15% exit share when a through route exists; arterial 600 veh/h/lane. CFI retains 700 veh/h/approach like channelized.



## 默认 OD 与局部控制的假设（第 3 轮）

每个设计保存独立 OD 数据，需求倍率同时缩放全表；全部是规划情景假设，不能用作现场交通量、实测容量或建设建议。普通高速进口每车道 1,600 辆/时，喇叭形各臂采用每车道 1,500 辆/时（两条三车道主线进口各 4,500，单车道终止支线 1,500），主线贯通的进口原设 15% 下匝道，其余直行（第 4 轮仅苜蓿叶改为 22%，见下）；服务型立交主干道每车道 600 辆/时，按 10% 左转、80% 直行、10% 右转分配。平面交叉保留原来的每进口总需求及 20/65/15 转向比例。黄桷湾使用单列的真实拓扑 OD 假设，见其来源文档。源车道按转向所需车道和剩余直行空间分配，不把所有直行车挤在一条车道。

菱形主干道维持双向 2+2，中央连接道的两个匝道口前各设 70 m 左转储车道，局部展宽，避免许可左转队列堵住直行；DDI 与部分苜蓿叶不需要这两个储车道。菱形/部分苜蓿叶采用主干道 32 s、中央连接道清空 14 s、匝道 24 s 的示意配时，各相位另有黄灯 3 s、全红 2 s。中央连接道的左转在主干道相位许可通行、清空相位独立放行；这不是某座真实菱形的优化配时。DDI 保留两个 27 s 相位，两个单车道出口匝道在端部各展开成 110 m 的左右转独立储车段，防止中央连接道的左转等候堵住可通行的右转；这属于示意工程配置，并非实际测量。渠化交叉口的直行相位 28 s、专用左转相位 26 s，左转先进入待转区，再按相位放行。

示意立交在有主线直行的汇入口增设加速车道（第 5 轮苜蓿叶右转、堆叠、涡轮、喇叭形最长 320 m；服务型保留 240 m）；长度受下一主路节点限制，先沿加速车道行驶，再以 3.5 s 平滑换道进入主路。同一收流车道只有一条物理加速车道。末端合流时，最近的主线后车可减速创造间隙，匝道车仍须通过 MOBIL 的后车制动与间距安全条件。该礼让规则是对密集车流驾驶合作的简化，不是经过实测标定的驾驶行为模型。

连续信号节点按本地冲突区预约：合流发生在两条路线的第一段共用车道，合流完成后采用 IDM 跟车，不能在共同的远端出口重复预约。防堵路口同时计算接收车道的可储车空间、已获准但尚在路口内的车辆，以及按实际到达时间估计的前车移动距离；红灯和已有车辆的物理占用始终保留。

MOBIL 每辆车仍每 0.5 s 判断一次，用稳定车辆 ID 错开判断时刻，避免所有车辆同时换道计算造成帧尖峰。直行目的地指道路出口而非固定出口车道；城市主干道上的平行直行路径也允许换道，换道后更新对应流向变体与局部冲突关系。


## 第 4 轮的读数与显示约定

- 第 4 轮曾记录 0.25×→2.5× 爬升的通过量峰值；它没有确认饱和，现已由下述第 5 轮测法替换。
- 为恢复四个环道的长曝光，苜蓿叶保持每进口 4800 辆/时，把假设下匝道比例从 15% 调至 22%，左/右仍按 20:15 分配：每个环道约 603 辆/时，右转约 453 辆/时。总需求仍为 19200 辆/时。其余设计的 OD 保持第 3 轮参数；都不是实测。
- 层高拉伸是展示开关：约 1 s 内将道路、车辆、光带和桥墩相对当地 DEM 地面拉到 2.5 倍。地形、模拟坐标、限速、坡度、冲突和代价读数不变。它帮助分清层次，不是实际桥高。拉伸时关闭基于原始深度的屏幕空间 AO，避免错位阴影；按真实高度计算的顶视桥面遮光仍保留。
- 左转高亮把真实车辆光带改为柔和琥珀色，其他光带降至 40%；同时在真实左转车道上加很淡的连续路线线，连接车辆曝光之间的空隙。线本身不是车流，不计入读数。首次苜蓿叶不启用任何叠加，曝光为 8 s。
- 相位环使用模拟时钟的实际配时，环段包含绿灯、黄灯与全红；菱形两端采用同一协调时钟，并明确标注同步，不伪造两个独立的配时。默认视图的冲突实心/空心区分同相位与跨相位的几何冲突。
- 夜景桥梁遮光使用约 1.76 m 栅格的最高桥面高度贴图；低于上方桥面的路面削弱照明，侧墙和桥墩保留朝向灯光的一侧。它是渲染近似，不是工程照明或结构分析。


公开数据许可清单：道路衍生数据库为 © OpenStreetMap contributors / ODbL 1.0；地形基于 Mapzen/AWS Terrain Tiles 的 SRTM/GMTED2010 公有领域来源，保留 “Mapzen Terrain Tiles / AWS Open Data; SRTM/GMTED2010 (USGS/NASA)” 署名。区域来源核对、瓦片坐标和分辨率说明见 [黄桷湾来源文档的地形部分](./HUANGJUEWAN-SOURCES.md)。背景楼群、街道灯网和河流仍是程序化示意，没有新增第三方图像素材。

## 第 5 轮：统一设计基准与参照证据

JTG/T D21—2014 的官方扫描件链接见前文，本轮直接逐页复核。主线几何设计速度为 120 km/h；本次改动的示意枢纽主线采用相同限速，车辆仍有 10% 大型车及 0.9–1.1 倍速度差异。黄桷湾是独立真实拓扑，城市道路和服务型立交端部不套用高速枢纽速度。

| 项目 | 参照原表 / 印刷页（PDF 页） | 本世界采用与简化 |
|---|---|---|
| 环形 / 定向、半定向速度 | D21 表 4.3.2，10（16） | 环形 40；右转与定向左转 60 km/h，取枢纽范围下端 |
| 一般 / 极限最小半径 | 表 8.2.1，48（54） | 40：60/50 m；60：150/120；70：210/175；80：280/230。环道 R60，堆叠 R150；涡轮数值检查 R≥150 |
| 纵坡 | 表 8.3.1，49（55） | 60 km/h 的进/出、上/下坡原值为 3–4%，困难条件可加 1%。新堆叠/涡轮/喇叭半定向坡度 ≤4%；不能把旧 6% 当通用规范值 |
| 净空 / 梁体 | JTG B01 3.6，9（15）；D21 4.6 | 名义层距 8 m、梁深示意 2 m；新堆叠/涡轮横向桥面交叉检查面间 ≥7 m。完整桥缘、超高、竖曲线和视距仍未工程校核 |
| 单车道减速 | D21 表 10.2.5，69（75），主线 120 | 减速 145 + 渐变 100 = 245 m；本轮保留模型的上游 IDM 预减速，尚未新增独立 245 m 减速车道几何 |
| 单车道加速 | 同上 | 平行式 230 + 渐变 90 = 320 m；苜蓿叶右转、堆叠/涡轮/喇叭采用最长 320 m。MOBIL 在可用段内合流；不等于完整渐变鼻端施工设计 |

右转统一为 60 km/h。苜蓿叶、堆叠、涡轮共用 `rightRampPath`：±330 m 鼻端、两个 R150 的 45° 圆弧加对角切线，取代端部半径偏小的立方曲线。喇叭右转保留 R226.125 的较宽曲线并降至同一 60 km/h；650 m 端点含沿支线的共同连接段，不再被凸包视为整块征地。部分苜蓿叶是服务型：环道 40 km/h，匝道末端接信号和低速城市道路，不将其路口右转弯当成 60 km/h 自由流外侧匝道。圆弧/切线尚未插入标准回旋线，属于有尺寸的示意线形。

堆叠定向左转贴主线，以 4% 爬升/下降约束决定 ±720 m 分合流位置，桥面 16/26 m。涡轮保留较长的 ±800 m 螺旋形左转，在相邻匝道交叉前后分别处于约 8.8/16 m，主线上跨只在中心升高，形成**三层**；不再给成对左转整条抬到第四层。所有标称尺寸均由实际几何测试复核，不按占地排名反推。

### 手册中的面积与能力结论

- [WSDOT Design Manual，2002-09，Chapter 940 *Traffic Interchanges*](https://tmcpfs.ops.fhwa.dot.gov/cfprojects/uploaded_files/WSDOT%20Interchanges.pdf)，940.04(2)，印刷 940-3（PDF 3）：半定向型相对定向型 **“requires multiple single-level structures and more area than the directional interchange.”** 同节指出定向型消除交织、改善速度与容量。它支持有条件的定向/半定向比较，没有给所有现成立交强加面积次序。
- [MassDOT PDDG Chapter 7](https://www.mass.gov/info-details/pddg-chapter-7-interchanges)，网页章节 *Cloverleafs*、*Directional and Semi-Directional*、*Interchange Selection Factors*，Figures 7-4 / 7-9 引用 AASHTO Green Book 2018 Figures 10-57 / 10-35。原文短句 **“Cloverleafs require more right-of-way”**（同段比较对象是 diamonds）。定向型可在较小新增范围内服务较高转向流量，但桥梁成本高。Green Book 原书未取得，不宣称已核对其原页。
- [NCDOT Liberty Road / I-40，2016-08-30 公众说明](https://www.ncdot.gov/projects/liberty-road-i-40-interchange/Documents/August%2030%2C%202016%20Handout.pdf)，PDF 第 2 页 *Comparison of Project Alternatives* 表：菱形/部分苜蓿叶/半苜蓿叶的 Required Right of Way 分别为 **70/50/53 acres（28.33/20.23/21.45 ha）**。[部分苜蓿叶方案单张图](https://www.ncdot.gov/projects/liberty-road-i-40-interchange/Documents/Alternative%202%20Map%20%28Partial%20Cloverleaf%20Interchange%29.pdf)，PDF 1 页，原文 **“Impacts based on functional design slope stake plus 40 feet.”** 它包含项目改建范围，与本世界的闭合土地面积不同，不能当作栅格测试上下限；也是特定项目中菱形用地反而更大的反例。
- [TxDOT US281 / SH71 Draft EA，2025-04](https://ftp.dot.state.tx.us/pub/txdot/get-involved/aus/us281-sh71/043025-draft-ea.pdf)，5.1，印刷 p.13：两层涡轮改造需约 **165 acres（66.77 ha）新增 ROW**。包含辅道等项目范围，是新增征地量而非整座涡轮闭合面积。没有从这些不可比的数拼出“典型面积区间”。
- [FHWA-HRT-20-008](https://www.fhwa.dot.gov/publications/research/operations/20008/20008.pdf)，印刷 p.132（PDF 146），关于短交织段的模型标定：约 1800 pc/h/lane 的标定模型值可低于 HCM 理论值，行为参数需按现场调校。我们不把某一个交织段容量复制到所有长度、车道数和 OD。
- [TRB *HCM Applications Guide*, Case 4, Problem 3b](https://hcmguide.com/Case4/printablefiles/problem_3Printable.htm)，Exhibit 4-58（引 HCM 2000 Exhibit 25-3）：单车道匝道 40 mph 案例使用 2000 pc/h，30 mph 案例为 1900 pc/h；这里是原 HCM 的公开应用案例，未取得最新 HCM 匝道章，不冒充新版逐项复现。转向上限还受合流和交织约束。
- [FHWA Signal Timing on a Shoestring III](https://ops.fhwa.dot.gov/publications/signal_timing/03.htm)，Critical Lane Analysis：基础饱和流率取约 1900 veh/h/lane，再乘有效绿信比。现有持续绿灯放行测试 1700–2000 保留。环岛入口的 HCM/NCHRP 公式及版本差异见上文，不能把四个无冲突入口容量直接相加。
- [FHWA-HRT-09-055，DLT TechBrief](https://www.fhwa.dot.gov/publications/research/safety/09055/index.cfm)，*Operational Performance*；[FHWA-SA-14-039 DDI 简介](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/2022-06/fhwasa14039.pdf)。前置左转和 DDI 通过减少相位、允许部分左转自由流改善特定 OD 的运行。不是所有需求和配时下的无条件提升，未为 DDI/CFI 写必胜所有传统路口的断言。

### 饱和实验（替代第 4 轮的需求峰值）

`node src/components/experiences/worlds/road-design/measure-capacity.mjs` 重建 `data/capacity.json`。固定种子 271828、步长 1/30 s、预热 600 s。实验 OD 在每个有完整流向的起点采用左/直/右 20/60/20（40% 转向），缺失流向按可用权重重新归一；保持各起点原来的道路等级总量与车道数，OD 不随加压重新分配。菱形用于 26 冲突口径的“下匝道后直行再上同一高速”路径仍保留在拓扑中，但该重复目的地的实验需求为零，避免把三分之一直行车辆错误分配给无必要的绕行。它不修改默认夜景车流。不同类型的路网规模、信号方案不同，因此不是仅替换几何的严格因果实验。

每档保持 600 s，倍率依次 .5、1、1.5、2、2.5、3、4、5、6、8；每档后半段构成完整 300 s 观测窗。连续两档增长各不足 5%、需求至少比通过量高 20%、边界排队持续增加，并出现延误增加或排队清空时间超过 30 s，才确认平台。达到最大倍率仍未满足即为 `not-saturated`，界面标 ≥ / 未确认饱和。不是到倍率上限自动宣布容量。

计数仅包含按原目的方向通过核心出口的车辆；错过匝道改走其他出口的车辆保留在 `stages[].missed`，不抬高容量。总量和转向量分别取完整窗口峰值，记录各自倍率，**二者不一定出现在同一个窗口**；转向量不是总量乘 40%。每档的需求、延误、队列、积压和失配证据全部提交。过饱和可能出现容量下降，不能只报告最终档流率。有限随机种子、5 分钟采样、模型边界排队与固定配时都会影响结果；这是本模型实验上限，不是 HCM 工程容量或真实立交测量值。会话中的普通压力曲线仍使用当前默认 OD，单独保留，不再覆盖不同 OD 的容量实验结果。


### OSM 同口径实测（2026-10-24 下载）

18 个例子按道路拓扑选取，不按期望大小挑选。原始 Overpass 响应仅保存在 `.local/road-design/round-5/`；提交的 [测量清单](./data/footprint-references.json) 含每条匝道 way ID、主线 way 的零基线段序号、完整查询、OSM 时间戳、坐标、宽度假设以及 1/2/4 m 栅格敏感性。下表 way 区间是最小/最大 ID，不表示中间所有 ID 都被纳入；精确集合以清单为准。复现：先运行 `fetch-footprints.py`，再运行 `node src/components/experiences/worlds/road-design/measure-osm-footprints.mjs`。数据 © OpenStreetMap contributors，ODbL 1.0（https://www.openstreetmap.org/copyright）；结果和选择清单作为衍生数据库按 ODbL 1.0 提供。

| 类型 / 实例 | 中心纬度，经度 | 匝道 way 数 / ID 范围 | 主线 way 数 | 占地 ha |
|---|---|---|---|---|
| cloverleaf / Hermsdorfer Kreuz (A4/A9) | 50.880308, 11.846622 | 55 / 4325146–1102762678 | 13 | 28.2480 |
| cloverleaf / Kreuz Rendsburg (A7/A210) | 54.30552, 9.75453 | 44 / 11846377–987456423 | 12 | 27.0444 |
| cloverleaf / Kreuz Rostock (A19/A20) | 54.02805, 12.20028 | 59 / 4413900–1425464853 | 16 | 23.0924 |
| turbine / Daussoulx (E42/E411) | 50.52111, 4.88139 | 56 / 4309830–772992974 | 30 | 44.1160 |
| turbine / Zwijnaarde (E17/E40) | 51.01, 3.7275 | 75 / 4823081–1476860181 | 25 | 29.1236 |
| turbine / Thorpe (M3/M25) | 51.403, -0.535 | 57 / 15088307–1049985348 | 25 | 35.7432 |
| stack / Almondsbury (M4/M5) | 51.551432, -2.552444 | 33 / 3387824–1194857500 | 16 | 38.6844 |
| stack / Bill Keene Memorial (US101/SR110) | 34.063, -118.249 | 59 / 24716556–1394106869 | 25 | 17.3484 |
| stack / Thorney (M4/M25) | 51.495, -0.495 | 42 / 1095401–1531928229 | 20 | 53.4152 |
| trumpet / Ahlhorner Heide (A1/A29) | 52.85243, 8.22705 | 5 / 22958632–32647891 | 7 | 15.4612 |
| parclo / 401 / Guelph Line | 43.4922, -79.9886 | 9 / 4045555–439962736 | 9 | 9.9908 |
| parclo / 401 / Regional Road 25 | 43.528, -79.9053 | 17 / 4042338–1157249361 | 22 | 24.7276 |
| parclo / 401 / Wellington Road | 42.9229, -81.2124 | 12 / 27355102–1303870691 | 11 | 24.1416 |
| diamond / I40 / NC751 | 35.904, -78.9602 | 7 / 16521853–659429884 | 5 | 12.4120 |
| diamond / US15-501 / Cornwallis Road | 35.9834, -78.9572 | 8 / 16521684–840335558 | 7 | 5.5904 |
| diamond / I40 / US15-501 (Exit 270) | 35.9513, -79 | 17 / 16522381–1001581017 | 11 | 11.6236 |
| trumpet / Drammetal (A7/A38) | 51.453163, 9.86435 | 5 / 18525047–1286351002 | 16 | 10.8028 |
| trumpet / München-Feldmoching (A92/A99) | 48.226272, 11.542003 | 15 / 3995753–317152575 | 6 | 24.7840 |

| 类型 | 三个样本的 min–max（ha） |
|---|---|
| cloverleaf | 23.0924–28.2480 |
| turbine | 29.1236–44.1160 |
| stack | 17.3484–53.4152 |
| trumpet | 10.8028–24.7840 |
| parclo | 9.9908–24.7276 |
| diamond | 5.5904–12.4120 |

选择说明：Thorney 扩大下载范围至 2.4 km 以包含完整东侧连接；Zwijnaarde 限定 E17/E40，剔除连向附近地面路口的枝杈；Drammetal 用显式匝道种子排除相邻 Dramfeld 出入口。北卡三个样本均经路网图核对为菱形，NC54 实际带环道，NC55 候选位置错误，均未混入菱形样本。Cornwallis 和 US15-501 复用同一次大范围下载，但选取范围分别限定 900/1000 m，并裁到本路口的共享分合流节点。样本中的辅助车道、地形、斜交角度与主线规模不完全相同；仅三例的 min–max 是参照，不是统计置信区间、规范允许范围或类型总体极值。

示意全苜蓿叶补齐四条右转加速车道后为 27.2224 ha，在三个实测样本区间内。只修右转曲线、尚未加加速车道的中间版本为 19.7040 ha（低于样本下限约 14.7%）；最终增加面积来自 320 m 的实际加速车道及其对应主线，不是按样本面积反调半径。示意菱形 15.5048 ha，比三个样本最大值约 12.41 ha 大约 25%；模型每方向两车道高速、双车道主干道及 ±450 m 外侧连接，比所选紧凑菱形的连接范围更宽。菱形在测试中登记为有解释的区间外值，不放大/缩小几何来套区间。全苜蓿叶、部分苜蓿叶、喇叭、涡轮和堆叠在各自区间内。DDI 未抽取三个同类样本；黄桷湾是单座 OSM 真实拓扑，也没有同类总体区间，不借其他类型区间伪造验证。

同口径下区间明显重叠；不能推出“苜蓿叶一定比所有堆叠大”。本示意苜蓿叶小于堆叠，原因包括环道低速半径小、四层定向匝道受 4% 纵坡制约而需长爬坡段。堆叠 36.2784 ha 小于涡轮 40.5744 ha，且桥面面积更大；这是本组几何的测量结果，不是通过强制面积排序得到。

默认 OD 的 1× 回归新增长时间按原目的地完成的计数：发现旧菱形配时对单车道出口匝道给绿不足，默认需求 8800 辆/时仅完成约 7766（误差 11.75%）。保留 OD，三相位绿灯改为主干 40 s / 专用左转 12 s / 匝道 38 s，每相仍黄 3 s、全红 2 s。部分苜蓿叶左转已由环道替代，移除继承自菱形的空左转相位，主干/匝道分别 40/30 s。这是为原有默认需求修正信号分配，容量实验使用同一实际配时重新运行，没有降低测试需求或放宽误差门槛。

苜蓿叶左转路线曾禁止在上游辅助车道中提前准备，所有驶出车辆被挤到中心 155 m 才允许横移。现有 MOBIL 可以沿相邻辅助车道抵达同一条预定环道时，允许提前选道；它仍要通过原有跟车安全、实线和 3.5 s 横移约束，且不能改变目的地。直行车仍不能把辅助车道当作超车道。补齐的四条右转入口加速车道采用同一 320 m 基准，环间交织段仍保留原短距离，未为了容量扩大道路或减小安全车距。

另一个被修正的堵点是把辅助车道的中间拓扑节点误当成真实车道尽头：环道来车若没能在中心段并线，过去先停 8 s 才尝试后面的同目的地渐变段。现在会沿同一条真实辅助车道继续使用剩余长度，不需要凭空停车；若无法保持原目的地则不做这种延伸。此修正没有增加可用车道或放宽 MOBIL 制动安全阈值。

右转名义圆弧 R150；接入并行加速车道时末端有 3.75 m 横移，最终离散线形的局部最小半径约 R138.4，介于 D21 60 km/h 的极限 R120 与一般 R150 之间。喇叭右转为 R226.125。表列一般值/极限值均保留，不把叠加后的示意曲线谎称为完整 R150 回旋线。喇叭一车道支线保留 90 km/h，直通高速按 120 km/h；它不是三车道高速的等规模第四臂。

交织车道的礼让请求按“最靠前且确实要横向并入主线的车”选择，而非简单取物理队首：队首可能正在排队进入下一个环道，会遮住后方驶出车辆的并线请求，造成四环互锁。此选择只用于标记过的交织段；普通加速车道保持原逻辑，MOBIL 制动与间距安全条件不变。固定种子 271828 的原有 30 分钟回归曾在约 2100 s 时发现 347 s 停滞，本轮保留原测试门槛并修复请求选择。

辅助车道上游段和环道共同汇入交织段，二者都标为物理合流，拥堵时复用现有交替放行保护。旧数据只标环道一侧，辅助车道可能不断抢占接收空间，造成环道长期饥饿。排队超过 8 s 的交织段并线请求可在整个交织段请求主线礼让，不局限于末端 75 m；这不会让车辆强制插入不安全间隙。原有 300 s 最大停滞断言、默认 OD 和车距保持不变。

## 运行时压缩与性能实现（2026-10-25）

本轮没有更换道路数据、需求、信号、IDM/MOBIL 参数或视觉设计。模拟及 240 s 暖机移到 Web Worker；桥面几何、遮光高度图、灯光贴图和街区布局也在 Worker 中预计算。屏幕只接收可转移的车辆姿态、光带和读数；竖向拉伸仍只作用于显示。车身、车灯和转向灯的实例变换改由顶点着色器计算。

`data/huangjuewan-runtime.json` 是上述 OSM/DEM 审计输入的紧凑派生文件，许可和署名不变：道路坐标以原有毫米精度存储差分，地形以原有厘米精度存储二维预测残差，未增加量化误差。原始审计 JSON 仍保留在目录中；运行时不下载未使用的审计字段，只在选择黄桷湾时加载该派生文件。`data/capacity-display.json`、`data/presentation.json` 是原容量测量、几何和冲突计算的显示缓存，测试逐项校验，并非新的测量或人为调数。

重生成命令、传输和暂停语义、无头生产测量方法见 [PERFORMANCE.md](./PERFORMANCE.md)。下载评估采用文件的原始字节数与 gzip 大小；站点实际传输仍由 Cloudflare 的内容压缩处理，没有提交预压缩副本。

## 路线阅读器与讲解（2026-10-26，第二版第 1 轮）

### 沿线内容依据

- [FHWA, Interchange Design Promptlist](https://highways.dot.gov/field-offices/missouri/interchange-design-promptlist)，*Interchange Configurations* / *Full Cloverleaf*：环道需要向右驶出以完成原本的左转；相邻环道“先汇入、后驶出”产生交织。解释牌将其拆成绕圈、慢速、交织、主线分层四个位置。270° 是本模型圆弧的实际扫角，R60 / 40 km/h 来自已有几何与 D21 设计基准，未将其他实例的尺寸套入本模型。
- [FHWA-HRT-04-091, Signalized Intersections: Informational Guide, Chapter 4](https://www.fhwa.dot.gov/publications/research/safety/04091/04.cfm)，4.2.1 *Permissive-Only Left-Turn Phasing*、4.7.4 *Vehicle Clearance*；[FHWA Traffic Signal Timing Manual, Chapter 4](https://ops.fhwa.dot.gov/publications/fhwahop08024/chapter4.htm)。许可左转绿灯仍让对向直行；不可写成左转专用受保护相位。本模型 32 s 绿 / 3 s 黄 / 2 s 全红是既有场景配时，并非 FHWA 为所有路口规定的固定值。
- [交通运输部发布 JTG/T D21-2014 的公告](https://xxgk.mot.gov.cn/jigou/glj/202006/t20200623_3312204.html) 及 [官方全文](https://xxgk.mot.gov.cn/jigou/glj/202006/P020240611387130375167.pdf)。半径、设计车速及匝道参数继续使用上文已核对的表 4.3.2、8.2.1、8.3.1。没有把 `sqrt(aR)`、离散曲线的半径或模型限速单独宣称为完整工程设计校核。
- AASHTO *A Policy on Geometric Design of Highways and Streets* 通过已有 MassDOT / FHWA 公开引用交叉核对；未取得 Green Book 原书，不新增“逐页读过原书”的声明。
- 黄桷湾使用已有 [HUANGJUEWAN-SOURCES.md](./HUANGJUEWAN-SOURCES.md) 的 OSM 拓扑、DEM 和高度约束。关于桥梁、爬坡与绕行的解释是一般工程原理和当前路网的可见结果，不声称掌握原设计团队的决策记录。多方向、分层与连通关系可由数据检查；真实历史动机未作推断。

### 读数边界

`explorer/routes.ts` 由 `Network.movements` 的真实车道序列生成可选择的路线。相同入口/出口/转向的多车道直行折叠为一个代表路线，不删除任何 O-D；同入口回到同出口时标为掉头。路线明确从当前模型入口到出口，包含远端引道。

- 路线长度：沿车道中心线的三维折线长度。拓扑中的相邻车道转换不直接首尾连接（那会倒退并重复计长），在同一纵向段 30%–70% 处以 smoothstep 构造代表横移。它是几何示意线，实际车辆换道位置由 MOBIL 决定，因车而异。
- 比直线多走：上述三维长度减同一对端点的平面欧氏距离，四舍五入为米。直线不保证可施工、可通行，也不是“另一条合法最短路线”。黄桷湾“最绕”仅指当前模型所有代表 O-D 中这一差值最大者，不能泛化为整个重庆路网的最绕路线。
- 最小转弯半径：各实际车道相邻三个采样点在 XZ 平面上的外接圆半径取最小值，不把任意横移轨迹当作道路设计弯道。排除重合点与数值共线；直线显示 ∞。黄桷湾稀疏折线可能有局部折角，结果不等于测绘或施工曲率。
- 该段模型车速：半径最小处所在 lane 的 `speedLimit` 换算为 km/h；不是由一个半径自动反推标准设计车速，也不是给现实驾驶的速度建议。参数化匝道保留原 D21 对应档位；城市连接段和 OSM 路段仍为既有仿真假设。
- 经过层级：路线经过的不同 `lane.level + 1`（显示层号）；这是路网标记的层级集合，不是坡度起伏次数或实测桥梁标高。黄桷湾高度仍明确为推断。
- 冲突：先由 O-D / 局部连接车道 / OSM 分支标识关联既有单车道冲突示意线，再统计位于这组线或实际路线上的静态 `ConflictPoint`（三维投影容差 0.005 m），覆盖交叉、合流、分流。这样不会把邻近另一股车流的交叉也计入。它是既有示意路网的冲突点数，不是碰撞数、事故概率或严格车辆扫掠包络计算。
- 交织：路线经过已有 `WeavingSection.lanes` 或其几何位置的段数。仅统计已有标注；黄桷湾没有完整交织标注时显示 0 并明确提示不代表现实不存在。不能从未标注推得“无交织”。

### 示范车、镜头与图层

`explorer/replay.ts` 用同一 `TrafficSimulation`（IDM、MOBIL、间隙接受、信号控制）独立生成种子 18181 的单车示范记录，未改变日常车流或容量实验。自由流道路不额外生成背景到达；有控制的路口用 0.2× 背景到达。信号十字左转示范加入五辆对向直行车，形成可重复观察的“红灯停止 → 绿灯让对向直行 → 通过”场景；这是一项教学工况，非现场记录。

行驶按段压缩，过短的真实停车区间放慢到可读时长（红灯至少 2.5 s、让行至少 2.2 s）；它不是旅行时间测量。渲染使用记录的车辆位置与切线，场景信号读取同一回放时刻。有控制路口的背景车辆也使用该回放中的实际姿态，避免背景车辆与演示信号不同步；自由流场景保留降暗的日常车流。路径线的几何横移与示范车的实际 MOBIL 横移可以略有不同，但必须通过同一条目标匝道并到达原出口。超时或改道标为未完成，不冒称成功。

选中后先框完整路线，再在车进入转向区域时放大沿线关键路段；跟车可手动开启，拖镜头即解除跟车，保留自由旋转。上轮示范车使用放大识别符号；本轮已替换为下文所述的小客车车形。青色路线在遮挡路段也可读，为阅读辅助覆盖层，不代表高架上下关系被改变。

建筑原先按 urban / service / motorway 类型生成不同街区，还按镜头位置自动隐藏遮住核心的楼。新增统一且跨设计保留的“城市建筑”开关，取消隐式逐栋隐藏。街区布局仍随道路类型变化；图纸视图主动省略环境，其开关提示说明夜景中会保留用户设置。交通、图纸、冲突开关相互独立；图纸不再强制打开冲突点。没有新增第三方模型、图片或字体。

### 同类方法

- [Martin Treiber / Traffic Simulation](https://traffic-simulation.de/)，[原仓库](https://github.com/movsim/traffic-simulation-de)：借鉴直接操作道路、即时车辆反馈；未复制新代码，继续使用已有 IDM/MOBIL 实现。
- [Cities: Skylines TrafficReport 模组](https://github.com/lisa-lionheart/TrafficReport)：借鉴按路线筛选与关注流向，不复制游戏素材，且不把第一代模组功能误称为第二代游戏现状。
- [Dinosaur Polo Club / Mini Motorways](https://dinopoloclub.com/games/mini-motorways/)：借鉴明确的起讫关系与克制的主控件；保留本世界夜景和工程线形，不采用商业游戏的素材或卡通风格。

研究用参考图留在作者本地私有计划目录，含第三方版权的技术图不进入网站或本仓公开素材。

## 全设计讲解与路线方位（2026-10-26，第二版第 2 轮）

14 种设计共 53 条双语讲解。`explorer/design-notes.ts` 的 11 种新增设计与 `explorer/explanations.ts` 的原有 3 种设计均提供 3–5 个实际车道锚点。每条说明同时写出解决的关系和代价；它解释模型中的工程取舍，不推断某个现实工程的设计会议记录。

| 设计 | 本轮核对的讲解重点 | 依据 |
| --- | --- | --- |
| T 字、无信号十字 | 主路优先、间隙接受、左转横穿、转弯减速 | 既有 `urban.ts` 的优先级与几何；下列 FHWA 信号路口指南关于冲突和间隙接受的定义 |
| 信号十字 | 停止线、许可左转、黄灯和全红 | 上轮 FHWA-HRT-04-091 第 4 章、Signal Timing Manual 第 4 章；本模型配时 |
| 现代环岛 | 入口让环内车、曲线降速、单车道出环 | [FHWA-SA-21-042, Roundabouts](https://highways.dot.gov/safety/proven-safety-countermeasures/roundabouts)；本模型是单环道，不把多车道环岛结论套入 |
| 渠化与待转区 | 专用左转储车、分时保护左转、两级等候 | [FHWA, Signalized Intersections: Informational Guide, Second Edition, FHWA-SA-13-027](https://highways.dot.gov/sites/fhwa.dot.gov/files/2022-06/fhwasa13027.pdf)，几何渠化与左转车道；待转区的具体准入条件来自本模型，不声称美国指南要求设置中国式待转区 |
| 连续流 | 上游换侧、中心同时放行、两处信号协调；仅南北改造 | [FHWA-HRT-09-060 第 2 章 DLT intersection](https://www.fhwa.dot.gov/publications/research/safety/09060/002.cfm)；[TxDOT 14.7.1 DLT Overview](https://www.txdot.gov/manuals/des/rdw/chapter-14--alternative-intersections-and-intercha/14-7-displaced-left-turn-intersection--dlt-/14-7-1-overview.html)。与 DLT **interchange** 的报告分开，不混称 |
| 菱形、DDI | 高速直行分层、端点信号；DDI 两次换侧消除对应左转横穿 | [FHWA Crossover Intersections](https://highways.dot.gov/safety/intersection-safety/intersection-types/crossover-intersections)；[FHWA DDI Informational Guide (2014)](https://www.govinfo.gov/content/pkg/GOVPUB-TD2-PURL-gpo54357/pdf/GOVPUB-TD2-PURL-gpo54357.pdf)；下列 TxDOT 四岔立交章节 |
| 部分苜蓿叶、全苜蓿叶 | 环道代替横穿、小半径低速、信号端点或相邻环间交织 | 上轮 [FHWA Interchange Design Promptlist](https://highways.dot.gov/field-offices/missouri/interchange-design-promptlist) 的 cloverleaf / parclo 章节；本模型 parclo 两环布置不标环间交织，但仍保留两个信号端点 |
| 喇叭形 | 三岔一环、另一方向半定向左转、匝道合流 | FHWA Promptlist 的 Trumpet / Directional Interchange 章节；东进南出环道与南进西出 `south-left` 的具体方位由 `trumpet.ts` 验证 |
| 涡轮、四层堆叠 | 定向左转、减少环间交织、向外展开与向上叠层的取舍 | [TxDOT Roadway Design Manual 15.3.2 Four-Leg Interchanges](https://www.txdot.gov/manuals/des/rdw/chapter-15-grade-separations-and-interchanges-/15-3-types-of-interchanges/15-3-2-four-leg-interchanges.html)，Directional / Turbine；最高层与独立匝道的细节由当前 `freeway-kit.ts` 验证，不把所有涡轮都限定成同样层数 |
| 黄桷湾 | 真实去向、分支、分层、绕行及汇入 | 原有 HUANGJUEWAN-SOURCES.md 的 OSM / DEM / 净空推断；仍不宣称知道真实工程的历史决策动机 |

### 三类冲突与读数口径

[VDOT, Displaced Left Turn Interchange](https://www.vdot.virginia.gov/about/our-system/highways/innovative-intersections/displaced-left-turn-interchange/) 明确区分 crossing / merging / diverging。本轮直接按已有 `ConflictPoint.type` 分列，不重算或人为减少点数：交叉是同高横穿；合流是两股接成一股；分流是一股分出不同去向。信号改变放行时间，不删除几何交叉。交织另按已标记的共享段统计。

苜蓿叶北进左转由模型得到 **交叉 0、合流 3、分流 3、交织 2 段**；不是“6 个平面横穿危险点”。十字信号路口同股左转保留 4 个几何交叉（另有 1 合流、1 分流）。各类均不是事故数、危险评分或道路安全预测。符号在图层与读数中相同：交叉 X、合流 Y、分流倒 Y。

“上行 / 下行”使用既有代表路径层级变化计数；不是每一处竖曲线或实际上下桥次数。指北针以场景北向（负 Z）投影到当前镜头，路线入口/出口标签越界时贴边并指向原位置。黄桷湾使用已有真实道路去向名称。地面名称由浏览器字体绘制，没有引入第三方图片。

### 示范车、界面与开发记录

本轮替换上轮的放大识别方块：示范小客车采用普通车辆相同的 4.5 × 1.8 m 车身比例、圆角壳体、座舱与车灯位置，只加细青色车顶轮廓。箭头是更小的双细线折角，仍沿实际路线流动。车顶识别线和选路光带可透过遮挡，属于阅读辅助；车身与道路仍遵守实际遮挡关系。

手机默认收为一行操作与一行可展开字幕；上拉整条路线工具栏、点手柄或路线名均可展开。桌面把读数压到两行，当前解释在可展开的口径和邻近比较之前。长篇双语内容在设计数据中保存中英字段，短控件继续走共享 `tx` 词典，避免把每段中文再复制成全局词典键；不放宽共享词典的 25 KB 检查。

[React Performance tracks 官方文档](https://react.dev/reference/dev-tools/react-performance-tracks) 说明开发版默认记录组件信息。本地 React/R3F 开发构建在格式化 props 时会枚举 typed-array 索引：旧 `runtime.geometry` 等公开数据导致单条约 8,441,639 行、209,824,919 字符，随后传入 `performance.measure`。Worker runtime 的 GPU / 模型资源现用 ECMAScript 私有存储和原型 getter，RoadMeshes / Blueprint 接收资源接口；回放帧也使用私有资源封装。没有关闭 React 性能轨、拦截生产 API、修改依赖或用生产模式替代修复。私有验收日志保存修复前后原始计数和开发模式连续切换结果。

DDI 和连续流的路线信号读数跟随当前车道或下一个实际停止线的 `signalGroups`，不沿用笼统 O-D 分组；没有信号门控的高速直行不显示红灯。剩余秒数累计至该方向真正变色，包含对向绿灯、黄灯和全红间隔。教学回放的停车状态仍读取同一交通仿真。
