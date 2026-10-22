# 最会用 AI 的人，在用 AI 干什么

约 3:02、1920×1080、30fps 的中文数据片，无旁白。

- **论点**：最会用 AI 的人，只做两件事：出题，阅卷。答题，全交给 AI。
- **主道具**：一张三栏试卷。题和阅归人（纸色、墨色），答归 AI（AI 紫）。
- **那一个发现**：答题已经不缺了，缺的是阅卷。2026 年 5 月，一份 AI 证明经 9 位数学家阅卷，成了里程碑。10 月，372 份 AI 证明一次放出，题库维护者说"还没认真看过任何一份"，并暂停收稿。
- **结尾**：落在"答案会越来越便宜。出题和阅卷，留给人。"，片名翻成"世界的形状"。

按 `STYLE.md` 做：Remotion 管线、系列配色和字体、左上品牌角标、来源 → 制作 → 品牌的固定片尾。

- 计划：`PLAN.md`。剧本和逐镜头文字：`SCRIPT.md`。
- 调研：`research/00-verified.md` 是上片数字总表，每条都复核过原始来源。`research/01`–`06` 是分头收集的底稿，带链接。
- 发布文案和来源：`DESCRIPTION.md`。

## 配乐

《千年之后（氛围版）》，和乐府，3:01，取自 <https://music.01mvp.com/>，和 `films/ai-real-cost` 是同一首。音频不进 Git，渲染前先下载：

```bash
curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a
```

整首从第 0 小节放到结尾，中间不剪（STYLE.md 三、5），片中第 b 小节就是曲子第 b 小节。拍点沿用 `films/ai-real-cost` 测得的网格：111.62 BPM，第一拍 0.487 s（`src/timing.ts`）。

小节能量（`tools/beats.py`）：前奏 0–8，主段 8–40，间奏 40–48，主段 48–64（48 是最大的一次重进），高潮 64–76，收尾 76–80，淡出 80–84。

重新生成频谱条和背景脉动：

```bash
ffmpeg -i public/music.m4a -ac 1 -ar 22050 out/music-mono.wav
python tools/spectrum.py out/music-mono.wav src/audio.json
```

## 重新生成

```bash
npm ci
npm run studio                       # 预览，选 Film
npm run render                       # 成片 → out/ai-users.mp4
node tools/stills.mjs out/s 0 395    # 指定帧的审片截图（半分辨率）
node tools/readtime.mjs              # 读字审计
```

字体（Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono，均为 SIL OFL 1.1）由 `@remotion/google-fonts` 在渲染时加载，需要联网。标志 `public/mark-disc.png` 是 `public/assets/brand/kit/mark-512.png` 按圆形裁出透明边，球体本身没有改色。

## 结构

| 小节 | 场景 | 唯一的结论 |
|---|---|---|
| 0–2 | 结论 | 最会用 AI 的人，只做两件事：出题，阅卷（第一帧就是整句） |
| 2–6 | 证据 | 80 年前的题，AI 答，9 位数学家阅卷 |
| 6–8 | 三道题 | AI 一天答多少？哪些行业这样干？人凭什么只剩两头？ |
| 8–10 | 片名 | 最会用 AI 的人，在用 AI 干什么 · 世界的形状（试卷封面） |
| 10–22 | 01 答卷有多厚 | 一个人加约 100 个 AI，30 天 130 万美元；一天约 4.6 万部《红楼梦》；豆包两年 1500 倍 |
| 22–40 | 02 各行各业 | 22 张答卷四轮砸下，最后堆成一堆：人出题，AI 答，人阅卷 |
| 40–44 | 公道话 | 大多数活，还不能整件交出去 |
| 44–48 | 差距 | 大多数人在"问"AI，最会用的人在"考"AI |
| 48–54 | 那一个发现 | 答题已经不缺了，缺的是阅卷（配乐最大的一次重进） |
| 54–64 | 03 先造阅卷 | 先造好裁判，16 个 AI 才能一起答；并行、过夜；差别在出题和阅卷的人 |
| 64–76 | 升华 | 我们练了十几年答题；最难的答题考试 AI 也拿了金牌；剩下两门课；答案会越来越便宜，出题和阅卷留给人 |
| 76–84 | 片尾 | 来源 → 制作 → 品牌卡 |
