import { describe, expect, it } from 'vitest'

import { CHORDS, MAX_FRET, OPEN, PATTERNS, arrange, noteToMidi, type Song } from './ukulele-arranger'
import { MAX_MIDI_BYTES, findKey, parseMidi, songFromMidi } from './ukulele-midi'
import { SONGS } from './ukulele-songs'

describe('built-in songs', () => {
  it('has the four public-domain songs with unique ids', () => {
    expect(SONGS.map((s) => s.id)).toEqual(['canon', 'greensleeves', 'fur-elise', 'songbie'])
  })

  it.each(SONGS.map((s) => [s.id, s] as const))('%s is well-formed', (_id, song) => {
    expect(song.melody.length).toBeGreaterThan(50)
    expect(song.chords[0][0]).toBe(0)
    expect(song.sections[0].bar).toBe(1)
    // every melody note lies in the range a 15-fret GCEA ukulele can play with the arranger's strings
    for (const [beat, name, dur] of song.melody) {
      const midi = noteToMidi(name)
      expect(midi, name).toBeGreaterThanOrEqual(60)
      expect(midi, name).toBeLessThanOrEqual(84)
      expect(beat).toBeGreaterThanOrEqual(0)
      expect(dur).toBeGreaterThan(0)
      expect(beat).toBeLessThan(song.bars * song.beatsPerBar)
    }
    song.chords.forEach(([, chord]) => expect(CHORDS[chord], chord).toBeDefined())
    expect(CHORDS[song.finale!.chord]).toBeDefined()
    song.comp.forEach((c) => {
      const name = song.beatsPerBar === 3 && PATTERNS[`${c.style}3`] ? `${c.style}3` : c.style
      expect(PATTERNS[name], c.style).toBeDefined()
    })
    // sections start in order and inside the song
    song.sections.forEach((s, i) => {
      expect(s.bar).toBeLessThanOrEqual(song.bars)
      if (i) expect(s.bar).toBeGreaterThan(song.sections[i - 1].bar)
    })
  })

  it.each(SONGS.map((s) => [s.id, s] as const))('%s arranges onto real strings and frets', (_id, song) => {
    const arr = arrange(song, 7)
    expect(arr.events.length).toBeGreaterThan(song.melody.length)
    expect(arr.duration).toBeGreaterThan(60)
    let last = -Infinity
    for (const e of arr.events) {
      expect(e.t).toBeGreaterThanOrEqual(last)
      last = e.t
      expect(e.s).toBeGreaterThanOrEqual(0)
      expect(e.s).toBeLessThanOrEqual(3)
      expect(e.f).toBeGreaterThanOrEqual(0)
      expect(e.f).toBeLessThanOrEqual(MAX_FRET)
      expect(e.midi).toBe(OPEN[e.s] + e.f)
      expect(e.vel).toBeGreaterThan(0)
      expect(e.vel).toBeLessThanOrEqual(1)
    }
    expect(arr.events.filter((e) => e.kind === 'melody').length).toBe(song.melody.length)
    expect(arr.perString.flat().length).toBe(arr.events.length)
    arr.perString.forEach((list) => list.forEach((e, i) => i && expect(e.t).toBeGreaterThanOrEqual(list[i - 1].t)))
  })

  it('is deterministic for a given seed', () => {
    const a = arrange(SONGS[3], 7)
    const b = arrange(SONGS[3], 7)
    expect(b.events).toEqual(a.events)
  })

  it('reports the chord and section at a given moment', () => {
    const arr = arrange(SONGS[3], 7)
    expect(arr.chordAt(0)).toBe(SONGS[3].chords[0][1])
    expect(arr.sectionIndexAt(1)).toBe(0)
    expect(arr.sectionIndexAt(SONGS[3].bars)).toBe(SONGS[3].sections.length - 1)
  })
})

