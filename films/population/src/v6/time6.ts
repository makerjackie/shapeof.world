// Film6 timing: the reference soundtrack's beat grid, the music edit (EDL) and the beat scheduler.
// Every event starts exactly on a beat of the edited music; the year cursor arrives at the event's year on that beat.
// No Remotion imports here: tools/cues6.mjs bundles this for node.

// Strict grids fitted to public/ref_full.wav (tools: pop6/mus2.py). Section A = 128.9 BPM, B = 138.7 BPM.
const GRIDS = [
  { t0: 0, t1: 136.5, P: 0.4654, ph: 0.32, bar: 2 },
  { t0: 136.5, t1: 232.3, P: 0.4325, ph: 0.224, bar: 3 },
];
export type SrcBeat = { s: number; down: boolean };
export const SRC_BEATS: SrcBeat[] = (() => {
  const out: SrcBeat[] = [];
  for (const g of GRIDS)
    for (let n = 0; ; n++) {
      const s = g.t0 + g.ph + n * g.P;
      if (s >= g.t1) break;
      out.push({ s: +s.toFixed(4), down: n % 4 === g.bar });
    }
  return out;
})();
// snap a source time to the nearest grid beat
export const snap = (s: number) => SRC_BEATS.reduce((b, x) => (Math.abs(x.s - s) < Math.abs(b - s) ? x.s : b), SRC_BEATS[0].s);

export type Beat = { t: number; s: number; down: boolean };
export type Music = { edl: [number, number][]; F: (src: number) => number; beats: Beat[]; dur: number };
export const makeMusic = (edl: [number, number][], tail: number): Music => {
  const starts: number[] = [];
  let acc = 0;
  for (const [a, b] of edl) {
    starts.push(acc);
    acc += b - a;
  }
  const F = (src: number) => {
    for (let i = 0; i < edl.length; i++) {
      const [a, b] = edl[i];
      if (src >= a - 1e-6 && src <= b + 1e-6) return +(starts[i] + src - a).toFixed(4);
    }
    throw new Error(`source time ${src} is not in the EDL`);
  };
  const beats: Beat[] = [];
  edl.forEach(([a, b], i) => {
    for (const x of SRC_BEATS) if (x.s >= a - 1e-4 && x.s < b - 0.06) beats.push({ t: +(starts[i] + x.s - a).toFixed(4), s: x.s, down: x.down });
  });
  return { edl, F, beats, dur: +(acc + tail).toFixed(3) };
};

// ---------------- events
export type Kind =
  | "stat" // a count (white)
  | "peak" // a high point (gold, sparks)
  | "grow" // growth (gold, small)
  | "war" // war, massacre (red)
  | "crash" // the count after a collapse (red, lightning)
  | "plague"
  | "famine"
  | "split" // the map breaks apart
  | "unite" // the map comes together (gold)
  | "move" // people on the move (arrows on the map)
  | "policy"
  | "note" // a line of explanation
  | "quote" // a line from the sources (brush)
  | "turn"; // a turning point that is not a disaster (calm, no lightning)
export type Ev = {
  y: number; // the year the cursor reaches on this event's beat
  b: number; // beats until the next event (may be refitted to land the anchors)
  k: Kind;
  tag?: string; // small line above the title (when / who)
  t: string; // title
  n?: string; // big number
  s?: string; // sub line
  at?: [number, number]; // where it happens (lon, lat): fire / plague / glow on the map
  to?: [number, number]; // for "move": where people went
  map?: string; // switch the territory map to this keyframe
  go?: "slam" | "glide"; // how the cursor arrives (slam = hold, then hit on the beat)
  big?: boolean; // the biggest moments: lightning, flash, red alarm frame
  anchor?: number; // SOURCE seconds: this event must start on the beat nearest to it
  span?: number; // years visible on the chart from here on
  pct?: string; // the change shown big next to the head (e.g. "−65%")
  focus?: [number, number, number]; // map camera: lon, lat, zoom (1 = whole map)
  st?: string; // events with the same id stack up as one growing list
  kill?: [number, number, number, number, number]; // lon0, lat0, lon1, lat1, share: that share of the region's dots dies here
  src?: string; // where this card's own number comes from (bottom-left source line)
  table?: boolean; // show the region table on this card (with tableOn)
};
export type Placed = Ev & { i: number; t0: number; t1: number; bi: number };

export const schedule = (evs: Ev[], m: Music, startSrc: number, endSrc: number): Placed[] => {
  const nearestIdx = (src: number) => {
    const ft = m.F(snap(src));
    let bi = 0;
    for (let i = 0; i < m.beats.length; i++) if (Math.abs(m.beats[i].t - ft) < Math.abs(m.beats[bi].t - ft)) bi = i;
    return bi;
  };
  const b0 = nearestIdx(startSrc);
  const bEnd = nearestIdx(endSrc);
  // anchors: [event index, beat index]; the first event is pinned to the start, the end to endSrc
  const pins: [number, number][] = [[0, b0]];
  evs.forEach((e, i) => {
    if (i > 0 && e.anchor !== undefined) pins.push([i, nearestIdx(e.anchor)]);
  });
  pins.push([evs.length, bEnd]);
  const beats = evs.map((e) => Math.max(1, e.b));
  for (let p = 0; p < pins.length - 1; p++) {
    const [ia, ba] = pins[p];
    const [ib, bb] = pins[p + 1];
    const want = bb - ba;
    const idx = Array.from({ length: ib - ia }, (_, q) => ia + q);
    let have = idx.reduce((s, i) => s + beats[i], 0);
    if (want < idx.length) throw new Error(`anchor ${ib}: ${idx.length} events need ${idx.length} beats, only ${want}`);
    // stretch / squeeze the longest (or shortest) events one beat at a time
    let guard = 0;
    while (have !== want && guard++ < 10000) {
      if (have > want) {
        const i = idx.reduce((a, c) => (beats[c] > beats[a] ? c : a), idx[0]);
        if (beats[i] <= 1) break;
        beats[i]--;
        have--;
      } else {
        // grow the event that is shortest relative to its asked length
        const i = idx.reduce((a, c) => (beats[c] / evs[c].b < beats[a] / evs[a].b ? c : a), idx[0]);
        beats[i]++;
        have++;
      }
    }
  }
  const out: Placed[] = [];
  let bi = b0;
  evs.forEach((e, i) => {
    const t0 = m.beats[bi].t;
    const nb = bi + beats[i];
    const t1 = nb < m.beats.length ? m.beats[nb].t : m.dur;
    out.push({ ...e, b: beats[i], i, t0, t1, bi });
    bi = nb;
  });
  return out;
};

// ---------------- the year cursor: one key per event, arriving ON the beat
export type Key = { t: number; y: number; p: number }; // p = ease-in power for the approach
export const cursorFrom = (keys: Key[]) => {
  const K = [...keys].sort((a, b) => a.t - b.t);
  return (t: number) => {
    if (t <= K[0].t) return K[0].y;
    for (let i = 1; i < K.length; i++) {
      const a = K[i - 1];
      const b = K[i];
      if (t <= b.t) {
        if (b.y === a.y) return a.y;
        const d = b.t - a.t;
        // hold on the previous event while its card is read, then lunge into this beat
        const travel = b.p >= 2.4 ? Math.min(d * 0.45, 0.8) : Math.min(d * 0.5, 1.0);
        const x = Math.max(0, (t - (b.t - travel)) / travel);
        return a.y + (b.y - a.y) * Math.pow(Math.min(1, x), b.p);
      }
    }
    return K[K.length - 1].y;
  };
};
