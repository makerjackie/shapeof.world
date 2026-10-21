// MIDI import: turns a Standard MIDI File into a song the arranger understands.
//   1. parse the file (format 0 or 1)
//   2. pick the melody: the highest-sounding busy part, reduced to one note at a time (top note wins)
//   3. find the key and move it to C major / A minor, where the ukulele chord shapes live,
//      then fold the melody into the playable range (C4..C6)
//   4. name a chord for every half bar from everything that sounds there
// Pure logic, no DOM, so it runs in node for tests too. The visitor's file is read in the browser and
// never leaves it.
import { CHORDS, type Song } from './ukulele-arranger'

/** Largest file the importer will read. Real melodies are a few KB; this is a sanity bound. */
export const MAX_MIDI_BYTES = 1_000_000
/** Bounds that keep arranging and sound rendering (both run on the main thread) to a moment. */
const MAX_RAW_NOTES = 60_000
const MAX_MELODY_NOTES = 4_000
const MAX_BARS = 600
const MAX_SECONDS = 900
const DAMAGED = 'MIDI 数据损坏'
const TOO_BIG = 'MIDI 内容太多或太长'

type RawNote = { tick: number; dur: number; key: number; vel: number; ch: number }
type Note = RawNote & { beat: number; beats: number }
export type ParsedMidi = {
  ppq: number
  tracks: Array<{ name: string; notes: Array<RawNote> }>
  tempos: Array<{ tick: number; uspq: number }>
  timeSigs: Array<{ tick: number; num: number; den: number }>
}

// ---- 1. parsing ------------------------------------------------------------------------------
// Error messages are Chinese source text; the interface translates them with `tx()`.
export function parseMidi(buffer: ArrayBuffer | Uint8Array): ParsedMidi {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let p = 0
  const str = (n: number) => {
    let s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i))
    p += n
    return s
  }
  const u32 = () => {
    const v = d.getUint32(p)
    p += 4
    return v
  }
  const u16 = () => {
    const v = d.getUint16(p)
    p += 2
    return v
  }
  // a variable-length quantity is at most 4 bytes (28 bits); anything longer is damaged, not a bigger number
  const vlq = () => {
    let v = 0
    for (let i = 0; i < 4; i++) {
      const b = d.getUint8(p++)
      v = v * 128 + (b & 0x7f)
      if (!(b & 0x80)) return v
    }
    throw new Error(DAMAGED)
  }

  try {
    if (bytes.byteLength < 14 || str(4) !== 'MThd') throw new Error('不是 MIDI 文件')
    const hlen = u32()
    u16()
    const ntr = u16()
    const div = u16()
    p += hlen - 6
    if (div & 0x8000) throw new Error('不支持 SMPTE 时间格式的 MIDI')
    if (div === 0) throw new Error(DAMAGED)
    const out: ParsedMidi = { ppq: div, tracks: [], tempos: [], timeSigs: [] }
    let total = 0

    for (let t = 0; t < ntr && p < d.byteLength; t++) {
      const id = str(4)
      const len = u32()
      const end = p + len
      if (end > d.byteLength) throw new Error(DAMAGED)
      if (id !== 'MTrk') {
        p = end
        continue
      }
      const notes: Array<RawNote> = []
      const open: Record<number, Array<{ tick: number; vel: number }>> = {}
      let tick = 0
      let status = 0
      let name = ''
      while (p < end) {
        tick += vlq()
        const b = d.getUint8(p)
        if (b & 0x80) {
          status = b
          p++
        } else if (status < 0x80) throw new Error(DAMAGED)
        const type = status & 0xf0
        const ch = status & 0x0f
        if (status === 0xff) {
          const mt = d.getUint8(p++)
          const ml = vlq()
          const mp = p
          if (mp + ml > end) throw new Error(DAMAGED)
          if (mt === 0x51 && ml === 3) out.tempos.push({ tick, uspq: (d.getUint8(mp) << 16) | (d.getUint8(mp + 1) << 8) | d.getUint8(mp + 2) })
          else if (mt === 0x58 && ml >= 2) out.timeSigs.push({ tick, num: d.getUint8(mp), den: 1 << d.getUint8(mp + 1) })
          else if (mt === 0x03) name = str(ml)
          p = mp + ml
          status = 0 // meta and sysex cancel running status
        } else if (status === 0xf0 || status === 0xf7) {
          const sysexLength = vlq() // (not `p += vlq()`: that adds to p's value from before the read)
          if (p + sysexLength > end) throw new Error(DAMAGED)
          p += sysexLength
          status = 0
        } else if (type === 0x90 || type === 0x80) {
          const key = d.getUint8(p++)
          const vel = d.getUint8(p++)
          const k = ch * 128 + key
          if (type === 0x90 && vel > 0) {
            ;(open[k] ??= []).push({ tick, vel })
          } else if (open[k]?.length) {
            const on = open[k].shift()!
            if (tick > on.tick) {
              notes.push({ tick: on.tick, dur: tick - on.tick, key, vel: on.vel, ch })
              if (++total > MAX_RAW_NOTES) throw new Error(TOO_BIG)
            }
          }
        } else if (type === 0xc0 || type === 0xd0) p += 1
        else p += 2
      }
      p = end
      out.tracks.push({ name, notes })
    }
    return out
  } catch (error) {
    if (error instanceof RangeError) throw new Error(DAMAGED)
    throw error
  }
}

