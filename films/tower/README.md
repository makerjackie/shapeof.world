# 高楼的形状

2:57.6、1920×1080、30fps 的中文数据片，无旁白。v2（2026-10-22）把 v1 的抽象卡片换成了真实的城市：一台连续的地图镜头从珠三角推到宗地 B119-0053，楼按 OpenStreetMap 的真实轮廓拉起来。

- **论点**：深圳的高楼，不是盖来收租的。
- **主线**：跟着深圳能源大厦（福田，北塔 218 米），从 2008 年的一块地走到今天。
- **那一个发现**：按今天的租金整栋出租，回本要 33–41 年，而它的地交付时只剩 40 年。
- **结尾**：福田的亿元楼一栋栋亮起，人从地铁口走进这栋楼，"它赌的，是你会来"，片名翻成"世界的形状"。

按 `STYLE.md` 做：Remotion 管线、系列配色和字体、左上品牌角标、来源 → 制作 → 品牌的固定片尾。

- 调研：`research.md`（结论和故事草案）、`research/`（带链接的原始笔记，06 是地图与规划数字，§12 是最后一轮核实）。
- 剧本：`SCRIPT.md`（v3，含口径取舍）。
- 发布文案和来源：`DESCRIPTION.md`。
- 地图数据：`data/`（见 `data/README.md`）和 `src/geo/`（片子实际读的压缩图层）。

## 配乐

《千年之后（氛围版）》，和乐府，3:01，取自 <https://music.01mvp.com/>（和 `films/ai-real-cost` 同一首）。音频不进 Git，渲染前先下载：

```bash
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
```

拍点沿用 `films/ai-real-cost` 的测量：111.62 BPM，第一拍 0.487 s。片子从曲子第 2 小节放到结尾，中间不剪（`src/timing.ts`），片中第 b 小节 = 曲子第 b + 2 小节：片名在曲子第 8 小节（主段进来），那一个发现在第 48 小节（最大的一次重进），升华在高潮段，品牌卡在收尾。整体压低 2 dB（`Film.tsx` 的 `GAIN`），成片约 −11.9 LUFS、真峰值 −1.0 dBTP。

频谱条和背景脉动：`python tools/spectrum.py <单声道 wav> src/audio.json`（按曲子原始帧，`musicFrame` 换算）。

## 地图

画面里的地图每帧按同一台相机投影（`src/geo/cam.ts`，带 van Wijk 平滑缩放），所以从珠三角到一栋楼是一个连续的镜头。

- 海岸线、区界、道路、地铁、建筑轮廓：© OpenStreetMap contributors（ODbL）。片子用的是派生的压缩图层，见 `src/geo/world.json`、`src/geo/city.json`。
- 塔楼高度和竣工年：CTBUH Skyscraper Center（经 `data/` 里的配对）。
- 没有用 DataV / 高德的数据（它的条款写"仅供学习和交流使用"）。

重新生成：

```bash
bash tools/fetch-geo.sh          # Overpass 下载到 /tmp/towerv2-raw（10–20 分钟），并生成珠三角海岸线
node tools/geo-prep.mjs          # → src/geo/world.json、src/geo/city.json
```

能源大厦的三个 OSM 轮廓是 way 776897365（北塔）、776897366（南塔）、776897367（中间裙楼）；画面上的楼高、层数用 CTBUH（北塔 218 米 / 地上 43 层，南塔 111.3 米 / 地上 20 层），表皮的折线和"涟漪"按设计院项目页的描述画，楼层之间平均分，是画法上的假设。

## 重新生成

```bash
npm ci
npm run studio                       # 预览，选 Film
npx remotion render Film out/tower-v2.mp4 --crf=20 --audio-bitrate=192k
node tools/covers.mjs                # 封面 → out/covers/cover-16x9.jpg、cover-3x4.jpg
SCALE=1 node tools/stills.mjs out/s 0 2369   # 指定帧的审片截图（默认半分辨率）
node tools/readtime.mjs              # 读字审计
```

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。标志 `public/mark-disc.png` 是 `public/assets/brand/kit/mark-512.png` 按圆形裁出透明边，球体本身没有改色。

## 结构

| 片中小节 | 场景 | 唯一的结论 |
|---|---|---|
| 0–2 | 结论 | 深圳的高楼，不是盖来收租的（第一帧就是整句，压在福田夜景上） |
| 2–6 | 证据 · 凭什么 | 同一个街道，写字楼的地比住宅便宜约 10 倍；凭什么？ |
| 6–8 | 片名 | 高楼的形状 · 世界的形状（珠三角） |
| 8–24 | 01 一块地 | 深圳 1,997 平方公里，一半划进生态控制线；一年只给 10 公顷商服用地；中心区先画好图；宗地 B119-0053 和容积率 15；谁能买；城市卖的不是地，是以后的税 |
| 24–34 | 02 十年 | BIG 的双塔和折线表皮；审批 25 个工作日，拿地到交付 10 年零 2 个月；地只占预算不到四分之一 |
| 34–46 | 03 等人来 | 全城都在盖（200 米以上全球第一）；约每 4 间空 1 间；租金跌一半；这栋楼五年不涨；公道话 22 年 |
| 46–51 | 那一个发现 | 回本 33–41 年 vs 地交付时只剩 40 年（配乐最大的一次重进） |
| 51–62 | 图什么 | 它自己的总部；半数新项目是企业自建总部；城市等的不是租金 |
| 62–74 | 升华 | 亿元楼超 50 → 86 → 159；人走进这栋楼；它赌的，是你会来 |
| 74–82 | 片尾 | 来源 → 制作 → 品牌卡 |

v1（原创配乐、深色卡片，`out/tower.mp4`）的剧本和代码在 Git 历史里。
