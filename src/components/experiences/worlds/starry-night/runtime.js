import { readPaintingPigments, buildPaintedLight } from './painted-lights.js'
import { FLIGHT, FLIGHT_DURATION, FLIGHT_BRIDGE_TIME, sampleFlight } from './flight-path'
import { PaintingVertices, createPaintingBuildYield, paintingRenderSize, createPaintingQuality, paintingDrawRanges, drawPaintingRanges } from '../../../../lib/painting-webgl.js'

export function mount(environment) {
const {location,history,document,window,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,matchMedia,ResizeObserver}=environment;
/* Small, dependency-free WebGL2 renderer. All geometry is real 3D, batched by material. */
'use strict';
const V={
 add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),mul:(a,s)=>a.map(x=>x*s),
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{let d=Math.hypot(...a)||1;return a.map(x=>x/d)},mix:(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t)
};
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 perspective:(f,a,n,z)=>{let s=1/Math.tan(f/2);return new Float32Array([s/a,0,0,0,0,s,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0])},
 look:(e,t,roll=0)=>{let z=V.norm(V.sub(e,t)),right=V.norm(V.cross([0,1,0],z)),up=V.cross(z,right),x=V.add(V.mul(right,Math.cos(roll)),V.mul(up,Math.sin(roll))),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1])},
 mul:(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
};
function RNG(seed=188809){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const rand=RNG();const range=(a,b)=>a+(b-a)*rand(),pick=a=>a[Math.floor(rand()*a.length)];
const colorCache=new Map();
function rgb(hex){if(Array.isArray(hex))return hex;if(!colorCache.has(hex)){const value=parseInt(hex.slice(1),16);colorCache.set(hex,[(value>>16&255)/255,(value>>8&255)/255,(value&255)/255]);}return colorCache.get(hex)}
function tint(c,v){return rgb(c).map(x=>Math.min(1,Math.max(0,x*v)))}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const ease=t=>t*t*(3-2*t);

class Batch{
 constructor(kind='paint'){this.kind=kind;this.data=new PaintingVertices();this.count=0;this.owner=0;this.anim=0;}
 vert(p,n,uv,c,em=0,anim=0,alpha=1){this.data.push(...p,...n,...uv,...rgb(c),em,anim||this.anim,alpha,this.owner);}
 tri(a,b,c,color,uv=[[0,0],[1,0],[1,1]],em=0,anim=0,alpha=1,normals=null){let n=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));[a,b,c].forEach((p,i)=>this.vert(p,normals?normals[i]:n,uv[i],color,em,anim,alpha));}
 quad(a,b,c,d,color,em=0,anim=0,alpha=1,uv=[[0,0],[1,0],[1,1],[0,1]]){this.tri(a,b,c,color,[uv[0],uv[1],uv[2]],em,anim,alpha);this.tri(a,c,d,color,[uv[0],uv[2],uv[3]],em,anim,alpha)}
 upload(gl){this.count=this.data.length/15;this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);const vertices=this.data.toArray();this.ranges=paintingDrawRanges(vertices,15);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);let off=0;[3,3,2,3,3,1].forEach((s,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,s,gl.FLOAT,false,60,off*4);off+=s;});this.data=null;gl.bindVertexArray(null);}
}
class World{
 constructor(){this.solid=new Batch();this.alpha=new Batch();this.sky=new Batch('sky');this.water=new Batch('water');this.labels=new Batch('labels');this.colliders=[];this.stats={};this.active=this.solid;this.objects=[];this.lamps=[];this.energy=new Float32Array(128).fill(1);}
 box(p,size,c,rot=0,em=0){let [x,y,z]=size.map(v=>v/2),vs=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
  vs=vs.map(q=>this.transform(q,p,rot));const fs=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];fs.forEach((f,i)=>this.active.quad(...f.map(v=>vs[v]),tint(c,[.87,1,.93,.96,1.07,.7][i]),em));}
 transform(q,p,rot=0){let s=Math.sin(rot),c=Math.cos(rot);return [q[0]*c+q[2]*s+p[0],q[1]+p[1],q[2]*c-q[0]*s+p[2]];}
 cylinder(a,b,r1,r2,c,sides=9,em=0){let axis=V.norm(V.sub(b,a)),u=V.norm(V.cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=V.cross(axis,u);let ring=(p,r,t)=>V.add(p,V.add(V.mul(u,Math.cos(t)*r),V.mul(v,Math.sin(t)*r)));
  for(let i=0;i<sides;i++){let t=i/sides*Math.PI*2,nt=(i+1)/sides*Math.PI*2,aa=ring(a,r1,t),ab=ring(a,r1,nt),ba=ring(b,r2,t),bb=ring(b,r2,nt);this.active.quad(aa,ab,bb,ba,tint(c,.93+.09*Math.cos(t)),em);this.active.tri(a,ab,aa,c,undefined,em);this.active.tri(b,ba,bb,c,undefined,em);}}
 sphere(p,s,c,seg=10,rings=6,em=0,anim=0){let pt=(a,b)=>[p[0]+s[0]*Math.sin(b)*Math.cos(a),p[1]+s[1]*Math.cos(b),p[2]+s[2]*Math.sin(b)*Math.sin(a)];
  for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){let a=i/seg*Math.PI*2,b=j/rings*Math.PI,aa=(i+1)/seg*Math.PI*2,bb=(j+1)/rings*Math.PI;let A=pt(a,b),B=pt(aa,b),D=pt(a,bb),C=pt(aa,bb),norm=q=>V.norm(q.map((v,k)=>(v-p[k])/(s[k]*s[k]))),col=tint(c,.97+.035*Math.sin(i*9+j*5));this.active.tri(A,B,C,col,[[0,0],[1,0],[1,1]],em,anim,1,[norm(A),norm(B),norm(C)]);this.active.tri(A,C,D,col,[[0,0],[1,1],[0,1]],em,anim,1,[norm(A),norm(C),norm(D)]);}}
 tube(points,r,c,sides=6,em=0){for(let i=0;i<points.length-1;i++)this.cylinder(points[i],points[i+1],r,r,c,sides,em)}
 ellipse(p,rx,rz,c,alpha=1,em=0){let batch=alpha<1?this.alpha:this.active;for(let i=0;i<20;i++){let a=i/20*6.283,b=(i+1)/20*6.283;batch.tri(p,[p[0]+Math.cos(a)*rx,p[1],p[2]+Math.sin(a)*rz],[p[0]+Math.cos(b)*rx,p[1],p[2]+Math.sin(b)*rz],c,undefined,em,0,alpha)}}
 collider(x0,x1,z0,z1){this.colliders.push({x0,x1,z0,z1});}
}

