import type { Network, Vec3 } from '../sim/types'
import type { ExploreRoute } from './routes'
import { sampleLane } from '../sim/geometry'

export interface WhyPin { id:string; title:string; body:string; position:Vec3; laneIds:string[] }
export const EXPLAINED = ['cloverleaf','crossroads-signal','huangjuewan']
export const DESIGN_SUMMARY:Record<string,string> = {
  cloverleaf:'用环道和上下跨分开车流，左转不用等红灯；代价是绕圈、低速和交织。',
  'crossroads-signal':'用红绿灯轮流分配路口，减少同时相交的车流；代价是等待，左转仍需让行。',
  huangjuewan:'在有限的山地空间连接多个方向；代价是长匝道、多层桥和更早的路线选择。',
}
export const COMPARISONS:Record<string,{id:string;label:string;body:string}[]> = {
  cloverleaf:[{id:'parclo',label:'部分苜蓿叶',body:'少建一些环道，把部分车流交给信号路口；不再是同样的全自由流枢纽。'},{id:'stack',label:'四层堆叠式',body:'左转改走定向匝道，消除环间交织；代价是更多、更高的桥。'}],
  'crossroads-signal':[{id:'crossroads-yield',label:'无信号十字路口',body:'不用等固定红灯，但各方向都依赖空当和让行。'},{id:'crossroads-channelized',label:'渠化路口',body:'给左转专用车道和相位，减少与对向车流争路；占地与等待分配也随之改变。'}],
  huangjuewan:[{id:'stack',label:'四层堆叠式',body:'规则四岔便于重复布置；黄桷湾的多方向、地形和既有道路使匝道不能简单复制。'}],
}
export function explanationPins(network:Network, route:ExploreRoute|undefined):WhyPin[] {
  if(!EXPLAINED.includes(network.id))return []
  const fallback=network.movements.find(m=>m.from==='north'&&m.turn==='left')??network.movements[0]
  const movement=route?.movement??fallback
  const lanes=movement.lanes.map(id=>network.lanes.find(l=>l.id===id)!)
  const pin=(id:string,title:string,body:string,lane=lanes[0],fraction=.5):WhyPin=>({id,title,body,position:sampleLane(lane,lane.length*fraction).position,laneIds:[lane.id]})
  if(network.id==='cloverleaf') {
    const loop=lanes.find(l=>l.id.startsWith('loop-'))??network.lanes.find(l=>l.id==='loop-1')!
    const weave=network.weaving.find(w=>w.lanes?.some(id=>movement.lanes.includes(id)))??network.weaving[0]
    const main=lanes.find(l=>l.level===1)??network.lanes.find(l=>l.level===1)!
    return [
      pin('loop','为什么左转要绕圈','先向右驶出，再绕 270°，就能朝左驶离，不必横穿对向车流；代价是路更长。',loop,.48),
      pin('radius','小弯要慢行','环形匝道半径较小，模型设定车速为 40 km/h；缩小占地的同时，限制了转弯速度。',loop,.78),
      {id:'weave',title:'两股车在这里交织',body:'上一个环道驶入的车与下一个环道驶出的车，在同一段辅助车道里交换位置；车多时容易互相阻碍。',position:weave.points[Math.floor(weave.points.length/2)],laneIds:weave.lanes??[]},
      pin('bridge','让主线从上面跨过','主线在不同高度相交，避免平面交叉；代价是桥梁和爬坡所需的距离。',main,.5),
    ]
  }
  if(network.id==='crossroads-signal') {
    const entry=lanes[0],connector=lanes.find(l=>l.kind==='connector')!
    return [
      pin('stop','红灯在哪里等','红灯时车头停在停止线前，把路口留给横向车流；代价是排队等待。',entry,(entry.stopLine??entry.length)/entry.length),
      pin('gap','绿灯，左转还要等什么','这里是许可左转。绿灯允许驶入，但仍要让对向直行；示范车在有足够空当后才转过去。',connector,.12),
      pin('phase','把交叉换成轮流通过','南北与东西轮流放行。它减少同时相交的车流，却不会消除同一绿灯中的左转冲突。',connector,.55),
      pin('clear','黄灯与全红留出清空时间','每相位有 3 秒黄灯和 2 秒全红，给已进入路口的车留出清空时间；这些时间不能用于新的绿灯放行。',connector,.85),
    ]
  }
  const high=lanes.reduce((a,b)=>Math.max(...b.points.map(p=>p.y))>Math.max(...a.points.map(p=>p.y))?b:a)
  const ramp=lanes.find(l=>l.kind==='ramp')??lanes[Math.floor(lanes.length/2)]
  const split=lanes.find(l=>l.next.length>1)??lanes[0]
  return [
    pin('split','先认出口，再选车道','多条通往不同方向的匝道在这里分开。提前选道能减少临近出口的横移；选错方向后不能随意横穿。',split,.8),
    pin('height','为什么要上下分层','用不同高度把相交路线分开；代价是桥梁、爬坡和更长的连接段。图中的高度由 OSM 图层与净空约束推断，并非实测。',high,.5),
    pin('detour','为什么不直接连过去','直线只用作距离参照，没有考虑地形、桥梁和既有道路。这里沿 OSM 连通路网选路，绕行量由所选路线计算。',ramp,.5),
    pin('merge','终点之前还要合流','匝道终究要接回道路，汇入时仍需空当。立体化分开了交叉，并没有让合流消失。',lanes.at(-2)??ramp,.8),
  ]
}
