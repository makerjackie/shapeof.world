import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { elementPhotos } from './photo-data'
import { displayImageFor } from './display-images'

interface GenerationRecord {
  symbol: string; asset: string; referenceAsset: string; sourceUrl: string
  credit: string; license: string; licenseUrl: string; sha256: string
  sourceKind?: string; visualTreatment?: string; referenceSha256: string; prompt: string; verification: string | Record<string, unknown>
}
const directory = 'public/assets/worlds/periodic-table/display'
const digest = (asset: string) => createHash('sha256').update(readFileSync(`public${asset}`)).digest('hex')

describe('photo-referenced display illustrations', () => {
  it('keeps every displayed AI image tied to its actual input photo and attribution', () => {
    const records: GenerationRecord[] = readdirSync(directory)
      .filter(file => /^generation-.*\.json$/.test(file))
      .flatMap(file => JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')) as GenerationRecord[])
    expect(new Set(records.map(row => row.symbol)).size).toBe(records.length)
    for (const row of records) {
      const photo = elementPhotos[row.symbol]
      expect(photo, row.symbol).toBeDefined()
      if (!['specimen','discharge'].includes(photo.kind)) {
        expect(row.sourceKind).toBe(photo.kind)
        expect(row.visualTreatment?.length).toBeGreaterThan(40)
      } else expect(['specimen', 'discharge']).toContain(photo.kind)
      expect(photo.kind).not.toBe('diagram')
      expect(row.referenceAsset).toBe(photo.src)
      expect(displayImageFor(row.symbol)).toBe(row.asset)
      expect(row.asset).not.toBe(photo.src)
      expect(digest(row.referenceAsset)).toBe(row.referenceSha256)
      expect(digest(row.asset)).toBe(row.sha256)
      expect(row.sourceUrl).toBe(photo.sourceUrl)
      expect(row.credit).toBe(photo.credit)
      expect(row.license).toBe(photo.license)
      expect(row.licenseUrl).toBe(photo.licenseUrl)
      expect(row.prompt.length).toBeGreaterThan(100)
      expect(JSON.stringify(row.verification).length).toBeGreaterThan(20)
    }
    for (const symbol of Object.keys(elementPhotos)) {
      const asset = displayImageFor(symbol)
      if (asset) expect(records.find(row => row.symbol === symbol)?.asset, symbol).toBe(asset)
    }
  })
})
