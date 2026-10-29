/** Original fictional reference town. Positions are scene units; hydraulic dimensions are SI. */
export type Vec3 = [number, number, number]
export type SiteId = 'reservoir' | 'intake' | 'mixing' | 'settling' | 'filters' | 'disinfection' | 'clearwell' | 'pump' | 'tower' | 'district' | 'hospital' | 'industry'
export interface WaterNode {
  id: string
  x: number
  z: number
  elevation: number
  demand: number // m³/s, at a multiplier of 1
  kind: 'junction' | 'source' | 'tank'
  label: string
}
export interface WaterPipe {
  id: string
  from: number
  to: number
  length: number // m
  diameter: number // m
  resistance: number // m/(m³/s)², Darcy–Weisbach with reference f = 0.022
  pump?: boolean
}
export const GRAVITY = 9.80665
export const WATER_DENSITY = 998.2
export const REFERENCE_FRICTION = .022
export function pipeResistance(length: number, diameter: number) {
  return 8 * REFERENCE_FRICTION * length / (GRAVITY * Math.PI ** 2 * diameter ** 5)
}
export const NODES: WaterNode[] = [
  {id: 'works', x: -5.8, z: -5.8, elevation: 12, demand: 0, kind: 'source', label: '清水池'},
  ...Array.from({length: 15}, (_, i): WaterNode => {
    const col = i % 5, row = Math.floor(i / 5)
    const elevation = 10 + col * 1.7 + (row === 0 ? 3 : row === 2 ? -1 : 0)
    return {id: `j${i}`, x: -2.7 + col * 2.65, z: -5.4 + row * 4.2, elevation,
      demand: [.0028,.0032,.0025,.0026,.0022,.003,.0038,.004,.003,.0034,.002,.0032,.0028,.004,.0025][i],
      kind: 'junction', label: i === 4 ? '山坡住宅' : i === 8 ? '市医院' : i === 13 ? '工厂' : i === 2 ? '学校' : '街区'}
  }),
  {id: 'tower', x: 9.9, z: -7.2, elevation: 43, demand: 0, kind: 'tank', label: '高位水塔'},
]
const pipes: WaterPipe[] = []
function add(from: number, to: number, diameter: number, length?: number) {
  const a = NODES[from], b = NODES[to]
  const l = length ?? Math.hypot(a.x - b.x, a.z - b.z) * 115
  pipes.push({id: `p${pipes.length}`, from, to, length: l, diameter, resistance: pipeResistance(l, diameter)})
}
// The pump is a check-valved quadratic head-flow element, not an ideal pressure boundary.
pipes.push({id: 'pump', from: 0, to: 1, length: 280, diameter: .35, resistance: 3600 + pipeResistance(280, .35), pump: true})
for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) add(1 + row * 5 + col, 2 + row * 5 + col, row === 1 ? .25 : .2)
for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) add(1 + row * 5 + col, 6 + row * 5 + col, col === 0 || col === 4 ? .25 : .16)
add(5, 16, .28, 310)
add(10, 16, .24, 700)
export const PIPES: readonly WaterPipe[] = pipes
export const TANK_NODE = 16
export const LEAK_NODE = 8
export const ISOLATION_PIPE = 7
export const TOWER_AREA = 90 // m²; 8 m active depth = 720 m³
export const TOWER_CAPACITY = 720
export const CLEARWELL_CAPACITY = 1800
export const RESERVOIR_CAPACITY = 180000
export const SITES: {id: SiteId; title: string; short: string; body: string; position: Vec3; camera: Vec3; target: Vec3}[] = [
  {id:'reservoir',title:'水库',short:'一座城的上游',body:'雨水先存起来。水位决定取水口还剩多少余量；水库不是无限水源。改变来水，再把时间拨快，看看城市能靠储水撑多久。',position:[-12.4,2.1,-6.9],camera:[-19,13,9],target:[-11,1,-6]},
  {id:'intake',title:'取水口',short:'水还没有变成自来水',body:'格栅拦住漂浮物，原水经过管道进入水厂。这里的取水量受闸门、水源余量和滤池运行状态共同限制。',position:[-9.6,1.8,-5.6],camera:[-14,9,4],target:[-9,1,-5]},
  {id:'mixing',title:'混凝与絮凝',short:'先让细小颗粒抱成团',body:'混凝剂帮助细小颗粒脱稳，慢搅拌让它们碰撞成较大的絮体。旋转桨叶与颗粒只作过程示意；药量与浊度关系是教学响应曲线。',position:[-8.1,.9,-2.8],camera:[-12,8,5],target:[-7.7,.7,-2.7]},
  {id:'settling',title:'沉淀池',short:'让重一点的絮体慢慢下沉',body:'流速放缓，絮体在重力下沉降，刮泥机把底部污泥收走。清水从堰口继续流向滤池。沉淀不能单独完成全部净化。',position:[-5.7,.8,-1.9],camera:[-10,8,7],target:[-5.8,.7,-2]},
  {id:'filters',title:'砂滤池',short:'水穿过颗粒之间的缝隙',body:'水向下流过滤料，截留剩余悬浮颗粒。运行越久，滤层负荷越高；反冲洗暂时降低产水量，让滤层恢复。',position:[-6.1,.8,1.4],camera:[-11,8,9],target:[-6,.5,1]},
  {id:'disinfection',title:'消毒接触池',short:'留下沿途继续作用的余量',body:'折返的廊道延长接触时间。这里用完全混合与一阶衰减追踪一个代表性余氯信号，不计算病原体灭活，不判定饮水是否安全。',position:[-8.1,.8,2.1],camera:[-13,8,9],target:[-7.8,.6,1.8]},
  {id:'clearwell',title:'清水池',short:'水厂与城市之间的缓冲',body:'处理后的水先存进清水池。产水与供水不必每秒相等，水位会接住差额；持续抽得比处理得快，清水池就会逐渐见底。',position:[-5.8,.5,-5.8],camera:[-11,8,2],target:[-5.8,.5,-5.5]},
  {id:'pump',title:'供水泵站',short:'把电变成水的压力',body:'泵用电能提高水头。转速越高，泵的关阀扬程按转速的平方变化；实际流量由泵曲线与整张管网共同决定。',position:[-4.3,.8,-5.5],camera:[-9,6,1],target:[-4,.5,-5]},
  {id:'tower',title:'高位水塔',short:'把储水抬到城市上方',body:'水面高于水龙头，就有静水压力。泵停下来以后，水塔仍能供水；直到储水耗尽。观察高峰时流向反转，夜间再由泵补回。',position:[9.9,4.6,-7.2],camera:[16,10,2],target:[9.5,2.2,-6.8]},
  {id:'district',title:'居民街区',short:'每一个水龙头都牵动整张网',body:'用水需求随一天起伏。水压不足时，实际到达的流量会下降。每个节点都计算水头，每条管道都计算有方向的流量。',position:[2.6,1,-1.2],camera:[12,13,15],target:[3,.5,-1]},
  {id:'hospital',title:'市医院',short:'高处要多付出一点水头',body:'这里和所有街区共用环状管网。打开消防用水、降低泵速或隔离一条干管，看看节点之间如何重新分配流量。楼内管路不单独求解。',position:[5.25,1,-1.2],camera:[11,8,8],target:[5,1,-1]},
  {id:'industry',title:'工厂',short:'用水的时间也很重要',body:'工业用水叠加在街区需求上。环网能从不止一个方向供水，但冗余不是无限的；一处漏水会改变其他地方的压力与水龄。',position:[5.25,.8,3],camera:[13,8,12],target:[5,.6,3]},
]
export const TOUR = ['reservoir','mixing','filters','pump','tower','district'] as const
