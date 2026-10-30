import {memo,useEffect,useMemo,useRef,type RefObject} from 'react'
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {CameraControls,Environment,Html,Lightformer,RoundedBox} from '@react-three/drei'
import * as T from 'three'
import {gelu,headTensor,tensorRange,LETTERS,type Model,type Tensor,type Trace} from './model'
import {BLOCK_NAMES,matrixFor,type MatrixKey} from './inspection'

import {attentionRowZ,contextHead,phaseLayer,phasePosition,sceneCamera,type View} from './layout'
export type {View} from './layout'
export type Selection={matrix:MatrixKey;layer:number;head:number;row:number;column:number}
type SceneProps={model:Model;trace:Trace;view:View;layer:number;head:number;row:number;column:number;matrix:MatrixKey;phase:number;playing:boolean;speed:number;revision:number;labels:boolean;onPick:(p:Selection)=>void;onInteract:()=>void;tx:(s:string)=>string}
const LOW=new T.Color('#668fab'),HIGH=new T.Color('#d4a477'),ZERO=new T.Color('#263c48'),PROB=new T.Color('#a1c5a9')
function colour(value:number,limit:number,probability:boolean){if(!Number.isFinite(value))return new T.Color('#101b25');const t=probability?Math.max(0,value):Math.min(1,Math.abs(value)/limit);return ZERO.clone().lerp(probability?PROB:value>=0?HIGH:LOW,Math.pow(t,.52))}
function Pipe({points,color='#b99970',radius=.025,opacity=.6}:{points:[number,number,number][];color?:string;radius?:number;opacity?:number}){
 const curve=useMemo(()=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),[points])
 return <mesh><tubeGeometry args={[curve,40,radius,5,false]}/><meshStandardMaterial color={color} metalness={.65} roughness={.36} transparent opacity={opacity}/></mesh>
}
function Caption({position,text,small=false,panel=false,alignLeft=false}:{position:[number,number,number];text:string;small?:boolean;panel?:boolean;alignLeft?:boolean}){return <Html position={position} center style={{pointerEvents:'none'}}><span className={`li-label ${small?'li-label-small':''} ${panel?'li-scene-section':''} ${alignLeft?'li-scene-section-left':''}`} style={{fontFamily:'ui-monospace,monospace',fontSize:small?9:11,fontWeight:400,color:small?'#91afbc':'#cad8de',whiteSpace:'nowrap'}}>{text}</span></Html>}