// Geometric entities stay independent in the model catalogue, but share GPU batches.
World.prototype.owner=function(id,animation=0){ for(const b of [this.solid,this.alpha,this.water,this.labels]){b.owner=id;b.anim=animation;} };
World.prototype.register=function(type,zh,en,center,radius,description,descriptionEN){const id=this.objects.length+1;if(id>=128)throw Error('Entity capacity exceeded');const o={id,type,zh,en,center,radius,description,descriptionEN};this.objects.push(o);this.owner(id);return o;};
World.prototype.curve=function(points,radius,color,sides=6,emission=0,animation=0){
 const batch=this.active, n=points.length; if(n<2)return;const ring=[];
 for(let i=0;i<n;i++){
  const T=V.norm(V.sub(points[Math.min(i+1,n-1)],points[Math.max(i-1,0)]));
  const U=V.norm(V.cross(T,Math.abs(T[1])>.94?[1,0,0]:[0,1,0])),W=V.cross(T,U);
  const rad=typeof radius==='function'?radius(i/(n-1)):radius;
  ring.push(Array.from({length:sides},(_,j)=>V.add(points[i],V.add(V.mul(U,Math.cos(j/sides*Math.PI*2)*rad),V.mul(W,Math.sin(j/sides*Math.PI*2)*rad)))));
 }
 for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++)batch.quad(ring[i][j],ring[i][(j+1)%sides],ring[i+1][(j+1)%sides],ring[i+1][j],tint(color,.92+.1*Math.sin(j*1.8)),emission,animation);
 for(let j=1;j<sides-1;j++){batch.tri(ring[0][0],ring[0][j],ring[0][j+1],color,undefined,emission,animation);batch.tri(ring[n-1][0],ring[n-1][j+1],ring[n-1][j],color,undefined,emission,animation);}
};
World.prototype.rock=function(pos,size,col,rot=0){
 const n=7,lo=[],hi=[];for(let i=0;i<n;i++){let a=i/n*Math.PI*2,r=.86+.1*Math.sin(i*8.71);lo.push(this.transform([Math.cos(a)*size[0]*r,-size[1]*.5,Math.sin(a)*size[2]*r],pos,rot));hi.push(this.transform([Math.cos(a)*size[0]*(r-.13),size[1]*(.35+.11*Math.cos(i*7)),Math.sin(a)*size[2]*(r-.13)],pos,rot));}
 for(let i=0;i<n;i++){let j=(i+1)%n;this.active.quad(lo[i],lo[j],hi[j],hi[i],tint(col,.8+i*.026));this.active.tri(pos.map((v,k)=>k===1?v+size[1]*.48:v),hi[i],hi[j],tint(col,1.05));}
};
const sceneVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;layout(location=3) in vec3 aColor;layout(location=4) in vec3 aExtra;layout(location=5) in float aId;
uniform mat4 uVP;uniform mat4 uLightVP;uniform float uTime;
out vec3 vPos;out vec3 vNormal;out vec3 vColor;out vec3 vExtra;out vec3 vBary;out vec4 vShadow;flat out float vId;
vec3 animate(vec3 p,float a){
 if(a>1.5&&a<2.5){p.x+=sin(uTime*.65+p.y*.5+p.z*.2)*.10; p.z+=cos(uTime*.5+p.y*.3)*.07;}
 if(a>2.5&&a<3.5){p.y+=sin(uTime*.3+p.x*.065)*.24;}
 if(a>3.5&&a<4.5){p.y+=sin(uTime*.21+p.x*.075+p.z*.043)*.40;p.z+=cos(uTime*.19+p.x*.058)*.45;}
 if(a>5.5&&a<6.5){p.y+=sin(p.x*.65+uTime*.8)*.075+sin(p.z*.43-uTime*.6)*.095;}
 if(a>=10.&&a<20.){p.y+=sin(uTime*.6+floor(a))*.105;p.x+=cos(uTime*.22+floor(a))*.075;}
 if(a>=30.&&a<40.){p.y+=sin(uTime*.6+floor(a)-20.)*.105;p.x+=cos(uTime*.22+floor(a)-20.)*.075+sin(p.y*.8+uTime*.8)*.07;}
 if(a>=40.&&a<50.){float id=floor(a)-40.;float drift=.5+.5*sin((p.x+p.y)*.022+uTime*.08);p.x+=sin(uTime*.09+p.y*.044+id*.7)*(.16+.08*drift); p.y+=cos(uTime*.11+p.x*.034+id*.45)*(.13+.06*drift); p.z+=sin(uTime*.13+p.x*.021+p.y*.018+id)*(.55+.28*drift);}
 if(a>=50.&&a<60.){float id=floor(a)-50.;p.x+=sin(uTime*.11+p.y*.08+id*.5)*.16; p.y+=cos(uTime*.15+p.x*.06+id)*.22;}
 return p;
}
void main(){vec3 p=animate(aPosition,aExtra.y);vPos=p;vNormal=aNormal;vColor=aColor;vExtra=aExtra;vId=aId;vBary=gl_VertexID%3==0?vec3(1,0,0):(gl_VertexID%3==1?vec3(0,1,0):vec3(0,0,1));vShadow=uLightVP*vec4(p,1.);gl_Position=uVP*vec4(p,1.);}`;
const sceneFS=`#version 300 es
precision highp float;
in vec3 vPos;in vec3 vNormal;in vec3 vColor;in vec3 vExtra;in vec3 vBary;in vec4 vShadow;flat in float vId;
uniform vec3 uEye;uniform float uTime;uniform int uKind;uniform int uWire;uniform int uSelected;uniform float uEnergy[128];uniform vec4 uLamps[12];uniform sampler2D uShadow;uniform bool uShadows;uniform vec4 uBoatMasks[5];uniform vec2 uBoatRot[5];out vec4 outColor;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float shadow(vec3 N){if(!uShadows)return 1.;vec3 q=vShadow.xyz/vShadow.w*.5+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;float value=0.;float bias=max(.00028,.0009*(1.-dot(N,normalize(vec3(.45,1.,.5)))));for(int i=0;i<4;i++){vec2 d=vec2(float(i%2)-.5,float(i/2)-.5)*.0007;value+=q.z-bias<=texture(uShadow,q.xy+d).r?1.:.53;}return value*.25;}
void main(){
 vec3 N=normalize(vNormal),E=normalize(uEye-vPos);if(dot(N,E)<0.)N=-N;float emission=vExtra.x*uEnergy[clamp(int(vId+.5),0,127)];vec3 col=vColor;
 if(uKind==1){float k=clamp((vPos.y+25.)/160.,0.,1.);float flow=.5+.5*sin(vPos.x*.038+vPos.y*.055+uTime*.12)+.5*sin(vPos.x*.021-uTime*.08);col=mix(vec3(.105,.20,.33),vec3(.022,.072,.20),k);col+=noise(vPos*.024)*.022;col+=vec3(.03,.045,.05)*flow*.24;outColor=vec4(col,1.);return;}
 if(uKind==3){
 for(int i=0;i<5;i++){vec4 b=uBoatMasks[i];vec2 q=vPos.xz-b.xy-vec2(cos(uTime*.22+float(i)+10.)*.075,0.);vec2 cs=uBoatRot[i];vec2 local=vec2(q.x*cs.x-q.y*cs.y,q.x*cs.y+q.y*cs.x);float u=local.y/b.z+.5;if(u>0.&&u<1.&&abs(local.x)<pow(sin(u*3.14159265),.64)*b.w*.44)discard;}
 N=normalize(vec3(-.042*cos(vPos.x*.55+uTime*.55),1.,-.036*cos(vPos.z*.39-uTime*.42)));float fres=pow(1.-max(dot(N,E),0.),3.);col=mix(vec3(.018,.07,.13),vec3(.085,.26,.39),fres*.8+.16);vec3 L=normalize(vec3(.45,1.,.5));float s=pow(max(dot(reflect(-L,N),E),0.),75.);col+=vec3(.92,.68,.25)*s*.45;float strokes=pow(max(0.,sin(vPos.z*2.2+sin(vPos.x*.65)+uTime*.16)),18.);col+=vec3(.22,.30,.27)*strokes*.075;float riverCenter=26.+6.*sin(vPos.z*.022)+3.*sin(vPos.z*.05);float dist=abs(vPos.x-riverCenter);float ribbon=exp(-dist*dist*.075);float drift=.5+.5*sin(vPos.z*.17-uTime*.28+sin(vPos.z*.035)*1.8);float shimmer=.5+.5*sin(vPos.z*1.25+uTime*.45+dist*2.1);col+=vec3(.18,.14,.08)*ribbon*(.14+.36*drift);col+=vec3(.62,.54,.25)*ribbon*pow(drift,2.4)*.24;col+=vec3(.10,.14,.14)*ribbon*shimmer*.06;}
 else{
 vec3 an=abs(N);vec2 uv=an.y>.7?vPos.xz:(an.x>an.z?vPos.zy:vPos.xy);
 float broad=noise(vec3(uv*.85,2.3));float brush=sin(uv.x*43.+sin(uv.y*1.8)*1.3+noise(vec3(uv*.7,1.))*2.);float grain=hash(floor(vPos*71.));
 col*=.86+broad*.20+brush*.009+grain*.022;
 vec3 L=normalize(vec3(.45,1.,.5));float diffuse=max(dot(N,L),0.);float hemi=N.y*.11+.58;float sh=shadow(N);float spec=pow(max(dot(reflect(-L,N),E),0.),22.)*(.08+.18*diffuse);
 col*=hemi+diffuse*.62*sh;col+=vec3(1.,.86,.62)*spec*sh;
 float rim=pow(1.-max(dot(N,E),0.),3.);col+=vec3(.045,.071,.12)*rim*.36;
 float warm=0.;for(int i=0;i<12;i++){vec3 d=uLamps[i].xyz-vPos;float d2=dot(d,d);warm+=uLamps[i].w*max(.16,dot(N,normalize(d)))/(1.+d2*.5);}
 col+=vec3(1.,.64,.22)*warm*.37;
 if(vExtra.x>1.)col*=mix(.035,1.,uEnergy[clamp(int(vId+.5),0,127)]);col=mix(col,vColor*(.90+broad*.10),clamp(emission,0.,1.));col+=vColor*max(0.,emission-1.)*.15;
 }
 float fog=1.-exp(-pow(length(vPos-uEye)*.0041,1.45));fog*=1.-min(emission,1.)*.70;col=mix(col,vec3(.055,.118,.224),min(fog,.78));
 if(uSelected==int(vId+.5)&&vId>0.)col+=vec3(.07,.05,.018)*(1.-max(dot(N,E),0.));
 if(uWire==1){vec3 d=fwidth(vBary);vec3 sm=smoothstep(vec3(0.),d*1.15,vBary);float edge=1.-min(sm.x,min(sm.y,sm.z));col=mix(vec3(.016,.03,.052),vec3(.50,.73,.84),edge);}
 outColor=vec4(clamp(col,0.,1.),vExtra.z);
}`;
const shadowFS=`#version 300 es
precision highp float;in vec3 vExtra;out vec4 dummy;void main(){if(vExtra.x>.6)discard;dummy=vec4(1.);}`;
const postVS=`#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const blurFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene;uniform vec2 uDir;uniform int uThreshold;out vec4 outColor;
vec3 sampleCol(vec2 uv){vec3 c=texture(uScene,uv).rgb;return uThreshold==1?max(c-vec3(.67,.60,.46),vec3(0.)):c;}
void main(){vec3 c=sampleCol(vUV)*.227027;c+=sampleCol(vUV+uDir*1.384615)*.316216;c+=sampleCol(vUV-uDir*1.384615)*.316216;c+=sampleCol(vUV+uDir*3.230769)*.070270;c+=sampleCol(vUV-uDir*3.230769)*.070270;outColor=vec4(c,1.);}`;
const postFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene;uniform sampler2D uBloom;uniform vec2 uSize;uniform float uFade;uniform int uWire;out vec4 outColor;
void main(){vec2 px=1./uSize;vec3 c=texture(uScene,vUV).rgb;vec3 sum=c;float w=1.;for(int i=0;i<4;i++){float a=float(i)*1.570796;vec2 d=vec2(cos(a),sin(a));vec3 n=texture(uScene,vUV+d*px*.75).rgb;float k=.18*exp(-length(n-c)*8.);sum+=n*k;w+=k;}c=mix(c,sum/w,.75);if(uWire==0)c+=texture(uBloom,vUV).rgb*.78;float edge=smoothstep(.24,.89,length((vUV-.5)*vec2(1.,.8)));c*=1.-edge*.11;c=pow(max(c,vec3(0.)),vec3(.96));outColor=vec4(c*(1.-uFade),1.);}`;
M.ortho=(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);
class Renderer{
 constructor(canvas){
  this.canvas=canvas;const g=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!g)throw Error('WEBGL2_UNAVAILABLE');this.gl=g;
  this.programScene=this.program(sceneVS,sceneFS);this.programShadow=this.program(sceneVS,shadowFS);this.programPost=this.program(postVS,postFS);this.programBlur=this.program(postVS,blurFS);
  this.quality=createPaintingQuality();this.scale=1;this.wire=false;this.selected=0;this.shadows=true;this.fade=0;this.bank=0;this.fov=62;
  this.lightVP=M.mul(M.ortho(-125,125,-130,130,1,370),M.look([100,170,80],[0,0,-30]));
  this.sceneTarget=this.target(true);this.bloomA=this.target(false);this.bloomB=this.target(false);
  this.shadowFBO=g.createFramebuffer();this.shadowTex=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.shadowTex);g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,3072,3072,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFBO);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.shadowTex,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)this.shadows=false;g.bindFramebuffer(g.FRAMEBUFFER,null);
  this.uniforms=new Map();this.resize();
 }
 program(v,f){const g=this.gl;const compile=(type,s)=>{const q=g.createShader(type);g.shaderSource(q,s);g.compileShader(q);if(!g.getShaderParameter(q,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(q));return q;};const p=g.createProgram();g.attachShader(p,compile(g.VERTEX_SHADER,v));g.attachShader(p,compile(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return p;}
 uniform(p,name){let cache=this.uniforms.get(p);if(!cache){cache=new Map();this.uniforms.set(p,cache);}if(!cache.has(name))cache.set(name,this.gl.getUniformLocation(p,name));return cache.get(name);}
 target(depth){return {fbo:this.gl.createFramebuffer(),texture:this.gl.createTexture(),depth:depth?this.gl.createRenderbuffer():null};}
 resizeTarget(t,w,h){const g=this.gl;t.w=w;t.h=h;g.bindTexture(g.TEXTURE_2D,t.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);for(const [a,b] of [[g.TEXTURE_MIN_FILTER,g.LINEAR],[g.TEXTURE_MAG_FILTER,g.LINEAR],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,a,b);g.bindFramebuffer(g.FRAMEBUFFER,t.fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t.texture,0);if(t.depth){g.bindRenderbuffer(g.RENDERBUFFER,t.depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,t.depth);}if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('FRAMEBUFFER_INCOMPLETE');g.bindFramebuffer(g.FRAMEBUFFER,null);}
 resize(){const [w,h]=paintingRenderSize(document.body.clientWidth,document.body.clientHeight,window.devicePixelRatio,this.scale,this.quality.scale);if(this.canvas.width===w&&this.canvas.height===h&&this.sceneTarget.w===w)return;this.canvas.width=w;this.canvas.height=h;this.resizeTarget(this.sceneTarget,w,h);this.resizeTarget(this.bloomA,Math.max(1,w>>2),Math.max(1,h>>2));this.resizeTarget(this.bloomB,Math.max(1,w>>2),Math.max(1,h>>2));}
 init(world){this.world=world;world.stats.triangles=0;for(const b of [world.sky,world.solid,world.alpha,world.water,world.labels]){world.stats.triangles+=b.data.length/45;b.upload(this.gl);}this.boatMasks=new Float32Array(20);this.boatRot=new Float32Array(10);world.boatMasks.forEach((b,i)=>{this.boatMasks.set([b.x,b.z,b.L,b.W],i*4);this.boatRot.set([Math.cos(b.rot),Math.sin(b.rot)],i*2);});this.lamps=new Float32Array(48);world.lamps.slice(0,12).forEach((l,i)=>this.lamps.set(l,i*4));this.bakeShadow();}
 bakeShadow(){if(!this.shadows)return;const g=this.gl,p=this.programShadow;g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFBO);g.viewport(0,0,3072,3072);g.enable(g.DEPTH_TEST);g.depthMask(true);g.clear(g.DEPTH_BUFFER_BIT);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.useProgram(p);g.uniformMatrix4fv(this.uniform(p,'uVP'),false,this.lightVP);g.uniformMatrix4fv(this.uniform(p,'uLightVP'),false,this.lightVP);g.uniform1f(this.uniform(p,'uTime'),0);g.bindVertexArray(this.world.solid.vao);drawPaintingRanges(g,this.world.solid,this.lightVP);g.bindFramebuffer(g.FRAMEBUFFER,null);}
 blur(input,target,dir,threshold){const g=this.gl,p=this.programBlur;g.bindFramebuffer(g.FRAMEBUFFER,target.fbo);g.viewport(0,0,target.w,target.h);g.useProgram(p);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,input);g.uniform1i(this.uniform(p,'uScene'),0);g.uniform2fv(this.uniform(p,'uDir'),dir);g.uniform1i(this.uniform(p,'uThreshold'),threshold);g.drawArrays(g.TRIANGLES,0,3);}
 render(eye,target,time,fade=0){const g=this.gl,w=this.canvas.width,h=this.canvas.height,p=this.programScene;this.vp=M.mul(M.perspective((this.fov+(document.body.clientWidth<600?22:0))*Math.PI/180,w/h,.09,650),M.look(eye,target,this.bank));
  g.bindFramebuffer(g.FRAMEBUFFER,this.sceneTarget.fbo);g.viewport(0,0,w,h);g.enable(g.DEPTH_TEST);g.depthMask(true);g.disable(g.CULL_FACE);g.disable(g.BLEND);g.clearColor(.02,.055,.12,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(p);
  g.uniformMatrix4fv(this.uniform(p,'uVP'),false,this.vp);g.uniformMatrix4fv(this.uniform(p,'uLightVP'),false,this.lightVP);g.uniform1f(this.uniform(p,'uTime'),time);g.uniform3fv(this.uniform(p,'uEye'),eye);g.uniform1i(this.uniform(p,'uWire'),this.wire?1:0);g.uniform1i(this.uniform(p,'uSelected'),this.selected);g.uniform1fv(this.uniform(p,'uEnergy[0]'),this.world.energy);for(let i=0;i<this.world.lamps.length&&i<12;i++)this.lamps[i*4+3]=this.world.lamps[i][3]*(this.world.lampGlow??1);g.uniform4fv(this.uniform(p,'uLamps[0]'),this.lamps);g.uniform4fv(this.uniform(p,'uBoatMasks[0]'),this.boatMasks);g.uniform2fv(this.uniform(p,'uBoatRot[0]'),this.boatRot);g.uniform1i(this.uniform(p,'uShadows'),this.shadows?1:0);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.shadowTex);g.uniform1i(this.uniform(p,'uShadow'),0);
  const draw=(b,k)=>{if(!b.count)return;g.uniform1i(this.uniform(p,'uKind'),k);g.bindVertexArray(b.vao);drawPaintingRanges(g,b,this.vp);};
  g.depthMask(false);draw(this.world.sky,1);g.depthMask(true);draw(this.world.solid,0);draw(this.world.water,3);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(false);draw(this.world.alpha,0);g.depthMask(true);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.bindVertexArray(null);
  this.blur(this.sceneTarget.texture,this.bloomA,[2/w,0],1);this.blur(this.bloomA.texture,this.bloomB,[0,2/this.bloomB.h],0);
  const post=this.programPost;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,w,h);g.useProgram(post);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.sceneTarget.texture);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.bloomB.texture);g.uniform1i(this.uniform(post,'uScene'),0);g.uniform1i(this.uniform(post,'uBloom'),1);g.uniform2f(this.uniform(post,'uSize'),w,h);g.uniform1f(this.uniform(post,'uFade'),fade);g.uniform1i(this.uniform(post,'uWire'),this.wire?1:0);g.drawArrays(g.TRIANGLES,0,3);g.activeTexture(g.TEXTURE0);
 }
}

/* Village surfaces use procedural geometry; sky lights sample original pigments. Brush variation is evaluated
   in world coordinates by the material shader in engine.js. */

/* STARFIELD VILLAGE — authored geometry, not a depth-sliced picture.
   World units are imagined metres. +Y up; the village faces +Z. */
