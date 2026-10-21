// Turns song data (melody + chords) into playable ukulele events: which string, which fret, when.
// Pure logic, no DOM and no audio, so it is unit-tested in node.
import { OPEN_STRING_MIDI } from './ukulele-geometry'

export const OPEN = OPEN_STRING_MIDI
export const STRING_NAMES = ['G', 'C', 'E', 'A'] as const
export const MAX_FRET = 15

export type NoteKind = 'melody' | 'comp' | 'strum'

export type Song = {
  id: string
  /** Chinese source text; the interface translates it with `tx()`. */
  title: string
  credit: string
  keyLabel: string
  bpm: number
  beatsPerBar: number
  bars: number
  sections: Array<{ name: string; bar: number }>
  /** [beat, chord name] */
  chords: Array<[number, string]>
  /** [beat, note name, duration in beats] */
  melody: Array<[number, string, number]>
  /** Accompaniment style per range of beats. */
  comp: Array<{ from: number; to: number; style: string }>
  finale?: { bar: number; chord: string }
  /** True for songs the visitor loaded from their own MIDI file. */
  imported?: boolean
}

export type NoteEvent = {
  id: number
  beat: number
  /** Seconds from the start of the song. */
  t: number
  /** String index: 0 G, 1 C, 2 E, 3 A. */
  s: number
  f: number
  vel: number
  durBeats: number
  kind: NoteKind
  midi: number
}

export type Arrangement = {
  song: Song
  /** Seconds per beat. */
  spb: number
  events: Array<NoteEvent>
  perString: Array<Array<NoteEvent>>
  duration: number
  totalBars: number
  finaleBeat: number
  chordAt: (beat: number) => string
  chordList: Array<[number, string]>
  sectionIndexAt: (bar: number) => number
}

type Fingering = { s: number; f: number }
type Role = 'root' | 'fifth' | 'e' | 'a' | 'c' | 'g'
type Pattern = Array<[number, Role, number]>

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function noteToMidi(name: string): number {
  let p = PITCH[name[0]]
  let i = 1
  while (name[i] === '#' || name[i] === 'b') {
    p += name[i] === '#' ? 1 : -1
    i++
  }
  return (parseInt(name.slice(i), 10) + 1) * 12 + p
}

/** Chord shapes as frets on [G, C, E, A], and the pitch class of the root. */
export const CHORDS: Record<string, { frets: [number, number, number, number]; root: number }> = {
  C: { frets: [0, 0, 0, 3], root: 0 },
  C7: { frets: [0, 0, 0, 1], root: 0 },
  F: { frets: [2, 0, 1, 0], root: 5 },
  Fmaj7: { frets: [2, 4, 1, 0], root: 5 },
  G: { frets: [0, 2, 3, 2], root: 7 },
  G7: { frets: [0, 2, 1, 2], root: 7 },
  Gm7: { frets: [0, 2, 1, 1], root: 7 },
  Am: { frets: [2, 0, 0, 0], root: 9 },
  Dm: { frets: [2, 2, 1, 0], root: 2 },
  Em: { frets: [0, 4, 3, 2], root: 4 },
  Bb: { frets: [3, 2, 1, 1], root: 10 },
  D7: { frets: [2, 2, 2, 3], root: 2 },
  D: { frets: [2, 2, 2, 0], root: 2 },
  E: { frets: [4, 4, 4, 2], root: 4 },
  E7: { frets: [1, 2, 0, 2], root: 4 },
  A7: { frets: [0, 1, 0, 0], root: 9 },
  Am7: { frets: [0, 0, 0, 0], root: 9 },
  B7: { frets: [2, 3, 2, 2], root: 11 },
  Gm: { frets: [0, 2, 3, 1], root: 7 },
}

// ---- fretting -------------------------------------------------------------------------------
export function candidates(midi: number): Array<Fingering> {
  const out: Array<Fingering> = []
  for (let s = 0; s < 4; s++) {
    const f = midi - OPEN[s]
    if (f >= 0 && f <= MAX_FRET) out.push({ s, f })
  }
  return out
}

// Melody prefers the two high strings (A, E) so the chord's bass strings stay free.
const STRING_PENALTY = [4, 3, 0.4, 0]
function unaryCost(c: Fingering): number {
  return STRING_PENALTY[c.s] + 0.12 * c.f + (c.f > 12 ? 2 : 0) - (c.f === 0 ? 0.3 : 0)
}

// In fast passages (< 0.25 s) a big fret leap along ONE string is hard to play and cluttered to read,
// so it costs extra and the fingering spreads across strings instead.
const FAST_DT = 0.25
function transitionCost(a: Fingering, b: Fingering, dt?: number): number {
  const move = Math.abs(a.f - b.f)
  const k = a.f > 0 && b.f > 0 ? 0.22 : 0.08
  let c = k * move + (a.s !== b.s ? 0.15 : 0)
  if (dt !== undefined && dt < FAST_DT && a.s === b.s) c += 0.3 * move
  return c
}

