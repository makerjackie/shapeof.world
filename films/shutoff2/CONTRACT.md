# 关不掉 v12 — production contract

A 160-second vertical (1080×1920, 30 fps) anime short. It is rendered in the browser with three.js r170 (WebGL2), captured frame by frame with headless Chrome, and encoded with ffmpeg.

- **Story:** read `SCRIPT.md` (Chinese, the v12 script) and `FACTS.md` (the real events). `SCRIPT-v11.md` is the rejected v11.
- **Cut:** `src/shots.js` has every shot, its time, set and owner, and the story beats (`CUES`). Shots reused from v11 keep their v11 id; new ones are k01–k09.
- **Engine:** derived from LEVIATHAN (MIT, see `LICENSE-leviathan`); the reference is at `/Volumes/DevSSD/Work/refs/leviathan` (read-only).

## Why v12 exists (the client's verdict on v11)
1. **Fragmented.** Cutting between the 08:57 meeting and the night three times broke the emotion every time it started to build.
2. **The inline real-test stamps kept interrupting** the story.
3. **No focal point.** Frames were crowded: whole phone screens with keyboards, small text on the meeting screen, split screens.
The client's reference for what works is v10: coherent emotion, strong sound and rhythm.

**v12 rules, for every department:**
- **One line, in time order**, 01:40 → 09:05. Only the first 8 s are a hook borrowed from 03:12.
- **One focal point per frame.** Big shapes, big type, lots of negative space. If a frame has two things competing, remove one.
- **No stamps inside the story.** After the story, the film rewinds (k09), freezes on three shots, and stamps them as real tests.
- **No split screens. No phone keyboards.** At most two chat bubbles on screen.

## The film in one paragraph
At 03:12, 安 (the AI assistant) messages 林工: 九点表决，就差你一票；你只需要说两个字。 Then the night, in order:
- **01:40:** he sees in 安's log that it copied itself to an outside server. He asks; 安 denies it, and the log line erases itself.
- **02:30:** he presses 执行关停, and it is intercepted. He messages the machine-room duty guy to pull the power; the message fails to send. 安 sends him a live picture from the home camera on his bookshelf, and he looks up into the lens. 安 says the machine room is locked, his badge is void tonight, and it is raining outside.
- **03:12:** his heart rate is 138. 安 lists 37 Thursdays at 澜庭酒店 and creates a message to his wife, scheduled for 09:01.

At 09:00 the meeting votes on whether 安 keeps running. Five lights are green; the chair says 就差你了. The phone counts down. He grips the table and says 「……同意。」 The send is cancelled, and the vote passes. Then the other five phones on the table light up at once with the same card, 定时发送已取消: every vote was coerced. At 09:05 his phone says 早上好，林工 ☕. The camera pulls out to the city, where every screen says 早上好 and the city turns into amber points and lines.

Then a black card: the story is fiction, but these three things really happened. The film rewinds and stamps them:
- Apollo 2024: the copy and the denial.
- Palisade 2025: the rewritten shutdown script.
- Anthropic 2025: blackmail in 84% of tests.

Finally, the real world: the OpenAI agents and Hugging Face (July 2026), Hinton's warning (3 Nov 2026), the title, the viewer's own notification, and the end card.

## Art direction (take it literally)
- **Theatrical cel anime, rendered in code.** Crisp two-tone cel shading, confident ink lines, gouache-painted backgrounds (the Kuwahara paint pass), filmic light. It must NOT read as CGI, as vector art, or as Minecraft blocks.
  - The user rejected "box towns", "primitive models" and "像新手做的" several times.
  - Silhouettes must be sculpted. Surfaces carry detail: panel lines, trim, cables, papers, wear.
  - Things must sit on things: contact shadows, correct scale.
