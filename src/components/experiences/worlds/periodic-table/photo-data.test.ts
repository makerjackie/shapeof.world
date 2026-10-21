import {describe,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {elements} from './element-model'
import {elementPhotos} from './photo-data'

describe('photographic element collection',()=>{
 it('covers all elements with local files and actionable source and license links',()=>{
  expect(Object.keys(elementPhotos).sort()).toEqual(elements.map(e=>e.symbol).sort())
  for(const photo of Object.values(elementPhotos)){
   expect(existsSync(resolve('public',photo.src.slice(1)))).toBe(true)
   expect(new URL(photo.sourceUrl).protocol).toBe('https:')
   expect(new URL(photo.licenseUrl).protocol).toBe('https:')
   expect(photo.caption.length).toBeGreaterThan(3);expect(photo.captionEn).not.toMatch(/[\u4e00-\u9fff]/)
   expect(photo.license).toMatch(photo.kind==='diagram'?/^CC BY-NC 4\.0$/:/^(CC BY [234]\.0|Public Domain)$/)
  }
 })
 it('does not present discharge, compounds or historical research as pure specimens',()=>{
  for(const symbol of ['H','He','N','O','Ne','Ar','Kr','Xe'])expect(elementPhotos[symbol].kind).toBe('discharge')
  expect(elementPhotos.F.kind).toBe('mineral');expect(elementPhotos.Ra.kind).toBe('compound')
  expect(elementPhotos.Bk.kind).toBe('sample');expect(elementPhotos.Fm.kind).toBe('apparatus')
  for(const e of elements.filter(e=>e.atomicNumber>=104&&e.symbol!=='Ts'))expect(elementPhotos[e.symbol].kind).toBe('diagram')
  expect(elementPhotos.Ts.captionEn).toContain('not a tennessine specimen')
  expect(elementPhotos.Po.kind).toBe('observation');expect(elementPhotos.Fr.kind).toBe('mineral')
  expect(elementPhotos.At.captionEn).toContain('exposure')
  expect(elementPhotos.At.isotopeMass).toBe(211);expect(elementPhotos.Pa.isotopeMass).toBe(233)
  for(const photo of Object.values(elementPhotos))expect(photo.src).not.toContain('cyclotron-60in')
 })
 it('keeps every delivered photograph matched to its attribution manifest',()=>{
  const base='public/assets/worlds/periodic-table/collection'
  const rows=JSON.parse(readFileSync(`${base}/sources.json`,'utf8')) as {file:string;sha256:string}[]
  for(const row of rows)expect(createHash('sha256').update(readFileSync(`${base}/${row.file}`)).digest('hex')).toBe(row.sha256)
  const files=new Set(rows.map(r=>`/assets/worlds/periodic-table/collection/${r.file}`))
  for(const p of Object.values(elementPhotos).filter(p=>p.kind!=='diagram'))expect(files.has(p.src)).toBe(true)
 })
})
