import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import meta from './data-meta.json'
import {unpackField} from './load'
import {makeStreamlines,makeSpeedTexture,makeStreamHeads} from './streamlines'
import {advanceDrifter,createDrifter,decodeGrid,distance,maximumStep,sample,sphericalStep,toLocation,toVector,trackAt,vectorAngle,wrapLongitude,type Grid} from './model'
const grids=Object.fromEntries(meta.fields.map(f=>{const bytes=gunzipSync(readFileSync(`public${f.path}`));return [f.id,decodeGrid(f.id as 'wind'|'ocean',bytes)]})) as Record<'wind'|'ocean',Grid>
function constant(u=10,v=0):Grid {return {kind:'wind',nx:4,ny:3,lon0:-180,lat0:90,dx:90,dy:90,radius:6371000,u:new Int16Array(12).fill(u*100),v:new Int16Array(12).fill(v*100),scale:.01,missing:32767}}
describe('wind-ocean scientific field and spherical tracks',()=>{
  it('decodes exactly the pinned binary fields and retains missing vectors',()=>{
    for(const f of meta.fields){
      const bytes=gunzipSync(readFileSync(`public${f.path}`))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(f.binarySha256)
      const grid=grids[f.id as 'wind'|'ocean']
      let valid=0;for(let i=0;i<grid.u.length;i++)if(grid.u[i]!==grid.missing&&grid.v[i]!==grid.missing)valid++
      expect(valid).toBe(f.validVectorCount)
    }
    expect(()=>decodeGrid('wind',new Uint8Array(3))).toThrow()
    const zipped=readFileSync(`public${meta.fields[0].path}`),plain=gunzipSync(zipped)
    expect(unpackField('wind',zipped).u[100]).toBe(unpackField('wind',plain).u[100])
    const f=meta.fields[0]
    expect(new Date(Date.parse(f.referenceTime)+f.forecastHours*3600000).toISOString()).toBe(f.validTime)
  })
  it('interpolates native components, wraps every longitude and handles both latitude edges',()=>{
    const grid=constant();grid.u[0]=0;grid.u[1]=2000;grid.u[4]=1000;grid.u[5]=3000
    expect(sample(grid,-135,45)!.u).toBeCloseTo(15,10)
    expect(sample(grids.ocean,179,0)).toEqual(sample(grids.ocean,-181,0))
    expect(sample(grids.ocean,20,10)).toEqual(sample(grids.ocean,380,10))
    expect(sample(grids.wind,0,90)).not.toBeNull()
    expect(sample(grids.wind,0,-90)).not.toBeNull()
    expect(sample(grids.ocean,40,81)).toBeNull()
    expect(sample(grid,0,NaN)).toBeNull()
    expect(wrapLongitude(540)).toBe(-180)
  })
  it('never interpolates through a missing coastal corner or treats one missing component as zero',()=>{
    const grid=constant();grid.v[5]=32767
    expect(sample(grid,-135,45)).toBeNull()
    expect(sample(grids.ocean,100,35)).toBeNull()
    expect(sample(grids.ocean,-40,0)).not.toBeNull()
  })
  it('uses the exact same geographic basis as the globe texture',()=>{
    expect(toVector({lon:0,lat:0})).toEqual({x:1,y:0,z:-0})
    expect(toVector({lon:90,lat:0}).z).toBeCloseTo(-1,10)
    for(const loc of [{lon:120,lat:31},{lon:-179.9,lat:-68},{lon:30,lat:89.9}]){
      const back=toLocation(toVector(loc));expect(back.lon).toBeCloseTo(loc.lon,8);expect(back.lat).toBeCloseTo(loc.lat,8)
    }
  })
  it('integrates known equatorial and meridional motion without a dateline jump',()=>{
    const east=sphericalStep(constant(),{lon:179.8,lat:0},7200)!
    expect(east.lon).toBeCloseTo(wrapLongitude(179.8+10*7200/6371000*180/Math.PI),5)
    expect(east.lat).toBeCloseTo(0,8)
    expect(distance({lon:179.8,lat:0},east)).toBeCloseTo(72000,0)
    const north=sphericalStep(constant(0,10),{lon:10,lat:-5},3600)!
    expect(north.lon).toBeCloseTo(10,7);expect(north.lat).toBeCloseTo(-5+36000/6371000*180/Math.PI,5)
  })
  it('keeps polar motion finite and shortens steps relative to native grid spacing',()=>{
    const point=sphericalStep(constant(5,8),{lon:20,lat:89.8},1800)!
    expect(Number.isFinite(point.lon)&&Number.isFinite(point.lat)).toBe(true)
    expect(Math.abs(point.lat)).toBeLessThanOrEqual(90)
    expect(maximumStep(grids.wind,{lon:0,lat:80},10)).toBeLessThan(maximumStep(grids.wind,{lon:0,lat:0},10))
  })
  it('tracks actual elapsed time and distance, then allows historical interpolation',()=>{
    const g=constant(),d=createDrifter(1,'wind',{lon:179.8,lat:0},0,g)!
    advanceDrifter(d,g,86400)
    expect(d.point.time).toBeCloseTo(86400,8);expect(d.point.distance).toBeCloseTo(864000,0)
    expect(trackAt(d,-1)).toBeNull()
    expect(trackAt(d,43200)!.distance).toBeCloseTo(432000,0)
    expect(trackAt(d,43200)!.lon).toBeCloseTo(wrapLongitude(179.8+432000/g.radius*180/Math.PI),4)
  })
  it('builds spherical, bounded streamline segments and a correctly oriented display raster',()=>{
    const geometry=makeStreamlines(grids.ocean,32),position=geometry.attributes.position
    expect(position.count).toBeGreaterThan(100)
    for(let i=0;i<position.count;i+=2){
      const a={x:position.getX(i),y:position.getY(i),z:position.getZ(i)},b={x:position.getX(i+1),y:position.getY(i+1),z:position.getZ(i+1)}
      expect(Math.hypot(a.x,a.y,a.z)).toBeCloseTo(1.009,6)
      expect(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)).toBeLessThan(.004)
    }
    const heads=makeStreamHeads(geometry)
    expect(heads.getAttribute('aAge')).toBe(geometry.getAttribute('aAge'))
    expect(heads.getAttribute('position')).toBe(position)
    expect(heads.getIndex()!.count).toBe(position.count/2)
    for(let i=0;i<heads.getIndex()!.count;i++)expect(heads.getIndex()!.getX(i)%2).toBe(0)
    heads.dispose();geometry.dispose()
    const texture=makeSpeedTexture(grids.ocean)
    expect(texture.flipY).toBe(false)
    const data=texture.image.data as Uint8Array
    expect(data.length).toBe(720*360*4)
    // Both polar rows are outside OSCAR coverage and must remain transparent.
    expect(data[3]).toBe(0);expect(data[data.length-1]).toBe(0)
    texture.dispose()
  })
  it('separates wind-from from flow-toward and never creates a drifter on missing data',()=>{
    const east=sample(constant(),0,0)!,north=sample(constant(0,10),0,0)!
    expect(east.toward).toBe(90);expect(east.from).toBe(270)
    expect(vectorAngle(east,north)).toBeCloseTo(90,8)
    expect(createDrifter(1,'ocean',{lon:100,lat:35},0,grids.ocean)).toBeNull()
  })
})
