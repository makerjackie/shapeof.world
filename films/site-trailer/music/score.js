// Original score for the shapeof.world site trailer. Synthesized with Web Audio in an OfflineAudioContext; no samples.
// The engine (drums, piano, organ bass, pad, effects) is the series engine, copied from films/indie-dev/music/score.js;
// this file adds a saw pluck arpeggio, a reverse cymbal, the logo resolved onto A, and its own arrangement.
// A minor, 900/7 ≈ 128.6 BPM so one beat is exactly 14 frames at 30 fps (one bar = 56 frames). Two intro bars (the
// laptop, bars -2 and -1) come first, so bar 0 (the montage's first hit) starts at T0 = 2 bars. The intro is moving on
// frame 0: a soft pulse under a closed arpeggio, the pad swelling, the pointer's click, a riser into the bar-0 hit.
// The bar table mirrors src/edl.ts.

const BEAT = 7 / 15
const BAR = 4 * BEAT
const T0 = 2 * BAR
const BARS = 16
const DURATION = T0 + 15.5 * BAR + 1.2
const bt = (bar, beat = 0) => T0 + bar * BAR + beat * BEAT

// One chord per bar, by film bar.
const Am9 = { root: 33, notes: [60, 64, 67, 71] }
const F9 = { root: 41, notes: [57, 60, 64, 67] }
const Cadd9 = { root: 36, notes: [55, 60, 62, 64] }
const G6 = { root: 31, notes: [59, 62, 64, 67] }
const Gadd9 = { root: 43, notes: [59, 62, 67, 69] }
const E7 = { root: 40, notes: [56, 59, 62, 64] }
const CHORDS = [Am9, F9, Cadd9, G6, Am9, F9, Cadd9, G6, Am9, F9, E7, F9, Gadd9, Am9, Am9, Am9]

// hook: 2-beat cuts; drop: 1-beat cuts and the ink ramp; grid: the 3×3 panorama; drop again; build: eighth-note
// cuts into one beat of silence; anthem: the black hole and the closing line; tail: the brand card.
const SECTIONS = [
  { from: 0, to: 3, kind: 'hook' },
  { from: 4, to: 7, kind: 'drop' },
  { from: 8, to: 8, kind: 'grid' },
  { from: 9, to: 9, kind: 'drop' },
  { from: 10, to: 10, kind: 'build' },
  { from: 11, to: 12, kind: 'anthem' },
  { from: 13, to: 15, kind: 'tail' },
]

// Sound effects on the picture: [bar, beat, type, ...args].
const CUES = [
  [-1, 1, 'tick', 0.9], // the pointer presses the Starry Night card
  [0, 0, 'boom', 1.1],
  [1, 0, 'swish', 0.5], [2, 0, 'swish', 0.6], [3, 0, 'swish', 0.7],
  [4, 0, 'impact', 0.9], [6, 0, 'whoosh', 0.9], [7, 0, 'swish', 0.7],
  // the grid: one tick per tile, then the push into the middle tile
  [8, 0, 'tick'], [8, 0.25, 'tick'], [8, 0.5, 'tick'], [8, 0.75, 'tick'], [8, 1, 'tick'], [8, 1.25, 'tick'], [8, 1.5, 'tick'], [8, 1.75, 'tick'], [8, 2, 'tick'], [8, 2.25, 'shimmer'],
  [9, 0, 'whoosh', 1.1], [9, 0, 'impact', 0.7],
  [10, 0, 'swish', 0.5],
  [11, 0, 'boom', 1.2], [12, 0, 'shimmer', 1.2],
  [13, 0, 'logo'],
]

const SR = 48000
const S16 = BEAT / 4
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

