# 一个亿印出来以后，去了谁的口袋？（films/money-flow）

5:42、1920×1080、30 fps，无旁白，Remotion + three.js 三维小镇（Kenney CC0 模型），自己曲库的五首配乐。

v4（2026-11-03）回到 v2 的悬念和画面。v3 改成跟着一张 100 块走，作者觉得"不如原来的有意思"，只有饭馆拆账那段被点名有意思，所以这段并进了 v4。v2 被指出的几处问题都在 v4 里改了：
- 2015–2018 房价的例子删了，改成"浪潮"，涨和退都讲；
- 管道和弧线不再闪；
- 每一笔流动都标上它是什么钱；
- 美国那部分只留一条数据。

v5（2026-11-04）内容和数字不动，改声音和画面。作者看 v4 觉得"配乐加上这个画面，看不太下去"：
- 配乐：v4 前 2 分 49 秒是同一首拉长，中段垫的是一首写超新星的紧张曲子。v5 每一段换一首，揭晓前、浪潮退去时留出真正的安静；
- 光线：从午后的暖光开始，揭晓时日落，讲富人和浪潮时入暮，结尾入夜（`timing.ts` 的 `nightAt`）；
- 镜头：几处大全景换成贴近前排人家的中近景；
- 字幕：删掉和画面标签重复的小字，约少三分之一。

决定和理由见私有 `SCRIPT-v4.md`。

- **问题**：新印出来的一个亿，一年后停在谁家？
- **发现**：
  - 钱大多是借出来的。
  - 它流过每一户，每到一站，一部分分给干活的人，一部分归拥有东西的人。
  - 干活的钱大多又花出去，所以钱只停在花不完它的人家里：按中国家庭金融调查的储蓄分布推算，约一半停在收入最高的 5 户。
  - 停下来的钱借给别人，利息又流回去；它也会追着一波波浪潮跑（房子，然后手机、互联网、电池、芯片），每一波最大的那份归最早拥有它的人。浪潮也会退。
  - 但拥有也要扛风险，印钱也救急。
- **一个世界**：全国 4.9 亿户家庭缩成 100 户的蓝调时刻小镇。每户房顶有一个玻璃水箱，金色的钱在管道和空中流动。
- **六户人家**：外卖骑手、工厂工人、程序员、房东、小老板（饭馆，配小票）、大股东。
- **落句**：这 1 个亿，你也摸到过。它只是，从你手里流过。

作者原话：`private/videos/money-flow/BRIEF.md`。剧本和数字账本：`private/videos/money-flow/SCRIPT-v4.md`、`LEDGER.md`（v4 新增行在第九节）。

## 结构

时间都在 `src/timing.ts` 的 `T` 里，按配乐的小节排。

| 段 | 片中 | 内容 |
|---|---|---|
| 钩子 | 0:00–0:11 | 100 户人家、1 个亿落进央行塔、"一年后它会停在谁家？" |
| 1 | 0:11–0:31 | 钱是借出来的；2024 年新增贷款约 18 万亿，大头借给企业 |
| 2 | 0:31–1:02 | 先借给一家工厂；每 100 元：工资 53 / 税 8 / 企业和老板 39 |
| 3 | 1:02–1:44 | 12 个月，六户；饭馆小票（食材 42.1、人工 22.2、房租 9.7……） |
| 4 | 1:44–2:16 | 揭晓：前 5 户约 5000 万、接下来 20 户约 2600 万、75 户约 2300 万；47.5% |
| 5 | 2:16–2:48 | 美国富人的收入：工资只占 17%；普通人收入大多是工资 |
| 6 | 2:48–3:17 | 前 5% 家庭存下 72%；存款借给买房的人，利息流回大宅；30 年利息约 54 万 |
| 7 | 3:17–3:58 | 浪潮：买新房的钱 2500 亿 → 18.2 万亿 → 8.4 万亿；2021 年买房的人 |
| 9 | 3:58–4:45 | 胡润榜；手机、互联网、电池、芯片；全世界 75% / 2% |
| 10 | 4:45–5:09 | 但是：不印失业更多；小老板最先赔钱 |
| 11 | 5:09–5:42 | 你的那户水箱；信息来源；片尾卡 |

代码在 `src/town/` 下：
- `layout.ts`：小镇布局
- `sim.ts`：一年的流动模型
- `state.ts`：每段的场景状态和空中的流动（`arcsAt`，带标签）
- `camera.ts`：镜头
- `engine.ts`：three.js 渲染

字幕、标签、小票、曲线在 `src/Film.tsx`。

## 模型（片中说的"按全国统计比例推算"）

`src/town/sim.ts` 每个月做三件事：
- 把还在流动的钱按收入分给 100 户；政府和企业拿到的钱也会再花出去，一并算进来；
- 每户存下一部分，花掉其余；
- 花掉的钱进入下个月继续流。

各组收入占比和储蓄率的取值，要让一年后停下来的钱符合中国家庭金融调查（CHFS 2015，2014 年数据）的分布：前 5% 家庭占 50.6%，前 10% 占 62.4%，前 25% 占 77.1%。另外要符合约 4 成家庭入不敷出，以及全国住户储蓄率约三分之一（统计局资金流量表 2023）。这些取值只用来驱动画面，不上屏。

## 声音

`tools/music.py` 从五首曲库原曲（CC0）拼出 `public/score.wav`，一段一首，接点见脚本开头：

- 0:00–1:02 初次打开：<https://music-cdn.shapeof.world/tracks/first-opening/v1/master.mp3>
- 1:02–1:44 世界的形状：<https://music-cdn.shapeof.world/tracks/hidden-shapes/v1/master.mp3>
- 1:47–3:17 活着的蓝：<https://music-cdn.shapeof.world/tracks/living-blue/v1/master.mp3>
- 3:17–3:44、3:58–4:45 同步闪光：<https://music-cdn.shapeof.world/tracks/sync-flash/v1/master.mp3>
- 4:45–5:42 安静的账本：<https://music-cdn.shapeof.world/tracks/quiet-ledger/v1/master.mp3>

这几首下载到 `public/music/`。音效在 `public/sfx/`，来自同一曲库（`https://music-cdn.shapeof.world/tracks/<id>/v1/master.wav`）。都不进 Git。

## 模型

Kenney CC0 模型（City Kit Suburban / Commercial / Industrial、Car Kit、Mini Characters 1、Nature Kit、Furniture Kit），由 `tools/assets.sh` 拷到 `public/models/`，不进 Git。材质在 `src/town/assets.ts` 里改色、加夜窗。

坑：后期最后一道必须写满 alpha（`gl_FragColor = vec4(c.rgb, 1.0)`），渲染器用 `alpha: false`。不然截图时，页面上的字幕会以模糊的"鬼影"出现在三维画面里。

## 字体

字体是本地文件，渲染不用联网（SIL OFL 1.1）：
- `public/fonts/NotoSansSC-VF.ttf`：同 `films/house/web/fonts/`，下载地址见 `films/README.md`；
- `public/fonts/NotoSerifSC.ttf`：<https://github.com/google/fonts/tree/main/ofl/notoserifsc>。

都不进 Git。

## 重新生成

```bash
npm install
bash tools/assets.sh                                       # 模型 → public/models
~/.venvs/shapeof-films/bin/python tools/music.py          # → public/score.wav
node tools/lab.mjs out/s 300 3300 6000                     # 审片截图
bash tools/master.sh                                       # 成片 → out/money-flow.mp4
```
