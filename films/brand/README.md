# 品牌骨架、画风样帧和声音

2026-10-23 的提案，等用户选。做片的规矩见 [`../DIRECTOR.md`](../DIRECTOR.md)，这里放它引用的具体值、三张风格帧、《AI 到底改变了什么》的开头方案和声音清单。

## 一、品牌骨架：每部片都一样

画风每部换，下面这些不换。三张风格帧上叠的就是这一层，可以对照着看。

| 部件 | 规定 |
|---|---|
| 角标 | 左上，距左 48 px、距顶 38 px：球（46 px）+"世界的形状"（Noto Serif SC SemiBold 28 px，字距 0.08 em）+ 一道竖线 + 章节词（Noto Sans SC 22 px，可省）。整体 80% 不透明；浅色画面用墨色，深色画面用纸白 |
| 叙述字幕 | 纸色 `#f1ecdf` 纸条，墨色 `#19231f` Noto Serif SC Bold 60 px，左边 8 px 墨色竖边，轻投影；固定在左下（距左 96 px、距底 148 px）。纸条从左划出，字逐个打出 |
| 关键词 | 品牌金 `#ffd166` 荧光笔，压在字的下半部（38% 高），打完后的下一拍刷上 |
| 数字 | Inter，等宽数字；字重随画风（小岛用 700，实物化用 250–300） |
| 来源小字 | Noto Sans SC 19 px，60% 不透明，纸条下方；完整来源进简介 |
| 颜色 | 纸 `#f1ecdf`、墨 `#19231f`、品牌金 `#ffd166`（只给关键词和"那一个发现"）；涨跌用语义红绿。底色跟画风走 |
| 声音 | 音频标志 + 四个品牌音效，见 DIRECTOR 第七节和下文第四节 |
| 片尾卡 | 正中"世界的形状"（带球的组合标志），底部一行 MakerJackie，配音频标志，约 3 秒 |
| 不再有 | 频谱条、进度条、来源页、制作页、"说句公道话"标签、开场定格的结论句 |

为什么是纸条：它在亮的和暗的画面上都读得清，手机上一眼能认出来；和封面顶部的纸色品牌条是同一个东西，片子和封面连成一套。现在知识区常见的是黑体白字描边，纸条加衬线字更像"有人在讲故事"，容易被记住。

## 二、《AI 到底改变了什么》的三个画风方向

三张帧画的是同一个时刻：一套 32GB DDR5 内存条，2025 年中不到 100 美元，2026 年 10 月最低 449 美元（美国零售最低价，Tom's Hardware 价格追踪，见 `../ai-impact/research/03-memory-chips.md`）。调研里没有 2022 年的零售价，所以用的是 2025 年中对 2026 年 10 月。

![三张风格帧](frames/compare.jpg)

| | 帧 | 一句话 | 好在哪 | 代价 |
|---|---|---|---|---|
| A 移轴微缩（tilt-shift） | [`frames/a-tiltshift.jpg`](frames/a-tiltshift.jpg) | 真实的电脑城，从高处看成一张桌上的模型 | 有人群，有电影感；招牌镜头是清晰带一推落到一个人身上，时间加速后骤停 | 最贵：要做得像真的才不廉价；电网、工作这类抽象的东西不好拍 |
| B 低多边形小世界（lowpoly-island） | [`frames/b-lowpoly.jpg`](frames/b-lowpoly.jpg) | 四年里，AI 在一座小岛上长出了什么 | 整部片是一个会长的世界：数据中心、核电站、玩家的房间、第一份工作的门都在岛上；价格变成一摞摞硬币，每块落下都是一个音，正好卡拍。和"世界的形状"这个名字最贴 | 中等：几何体加平涂，渲染快，手机上好读；要防止"太可爱"压过严肃的话题 |
| C 数据实物化（data-physical） | [`frames/c-physical.jpg`](frames/c-physical.jpg) | 数字变成摸得到的东西 | 质感高级，每个数字都能"称一称"；讲钱和价格最有力 | 讲人和工作时弱；整部片都在桌面上，容易单调 |

**推荐 B，再借 C 的"一枚硬币 = 一个单位"。** 理由：

- 这部片要讲钱、芯片、电、工作四件事，B 能把它们放进同一个世界，一路长下去，最后拉远看整座岛，就是片名"世界的形状"。
- 硬币堆是 C 最好的一招，小岛上同样成立，而且比图表更直接：一摞 10 枚，一摞 45 枚，谁都看得懂。
- B 的声音最好做：每一块落地、每一枚硬币都是一个音，音乐网格和画面天然对齐。
- 制作成本可控，以后的数据片可以沿用这套小岛的做法，只换岛上的东西。

