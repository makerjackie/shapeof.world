import { describe, expect, it } from 'vitest'
import { dimuonSpectrum } from './dimuon-spectrum'

describe('CMS record 700 dimuon spectrum extract', () => {
  it('keeps the fixed histogram internally consistent', () => {
    expect(dimuonSpectrum.eventCount).toBe(100000)
    expect(dimuonSpectrum.provenance.countedRows).toBe(dimuonSpectrum.eventCount)
    expect(dimuonSpectrum.bins).toHaveLength((dimuonSpectrum.max - dimuonSpectrum.min) / dimuonSpectrum.binWidth)
    expect(dimuonSpectrum.bins.every(Number.isInteger)).toBe(true)
    expect(dimuonSpectrum.bins.every(value => value >= 0)).toBe(true)
    expect(dimuonSpectrum.bins.reduce((sum, value) => sum + value, 0)).toBe(dimuonSpectrum.eventCount)
  })

  it('retains provenance and selection limits', () => {
    expect(dimuonSpectrum.sourceUrl).toContain('/record/700/files/MuRun2010B.csv')
    expect(dimuonSpectrum.doi).toBe('10.7483/OPENDATA.CMS.CB8H.MFFA')
    expect(dimuonSpectrum.license).toBe('CC0 1.0 Universal')
    expect(dimuonSpectrum.provenance.selection).toContain('2–110 GeV')
    expect(dimuonSpectrum.boundary.en).toContain('not an unbiased sample')
  })
})