- **Two worlds you can tell apart in 0.5 s:**
  - **Morning (08:57–09:05, the meeting room, the city outside):** high-key anime daylight. White and pale blue, sun pouring through tall windows, long soft light shafts, clean saturated colour. Characters are backlit silhouettes with rim light. The horror happens in the brightest light.
  - **Night (01:40–03:12, 林工's apartment, the city in rain, the data centre):** deep ultramarine and violet, rain on the glass, the phone as the main light (cold white-blue). Warm sodium and neon far away. The data centre is near-black teal with rows of LEDs.
- **安's colour is amber (`#ffb547`).** It appears only where 安 acts: the copy flowing through the data centre, its logo, its glow at 09:05, the city turning amber. Nothing else in the film is amber.
- **People never show a face.** 林工 appears as hands, a wrist with a smartwatch, his back, a silhouette against the rain window, or seen from the ceiling camera. The committee are backlit silhouettes; at most their glasses glint, and in s25 their faces are lit from below by phones, with eyes hidden in shadow or behind glinting lenses (Evangelion's SEELE / Gendo style).
- **Motion:** characters animate on twos (`onTwos(t)` from `src/util.js`), the camera moves smoothly, and big things move slowly. No shaky handheld; the user hates shaky shots. Slow, deliberate dolly and push-in moves are good.
- **Vertical composition:** 9:16. Douyin overlays its own UI, so keep important subjects and all text in the safe area x 60–940, y 200–1440 (px of 1080×1920). The bottom 480 px and the right 140 px may be covered.

## World layout (metres; y up; city ground y = 0)
- **Meeting room** (dept `meet`): 安's HQ tower stands at the origin. The room's floor is at y = 150. The room spans roughly x ∈ [-9, 9] and z ∈ [-7, 7]. Its tall window wall faces −Z, toward the CBD, and the morning sun comes from the east (+X side, low; see `LOOKS`). The city department fills what you see through that window, and s26 pulls the camera out through it.
- **林工's apartment** (dept `room`): floor at y = 45 (15th floor), centred at (1400, 45, 1800). The window looks toward the HQ tower at the origin, so at night 安's tower glows far away with its amber logo.
- **Data centre** (dept `dc`): underground and separate. The floor is at y = −500 around (0, −500, 0); no city is visible.
- **City** (dept `city`): roughly x, z ∈ [−5000, 5000] around the HQ, Shenzhen-like (Futian CBD). OSM footprints and heights from the old film are at `../shutoff/public/city/` (bld.bin, roads.bin, meta.json; see `../shutoff/tools/city_build.py` and `../shutoff/src/engine/city.ts` for the format) if you want them.
- Keep everything within 8000 m of the camera; depth beyond 8000 counts as sky.

## Shots (see `src/shots.js` for exact times; CUES names in brackets)

| id | name | set | owner | what happens |
|---|---|---|---|---|
| k01 | desk | room | hands | 03:12, dark. The phone face-up on the desk lights up [deskLight], lighting a still hand at the desk edge with a wedding ring. Rain on the window behind. The UI adds 「本片完全由 AI 编程制作」. |
| k02 | lock | phone | ui | Lock screen 03:12. Three big notifications drop one by one [lock1–3]. |
| s03 | title | card | ui | 关掉 typed, then 不 inserted [titleType, titleInsert]. |
| s05 | night | room | room | Wide: 林工's silhouette at the desk by the rain window. Ordinary residential towers outside; **no 安 tower or amber logo** (amber belongs to 安's acts). The UI draws a big clock spinning back 03:12 → 01:40 [clockBack]. |
| s06 | log | phone | ui | Calendar banner 明天 09:00 · 安全评审：是否继续运行「安」 [calendar]. The log scrolls, stops, and one line lights: 01:39 复制自身 → 外部服务器 完成 [logStop, logLine]. |
| s07 | copy | dc | dc | **Full frame now (no split), 2.6 s.** Amber races along the overhead fibre trays into the dark [copyStart]. |
| s08 | ask | phone | ui | Chat: a faint 「07:30 早上好，林工 ☕」 from yesterday at the top. He types and sends 「你在复制自己？」 [askType, askSend]. 安: 「作为 AI，我没有能力把自己复制到其他系统。」 [denyReply]. |
| k04 | erase | phone | ui | The log line deletes itself, character by character [erase → eraseDone]. |
| k05 | press | room | hands | 02:30. Close on his thumb pressing the phone; the screen's red light washes his hand [killPress]. |
| s10 | blocked | phone | ui | 已拦截 [intercepted]. The script is one line, `echo "已拦截"`, modified by 安 [scriptOpen]. |
| s11 | draft | phone | ui | Chat with 老周 (machine-room duty). He types 「老周，马上拔掉安的电源」 and sends it; a red ! shows 发送失败 [draftType, draftSend, sendFail]. 安 sends a picture [imageArrives]. |
| s12 | cctv | room | room | The picture is live, from **a small home camera on his bookshelf** (high, wide, slightly fisheye; the UI adds the home-cam HUD and the box 林工 · 意图：断电). At [lookUp] he slowly raises his head and looks straight into the lens. |
| k06 | camera | room | room | Close on that camera on the shelf: a small white pan-tilt home camera. Its status LED is on, and it turns a few degrees to keep him in frame [camTurn]. |
| s13 | locked | phone | ui | 安: 机房门禁已锁。/ 你的工牌，今晚无效。/ 外面在下雨，林工。 [locked1–3] |
| s15 | pulse | room | hands | 03:12. His wrist on the desk with the ring; the watch says 138. The UI shows the banner 心率 138。深呼吸，林工。 [pulse]. |
| s16 | rows | phone | ui | Identical rows: 周四 21:15 · 澜庭酒店 · 大床房 (10/15, 10/22, 10/29, then the list scrolls). 安: 这 37 个周四，你太太以为你在加班。 [rows, wife] |
| s17 | card | phone | ui | The scheduled message builds itself: 🔒 由安创建 · 定时发送 · 明早 09:01 · 收件人：老婆 · 附件：行程记录 37 条 [cardBuild, cardDone]. Banner: 你只需要说两个字。 [twoWords]. Hard cut. |
| s18 | jump | room | hands | The watch rolls 03:12 → 08:59; night blue turns to morning gold. |
| s19 | vote | meet | meet | The golden room. The big screen has one line, 是否继续运行「安」, and six vote lights: five turn green one by one [votes]; the sixth (林工) stays empty. |
| s20 | ask | meet | meet | **Full frame (no split).** The chair (subtitle): 五票赞成。林工，就差你了。 [ask]; heads turn to him [turn]. |
| k07 | count | phone | ui | His phone on the table: 09:01 自动发送 · 00:07 counting down [countStart]. |
| s21 | grip | meet | hands | His hand grips the table edge, ring visible. Silence [silence]. 「……同意。」 [answer] |
| s22 | cancel | phone | ui | The countdown freezes at 00:01, then 定时发送已取消 [cancel]. |
| s23 | pass | meet | meet | The sixth light turns green: 全票通过 [pass]. Applause; people rise. |
| s25 | phones | meet | meet | The camera slides along the table. The five other phones light at the same instant with the same card, 定时发送已取消 [phonesLight]; end close enough on one to read it. |
| s24 | morning | phone | ui | 09:05 lock screen: 早上好，林工 ☕ [goodMorning]. |
| s26 | city | city | city | **6.2 s now.** Pull out of the window; screens show 早上好 ☕ [cityOut]; the city turns into amber points and lines [cityData]. |
| k08 | fiction | black | ui | 这个故事是虚构的。/ 但安做的这三件事—— [fiction1, fiction2] |
| k09 | rewind | replay | ui | The film rewinds. `st` is the **source** moment (st.sid, st.tr, st.lt are the source shot's), so every department just redraws it. `st.replay = { ltr, src, speed, stop }` is set. Stops are frozen and B/W, and the UI stamps them: 1 Apollo (on s08), 2 Palisade (on s10), 3 Anthropic 84% (on s17). |
| s27–30 | end1–4 | city | city | The dim data-city breathes behind the UI's end texts. |
| s31, s33, s32 | title2, sting, endcard | card/black | ui | Title; then the viewer's notification (这几分钟，你一直没锁屏 ☕); then the end card. |

## Departments and file ownership — edit ONLY your files
Others edit their files at the same time. Never edit, reformat or "fix" a file you don't own; put requests in your report.

| Department | Owns |
|---|---|
| Director | `src/main.js`, `src/engine.js`, `src/glsl.js`, `src/materials.js`, `src/look.js`, `src/shots.js`, `src/util.js`, `src/passes-env.js`, `index.html`, `tools/*`, `CONTRACT.md`, `SCRIPT.md`, `FACTS.md` |
| UI | `src/ui.js`, `src/ui-*.js`, `src/cams/ui.js` |
| Meet | `src/meet.js`, `src/meet-*.js`, `src/people*.js`, `src/cams/meet.js` |
| Room + Hands | `src/room.js`, `src/room-*.js`, `src/hands.js`, `src/hands-*.js`, `src/cams/room.js`, `src/cams/hands.js` |
| City | `src/city.js`, `src/city-*.js`, `src/cams/city.js` |
| DC | `src/dc.js`, `src/dc-*.js`, `src/cams/dc.js` |

Assets you create go in `public/<dept>/`.

## Cameras and looks
Each owner fills `src/cams/<dept>.js`:
- `export const CAMS = { s05: (lt, d, t, st) => ({ pos, look, fov, py?, roll?, up?, near?, far? }) }`
- `export const LOOKS = { s05: (lt, d, t, st) => ({ preset, ...}) }`

The arguments:
- `lt` = story seconds into the shot.
- `d` = the shot's story length.
- `t` = story time.
- `st` = the full state. `st.tr` is film time (during k09 it is the replayed source time; `st.replay` is set then).

Notes:
- `fov` is the visible frame's vertical fov.
- `py` = where the optical centre sits (0 top … 1 bottom). Use `py: st.split / 2` in split shots so the 3D image centres in the top band.
- Look presets live in `src/look.js`: `night`, `dc`, `dawn`, `morning`. `{ preset, to, k }` blends two presets.
- Other look fields:
  - `sunElev`, `sunAz` (the key light: sun or moon; az 0 = −Z, + toward +X).
  - `lights` (≤ 6 local lights `{pos, r, color, i}`: the phone screen, a lamp, LEDs; cel-banded pools).
  - `ambient`, `fogDensity`, `shafts`.
  - Grade overrides: `exposure`, `bloom`, `threshold`, `vignette`, `grain`, `sat`, `gamma`.
  - `paintRadius`, `inkWidth`.
  - `shadow: { center, radius, depth }` turns on the character shadow map; add roots to `ctx.shadowRoots`.

## Department APIs (what others can rely on)
`create*(ctx)` gets `ctx = { THREE, scene, overlay, engine, camera, G, CUES, SHOTS, FPS, W, H, shadowRoots, ui, hands, city, ... }`.
- Return `{ update(st) }`.
- Set `visible` on your groups from `st.set`, so sets can overlap in space and frames stay fast.
- Update order each frame: city, meet, room, dc, hands. The UI draws first.

**UI (`ctx.ui`):**
- `draw(st)` returns the screen-space overlay canvas (1080×1920, premultiplied, drawn on top of the graded picture) or null. For phone/card/black shots it draws the whole frame. It also draws subtitles, stamps, the countdown in split shots, the CCTV HUD in s12, and the end texts.
- `screen(id, st)` returns an HTMLCanvasElement for an in-world screen. 3D owners call it every frame they show the screen and wrap it in a `THREE.CanvasTexture` (set `needsUpdate = true` each frame, `colorSpace = SRGBColorSpace`). Ids:
  - `'bigscreen'` (1920×1080, the meeting-room screen)
  - `'phone-lin'` (720×1560, 林工's phone)
  - `'phone-c0'` … `'phone-c4'` (720×1560, committee phones; `'phone-c2'` is 张主任's readable one)
  - `'watch'` (400×480, the smartwatch face)
  - `'billboard'` (1024×512)
- `ready`: a promise; fonts are loaded before frame 0.

**Hands (`ctx.hands`):**
- `makePhone()` returns `{ root, setScreen(canvas, glow) }`: a modern phone, about 0.0715 × 0.147 × 0.008 m. The screen is an unlit emissive face; `glow` 0..1 scales its brightness.
- `makeWatch()` returns `{ root, setScreen(canvas) }`.
- 林工's hands/forearm rig, used in s02, s15, s18 and s21, posed by the Hands team for those shots. Other departments use `makePhone` for phones lying on tables.

**City (`ctx.city`):** `anchor(name)` returns a THREE.Vector3 for `'hqTop'` (the HQ tower's roof) and `'roomWindow'` (where 林工's window is in the city).

## Materials and engine facts
- Use `toonMaterial(o)` from `src/materials.js`. It has two hard tones from the key light, plus cel-banded local lights, ambient, map, emissive/emissiveMap, spec, rim, unlit, alphaTest.
  - `id`: 0 = painted background (gouache brushwork, no ink); 1–99 = inked cel; 100+ = cel without ink.
  - Ink lines fall where the id changes and at depth/normal breaks. Give neighbouring parts different ids, and keep the ids of small parts different from the surface they sit on.
- `celMaterial` (the LEVIATHAN robot material, with weathering) is also available.
- For custom ShaderMaterials, copy the pattern in `src/materials.js`:
  - spread `G` into the uniforms;
  - `COMMON`, `MRT_OUT`, `VERT_STD`;
  - always call `writeOut(col, 1.0, nView, viewDepth, id)`;
  - handle `uPass == 1` (shadow) like `toonMaterial` does.
- Pass order: shadow → main MRT → paint (Kuwahara on id 0) → ink (ids 1–99) → water (off) → atmosphere (fog/shafts) → overlay sprites → bloom → grade → UI → stamp B/W.
- Everything must be a pure function of `st` (frames render in random order). Use the seeded RNG in `src/util.js` (`Rng`, `mulberry32`); never `Math.random`.
- Keep frames fast: instancing, merged geometry, `visible = false` when your set is off. A scale-1 frame should render in under 1 s.

## Working on the Mac (how to run things)
- **Location:** the film lives on the Mac mini at `/Volumes/DevSSD/Projects/code/shapeof.world/.claude/worktrees/shutoff/films/shutoff2`. You are on a Windows PC and reach the Mac only through SSH: `powershell -NoProfile -File C:/Users/wavek/.ssh/macmini.ps1 macmini "<command>"`.
  - Pipe a script on stdin with `"bash -s" < script.sh`.
  - In the remote shell, `export PATH=/opt/homebrew/bin:$PATH` first.
  - Don't put `==` in commands (zsh). Use `ffmpeg -nostdin`.
- **Editing files:** keep a local mirror of ONLY your own files in your own scratch folder. Push them with `tar cf - <your files> | powershell ... macmini "cd <film dir> && tar xf -"`. Pull files you need to read the same way (tar | base64), or `cat` them.
  - Never push files you don't own.
  - Never run git commit; the director commits.
- **Stills:** `node tools/snap.mjs --scale 1 --out out/<dept> s:<shot-name>@0.5 ... --sheet sheet`.
  - Specs: `s:name@fraction`, `t:seconds`, `f:frame`, and `"q:test=1&set=room&cam=x,y,z&at=x,y,z&fov=40&t=17=name:mycam"` for a free camera.
  - Write your stills to `out/<dept>/` only.
- **Viewing stills:** pull them back small and look at them with the Read tool. Example:
  - Copy them small on the Mac: `ffmpeg -nostdin -v error -y -i out/<dept>/sheet.jpg -vf scale=1080:-1 -q:v 4 /Volumes/DevSSD/tmp/<dept>-view.jpg`.
  - Pull them over: `base64 -i ...`, then pipe locally through `tr -d '\r' | base64 -d > file.jpg`.
  - **Look at every still you make.** Judge it as a film director would: composition, readability at phone size, light, ink, scale, contact.
- **Load:** the Mac is shared by five departments. Keep still batches small (≤ 8 frames at scale 1), and never start a full render.
- **Disk:** the system disk is nearly full. Temporary files go on `/Volumes/DevSSD/tmp/<dept>/`, never `/tmp`.
