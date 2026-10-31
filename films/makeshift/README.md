# 社会真的是个草台班子吗？（films/makeshift）

约 2:52、1920×1080、30 fps，无旁白，Remotion，2D 动态图形。

- **问题**：社会真的是个草台班子吗？
- **那一个发现**：世界靠悄悄补上转下去，也因为悄悄补上，一直是草台班子（Tucker & Edmondson 2003：护士 93% 的时候自己补上）。最靠谱的系统也是草台班子，只是它把补丁亮了出来（NASA ASRS；Barnett 2024）。
- **主角**：一本在黑屋子里发光的电子表格。底部的工作表标签是章节：基因、病例、台前、xz、护士的一个班、飞行。
- **结尾**：回到 MARCHF1 那一格，一个批注："下次补上的时候，留个批注。"

剧本、配乐结构、数字账本和十二点时钟：`SCRIPT.md`；作者的要求和每一轮决定：`BRIEF.md`；经验：`LESSONS.md`；发布文案和完整来源：`DESCRIPTION.md`。调研原文在仓库外的 `private/videos/makeshift/`。

## 结构

全片按《千年之后（氛围版）》的"故事小节"计时（`src/time.ts`）。

| 段 | 代码 | 内容 |
|---|---|---|
| 开头 | `open.tsx` | MARCH1 → 1-Mar；一列基因变日期；一墙论文附表五分之一变红；改名 MARCHF1；问题 |
| 病例 | `cases.tsx` | 行号冲到 65,536 撞到表底，15,841 行掉进黑暗；4.8 万名密接；85 张表 94% 有错 |
| 台前 | `front.tsx` | 官方卡片翻过去是一张乱表；格子画的自行车，链条连了两个轮子；总有人懂 |
| xz | `xz.tsx` | 格子堆成的塔立在一小格 xz 上；一个志愿者；第二个维护者和一把锁；慢了半秒；一小节安静 |
| 护士 | `nurse.tsx` | 一个班的记录，"怎么处理"一列涂黄；下班后还在记；黄格揭起，底下还是红的 |
| 飞行 | `flight.tsx` | 起飞前检查单；飞行员自己交的报告，每月 10,094 份，变成新规矩 |
| 高潮和结尾 | `climax.tsx` | 1,370 万格里红点从 39 个熄到 1 个；品牌金的发现；但是（安大略的清单）；回到 MARCHF1 的批注；信息来源 |

共用的表格、窗口、标签和批注框在 `sheet.tsx`，字和品牌在 `kit.tsx`，音效表在 `cues.ts`，封面在 `cover.tsx`。

## 声音

配乐《千年之后（氛围版）》（和乐府），`public/music.m4a`，不进 Git：`curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a`。`tools/music.py` 按 `time.ts` 剪成 `public/score.wav`：曲子第 8–48 小节、一小节安静、第 48–64 小节、第 56–64 小节再放一遍（第 63、55 小节色度相似度 0.98）、第 64–78.5 小节，接缝都在强拍上，最后 2.5 秒淡出。音效来自自己的曲库（`music/tracks/*.json`，CC0），由同一个脚本按代码里出现的 id 下载。

## 重新生成

都在 Mac 上跑。

```bash
npm ci
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
~/.venvs/shapeof-films/bin/python tools/music.py        # 配乐和音效 → public/
npm run studio                                          # 预览
tmux new -d -s render-makeshift 'COMP=Film NAME=makeshift bash tools/render.sh > out/render.log 2>&1'   # → out/makeshift.mp4
COMP=Film node tools/stills.mjs out/s $(node tools/sb.mjs 0 9.5 40)   # 按故事小节截审片图（半分辨率）
~/.venvs/shapeof-films/bin/python tools/tile.py out/s out/sheet       # 截图拼成带时间的总览
COVERS=cover-16x9,cover-3x4 node tools/covers.mjs       # 封面
```

母带：`tools/tpmaster.py`（取自 `films/ai-impact`）把声音调到约 −12 LUFS，4 倍过采样限幅，用 Apple 的 `aac_at` 编码，真峰值 ≤ −1 dBTP。

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。
