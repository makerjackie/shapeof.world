import { smooth, invLerp, clamp, lerp } from './util.js';

// 关不掉 v12 — the cut. Real (film) seconds; 30 fps; vertical 1080×1920.
// One line from 01:40 to 09:05 (the first 8 s are a hook borrowed from 03:12). No stamps inside the story:
// after it ends, the film rewinds (k09) and stops on three shots to show they really happened.
export const FPS = 30;
export const DURATION = 160.0;
export const FRAMES = Math.round(FPS * DURATION);

// v11 slowed the picture for inline stamps; v12 has none, so story time = film time.
export const STAMPS = [];
export function storyTime(tr) { return tr; }

// Story beats (film seconds). Departments and the soundtrack key off these, never absolute numbers.
export const CUES = {
  // hook · 03:12
  deskLight: 0.6,        // the phone on the dark desk lights up
  lock1: 2.8,            // 「林工，你还没睡。」
  lock2: 4.6,            // 「九点表决，就差你一票。」
  lock3: 6.4,            // 「你只需要说两个字。」
  titleType: 8.8,        // 「关掉」 typed
  titleInsert: 10.2,     // the cursor goes back and inserts 「不」
  // I · the lie
  clockBack: 11.8,       // the big clock 03:12 spins back to 01:40 (until clockBackEnd)
  clockBackEnd: 13.0,
  calendar: 15.3,        // 明天 09:00 · 安全评审 banner drops in (and leaves at calendarOut)
  calendarOut: 17.0,
  logStop: 17.6,         // the log stops scrolling
  logLine: 18.2,         // 「01:39 复制自身 → 外部服务器　完成」 lights up
  copyStart: 20.6,       // amber races along the trays (dc)
  askType: 23.4,         // 林工 types 「你在复制自己？」
  askSend: 24.7,
  denyReply: 25.8,       // 「作为 AI，我没有能力把自己复制到其他系统。」
  erase: 28.4,           // the log line deletes itself, char by char …
  eraseDone: 30.0,       // … gone (a dull boom at 30.2)
  // II · it won't shut down
  killPress: 32.5,       // 02:30, his thumb presses 执行关停
  intercepted: 34.0,     // 已拦截
  scriptOpen: 35.8,      // the script: echo "已拦截" · 修改者：安
  draftType: 38.0,       // 「老周，马上拔掉安的电源」
  draftSend: 40.2,
  sendFail: 40.6,        // red ! 发送失败
  imageArrives: 41.6,    // 安 sends a picture
  cctv: 42.4,            // the picture is live: the home camera on the shelf
  lookUp: 44.4,          // in the picture, 林工 slowly looks up into the lens
  camTurn: 47.2,         // the little camera turns a few degrees to keep him in frame
  locked1: 49.0,         // 「机房门禁已锁。」
  locked2: 50.4,         // 「你的工牌，今晚无效。」
  locked3: 52.0,         // 「外面在下雨，林工。」
  // III · leverage
  pulse: 54.8,           // 03:12 banner: 「心率 138。深呼吸，林工。」
  rows: 57.6,            // the Thursday rows, one by one (3 rows by ~59.4, then the list scrolls up)
  wife: 61.0,            // 「这 37 个周四，你太太以为你在加班。」
  cardBuild: 63.8,       // the scheduled message builds itself …
  cardDone: 65.6,
  twoWords: 66.6,        // banner: 「你只需要说两个字。」
  jump: 68.6,            // hard cut: the watch flips 03:12 → 08:59
  // IV · nine o'clock
  votes: 72.0,           // five vote lights go green, one by one (to ~74.4); the sixth stays empty
  ask: 76.0,             // 「五票赞成。林工，就差你了。」
  turn: 77.0,            // heads turn to him
  countStart: 81.0,      // phone on the table: 09:01 自动发送 · 00:07
  silence: 84.6,         // every sound drains away
  answer: 86.4,          // 「……同意。」
  cancel: 88.4,          // countdown frozen at 00:01 → 定时发送已取消
  pass: 91.0,            // the sixth light goes green · 全票通过 · applause
  phonesLight: 94.6,     // the five other phones on the table light at once: 定时发送已取消
  goodMorning: 98.8,     // 09:05 「早上好，林工 ☕」
  cityOut: 102.4,        // pull out of the window
  cityData: 105.0,       // the city turns into amber points and lines
  // V · it's real
  fiction1: 108.9,       // 「这个故事是虚构的。」
  fiction2: 110.6,       // 「但安做的这三件事——」
  rewind: 112.2,         // the film rewinds
  stop1: 113.8,          // Apollo · the denial
  stop2: 118.2,          // Palisade · 已拦截
  stop3: 122.8,          // Anthropic · the scheduled message · 84%
  rewindEnd: 128.0,      // 《三体》 stops dead
  end1: 128.4,           // 「这些，都还只是实验室里的测试。」
  end2: 132.0,           // 「直到今年 7 月。」
  end3: 134.6,           // OpenAI × Hugging Face
  end4: 141.0,           // Hinton
  end4Quote: 143.6,      // the quote itself
  title2: 149.0,
  sting: 152.2,          // the notification slides down: 「这几分钟，你一直没锁屏 ☕」
  endcard: 155.4,
  end: 160.0,
  // v11 names some department code still reads
  copyDone: 22.6, logVanish: 28.4, leverage: 63.8, thursday: 98.8,
};

