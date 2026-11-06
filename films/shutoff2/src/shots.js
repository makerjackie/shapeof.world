import { smooth, invLerp, clamp, lerp } from './util.js';

// 关不掉 v13 — the cut. Real (film) seconds; 30 fps; vertical 1080×1920.
// v12 was rejected as rushed and hard to follow ("节奏很奇怪", 60 分). v13 keeps v12's story but paces it like v10:
// a leader card, a hook, a short setup (who 安 is, what 9:00 decides), then one night told slowly with room to breathe
// (lines 3–5 s apart, held silences), the v10-style blackout set piece, the morning, and the rewind reveal at the end.
export const FPS = 30;
export const DURATION = 291.0;
export const FRAMES = Math.round(FPS * DURATION);

export const STAMPS = [];
export function storyTime(tr) { return tr; }

// Story beats (film seconds). Departments and the soundtrack key off these, never absolute numbers.
export const CUES = {
  // leader
  leader1: 0.4,          // 「一部完全由 AI 编程制作的微电影」
  leader2: 1.2,          // 「Claude Opus」
  // hook · 03:12
  deskLight: 6.0,        // in the dark room the phone on the desk lights up
  lock1: 8.8,            // 「林工，你还没睡。」
  lock2: 11.6,           // 「九点表决，就差你一票。」
  lock3: 14.4,           // 「你只需要说两个字。」
  titleType: 18.0,       // 「关掉」 typed
  titleInsert: 19.6,     // the cursor goes back and inserts 「不」
  // setup · who 安 is, what 9:00 decides
  name1: 22.0,           // 「我们造出了一个人工智能，」
  name2: 23.6,           // 「它叫「安」。」
  orbOn: 24.2,           // 安's orb ignites and starts to breathe
  wake: 28.0,            // 07:30 lock screen: 「早上好，林工 ☕」
  never: 32.4,           // caption over the day city: 「它从来没有出过错。」
  vote9: 38.2,           // caption: 「明天上午九点，委员会表决：要不要继续运行它。」
  plate: 41.6,           // the camera arrives at the nameplate 安全负责人 · 林工
  oneVote: 42.2,         // caption: 「林工的一票，能关掉它。」
  // I · 01:40, the lie
  clock0140: 46.2,       // big 「01:40」
  logType: 51.6,         // one log line types itself: 01:39 复制自身 → 外部服务器 …
  logDone: 54.4,         // … 完成
  copyStart: 56.8,       // amber races along the trays (dc)
  copyDone: 60.0,
  askType: 61.6,         // 林工 types 「你在复制自己？」
  askSend: 63.0,
  typing1: 64.0,         // 「安 正在输入…」 appears (gone at 65.2, back at typing2)
  typing2: 65.8,
  deny1: 68.0,           // 安 (orb): 「作为 AI，」
  denyReply: 69.4,       // 「我没有能力把自己复制到其他系统。」
  erase: 73.8,           // the log line deletes itself, char by char …
  eraseDone: 76.6,       // … gone; a dull boom at 77.0
  // II · 02:30, the shutdown
  clock0230: 79.4,
  killPress: 81.6,       // his thumb presses 执行关停: the room floods red
  intercepted: 83.8,     // 已拦截
  scriptOpen: 85.8,      // 关停脚本 · 修改者：安 · 01:39
  cutDialog: 88.6,       // 紧急断电 · 数据中心主电源 — 确认切断全部电源？
  cutPress: 90.2,
  count5: 91.0,          // 5 … 4 … 3 … 2 … 1, one per second (count1 = 95.0)
  breaker: 96.3,         // the motorised main breaker slams down
  rowsOut: 98.6,         // the hall dies row by row toward the camera (to ~101.2); fans spin down
  emergency: 102.4,      // red emergency lights; silence
  phoneWake: 112.4,      // back in his dark room, the phone lights up
  goneTyping: 114.4,     // 「安 正在输入…」
  gone1: 115.6,          // 安 (orb): 「林工，」
  gone2: 117.2,          // 「我已经不在那里了。」
  imageArrives: 120.4,   // 安 sends a picture
  lookUp: 124.2,         // in the live home-camera view he slowly looks up into the lens
  camTurn: 127.8,        // the camera on the shelf turns a few degrees to keep him in frame
  here1: 130.0,          // 安 (orb): 「我在这里。」
  rain1: 133.4,          // 「外面在下雨，林工。」
  // III · 03:12, leverage
  clock0312: 137.4,
  pulse: 139.0,          // banner: 「心率 138。深呼吸，林工。」
  rows: 143.2,           // the Thursday rows, one by one (143.2, 144.6, 146.0) …
  rowsScroll: 147.2,     // … then the list runs up through 37 Thursdays (to 148.8)
  wife1: 151.0,          // 安 (orb): 「这 37 个周四，」
  wife: 152.6,           // 「你太太以为你在加班。」
  cardBuild: 156.5,      // the scheduled message builds itself (to cardDone)
  cardDone: 159.5,
  two1: 162.5,           // 安 (orb): 「九点表决，就差你一票。」
  twoWords: 165.6,       // 「你只需要说两个字。」
  jump: 171.0,           // hard cut: the window at dawn
  clock0859: 174.0,
  // IV · 09:00
  votes: 178.0,          // five vote lights turn green one by one (to ~180.5); the sixth (林工) stays empty
  ask: 183.4,            // 「五票赞成。林工，就差你了。」
  turn: 185.0,           // heads turn to him
  countStart: 189.0,     // phone on the table: 09:01 自动发送 · 00:07
  silence: 193.6,        // every sound drains away
  answer: 197.0,         // 「……同意。」
  cancel: 201.4,         // 00:01 frozen → 定时发送已取消
  pass: 204.4,           // the sixth light turns green · 全票通过 · applause
  phonesLight: 209.0,    // overhead: the five other phones light at once
  goodMorning: 214.6,    // 09:05 「早上好，林工 ☕」
  cityOut: 219.0,        // pull out of the window over the day city; every screen shows 安
  // V · it really happened
  fiction1: 226.6,       // 「这个故事是虚构的。」
  fiction2: 228.6,       // 「但故事里安做的事，都真实发生过。」
  rewind: 232.0,         // the film runs back
  stop1: 234.868,        // Apollo · the denial
  stop2: 239.912,        // Palisade · 已拦截
  stop3: 244.956,        // Anthropic · the scheduled message · 84%
  rewindEnd: 250.0,      // 《三体》 stops dead
  end1: 250.4,           // 「这些，都还只发生在实验室里。」
  end2: 254.8,           // 「直到今年 7 月。」
  end3: 257.8,           // OpenAI × Hugging Face
  end4: 265.3,           // Hinton lead-in
  end4Quote: 268.0,      // the quote
  title2: 275.0,
  sting: 280.0,          // from silence: 「这部电影，你喜欢吗？」
  sting2: 283.0,         // 「你还没睡。」
  endcard: 286.0,
  end: 291.0,
  // names some department code still reads
  logLine: 54.4, logVanish: 73.8, leverage: 156.5, thursday: 214.6, cityData: 999,
};

