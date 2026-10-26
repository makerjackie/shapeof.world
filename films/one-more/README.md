# 再来一局（films/one-more）

打游戏明知道该停，为什么停不下来？约 2:57、1920×1080、30 fps，无旁白，Remotion，2D 动态图形。

- **论点**：让人停不下来的不是快乐，是"想要"。大脑里"想要"和"喜欢"是两套系统；游戏里最精密的设计，都在制造"还差一点"。
- **主道具**：圆形的"再来一局"按钮。它是结算画面上的按钮、星盘的圆心、钻进大脑的入口。
- **那一个发现**：差一点就中，比差很远更难受，却更想再来一把（Clark 等，Neuron 2009）。
- **结尾**：回到 1:47 的拇指。"想要，可以被设计。喜欢，只有你自己知道。"

用户的决定：`BRIEF.md`；剧本和小节表：`SCRIPT.md`；出处：`research/sources.md`；发布文案：`DESCRIPTION.md`。选题阶段的 23 个方向在仓库外的 `private/game-addiction/`。

## 结构

三首曲子，一章一首，每章按自己实测的拍子计时（`src/timing.ts`）。

| 段 | 曲子 | 片中 | 内容 |
|---|---|---|---|
| A 游戏里 | 轨道船坞 · 休息，113.99 BPM | 0:00–0:59（28 小节） | 1:47 的结算画面和按钮；片名；五个圈（一局、段位、每日任务、赛季、好友），缺口永远对不齐；匹配把输赢放在一半一半；镜头掉进按钮 |
| 安静 | — | 1 秒 | 穿过圆心 |
| B 脑子里 | 水下档案馆 · 休息，72.01 BPM | 1:00–1:57（17 小节） | 猴子实验（50% 时期待最强）；喜欢和想要两套系统；老虎机实验（品牌金）；今晚的两条线；知道很慢，想要很快 |
| C 不只是游戏 | 温暖电路 · 90，约 100.36 BPM | 1:57–2:57（25 小节） | 手机里的每个 App 都有自己的圈；生活里越缺三样需要的人越停不下来；游戏的回应是真的；回到 1:47；落句；信息来源；片尾卡 |

代码：`src/game.tsx`（A）、`src/mind.tsx`（B）、`src/life.tsx`（C）；`src/phone.tsx` 手机和按钮，`src/brain.tsx` 示意的大脑，`src/cam.ts` 二维相机，`src/kit.tsx` 字、品牌角标、片尾，`src/sfx.ts` 音效表。

## 声音

配乐和音效都来自自己的曲库（`music/tracks/*.json`，配乐 `rights.commercialUse = true`，音效 CC0），不进 Git。`tools/audio.py` 按曲库目录下载（校验 sha256）、把三首调到 −17 LUFS 附近（A 段鼓点密，低 1.5 dB；B、C 高 0.5 dB），再按 `src/timing.ts` 的布局拼成 `public/score.wav`：A 段前 4 小节加低通（像隔着墙），片名处打开，第 28 小节的强拍上硬停；1 秒安静；B 段最后 2.2 秒淡出；C 段最后 4.5 秒淡出。

## 重新生成

都在 Mac 上跑。

```bash
npm ci
~/.venvs/shapeof-films/bin/python tools/audio.py      # 配乐和音效 → public/
npm run studio                                         # 预览
tmux new -d -s render-one-more 'bash tools/render.sh > out/render.log 2>&1'   # 画面、声音、母带 → out/one-more.mp4
node tools/stills.mjs out/s 300 2700                   # 指定帧的审片截图（半分辨率）
~/.venvs/shapeof-films/bin/python tools/tile.py out/s out/sheet   # 截图拼成带时间的总览
```

母带：`tools/tpmaster.py`（取自 `films/ai-impact`）把声音调到约 −12 LUFS，4 倍过采样限幅，用 Apple 的 `aac_at` 编码，真峰值 ≤ −1 dBTP。

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。标志 `public/mark-disc.png` 和《活着是主线》同一份。
