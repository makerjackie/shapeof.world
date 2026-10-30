import {describe,expect,it} from 'vitest'
import {FOILS,polar,SECTIONS,SPEC} from './model'
import {stationOutline,bladeGeometry} from './geometry'
import {polarPlot} from './polar-plot'
describe('source-backed blade inspection',()=>{
 it('maps live polar markers through the same interpolation as the dynamics',()=>{
  for(let foil=0;foil<FOILS.length;foil++) for(const alpha of [-25,0,7.3,25]){
   const p=polarPlot(foil,alpha),c=polar(foil,alpha)
   expect(p.x).toBeCloseTo(29+(alpha+30)/60*212)
   expect(p.clY).toBeCloseTo(78.5-c.cl/p.clMax*55.5)
   expect(p.cdY).toBeCloseTo(134-c.cd/p.cdMax*111)
   expect(p.outside).toBe(false)
  }
 })
 it('never draws an off-plot live angle as if it were the boundary angle',()=>{
  expect(polarPlot(3,35).outside).toBe(true)
  expect(polarPlot(3,-90).outside).toBe(true)
  expect(polarPlot(3,-90,180).outside).toBe(false)
 })
 it('puts every station rib on the exact loft coordinates when display expansion is disabled',()=>{
  const g=bladeGeometry(),v=g.attributes.position
  for(let i=0;i<SECTIONS.length;i++){
   const rib=stationOutline(i,1)
   expect(rib).toHaveLength(97);expect(rib[0]).toEqual(rib[96])
   for(let j=0;j<96;j++) for(let k=0;k<3;k++) expect(rib[j][k]).toBeCloseTo(v.array[(i*96+j)*3+k],4)
   expect(rib[0][1]).toBeCloseTo(SECTIONS[i].span+SPEC.hubRadius)
  }
  g.dispose()
 })
})
