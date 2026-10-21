// Ukulele voice model, pure DSP (no WebAudio) so the same code runs in the browser and in node tests.
//
//  string : a bank of damped partials. Amplitudes follow a plucked-string spectrum (pick-position
//           comb, finger softness); every partial is a pair of slightly detuned polarisations, which
//           gives the slow shimmer of a nylon string. Upper partials die faster than the fundamental.
//  attack : a short noise burst (nail / skin) plus a soft low thump, both shaped later by the body.
//  body   : bodyImpulse() builds a short impulse response made of an air resonance, top-plate modes
//           and a few higher modes. The player convolves the whole mix with it, which is where the
//           hollow-box colour of the instrument comes from.
//
// The body modes are an engineering model tuned against recordings, not the measured response of a
// particular instrument.

export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** y[n] = amp * r^n * cos(w n + phase), added into out[0..len) with a two-term recurrence. */
function addPartial(out: Float64Array, len: number, amp: number, w: number, phase: number, r: number) {
  const c = 2 * r * Math.cos(w)
  const r2 = r * r
  let y0 = amp * Math.cos(phase)
  let y1 = amp * r * Math.cos(w + phase)
  if (len > 0) out[0] += y0
  if (len > 1) out[1] += y1
  for (let n = 2; n < len; n++) {
    const y = c * y1 - r2 * y0
    out[n] += y
    y0 = y1
    y1 = y
  }
}

export type PluckOptions = {
  /** Pluck position along the string (0..0.5). Near the middle sounds round and hollow. */
  beta: number
  /** Spectral slope of the plucked shape (displacement ~ 1/n^tilt). */
  tilt: number
  /** Finger-pad roll-off in Hz; bigger is brighter. */
  soft: number
  /** Fundamental T60 at C4, seconds. */
  t60: number
  /** Nail click level relative to the fundamental. */
  click: number
  /** Finger-on-top knock level. */
  thump: number
  /** Detune of the second polarisation, cents. */
  detune: number
  /** How much faster upper partials die (quadratic in partial number). */
  hfDecay: number
  /** Seconds of audio rendered per note. */
  maxLen: number
  seed: number
}

export const DEFAULT_PLUCK: PluckOptions = {
  beta: 0.43,
  tilt: 1.4,
  soft: 4600,
  t60: 4.2,
  // The attack noise is easy to over-do: at click 2.6 / thump 1.2 it sat only 5-12 dB under the tone and
  // read as slapping the top. At these levels it is 15-23 dB under (checked in ukulele-synth.test.ts).
  click: 0.8,
  thump: 0.25,
  detune: 1.1,
  hfDecay: 0.11,
  maxLen: 3.3,
  seed: 1,
}

