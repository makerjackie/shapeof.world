// Original score for "AI 的形状", synthesized with Web Audio in an
// OfflineAudioContext. No samples: every drum, chord and effect is built here.
// F minor, 128 BPM, chords Fm – Db – Ab – Eb, one chord per bar.
// The arrangement runs in played bars (`at`, PLAYED); cues keep v3 bar numbers (`bt`).
import { BPM, BEAT, BAR, BARS, DURATION, at as bt, bt as cueAt, nb, PLAYED as SECTIONS, CUES } from '../web/timeline.js'

const SR = 48000
const S16 = BEAT / 4
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

const CHORDS = [
  { root: 29, notes: [53, 56, 60] }, // Fm: F Ab C
  { root: 37, notes: [53, 56, 61] }, // Db: F Ab Db
  { root: 32, notes: [51, 56, 60] }, // Ab: Eb Ab C
  { root: 39, notes: [51, 55, 58] }, // Eb: Eb G Bb
]
const chordAt = (bar) => CHORDS[(bar - 1) % 4]

// Lead hook for the second drop: [beat offset, midi, length in beats] per bar.
const HOOK = [
  [[0, 72, 0.5], [0.75, 72, 0.25], [1, 68, 0.5], [2, 72, 0.5], [2.5, 75, 0.5], [3, 72, 0.5], [3.5, 68, 0.5]],
  [[0, 73, 0.5], [0.75, 73, 0.25], [1, 68, 0.5], [2, 73, 0.5], [2.5, 77, 0.5], [3, 75, 1]],
  [[0, 72, 0.5], [0.75, 72, 0.25], [1, 68, 0.5], [2, 72, 0.5], [2.5, 75, 0.5], [3, 80, 0.5], [3.5, 79, 0.5]],
  [[0, 79, 1.5], [1.5, 75, 0.5], [2, 70, 0.5], [2.5, 72, 0.5], [3, 75, 1]],
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

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * SR), SR)
  const rand = rng(20261019)

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
        const x = (rand() * 2 - 1) * Math.exp(-4.5 * i / len)
        lp += (x - lp) * damp // one-pole low-pass darkens the tail
        d[i] = lp
      }
    }
    return b
  }

  // ── Mix buses ───────────────────────────────────────────────────────────
  const master = ctx.createGain(); master.gain.value = 0.55
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -16; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.18; glue.knee.value = 6
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -4; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.06; limiter.knee.value = 0
  // Tame the low end, add air, then glue and catch peaks.
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 110; lowShelf.gain.value = -2
  const highShelf = ctx.createBiquadFilter(); highShelf.type = 'highshelf'; highShelf.frequency.value = 9000; highShelf.gain.value = 0.5
  const rumble = ctx.createBiquadFilter(); rumble.type = 'highpass'; rumble.frequency.value = 30
  const sectionGain = ctx.createGain()
  master.connect(rumble).connect(lowShelf).connect(highShelf).connect(glue).connect(limiter).connect(sectionGain).connect(ctx.destination)

  const drums = ctx.createGain(); drums.gain.value = 1; drums.connect(master)
  const music = ctx.createGain(); music.gain.value = 1
  const duck = ctx.createGain(); duck.gain.value = 1 // sidechain from the kick
  music.connect(duck).connect(master)
  const fx = ctx.createGain(); fx.gain.value = 1; fx.connect(master)

  const verb = ctx.createConvolver(); verb.buffer = reverbIR(2.6, 0.35)
  const verbIn = ctx.createGain(); verbIn.gain.value = 1
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55
  verbIn.connect(verb).connect(verbOut).connect(master)

  const delay = ctx.createDelay(2); delay.delayTime.value = BEAT * 0.75
  const fb = ctx.createGain(); fb.gain.value = 0.38
  const delayTone = ctx.createBiquadFilter(); delayTone.type = 'lowpass'; delayTone.frequency.value = 3200
  const delayIn = ctx.createGain(); const delayOut = ctx.createGain(); delayOut.gain.value = 0.4
  delayIn.connect(delay); delay.connect(delayTone).connect(fb).connect(delay); delayTone.connect(delayOut).connect(duck)

  // Kick saturation.
  const shaper = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2) }
  shaper.curve = curve
  const kickBus = ctx.createGain(); kickBus.gain.value = 0.95
  shaper.connect(kickBus).connect(drums)

  // ── Small building blocks ───────────────────────────────────────────────
  function noiseSrc(t, dur) {
    const s = ctx.createBufferSource(); s.buffer = noise
    s.start(t, rand() * 1.5, dur + 0.05)
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
    const o = osc('sine', 160, t, 0.5)
    o.frequency.setValueAtTime(170, t)
    o.frequency.exponentialRampToValueAtTime(58, t + 0.07)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.4)
    const g = gainEnv(t, 0.002, v, 0.48)
    o.connect(g).connect(shaper)
    const n = noiseSrc(t, 0.01), hp = filt('highpass', 2500), ng = gainEnv(t, 0.001, 0.25 * v, 0.012)
    n.connect(hp).connect(ng).connect(shaper)
  }
  function clap(t, v = 1) {
    const out = gainEnv(t, 0.001, 0.55 * v, 0.2)
    const bp = filt('bandpass', 1400, 1.1)
    for (let i = 0; i < 3; i++) {
      const n = noiseSrc(t + i * 0.011, 0.02), g = gainEnv(t + i * 0.011, 0.001, 1, 0.012)
      n.connect(g).connect(bp)
    }
    const tail = noiseSrc(t + 0.033, 0.25); tail.connect(bp)
    bp.connect(out).connect(drums)
    send(out, verbIn, 0.25)
  }
  function snare(t, v = 1) {
    const n = noiseSrc(t, 0.2), hp = filt('highpass', 900), g = gainEnv(t, 0.001, 0.4 * v, 0.14)
    n.connect(hp).connect(g).connect(drums)
    const o = osc('triangle', 190, t, 0.15), og = gainEnv(t, 0.001, 0.35 * v, 0.09)
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08)
    o.connect(og).connect(drums)
    send(g, verbIn, 0.15)
  }
  function hat(t, open = false, v = 1, p = 0.15) {
    const n = noiseSrc(t, open ? 0.3 : 0.06), hp = filt('highpass', open ? 6500 : 8500)
    const g = gainEnv(t, 0.001, (open ? 0.075 : 0.065) * v, open ? 0.22 : 0.035)
    n.connect(hp).connect(g).connect(pan(p)).connect(drums)
  }
  function crash(t, v = 1) {
    const n = noiseSrc(t, 2), hp = filt('highpass', 4500), g = gainEnv(t, 0.002, 0.16 * v, 1.8)
    n.connect(hp).connect(g).connect(drums)
    send(g, verbIn, 0.4)
  }

  // ── Tonal instruments (into the ducked music bus) ───────────────────────
  function sub(t, m, dur, v = 1) {
    const o = osc('sine', mtof(m), t, dur)
    const g = gainEnv(t, 0.006, 0.36 * v, dur, 1, dur - 0.03, 0.03)
    o.connect(g).connect(music)
  }
  function midBass(t, m, dur, v = 1, open = 1) {
    const lp = filt('lowpass', 300, 5)
    lp.frequency.setValueAtTime(300 + 2200 * open, t)
    lp.frequency.exponentialRampToValueAtTime(260, t + Math.max(0.06, dur))
    const g = gainEnv(t, 0.004, 0.27 * v, dur, 0.8, dur * 0.8, 0.03)
    for (const d of [-9, 9]) osc('sawtooth', mtof(m), t, dur, d).connect(lp)
    lp.connect(g).connect(music)
  }
  function supersaw(t, notes, dur, { v = 1, cutoff = 4000, attack = 0.01, release = 0.25, rev = 0.25, sweep = null } = {}) {
    const lp = filt('lowpass', cutoff, 0.9)
    if (sweep) { lp.frequency.setValueAtTime(sweep[0], t); lp.frequency.exponentialRampToValueAtTime(sweep[1], t + dur) }
    const g = gainEnv(t, attack, 0.075 * v, dur, 0.85, Math.max(0.02, dur - attack), release)
    const detunes = [-21, -11, 0, 11, 21], pans = [-0.7, -0.35, 0, 0.35, 0.7]
    for (const m of notes) {
      detunes.forEach((d, i) => { osc('sawtooth', mtof(m), t, dur + release, d + (rand() - 0.5) * 4).connect(pan(pans[i])).connect(lp) })
      osc('sawtooth', mtof(m + 12), t, dur + release, 4).connect(lp)
    }
    lp.connect(g).connect(music)
    send(g, verbIn, rev)
  }
  function pad(t, notes, dur, v = 1, cutoff = 1100) {
    const lp = filt('lowpass', cutoff, 0.5), hp = filt('highpass', 190, 0.6)
    const g = gainEnv(t, 0.5, 0.05 * v, dur, 1, Math.max(0.1, dur - 0.5), 0.9)
    for (const m of notes) for (const d of [-8, 8]) osc('sawtooth', mtof(m), t, dur + 1, d).connect(lp)
    lp.connect(hp).connect(g).connect(music)
    send(g, verbIn, 0.6)
  }
  function pluck(t, m, v = 1, bright = 1) {
    const lp = filt('lowpass', 500, 3)
    lp.frequency.setValueAtTime(1200 + 3500 * bright, t)
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.18)
    const g = gainEnv(t, 0.002, 0.1 * v, 0.3)
    osc('square', mtof(m), t, 0.35).connect(lp)
    osc('sawtooth', mtof(m), t, 0.35, 7).connect(lp)
    lp.connect(g).connect(music)
    send(g, delayIn, 0.35)
    send(g, verbIn, 0.15)
  }
  function lead(t, m, dur, v = 1) {
    const lp = filt('lowpass', 3800, 1.5)
    const g = gainEnv(t, 0.008, 0.07 * v, dur, 0.8, dur, 0.12)
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5
    const vg = ctx.createGain(); vg.gain.value = dur > 0.5 ? 9 : 0
    vib.connect(vg); vib.start(t + 0.15); vib.stop(t + dur + 0.2)
    for (const d of [-12, 0, 12]) { const o = osc('sawtooth', mtof(m), t, dur + 0.2, d); vg.connect(o.detune); o.connect(lp) }
    lp.connect(g).connect(music)
    send(g, delayIn, 0.25)
    send(g, verbIn, 0.3)
  }

  // ── Sound effects (not ducked) ──────────────────────────────────────────
  function riser(t0, t1, v = 1) {
    const n = noiseSrc(t0, t1 - t0), bp = filt('bandpass', 400, 2.5)
    bp.frequency.setValueAtTime(350, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1)
    n.connect(bp).connect(g).connect(fx)
    send(g, verbIn, 0.3)
    const o = osc('sawtooth', 110, t0, t1 - t0), lp = filt('lowpass', 2000)
    o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1)
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.05 * v, t1 - 0.02); og.gain.linearRampToValueAtTime(0, t1)
    o.connect(lp).connect(og).connect(fx)
  }
  function impact(t, v = 1) {
    const o = osc('sine', 62, t, 1.4)
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2)
    o.connect(gainEnv(t, 0.003, 0.75 * v, 1.2)).connect(fx)
    const n = noiseSrc(t, 0.8), lp = filt('lowpass', 2600), g = gainEnv(t, 0.002, 0.32 * v, 0.55)
    n.connect(lp).connect(g).connect(fx)
    send(g, verbIn, 0.7)
  }
  function boom(t, v = 1) {
    // Reverse swell into the hit (none on the film's first frame), then the hit and a crash.
    if (t >= 0.5) {
      const n = noiseSrc(t - 0.5, 0.5), hp = filt('highpass', 1800)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t - 0.5); g.gain.exponentialRampToValueAtTime(0.22 * v, t - 0.01); g.gain.linearRampToValueAtTime(0, t)
      n.connect(hp).connect(g).connect(fx)
    }
    impact(t, 1.15 * v)
    crash(t, 1.2 * v)
  }
  function whoosh(t, v = 1, len = 0.42) {
    const t0 = t - len * 0.65
    const n = noiseSrc(t0, len), bp = filt('bandpass', 600, 1.6)
    bp.frequency.setValueAtTime(500, t0); bp.frequency.exponentialRampToValueAtTime(5200, t0 + len * 0.65); bp.frequency.exponentialRampToValueAtTime(1400, t0 + len)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3 * v, t0 + len * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    n.connect(bp).connect(pan(0)).connect(g).connect(fx)
  }
  function pop(t, v = 1) {
    const o = osc('sine', 900, t, 0.12)
    o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.07)
    o.connect(gainEnv(t, 0.002, 0.28 * v, 0.09)).connect(fx)
  }
  function stamp(t, v = 1) {
    const o = osc('sine', 130, t, 0.25)
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14)
    o.connect(gainEnv(t, 0.001, 0.8 * v, 0.2)).connect(fx)
    const n = noiseSrc(t, 0.08), lp = filt('lowpass', 1800), g = gainEnv(t, 0.001, 0.4 * v, 0.06)
    n.connect(lp).connect(g).connect(fx)
    send(g, verbIn, 0.2)
  }
  function ding(t, v = 1) {
    for (const [f, a, d] of [[1568, 0.12, 1.2], [2349, 0.06, 0.8], [3136, 0.04, 0.5]]) {
      const g = gainEnv(t, 0.002, a * v, d)
      osc('sine', f, t, d).connect(g).connect(fx)
      send(g, verbIn, 0.5)
    }
  }
  function shimmer(t, v = 1) {
    ;[84, 87, 91, 96].forEach((m, i) => {
      const tt = t + i * S16, g = gainEnv(tt, 0.002, 0.05 * v, 0.5)
      osc('triangle', mtof(m), tt, 0.5).connect(g).connect(fx)
      send(g, verbIn, 0.6); send(g, delayIn, 0.3)
    })
  }
  function powerdown(t, v = 1) {
    const o = osc('sawtooth', 700, t, 0.7), lp = filt('lowpass', 1500)
    o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.6)
    lp.frequency.setValueAtTime(2000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.6)
    o.connect(lp).connect(gainEnv(t, 0.005, 0.12 * v, 0.65)).connect(fx)
  }
  function click(t, v = 1, f = 2600) {
    const n = noiseSrc(t, 0.03), bp = filt('bandpass', f, 6), g = gainEnv(t, 0.001, 0.5 * v, 0.025)
    n.connect(bp).connect(g).connect(fx)
  }
  function swish(t, v = 1) { whoosh(t, 0.8 * v, 0.3) }

  const SFX = { impact, boom, whoosh, pop, stamp, ding, shimmer, powerdown, switch: (t) => { click(t, 0.9, 3200); click(t + 0.03, 0.6, 2200) }, swish, tick: (t) => click(t, 0.7, 4200) }

  // ── Arrangement ─────────────────────────────────────────────────────────
  const secOf = (bar) => SECTIONS.find((s) => bar >= s.from && bar <= s.to)
  const fill16 = (t0, n, fn) => { for (let i = 0; i < n; i++) fn(t0 + i * S16, i) }
  const ARP = [0, 1, 2, 3, 4, 5, 4, 3, 1, 2, 3, 4, 5, 4, 2, 1]

  for (let bar = 1; bar <= BARS; bar++) {
    const sec = secOf(bar), k = sec.kind, t = bt(bar), key = sec.key || 0
    const base = chordAt(bar)
    const ch = { root: base.root + key, notes: base.notes.map((m) => m + key) }
    const arp = [...ch.notes, ...ch.notes.map((m) => m + 12)]
    const pos = bar - sec.from, len = sec.to - sec.from + 1, last = bar === sec.to

    if (k === 'intro') {
      // A chord stab under each slammed number, a held pad, ticking hats.
      supersaw(t, ch.notes, last ? 0.9 : 0.45, { v: 1.2, cutoff: 5200, release: 0.6, rev: 0.5 })
      sub(t, ch.root, 0.6, 1)
      kick(t, 1)
      pad(t, ch.notes.map((m) => m - 12), BAR, 0.8, 700)
      if (bar >= 2) fill16(t + BEAT, 12, (tt, i) => hat(tt, false, i % 2 ? 0.45 : 0.75))
    }

    if (k === 'flash') {
      // Eight numbers on eighth notes: a rising stab on each, snare building.
      for (let i = 0; i < 8; i++) {
        const tt = t + i * BEAT / 2
        pluck(tt, arp[i % 6] + 12 + Math.floor(i / 6) * 12, 1, 0.9)
        kick(tt, 0.55 + i * 0.05)
        snare(tt + BEAT / 4, 0.2 + i * 0.07)
      }
      riser(t, t + BAR - S16, 0.8)
    }

    if (k === 'title') {
      const first = pos === 0
      if (first) kick(t, 1)
      supersaw(t, ch.notes, BAR * 0.97, { v: 1.1, cutoff: first ? 7000 : 4000, rev: 0.6, sweep: first ? [9000, 2500] : null })
      pad(t, ch.notes, BAR, 1, 1500)
      sub(t, ch.root, BAR * 0.9, 0.9)
      fill16(t, 16, (tt, i) => i % 2 === 0 && pluck(tt, arp[ARP[i]] + 12, 0.5, 0.5))
      if (last) fill16(bt(bar, 4), 4, (tt, i) => snare(tt, 0.3 + i * 0.12))
    }

    if (k === 'groove' || k === 'groove2') {
      const quiet = bar === nb(10) // the lights go out on the "who pays?" bar
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        if (!(quiet && b < 2)) kick(tb, 0.95)
        if ((b === 1 || b === 3) && !(quiet && b < 2)) clap(tb, 0.9)
        hat(tb + BEAT / 2, b % 2 === 1 && k === 'groove2', 0.8, 0.2)
        hat(tb + BEAT / 4, false, 0.35, -0.2); hat(tb + BEAT * 0.75, false, 0.35, -0.2)
        if (!(quiet && b < 2)) sub(tb + BEAT / 2, ch.root, BEAT * 0.45, 0.9)
        if (k === 'groove2') midBass(tb + BEAT / 2, ch.root + 12, BEAT * 0.4, 0.8, 0.35)
      }
      if (!quiet) fill16(t, 16, (tt, i) => pluck(tt, arp[ARP[i]] + 12, i % 4 === 0 ? 1 : 0.6, k === 'groove2' ? 0.85 : 0.65))
      pad(t, ch.notes, BAR, quiet ? 0.5 : 0.9, quiet ? 600 : 1300)
      if (k === 'groove2') supersaw(t, ch.notes, BAR * 0.95, { v: 0.5, cutoff: 2200, rev: 0.3 })
      if (last) fill16(bt(bar, 4), 4, (tt, i) => snare(tt, 0.4 + i * 0.12))
    }

    if (k === 'tech') {
      // Half-time: kick on 1 and the "and" of 3, snare on 3, a busy square arp.
      kick(t, 1); kick(t + BEAT * 2.5, 0.8)
      snare(t + BEAT * 2, 0.9); clap(t + BEAT * 2, 0.6)
      fill16(t, 16, (tt, i) => hat(tt, i % 4 === 2, i % 2 ? 0.35 : 0.6, i % 2 ? 0.3 : -0.3))
      fill16(t, 16, (tt, i) => pluck(tt, arp[(i * 5) % 6] + (i % 3 === 0 ? 24 : 12), i % 4 === 0 ? 1 : 0.55, 1))
      sub(t, ch.root, BEAT * 1.9, 1); sub(t + BEAT * 2.5, ch.root, BEAT * 1.4, 0.9)
      midBass(t, ch.root + 12, BEAT * 1.8, 0.7, 0.5)
      pad(t, ch.notes, BAR, 0.8, 1800)
      if (last) fill16(bt(bar, 3), 8, (tt, i) => snare(tt, 0.3 + i * 0.08))
    }

    if (k === 'build') {
      // Riser across the whole section; kick and snare tighten towards the end.
      if (pos === 0) { riser(t, bt(sec.to + 1) - S16 * 2, 1 + 0.1 * len); pad(t, ch.notes, len * BAR - S16 * 2, 1, 900) }
      const p = (pos + 1) / len
      const step = p > 0.75 ? 2 : p > 0.4 ? 4 : 8
      for (let i = 0; i < 16; i += step) {
        if (last && i >= 14) break
        kick(t + i * S16, 0.85)
        snare(t + i * S16, 0.25 + 0.5 * p * (i / 16) + 0.2 * p)
      }
      if (last) fill16(bt(bar, 3), 6, (tt, i) => snare(tt + S16 / 2, 0.5 + i * 0.07))
      sub(t, ch.root, last ? BAR - S16 * 2 : BAR, 0.8)
    }

    if (k === 'drop' || k === 'drop2') {
      const big = k === 'drop2'
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT
        kick(tb, 1)
        if (b === 1 || b === 3) { clap(tb, 1); snare(tb, 0.6) }
        hat(tb + BEAT / 2, true, 0.9, 0.15)
        for (const q of [0.25, 0.75]) hat(tb + BEAT * q, false, big ? 0.55 : 0.4, -0.15)
        for (const [q, o] of [[0.25, 0], [0.5, 12], [0.75, 0]]) midBass(tb + BEAT * q, ch.root + 12 + o, S16 * 0.9, 1, 0.8)
        sub(tb + BEAT / 2, ch.root, BEAT * 0.45, 1.1)
      }
      supersaw(t, ch.notes, BAR * 0.97, { v: big ? 1.2 : 1.05, cutoff: big ? 10000 : 8000, rev: 0.3 })
      fill16(t, 16, (tt, i) => pluck(tt, arp[ARP[i]] + 12, i % 4 === 0 ? 1 : 0.55, 1))
      if (pos % 4 === 0) crash(t, 1)
      if (big) for (const [o, m, d] of HOOK[(bar - 1) % 4]) lead(t + o * BEAT, m + key, d * BEAT * 0.95, 1)
      if (last && bt(bar + 1) < DURATION) fill16(bt(bar, 4), 4, (tt, i) => snare(tt, 0.5 + i * 0.1))
    }

    if (k === 'map') {
      // Travelling: lighter drums, wide pad, the hook on a soft pluck.
      kick(t, 0.8); kick(t + BEAT * 2, 0.7)
      clap(t + BEAT, 0.5); clap(t + BEAT * 3, 0.5)
      fill16(t, 16, (tt, i) => i % 2 === 1 && hat(tt, false, 0.4, i % 4 === 1 ? -0.4 : 0.4))
      pad(t, ch.notes, BAR, 1.1, 2200)
      supersaw(t, ch.notes, BAR * 0.95, { v: 0.45, cutoff: 3000, attack: 0.2, rev: 0.6 })
      for (const [o, m, d] of HOOK[(bar - 1) % 4]) pluck(t + o * BEAT, m + key, 0.8, 0.6)
      sub(t, ch.root, BAR * 0.9, 0.8)
    }

    if (k === 'breakdown') {
      // The clock: a wooden tick on every beat, half-time pulse, sparse melody.
      pad(t, ch.notes, BAR, 0.9, pos === len - 1 ? 700 : 1600)
      supersaw(t, ch.notes, BAR * 0.95, { v: 0.35, cutoff: 1400, attack: 0.4, rev: 0.7 })
      sub(t, ch.root, BAR * 0.9, 0.45)
      if (pos <= 1) for (let b = 0; b < 4; b++) click(t + b * BEAT, b === 0 ? 0.9 : 0.55, b === 0 ? 2100 : 2800)
      if (pos >= 2) { kick(t, 0.7); kick(t + BEAT * 2.5, 0.5); hat(t + BEAT, false, 0.4); hat(t + BEAT * 3, false, 0.4) }
      for (const [o, i] of [[0, 0], [1.5, 1], [2, 2], [3, 4]]) pluck(t + o * BEAT, arp[i] + 12, 0.9, 0.3)
    }

    if (k === 'outro') {
      const end = bar === BARS
      if (pos === 0 || pos === 2) kick(t, 0.9)
      pad(t, ch.notes, end ? BAR + 2 : BAR, 1.2, 1200)
      supersaw(t, end ? CHORDS[0].notes : ch.notes, end ? BAR + 2 : BAR * 0.95, { v: end ? 0.8 : 0.9, cutoff: 4500, rev: 0.6, sweep: [5500, end ? 300 : 1500], release: end ? 2 : 0.3 })
      sub(t, end ? CHORDS[0].root : ch.root, end ? BAR + 1.5 : BAR * 0.9, 0.8)
      if (pos <= 1) fill16(t, 16, (tt, i) => i % 2 === 0 && pluck(tt, arp[ARP[i]] + 12, 0.5 - pos * 0.2, 0.5))
    }
  }

  for (const [bar, beat, type] of CUES) SFX[type](cueAt(bar, beat))

  // Sidechain: dip the music bus under every kick.
  duck.gain.setValueAtTime(1, 0)
  for (const t of kickTimes) {
    duck.gain.setValueAtTime(1, Math.max(0, t - 0.002))
    duck.gain.linearRampToValueAtTime(0.32, t + 0.008)
    duck.gain.setTargetAtTime(1, t + 0.02, 0.07)
  }

  // Energy curve after the limiter: grooves sit below the drops.
  const LEVEL = { intro: 1, flash: 0.95, title: 0.95, groove: 0.75, build: 0.9, drop: 0.95, tech: 0.82, groove2: 0.86, breakdown: 1, map: 0.8, drop2: 1, outro: 0.95 }
  let prev = LEVEL[SECTIONS[0].kind]
  sectionGain.gain.setValueAtTime(prev, 0)
  for (const sec of SECTIONS.slice(1)) {
    const t0 = bt(sec.from), g = LEVEL[sec.kind]
    sectionGain.gain.setValueAtTime(prev, t0 - 0.03)
    sectionGain.gain.linearRampToValueAtTime(g, t0)
    prev = g
  }

  // Gentle fade on the tail.
  master.gain.setValueAtTime(master.gain.value, DURATION - 1.0)
  master.gain.linearRampToValueAtTime(0, DURATION)

  const buf = await ctx.startRendering()
  return buf
}

export function toWav(buf) {
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
