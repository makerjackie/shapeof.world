# DeepSeek 这次开源的，到底是什么？ · 53 秒快剪

横版、无旁白、无字幕轨。靠大字、切镜和 120 BPM 的配乐推进。

- 1920×1080，16:9，60 fps，53 秒
- 十个段落，平均 4–5 秒一段；重要句子只停 1.5–2.5 秒
- 配乐/音效程序合成，成片 -14.4 LUFS
- 片尾按品牌规范做进片子自己的风格

成片：`output/deepinfer-fast-16x9.mp4`
封面：`output/stills/cover-002.60.png`

## 结构

| 时间 | 段落 | 一句话 |
|---|---|---|
| 0:00 | 钩子 | 又开源了 → 不是模型 → 是引擎 |
| 0:05 | 分清 | 模型是大脑，推理框架是调度 |
| 0:11 | 战争 | 1 个人 vs 10,000 个请求，三连问 |
| 0:17 | 开源 | GitHub、Apache-2.0、看/改/商用 |
| 0:23 | 配套 | deepseek-recipe 是翻译器 |
| 0:25 | 成本 | 同样的电，更多 token，更便宜 |
| 0:30 | 控制权 | 数据不出门，不被锁死 |
| 0:34 | 选择权 | 不只一条路 |
| 0:37 | 边界 | 不是一键可用，开源 ≠ 免费 |
| 0:44 | 收尾 | 让智能，用得起 |
| 0:49 | 片尾 | 品牌收束 |

## 这次为什么更快

- 每个内部信息点都做成硬切（0.5–1.5 秒），只有结论句停 2 秒以上。
- 场景切换带 4 帧白闪 + 1.055→1.0 的镜头冲拳；内部大字用 `slam` 弹入。
- 砍掉长解释：recipe、六项特性、边界细节都压缩成一个画面或一句大字。
- 音乐从第一拍就进，不留慢引子；边界段抽掉鼓，再把“开源 ≠ 免费”砸回来。
- 大字只保留 2–6 个字，一次只给一个信息。

## 重新生成

```sh
python3 tools/score-fast.py
python3 tools/mix-fast.py
node tools/render.mjs deepinfer-fast --w 1920 --h 1080
ffmpeg -i cuts/deepinfer-fast/output/video-silent.mp4 \
  -i cuts/deepinfer-fast/output/audio/mix-norm.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart -shortest \
  cuts/deepinfer-fast/output/deepinfer-fast-16x9.mp4
```

## 检查记录

- 完整解码一遍：通过；3180 帧，53.000 秒。
- 响度：-14.4 LUFS；真峰值约 -1.4 dBFS。
- 首帧：标题完整可见，不是黑帧/闪白帧。
- 抽帧检查：钩子、模型/引擎、调度三连问、开源三连、翻译器、成本、机房、双芯片、边界、收尾、片尾都检查过安全区。
- 已修：recipe 的 token 图标压字；close 的大字残影；成本字压进度条。
- 未验证：没有在 B 站/YouTube 上传后复查二次压缩；没有做英文版。
