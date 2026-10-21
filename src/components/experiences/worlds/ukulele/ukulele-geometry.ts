/**
 * Concert-ukulele geometry, in metres.
 *
 * Origin at the saddle, +x to the player's right, +y up, the nut at z = -SCALE_LENGTH.
 * The fret rule below is the world's central, checkable claim: with equal temperament each
 * fret leaves the string 2^(-1/12) = 0.9439 of the length it had before, so the 12th fret sits
 * at exactly half the scale length (an octave) and the frets crowd together toward the body.
 */

/** Nut to saddle. A concert ukulele is about 38 cm (15 in). */
export const SCALE_LENGTH = 0.38
export const FRET_COUNT = 15
export const OPEN_STRING_MIDI = [67, 60, 64, 69] as const // G4 C4 E4 A4 (re-entrant: the G is above the C)

/** Length multiplier for one fret: the twelfth root of 1/2. */
export const FRET_RATIO = 2 ** (-1 / 12)

/** Length of string left to vibrate between fret `n` and the saddle. */
export const vibratingLength = (n: number) => SCALE_LENGTH * 2 ** (-n / 12)

/** Distance from the nut to fret `n`: d = s - s / 2^(n/12). */
export const fretFromNut = (n: number) => SCALE_LENGTH - vibratingLength(n)

/** Gap between fret `n` and fret `n + 1`. Each gap is FRET_RATIO times the one before it. */
export const fretGap = (n: number) => vibratingLength(n) - vibratingLength(n + 1)

/** Position of fret `n` along the instrument axis (0 at the saddle, negative toward the nut). */
export const fretZ = (n: number) => -vibratingLength(n)

/** Pitch of a string stopped at fret `n`, relative to the open string, in Hz. */
export const frequencyAt = (openHz: number, n: number) => openHz / 2 ** (-n / 12)

export const Y_BOARD = 0.003 // top of fretboard
export const Y_FRET = 0.0041 // top of fret wire
export const Y_NUT = 0.0046 // string height at the nut
export const Y_BRIDGE = 0.0098 // string height at the saddle
export const Y_HOLE = 0.104 // soundhole centre, measured from the saddle toward the nut
export const R_HOLE = 0.032
export const BODY_DEPTH = 0.05

export const STRING_RADIUS = [0.00031, 0.00029, 0.00027, 0.00025] as const

export const fretboardWidth = (z: number) => 0.035 + 0.0421 * (z + SCALE_LENGTH)
export const stringSpacing = (z: number) => 0.0095 + 0.003 * ((z + SCALE_LENGTH) / SCALE_LENGTH)
/** Lateral position of string `i` (0 = G … 3 = A) at axis position `z`. */
export const stringX = (i: number, z: number) => (i - 1.5) * stringSpacing(z)

/** Where the right hand picks: over the upper half of the soundhole, never behind the fretting finger. */
export const pluckZ = (fret: number) => Math.max(-0.105, (fret > 0 ? fretZ(fret) : -SCALE_LENGTH) * 0.7)

/** Pluck position along the vibrating length, folded into 0..0.5 (what the synth uses). */
export function pluckFraction(fret: number): number {
  const length = vibratingLength(fret)
  const distance = Math.min(0.165, 0.62 * length)
  const b = distance / length
  return b > 0.5 ? 1 - b : b
}
