# 富不过三代，是真的吗？（films/inherit）

3:27、1920×1080、30 fps，无旁白，Remotion，2D 动态图形加公有领域老照片。

- **问题**：富不过三代，是真的吗？
- **发现**：钱确实留不过三代；一个家的位置，要十代上下、约三百年才散完。把钱全拿走（中国土改），孙辈的差距隔了一代又长了回来。
- **一个世界**：一棵往下长的家谱树。钱是节点外面的一圈金箔，位置是节点里面的一团暖光。
- **落句**：拿得走的，富不过三代；拿不走的，要走三百年。

作者的决定和意见：`BRIEF.md`；剧本：`SCRIPT.md`；数字账本和调研原文在仓库外的 `private/videos/inherit/`。

## 结构

全片按《千年之后（氛围版）》的"故事小节"计时（`src/timing.ts` 的 `SB`），一小节 2.150 秒。

| 段 | 片中 | 代码 |
|---|---|---|
| 开头：洛克菲勒对范德比尔特 | 0:00–0:16 | `open.tsx` |
| 1 俗话 · 2 钱确实留不住 | 0:16–0:42 | `act1.tsx` |
| 3 金榜 13 姓 · 4 日本、佛罗伦萨 · 5 江南三百年 | 0:42–1:26 | `act2.tsx` |
| 6 土改 · 7 孙辈 · 8 美国废奴、佐治亚抽签 | 1:26–2:12 | `act3.tsx` |
| 9 分家与洛克菲勒、尺子 · 10 拿不走的 · 11 往上走 · 结尾 · 信息来源 | 2:12–3:12 | `act4.tsx` |
| 片尾卡 | 3:19–3:27 | `kit.tsx` |

共用的画面（纸面、家谱树、肖像、老照片、字幕带）在 `world.tsx`；全片组合和音效在 `film.tsx`。

## 素材

- 老照片和画：Wikimedia Commons，公有领域（美国国会图书馆、底特律出版公司、Felice Beato、徐扬《姑苏繁华图》和村塾图、1470 年佛罗伦萨全景、美国政府官方肖像）；北京孔庙进士题名碑照片为 CC0。每张的页面和许可记在 `public/archive/SOURCES.json`。原图不进 Git，按那里的文件名下载到 `public/archive/`，再运行 `tools/assets.py` 调成全片一致的暖棕色。
- 金榜、名单卡、田地、账本、家谱树都是代码画的示意，信息来源页上写明。

## 声音

配乐《千年之后（氛围版）》（和乐府），`public/music.m4a`，不进 Git，从 <https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a> 下载。`tools/music.py` 按 `SB` 剪成 `public/score.wav`：曲子第 8–40、40–48、48–56 小节，半小节安静，再 16–40、40–48、60–64、64–72、76–80 小节。接缝都在强拍上；跳接处按色度相似度选（第 60 小节≈第 48 小节 0.989，第 76 小节≈第 72 小节 0.995）。音效来自自己的曲库（CC0），放在 `public/sfx/`。

## 重新生成

```bash
npm ci
curl -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
~/.venvs/shapeof-films/bin/python tools/assets.py     # 图片 → public/img/
~/.venvs/shapeof-films/bin/python tools/music.py      # 配乐 → public/score.wav
npm run studio                                        # 预览
COMP=Film NAME=inherit bash tools/render.sh           # → out/inherit.mp4（真峰值母带由 tools/tpmaster.py 做）
COMP=Film node tools/stills.mjs out/s 300 2700        # 审片截图
```

字体（Inter、Noto Sans SC、Noto Serif SC，SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。
