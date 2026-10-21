# DeepSeek 这次开源的，到底是什么？

9:16 竖屏科普短片。成片：`output/deepinfer-open-source.mp4`。

- 1080×1920，30 fps，97.46 秒
- 简体中文字幕（烧录），中文 AI 旁白，无真人出镜
- 120 BPM 程序合成配乐与音效，成片 -14 LUFS
- 片尾按本片风格制作：片名 → 世界的形状 → 品牌标识 → 看见世界如何运行 → 制作 MakerJackie

## 一句话

DeepSeek 这次开源的是一套叫 DeepInfer 的推理框架，不是新模型；它决定的是“多少人用得起 AI”，而不是“AI 有多聪明”。

## 结构

| 时间 | 段落 | 在讲什么 |
|---|---|---|
| 0:00 | 钩子 | 又开源了，但这次不是模型 |
| 0:05 | 名字 | DeepInfer 是什么 |
| 0:08 | 比喻 | 模型是大脑，推理框架是调度系统 |
| 0:16 | 难点 | 一万人同时提问，就是一场调度战争 |
| 0:25 | 开源 | GitHub、Apache-2.0、看/改/商用 |
| 0:33 | 配套 | deepseek-recipe 把 API 请求翻译成模型输入 |
| 0:41 | 里面 | 算子、分布式、推测解码、异步调度、结构化输出、双硬件 |
| 0:51 | 意义 1 | 成本：同样的卡和电，更多 token |
| 1:00 | 意义 2 | 控制权：搬进自己的机房，数据不出门 |
| 1:07 | 意义 3 | 选择权：不只英伟达，也能跑昇腾 |
| 1:14 | 边界 | 不是一键可用；开源不等于免费 |
| 1:25 | 收尾 | 模型决定上限，推理决定普及 |
| 1:34 | 片尾 | 品牌收束 |

## 重新生成

在 `films/deepinfer/` 下：

```sh
# 1. 旁白（需要 mj-voice 的凭证）
node tools/tts.mjs deepinfer-open-source

# 2. 由旁白时长生成时间线
node tools/timeline.mjs deepinfer-open-source

# 3. 配乐、音效、混音
python3 tools/music.py deepinfer-open-source
python3 tools/mix.py deepinfer-open-source

# 4. 逐帧渲染
node tools/render.mjs deepinfer-open-source

# 5. 合音轨
ffmpeg -i cuts/deepinfer-open-source/output/video-silent.mp4 \
  -i cuts/deepinfer-open-source/output/audio/mix-norm.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart -shortest \
  cuts/deepinfer-open-source/output/deepinfer-open-source.mp4
```

静帧：`node tools/still.mjs deepinfer-open-source --at 1.5,30,60`；封面：`--cover --at 4.6`。

## 检查记录

- 完整解码一遍：通过。
- 响度：-14.0 LUFS，真峰值 -1.3 dBFS。
- 读字审计：`output/readtime.txt`。29 条字幕中 7 条短于纯阅读标准；这 7 条都有同步旁白，并且画面有同义大字，没有静默阅读缺口。
- 抽帧检查：钩子、调度、开源、成本、边界、片尾均无安全区裁切；字幕没有单字孤行。
- 未验证：没有在真机抖音/视频号上传后复查二次压缩；没有做英文版。