A 适合以后讲城市、交通、人群的题目；C 适合讲钱的单集（工资、房价、预算）。

## 三、开头方案（《AI 到底改变了什么》）

三个方案都按画风 B 写。时间是片中秒数；强拍按推荐配乐《形状咬合》（110 BPM，一小节约 2.18 秒）。

### 方案 1：价签暴涨（推荐）

- **0.0 s**：特写。小岛上一套绿色内存条立在一小摞金币上（10 枚），旁边一个穿黄卫衣的小人。最后一枚硬币正落下来，"叮"。
- **0.0–1.3 s**：硬币像下雨一样砸下来，一枚一个音，越来越密，那摞硬币把内存条往上顶；镜头跟着往上摇，硬币塔冲出画框。
- **约 2.2 s（第二小节的强拍）**：价签"啪"地翻到 **$449**（陶瓷轻敲 + 低沉撞击），小人往后退半步。
- **2–6 s**：纸条打出"一套内存条，一年多涨到了 449 美元。"镜头拉远，岛上别处也有塔在长：显卡、电费、英伟达。
- **封面**：AI 先改变的，不是你的工作。主图是小人仰头看硬币塔。
- **标题**：AI 来了四年，到底改变了什么？

为什么推荐：价格谁都懂；第一秒就有动作和声音；硬币堆是这个画风最拿手的一招；它也立住了全片的结构，先变的是东西的价钱，最后才轮到工作。

### 方案 2：毕业帽

- **0.0 s**：岛上一排穿学士服的小人，帽子同时抛起。
- **0.5–1.0 s**：帽子在最高点停一下，其中一顶飘走了。
- **1.0–2.2 s**：镜头跟着这顶帽子落到一扇门前，门"砰"地缩成一条缝（低沉撞击）。
- **2–6 s**：纸条打出"他们入学那年秋天，还没有 ChatGPT。"
- **封面**：AI 先关上的，是第一份工作的门。
- **标题**：AI 到底改变了什么？先换掉的是起点。

最有情绪，但一开头就交出了全片最强的发现，后半段的高潮会变弱；门的比喻也要先解释。

### 方案 3：四年长出来的世界

- **0.0 s**：一座空荡荡的小岛，清晨。角上一个年份计数器从 2022 开始跳。
- **0.5–2.0 s**：每一拍，地里冲出一座数据中心（水花声、木块声）；核电站的冷却塔冒起烟，电线一路架过去，硬币塔一座座长高。
- **约 2.2 s**：计数器停在 2026，岛已经认不出来了。
- **2–6 s**：纸条打出"四年，AI 先改了这些。"
- **封面**：四年，AI 把世界改成了这样。
- **标题**：AI 到底改变了什么？

最贴品牌，场面最大，但太抽象：2 秒里观众看到房子在长，还不知道这和自己有什么关系。

## 四、声音清单

试听：每个 id 在 `https://music.shapeof.world/track/<id>` 有页面。在 Mac 上运行 `python films/brand/sound/make_sound.py`，会在 `films/brand/sound/out/` 生成 `audio-logo.wav`（音频标志草稿）和 `palette-audition.wav`（下面 8 个音效按顺序各放两遍，约 20 秒）。WAV 不进 Git。

### 音频标志

自己合成，不用目录里的现成音效：一口气 → A4、E5、C#6 三个木琴音从左到右（像三笔画出一个圈）→ 第三个音上"球"落地（110 Hz，带二、三次谐波，手机外放也听得到）→ 玻璃余光，共 2.6 秒，−15 LUFS，峰值 −1 dBFS。画面上三个音对应球的轮廓画出来，落地对应球落定，余光对应左上那道青色边光。

如果只想用目录里的：`sfx-impact-08`（低沉撞击）叠 `sfx-impact-05`（玻璃轻碰），但它们没有旋律，记不住。

### 音效调色板

