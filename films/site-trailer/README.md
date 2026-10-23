# 世界的形状 · 网站预告片

约 29 秒、1920×1080、30 fps，无旁白。网站 shapeof.world 上的世界录屏，按原创配乐的拍子快切：星空、流体、星系、日食、地球，再到吸引子、三体、分形、水墨、果蝇大脑、神经网络，中间一拍 3×3 全景格，最后停在黑洞上，落一句"这些都不是视频 / 每个世界，都能亲手玩"，片名"可以玩的世界"翻成"世界的形状"。

- 剪辑表：`src/edl.ts`（每个镜头的拍点、入点、速度、推镜、标签）。
- 合成：`src/Film.tsx`（成片）、`src/Loop.tsx`（首页静音循环）。
- 配乐：`music/score.js`，原创，代码合成。
- 录屏工具和镜头清单：`tools/capture.mjs`、`shots.json`、`shots-fixes-*.json`（v1）、`shots-v2.json`（v2 重拍）。
- 选机位：`tools/probe.mjs` 实时打开世界、按步骤点按钮、截图，先看截图再决定录什么。

## 素材

录屏不进 Git，放在媒体目录：

```
/Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer/
  footage/<id>.mp4   1920×1080 60 fps，每段 5–6 秒
  out/               成片、循环、海报、总览图
  index.html         审片页
```

`public/footage` 是指向 `footage/` 的软链接（已在 `.gitignore` 里）。换一台机器先重建它：

```bash
ln -sfn /path/to/shapeof.world-reports/site-trailer/footage public/footage
```

## v2：换镜头

v2 节奏、拍点、结构、HUD、片尾全部沿用 v1，只换镜头。负责人审 v1 时指出很多镜头太近、角度怪、发糊（1080p 素材被放大 1.3–1.45 倍）或世界本身弱。v2 的做法：

- 先用 `tools/probe.mjs` 在线上站点截图比较模式、机位、预设，挑全景、完整、颜色足的那一帧，再录。
- 新录的镜头一律 `ss: 2`（日食钻石环用 `ss: 3`）：按 2 倍或 3 倍像素渲染，lanczos 缩到 1920×1080。素材仍是 1080p，只是更清晰，没有多余分辨率可放大。要近景就在录制时用 `crop` 裁（在高倍画面上裁，裁完仍是原生清晰度），剪辑里的推镜一律不超过 1.1 倍。v1 里果蝇和人体在剪辑里放大了 1.3–1.45 倍，v2 退回 1.06 倍：原画面里没有界面，整只果蝇连着脑、整个人体都在画面里。
- 渲染：Mac 是共用的，`npm run render` 用 `--concurrency=2`，避免和别的渲染一起把机器压垮。
- `init`（`shots-v2.json` 的 fluid-swirl）：页面脚本运行前注入的 JS。这里用来把咖啡杯着色器里"勺子圈"的 uniform 透明度置零，画面里就没有光标圈。
- 交付：`npm run render`、`npm run render:loop`、`npm run finish` 现在输出 `out/site-trailer-v2*.mp4` 和 `poster-v2.jpg`，v1 文件保留不动。

## 配乐

A 小调，900/7 ≈ 128.6 BPM：一拍正好 14 帧，一小节 56 帧，第 0 小节从第 0 帧开始，所以剪辑表直接用拍数，不用测拍。引擎（鼓、钢琴、风琴贝斯、铺底、音效）沿用 `films/indie-dev/music/score.js`，这里加了锯齿波琶音、反向镲和落在 A 上的音频标志。

| 小节 | 段落 | 画面 |
|---|---|---|
| 0–3 | hook：四拍底鼓，琶音一小节比一小节亮 | 每 2 拍一个镜头：漩涡 → 漩涡 → 螺旋 → 星系，环 → 球 → 球 → 圆的火焰 |
| 4–7 | drop：主旋律进来 | 每拍一个镜头（线和丝），第 6 小节水墨山水慢放后加速，第 7 小节生命和机器 |
| 8 | grid：只留和弦和琶音，九下 tick | 3×3 全景格从中间往外弹出，最后一拍推进中间那格 |
| 9 | drop | 从格子里出来的航线图，再接冷锋、双彩虹 |
| 10 | build：鼓点收紧、上升音 | 八分音符快切，收在日冕的环上；最后一拍全黑、完全无声 |
| 11–12 | anthem | 黑洞（0.6 倍慢放，慢推），两句收尾的话 |
| 13–15 | tail：音频标志 | 品牌卡：片名翻成"世界的形状"，标志、口号、网址、MakerJackie |

渲染后的 WAV 不进 Git。重新生成（Playwright 用主仓库的；在别处用 `PW_FROM=/path/to/checkout/package.json`）：

```bash
node tools/render-music.mjs   # → music/score-raw.wav、public/score.wav（−12.5 LUFS、线性归一）
```

## 重新生成

```bash
npm ci
npm run studio      # 预览
npm run render      # 成片 → 媒体目录 out/site-trailer-raw.mp4（CRF 12 中间文件，--concurrency=2）
npm run render:loop # 首页循环 → out/site-trailer-loop-raw.mp4
npm run finish      # 交付编码：成片 CRF 20 + AAC 192k + faststart，循环两遍编码 ≤3 MB，海报；顺便量响度和真峰值
```

`tools/finish.sh` 在成片 MP4 上量响度和真峰值（要求真峰值 ≤ −1 dBTP）。Remotion 用 JPEG 帧时输出是全范围 yuvj420p，所以中间文件用 CRF 12，交付时再转成 TV 范围的 yuv420p。Mac 上同时只跑一个 `remotion render`，开渲前 `pgrep -fl "remotion render"`。

## 技术说明

- 每个镜头的源时间由 `srcTime()` 算出（含变速），用 `<Freeze frame={1}>` 包住 `OffthreadVideo`、把 `playbackRate` 设成 `t × fps`，Remotion 就会取第 t 秒那一帧。这样变速和任意入点都精确到帧。
- 字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。
- 片尾按负责人转达的要求放了口号和网址，和 `AGENTS.md`、`films/DIRECTOR.md` 第八节"片尾不放口号、网址"不同：这是网站预告片，网址就是目的。
