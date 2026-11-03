# 你的 100 块，最后去了谁的口袋？（films/money-flow）

5:22、1920×1080、30 fps，无旁白，Remotion + three.js 三维小镇（Kenney CC0 模型），自己曲库的三首配乐。目录名沿用最初的题目《一个亿印出来以后，去了谁的口袋？》。

v3（2026-11-03）是重写：作者看完 v2，觉得 2015–2018 房价的例子站不住（后来跌回去了），流动的线一直在闪，画面也没讲清钱怎么流。v3 改成跟着一张 100 块走，只讲中国，房子按"浪潮"讲（涨和退都讲）。决定和理由见私有 `SCRIPT-v3.md`。

- **问题**：你在街边小馆付的 100 块，最后去了谁的口袋？
- **发现**：钱一直在转。你的工资是别人花出来的，你花的钱又成了别人的工资。每到一站，钱都分成两种：发给干活的人的，和归拥有东西（店、房子、地、公司、存款）的人的。干活的钱大多又花出去；拥有东西的人每一圈都留下一份，财富就停在那里。浪潮来时被放大，退时也有人接盘。
- **一个世界**：从中午到夜里的微缩小镇。钱是真的金币（饭店那几段一枚 = 1 元），沿着淡淡的实线平稳地飞，到站堆成一摞；拆账用小票。
- **落句**：这 100 块，你只握了一会儿。

作者原话：`private/videos/money-flow/BRIEF.md`；剧本和数字账本：`private/videos/money-flow/SCRIPT-v3.md`、`LEDGER.md` 第八节。

## 结构

时间都在 `src/timing.ts` 的 `T` 里（按配乐排，见 `tools/music.py`）。

| 段 | 片中 | 内容 |
|---|---|---|
| 钩子 | 0:00–0:11 | 小馆，付 100 块；"最后去了谁的口袋？" |
| 1 | 0:11–0:52 | 小票：食材 42.1、人工 22.2、房租 9.7、外卖平台 4.5、水电燃气 3.6、税费 1.8、其余 16.1；老板最后拿，房东先拿 |
| 2 | 0:52–1:32 | 服务员月薪约 4500，钱很快又花出去；菜市场再拆；房租进银行；平台给骑手和股东；钱分两种 |
| 3 | 1:32–2:04 | 全国每生产 100 元：工资 53、税 8、企业和资本 39；居民每花 100 元的去处 |
| 4 | 2:04–2:36 | 低收入几乎花光；前 5% 家庭存下一半储蓄；城镇最富 10% 拥有 47.5% 的资产 |
| 5 | 2:36–3:09 | 贷 100 万 30 年利息约 54 万；贷款造出新钱；2018 年新贷款约四成进房地产；利息付给存钱的人 |
| 6 | 3:09–4:05 | 浪潮：买新房的钱 2500 亿 → 18.2 万亿 → 8.4 万亿；胡润榜上的房地产商；手机、互联网、电池、芯片 |
| 7 | 4:05–4:22 | 全世界：最富 10% 约 75%，最穷一半约 2% |
| 8 | 4:22–4:40 | 但是：老板最先赔钱；高点买房的人 |
| 9 | 4:40–5:06 | 回到小馆，夜；落句 |

代码：`src/world/`（`layout.ts` 地点和人、`flows.ts` 每一笔钱：金币从哪飞到哪、什么时候，`camera.ts` 镜头、`engine.ts` three.js 渲染），`src/Film.tsx`（字幕、小票、标签、浪潮曲线、来源）。`src/town/assets.ts` 加载模型、改材质。

## 声音

`tools/music.py` 从三首曲库原曲（CC0）拼出 `public/score.wav`，接点和对齐见脚本开头：

- 信用火花：<https://music-cdn.shapeof.world/tracks/credit-spark/v1/master.mp3>
- 核心坍缩：<https://music-cdn.shapeof.world/tracks/core-collapse/v1/master.mp3>
- 安静的账本：<https://music-cdn.shapeof.world/tracks/quiet-ledger/v1/master.mp3>

下载到 `public/music/`。音效在 `public/sfx/`（收银小票的进纸声、硬币、纸币等），来自同一曲库（`https://music-cdn.shapeof.world/tracks/<id>/v1/master.wav`）。都不进 Git。

## 模型

Kenney CC0 模型（City Kit Suburban / Commercial / Industrial、Car Kit、Mini Characters 1、Nature Kit、Furniture Kit），`tools/assets.sh` 从本地解压目录拷到 `public/models/`，不进 Git。

坑：后期最后一道必须写满 alpha（`gl_FragColor = vec4(c.rgb, 1.0)`）。之前透明物体留下的 alpha < 1，截图时页面上的字幕会以模糊的"鬼影"出现在三维画面里。

## 字体

本地文件，渲染不用联网（SIL OFL 1.1）：`public/fonts/NotoSansSC-VF.ttf`（同 `films/house/web/fonts/`，下载地址见 `films/README.md`）和 `public/fonts/NotoSerifSC.ttf`（<https://github.com/google/fonts/tree/main/ofl/notoserifsc>）。不进 Git。

## 重新生成

```bash
npm install
bash tools/assets.sh                                       # 模型 → public/models
~/.venvs/shapeof-films/bin/python tools/music.py          # → public/score.wav
node tools/lab.mjs out/s 300 3300 6000                     # 审片截图
bash tools/review.sh                                       # 半尺寸审片 → out/review.mp4
bash tools/master.sh                                       # 成片 → out/money-flow.mp4
```
