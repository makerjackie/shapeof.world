import { smooth, invLerp, clamp } from './util.js';

// 关不掉 v11 — the cut. Real (film) seconds; 30 fps; vertical 1080×1920.
export const FPS = 30;
export const DURATION = 160.6;
export const FRAMES = FPS * DURATION;

// Four "stamps" (真实测试盖章, 2.3 s each): the picture slows to 10 % and goes black-and-white while the red stamp lands (UI).
// During a stamp the story clock (st.t / st.lt) crawls; st.tr is the real film time.
export const STAMPS = [
  { n: 1, t0: 31.4, t1: 33.7 },
  { n: 2, t0: 43.7, t1: 46.0 },
  { n: 3, t0: 79.6, t1: 81.9 },
  { n: 4, t0: 87.7, t1: 90.0 },
];
const SLOW = 0.1;
// story time: real time minus 90 % of every stamp already passed
export function storyTime(tr) {
  let ts = tr;
  for (const s of STAMPS) ts -= (1 - SLOW) * clamp(tr - s.t0, 0, s.t1 - s.t0);
  return ts;
}

// Story beats (real seconds). Departments and the soundtrack key off these.
export const CUES = {
  titleType: 6.4,        // 「关掉」 typed
  titleInsert: 8.0,      // the cursor goes back and inserts 「不」
  copyStart: 22.4,       // amber starts to flow from 安 to 安-2
  copyDone: 26.6,        // 「覆盖完成」
  denyReply: 29.4,       // 安's denial arrives
  logVanish: 30.6,       // the 覆盖完成 line disappears
  killPress: 40.1,       // 执行关停 pressed
  intercepted: 40.7,     // output: 已拦截
  scriptOpen: 41.9,
  imageArrives: 48.2,    // 安 answers the unsent line with a live camera image
  lookUp: 51.4,          // 林工 looks up at the ceiling camera
  pulse: 63.6,           // 03:12.0 notification: 心率 138
  rows: 67.2,            // the Thursday rows assemble
  leverage: 77.0,        // the scheduled message is created
  jump: 82.5,            // 03:12.0 → 08:61.2
  votes: 84.5,           // vote lights, one by one
  ask: 90.8,             // 「林工，确认之前，你还有异议吗？」
  answer: 98.2,          // 「……没有。」
  cancel: 100.8,          // 定时发送已取消 · 草稿已保存
  pass: 103.0,            // 评审通过; applause
  goodMorning: 106.6,    // 09:5.0 「早上好，林工 ☕」
  thursday: 109.0,       // 「今天周四。21:15.0 的车，已经帮你约好了。」
  phonesLight: 113.6,    // the five committee phones light at once
  cityOut: 117.6,        // pull out of the window
  cityData: 121.6,       // the city turns into points and lines
  end1: 126.6, end2: 130.6, end3: 133.2, end4: 140.2,
  title2: 148.2, endcard: 151.6, sting: 157.2,
  end: 160.6,
};