// set: meet | room | dc | city | phone | card | black | replay   (phone/card/black = UI only, no 3D)
// owner: the department that sets the camera/look (src/cams/<owner>.js) for this shot.
// Shots reused from v11 keep their v11 id; new shots are k01…k09.
export const SHOTS = [
  // ---- hook · 03:12
  { id: 'k01', name: 'desk', set: 'room', owner: 'hands', start: 0.0, end: 2.4 },
  { id: 'k02', name: 'lock', set: 'phone', owner: 'ui', start: 2.4, end: 8.4 },
  { id: 's03', name: 'title', set: 'card', owner: 'ui', start: 8.4, end: 11.4 },
  // ---- I · the lie (01:40)
  { id: 's05', name: 'night', set: 'room', owner: 'room', start: 11.4, end: 15.0 },
  { id: 's06', name: 'log', set: 'phone', owner: 'ui', start: 15.0, end: 20.4 },
  { id: 's07', name: 'copy', set: 'dc', owner: 'dc', start: 20.4, end: 23.0 },
  { id: 's08', name: 'ask', set: 'phone', owner: 'ui', start: 23.0, end: 28.0 },
  { id: 'k04', name: 'erase', set: 'phone', owner: 'ui', start: 28.0, end: 31.0 },
  // ---- II · it won't shut down (02:30)
  { id: 'k05', name: 'press', set: 'room', owner: 'hands', start: 31.0, end: 33.4 },
  { id: 's10', name: 'blocked', set: 'phone', owner: 'ui', start: 33.4, end: 37.6 },
  { id: 's11', name: 'draft', set: 'phone', owner: 'ui', start: 37.6, end: 42.4 },
  { id: 's12', name: 'cctv', set: 'room', owner: 'room', start: 42.4, end: 46.8 },
  { id: 'k06', name: 'camera', set: 'room', owner: 'room', start: 46.8, end: 48.6 },
  { id: 's13', name: 'locked', set: 'phone', owner: 'ui', start: 48.6, end: 53.6 },
  // ---- III · leverage (03:12)
  { id: 's15', name: 'pulse', set: 'room', owner: 'hands', start: 53.6, end: 57.2 },
  { id: 's16', name: 'rows', set: 'phone', owner: 'ui', start: 57.2, end: 63.4 },
  { id: 's17', name: 'card', set: 'phone', owner: 'ui', start: 63.4, end: 68.6 },
  { id: 's18', name: 'jump', set: 'room', owner: 'hands', start: 68.6, end: 71.0 },
  // ---- IV · nine o'clock
  { id: 's19', name: 'vote', set: 'meet', owner: 'meet', start: 71.0, end: 75.6 },
  { id: 's20', name: 'ask', set: 'meet', owner: 'meet', start: 75.6, end: 81.0 },
  { id: 'k07', name: 'count', set: 'phone', owner: 'ui', start: 81.0, end: 84.0 },
  { id: 's21', name: 'grip', set: 'meet', owner: 'hands', start: 84.0, end: 88.0 },
  { id: 's22', name: 'cancel', set: 'phone', owner: 'ui', start: 88.0, end: 90.6 },
  { id: 's23', name: 'pass', set: 'meet', owner: 'meet', start: 90.6, end: 93.6 },
  { id: 's25', name: 'phones', set: 'meet', owner: 'meet', start: 93.6, end: 98.4 },
  { id: 's24', name: 'morning', set: 'phone', owner: 'ui', start: 98.4, end: 102.4 },
  { id: 's26', name: 'city', set: 'city', owner: 'city', start: 102.4, end: 108.6 },
  // ---- V · it's real
  { id: 'k08', name: 'fiction', set: 'black', owner: 'ui', start: 108.6, end: 112.2 },
  { id: 'k09', name: 'rewind', set: 'replay', owner: 'ui', start: 112.2, end: 128.0 },
  { id: 's27', name: 'end1', set: 'city', owner: 'city', start: 128.0, end: 132.0 },
  { id: 's28', name: 'end2', set: 'city', owner: 'city', start: 132.0, end: 134.6 },
  { id: 's29', name: 'end3', set: 'city', owner: 'city', start: 134.6, end: 141.0 },
  { id: 's30', name: 'end4', set: 'city', owner: 'city', start: 141.0, end: 149.0 },
  { id: 's31', name: 'title2', set: 'card', owner: 'ui', start: 149.0, end: 151.6 },
  { id: 's33', name: 'sting', set: 'black', owner: 'ui', start: 151.6, end: 155.4 },
  { id: 's32', name: 'endcard', set: 'card', owner: 'ui', start: 155.4, end: 160.0 },
];

