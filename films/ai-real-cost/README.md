# AI 的真实价格（v5.1）

约 2 分 58 秒、1920×1080、30fps 的中文数据片，无旁白。论点：全球最聪明的 AI（Claude Opus 5.5），对包月用满的人来说比 DeepSeek 还便宜；最后升华到"最贵的 token 是你的时间"，结尾由片名"AI 的真实价格"翻成"世界的形状"。

- 画面用 [Remotion](https://www.remotion.dev/)（React）逐帧生成，和 `house/`、`ai-shape/` 的 canvas 管线不同。
- 发布文案与全部来源：`DESCRIPTION.md`。调研笔记：`research/`（截至 2026-10-21，含复核与更正）。
- 屏幕上的订阅数字在 `src/data.ts`，其余数字写在各场景里，来源都标在画面底部。
- 结尾的标志图形：`public/mark-512.png`，取自 `public/assets/brand/kit/`，未改动。

## 配乐

《千年之后（氛围版）》，和乐府，3:01，取自 <https://music.01mvp.com/>。音频不进 Git，渲染前先下载：

```bash
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
```

拍点用 `tools/beats.py` 测得：稳定 111.62 BPM，第一拍 0.487 s，三分钟内相位漂移不超过 ±10 ms（`src/timing.ts`）。小节能量：前奏 0–8，主段 8–40，间奏 40–48，主段 48–64，高潮 64–76，收尾 76 以后。

## 重新生成

```bash
npm install
npm run studio                 # 预览，选 Film
npm run render                 # 成片 → out/ai-real-cost.mp4
node tools/covers.mjs          # 封面 → out/covers/cover-<A|B>-<4x3|16x9>.jpg
node tools/stills.mjs out/s 1200 3176   # 指定帧的审片截图（半分辨率）
```

字体（Inter、Noto Sans SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时从 Google Fonts 加载，渲染需要联网。

工具（Python 需要 numpy、scipy、Pillow）：
- `tools/beats.py <mono.wav> <out.json>`：节拍、分窗速度检查、每小节能量。
- `tools/spectrum.py <mono.wav> src/audio.json`：每帧 16 段频谱，驱动底部频谱条和背景亮度。
- `tools/sheet.py <截图目录> <输出目录>`：2×2 拼审片图。

## 结构

| 小节 | 场景 | 唯一的结论 |
|---|---|---|
| 0–2 | 开场 | 全球最聪明的 AI，比 DeepSeek 还便宜 |
| 2–6 | 价格榜 | 按单价贵 17 倍 → 包月用满 $20 → $0.56 |
| 6–10 | 凭什么 · 片名 | ① 包月 ② 省 token；AI 的真实价格 |
| 10–30 | 01 包月 | 大多数人包月；$200 用掉 $7,121（36 倍）；同价比 ChatGPT 多 3–5 倍；单价 $0.56；中转站反而贵 7.5 倍 |
| 30–36 | 02 省 token | 同一套考试：Opus 4 行小票 $860，V4 Pro 33 行 $1,122 |
| 36–44 | 公道话 | V4.1 Flash 是真便宜；DeepSeek 不亏本（545%） |
| 44–52 | 叠在一起 | Opus 每题 $1.34 ÷ 36 = $0.04 < $0.26，落在小节 48 音乐回来的那一拍 |
| 52–56 | 公式 | 真实价格 = 单价 × 用量 ÷ 包月倍数 |
| 56–72 | 升华 | 漏了最贵的一项：你的时间（87%）；AI 每年便宜 13 倍，用量两年 ×330；唯一不会变多的，是你的时间 |
| 72–76 | 结论 | 最聪明的 AI，就是最便宜的 AI |
| 76–82 | 片尾 | "AI 的真实价格"翻成"世界的形状"，标志、看见世界如何运行、shapeof.world、MakerJackie |

## 发布

- 上传用文件：1920×1080、30fps、约 90 MB（`out/ai-real-cost-v5.1-1080p.mp4`，CRF 20）；发布套件 <https://press.shapeof.world/2026-10-21-ai-real-cost/>（`infra/press/kits/2026-10-21-ai-real-cost/kit.json`）。
- v5.1：图表场景的年份改用 HTML 标签。居中对齐的 SVG 文字和图上的 CSS `filter` 在多标签页渲染时会逐帧漂移，单帧截图看不出来，要抽成片的帧检查。
