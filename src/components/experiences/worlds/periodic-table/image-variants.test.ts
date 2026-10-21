import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { displayImageFor } from './display-images'
import { specimenCutouts } from './cutout-images'
import { diagramThumbnails } from './diagram-thumbnails'
import { synthesisAssets } from './synthesis-data'
import { specimenImageVariants } from './image-variants'
import { elementPhotos } from './photo-data'

interface VariantRecord {
  asset: string; sha256: string; bytes: number; width: number; height: number
  source: string; sourceSha256: string; sourceWidth: number; sourceHeight: number
  referenceAsset: string; referenceSha256: string
  purpose: 'thumbnail' | 'preview'; credit: string; license: string; licenseUrl: string; sourceUrl: string
}
const { records } = JSON.parse(readFileSync('public/assets/worlds/periodic-table/responsive/sources.json', 'utf8')) as { records: VariantRecord[] }
const read = (asset: string) => readFileSync(`public${asset}`)
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

function webpDimensions(bytes: Buffer): [number, number] {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    const data = offset + 8
    if (type === 'VP8X') return [bytes.readUIntLE(data + 4, 3) + 1, bytes.readUIntLE(data + 7, 3) + 1]
    if (type === 'VP8 ') return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff]
    if (type === 'VP8L') {
      const bits = bytes.readUInt32LE(data + 1)
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]
    }
    offset = data + size + (size % 2)
  }
  throw new Error('Missing WebP dimensions')
}

describe('periodic table image delivery', () => {
  it('covers every photographic cell with separate thumbnail and preview assets', () => {
    const photos = Object.entries(elementPhotos).filter(([, photo]) => photo.kind !== 'diagram')
    expect(Object.keys(specimenImageVariants).sort()).toEqual(photos.map(([symbol]) => symbol).sort())
    const usedAssets = new Set<string>()
    for (const [symbol, photo] of photos) {
      const fullImage = specimenCutouts[symbol] ?? displayImageFor(symbol) ?? photo.src
      for (const purpose of ['thumbnail', 'preview'] as const) {
        const variant = specimenImageVariants[symbol][purpose]
        const record = records.find(row => row.asset === variant.src)
        expect(record, `${symbol} ${purpose}`).toBeDefined()
        expect(variant.src).not.toBe(fullImage)
        expect(record).toMatchObject({
          purpose, source: fullImage, width: variant.width, height: variant.height,
          referenceAsset: photo.src, credit: photo.credit, license: photo.license,
          licenseUrl: photo.licenseUrl, sourceUrl: photo.sourceUrl,
        })
        usedAssets.add(variant.src)
      }
      expect(specimenImageVariants[symbol].thumbnail.src).not.toBe(specimenImageVariants[symbol].preview.src)
    }
    expect([...usedAssets].sort()).toEqual(records.map(row => row.asset).sort())
    expect(specimenImageVariants.Ts).toEqual(specimenImageVariants.Bk)
  })

  it('keeps file content, dimensions and attribution tied to unchanged sources without cropping or upscaling', () => {
    for (const record of records) {
      const output = read(record.asset)
      const edge = record.purpose === 'thumbnail' ? 160 : 640
      expect(hash(output), record.asset).toBe(record.sha256)
      expect(record.asset).toContain(record.sha256.slice(0, 12))
      expect(output.length).toBe(record.bytes)
      expect(webpDimensions(output)).toEqual([record.width, record.height])
      const input = read(record.source)
      expect(hash(input)).toBe(record.sourceSha256)
      expect(webpDimensions(input)).toEqual([record.sourceWidth, record.sourceHeight])
      expect(hash(read(record.referenceAsset))).toBe(record.referenceSha256)
      const scale = Math.min(1, edge / Math.max(record.sourceWidth, record.sourceHeight))
      expect(Math.abs(record.width - record.sourceWidth * scale)).toBeLessThanOrEqual(1)
      expect(Math.abs(record.height - record.sourceHeight * scale)).toBeLessThanOrEqual(1)
      expect(record.bytes).toBeLessThanOrEqual((record.purpose === 'thumbnail' ? 20 : 100) * 1024)
    }
  })

  it('keeps photographic thumbnails below 400 KiB and the complete grid below 512 KiB', () => {
    const thumbnails = records.filter(row => row.purpose === 'thumbnail')
    const photographicBytes = thumbnails.reduce((bytes, row) => bytes + row.bytes, 0)
    const diagramBytes = Object.values(diagramThumbnails).reduce((bytes, row) => bytes + read(row.src).length, 0)
    expect(photographicBytes).toBeLessThanOrEqual(400 * 1024)
    expect(diagramBytes).toBeLessThanOrEqual(128 * 1024)
    expect(photographicBytes + diagramBytes).toBeLessThanOrEqual(512 * 1024)
  })

  it('uses tiny diagram thumbnails while preserving their original vector source and scientific record', () => {
    const { records: diagrams } = JSON.parse(readFileSync('public/assets/worlds/periodic-table/synthesis/thumb/sources.json', 'utf8')) as {
      records: { symbol: string; asset: string; source: string; sha256: string; sourceSha256: string; bytes: number; width: number; height: number }[]
    }
    expect(Object.keys(diagramThumbnails).sort()).toEqual(Object.keys(synthesisAssets).sort())
    expect(diagrams).toHaveLength(Object.keys(synthesisAssets).length)
    for (const record of diagrams) {
      expect(record.source).toBe(synthesisAssets[record.symbol])
      expect(hash(read(record.source))).toBe(record.sourceSha256)
      expect(elementPhotos[record.symbol].src).toBe(record.source)
      expect(diagramThumbnails[record.symbol]).toEqual({ src: record.asset, width: 160, height: 120 })
      expect(webpDimensions(read(record.asset))).toEqual([160, 120])
      expect(hash(read(record.asset))).toBe(record.sha256)
      expect(read(record.asset).length).toBe(record.bytes)
      expect(record.bytes).toBeLessThanOrEqual(20 * 1024)
    }
  })

  it('retains actual alpha in every AI display size, without replacing reference photographs', () => {
    const { records: cutouts } = JSON.parse(readFileSync('public/assets/worlds/periodic-table/cutouts/sources.json', 'utf8')) as {
      records: { symbol: string; asset: string; sha256: string; source: string; sourceSha256: string; alpha: { pixels: number; transparent: number; opaque: number } }[]
    }
    const aiSymbols = Object.keys(elementPhotos).filter(symbol => displayImageFor(symbol))
    expect(Object.keys(specimenCutouts).sort()).toEqual(aiSymbols.sort())
    expect(cutouts).toHaveLength(aiSymbols.length)
    for (const record of cutouts) {
      expect(record.asset).toBe(specimenCutouts[record.symbol])
      expect(record.source).toBe(displayImageFor(record.symbol))
      expect(hash(read(record.source))).toBe(record.sourceSha256)
      expect(hash(read(record.asset))).toBe(record.sha256)
      expect(record.alpha.transparent).toBeGreaterThan(record.alpha.pixels * .1)
      expect(record.alpha.opaque).toBeGreaterThan(record.alpha.pixels * .02)
      for (const path of [record.asset, specimenImageVariants[record.symbol].thumbnail.src, specimenImageVariants[record.symbol].preview.src]) {
        const bytes = read(path)
        expect(bytes.toString('ascii', 12, 16), path).toBe('VP8X')
        expect(bytes[20] & 0x10, path).toBe(0x10)
      }
      expect(record.asset).not.toBe(elementPhotos[record.symbol].src)
    }
  })
})