// ---- helpers -----------------------------------------------------------------------------------
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const midiName = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1)
const KS_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KS_MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function corr(a: Array<number>, b: Array<number>): number {
  const ma = a.reduce((x, y) => x + y) / 12
  const mb = b.reduce((x, y) => x + y) / 12
  let n = 0
  let da = 0
  let db = 0
  for (let i = 0; i < 12; i++) {
    n += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return n / Math.sqrt(da * db || 1)
}

type KeyGuess = { score: number; tonic: number; minor: boolean }

/** Krumhansl-Schmuckler: duration-weighted pitch classes against the major / minor key profiles. */
export function findKey(notes: Array<{ key: number; beats: number }>): KeyGuess {
  const h = new Array<number>(12).fill(0)
  notes.forEach((n) => {
    h[n.key % 12] += Math.min(n.beats, 2)
  })
  let best: KeyGuess = { score: -2, tonic: 0, minor: false }
  for (let t = 0; t < 12; t++) {
    const r = Array.from({ length: 12 }, (_, i) => h[(i + t) % 12])
    const sMaj = corr(r, KS_MAJ)
    const sMin = corr(r, KS_MIN)
    if (sMaj > best.score) best = { score: sMaj, tonic: t, minor: false }
    if (sMin > best.score) best = { score: sMin, tonic: t, minor: true }
  }
  return best
}

const QUALITY: Record<string, Array<number>> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] }
const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, Bb: 10 }

function chordPcs(name: string): Array<number> | null {
  const m = /^([A-G]b?)(.*)$/.exec(name)
  if (!m || !QUALITY[m[2]]) return null
  return QUALITY[m[2]].map((x) => (ROOTS[m[1]] + x) % 12)
}

// how likely each chord is in C major / A minor (the chord shapes we have are named for these keys)
const PRIOR: Record<string, number> = {
  C: 0.12, F: 0.1, G: 0.1, Am: 0.1, Dm: 0.06, Em: 0.06, G7: 0.04, E: 0.03, E7: 0.04,
  Fmaj7: 0, A7: 0, D7: 0, C7: 0, Am7: 0, D: -0.02, Bb: -0.02, Gm: -0.04, Gm7: -0.04, B7: -0.04,
}

type Part = { name: string; notes: Array<Note>; mean: number; mono: number; score: number }

