// Original score for "独立开发者的形状", re-arranged for "一人公司（OPC）的形状" (2026-10-30): the same instruments,
// harmony and hooks; only the section table (92 bars instead of 65) and the sound-effect cues are new, and the
// audio logo is gone (the end card has none). Synthesized with Web Audio in an OfflineAudioContext; no samples.
// The engine (drums, piano, organ bass, pad, effects, the series' audio logo) is the one from
// films/tower/music/score.js and films/house/music/score.js, so the series keeps one set of sounds.
// A minor, 120 BPM. Main sections: Am9 – Fmaj9 – Cadd9 – G6, one chord per bar, each section starting on Am.
// The coda turns to F – G – Em7 – Am9 (IV–V–iii–vi). Bars count from 0 like the film's bars (src/timing.ts):
// bar 0 starts at 0.5 s, one bar = 2 s. The section table mirrors src/scenes.ts.

const BEAT = 0.5
const BAR = 2
const T0 = 0.5
const BARS = 92
const DURATION = T0 + BARS * BAR + 1.0
const bt = (bar, beat = 0) => T0 + bar * BAR + beat * BEAT

// [from, to] inclusive film bars. `anchor` is the bar the chord cycle counts from (defaults to `from`).
const SECTIONS = [
  { from: 0, to: 5, kind: 'hook' }, // the dashboard, the market, the question
  { from: 6, to: 7, kind: 'title' }, // the licence
  { from: 8, to: 22, kind: 'groove' }, // the 煎饼 cart; hands
  { from: 23, to: 29, kind: 'groove2' }, // the burden stays; more makers
  { from: 30, to: 35, kind: 'drop' }, // one person can sell to the world; the cities' offers
  { from: 36, to: 39, kind: 'breakdown' }, // but there is no street online
  { from: 40, to: 40, kind: 'build', anchor: 37 },
  { from: 41, to: 44, kind: 'drop2' }, // 34 -> 61
  { from: 45, to: 57, kind: 'groove2' }, // why; television (muffled); AI
  { from: 58, to: 60, kind: 'reflect' }, // what the street used to do
  { from: 61, to: 74, kind: 'travel' }, // being found; coming back
  { from: 75, to: 75, kind: 'build', anchor: 72 },
  { from: 76, to: 85, kind: 'anthem' }, // morning
  { from: 86, to: 89, kind: 'outro' }, // sources, end card
  { from: 90, to: 91, kind: 'tail' },
]

// Sound effects on the picture: [bar, beat, type, ...args]. Scene-local beat b of a scene that starts on bar B
// lands on bar B + b / 4.
const CUES = [
  // the dashboard: sign-ups popping in, the stamp
  [0, 0, 'boom'], [0, 1, 'pop', 0.35], [0, 2, 'pop', 0.35], [0, 3, 'pop', 0.35], [1, 0, 'pop', 0.35], [1, 1, 'pop', 0.35], [1, 2, 'pop', 0.35],
  [0, 1.5, 'thud'], [0, 1.5, 'impact', 0.5],
  [1, 3, 'whoosh'], [2, 2, 'swish'], [3, 0, 'shimmer'], [4, 3, 'thud', 0.6],
  // title: the seal
  [6, 0, 'boom'], [6, 1, 'thud'],
  // the cart
  [8, 0, 'whoosh'], [9, 0, 'pop'], [9, 1.2, 'pop'], [9, 2.4, 'pop'], [10, 0.2, 'coin'], [12, 0, 'swish'], [13, 3, 'swish'], [15, 1, 'ding'],
  // the company: jobs, flips, lights out, the building goes down
  [16, 1, 'whoosh'],
  [17, 1, 'pop', 0.4], [17, 1.56, 'pop', 0.4], [17, 2.12, 'pop', 0.4], [17, 2.68, 'pop', 0.4], [17, 3.24, 'pop', 0.4], [17, 3.8, 'pop', 0.4],
  [19, 3, 'pour', 1.4, 8, 0.4], [20, 0, 'powerdown', 0.5], [21, 2.4, 'thud'], [22, 0, 'impact', 0.6], [22, 1, 'pop'],
  // the burden
  [23, 0, 'swish', 0.6], [24, 2.4, 'pop', 0.5], [25, 3.2, 'swish', 0.5], [26, 3.6, 'thud'],
  // more makers: stalls popping up
  [28, 0, 'pour', 2, 40, 0.5], [29, 0, 'pour', 2, 40, 0.5],
  // the world opens; policy cards
  [30, 0, 'boom'], [31, 0, 'shimmer'], [32, 1.4, 'whoosh'], [33, 0, 'swish', 0.7], [33, 3.6, 'swish', 0.7], [34, 3.2, 'swish', 0.7],
  // the turn; the count to 61
  [36, 0, 'powerdown'], [37, 0, 'shimmer'], [41, 0, 'boom'], [41, 0, 'pour', 2.6, 34, 0.5], [42, 2.4, 'pour', 2.4, 27, 0.5], [44, 0, 'ding'],
  // why; television; AI
  [45, 0, 'whoosh'], [50, 0, 'swish'], [52, 2.8, 'shimmer'], [55, 0, 'whoosh'],
  // what the street did; found; coming back
  [58, 0, 'swish', 0.6], [61, 0, 'whoosh'],
  [63, 0, 'coin'], [63, 2, 'coin'], [64, 0, 'coin'], [64, 1, 'coin'], [64, 2, 'coin'], [64, 3, 'coin'], [65, 0, 'pour', 2, 24, 0.4],
  [67, 0, 'whoosh'], [68, 2.2, 'ding', 0.6], [69, 2.8, 'ding', 0.4], [73, 0, 'swish'],
  // morning
  [76, 0, 'shimmer'], [79, 1.3, 'ding'], [82, 3, 'swish', 0.5],
  [86, 0, 'swish', 0.6], [89, 0, 'swish', 0.5],
]

