import type { Reading, Vec3 } from './fields'
export type MolecularStation = 'wood'|'reaction'|'soot'|'char'|'exhaust'
export type Element = 'C'|'H'|'O'
export type Atom = { element: Element; from: Vec3; to: Vec3 }
export type Bond = [number, number, number?]
export type MolecularScene = { atoms: Atom[]; before: Bond[]; after: Bond[] }
export const MOLECULAR_STATIONS: {id:MolecularStation;title:string;body:string;note:string;before:string;after:string}[] = [
  {id:'wood',title:'木头里',body:'纤维素、半纤维素和木质素受热断裂，放出一大群小分子和焦油，留下炭。',note:'这里画纤维素链的一个局部，两端省略。断键只作示意，不把片段冒充唯一的热解产物。',before:'链的局部',after:'断开的片段'},
  {id:'reaction',title:'反应面',body:'一个甲烷与两个氧分子，变成一个二氧化碳和两个水分子。原子没有消失，只是换了连接方式。',note:'真实的热解气是许多种气体的混合物，这里用最简单的甲烷来说明。动画合并了许多反应步骤。',before:'CH₄ + 2 O₂',after:'CO₂ + 2 H₂O'},
  {id:'soot',title:'烟炱区',body:'缺氧的热区里，一些碳氢分子长成多环结构，再聚成烟炱。热烟炱才会发出明亮的黄光。',note:'这里只画两团碳骨架靠近、聚集，不是完整成炱反应，也不是探针测到的分子。',before:'两团碳骨架',after:'聚集'},
  {id:'char',title:'炭表面',body:'氧接触炭表面，碳能生成二氧化碳；也可能先生成一氧化碳，再继续氧化。',note:'这里只演示生成二氧化碳的一条配平反应，不代表炭床只走这一条路径。',before:'C + O₂',after:'CO₂'},
  {id:'exhaust',title:'烟和尾气',body:'二氧化碳、水蒸气、没烧完的一氧化碳和颗粒一起离开。二氧化碳和水蒸气本身不是可见的烟粒。',note:'这里只展示可能出现的物质，不表示当前比例。这个流动场没有逐个计算这些分子的浓度。',before:'混合物',after:'随气流离开'},
]
// The flow selects an explanation; it does not identify molecular species.
export function stationForReading(r:Reading):MolecularStation {
  if(r.solid)return 'wood'
  if(r.heatingRate>500 && r.air>.01)return 'reaction'
  if(r.position[1]<.10 && r.temperature>500)return 'char'
  if(r.temperature>900 && (r.soot>.025 || (r.fuel>.01 && r.air<.15)) && (r.age??0)>.015)return 'soot'
  if(r.position[1]>.45 && (r.smoke>0 || r.soot>0 || r.temperature>400))return 'exhaust'
  if(r.fuel>.01 && r.position[1]<.45)return 'wood'
  return 'exhaust'
}
const atom=(element:Element,from:Vec3,to:Vec3):Atom=>({element,from,to})
export function moleculeScene(id:MolecularStation):MolecularScene {
  if(id==='reaction')return {atoms:[
    atom('C',[-2,0,0],[-2,0,0]),
    atom('H',[-2.65,.65,.65],[1.15,1.45,0]),atom('H',[-1.35,-.65,.65],[2.45,1.45,0]),
    atom('H',[-2.65,-.65,-.65],[1.15,-.55,0]),atom('H',[-1.35,.65,-.65],[2.45,-.55,0]),
    atom('O',[1.3,1,0],[-2.9,0,0]),atom('O',[2.2,1,0],[-1.1,0,0]),
    atom('O',[1.3,-1,0],[1.8,1,0]),atom('O',[2.2,-1,0],[1.8,-1,0]),
  ],before:[[0,1],[0,2],[0,3],[0,4],[5,6,2],[7,8,2]],after:[[0,5,2],[0,6,2],[7,1],[7,2],[8,3],[8,4]]}
  if(id==='char')return {atoms:[atom('C',[-2,0,0],[0,0,0]),atom('O',[1.4,0,0],[-.9,0,0]),atom('O',[2.3,0,0],[.9,0,0])],before:[[1,2,2]],after:[[0,1,2],[0,2,2]]}
  if(id==='soot'){
    const atoms:Atom[]=[],bonds:Bond[]=[]
    for(let group=0;group<2;group++)for(let i=0;i<6;i++){
      const a=i*Math.PI/3,dx=group?1.9:-1.9
      atoms.push(atom('C',[dx+Math.cos(a)*.8,Math.sin(a)*.8,(i%2)*.08],[(group?.9:-.9)+Math.cos(a)*.8,Math.sin(a)*.8,(group?-.1:.1)+(i%2)*.08]))
      bonds.push([group*6+i,group*6+(i+1)%6])
    }
    return {atoms,before:bonds,after:bonds}
  }
  if(id==='exhaust'){
    const atoms:Atom[]=[atom('C',[-2,1,0],[-2.5,1.3,.2]),atom('O',[-2.85,1,0],[-3.35,1.3,.2]),atom('O',[-1.15,1,0],[-1.65,1.3,.2]),
      atom('O',[1.7,1,0],[2.1,1.4,.2]),atom('H',[1.05,1.45,0],[1.45,1.85,.2]),atom('H',[2.35,1.45,0],[2.75,1.85,.2]),
      atom('C',[-1.9,-1,0],[-2.3,-.8,-.1]),atom('O',[-1,-1,0],[-1.4,-.8,-.1]),
      atom('C',[1.4,-.9,0],[1.8,-.7,0]),atom('C',[2.1,-1.3,.1],[2.5,-1.1,.1]),atom('C',[2.1,-.5,.1],[2.5,-.3,.1])]
    const bonds:Bond[]=[[0,1,2],[0,2,2],[3,4],[3,5],[6,7,3],[8,9],[8,10],[9,10]]
    return {atoms,before:bonds,after:bonds}
  }
  // One anhydroglucose repeat in a cellulose chain (C6 H10 O5); polymer ends omitted.
  // Breaking two backbone bonds illustrates fragmentation only, not a proposed elementary pathway.
  const positions:Vec3[]=[[-1,0,.25],[-.5,.85,0],[.5,.85,.25],[1,0,0],[.5,-.85,.25],[1.15,-1.7,.15],[-.5,-.85,0],[-1.15,1.6,0],[1.15,1.6,.25],[1.95,-1.65,.1],[-1.85,0,.25]]
  const elements:Element[]=['C','C','C','C','C','C','O','O','O','O','O'],before:Bond[]=[[0,1],[1,2],[2,3],[3,4],[4,6],[6,0],[4,5],[1,7],[2,8],[5,9],[0,10]]
  for(const [parent,delta] of [[0,[-.2,-.1,.85]],[1,[-.1,.1,-.85]],[2,[.1,.1,.85]],[3,[.8,.1,0]],[4,[-.1,-.1,.85]],[5,[0,-.75,.65]],[5,[-.45,-.5,-.55]],[7,[-.55,.25,0]],[8,[.55,.25,.1]],[9,[.45,-.45,0]]] as [number,Vec3][]){
    const p=positions[parent];before.push([parent,positions.length]);positions.push(p.map((v,i)=>v+delta[i]) as Vec3);elements.push('H')
  }
  const left=new Set([0,1,6,7,10,11,12,18])
  return {atoms:positions.map((p,i)=>atom(elements[i],p,p.map((v,k)=>v+(k===0?(left.has(i)?-.55:.55):0)) as Vec3)),before,after:before.filter(([a,b])=>left.has(a)===left.has(b))}
}
export function atomCounts(scene:MolecularScene) {
  return scene.atoms.reduce((sum,a)=>({...sum,[a.element]:sum[a.element]+1}),{C:0,H:0,O:0})
}
