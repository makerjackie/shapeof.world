// Original score for "活着是主线": a gentle, slow-breathing track for a film about a life of about 4100 weeks.
// Synthesized with Web Audio in an OfflineAudioContext; no samples. The engine (drums, piano, organ bass, pad,
// effects, the audio logo) is the one from films/tower/music/score.js (itself from films/house), so the series keeps
// one set of sounds; this film plays it softer: felt kicks, a rim instead of claps until late, music-box bells.
// D major, 96 BPM, Dmaj9 – F#m7 – Bm9 – Gmaj9, one chord per bar. Bars count from 0 like the film's bars
// (src/timing.ts): bar 0 starts at 0.5 s, one bar = 2.5 s. The section table mirrors src/scenes.ts.

const BEAT = 0.625
const BAR = 2.5
const T0 = 0.5
const BARS = 52 // bars 0–51; the film ends half way through bar 51
const DURATION = T0 + 51.5 * BAR + 1.0
const bt = (bar, beat = 0) => T0 + bar * BAR + beat * BEAT

// [from, to] inclusive film bars.
const SECTIONS = [
  { from: 0, to: 5, kind: 'intro' },
  { from: 6, to: 7, kind: 'title' },
  { from: 8, to: 16, kind: 'walk' },
  { from: 17, to: 22, kind: 'walk2' },
  { from: 23, to: 26, kind: 'breakdown' },
  { from: 27, to: 27, kind: 'build' },
  { from: 28, to: 33, kind: 'rise' },
  { from: 34, to: 43, kind: 'anthem' },
  { from: 44, to: 45, kind: 'coda' },
  { from: 46, to: 51, kind: 'outro' },
]

// Sound effects on the picture: [bar, beat, type, ...args].
const CUES = [
  [0, 0, 'bloom'],
  [1, 0, 'bell', 86], [1, 2, 'bell', 90],
  [2, 0, 'swish'], [2, 3.6, 'shimmer'],
  [4, 0, 'swish'],
  [6, 0, 'bloom'],
  [8, 0, 'swish'], [9, 1, 'shimmer'], [10, 0, 'pop'],
  [11, 0, 'swish'], [11, 0.5, 'bell', 81], [11, 1.3, 'bell', 83], [11, 2.1, 'bell', 85], [12, 3.5, 'chime'],
  [14, 0, 'swish'], [14, 3, 'shimmer'], [16, 0, 'chime'],
  [17, 0, 'swish'], [17, 3, 'pop'], [17, 3.8, 'pop'], [18, 0.6, 'pop'], [18, 1.5, 'powerdown'],
  [20, 0, 'swish'], [20, 2, 'shimmer'], [21, 2, 'shimmer'], [22, 2, 'chime'],
  [23, 0, 'swish'], [23, 1.8, 'pop'], [23, 2.3, 'pop'], [23, 2.8, 'pop'],
  [25, 0, 'swish'], [26, 1, 'thud'], [26, 3.5, 'chime'],
  [28, 0, 'bloom'], [30, 0, 'impact', 0.5], [30, 0, 'chime'],
  [32, 0, 'swish'],
  [34, 0, 'shimmer'], [37, 0, 'swish'], [37, 0.5, 'shimmer'], [39, 2, 'chime'],
  [41, 0, 'bloom'], [41, 3, 'chime'],
  [44, 0, 'swish'],
  [46, 0, 'swish'],
  [49, 2, 'logo'],
]

const SR = 48000
const S16 = BEAT / 4
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

const CHORDS = [
  { root: 38, notes: [57, 61, 64, 66] }, // Dmaj9: A C# E F# over D
  { root: 42, notes: [57, 61, 64, 69] }, // F#m7: A C# E A over F#
  { root: 35, notes: [57, 61, 62, 66] }, // Bm9: A C# D F# over B
  { root: 43, notes: [57, 59, 62, 66] }, // Gmaj9: A B D F# over G
]
const chordAt = (bar) => CHORDS[((bar % 4) + 4) % 4]