const SR = 48000
const S16 = BEAT / 4
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

const MAIN = [
  { root: 33, notes: [60, 64, 67, 71] }, // Am9: C E G B over A
  { root: 41, notes: [57, 60, 64, 67] }, // Fmaj9: A C E G over F
  { root: 36, notes: [55, 60, 62, 64] }, // Cadd9: G C D E over C
  { root: 31, notes: [59, 62, 64, 67] }, // G6: B D E G over G
]
const PEAK = [
  { root: 41, notes: [57, 60, 64, 67] }, // Fmaj9
  { root: 43, notes: [59, 62, 67, 69] }, // Gadd9: B D G A over G
  { root: 40, notes: [59, 62, 64, 67] }, // Em7: B D E G over E
  { root: 33, notes: [60, 64, 67, 71] }, // Am9
]
const CODA = ['anthem', 'outro', 'tail']
const CODA_FROM = 76
const mod4 = (n) => ((n % 4) + 4) % 4
const chordAt = (bar, sec) => (CODA.includes(sec.kind) ? PEAK[mod4(bar - CODA_FROM)] : MAIN[mod4(bar - (sec.anchor ?? sec.from))])

// The stab: sixteenth positions in the bar.
const STAB = [0, 3, 6, 10, 13]
// The hooks, one bar per chord: [beat offset, midi, beats]. HOOK follows MAIN (the discovery), PEAK_HOOK the coda.
const HOOK = [
  [[0, 76, 0.75], [0.75, 74, 0.25], [1, 72, 1], [2, 71, 0.5], [2.5, 72, 1.5]],
  [[0, 72, 0.75], [0.75, 71, 0.25], [1, 69, 1], [2, 67, 0.5], [2.5, 69, 1.5]],
  [[0, 67, 0.5], [0.5, 69, 0.5], [1, 72, 1], [2, 74, 0.5], [2.5, 76, 1.5]],
  [[0, 74, 0.75], [0.75, 72, 0.25], [1, 71, 1], [2, 67, 0.5], [2.5, 71, 1.5]],
]
const PEAK_HOOK = [
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 1], [2, 74, 0.5], [2.5, 72, 1.5]],
  [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 1], [2, 76, 0.5], [2.5, 74, 1.5]],
  [[0, 71, 0.75], [0.75, 72, 0.25], [1, 74, 1], [2, 76, 0.5], [2.5, 79, 1.5]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 0.5], [2.5, 71, 0.5], [3, 72, 1]],
]
const hookAt = (bar, sec) => (CODA.includes(sec.kind) ? PEAK_HOOK[mod4(bar - CODA_FROM)] : HOOK[mod4(bar - (sec.anchor ?? sec.from))])

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let n = Math.imul(s ^ (s >>> 15), 1 | s)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * SR), SR)
  const rand = rng(20261020)

  // ── Shared buffers ──────────────────────────────────────────────────────
  const noise = ctx.createBuffer(2, SR * 3, SR)
  for (let c = 0; c < 2; c++) {
    const d = noise.getChannelData(c)
    for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1
  }
  function reverbIR(seconds, damp) {
    const len = Math.floor(SR * seconds)
    const b = ctx.createBuffer(2, len, SR)
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const x = (rand() * 2 - 1) * Math.exp(-4.2 * i / len)
        lp += (x - lp) * damp
        d[i] = lp
      }
    }
    return b
  }

  // ── Mix buses ───────────────────────────────────────────────────────────
  const master = ctx.createGain(); master.gain.value = 0.55
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -16; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.2; glue.knee.value = 6
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -4; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.06; limiter.knee.value = 0
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 110; lowShelf.gain.value = -1.5
  const highShelf = ctx.createBiquadFilter(); highShelf.type = 'highshelf'; highShelf.frequency.value = 9000; highShelf.gain.value = 1
  const rumble = ctx.createBiquadFilter(); rumble.type = 'highpass'; rumble.frequency.value = 30
  const sectionGain = ctx.createGain()
  master.connect(rumble).connect(lowShelf).connect(highShelf).connect(glue).connect(limiter).connect(sectionGain).connect(ctx.destination)

  const drums = ctx.createGain(); drums.connect(master)
  // The music bus runs through a low-pass that the pivot and the breakdown
  // close down ("muffled, next room") and open again.
  const music = ctx.createGain()
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 18000; tone.Q.value = 0.8
  const duck = ctx.createGain()
  music.connect(tone).connect(duck).connect(master)
  const fx = ctx.createGain(); fx.connect(master)

  const verb = ctx.createConvolver(); verb.buffer = reverbIR(2.4, 0.32)
  const verbIn = ctx.createGain()
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.5
  verbIn.connect(verb).connect(verbOut).connect(master)

  const delay = ctx.createDelay(2); delay.delayTime.value = BEAT * 0.75
  const fb = ctx.createGain(); fb.gain.value = 0.32
  const delayTone = ctx.createBiquadFilter(); delayTone.type = 'lowpass'; delayTone.frequency.value = 3000
  const delayIn = ctx.createGain(); const delayOut = ctx.createGain(); delayOut.gain.value = 0.35
  delayIn.connect(delay); delay.connect(delayTone).connect(fb).connect(delay); delayTone.connect(delayOut).connect(duck)

  const shaper = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2 * x) / Math.tanh(2) }
  shaper.curve = curve
  const kickBus = ctx.createGain(); kickBus.gain.value = 0.95
  shaper.connect(kickBus).connect(drums)

  // ── Building blocks ─────────────────────────────────────────────────────
  function noiseSrc(t, dur) {
    const s = ctx.createBufferSource(); s.buffer = noise
    s.start(Math.max(0, t), rand() * 1.5, dur + 0.05)
    return s
  }
  function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b }
  function gainEnv(t, a, peak, d, sustain = 0, hold = 0, r = 0.05) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    if (hold > 0) {
      g.gain.setTargetAtTime(sustain * peak, t + a, d / 3)
      g.gain.setValueAtTime(sustain * peak, t + a + hold)
      g.gain.linearRampToValueAtTime(0, t + a + hold + r)
    } else {
      g.gain.exponentialRampToValueAtTime(0.0008, t + a + d)
    }
    return g
  }
  function osc(type, f, t, dur, detune = 0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune
    o.start(t); o.stop(t + dur + 0.1)
    return o
  }
  function pan(p) { const n = ctx.createStereoPanner(); n.pan.value = p; return n }
  function send(node, bus, amount) { const g = ctx.createGain(); g.gain.value = amount; node.connect(g).connect(bus) }

  // ── Drums ───────────────────────────────────────────────────────────────
  const kickTimes = []
  function kick(t, v = 1) {
    kickTimes.push(t)
    const o = osc('sine', 150, t, 0.45)
    o.frequency.setValueAtTime(160, t)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.06)
    o.frequency.exponentialRampToValueAtTime(44, t + 0.35)
    o.connect(gainEnv(t, 0.002, v, 0.42)).connect(shaper)
    const n = noiseSrc(t, 0.01), hp = filt('highpass', 3000), ng = gainEnv(t, 0.001, 0.2 * v, 0.01)
    n.connect(hp).connect(ng).connect(shaper)
  }
  function clap(t, v = 1) {
    const out = gainEnv(t, 0.001, 0.5 * v, 0.22)
    const bp = filt('bandpass', 1300, 1.1)
    for (let i = 0; i < 3; i++) {
      const n = noiseSrc(t + i * 0.01, 0.02), g = gainEnv(t + i * 0.01, 0.001, 1, 0.011)
      n.connect(g).connect(bp)
    }
    noiseSrc(t + 0.03, 0.25).connect(bp)
    bp.connect(out).connect(drums)
    send(out, verbIn, 0.3)
  }
  function snare(t, v = 1) {
    const n = noiseSrc(t, 0.2), hp = filt('highpass', 1000), g = gainEnv(t, 0.001, 0.35 * v, 0.13)
    n.connect(hp).connect(g).connect(drums)
    send(g, verbIn, 0.15)
  }
  function hat(t, open = false, v = 1, p = 0.15) {
    const n = noiseSrc(t, open ? 0.3 : 0.06), hp = filt('highpass', open ? 7000 : 9000)
    const g = gainEnv(t, 0.001, (open ? 0.07 : 0.06) * v, open ? 0.2 : 0.03)
    n.connect(hp).connect(g).connect(pan(p)).connect(drums)
  }
  function shaker(t, v = 1) {
    const n = noiseSrc(t, 0.05), bp = filt('bandpass', 6500, 1.5), g = gainEnv(t, 0.008, 0.05 * v, 0.04)
    n.connect(bp).connect(g).connect(pan(-0.3)).connect(drums)
  }
  function crash(t, v = 1) {
    const n = noiseSrc(t, 2), hp = filt('highpass', 5000), g = gainEnv(t, 0.002, 0.14 * v, 1.8)
    n.connect(hp).connect(g).connect(drums)
    send(g, verbIn, 0.4)
  }
  function tick(t, v = 1, f = 2600) {
    const n = noiseSrc(t, 0.03), bp = filt('bandpass', f, 7), g = gainEnv(t, 0.001, 0.55 * v, 0.03)
    n.connect(bp).connect(g).connect(drums)
    const o = osc('sine', f * 0.5, t, 0.05); o.connect(gainEnv(t, 0.001, 0.08 * v, 0.04)).connect(drums)
  }

  // ── Tonal instruments ───────────────────────────────────────────────────
  // House piano: a triangle fundamental plus fast-decaying upper partials and
  // a hammer click, slightly detuned pairs for width.
  function piano(t, m, v = 1, len = 0.6, bright = 1) {
    const f = mtof(m)
    const out = ctx.createGain(); out.gain.value = 0.11 * v
    const lp = filt('lowpass', 2200 + 3000 * bright, 0.5)
    ;[[1, 'triangle', 1, len], [2, 'sine', 0.55, len * 0.6], [3, 'sine', 0.3, len * 0.4], [4, 'sine', 0.16, len * 0.3], [6, 'sine', 0.06, len * 0.2]].forEach(([h, type, a, d], k) => {
      for (const det of k === 0 ? [-6, 6] : [0]) {
        const o = osc(type, f * h, t, d + 0.1, det)
        o.connect(gainEnv(t, 0.002, a / (k === 0 ? 2 : 1), d)).connect(lp)
      }
    })
    const n = noiseSrc(t, 0.02), hp = filt('bandpass', 3000, 1), ng = gainEnv(t, 0.001, 0.05 * v, 0.015)
    n.connect(hp).connect(ng).connect(out)
    lp.connect(out).connect(music)
    send(out, verbIn, 0.35)
    send(out, delayIn, 0.12)
  }
  function stab(t, notes, v = 1, len = 0.32, bright = 1) { for (const m of notes) piano(t, m, v, len, bright) }
  function sub(t, m, dur, v = 1) {
    const o = osc('sine', mtof(m), t, dur)
    o.connect(gainEnv(t, 0.006, 0.38 * v, dur, 1, Math.max(0.02, dur - 0.03), 0.03)).connect(music)
  }
  // Organ bass: a square an octave up through a closing filter, over the sub.
  function organ(t, m, dur, v = 1) {
    const lp = filt('lowpass', 1400, 2)
    lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(350, t + dur)
    const g = gainEnv(t, 0.004, 0.16 * v, dur, 0.6, dur * 0.7, 0.03)
    osc('square', mtof(m + 12), t, dur).connect(lp)
    osc('sine', mtof(m + 24), t, dur).connect(lp)
    lp.connect(g).connect(music)
    sub(t, m, dur * 0.9, 0.9 * v)
  }
  function pad(t, notes, dur, v = 1, cutoff = 1200) {
    const lp = filt('lowpass', cutoff, 0.5), hp = filt('highpass', 200, 0.6)
    const g = gainEnv(t, 0.6, 0.045 * v, dur, 1, Math.max(0.1, dur - 0.6), 1)
    for (const m of notes) for (const d of [-9, 9]) osc('sawtooth', mtof(m), t, dur + 1.2, d).connect(lp)
    lp.connect(hp).connect(g).connect(music)
    send(g, verbIn, 0.6)
  }
  function lead(t, m, dur, v = 1) {
    piano(t, m, 1.2 * v, Math.max(0.5, dur * 1.4), 1.2)
    piano(t, m + 12, 0.5 * v, Math.max(0.4, dur), 1.2)
  }

  // ── Sound effects ───────────────────────────────────────────────────────
  function riser(t0, t1, v = 1) {
    const n = noiseSrc(t0, t1 - t0), bp = filt('bandpass', 400, 2.5)
    bp.frequency.setValueAtTime(350, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1)
    n.connect(bp).connect(g).connect(fx)
    send(g, verbIn, 0.3)
  }
  function impact(t, v = 1) {
    const o = osc('sine', 62, t, 1.3)
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.1)
    o.connect(gainEnv(t, 0.003, 0.7 * v, 1.1)).connect(fx)
    const n = noiseSrc(t, 0.7), lp = filt('lowpass', 2400), g = gainEnv(t, 0.002, 0.28 * v, 0.5)
    n.connect(lp).connect(g).connect(fx)
    send(g, verbIn, 0.7)
  }
  function boom(t, v = 1) {
    if (t >= 0.5) {
      const n = noiseSrc(t - 0.5, 0.5), hp = filt('highpass', 1800)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t - 0.5); g.gain.exponentialRampToValueAtTime(0.2 * v, t - 0.01); g.gain.linearRampToValueAtTime(0, t)
      n.connect(hp).connect(g).connect(fx)
    }
    impact(t, 1.1 * v)
    crash(t, 1.1 * v)
  }
  function whoosh(t, v = 1, len = 0.42) {
    const t0 = t - len * 0.65
    const n = noiseSrc(t0, len), bp = filt('bandpass', 600, 1.6)
    bp.frequency.setValueAtTime(500, t0); bp.frequency.exponentialRampToValueAtTime(5200, t0 + len * 0.65); bp.frequency.exponentialRampToValueAtTime(1400, t0 + len)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.28 * v, t0 + len * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    n.connect(bp).connect(g).connect(fx)
  }
  function pop(t, v = 1) {
    const o = osc('sine', 900, t, 0.12)
    o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.07)
    o.connect(gainEnv(t, 0.002, 0.25 * v, 0.09)).connect(fx)
  }
  // A stream of tiny clicks while blocks pour somewhere: n clicks over dur.
  function pour(t, dur = 0.8, n = 14, v = 1) {
    for (let i = 0; i < n; i++) {
      const tt = t + (dur * i) / n + rand() * 0.02
      const o = osc('sine', 1400 + rand() * 900, tt, 0.04)
      o.connect(gainEnv(tt, 0.001, 0.07 * v, 0.035)).connect(pan(rand() * 1.2 - 0.6)).connect(fx)
    }
  }
  // Money in the bill: a two-note bell.
  function coin(t, v = 1) {
    ;[[988, 0, 0.09], [1319, 0.075, 0.5]].forEach(([f, dt, d]) => {
      const tt = t + dt, g = gainEnv(tt, 0.002, 0.11 * v, d)
      osc('square', f, tt, d).connect(filt('lowpass', 5000)).connect(g).connect(fx)
      send(g, verbIn, 0.25)
    })
  }
  function ding(t, v = 1) {
    for (const [f, a, d] of [[1568, 0.11, 1.2], [2349, 0.05, 0.8], [3136, 0.035, 0.5]]) {
      const g = gainEnv(t, 0.002, a * v, d)
      osc('sine', f, t, d).connect(g).connect(fx)
      send(g, verbIn, 0.5)
    }
  }
  function thud(t, v = 1) {
    const o = osc('sine', 110, t, 0.25)
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15)
    o.connect(gainEnv(t, 0.002, 0.6 * v, 0.2)).connect(fx)
  }
  function powerdown(t, v = 1) {
    const o = osc('sawtooth', 700, t, 0.7), lp = filt('lowpass', 1500)
    o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.6)
    lp.frequency.setValueAtTime(2000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.6)
    o.connect(lp).connect(gainEnv(t, 0.005, 0.1 * v, 0.65)).connect(fx)
  }
  function shimmer(t, v = 1) {
    ;[84, 88, 91, 96].forEach((m, i) => {
      const tt = t + i * S16, g = gainEnv(tt, 0.002, 0.045 * v, 0.5)
      osc('triangle', mtof(m), tt, 0.5).connect(g).connect(fx)
      send(g, verbIn, 0.6); send(g, delayIn, 0.3)
    })
  }
  const swish = (t, v = 1) => whoosh(t, 0.8 * v, 0.3)

  // The series' audio logo under the brand card: a soft low hit, then a rising D-major bell arpeggio over a held chord.
  function logo(t, v = 1) {
    impact(t, 0.45 * v)
    pad(t, [62, 66, 69, 74], 3.2, 1.2 * v, 1800)
    sub(t, 38, 3, 0.6 * v)
    ;[74, 81, 86, 90].forEach((m, i) => {
      const tt = t + 0.12 + i * 0.16
      for (const [h, a, d] of [[1, 0.09, 2.4], [2.76, 0.03, 1.2], [5.4, 0.012, 0.6]]) {
        const g = gainEnv(tt, 0.002, a * v, d)
        osc('sine', mtof(m) * h, tt, d).connect(g).connect(fx)
        send(g, verbIn, 0.6); send(g, delayIn, 0.2)
      }
    })
  }

  const SFX = { impact, boom, whoosh, swish, pop, pour, coin, ding, thud, powerdown, shimmer, logo, tick: (t) => tick(t, 0.8, 3200) }

  // ── Arrangement ─────────────────────────────────────────────────────────
  const secOf = (bar) => SECTIONS.find((s) => bar >= s.from && bar <= s.to)
  const fill16 = (t0, n, fn) => { for (let i = 0; i < n; i++) fn(t0 + i * S16, i) }

  for (let bar = 0; bar < BARS; bar++) {
    const sec = secOf(bar), k = sec.kind, t = bt(bar), key = sec.key || 0
    const base = chordAt(bar, sec)
    const ch = { root: base.root + key, notes: base.notes.map((m) => m + key) }
    const pos = bar - sec.from, len = sec.to - sec.from + 1, last = bar === sec.to

    if (k === 'hook') {
      // Piano chords on the downbeat and the "and" of 2, a kick under each;
      // hats ticking so the frame never sits still.
      stab(t, ch.notes, 1.15, 0.9, 1)
      stab(t + BEAT * 1.5, ch.notes, 0.8, 0.5, 0.8)
      sub(t, ch.root, BEAT * 1.4, 1); sub(t + BEAT * 1.5, ch.root, BEAT * 1.5, 0.8)
      kick(t, 1); kick(t + BEAT * 2, 0.8)
      pad(t, ch.notes.map((m) => m - 12), BAR, 0.7, 800)
      fill16(t, 16, (tt, i) => i % 2 === 1 && hat(tt, false, i % 4 === 3 ? 0.7 : 0.4))
      if (last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.25 + i * 0.12))
    }

    if (k === 'title') {
      kick(t, 1)
      stab(t, ch.notes, 1.2, 1.4, 1.1)
      stab(t + BEAT * 2.5, ch.notes.map((m) => m + 12), 0.5, 0.6, 1)
      pad(t, ch.notes, BAR, 1, 1500)
      sub(t, ch.root, BAR * 0.9, 0.9)
      riser(t + BEAT, t + BAR - S16, 0.6)
    }

    if (k === 'groove' || k === 'groove2') {
      const warm = k === 'groove2'
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 0.92)
        if (b === 1 || b === 3) clap(tb, warm ? 0.8 : 0.65)
        hat(tb + BEAT / 2, warm, 0.8, 0.2)
        shaker(tb + BEAT / 4, 0.8); shaker(tb + BEAT * 0.75, 0.6)
      }
      for (const s of STAB) stab(t + s * S16, ch.notes, warm ? 0.8 : 0.65, 0.28, warm ? 0.7 : 0.55)
      for (const [q, d] of [[0.5, 0.4], [1.5, 0.4], [2.5, 0.4], [3.5, 0.4]]) organ(t + BEAT * q, ch.root, BEAT * d, warm ? 0.9 : 0.75)
      pad(t, ch.notes, BAR, warm ? 0.8 : 0.6, 1100)
      if (last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.35 + i * 0.12))
    }

    if (k === 'drop' || k === 'drop2') {
      const big = k === 'drop2'
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 1)
        if (b === 1 || b === 3) { clap(tb, 1); snare(tb, 0.4) }
        hat(tb + BEAT / 2, true, 0.9, 0.15)
        for (const q of [0.25, 0.75]) hat(tb + BEAT * q, false, big ? 0.55 : 0.4, -0.15)
        shaker(tb + BEAT / 4, 1)
      }
      for (const s of STAB) stab(t + s * S16, ch.notes, big ? 1 : 0.9, 0.3, big ? 1.1 : 0.9)
      for (const [q, o] of [[0, 0], [0.5, 12], [1.5, 0], [2, 12], [2.5, 0], [3.5, 12]]) organ(t + BEAT * q, ch.root + o, BEAT * 0.42, 1)
      pad(t, ch.notes, BAR, big ? 1 : 0.8, big ? 2400 : 1600)
      if (pos % 4 === 0) crash(t, 0.9)
      if (big) for (const [o, m, d] of hookAt(bar, sec)) lead(t + o * BEAT, m + key, d * BEAT * 0.95, 1)
      if (last && bar < BARS) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.45 + i * 0.1))
    }

    if (k === 'stop') {
      // Everything drops out under "100 万付完了吗？": one muffled chord and
      // a held pad; the second bar rises into "才刚开始" and the bank.
      if (pos === 0) { stab(t, ch.notes, 0.9, 1.6, 0.2); sub(t, ch.root, BEAT * 2, 0.6); pad(t, ch.notes, BAR, 0.6, 600) }
      if (last) { riser(t, t + BAR - S16, 0.8); fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.3 + i * 0.15)) }
    }

    if (k === 'clock') {
      // The mortgage: a tick-tock on every eighth, half-time kick, the stab
      // thinned out and darker.
      for (let i = 0; i < 8; i++) tick(t + i * BEAT / 2, i % 2 ? 0.45 : 0.8, i % 2 ? 2200 : 3000)
      kick(t, 1); kick(t + BEAT * 2.5, 0.75)
      clap(t + BEAT * 2, 0.7)
      for (const s of [0, 6, 10]) stab(t + s * S16, ch.notes, 0.6, 0.3, 0.35)
      organ(t, ch.root, BEAT * 1.8, 0.7); organ(t + BEAT * 2.5, ch.root, BEAT * 1.3, 0.6)
      pad(t, ch.notes, BAR, 0.8, 900)
      if (last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.3 + i * 0.12))
    }

    if (k === 'breakdown') {
      // The future: no drums, a wide pad and a slow piano line.
      pad(t, ch.notes, BAR, 1.1, 1400)
      sub(t, ch.root, BAR * 0.9, 0.5)
      for (const [o, i] of [[0, 0], [1.5, 1], [2, 2], [3, 3]]) piano(t + o * BEAT, ch.notes[i] + 12, 0.7, 0.9, 0.4)
      if (pos >= 2) { kick(t, 0.6); kick(t + BEAT * 2, 0.5) }
    }

    if (k === 'build') {
      if (pos === 0) { riser(t, bt(sec.to + 1) - S16 * 2, 1.2); pad(t, ch.notes, len * BAR - S16 * 2, 1, 900) }
      const p = (pos + 1) / len
      const step = p > 0.75 ? 2 : 4
      for (let i = 0; i < 16; i += step) {
        if (last && i >= 14) break
        kick(t + i * S16, 0.85)
        snare(t + i * S16, 0.25 + 0.5 * p * (i / 16) + 0.2 * p)
      }
      for (const s of STAB) stab(t + s * S16, ch.notes, 0.5 + 0.3 * p, 0.25, 0.4 + 0.5 * p)
      sub(t, ch.root, last ? BAR - S16 * 2 : BAR, 0.8)
    }

    if (k === 'reflect') {
      // The bill turned into years: drums out, a slow piano over a pad, the
      // chord voiced low and open.
      pad(t, ch.notes, BAR, 1.1, 1100)
      sub(t, ch.root, BAR * 0.95, 0.45)
      stab(t, ch.notes.map((m) => m - 12), 0.7, 1.8, 0.25)
      for (const [o, i] of [[0, 3], [1, 2], [2, 1], [3, 0]]) piano(t + o * BEAT, ch.notes[i] + 12, 0.75, 1.2, 0.3)
      if (last) riser(t + BEAT * 2, t + BAR - S16, 0.5)
    }

    if (k === 'travel') {
      // Where the money went: the pulse comes back and an arpeggio climbs
      // through the bars as the streams fan out.
      kick(t, 0.75); kick(t + BEAT * 2, 0.6)
      fill16(t, 16, (tt, i) => i % 2 === 1 && shaker(tt, 0.8))
      clap(t + BEAT * 3, 0.45)
      const arp = [...ch.notes, ...ch.notes.map((m) => m + 12)]
      const pp = len > 1 ? pos / (len - 1) : 0 // 0 -> 1 across the section
      fill16(t, 8, (tt, i) => piano(t + i * BEAT / 2, arp[(i + pos * 2) % arp.length] + 12, 0.55 + 0.15 * pp, 0.5, 0.4 + 0.3 * pp))
      pad(t, ch.notes, BAR, 1, 1400 + 800 * pp)
      organ(t, ch.root, BEAT * 1.8, 0.6); organ(t + BEAT * 2, ch.root, BEAT * 1.8, 0.6)
      if (last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.25 + i * 0.1))
    }

    if (k === 'anthem') {
      // The landing: a lifted key, long piano chords, a wide pad and one
      // soft kick per bar; warm rather than loud.
      if (pos === 0) crash(t, 0.7)
      kick(t, 0.8)
      stab(t, ch.notes, 1.1, 2.4, 0.7)
      stab(t + BEAT * 2.5, ch.notes.map((m) => m + 12), 0.5, 1.2, 0.6)
      pad(t, ch.notes, BAR, 1.3, 2000)
      sub(t, ch.root, BAR * 0.95, 0.8)
      for (const [o, m, d] of hookAt(bar, sec)) piano(t + o * BEAT, m + key, 0.6, d * BEAT * 2, 0.6)
    }

    if (k === 'outro') {
      const end = false // the last bars belong to the audio logo (the 'tail' section)
      if (pos === 0) kick(t, 0.9)
      const notes = end ? CHORDS[0].notes : ch.notes
      stab(t, notes, 1, end ? 3.5 : 1.4, 0.8)
      if (!end) stab(t + BEAT * 2.5, notes, 0.6, 0.8, 0.6)
      pad(t, notes, end ? BAR + 2 : BAR, 1.1, 1300)
      sub(t, end ? CHORDS[0].root : ch.root, end ? BAR + 1.5 : BAR * 0.9, 0.8)
      if (pos === 0) fill16(t, 16, (tt, i) => i % 2 === 1 && hat(tt, false, 0.4))
    }
  }

  for (const [bar, beat, type, ...a] of CUES) SFX[type](bt(bar, beat), ...a)

  // Muffle the music under the television flashback (bars 50-54), like an old room next door; open it again after.
  tone.frequency.setValueAtTime(18000, bt(50))
  tone.frequency.exponentialRampToValueAtTime(900, bt(50, 2))
  tone.frequency.setValueAtTime(900, bt(54, 2))
  tone.frequency.exponentialRampToValueAtTime(18000, bt(55))

  // Sidechain: dip the music bus under every kick.
  duck.gain.setValueAtTime(1, 0)
  for (const t of kickTimes) {
    duck.gain.setValueAtTime(1, Math.max(0, t - 0.002))
    duck.gain.linearRampToValueAtTime(0.4, t + 0.008)
    duck.gain.setTargetAtTime(1, t + 0.02, 0.08)
  }

  const LEVEL = { tail: 0.95, hook: 1, title: 0.95, groove: 0.78, drop: 0.95, stop: 0.9, clock: 0.85, groove2: 0.82, breakdown: 0.9, build: 0.92, drop2: 1, reflect: 0.85, travel: 0.88, anthem: 0.95, outro: 0.95 }
  let prev = LEVEL[SECTIONS[0].kind]
  sectionGain.gain.setValueAtTime(prev, 0)
  for (const sec of SECTIONS.slice(1)) {
    const t0 = bt(sec.from), g = LEVEL[sec.kind]
    sectionGain.gain.setValueAtTime(prev, t0 - 0.03)
    sectionGain.gain.linearRampToValueAtTime(g, t0)
    prev = g
  }

  master.gain.setValueAtTime(master.gain.value, DURATION - 1.2)
  master.gain.linearRampToValueAtTime(0, DURATION)

  return ctx.startRendering()
}

function toWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2))
  const w = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true)
  data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true)
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * ch * 2, true)
  const chans = [...Array(ch)].map((_, c) => buf.getChannelData(c))
  let o = 44
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i]))
    data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2
  }
  return new Uint8Array(data.buffer)
}

window.renderWav = async () => {
  const t0 = performance.now()
  const buf = await renderScore()
  const bytes = toWav(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return { b64: btoa(bin), ms: performance.now() - t0, seconds: DURATION }
}
window.ready = true
