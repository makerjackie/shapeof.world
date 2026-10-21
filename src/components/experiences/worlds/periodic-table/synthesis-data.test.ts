import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { synthesisReactions, synthesisAssets } from './synthesis-data'
import { synthesisSvg } from './synthesis-graphic'
import { elementPhotos } from './photo-data'
import { elements } from './element-model'

describe('sourced synthesis illustrations', () => {
 it('conserves charge and nucleon count for every published channel', () => {
  for (const r of Object.values(synthesisReactions)) {
   expect(r.beam.protons+r.target.protons,r.symbol).toBe(r.product.protons)
   expect(r.beam.mass+r.target.mass,r.symbol).toBe(r.product.mass+r.neutrons)
   expect(r.neutrons).toBeGreaterThan(0)
   for(const n of [r.beam,r.target,r.product])expect(elements.find(e=>e.symbol===n.symbol)?.atomicNumber).toBe(n.protons)
   expect(new URL(r.sourceUrl).protocol).toBe('https:')
  }
  expect(synthesisReactions.Og.product.mass).toBe(294)
  expect(synthesisReactions.Lv.beam.symbol).toBe('Ti')
  expect(synthesisReactions.No.product.mass).toBe(254)
 })
 it('keeps schematic assets, evidence and live drawings consistent', () => {
  const manifest=JSON.parse(readFileSync('public/assets/worlds/periodic-table/synthesis/sources.json','utf8')) as {symbol:string;sha256:string;sourceUrl:string}[]
  expect(Object.keys(synthesisReactions).sort()).toEqual(manifest.map(r=>r.symbol).sort())
  for(const r of Object.values(synthesisReactions)) {
   const photo=elementPhotos[r.symbol]
   expect(photo.kind).toBe('diagram')
   expect(photo.src).toBe(synthesisAssets[r.symbol])
   expect(photo.sourceUrl).toBe(r.sourceUrl)
   const bytes=readFileSync(`public${photo.src}`)
   expect(bytes.toString()).toBe(synthesisSvg(r))
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.find(m=>m.symbol===r.symbol)?.sha256)
  }
 })
})