const TAU=Math.PI*2;
const riverX=z=>26+6*Math.sin(z*.022)+3*Math.sin(z*.05);
function terrainHeight(x,z){
 const back=Math.max(0,-z-55),side=Math.max(0,Math.abs(x)-38);
 let y=.25+Math.sin(x*.11)*.22+Math.cos(z*.13)*.18;
 y+=Math.max(0,-x-19)*.15+Math.max(0,z-20)*.065;
 y+=Math.min(28,back*.32)*( .63+.35*Math.sin(x*.073+z*.018)+.18*Math.sin(x*.153-z*.06));
 y+=Math.min(16,side*.23)*( .65+.3*Math.cos(z*.08));
 const d=Math.abs(x-riverX(z));const bank=clamp((d-6.7)/4.8,0,1);y=-2.8+(y+2.8)*ease(bank);
 return y;
}
function pathX(z){return -8-10*Math.exp(-Math.pow((z-14)/18,2))+Math.max(0,z-30)*.14;}
async function makeWorld(){
 const yieldBuild=createPaintingBuildYield(setTimeout);
 const w=new World();w.boatMasks=[];let paving=0,roofTiles=0,windows=0,boatCount=0,treeCount=0,skyRibbons=0;
 const col={stone:['#666f72','#747d7b','#506679','#958871','#8b8b78'],roof:['#243f69','#2f5173','#526675','#34455e','#756650'],wall:['#607586','#89918a','#927f60','#667b82','#817e6e']};
 const owner=(id=0,anim=0)=>w.owner(id,anim);
 function lamp(x,z,y=terrainHeight(x,z),height=2.5){
  const c=[x,y,z];w.cylinder(c,[x,y+height,z],.075,.055,'#253b47',7);w.box([x,y+.10,z],[.38,.20,.38],'#55676b');w.box([x,y+height,z],[.38,.58,.38],'#fbd083',0,1.35);for(const dx of [-.21,.21])for(const dz of [-.21,.21])w.cylinder([x+dx,y+height-.34,z+dz],[x+dx,y+height+.34,z+dz],.032,.032,'#24383c',5);w.cylinder([x,y+height+.35,z],[x,y+height+.53,z],.37,.08,'#304d55',4);w.lamps.push([x,y+height-.18,z,1.9]);
 }
 await yieldBuild();
 // Undulating terrain: an actual triangulated surface, including the river cut.
 owner();
 function groundVertex(x,z){const y=terrainHeight(x,z),n=V.norm([terrainHeight(x-.3,z)-terrainHeight(x+.3,z),.6,terrainHeight(x,z-.3)-terrainHeight(x,z+.3)]),far=clamp((-z-43)/60,0,1),variation=Math.sin(x*.13+Math.cos(z*.09))*.013+Math.sin(z*.071)*.012;const co=[.17*(1-far)+.17*far+variation,.25*(1-far)+.28*far+variation,.28*(1-far)+.44*far+variation];return {p:[x,y,z],n,co};}
 for(let z=-190;z<105;z+=2.8)for(let x=-155;x<145;x+=2.8){const v=[groundVertex(x,z),groundVertex(x,z+2.8),groundVertex(x+2.8,z+2.8),groundVertex(x+2.8,z)];for(const i of [0,1,2,0,2,3])w.solid.vert(v[i].p,v[i].n,[0,0],v[i].co);}
 await yieldBuild();
 // Raised, earth-bound paint marks and grass follow the terrain instead of a square grid.
 for(let i=0;i<4200;i++){if(i%64===0)await yieldBuild();const x=range(-76,84),z=range(-125,65);if(Math.abs(x-riverX(z))<10.7)continue;const a=range(-.15,.15),len=range(.4,1.7),points=[];for(let j=0;j<4;j++){let xx=x+j/3*len,zz=z+Math.sin(j*.6)*a;points.push([xx,terrainHeight(xx,zz)+.055,zz]);}w.curve(points,range(.018,.043),pick(z< -58?['#537a9b','#476a8a','#63879e']:['#50726c','#657e66','#4d6c64','#3d6267','#8a8b67']),4);}
 await yieldBuild();
 // Mesh contour strokes follow the distant hills, rather than sticking to the screen.
 for(let j=0;j<58;j++){const z=-62-j*2.2,pts=[];for(let x=-132;x<120;x+=3.2)pts.push([x,terrainHeight(x,z)+.08,z]);w.curve(pts,.035+(j%3)*.012,pick(['#526c83','#325577','#628087','#3a5674']),4);}
 await yieldBuild();
 // River is a deformed mesh with analytic wave normals.
 w.active=w.water;owner(0,6);for(let z=-185;z<95;z+=1.2)for(let j=0;j<15;j++){const a=j/15*14.2-7.1,b=(j+1)/15*14.2-7.1;w.water.quad([riverX(z)+a,-1.5,z],[riverX(z+1.2)+a,-1.5,z+1.2],[riverX(z+1.2)+b,-1.5,z+1.2],[riverX(z)+b,-1.5,z],'#21445d',0,6);}
 w.active=w.solid;owner();
 await yieldBuild();
 // Cobbled hillside path. Each paving stone is a bevel-like seven-sided rock.
 for(let z=-57;z<69;z+=.86){const slope=(pathX(z+.4)-pathX(z-.4))/.8,angle=Math.atan(slope);for(let k=0;k<5;k++){const x=pathX(z)+(k-2)*.73+range(-.09,.09);w.rock([x,terrainHeight(x,z)+.065,z+range(-.07,.07)],[.39,.15,.44],pick(col.stone),angle);paving++;}}
 await yieldBuild();
 // Village crossing and a promenade that reaches the boat landing.
 for(let x=-22;x<19;x+=.82)for(let j=0;j<4;j++){const z=-4+(j-1.5)*.73;w.rock([x,terrainHeight(x,z)+.06,z],[.41,.15,.37],pick(col.stone),0);paving++;}
 await yieldBuild();
 // A hand-laid court and narrow cross street, each slab is solid geometry.
 for(let z=-16;z<9;z+=.87)for(let x=-6.6;x<5.8;x+=.84){if((z< -7&&Math.abs(x+1.5)<3.2)||((x> -1.5&&x<3.6)&&z> -7.3&&z< -2.8))continue;w.rock([x+range(-.065,.065),terrainHeight(x,z)+.065,z],[.415,.16,.428],pick(['#5e7480','#677d86','#849184','#536b7b','#9e997d']),range(-.035,.035));paving++;}
 await yieldBuild();
 // Low stone walls by the foreground footpath, with individual coping stones.
 for(let z=11;z<54;z+=1.0)for(const sign of [-1,1]){const x=pathX(z)+sign*2.45,y=terrainHeight(x,z);for(let j=0;j<3;j++)w.rock([x,y+.19+j*.26,z+((j%2)*.14)],[.38,.34,.5],pick(['#53626b','#596366','#787965']),.07);w.rock([x,y+1.04,z],[.44,.16,.51],'#929386',0);}
 function windowAt(T,x,y,z,width,height,rot,id){
  const Q=p=>T(w.transform(p,[x,y,z],rot));
  // Every opening has thick glass, four frame pieces, mullions and two slatted shutters.
  w.box(Q([0,0,0]),[width,height,.095],'#f5cc70',rot+T.rot,1.16);
  for(const side of [-1,1]){w.box(Q([side*(width/2+.045),0,.045]),[.09,height+.19,.16],'#263e50',rot+T.rot);w.box(Q([0,side*(height/2+.045),.055]),[width+.18,.09,.18],'#b1a582',rot+T.rot);}
  w.box(Q([0,0,.085]),[.055,height,.13],'#435252',rot+T.rot);w.box(Q([0,-.10,.085]),[width,.05,.13],'#45554e',rot+T.rot);
  for(const side of [-1,1]){const sx=side*(width*.75+.16);w.box(Q([sx,0,.07]),[width*.43,height+.1,.12],'#2b4857',rot+T.rot);for(let j=0;j<9;j++)w.box(Q([sx,(j-4)*(height/9),.135]),[width*.39,.03,.06],'#456264',rot+T.rot);}
  w.box(Q([0,-height/2-.12,.15]),[width+1.05,.14,.38],'#9b9983',rot+T.rot);windows++;
 }
 function house(x,z,ww,dd,hh,rot=0,special=false){
  const y=terrainHeight(x,z),id=w.register('house',special?'河谷里的小旅店':'亮着灯的家','A lamplit house',[x,y+hh*.55,z],Math.max(ww,dd,hh)*.85,'四面墙、斜屋顶、独立瓦片、百叶窗和烟囱。绕到背面仍然是完整的建筑。','Four walls, a pitched roof, individual tiles, shutters and a chimney. The back is modeled too.').id;
  const T=p=>w.transform(p,[x,y,z],rot);T.rot=rot;const C=pick(col.wall),R=pick(col.roof);
  w.box(T([0,hh*.5,0]),[ww,hh,dd],C,rot);w.box(T([0,-.7,0]),[ww+.25,1.8,dd+.25],'#3e535f',rot);
  const rh=ww*.44;
  for(const front of [-1,1])w.solid.tri(T([-ww/2,hh,front*dd/2]),T([ww/2,hh,front*dd/2]),T([0,hh+rh,front*dd/2]),tint(C,.97));
  // Sloping roof panels are thick at the eave and end, not camera-facing rectangles.
  for(const side of [-1,1]){
   const A=T([side*(ww/2+.3),hh-.08,-dd/2-.33]),B=T([side*(ww/2+.3),hh-.08,dd/2+.33]),C0=T([0,hh+rh+.06,dd/2+.33]),D=T([0,hh+rh+.06,-dd/2-.33]);
   w.solid.quad(A,B,C0,D,R);w.curve([A,B],.10,'#20344b',5);
   const rows=Math.ceil(ww/2/.34),cols=Math.ceil((dd+.5)/.42);
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
    const u=i/rows,v=(i+1)/rows,za=-dd/2-.29+j*(dd+.58)/cols,zb=za+(dd+.58)/cols-.035;
    const point=(t,z0)=>T([side*(ww/2+.27)*(1-t),hh-.06+rh*t+.07,z0]);
    const a=point(u,za),b=point(u,zb),c=point(v,zb),d=point(v,za);w.solid.quad(a,b,c,d,tint(R,range(.82,1.27)));w.solid.quad(V.add(a,[0,-.065,0]),a,b,V.add(b,[0,-.065,0]),'#233850');roofTiles++;
   }
  }
  w.curve([T([0,hh+rh+.09,-dd/2-.35]),T([0,hh+rh+.09,dd/2+.35])],.13,'#9a9876',6);
  // Corner stones and a continuous belt course.
  for(const xx of [-1,1])for(const zz of [-1,1])for(let k=0;k<hh/.52;k++)w.box(T([xx*ww/2,k*.52+.24,zz*dd/2]),[.28,.42,.28],tint(C,1.16),rot);
  if(hh>4.4)w.box(T([0,hh*.53,0]),[ww+.14,.1,dd+.15],'#9b9e8b',rot);
  if(z> -31){for(let row=0;row<Math.ceil(hh/.32);row++)for(const sign of [-1,1])for(let i=0;i<Math.floor(ww/.65);i++){if((row+i)%4!==0)continue;const xx=-ww/2+.34+i*.65+(row%2)*.13;if(Math.abs(xx)>ww/2-.18)continue;w.box(T([xx,.18+row*.32,sign*(dd/2+.015)]),[.48,.16,.038],tint(C,range(.86,1.10)),rot);}}
  const floors=hh>4.2?2:1;
  for(let f=0;f<floors;f++){
   const fy=f===0?1.7:hh-.95;
   for(const front of [-1,1])for(const xx of [-ww*.25,ww*.25])windowAt(T,xx,fy,front*(dd/2+.08),.58,.95,front===1?0:Math.PI,id);
   for(const side of [-1,1])for(const zz of [-dd*.24,dd*.24])windowAt(T,side*(ww/2+.08),fy,zz,.54,.85,side*Math.PI/2,id);
  }
  // Recess-like door frame, threshold and knob, all on the front facade.
  w.box(T([0,.89,dd/2+.12]),[.92,1.75,.19],'#182d3e',rot);
  for(let i=0;i<5;i++)w.box(T([(i-2)*.17,.88,dd/2+.24]),[.15,1.65,.045],'#57615a',rot);
  w.box(T([0,.05,dd/2+.49]),[1.35,.16,.82],'#9a977d',rot);w.sphere(T([.28,.88,dd/2+.31]),[.055,.055,.05],'#e3b761',8,4,.55);
  w.box(T([ww*.28,hh+rh*.65+.5,-dd*.23]),[.72,1.65,.78],'#6f7473',rot);w.box(T([ww*.28,hh+rh*.65+1.28,-dd*.23]),[.9,.18,.94],'#b4a58b',rot);w.box(T([ww*.28,hh+rh*.65+1.4,-dd*.23]),[.55,.12,.57],'#182e47',rot);
  if(special){for(let j=0;j<8;j++)w.box(T([-ww*.37+j*ww*.105,3.15,dd/2+.92]),[.06,1.05,.07],'#958d70',rot);w.box(T([0,2.57,dd/2+.60]),[ww*.85,.19,1.35],'#6f7165',rot);w.curve([T([-ww*.44,3.7,dd/2+.92]),T([ww*.44,3.7,dd/2+.92])],.065,'#b4ac83',5);}
  // Dormers, flower boxes and a small entry stair make the façades more articulated.
  if(hh>4.7){
   for(const sideX of [-ww*.18,ww*.18]){
    w.box(T([sideX,hh+rh*.52,dd*.13]),[.82,.95,.98],tint(C,1.05),rot);
    w.solid.tri(T([sideX-.41,hh+rh*.98,dd*.62]),T([sideX+.41,hh+rh*.98,dd*.62]),T([sideX,hh+rh*1.34,dd*.62]),tint(R,1.04));
    windowAt(T,sideX,hh+rh*.60,dd*.62,.36,.52,0,id);
   }
  }
  for(const front of [-1,1])for(const xx of [-ww*.25,ww*.25]){
   w.box(T([xx,1.06,front*(dd/2+.34)]),[.86,.12,.24],'#6f7d62',rot);
   for(let p=0;p<4;p++)w.sphere(T([xx-.28+p*.18,1.15,front*(dd/2+.39)]),[.07,.08,.06],pick(['#b7d1b7','#d5c97d','#cfa27c','#90b2bc']),7,4,.12);
  }
  for(let step=0;step<3;step++)w.box(T([0,.04+step*.18,dd/2+.58+step*.18]),[1.45-step*.18,.12,.74],'#a39b7e',rot);
  const extentX=Math.abs(Math.cos(rot))*ww/2+Math.abs(Math.sin(rot))*dd/2,extentZ=Math.abs(Math.cos(rot))*dd/2+Math.abs(Math.sin(rot))*ww/2;
  w.collider(x-extentX-.28,x+extentX+.28,z-extentZ-.28,z+extentZ+.28);owner();return id;
 }
 const houses=[[-20,0,4.3,5.1,5.4,.10,true],[-9,2,4.2,4.9,4.8,-.08,true],[1,2,4.5,5,4.2,.12],[10,1,4.8,4.7,5.5,-.16],[-25,-12,4.3,4.3,4.4,.04],[-16,-13,4.7,5.2,5.8,-.08],[9,-11,4.8,5.4,4.4,-.10],[16,-18,3.4,4.5,4.2,.15],[-24,-25,5,5.7,4.8,.13],[-14,-29,4.3,5.4,4.5,-.12],[9,-30,4.2,4.8,5.2,.06],[-29,-40,4.3,5,4.5,.1],[-19,-42,5,5.3,5.4,-.09],[-9,-44,4.6,5,4.2,.12],[1,-44,4.5,4.4,5.4,-.08],[12,-44,4.4,4.8,4.6,.16],[-34,-53,4.4,4.7,4.5,.2],[-24,-55,4.8,4.5,5.4,-.07],[-14,-57,4.2,4.8,4.4,.12],[-4,-58,4.8,5,4.5,-.12],[7,-59,4.7,4.9,5.6,.06],[-37,-26,4.5,4.7,4.4,.2],[-39,-8,4.2,5,4.5,-.17],[-46,-36,4.4,4.2,4.2,.12]];
 for(const args of houses){house(...args);await yieldBuild();}
 for(let i=0;i<11;i++){const z=16-i*8.8;house(riverX(z)+13+(i%3)*2,z,3.6+(i%3)*.4,4.3,4.4+(i%2)*1.1,-.28+i*.045);}
 for(let i=0;i<8;i++)house(-35+i*8.8,-78-(i%3)*6,3.8,4.4,3.8+(i%3)*.4,.12);
 await yieldBuild();
 // Church nave, bell tower, windows and a volumetric spire.
 const cx=-1.5,cz=-23,cy=terrainHeight(cx,cz);const church=w.register('church','山谷的钟楼','The village bell tower',[cx,cy+8,cz],10,'教堂由中殿、钟楼、钟体、玫瑰窗和尖顶组成。可以飞到钟的旁边。','The nave, tower, bell, rose window and spire are separate pieces. Fly up beside the bell.');
 w.box([cx,cy+3.0,cz],[5.8,6,10.5],'#788692');
 for(const side of [-1,1])w.solid.quad([cx+side*3.15,cy+5.8,cz-5.55],[cx+side*3.15,cy+5.8,cz+5.55],[cx,cy+9,cz+5.55],[cx,cy+9,cz-5.55],'#294b71');
 for(const zz of [-5.5,5.5])w.solid.tri([cx-3.1,cy+5.8,cz+zz],[cx+3.1,cy+5.8,cz+zz],[cx,cy+9,cz+zz],'#8b9694');
 const tz=cz+3.5;w.box([cx,cy+6.3,tz],[2.9,12.6,3.1],'#899387');w.box([cx,cy+12.8,tz],[3.3,.42,3.5],'#b2b395');
 for(const x of [-1,1])for(const z of [-1,1])w.box([cx+x*1.2,cy+14.3,tz+z*1.22],[.35,2.6,.38],'#b1ad8f');
 w.cylinder([cx,cy+13.1,tz],[cx,cy+14.4,tz],.68,.33,'#d1a964',16);w.sphere([cx,cy+12.94,tz],[.12,.19,.12],'#5f5135',10,6);
 w.box([cx,cy+15.8,tz],[3.1,.32,3.3],'#a8ae9b');w.cylinder([cx,cy+15.9,tz],[cx,cy+25.8,tz],2.13,.025,'#537187',4);w.cylinder([cx,cy+25.1,tz],[cx,cy+27.0,tz],.052,.032,'#d4ba7a',7,.3);
 const T=p=>V.add([cx,cy,cz],p);T.rot=0;
 for(const side of [-1,1])for(const zz of [-3,0,3])windowAt(T,side*2.99,3.2,zz,.68,2.05,side*Math.PI/2,church.id);
 w.box([cx,cy+1.75,cz+5.36],[1.8,3.3,.15],'#273e54');for(const side of [-1,1])w.cylinder([cx+side*.91,cy,cz+5.51],[cx+side*.91,cy+3.4,cz+5.51],.17,.17,'#b3ae87',8);
 await yieldBuild();
 // Rose window in the front gable: glass petals and solid rings.
 const rose=[];for(let i=0;i<=48;i++)rose.push([cx+Math.cos(i/48*TAU)*1.0,cy+6.55+Math.sin(i/48*TAU)*1.0,cz+5.6]);w.curve(rose,.095,'#d3c797',7);for(let i=0;i<8;i++){const a=i/8*TAU;w.sphere([cx+Math.cos(a)*.51,cy+6.55+Math.sin(a)*.51,cz+5.56],[.23,.28,.09],i%2?'#ffdb91':'#b3cccf',12,7,.85);}
 w.collider(cx-3.2,cx+3.2,cz-5.7,cz+5.9);owner();
 await yieldBuild();
 // Stone arched bridge. Its underside and each arch remain visible from the water.
 const bz=-12,bx=riverX(bz);const bridge=w.register('bridge','三孔月光桥','The three-arch bridge',[bx,3.2,bz],10,'石拱有内侧、外侧和拱底。沿岸走到桥下，能看到船从拱洞旁经过。','Solid voussoirs, side faces and soffits. The arch openings are real empty space.');
 for(let k=0;k<3;k++){
  const x=bx+(k-1)*5.8;
  for(let j=0;j<16;j++){
   const a=j/16*Math.PI+.004,b=(j+1)/16*Math.PI-.004;const pt=(r,t,z)=>[x+Math.cos(t)*r,.15+Math.sin(t)*r,z];const r=2.55,R=3.15,z0=bz-2.1,z1=bz+2.1,C=pick(['#8a8e7d','#7a827c','#9c977c','#647582']);
   w.solid.quad(pt(r,a,z0),pt(R,a,z0),pt(R,b,z0),pt(r,b,z0),C);w.solid.quad(pt(r,b,z1),pt(R,b,z1),pt(R,a,z1),pt(r,a,z1),C);
   w.solid.quad(pt(r,a,z0),pt(r,b,z0),pt(r,b,z1),pt(r,a,z1),'#4d646e');w.solid.quad(pt(R,a,z0),pt(R,a,z1),pt(R,b,z1),pt(R,b,z0),C);
   // Fill above each arch segment to the level roadway, preserving the void below.
   const xa=x+Math.cos(b)*R,xb=x+Math.cos(a)*R,ya=.15+Math.sin(b)*R,yb=.15+Math.sin(a)*R;
   for(const z of [z0,z1])w.solid.quad([xa,ya,z],[xb,yb,z],[xb,4.12,z],[xa,4.12,z],tint(C,.93));
  }
 }
 for(let i=0;i<4;i++)w.box([bx-8.7+i*5.8,.50,bz],[.72,3.15,4.5],'#667b80');
 for(let i=0;i<26;i++){const x=bx-9.6+i*.77;w.box([x,4.18,bz],[.74,.20,4.25],pick(col.stone));for(const side of [-1,1]){w.box([x,4.77,bz+side*2.14],[.68,.94,.35],'#839086');w.box([x,5.28,bz+side*2.14],[.78,.14,.46],'#bab69a');}}
 for(const side of [-1,1])for(let i=0;i<8;i++){const x=bx+side*(9.9+i*.55),yy=4.15-i*.38;w.box([x,yy-.17,bz],[.56,.32,4.25],'#91947e');}
 lamp(bx-9,bz-1.5,4.3,1.8);lamp(bx+9,bz+1.5,4.3,1.8);
 for(let i=0;i<26;i++){const x=bx-9.6+i*.77;for(const side of [-1,1]){w.box([x,4.55,bz+side*1.72],[.08,.54,.08],'#d3c59b');if(i<25)w.curve([[x,4.84,bz+side*1.72],[x+.77,4.84,bz+side*1.72]],.03,'#b5b493',5);}}
 for(let i=0;i<7;i++){const x=bx-7.0+i*2.35;w.box([x,3.95,bz],[.44,.22,4.55],pick(['#79817d','#938d76','#68777c']));}
 owner();
 await yieldBuild();
 // Timber landing / jetty, with piles below and mooring bollards.
 const dockZ=17,dockX=riverX(dockZ)-7.6;for(let i=0;i<19;i++)w.box([dockX+i*.35,-.25,dockZ],[.33,.18,3.3],pick(['#777d69','#a99c73','#596a62']));for(const x of [dockX,dockX+5.8])for(const zz of [-1.3,1.3]){w.cylinder([x,-3.6,dockZ+zz],[x,.35,dockZ+zz],.16,.15,'#4e5a54',8);w.sphere([x,.39,dockZ+zz],[.2,.1,.2],'#ac9972',8,4);}
 lamp(dockX+.7,dockZ-1.25,-.1,2.3);
 for(let i=0;i<6;i++){const x=dockX+.65+i*.92;w.cylinder([x,.08,dockZ-1.42],[x,.76,dockZ-1.42],.05,.045,'#81683f',7);w.cylinder([x,.08,dockZ+1.42],[x,.76,dockZ+1.42],.05,.045,'#81683f',7);w.curve([[x,.76,dockZ-1.42],[x,.92,dockZ-1.35],[x,.92,dockZ+1.35],[x,.76,dockZ+1.42]],.03,'#b79a68',5);}
 for(let k=0;k<3;k++)w.cylinder([dockX+1.1+k*2.1,.08,dockZ+.15],[dockX+1.1+k*2.1,.62,dockZ+.15],.10,.08,'#5f4b34',8);
 function boat(x,z,L,W,rot,sail,index){
  const y=-1.32,id=w.register('boat',sail?'有帆的小船':'桥边的木舟',sail?'A little sailboat':'The wooden rowing boat',[x,y+1.3,z],L*.9,'双层船壳、船舷、底板、横座、桨与绳索都分别建模。拖动绕到船尾，看看船舱。','A double-shell hull, gunwales, floorboards, seats, oars and rope. Orbit to inspect the stern and interior.').id;
  const T=p=>w.transform(p,[x,y,z],rot);T.rot=rot;owner(id,10+index);w.boatMasks.push({x,z,L,W,rot,index});
  const hull=(u,a,inner=false)=>{const zz=(u-.5)*L,ww=Math.pow(Math.sin(Math.PI*clamp(u,.001,.999)),.64)*W*.5;return T([Math.sin(a)*Math.max(.008,ww-(inner?.075:0)),.40-Math.cos(a)*(inner?.55:.66)+Math.pow(Math.abs(2*u-1),3)*.21,zz]);};
  for(let i=0;i<34;i++)for(let j=0;j<16;j++){const u=i/26,v=(i+1)/26,a=-Math.PI/2+j/12*Math.PI,b=-Math.PI/2+(j+1)/12*Math.PI;w.solid.quad(hull(u,a),hull(v,a),hull(v,b),hull(u,b),pick(['#3e5e73','#547586','#8a927d','#d2ae66']));w.solid.quad(hull(u,b,true),hull(v,b,true),hull(v,a,true),hull(u,a,true),'#826f4e');}
  for(const side of [-1,1]){const points=[];for(let i=0;i<=50;i++)points.push(hull(i/50,side*Math.PI/2));w.curve(points,.065,'#e2c07b',8);}
  for(let j=0;j<26;j++){const u=(j+.5)/26,ww=Math.sin(u*Math.PI)*W*.77;w.box(T([0,-.08,(u-.5)*L*.86]),[Math.max(.1,ww),.1,L*.042],j%2?'#b79a68':'#8b7953',rot);}
  for(const u of [.16,.33,.5,.68,.84])w.box(T([0,.38,(u-.5)*L]),[Math.sin(Math.PI*u)*W*.9,.11,.26],'#c6aa75',rot);
  w.box(T([0,.10,L*.46]),[.12,.78,.5],'#6b7b75',rot);w.cylinder(T([0,.42,L*.36]),T([.36,.52,L*.30]),.06,.045,'#ccb278',7);
  // Coiled rope, a little bucket, and oars with actual flat blades.
  for(let k=0;k<3;k++){const pts=[];for(let j=0;j<=32;j++){let a=j/32*TAU;pts.push(T([.20+Math.cos(a)*(.20+k*.055),.43+k*.018,L*.28+Math.sin(a)*(.20+k*.055)]));}w.curve(pts,.019,'#c6b184',5);}
  for(const side of [-1,1]){const a=T([side*.2,.5,-L*.18]),b=T([side*W*1.2,.35,L*.25]);w.cylinder(a,b,.041,.05,'#a99268',7);const dir=V.norm(V.sub(b,a)),u=V.mul(V.norm(V.cross(dir,[0,1,0])),.14),start=V.add(b,V.mul(dir,-.10)),end=V.add(b,V.mul(dir,.65));const corners=[V.add(start,u),V.sub(start,u),V.sub(end,u),V.add(end,u)];w.solid.quad(...corners,'#c4aa77');w.solid.quad(...corners.map(v=>V.add(v,[0,-.065,0])).reverse(),'#a28d67');for(let k=0;k<4;k++)w.solid.quad(corners[k],corners[(k+1)%4],V.add(corners[(k+1)%4],[0,-.065,0]),V.add(corners[k],[0,-.065,0]),'#c3a16e');}
  w.cylinder(T([W*.23,.12,-L*.25]),T([W*.23,.5,-L*.25]),.20,.24,'#70847d',12);w.cylinder(T([W*.23,.50,-L*.25]),T([W*.23,.52,-L*.25]),.22,.22,'#273a46',12);
  w.sphere(T([-W*.28,.69,L*.22]),[.10,.17,.10],'#ffe1a0',12,7,1.2);
  for(let rib=0;rib<9;rib++){const u=.10+rib*.10,span=Math.sin(Math.PI*u)*W*.66;w.box(T([0,.14,(u-.5)*L*.82]),[span,.08,.05],'#6e6147',rot);}
  w.box(T([0,.34,-L*.46]),[W*.54,.14,.34],'#7d6642',rot);
  w.cylinder(T([0,.20,-L*.56]),T([0,-.28,-L*.80]),.04,.03,'#6a5c48',7);
  for(const side of [-1,1])w.curve([T([side*W*.42,.52,L*.16]),T([side*W*.84,.26,L*.56]),T([side*W*.98,.16,L*.74])],.018,'#ceb987',4);
  if(sail){
   w.cylinder(T([0,.08,-.1]),T([0,5.25,-.1]),.055,.032,'#d4b67c',9);
   w.cylinder(T([-1.0,1.05,-.1]),T([2.0,1.05,-.1]),.045,.045,'#997c4d',7);
   for(const end of [-L*.44,L*.43])w.curve([T([0,.50,end]),T([0,5.12,-.1])],.014,'#e5cd93',4);
   owner(id,30+index);
   const pt=(u,v,sgn)=>T([sgn*u*(1-v)*2.15,1.10+v*3.9,-.1+Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*.40]);
   for(const sgn of [1,-.63])for(let r=0;r<22;r++)for(let j=0;j<16;j++){const u=j/16,v=r/22;w.solid.quad(pt(u,v,sgn),pt(u+1/16,v,sgn),pt(u+1/16,v+1/22,sgn),pt(u,v+1/22,sgn),sgn===1?(j%4?'#e1d2a4':'#c7c496'):'#859a9d');}
   for(const sgn of [1,-.63])for(let r=0;r<=7;r++){const pts=[];for(let j=0;j<=22;j++)pts.push(pt(j/22,r/8,sgn));w.curve(pts,.014,'#e9d99e',4);}for(const sgn of [1,-.63])for(let c=0;c<=4;c++){const pts=[];for(let j=0;j<=22;j++)pts.push(pt(c/4,j/22,sgn));w.curve(pts,.012,'#dfd4af',4);}
  }
  owner();boatCount++;return id;
 }
 boat(riverX(17)+.7,17,5.9,1.90,.26,true,0);boat(riverX(-2)-.9,-2,5.1,1.65,-.7,false,1);boat(riverX(-35)+.3,-35,6.2,1.9,.14,true,2);boat(riverX(41)+2,41,4.8,1.6,1.0,false,3);boat(riverX(-72)-.6,-72,5.8,1.8,.25,true,4);
 await yieldBuild();
 // Warm, physically placed glints on the water. They wave with the same mesh surface.
 owner(0,6);for(let i=0;i<340;i++){const z=range(-112,73),x=riverX(z)+range(-5.3,5.3),p=[x,-1.385,z];w.box(p,[range(.07,.24),.016,range(.22,.65)],pick(['#7d897a','#af9868','#537782','#668c98']),range(-.2,.2),range(.35,.65));}owner();
 function cypress(x,z,h,width,important=false){
  const y=terrainHeight(x,z);let id=0;if(important)id=w.register('tree','把风留住的柏树','The wind-shaped cypress',[x,y+h*.50,z],h*.54,'弯曲树干、起伏的树冠和沿体积生长的针叶簇。不是始终朝向镜头的树贴片。','A bent trunk, a lobed crown and needle clusters growing around a volume, not a billboard.').id;
  owner(id,2);const T=p=>V.add([x,y,z],p);
  w.curve([T([0,0,0]),T([.15,h*.2,.1]),T([-.1,h*.47,.25]),T([.2,h*.72,0]),T([.12,h*.96,0])],t=>width*.28*(1-t)+.06,'#354332',8);
  const lobes=important?6:3;
  for(let l=0;l<lobes;l++){
   const lh=h*(l===0?1:.63+range(0,.28)),ox=l===0?0:Math.cos(l*2.4)*width*.48,oz=l===0?0:Math.sin(l*2.4)*width*.38;
   const ring=(t,a)=>{const r=width*(l===0?.62:.30)*Math.pow(Math.sin(Math.PI*clamp(t,.001,.999)),.64)*(1-t*.4)*(1+.14*Math.sin(a*3+t*17));return T([ox+Math.sin(t*8+l)*width*.1+Math.cos(a)*r,h*.08+t*lh,oz+Math.sin(a)*r*.80]);};
   for(let j=0;j<21;j++)for(let k=0;k<12;k++){const t=j/21,tt=(j+1)/21,a=k/12*TAU,b=(k+1)/12*TAU;w.solid.quad(ring(t,a),ring(tt,a),ring(tt,b),ring(t,b),pick(['#172f35','#20393b','#2d463f','#344b3c','#405340']),0,2);}
   // Long raised brush strokes trace the actual curved surface of the foliage.
   for(let k=0;k<(important?110:24);k++){const a=range(0,TAU),t=range(.10,.90),len=range(.04,.12),pts=[];for(let j=0;j<5;j++){const p=ring(t+j/4*len,a+.09*j);p[0]+=.014;pts.push(p);}w.curve(pts,width*(important?.016:.026),pick(['#566145','#7e7847','#3f5b50','#2e4545']),4,0,2);}
  }
  if(important){owner(id,2);for(let j=0;j<180;j++){const t=range(.09,.94),a=range(0,TAU),r=width*.6*Math.pow(Math.sin(Math.PI*t),.7);const p=T([Math.cos(a)*r+Math.sin(t*8)*width*.1,h*.08+t*h,Math.sin(a)*r*.75]);w.sphere(p,[range(.13,.27),range(.38,.9),range(.16,.3)],pick(['#2c453d','#375442','#496047','#243d39','#4f5d3e']),7,5,0,2);}}
  owner();w.collider(x-width*.38,x+width*.38,z-width*.38,z+width*.38);treeCount++;
 }
 cypress(-26,15,42,4.6,true);cypress(-30,10,28,3.1,true);cypress(-34,20,21,2.2);cypress(-19,11,18,1.6);
 [[-35,-3,12],[-30,-19,10],[-19,-20,7],[-12,-6,8],[17,8,10],[15,-36,9],[-29,-64,12],[-44,-17,12],[-47,-47,15],[48,0,12],[44,24,14],[46,-25,13],[41,-50,10],[-7,-66,10],[-4,17,9]].forEach(([x,z,h])=>cypress(x,z,h,1.0+h*.033));
 for(let i=0;i<17;i++){const z=-85+i*7.5,x=i%2?-53:riverX(z)+20;cypress(x,z,range(5.5,9.5),.85);}
 await yieldBuild();
 // Foreground wildflowers, grass and stones add reasons to land and look closely.
 owner();for(let i=0;i<230;i++){const z=range(18,57),x=pathX(z)+pick([-1,1])*range(2.9,9.5),y=terrainHeight(x,z);if(i%6===0)w.rock([x,y+.10,z],[range(.13,.30),.26,range(.15,.36)],pick(col.stone));
  const ht=range(.35,.90);w.cylinder([x,y,z],[x+.06,y+ht,z-.08],.013,.01,'#557665',4);for(let j=0;j<2;j++)w.solid.tri([x,y+ht*.35,z],[x+pick([-1,1])*.27,y+ht*.68,z+.08],[x,y+ht*.72,z],'#78916d');
  if(i%2===0){const center=[x+.06,y+ht,z-.08];for(let k=0;k<7;k++){let a=k/7*TAU;w.sphere(V.add(center,[Math.cos(a)*.115,Math.sin(a)*.115,0]),[.068,.076,.035],pick(['#e4c35b','#ebd287','#94b4b6']),6,4,.12);}w.sphere(center,[.055,.055,.04],'#7e6740',7,4);}
 }
 await yieldBuild();
 // A timber lookout built beside the cypress, an explicitly imagined addition.
 const cabin=w.register('house','柏树旁的木屋','The cypress lookout',[-23.5,9.8,26],4.5,'从敞开的木屋起飞，穿过村庄，再钻过桥洞。这间木屋是为飞行创作的空间，原画中没有。','Launch through the open front, cross the village and pass under the bridge. This lookout is an imagined addition to the painting.');
 for(let i=0;i<15;i++)w.box([-26.2+i*.39,8,25.7],[.37,.22,7.4],i%2?'#ae8856':'#806746');
 for(const x of [-26.1,-20.9])for(const z of [23,29]){w.cylinder([x,terrainHeight(x,z),z],[x,11.7,z],.15,.12,'#715538',8);}
 // Side walls and back wall; no front wall or lintel across the flight aperture.
 for(let j=0;j<9;j++){for(const x of [-26.2,-20.8])w.box([x,8.3+j*.34,27.2],[.16,.31,4.2],j%2?'#8b6b48':'#9f7e52');w.box([-23.5,8.3+j*.34,29.3],[5.5,.31,.15],'#876849');}
 for(const side of [-1,1])w.solid.quad([-23.5+side*3.1,11.3,22.4],[-23.5+side*3.1,11.3,29.8],[-23.5,13.2,29.8],[-23.5,13.2,22.4],'#3e5a69');
 for(let i=0;i<8;i++)w.box([-23.5,8.15-i*.63,29.8+i*.43],[1.9,.20,.56],'#9f865e');
 for(const x of [-25.4,-21.6]){w.box([x,10.25,23.2],[.28,.52,.28],'#ffcc7a',0,1.5);w.lamps.unshift([x,10.2,23.2,.65]);for(const side of [-1,1]){w.box([x+side*.17,10.25,23.2],[.035,.60,.34],'#3c443f');w.box([x,10.25+side*.3,23.2],[.36,.045,.36],'#3c443f');}}
 w.cabin=cabin.id;w.lampGlow=1;owner();
 // Quiet street lamps, a village well and a roof lookout bench.
 [[-17,22],[-14,5],[-7,-9],[-7,-34],[8,-5],[9,-25],[-11,39],[47,-8],[43,15]].forEach(([x,z])=>lamp(x,z));
 const wy=terrainHeight(2,-5);for(let i=0;i<18;i++){const a=i/18*TAU;w.rock([2+Math.cos(a)*.72,wy+.52,-5+Math.sin(a)*.72],[.20,.82,.20],pick(col.stone),a);}w.cylinder([1.12,wy,-5],[1.12,wy+2.5,-5],.06,.06,'#7a7965',7);w.cylinder([2.88,wy,-5],[2.88,wy+2.5,-5],.06,.06,'#7a7965',7);w.cylinder([1,wy+2.45,-5],[3,wy+2.45,-5],.07,.07,'#b59e6a',7);
 await yieldBuild();
 // The distant dark dome is only a background. Paint occupies a deep cloud volume.
 w.active=w.sky;w.sphere([0,28,-150],[300,245,300],'#0d204a',48,24,0);w.active=w.solid;owner();
 const skyField=w.register('swirl','流动的星穹','Flowing sky dome',[4,54,-116],88,'长短交错的笔触沿着弯曲的云带流动，星光在它们之间显现。靠近时可以看到笔触的厚度；这部分空间是原画之外的创作延伸。','Overlapping daubs follow the curved cloud bands, with starlight between them. Up close, each stroke has depth; this space is an imagined extension of the painting.');owner(skyField.id,41);
 const dome={cx:6,cy:61,cz:-178,rx:182,ry:106,depth:56};
 const domePoint=(x,y,offset=0)=>{const nx=(x-dome.cx)/dome.rx,ny=(y-dome.cy)/dome.ry;const q=Math.max(0.,1-nx*nx-ny*ny);return [x,y,dome.cz+Math.sqrt(q)*dome.depth+offset];};
 // Short, flattened, irregular daubs carry the paint. Every daub has a front,
 // back and edge, so flying behind the sky still reveals actual volume.
 // Reserve a real gap through the paint volume. Daubs that would intersect
 // the authored flight are omitted when building geometry, not faded on camera.
 const skyPassage=Array.from({length:145},(_,i)=>sampleFlight(9+i/15).p);
 const passageIntersects=(a,b)=>{
   const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
   const length2=Math.max(dx*dx+dy*dy+dz*dz,.0001);
   return skyPassage.some(p=>{
     const u=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy+(p[2]-a[2])*dz)/length2,0,1);
     const x=p[0]-a[0]-dx*u,y=p[1]-a[1]-dy*u,z=p[2]-a[2]-dz*u;
     return x*x+y*y+z*z<3.2*3.2;
   });
 };
 function ribbonLine(points,radius,color,em=0.42,anim=41,sides=6){
   const batch=w.active;
   // Stagger daub boundaries between neighbouring lanes instead of cutting
   // every ribbon at the same samples, which produced radial gear-like seams.
   for(let start=0;start<points.length-1;){
     const end=Math.min(start+(points.length>12?Math.floor(range(3,9)):points.length-1),points.length-1);
     const variation=range(.88,1.12),thickness=range(.09,.22);
     for(let j=start;j<end;j++){
       const a=points[j],b=points[j+1];
       if(passageIntersects(a,b))continue;
       const d=V.sub(b,a),length=Math.hypot(d[0],d[1])||1;
       const side=[-d[1]/length,d[0]/length,0];
       const radiusAt=k=>(typeof radius==='function'?radius(k/(points.length-1)):radius)*2.4*variation;
       const wa=radiusAt(j)*(j===start?.45:1),wb=radiusAt(j+1)*(j+1===end?.35:1);
       const A=V.add(a,V.mul(side,wa)),B=V.sub(a,V.mul(side,wa)),C=V.sub(b,V.mul(side,wb)),D=V.add(b,V.mul(side,wb));
       const f=q=>V.add(q,[0,0,thickness]),back=q=>V.add(q,[0,0,-thickness]);
       const col=tint(color,variation);
       batch.quad(f(A),f(B),f(C),f(D),col,em,anim);
       batch.quad(back(D),back(C),back(B),back(A),tint(col,.78),em*.7,anim);
       batch.quad(f(A),f(D),back(D),back(A),tint(col,.82),em*.7,anim);
       batch.quad(f(B),back(B),back(C),f(C),tint(col,.76),em*.7,anim);
     }
     skyRibbons++;
     start=end+1;
   }
 }
 async function flowingArc(x0,y0,x1,y1,bend,lanes,spread,colors,anim=41){
   for(let lane=0;lane<lanes;lane++){await yieldBuild();
     const pts=[],shift=(lane-(lanes-1)/2)*spread;
     for(let j=0;j<=72;j++){
       const t=j/72;const x=x0+(x1-x0)*t;const baseY=y0+(y1-y0)*t;
       const y=baseY+Math.sin(t*Math.PI)*bend+Math.sin(t*TAU*1.4+lane*.47)*1.7+shift;
       pts.push(domePoint(x,y,Math.sin(t*Math.PI*2+lane*.3)*12+(lane%3-1)*9));
     }
     const col=colors[lane%colors.length];
     ribbonLine(pts,u=>(.22+.16*(1-Math.abs(u-.5)*2))*(.76+.26*Math.sin(u*Math.PI)),tint(col,range(.92,1.11)),lane%3===0?0.66:0.34,anim,6);
   }
 }
 async function paintedCurrent(knots,lanes,spread,colors){
   const curve=t=>{
     const at=Math.min(t,1)*(knots.length-1),i=Math.min(Math.floor(at),knots.length-2),u=at-i;
     const p0=knots[Math.max(0,i-1)],p1=knots[i],p2=knots[i+1],p3=knots[Math.min(knots.length-1,i+2)];
     return [0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));
   };
   for(let lane=0;lane<lanes;lane++){
     await yieldBuild();
     const shift=(lane-(lanes-1)/2)*spread,phase=range(0,TAU),base=pick(colors);
     // Independent short marks follow an open, asymmetric S-shaped current.
     // No concentric tube, closed ring or repeated lane endpoint is generated.
     for(let t=range(0,.012);t<.99;){
       const span=range(.010,.024),end=Math.min(1,t+span),pts=[];
       for(let j=0;j<=5;j++){
         const u=t+(end-t)*j/5,p=curve(u),a=curve(Math.max(0,u-.001)),b=curve(Math.min(1,u+.001));
         const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
         const offset=shift*(.72+.25*Math.sin(u*Math.PI))+.38*Math.sin(u*31+phase);
         pts.push(domePoint(p[0]-dy/len*offset,p[1]+dx/len*offset,8+Math.sin(u*9+phase*.15)*18+(lane%5-2)*7));
       }
       ribbonLine(pts,range(.085,.17),tint(base,range(.87,1.12)),.42,42);
       t=end+range(.0005,.005);
     }
   }
 }
 function shortStroke(x,y,length,angle,color,anim=41){
   const depth=range(-78,40),tilt=range(-1.5,1.5);const pts=[];for(let k=0;k<4;k++){const t=k/3,xx=x+Math.cos(angle)*length*t,yy=y+Math.sin(angle)*length*t;pts.push(domePoint(xx,yy,depth+Math.sin(t*Math.PI)*.6+t*tilt));}
   ribbonLine(pts,t=>range(.08,.20)*(.85+.18*Math.sin(t*Math.PI)),color,.26,anim,5);
 }
 await yieldBuild();
 // The reference's cloud is an open wave that folds back on itself, not a
 // radial vortex. Its uneven S silhouette carries the lighter brushwork.
 const cloudColors=['#31568a','#426e9f','#537ba4','#7396ae','#92acae','#b3bdb1','#c8c9ad','#809fac'];
 await paintedCurrent([[-118,64],[-85,54],[-59,62],[-36,76],[-15,80],[5,73],[14,62],[13,54],[5,53],[-3,59],[-9,66],[-16,64],[-21,53],[-13,44],[7,40],[30,43],[45,50]],29,.47,cloudColors);
 await paintedCurrent([[12,37],[29,39],[45,44],[55,40],[56,34],[50,31],[43,34],[45,38],[57,38],[76,46],[98,52],[118,57]],17,.43,cloudColors);
 await paintedCurrent([[-119,28],[-91,24],[-58,30],[-34,37],[-8,31],[19,27],[51,30],[77,37],[106,48]],14,.42,['#456c96','#688baa','#8ba4b1','#bac3ac','#648b9e']);
 await flowingArc(-76,101,49,87,-5,4,.9,['#244976','#456c98','#6f90aa','#42688e'],41);
 await yieldBuild();
 // Sample the original pigment pattern for the crescent and individual stars.
 // Their relief is an artistic extension; the source and colour sampling are
 // recorded beside the already bundled public-domain reproduction.
 const pigment=await readPaintingPigments(document);
 const moonCenter=domePoint(86,81,-25);
 const moon=w.register('moon','月光与笔触','Moonlight and paint',moonCenter,19,'弯月的金黄轮廓、浅色内部和周围笔触取色自原画，弯曲的体积是空间延伸。','The golden crescent, pale interior and surrounding strokes take their colours from the original painting. The curved volume is an imagined extension.');
 owner(moon.id,13);
 buildPaintedLight(w.solid,domePoint,pigment,{source:[874,132,88],x:86,y:81,radius:18.7,moon:true,depth:-25});
 const stars=[
   {source:[99,35,47],x:-94,y:101,radius:7.2},
   {source:[224,27,28],x:-64,y:103,radius:4.3},
   {source:[323,26,44],x:-39,y:103,radius:6.5},
   {source:[397,52,40],x:-20,y:98,radius:5.9},
   {source:[585,68,57],x:25,y:92,radius:8.8},
   {source:[679,178,41],x:48,y:70,radius:6.3},
   {source:[224,130,43],x:-64,y:79,radius:6.7},
   {source:[43,353,31],x:-106,y:49,radius:4.5},
   {source:[118,367,43],x:-86,y:46,radius:6.2},
   {source:[335,379,58],x:-38,y:42,radius:9.0},
   {source:[311,255,28],x:-44,y:63,radius:4.1},
 ];
 for(let i=0;i<stars.length;i++){
   const star={...stars[i],depth:[-8,-34,15,-22,-46,-9,21,-30,10,26,-16][i]},c=domePoint(star.x,star.y,star.depth);
   const id=w.register('star','星光的笔触 '+(i+1),'Painted starlight '+(i+1),c,star.radius,'黄白色星光与蓝绿色光晕取色自原画；每一颗保留不同的轮廓与笔触。厚度是创作延伸。','The yellow-white starlight and blue-green halos use colours sampled from the original. Each retains its own contour and strokes; the depth is an artistic extension.').id;
   owner(id,13);buildPaintedLight(w.solid,domePoint,pigment,star);await yieldBuild();
 }
 owner(skyField.id,41);
 await yieldBuild();
 // Staggered depth prevents a visible painted curtain when entering the sky.
 owner(skyField.id,41);
 for(let i=0;i<18000;i++){if(i%64===0)await yieldBuild();
   const x=range(-270,270),y=range(-12,220);
   // Let distant marks fade into the dome instead of exposing the rectangular
   // sampling boundary as a floating painted panel behind the village.
   const edge=Math.max(Math.abs(x-6)/276,Math.abs(y-81)/139);
   if(rand()>Math.min(1,(1-edge)*3))continue;
   let angle=.16+Math.sin(x*.028+y*.017)*.22;
   const d1=Math.hypot(x+6,y-58),d2=Math.hypot(x-36,y-44),m1=Math.exp(-(d1*d1)/1850),m2=Math.exp(-(d2*d2)/820);
   angle=(1-m1-m2)*angle+m1*(Math.atan2(y-58,x+6)+Math.PI*.5)+m2*(Math.atan2(y-44,x-36)+Math.PI*.5);
   shortStroke(x,y,range(1.1,3.5),angle,pick(['#243b6a','#294b80','#31598d','#355f97','#4670a3','#6083ad','#84a0b4']),41);
 }
 await yieldBuild();
 // A few larger calligraphic ribbons near the horizon and at the top corners.
 for(let i=0;i<10;i++){
   const y=range(18,28)+i*.48;await flowingArc(-118,y,118,y+range(-3,4),range(-3,5),1,0,['#2d5788','#4772a0','#86a7b2','#607e9b'],41);
 }
 await yieldBuild();
 // Extra calligraphic ribbons wrap the right side near the moon.
 for(let i=0;i<4;i++){await flowingArc(46,82-i*4,102,64-i*2,-6,2,.8,['#658b9f','#8baeb8','#456c93'],41);}
 await yieldBuild();
 // Tiny distant stars remain 3D, not sprites.
 for(let i=0;i<210;i++){const x=range(-180,180),y=range(26,114),p=domePoint(x,y,-10-range(0,18)),r=range(.08,.25);w.sphere(p,[r,r,r],pick(['#b9cfce','#e5d797','#749dac']),6,4,.86,13);}owner();
 w.stats={houses:houses.length+12+8,boats:boatCount,cypresses:treeCount,pavingStones:paving,roofTiles,windows,skyRibbons,majorObjects:w.objects.length,pictureTextures:0};
 w.home={p:[0,27,94],t:[2,44,-118]};
 w.bridge={x:bx,z:bz};w.dock={x:dockX,z:dockZ};w.floor=terrainHeight;
 w.walkHeight=(x,z)=>{if(Math.abs(z-bz)<2.15&&Math.abs(x-bx)<14.3)return Math.max(terrainHeight(x,z),4.31-Math.max(0,Math.abs(x-bx)-9.8)*.70);if(x>=dockX-.3&&x<=dockX+6.8&&Math.abs(z-dockZ)<1.65)return -.08;return terrainHeight(x,z);};
 w.waterBlocked=(x,z)=>Math.abs(x-riverX(z))<8.0&&!(Math.abs(z-bz)<2.0&&Math.abs(x-bx)<14.3)&&!(x>=dockX-.3&&x<=dockX+6.8&&Math.abs(z-dockZ)<1.5);
 return w;
}