type GridProps={value:Tensor;width:number;depth:number;probability?:boolean;opacity?:number;active?:boolean;highlightRow?:number;selection?:[number,number];onPick?:(r:number,c:number)=>void;position?:[number,number,number]}
const Grid=memo(function Grid({value,width,depth,probability=false,opacity=1,active=false,highlightRow,selection,onPick,position=[0,0,0]}:GridProps){
 const mesh=useRef<T.InstancedMesh>(null),[rows,cols]=value.shape,cellX=width/cols,cellZ=depth/rows,range=useMemo(()=>tensorRange(value),[value])
 const heights=useMemo(()=>Array.from(value.data,v=>Number.isFinite(v)?.025+.19*Math.min(1,probability?v:Math.abs(v)/range.absolute):.018),[value,probability,range])
 useEffect(()=>{const object=new T.Object3D();for(let i=0;i<value.data.length;i++){object.position.set((i%cols-(cols-1)/2)*cellX,heights[i]/2,(Math.floor(i/cols)-(rows-1)/2)*cellZ);object.scale.set(cellX*.84,heights[i],cellZ*.82);object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);mesh.current!.setColorAt(i,colour(value.data[i],range.absolute,probability))}mesh.current!.instanceMatrix.needsUpdate=true;if(mesh.current!.instanceColor)mesh.current!.instanceColor.needsUpdate=true},[value,cols,rows,cellX,cellZ,heights,range,probability])
 const pick=(e:ThreeEvent<MouseEvent>)=>{if(e.delta>4||e.instanceId===undefined||!onPick)return;e.stopPropagation();onPick(Math.floor(e.instanceId/cols),e.instanceId%cols)}
 const selected=selection&&selection[0]<rows&&selection[1]<cols?selection:undefined,selectedI=selected?selected[0]*cols+selected[1]:0
 return <group position={position}><RoundedBox position={[0,-.065,0]} args={[width+.16,.08,depth+.16]} radius={.035} smoothness={2}><meshStandardMaterial color={active?'#3c5158':'#1c303c'} metalness={.58} roughness={.38} transparent opacity={Math.max(.35,opacity*.9)}/></RoundedBox>
  {active&&<mesh position={[0,-.075,0]}><boxGeometry args={[width+.23,.025,depth+.23]}/><meshBasicMaterial color="#bda780" transparent opacity={.5}/></mesh>}
  {highlightRow!==undefined&&highlightRow>=0&&highlightRow<rows&&<mesh position={[0,.15,(highlightRow-(rows-1)/2)*cellZ]}><boxGeometry args={[width+.06,.32,cellZ*.99]}/><meshBasicMaterial color="#bdcfb8" wireframe transparent opacity={.8}/></mesh>}
  <instancedMesh ref={mesh} args={[undefined,undefined,rows*cols]} onClick={pick} onPointerOver={e=>{if(!onPick)return;e.stopPropagation();document.body.style.cursor='crosshair'}} onPointerOut={()=>{document.body.style.cursor=''}}><boxGeometry args={[1,1,1]}/><meshStandardMaterial metalness={.18} roughness={.45} transparent={opacity<1} opacity={opacity}/></instancedMesh>
  {selected&&<mesh position={[(selected[1]-(cols-1)/2)*cellX,heights[selectedI]/2+.025,(selected[0]-(rows-1)/2)*cellZ]}><boxGeometry args={[cellX*1.08,heights[selectedI]+.07,cellZ*1.08]}/><meshBasicMaterial color="#f0d6ab" wireframe/></mesh>}
 </group>
})
function Head({block,head,layer,y,p,labels}:{block:Trace['blocks'][number];head:number;layer:number;y:number;p:SceneProps;labels:boolean}){
 const q=useMemo(()=>headTensor(block.q,head),[block,head]),k=useMemo(()=>headTensor(block.k,head),[block,head]),v=useMemo(()=>headTensor(block.v,head),[block,head]),attention=useMemo(()=>headTensor(block.attention,head),[block,head]),context=useMemo(()=>contextHead(block.context,head),[block,head])
 const x=(head-1)*5.3,opacity=p.phase>=layer*6+2?1:.4
 return <group position={[x,y,0]}>{([['query',q,-1.9],['key',k,0],['value',v,1.9]] as const).map(([id,value,z])=><group key={id}><Grid value={value} width={3.8} depth={1.1} position={[0,-.85,z]} active={phaseLayer(p.phase)===layer&&(p.phase-1)%6<2} opacity={opacity} selection={p.matrix===id&&p.layer===layer&&p.head===head?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:id,layer,head,row,column})}/></group>)}
  <Grid value={attention} width={3.5} depth={3.5} position={[0,.45,0]} probability active={phaseLayer(p.phase)===layer&&(p.phase-1)%6>=2&&(p.phase-1)%6<4} opacity={p.phase>=layer*6+3?1:.42} selection={p.matrix==='attention'&&p.layer===layer&&p.head===head?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'attention',layer,head,row,column})}/>
  <Grid value={context} width={3.8} depth={1.1} position={[0,1.08,0]} active={phaseLayer(p.phase)===layer&&(p.phase-1)%6===3} opacity={p.phase>=layer*6+4?1:.4} selection={p.matrix==='context'&&p.layer===layer&&p.column>=head*16&&p.column<(head+1)*16?[p.row,p.column-head*16]:undefined} onPick={(row,column)=>p.onPick({matrix:'context',layer,head,row,column:column+head*16})}/>
  {labels&&<Caption position={[0,.7,2.2]} text={`H${head+1}${p.head===head?' · QKV':''}`} small/>}
 </group>
}
function Network(p:SceneProps){
 const selection=(matrix:MatrixKey,layer=p.layer):[number,number]|undefined=>p.matrix===matrix&&p.layer===layer?[p.row,p.column]:undefined
 return <group>
  <Grid value={p.trace.embedding} width={14.7} depth={3.4} position={[0,-11.3,0]} active={p.phase===0} selection={p.matrix==='embedding'?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'embedding',layer:0,head:p.head,row,column})}/>
  {p.labels&&<Caption position={[0,-11.2,3.0]} text={p.tx('词元 + 位置')}/>}
  {p.trace.blocks.map((b,layer)=>{const y=(layer-1)*6.3;return <group key={layer}>
   <mesh position={[0,y-2.2,0]}><boxGeometry args={[17.4,.055,7.7]}/><meshStandardMaterial color="#49616f" metalness={.7} roughness={.4} transparent opacity={.10}/></mesh>
   <Pipe points={[[-8.85,y-2.15,-3.9],[8.85,y-2.15,-3.9],[8.85,y-2.15,3.9],[-8.85,y-2.15,3.9],[-8.85,y-2.15,-3.9]]} color={phaseLayer(p.phase)===layer?'#c2ad88':'#526e7c'} radius={phaseLayer(p.phase)===layer?.025:.014} opacity={phaseLayer(p.phase)===layer?.85:.35}/>
   {[-8.85,8.85].map(x=><mesh key={x} position={[x,y+.2,-3.9]}><cylinderGeometry args={[.025,.025,4.7,8]}/><meshStandardMaterial color="#5d7480" metalness={.75} roughness={.4}/></mesh>)}
   {[0,1,2].map(head=><Head key={head} {...{block:b,head,layer,y,p,labels:p.labels&&p.layer===layer}}/>)}
   <Grid value={b.gelu} width={15.6} depth={2.25} position={[0,y+1.7,0]} active={phaseLayer(p.phase)===layer&&(p.phase-1)%6===4} opacity={p.phase>=layer*6+5?1:.46} selection={selection('gelu',layer)} onPick={(row,column)=>p.onPick({matrix:'gelu',layer,head:p.head,row,column})}/>
   <Grid value={b.output} width={14.7} depth={3} position={[0,y+2.65,0]} active={phaseLayer(p.phase)===layer&&(p.phase-1)%6===5} opacity={p.phase>=layer*6+6?1:.46} selection={selection('output',layer)} onPick={(row,column)=>p.onPick({matrix:'output',layer,head:p.head,row,column})}/>
   <Pipe points={[[-8.2,y-2,2.8],[-9.1,y-1,3.1],[-9.1,y+2,3.1],[-7.6,y+2.65,2.6]]} opacity={p.layer===layer?.8:.4}/>
   <Pipe points={[[8.2,y-2,-2.8],[9.1,y-1,-3.1],[9.1,y+2,-3.1],[7.6,y+2.65,-2.6]]} color="#7d9eae" opacity={.4}/>
   {p.labels&&<><Caption position={[-10.3,y+.1,2.7]} text={p.tx(BLOCK_NAMES[layer])} panel alignLeft/>{p.layer===layer&&<Caption position={[9.7,y+1.7,0]} text="FFN / 192" small panel/>}</>}
  </group>})}
  <Grid value={p.trace.probabilities} width={7.2} depth={3.4} probability active={p.phase>=19} position={[0,11.7,0]} selection={p.matrix==='probabilities'?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'probabilities',layer:2,head:p.head,row,column})}/>
  {p.labels&&<Caption position={[0,12.1,3.2]} text="P(A) / P(B) / P(C)"/>}
  <mesh position={[-8.85,0,3.9]}><cylinderGeometry args={[.012,.012,23.2,8]}/><meshStandardMaterial color="#7d8e8b" transparent opacity={.55} metalness={.6} roughness={.4}/></mesh>
  {[-8.65,8.65].map(x=><mesh key={x} position={[x,0,-3.8]}><cylinderGeometry args={[.018,.018,23.2,8]}/><meshStandardMaterial color="#69808d" metalness={.8} roughness={.45}/></mesh>)}
 </group>
}
function AttentionView(p:SceneProps){
 const b=p.trace.blocks[p.layer],q=useMemo(()=>headTensor(b.q,p.head),[b,p.head]),k=useMemo(()=>headTensor(b.k,p.head),[b,p.head]),v=useMemo(()=>headTensor(b.v,p.head),[b,p.head]),a=useMemo(()=>headTensor(b.attention,p.head),[b,p.head]),n=p.trace.ids.length,row=Math.min(p.row,n-1),keyRow=p.matrix==='attention'||p.matrix==='scores'?Math.min(p.column,n-1):row
 return <group>
  <Grid value={q} width={4.8} depth={3.4} active highlightRow={row} position={[-4.8,1.8,-3]} onPick={(row,column)=>p.onPick({matrix:'query',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={k} width={4.8} depth={3.4} highlightRow={keyRow} position={[4.8,1.8,-3]} onPick={(row,column)=>p.onPick({matrix:'key',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={a} width={6.6} depth={6.6} position={[0,0,1.2]} probability active highlightRow={row} selection={[row,keyRow]} onPick={(row,column)=>p.onPick({matrix:'attention',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={v} width={4.8} depth={3.4} highlightRow={keyRow} position={[0,-2.6,5.6]} onPick={(row,column)=>p.onPick({matrix:'value',layer:p.layer,head:p.head,row,column})}/>
  {Array.from({length:n},(_,s)=>{const weight=a.data[row*n+s];if(weight<.002)return null;return <Pipe key={s} points={[[-2.35,2.08,attentionRowZ(row,n,3.4,-3)],[-1.7,2.7+s*.025,-.6],[(s-(n-1)/2)*6.6/n,.3,attentionRowZ(row,n,6.6,1.2)]]} radius={.012+weight*.09} opacity={s===keyRow?.95:.25+weight*.65} color={s===keyRow?'#e4c797':'#a0c4b2'}/>})}
  {p.labels&&p.trace.ids.map((id,i)=>n>8&&i%2!==0&&i!==row&&i!==keyRow&&i!==n-1?null:<group key={i}><Caption position={[(i-(n-1)/2)*6.6/n,.3,-2.55]} text={String(i)} small/><Caption position={[-3.88,.3,attentionRowZ(i,n,6.6,1.2)]} text={String(i)} small/></group>)}
  <Caption position={[-4.8,2.15,-.4]} text={`QUERY / Q · ${row}:${LETTERS[p.trace.ids[row]]}`} panel/><Caption position={[4.8,2.15,-.4]} text={`KEY / K · ${keyRow}:${LETTERS[p.trace.ids[keyRow]]}`} panel/><Caption position={[0,.4,5.15]} text={p.tx('因果注意力矩阵')} panel/><Caption position={[0,-2.3,8.2]} text={`VALUE / V · ${keyRow}:${LETTERS[p.trace.ids[keyRow]]}`} panel/>
 </group>
}
function ResidualView(p:SceneProps){
 const b=p.trace.blocks[p.layer]
 return <group>{([{matrix:'input' as MatrixKey,value:b.input,x:-6,label:'x'},{matrix:'projection' as MatrixKey,value:b.projection,x:0,label:'Attention(x)'},{matrix:'attentionResidual' as MatrixKey,value:b.attentionResidual,x:6,label:'x + Attention(x)'}]).map(item=><group key={item.x}><Grid value={item.value} width={4.9} depth={5.2} position={[item.x,0,0]} selection={p.matrix===item.matrix?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:item.matrix,layer:p.layer,head:p.head,row,column})}/><Caption position={[item.x,.3,3.6]} text={item.label}/></group>)}
 <Caption position={[-3,1.1,0]} text="+"/><Caption position={[3,1.1,0]} text="="/>
 <Pipe points={[[-8.3,.1,-2.8],[-8.3,2.8,-3.5],[7.9,2.8,-3.5],[8.3,.1,-2.8]]} color="#ccb38d" radius={.045}/>
 </group>
}
function FfnView(p:SceneProps){
 const b=p.trace.blocks[p.layer],column=Math.min(p.column,191),row=Math.min(p.row,p.trace.ids.length-1),pre=b.up.data[row*192+column],post=b.gelu.data[row*192+column]
 const curve=useMemo(()=>Array.from({length:110},(_,i)=>{const x=-4+i/109*8;return [x,gelu(x)-1,-4.8] as [number,number,number]}),[])
 return <group><Grid value={b.ln2} width={3.9} depth={5.5} position={[-7.1,0,0]} onPick={(row,column)=>p.onPick({matrix:'ffnNorm',layer:p.layer,head:p.head,row,column})}/><Grid value={b.gelu} width={8.6} depth={5.5} position={[0,0,0]} selection={[row,column]} onPick={(row,column)=>p.onPick({matrix:'gelu',layer:p.layer,head:p.head,row,column})}/><Grid value={b.down} width={3.9} depth={5.5} position={[7.1,0,0]} onPick={(row,column)=>p.onPick({matrix:'down',layer:p.layer,head:p.head,row,column})}/>
  <Caption position={[-7.1,.4,3.4]} text="48"/><Caption position={[0,.4,3.4]} text="192 / GELU"/><Caption position={[7.1,.4,3.4]} text="48"/>
  <Pipe points={curve} color="#bfa0d2" radius={.025}/><Pipe points={[[-4,-1,-4.8],[4,-1,-4.8]]} color="#526f81" radius={.012}/><Pipe points={[[0,-1.3,-4.8],[0,3.2,-4.8]]} color="#526f81" radius={.012}/>
  {Math.abs(pre)<4&&<mesh position={[pre,post-1,-4.8]}><sphereGeometry args={[.12,16,16]}/><meshBasicMaterial color="#e4cc9f"/></mesh>}
  <Caption position={[0,3.5,-4.8]} text="GELU(x)"/>
  <Pipe points={[[-5.1,.2,0],[-4.65,.8,0],[-4.3,.2,0]]} color="#7eab9f"/><Pipe points={[[4.3,.2,0],[4.65,.8,0],[5.1,.2,0]]} color="#7eab9f"/>
 </group>
}
function MatrixView(p:SceneProps){const value=matrixFor(p.matrix,p.trace,p.model,p.layer,p.head),probability=p.matrix==='attention'||p.matrix==='probabilities';return <group><Grid value={value} width={14} depth={Math.min(12,Math.max(3.5,14*value.shape[0]/value.shape[1]))} probability selection={[p.row,p.column]} onPick={(row,column)=>p.onPick({matrix:p.matrix,layer:p.layer,head:p.head,row,column})}/><Caption position={[0,.5,7.2]} text={`${value.shape[0]} × ${value.shape[1]} / ${value.data.length.toLocaleString('en')} ${p.tx('个真实数值')}`}/></group>}
function Rig({view,revision}:{view:View;revision:number}){const controls=useRef<CameraControls>(null),{size}=useThree();useEffect(()=>{const c=controls.current;if(!c)return;const pose=sceneCamera(view,size.width/Math.max(1,size.height));void c.setLookAt(...pose.position,...pose.target,true)},[view,revision,size.width,size.height]);return <CameraControls ref={controls} makeDefault minDistance={2} maxDistance={220} dollySpeed={.65} minPolarAngle={.1} maxPolarAngle={Math.PI-.1}/>}

const Studio=memo(function Studio(){return <><ambientLight intensity={.85}/><directionalLight position={[9,18,12]} intensity={3.5}/><directionalLight position={[-14,5,5]} intensity={1.7} color="#a3c6de"/><directionalLight position={[3,5,-16]} intensity={2.5} color="#e4c5a2"/><Environment resolution={64}><Lightformer position={[0,14,4]} scale={[15,7,1]} intensity={2.8}/><Lightformer position={[-12,2,-3]} rotation={[0,Math.PI/2,0]} scale={[5,18,1]} intensity={2}/></Environment></>})
function Cursor({view,phase}:{view:View;phase:number}){return view==='network'?<group position={[-8.85,phasePosition(phase),3.9]}><mesh><sphereGeometry args={[.13,16,12]}/><meshBasicMaterial color="#eed6a8"/></mesh><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.014,.014,.8,8]}/><meshBasicMaterial color="#cfb98f"/></mesh></group>:null}

export function LlmScene(p:SceneProps){useEffect(()=>()=>{document.body.style.cursor=''},[]);return <Canvas dpr={[1,1.6]} camera={{position:[26,18,35],fov:34,near:.05,far:240}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onPointerDown={p.onInteract} onWheel={p.onInteract}><Rig view={p.view} revision={p.revision}/><Studio/>{p.view==='network'?<Network {...p}/>:p.view==='attention'?<AttentionView {...p}/>:p.view==='ffn'?<FfnView {...p}/>:p.view==='residual'?<ResidualView {...p}/>:<MatrixView {...p}/>}<Cursor phase={p.phase} view={p.view}/></Canvas>}
