# ukulele · 来源与权利记录

世界 id `ukulele`，catalog 在 `src/data/worlds/catalog/math-signals/ukulele.ts`，`publication` 省略（`making`）。

## 原型与入库

- 来源：项目所有者提供的独立原型「Ukulele Player」（单独仓库 `~/code/games/gita`，原生 JS + three.js r152 全局构建，无构建步骤）。
- 入库日期 2026-10-15，按 `$html-to-world` 流程。原型整个工作树（含当时未提交的改动）按字节复制到被忽略的
  `.local/html-to-world-intake/ukulele/`：`source.tar` 的 SHA-256 为
  `a7a562feb10a9835b017f85c0db3c966c4646b6f80fcbc77c9da76cd767767cf`，逐文件校验和在同目录 `SHA256SUMS.txt`。
  原型 git 头为 `7d4e9a4`，另有 14 个未提交文件。该目录不进 git。
- 扫描结果：无密钥、无私人数据、无任何外部请求（原型完全自包含）。
- provenance 记为 `supplied-prototype`：原型的初始制作模型没有可靠证据，不猜。所有者对自己提供的代码有商业改编权的常驻确认。

## 第三方组件与素材

| 组件 | 原型里 | 这里 |
| --- | --- | --- |
| three.js r152（MIT，`vendor/three.min.js`） | 随包 | 不带入；使用仓库依赖 `three` r183 |
| Caveat 字体（OFL，`fonts/caveat-600.woff2`） | 随包 | 不带入；和弦名用站点已有的 Cormorant Garamond / Manrope |
| 图片、音频、字体 | 无 | 无。纹理（云杉面板、指板、玫瑰圈、光斑）和声音全部是程序生成 |

## 曲目（均为公版）

只使用旋律的音高与节奏（公版作品的事实），不使用任何版本的排版、录音或 MIDI 文件本身；伴奏与指法由 `ukulele-arranger.ts` 生成。

| 曲目 | 作品状态 | 核对依据 |
| --- | --- | --- |
| 卡农 | 帕赫贝尔，17 世纪 | Mutopia Project 的三小提琴版 MIDI，逐音核对后移到 C 调 |
| 绿袖子 | 英格兰民谣 | Mutopia Project 的两份 MIDI |
| 献给爱丽丝 | 贝多芬，1810 | Mutopia Project 的一份 MIDI |
| 送别 | 旋律出自奥德韦（J. P. Ordway）1868 年《Dreaming of Home and Mother》，李叔同填词（歌词本世界不显示） | 通行简谱（1 = G），逐小节对照 1907 年日本同曲填词版《旅愁》的公开 MIDI；日文因字数多拆开的音（第 2、6、9 小节等）合回一个音 |

Mutopia 每首曲子各自标注公版或 Creative Commons；这里没有复制任何一份文件，只核对了音高。

原型的第五首《茉莉花》已移除：它的旋律版本来自一份 Wikipedia 乐谱，是流传最广的现代形态，与 Barrow 1793 年最早记谱的版本不同，原型阶段只按传统民歌处理，没有做过独立核查。第五首待重新选定并单独编配后再加入。
导入的 MIDI 是访客自己的文件：只在浏览器里解析，只存进该访客浏览器的 localStorage（键 `oneworld:ukulele:imports`），不上传，也不随世界分发。导入不会自动开始播放（选文件和拖放不一定算音频所需的用户手势，Safari 尤其如此），访客点歌曲才会出声。

导入器按“访客文件是不可信输入”处理（`ukulele-midi.ts`，`ukulele-midi-hostile.test.ts`）：变长数最多 4 字节；事件长度必须落在音轨之内；时间分辨率必须为正；文件不超过 1 MB、不超过 60,000 个音、旋律不超过 4,000 个音、不超过 600 小节、不超过 15 分钟，超限直接拒绝。编排和音色渲染都在主线程同步完成，所以这些上限是必要的；没有它们，一个构造过的文件可以让标签页永久卡死（评审时复现过，已修复）。

