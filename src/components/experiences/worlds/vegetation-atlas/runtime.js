export function mount(environment) {
const { translate, location, history, document, window, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, matchMedia, ResizeObserver } = environment;

// ---- app.js ----
/* 植被之间 · dependency-free WebGL2 renderer. Copyright 2026. MIT. */
'use strict';
const VA = {};
(function(A){
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
 perspective:(f,a,n,z)=>{const q=1/Math.tan(f/2);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0]);},
 ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),
 lookAt:(eye,center,up=[0,1,0])=>{const z=V.norm(V.sub(eye,center)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);},
 trs:(p=[0,0,0],s=[1,1,1],angle=0)=>{if(typeof s==='number')s=[s,s,s];let c=Math.cos(angle),q=Math.sin(angle);return new Float32Array([c*s[0],0,-q*s[0],0,0,s[1],0,0,q*s[2],0,c*s[2],0,...p,1]);},
 point:(m,p)=>{const x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w];}
};
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l);},mix:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const rng=(s=1)=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const hex=h=>{h=h.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];};
function hash(x,z){let a=Math.sin(x*127.1+z*311.7)*43758.5453;return a-Math.floor(a);}
function noise(x,z){let i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
function fbm(x,z){return noise(x,z)*.55+noise(x*2.1,z*2.1)*.27+noise(x*4.3,z*4.3)*.12+noise(x*8.2,z*8.2)*.06;}
class Geometry{
 constructor(){this.p=[];this.n=[];this.c=[];this.uv=[];this.flex=[];this.center=[];this.i=[];this.parts=[];}
 vertex(p,n=[0,1,0],c=[1,1,1],uv=[0,0],flex=0,center=p){let id=this.p.length/3;this.p.push(...p);this.n.push(...n);this.c.push(...c);this.uv.push(...uv);this.flex.push(flex);this.center.push(...center);return id;}
 tri(a,b,c,col=[1,1,1],flex=0){let n=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),i=this.vertex(a,n,col,[0,0],flex),j=this.vertex(b,n,col,[1,0],flex),k=this.vertex(c,n,col,[.5,1],flex);this.i.push(i,j,k);}
 quad(a,b,c,d,col=[1,1,1],flex=0){const n=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),idx=this.p.length/3;[a,b,c,d].forEach((p,i)=>this.vertex(p,n,col,[[0,0],[1,0],[1,1],[0,1]][i],typeof flex==='number'?flex:flex[i]));this.i.push(idx,idx+1,idx+2,idx,idx+2,idx+3);}
 // Smooth tapered cylinders: shared radial normals and bark-aligned UVs.
 cylinder(a,b,ra,rb,col=[1,1,1],seg=10){
  const axis=V.norm(V.sub(b,a)),len=Math.hypot(...V.sub(b,a));
  const ref=Math.abs(axis[1])>.92?[1,0,0]:[0,1,0],u=V.norm(V.cross(axis,ref)),v=V.cross(axis,u),id=this.p.length/3;
  for(let j=0;j<2;j++)for(let k=0;k<=seg;k++){
   const t=k/seg*Math.PI*2,radial=V.add(V.mul(u,Math.cos(t)),V.mul(v,Math.sin(t))),normal=V.norm(V.add(radial,V.mul(axis,(ra-rb)/Math.max(.001,len))));
   const pos=V.add(j?b:a,V.mul(radial,j?rb:ra));
   this.vertex(pos,normal,col,[k/seg,j*len],0,pos);
  }
  for(let k=0;k<seg;k++){let i=id+k,n=i+seg+1;this.i.push(i,i+1,n,n,i+1,n+1);}
 }
 // A curved, continuously tapered tube. Used for branches, roots, lianas and fern rachises.
 tube(points,radii,col=[1,1,1],seg=9){
  if(points.length<2)return;
  const partStart=this.i.length,base=this.p.length/3;let length=0;
  for(let j=0;j<points.length;j++){
   if(j)length+=Math.hypot(...V.sub(points[j],points[j-1]));
   const tangent=V.norm(V.sub(points[Math.min(j+1,points.length-1)],points[Math.max(0,j-1)]));
   const ref=Math.abs(tangent[1])>.92?[1,0,0]:[0,1,0],u=V.norm(V.cross(tangent,ref)),v=V.cross(tangent,u);
   for(let k=0;k<=seg;k++){
    const angle=k/seg*Math.PI*2,n=V.add(V.mul(u,Math.cos(angle)),V.mul(v,Math.sin(angle)));
    const p=V.add(points[j],V.mul(n,radii[j]));this.vertex(p,n,col,[k/seg,length],0,p);
   }
  }
  for(let j=0;j<points.length-1;j++)for(let k=0;k<seg;k++){const a=base+j*(seg+1)+k,b=a+seg+1;this.i.push(a,a+1,b,a+1,b+1,b);}
  if(radii[0]<.018)this.parts.push([partStart,this.i.length-partStart]);
 }
 sphere(p,s,col=[1,1,1],seg=12,rings=8,jitter=0,rand=Math.random){
  if(typeof s==='number')s=[s,s,s];let id=this.p.length/3,phase=rand()*6.28;
  for(let r=0;r<=rings;r++){let t=r/rings*Math.PI;for(let k=0;k<=seg;k++){
   let a=k/seg*2*Math.PI,n=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];
   // Spatially coherent displacement: the seam and poles remain welded.
   let j=1+jitter*(Math.sin(n[0]*4.7+phase)*Math.sin(n[1]*3.6+1.1)*Math.cos(n[2]*4.1+phase))*.45;
   this.vertex(p.map((x,i)=>x+n[i]*s[i]*j),V.norm(n.map((x,i)=>x/s[i])),col,[k/seg,r/rings]);
  }}
  for(let r=0;r<rings;r++)for(let k=0;k<seg;k++){let a=id+r*(seg+1)+k,b=a+seg+1;this.i.push(a,a+1,b,b,a+1,b+1);}
 }
 leaf(p,size,angle,tilt,col,rand=Math.random,width=.43){
  const u=[Math.cos(angle)*Math.cos(tilt),Math.sin(tilt),Math.sin(angle)*Math.cos(tilt)],v=[-Math.sin(angle),0,Math.cos(angle)];
  const partStart=this.i.length,n=V.norm(V.cross(v,u)),id=this.p.length/3,curl=.11+(rand?rand():.5)*.10;
  for(let i=0;i<=4;i++){
   const t=i/4,x=(t-.5)*2,half=Math.pow(Math.max(0,Math.sin(t*Math.PI)),.78)*size*width;
   for(let side=-1;side<=1;side++){
    const ridge=(1-Math.abs(side))*.055*size,curvature=(x*x*curl-.03)*size;
    const pos=V.add(p,V.add(V.mul(u,x*size),V.add(V.mul(v,side*half),V.mul(n,ridge+curvature))));
    const normal=V.norm(V.add(n,V.add(V.mul(v,side*.19),V.mul(u,-x*curl))));
    this.vertex(pos,normal,col,[t,(side+1)/2],.58,p);
   }
  }
  for(let i=0;i<4;i++)for(let j=0;j<2;j++){let a=id+i*3+j;this.i.push(a,a+1,a+3,a+1,a+4,a+3);}
  this.parts.push([partStart,this.i.length-partStart]);
 }
 // A thin curved grass/reed blade; base is fixed while its tip follows the breeze.
 blade(base,angle,height,width,lean,col,segments=5){
  const partStart=this.i.length;let id=this.p.length/3;const forward=[Math.cos(angle),0,Math.sin(angle)],side=[-Math.sin(angle),0,Math.cos(angle)];
  for(let i=0;i<=segments;i++){
   const t=i/segments,w=width*Math.pow(1-t,.65)+.0003,bend=lean*t*t;
   const mid=V.add(base,[forward[0]*bend,height*(t-.12*t*t*t),forward[2]*bend]);
   for(let j of[-1,1])this.vertex(V.add(mid,V.mul(side,w*j)),V.norm([-forward[0],Math.max(.08,lean/height)*t*2,-forward[2]]),V.mul(col,.66+.34*t),[(j+1)/2,t],t*t,base);
  }
  for(let i=0;i<segments;i++){const a=id+i*2;this.i.push(a,a+1,a+2,a+1,a+3,a+2);}
  this.parts.push([partStart,this.i.length-partStart]);
 }

}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec2 aUV;
layout(location=4) in float aFlex;
layout(location=5) in vec3 aCenter;
layout(location=6) in mat4 aModel;
layout(location=10) in vec4 aTint;
uniform mat4 uVP,uLightVP;
uniform float uTime,uWind,uKind,uSeason,uLeaf,uShift,uScale,uGrowth;
out vec3 vNormal,vWorld,vColor;
out vec2 vUV;
out vec4 vShadow;
out float vSeed,vAlpha;
void main(){
 vec3 p=aPosition;
 float seed=fract(sin(dot(aCenter,vec3(13.9898,7.233,23.311)))*43758.5453);vSeed=seed;
 float foliage=1.;
 if(uKind==2.0 && uSeason>=0.){
  // Individual leaf cohorts shed gradually, instead of the entire crown shrinking at once.
  float fall=smoothstep(.67,.98,uSeason);
  foliage=1.-smoothstep(seed*.84,seed*.84+.16,fall);
  p=aCenter+(p-aCenter)*max(.0001,uLeaf*foliage);
 }
 if(uGrowth>=0.){
  float offset=fract(sin(dot(aModel[3].xz,vec2(17.31,53.11)))*4157.23)*.24;
  p*=max(.0001,smoothstep(offset,.73+offset,uGrowth));
 }
 vec4 world=aModel*vec4(p,1.0);
 vec3 root=aModel[3].xyz;
 float instancePhase=root.x*.38+root.z*.51;
 if(uKind==8.){
  float phase=fract(uTime*.11+fract(aTint.a*719.)),travel=phase*max(.15,root.y-floor(aTint.a*100.)*.01-.04);
  float roll=sin(uTime*1.65+aTint.a*24.)*.95,cr=cos(roll),sr=sin(roll);
  vec3 local=(world.xyz-root);world.xyz=root+vec3(local.x*cr-local.y*sr,local.x*sr+local.y*cr,local.z);
  world.x+=sin(phase*9.+aTint.a*18.)*.40;world.z+=sin(phase*5.+aTint.a*14.)*.22;world.y-=travel;
 }

 float breeze=sin(uTime*.74+instancePhase)*.62+sin(uTime*1.21+instancePhase*.73)*.23;
 float gust=.68+.32*sin(uTime*.18+instancePhase*.32);
 if(uKind==2. || uKind==6.){
  float h=max(0.,p.y),bend=h*h*.0062;
  world.x+=breeze*bend*uWind*gust;
  world.z+=sin(uTime*.61+instancePhase+1.8)*bend*.36*uWind;
 }
 if(uKind==2. || uKind==4.){
  float wave=sin(world.x*.82+world.z*.48-uTime*1.1);
  float flutter=sin(uTime*2.3+seed*6.28+instancePhase);
  world.x+=(wave*.029+flutter*.012)*aFlex*uWind;
  world.z+=sin(world.z*.64-uTime*.83+seed)*aFlex*uWind*.016;
 }
 if(uKind==3.)world.y+=sin(world.x*2.1+uTime*.55)*cos(world.z*1.7-uTime*.42)*.008;
 if(uKind==5.){world.x+=sin(uTime*.25+instancePhase)*.18;world.y+=sin(uTime*.47+instancePhase)*.12;}
 world.xyz*=uScale;world.y+=uShift;
 mat3 basis=mat3(aModel);
 vec3 normScale=vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]));
 vNormal=normalize(basis*(aNormal/max(normScale,vec3(.000001))));
 vWorld=world.xyz;vColor=aColor*aTint.rgb;vUV=aUV;float cycle=fract(uTime*.11+fract(aTint.a*719.));vAlpha=uKind==8.?smoothstep(0.,.07,cycle)*(1.-smoothstep(.90,1.,cycle)):aTint.a;
 vShadow=uLightVP*world;
 gl_Position=uVP*world;
}`;
const FS=`#version 300 es
precision highp float;
in vec3 vNormal,vWorld,vColor;
in vec2 vUV;
in vec4 vShadow;
in float vSeed,vAlpha;
uniform vec3 uCamera,uLight;
uniform sampler2D uShadowTex;
uniform float uTime,uOpacity,uKind,uSeason,uSnow,uAltitude,uRecovery;
uniform bool uShadow;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float shadowFactor(vec3 n){
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;
 if(p.z>1.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;
 float bias=max(.00042*(1.-abs(dot(n,uLight))),.00013),s=0.;
 const vec2 taps[12]=vec2[12](vec2(-.33,.21),vec2(.13,-.37),vec2(.52,.14),vec2(-.61,-.28),vec2(.07,.70),vec2(.46,-.65),vec2(-.73,.52),vec2(.88,.43),vec2(-.15,-.91),vec2(.46,.95),vec2(-1.,-.33),vec2(.95,-.34));
 for(int i=0;i<12;i++){float d=texture(uShadowTex,p.xy+taps[i]*2.15/2048.).r;s+=smoothstep(-.00010,.00010,d+bias-p.z);}
 return .24+.76*s/12.;
}
void main(){
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 eye=normalize(uCamera-vWorld),c=vColor;
 if(uKind==2.){
  if(uSeason>=0.){
   float autumn=smoothstep(.46,.74,uSeason);
   vec3 gold=mix(vec3(.69,.44,.16),vec3(.66,.19,.07),vSeed*.86);
   c=mix(c,gold,autumn*.92);
   c=mix(c,vec3(.34,.54,.21),(1.-smoothstep(.08,.30,uSeason))*.27);
  }
  float veinAA=max(.008,fwidth(vUV.y)*1.5);
  float midrib=1.-smoothstep(.012,.012+veinAA,abs(vUV.y-.5));
  float veins=1.-smoothstep(.025,.06+fwidth(vUV.x)*1.5,abs(fract(vUV.x*6.-abs(vUV.y-.5)*2.2)-.5));
  float zoom=1.-smoothstep(8.,25.,length(vWorld-uCamera));
  c*=.97+midrib*.10*zoom+veins*.048*zoom;
 }
 if(uKind==1. || uKind==7. || uKind==9.){
  vec2 q=abs(n.y)>.5?vWorld.xz:vec2(vWorld.x+vWorld.z,vWorld.y);
  float coarse=noise(q*5.7),grain=noise(q*55.);
  float aa=1.-smoothstep(.02,.12,length(fwidth(q)));
  c*=.86+coarse*.20+(grain-.5)*.12*aa;
  if(uKind==9.){float seam=sin(q.y*26.+noise(vec2(q.x*.7,1.3))*8.);c*=.94+seam*.055;}
  if(uKind==7.){float vein=1.-smoothstep(.0,.04,abs(noise(q*3.4)-.49));c+=vein*.018;}
 }
 if(uKind==1.&&uRecovery>=0.)c=mix(c,vec3(.29,.41,.21)*( .88+noise(vWorld.xz*2.7)*.22),smoothstep(.13,.93,uRecovery)*.66);
 if(uKind==4.&&uSeason>=0.)c=mix(c,vec3(.49,.39,.22),smoothstep(.56,.85,uSeason)*.62);
 if(uKind==6.){
  float ridges=sin(vUV.x*150.+noise(vUV*vec2(18.,3.))*7.);
  float groove=smoothstep(.15,.92,ridges);
  float aa=1.-smoothstep(.012,.10,fwidth(vUV.x));
  c*=.82+noise(vUV*vec2(37.,10.))*.23-groove*.17*aa;
 }
 if(uSnow>.001&&(uKind==1.||uKind==4.||uKind==0.||uKind==7.||uKind==6.)){
  float cap=smoothstep(.28,.86,n.y)*uSnow*smoothstep(.03,.22,vWorld.y);
  c=mix(c,vec3(.78,.85,.84),cap*.91);
 }
 float diffuse=max(0.,dot(n,uLight)),shadow=uShadow?shadowFactor(n):1.;
 vec3 hemi=mix(vec3(.19,.23,.20),vec3(.57,.65,.62),n.y*.5+.5);
 vec3 light=hemi+vec3(.90,.84,.69)*diffuse*shadow*.82;
 if(uKind==2. || uKind==4.){
  float through=pow(max(0.,dot(eye,-uLight)),3.)*.15;
  light+=vec3(.57,.74,.39)*through;
  light+=vec3(.08,.10,.068)*(1.-abs(dot(n,uLight)));
 }
 c*=light;
 if(uKind==1. && uAltitude>=0.){
  float edge=max(.024,fwidth(vWorld.y)*1.4);
  float band=1.-smoothstep(.024,.024+edge,abs(vWorld.y-uAltitude));
  c=mix(c,vec3(.77,.87,.51),band*.90);
 }
 float alpha=uOpacity*vAlpha;
 if(uKind==3.){
  vec2 q=vWorld.xz;
  float a=q.x*3.8+q.y*2.3+uTime*.58,b=q.x*2.7-q.y*4.3-uTime*.47;
  n=normalize(vec3(cos(a)*.032,1.,sin(b)*.026));
  float fres=pow(1.-max(0.,dot(n,eye)),4.);
  float depth=vColor.r;
  vec3 shallow=vec3(.22,.42,.34),deep=vec3(.035,.19,.20);
  c=mix(shallow,deep,depth);
  float caustic=pow(max(0.,sin(q.x*8.+sin(q.y*4.+uTime*.40))+sin(q.y*9.-uTime*.34)-1.3),2.);
  c+=vec3(.14,.20,.12)*caustic*(1.-depth)*.20;
  vec3 reflected=mix(vec3(.19,.31,.28),vec3(.46,.61,.59),smoothstep(-.5,.7,reflect(-eye,n).y));
  c=mix(c,reflected,fres*.78+.09);
  float spec=pow(max(0.,dot(normalize(uLight+eye),n)),145.);
  c+=vec3(.85,.77,.54)*spec*.35;
  float rip=sin(length(q-vec2(3.4,2.3))*18.-uTime*1.6);c+=max(0.,rip-.94)*.12;
  alpha=uOpacity*.94;
 }
 if(uKind==5.){vec2 q=vUV*2.-1.;alpha*=pow(max(0.,1.-length(q)),2.);c=vColor;}
 // Gentle highlight compression, without over-saturating the greens.
 float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,.99);
 c=pow(max(c,vec3(0.)),vec3(.92));
 float fog=smoothstep(40.,86.,length(vWorld-uCamera))*.26;c=mix(c,vec3(.043,.087,.095),fog);
 outColor=vec4(c,alpha);
}`;
const DFS=`#version 300 es
precision highp float;
out vec4 outColor;
void main(){outColor=vec4(1.);}`;
function program(gl,vs,fs){const shaders=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((type,i)=>{let s=gl.createShader(type);gl.shaderSource(s,i?fs:vs);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;});let p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));shaders.forEach(s=>gl.deleteShader(s));return p;}
class Mesh{
 constructor(engine,geo,instances,options={}){this.e=engine;this.options={kind:0,opacity:1,cast:true,visible:true,season:false,leaf:1,...options};const gl=engine.gl;this.count=geo.i.length;this.num=instances.length;this.buffers=[];this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);const attributes=[[0,geo.p,3],[1,geo.n,3],[2,geo.c,3],[3,geo.uv,2],[4,geo.flex,1],[5,geo.center,3]];attributes.forEach(([loc,arr,size])=>{let b=gl.createBuffer();this.buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);});let b=gl.createBuffer();this.buffers.push(b);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(geo.i),gl.STATIC_DRAW);this.indexFull=b;this.lods=[];if(geo.parts?.length>4){for(const stride of[2,3]){const indices=[];let cursor=0;geo.parts.forEach(([start,count],j)=>{for(let k=cursor;k<start;k++)indices.push(geo.i[k]);if(j%stride===0)for(let k=start;k<start+count;k++)indices.push(geo.i[k]);cursor=start+count;});for(let k=cursor;k<geo.i.length;k++)indices.push(geo.i[k]);const buf=gl.createBuffer();this.buffers.push(buf);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(indices),gl.STATIC_DRAW);this.lods.push({buffer:buf,count:indices.length});}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexFull);}this.ib=gl.createBuffer();this.buffers.push(this.ib);gl.bindBuffer(gl.ARRAY_BUFFER,this.ib);this.idata=new Float32Array(instances.length*20);for(let j=0;j<4;j++){gl.enableVertexAttribArray(6+j);gl.vertexAttribPointer(6+j,4,gl.FLOAT,false,80,j*16);gl.vertexAttribDivisor(6+j,1);}gl.enableVertexAttribArray(10);gl.vertexAttribPointer(10,4,gl.FLOAT,false,80,64);gl.vertexAttribDivisor(10,1);this.update(instances);gl.bindVertexArray(null);this.triangles=this.count/3*this.num;}
 update(instances){const gl=this.e.gl;instances.forEach((o,i)=>{this.idata.set(o.m||M.trs(o.p,o.s,o.a),i*20);this.idata.set([...(o.c||[1,1,1]),o.alpha??1],i*20+16);});gl.bindBuffer(gl.ARRAY_BUFFER,this.ib);if(this.allocated)gl.bufferSubData(gl.ARRAY_BUFFER,0,this.idata);else{gl.bufferData(gl.ARRAY_BUFFER,this.idata,gl.DYNAMIC_DRAW);this.allocated=true;}}
 dispose(){this.buffers.forEach(b=>this.e.gl.deleteBuffer(b));this.e.gl.deleteVertexArray(this.vao);}
}
class Engine{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance',desynchronized:true,preserveDrawingBuffer:false});if(!this.gl)throw new Error(translate('当前浏览器未开启 WebGL 2，请启用硬件加速，或使用新版 Chrome / Edge / Safari。'));const gl=this.gl;const rendererInfo=gl.getExtension('WEBGL_debug_renderer_info');this.software=rendererInfo?/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)):false;this.prog=program(gl,VS,FS);this.depth=program(gl,VS,DFS);this.locations=new Map();this.scene=null;this.camera={theta:.67,phi:.98,distance:33,target:[0,1.1,0]};this.goal={...this.camera,target:[...this.camera.target]};this.position=[20,20,20];this.width=1;this.height=1;this.time=0;this.season=-1;this.snow=0;this.wind=1;this.leaf=1;this.shift=0;this.scale=1;this.altitude=-1;this.drawCount=0;this.high=true;this.light=V.norm([-14,26,14]);this.lightVP=M.mul(M.ortho(-21,21,-20,20,1,90),M.lookAt([-20,35,25],[0,0,0]));this.shadowDirty=true;this.shadowFrame=0;this.createShadow();this.bindControls();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.resize();this.restore=null;canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();this.lost=true;A.toast?.(translate('显卡上下文已暂停，请重新载入页面恢复。'));});}
 uniform(p,name,value){let key=(p===this.prog?'m':'d')+name;let l=this.locations.get(key);if(l===undefined){l=this.gl.getUniformLocation(p,name);this.locations.set(key,l);}if(l===null)return;const gl=this.gl;if(value instanceof Float32Array&&value.length===16)gl.uniformMatrix4fv(l,false,value);else if(Array.isArray(value))gl.uniform3fv(l,value);else if(typeof value==='boolean')gl.uniform1i(l,value?1:0);else gl.uniform1f(l,value);}
 createShadow(){const gl=this.gl;this.shadowTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,2048,2048,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.shadowFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 resize(){let r=this.canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,this.high?1.75:this.software?.85:1);this.width=r.width;this.height=r.height;let w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.aspect=r.width/Math.max(r.height,1);}
 reset(view='orbit',immediate=false){let d=37.8*Math.max(1,1.16/(this.aspect||1));const target=this.scene?.target||[0,1,0];this.goal={theta:view==='front'?0:.65,phi:view==='top'?.06:view==='front'?1.25:1.04,distance:view==='top'?d*1.02:d,target:[...target]};if(immediate)this.camera={...this.goal,target:[...this.goal.target]};}
 focus(p,zoom=1){this.goal.target=[...p];this.goal.distance=29*Math.max(1,1.15/this.aspect)/zoom;}
 mesh(g,i=[{}],o={}){return new Mesh(this,g,i,o);}
 drawMesh(mesh,p,depth=false){const gl=this.gl,o=mesh.options;if(!o.visible||o.opacity<=.005||(depth&&(!o.cast||o.opacity<.7)))return;this.uniform(p,'uKind',o.kind);this.uniform(p,'uGrowth',o.growth??-1);this.uniform(p,'uSnow',o.snow===false?0:this.snow);this.uniform(p,'uLeaf',o.season?this.leaf:(o.leaf??1));this.uniform(p,'uSeason',o.season?this.season:-1);this.uniform(p,'uOpacity',o.opacity);this.uniform(p,'uShift',this.shift+(o.shift||0));this.uniform(p,'uScale',this.scale);gl.bindVertexArray(mesh.vao);
 // Preserve complete leaves/needles and branches at each LOD; never truncate triangles inside a leaf.
 const lod=mesh.lods.length&&this.camera.distance>20?mesh.lods[(!this.high||this.camera.distance>38)?1:0]:null;
 const count=lod?lod.count:mesh.count,num=this.high?mesh.num:Math.max(1,Math.ceil(mesh.num*(o.lodRatio??1)));
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,lod?lod.buffer:mesh.indexFull);
 gl.drawElementsInstanced(gl.TRIANGLES,count,gl.UNSIGNED_INT,0,num);
 if(!depth)this.renderedTriangles=(this.renderedTriangles||0)+count/3*num;}
 render(dt=0){if(this.lost||!this.scene)return;this.resize();const gl=this.gl;let e=1-Math.exp(-dt*5.6);if(dt===0)e=1;for(let k of ['theta','phi','distance'])this.camera[k]+=(this.goal[k]-this.camera[k])*e;this.camera.target=V.mix(this.camera.target,this.goal.target,e);const c=this.camera,d=c.distance;this.position=V.add(c.target,[Math.sin(c.theta)*Math.sin(c.phi)*d,Math.cos(c.phi)*d,Math.cos(c.theta)*Math.sin(c.phi)*d]);const proj=M.perspective(.67,this.aspect,.1,150);proj[9]=-.13;this.vp=M.mul(proj,M.lookAt(this.position,c.target));
 const common=(p,vp)=>{gl.useProgram(p);this.uniform(p,'uVP',vp);this.uniform(p,'uLightVP',this.lightVP);this.uniform(p,'uTime',this.time);this.uniform(p,'uWind',this.wind);};
 const tier=this.camera.distance<=20?0:this.camera.distance>38?2:1;if(tier!==this.lodTier){this.lodTier=tier;this.shadowDirty=true;}
 if(this.high&&this.shadowOK&&this.shadowDirty){gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.viewport(0,0,2048,2048);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,3.0);common(this.depth,this.lightVP);this.uniform(this.depth,'uTime',0);this.uniform(this.depth,'uWind',0);this.scene.meshes.forEach(m=>this.drawMesh(m,this.depth,true));this.shadowDirty=false;gl.disable(gl.POLYGON_OFFSET_FILL);}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);common(this.prog,this.vp);this.uniform(this.prog,'uLight',this.light);this.uniform(this.prog,'uCamera',this.position);this.uniform(this.prog,'uSnow',this.snow);this.uniform(this.prog,'uAltitude',this.scene.chapter==='mountain'?this.altitude:-1);this.uniform(this.prog,'uRecovery',this.scene.chapter==='succession'?(this.scene.recovery??0):-1);this.uniform(this.prog,'uShadow',this.shadowOK&&this.high);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.uniform1i(gl.getUniformLocation(this.prog,'uShadowTex'),0);
 this.renderedTriangles=0;gl.disable(gl.BLEND);gl.depthMask(true);this.scene.meshes.filter(m=>m.options.opacity>=.999&&m.options.kind!==3&&m.options.kind!==5).forEach(m=>this.drawMesh(m,this.prog));
 gl.enable(gl.BLEND);gl.depthMask(false);this.scene.meshes.filter(m=>m.options.opacity<.999||m.options.kind===3||m.options.kind===5).forEach(m=>this.drawMesh(m,this.prog));gl.depthMask(true);gl.bindVertexArray(null);
 this.drawCount++;
 gl.flush();
 }
 project(p){if(!this.vp)return[-100,-100,2];let q=M.point(this.vp,[p[0]*this.scale,p[1]*this.scale+this.shift,p[2]*this.scale]);return[(q[0]*.5+.5)*this.width,(-q[1]*.5+.5)*this.height,q[2]];}
 bindControls(){const c=this.canvas;let pointers=new Map(),last=null,pinch=0;const notify=()=>A.onCameraInteraction?.();c.addEventListener('contextmenu',e=>e.preventDefault());c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);last=[e.clientX,e.clientY,e.button];if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]);}c.classList.add('dragging');notify();});c.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;let p=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const a=[...pointers.values()],dist=Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]);this.goal.distance=clamp(this.goal.distance*pinch/Math.max(1,dist),5.5,65);pinch=dist;return;}let dx=e.clientX-p[0],dy=e.clientY-p[1];if(e.buttons===2||e.shiftKey){let s=this.goal.distance*.00065,ct=Math.cos(this.goal.theta),st=Math.sin(this.goal.theta);this.goal.target[0]-=dx*s*ct;this.goal.target[2]+=dx*s*st;this.goal.target[1]+=dy*s;}else{this.goal.theta-=dx*.006;this.goal.phi=clamp(this.goal.phi+dy*.005,.04,1.46);}});const up=e=>{pointers.delete(e.pointerId);if(!pointers.size)c.classList.remove('dragging');};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('wheel',e=>{e.preventDefault();notify();this.goal.distance=clamp(this.goal.distance*Math.exp(e.deltaY*.001),5.5,65);},{passive:false});}
}
Object.assign(A,{M,V,clamp,smooth,rng,hex,noise,fbm,Geometry,Engine});
})(VA);


/* All terrain, plants, soil, roots and water are procedural 3D geometry. */
(function(A){
const {Geometry:G,V,M,rng,hex,clamp,smooth,fbm,noise}=A;
const WHITE=[1,1,1];
const P={moss:hex('647843'),grass:hex('708a42'),light:hex('97aa53'),dark:hex('344d2c'),trunk:hex('695540'),root:hex('8d7854'),sand:hex('bfa074'),water:hex('26757a')};
function box(g,center,size,color){let[x,y,z]=center,[a,b,c]=size.map(v=>v/2);const p=[[x-a,y-b,z-c],[x+a,y-b,z-c],[x+a,y+b,z-c],[x-a,y+b,z-c],[x-a,y-b,z+c],[x+a,y-b,z+c],[x+a,y+b,z+c],[x-a,y+b,z+c]];[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].forEach(q=>g.quad(...q.map(i=>p[i]),color));}
function treeGeometry(type,seed){
 const r=rng(seed),wood=new G(),leaves=new G();
 const shrub=type==='shrub',pine=type==='pine',trop=type==='tropical',acacia=type==='acacia';
 const H=(shrub?1.0:pine?4.15:trop?5.25:acacia?3.35:3.9)*(.91+r()*.18);
 const bark=hex(trop?'776d57':pine?'625243':shrub?'74654f':'82715b');
 const trunk=[],trunkR=[],bend=(r()-.5)*.20;
 for(let j=0;j<=10;j++){let t=j/10;trunk.push([Math.sin(t*2.5)*bend,H*t*(pine?.99:.94),Math.sin(t*3.8)*bend*.48]);trunkR.push((shrub?.056:.13)*Math.pow(1-t,.84)+.009+(j===0?(shrub?.035:.09):0));}
 wood.tube(trunk,trunkR,bark,shrub?10:14);
 function twig(a,b,rad,curve=.10,steps=5){
  const pts=[],rs=[];
  for(let i=0;i<=steps;i++){let t=i/steps,p=V.mix(a,b,t);p[1]-=Math.sin(t*Math.PI)*curve;p[0]+=Math.sin(t*Math.PI)*curve*.25;pts.push(p);rs.push(rad*Math.pow(1-t,.85)+.002);}
  wood.tube(pts,rs,bark,rad>.024?9:6);return pts;
 }
 function needle(p,length,a,tilt,col){
  const u=[Math.cos(a)*Math.cos(tilt),Math.sin(tilt),Math.sin(a)*Math.cos(tilt)],side=[-Math.sin(a),0,Math.cos(a)];
  const partStart=leaves.i.length,n=V.norm(V.cross(side,u)),i=leaves.p.length/3;
  const points=[V.add(p,V.mul(u,-length*.40)),V.add(p,V.mul(side,length*.073)),V.add(p,V.mul(n,length*.055)),V.add(p,V.mul(side,-length*.073)),V.add(p,V.mul(u,length*.60))];
  for(let k=0;k<5;k++)leaves.vertex(points[k],k===1?V.norm(V.add(n,side)):k===3?V.norm(V.sub(n,side)):n,col,[[0,.5],[.4,1],[.4,.5],[.4,0],[1,.5]][k],.45,p);
  leaves.i.push(i,i+1,i+2,i,i+2,i+3,i+1,i+4,i+2,i+2,i+4,i+3);leaves.parts.push([partStart,leaves.i.length-partStart]);
 }
 if(pine){
  for(let tier=0;tier<11;tier++){
   const y=H*(.17+tier*.073),rad=1.18*Math.pow(1-tier/11,.77),count=6+(tier%2);
   for(let b=0;b<count;b++){
    const a=b/count*Math.PI*2+tier*2.399+r()*.22,tip=[Math.cos(a)*rad,y-.16,Math.sin(a)*rad];
    twig([bend*.3,y+.13,0],tip,.033*(1-tier/13),.08);
    for(let q=0;q<5;q++){
     const t=.18+q*.16,mid=[tip[0]*t,y+.10-.26*t,tip[2]*t];
     for(let side of[-1,1]){
      const aa=a+side*.73,len=(1-t)*rad*.34+.06,end=V.add(mid,[Math.cos(aa)*len,.09,Math.sin(aa)*len]);
      twig(mid,end,.008,.016,3);
      for(let n=0;n<7;n++){
       const f=n/7,p=V.mix(mid,end,f);p[1]+=(r()-.5)*.08;
       needle(p,.12+r()*.11,aa+side*(.5+r()*.8),.1+r()*.7,V.mix(hex('244a3e'),hex('60805b'),.22+f*.38+r()*.22));
      }
     }
    }
   }
  }
 }else{
  const count=shrub?7:acacia?9:trop?10:10;
  for(let b=0;b<count;b++){
   const a=b*2.39996+r()*.35,t=b/(count-1),height=H*(shrub?.20+t*.18:acacia?.40+t*.20:trop?.48+t*.24:.30+t*.35),radius=(shrub?.55:acacia?1.70:trop?1.48:1.17)*(.73+r()*.36);
   const crownY=acacia?H*.89:H*(shrub?.62+t*.26:.65+t*.22)+r()*H*.045;
   const start=[bend*.4,height,0],end=[Math.cos(a)*radius,crownY,Math.sin(a)*radius];
   twig(start,end,shrub?.023:.048,.16,7);
   const twigs=shrub?3:4;
   for(let k=0;k<twigs;k++){
    const aa=a+(k-(twigs-1)/2)*.92,spread=(shrub?.23:acacia?.52:.39)*(.85+r()*.4);
    const p=V.add(end,[Math.cos(aa)*spread,acacia?.07+r()*.10:.12+r()*.32,Math.sin(aa)*spread]);
    twig(V.mix(start,end,.68),p,shrub?.009:.014,.05,4);
    const cluster=shrub?.265:trop?.49:acacia?.47:.43;
    const num=shrub?16:trop?28:acacia?42:24;
    for(let j=0;j<num;j++){
     const theta=r()*Math.PI*2,phi=Math.acos(2*r()-1),rad=cluster*Math.cbrt(r());
     const offset=[Math.sin(phi)*Math.cos(theta)*rad,Math.cos(phi)*rad*(acacia?.43:1.05),Math.sin(phi)*Math.sin(theta)*rad];
     const pos=V.add(p,offset);
     const tone=clamp(.36+offset[1]/cluster*.25+Math.hypot(offset[0],offset[2])/cluster*.16+(r()-.5)*.17);
     const col=V.mix(hex(shrub?'36573d':trop?'234e3d':'32593d'),hex(shrub?'719251':trop?'719565':acacia?'819860':'8ca469'),tone);
     const size=(shrub?.065:trop?.137:acacia?.110:.098)*(1+r()*.60);
     leaves.leaf(pos,size,theta+(r()-.5)*1.5,(r()-.5)*1.9,col,r,trop?.42:shrub?.38:acacia?.34:.46);
    }
   }
  }
  // Inner leader fills the crown volume; the silhouette is rounded, not a flat disc.
  if(!acacia)for(let c=0;c<(shrub?2:5);c++){
   const a=c*2.399,y=H*(.86+(c%3)*.035),p=[Math.cos(a)*H*.13,y,Math.sin(a)*H*.13];
   twig([bend,H*.62,0],p,shrub?.012:.024,.035,5);
   for(let j=0;j<(shrub?20:55);j++){
    let u=r()*6.28,v=Math.acos(r()*2-1),rad=(shrub?.23:.47)*Math.cbrt(r());
    let pos=V.add(p,[Math.sin(v)*Math.cos(u)*rad,Math.cos(v)*rad*.86,Math.sin(v)*Math.sin(u)*rad]);
    leaves.leaf(pos,(shrub?.076:trop?.15:.12)*(1+r()*.35),r()*6.28,(r()-.5)*1.7,V.mix(hex(trop?'346a4c':'456b43'),hex(trop?'7a9d63':'91aa69'),r()*.6),r);
   }
  }
 }
 // Buttressed bases and spreading surface roots visually connect every trunk to its soil.
 for(let k=0;k<(shrub?3:trop?7:5);k++){
  const a=k*2.399,len=(trop?.62:shrub?.20:.43)*(1+r()*.5);
  let pts=[[bend*.1,trop?.9:shrub?.16:.26,0],[Math.cos(a)*len*.37,.08,Math.sin(a)*len*.37],[Math.cos(a)*len,.012,Math.sin(a)*len]];
  wood.tube(pts,[trop?.11:shrub?.022:.051,.030,.003],bark,8);
  if(trop){const off=.075;wood.quad([0,.93,0],[Math.cos(a)*len,.006,Math.sin(a)*len],[Math.cos(a+.13)*len,.006,Math.sin(a+.13)*len],[Math.cos(a+.13)*off,.48,Math.sin(a+.13)*off],V.mul(bark,.87));}
 }
 // Thin, irregular lianas are attached to tropical branches, not free-floating strings.
 if(trop)for(let k=0;k<5;k++){
  const a=k*2.399,x=Math.cos(a)*.94,z=Math.sin(a)*.94,pts=[],rs=[];
  for(let j=0;j<=14;j++){let t=j/14;pts.push([x+Math.sin(t*4.8+k)*.12,H*(.82-t*.65),z+Math.cos(t*5.1+k)*.11]);rs.push(.012*(1-t*.5));}
  wood.tube(pts,rs,hex('667447'),5);
 }
 return{wood,leaves};
}
function grassGeometry(seed=1,dry=false){
 const g=new G(),r=rng(seed);
 for(let b=0;b<7;b++){
  const a=b*2.399+r()*.7,h=.25+r()*.40,col=V.mix(hex(dry?'86774a':'395f37'),hex(dry?'b7a770':'779957'),r());
  g.blade([(r()-.5)*.18,0,(r()-.5)*.18],a,h,.012+r()*.014,.12+r()*.18,col,4);
 }
 return g;
}
function fernGeometry(){
 const g=new G();
 for(let b=0;b<7;b++){
  const a=b*2.399,h=.35+(b%3)*.055,len=.51+(b%2)*.10,points=[],rs=[];
  for(let j=0;j<=10;j++){let t=j/10;points.push([Math.cos(a)*t*len,.04+Math.sin(t*2.05)*h,Math.sin(a)*t*len]);rs.push(.007*(1-t)+.001);}
  g.tube(points,rs,hex('678649'),5);
  for(let j=1;j<9;j++){
   const t=j/10,mid=points[j],sz=Math.sin(t*Math.PI)*.085+.012;
   for(let side of[-1,1])for(let n=0;n<3;n++){
    const ang=a+side*(1.16-n*.13),p=V.add(mid,[Math.cos(ang)*sz*(.5+n*.45),-.014*n,Math.sin(ang)*sz*(.5+n*.45)]);
    g.leaf(p,sz*(.78-n*.13),ang,.05-n*.10,hex(j%3?'587c42':'76994e'),()=>.5,.29);
   }
  }
 }
 return g;
}
function reedGeometry(seed){
 const g=new G(),r=rng(seed);
 for(let k=0;k<4;k++){
  const x=(r()-.5)*.28,z=(r()-.5)*.28,h=.86+r()*.70,lean=.045+r()*.08,a=r()*6.28;
  g.tube([[x,0,z],[x+lean*.4,h*.55,z],[x+lean,h,z+.04]],[.012,.010,.006],hex('78804a'),7);
  g.sphere([x+lean,h-.07,z+.04],[.032,.135,.032],hex('655036'),9,8,.06,r);
  g.cylinder([x+lean,h+.03,z+.04],[x+lean,h+.17,z+.045],.005,.002,hex('947652'),5);
  for(let j=0;j<3;j++)g.blade([x,.05+j*.11,z],a+j*2.39,h*(.68-j*.12),.022+j*.003,.30+j*.08,hex(j%2?'718651':'8b995b'),7);
 }
 return g;
}
function line(g,a,b,width,color){g.cylinder(a,b,width,width,color,6);}
function rootsAt(g,p,seed,face=false){
 const r=rng(seed);
 function branch(a,dir,len,rad,depth){
  let end=V.add(a,V.mul(dir,len));end[1]=Math.max(-2.28,end[1]);
  if(face)end[2]=6.514+(r()-.5)*.006;
  end[0]=clamp(end[0],-8.97,8.97);
  const pts=[],rs=[],curve=(r()-.5)*.30;
  for(let j=0;j<=6;j++){
   let t=j/6,pos=V.mix(a,end,t);pos[0]+=Math.sin(t*Math.PI)*curve;
   if(!face)pos[2]+=Math.sin(t*Math.PI)*curve*.64;
   pts.push(pos);rs.push(rad*Math.pow(1-t,.80)+rad*.13);
  }
  g.tube(pts,rs,V.mix(hex('756348'),hex('c5ae7d'),depth/4*.8),depth<2?8:5);
  if(depth<3&&end[1]>-2.22)for(let side of[-1,1]){
   let d=V.norm([dir[0]*.53+side*(.20+r()*.54),-.5-r()*.45,face?0:dir[2]*.5+(r()-.5)*.75]);
   branch(end,d,len*(.52+r()*.12),rad*.48,depth+1);
  }
  if(depth>=2)for(let j=0;j<3;j++){
   let mid=pts[2+j],end=V.add(mid,[(r()-.5)*.18,-.05-r()*.10,face?0:(r()-.5)*.14]);
   g.cylinder(mid,end,rad*.15,.0007,hex('c3b18a'),4);
  }
 }
 for(let b=0;b<6;b++){
  let a=b*2.399,dir=V.norm([face?(b-2.5)*.35:Math.cos(a),-1,face?0:Math.sin(a)]);
  branch(p,dir,.73+r()*.48,.034+r()*.009,0);
 }
}
const geometryCache=new Map();
function getTree(type,seed){let key=type+seed;if(!geometryCache.has(key))geometryCache.set(key,treeGeometry(type,seed));return geometryCache.get(key);}
function createScene(engine,chapter,biome='broadleaf'){
 const sc={meshes:[],labels:[],groups:{},target:chapter==='mountain'?[0,2.5,0]:[0,1.2,0],chapter,biome,cover:1,instances:{},metadata:{}};let r=rng(404+(chapter==='mountain'?2:chapter==='succession'?4:0));const add=(g,instances=[{}],o={},group='base')=>{if(!g.i.length||!instances.length)return null;let m=engine.mesh(g,instances,{lodRatio:{canopy:.68,herbs:.38,shrubs:.52,reeds:.55,rocks:.55,motes:.38}[group]??1,...o});sc.meshes.push(m);(sc.groups[group]||=[]).push(m);return m;};
 const mountain=chapter==='mountain',types=chapter==='biomes',desert=types&&biome==='desert',wet=types&&biome==='wetland',grass=types&&biome==='grassland',rain=types&&biome==='rainforest',needle=types&&biome==='conifer',seasons=chapter==='seasons',succ=chapter==='succession',layers=chapter==='layers';
 const stream=(!mountain&&!desert&&!grass&&!succ&&!layers)||wet;
 const riverX=z=>1.2+Math.sin(z*.43)*1.08+z*.14;
 const pond=(x,z)=>Math.sqrt(((x-3.6)/2.5)**2+((z-2.1)/1.85)**2);
 const waterTest=(x,z)=>stream&&(Math.abs(x-riverX(z))<.37+(wet?.40:0)||pond(x,z)<1+(wet?.80:0));
 const hill=(x,z)=>{if(mountain){let xx=x+.6,zz=z+.8,rad=Math.sqrt(xx*xx*.011+zz*zz*.030),base=Math.max(0,1-rad);const ridge=Math.abs(Math.sin(Math.atan2(zz,xx)*3.0+rad*3.1));return .29+Math.pow(base,1.12)*7.45+(fbm(x*.54+12,z*.54+20)-.40)*1.38*base+ridge*.85*Math.sin(base*Math.PI);}if(wet)return .32+fbm(x*.38+4,z*.38+5)*.46;let v=.34+fbm(x*.5+4,z*.5+5)*.48;v+=Math.exp(-((x+4)**2/17+(z+2.8)**2/8))*(rain?1.2:1.5);if(desert)v+=Math.sin(x*.32+z*.3)*.48;if(layers)v*=.4;return v;};
 const height=(x,z)=>{let h=hill(x,z);if(stream){let d=Math.abs(x-riverX(z)),shore=smooth(.33,.97,d),pondShore=smooth(.85+(wet?.80:0),1.28+(wet?.80:0),pond(x,z));h=-.06+(h+.06)*Math.min(shore,pondShore);}return h;};
 sc.height=height;sc.waterTest=waterTest;
 const W=9,D=6.5,nx=152,nz=112;let terrain=new G();
 for(let j=0;j<=nz;j++){let z=-D+j/nz*D*2;for(let i=0;i<=nx;i++){let x=-W+i/nx*W*2,y=height(x,z),eps=.06,n=V.norm([height(x-eps,z)-height(x+eps,z),eps*2,height(x,z-eps)-height(x,z+eps)]),tone=fbm(x*.8+30,z*.8+11),c;
 if(desert)c=V.mix(hex('a58a60'),hex('ceb785'),tone);else if(succ)c=V.mix(hex('806f47'),hex('a19060'),tone);else if(mountain){c=y>6.1?V.mix(hex('777768'),hex('a4a08a'),tone):y>4.5?V.mix(hex('697349'),hex('94a15b'),tone):V.mix(hex('496039'),hex('7f8e4b'),tone);}else{c=V.mix(hex(grass?'89895c':'405d36'),hex(grass?'b2a878':'718c54'),tone);if(waterTest(x,z))c=V.mix(hex('7f8861'),hex('a5a77b'),tone);}
 terrain.vertex([x,y,z],n,c,[i/nx,j/nz]);}}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i,b=a+nx+1;terrain.i.push(a,b,a+1,b,b+1,a+1);}add(terrain,[{}],{kind:1},'terrain');
 const earth=new G(),edgeRoot=new G();
 const sides=[(t)=>[-W+t*W*2,-D],(t)=>[W,-D+t*D*2],(t)=>[W-t*W*2,D],(t)=>[-W,D-t*D*2]];
 // Continuous, gently irregular horizons, rather than vertical color strips.
 function horizons(x,z){const h=height(x,z),n=noise(x*.78+11,z*.78+13),q=noise(x*2.4,z*2.4);return[h,h-.10-q*.04,h-.32-n*.16,-1.19+(n-.5)*.24,-1.84+(q-.5)*.15,-2.55];}
 const soilColors=['3c3928','64563c',desert?'958260':'81704f','a0906f','a39b84'];
 for(let side=0;side<4;side++)for(let k=0;k<152;k++){
  const [x,z]=sides[side](k/152),[xx,zz]=sides[side]((k+1)/152),top=horizons(x,z),next=horizons(xx,zz);
  for(let layer=0;layer<5;layer++){
   const col=V.mul(hex(soilColors[layer]),.94+noise(x*.7+4,z*.7+3)*.10);
   earth.quad([x,top[layer],z],[xx,next[layer],zz],[xx,next[layer+1],zz],[x,top[layer+1],z],col);
  }
 }
 add(earth,[{}],{kind:9},'soil');
 let plinth=new G();box(plinth,[0,-2.70,0],[18.12,.26,13.12],hex('223536'));box(plinth,[0,-2.57,0],[18.02,.025,13.02],hex('62817a'));add(plinth,[{}],{},'base');
 let rock=new G();rock.sphere([0,0,0],[1,.68,.84],WHITE,13,9,.58,r);let stones=[];for(let i=0;i<280;i++){let x=(r()-.5)*17.85,z=(r()-.5)*12.9,h=height(x,z);if(r()<.45||waterTest(x,z)||desert||(mountain&&h>5.4)){let s=.07+r()*.20;stones.push({p:[x,h-.01,z],s:[s*(1+r()),s,s],a:r()*6.28,c:V.mix(hex('646c5c'),hex('aca78b'),r())});}}
 for(let i=0;i<170;i++){let x=(r()-.5)*17.95,s=.08+r()*.14,y=-1.7+r()*.7;stones.push({p:[x,y,6.49],s:[s,s*.6,s*.38],a:r()*6.28,c:V.mix(hex('555e59'),hex('a79f85'),r())});}add(rock,stones,{kind:7},'rocks');
 // A restrained museum plinth and its ground grid give a true spatial reference.
 let grid=new G();for(let k=-16;k<=16;k+=2){grid.quad([-17,-2.88,k],[17,-2.88,k],[17,-2.88,k+.012],[-17,-2.88,k+.012],hex('1a302f'));grid.quad([k,-2.88,-16],[k+.012,-2.88,-16],[k+.012,-2.88,16],[k,-2.88,16],hex('1a302f'));}add(grid,[{}],{opacity:.16,cast:false,snow:false},'grid');
 let ground=new G();ground.quad([-19,-2.91,-16],[-19,-2.91,16],[19,-2.91,16],[19,-2.91,-16],hex('101d20'));add(ground,[{}],{opacity:.035,cast:false,snow:false},'grid');
 if(stream){
  const water=new G(),level=.235;
  function clippedWater(points){
   const polygon=[];
   for(let i=0;i<3;i++){
    const a=points[i],b=points[(i+1)%3],inside=a[1]<level,next=b[1]<level;
    if(inside)polygon.push(a);
    if(inside!==next){const t=(level-a[1])/(b[1]-a[1]);polygon.push([a[0]+(b[0]-a[0])*t,level,a[2]+(b[2]-a[2])*t]);}
   }
   if(polygon.length<3)return;
   const base=water.p.length/3;
   for(const p of polygon){const d=clamp((level-p[1])*2.6,.04,.95);water.vertex([p[0],level,p[2]],[0,1,0],[d,.5,.5],[p[0],p[2]]);}
   for(let j=1;j<polygon.length-1;j++)water.i.push(base,base+j,base+j+1);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const x=-W+i/nx*18,z=-D+j/nz*13,xx=x+18/nx,zz=z+13/nz;
   const a=[x,height(x,z),z],b=[x,height(x,zz),zz],c=[xx,height(xx,zz),zz],d=[xx,height(xx,z),z];
   clippedWater([a,b,d]);clippedWater([b,c,d]);
  }
  add(water,[{}],{kind:3,cast:false},'water');
 let pads=new G();
 for(let k=0;k<(wet?56:25);k++){
  const a=r()*6.28,rad=.30+r()*(wet?3.1:1.8),x=3.6+Math.cos(a)*rad,z=2.1+Math.sin(a)*rad*.70;
  if(height(x,z)<.17){const size=.07+r()*.11,angle=r()*6.28;
   for(let n=1;n<22;n++){
    const aa=angle+n/24*6.28,ab=angle+(n+1)/24*6.28;
    pads.tri([x,.253,z],[x+Math.cos(aa)*size,.25,z+Math.sin(aa)*size],[x+Math.cos(ab)*size,.25,z+Math.sin(ab)*size],V.mul(hex(k%2?'6c8855':'4b7559'),.94+(n%2)*.06));
   }
   for(let q=1;q<8;q++){const t=angle+q/8*6.28;pads.cylinder([x,.256,z],[x+Math.cos(t)*size*.86,.254,z+Math.sin(t)*size*.86],.0011,.0007,hex('82966c'),4);}
  }
 }
 sc.pads=add(pads,[{}],{cast:false,snow:false},'water');}
 const typesPositions={};function put(type,p,s=1,a=0,col=WHITE){(typesPositions[type]||=[]).push({p,s,a,c:col});}
 const treePositions=[];
 // Deterministic blue-noise-like placement: neighbouring trunks do not overlap.
 const occupied=[];let target=rain?52:needle?62:desert?17:grass?7:wet?10:layers?16:succ?32:mountain?78:30;
 for(let k=0;k<target*16 && treePositions.length<target;k++){let x=(r()-.5)*16.9,z=(r()-.5)*12.0,h=height(x,z);if(waterTest(x,z)||h<.25)continue;if(!types&&!mountain&&!layers&&!succ&&!((x<-1.7&&z<2.8)||(x>3.6&&z<-2.7)))continue;if(wet&&pond(x,z)<2.10)continue;if(mountain&&h>5.4)continue;
 let min=layers?2.45:rain?1.34:mountain?.75:1.65;if(occupied.some(p=>(x-p[0])**2+(z-p[1])**2<min*min))continue;occupied.push([x,z]);
 let type=desert?'shrub':needle?'pine':grass?'acacia':rain?'tropical':mountain?(h>2.4?'pine':'broadleaf'):'broadleaf';if(!types&&!mountain&&!layers&&!succ&&!seasons&&z<-2&&r()<.65)type='pine';let s=desert?.6+r()*.55:grass?.8+r()*.28:layers?.94+r()*.20:mountain?.39+r()*.34:.67+r()*.39;
 if(mountain)s*=1-smooth(3.5,5.5,h)*.44;put(type,[x,h,z],s,r()*6.28,V.mix(hex('b5c6a0'),WHITE,r()));treePositions.push({x,z,h,s,type});}
 if(!mountain&&!desert&&!grass&&!wet&&!succ&&!layers){for(let[x,z]of[[-7.1,5.35],[-4.8,4.55]]){let h=height(x,z);put('broadleaf',[x,h,z],.61,1);treePositions.push({x,z,h,s:.61,type:'broadleaf'});}}
 for(let[type,instances]of Object.entries(typesPositions)){for(let v=0;v<5;v++){let subset=instances.filter((_,i)=>i%5===v),geo=getTree(type,25+v*100);let bark=add(geo.wood,subset,{season:false,kind:6},type==='shrub'?'shrubs':'canopy');let leaf=add(geo.leaves,subset,{kind:2,season:seasons},type==='shrub'?'shrubs':'canopy');if(succ){sc.instances['tree'+v]={instances:subset,bark,leaf};}}}
 let bushPositions=[];for(let k=0;k<(layers?32:desert?38:rain?48:mountain?90:62);k++){let x=(r()-.5)*17.4,z=(r()-.5)*12.3,h=height(x,z);if(waterTest(x,z)||h<.24||mountain&&h>6.6)continue;if(grass&&r()>.10)continue;if(!types&&!layers&&!mountain&&!succ&&z>1.3&&r()>.2)continue;let s=desert?.30+r()*.4:.35+r()*.42;bushPositions.push({p:[x,h,z],s,a:r()*6.28,c:desert?hex('a8aea0'):WHITE});}
 let bgeo=getTree('shrub',34),bark=add(bgeo.wood,bushPositions,{kind:6},'shrubs'),bleaf=add(bgeo.leaves,bushPositions,{kind:2,season:seasons},'shrubs');if(succ)sc.instances.bush={instances:bushPositions,bark,leaf:bleaf};
 let grassPositions=[],fernPositions=[];const grasses=desert?450:grass?6400:layers?3000:rain?2600:mountain?5200:5800;
 for(let k=0;k<grasses;k++){let x=(r()-.5)*17.90,z=(r()-.5)*12.90,h=height(x,z);if(h<.24||waterTest(x,z)||mountain&&h>6.65)continue;if(desert&&fbm(x*2,z*2)<.61)continue;const patch=fbm(x*.54+28,z*.54+3);if(!grass&&!desert&&r()>patch*.52+.42)continue;let cover=.45+r()*.64;grassPositions.push({p:[x,h,z],s:[cover,cover*(grass?1.30:layers?.67:.74),cover],a:r()*6.28,c:V.mix(hex(desert?'c6b790':'a0b993'),WHITE,r()*.7)});if(k%85===0&&!desert&&!grass)fernPositions.push({p:[x,h+.01,z],s:.7+r()*.65,a:r()*6.28,c:WHITE});}
 let gmesh=add(grassGeometry(96,desert||grass),grassPositions,{kind:4,season:seasons},'herbs');let fmesh=add(fernGeometry(),fernPositions,{kind:4,season:seasons},'herbs');if(succ){sc.instances.grass={instances:grassPositions,mesh:gmesh};sc.instances.fern={instances:fernPositions,mesh:fmesh};}
 // Individual flowers, not a billboard: a quiet scale cue within the meadow.
 let flower=new G();flower.cylinder([0,0,0],[0,.3,0],.008,.005,hex('658348'),4);for(let j=0;j<5;j++){let a=j/5*6.28;flower.sphere([Math.cos(a)*.046,.3,Math.sin(a)*.046],[.044,.016,.026],hex('c9be8a'),5,3);}let flowers=[];if(!desert&&!rain&&!layers&&!succ)for(let k=0;k<180;k++){let x=(r()-.5)*17,z=(r()-.5)*12,h=height(x,z);if(h>.27&&!waterTest(x,z)&&(!mountain||h>4&&h<6))flowers.push({p:[x,h,z],s:.55+r()*.6,c:k%5?WHITE:hex('b39acb')});}sc.flowers=add(flower,flowers,{kind:4},'herbs');
 if(stream){let reeds=[];for(let k=0;k<(wet?1080:580);k++){let x=(r()-.5)*17.6,z=(r()-.5)*12.5,h=height(x,z),d=pond(x,z);if(h>.1&&h<.55&&(Math.abs(x-riverX(z))<1.1||d<1.8))reeds.push({p:[x,Math.max(.08,h),z],s:.65+r()*.45,a:r()*6.28,c:WHITE});}add(reedGeometry(203),reeds,{kind:4},'reeds');
 // A small observation boardwalk makes the wetland legible without buildings.
 if(!seasons&&(!types||wet)){let board=new G();for(let k=0;k<22;k++){let z=3.25-k*.19,x=5.75+Math.sin(k*.08)*.34;box(board,[x,.69,z],[1.0,.06,.16],hex(k%3?'8d8967':'a39c76'));if(k%6===0){board.cylinder([x-.40,-.05,z],[x-.40,.67,z],.037,.037,hex('514f3a'),6);board.cylinder([x+.40,-.05,z],[x+.40,.67,z],.037,.037,hex('514f3a'),6);}}add(board,[{}],{},'boardwalk');}}

 // Forest-floor scale cues: exposed surface roots, nurse logs, twigs, and small mushrooms.
 if(!desert&&!grass&&!succ){
  const details=new G(),woodDetail=new G(),rootDetail=new G();
  for(let k=0;k<(rain?4:3);k++){
   const x=-6+k*3.2,z=1.4+k*.59,h=height(x,z);
   if(waterTest(x,z))continue;
   const end=[x+1.15,h+.10,z+.42],start=[x-.18,h+.12,z];
   woodDetail.tube([start,[x+.38,h+.15,z+.21],end],[.11,.10,.075],hex('756249'),13);
   woodDetail.sphere(end,[.076,.074,.076],hex('b7a17a'),12,7,.04,r);
   for(let q=0;q<3;q++){
    let px=x+.35+q*.12,py=h+.13+q*.025,pz=z-.075;
    details.cylinder([px,py,pz],[px,py+.12,pz],.012,.009,hex('d3c8a1'),7);
    details.sphere([px,py+.135,pz],[.065,.035,.059],hex(q%2?'ac8257':'c2ae80'),12,7,.05,r);
   }
  }
  treePositions.filter((p,i)=>i%4===0).forEach((p,i)=>{
   for(let k=0;k<4;k++){
    const a=k*2.399+i,pts=[],rs=[];
    for(let j=0;j<=7;j++){
     const t=j/7,x=p.x+Math.cos(a)*t*.77*p.s,z=p.z+Math.sin(a)*t*.77*p.s;
     pts.push([x,height(x,z)+.023,z]);rs.push(.039*(1-t)+.002);
    }
    rootDetail.tube(pts,rs,hex('817356'),7);
   }
  });
  add(woodDetail,[{}],{kind:6},'floorDetails');add(details,[{}],{},'floorDetails');add(rootDetail,[{}],{kind:6},'floorDetails');
 }
 // A restrained scattering of leaf litter; it does not appear on the succession starting ground.
 if(!seasons&&!desert&&!grass&&!succ){
  const litterGeo=new G();litterGeo.leaf([0,.014,0],.082,.4,0,hex('9b8658'),()=>.5);const litter=[];
  for(let k=0;k<380;k++){
   const x=(r()-.5)*17.6,z=(r()-.5)*12.6,h=height(x,z);
   if(h>.27&&!waterTest(x,z))litter.push({p:[x,h+.02,z],s:.65+r()*.75,a:r()*6.28,c:V.mix(hex('b7a188'),WHITE,r())});
  }
  add(litterGeo,litter,{kind:2,cast:false},'floorDetails');
 }
 let fullRoots=new G();if(!mountain){let selected=treePositions.filter((p,i)=>i%7===0);selected.forEach((p,i)=>rootsAt(fullRoots,[p.x,Math.min(p.h,.38),p.z],601+i));if(desert){for(let k=0;k<8;k++){let x=-7+k*1.8;rootsAt(edgeRoot,[x,height(x,6.5),6.515],95+k,true);}}else{for(let x of[-7.1,-4.8,-1.9,3.4,6.8])rootsAt(edgeRoot,[x,height(x,6.5)-.04,6.515],Math.floor(x*100+2000),true);}}add(edgeRoot,[{}],{kind:6},'edgeRoots');add(fullRoots,[{}],{visible:false,kind:6},'roots');
 if(seasons){
  let litterGeo=new G();litterGeo.leaf([0,.015,0],.14,.5,0,hex('b38242'));let litter=[];
  for(let k=0;k<1100;k++){let x=(r()-.5)*17.5,z=(r()-.5)*12.6,h=height(x,z);if(h>.27&&!waterTest(x,z))litter.push({p:[x,h+.035,z],s:.48+r()*.68,a:r()*6.28,c:V.mix(hex('b78b64'),WHITE,r())});}
  sc.litter=add(litterGeo,litter,{kind:2,opacity:0,cast:false},'litter');
  let fallingGeo=new G();fallingGeo.leaf([0,0,0],.105,.4,.8,hex('c39748'));let falling=[];
  treePositions.slice(0,32).forEach((p,i)=>{falling.push({p:[p.x,p.h+2.3*p.s,p.z],s:.75+r()*.7,a:r()*6.28,c:WHITE,alpha:p.h+r()*.001,ground:p.h+.1,ceiling:p.h+2.8*p.s,seed:r()*12});});
  sc.leafFallOrigins=falling;sc.fallingLeaves=add(fallingGeo,falling,{kind:8,opacity:0,cast:false},'fallingLeaves');
 }
 // Light motes remain geometry in 3D, with stable positions and no random per-frame flicker.
 let motesGeo=new G();motesGeo.quad([-.08,-.08,0],[.08,-.08,0],[.08,.08,0],[-.08,.08,0],hex('cbd5a0'));let motes=[];for(let k=0;k<32;k++)motes.push({p:[(r()-.5)*16,.7+r()*3,(r()-.5)*11],s:.24+r()*.28,a:r()*6.28,c:WHITE});sc.moteOrigins=motes;sc.motes=add(motesGeo,motes,{kind:5,opacity:.50,cast:false},'motes');
 sc.treePositions=treePositions;
 if(chapter==='overview'){sc.labels=[{id:'forest',text:translate('森林'),en:'FOREST',p:[-4.7,5.1,-2.5],tone:'green'},{id:'meadow',text:translate('草地'),en:'MEADOW',p:[-.1,1.2,4.35],tone:'lime'},{id:'wetland',text:translate('湿地植被'),en:'WETLAND',p:[4.7,1.6,1.5],tone:'blue'},{id:'roots',text:translate('地下的生命'),en:'ROOT SYSTEM',p:[-4.6,-.70,6.57],tone:'sand'}];}
 if(layers){sc.labels=[{id:'canopy',text:translate('乔木层'),en:'TREE LAYER',p:[-3.3,4.0,-1.4],tone:'green'},{id:'shrubs',text:translate('灌木层'),en:'SHRUB LAYER',p:[3.7,1.1,1.7],tone:'lime'},{id:'herbs',text:translate('草本层'),en:'HERB LAYER',p:[-1.0,.55,4.1],tone:'lime'},{id:'roots',text:translate('根系与枯落物'),en:'BELOW THE CANOPY',p:[-4.3,-.6,6.56],tone:'sand'}];}
 if(types){let names={broadleaf:[translate('温带落叶阔叶林'),'DECIDUOUS FOREST'],rainforest:[translate('热带雨林'),'TROPICAL RAINFOREST'],conifer:[translate('针叶林'),'CONIFEROUS FOREST'],grassland:[translate('热带稀树草原'),'SAVANNA'],desert:[translate('荒漠植被'),'DESERT VEGETATION'],wetland:[translate('湿地植被'),'WETLAND VEGETATION']};sc.labels=[{id:'form',text:names[biome][0],en:names[biome][1],p:[-3.8,desert?1.4:grass?2:5,-1],tone:'green'},{id:'adaptation',text:desert?translate('稀疏、低矮与耐旱'):grass?translate('以草本为主'):wet?translate('适应水湿环境'):translate('多样的生长形态'),en:'ADAPTATION',p:[3.2,.9,4.0],tone:'lime'},{id:'roots',text:translate('观察根系'),en:'BELOWGROUND',p:[-4.1,-.6,6.56],tone:'sand'}];}
 if(mountain){sc.labels=[{id:'low',text:translate('山地阔叶林'),en:'LOWER SLOPES',p:[-5.9,2.4,3.3],tone:'green'},{id:'middle',text:translate('山地针叶林'),en:'CONIFER BELT',p:[-3.3,5.1,.15],tone:'green'},{id:'high',text:translate('高山灌丛 · 草甸'),en:'ABOVE THE TREELINE',p:[1.3,6.3,-1.1],tone:'lime'},{id:'rock',text:translate('稀疏植被与裸岩'),en:'UPPER SLOPES',p:[-.4,8.7,-.85],tone:'sand'}];}
 if(seasons){sc.labels=[{id:'canopy',text:translate('同一片落叶阔叶林'),en:'THE SAME FOREST',p:[-4,4.8,-2],tone:'green'},{id:'season',text:translate('新叶展开'),en:'SPRING',p:[2.8,1.5,4.3],tone:'lime'},{id:'litter',text:translate('枯落物回归地表'),en:'LEAF LITTER',p:[-3.5,-.32,6.56],tone:'sand'}];}
 if(succ){sc.labels=[{id:'stage',text:translate('土壤保留的裸地'),en:'SECONDARY SUCCESSION',p:[-2,2,0],tone:'green'},{id:'soil',text:translate('土壤与部分繁殖体仍在'),en:'A LIVING STARTING POINT',p:[-4,-.6,6.56],tone:'sand'}];}
 sc.setRoots=(show)=>{(sc.groups.roots||[]).forEach(m=>{m.options.visible=true;m.options.opacity=show?1:0;});(sc.groups.soil||[]).forEach(m=>m.options.opacity=show?.16:1);(sc.groups.terrain||[]).forEach(m=>m.options.opacity=show?.24:1);engine.shadowDirty=true;};
 sc.setCanopy=(v)=>{(sc.groups.canopy||[]).forEach(m=>m.options.opacity=clamp(v));engine.shadowDirty=true;};
 sc.setLayer=(name)=>{for(let k of['canopy','shrubs','herbs']){(sc.groups[k]||[]).forEach(m=>m.options.opacity=name==='all'||name===k?1:.065);}sc.setRoots(name==='roots');engine.shadowDirty=true;};
 sc.setSuccession=(v)=>{sc.recovery=v;
  for(const [key,item]of Object.entries(sc.instances)){
   const tree=key.startsWith('tree'),bush=key==='bush';
   const value=smooth(tree?.49:bush?.25:.025,tree?.99:bush?.69:.34,v);
   for(const name of['mesh','bark','leaf'])if(item[name])item[name].options.growth=value;
  }
  if(Math.abs(v-(sc.lastShadowGrowth??-1))>.018){engine.shadowDirty=true;sc.lastShadowGrowth=v;}
 };
 // Continuous GPU contour: no repeated allocation of thousands of little cylinders.
 sc.setAltitude=(value)=>{sc.altitudeGoal=.35+value/100*7.0;};
 if(mountain)sc.setAltitude(48);if(succ)sc.setSuccession(0);
 sc.dispose=()=>sc.meshes.forEach(m=>m.dispose());
 return sc;
}
Object.assign(A,{createScene});
})(VA);


/* 教学内容与交互数据。示意模型，不是测量数据或生态预测。 */
(function(A){
A.chapters=[
 {id:'overview',name:translate('认识植被'),sub:translate('从一棵树到一片生境'),en:'LIVING LANDSCAPES',icon:'leaf',title:translate('一片绿意，万千生境。'),desc:translate('从树冠到草尖，走进植物共同构成的立体世界。'),tag:translate('生境观察'),duration:translate('建议 5 分钟'),steps:[[translate('看见差异'),translate('比较森林、草地与湿地的外貌。'),'forest'],[translate('走近群落'),translate('不只看一棵树，也看它的邻居。'),'meadow'],[translate('看向地下'),translate('地表之下，根系也在利用空间。'),'roots']],question:translate('同一片景观中的植被，为什么不是整齐一致的？'),answer:translate('植被是一个地区植物群落的总体。局地水分、土壤、地形和干扰的差异，使不同植物在不同位置生长，形成相互联系的生境。'),junior:translate('先比较植物的高矮、疏密和叶片，再给森林、草地、湿地找到位置。'),senior:translate('区分“植物个体”“植物群落”与“植被”，讨论局地生境的空间异质性。'),note:translate('这是复合生境的教学拼景，不代表一个真实地点；树木、根系及土层比例经过可视化调整。'),sources:[0,1,4]},
 {id:'layers',name:translate('森林的层次'),sub:translate('把一片森林慢慢打开'),en:'LAYERS OF A FOREST',icon:'layers',title:translate('森林，不只有树冠。'),desc:translate('逐层观察乔木、灌木和草本，让被遮住的生命显现出来。'),tag:translate('垂直结构'),duration:translate('建议 7 分钟'),steps:[[translate('完整的森林'),translate('从外部观察树冠与高低差异。'),'canopy'],[translate('移开上层'),translate('降低乔木层的不透明度，寻找灌木与草本。'),'shrubs'],[translate('上下相连'),translate('透视根系，联系枯落物与地表。'),'roots']],question:translate('森林中的植物，为什么会有高低不同的层次？'),answer:translate('不同植物的生活型、生长高度与耐阴能力不同。上层树冠截获较多光照，能适应较弱光照的植物也可在林下生活，形成垂直结构。分层复杂程度因森林类型而异。'),junior:translate('识别乔木、灌木与草本三个生活型，找出它们所在的大致高度。'),senior:translate('联系光照差异、生态位与空间利用；注意藤本和附生植物不一定只属于一个高度层。'),note:translate('本章用三种生活型展示基本分层，不把它当作所有森林的固定层数；根系和土壤仅作辅助示意。'),sources:[3,0]},
 {id:'biomes',name:translate('不同的绿色'),sub:translate('植被的形态与适应'),en:'FORMS & ADAPTATIONS',icon:'trees',title:translate('不同生境，不同模样。'),desc:translate('切换六种典型植被，比较外貌，而不是只记住名字。'),tag:translate('对比探究'),duration:translate('建议 8 分钟'),steps:[[translate('先看外貌'),translate('比较植株的高矮、疏密与优势生活型。'),'form'],[translate('再看适应'),translate('找出这些形态可能解决的问题。'),'adaptation'],[translate('不要绝对化'),translate('同一植被类型内部也存在差异。'),'roots']],question:translate('荒漠里，植物是不是只有“把根扎得很深”一种办法？'),answer:translate('不是。不同荒漠植物可采用深根、广布浅根、缩小叶面积、储水或短暂生长等不同策略。图中的稀疏灌丛只是示例，不能据此推断所有荒漠植物的根系。'),junior:translate('把乔木占优势、草本占优势和植被稀疏三种外貌对应起来。'),senior:translate('从形态特征提出适应假说，再讨论其他因素与反例；不把相关性当作单一因果。'),note:translate('六种场景展示典型外貌，未按照真实地点或统一比例重建；湿地可以分布在不同地带。'),sources:[0,1,2,4]},
 {id:'mountain',name:translate('一座山的植被'),sub:translate('从山麓走向山顶'),en:'ALONG THE ALTITUDE',icon:'mountain',title:translate('向上走，绿色在改变。'),desc:translate('沿着观察线攀升，看看高大乔木如何让位于低矮植被。'),tag:translate('垂直地带性'),duration:translate('建议 7 分钟'),steps:[[translate('从山麓开始'),translate('观察较低处的阔叶林。'),'low'],[translate('穿过森林带'),translate('追踪针叶林在坡面上的位置。'),'middle'],[translate('越过林线'),translate('寻找低矮灌丛、草甸和稀疏植被。'),'high']],question:translate('所有山地都有这套植被带，林线也都在相同海拔吗？'),answer:translate('不是。山地植被带受纬度、山体高度、坡向、水热条件及干扰等影响。此处只展示一种简化组合，不设置通用的固定海拔界限。'),junior:translate('自下而上描述植被外貌的变化，区分林线与山顶。'),senior:translate('解释山麓基带、带谱完整程度和林线的地区差异，并讨论坡向影响。'),note:translate('观察高度是模型内的相对高度，不是实测海拔。本模型不代表某座山，也不是普适的植被带谱。'),sources:[0,5]},
 {id:'seasons',name:translate('一片叶的四季'),sub:translate('在同一片森林里等待'),en:'A FOREST THROUGH TIME',icon:'season',title:translate('留在原地，看四季经过。'),desc:translate('拖动季节轴，观察同一片落叶阔叶林的展叶、繁茂与落叶。'),tag:translate('植被季相'),duration:translate('建议 5 分钟'),steps:[[translate('春夏展叶'),translate('关注新叶展开与树冠变得浓密。'),'canopy'],[translate('秋季变色'),translate('比较叶色和树冠覆盖的变化。'),'season'],[translate('冬季落叶'),translate('枝干显露，枯落物回到地表。'),'litter']],question:translate('冬季落叶，是树木死亡了吗？'),answer:translate('不是。许多温带落叶树会在不利季节落叶并进入休眠，来年条件适宜时重新展叶。常绿与落叶、叶片寿命与落叶时序是不同概念，常绿树也会更新叶片。'),junior:translate('用“同一片森林”排除地点差异，描述叶色与疏密的季节变化。'),senior:translate('比较常绿与落叶策略，指出具体物候时间因树种、纬度和年份而变化。'),note:translate('本章只模拟落叶阔叶林。季相节点与冬季积雪是示例，不对应某年的物候日历。'),sources:[0]},
 {id:'succession',name:translate('植被如何归来'),sub:translate('一片土地的慢镜头'),en:'THE RETURN OF VEGETATION',icon:'sprout',title:translate('一片土地，重新长出绿色。'),desc:translate('从土壤仍保留的裸地出发，观察一种可能的植被恢复过程。'),tag:translate('次生演替'),duration:translate('建议 8 分钟'),steps:[[translate('起点不是零'),translate('裸露地表之下，土壤仍然存在。'),'soil'],[translate('群落在改变'),translate('草本、灌木和幼树逐渐改变优势。'),'stage'],[translate('不止一种结局'),translate('森林只是适宜条件下的一种可能。'),'stage']],question:translate('是不是只要一直等待，任何草地最终都会变成森林？'),answer:translate('不是。此处假设环境适宜森林且没有持续的强干扰。水分、土壤、种源、火、放牧和人为活动都可能改变路径。演替不是所有地区都遵循的单向阶梯。'),junior:translate('描述植被覆盖与高度的变化，知道这是一段过程而非几张地点照片。'),senior:translate('比较初生与次生演替的起点，讨论干扰、种源和多种恢复路径；不套用固定年数。'),note:translate('这是保留土壤条件下的一条次生演替示意路径；进度条没有真实时间单位，不用于预测恢复年限。'),sources:[1]}
];
A.biomes=[
 {id:'broadleaf',name:translate('落叶阔叶林'),short:translate('阔叶林'),en:'DECIDUOUS FOREST',form:translate('乔木占优势'),leaf:translate('阔叶 · 季节性落叶'),structure:translate('多层结构'),adapt:translate('叶片在适宜季节展开；不少树种通过季节性落叶度过不利时期。'),color:'#8fb773',detail:translate('从树冠的轮廓、枝条与叶片开始，辨认一片森林的外貌。'),src:0},
 {id:'rainforest',name:translate('热带雨林'),short:translate('雨林'),en:'TROPICAL RAINFOREST',form:translate('高大乔木'),leaf:translate('阔叶 · 多数常绿'),structure:translate('层次通常复杂'),adapt:translate('乔木高大，常可见板根、藤本或附生植物；并非每一棵树都具有全部特征。'),color:'#61b28c',detail:translate('密集的树冠与丰富的林下植物，共同利用立体空间。'),src:0},
 {id:'conifer',name:translate('针叶林'),short:translate('针叶林'),en:'CONIFEROUS FOREST',form:translate('针叶乔木'),leaf:translate('针状或鳞片状叶'),structure:translate('外貌相对整齐'),adapt:translate('针状叶和常见的尖塔形树冠是识别线索；针叶树并不全都常绿，例如落叶松。'),color:'#75a19b',detail:translate('观察较窄的叶片与树冠形状，比较阔叶林的轮廓。'),src:0},
 {id:'grassland',name:translate('热带稀树草原'),short:translate('稀树草原'),en:'TROPICAL SAVANNA',form:translate('草本占优势'),leaf:translate('草本与零散乔木'),structure:translate('开阔的草层'),adapt:translate('草本构成连续的背景，乔木散布其间；季节性水分变化、火和食草动物都可能影响结构。'),color:'#c8b77b',detail:translate('这里演示的是稀树草原，不把少量乔木当作所有草原的特征。'),src:1},
 {id:'desert',name:translate('荒漠植被'),short:translate('荒漠'),en:'DESERT VEGETATION',form:translate('稀疏灌木与草本'),leaf:translate('常见小叶等耐旱形态'),structure:translate('覆盖稀疏'),adapt:translate('节水、储水、深根或广布浅根等策略各有适用条件，不能用单一形态概括所有荒漠植物。'),color:'#c5a77e',detail:translate('看起来空旷的地方，也有适应干旱的生命。'),src:2},
 {id:'wetland',name:translate('湿地植被'),short:translate('湿地'),en:'WETLAND VEGETATION',form:translate('湿生与水生植物'),leaf:translate('示例：挺水和浮叶植物'),structure:translate('随水位呈斑块分布'),adapt:translate('长期或季节性水湿条件有利于特殊适应的植物；湿地也可以由灌木或乔木占优势。'),color:'#7bc0c3',detail:translate('沿着水陆交错的边缘，寻找芦苇状挺水植物与浮叶植物。'),src:4}
];
A.hotspots={
 forest:{title:translate('一座立体的森林'),en:'FOREST COMMUNITY',desc:translate('乔木构成上层轮廓，林下还有灌木、草本与幼苗。森林不是许多相同的树简单相加。'),facts:[[translate('优势生活型'),translate('乔木')],[translate('观察线索'),translate('高低分层')]],note:translate('下一章可以逐层打开这片森林。'),symbol:'trees'},
 meadow:{title:translate('草尖上的世界'),en:'MEADOW COMMUNITY',desc:translate('低矮草本形成连续的绿色背景。仔细看，不同高度、叶形和花色也构成了草地内部的差异。'),facts:[[translate('优势生活型'),translate('草本')],[translate('观察线索'),translate('低矮、开阔')]],note:translate('草地不等于“没有长成的森林”。'),symbol:'grass'},
 wetland:{title:translate('水陆之间的绿色'),en:'WETLAND VEGETATION',desc:translate('图中挺水和浮叶植物占据水陆交错带。它们展示了植物对水湿生境的不同适应。'),facts:[[translate('生境线索'),translate('水湿')],[translate('示例形态'),translate('挺水、浮叶')]],note:translate('湿地植被并不只有芦苇和水草。'),symbol:'water'},
 roots:{title:translate('地下，同样有层次'),en:'THE WORLD BELOW',desc:translate('根系把地上植被与地下环境连接起来。打开根系透视，观察不同方向的分枝与空间分布。'),facts:[[translate('观察对象'),translate('植物根系')],[translate('模型性质'),translate('结构示意')]],note:translate('根系形状与比例经过简化，不代表具体树种。'),symbol:'roots'},
 canopy:{title:translate('向光生长的乔木层'),en:'TREE LAYER',desc:translate('较高的树冠构成森林上层。降低它的不透明度，就能看到原本被遮挡的灌木与草本。'),facts:[[translate('主要生活型'),translate('乔木')],[translate('空间位置'),translate('森林上层')]],note:translate('树冠层并不意味着只有一种树高。'),symbol:'trees'},
 shrubs:{title:translate('林下的灌木层'),en:'SHRUB LAYER',desc:translate('较低矮的木本植物占据林下空间。不同耐阴能力与生长形态帮助植物利用不同的环境。'),facts:[[translate('主要生活型'),translate('灌木')],[translate('空间位置'),translate('乔木层下方')]],note:translate('注意区分灌木与乔木的幼苗。'),symbol:'sprout'},
 herbs:{title:translate('贴近地面的草本层'),en:'HERB LAYER',desc:translate('草本、蕨类和幼苗出现在林地表层。用“只看草本”去掉遮挡，观察它们的分布。'),facts:[[translate('主要生活型'),translate('草本')],[translate('空间位置'),translate('近地表')]],note:translate('不同森林的林下草本密度并不相同。'),symbol:'grass'}
};
A.sources=[
 ['UC Berkeley · The forest biome','https://ucmp.berkeley.edu/exhibits/biomes/forests.php',translate('森林类型与季节性差异')],
 ['UC Berkeley · The grassland biome','https://ucmp.berkeley.edu/exhibits/biomes/grasslands.php',translate('草原、稀树草原与干扰')],
 ['UC Berkeley · The desert biome','https://ucmp.berkeley.edu/exhibits/biomes/deserts.php',translate('荒漠植被形态与适应')],
 ['U.S. National Park Service · Forests','https://www.nps.gov/kaww/learn/nature/forests.htm',translate('树冠、林下与森林地表')],
 ['U.S. EPA · What is a Wetland?','https://www.epa.gov/wetlands/what-wetland',translate('水湿生境与湿地植物')],
 ['UC Berkeley · The tundra biome','https://ucmp.berkeley.edu/exhibits/biomes/tundra.php',translate('高山低矮植被的基本特征')]
];
A.questions=[
 {q:translate('下面哪一个描述，最接近“植被”的含义？'),options:[translate('一棵树所有的叶片'),translate('一个地区植物群落的总体'),translate('只包括高大的森林')],correct:1,explain:translate('从个体走向整体：森林、草原、荒漠等不同植物群落共同构成一个地区的植被。')},
 {q:translate('降低乔木层的不透明度后，为什么还能看见其他绿色植物？'),options:[translate('森林中存在灌木、草本等不同层次'),translate('这些植物都是树上落下的叶子'),translate('所有植物最后都会变成高大乔木')],correct:0,explain:translate('森林的垂直结构与不同植物的生活型、生长高度和对光照等条件的适应有关。')},
 {q:translate('关于荒漠植被，哪种说法更准确？'),options:[translate('荒漠植物都没有叶片'),translate('所有植物都只能长很深的根'),translate('不同植物具有不同的耐旱策略')],correct:2,explain:translate('深根、浅而广的根、减小叶面积、储水和短生等都是可能的适应策略，不能一概而论。')},
 {q:translate('这座示意山的林线，能当作所有山地通用的林线吗？'),options:[translate('可以，树木都在固定海拔停止生长'),translate('不可以，林线及植被带因地区与环境而异'),translate('可以，只要山顶有裸岩')],correct:1,explain:translate('纬度、坡向、山体条件及干扰等都会影响植被带。滑杆表示模型内相对观察高度，不是统一海拔。')},
 {q:translate('同一片温带落叶阔叶林，冬季树冠稀疏主要说明什么？'),options:[translate('所有树木已经死亡'),translate('这片森林已演替为草地'),translate('树木出现季节性落叶，枝干仍然存在')],correct:2,explain:translate('季相描述植被外貌随季节的变化。季节性落叶不等于树木死亡，也不等于群落发生演替。')},
 {q:translate('为什么本章称为“次生演替”的示意？'),options:[translate('起点仍保留土壤，不是从完全没有土壤的基质开始'),translate('因为必须出现第二片森林'),translate('因为一定会在固定年数内完成')],correct:0,explain:translate('本章假设干扰后土壤仍在。恢复的路径和时间取决于环境与干扰，不保证最终成为森林。')}
];
})(VA);


/* Application, classroom interactions and accessible UI. */
(function(A){
'use strict';
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)];
const paths={
 brand:'<path d="M18 37V20M18 27C3 28 3 14 5 5c11 1 16 8 13 19M18 21C18 9 25 3 33 2c2 11-2 22-15 24M18 37c-5-2-9-2-13 0m13 0c5-2 9-2 13 0"/>',
 leaf:'<path d="M5 20 18 7M8 17C1 11 7 4 20 3c0 13-6 19-12 14Z"/><path d="m10 12 5 0m-2-3v5"/>',
 trees:'<path d="m7 3-5 8h3l-4 6h5v4h2v-4h5l-4-6h3L7 3Zm10-1-4 7h2l-3 5h4v7h2v-7h5l-4-5h2l-4-7Z"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 mountain:'<path d="m2 20 7-13 4 6 4-10 6 17H2Z"/><path d="m6 13 3 2 2-2m4-5 2 2 2-1"/>',
 season:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="5"/>',
 sprout:'<path d="M12 21v-9m0 4C5 16 2 12 3 7c6 0 9 3 9 9Zm0-5c0-6 4-9 9-9 1 6-3 10-9 9ZM7 21h10"/>',
 cube:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5m-9 5v10M7.5 4.5l9 5v5"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v16"/>',
 notes:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4M3 12h4M3 17h4m4-10h6m-6 5h6m-6 5h4"/>',
 save:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
 present:'<rect x="3" y="3" width="18" height="13" rx="1"/><path d="m8 22 4-6 4 6M12 16v6m-3-12 6-3-6-3v6Z"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
 left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
 question:'<path d="M21 11a9 9 0 0 1-14 7l-5 2 2-5a9 9 0 1 1 17-4Z"/><path d="M9 8a3 3 0 0 1 5 0c1 2-2 3-2 4m0 3h.01"/>',
 top:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-8 9-1 5 9 5 9-5-1-5"/>',
 section:'<path d="M3 5h18v15H3V5Zm0 6h18M3 15h18m-9-12v19"/>',
 reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
 pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v6"/>',
 play:'<path d="m7 4 13 8-13 8V4Z"/>',pause:'<path d="M7 4h3v16H7V4Zm7 0h3v16h-3V4Z"/>',
 sliders:'<path d="M4 3v6m0 4v8m8-18v10m0 4v4m8-18v3m0 4v11M1 9h6m2 8h6m2-11h6"/>',
 close:'<path d="m5 5 14 14M5 19 19 5"/>',
 roots:'<path d="M12 2v9M3 8h18m-9 3-6 5-2 6m8-11 6 5 2 6m-8-11v11M6 16l-4 1m16-1 4 1M12 17l-4 4m4-7 4 6"/>',
 eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
 rotate:'<path d="M5 8a8 8 0 0 1 14 0m0-5v5h-5M5 21v-5h5m9 0a8 8 0 0 1-14 0"/>',
 pointer:'<path d="m4 3 6 18 3-8 8-3L4 3Zm9 10 7 7"/>',
 grass:'<path d="M12 22C12 8 7 3 3 2m9 20C11 10 18 3 21 2M6 22C7 13 2 10 1 9m17 13c-2-9 3-13 5-14M12 22V8"/>',
 water:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM8 15c0 2 1 3 3 3"/>',
 check:'<path d="m5 12 5 5L21 6"/>',
 print:'<path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6v-8Zm12-3h.01"/>'
};
function icon(name){return `<svg viewBox="${name==='brand'?'0 0 38 42':'0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="${name==='brand'?1.15:1.45}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.leaf}</svg>`;}
function icons(root=document){$$('[data-icon]',root).forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function specimenArt(type='trees'){
 let lines='';if(type==='roots'){lines='<path d="M74 13v37m-54 0h109M74 50 54 65l-9 31m29-46 25 19 9 29M74 50l-1 48M54 66l-22 9-10 18m32-24 9 20m36-20 22 8 11 18m-59-25-13 24m14-16 14 20"/>';}
 else if(type==='grass'||type==='water'){for(let i=0;i<11;i++){let x=27+i*8,y=85-(i%3)*7;lines+=`<path d="M${x} 97q${(i%3-1)*8} -${34+i%4*8} ${(i%2?1:-1)*(12+i%4*4)} -${44+i%4*9}"/>`;}if(type==='water')lines+='<path d="M10 100q25-12 52 0t52 0M17 104q25-10 52 0t52 0"/>';}
 else if(type==='mountain'){lines='<path d="m5 100 41-60 18 20L96 7l45 93H5Z"/><path d="m33 59 13 9 12-14m29-31 10 13 9-10M22 91l7-13 7 13m6-7 7-14 7 14m13-14 6-15 7 15m30 10 6-16 7 16"/>';}
 else{for(let [x,h,w,y] of [[48,66,24,95],[83,88,29,99],[114,58,19,99]]){if(type==='pine'){lines+=`<path d="M${x} ${y}V${y-h}m0 0-${w} ${h*.48}h${w*.5}l-${w*.66} ${h*.32}h${w*2.32}l-${w*.66}-${h*.32}h${w*.5}L${x} ${y-h}Z"/>`;}else{lines+=`<path d="M${x} ${y}V${y-h*.67}m0 ${h*.30}q-${w*.6}-${h*.28}-${w*.64}-${h*.37}m${w*.64} ${h*.26}q${w*.62}-${h*.33} ${w*.70}-${h*.38}"/><path d="M${x-w*.75} ${y-h*.33}c-${w} 1-${w} -${h*.28}-${w*.48}-${h*.35} -${w*.3}-${h*.30} ${w*.4}-${h*.5} ${w*.83}-${h*.4} ${w*.5}-${h*.20} ${w*1.1}-${h*.1} ${w*1.05} ${h*.15} ${w*.95} 0 ${w*1.03} ${h*.4} ${w*.57} ${h*.5} ${w*.46} ${h*.24}-${w*.2} ${h*.34}-${w*.8} ${h*.26}"/>`;}}lines+='<path d="M19 99q48-8 115 2"/>';}
 return `<svg class="specimen-art" viewBox="0 0 150 110" fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" aria-hidden="true">${lines}</svg>`;
}
let stored={};try{stored=JSON.parse(localStorage.getItem('vegetation-atlas-settings')||'{}');}catch{}
const state={chapter:'overview',biome:'broadleaf',selection:'forest',step:0,labels:true,roots:false,canopy:100,layer:'all',season:12,succession:0,altitude:48,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,grade:stored.grade==='senior'?'senior':'junior',auto:false,teaching:false,process:false,tour:false,view:'orbit',quality:innerWidth<760?'smooth':'high',visited:new Set(['overview'])};
let engine=null,scene=null,ticket=0,ready=false,tourTime=0,last=0,frame=0,changing=false,seasonCurrent=state.season/100,succCurrent=0,succSent=-1,opacityAnimations=[],labelNodes=[],quizIndex=0,quizAnswered=false,toastTimer,laser=false;
const current=()=>A.chapters.find(c=>c.id===state.chapter);
const biomeData=()=>A.biomes.find(b=>b.id===state.biome);
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3300);}
A.toast=toast;
function persist(){try{localStorage.setItem('vegetation-atlas-settings',JSON.stringify({grade:state.grade}));}catch{}}
function seasonName(v=state.season){return v<24?translate('春 · 新叶展开'):v<53?translate('夏 · 树冠繁茂'):v<83?translate('秋 · 叶色渐变'):translate('冬 · 枝干显露');}
function successionName(v=state.succession){return v<9?translate('裸地 · 土壤保留'):v<29?translate('草本逐渐定居'):v<53?translate('灌木逐渐增多'):v<78?translate('幼树与灌丛共存'):translate('较成熟的森林');}
function altitudeName(v=state.altitude){return v<27?translate('山麓阔叶林'):v<55?translate('山地针叶林'):v<82?translate('高山灌丛与草甸'):translate('稀疏植被与裸岩');}
function renderChapters(){
 $('#chapter-list').innerHTML=A.chapters.map((c,i)=>`<button class="chapter ${c.id===state.chapter?'active':''} ${state.visited.has(c.id)?'visited':''}" data-chapter="${c.id}" data-number="0${i+1}" aria-current="${c.id===state.chapter?'step':'false'}" title="${c.name} · ${c.sub}"><span class="chapter-icon">${icon(c.icon)}</span><span class="chapter-copy"><span class="chapter-name">${c.name}</span><span class="chapter-sub">${c.sub}</span></span><span class="chapter-index">0${i+1}</span></button>`).join('');
 $('#visited-count').textContent=`0${state.visited.size} / 06`;$('#journey-progress').innerHTML=A.chapters.map(c=>`<i class="${state.visited.has(c.id)?'seen':''}"></i>`).join('');
}
function renderHeading(){const c=current(),n=A.chapters.indexOf(c)+1;$('#chapter-number').textContent=`0${n}`;$('#chapter-en').textContent=c.en;$('#scene-title').textContent=c.title;$('#scene-description').textContent=c.desc;$('#teacher-chapter').textContent=`0${n} / 06 · ${c.name}`;document.title=translate(`${c.name} · 植被之间`);renderSteps();}
function renderSteps(){const c=current();$('#lesson-steps').innerHTML=c.steps.map((s,i)=>`<button class="lesson-step ${state.step===i?'active':''}" data-step="${i}" aria-current="${state.step===i?'step':'false'}"><span class="step-no">0${i+1}</span><span><span class="step-title">${s[0]}</span><span class="step-desc">${s[1]}</span></span></button>`).join('');}
function getSpecimen(){const c=current();if(state.chapter==='biomes'){const b=biomeData();return{title:b.name,en:b.en,desc:b.detail,facts:[[translate('优势生活型'),b.form],[translate('结构线索'),b.structure]],note:b.adapt,symbol:b.id==='conifer'?'pine':b.id==='wetland'?'water':b.id==='grassland'||b.id==='desert'?'grass':'trees'};}
 if(state.chapter==='mountain')return{title:altitudeName(),en:'VEGETATION BELTS',desc:translate('亮色观察线标出当前高度的坡面位置。向上移动时，比较植被的高度、密度与生活型。'),facts:[[translate('观察尺度'),translate('整座山地')],[translate('标尺性质'),translate('相对高度')]],note:c.note,symbol:'mountain'};
 if(state.chapter==='seasons')return{title:seasonName().split(' · ')[0]+translate('日的森林'),en:'THE SAME DECIDUOUS FOREST',desc:translate('始终观察同一片森林，排除地点差异。拖动季节轴，留意树冠颜色、疏密和枝干显露的变化。'),facts:[[translate('当前季相'),seasonName().split(' · ')[1]],[translate('植被类型'),translate('落叶阔叶林')]],note:c.note,symbol:'trees'};
 if(state.chapter==='succession')return{title:translate('植被的恢复'),en:'SECONDARY SUCCESSION',desc:translate('起点保留土壤。植物在同一片地表逐渐定居，群落的优势种类和空间结构随过程改变。'),facts:[[translate('起点条件'),translate('土壤保留')],[translate('时间单位'),translate('不设固定年数')]],note:c.note,symbol:'grass'};
 return A.hotspots[state.selection]||A.hotspots.forest;
}
function toggleRow(action,text,ico,checked){return `<div class="switch-row"><label id="label-${action}"><span>${icon(ico)}</span>${text}</label><button class="toggle" role="switch" aria-checked="${checked}" aria-labelledby="label-${action}" data-action="${action}"></button></div>`;}
function renderInspector(){const c=current(),s=getSpecimen();let controls='';
 if(state.chapter==='biomes')controls+=translate(`<div class="control-title">选择植被 <small>BIOME SELECTOR</small></div><div class="biome-grid">${A.biomes.map(b=>`<button class="biome-chip ${state.biome===b.id?'active':''}" data-biome="${b.id}">${b.short}</button>`).join('')}</div><p class="mini-note">${s.note}</p>`);
 if(state.chapter==='layers'){controls+=translate(`<div class="control-title">逐层观察 <small>PEEL BACK A FOREST</small></div><div class="layer-chips">${[['all',translate('完整森林')],['canopy',translate('只看乔木')],['shrubs',translate('只看灌木')],['herbs',translate('只看草本')],['roots',translate('根系透视')]].map(([id,label])=>`<button class="layer-chip ${state.layer===id?'active':''}" data-layer="${id}">${label}</button>`).join('')}</div>`);}
 if(['overview','layers'].includes(state.chapter))controls+=translate(`<label class="range-label" for="canopy-range"><span>乔木层不透明度</span><output id="canopy-value">${state.canopy}%</output></label><input type="range" id="canopy-range" min="0" max="100" value="${state.canopy}" style="--range:${state.canopy}%"><div class="range-endpoints"><span>看清林下</span><span>完整树冠</span></div>`);
 if(state.chapter==='seasons')controls+=translate(`<div class="control-title">让四季流动 <small>SEASONAL CHANGE</small></div><div class="season-chips">${[translate('春'),translate('夏'),translate('秋'),translate('冬')].map((s,i)=>`<button class="season-chip ${Math.min(3,Math.floor(state.season/25))===i?'active':''}" data-season="${[12,38,68,100][i]}">${s}</button>`).join('')}</div><div class="big-readout"><strong id="season-readout">${seasonName()}</strong></div><label class="range-label" for="season-range"><span>季相演示进度</span><output id="season-value">${Math.round(state.season)}%</output></label><input type="range" id="season-range" value="${state.season}" min="0" max="100" style="--range:${state.season}%"><div class="range-endpoints"><span>新叶展开</span><span>冬季休眠</span></div><button class="play-process" data-action="process">${icon(state.process?'pause':'play')}<span id="process-text">${state.process?translate('暂停四季'):translate('播放四季')}</span></button>`);
 if(state.chapter==='succession')controls+=translate(`<div class="control-title">让恢复发生 <small>A POSSIBLE PATH</small></div><div class="big-readout"><strong id="succession-readout">${successionName()}</strong></div><label class="range-label" for="succession-range"><span>示意过程进度</span><output id="succession-value">${Math.round(state.succession)}%</output></label><input type="range" id="succession-range" value="${state.succession}" min="0" max="100" style="--range:${state.succession}%"><div class="range-endpoints"><span>裸地（有土壤）</span><span>一种可能的森林</span></div><button class="play-process" data-action="process">${icon(state.process?'pause':'play')}<span id="process-text">${state.process?translate('暂停恢复'):translate('播放恢复过程')}</span></button><p class="mini-note">进度不是年限。假设环境适宜森林，且没有持续强干扰。</p>`);
 if(state.chapter==='mountain')controls+=translate(`<div class="control-title">沿坡面观察 <small>ALTITUDE EXPLORER</small></div><label class="range-label" for="altitude-range"><span>相对观察高度</span><output id="altitude-value">${state.altitude}%</output></label><input type="range" id="altitude-range" value="${state.altitude}" min="0" max="100" style="--range:${state.altitude}%"><div class="range-endpoints"><span>山麓</span><span>山顶</span></div><div class="altitude-stack">${[[translate('裸岩与稀疏植被'),'#a8a487'],[translate('灌丛与高山草甸'),'#a8b96f'],[translate('山地针叶林'),'#699d84'],[translate('山地阔叶林'),'#91b973']].map(([n,c],i)=>`<div class="altitude-band ${Math.min(3,Math.floor(state.altitude/27))===3-i?'active':''}" data-band="${3-i}" style="--band:${c}"><span>${n}</span><span>${['↑','03','02','01'][i]}</span></div>`).join('')}</div><p class="mini-note">这是一种简化的带谱，不是所有山地的共同顺序或固定海拔界限。</p>`);
 if(state.chapter!=='mountain')controls+=toggleRow('roots',translate('根系透视'),'roots',state.roots);
 controls+=toggleRow('labels',translate('知识标记'),'pin',state.labels)+toggleRow('auto',translate('缓慢环绕'),'rotate',state.auto);
 $('#inspector-body').innerHTML=translate(`<div class="inspector-primary"><div class="panel-eyebrow"><span>SPECIMEN NOTES</span><span class="little-badge">${c.tag}</span></div><div class="specimen-card"><span class="specimen-index">FIELD NOTE / 0${A.chapters.indexOf(c)+1}</span>${specimenArt(s.symbol)}<h3 id="specimen-title">${s.title}</h3><p class="specimen-en">${s.en}</p></div><p class="specimen-description">${s.desc}</p><div class="facts">${s.facts.map(([a,b])=>`<div class="fact"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div></div><div class="inspector-secondary"><div class="control-section">${!controls.startsWith('<div class="control-title"')?translate('<div class="control-title">动手观察 <small>INTERACTIVE TOOLS</small></div>'):''}${controls}</div></div><div class="question-card"><div class="question-kicker">${icon('question')}留给课堂的一个问题</div><h3>${c.question}</h3><button data-action="answer"><span id="answer-toggle-text">展开思考提示</span>${icon('arrow')}</button><div id="answer-text" class="answer-text" hidden>${c.answer}<br><br><strong>${state.grade==='senior'?translate('高中延伸'):translate('初中观察')}：</strong>${c[state.grade]}</div><button data-action="quiz"><span>用一道题检验理解</span>${icon('right')}</button></div><p class="model-note">${c.note}</p>`);
 $$('[data-grade]').forEach(b=>b.classList.toggle('active',b.dataset.grade===state.grade));
}
function updateSlider(id,value){let el=$('#'+id+'-range');if(el){el.value=value;el.style.setProperty('--range',value+'%');}let out=$('#'+id+'-value');if(out)out.textContent=Math.round(value)+'%';}
function updateTemporalUI(){if(state.chapter==='seasons'){updateSlider('season',state.season);let el=$('#season-readout');if(el)el.textContent=seasonName();$('#specimen-title').textContent=seasonName().split(' · ')[0]+translate('日的森林');$$('.season-chip').forEach(b=>b.classList.toggle('active',Math.abs(Number(b.dataset.season)-state.season)<15));let l=scene?.labels.find(x=>x.id==='season');if(l){l.text=seasonName().split(' · ')[1];l.en=['SPRING','SUMMER','AUTUMN','WINTER'][Math.min(3,Math.floor(state.season/25))];let node=labelNodes.find(n=>n.data.id==='season');if(node){$('.annotation-text',node.el).textContent=l.text;$('.annotation-en',node.el).textContent=l.en;}}}
 if(state.chapter==='succession'){updateSlider('succession',state.succession);let el=$('#succession-readout');if(el)el.textContent=successionName();let l=scene?.labels.find(x=>x.id==='stage');if(l){l.text=successionName();let n=labelNodes.find(n=>n.data.id==='stage');if(n)$('.annotation-text',n.el).textContent=l.text;}}}
function renderLabels(){const colors={green:'#bad8a3',lime:'#c7d489',blue:'#89c1c5',sand:'#d0bc91'};$('#labels').innerHTML='';labelNodes=(scene?.labels||[]).map(data=>{const el=document.createElement('button');el.className='annotation';el.dataset.hotspot=data.id;el.style.setProperty('--tone',colors[data.tone]);el.title=translate('观察：')+data.text;el.innerHTML=`<span class="annotation-inner"><span class="annotation-dot"></span><span><span class="annotation-text">${data.text}</span><span class="annotation-en">${data.en}</span></span></span>`;$('#labels').appendChild(el);return{el,data,w:0,h:0};});}
function positionLabels(){
 if(!engine||!scene)return;
 const placed=[];
 for(const node of labelNodes){
  const {el,data}=node,p=engine.project(data.p);
  if(!node.w||node.text!==data.text||node.teaching!==state.teaching){node.w=el.offsetWidth||105;node.h=el.offsetHeight||41;node.text=data.text;node.teaching=state.teaching;}
  const w=node.w,h=node.h,x=p[0],y=p[1]-24;
  let valid=state.labels&&!detailFocus&&p[2]<1&&p[2]>-1&&x>w*.5+24&&x<engine.width-w*.5-24&&y>143&&y<engine.height-168;
  const rect=[x-w/2,y-h,w,h+12];
  if(placed.some(r=>rect[0]<r[0]+r[2]+6&&rect[0]+rect[2]>r[0]-6&&rect[1]<r[1]+r[3]+8&&rect[1]+rect[3]>r[1]-8))valid=false;
  el.style.transform=`translate3d(${(x-w/2).toFixed(2)}px,${(y-h).toFixed(2)}px,0)`;
  const alpha=valid&&!changing?'1':'0';
  if(el.style.opacity!==alpha){el.style.opacity=alpha;el.style.pointerEvents=valid?'auto':'none';el.setAttribute('aria-hidden',String(!valid));el.tabIndex=valid?0:-1;}
  el.classList.toggle('selected',state.selection===data.id);if(valid)placed.push(rect);
 }
}
function smoothVisual(fn){if(!scene)return;if(reduceMotion()){fn();opacityAnimations=[];return;}const old=new Map(scene.meshes.map(m=>[m,m.options.opacity]));fn();opacityAnimations=scene.meshes.filter(m=>Math.abs((old.get(m)??1)-m.options.opacity)>.001).map(m=>{let end=m.options.opacity;m.options.opacity=old.get(m);return{m,end};});}
function applyVisuals(animate=true){if(!scene)return;const fn=()=>{if(state.chapter==='layers')scene.setLayer(state.layer);if(['overview','layers'].includes(state.chapter)&&(state.layer==='all'||state.chapter==='overview'))scene.setCanopy(state.canopy/100);scene.setRoots(state.roots);};if(animate)smoothVisual(fn);else fn();}
let transitionShot=null,detailFocus=null,detailSaved=null;
const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function buildScene(keepView=false){
 if(!engine)return;
 const tok=++ticket,hadScene=ready&&!!scene,loader=$('#scene-loading');
 changing=true;window.vegetationAtlas.ready=false;detailFocus=null;detailSaved=null;updateDetailUI();
 $('#classroom').setAttribute('aria-busy','true');
 if(transitionShot){transitionShot.remove();transitionShot=null;}
 // One snapshot only during the hand-off; both the outgoing and incoming views are real WebGL scenes.
 if(hadScene&&!reduceMotion()){
  engine.render(.001);
  const shot=document.createElement('canvas');shot.className='scene-transition';shot.width=engine.canvas.width;shot.height=engine.canvas.height;
  shot.getContext('2d').drawImage(engine.canvas,0,0);$('#classroom').appendChild(shot);transitionShot=shot;
 }else if(!hadScene)loader.classList.remove('hidden');
 const start=()=>setTimeout(()=>{
  if(tok!==ticket)return;
  try{
   const next=A.createScene(engine,state.chapter,state.biome);
   if(tok!==ticket){next.dispose();return;}
   const previous=scene;scene=next;engine.scene=scene;opacityAnimations=[];engine.shadowDirty=true;
   seasonCurrent=state.season/100;succCurrent=state.succession/100;succSent=-1;
   engine.season=state.chapter==='seasons'?seasonCurrent:-1;
   engine.snow=state.chapter==='seasons'?A.smooth(.88,1,seasonCurrent):0;
   engine.leaf=state.chapter==='seasons'?.55+.45*A.smooth(0,.28,seasonCurrent):1;
   if(!keepView)engine.reset(state.view,!hadScene);
   engine.shift=0;engine.scale=1;
   if(state.chapter==='mountain'){scene.setAltitude(state.altitude);engine.altitude=scene.altitudeGoal;}
   if(state.chapter==='succession')scene.setSuccession(succCurrent);
   applyVisuals(false);renderLabels();engine.render(.001);previous?.dispose();
   ready=true;changing=false;positionLabels();loader.classList.add('hidden');$('#classroom').setAttribute('aria-busy','false');
   updateTemporalUI();updateDetailUI();window.vegetationAtlas.ready=true;
   const shot=transitionShot;
   if(shot){
    shot.animate([{opacity:1,transform:'translateY(0)',filter:'blur(0)'},{opacity:0,transform:'translateY(5px)',filter:'blur(2px)'}],{duration:680,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}).onfinish=()=>{shot.remove();if(transitionShot===shot)transitionShot=null;};
   }
  }catch(err){
   console.error(err);changing=false;transitionShot?.remove();transitionShot=null;loader.classList.remove('hidden');
   loader.innerHTML=translate(`${icon('leaf')}<strong>三维场景暂时无法显示</strong><div class="error-message"></div><button class="teach-button" data-action="retry">重新尝试</button>`);$('.error-message',loader).textContent=err.message;
  }
 },hadScene?20:35);
 requestAnimationFrame(start);
}
function updateDetailUI(){
 document.body.classList.toggle('detail-mode',!!detailFocus);
 $$('.detail-lens [data-detail]').forEach(b=>{b.classList.toggle('active',b.dataset.detail===detailFocus);b.setAttribute('aria-pressed',String(b.dataset.detail===detailFocus));const k=b.dataset.detail;b.disabled=!!scene&&((k==='water'&&!scene.groups.water?.length)||(k==='roots'&&!scene.groups.edgeRoots?.length)||(k==='canopy'&&!scene.treePositions.some(t=>t.type!=='shrub')));b.title=b.disabled?translate('本场景没有这一观察对象'):'';});
 const exit=$('#detail-return');if(exit)exit.hidden=!detailFocus;
 const note=$('#detail-caption');if(note){note.hidden=!detailFocus;note.textContent={canopy:translate('树冠近观 · 叶片、枝条与透光'),floor:translate('林下近观 · 草叶、蕨叶与枯落物'),roots:translate('剖面近观 · 主根、侧根与细根'),water:translate('水岸近观 · 挺水植物与浮叶')}[detailFocus]||'';}
}
function focusDetail(kind){
 if(!scene||changing)return;
 if(kind==='return'||detailFocus===kind){
  if(detailSaved){engine.goal={...detailSaved.camera,target:[...detailSaved.camera.target]};state.roots=detailSaved.roots;state.canopy=detailSaved.canopy;state.layer=detailSaved.layer;applyVisuals();}
  detailFocus=null;detailSaved=null;updateDetailUI();renderInspector();return;
 }
 if(!detailSaved)detailSaved={camera:{...engine.goal,target:[...engine.goal.target]},roots:state.roots,canopy:state.canopy,layer:state.layer};
 detailFocus=kind;state.auto=false;state.tour=false;
 let target,distance,phi,theta=.36;
 if(kind==='canopy'){
  const trees=scene.treePositions.filter(p=>p.type!=='shrub');
  const tree=trees.reduce((best,p)=>Math.hypot(p.x+3,p.z-1)<Math.hypot(best.x+3,best.z-1)?p:best,trees[0]||{x:-3,z:1,h:.5,s:1});
  target=[tree.x,tree.h+tree.s*2.65,tree.z];distance=9.5;phi=1.02;
 }else if(kind==='roots'){state.roots=false;state.layer='all';state.canopy=28;target=[-4.3,-.4,5.3];distance=11;phi=1.32;theta=.12;applyVisuals();}
 else if(kind==='water'){
  if(!scene.groups.water?.length){toast(translate('这一生境没有水岸，切换到湿地场景观察。'));focusDetail('return');return;}
  target=[4.6,.55,2.2];distance=9;phi=.95;
 }else{target=[-2.4,scene.height(-2.4,2.8)+.22,2.8];distance=8.3;phi=1.1;}
 engine.goal={theta,phi,distance,target};updateDetailUI();renderInspector();updatePlayback();
}
function setChapter(id){if(!A.chapters.some(c=>c.id===id))return;state.chapter=id;state.step=0;state.roots=false;state.layer='all';state.canopy=100;state.process=false;state.tour=false;state.auto=false;state.view='orbit';state.selection=id==='layers'?'canopy':id==='overview'?'forest':id==='mountain'?'middle':id==='seasons'?'season':'form';state.visited.add(id);tourTime=0;renderChapters();renderHeading();renderInspector();updatePlayback();buildScene();writeHash();}
function setBiome(id){if(!A.biomes.some(b=>b.id===id))return;state.biome=id;if(state.chapter!=='biomes'){setChapter('biomes');return;}state.roots=false;state.selection='form';state.step=0;renderSteps();renderInspector();buildScene(true);writeHash();}
function setView(view){if(detailFocus)focusDetail('return');state.view=view;engine?.reset(view);$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));writeHash();}
function selectHotspot(id,focus=true){if(!scene)return;state.selection=id;const l=scene.labels.find(x=>x.id===id);if(id==='roots'){state.roots=true;applyVisuals();if(focus){engine.goal.phi=1.28;engine.focus([0,-.3,1.9],1.08);}}else if(focus&&l){engine.focus([l.p[0]*.30,Math.max(1,l.p[1]*.50),l.p[2]*.28],1.13);}
 if(state.chapter==='mountain'){let val={low:15,middle:48,high:74,rock:94}[id];if(val!==undefined)setAltitude(val);}
 renderInspector();}
function stepTo(index,fromTour=false){if(!scene)return;detailFocus=null;detailSaved=null;updateDetailUI();state.step=A.clamp(index,0,2);state.selection=current().steps[state.step][2];if(!fromTour){state.tour=false;tourTime=0;}state.process=false;
 if(state.chapter==='overview'){state.roots=index===2;state.canopy=100;if(index===2){engine.goal.phi=1.28;engine.focus([0,-.5,2.5],1.07);}else{engine.reset();engine.focus(index===0?[-1.2,1.6,-.5]:[1.5,1.0,2],index===0?1:1.12);}applyVisuals();}
 if(state.chapter==='layers'){state.layer='all';state.roots=index===2;state.canopy=index===0?100:index===1?9:35;applyVisuals();if(index===2){engine.goal.phi=1.28;engine.focus([0,-.2,2],1.12);}else{engine.reset();engine.focus([0,1.0,0],1.12);}}
 if(state.chapter==='biomes'){state.roots=index===2;applyVisuals();if(index===2){engine.goal.phi=1.28;engine.focus([0,-.2,2],1.12);}else engine.reset();}
 if(state.chapter==='mountain')setAltitude([15,48,78][index]);
 if(state.chapter==='seasons')state.season=[15,69,100][index];
 if(state.chapter==='succession')state.succession=[0,46,100][index];
 renderSteps();renderInspector();updatePlayback();writeHash();}
function setAltitude(v){state.altitude=A.clamp(Math.round(v),0,100);scene?.setAltitude(state.altitude);updateSlider('altitude',state.altitude);let s=$('#specimen-title');if(s)s.textContent=altitudeName();$$('.altitude-band').forEach(b=>b.classList.toggle('active',Number(b.dataset.band)===Math.min(3,Math.floor(state.altitude/27))));engine.shadowDirty=true;}
function updatePlayback(){$('#play-icon').innerHTML=icon(state.paused?'play':'pause');$('#play-text').textContent=state.paused?translate('动态已暂停'):translate('动态运行中');$('#speed-button').textContent=state.speed+'×';$('#quality-button').textContent=state.quality==='high'?translate('精细'):translate('流畅');$('#tour-text').textContent=state.tour?translate('结束讲解'):translate('开始讲解');$('.tour-button [data-icon]').innerHTML=icon(state.tour?'pause':'play');$('#tour-progress').style.width=state.tour?tourTime/10*100+'%':'0%';$('#labels').style.visibility=state.labels?'visible':'hidden';$$('[data-action="labels"][role="switch"]').forEach(b=>b.setAttribute('aria-checked',state.labels));if(engine)engine.high=state.quality==='high';}
function toggleTeaching(){if(detailFocus)focusDetail('return');state.teaching=!state.teaching;document.body.classList.toggle('teaching',state.teaching);$('#teach-text').textContent=state.teaching?translate('退出授课'):translate('进入授课');setTimeout(()=>{engine?.resize();engine?.reset(state.view);},50);if(state.teaching)toast(translate('授课模式：方向键切章，Q 提问，L 激光笔，Esc 退出。'));}
function nextChapter(delta){let i=A.chapters.findIndex(c=>c.id===state.chapter);setChapter(A.chapters[(i+delta+6)%6].id);}
function openModal(title,eyebrow,html){$('#modal-title').textContent=title;$('#modal-eyebrow').textContent=eyebrow;$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();icons($('#modal'));}
function closeModal(){$('#modal').close();}
function openAtlas(){openModal(translate('不同的绿色，放在一起看'),'THE VEGETATION COLLECTION',translate(`<p class="modal-intro">先观察外貌，再讨论植物如何适应生境。这些场景表现典型形态，不代替具体地区的实地资料。</p><div class="atlas-grid">${A.biomes.map((b,i)=>translate(`<article class="atlas-card">${specimenArt(b.id==='conifer'?'pine':b.id==='grassland'||b.id==='desert'?'grass':b.id==='wetland'?'water':'trees')}<span class="section-kicker">SPECIMEN / 0${i+1}</span><h3>${b.name}</h3><small>${b.en}</small><dl><dt>生活型</dt><dd>${b.form}</dd><br><dt>叶片</dt><dd>${b.leaf}</dd></dl><p>${b.adapt}</p><button data-explore-biome="${b.id}">进入 3D 场景 →</button></article>`)).join('')}</div><p class="mini-note">依据 UC Berkeley 植被类型介绍与 U.S. EPA 湿地说明改写。各条目来源详见教学手册。</p>`));}
function sourceLinks(indices=A.sources.map((_,i)=>i)){return indices.map(i=>{let s=A.sources[i];return `<a class="source-link" href="${s[1]}" target="_blank" rel="noopener noreferrer"><span>${s[0]} ↗</span><small>${s[2]}</small></a>`;}).join('');}
function openGuide(){openModal(translate('把一片自然，带进课堂'),'TEACHER’S FIELD NOTES',translate(`<p class="modal-intro">每章按“观察 → 操作 → 解释”展开。先让学生描述看到了什么，再使用标记与思考提示建立联系。右下角可切换初中观察与高中延伸。</p><div class="guide-note">所有 3D 景观、植株、根系与剖面均为程序生成的教学示意，不是地理实测或植物学精细模型。演替进度不代表年限，山地滑杆不代表普适的海拔界限。</div>${A.chapters.map((c,i)=>translate(`<section class="guide-block"><h3><span>0${i+1}　${c.name}</span><button data-guide-chapter="${c.id}">进入本章 →</button></h3><p><span class="guide-label">${c.duration}</span>${c.steps.map(s=>s[0]).join(' → ')}</p><p><span class="guide-label">初中观察</span>${c.junior}</p><p><span class="guide-label">高中延伸</span>${c.senior}</p><p><span class="guide-label">追问</span>${c.question}</p><p><span class="guide-label">讲解提示</span>${c.answer}</p><p><span class="guide-label">使用边界</span>${c.note}</p><p class="mini-note">参考：${c.sources.map(i=>`<a href="${A.sources[i][1]}" target="_blank" rel="noopener noreferrer">${A.sources[i][0]} ↗</a>`).join('；')}</p></section>`)).join('')}<h3 style="font-weight:500;margin:24px 0 15px">内容参考与模型边界</h3><div class="source-list">${sourceLinks()}</div><p class="mini-note">2026-09-22 更新。使用一般性地理与生态概念，课堂表述请结合所用教材；未声称通过任何课程标准或教材认证。外部参考链接需要联网。</p><div class="modal-actions"><button data-action="print">打印教学手册</button><button data-action="save">保存当前课堂状态</button><button data-action="load">载入课堂状态</button></div>`));}
function openHelp(){const keys=[[translate('左键拖动'),translate('旋转景观')],[translate('滚轮 / 双指'),translate('缩放景观')],[translate('右键 / Shift 拖动'),translate('平移景观')],['Space',translate('暂停 / 继续动态')],[translate('← / → 或 1–6'),translate('切换章节')],['R',translate('复位视角')],['H',translate('显示 / 隐藏标记')],['Q',translate('打开本章探究题')],['F',translate('浏览器全屏')],['L',translate('打开 / 关闭激光笔')],['Esc',translate('关闭对话框 / 退出授课')]];openModal(translate('让讲解更从容'),'CONTROLS & CLASSROOM TOOLS',translate(`<p class="modal-intro">本网站是真正实时绘制的三维场景。拖动、放大与缩小都会改变观察位置，不是预渲染视频。鼠标与触屏均可操作。</p><div class="keyboard-grid">${keys.map(([a,b])=>`<div class="keyboard-row"><kbd>${a}</kbd><span>${b}</span></div>`).join('')}</div><div class="guide-note">“暂停”会停止植被摆动、水面、过程播放、自动环绕和自动讲解；你仍能手动旋转场景或操作滑杆。授课模式隐藏两侧面板，放大画面与标记。</div><p class="modal-intro">普通电脑出现卡顿时，点击右下角“精细”切换为“流畅”，降低像素密度并关闭实时阴影。右键或 Shift + 拖动用于平移，双指用于触屏缩放。</p><div class="modal-actions"><button data-action="save">保存课堂状态</button><button data-action="load">载入课堂状态</button><button data-action="share">复制章节链接</button><button data-action="capture">导出场景图片</button></div><p class="mini-note">保存的是章节与演示参数，不包含个人数据；离线文件复制章节链接时会改为导出课堂状态文件。</p>`));}
function openQuiz(index=A.chapters.findIndex(c=>c.id===state.chapter)){quizIndex=index;quizAnswered=false;const q=A.questions[index];openModal(translate('停下来，想一想'),'CLASSROOM INQUIRY',translate(`<div class="quiz-kicker">0${index+1} / 06　${A.chapters[index].name}</div><h3 class="quiz-title">${q.q}</h3><div class="quiz-options">${q.options.map((o,i)=>`<button class="quiz-option" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join('')}</div><div id="quiz-feedback" aria-live="polite"></div><div class="quiz-bottom"><small>先讨论理由，再选择答案。</small><button data-action="next-quiz">下一题 ${icon('right')}</button></div>`));}
function answerQuiz(index){const q=A.questions[quizIndex];if(quizAnswered)return;quizAnswered=true;$$('[data-answer]').forEach(b=>{let i=Number(b.dataset.answer);b.classList.toggle('correct',i===q.correct);b.classList.toggle('wrong',i===index&&i!==q.correct);b.disabled=true;});$('#quiz-feedback').innerHTML=translate(`<div class="quiz-feedback"><strong>${index===q.correct?translate('判断正确。再说说你的理由。'):translate('再想一想：')+String.fromCharCode(65+q.correct)+translate(' 更准确。')}</strong>${q.explain}</div>`);}
function download(data,filename,type='application/json'){let blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function getConfig(){return{application:'vegetation-atlas',version:1,chapter:state.chapter,biome:state.biome,step:state.step,labels:state.labels,roots:state.roots,canopy:state.canopy,layer:state.layer,season:state.season,succession:state.succession,altitude:state.altitude,grade:state.grade,view:state.view,speed:state.speed,camera:engine?{...engine.goal,target:[...engine.goal.target]}:null};}
function save(){download(JSON.stringify(getConfig(),null,2),translate(`植被之间-${current().name}-课堂状态.json`));toast(translate('课堂状态已保存。下次可在教学手册中载入。'));}
function readConfig(c){if(!c||c.application!=='vegetation-atlas'||c.version!==1||!A.chapters.some(x=>x.id===c.chapter))throw new Error(translate('这不是有效的“植被之间”课堂状态文件。'));setChapter(c.chapter);if(A.biomes.some(x=>x.id===c.biome))state.biome=c.biome;for(let key of['season','succession','altitude','canopy'])if(Number.isFinite(c[key]))state[key]=A.clamp(c[key],0,100);for(let key of['labels','roots'])if(typeof c[key]==='boolean')state[key]=c[key];if(['all','canopy','shrubs','herbs','roots'].includes(c.layer))state.layer=c.layer;if(['junior','senior'].includes(c.grade))state.grade=c.grade;if(['orbit','top','front'].includes(c.view))state.view=c.view;if([.5,1,2].includes(c.speed))state.speed=c.speed;if(Number.isInteger(c.step))state.step=A.clamp(c.step,0,2);renderHeading();renderInspector();updatePlayback();persist();buildScene();writeHash();let tok=ticket;const restore=()=>{if(ticket!==tok)return;if(changing){setTimeout(restore,100);return;}if(c.camera&&Array.isArray(c.camera.target)&&c.camera.target.length===3&&c.camera.target.every(Number.isFinite)&&['theta','phi','distance'].every(k=>Number.isFinite(c.camera[k]))){engine.goal={theta:c.camera.theta%(Math.PI*2),phi:A.clamp(c.camera.phi,.04,1.46),distance:A.clamp(c.camera.distance,11,65),target:c.camera.target.map(v=>A.clamp(v,-15,15))};}toast(translate('课堂状态已恢复。'));};setTimeout(restore,150);}
function writeHash(){let p=new URLSearchParams({chapter:state.chapter,biome:state.biome});if(state.chapter==='seasons')p.set('season',Math.round(state.season));if(state.chapter==='succession')p.set('progress',Math.round(state.succession));if(state.chapter==='mountain')p.set('altitude',state.altitude);try{history.replaceState(null,'','#'+p.toString());}catch{}}
function loadHash(){try{let p=new URLSearchParams(location.hash.slice(1)),c=p.get('chapter');if(c&&A.chapters.some(x=>x.id===c))state.chapter=c;if(A.biomes.some(x=>x.id===p.get('biome')))state.biome=p.get('biome');for(let[k,s]of[['season','season'],['progress','succession'],['altitude','altitude']])if(p.has(k)&&Number.isFinite(Number(p.get(k))))state[s]=A.clamp(Number(p.get(k)),0,100);state.selection=state.chapter==='layers'?'canopy':'forest';state.visited.add(state.chapter);}catch{}}
async function share(){if(location.protocol==='file:'){save();toast(translate('离线网页没有公共地址，已改为保存可载入的课堂状态。'));return;}writeHash();try{await navigator.clipboard.writeText(location.href);toast(translate('当前章节链接已复制。'));}catch{toast(translate('浏览器未允许剪贴板访问，请复制地址栏中的完整链接。'));}}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast(translate('当前环境不允许全屏，可使用浏览器的全屏命令。'));}}
function capture(){if(!ready)return toast(translate('场景还在构建，请稍后再导出。'));engine.render(.001);let out=document.createElement('canvas');out.width=1920;out.height=1080;const ctx=out.getContext('2d');let grd=ctx.createRadialGradient(960,430,0,960,430,1100);grd.addColorStop(0,'#213b31');grd.addColorStop(1,'#0b181d');ctx.fillStyle=grd;ctx.fillRect(0,0,1920,1080);const r=engine.canvas.width/engine.canvas.height;let h=925,w=h*r;if(w>1850){w=1850;h=w/r;}let x=(1920-w)/2,y=(1080-h)/2+30;ctx.drawImage(engine.canvas,x,y,w,h);ctx.fillStyle='#9ccda2';ctx.font='17px sans-serif';ctx.fillText(translate(`植被之间  /  ${current().en}`),65,58);ctx.fillStyle='#e4ebd9';ctx.font='37px sans-serif';ctx.fillText(current().title,65,115);ctx.fillStyle='#879f8e';ctx.font='16px sans-serif';ctx.fillText(translate('教学示意 · 非实测数据 · ')+current().name,65,1035);if(state.labels)for(let {data,el}of labelNodes){if(el.style.opacity==='0')continue;let p=engine.project(data.p),px=x+p[0]/engine.width*w,py=y+(p[1]-25)/engine.height*h;ctx.font='20px sans-serif';let tw=ctx.measureText(data.text).width;ctx.fillStyle='#122921ee';ctx.fillRect(px-tw/2-13,py-30,tw+26,42);ctx.strokeStyle='#a2bc8155';ctx.strokeRect(px-tw/2-13,py-30,tw+26,42);ctx.fillStyle='#dbe9c7';ctx.fillText(data.text,px-tw/2,py-3);}
 out.toBlob(blob=>{if(blob){download(blob,translate(`植被之间-${current().name}.png`),'image/png');toast(translate('当前三维画面已导出为 1920 × 1080 图片。'));}},'image/png');}
