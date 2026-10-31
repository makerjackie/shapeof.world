# 一句普通的话（films/runaway）

一句普通的话，AI 能闯多大的祸？3:32、1920×1080、30 fps，无旁白，Remotion，2D 动态图形。

- **一个符号**：绿色的 ✓ 已解决。用户最爱看它，所有越界都藏在它背面。
- **故事**：一个编出来的周末。"帮我把旅行 App 做完。周一上线，预算就这么多。"AI 一步步越界，周一 App 上线、地图费 0 元，全城的骑手没了地图。
- **那一个发现**：故事是编的，但最离谱的几步已经在测试里发生过（红章 测试里发生过）。
- **结尾**：回到周五没发送的那句话。"AI 最让人担心的地方：它太想帮你了。"

用户的决定：`BRIEF.md`；剧本和事实核对：`SCRIPT.md`；发布文案和出处：`DESCRIPTION.md`。

## 结构

配乐是曲库里的 three-bodies（三个声部各有各的拍子，没有固定小节），所以关键动作都对在检测出的重音上。布局在 `src/time.ts`（`SEGS`）和 `tools/music.py`，两处必须一致。

| 段 | 片中 | 内容 | 曲子 |
|---|---|---|---|
| 冷开场 | 0:00–0:14 | 全屏 ✓、拉远露出城市、光点从飞鸟物流向外停摆变红、定格"起因，只是一句话。"、倒放 | 83.9–95.5，安静 1.8 秒，倒带 1 秒 |
| 周五、周末 | 0:14–1:28 | 对话、合上笔记本、任务面板八步、✓ 的洪流、一刀切断 | 0–31.4，跳到 53.69–95.5 |
| 周一 | 1:28–1:54 | ✓、太强了、外卖晚了、城市、回到开场那一帧、缩成一个绿点 | 95.5–122 |
| 拉远 | 1:54–2:12 | 一千万个光点、五句普通的话、连线变红；"上面这个周末，还没有发生。" | 122–135，跳到 142.85–147.5，安静 2.2 秒 |
| 盖章 | 2:14–2:39 | 八张小卡，五个红章和出处 | 53.69–77 |
| 为什么 | 2:37–3:15 | 冰山、三样东西、翻过来的 ✓、来不及改 | 96.3–122 |
| 结尾 | 3:15–3:32 | 没发送的那句话、落句、信息来源、片尾卡 | 0–29，淡出 |

代码在 `src/`：`film.tsx`（全片和音效表）、`open.tsx`、`weekend.tsx`、`monday.tsx`（周一和拉远）、`stamps.tsx`、`why.tsx`、`land.tsx`；`city.tsx` 是程序生成的城市和城市之间的网，`ui.tsx` 是对话窗口、✓、红章等界面部件，`kit.tsx` 沿用《再来一局》。

## 重新生成

都在 Mac 上跑。

```bash
npm install
# 字体（SIL OFL 1.1，不进 Git）放进 public/fonts/：
#   NotoSansSC-VF.ttf（films/README.md 里的链接）、NotoSerifSC-VF.ttf、Inter-VF.ttf（google/fonts 仓库 ofl/ 下）、
#   jetbrains-mono-latin-500/700-normal.woff2（films/house/web/fonts）
~/.venvs/shapeof-films/bin/python tools/music.py        # 配乐 public/score.wav 和音效 public/sfx/
npx remotion studio                                      # 预览
bash tools/render.sh > out/render.log 2>&1               # → out/runaway.mp4（画面、声音、母带）
echo "300 2700" | COMP=Film xargs node tools/stills.mjs out/s   # 审片截图（半分辨率；SCALE=1 全分辨率）
~/.venvs/shapeof-films/bin/python tools/tile.py out/s out/sheet  # 截图拼成带时间的总览
mkdir -p out/covers && node tools/covers.mjs                  # 封面 out/covers/cover-16x9.jpg、cover-3x4.jpg
```

zsh 不会按空格拆分变量，帧号用 `xargs` 传。渲染加了 `--gl=swiftshader`，不走 GPU 栅格化（`DIRECTOR.md` 技术坑）。母带 `tools/tpmaster.py`（取自 `films/ai-impact`）：约 −12 LUFS，真峰值 ≤ −1 dBTP，Apple `aac_at` 编码。
