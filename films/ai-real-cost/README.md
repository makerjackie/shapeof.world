# AI 的真实价格（v8）

1:55、1920×1080、30fps 的中文知识片，无旁白。论点：按单价，最聪明的 AI（Claude Opus 5.5）比 DeepSeek 贵 17 倍；可对包月用满的人，它反而最便宜。账要算三层：单价、用量、你的时间，其中你检查、返工的时间占账单的 8 到 9 成。这个结论只属于今天：同样聪明的 AI 每年便宜约 13 倍、用量暴涨，谁最便宜会换，账单上最贵的一行不会换。

- v8 回到已发布的 v6 的画风和开场，修节奏、把"你的时间"讲清楚、加未来展望（见 `SCRIPT.md` 开头）。v6 和 v7 在 Git 历史里（v6：4161dec；v7：5f8fc04）。
- 剧本、逐场时间表、数据口径：`SCRIPT.md`。发布文案和全部来源：`DESCRIPTION.md`。调研：`research/`（v7 复核在 `07`，v8 新加的两条数在 `SCRIPT.md` 的数据表里）。
- 画面用 [Remotion](https://www.remotion.dev/)（React）逐帧生成。每一场从哪一小节开始写在 `src/scenes.ts` 的 `AT`，场景里的时间是"本场第几拍"；音效表 `src/sound.ts` 用同一张表。

## 配乐和声音

配乐《千年之后（氛围版）》，和乐府，3:01，取自 <https://music.01mvp.com/>（"抖音授权：收藏者声明"，可商用与否未单独核实）。音效和环境声来自自己的曲库 <https://music.shapeof.world/>（CC0）。音频都不进 Git，渲染前下载：

```bash
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
mkdir -p public/lib && cd public/lib
B=https://music-cdn.shapeof.world/tracks
for s in sfx-foley-01 sfx-foley-02 sfx-foley-08 sfx-game-01 sfx-impact-01 sfx-impact-03 sfx-impact-05 sfx-impact-06 \
         sfx-impact-08 sfx-impact-11 sfx-mechanical-01 sfx-mechanical-13 sfx-notification-02 sfx-notification-18 \
         sfx-transition-02 sfx-transition-18 sfx-ui-01 sfx-ui-10 ambience-room-01; do
  curl -A curl/8 -L -o $s.wav $B/$s/v1/master.wav
done
cd ../.. && python tools/tune_sfx.py public/lib public/lib/tuned sfx-impact-03 sfx-impact-05 sfx-impact-06 sfx-impact-11 sfx-game-01 sfx-notification-02 sfx-notification-18 sfx-ui-10
```

- 拍点：111.62 BPM，第一拍 0.512 s（`tools/beats.py`、`tools/downbeats.py`）。曲子段落：前奏 0–8，主段 8–40，间奏 40–48，主段 48–64，高潮 64–77，收尾 78–84。
- 只在小节线上剪，速度不变（`MUSIC_EDIT`）：片中 0–18 = 曲子 2–20；18–34 = 40–56；34– = 64–84。跳点的色度相似度 0.990、0.998（`tools/chroma.py`）。
- 两处安静：片中第 17、33 小节整小节静音（`MUTE`），只留时钟和房间底噪。
- 有音高的音效移到 F、A、C 上（`tools/tune_sfx.py`）。片尾卡不加音效。
- 背景光团随曲子的低频起伏：`src/audio.json` 由 `tools/spectrum.py` 从曲子算出。

## 重新生成

```bash
npm ci
bash tools/render_master.sh ai-real-cost-v8   # 画面 + WAV → tools/tpmaster.py：−12 LUFS，Apple AAC 后真峰值 ≤ −1 dBTP
bash tools/review.sh out/ai-real-cost-v8.mp4 out/rv8   # 每秒一帧的总览图、黑帧、响度
node tools/stills.mjs out/s 12.5 99.2         # 指定秒数的半分辨率截图（SCALE=1 出全尺寸）
node tools/covers.mjs out/covers               # 封面
```

字体（Inter、Noto Sans SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，渲染需要联网。

## 结构

| 时间 | 章 | 一句结论 |
|---|---|---|
| 0:00 | 开场 | 全球最聪明的 AI，比 DeepSeek 还便宜：按单价贵 17 倍，包月用满反而最便宜 |
| 0:13 | 片名 | AI 的真实价格 |
| 0:16 | 包月 | 付 1 份钱，用掉 36 份；平摊下来约 ¥3.8 |
| 0:23 | 用量 | 同一套考试，单价贵 5 倍，总价反而更低 |
| 0:32 | 公式 | 单价 × 用量 ÷ 包月倍数，还漏了最贵的一项（安静一）：你的时间 |
| 0:41 | 你的时间 | 10 个人只有 1 个敢直接用 → 返工一轮再查一次 → 162 次对 216 次 → 13.5 对 18 小时 → 1 小时约 ¥119 |
| 1:08 | 账单 | 只看 token，DeepSeek 更省；（安静二）算上你的时间，你的时间占 8–9 成，Opus 便宜约 ¥400 |
| 1:21 | 今天的答案 | 最聪明的 AI，反而最便宜（前提：包月用满，算上你的时间） |
| 1:24 | 未来 | 每年便宜约 13 倍；中国日均 token 两年涨 1,000 多倍；谁最便宜会换 |
| 1:35 | 升华 | 不管谁最便宜，账单上只剩你的时间：AI 越便宜，你的时间越贵 |
| 1:42 | 落句 | token 会越来越多，唯一不会变多的，是你的时间 |
| 1:48 | 片尾卡 | "AI 的真实价格"翻成"世界的形状"，圆形的球，看见世界如何运行，MakerJackie |