| 时刻 | id | 名字 | 层 |
|---|---|---|---|
| 一行字开始打出 | [`sfx-ui-01`](https://music.shapeof.world/track/sfx-ui-01) | 轻点 | 品牌 |
| 纸条字幕划入 | [`sfx-foley-02`](https://music.shapeof.world/track/sfx-foley-02) | 卡片滑动 | 品牌 |
| 数字落定 | [`sfx-impact-06`](https://music.shapeof.world/track/sfx-impact-06) | 陶瓷轻敲 | 品牌 |
| "那一个发现"亮起 | [`sfx-impact-05`](https://music.shapeof.world/track/sfx-impact-05) | 玻璃轻碰 | 品牌 |
| 物件落地、堆叠 | [`sfx-impact-01`](https://music.shapeof.world/track/sfx-impact-01) | 木块敲击 | 世界（按材质换） |
| 计数的每一跳 | [`sfx-mechanical-13`](https://music.shapeof.world/track/sfx-mechanical-13) | 进纸机构 | 世界 |
| 镜头内转场 | [`sfx-transition-02`](https://music.shapeof.world/track/sfx-transition-02) | 丝带掠过 | 世界 |
| 安静之后的重拍 | [`sfx-impact-08`](https://music.shapeof.world/track/sfx-impact-08) | 低沉撞击 | 世界 |

挑法：240 个音效全部下载，量了时长、起音、衰减、音高稳不稳、低频占比，再看频谱；有颤音、像"弹簧"的都排除。目录里的文字描述（`audioReview`）和实际声音常对不上，最后还是要用耳朵定。

环境声：数据中心 [`ambience-machine-02`](https://music.shapeof.world/track/ambience-machine-02)（服务器机房），岛上 [`ambience-water-01`](https://music.shapeof.world/track/ambience-water-01)（缓慢海浪），安静段垫底 [`ambience-room-01`](https://music.shapeof.world/track/ambience-room-01)（安静通风）。都是 CC0，可无缝循环。

### 配乐候选

BPM 和第一拍是在完整音频上测的（谱通量 + 梳状搜索）；"内容"一栏来自曲库的生成提示词和测出的能量曲线，没有人耳听过。强拍和音色都要在 15 秒样片里用耳朵再确认。

| | 曲子 | 实测 | 长度 | 内容 | 用在哪 |
|---|---|---|---|---|---|
| 1 | [《形状咬合》`pattern-lock`](https://music.shapeof.world/track/pattern-lock) | 110.0 BPM，第一拍 0.04 s，拍子很清楚 | 2:26 | 拨弦、马林巴、预制钢琴，一记低音鼓像"咬合"；越走越满，约 1:27–1:53 最满，2:02 前后回落再起 | 前半段：钩子到"三条线冲上天"（约 0:00–1:45） |
| 2 | [《擒纵》`tick-escape`](https://music.shapeof.world/track/tick-escape) | 89.9 BPM，第一拍 0.66 s | 2:26 | 开头 20 秒只有木头的滴答声，然后卡林巴、闷音钢琴、大提琴慢慢进来 | 后半段：安静之后的转折、那一个发现、升华 |
| 3 | [《世界的形状 · 木琴》`shape-theme-b`](https://music.shapeof.world/track/shape-theme-b) | 108.0 BPM，第一拍 0.14 s | 2:20 | 卡林巴和马林巴的五音动机，轻快 | 1 的替补：更轻、更像品牌主题曲 |

**推荐 1 + 2**：前半段用《形状咬合》，在"可是，失业率几乎没动"之前留 1–2 小节安静，从《擒纵》开头的木头滴答声接进后半段。速度从 110 换到 90，正好是片子从"世界在加速"转到"一个人的起点"。

授权：这三首在目录里都标着 `legacy-unreviewed`（使用权限待核对），发布前请确认一次。目录里已确认可商用、风格最接近的替补是 [《有序运动 · 90》`scene-minimalism-90`](https://music.shapeof.world/track/scene-minimalism-90)（马林巴、闷音钢琴、木鱼，87 秒）。

## 五、怎么重做

风格帧在 Mac 上渲（three.js + 仓库里的 Playwright，headless Chrome 走 Metal）。字体不进 Git，先下到 `films/brand/fonts/`：

```bash
mkdir -p films/brand/fonts && cd films/brand/fonts
curl -L -o NotoSansSC.ttf  "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"
curl -L -o NotoSerifSC.ttf "https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
curl -L -o Inter.ttf       "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
cd - && node films/brand/frames/src/shoot.mjs            # → films/brand/frames/a-tiltshift.jpg, b-lowpoly.jpg, c-physical.jpg
```

在工作区（worktree）里运行时，用 `NODE_MODULES=<主仓库>/node_modules` 指向装好 three 和 playwright 的那份。

- `frames/src/common.js`、`skeleton.css`：品牌骨架层和共用工具（移轴模糊、贴图字）。
- `frames/src/a-tiltshift.html`、`b-lowpoly.html`、`c-physical.html`：三个画风的场景。
- `sound/make_sound.py`：音频标志草稿和音效试听（需要 numpy、scipy）。

## 素材和授权

- 胡桃木贴图：Poly Haven 的 american_walnut_veneer，CC0，从 lemo-opuscar 的 `core/assets/polyhaven/` 复制。
- 字体：Noto Sans SC、Noto Serif SC、Inter，SIL OFL 1.1。three.js：MIT。
- 画风方向参考 [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的 `styles/tilt-shift`、`lowpoly-island`、`data-physical`（MIT / CC BY 4.0），代码是自己写的。
- 音效和环境声来自自己的曲库，CC0。
