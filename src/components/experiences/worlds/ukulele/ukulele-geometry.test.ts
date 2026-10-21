import { describe, expect, it } from 'vitest'

import {
  FRET_COUNT,
  FRET_RATIO,
  OPEN_STRING_MIDI,
  SCALE_LENGTH,
  fretFromNut,
  fretGap,
  fretZ,
  frequencyAt,
  pluckFraction,
  pluckZ,
  vibratingLength,
} from './ukulele-geometry'

// The world's central claim: each fret leaves 2^(-1/12) of the string, the 12th fret is at half the
// scale length, and the first fret is s / 17.817 from the nut (Mottola, "Calculating Fret Positions").
describe('fretboard geometry', () => {
  it('leaves 0.9439 of the vibrating length after each fret', () => {
    expect(FRET_RATIO).toBeCloseTo(0.943874, 6)
    for (let n = 0; n < FRET_COUNT; n++) {
      expect(vibratingLength(n + 1) / vibratingLength(n)).toBeCloseTo(FRET_RATIO, 12)
    }
  })

  it('puts the 12th fret at exactly half the scale length (one octave)', () => {
    expect(vibratingLength(12)).toBeCloseTo(SCALE_LENGTH / 2, 12)
    expect(frequencyAt(440, 12)).toBeCloseTo(880, 9)
  })

  it('matches the published fret formula d = s - s / 2^(n/12)', () => {
    for (let n = 0; n <= FRET_COUNT; n++) {
      expect(fretFromNut(n)).toBeCloseTo(SCALE_LENGTH - SCALE_LENGTH / 2 ** (n / 12), 12)
    }
    // the divisor luthiers use: scale length / first-fret offset = 17.817
    expect(SCALE_LENGTH / fretFromNut(1)).toBeCloseTo(17.817, 3)
  })

  it('makes every fret gap 0.9439 times the one before, so frets crowd toward the body', () => {
    for (let n = 0; n < FRET_COUNT - 1; n++) {
      expect(fretGap(n + 1) / fretGap(n)).toBeCloseTo(FRET_RATIO, 12)
      expect(fretGap(n + 1)).toBeLessThan(fretGap(n))
    }
  })

  it('raises the pitch one semitone per fret on every string', () => {
    OPEN_STRING_MIDI.forEach((midi) => {
      const open = 440 * 2 ** ((midi - 69) / 12)
      for (let n = 1; n <= FRET_COUNT; n++) {
        const semitones = 12 * Math.log2(frequencyAt(open, n) / open)
        expect(semitones).toBeCloseTo(n, 9)
      }
    })
  })

  it('places fret z on the instrument axis, nut at -scale length', () => {
    expect(fretZ(0)).toBeCloseTo(-SCALE_LENGTH, 12)
    expect(fretZ(12)).toBeCloseTo(-SCALE_LENGTH / 2, 12)
  })

  it('keeps the plucking hand over the soundhole and never behind the fretting finger', () => {
    for (let n = 0; n <= FRET_COUNT; n++) {
      expect(pluckZ(n)).toBeGreaterThanOrEqual(-0.105 - 1e-12)
      expect(pluckZ(n)).toBeGreaterThanOrEqual(fretZ(n)) // between fret and saddle
      const b = pluckFraction(n)
      expect(b).toBeGreaterThan(0)
      expect(b).toBeLessThanOrEqual(0.5)
    }
  })
})
