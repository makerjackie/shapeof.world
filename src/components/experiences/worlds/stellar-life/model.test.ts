import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'fflate'
import {describe,it,expect} from 'vitest'
import metadata from './data-meta.json'
import {C,atAge,atProgress,ageAtProgress,blackbodyRGB,decodeTracks,displayRadius,escapeSpeed,hrPosition,massBudget,massShells,nearestHR,parseCIE,peakWavelength,progressAtAge,stefanRadius} from './model'
const compressed=new Uint8Array(readFileSync('public/assets/stellar-life/tracks.json.gz'))
const data=decodeTracks(compressed),cmf=parseCIE(readFileSync('public/assets/stellar-life/CIE_xyz_1931_2deg.csv','utf8'))
describe('stellar-life real MESA tracks and physical transformations',()=>{
 it('pins the adapted table, rights, dimensions and exact physical-age ordering',()=>{
  expect(createHash('sha256').update(gunzipSync(compressed)).digest('hex')).toBe(metadata.sha256)
  expect(data.license).toBe('CC-BY-4.0');expect(data.tracks.map(t=>t.initialMass)).toEqual([1,3,15,25])
  expect(data.tracks.reduce((a,t)=>a+t.sourceRows,0)).toBe(147054)
  for(const t of data.tracks){expect(t.rows.length).toBe(t.retainedRows);for(let i=1;i<t.rows.length;i++){expect(t.rows[i][C.age]).toBeGreaterThan(t.rows[i-1][C.age]);expect(t.rows[i][C.model]).toBeGreaterThan(t.rows[i-1][C.model])}}
  const massive=data.tracks[2];expect(Math.min(...massive.rows.slice(1).map((r,i)=>r[C.age]-massive.rows[i][C.age]))).toBeLessThan(1/365.25)
 })
 it('accepts both gzip bodies and hosting-layer decoded payloads, rejecting corrupt tables',()=>{
  expect(decodeTracks(gunzipSync(compressed)).tracks[0].retainedRows).toBe(data.tracks[0].retainedRows)
  expect(()=>decodeTracks(new TextEncoder().encode('{"schema":0}'))).toThrow()
 })
 it('uses the actual documented endpoints, never appending a fabricated explosion',()=>{
  for(const t of data.tracks.slice(0,2)){const r=t.rows.at(-1)!;expect(r[C.mass]).toBeLessThan(1);expect(10**r[C.teff]).toBeGreaterThan(25000);expect(10**r[C.lum]).toBeLessThan(.15);expect(t.phases.some(p=>p.id==='white')).toBe(true)}
  for(const t of data.tracks.slice(2)){expect(t.rows.at(-1)![C.feCore]).toBeGreaterThan(1);expect(t.phases.some(p=>p.id==='white')).toBe(false)}
 })
 it('round-trips age under both browsing clocks and preserves endpoint bounds',()=>{
  for(const t of data.tracks)for(const mode of ['stages','years']as const)for(const p of [0,.02,.234,.6,.83,.997,1]){const age=ageAtProgress(t,p,mode);expect(progressAtAge(t,age,mode)).toBeCloseTo(p,7);expect(atProgress(t,p,mode).age).toBeCloseTo(age,3)}
  const t=data.tracks[0];expect(atAge(t,-1).age).toBe(t.rows[0][C.age]);expect(atAge(t,1e30).age).toBe(t.rows.at(-1)![C.age])
 })
 it('interpolates logs with real age and maintains the Stefan–Boltzmann relation',()=>{
  for(const t of data.tracks)for(const p of [.18,.42,.69,.88,.999]){const s=atProgress(t,p,'stages'),ratio=stefanRadius(s.row)/10**s.row[C.radius];expect(ratio).toBeGreaterThan(.995);expect(ratio).toBeLessThan(1.005);const a=t.rows[s.index];expect(Number.isFinite(a[C.lum])).toBe(true)}
 })
 it('conserves the displayed retained/lost mass and nested shell sums at every stage',()=>{
  for(const t of data.tracks)for(let p=0;p<=1;p+=.01){const r=atProgress(t,p,'stages').row,b=massBudget(t,r),shells=massShells(r);expect(b.retained+b.lost).toBeCloseTo(b.initial,9);expect(b.lost).toBeGreaterThanOrEqual(0);expect(shells.reduce((a,s)=>a+s.mass,0)).toBeCloseTo(r[C.mass],9);for(const s of shells){expect(s.mass).toBeGreaterThan(0);expect(s.innerMass).toBeGreaterThanOrEqual(0);expect(s.outerMass).toBeLessThanOrEqual(r[C.mass])}}
 })
 it('integrates the unaltered licensed CIE table and produces plausible blackbody colours',()=>{
  const csv=readFileSync('public/assets/stellar-life/CIE_xyz_1931_2deg.csv');expect(createHash('md5').update(csv).digest('hex')).toBe('17cca777db64b17170f06f67ce9d3ab7');expect(cmf).toHaveLength(471);expect(cmf[0][0]).toBe(360);expect(cmf.at(-1)![0]).toBe(830)
  const cool=blackbodyRGB(3000,cmf),hot=blackbodyRGB(30000,cmf);expect(cool[0]).toBeGreaterThan(cool[2]*2);expect(hot[2]).toBeGreaterThan(hot[0]);for(const rgb of[cool,hot,blackbodyRGB(5772,cmf)])for(const c of rgb){expect(c).toBeGreaterThanOrEqual(0);expect(c).toBeLessThanOrEqual(1)}
 })
 it('keeps HR direction, point picking and physical readout scales consistent',()=>{
  expect(hrPosition(4.5,1).x).toBeLessThan(hrPosition(3.5,1).x);expect(hrPosition(4,5).y).toBeLessThan(hrPosition(4,0).y)
  const t=data.tracks[1],i=1000,r=t.rows[i],p=hrPosition(r[C.teff],r[C.lum],340,220);expect(nearestHR(t,p.x,p.y,340,220)).toBe(i)
  expect(peakWavelength(5772)).toBeCloseTo(502.04,1)
  const solar=[...t.rows[0]];solar[C.mass]=1;solar[C.radius]=0;expect(escapeSpeed(solar)).toBeCloseTo(617.67,1)
  expect(displayRadius(2,'linear',100)/displayRadius(0,'linear',100)).toBe(100)
 })
})
