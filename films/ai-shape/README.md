# AI 的形状（最终版，v8）

约 2 分 37 秒、1920×1080、60fps 的中文数据片：2026 年 AI 世界调研，6 章。画面和配乐都由代码生成，结尾由片名“AI 的形状”翻成“世界的形状”。

- 成片：`out/ai-shape-v8.1.mp4`（最终版，v8 加“中国台湾地区”和地图画法）。成片不进 Git，上传用的文件在发布套件 <https://press.shapeof.world>。
- 发布文案与全部来源：`DESCRIPTION.md`。
- 屏幕上的数字只来自 `web/facts.js`；画面和配乐共用 `web/timeline.js` 的拍点（128 BPM；沿用 v3 的小节号，`HOLDS` 记录插入和删去的小节，实际 83 小节）。
- 结尾的标志图形：`web/assets/mark-512.png`，取自 `public/assets/brand/kit/`，未改动。

## 重新生成

```
npm install   # 另按 ../README.md 下载中文字体
PORT=5335 node tools/serve.mjs &              # 本地服务
PORT=5335 node tools/render-music.mjs         # 配乐 → music/score.wav（-14 LUFS）
PORT=5335 node tools/render.mjs out/ai-shape-v8.1.mp4 --workers 5 --blur 3   # 成片
PORT=5335 node tools/covers.mjs               # 封面 → out/release/
```

预览：`http://127.0.0.1:5335/web/index.html`（可带声音播放、拖动）。
检查：`PORT=5335 node tools/frames.mjs out/x.webp 51:1 31:5`（v3 小节号:拍，插入的小节用第 5 拍以后）。

## 结构

| 小节（v3 编号） | 内容 |
|---|---|
| 1–6 | 开场：“13 倍更便宜 / 7325 亿更烧钱”对撞（2 小节）；实时计数；片名（小节 3、4、6 已删） |
| 7–16 | 01 人与用量：用户、中国、付费；token 用量（线性）；杰文斯悖论（价格每年便宜 13 倍 / 用量两年涨 330～1500 倍） |
| 17–28 | 02 钱：收入、估值、英伟达、资本开支、阿波罗、瑞典、投入与收入、AI 写代码、押注 |
| 29–38 | 03 模型有多大：参数量（线性，坐标拉远）、MoE、训练数据、算力、成本、人脑、能耗、不公开 |
| 39–50 | 04 能力：METR、FrontierMath、IMO、ARC-AGI-3、最强 vs 最便宜 |
| 51–72 | 05 中美与世界：拔河（10 项，按差距倍数拉动，停在美国一侧）、结论、四个卡脖子的地方（每地一个半小节）、欧洲与主权 AI、“两个超级大国站在四个小地方的肩膀上” |
| 73–79 | 06 物理世界：最大数据中心点亮一座城、94 座加起来、占全国用电、“AI 已经是重工业”；回到开头的问题：五站循环“越转越快” |
| 80–83 | 这就是 AI 的形状（各地知名模型数）、片名卡翻成“世界的形状” |
