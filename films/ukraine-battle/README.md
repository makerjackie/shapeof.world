# 现代战争，到底是怎么打的？（films/ukraine-battle）

约 6:04，1920×1080，30 fps，无旁白。用 2023 年夏天扎波罗热州奥里希夫—罗博京之间的一片田，讲现代战争怎么打：2023 年乌军往南打，2024 年起俄军往北打，两边撞上同一堵墙。剧本见 `SCRIPT.md`（屏幕上的字以 `src/film/text.ts` 为准），作者的要求见 `BRIEF.md`，发布文案和来源见 `DESCRIPTION.md`。调研底稿在私有目录 `private/videos/ukraine-battle/research/`。

## 画面：一个三维世界

`src/world/engine.ts` 是唯一的 three.js 场景，每帧在 layout effect 里同步渲染完再 `gl.finish()`：

- **国家尺度**：Natural Earth 国界（乌克兰视角，即国际承认的边界）、河流；AWS Terrain Tiles 的地形起伏；控制区是我们自己画的示意（`tools/prep_ukraine.py` 里的几条线穿过有名的城镇，裁到乌克兰国界内，面积比例和 DeepState、ISW 公布的数字对过）。
- **战场尺度**：Copernicus GLO-30 高程（80 米网格），地面贴 Sentinel-2 影像（2023-06-05、2023-09-28、2021-07-15），OSM 的林带长成一棵棵树冠，居民区里撒房子；雷场、弹坑、两方底色、无人机封锁带都在地形着色器里画；防线位置对照 2023-06-05 的卫星图描、其余按 RUSI 的描述画示意（`src/geo.ts`）。
- **两种"眼睛"**：地图眼（卫星图加标注）和无人机眼（白热热成像，`uThermal`，加屏幕读数 `OSD`）。
- 车辆、人、爆炸、导弹轨迹都是程序生成的示意；车辆按真实尺寸，近景里放大 1.7–2.5 倍好让人看清。

时间轴：`src/film/state.ts`（镜头和世界的状态）、`src/film/text.ts`（每一行字）、`src/film/overlay.tsx`（字、标注和图形）。

## 数据（不进 Git 的在 `public/`）

```bash
# 依赖：Python 3.12 + numpy rasterio pillow requests shapely pyproj scipy
python tools/warp.py dem                                   # 见 private 调研：Copernicus DEM N47 E035/E036 → dem40.npy
python tools/warp.py s2 20230605 A_36TYT,A_36TXT public/s2-2023-06-05.jpg 10
python tools/warp.py s2 20230928 B_36TYT,B_36TXT public/s2-2023-09-28.jpg 10
python tools/warp.py s2 20210715 A_36TYT,A_36TXT public/s2-2021-07-15.jpg 10
python tools/prep_field.py osm.json dem40.npy src/data      # OSM（Overpass）→ field.json；dem80.f32 移到 public/
python tools/prep_ukraine.py <natural-earth-dir> src/data public
```

`tools/warp.py` 在 Element 84 Earth Search 上取 Sentinel-2 L2A 的 `visual` 图层，按片子的局部坐标（47.42 N、35.86 E 为原点）重投影。

## 声音

- 配乐来自自己的曲库：《暗影 · 合成器浪潮》（lib-synthwave-suspense，100 BPM，在第 21–28 小节无缝循环两次）接《暗影 · 氛围电子》（lib-ambient-suspense，从 24 秒起到结尾）；`tools/music.py` 生成 `public/music.wav`。
- 音效全部用代码合成（炮击、爆破索、导弹、地雷、无人机、直升机、计时器、风）：`tools/sfx.py public/music.wav public/mix.wav`，无人机那几段把音乐压低。
- 母带：`tools/tpmaster.py public/mix.wav out/<video>.mp4 out/<final>.mp4 -12`（−12 LUFS，真峰值 ≤ −1 dBTP，Apple `aac_at`）。

## 渲染

```bash
npm ci
node tools/render.mjs out/ukraine-battle-video.mp4 4      # 只出画面；Chrome 经 tools/chrome.sh 关掉 GPU 栅格化
SCALE=0.33 COMP=Film node tools/lab.mjs /tmp/s 30 180 …   # 任意帧的截图
python tools/sheet.py /tmp/s /tmp/s/sheet.jpg 5            # 截图拼成带时间的总览
node tools/readtime.mjs                                     # 检查每行字够不够读完
```
