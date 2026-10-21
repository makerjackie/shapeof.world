// One clock for picture and sound. Bars and beats are 1-based, like a score:
// bt(1) is the first downbeat at t = 0.
export const BPM = 128
export const BEAT = 60 / BPM
export const BAR = BEAT * 4

// Scenes keep v3's bar numbers. v4 gives the densest shots more room by
// inserting whole bars: HOLDS[n] = bars inserted after bar n. An inserted bar
// is addressed as beats 5–8 of the bar before it, so bt(31, 5) is the first
// beat of the bar added after bar 31.
// A negative entry deletes that many bars after bar n; a deleted bar collapses
// onto the start of the next bar that is kept. v4.1 cut bars 3–4 and 6 from the
// open (and gave the opening clash a second bar), 50 from the run-up to chapter 5 and 82 from the closing shape.
// v7 cut the price-of-thought bars 13–14 (tokens keep bar 13 as their hold;
// the 13× lands on the Jevons chart). v8 keeps that and restores the rest of
// v6: the four small places get a bar and a half each, Europe and sovereign AI
// return (bars 69–70), and chapter 6 is whole again — the biggest data centre
// (73, two bars), all of them and their share of the grid (74–75), the chapter
// line (the bar added after 75), the flywheel that answers the opening
// question (76–79), the shape (80–81) and a three-bar end card.
export const HOLDS = { 1: 1, 2: -2, 5: -1, 7: -1, 13: -1, 23: 1, 24: -2, 31: 1, 33: 1, 34: 1, 35: 1, 49: -1, 59: -2, 62: 1, 73: 1, 75: 1, 81: -1, 83: 2 }
const added = (bar) => Object.entries(HOLDS).reduce((n, [k, v]) => {
  const after = bar - Number(k) - 1 // how far past bar k this bar starts
  return n + (v > 0 ? (after >= 0 ? v : 0) : -Math.min(-v, Math.max(0, after)))
}, 0)
export const nb = (bar) => bar + added(bar) // v3 bar number → played bar number

export const BARS = nb(83) + HOLDS[83]
export const TAIL = 1.8 // the closing card holds over the music's ring-out
export const BODY = BARS * BAR
export const DURATION = BODY + TAIL

export const bt = (bar, beat = 1) => (nb(Math.floor(bar)) - 1) * BAR + (beat - 1) * BEAT
// Raw clock in played bars, for the score.
export const at = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * BEAT

// Musical sections. `kind` drives the arrangement in music/score.js; `key` is
// a transposition in semitones (chapter 5 lifts the whole track by a tone).
export const SECTIONS = [
  { name: 'cold', from: 1, to: 1, kind: 'intro', key: 0 },
  { name: 'flash', from: 2, to: 4, kind: 'flash', key: 0 }, // bars 3–4 are cut: the live count rides the riser
  { name: 'title', from: 5, to: 6, kind: 'title', key: 0 },
  { name: 'people', from: 7, to: 14, kind: 'groove', key: 0 },
  { name: 'jevons', from: 15, to: 16, kind: 'build', key: 0 },
  { name: 'money', from: 17, to: 28, kind: 'drop', key: 0 },
  { name: 'scale', from: 29, to: 38, kind: 'tech', key: 0 },
  { name: 'ability', from: 39, to: 43, kind: 'breakdown', key: 0 },
  { name: 'matchup', from: 44, to: 44, kind: 'build', key: 0 },
  { name: 'gap', from: 45, to: 48, kind: 'groove2', key: 0 },
  { name: 'rise', from: 49, to: 50, kind: 'build', key: 2 },
  { name: 'powers', from: 51, to: 62, kind: 'drop2', key: 2 },
  { name: 'chokepoints', from: 63, to: 68, kind: 'map', key: 2 },
  { name: 'rest', from: 69, to: 72, kind: 'build', key: 2 },
  { name: 'physical', from: 73, to: 79, kind: 'drop2', key: 2 },
  { name: 'outro', from: 80, to: 83, kind: 'outro', key: 0 },
]

// The same sections in played bars.
export const PLAYED = SECTIONS.map((s) => ({ ...s, from: nb(s.from), to: nb(s.to + 1) - 1 }))

// The tug of war: ten pulls, one every three beats from bar 51 beat 3.
export const TUG_AT = [...Array(10)].map((_, i) => [51, 3 + i * 3])

// Sound effects tied to on-screen events. [bar, beat, type]. Scenes animate on
// the same marks. Beats may be fractional (2.5 = the "and" of beat 2).
export const CUES = [
  [1, 1, 'boom'], [1, 3, 'impact'], [2, 1, 'impact'],
  [5, 1, 'boom'],
  [7, 1, 'whoosh'], [7, 3, 'shimmer'], [9, 1, 'pop'],
  [10, 1, 'powerdown'], [10, 3, 'ding'],
  [11, 1, 'whoosh'], [11, 4.5, 'swish'], [12, 5, 'impact'],
  [16, 1, 'boom'],
  [17, 1, 'impact'], [18, 1, 'impact'], [19, 1, 'impact'], [20, 1, 'boom'],
  [21, 1, 'whoosh'], [22, 1, 'impact'], [23, 1, 'impact'], [24, 1, 'impact'],
  [23, 5, 'impact'], [27, 1, 'boom'],
  [29, 1, 'whoosh'], [29, 3.6, 'swish'], [30, 1.6, 'swish'], [30, 3.6, 'swish'], [31, 4.1, 'swish'], [31, 5, 'impact'],
  [32, 1, 'impact'], [33, 1, 'swish'], [33, 5, 'impact'], [34, 1, 'impact'], [34, 5, 'impact'], [35, 1, 'impact'], [35, 5, 'impact'],
  [36, 1, 'swish'], [37, 1, 'impact'], [38, 1, 'impact'],
  [39, 1, 'whoosh'], [40, 3, 'ding'], [41, 1, 'swish'], [42, 1, 'impact'], [43, 1, 'swish'],
  [44, 1, 'whoosh'], [45, 1, 'impact'], [46, 1, 'impact'], [47, 1, 'impact'], [48, 1, 'boom'],
  [51, 1, 'boom'], ...TUG_AT.map(([b, beat]) => [b, beat, 'impact']), [59, 1, 'boom'],
  [62, 1, 'boom'], [62, 4, 'impact'],
  [63, 1, 'whoosh'], [64, 3, 'pop'], [66, 1, 'whoosh'], [67, 3, 'pop'],
  [69, 1, 'impact'], [70, 1, 'impact'], [71, 1, 'boom'],
  [73, 1, 'boom'], [73, 4.5, 'pop'], [74, 1, 'impact'], [75, 1, 'impact'], [75, 5, 'boom'],
  // The flywheel: the question, five stations, the loop closes.
  [76, 1, 'whoosh'], [76, 3, 'pop'], [77, 1, 'pop'], [77, 3, 'pop'], [78, 1, 'pop'], [78, 3, 'pop'], [79, 1, 'impact'],
  [80, 1, 'boom'], [81, 1, 'swish'], [83, 1, 'impact'], [83, 9, 'swish'], [83, 10, 'shimmer'],
]
