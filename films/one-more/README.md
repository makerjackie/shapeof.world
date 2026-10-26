# 再来一局（films/one-more）

打游戏明知道该停，为什么停不下来？2:16、1920×1080、30 fps，无旁白，Remotion，2D 动态图形。

- **一个词**："差一点"。
- **问题**：为什么差一点就赢，反而更想再来一局？
- **那一个发现**：差一点就中，比差很远更难受，却更想再来一把（Clark 等，Neuron 2009）。更难受，却更想要。
- **主道具**：被子上的手机和一根拇指，屏幕上金色的"再来一局"。
- **结尾**：回到 01:47 的拇指。"想要，可以被设计。喜欢，只有你自己知道。"

用户的决定和每一轮意见：`BRIEF.md`；剧本和时间表：`SCRIPT.md`；成败经验：`LESSONS.md`；出处：`research/sources.md`；发布文案：`DESCRIPTION.md`。选题阶段的 23 个方向在仓库外的 `private/game-addiction/`。

## 结构

全片按《千年之后（氛围版）》的"故事小节"计时（`src/v4/time.ts`），详见 `SCRIPT.md`。

| 段 | 片中 | 内容 |
|---|---|---|
| 开头 | 0:00–0:22 | 团战推到水晶 1% 被团灭；被子上的手机，01:47，拇指按"再来一局"；问题；六个只缺一块的赛后弹窗，铺成缺口墙 |
| 1 游戏里 | 0:22–0:38 | 匹配一半一半；战绩里的"差一点就赢了""不甘心"；第四颗星亮了又灭；半小节安静 |
| 2 脑子里 | 0:38–1:35 | 剑桥老虎机实验；间奏上的发现；想要和喜欢两套系统；老虎机的差一点是假的、游戏的是真的；一夜 9 局；拇指比脑子先动；知道很慢、想要很快 |
| 3 不只是游戏 | 1:35–1:54 | 外卖满减、购物车、打卡、拼团；咖啡集点卡；生活里的目标几乎全空 |
| 结尾 | 1:54–2:16 | 拇指停在按钮上：先等三秒，再问自己；落句；信息来源；片尾卡 |

代码在 `src/v4/`：`film8.tsx`（全片，组合 `Film8`）、`open7.tsx`（开头）、`ch1.tsx`、`lab8.tsx`、`mind8.tsx`、`life8.tsx`；`fight.tsx` 团战和结算，`hero.tsx` 小英雄，`gaps.tsx` 缺口弹窗，`phoneshot.tsx` 手机和拇指，`cover8.tsx` 封面；`time.ts` 计时。示意的大脑是 `src/brain.tsx`，和 `src/kit.tsx`（字、品牌角标、片尾）一样从 v1 沿用；`src/` 根下其余是更早版本（v1–v3）的代码，`Root.tsx` 里还注册着几版样片。

## 声音

配乐《千年之后（氛围版）》（和乐府），`public/music.m4a`，不进 Git，从 <https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a> 下载（`curl -o public/music.m4a <链接>`）。`tools/music9.py` 按 `time.ts` 的布局剪成 `public/score9.wav`：曲子第 8–25 小节、半小节安静、第 25–32 小节、跳过 32–39、第 40–78.5 小节，接缝都在强拍上；调到 −16 LUFS，最后 2.5 秒淡出。音效来自自己的曲库（`music/tracks/*.json`，CC0），由同一个脚本按代码里出现的 id 下载。剪好的 WAV 和音效也不进 Git。

## 重新生成

都在 Mac 上跑。

```bash
npm ci
curl -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
~/.venvs/shapeof-films/bin/python tools/music9.py      # 配乐和音效 → public/
npm run studio                                          # 预览
tmux new -d -s render-one-more 'COMP=Film8 NAME=one-more bash tools/render.sh > out/render.log 2>&1'   # → out/one-more.mp4
COMP=Film8 node tools/stills.mjs out/s 300 2700         # 指定帧的审片截图（半分辨率）
~/.venvs/shapeof-films/bin/python tools/tile.py out/s out/sheet    # 截图拼成带时间的总览
COVERS=cover8-16x9,cover8-3x4 node tools/covers.mjs     # 封面
```

母带：`tools/tpmaster.py`（取自 `films/ai-impact`）把声音调到约 −12 LUFS，4 倍过采样限幅，用 Apple 的 `aac_at` 编码，真峰值 ≤ −1 dBTP。

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。
