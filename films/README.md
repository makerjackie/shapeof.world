# 短片

世界的形状的数据短片。画面和配乐都由代码逐帧生成：场景按时间 `seek(t)` 画出每一帧，Playwright 截图，ffmpeg 编码。每部片的命令、结构和数据来源见各自目录的 `README.md` 和 `DESCRIPTION.md`。

| 目录 | 片名 | 规格 | 状态 |
|---|---|---|---|
| `house/` | 房子的形状 | 16:9 · 2:55 · 无旁白 | 2026-10-20 已发布 |
| `ai-shape/` | AI 的形状 | 16:9 · 2:37 · 无旁白 | 2026-10-20 定稿 |
| `ai-real-cost/` | AI 的真实价格 | 16:9 · 2:58 · 无旁白 · Remotion | 2026-10-21 v5.1 定稿 |

- 成片、配乐音频和审片截图不进 Git。上传用的成片放 R2 桶 `shapeof-press`，见 [`infra/press`](../infra/press/README.md)。
- Playwright 用仓库根目录装好的那份，先在根目录运行 `pnpm install`。`ai-shape/` 另有自己的依赖，在它的目录里运行 `npm install`。
- 中文字体 Noto Sans SC（17 MB，SIL OFL 1.1）不进 Git。`house/` 和 `ai-shape/` 渲染前先下载到 `web/fonts/`：

  ```bash
  curl -L -o films/house/web/fonts/NotoSansSC-VF.ttf \
    "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"
  cp films/house/web/fonts/NotoSansSC-VF.ttf films/ai-shape/web/fonts/
  ```

  SHA-256 应为 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`。

代码按仓库的 AGPL-3.0-only 授权，片中原创的文案和画面按 CC BY-NC 4.0，第三方字体和数据按各自的许可，见每部片的 `DESCRIPTION.md` 和字体旁的 OFL 文本。名称和标志不随代码授权。

## 做片要点（2026-10-21，来自《AI 的真实价格》v5）

- **结尾一定要有一个小的总结升华**，不做购买推荐，也不是要点复述：把主题往上抬一层，落到观众自己身上，再回扣开场那句话，然后接品牌片尾。《AI 的真实价格》的做法：
  - 用片子自己的道具搭桥：总结公式"单价 × 用量 ÷ 包月倍数"后面补上"漏掉的最贵一项：你的时间"。
  - 升华也要有一个数字撑着：解决一道编程题，87% 的成本是你检查、返工的时间。
  - 再给一个反直觉的趋势：AI 每年便宜 13 倍，用量两年涨 330 倍。
  - 收在一句话上："token 会越来越多，唯一不会变多的，是你的时间"。
  - 升华放在配乐的高潮段，品牌片尾放在配乐收尾，合计约 40 秒。
- 开场直接给结论，用一句完整、有点挑衅的话；前提条件留到片中再讲。
- 主因在前、次因在后；一个数字只揭晓一次。
- 一屏只讲一件事、一个结论，来源和限定条件放底部小字；先用简单的比喻讲清楚，再上数据。
- 给对立的一方一段"说句公道话"，再说明结论为什么仍然成立；关键的证明卡在配乐最大的一次回落后重进。
- 卡点是转场和元素落在拍子上，不要整屏抖动，图表和文字场景不要持续慢推镜头。
