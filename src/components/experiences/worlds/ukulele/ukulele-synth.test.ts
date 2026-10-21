import { describe, expect, it } from 'vitest'

import { bodyImpulse, convolve, midiToHz, renderPluck } from './ukulele-synth'

const FS = 48000

const rms = (a: Float32Array, t0: number, t1: number) => {
  let e = 0
  const n0 = Math.floor(t0 * FS)
  const n1 = Math.floor(t1 * FS)
  for (let n = n0; n < n1; n++) e += a[n] * a[n]
  return Math.sqrt(e / (n1 - n0))
}

describe('ukulele voice', () => {
  it('renders finite, steady-level notes', () => {
    for (const midi of [60, 67, 72, 81]) {
      const note = renderPluck(FS, midi, { seed: 3 })
      expect(note.every(Number.isFinite)).toBe(true)
      expect(rms(note, 0, 0.3)).toBeCloseTo(0.16, 1) // normalised to the RMS of the first 300 ms
      expect(rms(note, 2.9, 3.3)).toBeLessThan(rms(note, 0, 0.3)) // and it dies away
    }
  })

  it('tunes the fundamental to the note', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 9)
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3)
    // count zero crossings of a plain low note: about 2 per period
    const note = renderPluck(FS, 57, { seed: 1, click: 0, thump: 0, tilt: 3 }) // A3, nearly a pure fundamental
    let crossings = 0
    const n0 = Math.floor(0.2 * FS)
    const n1 = Math.floor(0.7 * FS)
    for (let n = n0 + 1; n < n1; n++) if (note[n - 1] < 0 !== note[n] < 0) crossings++
    expect(crossings / 2 / 0.5).toBeGreaterThan(215)
    expect(crossings / 2 / 0.5).toBeLessThan(225)
  })

  // Regression: at click 2.6 / thump 1.2 the attack noise sat only 5-12 dB under the tone, so every
  // note sounded like a slap on the top. It has to stay clearly below the tone, measured after the body.
  it('keeps the pluck noise well under the string tone', () => {
    const body = bodyImpulse(FS)
    for (const midi of [62, 67, 71, 76]) {
      const noisy = convolve(renderPluck(FS, midi, { seed: 3 }), body)
      const pure = convolve(renderPluck(FS, midi, { seed: 3, click: 0, thump: 0 }), body)
      const diff = noisy.map((v, i) => v - pure[i])
      const ratioDb = 20 * Math.log10(rms(diff, 0, 0.03) / rms(pure, 0, 0.03))
      expect(ratioDb, `midi ${midi}`).toBeLessThan(-13.5)
    }
  })

  it('builds a body response with a direct path and resonances', () => {
    const h = bodyImpulse(FS)
    expect(h.length).toBe(Math.floor(FS * 0.28))
    expect(h[0]).toBeGreaterThan(0.3)
    expect(h.every(Number.isFinite)).toBe(true)
  })
})