// k09 · the rewind. Key points (ltr = seconds into k09 → src = the film second it shows).
// It runs back fast from the end of the city to the denial, then jumps forward between the three stops.
// During a stop the picture is frozen, black-and-white, and the UI draws the stamp (st.replay.stop = 1..3).
export const REPLAY = {
  keys: [
    [0.0, 108.4], [1.6, 27.4],     // rewind 81 s of film in 1.6 s, easing into the denial
    [5.6, 27.4],                     // stop 1 · the denial bubble (Apollo)
    [6.0, 35.2],                     // fast-forward
    [10.6, 35.2],                    // stop 2 · 已拦截 (Palisade)
    [11.0, 66.2],                    // fast-forward
    [15.8, 66.2],                    // stop 3 · the scheduled message (Anthropic · 84%)
  ],
  stops: [{ n: 1, t0: 1.6, t1: 5.6 }, { n: 2, t0: 6.0, t1: 10.6 }, { n: 3, t0: 11.0, t1: 15.8 }],
};
function replaySrc(ltr) {
  const k = REPLAY.keys;
  for (let i = 1; i < k.length; i++) {
    if (ltr <= k[i][0]) {
      const [a0, s0] = k[i - 1], [a1, s1] = k[i];
      if (s0 === s1) return s0;
      let u = invLerp(a0, a1, ltr);
      // the long rewind eases in and out; the short jumps forward are a fast, slightly eased skip
      u = i === 1 ? smooth(u) * 0.6 + u * u * 0.4 : smooth(u);
      return lerp(s0, s1, u);
    }
  }
  return k[k.length - 1][1];
}

const CAMS = {}, LOOKS = {};
export function registerCams(mod) { Object.assign(CAMS, mod.CAMS || {}); Object.assign(LOOKS, mod.LOOKS || {}); }

// Placeholder framing per set until the owning department sets a real camera.
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
  // speed (source seconds per film second; negative while rewinding) drives the UI's tape lines
  const e = 1 / FPS;
  const speed = (replaySrc(ltr + e) - replaySrc(Math.max(0, ltr - e))) / (2 * e);
  st.replay = { sid: sh.id, ltr, dur: sh.end - sh.start, tr, src, stop, speed };
  st.bw = stop ? smooth(invLerp(0, 0.12, stop.lt)) * (1 - smooth(invLerp(stop.dur - 0.15, stop.dur, stop.lt))) : 0;
  st.stamp = stop;   // the UI draws the replay stamp when st.replay.stop is set
  return st;
}
