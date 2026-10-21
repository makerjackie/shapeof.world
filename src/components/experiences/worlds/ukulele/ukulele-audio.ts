// WebAudio side: pre-renders every string/fret sample the song needs, then schedules them with a
// look-ahead timer. Song time == AudioContext time, so the visuals can never drift from the sound.
//
// Lifecycle rules (SHELL_STANDARD §8):
//  - the context is created only from a user gesture (`ensureContext` is called by a click handler);
//  - hiding the page suspends sound temporarily and never overrides the visitor's own pause;
//  - after `dispose()` no late callback may play, schedule or attach anything.
import type { Arrangement, NoteEvent } from './ukulele-arranger'
import { pluckFraction } from './ukulele-geometry'
import { bodyImpulse, renderPluck } from './ukulele-synth'

const LOOKAHEAD = 1.0 // seconds of notes scheduled ahead
const PAN = [-0.22, -0.08, 0.08, 0.22]

export type PlayerState = 'idle' | 'playing' | 'paused' | 'ended'

type Voice = { src: AudioBufferSourceNode; gain: GainNode }

/** A small, warm room: early reflections and a short dark tail (no long "empty hall" wash). */
function makeRoom(ctx: BaseAudioContext, seconds: number, rt60: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(2, len, sr)
  const k = 6.9078 / rt60 // amplitude decay for -60 dB at rt60
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let lp = 0
    let lp2 = 0
    const pre = Math.floor(sr * (0.011 + ch * 0.0017))
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr
      const x = Math.random() * 2 - 1
      const a = 0.55 * Math.exp(-t * 7) // highs die first
      lp += (0.06 + a) * (x - lp)
      lp2 += 0.5 * (lp - lp2)
      d[i] = lp2 * Math.exp(-t * k) * Math.min(1, t / 0.012)
    }
    ;[0.0123, 0.0191, 0.0276, 0.0359].forEach((tt, j) => {
      // a few discrete early reflections
      const at = Math.floor(sr * (tt + ch * 0.0009))
      if (at < len) d[at] += (0.55 - j * 0.1) * (j % 2 ? -1 : 1)
    })
  }
  return buf
}

export class UkulelePlayer {
  state: PlayerState = 'idle'
  onEnd: (() => void) | null = null

  private ctx: AudioContext | null = null
  private input: GainNode | null = null
  private master: GainNode | null = null
  private arr: Arrangement | null = null
  private buffers = new Map<string, AudioBuffer>()
  private voices: Array<Voice> = []
  private last: Array<Voice | null> = [null, null, null, null]
  private nextIdx = 0
  private t0 = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private volume = 0.9
  private pausedAt = 0
  private systemSuspended = false
  private disposed = false
  /** Bumped by load/stop/dispose so an `await` that straddles one of them can tell it is stale. */
  private epoch = 0

  /** Must be called from a user gesture the first time. */
  ensureContext(): AudioContext {
    if (this.disposed) throw new Error('player disposed')
    if (this.ctx) return this.ctx
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = (this.ctx = new AudioContextClass({ latencyHint: 'interactive' }))
    const input = (this.input = ctx.createGain())

    // the whole mix goes through one body: air + top-plate modes (see bodyImpulse)
    const bodyConv = ctx.createConvolver()
    bodyConv.normalize = false
    const ir = bodyImpulse(ctx.sampleRate)
    const irBuf = ctx.createBuffer(1, ir.length, ctx.sampleRate)
    irBuf.getChannelData(0).set(ir)
    bodyConv.buffer = irBuf

    // a ukulele has little real bass: roll off under ~190 Hz, tame the very top a little
    const biquad = (type: BiquadFilterType, f: number, q: number, g: number) => {
      const b = ctx.createBiquadFilter()
      b.type = type
      b.frequency.value = f
      b.Q.value = q
      b.gain.value = g
      return b
    }
    const hp = biquad('highpass', 185, 0.75, 0)
    const warm = biquad('peaking', 330, 0.9, 1.5)
    const air = biquad('highshelf', 6500, 0.7, -2.5)
    input.connect(bodyConv)
    bodyConv.connect(hp)
    hp.connect(warm)
    warm.connect(air)

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -15
    comp.knee.value = 14
    comp.ratio.value = 2.6
    comp.attack.value = 0.006
    comp.release.value = 0.2
    const master = (this.master = ctx.createGain())
    master.gain.value = this.volume
    const room = ctx.createConvolver()
    room.buffer = makeRoom(ctx, 1.1, 0.8)
    const wet = ctx.createGain()
    wet.gain.value = 0.11
    air.connect(comp)
    comp.connect(master)
    master.connect(ctx.destination)
    air.connect(room)
    room.connect(wet)
    wet.connect(master)
    return ctx
  }

  /**
   * Render each distinct (string, fret) note once. Notes depend only on string and fret, and there are at most
   * 4 x 16 of them, so they are kept between songs and only the missing ones are rendered.
   */
  load(arr: Arrangement) {
    this.stop()
    const ctx = this.ensureContext()
    this.arr = arr
    const sr = ctx.sampleRate
    arr.events.forEach((e) => {
      const key = `${e.s}:${e.f}`
      if (this.buffers.has(key)) return
      const data = renderPluck(sr, e.midi, { seed: 3 + e.s * 5 + (e.f % 5), beta: pluckFraction(e.f) })
      const buf = ctx.createBuffer(1, data.length, sr)
      buf.getChannelData(0).set(data)
      this.buffers.set(key, buf)
    })
  }