// ---- MIDI import ----------------------------------------------------------------------------------
const vlq = (n: number) => {
  const out = [n & 0x7f]
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80)
  return out
}
type Ev = { t: number; order: number; bytes: Array<number> }
function track(evs: Array<Ev>): Array<number> {
  evs.sort((a, b) => a.t - b.t || a.order - b.order)
  const out: Array<number> = []
  let last = 0
  evs.forEach((e) => {
    out.push(...vlq(e.t - last), ...e.bytes)
    last = e.t
  })
  out.push(0, 0xff, 0x2f, 0)
  const n = out.length
  return [0x4d, 0x54, 0x72, 0x6b, (n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255, ...out]
}
function smf(tracks: Array<Array<number>>, ppq = 480): Uint8Array {
  return Uint8Array.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, ppq >> 8, ppq & 255, ...tracks.flat()])
}
/** A two-track file (melody + block-chord accompaniment) written from one of our own songs. */
function songToMidi(song: Song, transpose: number, opts: { sysex?: boolean } = {}): Uint8Array {
  const u = 480
  const tempo = Math.round(60e6 / song.bpm)
  const melody: Array<Ev> = [
    { t: 0, order: 0, bytes: [0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] },
    { t: 0, order: 0, bytes: [0xff, 0x58, 4, song.beatsPerBar, 2, 24, 8] },
    { t: 0, order: 0, bytes: [0xff, 0x03, 6, ...Array.from('Melody', (c) => c.charCodeAt(0))] },
  ]
  if (opts.sysex) melody.push({ t: 0, order: 0, bytes: [0xf0, 5, 0x7e, 0x7f, 0x09, 0x01, 0xf7] }) // GM reset, like real files
  song.melody.forEach(([b, n, d]) => {
    const k = noteToMidi(n) + transpose
    melody.push({ t: Math.round(b * u), order: 1, bytes: [0x90, k, 90] })
    melody.push({ t: Math.round((b + d) * u) - 1, order: 0, bytes: [0x80, k, 0] })
  })
  const acc: Array<Ev> = []
  const end = song.bars * song.beatsPerBar
  const step = song.beatsPerBar === 3 ? 3 : 2
  song.chords.forEach(([b, name], i) => {
    const e = i + 1 < song.chords.length ? song.chords[i + 1][0] : end
    const r = 48 + CHORDS[name].root + transpose
    const minor = /m(?!aj)/.test(name)
    const pcs = [r - 12, r + (minor ? 3 : 4), r + 7]
    for (let x = b; x < e; x += step) {
      const xe = Math.min(e, x + step)
      if (xe <= x) continue
      pcs.forEach((k) => {
        acc.push({ t: Math.round(x * u), order: 1, bytes: [0x91, k, 70] })
        acc.push({ t: Math.round(xe * u) - 1, order: 0, bytes: [0x81, k, 0] })
      })
    }
  })
  return smf([track(melody), track(acc)])
}

describe('MIDI import', () => {
  const songbie = SONGS.find((s) => s.id === 'songbie')!

  it('recovers the melody pitches and rhythm of a two-track file after moving it to a ukulele key', () => {
    const song = songFromMidi(parseMidi(songToMidi(songbie, 5)), 'test')
    expect(song.melody.length).toBe(songbie.melody.length)
    const orig = songbie.melody.map((m) => noteToMidi(m[1]))
    const got = song.melody.map((m) => noteToMidi(m[1]))
    // same intervals between consecutive notes and same note start times (relative to the first)
    got.slice(1).forEach((m, i) => expect(m - got[i]).toBe(orig[i + 1] - orig[i]))
    song.melody.forEach((m, i) => expect(m[0] - song.melody[0][0]).toBeCloseTo(songbie.melody[i][0] - songbie.melody[0][0], 3))
    // the tempo and a playable range
    expect(song.bpm).toBe(songbie.bpm)
    got.forEach((m) => {
      expect(m).toBeGreaterThanOrEqual(60)
      expect(m).toBeLessThanOrEqual(84)
    })
    expect(song.imported).toBe(true)
    // and it arranges
    expect(arrange(song, 7).events.length).toBeGreaterThan(song.melody.length)
  })

  it('reads a file whose first events are SysEx (a past parsing bug misaligned every later note)', () => {
    const plain = parseMidi(songToMidi(songbie, 0))
    const withSysex = parseMidi(songToMidi(songbie, 0, { sysex: true }))
    expect(withSysex.tracks[0].notes.length).toBe(plain.tracks[0].notes.length)
    expect(withSysex.tracks[0].notes[0]).toEqual(plain.tracks[0].notes[0])
    expect(withSysex.tracks[0].notes.at(-1)).toEqual(plain.tracks[0].notes.at(-1))
  })

  it('finds the key of a melody', () => {
    const notes = songbie.melody.map(([beat, name, dur]) => ({ key: noteToMidi(name), beats: dur, beat }))
    expect(findKey(notes)).toMatchObject({ tonic: 7, minor: false }) // G major
  })

  it('rejects files it cannot use, with a message the interface can translate', () => {
    expect(() => parseMidi(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]))).toThrow('不是 MIDI 文件')
    expect(() => parseMidi(songToMidi(songbie, 0).slice(0, 60))).toThrow('MIDI 数据损坏')
    const tiny: Array<Ev> = [{ t: 0, order: 1, bytes: [0x90, 60, 90] }, { t: 480, order: 0, bytes: [0x80, 60, 0] }]
    expect(() => songFromMidi(parseMidi(smf([track(tiny)])), 'x')).toThrow('MIDI 里没有找到足够的音符')
    expect(MAX_MIDI_BYTES).toBeGreaterThan(songToMidi(songbie, 0).length)
  })
})
