import { expect,it } from 'vitest'
import { DESIGNS } from '../designs'
import { routeSignal } from './route-signal'

it('reads the DDI lane gate rather than its nonexistent broad O-D phase',()=>{
 const network=DESIGNS.find(d=>d.id==='ddi')!.build(),movement=network.movements.find(m=>m.from==='west'&&m.turn==='straight')!
 const gate=network.lanes.find(l=>l.id===movement.lanes[0])!
 expect(routeSignal(network,movement,gate.id,0)?.color).toBe('green')
 const through=network.movements.find(m=>m.from==='north'&&m.id.includes('-main-'))!
 expect(routeSignal(network,through,through.lanes[0],0)).toBeUndefined()
})
it('uses the upstream gate for a displaced left turn and counts the whole red interval',()=>{
 const cfi=DESIGNS.find(d=>d.id==='continuous-flow')!.build(),left=cfi.movements.find(m=>m.from==='north'&&m.turn==='left')!
 expect(routeSignal(cfi,left,left.lanes[0],0)?.color).toBe('red')
 const network=DESIGNS.find(d=>d.id==='crossroads-signal')!.build(),east=network.movements.find(m=>m.from==='east'&&m.turn==='left')!
 // At t=0, east waits for 32 s north/south green + 3 yellow + 2 all red.
 expect(routeSignal(network,east,east.lanes[0],0)).toEqual({color:'red',remaining:37})
})
