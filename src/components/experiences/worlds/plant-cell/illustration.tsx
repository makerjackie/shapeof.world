import type { ThreeElements } from '@react-three/fiber'
import * as T from 'three'

/** One pigment language across all six anatomical scales. */
export const paintState = { focus: { value: 117 }, paper: { value: new T.Color('#eceddc') }, illumination: { value: 1 } }
type CompiledShader = Parameters<T.Material['onBeforeCompile']>[0]
export function illustrateShader(shader: CompiledShader) {
  shader.uniforms.paintFocus = paintState.focus
  shader.uniforms.paintPaper = paintState.paper
  shader.uniforms.paintIllumination = paintState.illumination
  shader.fragmentShader = `uniform float paintFocus; uniform vec3 paintPaper; uniform float paintIllumination;\n${shader.fragmentShader}`
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
    float paintFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
    float paintDepth = clamp((length(vViewPosition) / max(paintFocus,1.0) - .72) / 1.25, 0.0, 1.0);
    float paintBand = smoothstep(-.3,.6,dot(normalize(normal),normalize(vec3(-.35,.65,.8))));
    float paintWidth = mix(2.0,.7,paintDepth);
    float paintWobble = .88 + .12*sin(gl_FragCoord.y*.15+sin(gl_FragCoord.x*.12));
    float paintDerivative = max(fwidth(paintFacing),.0005);
    float paintInk = 1.0-smoothstep(paintDerivative*paintWidth*.35,paintDerivative*paintWidth*1.5,paintFacing);
    float paintGrain = fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
    vec3 paintPigment = diffuseColor.rgb * mix(.80,1.02,paintBand) * (.985 + .03*paintGrain) * paintIllumination;
    paintPigment = mix(paintPigment, diffuseColor.rgb*.48, paintInk*.80*paintWobble);
    outgoingLight = mix(paintPigment,paintPaper,paintDepth*.36);
    #include <opaque_fragment>
  `)
}
export function preparePaintMaterial<M extends T.MeshStandardMaterial>(material: M): M {
  const compile = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => { compile.call(material, shader, renderer); illustrateShader(shader) }
  material.customProgramCacheKey = () => `${previousKey}-plant-pigment-v1`
  return material
}
export function PaintMaterial(props: ThreeElements['meshStandardMaterial']) {
  const compile=props.onBeforeCompile as T.Material['onBeforeCompile']|undefined
  const cache=props.customProgramCacheKey as (()=>string)|undefined
  return <meshStandardMaterial {...props} roughness={1} metalness={0} customProgramCacheKey={()=>`${cache?.()??compile?.toString()??'plain'}-plant-pigment-v1`} onBeforeCompile={(shader,renderer)=>{compile?.(shader,renderer);illustrateShader(shader)}} />
}
export const PROTEIN_COLORS: Record<string,string> = {
  '3JCU':'#78a69d','5L8R':'#b39ac0','6RQF':'#d0a478','1RWT':'#a9bc77',
  '8RUC':'#87a9b3','1AG6':'#d9bd7a','1A70':'#c29b79','1FNB':'#ba9dbb','6FKF':'#d59ba8',
}
export const ATP_PIGMENTS = ['#829eb5','#dda0ab','#ca8e9e','#b0adc9','#8caf9f','#ddbd7e']

/** Analytic atom depth is retained; flat pigment replaces glossy ball lighting. */
export function IllustratedAtomMaterial() {
  return <shaderMaterial vertexShader={`
    varying vec2 sphereUv; varying vec3 centerView; varying vec3 tint; varying float sphereRadius;
    void main(){
      vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
      sphereRadius=length(instanceMatrix[0].xyz);centerView=center.xyz;sphereUv=position.xy;tint=vec3(1.);
      #ifdef USE_INSTANCING_COLOR
      tint=instanceColor;
      #endif
      center.xy+=position.xy*sphereRadius;gl_Position=projectionMatrix*center;
    }`} fragmentShader={`
    uniform mat4 projectionMatrix; varying vec2 sphereUv; varying vec3 centerView; varying vec3 tint; varying float sphereRadius;
    void main(){
      float r2=dot(sphereUv,sphereUv);if(r2>1.)discard;
      vec3 n=vec3(sphereUv,sqrt(1.-r2));float edge=smoothstep(.78,.99,r2);
      vec3 rgb=tint*(.97+.03*n.z);rgb=mix(rgb,tint*.55,edge*.24);gl_FragColor=vec4(rgb,1.);
      vec4 clip=projectionMatrix*vec4(centerView+n*sphereRadius,1.);gl_FragDepth=.5*(clip.z/clip.w)+.5;
      #include <colorspace_fragment>
    }`} />
}
