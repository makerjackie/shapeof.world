# 中国人口 1949 → 2025（竖屏，抖音）

The user's brief (2026-11-01): make a film with the same rhythm and quality as 湾林's 《从纳斯达克100看美股这41年 | 特效数据可视化》
(Douyin 7702822306913078547, 3:52, 1080×1920), with the topic changed to population. It should be packed with history and
built for TikTok/Douyin safe margins.

## What we took from the reference (method, not material)

- One protagonist: a glowing line with a ticking headline number (top left), a top-5 side panel (top right), and a date that runs.
- Event callouts with a tag chip, big ± numbers, lightning on crashes, fireworks on peaks, and a red frame for "交易暂停".
- Cold open at the most dramatic moment, then a rewind ("回到 2000 … 1985") to the start.
- The ending zooms out to the whole history, then shows a ranking table, then the end card.
- Sound: the reference uses three Brazilian phonk tracks (Shazam: BARRETE! / COLLAR! / SLAVA FUNK!), about 130 BPM, with cowbell and distorted 808s.
  We don't use those tracks. `tools/score.py` synthesises an original phonk-style score (130 BPM, F minor; no samples)
  cut to the picture, with every hit placed from the film's own cues. Its band balance was matched to the reference with `tools/bands.py`.

## Our film

- The chart shows births (red/green yearly columns plus a white line) against deaths (blue line). The header shows total population (万) and the year's natural increase.
- The panel shows the world top 5 (UN WPP 2024).
- Cold open: 2022, deaths pass births → "上一次这样，是哪一年？" → rewind → 1949.
- Story beats: 1950s mortality halves; 马寅初; 1959–61 (1960 deaths > births, −1000万); the 1963 peak of 2959万; 9 years above 2500万;
  1971 计划生育; 1980 公开信; 1982 基本国策; the 1987 echo peak; ageing in 2000; the flat 2000s; 单独/全面二孩; 2020 −18%; 三孩; the 2021 peak;
  2022 deaths > births again; India passes China; 2025's 792万 is the lowest.
- Ending: −73% (1963 → 2025), total population plus the UN projection to 2100 (≈6.3亿 ≈ 1956), world top 10 2025 → 2100,
  then "你出生那年，是哪一根？", then the end card.

## Build

```
npm install
python3 tools/data.py                 # src/data.json
node tools/cues.mjs                   # out/cues.json (events for the score)
~/.venvs/shapeof-films/bin/python tools/score.py   # public/score.wav
node tools/stills.mjs out/st 1 24 76  # review stills by bar
tmux new -d -s render-population 'bash tools/render.sh > out/render.log 2>&1'
```

Everything is timed in bars (130 BPM, 1 bar = 1.846 s): `src/plan.ts` holds the year cursor, the camera and every event.
