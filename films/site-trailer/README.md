# 世界的形状 · 网站预告片

约 33 秒、1920×1080、30 fps，无旁白。先是一台电脑上的 shapeof.world 首页，光标点开《星月夜》，镜头推进屏幕；接着按原创配乐的拍子快切网站上的世界：星空、流体、鸟群、星系、日食、极光、火焰，再到蝴蝶、光子、三体、山谷、分形、水墨、果蝇、森林，中间一拍 3×3 全景格；最后黑洞从全屏拉回到那台电脑里，落一句"这些都不是视频 / 每个世界，都能亲手玩"，片名"一个可以亲手玩的科学宇宙"翻成"世界的形状"。

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

## v4：真 3D 电脑和四个新镜头

- 电脑换成真 3D（`Laptop3D.tsx`，@remotion/three + react-three-fiber）。模型是在代码里用 three.js 基本几何体搭的（铝合金机身、一颗颗键帽、触控板、转轴、黑玻璃边框），没有下载第三方模型，所以没有模型授权问题，也没有任何品牌标志。灯光：Poly Haven 的 HDRI「Studio Small 08」（CC0，作者 Sergej Majboroda，`public/hdri/`），加一盏暖色主光、一盏暖色补光和一盏冷色轮廓光；暗色地面加接触阴影。
- 屏幕不是贴图：浏览器栏和 16:9 网页是一层 DOM，用 CSS 单应矩阵（homography）贴到屏幕四个角在画面上的投影位置。这样 4K 录屏始终清楚，镜头正对屏幕时网页正好铺满 1920×1080，推进和回拉都不用剪。`fullPose()` 就是这个机位。
- 开头（`Story3D.tsx` 的 `Intro3D`）：一开始就很近，略高，看得到键盘；光标更大（`cursor: 2.2`），第 1.0 秒点下《星月夜》卡片，第 100 帧推到正对全屏，第 0 小节重拍时已经是快剪第一镜。首页录屏用 `clockTime` 把页面时钟固定在首页推荐《星月夜》的那一天。
- 结尾（`Bookend3D`）：同一台 3D 电脑，从全屏黑洞拉回到四分之三侧面，电脑停在右边。
- 四个新镜头（`shots-v4.json`）：水墨山水那一格换成标准模型的尺度之旅（你站在秤上 → 手指 → 原子 → 原子核 → 质子 → 夸克，`sm-dive`；用 `init` 先拦住页面的 requestAnimationFrame，录制第一帧才放行，让 5.2 秒的镜头从头开始）；雨水刻山谷换成夜间航运图（`trade-night`）；尤克里里换成 17 种基本粒子的博物馆墙（`sm-museum`）；双彩虹换成从 45° 斜侧（观察者、影子方向、42° 圆锥线）转到观察者身后、彩色双虹出现的一镜（`rainbow-swing`）。
- 录制工具新增：`clockTime`（页面时钟起点）、`cursor` 可设大小；shot 的 `init` 现在在假时钟之后注入，可以包住它的 requestAnimationFrame。
- 渲染时把 `TMPDIR` 指到 DevSSD（Mac 系统盘只剩约 3 GB，Remotion 打包和 Chrome 缓存会写满它）。
- 交付：`out/site-trailer-v4*.mp4`、`poster-v4.jpg`、`contact-v4.jpg`，v1–v3 保留。

## v3：开头的电脑和结尾的回拉

v3 保留 v2 的整段快剪，只在前后各加一段，让人一眼看懂这是一个网站：

- 开头两小节（`Story.tsx` 的 `Intro`）：一台用 CSS 画的通用笔记本（v4 起换成 3D，见上），屏幕里是真实的 shapeof.world 首页（`home-cursor`），光标滑到《星月夜》卡片上按下，卡片展开铺满网页，镜头推进屏幕，最后一帧正好等于快剪第一镜。网页区域是 16:9，推到 `FULL` 倍时正好铺满 1920×1080，所以推进不需要剪切。
- 结尾（`Bookend`）：黑洞从全屏开始，在"这些都不是视频"时拉回，露出它正在同一台电脑的浏览器里运行，光标在拖动黑洞（`bh-drag`）。
- 这两段屏幕录像用 `native: true` 保留 3840×2160，推拉时放大也清楚；`cursor: true` 在页面里画一个可见的光标（截图里没有系统光标）；首页用 `chrome: true` 保留网站自己的界面。镜头见 `shots-v3.json`。
- 配乐前面多了两小节（`score.js` 的 `T0 = 2 * BAR`）：轻的脉冲、闭合的琶音、铺底慢慢打开，光标按下时一声 tick，然后上升音接到原来第 0 小节的重拍。剪辑表的拍数仍从第 0 小节算，导出时统一加 `INTRO`。
- 品牌卡第一句改成"一个可以亲手玩的科学宇宙 / A PLAYABLE UNIVERSE OF SCIENCE"，再翻成"世界的形状"。
- 交付：`out/site-trailer-v3*.mp4`、`poster-v3.jpg`，v1、v2 保留。

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
