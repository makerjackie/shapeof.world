import { describe, expect, it } from 'vitest'

import {
  decodeShareState,
  encodeShareState,
  readBoolean,
  readNumber,
  readOption,
  withShareState,
} from './share-state'

describe('share state encoding', () => {
  it('round-trips the kinds of state a world actually holds', () => {
    const packed = encodeShareState({ shape: 'teardrop', wind: 0.095, angle: -12, smoke: true })

    expect(packed).toBe('shape:teardrop,wind:0.095,angle:-12,smoke:1')
    const decoded = decodeShareState(packed)
    expect(readOption(decoded, 'shape', ['cube', 'teardrop'] as const, 'cube')).toBe('teardrop')
    expect(readNumber(decoded, 'wind', 0)).toBeCloseTo(0.095, 5)
    expect(readNumber(decoded, 'angle', 0)).toBe(-12)
    expect(readBoolean(decoded, 'smoke', false)).toBe(true)
  })

  it('keeps links free of floating point noise', () => {
    // Slider arithmetic routinely produces values like this.
    expect(encodeShareState({ wind: 0.09500000000000001 })).toBe('wind:0.095')
  })

  it('survives values that need escaping', () => {
    const packed = encodeShareState({ mode: 'a,b:c' })
    expect(decodeShareState(packed).mode).toBe('a,b:c')
  })

  it('degrades to defaults instead of throwing on a broken link', () => {
    for (const broken of ['', 'garbage', 'a:', ':b', 'a:%E0%A4%A', 'x'.repeat(900)]) {
      expect(() => decodeShareState(broken)).not.toThrow()
    }
    expect(decodeShareState('a:%E0%A4%A')).toEqual({})
    expect(decodeShareState(undefined)).toEqual({})
  })

  it('refuses keys and payloads that do not belong in a link', () => {
    // Prototype pollution shaped keys, and oversized values, are dropped.
    expect(encodeShareState({ __proto__: 'x' } as never)).toBe('')
    expect(encodeShareState({ 'bad key': 'x' } as never)).toBe('')
    expect(encodeShareState({ long: 'y'.repeat(200) })).toBe('')
    expect(decodeShareState('__proto__:x')).toEqual({})
  })

  it('never lets a link choose a mode the world does not offer', () => {
    // The value comes from a stranger's URL, so it is validated against the set.
    const decoded = decodeShareState('view:__proto__')
    expect(readOption(decoded, 'view', ['smoke', 'speed'] as const, 'smoke')).toBe('smoke')
  })

  it('clamps numbers to the range the control actually allows', () => {
    const decoded = decodeShareState('wind:99999,angle:-99999')
    expect(readNumber(decoded, 'wind', 0.09, { min: 0.05, max: 0.13 })).toBe(0.13)
    expect(readNumber(decoded, 'angle', 0, { min: -24, max: 24 })).toBe(-24)
    expect(readNumber(decodeShareState('wind:abc'), 'wind', 0.09)).toBe(0.09)
  })

  it('adds and strips the parameter without disturbing the rest of the URL', () => {
    const base = 'https://shapeof.world/explore/fluid-sim?issue=x'
    const withState = withShareState(base, 'shape:cube')
    expect(withState).toContain('issue=x')
    expect(new URL(withState).searchParams.get('s')).toBe('shape:cube')
    expect(new URL(withShareState(withState, '')).searchParams.get('s')).toBeNull()
  })
})
