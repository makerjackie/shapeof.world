# 数字账本 · 两千年中国人口（Film3 / Film4）

The chart's series lives in `src/v3/series.ts`.

Every point carries a kind:
- **rec**: 正史/实录户口登记
- **est**: 学者估算
- **stat**: 国家统计局
- **un**: 联合国预测

When two points are more than 25 years apart, there was no national count in between.

- Film3: holds the last count, then lands on the next one.
- Film4: draws a schematic path between the two counts:
  - It is a dashed line over hollow slips. The header chip reads "两次统计相隔 N 年 · 示意".
  - Falls are front-loaded, because wars and famines strike first (1 − (1 − k)^2.6). Rises use smoothstep.
  - Only the two end points are data.

## Series points

| 年 | 万人 | 类 | 出处 |
|---|---|---|---|
| 2 | 5,959.4 | rec | 《汉书·地理志》元始二年 59,594,978 |
| 57 | 2,100.8 | rec | 《后汉书·郡国志》注引《帝王世纪》 |
| 75 / 88 / 105 / 125 / 140 / 144 / 145 / 146 | 3,412.5 / 4,335.6 / 5,325.6 / 4,869.1 / 4,915.0 / 4,973.1 / 4,952.4 / 4,756.7 | rec | 《后汉书》注引 |
| 157 | 5,648.7 | rec | 《晋书·地理志》《通典》 |
| 280 | 1,616.4 | rec | 《晋书·地理志》太康元年 16,163,863 |
| 609 | 4,602.0 | rec | 《隋书·地理志》大业五年 46,019,956 |
| 639 | 1,235.2 | rec | 贞观十三年（冻国栋） |
| 705–755 | 3,714 → 5,291.9 | rec | 神龙元年至《通典》天宝十四载 52,919,309 |
| 760 / 764 / 820 | 1,699.4 / 1,690 / 1,576 | rec | 乾元三年 · 广德二年 · 元和十五年 |
| 980 | 3,250 | est | 《太平寰宇记》户数推算 |
| 1110 | 12,500 | est | 葛剑雄主编《中国人口史》（人民论坛 2016-07 转述） |
| 1290 | 5,883.5 | rec | 《元史·地理志》至元二十七年 58,834,711 |
| 1393 | 6,054.6 | rec | 《明史·食货志》洪武二十六年 60,545,812 |
| 1630 / 1644 | 19,250 / 15,250 | est | 曹树基《中国人口史》第四卷 |
| 1682 | 13,000 | est | 葛剑雄 |
| 1741–1844 | 14,341 → 41,281.5 | rec | 清实录 民数（乾隆六年起按"口"统计） |
| 1851 | 43,216.4 | rec | 户部清册 咸丰元年 432,164,047 |
| 1880 | 36,450 | est | 曹树基《中国人口史》第五卷（Gapminder 1880 年为 366M，相近） |
| 1912 | 41,164 | est | 1912 年人口调查（陈长衡修订） |
| 1949–2025 | 54,167 → 140,489 | stat | 统计年鉴 2024 表 2-1（七普修订）+ 2024、2025 统计公报；见 SOURCES.md |
| 2026–2100 | → 63,337 | un | 联合国 WPP 2024 中方案（OWID） |

**Ming registers** (thin line, "户口册"): 1381 5,987 · 1393 6,055 · 1403 6,660 · 1479 7,185 · 1491 5,328 · 1504 6,011 · 1578 6,069 · 1602 5,631 · 1620 5,166 (万). Source: 明实录 / 《明史》.

## On-screen claims

| 上屏 | 依据 |
|---|---|
| −64.75%（2 → 57） | 2,100.8 / 5,959.4 − 1 |
| −71%（157 → 280） | 1,616.4 / 5,648.7 − 1 = −71.4% |
| −73%（609 → 639） | 1,235.2 / 4,602 − 1 = −73.2% |
| −68%（755 → 760） | 1,699.4 / 5,291.9 − 1 = −67.9% |
| −53%（1110 → 1290） | 5,883.5 / 12,500 − 1. The two figures use different bases; the screen says "口径不同". |
| −21%（1630 → 1644） | 15,250 / 19,250 − 1 = −20.8% |
| 唐实际 8,000 万以上 | 葛剑雄《中国人口发展史》（8,000–9,000 万） |
| 元实际 7,500 万以上 | 吴松弟（约 1,500 万户，>7,500 万） |
| 宋代"只记男丁" | 1110 年 20,882,258 户、46,734,784 口，2.24 口/户 |
| 1741 年起按"口"统计 | 乾隆六年起奏报民数（大小男妇） |
| 1834 年 401,008,574 | 《清宣宗实录》道光十四年 |
| 1851—1878 死亡 1.16 亿 | 曹树基（战区和灾区：屠杀、饥馑、瘟疫） |
| 浙江 −52% | 曹树基：战前约 3,127 万 → 战后 1,497 万 |
| 世界每 3 人有 1 个在中国（1851） | 43,216 / 127,877（OWID 世界人口）= 33.8% |
| 接近今天整个日本 | 日本 2025 年约 1.23 亿 |
| 1960 −1,000 万；1961 −348 万 | 67,207 → 66,207 → 65,859 |
| 1963 出生 2,959 万；1987 出生 2,529 万；2016 出生 1,883 万；2025 出生 792 万 | 见 SOURCES.md |
| 2021 峰值 14.13 亿；2022 死亡 1,041 > 出生 956 | 统计公报 |
| 2100 约 6.3 亿 ≈ 1956 年 | WPP 2024 中方案 63,337 万；1956 年末 62,828 万 |
| 1953 起共七次普查 | 1953 · 1964 · 1982 · 1990 · 2000 · 2010 · 2020 |
| 世界人口表 | 1740–1949：OWID long-run（HYDE 3.3 / Gapminder）；1950+：UN WPP 2024；今国界 |
| 地图光点 | ISIMIP2a HYDE 5′ 网格 1860 年分布（0.25° 聚合）；全片沿用 1860 年格局，画面标注"示意"；不画国界 |
| 古诗 | 曹操《蒿里行》；杜甫《春望》（757 年） |