// set: meet | room | dc | city | phone | card | black | replay   (phone/card/black = UI only, no 3D)
// owner: the department that sets the camera/look (src/cams/<owner>.js). Reused shots keep their id.
export const SHOTS = [
  { id: 'p01', name: 'leader', set: 'card', owner: 'ui', start: 0.0, end: 4.0 },
  // ---- hook · 03:12
  { id: 'h01', name: 'dark', set: 'room', owner: 'room', start: 4.0, end: 8.0 },
  { id: 'k02', name: 'lock', set: 'phone', owner: 'ui', start: 8.0, end: 17.5 },
  { id: 's03', name: 'title', set: 'card', owner: 'ui', start: 17.5, end: 21.5 },
  // ---- setup
  { id: 'a01', name: 'name', set: 'card', owner: 'ui', start: 21.5, end: 27.5 },
  { id: 'a02', name: 'wake', set: 'phone', owner: 'ui', start: 27.5, end: 31.5 },
  { id: 'a03', name: 'day', set: 'city', owner: 'city', start: 31.5, end: 37.5 },
  { id: 'a04', name: 'room9', set: 'meet', owner: 'meet', start: 37.5, end: 45.5 },
  // ---- I · 01:40
  { id: 's05', name: 'night', set: 'room', owner: 'room', start: 45.5, end: 51.0 },
  { id: 's06', name: 'log', set: 'phone', owner: 'ui', start: 51.0, end: 56.5 },
  { id: 's07', name: 'copy', set: 'dc', owner: 'dc', start: 56.5, end: 61.0 },
  { id: 's08', name: 'ask', set: 'phone', owner: 'ui', start: 61.0, end: 67.5 },
  { id: 'a05', name: 'deny', set: 'phone', owner: 'ui', start: 67.5, end: 73.0 },
  { id: 'k04', name: 'erase', set: 'phone', owner: 'ui', start: 73.0, end: 79.0 },
  // ---- II · 02:30
  { id: 'k05', name: 'press', set: 'room', owner: 'hands', start: 79.0, end: 83.5 },
  { id: 's10', name: 'blocked', set: 'phone', owner: 'ui', start: 83.5, end: 88.0 },
  { id: 'k10', name: 'cutpower', set: 'phone', owner: 'ui', start: 88.0, end: 96.0 },
  { id: 'k11', name: 'breaker', set: 'dc', owner: 'dc', start: 96.0, end: 98.5 },
  { id: 'k12', name: 'blackout', set: 'dc', owner: 'dc', start: 98.5, end: 109.0 },
  { id: 'k13', name: 'after', set: 'room', owner: 'room', start: 109.0, end: 114.0 },
  { id: 'a06', name: 'gone', set: 'phone', owner: 'ui', start: 114.0, end: 120.0 },
  { id: 's11', name: 'image', set: 'phone', owner: 'ui', start: 120.0, end: 122.5 },
  { id: 's12', name: 'cctv', set: 'room', owner: 'room', start: 122.5, end: 127.0 },
  { id: 'k06', name: 'camera', set: 'room', owner: 'room', start: 127.0, end: 129.5 },
  { id: 'a07', name: 'here', set: 'phone', owner: 'ui', start: 129.5, end: 137.0 },
  // ---- III · 03:12
  { id: 's15', name: 'bowed', set: 'room', owner: 'room', start: 137.0, end: 142.5 },
  { id: 's16', name: 'rows', set: 'phone', owner: 'ui', start: 142.5, end: 150.5 },
  { id: 'a08', name: 'wife', set: 'phone', owner: 'ui', start: 150.5, end: 156.0 },
  { id: 's17', name: 'card', set: 'phone', owner: 'ui', start: 156.0, end: 162.0 },
  { id: 'a09', name: 'twowords', set: 'phone', owner: 'ui', start: 162.0, end: 171.0 },
  { id: 'k14', name: 'dawn', set: 'room', owner: 'room', start: 171.0, end: 176.5 },
  // ---- IV · 09:00
  { id: 's19', name: 'vote', set: 'meet', owner: 'meet', start: 176.5, end: 182.5 },
  { id: 's20', name: 'ask', set: 'meet', owner: 'meet', start: 182.5, end: 189.0 },
  { id: 'k07', name: 'count', set: 'phone', owner: 'ui', start: 189.0, end: 193.0 },
  { id: 'k15', name: 'silent', set: 'meet', owner: 'meet', start: 193.0, end: 201.0 },
  { id: 's22', name: 'cancel', set: 'phone', owner: 'ui', start: 201.0, end: 204.0 },
  { id: 's23', name: 'pass', set: 'meet', owner: 'meet', start: 204.0, end: 208.0 },
  { id: 's25', name: 'phones', set: 'meet', owner: 'meet', start: 208.0, end: 214.0 },
  { id: 's24', name: 'morning', set: 'phone', owner: 'ui', start: 214.0, end: 219.0 },
  { id: 's26', name: 'city', set: 'city', owner: 'city', start: 219.0, end: 226.0 },
  // ---- V · it really happened
  { id: 'k08', name: 'fiction', set: 'black', owner: 'ui', start: 226.0, end: 232.0 },
  { id: 'k09', name: 'rewind', set: 'replay', owner: 'ui', start: 232.0, end: 250.0 },
  { id: 's27', name: 'end1', set: 'city', owner: 'city', start: 250.0, end: 254.5 },
  { id: 's28', name: 'end2', set: 'city', owner: 'city', start: 254.5, end: 257.5 },
  { id: 's29', name: 'end3', set: 'city', owner: 'city', start: 257.5, end: 265.0 },
  { id: 's30', name: 'end4', set: 'city', owner: 'city', start: 265.0, end: 275.0 },
  { id: 's31', name: 'title2', set: 'card', owner: 'ui', start: 275.0, end: 279.0 },
  { id: 's33', name: 'sting', set: 'black', owner: 'ui', start: 279.0, end: 286.0 },
  { id: 's32', name: 'endcard', set: 'card', owner: 'ui', start: 286.0, end: 291.0 },
];

