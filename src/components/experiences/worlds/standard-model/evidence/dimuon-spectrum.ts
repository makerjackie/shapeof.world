import spectrum from './dimuon-spectrum.json'

export type BilingualText = { zh: string; en: string }
export type DimuonSpectrum = {
  schemaVersion: number
  title: BilingualText
  description: BilingualText
  boundary: BilingualText
  sourceUrl: string
  sourceTitle: string
  license: string
  doi: string
  eventCount: number
  min: number
  max: number
  binWidth: number
  bins: number[]
  provenance: {
    acquiredAt: string
    sha256: string
    selection: string
    units: string
    sourceFile: string
    countedRows: number
  }
}

export const dimuonSpectrum: DimuonSpectrum = spectrum
