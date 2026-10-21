import * as THREE from 'three'

export function buildBlackholeExtras(): { group: THREE.Group; timedMaterials: THREE.ShaderMaterial[] } {
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.SphereGeometry(5.8, 64, 40), new THREE.MeshBasicMaterial({ color: 0x000000 })))
  const flow = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
    vertexShader: `varying vec2 vDisk; uniform float uTime;
      void main(){
        vDisk=position.xy;
        float r=length(position.xy), a=atan(position.y,position.x);
        float lift=pow(max(0.,r-9.)/28.,1.6);
        vec3 p=vec3(position.x,lift*(4.6*sin(a*2.+.5+uTime*.12)+2.2*cos(a*3.-uTime*.09)),position.y);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: `varying vec2 vDisk; uniform float uFade;
      void main(){
        float r=length(vDisk);
        float inner=exp(-(r-6.6)*.27);
        float fade=smoothstep(6.5,7.,r)*(1.-smoothstep(26.,38.,r));
        // Continuous low emission. Flow is carried by geometry and equations, never pulsed light.
        float light=inner*.028+.006;
        vec3 color=mix(vec3(1.,.38,.07),vec3(1.,.86,.53),inner);
        gl_FragColor=vec4(color*light*fade*uFade,fade*uFade);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  })
  group.add(new THREE.Mesh(new THREE.RingGeometry(6.5, 38, 256, 60), flow))
  const lensMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uInclination: { value: 0 } },
    vertexShader: `varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vWorld; uniform float uFade;
      // Integrate a simplified central deflection. This is a visual approximation,
      // not a Schwarzschild/Kerr geodesic solver. Rays can meet the far disk above/below the shadow.
      vec3 emission(vec3 p){
        float r=length(p.xz);
        float fade=smoothstep(6.6,7.3,r)*(1.-smoothstep(17.,27.,r));
        float temperature=exp(-(r-6.6)*.16);
        vec3 color=mix(vec3(1.,.25,.025),vec3(1.,.88,.6),temperature);
        vec3 velocity=normalize(vec3(-p.z,0.,p.x));
        float doppler=clamp(1.+dot(velocity,normalize(cameraPosition-p))*.25,.75,1.25);
        return color*fade*.28*temperature*doppler;
      }
      void main(){
        // Only trace the strong-lensing region; the wider disk remains real geometry.
        float screenR=length(vWorld);
        if(screenR>14.) discard;
        vec3 pos=cameraPosition, ray=normalize(vWorld-cameraPosition);
        float h2=dot(cross(pos,ray),cross(pos,ray));
        vec3 light=vec3(0.);
        for(int i=0;i<80;i++){
          float r=length(pos);
          if(r<2.23 || r>100.) break;
          float stepSize=clamp(r*.12,.12,4.);
          vec3 old=pos;
          vec3 acceleration=-3.345*h2*pos/pow(r,5.);
          pos+=ray*stepSize+acceleration*stepSize*stepSize*.5;
          float nr=length(pos);
          vec3 nextAcceleration=-3.345*h2*pos/pow(max(nr,1.),5.);
          ray+=(acceleration+nextAcceleration)*stepSize*.5;
          if(old.y*pos.y<0.){
            vec3 hit=mix(old,pos,old.y/(old.y-pos.y));
            float diskR=length(hit.xz);
            if(diskR>6.6 && diskR<27.){light+=emission(hit);break;}
          }
        }
        // Blend out the redundant primary image into the geometrical outer disk.
        float edge=1.-smoothstep(10.,14.,screenR);
        gl_FragColor=vec4(light*edge*uFade,1.);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  })
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), lensMat)
  lens.name = 'optical-lens'
  lens.renderOrder = 1
  group.add(lens)
  return { group, timedMaterials: [flow, lensMat] }
}
