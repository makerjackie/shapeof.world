import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { Terrain } from './Terrain'

/** Reuse the existing highest-deck field for soft contact shading. Five taps,
 * no shadow-map pass and no geometry changes. N8AO supplies local occlusion. */
export function modelMaterial(color:string,roof:T.Texture){
 const m=new T.MeshStandardMaterial({color,roughness:1})
 m.onBeforeCompile=s=>{
  s.uniforms.deckRoof={value:roof}
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 modelWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nmodelWorld=(modelMatrix*vec4(transformed,1.0)).xyz;')
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D deckRoof; varying vec3 modelWorld;').replace('#include <opaque_fragment>',`vec2 uv=(modelWorld.xz+1800.0)/3600.0; float shade=0.0;
   for(int i=0;i<5;i++){vec2 off=i==0?vec2(0):i==1?vec2(1,0):i==2?vec2(-1,0):i==3?vec2(0,1):vec2(0,-1);float height=texture2D(deckRoof,uv+off*.0008).r;shade+=step(modelWorld.y+2.2,height);}
   outgoingLight*=1.0-shade*.065;
   #include <opaque_fragment>`)
 }
 m.customProgramCacheKey=()=> 'road-focus-v1'
 return m
}
export function FocusWorld({network,roof,day}:{network:Network;roof:T.Texture;day:boolean}){
 const ground=useMemo(()=>modelMaterial(day?'#ede9df':'#293b4b',roof),[day,roof])
 useEffect(()=>()=>ground.dispose(),[ground])
 return <>
  <color attach="background" args={[day?'#eae7e0':'#08121e']}/>
  <fogExp2 attach="fog" args={[day?'#eae7e0':'#08121e',day?.000035:.0001]}/>
  <hemisphereLight args={[day?'#ffffff':'#c9d6e5',day?'#9fa9ad':'#172433',day?1.3:1.3]}/>
  <directionalLight position={[-450,750,-200]} color={day?'#ffffff':'#a9c3df'} intensity={day?1.6:.9}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,network.terrain?Math.min(...network.terrain.values)-.5:-.16,0]} material={ground}><planeGeometry args={[30000,30000]}/></mesh>
  <Terrain network={network} material={ground}/>
 </>
}
