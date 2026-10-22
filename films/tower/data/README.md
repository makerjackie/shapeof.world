# films/tower/data · 高楼的形状 v2 的地图数据

2026-10-22 生成。全部是 GeoJSON（`.geojson`），坐标 **WGS-84 经纬度（EPSG:4326，[lon, lat]）**，小数点后 5 位（约 1 米）。来源、授权和署名见下表。数字的出处和核实状态见 `../research/06-map-and-planning.md`。

## 一、坐标系：只用 WGS-84，别混 GCJ-02

| 来源 | 坐标系 | 怎么确认的 |
|---|---|---|
| OpenStreetMap | WGS-84 | OSM 的约定就是 WGS-84；CTBUH 的坐标和它吻合，见下一行 |
| CTBUH Skyscraper Center | WGS-84 | 58 栋 CTBUH 塔楼和 OSM 楼底图逐一配对，距离中位数约 14 米，最远 40 米内（配对阈值） |
| DataV.GeoAtlas（高德数据） | **GCJ-02** | 福田、罗湖区界南边沿着深圳河：原样叠到 OSM 深圳河上，中位偏 **431 米**；转换成 WGS-84 后降到 **39 米** |
| 香港、澳门（DataV 810000/820000） | 也要转换 | 和 OSM 海岸线比，原样中位偏 375 米，转换后 131 米（海岸线本身不精确，只说明转换后更近） |

- GCJ-02 在深圳的偏移：同一个点，GCJ-02 比 WGS-84 **偏东约 526 米、偏南约 300 米**（以能源大厦为例：WGS-84 114.0587, 22.5331 → GCJ-02 114.0638, 22.5304）。
- 所有 DataV 文件已经用 `scripts/lib.mjs` 里的 `gcj2wgs()`（迭代反解，往返误差 < 1 毫米）转成 WGS-84，所以和 OSM 文件可以直接叠。
- 如果以后从高德、腾讯地图或百度（BD-09）抄坐标，先转换再用。

## 二、文件

体积：全部合计约 3.4 MB（gzip 后约 1 MB）。其中**福田 CBD 的 OSM 部分**（`futian-cbd-*` + `energy-mansion`）合计 1.0 MB。

### 深圳和周边

| 文件 | 内容 | 来源 | 授权 | 大小 |
|---|---|---|---|---|
| `shenzhen-districts.geojson` | 深圳 10 个区（含大鹏新区）**陆地**部分，已用 OSM 海岸线裁到岸线。属性：name、name_en、osm_relation、area_km2_land。龙岗区已扣掉大鹏新区 | OSM 行政区划 relation + OSM natural=coastline | ODbL | 118 KB |
| `shenzhen-outline.geojson` | 全市陆地外轮廓（1 个 MultiPolygon，60 米简化） | 同上 | ODbL | 49 KB |
| `land-mask.geojson` | 陆地多边形，范围 113.70–114.70 E、22.38–22.90 N（含香港、东莞、惠州的陆地），用来画海陆底图 | OSM natural=coastline | ODbL | 117 KB |
| `guangdong-cities-datav.geojson` | 广东 21 个地级市 + 香港 + 澳门，100 米简化，边界含近岸海域 | DataV `areas_v3/bound/440000_full`、`810000`、`820000`（高德数据），已转 WGS-84 | **见第三节，仅供学习和交流** | 200 KB |
| `alt-shenzhen-districts-datav.geojson` | DataV 的深圳 9 区（**没有单列大鹏新区**，并在龙岗里；多边形含近岸海域，所以面积比官方大） | DataV `440300_full`，已转 WGS-84 | 同上 | 59 KB |
| `shenzhen-metro.geojson` | 深圳地铁：线路 LineString（属性 line = 线号、colour = 十六进制）+ 车站 Point（kind=station）。OSM 里有 1–14、16、20、2&8、6B 共 18 个线号 | OSM route=subway relation + railway=station | ODbL | 201 KB |
| `shenzhen-roads-major.geojson` | 全市高速和快速路（motorway、trunk），60 米简化；**没有 primary** | OSM highway | ODbL | 572 KB |
| `shenzhen-towers-ctbuh.geojson` | CTBUH 的 150 米以上已建成塔楼 465 栋（有竣工年）+ 7 栋无年份，外加 200 米以上在建/封顶 42 栋（status=UC/STO）。属性：ctbuh_id、name_en、name_zh、height_m、floors、year、status、use、gfa_m2 | CTBUH Skyscraper Center 深圳页 | 只含事实；CTBUH 版权，见第三节 | 126 KB |
| `shenzhen-skyline-by-year.json` | 1985–2026 每年新增和累计的 150/200/300 米以上塔楼数（只算已建成），做天际线生长动画用。2017 年累计 200 米以上 58 栋、300 米以上 7 栋；2026 年 200 / 22 | 同上 | 同上 | 4 KB |
| `landmarks.geojson` | 28 个点：能源大厦、平安、市民中心、会展中心、莲花山、少年宫、图书馆、音乐厅、书城、福田高铁站、中心公园、卓越世纪、大百汇、京基100、华润春笋、腾讯滨海、深业上城、招商银行总部；福田中心区质心；**7 个写字楼分区锚点**（车公庙、后海、前海、科技园、蛇口、罗湖、宝安中心区，取各分区里的一个地铁站，**不是分区边界**）；K602-0016（估算点）。每个点有 source | OSM、CTBUH | ODbL / 见上 | 7 KB |