export function renderPluck(fs: number, midi: number, opts: Partial<PluckOptions> = {}): Float32Array {
  const o: PluckOptions = { ...DEFAULT_PLUCK, ...opts }
  const f0 = midiToHz(midi)
  const rnd = mulberry32(o.seed * 7919 + midi * 31)
  const len = Math.floor(fs * o.maxLen)
  const out = new Float32Array(len)
  const acc = new Float64Array(len)

  const T1 = Math.max(1.0, Math.min(5.0, o.t60 * (261.6 / f0) ** 0.9))
  const beta = Math.max(0.12, Math.min(0.45, o.beta + (rnd() - 0.5) * 0.05))
  const nMax = Math.min(28, Math.floor((0.44 * fs) / f0))
  const B = 1.2e-5 // nylon is nearly stiffness-free

  let a1 = 0
  for (let n = 1; n <= nMax; n++) {
    const fn = f0 * n * Math.sqrt(1 + B * n * n)
    const w = (2 * Math.PI * fn) / fs
    const pick = Math.abs(Math.sin(n * Math.PI * beta)) + 0.03
    const amp = pick / n ** o.tilt / (1 + (fn / o.soft) ** 2)
    if (n === 1) a1 = amp
    const t60 = T1 / (1 + 0.14 * (n - 1) + o.hfDecay * (n - 1) * (n - 1))
    const polV = 0.62
    const polH = 0.46 * (0.75 + 0.5 * rnd())
    const sign = rnd() < 0.5 ? -1 : 1
    const dH = ((sign * o.detune * (0.6 + 0.8 * rnd())) / 1200) * Math.LN2 // cents -> ratio
    const rV = Math.exp(-6.9078 / (fs * t60 * 0.8))
    const rH = Math.exp(-6.9078 / (fs * t60 * 1.3))
    const nl = Math.min(len, Math.floor(fs * t60 * 1.45) + 8)
    addPartial(acc, nl, amp * polV, w, 0.0, rV)
    addPartial(acc, nl, amp * polH, w * Math.exp(dH), (rnd() - 0.5) * 1.2, rH)
  }

  // attack: nail click (band-passed noise, ~2 ms) and a soft thump (low band, ~12 ms)
  const ck = Math.floor(fs * 0.02)
  let lp1 = 0
  let lp2 = 0
  let lp3 = 0
  const kA = o.click * a1 * 5.5
  for (let n = 0; n < ck && n < len; n++) {
    const x = rnd() * 2 - 1
    lp1 += 0.45 * (x - lp1) // low-pass ~ 6 kHz
    lp2 += 0.07 * (lp1 - lp2) // high-pass the result around 700 Hz
    const hp = lp1 - lp2
    acc[n] += kA * hp * Math.exp(-n / (fs * 0.0019))
    lp3 += 0.035 * (x - lp3) // very low band for the knock
    acc[n] += o.thump * a1 * 2.2 * lp3 * Math.exp(-n / (fs * 0.0065))
  }

  // fade the tail, scale to a steady loudness (RMS of the first 300 ms)
  const fade = Math.floor(fs * 0.45)
  let e = 0
  const ne = Math.min(len, Math.floor(fs * 0.3))
  for (let n = 0; n < ne; n++) e += acc[n] * acc[n]
  const rms = Math.sqrt(e / ne) || 1
  const k = 0.16 / rms
  for (let n = 0; n < len; n++) {
    let v = acc[n] * k
    if (n > len - fade) {
      const u = (len - n) / fade
      v *= u * u
    }
    out[n] = v
  }
  return out
}

/** Body impulse response. modes: [Hz, Q, peak gain (linear, relative to the direct sound)] */
export const BODY_MODES: ReadonlyArray<readonly [number, number, number]> = [
  [196, 5.0, 0.2], // lower top-plate / back "thump"
  [318, 4.2, 0.95], // air (Helmholtz) resonance
  [405, 5.0, 0.85],
  [520, 7.0, 0.3], // main top-plate mode
  [655, 8.0, 0.2],
  [790, 9.0, 1.0],
  [1050, 9.0, 0.55],
  [1330, 9.0, 0.5],
  [1720, 9.0, 0.3],
  [2250, 9.0, 0.2],
  [2950, 9.0, 0.14],
]

export function bodyImpulse(fs: number, opts: { seconds?: number; direct?: number; gain?: number; modes?: typeof BODY_MODES } = {}): Float32Array {
  const len = Math.floor(fs * (opts.seconds ?? 0.28))
  const h = new Float32Array(len)
  const rnd = mulberry32(4242)
  h[0] = opts.direct ?? 0.42
  ;(opts.modes ?? BODY_MODES).forEach(([f, q, g]) => {
    const tau = q / (Math.PI * f) // amplitude time constant
    const T = fs * tau
    const A = ((2 * g) / T) * (opts.gain ?? 1)
    const w = (2 * Math.PI * f) / fs
    const ph = (rnd() - 0.5) * 0.8
    for (let n = 0; n < len; n++) h[n] += A * Math.exp(-n / T) * Math.sin(w * n + ph)
  })
  return h
}

// FFT convolution, for offline checks and anything that wants the body baked into a buffer.
function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (inverse ? -1 : 1)
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k]
        const ui = im[i + k]
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
        const t = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = t
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n
      im[i] /= n
    }
  }
}

export function convolve(x: Float32Array, h: Float32Array): Float32Array {
  let n = 1
  while (n < x.length + h.length) n <<= 1
  const ar = new Float64Array(n)
  const ai = new Float64Array(n)
  const br = new Float64Array(n)
  const bi = new Float64Array(n)
  ar.set(x)
  br.set(h)
  fft(ar, ai, false)
  fft(br, bi, false)
  for (let i = 0; i < n; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i]
    ai[i] = ar[i] * bi[i] + ai[i] * br[i]
    ar[i] = r
  }
  fft(ar, ai, true)
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = ar[i]
  return out
}