// ---- 2-4. song from parsed MIDI --------------------------------------------------------------------
export function songFromMidi(mid: ParsedMidi, title: string): Song {
  // the beat unit: a quarter note, or an eighth in x/8 time (6/8 becomes two bars of 3)
  const ts = mid.timeSigs[0] ?? { num: 4, den: 4 }
  const eighths = ts.den === 8
  const unit = eighths ? mid.ppq / 2 : mid.ppq
  const bpb = eighths ? 3 : ts.num % 3 === 0 && ts.num !== 6 ? 3 : 4

  // parts: tracks, and channels inside a format-0 track; drums (channel 10) are skipped
  const parts: Array<Part> = []
  mid.tracks.forEach((tr) => {
    const byCh = new Map<number, Array<Note>>()
    tr.notes.forEach((n) => {
      if (n.ch === 9) return
      const list = byCh.get(n.ch) ?? []
      list.push({ ...n, beat: n.tick / unit, beats: n.dur / unit })
      byCh.set(n.ch, list)
    })
    byCh.forEach((notes) => parts.push({ name: tr.name, notes, mean: 0, mono: 0, score: 0 }))
  })
  const usable = parts.filter((pt) => pt.notes.length >= 8)
  if (!usable.length) throw new Error('MIDI 里没有找到足够的音符')
  const onsetCount = (pt: Part) => new Set(pt.notes.map((n) => n.tick)).size
  usable.forEach((pt) => {
    pt.notes.sort((a, b) => a.tick - b.tick || b.key - a.key)
    pt.mean = pt.notes.reduce((s, n) => s + n.key, 0) / pt.notes.length
    // how much of the time the part has exactly one top line (a melody is busy but rarely a block chord)
    pt.mono = onsetCount(pt) / pt.notes.length
  })
  const maxOnsets = Math.max(...usable.map(onsetCount))
  const named = (pt: Part) => (/melod|vocal|voice|lead|主旋律|旋律|solo/i.test(pt.name) ? 30 : 0)
  usable.forEach((pt) => {
    pt.score = pt.mean + 12 * pt.mono + named(pt) + (onsetCount(pt) >= maxOnsets * 0.3 ? 20 : -40)
  })
  usable.sort((a, b) => b.score - a.score)
  const melPart = usable[0]

  // top-line reduction: one note per onset (the highest), held until the next one
  const q = (b: number) => {
    const a = Math.round(b * 4) / 4
    const c = Math.round(b * 3) / 3
    return Math.abs(c - b) < Math.abs(a - b) - 0.02 ? c : a
  }
  const tops: Array<{ beat: number; key: number; beats: number; dur: number }> = []
  // (a lower note that starts while a higher one is still ringing is accompaniment, not melody)
  melPart.notes.forEach((n) => {
    const b = q(n.beat)
    const last = tops[tops.length - 1]
    if (last && Math.abs(last.beat - b) < 1e-6) {
      if (n.key > last.key) {
        last.key = n.key
        last.beats = n.beats
      }
      return
    }
    if (last && n.key < last.key && b < last.beat + last.beats * 0.9 - 0.05) return
    tops.push({ beat: b, key: n.key, beats: n.beats, dur: 0 })
  })
  for (let i = 0; i < tops.length; i++) {
    const gap = i + 1 < tops.length ? tops[i + 1].beat - tops[i].beat : tops[i].beats
    tops[i].dur = Math.max(0.25, Math.min(q(tops[i].beats) || 0.25, gap))
  }
  if (tops.length < 8) throw new Error('旋律太短')
  if (tops.length > MAX_MELODY_NOTES) throw new Error(TOO_BIG)

  // key -> C major / A minor, then octave so the melody fits the ukulele (MIDI 60..84)
  const all = usable.flatMap((pt) => pt.notes)
  const key = findKey(all)
  let shift = ((key.minor ? 9 : 0) - key.tonic + 12) % 12
  if (shift > 6) shift -= 12
  let best: { s: number; sc: number } | null = null
  for (let oct = -4; oct <= 4; oct++) {
    const s = shift + 12 * oct
    const inRange = tops.filter((n) => n.key + s >= 60 && n.key + s <= 84).length
    const med = tops.map((n) => n.key + s).sort((a, b) => a - b)[tops.length >> 1]
    const sc = inRange * 10 - Math.abs(med - 72)
    if (!best || sc > best.sc) best = { s, sc }
  }
  const tr = best!.s
  tops.forEach((n) => {
    n.key += tr
    while (n.key < 60) n.key += 12
    while (n.key > 84) n.key -= 12
  })

  // start on the bar that holds the first melody note
  const first = tops[0].beat
  const off = Math.floor(first / bpb) * bpb
  const lastEnd = tops.reduce((m, n) => Math.max(m, n.beat + n.dur), 0) - off
  const bars = Math.ceil(lastEnd / bpb - 1e-6)
  if (!Number.isFinite(bars) || bars < 1 || bars > MAX_BARS) throw new Error(TOO_BIG)

  // tempo at the first melody note (quarter-note bpm, doubled when counting eighths)
  const t0 = first * unit
  let uspq = 500000
  mid.tempos
    .slice()
    .sort((x, y) => x.tick - y.tick)
    .forEach((tp) => {
      if (tp.tick <= t0) uspq = tp.uspq
    })
  const bpm = Math.max(40, Math.min(200, Math.round((60e6 / uspq) * (eighths ? 2 : 1))))
  if ((bars * bpb * 60) / bpm > MAX_SECONDS) throw new Error(TOO_BIG)

  // chords: one per half bar (per bar in 3-beat time; per beat for slow pieces), from every part,
  // with the lowest note counting extra
  const vocab = Object.keys(CHORDS).filter((name) => chordPcs(name))
  const win = bpm <= 72 && bpb === 4 ? 1 : bpb === 4 ? 2 : 3
  const nWin = Math.ceil((bars * bpb) / win)
  const chords: Array<[number, string]> = []
  let prev: string | null = null
  for (let w = 0; w < nWin; w++) {
    const b0 = off + w * win
    const b1 = b0 + win
    const h = new Array<number>(12).fill(0)
    let lowKey = 999
    let mass = 0
    all.forEach((n) => {
      const s = Math.max(b0, n.beat)
      const e = Math.min(b1, n.beat + n.beats)
      if (e <= s) return
      const wgt = (e - s) * (n.beat >= b0 - 0.01 ? 1.2 : 0.8) // attacks inside the window count more
      h[(n.key + tr + 120) % 12] += wgt
      mass += wgt
      if (n.beat < b0 + win * 0.5 && n.key < lowKey) lowKey = n.key
    })
    let pick: string | null = prev
    if (mass > 0.3) {
      let bs = -1e9
      vocab.forEach((name) => {
        const pcs = chordPcs(name)!
        const rootPc = pcs[0]
        let inC = 0
        pcs.forEach((pc, i) => {
          inC += h[pc] * (i === 0 ? 1.0 : i === 2 && pcs.length === 3 ? 0.7 : 0.85)
        })
        const outC = mass - pcs.reduce((s, pc) => s + h[pc], 0)
        let sc = (inC - 0.9 * outC) / mass + (PRIOR[name] ?? 0) - (pcs.length > 3 ? 0.06 : 0)
        if (lowKey < 999 && (lowKey + tr + 120) % 12 === rootPc) sc += 0.18
        if (name === prev) sc += 0.08 // don't flicker between near ties
        if (sc > bs) {
          bs = sc
          pick = name
        }
      })
    }
    if (!pick) pick = key.minor ? 'Am' : 'C'
    if (pick !== prev) chords.push([w * win, pick])
    prev = pick
  }
  if (!chords.length || chords[0][0] > 0) chords.unshift([0, chords.length ? chords[0][1] : key.minor ? 'Am' : 'C'])

  // sections every 8 bars so the camera keeps moving; light accompaniment at the start, fuller after
  const sections: Song['sections'] = []
  for (let b = 1, k = 0; b <= bars; b += 8, k++) sections.push({ name: String.fromCharCode(65 + (k % 26)), bar: b })
  const total = bars * bpb
  const lead = Math.min(total, 4 * bpb)

  return {
    id: `midi-${title}`,
    title,
    credit: '导入的 MIDI',
    keyLabel: key.minor ? 'A 小调' : 'C 大调',
    bpm,
    beatsPerBar: bpb,
    bars: bars + 1,
    sections,
    chords,
    melody: tops.map((n): [number, string, number] => [+(n.beat - off).toFixed(4), midiName(n.key), +n.dur.toFixed(4)]),
    comp: [
      { from: 0, to: lead, style: 'bass' },
      { from: lead, to: total, style: 'arp' },
    ],
    finale: { bar: bars + 1, chord: chords[chords.length - 1][1] },
    imported: true,
  }
}
