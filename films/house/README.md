# 房子的形状（最终版，v6.2）

约 2 分 55 秒、1920×1080、60fps 的中文数据片：一套 100 万的房子，钱从哪来、到哪去。画面和配乐都由代码生成。2026-10-20 发布到世界的形状的抖音、B站和视频号；上传用的文件在发布套件 <https://press.shapeof.world>，成片不进 Git。

剧本见 `SCRIPT.md`，发布文案和数据来源见 `DESCRIPTION.md`。运行前按 `../README.md` 下载中文字体。

- 引擎和第五版相同。`web/timeline.js` 的 `ORDER` 按播放顺序列出分镜小节，所以整章可以挪动；被删的小节不在 `ORDER` 里，60 以后是新镜头。
- 本地预览：`PORT=5341 node tools/serve.mjs`，打开 `http://127.0.0.1:5341/web/index.html`。
- 渲染：`PORT=5341 node tools/render-music.mjs && PORT=5341 node tools/render.mjs out/house-v6.2.mp4 --workers 5 --blur 3`。
- 节奏：`node tools/readtime.mjs`（字够不够读），`node tools/holds.mjs [--plan]`（有没有空停，以及重新排停顿）。