## 科学主张与来源（`ukulele-geometry.test.ts` 把它们变成了可执行检查）

| 主张 | 来源 |
| --- | --- |
| 弦缩短，音升高；弦本身几乎不出声，声音靠琴身 | UNSW Music Acoustics, *How does a guitar work?* |
| 平均律下 d = s − s/2^(n/12)，常数 17.817，第 12 格在弦长一半处 | Liutaio Mottola, *Calculating Fret Positions* |
| 半音的频率比是 2 的 12 次方根 | Wikipedia, *Equal temperament* |
| 定弦 G4–C4–E4–A4（回旋定弦）；音乐会尺寸弦长约 38 cm、15–18 品 | Wikipedia, *Ukulele* |

模型边界（也写在 catalog `fieldNotes`）：声音是物理建模合成，琴身共振是按录音调的工程模型，不是某把琴的实测响应；视觉上的弦振动放慢约 100–200 倍、幅度略夸大；沿弦来回的光点只示意两个波被端点反射，速度未按频率换算；琴格按理想公式摆放，未做真实乐器的校准补偿；手指是光点。

## 从 three r152 移植时改变的行为（改渲染前先读）

原型在 r152（旧的光照模式）上调好；仓库是 r183。已逐帧对照，同一时刻的平均颜色相差约 2%。

- **灯光单位：** r152 的旧模式把所有灯的强度乘 π，并按 `(1 − d/distance)^decay` 衰减；r183 只有物理单位。这里所有灯 ×π，聚光灯和内腔点光源改用 `decay = 0` 加固定衰减系数（`KEY_FALLOFF`、`INNER_FALLOFF`）。
- **环境光强度：** r163 起，材质没有自己的 `envMap` 时会忽略 `material.envMapIntensity`，改用 `scene.environmentIntensity`。这里给每个受光材质显式设置 `envMap`（`UkuleleScene.applyTheme` 里的 `litMaterials`），保住原先调好的反射强度。
- **阴影：** `PCFSoftShadowMap` 在 r183 已弃用并会报警，改用 `PCFShadowMap`。乐器静止，阴影图只在开头和换外观时渲染几帧。
- **WebGL 上下文：** 控制器自己创建 `<canvas>`，卸载时释放上下文。React StrictMode 会在同一个元素上挂载两次 effect，复用已丢失上下文的 canvas 会让 three 在读取能力时崩溃。

## 调试与海报钩子

`window.__uke`（世界挂载时存在，卸载时删除）：

- `poster()`：海报帧，《送别》最后一段副歌的第 10 品旋律音与低音同时亮起，英雄机位，静音静止。`scripts/capture-world-posters.mjs` 里有对应的 `ukulele` 条目。
- `freeze(songId, seconds, preset)` / `unfreeze()`：静止在歌曲的某一刻（镜头预设 0–4），用于复核帧。
- `setLook('amber' | 'neon')`：切换外观（会记住）。

竖屏海报是真实的 390×844 捕获，另存为 `scripts/poster-sources/ukulele-mobile.webp` 并登记在 `scripts/generate-mobile-posters.mjs` 的 `sourceOverrides` 里，以免批量重新派生时被横版母图的居中裁切覆盖。

## 与主线的关系

- 世界自带声音：catalog `audioPolicy: 'world-owned'`，`src/data/generated/world-music.json` 和 `world-soundtrack.json` 里已由 `pnpm data:world-music` 生成对应条目；壳层的默认底乐因此让位。
- 世界摘要、sitemap、World Artifact 由主线命令生成（`pnpm data:world-artifacts`、`node scripts/generate-sitemap.mjs`），晋升 `public` 是集中策展的决定，不在这个切片里。
- 原型仓库里的短视频导出工具（`tools/make-video.mjs`，用 headless Chrome 逐帧渲染并离线合成音频）没有迁入：它依赖原型页面的 `?short=1&capture=1` 模式，属于发布工具，不属于世界本体。