### 福田（区和中心区）

| 文件 | 内容 | 来源 | 授权 | 大小 |
|---|---|---|---|---|
| `futian-district-roads.geojson` | 福田区一带（113.98–114.12 E、22.49–22.60 N）motorway 到 secondary，8 米简化。属性：cls、name、ref、bridge、tunnel、link | OSM | ODbL | 600 KB |
| `futian-district-green.geojson` | 同一范围的公园、林地、保护区、水面和湿地（≥2 公顷），非水面已裁到岸线（原 OSM 红树林保护区轮廓伸进了深圳湾） | OSM | ODbL | 317 KB |
| `futian-cbd-boundary.geojson` | **福田中心区近似边界**：法定图则的四至（西新洲路、东彩田路、南滨河大道、北红荔路），用 OSM 道路中心线求交点连成。面积 **4.12 km²**。**这是近似，不是法定图则的官方边界** | OSM 道路 + 法定图则四至 | ODbL | 1 KB |
| `futian-cbd-buildings.geojson` | 窗口 114.037–114.069 E、22.527–22.560 N 内的建筑底图 1,522 个。属性：id、name、name_en、kind（OSM building 值）、levels、height、**h**（做拉伸用的最佳高度）、**hs**（h 的来源）、ctbuh_id、h_ctbuh、year（CTBUH 竣工年）、floors_ctbuh | OSM + CTBUH 配对 | ODbL | 611 KB |
| `futian-cbd-roads.geojson` | 同一窗口的全部道路（motorway 到 service，不含停车场通道），1.5 米简化。属性：cls、name、name_en、ref、bridge、tunnel、layer、oneway、link | OSM | ODbL | 331 KB |
| `futian-cbd-green.geojson` | 同一窗口的公园、草地、水面、河渠（kind=park/grass/wood/water/wetland/pitch/waterway） | OSM | ODbL | 68 KB |
| `futian-cbd-metro.geojson` | 同一窗口的地铁线路（含在建）和合并后的车站点 | OSM | ODbL | 22 KB |
| `energy-mansion.geojson` | 能源大厦：**宗地外框**（OSM landuse，`role=parcel`）、**北塔**（`north_tower`，219.1 米 / 43 层）、**南塔**（`south_tower`，111.3 米 / 20 层）、**裙楼**（`podium`，50 米 / 9 层）、质心点（`centroid`）。属性里带官方宗地面积 6,427.7 ㎡ 作对照 | OSM + 深圳能源公告 + CTBUH | ODbL | 2 KB |

### 脚本（`scripts/`）

- `fetch.sh`：重新下载全部原始数据（Overpass、DataV、CTBUH）。公共 Overpass 服务器经常满载，要 10–20 分钟，已内置多节点轮换重试。原始文件放在 `/tmp/towergeo`，**不提交**。
- `build-land.mjs` → `build-cbd.mjs` → `build-city.mjs`：生成上面所有文件，`stats.mjs` 算 06 号笔记里的派生数字。依赖：`npm i`（只有 `polygon-clipping`）。
- `lib.mjs`：GCJ-02 ↔ WGS-84、Douglas-Peucker 简化、Overpass → GeoJSON。

## 三、授权和署名

