import * as T from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

/** Paper-white river with sparse brush strokes and quiet, broken reflections. */
export function createInkWater(paper: T.Color, mobile: boolean) {
  const water = new Reflector(new T.PlaneGeometry(2400, 2400, 1, 1), {
    textureWidth: mobile ? 768 : 1536, textureHeight: mobile ? 1024 : 864,
    clipBias: .002, multisample: 0,
    shader: {
      uniforms: { tDiffuse: { value: null }, textureMatrix: { value: new T.Matrix4() }, color: { value: paper }, time: { value: 0 }, paper: { value: paper }, waterInk: { value: new T.Color('#667568') } },
      vertexShader: `uniform mat4 textureMatrix;varying vec4 reflectionUV;varying vec3 wp;
        void main(){reflectionUV=textureMatrix*vec4(position,1.);wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform vec3 paper,waterInk;uniform float time;varying vec4 reflectionUV;varying vec3 wp;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
        void main(){
          float dist=length(cameraPosition-wp),near=1.-smoothstep(22.,150.,dist);
          vec2 uv=reflectionUV.xy/reflectionUV.w;
          float wash=noise(wp.xz*vec2(.09,.7)+vec2(time*.012,-time*.045));
          uv.x+=(wash-.5)*.0011;
          uv.y+=(noise(wp.xz*vec2(.2,1.5)+vec2(time*.015,0.))-.5)*.0004;
          vec3 reflected=texture2D(tDiffuse,uv).rgb*.5+texture2D(tDiffuse,uv+vec2(.0012,0.)).rgb*.25+texture2D(tDiffuse,uv-vec2(.0012,0.)).rgb*.25;
          float grazing=pow(1.-clamp(abs(normalize(cameraPosition-wp).y),0.,1.),2.);
          float broken=smoothstep(.25,.72,noise(wp.xz*vec2(.14,1.9)+vec2(0.,-time*.035)));
          vec3 base=mix(paper,waterInk,.025+wash*.035);
          vec3 col=mix(base,reflected,(.14+.27*grazing)*(.23+broken*.77));
          // Uneven, tapered little brush strokes: quiet water retains paper.
          vec2 grid=wp.xz*vec2(.19,.85);
          float row=floor(grid.y);grid.x+=hash(vec2(row,4.))*7.;
          vec2 cell=floor(grid),f=fract(grid);
          float seed=hash(cell),centre=.3+hash(cell+4.)*.4;
          float curve=(f.x-.5)*(f.x-.5)*.14+sin(time*.6+seed*6.28)*.012;
          float width=max(fwidth(grid.y)*.9,.016);
          float stroke=(1.-smoothstep(width,width*2.,abs(f.y-centre-curve)));
          stroke*=smoothstep(.06,.22,f.x)*(1.-smoothstep(.58,.93,f.x))*step(.67,seed);
          col=mix(col,waterInk,stroke*.19*near);
          col=mix(col,paper,smoothstep(300.,900.,dist));
          gl_FragColor=vec4(col,1.);
          #include <colorspace_fragment>
        }`,
    },
  })
  water.position.set(0, -.06, -280); water.rotation.x = -Math.PI / 2
  return water
}