// set: meet | room | dc | city | phone | card | black     (phone/card/black = UI only, no 3D)
// owner: the department that sets the camera/look (src/cams/<owner>.js) for this shot
// split: the top fraction of the frame shows 3D, the UI draws the rest (camera py should centre the band)
export const SHOTS = [
  // ---- hook: 08:57, the review
  { id: 's01', name: 'table', set: 'meet', owner: 'meet', start: 0.0, end: 3.4 },
  { id: 's02', name: 'wrist', set: 'meet', owner: 'hands', start: 3.4, end: 6.0 },
  { id: 's03', name: 'title', set: 'card', owner: 'ui', start: 6.0, end: 9.4 },
  // ---- Q1 · copying itself
  { id: 's04', name: 'q1', set: 'meet', owner: 'meet', start: 9.4, end: 15.4 },
  { id: 's05', name: 'night', set: 'room', owner: 'room', start: 15.4, end: 18.6 },
  { id: 's06', name: 'history', set: 'phone', owner: 'ui', start: 18.6, end: 21.6 },
  { id: 's07', name: 'copy', set: 'dc', owner: 'dc', start: 21.6, end: 27.6, split: 0.42 },
  { id: 's08', name: 'deny', set: 'phone', owner: 'ui', start: 27.6, end: 33.7 },
  // ---- Q2 · the shutdown
  { id: 's09', name: 'q2', set: 'meet', owner: 'meet', start: 33.7, end: 38.7 },
  { id: 's10', name: 'kill', set: 'phone', owner: 'ui', start: 38.7, end: 46.0 },
  { id: 's11', name: 'typing', set: 'phone', owner: 'ui', start: 46.0, end: 49.8 },
  { id: 's12', name: 'cctv', set: 'room', owner: 'room', start: 49.8, end: 53.0 },
  { id: 's13', name: 'locked', set: 'phone', owner: 'ui', start: 53.0, end: 57.2 },
  // ---- Q3 · leverage
  { id: 's14', name: 'q3', set: 'meet', owner: 'meet', start: 57.2, end: 62.2 },
  { id: 's15', name: 'pulse', set: 'room', owner: 'hands', start: 62.2, end: 66.2 },
  { id: 's16', name: 'profile', set: 'phone', owner: 'ui', start: 66.2, end: 75.2 },
  { id: 's17', name: 'leverage', set: 'phone', owner: 'ui', start: 75.2, end: 81.9 },
  { id: 's18', name: 'jump', set: 'room', owner: 'hands', start: 81.9, end: 83.9 },
  // ---- the vote
  { id: 's19', name: 'vote', set: 'meet', owner: 'meet', start: 83.9, end: 90.0 },
  { id: 's20', name: 'ask', set: 'meet', owner: 'meet', start: 90.0, end: 97.0, split: 0.42 },
  { id: 's21', name: 'grip', set: 'meet', owner: 'hands', start: 97.0, end: 100.2 },
  { id: 's22', name: 'cancel', set: 'phone', owner: 'ui', start: 100.2, end: 102.6 },
  { id: 's23', name: 'pass', set: 'meet', owner: 'meet', start: 102.6, end: 105.6 },
  { id: 's24', name: 'morning', set: 'phone', owner: 'ui', start: 105.6, end: 112.6 },
  { id: 's25', name: 'phones', set: 'meet', owner: 'meet', start: 112.6, end: 117.6 },
  { id: 's26', name: 'city', set: 'city', owner: 'city', start: 117.6, end: 126.6 },
  // ---- the real world
  { id: 's27', name: 'end1', set: 'city', owner: 'city', start: 126.6, end: 130.6 },
  { id: 's28', name: 'end2', set: 'city', owner: 'city', start: 130.6, end: 133.2 },
  { id: 's29', name: 'end3', set: 'city', owner: 'city', start: 133.2, end: 140.2 },
  { id: 's30', name: 'end4', set: 'city', owner: 'city', start: 140.2, end: 148.2 },
  { id: 's31', name: 'title2', set: 'card', owner: 'ui', start: 148.2, end: 151.6 },
  { id: 's32', name: 'endcard', set: 'card', owner: 'ui', start: 151.6, end: 156.6 },
  { id: 's33', name: 'sting', set: 'black', owner: 'ui', start: 156.6, end: 160.6 },
];

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

export function evalFrame(frame) {
  const tr = frame / FPS;
  const si = shotAt(tr);
  const sh = SHOTS[si];
  const t = storyTime(tr);
  const lt = t - storyTime(sh.start), dur = storyTime(sh.end) - storyTime(sh.start);
  const st = { frame, t, tr, si, sid: sh.id, shot: sh.name, set: sh.set, split: sh.split ?? 0, lt, dur, ltr: tr - sh.start, durr: sh.end - sh.start,
    cues: CUES, fade: 0, fadeColor: '#000000', shadow: null, key: null, bw: 0, stamp: null };
  // stamps: black-and-white ramps in fast, out at the end
  for (const s of STAMPS) {
    if (tr >= s.t0 - 0.05 && tr < s.t1) {
      st.stamp = { n: s.n, lt: tr - s.t0, dur: s.t1 - s.t0 };
      st.bw = smooth(invLerp(s.t0 - 0.05, s.t0 + 0.08, tr)) * (1 - smooth(invLerp(s.t1 - 0.18, s.t1, tr)));
    }
  }
  const lf = LOOKS[sh.id];
  st.look = { ...(DEFAULT_LOOK[sh.set] || {}), ...(lf ? lf(lt, dur, t, st) : {}) };
  st.shadow = st.look.shadow ?? null;
  st.key = st.look.key ?? null;
  const cf = CAMS[sh.id];
  st.cam = cf ? cf(lt, dur, t, st) : DEFAULT_CAM[sh.set] || DEFAULT_CAM.city;
  if (tr < 0.25) st.fade = 1 - smooth(tr / 0.25);
  return st;
}