## Film4 additions

| 上屏 | 来源 / 许可 |
|---|---|
| 阎立本《步辇图》 | Wikimedia Commons, File:Emperor Taizong Receiving the Tibetan Envoy(Bunian Tu).jpg (public domain) |
| 《明皇幸蜀图》 | Wikimedia Commons, File:Emperor Minghuang's Journey to Sichuan, Freer Gallery of Art.jpg (public domain) |
| 张择端《清明上河图》局部 | Wikimedia Commons, File:Along the River During the Qingming Festival (detail of original).jpg (public domain) |
| 刘贯道《元世祖出猎图》 | Wikimedia Commons, File:KhubilaiOnTheHunt.jpg (public domain) |
| 周臣《流民图》（1516） | Cleveland Museum of Art 1964.94, CC0 (Wikimedia Commons TIFF; figures section cropped) |
| 徐扬等《乾隆南巡图》第四卷局部 | The Met, CC0 (Wikimedia Commons) |
| 疆域光边 | aourednik/historical-basemaps (GPL-3.0), snapshots −1 … 1880. Only the Chinese dynasty's outline is used; the dataset's own China labels are partly wrong (700 = "Sui Empire", 1400 = "Great Khanate"), so the film labels by itself and uses the 1500 outline for early Ming. Drawn as soft light, labelled 示意; nothing after 1912. |
| 每年出生 / 死亡小图 | 国家统计局 (see SOURCES.md) |
| 10 亿 → 13 亿用了 24 年 | 1981 年末 100,072 万；2005 年末 130,756 万 |
| 音乐 | The reference video's soundtrack, edited on its accents (EDL in src/v3/plan4.ts, 15 ms crossfades) |

## Film5 (v3 cut) changes

The series is in `src/v5/series5.ts`.

- **1290:** now the scholarly estimate 7,500 万 (吴松弟, vol. 3 of 葛剑雄主编《中国人口史》), so 1110 → 1290 compares estimate with estimate.
- **Gaps:** every gap is a straight dashed line. Only the two end points are data.

| 上屏 | 依据 |
|---|---|
| −40%（1110 → 1290） | 7,500 / 12,500 − 1 = −40%. Both figures come from the same series. |
| 1645—1683 清初：南明 · 三藩 · 迁界；1682 年约 1.3 亿 | 葛剑雄 (point 1682 = 13,000 万) |
| 2022 · 61 年来首次负增长；−85 万 | NBS: declines only in 1960, 1961, 2022–2025. 141,260 → 141,175 |
| 1963 出生 2,959 万 · 1949 年以来最多 | data.json maximum: 2,959.3 万 (1963) |
| 2025 出生 792 万 · 1949 年以来最少 | data.json minimum: 792 万 (2025) |
| 跌下去，又涨回来 | Every crash shown is followed by a recovery in the series (57→157, 280→609, 639→755, 760→1110, 1290→1630, 1682→1851, 1880→1949, 1961→) |
| 这一次，没有战争，没有饥荒 | 2022–2025 decline: births below deaths, in peacetime |
| 结尾总览 | Log axis, labelled "纵轴为对数刻度：看的是涨跌幅" |
| 亿 stamps | Each n 亿 is stamped only at the first count ≥ n 亿: 1 亿 1110 (est.), 2 亿 1764, 3 亿 1790, 4 亿 1834, 5 亿 1949, then NBS years. No stamp falls on a dashed gap. |

**Mini-map (top right):**
- historical-basemaps outlines.
- Hand-drawn splits, all marked 示意:
  - 三国: Wei to the north of the Qinling–Huai line; Shu and Wu divided at the Three Gorges, 109.5°E.
  - 南宋 · 金: the Huai–Qinling line of the 1142 treaty. Jin is the northern part plus the Liao lands.
- Built by `tools/territory5.py` into `src/v5/territory5.json`.

**Fonts:**
- Noto Serif SC, Noto Sans SC and Ma Shan Zheng (brush), all SIL OFL.
- Subsetted by `tools/fonts5.py` into `public/fonts5/`.
- Seals and every other text element are drawn on canvas. The v2 seal "jitter" came from SVG `<text>` under a scaled parent: Chrome rendered different sizes in different render tabs.

**Music:**
- The reference soundtrack is re-edited into 12 segments cut on bar lines (EDL in `src/v5/plan5.ts`).
- Each segment starts exactly at its planned film time, with equal-power seams (0.4 s into the B section), so the cuts never drift the sync.
