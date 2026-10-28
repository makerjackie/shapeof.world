import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { cellRadius } from './cell-geometry'
import { cellFold } from './water-geometry'
import { useCutaway } from './cutaway'
import { PaintMaterial } from './illustration'

/** Two radial faces bound a removed wedge. Compartments meet without overlapping
 * coplanar meshes; independent wall/protoplast transforms retain plasmolysis. */
export function CellSlice({ part, opacity, wrinkles, concavity }: {
  part: 'wall' | 'contents'; opacity: number; wrinkles: number; concavity: number
}) {
  const cut=useCutaway(), root=useRef<T.Group>(null)
  const geometry=useMemo(()=>{
    const positions:number[]=[],rest:number[]=[],indices:number[]=[]
    for(let row=0;row<=240;row++) {
      const y=-34.94+row/240*69.88, radius=cellRadius(y), fold=cellFold(y,wrinkles,concavity)
      rest.push(0,y,0,0,y,radius)
      positions.push(0,y,0,0,y,radius*fold)
      if(row<240){const a=row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
    }
    const g=new T.BufferGeometry();g.setAttribute('sliceRest',new T.Float32BufferAttribute(rest,3))
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
  },[wrinkles,concavity])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{if(root.current&&cut)root.current.rotation.y=cut.angle})
  return <group ref={root}>{[-1,1].map((side)=><mesh key={side} geometry={geometry} rotation={[0,side*Math.PI/3,0]} name={`cell-cut-${part}`}>
    <PaintMaterial color={part==='wall'?'#baa744':'#7c69b7'} forceSinglePass transparent opacity={opacity} side={T.DoubleSide}
      customProgramCacheKey={()=>`cell-wedge-${part}-${side}`} onBeforeCompile={shader=>{
        shader.uniforms.faceFromWorld={value:cut?.fromWorld??new T.Matrix4()}
        shader.vertexShader='uniform mat4 faceFromWorld; varying vec3 cellPoint; attribute vec3 sliceRest; varying vec3 slicePoint;\n'+shader.vertexShader
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nslicePoint=sliceRest;')
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ncellPoint=(faceFromWorld*modelMatrix*vec4(transformed,1.)).xyz;')
        shader.fragmentShader='varying vec3 cellPoint; varying vec3 slicePoint;\n'+shader.fragmentShader
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float cap=max(0.,abs(slicePoint.y)-23.)/12.;
          float radius=15.*sqrt(max(.00001,1.-cap*cap))*(.985+.015*cos(slicePoint.y*.14));
          float boundary=radius-slicePoint.z;
          ${part==='wall'?`
            if(boundary>.72)discard;
            float fibers=.5+.5*sin(slicePoint.y*18.+sin(slicePoint.z*9.)*1.6);
            diffuseColor.rgb*=mix(.38,1.,smoothstep(.2,.65,fibers));
            if(boundary<.13)diffuseColor.rgb*=.23;
          `:`
            if(boundary<.72 || distance(cellPoint,vec3(-8.3,-10.,7.7))<4.1)discard;
            if(boundary<.90)diffuseColor.rgb=vec3(.025,.065,.12);
            float vy=slicePoint.y/.94;
            float vc=max(0.,abs(vy)-23.)/12.;
            float vr=15.*sqrt(max(.00001,1.-vc*vc))*(.985+.015*cos(vy*.14))*.80;
            float inside=vr-slicePoint.z;
            if(inside>0.)diffuseColor.rgb=inside<.20?vec3(.2,.48,.52):vec3(.011,.028,.03);
            else {
              vec2 tile=floor(slicePoint.zy*17.);
              float n=fract(sin(dot(tile,vec2(12.9898,78.233)))*43758.5453);
              diffuseColor.rgb*=.66+.45*n;
              float strands=abs(sin(slicePoint.y*3.+sin(slicePoint.z*7.)*.8));
              float branching=abs(sin(slicePoint.z*4.+sin(slicePoint.y*2.)*1.4));
              float er=1.-smoothstep(.035,.12,min(strands,branching));
              diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.18,.43),er);
            }
          `}
          diffuseColor.rgb*=${side===-1?'.96':'.66'};
        `)
      }} />
  </mesh>)}</group>
}
