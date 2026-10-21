import { describe, expect, it } from 'vitest'
import { filterTracks, filtersActive } from './filters'
import { tracks, type Track } from '../data/catalog'

const cue: Track = { ...tracks[0], id: 'test-cue', styles: ['lofi'], scenarios: ['focus'], duration: 120, energy: 2, instruments: ['French horn'], description: { en: 'Warm piano for quiet study', zh: '适合安静学习的温暖钢琴' } }
describe('library retrieval', () => {
  it('excludes unknown rights and unverified loops from constrained selection', () => {
    const unknown = { ...cue, kind: 'music' as const, rights: undefined, loop: {seamless:false} }
    const cleared = {...unknown, id:'cleared', kind:'sfx' as const, rights:{id:'cc0',status:'original-source-reviewed',label:{en:'CC0',zh:'CC0'},licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',commercialUse:true,attributionRequired:false},loop:{seamless:true}}
    expect(filterTracks([unknown,cleared],{commercialOnly:true,loopOnly:true,kind:'sfx'})).toEqual([cleared])
    expect(filterTracks([unknown],{commercialOnly:true})).toEqual([])
    expect(filterTracks([cleared],{kind:'music'})).toEqual([])
    expect(filtersActive({loopOnly:true})).toBe(true)
  })
  it('combines style, scenario, duration and energy instead of returning partial matches', () => {
    const other = { ...cue, id: 'other', duration: 60, scenarios: ['travel'] }
    expect(filterTracks([cue, other], { style: 'lofi', scenario: 'focus', durationMin: 90, durationMax: 150, energy: 2 })).toEqual([cue])
    expect(filterTracks([cue], { style: 'house' })).toEqual([])
  })
  it('matches separate query words across metadata and bilingual descriptions', () => {
    expect(filterTracks([cue], { q: 'focus piano' })).toEqual([cue])
    expect(filterTracks([cue], { q: '安静学习' })).toEqual([cue])
    expect(filterTracks([cue], { q: '专注工作' })).toEqual([cue])
    expect(filterTracks([cue], { q: '圆号' })).toEqual([cue])
    expect(filterTracks([cue], { q: 'focus nonexistent' })).toEqual([])
  })
  it('keeps duration boundaries precise and recognizes zero as an active bound', () => {
    expect(filterTracks([cue], { durationMin: 120, durationMax: 120 })).toEqual([cue])
    expect(filterTracks([cue], { durationMax: 119.999 })).toEqual([])
    expect(filtersActive({ durationMin: 0 })).toBe(true)
  })
})
