import type { Movement, Network } from '../sim/types'
import { signalClock, signalState, type SignalColor } from '../sim/control'

/** Serial junctions (DDI / displaced left turns) are gated by lane groups, not
 * the O-D's broad arterial/ramps label. Follow the next actual stop line. */
export function routeSignal(network:Network,movement:Movement,laneId:string,time:number):{color:SignalColor;remaining:number}|undefined{
 if(network.control.kind!=='signal')return undefined
 const lane=network.lanes.find(l=>l.id===laneId),cursor=movement.lanes.findIndex(id=>id===laneId||id===laneId.replace(/-outer$/,''))
 const next=movement.lanes.slice(Math.max(0,cursor)).map(id=>network.lanes.find(l=>l.id===id)!).find(l=>l.stopLine!==undefined&&l.signalGroups?.length)
 const groups=lane?.signalGroups??next?.signalGroups??[movement.signalGroup??movement.from]
 const valid=groups.filter(group=>network.control.phases?.some(p=>p.groups.includes(group)))
 if(!valid.length)return undefined
 const colorAt=(t:number):SignalColor=>{const colors=valid.map(g=>signalState(network.control,t,g));return colors.includes('green')?'green':colors.includes('yellow')?'yellow':'red'}
 const color=colorAt(time)
 let remaining=signalClock(network.control,time).remaining
 for(let i=0;i<(network.control.phases?.length??0)*3;i++){
  if(colorAt(time+remaining+.001)!==color)return {color,remaining}
  remaining+=signalClock(network.control,time+remaining+.001).remaining+.001
 }
 return {color,remaining:Infinity}
}
