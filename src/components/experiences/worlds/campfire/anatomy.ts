import type { FieldId, Vec3 } from './fields'
export type AnatomyId = 'wood' | 'coal' | 'root' | 'yellow' | 'tip' | 'smoke' | 'spark' | 'plume'
export type AnatomyStation = { id: AnatomyId; title: string; body: string; field: FieldId; position: Vec3; camera: { yaw: number; pitch: number; dist: number; ty: number }; horizontal?: boolean }
export const ANATOMY: AnatomyStation[] = [
  { id:'wood',title:'木柴',body:'木头先失水，受热分解出可燃气；眼前的火焰主要烧这些气体。',field:'fuel',position:[-.15,.108,.16],camera:{yaw:.6,pitch:.15,dist:1.7,ty:.25}},
  { id:'coal',title:'炭',body:'氧与炭反应，让裂缝、余烬发红。这里读炭床上方气温。',field:'heat',position:[.07,.055,-.04],camera:{yaw:-.5,pitch:.55,dist:1.6,ty:.12}},
  { id:'root',title:'蓝色火根',body:'年轻气体少烟炱，15–50毫秒渐启生成；微弱蓝光来自反应的化学发光。',field:'age',position:[.09,.12,.05],camera:{yaw:.78,pitch:.16,dist:1.7,ty:.23}},
  { id:'yellow',title:'黄色火焰',body:'热烟炱发黄光；颗粒多少、视线厚度也影响亮度，最亮未必最热。',field:'soot',position:[.06,.45,0],camera:{yaw:.78,pitch:.12,dist:2.1,ty:.45}},
  { id:'tip',title:'火尖',body:'上升的火舌会收细、断开。烟炱烧掉或冷却后，可见的光就弱下来了。',field:'soot',position:[0,.95,0],camera:{yaw:.3,pitch:.18,dist:2.5,ty:.9}},
  { id:'smoke',title:'烟',body:'烟含未烧完的颗粒和凝结物；热气还含不可见气体，模型未分别求其浓度。',field:'soot',position:[.13,1.3,-.06],camera:{yaw:-.45,pitch:.15,dist:2.8,ty:1}},
  { id:'spark',title:'火星',body:'小炭粒随气流飞起，继续氧化直到熄灭。读数来自当前存活火星。',field:'speed',position:[.2,.75,.08],camera:{yaw:-.6,pitch:.18,dist:2.9,ty:.65}},
  { id:'plume',title:'热羽流与卷吸',body:'热气上升，周围空气补入。横切时朝火心的箭头显示卷吸。',field:'speed',position:[.3,.3,0],camera:{yaw:.78,pitch:.85,dist:2.5,ty:.35},horizontal:true},
]
export type LabelPoint = { id: string; x: number; y: number }
/** Clamp a real projected anchor to the safe viewport, retaining its offscreen direction. */
export function containAnchor(point: LabelPoint, width: number, height: number) {
  const left=12,right=width-12,top=height<600?126:190,bottom=height-118
  const x=Math.max(left,Math.min(right,point.x)),y=Math.max(top,Math.min(bottom,point.y))
  return {...point,x,y,offscreen:x!==point.x||y!==point.y,angle:Math.atan2(point.y-y,point.x-x)*180/Math.PI}
}
// Two sorted rails give 44 px touch targets without pairwise label overlaps.
export function layoutLabels(points: LabelPoint[], width: number, height: number) {
  const mobile=width<721, labelWidth=mobile?124:142, gap=mobile?46:50
  const top=mobile?(height>600?210:150):160, bottom=height-(mobile?145:155), sorted=[...points].sort((a,b)=>a.x-b.x)
  return [sorted.slice(0,4),sorted.slice(4)].flatMap((column,side)=>{
    const list=column.sort((a,b)=>a.y-b.y), ys:number[]=[]
    for(let i=0;i<list.length;i++)ys.push(Math.max(top,Math.min(bottom,list[i].y),i?ys[i-1]+gap:top))
    const overflow=Math.max(0,(ys.at(-1)??0)-bottom)
    if(overflow)for(let i=0;i<ys.length;i++)ys[i]-=overflow
    return list.map((point,i)=>({...point,left:mobile?(side?width-labelWidth-8:8):width*(side?.68:.23),top:ys[i],width:labelWidth}))
  })
}
