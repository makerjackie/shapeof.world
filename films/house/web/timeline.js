// One clock for picture and sound. 120 BPM, so a bar is exactly 2 seconds.
// Bars and beats are 1-based, like a score: bt(1) is the first downbeat at 0.
export const BPM = 120
export const BEAT = 60 / BPM
export const BAR = BEAT * 4

// Scenes are written in storyboard bars. ORDER lists them in the order they
// play: v6 moved whole chapters (where the money goes now comes first), so
// the numbers no longer run 1, 2, 3. Bars left out are cut; new shots took
// numbers from 60. HOLDS[n] = bars held after bar n; a held bar is addressed
// as beats 5–8 of bar n, so bt(2, 5) is the first beat held after bar 2.
// Holds are planned by tools/holds.mjs --plan (reading rule in
// tools/reading.mjs, at most one frozen bar per shot), plus a bar on the big
// reveals and the closing lines.
export const ORDER = [
  1, 2, 3, //                                   hook, title
  12, 15, 16, 13, 14, 17, 18, 20, 21, 19, 9, 10, // 01 where the money goes
  22, //                                        the turn
  4, 5, 6, 7, 8, 11, //                         02 where it comes from…
  23, 24, 25, 60, 26, 27, 28, //                …the bank
  30, 32, 33, 36, 37, //                        03 after you move in
  38, 39, 40, 61, 42, 44, //                    04 what next
  47, 48, 62, 63, 52, 53, 54, 49, 50, 51, 55, 56, 58, 59, // the close
]
export const HOLDS = { 2: 1, 3: 1, 16: 1, 13: 1, 14: 1, 18: 1, 21: 1, 19: 1, 10: 1, 22: 2, 4: 1, 5: 1, 8: 1, 23: 1, 24: 1, 25: 1, 60: 1, 26: 1, 28: 1, 30: 1, 33: 1, 36: 1, 37: 1, 38: 1, 61: 1, 42: 1, 44: 1, 48: 1, 63: 1, 54: 1, 50: 1, 51: 1 }
const LEN = (bar) => 1 + (HOLDS[bar] || 0)
const START = new Map()
{ let p = 1; for (const b of ORDER) { START.set(b, p); p += LEN(b) } }
// Storyboard bar → played bar. Cut bars never come: Infinity.
export const nb = (bar) => START.get(bar) ?? Infinity

export const BARS = ORDER.reduce((n, b) => n + LEN(b), 0)
export const TAIL = 1 // the closing card holds over the music's ring-out
export const BODY = BARS * BAR
export const DURATION = BODY + TAIL

export const bt = (bar, beat = 1) => (nb(Math.floor(bar)) - 1) * BAR + (beat - 1) * BEAT
// The end of storyboard bar n, holds included: where the next bar in ORDER begins.
export const bend = (bar) => bt(bar) + LEN(bar) * BAR
// Raw clock in played bars, for the score.
export const at = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * BEAT

// Musical sections in play order, each from its first storyboard bar to the
// next one's; `kind` drives the arrangement in music/score.js, `key`
// transposes in semitones (the final bill lifts the track by a tone).
export const SECTIONS = [
  { name: 'hook', first: 1, kind: 'hook', key: 0 },
  { name: 'title', first: 3, kind: 'title', key: 0 },
  { name: 'split', first: 12, kind: 'groove', key: 0 },
  { name: 'answer', first: 20, kind: 'drop', key: 0 },
  { name: 'pivot', first: 22, kind: 'stop', key: 0 },
  { name: 'source', first: 4, kind: 'groove', key: 0 },
  { name: 'bank', first: 23, kind: 'clock', key: 0 },
  { name: 'after', first: 30, kind: 'groove2', key: 0 },
  { name: 'future', first: 38, kind: 'breakdown', key: 0 },
  { name: 'now', first: 42, kind: 'groove2', key: 0 },
  { name: 'rise', first: 44, kind: 'build', key: 0 },
  { name: 'bill', first: 47, kind: 'drop2', key: 2 },
  { name: 'flow', first: 52, kind: 'travel', key: 0 },
  { name: 'time', first: 49, kind: 'reflect', key: 0 },
  { name: 'home', first: 55, kind: 'anthem', key: 2 },
  { name: 'outro', first: 58, kind: 'outro', key: 0 },
]
// The same sections in played bars.
export const PLAYED = SECTIONS.map((s, k) => ({ ...s, from: nb(s.first), to: k + 1 < SECTIONS.length ? nb(SECTIONS[k + 1].first) - 1 : BARS }))

