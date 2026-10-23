# AI 的真实价格（v7）

2:20、1920×1080、30fps 的中文知识片，无旁白。论点：最聪明的 AI（Claude Opus 5.5），对包月用满的人来说反而最便宜；账要分三层算：单价、用量、你的时间。v7 把"你的时间"从 v6 升华里的一句话，做成了全片最长的一章和高潮：两张账单上，紫色的"你的时间"那一行比 token 那一行长得多。

- 剧本、数据口径、逐场时间表、和 v6 的差别：`SCRIPT.md`。发布文案和全部来源：`DESCRIPTION.md`。
- 调研：`research/`。v7 的复核（2026-10-22）和"你的时间"一章的数在 `research/07-v7-time-and-recheck.md`。
- 画面用 [Remotion](https://www.remotion.dev/)（React）逐帧生成。所有关键帧都是片中秒数，取自 `src/timing.ts` 的音乐网格，声音表 `src/sound.ts` 用同一组时间。

## 配乐和声音

都来自自己的曲库 <https://music.shapeof.world/>，不进 Git，渲染前下载到 `public/lib/`：

```bash
mkdir -p public/lib && cd public/lib
B=https://music-cdn.shapeof.world/tracks
curl -A curl/8 -LO $B/scene-chamber-40/v1/master.mp3 && mv master.mp3 scene-chamber-40.mp3
curl -A curl/8 -LO $B/scene-soul-90/v1/master.mp3 && mv master.mp3 scene-soul-90.mp3
for s in sfx-foley-01 sfx-foley-02 sfx-foley-08 sfx-game-01 sfx-impact-01 sfx-impact-03 sfx-impact-05 sfx-impact-06 \
         sfx-impact-08 sfx-impact-11 sfx-mechanical-01 sfx-mechanical-02 sfx-mechanical-13 sfx-notification-02 \
         sfx-notification-18 sfx-transition-02 sfx-transition-18 sfx-ui-01 sfx-ui-10 ambience-room-01; do
  curl -A curl/8 -L -o $s.wav $B/$s/v1/master.wav
done
cd ../.. && python tools/tune_sfx.py public/lib public/lib/tuned sfx-impact-03 sfx-impact-05 sfx-impact-06 sfx-impact-11 sfx-game-01 sfx-notification-02 sfx-notification-18 sfx-ui-10
```

- **A 曲**《小小发明 · 40》（`scene-chamber-40`，可商用）：实测 115.00 BPM，第一拍 0.114 s，F 大调，相位不漂。0:00–0:58，片名落在第 4 小节整段进来，"还漏了最贵的一行"落在第 27 小节第 3 拍的收尾重音。
- **安静一**（0:58–1:00）：只有时钟，按 B 曲的拍子走，替 B 曲先把速度立起来。
- **B 曲**《温暖电路 · 90》（`scene-soul-90`，可商用）：实测 100.37 BPM，第一拍 0.131 s，F 大调，从片中 60.000 s 放起。第 4 小节整段进来；第 15 小节整小节静音（安静二）；第 16 小节全曲最强的一拍上，两张账单打出。第 24 小节以后是没有稳定拍点的长和弦，画面跟实测的和弦起音走（`CHORD`）。
- 有音高的音效移到 F 大调三和弦上（`tools/tune_sfx.py`）。
- 曲库标的 bpm 不用。速度和第一拍用 `tools/beats.py` 测；`tools/downbeats.py` 查每小节强拍的实测起音（误差都在 1 帧内）；`tools/onsets.py` 找 B 曲长和弦段的起音，写进 `src/timing.ts` 的 `CHORD`。

## 重新生成

```bash
npm ci
node tools/audit.mjs                       # 每行字的读字时间和"第一个字落在拍上"
bash tools/render.sh out/ai-real-cost-v7.mp4   # 等其他 remotion render 结束 → 渲染 → 两遍 loudnorm（约 −12 LUFS，−2 dBTP）
bash tools/review.sh out/ai-real-cost-v7.mp4 out/review   # 每秒一帧的总览图、黑帧、响度
node tools/covers.mjs out/covers           # 横竖两张封面 + 360/260 px 小图
node tools/stills.mjs out/s 12.5 99.2      # 指定秒数的半分辨率截图
```

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，渲染需要联网。

## 结构

| 时间 | 章 | 一句结论 |
|---|---|---|
| 0:00 | 开场 | 按单价，最聪明的 AI 贵 17 倍。真的最贵吗？ |
| 0:08 | 片名 | AI 的真实价格（打在小票上） |
| 0:13 | 包月 | 付 1 份钱，用掉 36 份；平摊下来 ¥3.7 ≈ DeepSeek 闲时价 |
| 0:29 | 用量 | 同一套考题 4 行对 33 行：单价更贵，总价反而更低 |
| 0:46 | 公式 | 真实价格 = 单价 × 用量 ÷ 包月；第四行打不出来 |
| 0:58 | 你的时间 | 只有 1 成的人敢直接用 → 查一次 5 分钟 → 100 个任务查 162 次对 216 次 → 多盯 4.5 小时 → 1 小时 ¥119 → 账单上最贵的一行是你的时间，算上它 Opus 便宜 ¥400 |
| 1:58 | 升华 | 最聪明的 AI，反而最便宜；token 会越来越多，唯一不会变多的，是你的时间 |
| 2:12 | 片尾卡 | "AI 的真实价格"翻成"世界的形状"，圆形的球，MakerJackie |

v7 从 v6 删掉的：中转站一段、ChatGPT Pro 对比、"说句公道话"标签段、频谱条、进度条、章节标签、白闪、片尾的口号/网址/来源说明。
