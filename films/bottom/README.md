# 房价的底（films/bottom）

房价到底了吗？约 3:18、1920×1080、30 fps，无旁白，Remotion，2D 动态图形。

- **一把尺子**：同一套 100 万的房子，一年的房租，够不够付买下它一年的代价（约 2.6 万）。
- **那一个发现**：按这把尺子过线最多的长春、哈尔滨、长沙还在跌；离线最远的北上广深先止跌了。房价里装着今天的房租和明天的期待。
- 剧本 `SCRIPT.md`，作者的决定 `BRIEF.md`，数据和出处 `research/DATA.md`，知乎上的说法 `research/ZHIHU-NOTES.md`。

## 结构（故事小节，`src/time.ts`）

| 段 | 小节 | 内容 | 代码 |
|---|---|---|---|
| 开场 | 0–8 | 挂牌价每拍降一次；70 城跌回 2016 年，35 城跌回 2010 年前 | `open.tsx` |
| 各说各的 | 8–18 | 北上广深连涨 7 个月 / 59 城还在跌；机构预测；换个问法 | `open.tsx` |
| 一把尺子 | 18–31 | 卡片翻面；买的一年 0.47 + 2.17 = 2.6 万，成了那条线；长沙 3.1、深圳 1.6 | `skyline.tsx` |
| 天际线 | 31–42 | 50 城排成楼，过线的、碰线的、离线最远的；一线还差多少 | `skyline.tsx` |
| 贴息 | 42–48 | 线降到 1.9%；150 万在长沙和深圳能买多大 | `skyline.tsx` |
| 间奏 | 48–56 | 过线的城市还在跌；房租也在降 | `skyline.tsx` |
| 重进 | 56–59 | 最不划算的城市，先止跌了 | `skyline.tsx` |
| 为什么 | 59–83 | 哈尔滨和深圳 2010 年以来；房租撑得起多少房价；高潮（72）：房租和期待 | `insight.tsx` |
| 结尾 | 83–92 | 回到卡片，"租"和"买"之间悬着的光标；来源；片尾卡 | `insight.tsx` |

## 重新生成

```bash
npm ci
python3 tools/data.py                                   # data/*.csv/tsv → src/data.json
curl -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
~/.venvs/shapeof-films/bin/python tools/music.py        # 配乐 public/score.wav 和音效 public/sfx/
npm run studio
tmux new -d -s render-bottom 'COMP=Film NAME=bottom bash tools/render.sh > out/render.log 2>&1'
COMP=Film node tools/stills.mjs out/s 300 2700 && ~/.venvs/shapeof-films/bin/python tools/tile.py out/s out/sheet
```

配乐《千年之后（氛围版）》（和乐府），按 `tools/music.py` 的布局在小节线上剪接；音效来自自己的曲库（`music/tracks/*.json`）。音频和成片不进 Git。