// Sound effects tied to on-screen events. [bar, beat, type, ...args]. Scenes
// animate on the same marks. Beats may be fractional (2.5 = the "and" of 2).
// 'pour' takes (duration, clicks): blocks streaming somewhere. 'coin' marks
// every change to the running bill. Listed in play order.
const pops = (bar, beats) => beats.map((b) => [bar, b, 'pop'])
export const CUES = [
  // Open: the house, the 33, the question, the title.
  [1, 1, 'boom'], [1, 2.6, 'pop'],
  [2, 1, 'pour', 0.45, 12], [2, 1.1, 'whoosh'], [2, 3, 'impact'],
  [3, 1, 'boom'], [3, 4.4, 'swish'],
  // 01 where the money goes: building first, then the 67.
  [12, 1, 'boom'], [12, 1.8, 'pour', 0.8, 16],
  [15, 1.2, 'pour', 0.9, 18], [16, 1, 'shimmer'],
  [13, 1, 'pour', 0.8, 16], [13, 2.4, 'impact'],
  [14, 2, 'swish'], [14, 2.6, 'swish'], [14, 3.4, 'impact'],
  [17, 1, 'pour', 0.45, 9], [17, 2, 'pour', 0.3, 5], [17, 2.5, 'pour', 0.25, 4], [17, 3, 'pour', 0.3, 5],
  [18, 1.2, 'pour', 0.25, 4], [18, 2, 'powerdown'],
  [20, 1.1, 'whoosh'], [21, 1, 'impact'],
  [19, 1.3, 'swish'], [19, 1.7, 'swish'], [19, 2.1, 'swish'], [19, 2.5, 'swish'], [19, 3, 'impact'],
  ...pops(9, [1.5, 2, 2.5, 3, 3.5, 4]), [10, 1, 'pop'], [10, 2, 'whoosh'], [10, 3, 'impact'], [10, 3.6, 'pop'],
  // The turn.
  [22, 1, 'impact'], [22, 5.6, 'whoosh'], [22, 6, 'boom'], [22, 6.2, 'coin'],
  // 02 where it comes from, and the bank.
  [4, 1, 'whoosh'], [4, 2, 'pour', 1.1, 22], [4, 3.6, 'pop'],
  [5, 1, 'swish'], [5, 3, 'ding'],
  [6, 1, 'whoosh'], [6, 2, 'pour', 0.45, 12],
  ...pops(7, [1.5, 2.5]),
  ...pops(8, [1.1, 1.3, 1.5]), [8, 2.5, 'pour', 0.6, 14], [8, 3, 'coin'],
  [11, 1, 'whoosh'], [11, 1.4, 'pour', 0.8, 16],
  [23, 1, 'whoosh'], [23, 1.2, 'pour', 0.6, 12], [23, 2, 'pop'],
  [25, 1.6, 'pour', 0.9, 18], [25, 2, 'coin'], [25, 3, 'impact'],
  [60, 1, 'whoosh'], [60, 1.4, 'pour', 0.5, 10], [60, 2, 'pour', 0.5, 10], [60, 2.6, 'pour', 0.6, 12], [60, 3.4, 'boom'],
  [26, 1.3, 'swish'], [26, 2.1, 'swish'], [26, 3.2, 'impact'],
  [27, 1, 'whoosh'], ...pops(27, [2.5, 2.8, 3.1, 3.4]), [28, 2, 'shimmer'], [28, 2.6, 'coin'], [28, 3.4, 'impact'],
  // 03 after you move in.
  [30, 1, 'whoosh'], [30, 2, 'coin'], [30, 3, 'coin'], [32, 3, 'coin'],
  [33, 1.2, 'pour', 0.6, 12], [33, 2.2, 'impact'], [33, 3.2, 'swish'],
  ...pops(36, [1.8, 2.6]), [36, 3.4, 'impact'],
  [37, 1, 'swish'], ...pops(37, [2.2, 2.6, 3]),
  // 04 what next.
  [38, 1, 'whoosh'], [38, 1.2, 'impact'],
  [39, 1, 'swish'], [39, 2, 'impact'], [39, 3, 'swish'], [39, 4, 'impact'], [40, 1, 'swish'], [40, 2, 'impact'],
  [61, 1, 'swish'], [61, 2, 'impact'],
  [42, 1, 'swish'], [42, 2.8, 'impact'],
  [44, 1, 'impact'], [44, 2.5, 'impact'],
  // The bill; what it bought; where it went; the time; the landing; the close.
  [47, 1, 'boom'], [47, 1.8, 'pour', 0.8, 18], [47, 3, 'coin'], [47, 3.1, 'impact'], ...pops(48, [1, 1.4, 1.8]),
  [62, 1, 'whoosh'], [62, 1.2, 'pour', 1.0, 20], ...pops(62, [2.6, 3.0, 3.4]), [63, 1, 'impact'], [63, 2.2, 'shimmer'],
  [52, 1, 'whoosh'], [52, 2, 'pour', 1.5, 26], ...pops(53, [1, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4]), [54, 1, 'shimmer'],
  [49, 1, 'swish'], [49, 2.5, 'ding'], [50, 1, 'pour', 1.2, 20], [51, 1, 'shimmer'],
  [55, 1, 'pour', 1.0, 18], [55, 3, 'ding'],
  [58, 1, 'whoosh'], [58, 1.5, 'shimmer'], [58, 4, 'swish'], [59, 1, 'ding'],
].filter(([bar]) => ORDER.includes(bar))
