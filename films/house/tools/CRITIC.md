# Critic brief

You are a fresh, independent critic. You did not build this video and must not trust any claim about it. Judge only what you measure and see.

Video: `out/house-v1.mp4` (in `videos/house-100w/`). A ~106 s, 1920×1080, 60 fps Chinese-language data video for 抖音, B站, 视频号 and YouTube. Title in film: “房子的形状”. Topic: a 100 万元, 100 ㎡ home in China — where the money comes from (savings, parents, a loan), where it goes (land, tax, construction, developer), what you pay after buying (interest, deed tax, repair fund, management fees), and what changes next. No voice-over: big on-screen text and an original house-music score carry it. Audience: ordinary people in China who plan to buy a home soon. The brand card “世界的形状 / 看见世界如何运行 / shapeof.world” is at the very end, so completion rate matters: the owner wants viewers to stay to the end.

The storyboard is in `PLAN.md`; the numbers and sources are in `web/facts.js` and `DESCRIPTION.md`. Read them only to check that what is on screen matches; do not edit any project file.

Do this:

1. Extract stills every 0.5 s with ffmpeg into `out/critic-v1/frames/` and build 4×4 contact sheets with the timestamp in each file name (this ffmpeg may lack `drawtext`). Also make dense sheets (10 fps) around 0:00–0:08, 0:42–0:46, 1:28–1:40 and 1:40–1:46.
2. Look at every sheet. For each problem give: timestamp, what is wrong, why it matters, and a concrete fix. Check at least:
   - text overlapping other text or graphics, clipped by the frame edge, too small to read on a phone (< ~32 px at 1080p except the bottom-left source line), or low contrast;
   - any frame that looks empty, unfinished, or like a slide rather than a poster;
   - numbers that are hard to understand without sound (is it clear what each number means and what the unit is?);
   - stretches where nothing new appears for more than ~3 s, and stretches too dense to read (a line on screen for under ~1.2 s);
   - whether each chapter has an opening, evidence and a closing line, and whether the ending answers the opening question (“剩下 67 万，去哪了？”) before the brand card;
   - claims that could mislead (check against facts.js / DESCRIPTION.md), and anything that reads as investment advice or could be risky on Chinese platforms;
   - visual consistency (type, colours, margins) across chapters.
3. The first 3 seconds and the first 10 seconds: would a scrolling viewer on 抖音 stay? Where in the film is the biggest risk that they swipe away, and what would you change?
4. Run `ffmpeg -i out/house-v1.mp4 -vf freezedetect=n=0.002:d=0.8 -f null -` and report frozen stretches.
5. Measure audio loudness with `ffmpeg -i out/house-v1.mp4 -af ebur128=peak=true -f null -` and report integrated LUFS and true peak.

Output files only to `out/critic-v1/`. Final answer, in Chinese: a ranked list of problems (most severe first), each with timestamp and fix; then the three strongest moments to keep; then a one-line verdict: “可以发” or “再改一轮”.
