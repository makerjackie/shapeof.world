import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { cellRadius } from './cell-geometry'
import { cellFold } from './water-geometry'
import { useCutaway } from './cutaway'
import { PaintMaterial } from './illustration'

/** Opaque cut faces, behind the clipped organelle caps. The wall and contents
 * inherit independent water transforms, so plasmolysis opens a real gap. */
export function CellSlice({ part, opacity, wrinkles, concavity }: {
  part: 'wall' | 'contents'; opacity: number; wrinkles: number; concavity: number
}) {
  const cut = useCutaway(), ref = useRef<T.Group>(null)
  const geometry = useMemo(() => {
    const positions: number[] = [], rest: number[] = [], indices: number[] = []
    for (let row = 0; row <= 240; row++) {
      const y = -34.94 + row / 240 * 69.88
      const radius = cellRadius(y)
      const x = Math.sqrt(Math.max(0, radius * radius - 1.2 * 1.2)) * cellFold(y, wrinkles, concavity)
      // Keep the two illustration faces farther apart than the depth-buffer
      // precision at portrait camera distance. A 0.025 µm gap flickered on mobile.
      const z=part === 'wall' ? -1.8 : -1.215
      const rx=Math.sqrt(Math.max(0,radius*radius-1.44))
      rest.push(-rx,y,z,rx,y,z)
      positions.push(-x, y, z, x, y, z)
      if (row < 240) { const a = row * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
    const g = new T.BufferGeometry()
    g.setAttribute('sliceRest',new T.Float32BufferAttribute(rest,3))
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals()
    return g
  }, [wrinkles, concavity, part])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => { if (cut && ref.current) ref.current.rotation.y = cut.angle })
  return <group ref={ref}>
    <mesh geometry={geometry} name={`cell-cut-${part}`}>
      <PaintMaterial color={part === 'wall' ? '#baa744' : '#7c69b7'} transparent opacity={opacity} side={T.DoubleSide}
        customProgramCacheKey={() => `cell-section-${part}`} onBeforeCompile={shader => {
          shader.vertexShader = 'attribute vec3 sliceRest; varying vec3 slicePoint;\n' + shader.vertexShader
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nslicePoint=sliceRest;')
          shader.fragmentShader = 'varying vec3 slicePoint;\n' + shader.fragmentShader
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            float cap=max(0.,abs(slicePoint.y)-23.)/12.;
            float radius=15.*sqrt(max(.00001,1.-cap*cap))*(.985+.015*cos(slicePoint.y*.14));
            float boundary=sqrt(max(0.,radius*radius-1.44))-abs(slicePoint.x);
            ${part === 'wall' ? `
              float fibers=.5+.5*sin(slicePoint.y*18.+sin(slicePoint.x*9.)*1.6);
              diffuseColor.rgb*=mix(.60,1.,smoothstep(.2,.65,fibers));
              if(boundary<.13)diffuseColor.rgb*=.28;
            ` : `
              if(boundary<.65)discard;
              if(boundary<.84)diffuseColor.rgb=vec3(.035,.085,.14);
              // A visibly bounded tonoplast surrounds an intentionally empty lumen.
              float vy=slicePoint.y/.94;
              float vc=max(0.,abs(vy)-23.)/12.;
              float vr=15.*sqrt(max(.00001,1.-vc*vc))*(.985+.015*cos(vy*.14))*.80;
              float inside=min(vr-abs(slicePoint.x),length(slicePoint.xy-vec2(-8.9,-12.))-4.7);
              if(inside>0.)diffuseColor.rgb=inside<.17?vec3(.10,.30,.42):vec3(.69,.85,.90);
              else {
                // Subpixel molecular crowding: texture, never micron-sized ribosomes.
                vec2 tile=floor(slicePoint.xy*17.);
                float n=fract(sin(dot(tile,vec2(12.9898,78.233)))*43758.5453);
                diffuseColor.rgb*=.70+.48*n;
                float strands=abs(sin(slicePoint.y*3.+sin(slicePoint.x*7.)*.8));
                float branching=abs(sin(slicePoint.x*4.+sin(slicePoint.y*2.)*1.4));
                float distanceToER=min(strands,branching);
                float aa=max(fwidth(distanceToER),.001);
                float er=1.-smoothstep(.07-aa,.07+aa,distanceToER);
                diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.26,.54),er);
                float ribosome=length(fract(slicePoint.xy*32.)-.5);
                diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.12,.34),(1.-smoothstep(.23,.30,ribosome))*.5);
              }
            `}
          `)
        }} />
    </mesh>
  </group>
}
