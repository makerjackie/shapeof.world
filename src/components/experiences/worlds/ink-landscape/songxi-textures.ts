import * as T from 'three'

/** Broad ink washes carry the form; fine brush texture only breaks their edges. */
export function createPaintMaterial(map: T.Texture, paper: T.Color, scale: number, strength = .8, tone = '#332e25', minimum = 0, style: 'surface' | 'rock' | 'earth' = 'surface') {
  return new T.ShaderMaterial({
    uniforms: {
      brush: { value: map }, paper: { value: paper }, ink: { value: new T.Color(tone) },
      density: { value: .0012 }, mapScale: { value: scale }, strength: { value: strength },
      minimum: { value: minimum }, style: { value: style === 'rock' ? 1 : style === 'earth' ? 2 : 0 },
    },
    vertexShader: `varying vec3 wp,wn; varying float dep;
      void main(){
        vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;
        wn=normalize(mat3(modelMatrix)*normal);
        vec4 v=viewMatrix*w;dep=-v.z;gl_Position=projectionMatrix*v;
      }`,
    fragmentShader: `
      uniform sampler2D brush;
      uniform vec3 paper,ink;
      uniform float density,mapScale,strength,minimum,style;
      varying vec3 wp,wn; varying float dep;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
      }
      void main(){
        vec3 n=normalize(wn),weights=pow(abs(n),vec3(6.));
        weights/=weights.x+weights.y+weights.z;
        vec3 marks=texture2D(brush,wp.zy*mapScale).rgb*weights.x
          +texture2D(brush,wp.xz*mapScale).rgb*weights.y
          +texture2D(brush,wp.xy*mapScale).rgb*weights.z;
        float textureInk=1.-dot(marks,vec3(.3333));
        float shade=dot(n,normalize(vec3(.75,.22,-.47)));
        float pigment=minimum+textureInk*strength*(1.-minimum);
        if(style>.5&&style<1.5){
          // Stretching y gives dry vertical cun strokes, not grey speckle.
          float warp=noise(wp.xz*.022)*3.8;
          float strokes=noise(vec2(wp.x*.115+wp.z*.091+warp,wp.y*.017));
          float broad=noise(vec2(wp.x*.017+wp.z*.011,wp.y*.008));
          float broken=noise(vec2(wp.x*.42+wp.z*.31,wp.y*.17));
          float darkFace=smoothstep(-.25,.60,shade+broad*.40);
          float ridge=smoothstep(.48,.72,strokes)*(.45+.55*darkFace);
          float dry=smoothstep(.39,.72,broken)*smoothstep(.42,.64,strokes);
          float detail=1.-smoothstep(190.,650.,dep);
          float mass=smoothstep(.30,.73,broad*.52+darkFace*.48);
          vec3 washMarks=texture2D(brush,wp.zy*mapScale*.19).rgb*weights.x
            +texture2D(brush,wp.xz*mapScale*.19).rgb*weights.y
            +texture2D(brush,wp.xy*mapScale*.19).rgb*weights.z;
          float pooled=pow(1.-dot(washMarks,vec3(.3333)),.78);
          // Ink clusters modulate the wash; never fill the entire rock face grey.
          pigment=minimum+.015+mass*.10+ridge*.03;
          pigment+=pooled*(.50+.25*darkFace);
          pigment+=pow(textureInk,.95)*(.32+.18*mass)*(.88+.12*detail);
          pigment+=dry*.025*detail;
          pigment*=min(strength,1.8)/1.55;
        }else if(style>1.5){
          float wash=noise(wp.xz*.027);
          pigment=minimum+smoothstep(.26,.74,wash)*strength*.24;
          pigment+=textureInk*strength*.20+max(0.,shade)*.075;
        }else{
          pigment+=max(0.,shade)*.28*min(strength,1.);
        }
        float edge=pow(1.-abs(dot(n,normalize(cameraPosition-wp))),7.);
        pigment+=edge*(style>.5&&style<1.5?.075:.035);
        vec3 col=mix(paper,ink,clamp(pigment,0.,.94));
        if(style>.5&&style<1.5){
          // Ink density is perceptual: linear-light mixing turns black marks milky.
          col=pow(mix(pow(paper,vec3(1./2.2)),pow(ink,vec3(1./2.2)),clamp(pigment,0.,.94)),vec3(2.2));
        }
        float haze=1.-exp(-density*density*dep*dep);
        // Mist eats into hill feet, while foreground passages stay legible.
        float mistHeight=31.+noise(wp.xz*.012)*24.;
        float lowMist=1.-smoothstep(mistHeight*.20,mistHeight,wp.y);
        float pockets=.62+.38*noise(wp.xz*.006+vec2(3.1,1.7));
        haze=max(haze,lowMist*smoothstep(95.,340.,dep)*pockets*.80);
        col=mix(col,paper,min(haze,.985));
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  })
}