/* Procedural score reused from the Painting to World café foundation.
   Web Audio partial synthesis and generated reverb; no recorded samples. */
class NightMusic{
 constructor(){this.context=null;this.on=false;this.volume=.43;this.timer=null;this.step=0;this.next=0;this.scheduled=0;}
 init(){if(this.context)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AUDIO_UNAVAILABLE');const c=this.context=new AC();this.master=c.createGain();this.master.gain.value=0;const compressor=c.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=14;compressor.ratio.value=3;this.master.connect(compressor);compressor.connect(c.destination);
  const rev=c.createConvolver(),buf=c.createBuffer(2,Math.floor(c.sampleRate*2.8),c.sampleRate),r=RNG(1927);for(let ch=0;ch<2;ch++){let d=buf.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(r()*2-1)*Math.pow(1-i/d.length,3.4)*.4;}rev.buffer=buf;const wet=c.createGain();wet.gain.value=.27;rev.connect(wet);wet.connect(this.master);this.reverb=rev;
  this.chords=[[41,48,57,60,64,67],[45,52,55,60,64,69],[38,45,53,57,60,64],[46,53,57,60,65,69],[43,50,57,62,65,69],[48,55,58,62,64,67],[41,48,55,57,60,64],[48,55,57,62,65,67]];
  this.melody=[72,0,69,67,0,64, 67,0,72,76,74,0, 69,0,65,64,0,62, 65,0,69,72,0,74, 77,0,74,72,0,69, 67,0,64,62,64,0, 65,0,69,72,0,67, 64,0,62,60,0,0];}
 note(midi,time,duration=.9,gain=.13,pan=0){const c=this.context;let hz=440*Math.pow(2,(midi-69)/12),env=c.createGain(),filter=c.createBiquadFilter(),stereo=c.createStereoPanner();stereo.pan.value=pan;filter.type='lowpass';filter.frequency.setValueAtTime(3800,time);filter.frequency.exponentialRampToValueAtTime(1000,time+duration);env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+.009);env.gain.exponentialRampToValueAtTime(.001,time+duration+1.6);env.connect(filter);filter.connect(stereo);stereo.connect(this.master);stereo.connect(this.reverb);
  [1,2,3.001,4.01].forEach((f,i)=>{let o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz*f;g.gain.value=[.77,.14,.047,.023][i];o.connect(g);g.connect(env);o.start(time);o.stop(time+duration+1.65);});this.scheduled++;setTimeout(()=>{env.disconnect();filter.disconnect();stereo.disconnect()},(time-c.currentTime+duration+1.8)*1000);}
 schedule(){if(!this.on)return;const beat=60/84,half=beat/2,c=this.context;while(this.next<c.currentTime+.22){let s=this.step,bar=Math.floor(s/6),part=s%6,chord=this.chords[Math.floor(bar/2)%8];if(part===0)this.note(chord[0],this.next,1.1,.15,-.22);if(part===2||part===4){this.note(chord[2],this.next,.55,.061,-.12);this.note(chord[3],this.next+.021,.60,.048,.07);this.note(chord[4],this.next+.039,.70,.043,.16);}let mel=this.melody[s%this.melody.length];if(mel)this.note(mel,this.next+.016,part===0?1.1:.72,.09,.23);this.step++;this.next+=half;}}
 async set(on){this.init();clearInterval(this.timer);this.timer=null;this.on=on;const c=this.context;if(on){await c.resume();if(!this.on||c.state==='closed')return;this.next=c.currentTime+.08;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(this.volume,c.currentTime,.3);this.schedule();this.timer=setInterval(()=>this.schedule(),90);}else{this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(0,c.currentTime,.15);}}
 setVolume(value){this.volume=clamp(value,0,1)*.65;if(this.context&&this.on)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.1);}
}

