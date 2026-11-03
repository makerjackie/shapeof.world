# 一个亿印出来以后，去了谁的口袋？（films/money-flow）

约 5:40、1920×1080、30 fps，无旁白，Remotion + three.js 三维小镇（Kenney CC0 模型），自己曲库的三首配乐。v2（2026-11-03）：作者看完 v1 说"太粗糙"，画面和数据重做，见私有 SCRIPT.md 的 v3 一节。

- **问题**：新印出来的一个亿，一年后停在谁家？
- **发现**：钱会流过每一户，但只停在花不完它的人家里。按中国家庭金融调查的储蓄分布推算，一年后约一半停在收入最高的 5 户（100 户里）。停下来的钱去买房、借给别人，利息又流回去；钱先流到哪里，哪里就先涨价（棚改 → 房价，美国 2008 → 股市，2020 → 物价）。但放水也保住了工作。
- **一个世界**：全国 4.9 亿户家庭缩成 100 户的蓝调时刻小镇，每户房顶一个玻璃水箱，金色的钱在管道里流。央行、银行、政府、工厂和商店、新楼盘、棚户区在镇子西边。
- **六户人家**：外卖骑手、工厂工人、程序员、房东、小老板、大股东（`layout.ts` 的 `CAST`），第三段一户一个镜头，揭晓时并排比"流过 / 留下"。谁付钱给谁画成空中的金色弧线（`state.ts` 的 `arcsAt`）。
- **落句**：这 1 个亿，你也摸到过。它只是，从你手里流过。

作者原话：`BRIEF.md`（仓库外 `private/videos/money-flow/BRIEF.md`）；剧本和数字账本：`private/videos/money-flow/SCRIPT.md`、`LEDGER.md`。

## 结构

时间都在 `src/timing.ts` 的 `T` 里（按配乐的小节排）。

| 段 | 片中 | 内容 |
|---|---|---|
| 钩子 | 0:00–0:11 | 100 户人家、1 个亿落进央行塔、"一年后它会停在谁家？" |
| 1 | 0:11–0:40 | 钱是借出来的；2015–2018 棚改，央行 PSL → 国开行 → 拆迁户 |
| 2 | 0:40–1:15 | 买房 → 卖地约四成 → 每 100 元：工资 53 / 税 8 / 企业和老板 39 |
| 3 | 1:15–1:44 | 12 个月：小户的水流过，大户的水积下 |
| 4 | 1:44–2:16 | 揭晓：前 5 户约 5000 万、接下来 20 户约 2600 万、75 户约 2300 万 |
| 5 | 2:16–2:48 | 美国富人的收入：工资只占 17%；没卖的资产自己在涨 |
| 6 | 2:48–3:17 | 前 5% 家庭存下 72%；存款借给买房的人，利息流回大宅 |
| 7–8 | 3:17–3:58 | 房价 +29%、物价 +6%；你的 50 万少买了一间卧室 |
| 9 | 3:58–4:45 | 美国：2008 入口在华尔街（股市），2020 入口在每家门口（物价 9.1%） |
| 10 | 4:45–5:09 | 但是：低收入者工资没缩水；不放水失业更多 |
| 11 | 5:09–5:26 | 你的那户水箱；信息来源；片尾卡 |

代码：`src/town/`（`layout.ts` 小镇布局、`sim.ts` 一年的流动模型、`state.ts` 每段的场景状态、`camera.ts` 镜头、`engine.ts` three.js 渲染），`src/Film.tsx`（字幕、标签、计数器、户型图）。

## 模型（片中说的"按全国统计比例推算"）

`src/town/sim.ts`：每个月还在流动的钱按收入分给 100 户（政府和企业拿到的钱再花出去，也算进来），各户存下一部分、花掉其余，花掉的继续流。各组收入占比和储蓄率取成：一年后停下来的钱，前 5% 家庭占 50.6%、前 10% 占 62.4%、前 25% 占 77.1%（CHFS 2015，2014 年数据），约 4 成家庭入不敷出，全国住户储蓄率约三分之一（统计局资金流量表 2023）。各组的收入占比和储蓄率只用于画面，不上屏。

## 声音

`tools/music.py` 从三首曲库原曲（CC0）拼出 `public/score.wav`，接点和对齐见脚本开头：

- 信用火花：<https://music-cdn.shapeof.world/tracks/credit-spark/v1/master.mp3>
- 核心坍缩：<https://music-cdn.shapeof.world/tracks/core-collapse/v1/master.mp3>
- 安静的账本：<https://music-cdn.shapeof.world/tracks/quiet-ledger/v1/master.mp3>

下载到 `public/music/`。音效在 `public/sfx/`，来自同一曲库（`https://music-cdn.shapeof.world/tracks/<id>/v1/master.wav`）。都不进 Git。

## 模型

Kenney CC0 模型（City Kit Suburban / Commercial / Industrial、Car Kit、Mini Characters 1、Nature Kit），`tools/assets.sh` 从本地解压目录拷到 `public/models/`，不进 Git。材质在 `src/town/assets.ts` 里改色、加夜窗。

## 字体

本地文件，渲染不用联网（SIL OFL 1.1）：`public/fonts/NotoSansSC-VF.ttf`（同 `films/house/web/fonts/`，下载地址见 `films/README.md`）和 `public/fonts/NotoSerifSC.ttf`（<https://github.com/google/fonts/tree/main/ofl/notoserifsc>）。不进 Git。

## 重新生成

```bash
npm install
bash tools/assets.sh                                       # 模型 → public/models
~/.venvs/shapeof-films/bin/python tools/music.py          # → public/score.wav
node tools/lab.mjs out/s 300 3300 6000                     # 审片截图
bash tools/review.sh                                       # 半尺寸审片 → out/review.mp4
node tools/render.mjs out/video.mp4 3                      # 成片画面（无声）
COMP=Film node ...                                         # 母带见 tools/master.sh
```
