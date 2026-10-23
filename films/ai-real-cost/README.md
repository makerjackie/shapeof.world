# AI 的真实价格（v7）

2:54、1920×1080、30fps 的中文知识片，无旁白。论点：最聪明的 AI（Claude Opus 5.5），对包月用满的人来说反而最便宜；账要分三层算：单价、用量、你的时间。v7 把"你的时间"从 v6 升华里的一句话，做成了全片最长的一章和高潮（约 95 秒）：两张账单上，紫色的"你的时间"那一行比 token 那一行长得多。

- 剧本、数据口径、逐场时间表、和 v6 的差别：`SCRIPT.md`。发布文案和全部来源：`DESCRIPTION.md`。
- 调研：`research/`。v7 的复核（2026-10-22）和"你的时间"一章的数在 `research/07-v7-time-and-recheck.md`。
- 画面用 [Remotion](https://www.remotion.dev/)（React）逐帧生成。所有关键帧都是片中秒数，取自 `src/timing.ts` 的小节网格（`FB(小节)`），声音表 `src/sound.ts` 用同一组时间。

## 配乐和声音

配乐《千年之后（氛围版）》，和乐府，3:01，取自 <https://music.01mvp.com/>（"抖音授权：收藏者声明"，可商用与否未单独核实）。音效和环境声来自自己的曲库 <https://music.shapeof.world/>（CC0）。音频都不进 Git，渲染前下载：

```bash
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
mkdir -p public/lib && cd public/lib
B=https://music-cdn.shapeof.world/tracks
for s in sfx-foley-01 sfx-foley-02 sfx-foley-08 sfx-game-01 sfx-impact-01 sfx-impact-03 sfx-impact-05 sfx-impact-06          sfx-impact-08 sfx-impact-11 sfx-mechanical-01 sfx-mechanical-02 sfx-mechanical-13 sfx-notification-02          sfx-notification-18 sfx-transition-02 sfx-transition-18 sfx-ui-01 sfx-ui-10 ambience-room-01; do
  curl -A curl/8 -L -o $s.wav $B/$s/v1/master.wav
done
cd ../.. && python tools/tune_sfx.py public/lib public/lib/tuned sfx-impact-03 sfx-impact-05 sfx-impact-06 sfx-impact-11 sfx-game-01 sfx-notification-02 sfx-notification-18 sfx-ui-10
```

- 拍点：实测 111.62 BPM，第一拍 0.512 s（`tools/beats.py`；v6 记的 0.487 s 比每个强拍的实测起音早 20–35 ms，`tools/downbeats.py` 按 0.512 核对，都在 ±1 帧内）。调性 F 大调。曲子段落：前奏 0–8，主段 8–40（16–40 是同一个 8 小节循环三遍，色度相似度 1.000），间奏 40–48，主段 48–64，高潮 64–77，收尾 78–84。
- 只在小节线上剪，速度不变（`MUSIC_EDIT`）：片中 0–28 = 曲子 4–32；28–52 = 40–64；52–80 = 56–84（第 64 小节后跳回 56 多放 8 小节）。两处跳点前那一小节和曲子里原本接在目标前面的那一小节，色度相似度 0.999 和 0.997（`tools/chroma.py`）。片中第 60 小节 = 曲子第 64 小节，高潮进来，账单打出。
- 两处安静：片中第 27、59 小节整小节静音（`MUTE`），只留时钟和房间底噪。
- 有音高的音效移到 F、A、C 上（`tools/tune_sfx.py`）。片尾卡不加任何音效，由曲子淡出收尾。

## 重新生成

```bash
npm ci
node tools/audit.mjs                       # 每行字的读字时间和"第一个字落在拍上"
bash tools/render.sh out/ai-real-cost-v7.mp4   # 等其他 remotion render 结束 → 渲染 → 两遍 loudnorm（约 −12 LUFS）+ 192 kHz 上 −3 dBFS 限幅
bash tools/review.sh out/ai-real-cost-v7.mp4 out/review   # 每秒一帧的总览图、黑帧、响度
node tools/covers.mjs out/covers           # 横竖两张封面 + 360/260 px 小图
node tools/stills.mjs out/s 12.5 99.2      # 指定秒数的半分辨率截图
```

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，渲染需要联网。

## 结构

| 时间 | 章 | 一句结论 |
|---|---|---|
| 0:00 | 开场 | 按单价，最聪明的 AI 贵 17 倍。真的最贵吗？ |
| 0:09 | 片名 | AI 的真实价格（打在小票上，主段进来） |
| 0:13 | 包月 | 付 1 份钱，用掉 36 份；平摊下来 ¥3.7 ≈ DeepSeek 闲时价 |
| 0:30 | 用量 | 同一套考题 4 行对 33 行：单价更贵，总价反而更低 |
| 0:47 | 公式 | 真实价格 = 单价 × 用量 ÷ 包月；第四行打不出来（安静一） |
| 1:00 | 你的时间 | 差一点就对 → 只有 1 成敢直接用 → 查一次 5 分钟 → 162 次对 216 次 → 多盯 4.5 小时 → 机器慢，但那不是你的时间 → 1 小时 ¥119（安静二）→ 账单：你的时间占 8–9 成，算上它 Opus 便宜 ¥400 → 让 AI 自己动手的活，差一倍 |
| 2:35 | 升华 | 最聪明的 AI，反而最便宜；token 会越来越多，唯一不会变多的，是你的时间 |
| 2:47 | 片尾卡 | "AI 的真实价格"翻成"世界的形状"，圆形的球，MakerJackie |

v7 从 v6 删掉的：中转站一段、ChatGPT Pro 对比、"说句公道话"标签段、频谱条、进度条、章节标签、白闪、片尾的口号/网址/来源说明。