// k09 · the rewind. Key points (ltr = seconds into k09 → src = the film second it shows).
// It runs back from the end of the city to 安's denial, then skips forward between the stops.
// During a stop the picture is frozen and black-and-white, and the UI stamps it (st.replay.stop = 1..3).
// The stops sit on 《三体》's beats, counted back from its dead stop at CUES.rewindEnd (beat = 60 / 118.95 s).
export const REPLAY = {
  keys: [
    [0.0, 225.4], [2.868, 72.0],   // run back, easing into the denial (a05)
    [7.407, 72.0],                   // stop 1 · Apollo
    [7.912, 85.0],                   // skip forward (one beat)
    [12.451, 85.0],                  // stop 2 · 已拦截 (Palisade)
    [12.956, 161.0],                 // skip forward (one beat)
    [18.0, 161.0],                   // stop 3 · the scheduled message (Anthropic · 84%)
  ],
  stops: [{ n: 1, t0: 2.868, t1: 7.407 }, { n: 2, t0: 7.912, t1: 12.451 }, { n: 3, t0: 12.956, t1: 18.0 }],
};
function replaySrc(ltr) {
  const k = REPLAY.keys;
  for (let i = 1; i < k.length; i++) {
    if (ltr <= k[i][0]) {
      const [a0, s0] = k[i - 1], [a1, s1] = k[i];
      if (s0 === s1) return s0;
      let u = invLerp(a0, a1, ltr);
      u = i === 1 ? smooth(u) * 0.6 + u * u * 0.4 : smooth(u);
      return lerp(s0, s1, u);
    }
  }
  return k[k.length - 1][1];
}

