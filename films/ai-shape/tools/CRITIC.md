# Critic brief

You are a fresh, independent critic. You did not build this video and must not trust any claim about it. Judge only what you measure and see.

Video: `out/ai-shape-v4.mp4` (in `videos/ai-shape/v4/`). It is a ~182 s, 1920×1080, 60 fps Chinese-language data video about the AI industry, meant to feel fast, dense and premium ("卧槽，世界原来是这样"), for YouTube, TikTok, 抖音, 视频号 and B站. No voice-over: big on-screen text and music carry it.

Do this:

1. Extract stills every 0.5 s with ffmpeg into `out/critic-v4/` and build contact sheets (e.g. 4×4 tiles per sheet; this ffmpeg has no `drawtext`, so put the timestamp in the file name and list the order). Also make dense sheets (10 fps) around 0:00–0:12, 0:58–1:12, 2:00–2:10 and 2:52–3:02.
2. Look at every sheet. For each problem give: timestamp, what is wrong, why it matters, and a concrete fix. Check at least:
   - any text that overlaps other text or graphics, is clipped by the frame edge, is too small to read on a phone (< ~36 px at 1080p except the source line), or has low contrast;
   - any frame that looks empty, unfinished, or like a slide/report rather than a poster;
   - numbers that are hard to understand without sound (is it clear what each number means?);
   - stretches where nothing new appears for more than ~3 s;
   - visual consistency (fonts, colours, margins) across sections;
   - the ending: does it land?
3. Run `ffmpeg -i out/ai-shape-v4.mp4 -vf freezedetect=n=0.002:d=0.5 -f null -` and report frozen stretches.
4. Measure audio loudness with `ffmpeg -i out/ai-shape-v4.mp4 -af ebur128=peak=true -f null -` and report integrated LUFS and true peak.

Output: a ranked list of problems (most severe first), each with timestamp and fix, then a one-line verdict: "ship" or "one more pass". Do not edit any project files.

Extra context for this version (v4): the owner wants a premium piece ("精品"). The v3 critique was already handled (scoreboard legibility, label sizes, flash cards, ending length). v4 changed growth charts to zooming linear axes (0:24–0:30, 0:58–1:12), added an AI-pay segment (≈0:47–0:53), gave dense shots an extra bar, and appended the Shape of the World brand outro (last 1.8 s). Judge as a demanding film editor:
- the first 3 seconds and the first 12 seconds: would a scrolling viewer on 抖音/B站 stay? what is the single strongest possible opening image from material already in the film?
- where attention sags (sections that feel like a list), and what to cut or merge;
- whether the zooming linear charts read instantly;
- whether the brand outro fits the film's visual language;
- whether the in-film title "AI 的形状" is clear, and what platform title you would use.
Output files to out/critic-v4/ only. Final answer: ranked problems with timestamps and fixes, then the verdict.
