# 一人公司（OPC）的形状

3:57、1920×1080、30 fps 的中文短片，无旁白。重做自《独立开发者的形状》（`films/indie-dev`），旧片对照最新规范的问题清单见 `AUDIT.md`。v7 按作者看完 v6 的意见重搭：讲清楚一个人开公司能不能赚钱、数量涨了多少、多少人赚到、以后可不可行。

- 故事：`STORY.md`（v2）；剧本：`SCRIPT.md`（v7，含冷读后的改动）；调研：`research/RESEARCH.md`（核过的数字，v7 和 v6 两轮）、`research/grok/`（grok 四路深度检索的原始输出）、`research/ZHIHU-NOTES.md`（知乎 37 个问题、505 个回答，只作观点参考）、`research/coldread/`。
- 发布文案和来源：`DESCRIPTION.md`。

## 画面

一座夜里的集市（three.js，在 Remotion 里逐帧同步渲染）：每个摊位是一家一人公司，招牌写着它卖什么（`src/world/market.ts` 的 `SIGNS`）。近处三条街是摊位实体（桌子、笔记本、灯、招牌；煎饼车），远处 10 万多个摊位只画灯；街区之间是低矮的楼。灯的亮度跟着每个摊位的"生意"（幂律分布）：`equal` = 1 时盏盏一样亮，= 0 时是长尾。客人是街上移动的光点（`src/film/crowd.ts`），不画人。屏幕等平面物件用 CSS `matrix3d` 贴在 3D 世界里（`quadMatrix`）。

**光柱和玻璃**（v7 的主视觉，`src/film/shape.ts`）：每个近处摊位头顶一根光柱，高度是一年的收入（1 米 = 5,000 美元），分布按美国国税局 2020 纳税年度个人独资经营的营业收入分组表画（组内对数插值，亮的摊位排得高）；"以前的形状"是示意：所有柱顶都在地板和天花板两块玻璃之间。玻璃是一块块瓦片拼成的水平面（`GLASS_VERT/FRAG`），能碎（瓦片翻转飞走）、能一块块亮起来（结尾煎饼车下的地板）。光柱是绕竖轴转向镜头的细条（`PILLAR_VERT/FRAG`），远了不细于 1.8 像素、只变暗不变粗。全片不出现二维码（短视频平台不允许，假的也不行）。

- `src/world/`：`market.ts`（布局，种子固定）、`engine.ts`（场景和后期：泛光、移轴、调色）、`shaders.ts`、`camera.ts`。
- `src/film/`：`state.ts`（每一帧的镜头和世界）、`Film.tsx`（字和物件）、`props.tsx`、`ui.tsx`、`Cover.tsx`。
- 时间都按配乐小节写：`S(bar)` = 0.5 + 2 × bar 秒（`src/timing.ts`）。

## 配乐

沿用《独立开发者的形状》的原创曲，代码合成：`music/score.js`（同一套音色、和声、旋律，段落表重排成 91 小节），`node tools/render-music.mjs` → `public/score.wav`（不进 Git）。

## 生成

```bash
npm ci                                   # 或从别的片子克隆 node_modules
tools/fonts.sh                           # 字体子集 → public/fonts/
node tools/render-music.mjs              # 配乐 → public/score.wav
COMP=Lab node tools/stills.mjs out/lab 0 1 2   # 看景
node tools/stills-safe.mjs out/s 300 900 # 审片截图（半分辨率，坏帧只报告不中断）
tools/render_master.sh opc               # 成片 + 母带 → out/opc.mp4（−12 LUFS，≤ −1 dBTP）
node tools/covers.mjs                    # 封面 → out/covers/
```

## 技术坑

- **泛光把 NaN/无穷大抹成大白团**：楼房着色器偶发出无穷大值，`UnrealBloomPass` 把它们抹成屏幕上 100 多像素的白团，而且只在某些机位出现。排查办法：关泛光（白团消失）→ 逐个隐藏物体（隐藏楼房后消失）。修法：着色器输出前 `if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);` 再 `clamp`；不要对可能为负的数用 `pow()`。
- **RoundedBoxGeometry 没有索引**：和 BoxGeometry 合并前先 `toNonIndexed()`。
- **zsh 里 `$F` 不分词**：传一串帧号要写 `${=F}`。
- **sin() 哈希会闪**：`fract(sin(dot(p, …)) * 43758.5)` 对大输入精度不稳，插值来的 varying（法线、每个摊位的种子）又带 1e-7 的误差，结果在相邻帧、两次渲染之间翻转：一扇窗隔帧亮灭，收款码图案逐帧变。改用不带 sin 的哈希（Dave Hoskins），输入先取整（`floor(vSeed * 1000.0 + 0.5)`、法线四舍五入成 -1/0/1）。是靠"整片渲两遍、逐帧算 PSNR"抓到的：内容没变的段落出现 27 dB 的帧就要查，修好后最差 46 dB（只剩光晕和颗粒的噪声）。
