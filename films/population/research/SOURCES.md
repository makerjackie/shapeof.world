# 数字账本

The chart data is built by `tools/data.py`; the details of how are in its docstring.

| 上屏 | 值 | 出处 / 口径 |
|---|---|---|
| 年末总人口 1949–2023 | 54,167 → 140,967 万 | 中国统计年鉴 2024 表 2-1 (revised after 七普). The years the table skips are rebuilt from the NBS average population, which matches every year that is listed |
| 2024、2025 年末总人口 | 140,828 / 140,489 万 | 国家统计局 年度统计公报 (2025 年数据 2026-01 发布) |
| 出生、死亡 1949–1977 | e.g. 1963 出生 2,959 万 | NBS crude rates × average population, as tabulated in Wikipedia "Demographics of China" (rates 43.37‰ etc.) |
| 出生、死亡 1978–2023 | e.g. 2016 出生 1,883 万 | 统计年鉴 2024 表 2-2 rates (revised) × average of the year-end populations; matches the bulletins (2020 1202, 2022 956, 2023 902) |
| 2024 / 2025 出生、死亡 | 954 / 1,093；792 / 1,131 万 | 统计公报 |
| 死亡率 1949 → 1957 | 20‰ → 10.8‰ | NBS rates |
| 1960 总人口减少 | 1,000 万 (67,207 → 66,207) | 表 2-1 |
| 1961 出生 vs 1957 | −45% (2,169 → 1,190) | computed |
| 连续 9 年出生 > 2500 万 | 1963–1971 | computed from the series |
| 1971–1979 出生 | −33% | computed |
| 1987 第二高峰 | 2,529 万 | 23.33‰ × average population |
| 2000 老龄化 | 65+ 约 7%（五普 6.96%） | 第五次人口普查 |
| 2003–2010 每年约 1600 万 | 1,585–1,617 万 | computed |
| 2020 出生 | −18% (1,465 → 1,202) | computed |
| 2021 峰值 | 141,260 万 | 表 2-1 |
| 2022 死亡 > 出生 | 1,041 > 956 万; last time 1960 (deaths 1,696 > births 1,392 万) | NBS |
| 1963 → 2025 出生 | −73% (2,959 → 792) | computed |
| 印度超过中国 | 2023-04, UN statement; WPP 2024 mid-year estimates cross in 2022 | UN DESA press, 2023-04-24; WPP 2024 via Our World in Data |
| 世界人口前五 / 前十 | WPP 2024 estimates (to 2023) and medium variant (2024+) | UN World Population Prospects 2024, via ourworldindata.org/grapher/population-with-un-projections |
| 2100 中国 | 约 6.33 亿 (medium) ≈ 1956 年末 62,828 万 to 1957 64,653 万 | WPP 2024 medium; 表 2-1 |
| 政策日期 | 1957.07 新人口论 (人民日报); 1971 国务院批转计划生育报告; 1973 晚稀少; 1980.09.25 公开信; 1982 基本国策 + 三普 10.08 亿; 2013.11 单独二孩; 2016.01.01 全面二孩; 2021.05.31 三孩; 2025.07 育儿补贴 3600 元/年/孩 (3 岁以下) | 新华社/中国政府网 public records |

Note: on the revised data, 2012 (1,973 万) had more births than 2016 (1,883 万), so the film calls 2016 "二孩第一年", not a record.
