import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, type PerspectiveCamera } from 'three'

/** View-depth folds and silhouettes, including analytic PDB atom depth. No
 * extra geometry pass. The stroke becomes lighter and finer behind the focus. */
export function PigmentContours() {
  const effect=useMemo(()=>new Effect('PlantPigmentContours',`
    uniform vec2 inkPixel;uniform float inkNear;uniform float inkFar;
    float inkZ(float d){return inkNear*inkFar/(inkFar-(inkFar-inkNear)*d);}
    void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
      float d=inkZ(readDepth(uv));float jump=0.;
      jump=max(jump,abs(inkZ(readDepth(uv+vec2(inkPixel.x,0.)))-d));
      jump=max(jump,abs(inkZ(readDepth(uv-vec2(inkPixel.x,0.)))-d));
      jump=max(jump,abs(inkZ(readDepth(uv+vec2(0.,inkPixel.y)))-d));
      jump=max(jump,abs(inkZ(readDepth(uv-vec2(0.,inkPixel.y)))-d));
      float ink=smoothstep(.0035,.016,jump/max(1.,d));
      outputColor=vec4(mix(inputColor.rgb,inputColor.rgb*.49,ink*.47),inputColor.a);
    }`,{blendFunction:BlendFunction.NORMAL,attributes:EffectAttribute.DEPTH,uniforms:new Map<string,Uniform>([['inkPixel',new Uniform(new Vector2(1/1600,1/1000))],['inkNear',new Uniform(.1)],['inkFar',new Uniform(2200)]])}),[])
  useFrame(({camera,size,gl})=>{
    const c=camera as PerspectiveCamera
    effect.uniforms.get('inkPixel')!.value.set(1/(size.width*gl.getPixelRatio()),1/(size.height*gl.getPixelRatio()))
    effect.uniforms.get('inkNear')!.value=c.near;effect.uniforms.get('inkFar')!.value=c.far
  })
  useEffect(()=>()=>effect.dispose(),[effect])
  return <primitive object={effect} dispose={null} />
}
