import { useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as T from 'three'
import { comparisonLayout } from './layout'
import { isWorldPaused } from '~/lib/world-playback'
import { C, blackbodyRGB, displayRadius, massBudget, massShells, type Sample, type Track, type XYZTable } from './model'

const vertex=`varying vec3 vP; varying vec3 vN; varying vec3 vView; void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`
const noise=`float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.07+3.4;a*=.5;}return n;}`
// Original illustrative granulation. The angular shading follows the actual view
// direction; the coefficient is an artistic choice, not a fitted atmosphere.
const surface=`uniform float time;uniform float cut;uniform vec3 tint;varying vec3 vP;varying vec3 vN;varying vec3 vView;${noise}
void main(){
 if(cut>.5&&vP.z>0.&&vP.x>0.)discard;
 vec3 p=normalize(vP);float t=time*.025;
 float convection=fbm(p*6.5+vec3(t,0.,t*.35));
 float cells=noise(p*86.+convection*2.2+vec3(0.,t*1.8,0.));
 float fine=noise(p*132.+vec3(t*.5));
 float granulation=smoothstep(.14,.83,cells)*.72+fine*.28;
 float mu=max(0.,dot(normalize(vN),normalize(vView)));
 float limb=.32+.68*pow(mu,.48);
 vec3 col=tint*(.48+.55*granulation)*(.88+.20*convection)*limb;
 gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(.4545)),1.);
}`
const cutFace=`uniform vec3 tint;uniform float selected;varying vec3 vP;varying vec3 vN;${noise}void main(){float r=length(vP);float n=fbm(vP*18.);float veins=noise(vP*85.+n*2.);float shading=.53+.32*(1.-r)+.22*n+.06*veins;vec3 c=mix(tint,vec3(1.,.87,.63),selected*.24)*shading;gl_FragColor=vec4(pow(c,vec3(.4545)),1.);}`
const halo=`uniform vec3 tint;uniform float strength;varying vec3 vN;varying vec3 vView;void main(){float f=1.-abs(dot(normalize(vN),normalize(vView)));gl_FragColor=vec4(tint,pow(f,3.)*(1.-f)*strength*4.);}`
const pointsVertex=`attribute float size;varying float vA;uniform float time;uniform float motion;void main(){vec3 p=position;float r=length(p);float a=time*.02*motion;float cs=cos(a),sn=sin(a);p.xz=mat2(cs,-sn,sn,cs)*p.xz;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*160./(-mv.z),1.,24.);vA=clamp(1.-r/10.,.08,1.);}`
const pointsFragment=`uniform vec3 tint;uniform float opacity;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,pow(1.-d,2.6)*opacity*vA);}`
function Stars(){
 const geometry=useMemo(()=>{let seed=31;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);const p=[];for(let i=0;i<1700;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=40+rand()*50;p.push(r*Math.sqrt(1-z*z)*Math.cos(a),r*z,r*Math.sqrt(1-z*z)*Math.sin(a))}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));return g},[])
 useEffect(()=>()=>geometry.dispose(),[geometry]);return <points geometry={geometry}><pointsMaterial size={.055} color="#bfc6d8" sizeAttenuation transparent opacity={.52} depthWrite={false}/></points>
}
function Gas({amount,birth,paused}:{amount:number;birth:boolean;paused:boolean}){
 const material=useRef<T.ShaderMaterial>(null),clock=useRef(0)
 const geometry=useMemo(()=>{let seed=91;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);const p=[],sz=[];for(let i=0;i<6000;i++){const a=rand()*Math.PI*2,z=rand()*2-1,clump=.75+.25*Math.sin(a*5+z*5),r=2.3+rand()**.55*5.7;const equator=Math.sqrt(1-z*z);p.push(r*equator*Math.cos(a)*clump,r*z*.70,r*equator*Math.sin(a));sz.push(.15+rand()*.8)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('size',new T.Float32BufferAttribute(sz,1));return g},[])
 useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame((_,dt)=>{if(!paused&&!isWorldPaused())clock.current+=Math.min(dt,.1);if(material.current){material.current.uniforms.time.value=clock.current;material.current.uniforms.opacity.value=birth?.40:Math.min(.65,amount*.6)}})
 return <points geometry={geometry}><shaderMaterial ref={material} vertexShader={pointsVertex} fragmentShader={pointsFragment} uniforms={{time:{value:0},motion:{value:birth?.2:1},tint:{value:new T.Color(birth?'#6f8aa3':'#c38a69')},opacity:{value:0}}} transparent depthWrite={false} blending={T.AdditiveBlending}/></points>
}
function Star({sample,track,cmf,cut,paused,scale,reference=1,onShell,selectedShell,shellLabels}:{sample:Sample;track:Track;cmf:XYZTable;cut:boolean;paused:boolean;scale:'adaptive'|'linear';reference?:number;onShell:(id:string)=>void;selectedShell:string;shellLabels:Record<string,string>}){
 const mat=useRef<T.ShaderMaterial>(null),clock=useRef(0),row=sample.row
 const color=useMemo(()=>new T.Color(...blackbodyRGB(10**row[C.teff],cmf)),[cmf,row])
 const radius=displayRadius(row[C.radius],scale,reference),shells=massShells(row),budget=massBudget(track,row)
 useFrame((_,dt)=>{if(!paused&&!isWorldPaused())clock.current+=Math.min(dt,.1);if(mat.current)mat.current.uniforms.time.value=clock.current})
 return <group><group rotation={[.15,-.22,-.11]} scale={radius}>
 <mesh onClick={e=>{const q=e.object.worldToLocal(e.point.clone());if(cut&&q.z>0&&q.x>0)return;e.stopPropagation();onShell('surface')}}><sphereGeometry args={[1,96,64]}/><shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={surface} uniforms={{time:{value:clock.current},cut:{value:cut?1:0},tint:{value:color}}} side={T.DoubleSide} toneMapped={false}/></mesh>
 {!cut&&<mesh scale={1.035}><sphereGeometry args={[1,64,40]}/><shaderMaterial vertexShader={vertex} fragmentShader={halo} uniforms={{tint:{value:color},strength:{value:.22}}} transparent depthWrite={false} side={T.BackSide} blending={T.AdditiveBlending}/></mesh>}
 {cut&&[0,1].map(face=><group key={face} rotation={face?[0,-Math.PI/2,0]:[0,0,0]} position={face?[.003,0,0]:[0,0,.003]}>
 {shells.map(shell=>{const inner=Math.cbrt(shell.innerMass/row[C.mass]),outer=Math.cbrt(shell.outerMass/row[C.mass]);return <mesh key={shell.id} onClick={e=>{e.stopPropagation();onShell(shell.id)}}><ringGeometry args={[inner,outer,96,1,-Math.PI/2,Math.PI]}/><shaderMaterial vertexShader={vertex} fragmentShader={cutFace} uniforms={{tint:{value:new T.Color(shell.color)},selected:{value:selectedShell===shell.id?1:0}}} side={T.DoubleSide} toneMapped={false}/></mesh>})}
 <mesh position={[0,0,.004]}><circleGeometry args={[.115,64,-Math.PI/2,Math.PI]}/><meshBasicMaterial color="#ffe8b1" toneMapped={false}/></mesh>
 {shells.map(shell=><mesh key={'line'+shell.id} position={[0,0,.002]}><ringGeometry args={[Math.max(0,Math.cbrt(shell.outerMass/row[C.mass])-(selectedShell===shell.id?.006:.002)),Math.cbrt(shell.outerMass/row[C.mass]),96,1,-Math.PI/2,Math.PI]}/><meshBasicMaterial color={selectedShell===shell.id?'#fff3c9':'#5c3b2a'} side={T.DoubleSide} transparent opacity={selectedShell===shell.id?1:.6}/></mesh>)}
 </group>)}
 {cut&&shells.filter(s=>s.id===selectedShell).map(s=><Html key={s.id} position={[.54,-.36,.04]} center zIndexRange={[3,0]} style={{pointerEvents:'none'}}><div className="sl-shell-tag"><span>{shellLabels[s.id]}</span><b>{s.mass.toFixed(3)} M☉</b><small>q {(s.innerMass/row[C.mass]).toFixed(3)}–{(s.outerMass/row[C.mass]).toFixed(3)}</small></div></Html>)}
 </group><Gas amount={budget.lost/budget.initial} birth={sample.phase==='pms'} paused={paused}/></group>
}
function Camera({reset,compare}:{reset:number;compare:boolean}){const{camera,size}=useThree();useEffect(()=>{const portrait=size.width/size.height<1;camera.position.set(.2,1.1,compare?(portrait?20.5:16.5):(portrait?11.6:7.1));camera.lookAt(0,0,0);if(camera instanceof T.PerspectiveCamera){if(!compare&&size.width/size.height>1.3)camera.setViewOffset(size.width,size.height,-size.width*.105,0,size.width,size.height);else camera.clearViewOffset();camera.updateProjectionMatrix()}},[reset,camera,compare,size.width,size.height]);return null}
export type SceneProps={sample:Sample;track:Track;tracks:Track[];cmf:XYZTable;cut:boolean;paused:boolean;scale:'adaptive'|'linear';compare:boolean;samples:Sample[];onShell:(id:string)=>void;onMass:(mass:number)=>void;selectedShell:string;reset:number;labels:string[];shellLabels:Record<string,string>;remnant:'none'|'neutron'|'black';remnantLabel:string}
function Remnant({type,label,paused}:{type:'neutron'|'black';label:string;paused:boolean}){
 const beam=useRef<T.Group>(null);useFrame((_,dt)=>{if(beam.current&&!paused&&!isWorldPaused())beam.current.rotation.z+=dt*.2})
 return <group><mesh><sphereGeometry args={[type==='black'?.62:.42,72,48]}/><meshBasicMaterial color={type==='black'?'#010207':'#dde9f5'}/></mesh><mesh rotation={[1.05,0,.25]}><torusGeometry args={[1.15,.028,12,180]}/><meshBasicMaterial color="#f4c683" transparent opacity={.8}/></mesh>
 {type==='black'?<mesh rotation={[1.05,0,.25]}><ringGeometry args={[.85,2.15,128]}/><meshBasicMaterial color="#a16b40" side={T.DoubleSide} transparent opacity={.18} depthWrite={false}/></mesh>:<group ref={beam} rotation={[0,0,.3]}>{[-1,1].map(s=><mesh key={s} position={[0,s*1.9,0]} rotation={s<0?[Math.PI,0,0]:[0,0,0]}><coneGeometry args={[.38,3.2,48,1,true]}/><meshBasicMaterial color="#91c3f0" transparent opacity={.07} side={T.DoubleSide} depthWrite={false}/></mesh>)}</group>}
 <Html position={[0,-2.45,0]} center zIndexRange={[3,0]} style={{pointerEvents:'none',whiteSpace:'nowrap',color:'#a5b5c5',fontSize:12}}>{label}</Html></group>
}
function Comparison(p:SceneProps & {reference:number}){
 const{size}=useThree(),grid=size.width/size.height<1.15
 const radii=p.samples.map(s=>displayRadius(s.row[C.radius],p.scale,p.reference)),positions=comparisonLayout(radii,grid)
 return <>{p.tracks.map((t,i)=><group key={t.initialMass} position={positions[i]}><Star {...p} track={t} sample={p.samples[i]} reference={p.reference} onShell={id=>{p.onMass(t.initialMass);p.onShell(id)}}/><Html center zIndexRange={[3,0]} position={[0,-radii[i]-.4,0]} style={{color:'#c3bdac',fontSize:11,whiteSpace:'nowrap',pointerEvents:'none'}}>{p.labels[i]}</Html></group>)}</>
}
export function StarScene(p:SceneProps){
 const reference=p.scale==='linear'?Math.max(...(p.compare?p.samples:[p.sample]).map(s=>10**s.row[C.radius]))/1.65:1
 return <Canvas camera={{position:[.2,1.1,7.1],fov:45,near:.01,far:150}} dpr={[1,1.6]} gl={{antialias:true,alpha:false}} onCreated={({gl})=>{gl.setClearColor('#050912')}}><Stars/><Camera reset={p.reset} compare={p.compare}/><OrbitControls makeDefault enablePan minDistance={2.4} maxDistance={26} target={[0,0,0]}/>
 {p.remnant!=='none'?<Remnant type={p.remnant} label={p.remnantLabel} paused={p.paused}/>:p.compare?<Comparison {...p} reference={reference}/>:<Star {...p} reference={reference}/>}</Canvas>
}
