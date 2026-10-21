import { useMemo } from 'react'
import { Color } from 'three'

/** Analytic sphere on a camera-facing quad, including sphere-surface depth.
 * A low-power geometry LOD: positions, radii, occlusion and instance colors are
 * unchanged. No image textures, external assets, or physical-model shortcuts.
 * Pair with planeGeometry args={[2, 2]} on an InstancedMesh.
 */
export function SphereImpostorMaterial({color='#ffffff'}:{color?:string}) {
  const uniforms=useMemo(()=>({baseColor:{value:new Color(color)}}),[color])
  return <shaderMaterial uniforms={uniforms} vertexShader={`
    varying vec2 sphereUv;
    varying vec3 centerView;
    varying vec3 tint;
    varying float sphereRadius;
    uniform vec3 baseColor;
    void main() {
      vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
      sphereRadius=length(instanceMatrix[0].xyz);
      centerView=center.xyz;
      sphereUv=position.xy;
      tint=baseColor;
      #ifdef USE_INSTANCING_COLOR
        tint*=instanceColor;
      #endif
      center.xy+=position.xy*sphereRadius;
      gl_Position=projectionMatrix*center;
    }
  `} fragmentShader={`
    uniform mat4 projectionMatrix;
    varying vec2 sphereUv;
    varying vec3 centerView;
    varying vec3 tint;
    varying float sphereRadius;
    void main() {
      float r2=dot(sphereUv,sphereUv);
      if(r2>1.0) discard;
      vec3 normal=vec3(sphereUv,sqrt(1.0-r2));
      vec3 light=normalize(vec3(-0.4,0.7,1.0));
      float diffuse=max(dot(normal,light),0.0);
      float gloss=pow(max(dot(normal,normalize(light+vec3(0.0,0.0,1.0))),0.0),48.0);
      vec3 rgb=tint*(0.28+0.64*diffuse)+vec3(0.8,0.95,1.0)*gloss*0.65;
      rgb+=vec3(0.12,0.35,0.45)*pow(1.0-normal.z,3.0)*0.3;
      gl_FragColor=vec4(rgb,1.0);
      vec4 clip=projectionMatrix*vec4(centerView+normal*sphereRadius,1.0);
      gl_FragDepth=0.5*(clip.z/clip.w)+0.5;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `}/>
}
