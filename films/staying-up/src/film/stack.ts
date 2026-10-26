// A generic version of sim.ts: one orb floating on the water line, cards that fall on it and stack,
// an optional release that throws the cards off and lets the orb spring up. Deterministic per frame.

export const SURFACE = 600;
export const R = 58;
export const D0 = R * 0.28;

export type CardDef = {
  at: number; // frame it starts falling
  h: number; // card height
  weight: number; // how far it pushes the orb down
  dx?: number;
  rot?: number;
  vanishAt?: number; // dissolves in mid-air at this frame and never lands
  fromY?: number; // spawn height (bottom of card, screen y); default above the frame
};

export type CardState = { x: number; bottom: number; rot: number; o: number; landed: boolean; vanish: number };
export type StackFrame = { d: number; v: number; ox: number; cards: CardState[] };
export type StackEvent = { f: number; kind: "land" | "breach" | "splashdown" | "release" | "vanish"; i?: number; power?: number };

export type StackOpts = {
  frames: number;
  x?: number;
  cards: CardDef[];
  release?: number; // throw the stack off at this frame
  startD?: number;
  k?: number; // spring toward the target depth
  c?: number; // damping
  relK?: number; // softer spring right after release: the orb overshoots out of the water
  gAir?: number;
  trembleFrom?: number;
  trembleTo?: number;
  floatUpAt?: number; // after this frame the resting depth becomes slightly above the line (calm, light)
};

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const rnd = hash;

export const simulateStack = (o: StackOpts) => {
  const X = o.x ?? 960;
  const k0 = o.k ?? 0.02;
  const c0 = o.c ?? 0.14;
  const frames: StackFrame[] = [];
  const events: StackEvent[] = [];
  let d = o.startD ?? D0;
  let v = 0;
  let above = false;
  let released = false;
  const cs: CardState[] = o.cards.map((c) => ({ x: X + (c.dx ?? 0), bottom: c.fromY ?? -160, rot: (c.rot ?? 0) * 2.2, o: 0, landed: false, vanish: 0 }));
  const fallV = o.cards.map(() => 0);
  const thrown = o.cards.map(() => false);
  const tv = o.cards.map(() => ({ vx: 0, vy: 0, vr: 0 }));

  for (let f = 0; f < o.frames; f++) {
    if (o.release !== undefined && f === o.release) {
      released = true;
      v -= 3;
      events.push({ f, kind: "release" });
    }
    const rest = o.floatUpAt !== undefined && f >= o.floatUpAt ? D0 - 34 : D0;
    const load = o.cards.reduce((s, c, i) => s + (cs[i].landed && !thrown[i] ? c.weight : 0), 0);
    const target = rest + load;
    if (SURFACE + d < SURFACE - R * 0.6) {
      if (!above) {
        above = true;
        events.push({ f, kind: "breach", power: Math.min(1, -v / 30) });
      }
      v += o.gAir ?? 1.2;
    } else {
      if (above) {
        above = false;
        events.push({ f, kind: "splashdown", power: Math.min(1, v / 30) });
        v *= 0.45;
      }
      const soft = released && o.release !== undefined && f < o.release + 30;
      const k = soft ? o.relK ?? 0.012 : k0;
      const c = soft ? 0.02 : c0;
      v += -k * (d - target) - c * v;
    }
    d += v;

    let ox = X;
    if (o.trembleFrom !== undefined && o.trembleTo !== undefined && f >= o.trembleFrom && f < o.trembleTo && !released) {
      const a = Math.pow((f - o.trembleFrom) / (o.trembleTo - o.trembleFrom), 2) * 6;
      ox += Math.sin(f * 2.1) * a + Math.sin(f * 3.7 + 1) * a * 0.5;
    }

    let stackTop = SURFACE + d - R;
    o.cards.forEach((c, i) => {
      const s = cs[i];
      if (f < c.at) return;
      // dissolving in mid-air
      if (c.vanishAt !== undefined && f >= c.vanishAt) {
        if (s.vanish === 0) events.push({ f, kind: "vanish", i });
        s.vanish = Math.min(1, s.vanish + 0.05);
        s.o = Math.max(0, 1 - s.vanish * 1.4);
        fallV[i] *= 0.85;
        s.bottom += fallV[i];
        return;
      }
      if (released && s.landed && !thrown[i]) {
        thrown[i] = true;
        const side = i % 2 === 0 ? -1 : 1;
        tv[i] = { vx: side * (7 + hash(i) * 5 + i), vy: -1.5 - hash(i + 9) * 2, vr: side * (0.5 + hash(i + 3) * 0.7) };
      }
      if (thrown[i]) {
        const t = tv[i];
        t.vy += s.bottom > SURFACE ? 0.3 : 0.6;
        t.vx *= s.bottom > SURFACE ? 0.96 : 0.99;
        t.vy *= s.bottom > SURFACE ? 0.94 : 1;
        s.x += t.vx;
        s.bottom += t.vy;
        s.rot += t.vr;
        t.vr *= 0.97;
        s.o = Math.max(0, s.o - (s.bottom > SURFACE + 40 ? 0.03 : 0.012));
        return;
      }
      if (!s.landed) {
        s.o = Math.min(1, s.o + 0.12);
        fallV[i] += 1.5;
        s.bottom += fallV[i];
        s.x = X + (c.dx ?? 0);
        if (s.bottom >= stackTop) {
          s.landed = true;
          s.bottom = stackTop;
          v += 4 + c.weight * 0.06;
          events.push({ f, kind: "land", i });
        }
      }
      if (s.landed) {
        const strain = o.trembleFrom !== undefined && o.trembleTo !== undefined && f >= o.trembleFrom ? Math.min(1, (f - o.trembleFrom) / (o.trembleTo - o.trembleFrom)) : 0;
        s.x = ox + (c.dx ?? 0) + strain * strain * (i % 3 - 1) * 5;
        s.bottom = stackTop;
        s.rot += ((c.rot ?? 0) * (1 + strain) - s.rot) * 0.25;
        stackTop -= c.h - 6;
      }
    });

    frames.push({ d, v, ox, cards: cs.map((s) => ({ ...s })) });
  }
  return { frames, events };
};