/** Viterbi over the whole melody: smooth hand movement, few position jumps. */
export function assignFrets(midis: Array<number>, times?: Array<number>): Array<Fingering> {
  const cands = midis.map(candidates)
  cands.forEach((c, i) => {
    if (!c.length) throw new Error(`note out of ukulele range: midi ${midis[i]}`)
  })
  const cost: Array<Array<number>> = []
  const back: Array<Array<number>> = []
  for (let i = 0; i < cands.length; i++) {
    cost.push([])
    back.push([])
    cands[i].forEach((c, j) => {
      if (i === 0) {
        cost[i][j] = unaryCost(c)
        back[i][j] = -1
        return
      }
      let best = Infinity
      let bi = 0
      cands[i - 1].forEach((p, k) => {
        const v = cost[i - 1][k] + transitionCost(p, c, times ? times[i] - times[i - 1] : undefined)
        if (v < best) {
          best = v
          bi = k
        }
      })
      cost[i][j] = best + unaryCost(c)
      back[i][j] = bi
    })
  }
  let j = 0
  let best = Infinity
  const last = cands.length - 1
  cost[last].forEach((v, k) => {
    if (v < best) {
      best = v
      j = k
    }
  })
  const out = new Array<Fingering>(cands.length)
  for (let i = last; i >= 0; i--) {
    out[i] = cands[i][j]
    j = back[i][j]
  }
  return out
}

// ---- accompaniment --------------------------------------------------------------------------
/** Bass notes live on the C and G strings, lowest fret wins. */
function bassOn(midi: number): Fingering | null {
  const c = candidates(midi).filter((x) => x.s <= 1 && x.f <= 12)
  c.sort((a, b) => a.f - b.f || a.s - b.s)
  return c[0] ? { s: c[0].s, f: c[0].f } : null
}
const rootMidi = (chord: string) => 60 + CHORDS[chord].root
function fifthMidi(chord: string): number {
  const r = rootMidi(chord)
  return r - 5 >= 60 ? r - 5 : r + 7
}
const voicingNote = (chord: string, s: number): Fingering => ({ s, f: CHORDS[chord].frets[s] })

function resolveRole(chord: string, role: Role): Fingering | null {
  switch (role) {
    case 'root':
      return bassOn(rootMidi(chord))
    case 'fifth':
      return bassOn(fifthMidi(chord))
    case 'e':
      return voicingNote(chord, 2)
    case 'a':
      return voicingNote(chord, 3)
    case 'c':
      return voicingNote(chord, 1)
    case 'g':
      return voicingNote(chord, 0)
  }
}

// [offset in beats, role, velocity]. A pattern is one bar long and restarts every bar of a chord.
// Names without a suffix are written for 4-beat bars; the '3' variants (and 'waltz') for 3-beat bars.
export const PATTERNS: Record<string, Pattern> = {
  bass: [[0, 'root', 0.62], [2, 'fifth', 0.46]],
  bassfill: [[0, 'root', 0.62], [1.5, 'e', 0.3], [2, 'fifth', 0.46], [3.5, 'a', 0.3]],
  pulse: [[0, 'root', 0.62], [0.5, 'e', 0.34]],
  'arp-ground': [[0, 'root', 0.62], [0.5, 'a', 0.36], [0.75, 'e', 0.3]],
  arp: [[0, 'root', 0.6], [0.5, 'a', 0.4], [1, 'e', 0.36], [1.5, 'a', 0.4], [2, 'fifth', 0.5], [2.5, 'a', 0.4], [3, 'e', 0.36], [3.5, 'a', 0.4]],
  waltz: [[0, 'root', 0.62], [1, 'e', 0.34], [2, 'a', 0.34]],
  bass3: [[0, 'root', 0.62], [1.5, 'fifth', 0.46]],
  bassfill3: [[0, 'root', 0.62], [1, 'e', 0.3], [1.5, 'fifth', 0.46], [2.5, 'a', 0.3]],
  pulse3: [[0, 'root', 0.62], [0.5, 'e', 0.34]],
  'arp-ground3': [[0, 'root', 0.62], [0.5, 'a', 0.36], [0.75, 'e', 0.3]],
  arp3: [[0, 'root', 0.6], [0.5, 'a', 0.4], [1, 'e', 0.36], [1.5, 'fifth', 0.5], [2, 'e', 0.36], [2.5, 'a', 0.4]],
  // bass / fifth / top note, one per beat: the left-hand figure of a 3/8 piece counted in eighths
  lh3: [[0, 'root', 0.6], [1, 'fifth', 0.4], [2, 'a', 0.4]],
}
const ARP_STYLES: Record<string, true> = { arp: true, arp3: true }