// The film's tune, one bar per chord: [beat offset, midi, beats].
const HOOK = [
  [[0, 78, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 76, 2]],
  [[0, 73, 1], [1, 76, 1], [2, 81, 1.5], [3.5, 78, 0.5]],
  [[0, 78, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 73, 1], [3, 71, 1]],
  [[0, 74, 1.5], [1.5, 73, 0.5], [2, 71, 0.5], [2.5, 69, 1.5]],
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

  // ── This film's softer voices ───────────────────────────────────────────
  // Music-box bell: a sine with two inharmonic partials.
  function bell(t, m, v = 1, d = 1.6) {
    for (const [h, a, dd] of [[1, 0.07, d], [2.76, 0.018, d * 0.5], [5.4, 0.007, d * 0.25]]) {
      const g = gainEnv(t, 0.002, a * v, dd)
      osc('sine', mtof(m) * h, t, dd).connect(g).connect(music)
      send(g, verbIn, 0.55); send(g, delayIn, 0.22)
    }
  }
  // The opening light: a low swell and a bell chord instead of a hit.
  function bloom(t, v = 1) {
    impact(t, 0.3 * v)
    crash(t, 0.3 * v)
    ;[74, 78, 81, 86].forEach((m, i) => bell(t + i * 0.06, m, 0.9 * v, 2.6))
  }
  const rim = (t, v = 1) => tick(t, 0.45 * v, 1900)
  SFX.bloom = bloom
  SFX.bell = (t, m = 86) => bell(t, m, 1, 1.4)
  SFX.chime = (t) => [81, 86, 90].forEach((m, i) => bell(t + i * 0.09, m, 0.8, 1.6))
  SFX.pop = (t) => pop(t, 0.6)
  SFX.swish = (t) => whoosh(t, 0.45, 0.4)
  SFX.impact = (t, v = 0.5) => impact(t, v)

  // ── Arrangement ─────────────────────────────────────────────────────────
  const secOf = (bar) => SECTIONS.find((s) => bar >= s.from && bar <= s.to)
  const fill16 = (t0, n, fn) => { for (let i = 0; i < n; i++) fn(t0 + i * S16, i) }
  const tune = (t, bar, v, octave = 0) => { for (const [o, m, d] of HOOK[bar % 4]) bell(t + o * BEAT, m + octave, v, Math.max(0.8, d * BEAT * 2)) }

  for (let bar = 0; bar < BARS; bar++) {
    const sec = secOf(bar), k = sec.kind, t = bt(bar)
    const ch = chordAt(bar)
    const pos = bar - sec.from, len = sec.to - sec.from + 1, last = bar === sec.to
    const arp = [ch.notes[0], ch.notes[1], ch.notes[2], ch.notes[3], ch.notes[0] + 12, ch.notes[3], ch.notes[2], ch.notes[1]]

    if (k === 'intro') {
      // A soft piano chord on 1 and a lighter one on the "and" of 3, a felt kick under the first; from the grid on,
      // music-box arpeggios and a shaker so the picture never sits in silence.
      stab(t, ch.notes, 0.85, 1.8, 0.45)
      stab(t + BEAT * 2.5, ch.notes.map((m) => m + 12), 0.4, 0.9, 0.45)
      sub(t, ch.root, BAR * 0.9, 0.6)
      kick(t, 0.5)
      pad(t, ch.notes.map((m) => m - 12), BAR, 0.6, 700)
      if (bar >= 2) {
        fill16(t, 16, (tt, i) => i % 2 === 1 && shaker(tt, i % 4 === 3 ? 0.55 : 0.3))
        for (const [o, i] of [[0.5, 0], [1, 1], [1.5, 2], [2, 3]]) bell(t + o * BEAT, ch.notes[i] + 24, 0.35, 0.9)
      }
    }

    if (k === 'title') {
      kick(t, 0.65)
      stab(t, ch.notes, 1, 2.4, 0.6)
      pad(t, ch.notes, BAR, 1, 1400)
      sub(t, ch.root, BAR * 0.9, 0.75)
      tune(t, bar, 0.7)
      if (last) riser(t + BEAT * 2, t + BAR - S16, 0.3)
    }

    if (k === 'walk' || k === 'walk2') {
      // A slow walk: felt kick on 1 and 3, a rim on 2 and 4 (soft claps join in the second half), a piano
      // arpeggio up and back, a low pad.
      const warm = k === 'walk2'
      kick(t, 0.55); kick(t + BEAT * 2, 0.45)
      rim(t + BEAT, 0.7); rim(t + BEAT * 3, 0.7)
      if (warm) { clap(t + BEAT, 0.28); clap(t + BEAT * 3, 0.28) }
      fill16(t, 16, (tt, i) => i % 2 === 1 && shaker(tt, i % 4 === 3 ? 0.55 : 0.3))
      arp.forEach((m, i) => piano(t + i * BEAT / 2, m + 12, warm ? 0.5 : 0.42, 0.8, 0.35))
      sub(t, ch.root, BAR * 0.92, 0.65)
      pad(t, ch.notes, BAR, warm ? 0.9 : 0.7, warm ? 1500 : 1100)
      if (warm) { bell(t, ch.notes[3] + 24, 0.3, 1.4); bell(t + BEAT * 2, ch.notes[2] + 24, 0.25, 1.2) }
    }

    if (k === 'breakdown') {
      // The fair word: no drums, a wide pad and a slow piano line, the chord low and open.
      pad(t, ch.notes, BAR, 1.1, 1300)
      sub(t, ch.root, BAR * 0.95, 0.45)
      stab(t, ch.notes.map((m) => m - 12), 0.6, 2.2, 0.25)
      for (const [o, i] of [[0, 3], [1, 2], [2, 1], [3, 0]]) piano(t + o * BEAT, ch.notes[i] + 12, 0.6, 1.3, 0.3)
      if (pos >= 2) kick(t, 0.4)
    }

    if (k === 'build') {
      riser(t, bt(bar + 1) - S16 * 2, 0.7)
      pad(t, ch.notes, BAR - S16 * 2, 1, 900)
      for (let i = 0; i < 16; i += 4) { kick(t + i * S16, 0.45 + 0.04 * i); snare(t + i * S16, 0.12 + 0.02 * i) }
      fill16(bt(bar, 3), 3, (tt, i) => snare(tt, 0.2 + i * 0.08))
      for (const s of [0, 6, 10]) stab(t + s * S16, ch.notes, 0.45, 0.3, 0.4)
      sub(t, ch.root, BAR - S16 * 2, 0.7)
    }

    if (k === 'rise' || k === 'anthem' || k === 'coda') {
      // The re-entry and the peak: four soft kicks, claps on 2 and 4, the tune on bells over long piano chords.
      // The anthem lifts the tune an octave, opens the pad and adds an organ bass; the coda (the callback to the first
      // sentence) drops the drums.
      const big = k !== 'rise'
      const calm = k === 'coda'
      if (!calm) {
        for (let b = 0; b < 4; b++) {
          const tb = t + b * BEAT
          kick(tb, big ? 0.7 : 0.62)
          if (b === 1 || b === 3) clap(tb, big ? 0.45 : 0.38)
          hat(tb + BEAT / 2, false, big ? 0.6 : 0.45, 0.2)
          shaker(tb + BEAT / 4, 0.6); shaker(tb + BEAT * 0.75, 0.45)
        }
      } else if (pos % 2 === 0) kick(t, 0.5)
      if (pos % 4 === 0 && !calm) crash(t, big ? 0.55 : 0.4)
      stab(t, ch.notes, 0.95, 2.4, big ? 0.75 : 0.6)
      stab(t + BEAT * 2.5, ch.notes.map((m) => m + 12), 0.45, 1.2, 0.5)
      pad(t, ch.notes, BAR, big ? 1.3 : 1.05, big ? 2400 : 1800)
      sub(t, ch.root, BAR * 0.95, 0.75)
      if (big && !calm) { organ(t, ch.root, BEAT * 1.6, 0.4); organ(t + BEAT * 2, ch.root, BEAT * 1.6, 0.35) }
      tune(t, bar, big ? 0.85 : 0.75)
      if (big && !calm) tune(t, bar, 0.35, 12)
      if (k === 'rise' && last) fill16(bt(bar, 3), 4, (tt, i) => snare(tt, 0.2 + i * 0.08))
    }

    if (k === 'outro') {
      // The fade under the end card: the chords thin out bar by bar; the last bars hold Dmaj9 for the audio logo.
      const fade = 1 - pos / len
      const end = bar >= 49
      const c = end ? CHORDS[0] : ch
      if (pos === 0) kick(t, 0.5)
      stab(t, c.notes, 0.8 * fade + 0.2, end ? 3.2 : 2, 0.5)
      pad(t, c.notes, BAR, 0.6 + 0.4 * fade, 1100)
      sub(t, c.root, BAR * 0.95, 0.55 * fade + 0.15)
      if (!end) for (const [o, i] of [[0.5, 0], [1, 1], [1.5, 2], [2, 3]]) bell(t + o * BEAT, c.notes[i] + 24, 0.3 * fade, 1)
    }
  }

  for (const [bar, beat, type, ...a] of CUES) SFX[type](bt(bar, beat), ...a)

  // The breakdown sounds like the next room; the build opens it again.
  const bd = SECTIONS.find((s) => s.kind === 'breakdown')
  tone.frequency.setValueAtTime(18000, bt(bd.from) - 0.05)
  tone.frequency.exponentialRampToValueAtTime(2600, bt(bd.from) + 0.4)
  tone.frequency.setValueAtTime(2600, bt(bd.to + 1))
  tone.frequency.exponentialRampToValueAtTime(18000, bt(bd.to + 2))

  // Sidechain, gentle: a small dip on every kick.
  duck.gain.setValueAtTime(1, 0)
  for (const t of kickTimes) {
    duck.gain.setValueAtTime(1, Math.max(0, t - 0.002))
    duck.gain.linearRampToValueAtTime(0.7, t + 0.01)
    duck.gain.setTargetAtTime(1, t + 0.02, 0.1)
  }

  const LEVEL = { intro: 0.74, title: 0.86, walk: 0.74, walk2: 0.78, breakdown: 0.72, build: 0.8, rise: 0.88, anthem: 1, coda: 0.86, outro: 0.8 }
  let prev = LEVEL[SECTIONS[0].kind]
  sectionGain.gain.setValueAtTime(prev, 0)
  for (const sec of SECTIONS.slice(1)) {
    const t0 = bt(sec.from), g = LEVEL[sec.kind]
    sectionGain.gain.setValueAtTime(prev, t0 - 0.03)
    sectionGain.gain.linearRampToValueAtTime(g, t0)
    prev = g
  }

  master.gain.setValueAtTime(master.gain.value, DURATION - 2)
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