const STAB = [0, 3, 6, 10, 13]
// The hook over Am – F – C – G, and its lift over F – G for the anthem: [beat offset, midi, beats].
const HOOK = [
  [[0, 76, 0.75], [0.75, 74, 0.25], [1, 72, 1], [2, 71, 0.5], [2.5, 72, 1.5]],
  [[0, 72, 0.75], [0.75, 71, 0.25], [1, 69, 1], [2, 67, 0.5], [2.5, 69, 1.5]],
  [[0, 67, 0.5], [0.5, 69, 0.5], [1, 72, 1], [2, 74, 0.5], [2.5, 76, 1.5]],
  [[0, 74, 0.75], [0.75, 72, 0.25], [1, 71, 1], [2, 67, 0.5], [2.5, 71, 1.5]],
]
const PEAK_HOOK = [
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 1], [2, 74, 0.5], [2.5, 72, 1.5]],
  [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 1], [2, 76, 0.5], [2.5, 81, 1.5]],
]

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


  // ── Additions for the trailer ───────────────────────────────────────────
  // Saw pluck: two detuned saws through a fast-closing low-pass, for the sixteenth-note arpeggio.
  let pk = 0
  function pluck(t, m, v = 1, open = 1) {
    const lp = filt('lowpass', 800, 3)
    lp.frequency.setValueAtTime(700 + 4200 * open, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.16)
    const g = gainEnv(t, 0.002, 0.07 * v, 0.2)
    for (const d of [-7, 7]) osc('sawtooth', mtof(m), t, 0.25, d).connect(lp)
    lp.connect(g).connect(pan(pk++ % 2 ? 0.35 : -0.35)).connect(music)
    send(g, delayIn, 0.22); send(g, verbIn, 0.15)
  }
  function arp(t, ch, v, open, n = 16) {
    const seq = [0, 1, 2, 3, 4, 3, 2, 1]
    const pool = [...ch.notes, ch.notes[0] + 12]
    for (let i = 0; i < n; i++) pluck(t + i * S16, pool[seq[i % 8]] + 12, v * (i % 4 === 0 ? 1 : 0.7), open)
  }
  // Reverse cymbal into a downbeat.
  function suck(t1, len = 0.9, v = 1) {
    const t0 = t1 - len
    const n = noiseSrc(t0, len), hp = filt('highpass', 4000)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16 * v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1)
    n.connect(hp).connect(g).connect(fx)
  }
  // The series audio logo, resolved onto A: a soft low hit, a held Am(add9) and a rising bell arpeggio.
  function logoA(t, v = 1) {
    impact(t, 0.5 * v)
    pad(t, [57, 64, 67, 71], 3.4, 1.2 * v, 1800)
    sub(t, 33, 3.2, 0.6 * v)
    ;[69, 76, 81, 83].forEach((m, i) => {
      const tt = t + 0.12 + i * 0.16
      for (const [h, a, d] of [[1, 0.09, 2.4], [2.76, 0.03, 1.2], [5.4, 0.012, 0.6]]) {
        const g = gainEnv(tt, 0.002, a * v, d)
        osc('sine', mtof(m) * h, tt, d).connect(g).connect(fx)
        send(g, verbIn, 0.6); send(g, delayIn, 0.2)
      }
    })
  }
  SFX.logo = logoA

  // ── Arrangement ─────────────────────────────────────────────────────────
  const secOf = (bar) => SECTIONS.find((s) => bar >= s.from && bar <= s.to)
  const fill16 = (t0, n, fn) => { for (let i = 0; i < n; i++) fn(t0 + i * S16, i) }
  const SILENCE = bt(10, 3) // one beat of nothing before the black hole

  // Intro, bars -2 and -1: a muffled pulse on every beat, the arpeggio closed and quiet, the pad opening; offbeat
  // hats join in the second bar, then a riser and a reverse cymbal pull into the bar-0 hit.
  for (let bar = -2; bar < 0; bar++) {
    const t = bt(bar), p = bar + 2
    for (let b = 0; b < 4; b++) {
      const tb = t + b * BEAT
      kick(tb, 0.32 + 0.14 * p)
      if (p === 1) hat(tb + BEAT / 2, false, 0.3 + 0.1 * b, 0.2)
    }
    arp(t, Am9, 0.4 + 0.25 * p, 0.06 + 0.14 * p)
    pad(t, Am9.notes, BAR, 0.3 + 0.35 * p, 450 + 550 * p)
  }
  riser(bt(-1), bt(0) - S16, 0.85)
  suck(bt(0), 0.9, 1)

  for (let bar = 0; bar < BARS; bar++) {
    const sec = secOf(bar), k = sec.kind, t = bt(bar)
    const ch = CHORDS[bar]
    const pos = bar - sec.from, last = bar === sec.to

    if (k === 'hook') {
      // Already moving on frame 0: four-on-the-floor, offbeat organ bass, the arpeggio opening bar by bar.
      const p = pos / 3
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 1)
        hat(tb + BEAT / 2, false, 0.6 + 0.4 * p, 0.2)
        if (pos >= 2 && (b === 1 || b === 3)) clap(tb, 0.45 + 0.2 * p)
        organ(tb + BEAT / 2, ch.root, BEAT * 0.4, 0.75)
      }
      arp(t, ch, 0.8 + 0.3 * p, 0.25 + 0.6 * p)
      pad(t, ch.notes, BAR, 0.6 + 0.3 * p, 900 + 900 * p)
      if (pos === 0) stab(t, ch.notes, 1.1, 0.9, 1)
      if (last) { fill16(bt(bar, 2), 8, (tt, i) => snare(tt, 0.2 + i * 0.07)); riser(bt(bar, 1), bt(bar + 1) - S16, 0.7); suck(bt(bar + 1), 0.8, 1) }
    }

    if (k === 'drop') {
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 1)
        if (b === 1 || b === 3) { clap(tb, 1); snare(tb, 0.4) }
        hat(tb + BEAT / 2, true, 0.9, 0.15)
        for (const q of [0.25, 0.75]) hat(tb + BEAT * q, false, 0.5, -0.15)
        shaker(tb + BEAT / 4, 1)
      }
      for (const s of STAB) stab(t + s * S16, ch.notes, 0.95, 0.3, 1.05)
      for (const [q, o] of [[0, 0], [0.5, 12], [1.5, 0], [2, 12], [2.5, 0], [3.5, 12]]) organ(t + BEAT * q, ch.root + o, BEAT * 0.42, 1)
      pad(t, ch.notes, BAR, 1, 2200)
      arp(t, ch, 0.7, 0.9)
      if (pos === 0) crash(t, 0.9)
      for (const [o, m, d] of HOOK[bar % 4]) lead(t + o * BEAT, m, d * BEAT * 0.95, 1)
      if (last && bar === 7) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.4 + i * 0.1))
      if (last && bar === 9) suck(bt(bar + 1), 0.5, 0.7)
    }

    if (k === 'grid') {
      // Breath: one big chord and a kick, the arpeggio alone, then a riser into the push.
      kick(t, 1); kick(t + BEAT * 2, 0.7)
      stab(t, ch.notes, 1, 1.4, 0.9)
      sub(t, ch.root, BAR * 0.9, 0.9)
      pad(t, ch.notes, BAR, 1, 1600)
      arp(t, ch, 0.75, 0.6, 12)
      riser(bt(bar, 2), bt(bar + 1) - S16, 0.9)
      suck(bt(bar + 1), 0.6, 1)
    }

    if (k === 'build') {
      // Eighths of kick and snare tightening to sixteenths, a riser, then everything stops for the last beat.
      riser(t, SILENCE - 0.01, 1.3)
      for (let i = 0; i < 12; i++) {
        const tt = t + i * S16
        if (i >= 8 || i % 2 === 0) { kick(tt, 0.85); snare(tt, 0.3 + 0.05 * i) }
      }
      for (const s of [0, 3, 6, 10]) stab(t + s * S16, ch.notes, 0.9, 0.25, 1.1)
      sub(t, ch.root, SILENCE - t - 0.02, 0.9)
      pad(t, ch.notes, SILENCE - t, 1, 2400)
    }

    if (k === 'anthem') {
      // The landing: everything back, the hook lifted, a crash on each bar.
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 1)
        if (b === 1 || b === 3) { clap(tb, 1); snare(tb, 0.45) }
        hat(tb + BEAT / 2, true, 1, 0.15)
        for (const q of [0.25, 0.75]) hat(tb + BEAT * q, false, 0.55, -0.15)
        shaker(tb + BEAT / 4, 1)
      }
      crash(t, pos === 0 ? 1.2 : 0.8)
      stab(t, ch.notes, 1.1, 1.6, 1)
      for (const s of STAB.slice(1)) stab(t + s * S16, ch.notes, 0.8, 0.3, 1.1)
      for (const [q, o] of [[0, 0], [0.5, 12], [1.5, 0], [2, 12], [2.5, 0], [3.5, 12]]) organ(t + BEAT * q, ch.root + o, BEAT * 0.42, 1)
      pad(t, ch.notes, BAR, 1.3, 2800)
      pad(t, ch.notes.map((m) => m + 12), BAR, 0.6, 3000)
      arp(t, ch, 0.8, 1)
      for (const [o, m, d] of PEAK_HOOK[pos]) lead(t + o * BEAT, m, d * BEAT * 0.95, 1.15)
      if (last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.35 + i * 0.1))
    }

    if (k === 'tail' && pos === 0) {
      // The brand card: the logo plus one long chord and the arpeggio dying away.
      kick(t, 0.9)
      stab(t, ch.notes, 0.9, 2.6, 0.7)
      arp(t, ch, 0.45, 0.4, 8)
    }
  }

  for (const [bar, beat, type, ...a] of CUES) SFX[type](bt(bar, beat), ...a)

  // Sidechain: dip the music bus under every kick.
  duck.gain.setValueAtTime(1, 0)
  for (const t of kickTimes) {
    duck.gain.setValueAtTime(1, Math.max(0, t - 0.002))
    duck.gain.linearRampToValueAtTime(0.45, t + 0.008)
    duck.gain.setTargetAtTime(1, t + 0.02, 0.07)
  }

  const LEVEL = { hook: 0.88, drop: 1, grid: 0.86, build: 0.95, anthem: 1, tail: 0.95 }
  let prev = LEVEL[SECTIONS[0].kind]
  sectionGain.gain.setValueAtTime(prev, 0)
  for (const sec of SECTIONS.slice(1)) {
    const t0 = bt(sec.from), g = LEVEL[sec.kind]
    if (sec.kind === 'anthem') { prev = g; continue } // set after the silent beat below
    sectionGain.gain.setValueAtTime(prev, t0 - 0.03)
    sectionGain.gain.linearRampToValueAtTime(g, t0)
    prev = g
  }
  // The silent beat: cut every tail (reverb, delay) dead, and open again on the black hole.
  sectionGain.gain.setValueAtTime(LEVEL.build, SILENCE - 0.02)
  sectionGain.gain.linearRampToValueAtTime(0, SILENCE)
  sectionGain.gain.setValueAtTime(0, bt(11) - 0.004)
  sectionGain.gain.linearRampToValueAtTime(LEVEL.anthem, bt(11))

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
