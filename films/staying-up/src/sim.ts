// One deterministic simulation for the whole sample: the orb (the wish to stay up a little longer)
// floats on night water, the voices fall on it one by one and press it down, then slip off and it shoots up.
// Everything is precomputed per frame so render and audio placement read the same numbers.

export const W = 1920;
export const H = 1080;
export const SURFACE = 600; // water line, screen y before camera
export const OX = 960;
export const R = 58; // orb radius
export const D0 = R * 0.28; // resting depth: a floating ball sits a little under the line

export type Kind = "teacher" | "parent" | "self";
export type WordDef = { at: number; text: string; kind: Kind; size: number; weight: number; dx: number; rot: number };

export const WORDS: WordDef[] = [
  { at: 52, text: "别浪费时间", kind: "teacher", size: 66, weight: 64, dx: -6, rot: -2.2 },
  { at: 98, text: "提高一分，干掉千人", kind: "teacher", size: 58, weight: 58, dx: 14, rot: 1.6 },
  { at: 142, text: "早点睡，都是为你好", kind: "parent", size: 56, weight: 54, dx: -16, rot: -1.4 },
  { at: 196, text: "又浪费了一天", kind: "self", size: 54, weight: 52, dx: 10, rot: 1.1 },
  { at: 236, text: "你怎么又这样", kind: "self", size: 54, weight: 50, dx: -6, rot: -1.6 },
  { at: 272, text: "明天一定早睡", kind: "self", size: 54, weight: 48, dx: 8, rot: 0.9 },
];

export const OWN_FROM = 230; // the outside voices flip, one by one from the bottom, into your own notifications
export const OWN_STEP = 7;
export const OWN_FLIP = 9;
export const flipAt = (i: number) => OWN_FROM + i * OWN_STEP;
export const TREMBLE_FROM = 300;
export const RELEASE = 348;
export const FRAMES = 480;

export const wordH = (w: WordDef) => Math.round(w.size * 1.7);

type WordState = { landed: boolean; x: number; bottom: number; rot: number; o: number; vx: number; vy: number; vr: number };
export type Frame = {
  d: number; // orb depth below SURFACE (orb centre y = SURFACE + d)
  v: number;
  ox: number;
  cam: number; // camera y offset (scene moves up by this)
  zoom: number;
  words: WordState[];
};

export type Event = { f: number; kind: "land" | "breach" | "splashdown" | "release"; i?: number; power?: number };

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const rnd = hash;

const simulate = () => {
  const frames: Frame[] = [];
  const events: Event[] = [];
  let d = D0;
  let v = 0;
  let cam = 0;
  let zoom = 1;
  let above = false;
  let released = false;
  const ws: WordState[] = WORDS.map(() => ({ landed: false, x: OX, bottom: -200, rot: 0, o: 0, vx: 0, vy: 0, vr: 0 }));
  const fallV: number[] = WORDS.map(() => 0);

  for (let f = 0; f < FRAMES; f++) {
    // --- orb ---
    const landedW = released ? 0 : WORDS.reduce((s, w, i) => s + (ws[i].landed ? w.weight : 0), 0);
    const target = D0 + landedW;
    if (f === RELEASE) {
      released = true;
      v -= 4;
      events.push({ f, kind: "release" });
    }
    const centreY = SURFACE + d;
    if (centreY < SURFACE - R * 0.6) {
      // in the air: plain gravity
      if (!above) {
        above = true;
        events.push({ f, kind: "breach", power: Math.min(1, -v / 30) });
      }
      v += 1.2;
      v *= 0.995;
    } else {
      if (above) {
        above = false;
        events.push({ f, kind: "splashdown", power: Math.min(1, v / 30) });
        v *= 0.45;
      }
      const k = released && f < RELEASE + 40 ? 0.009 : 0.02;
      const c = released && f < RELEASE + 30 ? 0.015 : 0.14;
      v += -k * (d - target) - c * v;
    }
    d += v;

    // tremble under the full stack, rising until release
    let ox = OX;
    if (f >= TREMBLE_FROM && f < RELEASE) {
      const a = Math.pow((f - TREMBLE_FROM) / (RELEASE - TREMBLE_FROM), 2) * 7;
      ox += Math.sin(f * 2.1) * a + Math.sin(f * 3.7 + 1) * a * 0.5;
    }

    // --- words ---
    const orbTop = SURFACE + d - R;
    let stackTop = orbTop;
    WORDS.forEach((w, i) => {
      const s = ws[i];
      if (f < w.at) return;
      if (released && s.landed) {
        // first frame after release: throw the word off the orb
        if (s.vx === 0) {
          const side = i % 2 === 0 ? -1 : 1;
          s.vx = side * (7 + hash(i) * 5 + i * 1.2);
          s.vy = -1.5 - hash(i + 9) * 2;
          s.vr = side * (0.5 + hash(i + 3) * 0.7);
        }
        s.vy += s.bottom > SURFACE ? 0.12 : 0.6;
        s.vx *= s.bottom > SURFACE ? 0.96 : 0.99;
        s.vy *= s.bottom > SURFACE ? 0.94 : 1;
        s.x += s.vx;
        s.bottom += s.vy;
        s.rot += s.vr;
        s.vr *= 0.97;
        s.o = Math.max(0, s.o - (s.bottom > SURFACE + 40 ? 0.03 : 0.012));
        return;
      }
      if (!s.landed) {
        s.o = Math.min(1, s.o + 0.12);
        fallV[i] += 1.45;
        s.bottom += fallV[i];
        s.x = OX + w.dx;
        s.rot = w.rot * 2.2;
        if (s.bottom >= stackTop) {
          s.landed = true;
          s.bottom = stackTop;
          v += 4 + w.weight * 0.06;
          events.push({ f, kind: "land", i });
        }
      }
      if (s.landed) {
        const strain = f >= TREMBLE_FROM ? (f - TREMBLE_FROM) / (RELEASE - TREMBLE_FROM) : 0;
        s.x = ox + w.dx + strain * strain * (i - 2.5) * 6;
        s.bottom = stackTop;
        s.rot += (w.rot * (1 + strain * 1.5) - s.rot) * 0.25;
        stackTop -= wordH(w) - 6;
      }
    });

    // --- camera: follow the orb down while pressed, back to level on release; slow push-in ---
    const camTarget = released ? Math.min(0, d) * 0.25 : Math.max(0, Math.min(230, (d - D0) * 0.62));
    cam += (camTarget - cam) * (released ? 0.06 : 0.05);
    const zoomTarget = released ? 1 : 1 + 0.06 * Math.min(1, f / RELEASE);
    zoom += (zoomTarget - zoom) * 0.05;

    frames.push({ d, v, ox, cam, zoom, words: ws.map((s) => ({ ...s })) });
  }
  return { frames, events };
};

export const SIM = simulate();
