import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { Terrain } from './Terrain'
import { ChongqingRiver } from './ChongqingRiver'

/** Clear colour and fog. The ACES pass maps this to the site's page base
 * #07090b on screen, so the canvas shows no frame against the page. */
export const MODEL_BACKGROUND = '#181b1d'
/** Key light: high from one side of the default views, so decks cast visible
 * shadows across the ground instead of straight down beneath themselves. */
export const MODEL_SUN = new T.Vector3(-430, 560, 400).normalize()
const RIM_COLOR = new T.Color('#c4cdd6')

/** Dark plaster: the existing highest-deck field gives contact shading and a
 * short height-field march toward the key light gives each deck its shadow.
 * Higher surfaces are lighter, so stacked levels separate at a glance. No
 * shadow-map pass and no geometry changes. N8AO supplies local occlusion. */
export function modelMaterial(color:string,roof:T.Texture,{heights=[0,12],rim=0,ground=false}:{heights?:readonly [number,number];rim?:number;ground?:boolean}={}){
 const m=new T.MeshStandardMaterial({color,roughness:1,metalness:0})
 m.onBeforeCompile=s=>{
  s.uniforms.deckRoof={value:roof}
  s.uniforms.sunDirection={value:MODEL_SUN}
  s.uniforms.heightRange={value:new T.Vector2(heights[0],Math.max(heights[0]+12,heights[1]))}
  s.uniforms.rimColor={value:RIM_COLOR}
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 modelWorld; varying vec3 modelNormal;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 modelPosition=vec4(transformed,1.0); vec3 modelObjectNormal=objectNormal;
   #ifdef USE_INSTANCING
    modelPosition=instanceMatrix*modelPosition; modelObjectNormal=mat3(instanceMatrix)*modelObjectNormal;
   #endif
   modelWorld=(modelMatrix*modelPosition).xyz; modelNormal=normalize(mat3(modelMatrix)*modelObjectNormal);`)
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D deckRoof; uniform vec3 sunDirection; uniform vec2 heightRange; uniform vec3 rimColor; varying vec3 modelWorld; varying vec3 modelNormal;').replace('#include <opaque_fragment>',`vec2 uv=(modelWorld.xz+1800.0)/3600.0; float shade=0.0;
   for(int i=0;i<5;i++){vec2 off=i==0?vec2(0):i==1?vec2(1,0):i==2?vec2(-1,0):i==3?vec2(0,1):vec2(0,-1);float height=texture2D(deckRoof,uv+off*.0008).r;shade+=step(modelWorld.y+2.2,height);}
   float castShade=0.0;
   vec2 sunPlan=normalize(sunDirection.xz); float sunRise=sunDirection.y/length(sunDirection.xz);
   for(int i=1;i<=16;i++){float d=float(i)*(1.4+float(i)*.22);float deck=texture2D(deckRoof,uv+sunPlan*d/3600.0).r;castShade=max(castShade,smoothstep(.4,1.6,deck-(modelWorld.y+.35+d*sunRise)));}
   float inside=step(abs(modelWorld.x),1790.0)*step(abs(modelWorld.z),1790.0);
   outgoingLight*=(1.0-shade*.09)*(1.0-castShade*inside*${ground ? '.55' : '.5'});
   ${ground ? '' : `float lift=smoothstep(heightRange.x,heightRange.y,modelWorld.y);
   outgoingLight*=mix(.74,1.32,lift);`}
   ${rim ? `vec3 viewDirection=normalize(cameraPosition-modelWorld);
   float rimEdge=pow(1.0-abs(dot(normalize(modelNormal),viewDirection)),3.0);
   outgoingLight+=rimColor*rimEdge*${rim.toFixed(3)};` : ''}
   #include <opaque_fragment>`)
 }
 m.customProgramCacheKey=()=>`road-plaster-v1-${rim}-${ground}`
 return m
}

/** Lowest and highest physical road level, used by every plaster surface. */
export function deckHeights(network:Network):[number,number]{
 let low=Infinity,high=-Infinity
 for(const road of network.carriageways)for(const p of road.points)if(Math.abs(p.x)<900&&Math.abs(p.z)<900){low=Math.min(low,p.y);high=Math.max(high,p.y)}
 return Number.isFinite(low)?[low,high]:[0,12]
}

/** Faint 50 m site grid on the ground; terrain adds 10 m contours. */
function groundMaterial(roof:T.Texture,contours:boolean){
 const m=modelMaterial('#2b3138',roof,{ground:true})
 const base=m.onBeforeCompile
 m.onBeforeCompile=(s,r)=>{
  base(s,r)
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`vec2 cell=modelWorld.xz/50.0; vec2 gridLine=abs(fract(cell-.5)-.5)/max(fwidth(cell),vec2(1e-4));
   float grid=(1.0-min(min(gridLine.x,gridLine.y),1.0))*(1.0-smoothstep(600.0,2400.0,length(cameraPosition.xz-modelWorld.xz)));
   outgoingLight+=vec3(.010,.013,.017)*grid;
   ${contours ? `float level=modelWorld.y/10.0; float contour=1.0-min(abs(fract(level-.5)-.5)/max(fwidth(level),1e-4),1.0);
   outgoingLight+=vec3(.012,.016,.020)*contour;` : ''}
   #include <opaque_fragment>`)
 }
 m.customProgramCacheKey=()=>`road-plaster-ground-v1-${contours}`
 return m
}

export function FocusWorld({network,roof}:{network:Network;roof:T.Texture}){
 const ground=useMemo(()=>groundMaterial(roof,!!network.terrain),[roof,network])
 useEffect(()=>()=>ground.dispose(),[ground])
 return <>
  <color attach="background" args={[MODEL_BACKGROUND]}/>
  <fogExp2 attach="fog" args={[MODEL_BACKGROUND,.00012]}/>
  <hemisphereLight args={['#aebdcc','#0b0e12',.55]}/>
  <directionalLight position={MODEL_SUN.clone().multiplyScalar(900)} color="#fff4e6" intensity={2.1}/>
  <directionalLight position={[480,180,-620]} color="#c3cad2" intensity={.5}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,network.terrain?Math.min(...network.terrain.values)-.5:-.16,0]} material={ground}><planeGeometry args={[30000,30000]}/></mesh>
  <Terrain network={network} material={ground}/>
  {network.id==='huangjuewan'&&<ChongqingRiver/>}
 </>
}