/* Bilingual exploration, cinematic camera, object orbiting, collision and diagnostics. */
(()=>{
'use strict';
const S={zh:{
 freeName:'自由飞行',moveHintTouch:'左手摇杆飞行 · 右手拖动看向',brand:'入画 · 星月夜',reference:'原作对照',portalCaption:'梵高《星月夜》原作 · 三维场景加入可探索的空间',referenceTitle:'《星月夜》原作对照',referenceDesc:'左侧柏树、中央旋涡与右侧月亮来自梵高的画面。三维场景保留这些视觉线索，并为漫游加入画中没有的街道、河湾与可进入的天空。',soundOff:'声音：关',soundOn:'声音：开',wire:'线框',models:'模型',settings:'设置',eyebrow:'从原作画面，走进空间',title:'飞进《星月夜》。',heroDesc:'从柏树旁起飞，穿过街巷与桥洞，<br>一直飞进有厚度的星空。',enter:'开始飞行 <span>↗</span>',free:'直接探索',heroHint:'24 秒航线 · 随时接管 · 木屋与河道为想象延伸',interpretation:'由画作启发的三维夜晚 · 街道与河湾为创作延伸',takeover:'我来飞',moveHint:'拖动看向 · WASD 飞行 · Q/E 升降 · 松手悬停',postcard:'留张明信片',hide:'沉浸',home:'回到起点',orbit:'绕它看看 ↻',light:'点亮 / 熄灯',inspectHint:'拖动改变观察角度 · 滚轮靠近',restore:'显示界面 · H',catalogEyebrow:'看看这个世界如何被搭起来',catalogTitle:'每一件，都有另一面。',catalogDesc:'选择一个物体，近距离环绕观察。<br>“线框”会显示实际三角形网格，而不是参考图轮廓。',settingsTitle:'把夜晚调到舒服的样子。',quality:'画面精度',qualityHigh:'精细',qualityNormal:'标准',qualityLow:'流畅',motion:'减少动态效果',shadows:'投影',volume:'配乐音量',controls:'操作',controlsDesc:'拖动环顾；WASD / 方向键移动；F 切换步行与飞行；Q/E 升降；Shift 加速；G 线框；P 保存明信片；R 返回全景。<br><br>手机：左侧摇杆移动，拖动画面环顾，右侧按钮升降。飞行允许穿过几何；步行会避开建筑与河道。',replay:'重走一次夜晚',about:'关于这一版',aboutTitle:'从画中的夜晚，走进空间。',aboutDesc:'柏树、村庄和地形由三维几何构成；星空由带厚度的云带与笔触构成，并缓慢流动；星星与月亮从原画取色，保留光晕和月牙的笔意。你可以走近这些形体，从画面无法呈现的角度观察它们。街道、河湾与可进入的天空是创作延伸，并非原作的精确复原。',source:'原作：文森特·梵高《星月夜》，1889 年，纽约现代艺术博物馆。画作图像来自 Wikimedia Commons，Public Domain Mark 1.0。',walk:'步行 · F',fly:'飞行 · F',loading:'正在搭建这个夜晚',loadDetail:'房屋 · 船只 · 山谷 · 星河',error:'三维场景暂时无法启动',errorDetail:'此作品需要 WebGL2。请在支持 WebGL2 的浏览器中打开，并检查硬件加速设置。',saved:'已保存这张明信片。',saveError:'图片导出失败，请稍后再试。',audioError:'声音暂时无法开启，请再次点击。',freeToast:'现在，夜晚由你接手。',wireOn:'正在查看真实三角形网格。',wireOff:'回到夜色。',end:'航线结束。试着熄灭灯火，再点亮村庄。',boundary:'已到达这个想象世界的边缘。',all:'全部',types:{house:'房屋',boat:'船只',church:'钟楼',bridge:'石桥',tree:'柏树',star:'星光',moon:'月亮',swirl:'星河'},modelCaption:'独立几何物体',stats:(w)=>`${w.houses} 栋房屋 · ${w.boats} 艘船 · ${w.cypresses} 棵柏树<br>${w.skyRibbons} 根星河曲线 · ${w.roofTiles.toLocaleString()} 片屋瓦<br>${Math.round(w.triangles).toLocaleString()} 个三角形 · 星月取色于原画`,placeNames:['星夜全景','柏树与山谷','村庄与教堂','河湾与月光','靠近旋涡','飞入笔触'],placeDescs:['点亮村庄，或继续飞进星空。','巨大的前景柏树重新成为第一个视觉锚点。','看村庄灯火、尖塔和坡地房屋。','顺着河面高光，走向画框之外。','中央大旋涡和右侧小旋涡会更近。','这些有厚度的笔触，也有另一面。'],tour:['从柏树旁的木屋起飞。','屋檐从两旁掠过。','贴近水面，穿过桥洞。','沿河加速，飞入星空。','从笔触之间，飞到画的另一面。','回望村庄。现在换你来飞。'],tourTags:['FROM THE PAINTING','THE CYPRESS EDGE','THE VILLAGE BELOW','MOONLIT WATER','TOWARD THE SWIRL','INSIDE THE PAINTED CURRENT'],contextLost:'三维上下文已中断，请重新加载页面。',hiddenHint:'右下角或 H 键可恢复界面。'
},en:{
 freeName:'Free flight',moveHintTouch:'Left stick to fly · drag to look',brand:'Inside The Starry Night',reference:'Original painting',portalCaption:'Van Gogh, The Starry Night · an imagined space beyond the frame',referenceTitle:'Compare with the original painting',referenceDesc:'The cypress, central swirl and moon come from Van Gogh’s painting. The 3D world preserves these visual anchors and invents streets, a river bend and an enterable sky for exploration.',soundOff:'Sound: off',soundOn:'Sound: on',wire:'Wireframe',models:'Models',settings:'Settings',eyebrow:'ENTER THROUGH THE PAINTING',title:'Fly into The Starry Night.',heroDesc:'Leave the cypress lookout. Skim the lanes and river,<br>then climb into the painted sky.',enter:'Begin flight <span>↗</span>',free:'Explore directly',heroHint:'24-second flight · take over anytime · an imagined extension',interpretation:'A 3D night inspired by the painting · the streets and river are imagined',takeover:'Take the controls',moveHint:'Drag to look · WASD to fly · Q/E down / up · release to hover',postcard:'Save a postcard',hide:'Immerse',home:'Return home',orbit:'Orbit this object ↻',light:'Lights on / off',inspectHint:'Drag to change the angle · Scroll to approach',restore:'Show interface · H',catalogEyebrow:'EXPLORE HOW THIS WORLD IS MADE',catalogTitle:'Everything has another side.',catalogDesc:'Choose a model and orbit it up close.<br>Wireframe reveals real triangles, not outlines drawn on an image.',settingsTitle:'Make the night your own.',quality:'Resolution',qualityHigh:'Fine',qualityNormal:'Standard',qualityLow:'Performance',motion:'Reduce motion',shadows:'Cast shadows',volume:'Music volume',controls:'Controls',controlsDesc:'Drag to look; WASD / arrow keys to move; F to switch walk / fly; Q/E to descend / rise; Shift to speed up; G for wireframe; P for a postcard; R for the panorama.<br><br>On touch screens: left joystick to move, drag to look, right buttons to change height. Flight permits passing through geometry; walking avoids buildings and water.',replay:'Take the journey again',about:'About this version',aboutTitle:'Step inside a painted night.',aboutDesc:'The cypresses, village and terrain are modeled as three-dimensional geometry. Volumetric brushstrokes and cloud bands form a slowly moving sky. Stars and the moon sample the original painting’s pigments, preserving its halos and crescent. Explore these forms from viewpoints the painting cannot show. The streets, river bend and enterable sky are imagined additions, not an exact reconstruction.',source:'Original painting: Vincent van Gogh, The Starry Night, 1889, Museum of Modern Art. Image via Wikimedia Commons, Public Domain Mark 1.0.',walk:'Walk · F',fly:'Fly · F',loading:'Building this little night',loadDetail:'HOUSES · BOATS · VALLEY · STARS',error:'The 3D world could not start',errorDetail:'This work requires WebGL2. Open it in a WebGL2-capable browser and check hardware acceleration.',saved:'Your postcard is saved.',saveError:'Image export failed. Please try again.',audioError:'Sound could not start. Please tap again.',freeToast:'The night is yours now.',wireOn:'Viewing the actual triangle meshes.',wireOff:'Back to the painted night.',end:'Flight complete. Turn the lights off, then bring the village back to life.',boundary:'You have reached the edge of this imagined world.',all:'All',types:{house:'Houses',boat:'Boats',church:'Bell tower',bridge:'Bridge',tree:'Cypress',star:'Stars',moon:'Moon',swirl:'Sky currents'},modelCaption:'INDEPENDENT GEOMETRIC OBJECT',stats:(w)=>`${w.houses} houses · ${w.boats} boats · ${w.cypresses} cypresses<br>${w.skyRibbons} sky curves · ${w.roofTiles.toLocaleString()} roof tiles<br>${Math.round(w.triangles).toLocaleString()} triangles · Stars and moon sampled from the painting`,placeNames:['The painted night','Cypress and valley','Village and steeple','Moonlit river bend','Near the swirl','Inside the brushwork'],placeDescs:['Light the village or fly back into the sky.','The larger foreground cypresses become the first anchor again.','Look across the village lights, steeple and hillside roofs.','Follow the river highlight toward the frame edge.','Approach the main swirl and the smaller right-hand spiral.','These thick brush ribbons still have backs and depth.'],tour:['Lift off from the cypress lookout.','Slip between the village rooftops.','Skim the water. Through the arch.','Follow the river into the painted sky.','Fly between the strokes, beyond the painted surface.','The village opens below. Your turn to fly.'],tourTags:['FROM THE PAINTING','THE CYPRESS EDGE','THE VILLAGE BELOW','MOONLIT WATER','TOWARD THE SWIRL','INSIDE THE PAINTED CURRENT'],contextLost:'The graphics context was lost. Please reload this page.',hiddenHint:'Use the bottom-right button or H to restore the interface.'
}};
let lang=document.documentElement.lang==='en'?'en':'zh',ready=false,world,renderer,music,frameToken=0,last=0,elapsed=0,manualTime=null;
const $=id=>document.getElementById(id),canvas=$('scene');
const siteShell=canvas.getRootNode().host?.closest('.experience-page');
const shellPanelOpen=()=>siteShell?.getAttribute('data-panel-open')==='true';
const state={mode:'landing',fly:true,eye:[14.8,18.5,59],yaw:0,pitch:0,goalYaw:0,goalPitch:0,keys:new Set(),joy:[0,0],vertical:0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:false,selected:0,place:-1,tourTime:0,transition:null,orbit:null,pointer:null,tab:'house',paused:false,tourPaused:false,lightsOn:true,lightWave:null,velocity:[0,0,0]};
const lookTarget=()=>V.add(state.eye,[Math.sin(state.yaw)*Math.cos(state.pitch),Math.sin(state.pitch),-Math.cos(state.yaw)*Math.cos(state.pitch)]);
function orient(p,t){state.eye=p.slice();const v=V.norm(V.sub(t,p));state.yaw=state.goalYaw=Math.atan2(v[0],-v[2]);state.pitch=state.goalPitch=Math.asin(clamp(v[1],-1,1));}
const presets=()=>[
 {p:world.home.p,t:world.home.t,fly:true},
 {p:[-17.5,12.4,28],t:[-21,20,-18],fly:true},
 {p:[4.5,9.2,12],t:[-1.0,4.6,-24],fly:false},
 {p:[18,15.5,-8],t:[18,21,-55],fly:true},
 {p:[9,34,-47],t:[-5,50,-88],fly:true},
 {p:[24,41,-56],t:[22,38,-84],fly:true}
];
const TOUR=FLIGHT;
const sampleTour=(seconds,reducedMotion=false)=>sampleFlight(seconds,reducedMotion,canvas.clientWidth/Math.max(1,canvas.clientHeight));
function emitState(){document.body.dispatchEvent(new CustomEvent('flight-state',{bubbles:true,composed:true,detail:{ready,mode:state.mode,fly:state.fly,lights:state.lightsOn,sound:music?.on??false}}));}
function updateFlightUI(){const pose=sampleTour(state.tourTime,state.reduced),s=S[lang];$('chapter').textContent=`0${pose.chapter+1} / 06`; $('chapterText').textContent=s.tour[pose.chapter];$('flightSeek').value=String(state.tourTime);$('flightSeek').setAttribute('aria-label',lang==='zh'?'飞行进度':'Flight progress');$('pauseFlight').textContent=state.tourPaused?'▶':'Ⅱ';$('pauseFlight').setAttribute('aria-label',lang==='zh'?(state.tourPaused?'继续飞行':'暂停飞行'):(state.tourPaused?'Resume flight':'Pause flight'));$('flightClock').textContent=`${Math.floor(state.tourTime)} / ${FLIGHT_DURATION}s`;}
function toggleVillageLights(){state.lightsOn=!state.lightsOn;state.lightWave={time:0,from:Array.from(world.energy),to:state.lightsOn?1:0,origin:state.eye.slice()};emitState();}
function updateLights(dt){const wave=state.lightWave;if(!wave)return;wave.time+=dt;for(const o of world.objects){if(o.type!=='house')continue;const delay=Math.hypot(o.center[0]-wave.origin[0],o.center[2]-wave.origin[2])/38;const u=ease(clamp((wave.time-delay)/.7,0,1));world.energy[o.id]=wave.from[o.id]+(wave.to-wave.from[o.id])*u;}world.lampGlow+=(wave.to-world.lampGlow)*(1-Math.exp(-dt*2));if(wave.time>9)state.lightWave=null;}
let toastTimer;
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function refresh(){const s=S[lang];document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title=lang==='zh'?'星河之下 · 入画':'Under the Painted Stars';for(const e of document.querySelectorAll('[data-i18n]'))if(s[e.dataset.i18n])e.innerHTML=s[e.dataset.i18n];$('bootText').textContent=s.loading;$('bootDetail').textContent=s.loadDetail;$('reducedMotion').checked=state.reduced;canvas.setAttribute('aria-label',lang==='zh'?'星月夜飞行场景':'The Starry Night flight scene');
 updatePlace();if(ready){$('stats').innerHTML=s.stats(world.stats);fillModels();if(state.selected)showInspector(state.selected);}updateMode();updateFlightUI();for(const e of document.querySelectorAll('[data-close],#inspectorClose'))e.setAttribute('aria-label',lang==='zh'?'关闭':'Close');$('joystick').setAttribute('aria-label',lang==='zh'?'移动摇杆':'Movement joystick');$('upBtn').setAttribute('aria-label',lang==='zh'?'上升':'Ascend');$('downBtn').setAttribute('aria-label',lang==='zh'?'下降':'Descend');}
function updatePlace(){const s=S[lang];$('placeNumber').hidden=state.place<0;if(state.place<0){$('placeTitle').textContent=s.freeName;$('placeDescription').textContent='';return;}$('placeTitle').textContent=s.placeNames[state.place];$('placeDescription').textContent=s.placeDescs[state.place];$('placeNumber').textContent=`0${state.place+1} / 06`;}
function updateMode(){const home=state.mode==='landing',tour=state.mode==='tour';$('hero').hidden=!home;$('roamUI').hidden=home||tour;document.body.classList.toggle('touring',tour);document.body.classList.toggle('exploring',!home&&!tour);document.body.classList.toggle('flying',state.fly);emitState();}
function takeOver(announce=false){if(!ready)return;const previous=state.mode;if(previous==='free')return;state.mode='free';state.place=-1;updatePlace();canvas.focus({preventScroll:true});state.transition=null;state.orbit=null;state.velocity=[0,0,0];state.tourPaused=false;updateMode();if(announce&&previous==='tour')notify(S[lang].freeToast);}
function clearInputs(){state.keys.clear();state.joy=[0,0];state.vertical=0;state.pointer=null;$('stick').style.transform='';}
function startTour(){if(!ready)return;last=performance.now();closeDialogs();clearInputs();state.mode=state.reduced?'free':'tour';state.fly=true;state.tourTime=0;state.tourPaused=false;state.place=-1;updatePlace();state.selected=0;renderer.selected=0;$('inspector').hidden=true;state.transition=null;state.orbit=null;state.velocity=[0,0,0];orient(TOUR[0].p,TOUR[0].t);canvas.focus({preventScroll:true});renderer.bank=0;renderer.fov=62;updateMode();updateFlightUI();}
function travel(p,t,endFly=true,onDone=null){last=performance.now();takeOver();const a=state.eye.slice(),startTarget=lookTarget(),distance=Math.hypot(...V.sub(p,a));state.mode='travel';state.fly=true;state.velocity=[0,0,0];state.transition={time:0,duration:state.reduced?.001:Math.min(3.2,1.2+distance*.018),a,b:p.slice(),ta:V.add(a,V.mul(V.norm(V.sub(startTarget,a)),20)),tb:t.slice(),apex:Math.min(20,distance*.13),endFly,onDone};updateMode();}
function jump(i,immediate=false){if(!ready||!Number.isInteger(i)||i<0||i>5)return;state.selected=0;renderer.selected=0;$('inspector').hidden=true;const p=presets()[i];if(immediate){takeOver();orient(p.p,p.t);state.fly=p.fly;updateMode();}else travel(p.p,p.t,p.fly);state.place=i;updatePlace();}
function showInspector(id){const o=world.objects.find(o=>o.id===id);if(!o)return;state.selected=id;renderer.selected=id;$('inspector').hidden=false;$('objectType').textContent=`${S[lang].types[o.type]} / ${String(o.id).padStart(2,'0')}`;$('objectTitle').textContent=lang==='zh'?o.zh:o.en;$('objectDescription').textContent=lang==='zh'?o.description:o.descriptionEN;$('lightBtn').hidden=o.type!=='house';}
function beginOrbit(id){const o=world.objects.find(o=>o.id===id);if(!o)return;closeDialogs();showInspector(id);const radius=Math.max(4.5,o.radius*1.8),angle=Math.atan2(state.eye[0]-o.center[0],state.eye[2]-o.center[2]),phi=o.type==='boat'?.28:.15;
 const orbit={id,center:o.center.slice(),radius,angle,phi,auto:!state.reduced};const eye=[o.center[0]+Math.sin(angle)*Math.cos(phi)*radius,o.center[1]+Math.sin(phi)*radius,o.center[2]+Math.cos(angle)*Math.cos(phi)*radius];
 travel(eye,o.center,true,()=>{state.mode='orbit';state.orbit=orbit;updateMode();});showInspector(id);
}
function fillModels(){if(!ready)return;const s=S[lang],types=['house','boat','church','bridge','tree','star','moon','swirl'];$('modelTabs').innerHTML='';for(const type of types){const b=document.createElement('button');b.textContent=s.types[type];b.className=state.tab===type?'active':'';b.onclick=()=>{state.tab=type;fillModels();};$('modelTabs').appendChild(b);}$('modelList').innerHTML='';for(const o of world.objects.filter(o=>o.type===state.tab)){const b=document.createElement('button');b.textContent=lang==='zh'?o.zh:o.en;const small=document.createElement('small');small.textContent=`#${String(o.id).padStart(2,'0')} · ${s.modelCaption}`;b.appendChild(small);b.onclick=()=>beginOrbit(o.id);$('modelList').appendChild(b);}}
function closeDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function setWire(value=!renderer.wire){if(!ready)return;renderer.wire=value;notify(S[lang][value?'wireOn':'wireOff']);}
function toggleFly(){if(!ready)return;takeOver();state.fly=!state.fly;if(!state.fly){if(world.waterBlocked(state.eye[0],state.eye[2])){state.fly=true;notify(lang==='zh'?'水面上保持飞行；请到岸边或桥上步行。':'Remain in flight over water. Land on a bank or bridge to walk.');}else state.eye[1]=world.walkHeight(state.eye[0],state.eye[2])+1.7;}updateMode();}

async function toggleSound(){try{await music.set(!music.on);emitState();}catch(e){notify(S[lang].audioError);}}
function renderNow(){if(ready)renderer.render(state.eye,lookTarget(),state.reduced?0:(manualTime===null?elapsed:manualTime));}
async function postcard(){if(!ready)return;try{renderNow();const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);const blob=await new Promise(resolve=>snapshot.toBlob(resolve,'image/webp',.92));if(!blob)throw Error('IMAGE_EMPTY');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='under-the-painted-stars.webp';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify(S[lang].saved);}catch(e){notify(S[lang].saveError);}}
function move(dt){
 const keys=state.keys,forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-state.joy[1],side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+state.joy[0],vertical=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+state.vertical;
 const active=Math.abs(forward)+Math.abs(side)+Math.abs(vertical)>1e-4;if(active&&state.mode!=='free')takeOver();let len=Math.max(1,Math.hypot(forward,side)),f=forward/len,s=side/len,speed=(state.fly?12:4.2)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.4:1);
 const target=[(Math.sin(state.yaw)*f+Math.cos(state.yaw)*s)*speed,(vertical+f*Math.sin(state.pitch)*.65)*speed,(-Math.cos(state.yaw)*f+Math.sin(state.yaw)*s)*speed];
 const accel=1-Math.exp(-dt*(active?10:6));
 state.velocity[0]+= (target[0]-state.velocity[0])*accel;
 state.velocity[1]+= (target[1]-state.velocity[1])*accel;
 state.velocity[2]+= (target[2]-state.velocity[2])*accel;
 if(!active && Math.hypot(...state.velocity)<.01){state.velocity=[0,0,0];}
 const can=(x,z)=>!world.waterBlocked(x,z)&&!world.colliders.some(b=>x>b.x0-.28&&x<b.x1+.28&&z>b.z0-.28&&z<b.z1+.28);
 let x=clamp(state.eye[0]+state.velocity[0]*dt,-135,130),z=clamp(state.eye[2]+state.velocity[2]*dt,-170,95);
 if(state.fly){state.eye[0]=x;state.eye[2]=z;state.eye[1]=clamp(state.eye[1]+state.velocity[1]*dt,Math.max(-.8,world.floor(x,z)+.65),155);}
 else {if(can(x,state.eye[2]))state.eye[0]=x;else state.velocity[0]*=.2;if(can(state.eye[0],z))state.eye[2]=z;else state.velocity[2]*=.2;state.eye[1]+= (world.walkHeight(state.eye[0],state.eye[2])+1.7-state.eye[1])*(1-Math.exp(-dt*16));state.velocity[1]=0;}
}
function tick(now){document.body.classList.toggle('shell-panel-open',shellPanelOpen());if(document.hidden){last=now;frameToken=requestAnimationFrame(tick);return;}if(renderer.quality.sample(now))renderer.resize();const raw=Math.max(0,(now-last)/1000||.016),clockDt=Math.min(.08,raw);last=now;if(!state.paused&&!document.hidden&&!document.querySelector('dialog[open]')&&!shellPanelOpen()){elapsed+=clockDt;
 if(state.mode==='tour'){
  if(!state.tourPaused)state.tourTime=Math.min(FLIGHT_DURATION,state.tourTime+clockDt);
  const pose=sampleTour(state.tourTime,state.reduced);orient(pose.p,pose.t);renderer.bank=pose.bank;renderer.fov=pose.fov;updateFlightUI();
  if(state.tourTime>=FLIGHT_DURATION){takeOver();state.fly=true;state.place=0;updatePlace();notify(S[lang].end);}
 }else if(state.mode==='travel'&&state.transition){
  const tr=state.transition;tr.time+=clockDt;const u=clamp(tr.time/tr.duration,0,1),e=ease(u),eye=V.mix(tr.a,tr.b,e);eye[1]+=Math.sin(Math.PI*e)*tr.apex;orient(eye,V.mix(tr.ta,tr.tb,e));if(u===1){state.fly=tr.endFly;state.mode='free';state.transition=null;tr.onDone?.();updateMode();}
 }else if(state.mode==='orbit'&&state.orbit){const o=state.orbit;if(o.auto&&!state.reduced)o.angle+=clockDt*.13;const p=[o.center[0]+Math.sin(o.angle)*Math.cos(o.phi)*o.radius,o.center[1]+Math.sin(o.phi)*o.radius,o.center[2]+Math.cos(o.angle)*Math.cos(o.phi)*o.radius];orient(p,o.center);}
 if(state.mode!=='tour'){const settle=1-Math.exp(-clockDt*4);renderer.bank+=(0-renderer.bank)*settle;renderer.fov+=(62-renderer.fov)*settle;}
 updateLights(clockDt);
 const smooth=1-Math.exp(-clockDt*18);let delta=state.goalYaw-state.yaw;while(delta>Math.PI)delta-=TAU;while(delta< -Math.PI)delta+=TAU;state.yaw+=delta*smooth;state.pitch+=(state.goalPitch-state.pitch)*smooth;for(let remaining=clockDt;remaining>1e-6;){const step=Math.min(.045,remaining);move(step);remaining-=step;}renderNow();}
 frameToken=requestAnimationFrame(tick);}
