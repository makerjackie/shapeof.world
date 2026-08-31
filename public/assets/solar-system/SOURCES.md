# 太阳系贴图来源与授权（public/assets/solar-system/）

全部为等距圆柱投影（equirectangular 2:1）表面图，收敛到 ≤2048px 宽、每张 ≤1.5MB；例外是 moon-voyage 专用的 4K 文件（earth-bmng-4k.jpg 4096px、moon-lroc-4k.jpg 4096px），为近景清晰度保留更高分辨率。
授权分三类：NASA 公有领域（Public domain）、Björn Jónsson 公开行星图（可自由使用，需署名 "created by Björn Jónsson"）、CC BY 4.0（署名）。

| 文件 | 内容 | 来源（作者/任务） | 授权 | 原始文件 URL | 本地处理 |
|---|---|---|---|---|---|
| sun.jpg | 太阳全日面图 | NASA SDO/AIA，Wikimedia Commons「Map of the full sun」 | Public domain (NASA) | https://commons.wikimedia.org/wiki/File:Map_of_the_full_sun.jpg | 3000×1500 → 2048×1024 JPEG |
| mercury.jpg | 水星全球拼图 | NASA/JHUAPL MESSENGER MDIS，Wikimedia Commons「Mercury global map 2013-05-14 bright」 | Public domain (NASA) | https://commons.wikimedia.org/wiki/File:Mercury_global_map_2013-05-14_bright.png | → 2048×1024 JPEG |
| venus.jpg | 金星云层图（紫外着色） | Björn Jónsson，基于 NASA Galileo 1990 飞掠 21 张照片 | Björn Jónsson 公开行星图（署名即可，见 bjj.mmedia.is/data/planetary_maps.html） | https://bjj.mmedia.is/data/venus/venus.jpg | 1800×900 重压缩 |
| earth-day.jpg | 地球白昼 Blue Marble | NASA Visible Earth「Blue Marble」(2002, R. Stöckli) | Public domain (NASA) | 复用仓库已有 public/assets/earth-blue-marble.jpg（2048×1024）；原始出处 https://visibleearth.nasa.gov/collection/1484/blue-marble | 复制后 +32% 饱和度、轻微压高光（-modulate 97,132,100）；2026-07 再 +18% 饱和度（屏幕直出偏灰） |
| earth-night.jpg | 地球夜景 Black Marble 2016 | NASA Earth Observatory / NOAA VIIRS DNB，Wikimedia Commons「BlackMarble20161km」 | Public domain (NASA/NOAA) | https://commons.wikimedia.org/wiki/File:BlackMarble20161km.jpg | 43200×21600 → 2048×1024 JPEG |
| earth-clouds.jpg | 全球云层亮度图 | NASA 卫星云图衍生，three.js examples 附带的 earth_clouds_1024.png | NASA 数据衍生（three.js 仓库 MIT 分发） | https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_clouds_1024.png | PNG → JPEG（作 alphaMap 亮度通道）；2026-07 -level 32%,100% 压掉薄云底噪，避免整球白纱 |
| mars.jpg | 火星全球彩色拼图 | NASA/USGS Viking MDIM2.1 Color Mosaic，Wikimedia Commons | Public domain (NASA/USGS) | https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg | 21339×10670 → 2048×1024 JPEG |
| jupiter.jpg | 木星（卡西尼 2000-12） | Björn Jónsson，基于 NASA Cassini 约 100 张照片 | Björn Jónsson 公开行星图（署名即可） | https://bjj.mmedia.is/data/jupiter_css/jupiter_css.jpg | 3600×1800 → 2048×1024 JPEG，+22% 饱和度；2026-07 再 +42% 饱和度 + sigmoidal 对比度 4（屏幕直出偏灰） |
| saturn.jpg | 土星（卡西尼 2004 + 旅行者北半球） | Björn Jónsson，基于 NASA Cassini/Voyager | Björn Jónsson 公开行星图（署名即可） | https://bjj.mmedia.is/data/saturn/saturn.jpg | 2880×1440 → 2048×1024 JPEG；2026-07 +28% 饱和度 + sigmoidal 对比度 3 |
| uranus.jpg | 天王星（旅行者 2 号数据） | SolarSystemScope texture 2k uranus，Wikimedia Commons | CC BY 4.0（署名 SolarSystemScope） | https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_uranus.jpg | 原样 2048×1024 |
| neptune.jpg | 海王星（旅行者 2 号数据） | SolarSystemScope texture 2k neptune，Wikimedia Commons | CC BY 4.0（署名 SolarSystemScope） | https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_neptune.jpg | 原样 2048×1024 |
| moon.jpg | 月球全球拼图 | NASA/USGS Clementine UVVIS，Wikimedia Commons「Moonmap from clementine data」 | Public domain (NASA/USGS) | https://commons.wikimedia.org/wiki/File:Moonmap_from_clementine_data.png | 1440×720 → JPEG |
| moon-lroc-2k.jpg | 月球全球彩色图（LROC WAC 合成，CGI Moon Kit 2025） | NASA/GSFC/Arizona State University，Scientific Visualization Studio #4720 | Public domain (NASA) | https://svs.gsfc.nasa.gov/4720 （原始文件 lroc_color_2k.jpg，2048×1024） | -modulate 99,118,100 + sigmoidal-contrast 4（原图屏幕直出偏灰） |
| earth-bmng-4k.jpg | 地球白昼 Blue Marble（陆地+浅水+地形晕渲，4K 版，moon-voyage 用） | NASA Visible Earth #57752「Blue Marble: Land Surface, Shallow Water, and Shaded Topography」(R. Stöckli) | Public domain (NASA) | https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_8192.tif （8192×4096） | → 4096×2048 JPEG q84 |
| moon-lroc-4k.jpg | 月球全球彩色图 4K 版（LROC WAC 16bit sRGB，moon-voyage 用） | NASA/GSFC/Arizona State University，Scientific Visualization Studio #4720 | Public domain (NASA) | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif （4096×2048 16bit） | → 8bit JPEG q86，-modulate 99,118,100 + sigmoidal-contrast 4 |
| moon-ldem-bump.jpg | 月球高程灰度图（LRO LOLA，bumpMap 用） | NASA/GSFC，Scientific Visualization Studio #4720 | Public domain (NASA) | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_4_uint.tif （1440×720 16bit uint） | → 8bit 灰度 JPEG |
| saturn-rings.webp | 土星环 RGBA 径向条带 | Björn Jónsson 土星环模型：颜色=sat_ring_color.png（NASA Voyager 反向散射），透明度=Voyager 恒星掩星光学深度剖面（PDS Rings Node）转透明度 | Björn Jónsson 公开行星图（署名即可） | https://bjj.mmedia.is/data/s_rings/ （sat_ring_color.png + transparency.png） | alpha = 1 − transparency（原文定义为「透明度」），合成 RGBA → 1024×64 WebP |

## 土星环条带半径映射

Jónsson 环模型数据跨度约 74,500 km – 140,385 km（13177 采样 × 5 km，Voyager 掩星剖面）。
渲染时代码按此物理跨度映射到环面几何（见 SolarSystem.tsx `RING_STRIP_INNER_KM/OUTER_KM`），
条带 x=0 对应内缘（C 环，半透明），中段为 B 环（不透明），含卡西尼缝、A 环与细 F 环。
