# 高楼的形状

约 2:19、1920×1080、30fps 的中文数据片，无旁白。

- **论点**：深圳的高楼，不是盖来收租的。
- **主线**：跟着深圳能源大厦（福田，218 米，41 层），从 2008 年的一块空地走到今天。
- **那一个发现**：按今天的租金整栋出租，回本要 33–41 年，而它的地交付时只剩 40 年。
- **结尾**：落在"你每天走进去的那栋楼，是一座城市十年前下的注"，片名翻成"世界的形状"。

按 `STYLE.md` 做：Remotion 管线、系列配色和字体、左上品牌角标、来源 → 制作 → 品牌的固定片尾。

- 调研：`research.md`（结论和故事草案）、`research/`（带链接的原始笔记）。
- 剧本：`SCRIPT.md`（v2，含评审取舍）。
- 发布文案和来源：`DESCRIPTION.md`。

## 配乐

原创，代码生成：`music/score.js` 用 Web Audio 的 OfflineAudioContext 合成，不用采样。

- **音色**：引擎和《房子的形状》（`films/house/music/score.js`）是同一套，鼓、钢琴、风琴贝斯、铺底和音效都一样。
- **和声**：D 小调，Dm9 – B♭maj9 – Fmaj9 – Cadd9。
- **速度**：120 BPM，一小节 2 秒，第 0 小节从 0.5 秒开始。
- **段落**：和 `src/scenes.ts` 的小节表对齐。
- **音频标志**：片尾的音频标志（`logo`）是一个 D 大调的上行钟声琶音，可以给系列复用。

渲染后的 WAV 不进 Git。重新生成：

```bash
node tools/render-music.mjs          # → music/score-raw.wav、public/score.wav（约 −12 LUFS，真峰值 −1.5 dBTP）
python tools/spectrum.py public/score.wav src/audio.json   # 底部频谱条和背景脉动
```

`render-music.mjs` 用仓库根目录的 Playwright 驱动系统自带的 Edge，ffmpeg 用 Remotion 自带的那份。合成要十几到几十分钟。

## 重新生成

```bash
npm ci
npm run studio                       # 预览，选 Film
npm run render                       # 成片 → out/tower.mp4
node tools/covers.mjs                # 封面 → out/covers/cover-16x9.jpg、cover-3x4.jpg
node tools/stills.mjs out/s 225 2865 # 指定帧的审片截图（半分辨率）
node tools/readtime.mjs              # 读字审计
```

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。标志 `public/mark-disc.png` 是 `public/assets/brand/kit/mark-512.png` 按圆形裁出透明边，球体本身没有改色。

## 结构

| 小节 | 场景 | 唯一的结论 |
|---|---|---|
| 0–2 | 结论 | 深圳的高楼，不是盖来收租的（第一帧就是整句，第一拍砸下） |
| 2–4 | 证据 | 同一个街道，写字楼的地比住宅便宜 10 倍 |
| 4–6 | 凭什么 | 凭什么差 10 倍？盖楼的人图什么？ |
| 6–8 | 片名 | 高楼的形状 · 世界的形状 |
| 8–21 | 01 谁在决定 | 城市先画图，带着条件卖地：卖的不是地，是以后的税 |
| 21–32 | 02 十年 | 审批 25 个工作日，从拿地到交付 10 年零 2 个月；上百家单位 |
| 32–34 | 转折 | 楼盖好了，等人来（配乐全停） |
| 34–42 | 03 等人来 | 每 4 间空 1 间；租金跌一半；这栋楼五年不涨 |
| 42–46 | 公道话 | 按 2018 年的租金 22 年就回本；可楼是十年前决定的 |
| 46–51 | 那一个发现 | 回本钟 33–41 年 vs 土地钟只剩 40 年（配乐最大的一次重进） |
| 51–63 | 升华 | 它的总部；城市图的不是租金；159 栋亿元楼；十年前下的注；它赌的，是你会来 |
| 63–69 | 片尾 | 来源 → 制作 → 品牌卡（音频标志） |