/** 4/4 songs use the plain names; in a 3-beat song 'bass' means 'bass3', 'arp' means 'arp3', ... */
function patternFor(style: string, beatsPerBar: number): Pattern {
  const pat = (beatsPerBar === 3 && PATTERNS[`${style}3`]) || PATTERNS[style]
  if (!pat) throw new Error(`unknown comp style: ${style}`)
  return pat
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- main entry -----------------------------------------------------------------------------
export function arrange(song: Song, seed = 7): Arrangement {
  const rnd = mulberry32(seed)
  const spb = 60 / song.bpm
  const bpb = song.beatsPerBar
  const events: Array<NoteEvent> = []
  const jitter = (amt: number) => (rnd() - 0.5) * 2 * amt

  // melody
  const mel = song.melody.slice().sort((a, b) => a[0] - b[0])
  const placed = assignFrets(mel.map((m) => noteToMidi(m[1])), mel.map((m) => m[0] * spb))
  mel.forEach((m, i) => {
    events.push({
      id: 0,
      beat: m[0],
      t: m[0] * spb + jitter(0.003),
      s: placed[i].s,
      f: placed[i].f,
      vel: Math.min(1, 0.86 + jitter(0.07)),
      durBeats: m[2],
      kind: 'melody',
      midi: OPEN[placed[i].s] + placed[i].f,
    })
  })
  const melodyEvents = events.slice()

  // accompaniment
  const chords = song.chords.slice().sort((a, b) => a[0] - b[0])
  const endBeat = song.finale ? (song.finale.bar - 1) * bpb : song.bars * bpb
  const styleAt = (beat: number) => song.comp.find((c) => beat >= c.from && beat < c.to)?.style ?? null
  chords.forEach((ch, i) => {
    const start = ch[0]
    if (start >= endBeat) return
    const end = Math.min(i + 1 < chords.length ? chords[i + 1][0] : endBeat, endBeat)
    const style = styleAt(start)
    if (!style) return
    const pat = patternFor(style, bpb)
    // patterns longer than a chord repeat per bar-sized window
    for (let w = start; w < end; w += bpb) {
      pat.forEach(([off, role, vel]) => {
        const beat = w + off
        if (beat >= end - 1e-6 || beat >= endBeat) return
        if (ARP_STYLES[style] && w > start && off === 0 && end - start <= bpb) return
        const pos = resolveRole(ch[1], role)
        if (!pos) return
        const t = beat * spb + jitter(0.005)
        const upper = role === 'e' || role === 'a'
        // never cut a melody note that is still ringing on that string, nor pile onto a melody attack
        const clash = melodyEvents.some(
          (m) =>
            (m.s === pos.s && (Math.abs(m.t - t) < 0.12 || (m.t < t && t < m.t + m.durBeats * spb * 0.98)))
            || (upper && Math.abs(m.t - t) < 0.15),
        )
        if (clash) return
        events.push({
          id: 0,
          beat,
          t,
          s: pos.s,
          f: pos.f,
          vel: Math.min(1, vel * (1 + jitter(0.1))),
          durBeats: 1,
          kind: 'comp',
          midi: OPEN[pos.s] + pos.f,
        })
      })
    }
  })

  // finale: one rolled chord
  if (song.finale) {
    const fb = (song.finale.bar - 1) * bpb
    const shape = CHORDS[song.finale.chord].frets
    ;[0, 1, 2, 3].forEach((s, k) => {
      const t = fb * spb + k * 0.028
      if (melodyEvents.some((m) => m.s === s && Math.abs(m.t - t) < 0.1)) return
      events.push({
        id: 0,
        beat: fb,
        t,
        s,
        f: shape[s],
        vel: 0.72 - k * 0.04,
        durBeats: 4,
        kind: 'strum',
        midi: OPEN[s] + shape[s],
      })
    })
  }

  events.sort((a, b) => a.t - b.t || a.s - b.s)
  const perString: Array<Array<NoteEvent>> = [[], [], [], []]
  events.forEach((e, i) => {
    e.id = i
    perString[e.s].push(e)
  })

  const finaleBeat = song.finale ? (song.finale.bar - 1) * bpb : song.bars * bpb
  const duration = finaleBeat * spb + 4.4

  return {
    song,
    spb,
    events,
    perString,
    duration,
    totalBars: song.bars,
    finaleBeat,
    chordAt(beat) {
      let cur = chords[0][1]
      for (const [at, name] of chords) {
        if (at <= beat + 1e-6) cur = name
        else break
      }
      return cur
    },
    chordList: chords,
    sectionIndexAt(bar) {
      let idx = 0
      song.sections.forEach((s, i) => {
        if (bar >= s.bar) idx = i
      })
      return idx
    },
  }
}