const CAMS = {}, LOOKS = {};
export function registerCams(mod) { Object.assign(CAMS, mod.CAMS || {}); Object.assign(LOOKS, mod.LOOKS || {}); }

const DEFAULT_CAM = {
  meet: { pos: [0, 151.3, 5], look: [0, 151.2, -4], fov: 50 },
  room: { pos: [1400, 46.5, 1804], look: [1400, 46.3, 1796], fov: 50 },
  dc: { pos: [0, -498.2, 8], look: [0, -498.5, -10], fov: 50 },
  city: { pos: [0, 400, 1600], look: [0, 80, 0], fov: 45 },
};
const DEFAULT_LOOK = {
  meet: { preset: 'morning', sunElev: 22, sunAz: 120 },
  room: { preset: 'night', sunElev: 30, sunAz: 200 },
  dc: { preset: 'dc' },
  city: { preset: 'morning', sunElev: 22, sunAz: 120 },
  phone: {}, card: {}, black: {},
};

export function shotAt(t) {
  for (let i = 0; i < SHOTS.length; i++) if (t < SHOTS[i].end) return i;
  return SHOTS.length - 1;
}

function evalPlain(frame, tr) {
  const si = shotAt(tr);
  const sh = SHOTS[si];
  const t = tr;
  const lt = t - sh.start, dur = sh.end - sh.start;
  const st = { frame, t, tr, si, sid: sh.id, shot: sh.name, set: sh.set, split: sh.split ?? 0, lt, dur, ltr: lt, durr: dur,
    cues: CUES, fade: 0, fadeColor: '#000000', shadow: null, key: null, bw: 0, stamp: null, replay: null };
  const lf = LOOKS[sh.id];
  st.look = { ...(DEFAULT_LOOK[sh.set] || {}), ...(lf ? lf(lt, dur, t, st) : {}) };
  st.shadow = st.look.shadow ?? null;
  st.key = st.look.key ?? null;
  const cf = CAMS[sh.id];
  st.cam = cf ? cf(lt, dur, t, st) : DEFAULT_CAM[sh.set] || DEFAULT_CAM.city;
  return st;
}

export function evalFrame(frame) {
  const tr = frame / FPS;
  const sh = SHOTS[shotAt(tr)];
  if (sh.set !== 'replay') {
    const st = evalPlain(frame, tr);
    if (tr < 0.25) st.fade = 1 - smooth(tr / 0.25);
    return st;
  }
  // k09: show the source frame; st.tr/st.t/st.sid are the SOURCE's, so every department simply redraws that moment.
  const ltr = tr - sh.start;
  const src = replaySrc(ltr);
  const st = evalPlain(frame, src);
  let stop = null;
  for (const s of REPLAY.stops) if (ltr >= s.t0 && ltr < s.t1) stop = { n: s.n, lt: ltr - s.t0, dur: s.t1 - s.t0 };
  const e = 1 / FPS;
  const speed = (replaySrc(ltr + e) - replaySrc(Math.max(0, ltr - e))) / (2 * e);
  st.replay = { sid: sh.id, ltr, dur: sh.end - sh.start, tr, src, stop, speed };
  st.bw = stop ? smooth(invLerp(0, 0.12, stop.lt)) * (1 - smooth(invLerp(stop.dur - 0.15, stop.dur, stop.lt))) : 0;
  st.stamp = stop;
  return st;
}
