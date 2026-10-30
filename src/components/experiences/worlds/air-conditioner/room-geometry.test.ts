import {describe,it,expect} from 'vitest'
import {ROOM_WINDOW,WINDOW_WALL_PIECES,slidingPane,curtainGeometry} from './room-geometry'
describe('room window and curtain exhibit geometry',()=>{
 it('leaves an actual opening in the wall rather than painting a glass pane on solid plaster',()=>{
  for(let yi=0;yi<52;yi++)for(let zi=0;zi<48;zi++){
   const y=(yi+.5)*.05,z=-2+(zi+.5)*.05,inside=y>.825+1e-8&&y<2.275-1e-8&&z>-1.425+1e-8&&z<.125-1e-8
   const solid=WINDOW_WALL_PIECES.some(p=>Math.abs(y-p.at[1])<p.size[1]/2+1e-8&&Math.abs(z-p.at[2])<p.size[2]/2+1e-8)
   expect(solid).toBe(!inside)
  }
 })
 it('slides the left sash to reveal half the window, keeping the sash inside the frame',()=>{expect(slidingPane(0)).toBe(-.36);expect(slidingPane(1)).toBeCloseTo(.34);expect(slidingPane(1)-ROOM_WINDOW.paneWidth/2).toBeGreaterThan(-.03);expect(slidingPane(1)+ROOM_WINDOW.paneWidth/2).toBeLessThan(ROOM_WINDOW.width/2);expect(slidingPane(-1)).toBe(slidingPane(0));expect(slidingPane(NaN)).toBe(slidingPane(0))})
 it('produces bounded finite pleats at both gathered and shaded widths',()=>{for(const w of[.15,.73]){const g=curtainGeometry(w),p=g.attributes.position;for(let i=0;i<p.count;i++){expect(Math.abs(p.getX(i))).toBeLessThanOrEqual(w/2+1e-6);expect(Math.abs(p.getZ(i))).toBeLessThan(.04);expect(Number.isFinite(g.attributes.normal.getZ(i))).toBe(true)}g.dispose()}})
})
