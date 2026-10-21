# 短片

世界的形状的数据短片。画面和配乐都由代码逐帧生成：场景按时间 `seek(t)` 画出每一帧，Playwright 截图，ffmpeg 编码。每部片的命令、结构和数据来源见各自目录的 `README.md` 和 `DESCRIPTION.md`。

| 目录 | 片名 | 规格 | 状态 |
|---|---|---|---|
| `house/` | 房子的形状 | 16:9 · 2:55 · 无旁白 | 2026-10-20 已发布 |
| `ai-shape/` | AI 的形状 | 16:9 · 2:37 · 无旁白 | 2026-10-20 定稿 |
| `ai-real-cost/` | AI 的真实价格 | 16:9 · 2:58 · 无旁白 · Remotion | 2026-10-21 v5 |

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
