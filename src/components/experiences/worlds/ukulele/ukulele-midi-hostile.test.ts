import { describe, expect, it } from 'vitest'

import { parseMidi, songFromMidi } from './ukulele-midi'

// The importer reads files a visitor picks, so it has to stay bounded and fail cleanly on anything odd.
const header = (ntracks: number, ppq: number) => [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, ntracks, ppq >> 8, ppq & 255]
const trk = (bytes: Array<number>) => {
  const n = bytes.length
  return [0x4d, 0x54, 0x72, 0x6b, (n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255, ...bytes]
}
const file = (events: Array<number>, ppq = 480) => Uint8Array.from([...header(1, ppq), ...trk(events)])
const vlq = (n: number) => {
  const o = [n & 0x7f]
  while ((n = Math.floor(n / 128))) o.unshift((n & 0x7f) | 0x80)
  return o
}
const note = (delta: number, key: number, dur: number) => [...vlq(delta), 0x90, key, 90, ...vlq(dur), 0x80, key, 0]

describe('MIDI import is bounded and fails cleanly', () => {
  it('rejects a variable-length number longer than 4 bytes instead of looping forever', () => {
    // meta event 0x00 whose length is a 5-byte VLQ that overflows to a negative int32
    const evil = file([0x00, 0xff, 0x00, 0x8f, 0xff, 0xff, 0xff, 0x78, 0x00, 0xff, 0x2f, 0x00])
    expect(() => parseMidi(evil)).toThrow('MIDI 数据损坏')
  })

  it('rejects event lengths that run past the end of the track', () => {
    expect(() => parseMidi(file([0x00, 0xff, 0x01, 0x7f, 0x41]))).toThrow('MIDI 数据损坏') // text event claims 127 bytes
    expect(() => parseMidi(file([0x00, 0xf0, 0x7f, 0x01]))).toThrow('MIDI 数据损坏') // sysex claims 127 bytes
  })

  it('rejects a zero time division (it would turn every time into NaN)', () => {
    expect(() => parseMidi(file(note(0, 60, 10), 0))).toThrow('MIDI 数据损坏')
  })

  it('refuses a "song" whose one note sits hours into the file', () => {
    const notes: Array<number> = []
    for (let i = 0; i < 12; i++) notes.push(...note(i === 0 ? 0 : 400, 60 + (i % 5), 40))
    notes.push(...note(268_000_000, 64, 40)) // one note at tick 2.68e8: 139,000 bars
    const mid = parseMidi(file([...notes, 0x00, 0xff, 0x2f, 0x00]))
    expect(() => songFromMidi(mid, 'x')).toThrow('MIDI 内容太多或太长')
  })

  it('refuses a file with an unreasonable number of notes, quickly', () => {
    const notes: Array<number> = []
    for (let i = 0; i < 70_000; i++) notes.push(...note(i === 0 ? 0 : 60, 60 + (i % 24), 50))
    const start = performance.now()
    expect(() => songFromMidi(parseMidi(file(notes)), 'x')).toThrow('MIDI 内容太多或太长')
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('still accepts an ordinary long piece', () => {
    const notes: Array<number> = []
    for (let i = 0; i < 1200; i++) notes.push(...note(i === 0 ? 0 : 20, 60 + [0, 2, 4, 5, 7, 9, 11, 12][i % 8], 440))
    const song = songFromMidi(parseMidi(file(notes)), 'long')
    expect(song.melody.length).toBe(1200)
  })
})