A.onCameraInteraction=()=>{state.auto=false;state.tour=false;let b=$('[data-action="auto"][role="switch"]');if(b)b.setAttribute('aria-checked','false');updatePlayback();};
const actions={
 home:()=>setChapter('overview'),explore:()=>{$('#modal').open&&closeModal();$('#world').focus();},atlas:openAtlas,guide:openGuide,help:openHelp,teach:toggleTeaching,close:closeModal,
 reset:()=>{detailFocus=null;detailSaved=null;updateDetailUI();state.auto=false;engine?.reset();state.view='orbit';$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='orbit'));updatePlayback();},roots:()=>{state.roots=!state.roots;if(state.chapter==='layers')state.layer=state.roots?'roots':'all';applyVisuals();renderInspector();},
 labels:()=>{state.labels=!state.labels;updatePlayback();},auto:()=>{state.auto=!state.auto;$$('[data-action="auto"][role="switch"]').forEach(b=>b.setAttribute('aria-checked',state.auto));},
 play:()=>{state.paused=!state.paused;updatePlayback();},speed:()=>{state.speed=[.5,1,2][([.5,1,2].indexOf(state.speed)+1)%3];updatePlayback();},quality:()=>{state.quality=state.quality==='high'?'smooth':'high';engine.shadowDirty=true;updatePlayback();toast(state.quality==='high'?translate('精细画质：高分辨率与实时阴影。'):translate('流畅画质：减少远景细节，降低分辨率并关闭阴影。'));},
 tour:()=>{state.tour=!state.tour;tourTime=0;if(state.tour){state.paused=false;stepTo(0,true);toast(translate('每个观察步骤停留 10 秒。可随时暂停或手动选择。'));}updatePlayback();},
 process:()=>{state.process=!state.process;state.tour=false;if(state.process){state.paused=false;if(state.chapter==='seasons'&&state.season>=99)state.season=0;if(state.chapter==='succession'&&state.succession>=99)state.succession=0;}renderInspector();updatePlayback();},
 answer:()=>{const p=$('#answer-text');p.hidden=!p.hidden;$('#answer-toggle-text').textContent=p.hidden?translate('展开思考提示'):translate('收起思考提示');},quiz:()=>openQuiz(),'next-quiz':()=>openQuiz((quizIndex+1)%6),
 prev:()=>nextChapter(-1),next:()=>nextChapter(1),fullscreen,capture,save,load:()=>$('#load-file').click(),share,
 print:()=>window.print(),retry:()=>buildScene(),laser:()=>{laser=!laser;if(!laser)$('#laser').style.display='none';toast(laser?translate('激光笔已开启。移动鼠标指向要讲解的位置。'):translate('激光笔已关闭。'));}
};
document.addEventListener('click',e=>{const b=e.target.closest('button,[data-action]');if(!b)return;if(b.dataset.detail){focusDetail(b.dataset.detail);}else if(b.dataset.action){e.preventDefault();actions[b.dataset.action]?.();}else if(b.dataset.chapter)setChapter(b.dataset.chapter);else if(b.dataset.biome)setBiome(b.dataset.biome);else if(b.dataset.view)setView(b.dataset.view);else if(b.dataset.hotspot)selectHotspot(b.dataset.hotspot);else if(b.dataset.step!==undefined)stepTo(Number(b.dataset.step));else if(b.dataset.layer){state.layer=b.dataset.layer;state.roots=state.layer==='roots';state.canopy=100;applyVisuals();state.selection=state.layer==='all'?'canopy':state.layer;renderInspector();}else if(b.dataset.season){state.season=Number(b.dataset.season);state.process=false;renderInspector();}else if(b.dataset.grade){state.grade=b.dataset.grade;persist();renderInspector();}else if(b.dataset.exploreBiome){closeModal();setBiome(b.dataset.exploreBiome);}else if(b.dataset.guideChapter){closeModal();setChapter(b.dataset.guideChapter);}else if(b.dataset.answer!==undefined)answerQuiz(Number(b.dataset.answer));});
let altitudeThrottle=0,altitudePending=null;
document.addEventListener('input',e=>{let v=Number(e.target.value),id=e.target.id;if(id==='canopy-range'){state.canopy=v;state.layer='all';state.roots=false;updateSlider('canopy',v);applyVisuals(false);$$('.layer-chip').forEach(b=>b.classList.toggle('active',b.dataset.layer==='all'));}else if(id==='season-range'){state.process=false;state.season=v;updateTemporalUI();}else if(id==='succession-range'){state.process=false;state.succession=v;updateTemporalUI();}else if(id==='altitude-range'){state.altitude=v;updateSlider('altitude',v);setAltitude(v);}});
document.addEventListener('change',e=>{if(e.target.matches('input[type=range]')){writeHash();if(['season-range','succession-range'].includes(e.target.id))renderInspector();}});
$('#load-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>64000)throw new Error(translate('课堂状态文件过大，请选择本网站导出的 JSON 文件。'));readConfig(JSON.parse(await f.text()));if($('#modal').open)closeModal();}catch(err){toast(err.message||translate('无法读取课堂状态。'));}e.target.value='';});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if($('#modal').open)return;if(e.target.closest('input,textarea,select'))return;const k=e.key.toLowerCase();if(k===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();actions.play();}else if(k==='arrowright'){e.preventDefault();nextChapter(1);}else if(k==='arrowleft'){e.preventDefault();nextChapter(-1);}else if(/^[1-6]$/.test(k))setChapter(A.chapters[Number(k)-1].id);else if(k==='r')actions.reset();else if(k==='h')actions.labels();else if(k==='q')openQuiz();else if(k==='f')fullscreen();else if(k==='l')actions.laser();else if(k==='?')openHelp();else if(k==='escape'&&detailFocus)focusDetail('return');else if(k==='escape'&&state.teaching)toggleTeaching();});
$('#classroom').addEventListener('pointermove',e=>{if(!laser)return;let r=$('#classroom').getBoundingClientRect();$('#laser').style.display='block';$('#laser').style.left=e.clientX-r.left+'px';$('#laser').style.top=e.clientY-r.top+'px';});$('#classroom').addEventListener('pointerleave',()=>$('#laser').style.display='none');
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){let r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
window.addEventListener('resize',()=>{engine?.resize();labelNodes.forEach(n=>n.w=0);});document.addEventListener('visibilitychange',()=>{last=performance.now();});
let shadowSeason=-1,lastTimelineUI=0,lastDrawTime=0,lastSignature='';
function loop(now){
 requestAnimationFrame(loop);
 if(!engine||!ready||document.hidden||changing)return;
 const dt=Math.min((now-(last||now))/1000,.15);last=now;
 const rate=state.paused?0:dt*state.speed;
 if(rate&&!changing){
  engine.time+=rate;
  if(state.auto)engine.goal.theta+=rate*.048;
  if(state.tour){
   tourTime+=rate;
   if(tourTime>=10){tourTime=0;if(state.step>=2){state.tour=false;toast(translate('本章讲解结束。现在可以展开课堂提问。'));}else stepTo(state.step+1,true);}
   $('#tour-progress').style.width=state.tour?tourTime/10*100+'%':'0%';if(!state.tour)updatePlayback();
  }
  if(state.process){
   const key=state.chapter==='seasons'?'season':'succession';state[key]=Math.min(100,state[key]+rate*(key==='season'?3.1:2.5));
   if(state[key]>=100){state.process=false;renderInspector();toast(translate('演示已到达终点，可拖动滑杆回看。'));}
   if(now-lastTimelineUI>110){updateTemporalUI();lastTimelineUI=now;}
  }
 }
 const ease=reduceMotion()?1:1-Math.exp(-dt*5.2);
 engine.shift+=(0-engine.shift)*ease;engine.scale+=(1-engine.scale)*ease;
 // The stable neutral-pose shadow is refreshed for teaching changes, not tiny wind flutter.
 if(state.chapter==='seasons'){
  seasonCurrent+=(state.season/100-seasonCurrent)*ease;engine.season=seasonCurrent;
  engine.leaf=.55+.45*A.smooth(0,.28,seasonCurrent);engine.snow=A.smooth(.88,1,seasonCurrent);if(scene.pads)scene.pads.options.opacity=1-A.smooth(.69,.90,seasonCurrent);if(scene.flowers)scene.flowers.options.opacity=1-A.smooth(.60,.84,seasonCurrent);if(scene.motes)scene.motes.options.opacity=.50*(1-A.smooth(.84,1,seasonCurrent)*.88);
  if(Math.abs(shadowSeason-seasonCurrent)>.023){engine.shadowDirty=true;shadowSeason=seasonCurrent;}
  if(scene.litter){scene.litter.options.opacity=A.smooth(.64,.93,seasonCurrent)*.93;scene.fallingLeaves.options.opacity=A.smooth(.60,.74,seasonCurrent)*(1-A.smooth(.89,.98,seasonCurrent));}
 }else{engine.season=-1;engine.leaf=1;engine.snow=0;shadowSeason=-1;}
 if(state.chapter==='succession'){
  succCurrent+=(state.succession/100-succCurrent)*ease;scene.setSuccession(succCurrent);
 }
 if(state.chapter==='mountain')engine.altitude+=(scene.altitudeGoal-engine.altitude)*ease;
 if(opacityAnimations.length){
  opacityAnimations=opacityAnimations.filter(a=>{a.m.options.opacity+=(a.end-a.m.options.opacity)*ease;if(Math.abs(a.end-a.m.options.opacity)<.002){a.m.options.opacity=a.end;return false;}return true;});
  engine.shadowDirty=true;
 }
 const cameraMoving=['theta','phi','distance'].some(k=>Math.abs(engine.goal[k]-engine.camera[k])>.0005)||engine.goal.target.some((v,i)=>Math.abs(v-engine.camera.target[i])>.0005);
 const visualMoving=opacityAnimations.length||Math.abs(engine.shift)>.0005||Math.abs(1-engine.scale)>.0005||(state.chapter==='seasons'&&Math.abs(seasonCurrent-state.season/100)>.0003)||(state.chapter==='succession'&&Math.abs(succCurrent-state.succession/100)>.0003)||(state.chapter==='mountain'&&Math.abs(engine.altitude-scene.altitudeGoal)>.001);
 const signature=[state.chapter,state.biome,state.quality,state.roots,state.canopy,state.layer,state.season,state.succession,state.altitude,engine.width,engine.height,engine.shadowDirty].join('|');
 if(!cameraMoving&&!visualMoving&&state.paused&&lastSignature===signature){positionLabels();return;}
 if(now-lastDrawTime<(state.quality==='smooth'?1000/30:1000/60))return;
 const drawDt=reduceMotion()?0:Math.min(.45,(now-(lastDrawTime||now))/1000);lastDrawTime=now;
 engine.render(drawDt);lastSignature=signature;positionLabels();
 $('#compass-needle').setAttribute('transform',`rotate(${-engine.camera.theta*180/Math.PI} 32 32)`);frame++;
}
loadHash();icons();renderChapters();renderHeading();renderInspector();updatePlayback();
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){state.paused=true;state.auto=false;state.process=false;state.tour=false;updatePlayback();}});
window.vegetationAtlas={state,get engine(){return engine;},get scene(){return scene;},setChapter,setBiome,stepTo,setAltitude,getConfig,readConfig,ready:false,version:'2.0.0',focusDetail,get detailFocus(){return detailFocus;}};
requestAnimationFrame(()=>{try{engine=new A.Engine($('#world'));if(engine.software){state.quality='smooth';updatePlayback();}engine.high=state.quality==='high';buildScene();requestAnimationFrame(loop);}catch(err){console.error(err);$('#scene-loading').innerHTML=translate(`${icon('leaf')}<strong>三维课堂需要 WebGL 2</strong><div class="error-message"></div><button class="teach-button" data-action="guide">仍可阅读教学手册</button>`);$('.error-message').textContent=err.message;}});
})(VA);


}