- **OpenStreetMap**：数据 © OpenStreetMap contributors，ODbL 1.0（https://www.openstreetmap.org/copyright）。片尾署名用：**"地图数据 © OpenStreetMap contributors"**。这些 GeoJSON 是 OSM 的派生数据库：画面里用（Produced Work）只需署名；如果把 GeoJSON 文件本身再公开分发，要按 ODbL 同样的条件共享。以上是对条款的一般理解，不是法律意见。
- **DataV.GeoAtlas（高德数据）**：阿里云帮助中心原文是"DataV.GeoAtlas工具中的数据来自高德开放平台，仅供学习和交流使用"，"如有版权相关问题，请前往高德开放平台进行确认"（https://help.aliyun.com/zh/datav/datav-7-0/user-guide/datav-geoatlas-widgets/ ，2026-10-22 读取）。页面没有写明授权协议和坐标系。**公开发布的片子用它有授权风险**。所以深圳各区的主图层用的是 OSM（`shenzhen-districts`），DataV 的两个文件只作备用（按要求保留：广东各市、香港、澳门）。要在成片里用广东地图，建议署"高德开放平台"，或者让我换成 OSM 行政区划。
- **CTBUH**：数据 © Council on Tall Buildings and Urban Habitat（https://www.skyscrapercenter.com/city/shenzhen ，2026-10-22 读取）。文件里只有事实（名称、高度、层数、竣工年、坐标），署名用 **"高度与竣工年：CTBUH Skyscraper Center"**；不要单独再分发这个文件。
- **官方数字**（宗地面积、计容面积等）：来自深圳能源上市公司公告，见 06 号笔记。

## 四、需要注意

1. **宗地外框偏大**：OSM 里能源大厦的 landuse 外框面积 **8,164 ㎡**，官方宗地面积是 **6,427.7 ㎡**（容积率 15，覆盖率 65.05%）。外框应该多圈了路沿和绿化带。要画"这块地"的话，建议按官方面积把外框向内缩，或者直接用三栋楼底图的外包。三栋楼底图合计 4,485 ㎡（官方覆盖率算出的是 4,181 ㎡）。
2. **CBD 建筑高度很多是空的**：1,522 栋里，有 OSM `height` 的只有 75 栋，有层数的 496 栋，58 栋被 CTBUH 的塔楼配上了高度和竣工年。`h` 就是按这个优先级排的：CTBUH 高度 > OSM height > 层数 × 3.5 米（`hs` 写着是哪一种），**519 栋有 `h`，其余没有**，要自己按 kind 补默认值。`kind=roof` 的 11 个是雨棚，不是楼。
3. **CTBUH 与 OSM 高度不同的地方**：中国人寿大厦（OSM 149.3 / CTBUH 165）、平安财险大厦（OSM 220 / CTBUH 208.5）、建设银行大厦（OSM 213.6 / CTBUH 230）。`h` 取 CTBUH，原 OSM 值留在 `height`。
4. **陆地面积比官方小约 2%**：按 OSM 岸线裁出的深圳陆地是 1,957 km²，官方陆域面积是 1,997.47 km²（填海和滩涂的口径差）。福田：OSM 陆地 73.0，福田区政府公布辖区总面积 78.66 km²。画图没问题，**不要把这些面积当官方数字**。
5. **地铁线路可能比实际少**：OSM 里的线号是 1–14、16、20、2&8、6B。没有的线（比如在建或新开的）画不出来。
6. **没有基本生态控制线的图形**：没有找到官方可下载的 GIS 数据（深圳政府数据开放平台 opendata.sz.gov.cn 没有 GeoJSON/SHP 的数据集），OSM 里也没有这条线。如果片子要画"一半的地不能盖"，建议用 `shenzhen-districts` 做底，叠一个 974.5 / 1,997.47 ≈ 48.8% 的示意色块，并在画面里标"示意"，不要画成真实边界。
7. **写字楼分区锚点不是分区边界**：莱坊的车公庙、后海、前海等分区没有公开的边界，`landmarks.geojson` 里取的是分区内一个地铁站的位置。
8. **K602-0016 位置是估算**：官方只说"科苑南路与登良路交汇处西北角"，地块面积 9,508.38 ㎡。OSM 里这个路口在 22.5131 N, 113.9388 E，地块中心按"西北角"推到 22.5135 N, 113.9383 E，误差约 100 米。
