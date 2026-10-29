import {memo,useEffect,useMemo,useRef,type RefObject} from 'react'
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {CameraControls,Environment,Html,Lightformer} from '@react-three/drei'
import * as T from 'three'
import {isWorldPaused} from '~/lib/world-playback'
import {gelu,headTensor,tensorRange,type Model,type Tensor,type Trace} from './model'
import {BLOCK_NAMES,matrixFor,type MatrixKey} from './inspection'

export type View='network'|'attention'|'ffn'|'residual'|'matrix'
export type Selection={matrix:MatrixKey;layer:number;head:number;row:number;column:number}
type SceneProps={model:Model;trace:Trace;view:View;layer:number;head:number;row:number;column:number;matrix:MatrixKey;phase:number;playing:boolean;speed:number;revision:number;labels:boolean;onPick:(p:Selection)=>void;onInteract:()=>void;tx:(s:string)=>string}
const LOW=new T.Color('#668fab'),HIGH=new T.Color('#d4a477'),ZERO=new T.Color('#263c48'),PROB=new T.Color('#a1c5a9')
function colour(value:number,limit:number,probability:boolean){if(!Number.isFinite(value))return new T.Color('#101b25');const t=probability?Math.max(0,value):Math.min(1,Math.abs(value)/limit);return ZERO.clone().lerp(probability?PROB:value>=0?HIGH:LOW,Math.pow(t,.7))}
function Pipe({points,color='#b99970',radius=.025,opacity=.6}:{points:[number,number,number][];color?:string;radius?:number;opacity?:number}){
 const curve=useMemo(()=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),[points])
 return <mesh><tubeGeometry args={[curve,40,radius,5,false]}/><meshStandardMaterial color={color} metalness={.65} roughness={.36} transparent opacity={opacity}/></mesh>
}
function Caption({position,text,small=false}:{position:[number,number,number];text:string;small?:boolean}){return <Html position={position} center distanceFactor={small?26:24} style={{pointerEvents:'none'}}><span className={small?'li-label li-label-small':'li-label'} style={{fontFamily:'ui-monospace,monospace',fontSize:small?8:10,fontWeight:400,color:small?'#789eb3':'#a7bfcd',whiteSpace:'nowrap'}}>{text}</span></Html>}
type GridProps={value:Tensor;width:number;depth:number;probability?:boolean;opacity?:number;selection?:[number,number];onPick?:(r:number,c:number)=>void;position?:[number,number,number]}
const Grid=memo(function Grid({value,width,depth,probability=false,opacity=1,selection,onPick,position=[0,0,0]}:GridProps){
 const mesh=useRef<T.InstancedMesh>(null),[rows,cols]=value.shape,cellX=width/cols,cellZ=depth/rows,range=useMemo(()=>tensorRange(value),[value])
 const heights=useMemo(()=>Array.from(value.data,v=>Number.isFinite(v)?.025+.19*Math.min(1,probability?v:Math.abs(v)/range.absolute):.018),[value,probability,range])
 useEffect(()=>{const object=new T.Object3D();for(let i=0;i<value.data.length;i++){object.position.set((i%cols-(cols-1)/2)*cellX,heights[i]/2,(Math.floor(i/cols)-(rows-1)/2)*cellZ);object.scale.set(cellX*.84,heights[i],cellZ*.82);object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);mesh.current!.setColorAt(i,colour(value.data[i],range.absolute,probability))}mesh.current!.instanceMatrix.needsUpdate=true;if(mesh.current!.instanceColor)mesh.current!.instanceColor.needsUpdate=true},[value,cols,rows,cellX,cellZ,heights,range,probability])
 const pick=(e:ThreeEvent<MouseEvent>)=>{if(e.delta>4||e.instanceId===undefined||!onPick)return;e.stopPropagation();onPick(Math.floor(e.instanceId/cols),e.instanceId%cols)}
 const selected=selection&&selection[0]<rows&&selection[1]<cols?selection:undefined,selectedI=selected?selected[0]*cols+selected[1]:0
 return <group position={position}><mesh position={[0,-.04,0]} receiveShadow><boxGeometry args={[width+.12,.05,depth+.12]}/><meshStandardMaterial color="#182a35" metalness={.35} roughness={.6} transparent opacity={Math.max(.25,opacity*.85)}/></mesh>
  <instancedMesh ref={mesh} args={[undefined,undefined,rows*cols]} onClick={pick} onPointerOver={e=>{if(!onPick)return;e.stopPropagation();document.body.style.cursor='crosshair'}} onPointerOut={()=>{document.body.style.cursor=''}}><boxGeometry args={[1,1,1]}/><meshStandardMaterial metalness={.18} roughness={.45} transparent={opacity<1} opacity={opacity}/></instancedMesh>
  {selected&&<mesh position={[(selected[1]-(cols-1)/2)*cellX,heights[selectedI]/2+.025,(selected[0]-(rows-1)/2)*cellZ]}><boxGeometry args={[cellX*1.08,heights[selectedI]+.07,cellZ*1.08]}/><meshBasicMaterial color="#f0d6ab" wireframe/></mesh>}
 </group>
})
function Head({block,head,layer,y,p,labels}:{block:Trace['blocks'][number];head:number;layer:number;y:number;p:SceneProps;labels:boolean}){
 const q=useMemo(()=>headTensor(block.q,head),[block,head]),k=useMemo(()=>headTensor(block.k,head),[block,head]),v=useMemo(()=>headTensor(block.v,head),[block,head]),attention=useMemo(()=>headTensor(block.attention,head),[block,head])
 const x=(head-1)*3.5,opacity=p.phase>=layer*6+2?1:.4
 return <group position={[x,y,0]}>{([['query',q,-1.9],['key',k,0],['value',v,1.9]] as const).map(([id,value,z])=><group key={id}><Grid value={value} width={2.7} depth={1.1} position={[0,-.85,z]} opacity={opacity} selection={p.matrix===id&&p.layer===layer&&p.head===head?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:id,layer,head,row,column})}/></group>)}
  <Grid value={attention} width={2.5} depth={2.5} position={[0,.45,0]} probability opacity={p.phase>=layer*6+3?1:.42} selection={p.matrix==='attention'&&p.layer===layer&&p.head===head?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'attention',layer,head,row,column})}/>
  {labels&&<Caption position={[0,.7,2.2]} text={`QKV / H${head+1}`} small/>}
 </group>
}
function Network(p:SceneProps){
 const selection=(matrix:MatrixKey,layer=p.layer):[number,number]|undefined=>p.matrix===matrix&&p.layer===layer?[p.row,p.column]:undefined
 return <group>
  <Grid value={p.trace.embedding} width={10.4} depth={3.4} position={[0,-11.3,0]} selection={p.matrix==='embedding'?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'embedding',layer:0,head:p.head,row,column})}/>
  {p.labels&&<Caption position={[0,-11.2,3.0]} text={p.tx('词元 + 位置')}/>}
  {p.trace.blocks.map((b,layer)=>{const y=(layer-1)*6.3;return <group key={layer}>
   <mesh position={[0,y-2.2,0]}><boxGeometry args={[12.5,.055,7.7]}/><meshStandardMaterial color="#49616f" metalness={.7} roughness={.4} transparent opacity={.12}/></mesh>
   {[0,1,2].map(head=><Head key={head} {...{block:b,head,layer,y,p,labels:p.labels}}/>)}
   <Grid value={b.gelu} width={11.3} depth={2.25} position={[0,y+1.7,0]} opacity={p.phase>=layer*6+5?1:.46} selection={selection('gelu',layer)} onPick={(row,column)=>p.onPick({matrix:'gelu',layer,head:p.head,row,column})}/>
   <Grid value={b.output} width={10.4} depth={3} position={[0,y+2.65,0]} opacity={p.phase>=layer*6+6?1:.46} selection={selection('output',layer)} onPick={(row,column)=>p.onPick({matrix:'output',layer,head:p.head,row,column})}/>
   <Pipe points={[[-5.8,y-2,2.8],[-6.6,y-1,3.1],[-6.6,y+2,3.1],[-5.4,y+2.65,2.6]]} opacity={p.layer===layer?.8:.4}/>
   <Pipe points={[[5.8,y-2,-2.8],[6.6,y-1,-3.1],[6.6,y+2,-3.1],[5.4,y+2.65,-2.6]]} color="#7d9eae" opacity={.4}/>
   {p.labels&&<><Caption position={[-7.3,y+.25,0]} text={p.tx(BLOCK_NAMES[layer])}/><Caption position={[0,y+2,3.0]} text="FFN / 48 → 192 → 48" small/></>}
  </group>})}
  <Grid value={p.trace.probabilities} width={5.4} depth={3.4} probability position={[0,11.7,0]} selection={p.matrix==='probabilities'?[p.row,p.column]:undefined} onPick={(row,column)=>p.onPick({matrix:'probabilities',layer:2,head:p.head,row,column})}/>
  {p.labels&&<Caption position={[0,12.1,3.2]} text="P(A) / P(B) / P(C)"/>}
  {[-6.15,6.15].map(x=><mesh key={x} position={[x,0,-3.8]}><cylinderGeometry args={[.018,.018,23.2,8]}/><meshStandardMaterial color="#69808d" metalness={.8} roughness={.45}/></mesh>)}
 </group>
}
function AttentionView(p:SceneProps){
 const b=p.trace.blocks[p.layer],q=useMemo(()=>headTensor(b.q,p.head),[b,p.head]),k=useMemo(()=>headTensor(b.k,p.head),[b,p.head]),v=useMemo(()=>headTensor(b.v,p.head),[b,p.head]),a=useMemo(()=>headTensor(b.attention,p.head),[b,p.head]),n=p.trace.ids.length,row=Math.min(p.row,n-1)
 return <group>
  <Grid value={q} width={4.8} depth={3.4} position={[-4.8,1.8,-3]} onPick={(row,column)=>p.onPick({matrix:'query',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={k} width={4.8} depth={3.4} position={[4.8,1.8,-3]} onPick={(row,column)=>p.onPick({matrix:'key',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={a} width={6.6} depth={6.6} position={[0,0,1.2]} probability selection={[row,Math.min(p.column,n-1)]} onPick={(row,column)=>p.onPick({matrix:'attention',layer:p.layer,head:p.head,row,column})}/>
  <Grid value={v} width={4.8} depth={3.4} position={[0,-2.6,5.6]} onPick={(row,column)=>p.onPick({matrix:'value',layer:p.layer,head:p.head,row,column})}/>
  {Array.from({length:n},(_,s)=>{const weight=a.data[row*n+s];if(weight<.002)return null;return <Pipe key={s} points={[[-7.3,1.5,(row-(n-1)/2)*.38],[-4,2.6+s*.035,2.2],[(s-(n-1)/2)*6.6/n,.3,(row-(n-1)/2)*6.6/n+1.2]]} radius={.012+weight*.09} opacity={.2+weight*.7} color="#a0c4b2"/>})}
  <Caption position={[-4.8,2.15,-.4]} text="QUERY / Q"/><Caption position={[4.8,2.15,-.4]} text="KEY / K"/><Caption position={[0,.4,5.4]} text={p.tx('因果注意力矩阵')}/><Caption position={[0,-2.3,8.2]} text="VALUE / V"/>
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
function Rig({view,revision}:{view:View;revision:number}){const controls=useRef<CameraControls>(null),{size}=useThree();useEffect(()=>{const c=controls.current;if(!c)return;const aspect=size.width/Math.max(1,size.height),f=Math.max(1,(view==='network'?.72:1.2)/aspect),eye=view==='network'?[26,18,35]:view==='ffn'?[17,15,25]:view==='matrix'?[8,17,18]:[14,15,24];void c.setLookAt(eye[0]*f,eye[1]*f,eye[2]*f,0,view==='network'?0:-.1,0,true)},[view,revision,size.width,size.height]);return <CameraControls ref={controls} makeDefault minDistance={2} maxDistance={120} dollySpeed={.65} minPolarAngle={.1} maxPolarAngle={Math.PI-.1}/>}
const Studio=memo(function Studio(){return <><ambientLight intensity={.85}/><directionalLight position={[9,18,12]} intensity={3.5}/><directionalLight position={[-14,5,5]} intensity={1.7} color="#a3c6de"/><directionalLight position={[3,5,-16]} intensity={2.5} color="#e4c5a2"/><Environment resolution={64}><Lightformer position={[0,14,4]} scale={[15,7,1]} intensity={2.8}/><Lightformer position={[-12,2,-3]} rotation={[0,Math.PI/2,0]} scale={[5,18,1]} intensity={2}/></Environment></>})
function Cursor({playing,speed,view}:{playing:boolean;speed:number;view:View}){const ref=useRef<T.Mesh>(null),clock=useRef(0);useFrame((_,dt)=>{if(!playing||isWorldPaused())return;clock.current+=Math.min(.05,dt)*speed;if(ref.current)ref.current.position.y=-11.3+(clock.current*.7%23)});return view==='network'?<mesh ref={ref} position={[-6.15,-11.3,-3.8]}><sphereGeometry args={[.08,12,12]}/><meshBasicMaterial color="#d7bd8e"/></mesh>:null}
export function LlmScene(p:SceneProps){useEffect(()=>()=>{document.body.style.cursor=''},[]);return <Canvas dpr={[1,1.6]} camera={{position:[26,18,35],fov:34,near:.05,far:240}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onPointerDown={p.onInteract} onWheel={p.onInteract}><Rig view={p.view} revision={p.revision}/><Studio/>{p.view==='network'?<Network {...p}/>:p.view==='attention'?<AttentionView {...p}/>:p.view==='ffn'?<FfnView {...p}/>:p.view==='residual'?<ResidualView {...p}/>:<MatrixView {...p}/>}<Cursor playing={p.playing} speed={p.speed} view={p.view}/></Canvas>}