function pickAt(x,y){if(!ready)return;const rect=canvas.getBoundingClientRect(),nx=(x-rect.left)/rect.width*2-1,ny=1-(y-rect.top)/rect.height*2,forward=V.norm(V.sub(lookTarget(),state.eye)),right=V.norm(V.cross(forward,[0,1,0])),up=V.cross(right,forward),tan=Math.tan((renderer.fov+(document.body.clientWidth<600?22:0))*Math.PI/360),ray=V.norm(V.add(forward,V.add(V.mul(right,nx*tan*rect.width/rect.height),V.mul(up,ny*tan))));let best=null,dist=Infinity;for(const o of world.objects){const v=V.sub(o.center,state.eye),along=V.dot(v,ray),d2=V.dot(v,v)-along*along,rr=o.radius*(o.type==='house'?.70:.72);if(along>0&&d2<rr*rr){const near=along-Math.sqrt(rr*rr-d2);if(near<dist){best=o;dist=near;}}}if(best)showInspector(best.id);}
canvas.addEventListener('pointerdown',e=>{if(!ready)return;if(state.mode!=='orbit')takeOver(state.mode==='tour');state.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=state.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.moved ||= Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>4;p.x=e.clientX;p.y=e.clientY;if(state.mode==='orbit'&&state.orbit){state.orbit.auto=false;state.orbit.angle-=dx*.006;state.orbit.phi=clamp(state.orbit.phi+dy*.005,-.65,1.18);}else{state.goalYaw-=dx*.0038;state.goalPitch=clamp(state.goalPitch-dy*.0032,-1.34,1.34);}});
canvas.addEventListener('pointerup',e=>{const p=state.pointer;if(p&&p.id===e.pointerId){if(!p.moved)pickAt(e.clientX,e.clientY);state.pointer=null;}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',()=>state.pointer=null);canvas.addEventListener('lostpointercapture',()=>state.pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!ready)return;if(state.mode==='orbit'&&state.orbit){state.orbit.radius=clamp(state.orbit.radius*Math.exp(e.deltaY*.001),1.5,100);state.orbit.auto=false;}else{takeOver();const d=V.norm(V.sub(lookTarget(),state.eye)),step=-Math.sign(e.deltaY)*1.8;if(state.fly)state.eye=V.add(state.eye,V.mul(d,step));else{const x=state.eye[0]+d[0]*step,z=state.eye[2]+d[2]*step;if(!world.waterBlocked(x,z)&&!world.colliders.some(b=>x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1)){state.eye[0]=x;state.eye[2]=z;}}}},{passive:false});
const movement=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
window.addEventListener('keydown',e=>{if(shellPanelOpen()||!document.body.contains(e.composedPath()[0])||document.querySelector('dialog[open]')||/input|select|textarea|button/i.test(e.composedPath()[0]?.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;if(movement.includes(e.code)){e.preventDefault();state.keys.add(e.code);takeOver(state.mode==='tour');}if(e.repeat)return;switch(e.code){case'KeyF':toggleFly();break;case'KeyG':setWire();break;case'KeyP':postcard();break;case'Space':if(state.mode==='tour'){e.preventDefault();state.tourPaused=!state.tourPaused;updateFlightUI();}break;case'KeyR':jump(0);break;case'Escape':$('inspector').hidden=true;state.selected=0;if(renderer)renderer.selected=0;break;}});window.addEventListener('keyup',e=>state.keys.delete(e.code));window.addEventListener('blur',clearInputs);document.addEventListener('visibilitychange',()=>{last=performance.now();renderer?.quality.reset();clearInputs();if(music?.on&&music.context){if(document.hidden)void music.context.suspend();else void music.context.resume();}});
const joy=$('joystick');let joyPointer=null;function updateJoy(e){const r=joy.getBoundingClientRect();let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),max=28;if(d>max){dx*=max/d;dy*=max/d;}state.joy=[dx/max,dy/max];$('stick').style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{e.preventDefault();takeOver();joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);updateJoy(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoy(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,()=>{joyPointer=null;state.joy=[0,0];$('stick').style.transform='';});
for(const [id,value] of [['upBtn',1],['downBtn',-1]]){const b=$(id);b.onpointerdown=e=>{e.preventDefault();takeOver();state.fly=true;state.vertical=value;b.setPointerCapture(e.pointerId);updateMode();};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>state.vertical=0);}
$('enterBtn').onclick=startTour;$('freeBtn').onclick=()=>takeOver();$('takeoverBtn').onclick=()=>takeOver(true);
$('pauseFlight').onclick=()=>{state.tourPaused=!state.tourPaused;updateFlightUI();};
$('flightSeek').oninput=()=>{state.tourTime=Number($('flightSeek').value);const pose=sampleTour(state.tourTime,state.reduced);orient(pose.p,pose.t);renderer.bank=pose.bank;renderer.fov=pose.fov;updateFlightUI();renderNow();};
$('wireBtn').onclick=()=>setWire();$('captureBtn').onclick=postcard;$('replayBtn').onclick=startTour;$('aboutBtn').onclick=()=>{$('settings').close();$('about').showModal();};
$('inspectorClose').onclick=()=>{$('inspector').hidden=true;state.selected=0;renderer.selected=0;};$('orbitBtn').onclick=()=>beginOrbit(state.selected);$('lightBtn').onclick=()=>{if(state.selected)world.energy[state.selected]=world.energy[state.selected]>.5?0:1;};
document.addEventListener('flight-command',event=>{
 if(!ready)return;const {action,value}=event.detail;
 const commands={tour:startTour,fly:toggleFly,lights:toggleVillageLights,models:()=>{clearInputs();fillModels();$('catalog').showModal();},reference:()=>{clearInputs();$('paintingDialog').showModal();},settings:()=>{clearInputs();$('settings').showModal();},sound:toggleSound,wire:()=>setWire(),postcard,place:()=>jump(Number(value))};
 commands[action]?.();if(!['models','reference','settings'].includes(action))canvas.focus({preventScroll:true});
});
for(const e of document.querySelectorAll('[data-close]'))e.onclick=()=>$(e.dataset.close).close();for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
$('quality').onchange=()=>{renderer.quality.manual();renderer.scale=Number($('quality').value);renderer.resize();};$('reducedMotion').onchange=()=>{state.reduced=$('reducedMotion').checked;if(state.reduced){renderer.bank=0;renderer.fov=62;if(state.mode==='tour')takeOver();}if(state.orbit)state.orbit.auto=false;};$('shadowToggle').onchange=()=>renderer.shadows=$('shadowToggle').checked;$('volume').oninput=()=>music?.setVolume(Number($('volume').value));
window.addEventListener('resize',()=>{if(renderer){renderer.resize();renderNow();}});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.paused=true;notify(S[lang].contextLost);});
document.body.classList.toggle('touch',matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
refresh();
setTimeout(async()=>{try{world=await makeWorld();renderer=new Renderer(canvas);renderer.init(world);music=new NightMusic();music.setVolume(.4);$('volume').value='.4';orient(TOUR[0].p,TOUR[0].t);if(location.searchParams.get('capture')==='1'){const pose=sampleTour(FLIGHT_BRIDGE_TIME,true);orient(pose.p,pose.t);state.mode='free';state.paused=true;document.body.classList.add('poster-capture');}ready=true;refresh();renderNow();$('boot').classList.add('done');setTimeout(()=>$('boot').hidden=true,750);last=performance.now();frameToken=requestAnimationFrame(tick);
 window.starWorld=window.paintingWorld={ready:true,getPose:()=>({mode:state.mode,eye:state.eye.slice(),target:lookTarget()}),getState:()=>({mode:state.mode,fly:state.fly,eye:state.eye.slice(),target:lookTarget(),yaw:state.yaw,pitch:state.pitch,language:lang,selected:state.selected,wireframe:renderer.wire,tourTime:state.tourTime,music:music.on,audioScheduled:music.scheduled,resolutionScale:renderer.scale,shadows:renderer.shadows,joystick:state.joy.slice(),vertical:state.vertical,reducedMotion:state.reduced,stats:{...world.stats},keys:[...state.keys],objects:world.objects.map(o=>({...o}))}),jump:(i,immediate=true)=>jump(i,immediate),setPose:(p,t)=>{takeOver();state.fly=true;orient(p,t);renderNow();},setLanguage:l=>{lang=l==='en'?'en':'zh';refresh();},setTourTime:seconds=>{state.mode='tour';state.fly=true;state.tourTime=clamp(seconds,0,FLIGHT_DURATION);const p=sampleTour(state.tourTime);orient(p.p,p.t);renderer.bank=p.bank;renderer.fov=p.fov;updateFlightUI();updateMode();renderNow();},startTour,stopTour:()=>takeOver(),inspect:beginOrbit,select:showInspector,setWireframe:setWire,glError:()=>renderer.gl.getError(),capture:()=>{renderNow();return canvas.toDataURL('image/png');},freeze:value=>{state.paused=value;renderNow();},setTime:t=>{manualTime=t;renderNow();},render:renderNow,energy:id=>world.energy[id]};
 }catch(error){console.error(error);$('bootText').textContent=S[lang].error;$('bootDetail').textContent=S[lang].errorDetail;$('bootDetail').style.maxWidth='320px';$('bootDetail').style.lineHeight='1.8';const code=document.createElement('p');code.style.fontSize='11px';code.textContent=error.message;$('boot').appendChild(code);document.querySelector('.orbit-mark').style.display='none';window.starWorld={ready:false,error:error.message};}},40);
})();

// Bridge the native bilingual world to the shared site shell.
const resize = new ResizeObserver(() => window.dispatchEvent(new Event('resize')));
resize.observe(document.body);
document.addEventListener('host-language', e => window.starWorld?.setLanguage(e.detail));
const savePose=()=>{const s=window.starWorld?.getPose();if(s&&s.mode!=='landing'&&location.searchParams.get('capture')!=='1')try{sessionStorage.setItem('oneworld.starry-night.pose',JSON.stringify({eye:s.eye,target:s.target}))}catch{}};
window.addEventListener('pagehide',savePose);
setInterval(savePose,2000);
function restorePose(){
 if(location.searchParams.get('capture')==='1')return;
 const api=window.starWorld;if(api?.error)return;if(!api?.ready){setTimeout(restorePose,100);return;}
 try{const saved=JSON.parse(sessionStorage.getItem('oneworld.starry-night.pose')||'null');
 if(saved&&Array.isArray(saved.eye)&&saved.eye.length===3&&saved.eye.every(Number.isFinite)){
 const target=saved.target||(Number.isFinite(saved.yaw)&&Number.isFinite(saved.pitch)?[saved.eye[0]+Math.sin(saved.yaw)*Math.cos(saved.pitch),saved.eye[1]+Math.sin(saved.pitch),saved.eye[2]-Math.cos(saved.yaw)*Math.cos(saved.pitch)]:null);
 if(target?.length===3&&target.every(Number.isFinite))api.setPose(saved.eye,target);
 } }catch{}
}
restorePose();
}
