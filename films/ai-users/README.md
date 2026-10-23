# 最会用 AI 的人，在用 AI 干什么

约 3:39、1920×1080、30fps 的中文数据片，无旁白。v2（2026-10-23）：v1 太快、太满，被打回；v2 改成一条主线讲透几个人，其余例子只铺一屏全景。

- **论点**：最会用 AI 的人，只做两件事：出题，阅卷。答题，交给 AI。
- **主道具**：一张三栏试卷。题和阅归人（纸色、墨色、金框），答归 AI（AI 紫）。
- **主线**：医生 → 程序员 → 全景"不只是他们" → 英国政府（阅卷比答题还久）→ 一道 80 年的数学猜想（372 份证明没人阅，题库暂停收卷）。
- **那一个发现**：答题已经不缺了，缺的是阅卷。落在 B 曲第 4 小节的重进上，之前音乐停一小节。
- **结尾**：答案会越来越便宜；会出题、会阅卷的人，不会。片尾卡：世界的形状，MakerJackie。

按 `films/DIRECTOR.md` 做。

- 计划和音乐网格：`PLAN.md`。剧本和逐镜头文字：`SCRIPT.md`。
- 调研：`research/00-verified.md` 是上片数字总表，每条都复核过原始来源。`research/01`–`06` 是分头收集的底稿，带链接。
- 发布文案和来源：`DESCRIPTION.md`。

## 配乐和声音

全部来自自己的曲库 <https://music.shapeof.world/>（`catalog.json`）：

- A《隐秘长廊 · 探索》（scene-game-minimalism-exploration）：90 BPM，第一个强拍 1.011 s。第 16–19 小节放两遍。
- B《温暖电路 · 90》（scene-soul-90）：100.36 BPM，第一个强拍 0.103 s。第 0–19 小节，停一小节，再从第 4 小节重进。
- 音效和环境声（CC0）：见 `tools/fetch-audio.sh` 里的清单。

音频不进 Git，渲染前先下载：

```bash
bash tools/fetch-audio.sh     # → public/audio/*.mp3, *.wav
```

网格和剪点在 `src/timing.ts`，怎么测的见文件头的注释和 `tools/music.py`。

## 重新生成

```bash
npm ci
npm run studio                       # 预览，选 Film
npx remotion render Film out/ai-users-raw.mp4 --crf=20 --audio-bitrate=192k
node tools/covers.mjs                # 封面 → out/covers/cover-16x9.jpg、cover-3x4.jpg
node tools/stills.mjs out/s 0 395    # 指定帧的审片截图（半分辨率）
node tools/readtime.mjs              # 读字审计：直接读各场的 <Say>
```

渲染出来的混音真峰值会过 0 dBTP，交片前过一道限幅（见下面"发布"）。

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。标志 `public/mark-disc.png` 和 `public/assets/brand/kit/mark-disc.png` 是同一个文件。

## 结构

| 秒 | 场景 | 讲清楚什么 |
|---|---|---|
| 0–18.8 | 开场 | 这张卷子是 AI 答的；出题和阅卷的是人 |
| 18.8–45.4 | 医生 | AI 听、起草病历；医生读完再签；省的时间不多，问诊变好了 |
| 45.4–77.4 | 程序员 | 约 100 个 AI；每天 4.6 万部《红楼梦》的字；877 万元账单；他只派活、定合格标准 |
| 77.4–93.4 | 全景 | 银行、工厂、农田、学校……十五张卷子，同一种分工 |
| 93.4–114.8 | 转折 | 答卷多了谁来改？英国：AI 2 小时，专家复核 22 小时 |
| 114.8–165.0 | 数学 | 80 年的猜想被 AI 推翻、9 人核验；372 份证明没人看过，暂停收卷；法庭 2,202 起 AI 编造 |
| 165.0–172.2 | 发现 | 答题，已经不缺了。缺的是阅卷 |
| 172.2–186.5 | 我们 | 大多数人在问 AI 要答案：学生和考官 |
| 186.5–215.2 | 升华 | 十几年练答题；AI 拿了金牌；剩下两门课；答案会越来越便宜 |
| 215.2–218.6 | 片尾卡 | 世界的形状 · MakerJackie |