  /**
   * Song time in seconds, as the visitor is hearing it: the audio clock minus the device's output latency, so the
   * picture does not run ahead of the sound on Bluetooth and other slow outputs.
   */
  get time(): number {
    if (!this.ctx) return 0
    if (this.state === 'paused' || this.state === 'idle') return this.pausedAt
    const latency = (this.ctx as AudioContext & { outputLatency?: number }).outputLatency
    const heard = typeof latency === 'number' && Number.isFinite(latency) ? Math.min(Math.max(latency, 0), 0.35) : 0
    return this.ctx.currentTime - heard - this.t0
  }

  async start(from = 0) {
    const ctx = this.ensureContext()
    const epoch = this.epoch
    if (ctx.state === 'suspended') await ctx.resume()
    if (this.disposed || !this.arr || epoch !== this.epoch) return
    this.stopVoices()
    this.systemSuspended = false
    this.t0 = ctx.currentTime + 0.35 - from // short lead-in so the first note is never clipped
    this.nextIdx = this.indexAt(from)
    this.state = 'playing'
    this.startTimer()
    this.tick()
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.tick(), 25)
  }

  private indexAt(t: number): number {
    const ev = this.arr!.events
    let lo = 0
    let hi = ev.length
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (ev[m].t < t - 0.02) lo = m + 1
      else hi = m
    }
    return lo
  }

  private tick() {
    if (this.disposed || this.state !== 'playing' || !this.ctx || !this.arr) return
    const ev = this.arr.events
    const songT = this.ctx.currentTime - this.t0
    while (this.nextIdx < ev.length && ev[this.nextIdx].t <= songT + LOOKAHEAD) {
      this.schedule(ev[this.nextIdx++])
    }
    if (songT > this.arr.duration) {
      this.state = 'ended'
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      this.pausedAt = this.arr.duration
      this.onEnd?.()
    }
  }

  private schedule(e: NoteEvent) {
    const ctx = this.ctx
    if (this.disposed || !ctx || !this.input) return
    const when = this.t0 + e.t
    if (when < ctx.currentTime - 0.03) return
    const buf = this.buffers.get(`${e.s}:${e.f}`)
    if (!buf) return
    const prev = this.last[e.s]
    if (prev) {
      // a new pluck on the same string damps the old one
      const at = Math.max(ctx.currentTime, when - 0.004)
      prev.gain.gain.setTargetAtTime(0, at, 0.02)
      try {
        prev.src.stop(when + 0.12)
      } catch {
        /* already stopped */
      }
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = e.vel ** 1.25 * 0.95
    const tone = ctx.createBiquadFilter() // softer plucks are darker
    tone.type = 'lowpass'
    tone.Q.value = 0.5
    tone.frequency.value = 1800 + 9500 * e.vel * e.vel
    const pan = ctx.createStereoPanner()
    pan.pan.value = PAN[e.s]
    src.connect(gain)
    gain.connect(tone)
    tone.connect(pan)
    pan.connect(this.input)
    src.start(Math.max(when, ctx.currentTime))
    const voice: Voice = { src, gain }
    this.last[e.s] = voice
    this.voices.push(voice)
    src.onended = () => {
      const i = this.voices.indexOf(voice)
      if (i >= 0) this.voices.splice(i, 1)
      if (this.last[e.s] === voice) this.last[e.s] = null
      try {
        src.disconnect()
        gain.disconnect()
        tone.disconnect()
        pan.disconnect()
      } catch {
        /* noop */
      }
    }
  }

  private stopVoices() {
    this.voices.forEach((v) => {
      try {
        v.src.stop()
      } catch {
        /* noop */
      }
    })
    this.voices = []
    this.last = [null, null, null, null]
  }

  async pause() {
    if (this.state !== 'playing' || !this.ctx) return
    this.pausedAt = this.time
    this.state = 'paused'
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.ctx.suspend()
  }

  async resume() {
    if (this.state !== 'paused' || !this.ctx) return
    const epoch = this.epoch
    await this.ctx.resume() // context time was frozen, so t0 is still valid
    if (this.disposed || epoch !== this.epoch || this.state !== 'paused') return
    this.state = 'playing'
    this.startTimer()
    this.tick()
  }

  async seek(t: number) {
    if (!this.arr) return
    const to = Math.max(0, Math.min(this.arr.duration - 0.05, t))
    if (this.state === 'paused' && this.ctx) {
      this.stopVoices()
      this.pausedAt = to
      this.t0 = this.ctx.currentTime - to
      this.nextIdx = this.indexAt(to)
      return
    }
    this.stopVoices()
    this.pausedAt = to
    await this.start(to)
  }

  stop() {
    this.epoch++
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.stopVoices()
    this.state = 'idle'
    this.pausedAt = 0
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  /** The page was hidden: hold the sound without touching the visitor's play/pause choice. */
  suspendForSystem() {
    if (this.disposed || !this.ctx || this.state !== 'playing' || this.systemSuspended) return
    this.systemSuspended = true
    void this.ctx.suspend()
  }

  /** The page is visible again: resume only what the system (not the visitor) paused. */
  resumeFromSystem() {
    if (this.disposed || !this.ctx || !this.systemSuspended) return
    this.systemSuspended = false
    if (this.state === 'playing') void this.ctx.resume()
  }

  dispose() {
    this.disposed = true
    this.epoch++
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.onEnd = null
    this.stopVoices()
    this.buffers.clear()
    const ctx = this.ctx
    this.ctx = null
    this.input = null
    this.master = null
    this.state = 'idle'
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined)
  }
}
