// Generated from the FrontScope launch kit. Do not edit.
export function mount(environment) {
const { location, history, document, window, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, matchMedia, ResizeObserver } = environment;
(()=>{'use strict';

/* MODULE: engine.js */
/* Geo Atelier · small deterministic math kernel. No runtime dependencies. */
const TAU=Math.PI*2, DEG=Math.PI/180;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const fract=x=>x-Math.floor(x);
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)},lerp:(a,b,t)=>a.map((v,i)=>mix(v,b[i],t))};
const M={
 id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{let c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c},
 translate:(p)=>{let m=M.id();m[12]=p[0];m[13]=p[1];m[14]=p[2];return m},
 scale:(s)=>{let m=M.id();m[0]=s[0];m[5]=s[1];m[10]=s[2];return m},
 rx:a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
 ry:a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
 rz:a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
 compose:(p=[0,0,0],r=[0,0,0],s=[1,1,1])=>M.mul(M.translate(p),M.mul(M.ry(r[1]),M.mul(M.rx(r[0]),M.mul(M.rz(r[2]),M.scale(s))))),
 perspective:(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
 ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),
 look:(eye,target,up=[0,1,0])=>{let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 point:(m,p)=>{let x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w]},
 normal:m=>{let a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]],x=V.cross(b,c),y=V.cross(c,a),z=V.cross(a,b),d=V.dot(a,x)||1;return new Float32Array([...V.mul(x,1/d),...V.mul(y,1/d),...V.mul(z,1/d)])}
};
const colors={ice:'#74c7fa',cold:'#58baff',warm:'#ff986c',gold:'#e9cc8a',mint:'#84d5be',purple:'#bba0de',ink:'#0b2332',white:'#e9f3f3',red:'#ec8479'};
const colorCache=new Map();
function col(h){if(Array.isArray(h))return h;if(colorCache.has(h))return colorCache.get(h);let c=h.replace('#','');if(c.length===3)c=c.split('').map(s=>s+s).join('');let v=[0,2,4].map(i=>Math.pow(parseInt(c.slice(i,i+2),16)/255,2.2));colorCache.set(h,v);return v}
function tint(a,b,t){return V.lerp(col(a),col(b),clamp(t))}
function rng(seed=1){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
function hash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453123;return fract(n)}
function noise(x,y){let i=Math.floor(x),j=Math.floor(y),u=fract(x),v=fract(y);u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v)}
function fbm(x,y,n=5){let f=0,a=.5;for(let i=0;i<n;i++){f+=a*noise(x,y);x=x*2.03+31.8;y=y*2.03-17.2;a*=.5}return f}
function catmull(points,u,closed=false){let n=points.length,segments=closed?n:n-1,v=clamp(u,0,.999999)*segments,i=Math.floor(v),t=v-i;let at=k=>points[closed?((k%n)+n)%n:clamp(k,0,n-1)],a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t))}
function samplePath(path,u){let v=clamp(u,0,.999999)*(path.length-1),i=Math.floor(v);return V.lerp(path[i],path[i+1],v-i)}
function ll(lat,lon,r=6,center=[0,3,0]){let a=lat*DEG,b=lon*DEG;return [center[0]+r*Math.cos(a)*Math.sin(b),center[1]+r*Math.sin(a),center[2]+r*Math.cos(a)*Math.cos(b)]}

/* Native WebGL2 renderer: indexed meshes, shadow mapping, procedural water,
   atmospheric particles, geographic labels and orbit camera. */
const commonVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;layout(location=3) in vec2 aUV;
uniform mat4 uModel,uVP,uLightVP;uniform mat3 uNormal;
uniform float uTime,uMode,uWave,uFold,uFit;uniform sampler2D uHeight,uAirHeight;
out vec3 vPos,vNormal,vColor;out vec2 vUV;out vec4 vShadow;
void main(){vec3 p=aPosition,n=aNormal;
 if(uMode==2.0){float w=uWave;p.y+=w*(sin(p.x*.78-uTime*1.3)*.62+sin(p.z*1.4+p.x*.3-uTime*.8)*.27+sin(p.x*3.4+p.z*2.1-uTime*2.)*.08);n=normalize(vec3(-w*(.484*cos(p.x*.78-uTime*1.3)+.081*cos(p.z*1.4+p.x*.3-uTime*.8)+.272*cos(p.x*3.4+p.z*2.1-uTime*2.)),1.,-w*(.378*cos(p.z*1.4+p.x*.3-uTime*.8)+.168*cos(p.x*3.4+p.z*2.1-uTime*2.))));}
 if(uMode==9.){p.x=mix(-p.y*.55,uWave+p.y*1.5,p.x);p.y+=uFold;}
 if(uFold!=0.&&uMode!=9.){p.y+=uFold*cos(p.x*.49);n.x-=n.y*(-uFold*.49*sin(p.x*.49));}
 vec4 world=uModel*vec4(p,1.);if(uFit>.5){vec2 uv=clamp((world.xz+vec2(12.,8.))/vec2(24.,16.),vec2(0.),vec2(1.));vec4 h=uFit>1.5?texture(uAirHeight,uv):texture(uHeight,uv);float yy=(h.r+h.g/255.)*12.-2.;world.y=uFit>1.5?max(world.y,yy+.55):world.y+yy;}vPos=world.xyz;vNormal=normalize(uNormal*n);vColor=aColor;vUV=aUV;vShadow=uLightVP*world;gl_Position=uVP*world;
}`;
const commonFS=`#version 300 es
precision highp float;
in vec3 vPos,vNormal,vColor;in vec2 vUV;in vec4 vShadow;out vec4 fragColor;
uniform vec3 uEye,uTint,uSun;uniform float uOpacity,uMode,uTime,uUnlit,uContours,uClip,uAmbient,uTexOn,uShadowOn,uField,uFrontX,uFrontKind,uModelP,uFlash,uBound;
uniform sampler2D uShadowMap,uTexture;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float shadow(vec3 n){if(uShadowOn<.5)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float s=0.;float bias=max(.0011*(1.-dot(n,uSun)),.0006);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadowMap,p.xy+vec2(x,y)/1024.).r;s+=p.z-bias>d?.48:1.;}return s/9.;}
void main(){if(vPos.z>uClip || (uBound>.5 && (abs(vPos.x)>12. || abs(vPos.z)>8.)))discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 c=vColor*uTint;float alpha=uOpacity;float rough=1.;
 if(uTexOn>.5)c*=pow(texture(uTexture,vUV).rgb,vec3(2.2));
 if(uMode==1.){float grain=noise(vPos.xz*65.)*.6+noise(vPos.xz*173.)*.4;c*=.80+.35*grain;float cn=abs(fract(vPos.y*5.)-.5);float cc=1.-smoothstep(.025,.025+fwidth(vPos.y*5.)*1.2,cn);c=mix(c,c*.57+vec3(.08,.13,.08),cc*uContours*.55);}
 if(uMode==3.){float s=sin(vPos.y*30.+noise(vPos.xz*.7)*3.);float g=noise(vPos.xy*40.);c*=.85+.12*s+.13*g;}
 if(uMode==4.){float f=pow(1.-abs(dot(n,normalize(uEye-vPos))),2.8);fragColor=vec4(pow(c,vec3(1./2.2)),f*uOpacity);return;}
 if(uMode==5.){float d=length(vUV-.5)*2.;alpha*=exp(-d*d*3.)*(1.-smoothstep(.8,1.,d));}
 if(uMode==6.){vec2 f=abs(fract(vPos.xz/2.5-.5)-.5)/fwidth(vPos.xz/2.5);float line=1.-clamp(min(f.x,f.y),0.,1.);c+=vec3(.010,.019,.025)*line;alpha*=1.-smoothstep(24.,42.,length(vPos.xz));}
 if(uMode==7.){float stripes=pow(.5+.5*sin(vPos.y*12.+vPos.x*.4-uTime*.9),12.);alpha*=.65+stripes*.35;}
 if(uMode==8.){float f=noise(vUV*75.)*.5+noise(vUV*210.)*.22+noise(vUV*460.)*.12;c=mix(vec3(.62,.035,.002),vec3(1.,.68,.18),f*1.5);}
 if(uMode==1. && uField>0.){
  float dx=uFrontX+.2*sin(vPos.z*.6)+.035*vPos.z-vPos.x;
  float post=1./(1.+exp(clamp(-dx/.58,-25.,25.)));
  float warmFraction=1.-post;
  float pressure=1011.-3.5*exp(-pow((dx+.8)/2.,2.))+5.*post;
  if(uFrontKind==1.){warmFraction=post;pressure=1017.-7.*post-1.1*exp(-dx*dx/5.);}
  if(uFrontKind==2.){warmFraction=1./(1.+exp(clamp(dx/.55,-25.,25.)));pressure=1010.+sin(uModelP*6.2831853)*.6;}
  if(uFrontKind==3.){float gap=6.2*(1.-smoothstep(.03,.77,uModelP));float inWarm=(1./(1.+exp(clamp(dx/.4,-25.,25.))))*(1./(1.+exp(clamp(-(dx+gap)/.4,-25.,25.))))*(1.-smoothstep(.38,.79,uModelP));warmFraction=mix(.5*(1.-post),1.,inWarm);pressure=1013.-6.*exp(-pow(dx/3.,2.))+3.*post;}
  if(uFrontKind==4.){warmFraction=1.-(.35+.36*sin(uModelP*6.2831853-vPos.x*.18));float near=exp(-(pow(vPos.x+1.,2.)+pow(vPos.z+1.,2.))/60.);pressure=1016.-near*15.*sin(uModelP*3.1415927);}
  if(uFrontKind==5.){warmFraction=dx>0.?0.:1.;pressure=1013.;}
  if(uField==1.)c=mix(c,mix(vec3(.015,.20,.52),vec3(.63,.12,.035),clamp(warmFraction,0.,1.)),.55);
  if(uField==2.){float v=pressure*.5;float iso=(1.-smoothstep(.025,.025+max(.001,fwidth(v))*1.3,abs(fract(v)-.5)))*smoothstep(.0001,.002,fwidth(v));c=mix(c,vec3(.48,.80,.80),iso*.86);}
 }
 vec3 light=vec3(uAmbient)*mix(vec3(.59,.72,.86),vec3(.98,1.,.95),n.y*.5+.5);float diffuse=max(dot(n,uSun),0.);light+=diffuse*vec3(1.18,1.12,.96)*shadow(n);light+=max(dot(n,normalize(vec3(1.,.6,-1.))),0.)*vec3(.06,.12,.2);
 vec3 outc=mix(c*light,c,uUnlit);
 if(uMode==2.){vec3 h=normalize(normalize(uEye-vPos)+uSun);float spec=pow(max(dot(n,h),0.),65.);float fres=pow(1.-max(dot(n,normalize(uEye-vPos)),0.),3.);outc+=spec*vec3(.28,.37,.37)+fres*vec3(.014,.035,.045);float w=noise(vPos.xz*8.+uTime*.08);outc+=pow(w,7.)*.018;}
 float fog=1.-exp(-max(length(vPos-uEye)-40.,0.)*.018);outc=mix(outc,vec3(.002,.006,.011),fog);
 outc+=vec3(.06,.085,.16)*uFlash;fragColor=vec4(pow(max(outc,vec3(0.)),vec3(1./2.2)),alpha);
}`;
const depthFS=`#version 300 es
precision highp float;in vec3 vPos;uniform float uClip;void main(){if(vPos.z>uClip)discard;}`;
const pointsVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPosition;layout(location=1) in float aSize;layout(location=2) in vec4 aColor;layout(location=3) in float aSeed;
uniform mat4 uVP,uView;uniform float uPixelScale,uKind;out vec4 vColor;out float vSeed;out vec3 vPos;
void main(){vec4 p=uView*vec4(aPosition,1.);gl_Position=uVP*vec4(aPosition,1.);gl_PointSize=clamp(aSize*uPixelScale/max(1.,-p.z),1.,320.);vColor=aColor;vSeed=aSeed;vPos=aPosition;}`;
const pointsFS=`#version 300 es
precision highp float;in vec4 vColor;in float vSeed;in vec3 vPos;uniform float uKind,uTime,uClip,uFlash;out vec4 fragColor;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){if(vPos.z>uClip||abs(vPos.x)>12.2||abs(vPos.z)>8.2)discard;vec2 q=(gl_PointCoord-.5)*2.;float d=dot(q,q),alpha=0.;vec3 c=vColor.rgb;
 if(uKind==1.){float f=n(q*3.6+vSeed)*.51+n(q*8.2-vSeed)*.28+n(q*18.1+vSeed*2.)*.14+n(q*41.+vSeed)*.07;
 float edge=1.-d+(f-.48)*.8;alpha=smoothstep(.015,.44,edge)*vColor.a;
 float nz=sqrt(max(0.,1.-d));vec3 normal=normalize(vec3(q.x,-q.y,nz));float shade=max(dot(normal,normalize(vec3(-.6,.9,1.3))),0.);
 c*=.28+.76*shade+(f-.4)*.24;c+=vec3(.17,.23,.4)*uFlash;}
 else if(uKind==2.){float streak=exp(-q.x*q.x*150.)*(1.-smoothstep(.2,1.,abs(q.y)));alpha=streak*vColor.a;}
 else {if(d>1.)discard;alpha=(exp(-d*6.)*.6+exp(-d*24.)*.55)*vColor.a;c*=1.3;}
 if(alpha<.004)discard;fragColor=vec4(pow(max(c,vec3(0.)),vec3(1./2.2)),alpha);
}`;
class Mesh{
 constructor(geometry,material={}){this.geo=geometry;this.mat={opacity:1,mode:0,unlit:0,tint:[1,1,1],wave:.06,fold:0,...material};this.model=M.id();this.visible=true;this.castShadow=true;this.cuttable=true;this.tag='base';this.gpu=null;}
 at(p,r=[0,0,0],s=[1,1,1]){this.model=M.compose(p,r,s);return this}
}
class GLRenderer{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw Error('需要支持 WebGL 2 的浏览器与图形加速。');this.gl=gl;this.program=this.makeProgram(commonVS,commonFS);this.depth=this.makeProgram(commonVS,depthFS);this.pointProg=this.makeProgram(pointsVS,pointsFS);this.buffers=new Set();this.textures=new Set();this.width=1;this.height=1;this.drawCalls=0;this.triangles=0;
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.makeShadow();this.makePoints();this.white=this.texture(null);this.earth=this.white;
 this.lightVP=M.mul(M.ortho(-22,22,-20,22,.1,80),M.look([-16,29,15],[0,0,0]));this.sun=V.norm([-16,29,15]);this.shadowEnabled=true;
 }
 makeProgram(v,f){let gl=this.gl;const shader=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};let vs=shader(gl.VERTEX_SHADER,v),fs=shader(gl.FRAGMENT_SHADER,f),p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.deleteShader(vs);gl.deleteShader(fs);let u={};let count=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<count;i++){let name=gl.getActiveUniform(p,i).name;u[name]=gl.getUniformLocation(p,name)}return {p,u};}
 makeShadow(){let gl=this.gl;this.shadowTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.shadowFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
 texture(image){let gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.textures.add(t);return t}
 makePoints(){let gl=this.gl;this.pointVAO=gl.createVertexArray();this.pointBuffer=gl.createBuffer();gl.bindVertexArray(this.pointVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer);for(let [loc,size,offset] of [[0,3,0],[1,1,3],[2,4,4],[3,1,8]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset*4)}gl.bindVertexArray(null)}
 upload(mesh){if(mesh.gpu)return;let gl=this.gl,g=mesh.geo,vao=gl.createVertexArray(),b=gl.createBuffer(),ib=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,g.data,gl.STATIC_DRAW);for(let [loc,size,offset] of [[0,3,0],[1,3,3],[2,3,6],[3,2,9]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset*4)}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.indices,gl.STATIC_DRAW);gl.bindVertexArray(null);mesh.gpu={vao,b,ib,count:g.indices.length};this.buffers.add(mesh)}
 disposeMeshes(meshes){const gl=this.gl;for(let m of meshes){if(m.gpu){gl.deleteVertexArray(m.gpu.vao);gl.deleteBuffer(m.gpu.b);gl.deleteBuffer(m.gpu.ib);m.gpu=null;this.buffers.delete(m)}}}
 resize(w,h,quality=1){let d=Math.min(devicePixelRatio||1,quality===0?.85:quality===2?2:1.35)*(this.captureScale||1);this.width=Math.max(1,Math.round(w*d));this.height=Math.max(1,Math.round(h*d));if(this.canvas.width!==this.width||this.canvas.height!==this.height){this.canvas.width=this.width;this.canvas.height=this.height;}this.cssWidth=w;this.cssHeight=h;this.dpr=d;}
 drawMesh(m,prog,vp,camera,time,section,shadow=false,ambient=.53){let gl=this.gl,u=prog.u,g=m.gpu,mat=m.mat;if(!g){this.upload(m);g=m.gpu}gl.bindVertexArray(g.vao);gl.uniformMatrix4fv(u.uModel,false,m.model);gl.uniformMatrix4fv(u.uVP,false,vp);gl.uniformMatrix4fv(u.uLightVP,false,this.lightVP);gl.uniformMatrix3fv(u.uNormal,false,M.normal(m.model));gl.uniform1f(u.uTime,time);gl.uniform1f(u.uMode,mat.mode);gl.uniform1f(u.uWave,mat.wave);gl.uniform1f(u.uFold,mat.fold);gl.uniform1f(u.uClip,section&&m.cuttable?0:1000);gl.uniform1f(u.uFit,mat.clearance?2:mat.fit?1:0);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.heightTex||this.white);gl.uniform1i(u.uHeight,2);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.airHeightTex||this.heightTex||this.white);gl.uniform1i(u.uAirHeight,3);
 if(!shadow){gl.uniform3fv(u.uEye,camera.eye);gl.uniform3fv(u.uSun,this.sun);gl.uniform3fv(u.uTint,mat.tint);gl.uniform1f(u.uOpacity,mat.opacity);gl.uniform1f(u.uUnlit,mat.unlit);gl.uniform1f(u.uField,this.field||0);gl.uniform1f(u.uFrontX,this.frontX||0);gl.uniform1f(u.uFrontKind,this.frontKind||0);gl.uniform1f(u.uModelP,this.progress||0);gl.uniform1f(u.uFlash,this.flash||0);gl.uniform1f(u.uBound,['air','front','flow','lightning'].includes(m.tag)?1:0);gl.uniform1f(u.uAmbient,ambient);gl.uniform1f(u.uContours,this.contours?1:0);gl.uniform1f(u.uTexOn,mat.earth?1:0);gl.uniform1f(u.uShadowOn,this.shadowEnabled&&this.shadowOK&&ambient>.2?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.uniform1i(u.uShadowMap,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mat.earth?this.earth:this.white);gl.uniform1i(u.uTexture,1)}gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,0);this.drawCalls++;this.triangles+=g.count/3;}
 drawPoints(points,kind,camera,time,section){if(!points||!points.length)return;let gl=this.gl,pr=this.pointProg,u=pr.u;gl.useProgram(pr.p);gl.bindVertexArray(this.pointVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer);let arr=new Float32Array(points.length*9),sorted=points;if(kind===1)sorted=points.slice().sort((a,b)=>(b.p[0]-a.p[0])*camera.forward[0]+(b.p[1]-a.p[1])*camera.forward[1]+(b.p[2]-a.p[2])*camera.forward[2]);for(let i=0;i<sorted.length;i++){let p=sorted[i],c=col(p.c||colors.white),o=i*9;arr.set([...p.p,p.s||.1,...c,p.a??.8,p.seed??i*.173],o)}gl.bufferData(gl.ARRAY_BUFFER,arr,gl.DYNAMIC_DRAW);gl.uniformMatrix4fv(u.uVP,false,camera.vp);gl.uniformMatrix4fv(u.uView,false,camera.view);gl.uniform1f(u.uPixelScale,this.height/(2*Math.tan(camera.fov/2)));gl.uniform1f(u.uKind,kind);gl.uniform1f(u.uFlash,this.flash||0);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uClip,section?0:1000);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,sorted.length);this.drawCalls++;gl.depthMask(true)}
 render(world,camera,time,opts={}){let gl=this.gl;this.drawCalls=0;this.triangles=0;this.contours=opts.contours;let meshes=world.meshes.filter(m=>m.visible&&(!m.tag||opts[m.tag]!==false)&&m.mat.opacity>.001);const section=opts.section&&!world.noSection;
 if(this.shadowEnabled&&this.shadowOK&&world.ambient!==.1&&this.shadowKey!==String(section)){this.shadowKey=String(section);gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.viewport(0,0,1024,1024);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.4,2);gl.useProgram(this.depth.p);for(let m of meshes)if(m.castShadow&&m.mat.opacity>.98)this.drawMesh(m,this.depth,this.lightVP,camera,time,section,true);gl.disable(gl.POLYGON_OFFSET_FILL)}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.BLEND);gl.useProgram(this.program.p);gl.depthMask(true);for(let m of meshes)if(m.mat.opacity>=.99)this.drawMesh(m,this.program,camera.vp,camera,time,section,false,world.ambient??.53);
 gl.depthMask(false);for(let m of meshes)if(m.mat.opacity<.99)this.drawMesh(m,this.program,camera.vp,camera,time,section,false,world.ambient??.53);gl.depthMask(true);
 if(opts.clouds!==false)this.drawPoints(world.clouds,1,camera,time,section);if(opts.rain!==false)this.drawPoints(world.rain,2,camera,time,section);if(opts.flow!==false)this.drawPoints(world.particles,0,camera,time,section);this.drawPoints(world.stars,0,camera,time,false);if(world.lightning&&opts.lightning!==false){gl.useProgram(this.program.p);gl.depthMask(false);for(let m of world.lightning)if(m.visible&&m.mat.opacity>.001)this.drawMesh(m,this.program,camera.vp,camera,time,section,false,.8);gl.depthMask(true);}gl.bindVertexArray(null);
 }
}
/* CPU-side indexed geometry. Geometry is generated once per experiment build. */
class Builder{
 constructor(){this.v=[];this.i=[];}
 vertex(p,n,c='#ffffff',uv=[0,0]){let k=this.v.length/11;this.v.push(...p,...n,...col(c),...uv);return k}
 face(a,b,c,color,normal=null){let n=normal||V.norm(V.cross(V.sub(b,a),V.sub(c,a))),i=this.vertex(a,n,color,[0,0]),j=this.vertex(b,n,color,[1,0]),k=this.vertex(c,n,color,[1,1]);this.i.push(i,j,k)}
 quad(a,b,c,d,color,n=null){n=n||V.norm(V.cross(V.sub(b,a),V.sub(c,a)));let i=this.vertex(a,n,color,[0,0]),j=this.vertex(b,n,color,[1,0]),k=this.vertex(c,n,color,[1,1]),l=this.vertex(d,n,color,[0,1]);this.i.push(i,j,k,i,k,l)}
 append(geo,m=M.id(),color=null){let off=this.v.length/11,nm=M.normal(m);for(let i=0;i<geo.data.length;i+=11){let d=geo.data,p=M.point(m,[d[i],d[i+1],d[i+2]]),n=V.norm([nm[0]*d[i+3]+nm[3]*d[i+4]+nm[6]*d[i+5],nm[1]*d[i+3]+nm[4]*d[i+4]+nm[7]*d[i+5],nm[2]*d[i+3]+nm[5]*d[i+4]+nm[8]*d[i+5]]);this.v.push(...p,...n,...(color?col(color):[d[i+6],d[i+7],d[i+8]]),d[i+9],d[i+10])}for(let i of geo.indices)this.i.push(i+off)}
 build(){return {data:new Float32Array(this.v),indices:new Uint32Array(this.i)}}
}
function boxGeometry(w,h,d,c='#ffffff'){let b=new Builder(),x=w/2,y=h/2,z=d/2;let p=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];for(let q of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]])b.quad(...q.map(i=>p[i]),c);return b.build()}
function sphereGeometry(r,c='#ffffff',nx=64,ny=40,cut=0){let b=new Builder();for(let j=0;j<=ny;j++){let lat=-Math.PI/2+j/ny*Math.PI;for(let i=0;i<=nx;i++){let lon=-Math.PI+i/nx*TAU,n=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];b.vertex(V.mul(n,r),n,c,[i/nx,j/ny])}}for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let lon=-Math.PI+(i+.5)/nx*TAU;if(cut>0&&lon>0&&lon<cut)continue;let a=j*(nx+1)+i,bb=a+1,cc=a+nx+1,dd=cc+1;b.i.push(a,bb,dd,a,dd,cc)}return b.build()}
function cylinderGeometry(a,b,r,c='#ffffff',n=12,r2=r){let out=new Builder(),t=V.norm(V.sub(b,a)),v=V.norm(V.cross(t,Math.abs(t[1])>.9?[1,0,0]:[0,1,0])),u=V.cross(v,t);for(let i=0;i<n;i++){let p=i/n*TAU,q=(i+1)/n*TAU,na=V.add(V.mul(u,Math.cos(p)),V.mul(v,Math.sin(p))),nb=V.add(V.mul(u,Math.cos(q)),V.mul(v,Math.sin(q))),aa=V.add(a,V.mul(na,r)),ab=V.add(a,V.mul(nb,r)),ba=V.add(b,V.mul(na,r2)),bb=V.add(b,V.mul(nb,r2));out.quad(aa,ab,bb,ba,c,V.norm(V.add(na,nb)));out.face(a,ab,aa,c,V.mul(t,-1));if(r2>0)out.face(b,ba,bb,c,t)}return out.build()}
function ringGeometry(r0,r1,c='#ffffff',plane='xz',segments=128,start=0,length=TAU){let b=new Builder(),pt=(r,a)=>plane==='xz'?[r*Math.cos(a),0,r*Math.sin(a)]:plane==='xy'?[r*Math.cos(a),r*Math.sin(a),0]:[0,r*Math.cos(a),r*Math.sin(a)];for(let i=0;i<segments;i++){let a=start+i/segments*length,d=start+(i+1)/segments*length;b.quad(pt(r0,a),pt(r1,a),pt(r1,d),pt(r0,d),c)}return b.build()}
function tubeGeometry(points,r=.026,c='#ffffff',sides=6){let b=new Builder();for(let i=0;i<points.length;i++){let tangent=V.norm(V.sub(points[Math.min(i+1,points.length-1)],points[Math.max(i-1,0)])),u=V.norm(V.cross(tangent,Math.abs(tangent[1])>.95?[1,0,0]:[0,1,0])),v=V.cross(tangent,u),radius=typeof r==='function'?r(i/(points.length-1)):r;for(let k=0;k<sides;k++){let a=k/sides*TAU,n=V.add(V.mul(u,Math.cos(a)),V.mul(v,Math.sin(a)));b.vertex(V.add(points[i],V.mul(n,radius)),n,typeof c==='function'?c(i/(points.length-1)):c)}}for(let i=0;i<points.length-1;i++)for(let k=0;k<sides;k++){let a=i*sides+k,bb=i*sides+(k+1)%sides,cc=(i+1)*sides+k,dd=(i+1)*sides+(k+1)%sides;b.i.push(a,bb,dd,a,dd,cc)}return b.build()}
function paramSurface(nx,ny,fn,c='#ffffff'){let b=new Builder(),ps=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)ps.push(fn(i/nx,j/ny));for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){let p=ps[j*(nx+1)+i],du=V.sub(ps[j*(nx+1)+Math.min(i+1,nx)],ps[j*(nx+1)+Math.max(i-1,0)]),dv=V.sub(ps[Math.min(j+1,ny)*(nx+1)+i],ps[Math.max(j-1,0)*(nx+1)+i]),n=V.norm(V.cross(dv,du));b.vertex(p,n,typeof c==='function'?c(p,i/nx,j/ny):c,[i/nx,j/ny]);}for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i,bb=a+1,cc=a+nx+1,dd=cc+1;b.i.push(a,cc,bb,bb,cc,dd)}return b.build()}
function pathPoints(fn,n=100){return Array.from({length:n+1},(_,i)=>fn(i/n))}
function curvePoints(pts,n=100,closed=false){return pathPoints(t=>catmull(pts,t,closed),n)}
function addBox(world,p,s,c,mat={},tag='base'){return world.mesh(boxGeometry(...s,c),mat,tag).at(p)}
function addSphere(world,p,r,c,mat={},scale=[1,1,1],tag='base'){return world.mesh(sphereGeometry(r,c),mat,tag).at(p,[0,0,0],scale)}
function addLine(world,pts,c=colors.white,r=.024,opacity=.65,tag='base'){let m=world.mesh(tubeGeometry(pts,r,c),{unlit:.8,opacity},tag);m.castShadow=false;return m}
function arrowGeometry(p,dir,size,c){let t=V.norm(dir);return cylinderGeometry(V.sub(p,V.mul(t,size)),V.add(p,V.mul(t,size*.65)),size*.42,c,10,0)}
class World{
 constructor(id){this.id=id;this.meshes=[];this.paths=[];this.clouds=[];this.rain=[];this.particles=[];this.stars=[];this.labels=[];this.updates=[];this.ambient=.53;this.camera={distance:34,target:[0,2.2,0],yaw:.66,pitch:.5};this.noSection=false;this.time=0;this.progress=.4;this.sceneUpdate=()=>{};}
 mesh(g,mat={},tag='base'){let m=new Mesh(g,mat);m.tag=tag;this.meshes.push(m);return m}
 label(text,p,sub='',c=colors.white,priority=1){let l={text,p,sub,c,priority,visible:true};this.labels.push(l);return l}
 flow(points,c=colors.cold,opts={}){let samples=typeof points==='function'?pathPoints(points,opts.steps??90):curvePoints(points,opts.steps??90,opts.closed);let line=this.mesh(tubeGeometry(samples,opts.radius??.019,c,5),{unlit:1,opacity:opts.opacity??.28},'flow');line.castShadow=false;let arrow=null;if(opts.arrow!==false){let u=.61,pt=samplePath(samples,u),dir=V.sub(samplePath(samples,u+.015),pt);arrow=this.mesh(arrowGeometry(pt,dir,opts.arrowSize??.19,c),{unlit:1,opacity:.85},'flow');arrow.castShadow=false}let path={samples,c,line,arrow,speed:opts.speed??.11,phase:opts.phase??hash(this.paths.length,8),count:opts.count??5,size:opts.size??.11,matrix:M.id(),enabled:true};this.paths.push(path);return path}
 cloud(p,s=2,a=.55,seed=0,c='#eff5f4'){let point={p:[...p],s,a,seed,c};this.clouds.push(point);return point}
 update(t,p){this.time=t;this.progress=p;this.sceneUpdate(t,p);this.particles=[];for(let path of this.paths){path.line.model=path.matrix;if(path.arrow)path.arrow.model=path.matrix;path.line.visible=path.enabled;if(path.arrow)path.arrow.visible=path.enabled;if(!path.enabled)continue;for(let i=0;i<path.count;i++)for(let j=0;j<3;j++){let u=fract(t*path.speed+i/path.count+path.phase-j*.009),v=M.point(path.matrix,samplePath(path.samples,u));this.particles.push({p:v,s:path.size*(1-j*.23),c:path.c,a:(1-j*.23)*.95})}}for(let f of this.updates)f(t,p);}
}
function addStage(world){let floor=world.mesh(paramSurface(1,1,(u,v)=>[-50+100*u,-1.79,-50+100*v],'#0a1c29'),{mode:6,opacity:.83});floor.castShadow=false;floor.cuttable=false;}



/* MODULE: camera.js */
/* Input controller for the original WebGL renderer.
 * Damping is time-based, not frame-based. Pointer capture is always released.
 * Pinch uses distance for zoom and centroid movement for camera-space panning.
 */
class OrbitCamera {
  constructor(canvas) {
    this.canvas=canvas;
    this.yaw=.66; this.pitch=.5; this.distance=34; this.target=[0,2.1,0];
    this.fov=40*DEG; this.reduced=false; this.dragging=false; this.goal=null;
    this.touchPoints=new Map(); this.pointerMove=0; this.velocity=[0,0];
    this.desired=this.pose(); this.onInteraction=()=>{}; this.lastMove=0;
    canvas.addEventListener('pointerdown', e=>this.pointerDown(e));
    canvas.addEventListener('pointermove', e=>this.pointerMoveEvent(e));
    canvas.addEventListener('pointerup', e=>this.pointerEnd(e));
    canvas.addEventListener('pointercancel', e=>this.pointerEnd(e,true));
    canvas.addEventListener('lostpointercapture', e=>this.pointerEnd(e,true));
    canvas.addEventListener('wheel', e=>{
      e.preventDefault();
      this.cancelGoal(); this.velocity=[0,0];
      const scale=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1;
      const delta=clamp(e.deltaY*scale,-180,180);
      this.zoom(Math.exp(delta*.0016),false);
      this.onInteraction('zoom');
    }, {passive:false});
    canvas.addEventListener('contextmenu', e=>e.preventDefault());
    window.addEventListener('blur', ()=>this.cancelGesture());
  }
  pose(){return {yaw:this.yaw,pitch:this.pitch,distance:this.distance,target:[...this.target]};}
  cancelGoal(){if(this.goal){this.goal=null;this.desired=this.pose();}}
  pointerDown(e){
    if(e.button>2) return;
    this.cancelGoal(); this.velocity=[0,0]; this.lastMove=performance.now();
    this.touchPoints.set(e.pointerId,[e.clientX,e.clientY]);
    try{this.canvas.setPointerCapture(e.pointerId);}catch{}
    this.dragging=true; this.pointerMove=0;
    this.canvas.classList.add('interacting');
    this.onInteraction(e.button===2||e.shiftKey?'pan':'orbit');
  }
  pointerMoveEvent(e){
    const old=this.touchPoints.get(e.pointerId); if(!old)return;
    const now=performance.now(), dt=clamp((now-this.lastMove)/1000,.008,.08);
    const dx=e.clientX-old[0],dy=e.clientY-old[1];
    this.pointerMove+=Math.abs(dx)+Math.abs(dy);
    if(this.touchPoints.size>=2){
      const other=[...this.touchPoints.entries()].find(([id])=>id!==e.pointerId)?.[1];
      if(other){
        const previous=Math.hypot(old[0]-other[0],old[1]-other[1]);
        const next=Math.hypot(e.clientX-other[0],e.clientY-other[1]);
        if(previous>8&&next>8)this.desired.distance=clamp(this.desired.distance*previous/next,13,78);
        this.pan(dx*.5,dy*.5);
      }
      this.velocity=[0,0];
    }else if(e.buttons===2||e.shiftKey){
      this.pan(dx,dy); this.velocity=[0,0];
    }else{
      const scale=e.pointerType==='touch'?.0043:.0038;
      this.desired.yaw-=dx*scale;
      this.desired.pitch=clamp(this.desired.pitch+dy*scale,.025,1.54);
      this.velocity=[mix(this.velocity[0],clamp(-dx*scale/dt,-2,2),.5),mix(this.velocity[1],clamp(dy*scale/dt,-2,2),.5)];
    }
    this.touchPoints.set(e.pointerId,[e.clientX,e.clientY]);this.lastMove=now;
  }
  pointerEnd(e,cancel=false){
    if(!this.touchPoints.has(e.pointerId))return;
    this.touchPoints.delete(e.pointerId);
    try{if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);}catch{}
    if(cancel||this.touchPoints.size||performance.now()-this.lastMove>90||this.reduced)this.velocity=[0,0];
    this.dragging=this.touchPoints.size>0;
    if(!this.dragging)this.canvas.classList.remove('interacting');
  }
  cancelGesture(){
    for(const id of [...this.touchPoints.keys()]){try{this.canvas.releasePointerCapture(id);}catch{}}
    this.touchPoints.clear();this.dragging=false;this.velocity=[0,0];this.canvas.classList.remove('interacting');
  }
  pan(dx,dy){
    const s=this.desired.distance/Math.max(350,this.canvas.clientHeight)*.60;
    const right=[Math.cos(this.yaw),0,-Math.sin(this.yaw)];
    const up=[-Math.sin(this.yaw)*Math.sin(this.pitch),Math.cos(this.pitch),-Math.cos(this.yaw)*Math.sin(this.pitch)];
    this.desired.target=V.add(this.desired.target,V.add(V.mul(right,-dx*s),V.mul(up,dy*s)));
    this.desired.target=this.desired.target.map((v,i)=>clamp(v,...[[-11,11],[-.2,8],[-9,9]][i]));
  }
  zoom(factor,notify=true){
    this.cancelGoal();this.velocity=[0,0];
    this.desired.distance=clamp(this.desired.distance*factor,13,78);
    if(notify)this.onInteraction('zoom');
  }
  transition(to,immediate=false,duration=.82){
    this.cancelGesture();this.velocity=[0,0];
    const from=this.pose();
    to={...to,target:[...to.target]};
    to.yaw=from.yaw+Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw));
    this.desired=to;
    if(immediate||this.reduced){this.yaw=to.yaw;this.pitch=to.pitch;this.distance=to.distance;this.target=[...to.target];this.goal=null;return;}
    this.goal={from,to,elapsed:0,duration};
  }
  preset(type,world,immediate=false){
    const base=world.camera||{distance:34,target:[0,2.1,0],yaw:.66,pitch:.5};
    const to={yaw:base.yaw??.66,pitch:base.pitch??.5,distance:base.distance??34,target:[...(base.target||[0,2.1,0])]};
    if(type==='side'){to.yaw=0;to.pitch=.075;to.target[1]=(base.target?.[1]??2.1)+.8;}
    if(type==='top'){to.yaw=0;to.pitch=1.54;}
    this.transition(to,immediate);
  }
  focusAt(point){this.transition({yaw:this.yaw,pitch:Math.max(.34,this.pitch),distance:21,target:[point[0],point[1]+1.8,point[2]]},false,1.0);}
  get moving(){
    return this.dragging||!!this.goal||Math.hypot(...this.velocity)>.002||Math.abs(this.yaw-this.desired.yaw)+Math.abs(this.pitch-this.desired.pitch)+Math.abs(this.distance-this.desired.distance)+V.len(V.sub(this.target,this.desired.target))>.0001;
  }
  update(aspect,dt){
    dt=clamp(dt,0,.5);
    const before=this.pose();
    if(this.goal){
      const g=this.goal;g.elapsed+=dt;const u=clamp(g.elapsed/g.duration),q=u*u*u*(u*(u*6-15)+10);
      for(const key of ['yaw','pitch','distance'])this[key]=mix(g.from[key],g.to[key],q);
      this.target=V.lerp(g.from.target,g.to.target,q);
      if(u>=1)this.goal=null;
    }else{
      if(!this.dragging&&!this.reduced){
        const d=Math.exp(-dt*10),integral=(1-d)/10;
        this.desired.yaw+=this.velocity[0]*integral;
        this.desired.pitch=clamp(this.desired.pitch+this.velocity[1]*integral,.025,1.54);
        this.velocity=this.velocity.map(v=>Math.abs(v*d)<.002?0:v*d);
      }
      const q=this.reduced?1:1-Math.exp(-dt*(this.dragging?32:18));
      for(const key of ['yaw','pitch','distance']){this[key]=mix(this[key],this.desired[key],q);if(Math.abs(this[key]-this.desired[key])<.00005)this[key]=this.desired[key];}
      this.target=V.lerp(this.target,this.desired.target,q);
      if(V.len(V.sub(this.target,this.desired.target))<.00005)this.target=[...this.desired.target];
    }
    const d=this.distance*Math.max(1,1.16/Math.max(.1,aspect));
    this.eye=V.add(this.target,[d*Math.sin(this.yaw)*Math.cos(this.pitch),d*Math.sin(this.pitch),d*Math.cos(this.yaw)*Math.cos(this.pitch)]);
    this.forward=V.norm(V.sub(this.target,this.eye));this.view=M.look(this.eye,this.target);
    this.vp=M.mul(M.perspective(this.fov,aspect,.1,250),this.view);
    return ['yaw','pitch','distance'].some(k=>Math.abs(before[k]-this[k])>.000001)||V.len(V.sub(before.target,this.target))>.000001;
  }
  project(p,w,h){const n=M.point(this.vp,p);return{x:(n[0]*.5+.5)*w,y:(-n[1]*.5+.5)*h,visible:n[2]>-1&&n[2]<1&&Math.abs(n[0])<1.1&&Math.abs(n[1])<1.1};}
}


/* MODULE: landscape.js */
/* A fictional, procedurally sculpted catchment. All coordinates are schematic.
   One terrain is shared by every lesson; no image backdrop or network assets. */
const TOWNS=[{id:'yunling',name:'云岭市',en:'YUNLING',x:-6.4,z:4.1},{id:'qingshan',name:'青山镇',en:'QINGSHAN',x:.65,z:4.55},{id:'hubin',name:'湖滨市',en:'HUBIN',x:7.65,z:5.6}];
function ridgeNoise(x,z){let a=.54,s=0;for(let i=0;i<4;i++){let n=1-Math.abs(noise(x,z)*2-1);s+=n*n*a;x=x*2.03+23;z=z*2.03-13;a*=.39;}return s;}
function makeAtlasTerrain(){
 const river=x=>1.05+1.05*Math.sin(x*.49)+.29*Math.sin(x*1.53),coast=z=>10.9+1.25*Math.sin(z*.56)+.3*Math.sin(z*2.1);
 function raw(x,z){let f=fbm(x*.64+31,z*.64+18,5),r=ridgeNoise(x*.46+3,z*.46+7);
  let e=4.4*Math.exp(-((x+8.0)**2/18+(z+4.1)**2/7)) + 3.25*Math.exp(-((x+.2)**2/12+(z+5.6)**2/5)) + 4.35*Math.exp(-((x-7.6)**2/12+(z+3.9)**2/10))+1.1*Math.exp(-((x+10)**2/6+(z-5.3)**2/6));
  let h=.43+f*.48+e*(.33+r*1.26);let valley=1-smooth(.4,2.0,Math.abs(z-river(x)));h=mix(h,.46+f*.10,valley*.72);
  // Reservoir with an irregular shoreline and drowned tributary valleys.
  let lx=(x-5.25)/2.25,lz=(z-2.5)/1.48;let lake=Math.sqrt(lx*lx+lz*lz)+(noise(x*1.5,z*1.5)-.5)*.32;
  h-= (1-smooth(.79,1.14,lake))*.92;
  h-=smooth(coast(z)-.9,coast(z)+.65,x)*1.42;
  let channel=Math.abs(z-river(x));h-=Math.exp(-Math.pow(channel/(.065+.026*(x+12)/24),2))*.6*smooth(-11,-8,x);
  // Tributary coming down the foothills into the reservoir.
  let tx=4.75+.57*Math.sin(z*1.35),td=Math.abs(x-tx);if(z<2.4&&z>-3.0)h-=Math.exp(-Math.pow(td/.05,2))*.35;
  return h;
 }
 function height(x,z){let h=raw(x,z);for(let t of TOWNS){let d=Math.hypot((x-t.x)*1.0,(z-t.z)*1.2);let v=1-smooth(.65,1.32,d);h=mix(h,.67,v*.94);}return h;}
 function colorAt(x,z,h){let small=noise(x*19,z*19),f=fbm(x*2.7,z*2.7,3);let dx=height(x+.035,z)-h,dz=height(x,z+.035)-h;let steep=clamp(Math.hypot(dx,dz)/.065);let c=tint('#325944','#748761',.20+f*.55);
  if(h<.36)c=tint('#405859','#a4ac80',smooth(.05,.37,h));
  if(h>.82)c=tint(c,'#415c48',clamp((h-.8)*.45));
  if(steep>.34)c=tint(c,'#99968a',smooth(.30,1.2,steep)*.8);
  if(h>3.9)c=tint(c,'#d3dfe0',smooth(3.9,4.9,h+f*.48)*.72);
  // Irrigated fields only on the flatter valley floor.
  if(z>-.1&&z<7.2&&x>-8.1&&x<9.5&&h>.4&&h<.96&&steep<.3){let u=x*1.8+z*.12,v=z*2.25-x*.05;let fcolor=hash(Math.floor(u),Math.floor(v));c=tint('#56734d','#a0aa69',fcolor*.77);let border=Math.min(fract(u),fract(v));if(border<.065)c=V.mul(c,.56);let rows=.5+.5*Math.sin((fcolor>.5?u:v)*90.);c=V.mul(c,.88+rows*.1);for(let t of TOWNS)if(Math.hypot(x-t.x,z-t.z)<1.05)c=tint('#697773','#a4a795',f*.6);}
  return V.mul(c,.88+small*.22);
 }
 return {height,colorAt,river,coast};
}
function denseTerrain(spec){let nx=352,nz=240,b=new Builder(),hs=new Float32Array((nx+1)*(nz+1));for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)hs[j*(nx+1)+i]=spec.height(-12+24*i/nx,-8+16*j/nz);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){let x=-12+24*i/nx,z=-8+16*j/nz,h=hs[j*(nx+1)+i],dx=hs[j*(nx+1)+Math.min(nx,i+1)]-hs[j*(nx+1)+Math.max(0,i-1)],dz=hs[Math.min(nz,j+1)*(nx+1)+i]-hs[Math.max(0,j-1)*(nx+1)+i];b.vertex([x,h,z],V.norm([-dx/(24/nx*(i===0||i===nx?1:2)),1,-dz/(16/nz*(j===0||j===nz?1:2))]),spec.colorAt(x,z,h),[i/nx,j/nz]);}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i,bb=a+1,c=a+nx+1,d=c+1;b.i.push(a,c,bb,bb,c,d);}return b.build();}
function atlasWalls(spec,cut=false){let b=new Builder();let paths=cut?[pathPoints(t=>[-12+24*t,0,0],240)]:[pathPoints(t=>[-12+24*t,0,8],240),pathPoints(t=>[12,0,8-16*t],160),pathPoints(t=>[12-24*t,0,-8],240),pathPoints(t=>[-12,0,-8+16*t],160)];
 for(let path of paths)for(let i=0;i<path.length-1;i++){let a=path[i],c=path[i+1];for(let k=0;k<9;k++){let y0=-1.38+(k/9)*(Math.max(.25,spec.height(a[0],a[2]))+1.38),y1=-1.38+((k+1)/9)*(Math.max(.25,spec.height(a[0],a[2]))+1.38);let z0=-1.38+(k/9)*(Math.max(.25,spec.height(c[0],c[2]))+1.38),z1=-1.38+((k+1)/9)*(Math.max(.25,spec.height(c[0],c[2]))+1.38);let colr=['#293138','#3d3b35','#454238','#65604e','#504d40','#686450','#74725d','#555f49','#485d42'][k];b.quad([a[0],y0,a[2]],[c[0],z0,c[2]],[c[0],z1,c[2]],[a[0],y1,a[2]],colr);}}
 return b.build();}
function atlasForest(spec){const b=new Builder(),r=rng(8363),pine=cylinderGeometry([0,.01,0],[0,.28,0],.07,'#395f4d',6,0),pine2=cylinderGeometry([0,.12,0],[0,.4,0],.052,'#507761',6,0),trunk=cylinderGeometry([0,0,0],[0,.19,0],.011,'#6a6050',4),leaf=sphereGeometry(.083,'#51724e',6,4);
 for(let i=0;i<9400;i++){let x=(r()-.5)*23.8,z=(r()-.5)*15.8,h=spec.height(x,z),f=fbm(x*.85,z*.85,3);if(h<.44||h>4.5)continue;if(TOWNS.some(t=>Math.hypot(t.x-x,t.z-z)<1.30))continue;if(z>-.6&&z<7&&x>-8&&x<9&&h<1.05&&r()>.04)continue;if(f<.37||r()>.68)continue;let s=.45+r()*.7;let m=M.compose([x,h-.015,z],[0,r()*TAU,0],[s,s*(.8+r()*.5),s]);b.append(trunk,m);if(h>1.15||r()>.3){b.append(pine,m,tint('#264d40','#55734c',r()));b.append(pine2,m,tint('#3b624a','#6a8759',r()));}else b.append(leaf,M.compose([x,h+.15*s,z],[0,0,0],[s,s*1.3,s]),tint('#456545','#7b8957',r()));}
 return b.build();}
function createAtlasLandscape(){const w=new World('atlas-base'),spec=makeAtlasTerrain();w.terrain=spec;w.ambient=.56;
 w.mesh(denseTerrain(spec),{mode:1});w.mesh(atlasWalls(spec),{mode:3});let cut=w.mesh(atlasWalls(spec,true),{mode:3},'cut');cut.cuttable=false;cut.castShadow=false;
 addBox(w,[0,-1.51,0],[24.20,.24,16.20],'#152632');
 addLine(w,[[-12.12,-1.36,-8.12],[-12.12,-1.36,8.12],[12.12,-1.36,8.12],[12.12,-1.36,-8.12],[-12.12,-1.36,-8.12]],'#53767a',.018,.8);
 for(let x of [-12.1,12.1])for(let z of [-8.1,8.1]){addLine(w,[[x,-1.37,z-Math.sign(z)*1.2],[x,-1.37,z],[x-Math.sign(x)*1.2,-1.37,z]],'#75c9d0',.025,.9);}
 const water=w.mesh(paramSurface(190,128,(u,v)=>[-12+u*24,.255,-8+v*16],'#246b83'),{mode:2,opacity:.98,wave:.010},'water');water.castShadow=false;
 w.mesh(atlasForest(spec));const houses=new Builder(),roadmesh=new Builder(),details=new Builder(),r=rng(9034);w.cars=[];
 for(let ti=0;ti<3;ti++){const t=TOWNS[ti],blocks=ti===1?9:13;
  for(let i=0;i<blocks;i++)for(let j=0;j<blocks;j++){let x=t.x+(i-(blocks-1)/2)*.118,z=t.z+(j-(blocks-1)/2)*.135;if(r()<.17||i%4===0||j%5===0)continue;let y=spec.height(x,z),height=.08+r()*.19;if(ti!==1&&Math.hypot(x-t.x,z-t.z)<.37)height=.30+r()*.65;let size=.072+r()*.024;houses.append(boxGeometry(size,height,size*.9,tint('#9caaa3','#e7dfcb',r())),M.translate([x,y+height/2,z]));if(height>.3){houses.append(boxGeometry(size*1.04,.023,size*.94,'#8b9ba1'),M.translate([x,y+height,z]));let n=Math.floor(height/.055);for(let k=1;k<n;k++)houses.quad([x-size/2-.001,y+k*.055,z-size*.36],[x-size/2-.001,y+k*.055,z+size*.36],[x-size/2-.001,y+k*.055+.012,z+size*.36],[x-size/2-.001,y+k*.055+.012,z-size*.36],'#5e7986');}else{houses.append(cylinderGeometry([0,0,0],[0,.043,0],size*.80,'#797267',4,0),M.translate([x,y+height,z]));}}
  for(let i=-2;i<=2;i++){let pts=pathPoints(u=>{let x=t.x+(u-.5)*1.75,z=t.z+i*.29;return[x,spec.height(x,z)+.023,z]},48);roadmesh.append(tubeGeometry(pts,.024,'#b0b3a1',4));let p2=pathPoints(u=>{let x=t.x+i*.31,z=t.z+(u-.5)*1.75;return[x,spec.height(x,z)+.024,z]},48);roadmesh.append(tubeGeometry(p2,.02,'#a8aa9b',4));}
  // Observatory: pedestal, instrument mast and open ring.
  let px=t.x+.21,pz=t.z-.91,py=spec.height(px,pz);details.append(cylinderGeometry([px,py,pz],[px,py+.55,pz],.022,'#b5c4c4',8));details.append(boxGeometry(.17,.12,.14,'#dfe6dd'),M.translate([px,py+.39,pz]));details.append(ringGeometry(.18,.195,'#75d9ee','xz',32),M.translate([t.x,.82,t.z]));
 }
 // The road follows the valley edge and bridges the river at two crossings.
 const highway=pathPoints(u=>{let x=-11.7+u*23.4,z=3.8+.20*Math.sin(x*.6)+.08*Math.sin(x*2);return[x,Math.max(.32,spec.height(x,z))+.036,z]},270);roadmesh.append(tubeGeometry(highway,.055,'#616c68',5));roadmesh.append(tubeGeometry(highway.map(p=>[p[0],p[1]+.021,p[2]]),.007,'#d5ceb0',4));
 for(let k=0;k<5;k++){let mesh=new Mesh(boxGeometry(.07,.035,.038,k%2?'#dbddd6':'#dbba8d'),{});w.meshes.push(mesh);w.cars.push({m:mesh,path:highway,phase:k/5});}
 w.mesh(houses.build());w.mesh(roadmesh.build());w.mesh(details.build());
 // A handful of rocks provide shoreline scale; silhouettes are batched.
 const rocks=new Builder(),rock=sphereGeometry(1,'#899489',5,3);for(let i=0;i<340;i++){let x=(r()-.5)*23.7,z=(r()-.5)*15.7,h=spec.height(x,z);if(h<.31||h<1.7&&r()<.9)continue;let s=.025+r()*.064;rocks.append(rock,M.compose([x,h,z],[r(),r(),r()],[s*1.6,s,s]),tint('#56685c','#b2b4a2',r()));}w.mesh(rocks.build());
 const ticks=new Builder();for(let x=-12;x<=12;x+=1){ticks.append(cylinderGeometry([x,-1.34,8.12],[x,-1.34,8.12+(x%4===0?.28:.14)],.01,'#a3bfba',4));}w.mesh(ticks.build(),{unlit:1,opacity:.7});
 addStage(w);w.camera={distance:36,target:[0,3.1,0],yaw:.42,pitch:.43};return w;
}
function makeHeightTexture(renderer,spec){const c=document.createElement('canvas');c.width=256;c.height=192;const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);for(let j=0;j<c.height;j++)for(let i=0;i<c.width;i++){let h=clamp((spec.height(-12+24*i/(c.width-1),8-16*j/(c.height-1))+2)/12)*255,k=(j*c.width+i)*4;im.data[k]=Math.floor(h);im.data[k+1]=Math.round(fract(h)*255);im.data[k+2]=0;im.data[k+3]=255;}ctx.putImageData(im,0,0);return renderer.texture(c);}
/* A broad, smoothed clearance surface guides the illustrative airflow. It is
   deliberately not a resolved orographic wind solver. */
function makeAirHeight(renderer,spec){const nx=64,nz=48;let a=new Float32Array(nx*nz);for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)a[z*nx+x]=Math.max(.25,spec.height(-12+24*x/(nx-1),-8+16*z/(nz-1)));
 for(let pass=0;pass<4;pass++){let out=new Float32Array(a.length);for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){let sum=0,wgt=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){let w=(dx===0?2:1)*(dz===0?2:1);sum+=a[clamp(z+dz,0,nz-1)*nx+clamp(x+dx,0,nx-1)]*w;wgt+=w;}out[z*nx+x]=sum/wgt;}a=out;}
 const sample=(x,z)=>{let xx=clamp((x+12)/24*(nx-1),0,nx-1),zz=clamp((z+8)/16*(nz-1),0,nz-1),i=Math.floor(xx),j=Math.floor(zz);return mix(mix(a[j*nx+i],a[j*nx+Math.min(nx-1,i+1)],fract(xx)),mix(a[Math.min(nz-1,j+1)*nx+i],a[Math.min(nz-1,j+1)*nx+Math.min(nx-1,i+1)],fract(xx)),fract(zz));};
 let c=document.createElement('canvas');c.width=nx;c.height=nz;let ctx=c.getContext('2d'),im=ctx.createImageData(nx,nz);for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){let h=clamp((a[(nz-1-z)*nx+x]+2)/12)*255,k=(z*nx+x)*4;im.data[k]=Math.floor(h);im.data[k+1]=Math.round(fract(h)*255);im.data[k+3]=255;}ctx.putImageData(im,0,0);return{sample,texture:renderer.texture(c)};
}


/* MODULE: model.js */
/* Shared conceptual model. Visuals and station plots read the same functions.
   No numerical weather prediction or real observational data is implied. */
const DEFAULTS={delta:16,speed:40,humidity:78,instability:76,slope:80};
const PRESETS={air:{delta:16,speed:40,humidity:45,instability:20,slope:100},cold:{...DEFAULTS},warm:{delta:10,speed:22,humidity:82,instability:25,slope:220},stationary:{delta:12,speed:0,humidity:88,instability:40,slope:160},occluded:{delta:16,speed:35,humidity:85,instability:55,slope:95},cyclone:{delta:15,speed:30,humidity:80,instability:60,slope:100}};
const sigmoid=x=>1/(1+Math.exp(-clamp(x,-25,25)));
const frontBend=z=>.2*Math.sin(z*.6)+.035*z;
function frontX(type,p){return type==='stationary'?Math.sin(p*TAU)*.34:type==='air'?0:type==='occluded'?-7+12*p:-16+32*p;}
function modelAtmosphere(type,p,params){let moist=smooth(38,90,params.humidity),unst=clamp(params.instability/100),isAir=type==='air';return{moist,unst,cloud:isAir?.04:moist*(.58+.42*unst),rain:isAir?0:moist*(type==='warm'?.35+.3*unst:.28+.72*unst),thunder:!isAir&&params.humidity>60&&params.instability>50?moist*unst:0};}
function observation(type,p,params,town){let fx=frontX(type,p)+frontBend(town.z),d=fx-town.x,post=sigmoid(d/.58),warm=26,cold=warm-params.delta,a=modelAtmosphere(type,p,params);let temperature,pressure,rain,windDir,windSpeed;const hill=.04*Math.max(0,town.z);
 if(type==='warm'){temperature=mix(cold,warm,post);pressure=1017-7*post-1.1*Math.exp(-d*d/5);rain=a.rain*14*Math.exp(-Math.pow((d+2.45)/2.65,2));windDir=mix(115,215,post);}
 else if(type==='stationary'){temperature=mix(warm,cold,sigmoid(d/.55));pressure=1010+Math.sin(p*TAU)*.6;rain=a.rain*14*Math.exp(-Math.pow(d/2.8,2))*(.78+.22*Math.sin(p*TAU*2));windDir=d>0?70:230;}
 else if(type==='occluded'){let raised=smooth(.38,.79,p),ahead=warm-params.delta*.5;let gap=Math.max(0,6.2*(1-smooth(.03,.77,p))),inWarm=sigmoid(-d/.40)*sigmoid((d+gap)/.40)*(1-raised);temperature=mix(mix(ahead,cold,post),warm,inWarm);pressure=1013-6*Math.exp(-Math.pow(d/3.0,2))+3*post;rain=a.rain*19*Math.exp(-Math.pow((d+.3)/2.8,2));windDir=mix(120,300,post);}
 else if(type==='cyclone'){let wave=Math.sin(p*Math.PI),near=Math.exp(-((town.x+1)**2+(town.z+1)**2)/60);temperature=warm-params.delta*(.35+.36*Math.sin(p*TAU-town.x*.18));pressure=1016-near*15*wave;rain=a.rain*22*wave*Math.exp(-Math.pow(Math.sin(p*TAU-town.x*.15),2)*2);windDir=(220+p*160+town.x*5)%360;}
 else{temperature=mix(warm,cold,post);pressure=1011-3.5*Math.exp(-Math.pow((d+.8)/2,2))+5*post;rain=a.rain*31*Math.exp(-Math.pow((d-.65)/1.24,2));windDir=mix(220,315,post);}
 if(type==='air'){temperature=d>0?cold:warm;pressure=1013;rain=0;}
 temperature-=hill;windSpeed=3.5+params.speed*.065+Math.min(8,rain*.3);let thunder=rain>4&&a.thunder>.25;let weather=rain>.25?(thunder?'阵雨 · 雷暴':rain>8?'明显降水':'连续性降水'):(a.cloud<.08?'少云 · 干燥':d>3&&type==='cold'?'云量减少':'晴到多云');
 return{temperature,pressure,rain,windDir,windSpeed,weather,thunder,d,post};}
function compassName(deg){return['北','东北','东','东南','南','西南','西','西北'][Math.round(deg/45)%8]+'风';}
function phaseIndex(p){return p<.23?0:p<.43?1:p<.63?2:p<.83?3:4;}


/* MODULE: content.js */
/* Original teaching prose; references are linked, never copied as a textbook. */
const SOURCES=[
 {name:'UCAR · Weather Fronts',url:'https://scied.ucar.edu/learning-zone/how-weather-works/weather-fronts',use:'四种锋面、符号、典型云系与过境变化'},
 {name:'NWS · Fronts, Pressure & Precipitation',url:'https://www.weather.gov/lmk/basic-fronts',use:'剖面结构、冷侧降水、水汽与不稳定度的前提'},
 {name:'UCAR · Air Masses',url:'https://scied.ucar.edu/learning-zone/how-weather-works/air-masses',use:'源地、温度、湿度与气团变性'},
 {name:'UBC ATSC 113 · Frontal Hazards',url:'https://www.eoas.ubc.ca/courses/atsc113/flying/met_concepts/03-met_concepts/03h-frontal_hazards/index.html',use:'冷式与暖式锢囚、三类空气与锋面天气'},
 {name:'NWS · Thunderstorm Electrification',url:'https://www.weather.gov/safety/lightning-science-electrification',use:'冰晶、霰的碰撞与雷暴电荷分离'},
 {name:'Roland Stull · Practical Meteorology',url:'https://www.eoas.ubc.ca/books/Practical_Meteorology/',use:'完整教材入口：第 12 章气团与锋面、第 13 章温带气旋、第 14 章雷暴。教材为 CC BY-NC-SA 4.0，未打包转载。'}
];
const LESSONS={
 air:{title:'气团与锋面',en:'AIR MASSES',no:'01',short:'先认识空气，再认识天气。',headline:'冷与暖，是相对的。',sub:'一张锋面，连接两种不同性质的空气。',color:'#65cee3',icon:'layers',
  points:['气团内部，温度与湿度等性质相对均一。','同压下，较冷空气通常密度更大。','“冷暖”与“干湿”是两组独立属性。'],
  phases:[['比较气团','观察同一高度的冷、暖空气。'],['识别界面','锋面是一个三维过渡带，而不是一堵墙。'],['接触地面','锋面与地面的交线，才是天气图上的锋线。'],['水汽差异','海洋性常较湿，大陆性常较干。'],['开始探索','切到冷锋或暖锋，观察哪一侧空气在推进。']],
  sections:[['气团从哪里来','空气长时间停留在广阔、相对均匀的下垫面上，会获得源地的温湿特征。气团移动后，仍会与新的地表交换热量与水汽，发生变性。源地不是永久标签。'],['两条分类轴','按热力性质可说冷气团、暖气团；按水汽源地可分海洋性、大陆性。海洋极地气团可能冷而湿，大陆热带气团可能暖而干，所以不能把蓝色一律解释成“干”、红色一律解释成“湿”。'],['锋面不是锋线','真实锋区有厚度，界面随高度倾斜。画面半透明曲面代表理想化锋面；贴在地表的符号代表锋线。剖面夸大垂直尺度，以便看清暖空气上滑。'],['为什么冷空气在下方','在气压相近的比较中，低温通常意味着密度较大，较冷空气易居于较低位置。湿度也影响密度；真实大气的运动还受压强梯度、地转偏向力、摩擦等作用。']],
  caution:'冷气团不一定干，暖气团不一定湿；蓝、红仅编码相对温度。',sources:[2,1],experiment:'比较低湿与高湿：温差不变，云雨会一样吗？'},
 cold:{title:'冷锋',en:'COLD FRONT',no:'02',short:'冷空气主动推进，暖空气被迫抬升。',headline:'冷空气向前，暖空气向上。',sub:'沿着蓝色锋线，观察一场天气如何经过城镇。',color:'#60b9ff',icon:'cold',
  points:['冷空气从下方楔入，抬升前方暖空气。','典型降水集中于锋面附近及锋后冷侧。','过境后常降温、气压回升，风向改变。'],
  phases:[['锋前暖区','暖气团控制地面；气压可能缓慢下降。'],['锋面接近','暖空气受迫抬升，云逐渐发展。'],['冷锋过境','地面降温、风向转变；湿且不稳定时出现阵雨或雷暴。'],['锋后冷区','冷气团接管地面，气压回升，降水逐渐减弱。'],['过境之后','本例转为凉爽少云；真实天气不一定立即放晴。']],
  sections:[['机制：谁在主动推进','冷锋按地面冷空气替代暖空气来识别，不按绝对气温来识别。密度较大的冷空气从下方推进，暖空气在交界附近抬升。与典型暖锋相比，冷锋坡度较陡、变化较快。'],['从上升到云和降水','上升空气因气压降低而膨胀冷却，达到饱和后凝结。水汽、抬升和不稳定度共同决定云雨。水汽不足时可只见降温与风向变化；湿度较大又不稳定时，更容易出现积雨云、阵性强降水与雷暴。'],['雨究竟下在哪里','高中常用模型将冷锋雨区画在锋面附近及锋后冷侧，较暖锋窄。本场景表现这一典型结构。但高空锋、锋前飑线与不同动力条件也会造成锋前降水，不能把“只在锋后”当成定义。'],['一次过境如何识别','对固定地面站，典型顺序是温暖 → 云增多与气压下降 → 风向转变、降温、可能阵雨 → 冷空气控制、气压回升。这里以北半球中纬度示例绘制风向；方向不是全球通用常数。'],['雷电不是冷暖空气摩擦','强对流云中，冰晶与霰等粒子碰撞，配合上升与下降运动形成电荷分离。放电可以在云内、云间或云地发生。此处的分叉闪电仅用于提示雷暴活跃，不能由地面温差单独推算。']],
  caution:'冷锋不必然伴随雷暴；“窄、强、锋后”是典型教学模型，不是所有冷锋的定律。',sources:[0,1,4],experiment:'把湿度调到 35%，保留温差：蓝色锋线仍在，但雨和雷电会减弱。'},
 warm:{title:'暖锋',en:'WARM FRONT',no:'03',short:'暖空气沿退却的冷空气缓缓上滑。',headline:'冷空气退却，暖空气沿锋面上滑。',sub:'先看到高云，再等到低云与持续降水。',color:'#ff9f7b',icon:'warm',
  points:['地面冷空气退却，暖空气逐渐取代它。','暖空气沿较缓的锋面上滑。','典型层状云与较宽雨区位于锋前冷侧。'],
  phases:[['锋前冷区','近地面仍由冷空气控制，高云可能先到。'],['锋前云雨','云逐渐加厚、降低；冷区可能已有持续降水。'],['暖锋过境','近地面转暖，气压下降后趋于平稳，风向改变。'],['进入暖区','暖空气替代冷空气，本例降水逐渐减弱。'],['暖区控制','气温维持较高；真实天气可能有嵌入对流。']],
  sections:[['地面暖空气的前缘','暖锋的判断依据是较暖空气替代较冷空气。冷空气需要退却，暖空气才能在地面前进。半透明红色斜面向锋前冷区上方伸展。'],['为什么云从远处到来','缓坡使暖空气的抬升分布在更宽的水平区域。典型接近过程可表现为卷云、卷层云、高层云到雨层云，云底逐渐降低。此顺序并非每次都完整出现。'],['比较两种雨区','典型暖锋降水在锋前冷侧较广、较持久。与冷锋相比，地面站可能在锋线到达前较久就进入云雨区。若空气不稳定，暖锋附近也可能出现雷暴，不应把它等同于永远温和的细雨。'],['观测曲线怎么读','本例地面气温由较低变较高；气压接近时下降，过境后趋于平稳。露点、风向与云底同样有判断价值。画面只画温度与气压双轴，不将风向角度混进同一数值坐标。']],
  caution:'暖锋也可能包含对流天气；“缓坡、锋前、持续”描述的是常见结构。',sources:[0,1,3],experiment:'切换剖面观察，再与冷锋比较：雨区距离锋线有多远？'},
 stationary:{title:'准静止锋',en:'STATIONARY FRONT',no:'04',short:'锋线停留，空气和云雨并没有停止。',headline:'边界几乎不动，天气却一直发生。',sub:'红蓝符号分居两侧，提示冷暖空气相持。',color:'#baacff',icon:'stationary',
  points:['锋线移动很慢，常在一带徘徊。','空气仍可沿锋面运动、上滑、凝结。','水汽充足时，云雨可能持续较久。'],
  phases:[['冷暖相遇','两侧空气形成明显性质差异。'],['锋线徘徊','无一方持续取代另一方，锋线移动缓慢。'],['持续上滑','暖湿空气仍能抬升，形成云与降水。'],['雨区滞留','持续补充水汽时，同一区域可能反复降水。'],['继续观察','本例锋线仍在徘徊；真实环流改变后，锋面可能移动或消散。']],
  sections:[['准静止不等于静止','它描述的是地面锋线位置变化小，并不意味着风速为零、没有垂直运动。两侧沿锋线的风，仍可持续输送水汽。'],['符号为何两边都有','蓝色三角与红色半圆交替出现，分居锋线两侧，分别朝向较暖与较冷空气。本网站将这一差异同时画在左侧图例和俯视场景里。'],['持续降水需要条件','滞留的抬升区加上持续水汽供应，可能带来较长时间云雨；水汽不足则不会凭空持续下大雨。因此湿度滑块仍有效，而“锋面移动速度”在此模式禁用。'],['从模型到现实','本例突出滞留锋线与持续运动的空气。真实锋区并非一条笔直的线，云雨的位置、强度与持续时间还取决于具体水汽、抬升和天气系统演变。不要把固定湿度下的动画当成区域降水预报。']],
  caution:'准静止指锋线移动缓慢，并不代表空气停止流动；本模型不预报梅雨或洪水。',sources:[0,1],experiment:'观察同一座城镇：锋线几乎不动，云雨与气流仍持续演变。'},
 occluded:{title:'锢囚锋',en:'OCCLUDED FRONT',no:'05',short:'冷锋追上暖锋，最暖空气被抬离地面。',headline:'两股冷空气相遇，暖区被举向天空。',sub:'不只是两种颜色：这里有冷、较冷和最暖三种空气。',color:'#bba0ff',icon:'occluded',
  points:['较快冷锋追及前方暖锋。','夹在中间的暖空气逐渐离开地面。','紫色三角与半圆位于同一侧。'],
  phases:[['两锋相邻','中间仍有接触地面的暖区。'],['冷锋追赶','后方冷空气推进，暖区逐渐变窄。'],['开始锢囚','两侧冷空气接近，暖空气不断被抬起。'],['暖区离地','地面暖区消失，暖空气在高处延伸。'],['锢囚形成','层状云和对流云可能并存；地面温度变化取决于两侧冷空气。']],
  sections:[['三种空气，不是两种','后方冷锋、前方暖锋与夹在中间的暖区一起演变。冷锋追及暖锋后，最暖的空气离开地面。因此紫色锋线并不表示一种“紫色气团”。'],['冷式锢囚','本 3D 场景采用冷式锢囚示例：后方空气比前方冷空气更冷，从下方楔入，同时抬升中间的暖空气。拖动时间轴，观察接地暖区如何收窄并抬高。'],['暖式锢囚','若前方空气更冷，后来的较冷空气会爬升到更冷空气之上，形成暖式锢囚。这一分支在知识说明中解释；当前场景不把两者混为同一几何结构。'],['天气与温度并不唯一','锢囚锋可兼有层状云降水与嵌入的对流天气。过境后的地面温度可能上升，也可能下降，取决于两侧空气，而不是一律骤降。此处曲线对应当前冷式示例。']],
  caution:'3D 动画采用冷式锢囚；暖式锢囚在手册中对照解释。',sources:[0,3],experiment:'从时间轴起点播放：找出暖气团最后接触地面的时刻。'},
 cyclone:{title:'锋面气旋',en:'FRONTAL CYCLONE',no:'06',short:'把局地锋面，放回一整个天气系统。',headline:'一条锋面波，长成旋转的天气系统。',sub:'北半球中纬度的理想化生命周期，不是台风。',color:'#a4dacf',icon:'cyclone',
  points:['地面低压中心与冷、暖锋相连。','北半球近地面气流逆时针辐合。','暖区收窄、发生锢囚，随后系统衰减。'],
  phases:[['锋面波动','冷暖空气交界处出现波动。'],['低压发展','暖空气向冷侧伸展，冷空气向暖侧推进。'],['成熟气旋','冷锋、暖锋与暖区形成清晰结构。'],['锢囚阶段','冷锋追上暖锋，暖区逐渐被抬离地面。'],['逐渐衰减','本理想模型的低压减弱，云系逐渐减少。']],
  sections:[['从锋面看整个低压','局地冷锋和暖锋往往属于同一个温带低压系统。俯视时，可看到冷锋拖向低压南侧、暖锋伸向东侧，二者之间为暖区。真实结构并不总与理想模型一致。'],['北半球的旋转方向','地面低压附近，气流总体逆时针并向内辐合；南半球方向相反。高压附近则相反。地转偏向力本身不使空气从高压直线冲向低压，摩擦等作用影响其跨越等压线。'],['一条典型生命线','网站用连续形变展现初生波动、发展、成熟、锢囚与衰减。它是教学性运动学模型，不以流体方程推演生成，因此不能用于判断真实气旋发展速度与强度。'],['不要与热带气旋混同','锋面气旋依托中纬度冷暖空气的水平温差；成熟热带气旋通常没有这里展示的典型冷、暖锋结构。本节名称是“锋面气旋”，不是台风模拟。']],
  caution:'北半球理想化锋面气旋；不是实时天气图，也不是热带气旋数值模拟。',sources:[1,3,5],experiment:'切换俯视观察，沿锋线找到低压中心，再辨认暖区。'}
};
const COMPARE=[['判断依据','冷空气替代暖空气','暖空气替代冷空气','锋线移动很慢','冷锋追及暖锋'],['典型坡度','较陡','较缓','随具体结构而变','包含抬升的暖空气'],['典型云雨','锋附近及锋后，阵性较常见','锋前冷侧，范围较广','滞留云雨，可持续','层状与对流可并存'],['气温变化','地面通常降低','地面通常升高','两侧不同，站点变化较小','取决于两侧冷空气'],['必要提醒','干冷锋可能没有雨','暖锋也可有雷暴','空气不是静止的','暖空气离开地面']];
const QUESTIONS=[
 {q:'冷气团是否一定是干燥空气？',a:['是，冷空气不能容纳水汽','不是，温度与干湿是不同属性','只有冬天才一定干燥'],correct:1,ex:'海洋性极地气团可以较冷且湿润。气团的源地和移动经历都会改变水汽条件。'},
 {q:'把冷锋的湿度降得很低，哪种结果更合理？',a:['锋线消失','降温与风向变化仍可能发生，但雨少了','闪电一定增多'],correct:1,ex:'锋的定义是空气性质与替代关系，不以是否下雨作为必要条件。'},
 {q:'典型暖锋接近时，主要雨区位于哪里？',a:['锋前冷侧','只在锋后暖侧','完全由风向决定'],correct:0,ex:'暖空气沿缓坡滑升到前方冷空气之上，因此常在地面锋线之前就出现云雨。'},
 {q:'准静止锋中的“静止”主要指什么？',a:['所有空气粒子停止','锋线位置变化小','温度不再变化'],correct:1,ex:'气流、水汽输送、上滑与降水都可以继续。'},
 {q:'锢囚过程中，中间的最暖空气会怎样？',a:['被压进地下','逐渐抬离地面','变成一种紫色气团'],correct:1,ex:'紫色只是锢囚锋的天气图符号；暖空气在高处继续存在。'},
 {q:'北半球地面低压的典型气流是？',a:['顺时针辐散','逆时针辐合','所有空气直接竖直上升'],correct:1,ex:'这是北半球近地面低压的典型结构。南半球的旋转方向相反。'},
 {q:'冷锋雨“只在锋后”是否是严格定义？',a:['是，任何例外都不是冷锋','不是，高空锋与锋前对流可带来锋前雨','只有海上才严格成立'],correct:1,ex:'“锋附近及锋后”是常用教学概括；实际雨区受动力和水汽条件共同影响。'},
 {q:'雷暴中的电荷分离，主要与什么有关？',a:['冷、暖气团互相摩擦','云内冰晶、霰等碰撞及不同运动','气压数值超过某个阈值'],correct:1,ex:'冰相粒子碰撞及上升、下降运动参与电荷分离。闪电不由一个温差滑块直接决定。'}
];


/* MODULE: content-en.js */
/* English edition of the original teaching content. The shared model is unchanged.
 * All six lessons, phases, cautions, comparisons and questions have explicit translations.
 */
const LESSONS_EN = {
  air: {
    ...LESSONS.air, title: 'Air masses & fronts', short: 'Meet the air before you meet the weather.',
    headline: 'Cold and warm are relative.', sub: 'A front connects air with different properties.',
    points: [
      'An air mass has relatively uniform temperature and moisture.',
      'At similar pressure, colder air is usually denser.',
      'Temperature and moisture are two separate properties.'
    ],
    phases: [
      ['Compare air masses', 'Compare the colder and warmer air at the same height.'],
      ['Find the boundary', 'A front is a three-dimensional transition zone, not a solid wall.'],
      ['Meet the surface', 'The line where the frontal surface meets the ground is the front drawn on a weather map.'],
      ['Follow the moisture', 'Maritime air is often moist; continental air is often dry.'],
      ['Explore a front', 'Switch to a cold or warm front and watch which air mass advances.']
    ],
    sections: [
      ['Where air masses come from', 'Air that stays over a large, relatively uniform surface acquires temperature and moisture characteristics from that source region. As it travels, it continues to exchange heat and moisture with the surface below. An air mass can change; its origin is not a permanent label.'],
      ['Two independent classifications', 'Cold and warm describe relative thermal properties; maritime and continental describe source-region moisture influences. Maritime polar air can be cold and moist, while continental tropical air can be warm and dry. Blue does not always mean dry, and red does not always mean humid.'],
      ['A front is not just a line', 'Real frontal zones have depth and slope with height. The translucent surface represents an idealized frontal surface; the symbols on the ground represent its intersection with the surface. Vertical distances are exaggerated so that rising warm air is easier to see.'],
      ['Why cold air sits below warm air', 'At similar pressure, lower temperature usually means greater density, so colder air tends to occupy lower levels. Moisture also affects density. Pressure gradients, the Coriolis effect and friction all influence how real air moves.']
    ],
    caution: 'Cold air is not necessarily dry; warm air is not necessarily moist. Blue and red show relative temperature only.',
    experiment: 'Keep the temperature contrast fixed. Do low and high humidity produce the same clouds and rain?'
  },
  cold: {
    ...LESSONS.cold, title: 'Cold front', short: 'Cold air advances. Warm air is lifted.',
    headline: 'Cold air moves forward. Warm air moves up.', sub: 'Follow the blue front and watch weather pass through a town.',
    points: [
      'Advancing cold air wedges beneath the warmer air ahead.',
      'Typical rain falls near the front and on its colder, trailing side.',
      'Temperature often falls, pressure recovers and winds shift after passage.'
    ],
    phases: [
      ['Warm sector ahead', 'Warm air controls the surface; pressure may gradually fall.'],
      ['Front approaching', 'Warm air is forced upward and clouds develop.'],
      ['Frontal passage', 'Temperature drops and winds shift. Moist, unstable air may produce showers or thunderstorms.'],
      ['Cold sector behind', 'Cold air takes over, pressure rises and precipitation gradually weakens.'],
      ['After passage', 'This example becomes cooler and less cloudy. Real skies do not always clear immediately.']
    ],
    sections: [
      ['Which air mass is advancing?', 'A cold front is identified by colder air replacing warmer air at the surface, not by an absolute temperature threshold. Denser cold air advances underneath, lifting warm air near the boundary. Compared with a typical warm front, the slope is steeper and changes often happen faster.'],
      ['From rising air to clouds and rain', 'As air rises into lower pressure, it expands and cools. Condensation begins when it becomes saturated. Moisture, lift and instability together determine clouds and rain. Dry air may bring only cooling and a wind shift; moist, unstable air is more favorable for cumulonimbus, heavy showers and thunderstorms.'],
      ['Where does the rain fall?', 'The common school-level model puts the rain band near the front and on the cold side behind it, narrower than a typical warm-front rain band. This scene illustrates that pattern. Upper-level fronts, prefrontal squall lines and other dynamical conditions can also produce rain ahead of the surface front. “Only behind the front” is not a definition.'],
      ['Reading a passage at one station', 'A typical sequence is warm conditions, increasing cloud and falling pressure, a wind shift with cooling and possible showers, then cold-air control with recovering pressure. Wind directions here illustrate a Northern Hemisphere midlatitude case; they are not universal directions for every front.'],
      ['Lightning is not air-mass friction', 'Collisions among ice crystals, graupel and other particles, together with upward and downward motions inside a convective cloud, separate electrical charge. Discharges can occur within clouds, between clouds or between cloud and ground. Branching flashes here indicate thunderstorm activity; surface temperature contrast alone does not predict lightning.']
    ],
    caution: 'Not every cold front brings a thunderstorm. “Narrow, intense and behind the front” describes a typical teaching example, not a universal rule.',
    experiment: 'Lower humidity to 35% without changing the temperature contrast. The front remains, while rain and lightning weaken.'
  },
  warm: {
    ...LESSONS.warm, title: 'Warm front', short: 'Warm air glides over retreating cold air.',
    headline: 'Cold air retreats. Warm air glides upward.', sub: 'High clouds may arrive first, followed by lower clouds and persistent rain.',
    points: [
      'Surface cold air retreats and warmer air replaces it.',
      'Warm air rises along a more gently sloping frontal surface.',
      'Typical layered clouds and widespread rain lie ahead, on the cold side.'
    ],
    phases: [
      ['Cold sector ahead', 'Cold air still controls the surface; high clouds may arrive first.'],
      ['Clouds ahead', 'Clouds thicken and lower. Persistent precipitation may already be falling in the cold air.'],
      ['Frontal passage', 'Surface air warms, falling pressure levels off and winds shift.'],
      ['Entering warm air', 'Warm air replaces cold air. Rain gradually weakens in this example.'],
      ['Warm sector', 'Temperature remains higher. Embedded convection is possible in real warm fronts.']
    ],
    sections: [
      ['The leading edge of surface warm air', 'A warm front is defined by warmer air replacing colder air. Cold air must retreat for warm air to advance at the surface. The translucent red frontal surface slopes upward over the colder air ahead.'],
      ['Why clouds can arrive from far ahead', 'A gentle slope spreads the ascent of warm air across a wider horizontal area. A typical approaching sequence may include cirrus, cirrostratus, altostratus and nimbostratus, with cloud bases gradually lowering. Not every event shows the entire sequence.'],
      ['Comparing the rain bands', 'Typical warm-front precipitation is widespread and persistent on the cold side ahead of the surface front. A station may enter the cloud and rain region well before the front arrives. Unstable air can still produce thunderstorms; a warm front is not always gentle drizzle.'],
      ['Reading the station curves', 'In this example, surface temperature rises from the cooler to the warmer value. Pressure falls on approach and then levels off. Dew point, wind direction and cloud base also help identify a passage. This chart uses separate temperature and pressure axes; it does not mix wind-direction angles into those scales.']
    ],
    caution: 'Warm fronts can contain convection. Gentle slopes and persistent rain ahead describe a common structure, not a guarantee.',
    experiment: 'Switch to section view and compare it with the cold front. How far from the surface front does the rain extend?'
  },
  stationary: {
    ...LESSONS.stationary, title: 'Stationary front', short: 'The boundary lingers. The air keeps moving.',
    headline: 'A nearly still boundary, with weather in motion.', sub: 'Red and blue symbols on opposite sides mark a stalled boundary.',
    points: [
      'The front moves slowly or oscillates within a region.',
      'Air can still flow along the front, rise and condense.',
      'With sufficient moisture, cloudy and rainy conditions may persist.'
    ],
    phases: [
      ['Air masses meet', 'A distinct contrast forms between air on either side.'],
      ['Boundary stalls', 'Neither air mass steadily replaces the other; the front moves slowly.'],
      ['Ascent continues', 'Warm, moist air can still rise and produce clouds and rain.'],
      ['Rain lingers', 'A continuing moisture supply can bring repeated rain to the same area.'],
      ['Keep observing', 'The boundary continues to oscillate here. A real front may move or dissipate as circulation changes.']
    ],
    sections: [
      ['Stationary does not mean motionless air', 'The term describes little movement of the surface front. It does not mean zero wind or no vertical motion. Winds along either side can continue transporting moisture.'],
      ['Why the symbols face both ways', 'Blue triangles and red semicircles alternate on opposite sides of the line, pointing toward the warmer and colder air respectively. Both the legend and the top-down scene show this distinction.'],
      ['Persistent rain requires a supply', 'A lingering lifting zone combined with replenished moisture may produce extended cloudy, rainy weather. Without moisture it cannot produce endless heavy rain. The humidity control remains active, while the front-speed control is disabled in this mode.'],
      ['From the model to real weather', 'This example emphasizes a lingering boundary with moving air. Real fronts are not perfectly straight; rain location, intensity and duration depend on moisture, lift and the evolving weather system. A fixed-humidity animation is not a regional rainfall forecast.']
    ],
    caution: 'The boundary has little net advance, but the air is still moving. This model does not forecast seasonal rains or floods.',
    experiment: 'Watch one town. The boundary barely advances, while clouds, rain and airflow continue to evolve.'
  },
  occluded: {
    ...LESSONS.occluded, title: 'Occluded front', short: 'A cold front catches a warm front and lifts the warmest air.',
    headline: 'Two cooler air masses lift the warm sector.', sub: 'Follow three air masses: cold, cool and warm—not just two colors.',
    points: [
      'A faster cold front catches the warm front ahead.',
      'The intervening warm air gradually loses contact with the ground.',
      'Purple triangles and semicircles appear on the same side of the line.'
    ],
    phases: [
      ['Two fronts', 'A warm sector still touches the ground between the two fronts.'],
      ['Cold front catches up', 'Cold air advances from behind and the warm sector narrows.'],
      ['Occlusion begins', 'The cooler air masses approach each other, lifting the warm air.'],
      ['Warm air aloft', 'The surface warm sector disappears; warmer air remains above it.'],
      ['Occluded front', 'Layered and convective clouds may coexist. Surface temperature changes depend on the cooler air masses.']
    ],
    sections: [
      ['Three air masses, not two', 'A trailing cold front, a leading warm front and the warm sector between them evolve together. When the cold front overtakes the warm front, the warmest air is lifted away from the surface. A purple front does not mean a new purple air mass.'],
      ['Cold-type occlusion', 'This scene illustrates a cold occlusion: the air behind is colder than the cool air ahead. It undercuts the air in front and lifts the intervening warm air. Scrub the timeline to watch the surface warm sector narrow and rise.'],
      ['Warm-type occlusion', 'When the air ahead is colder, the following cool air rises over that colder air, producing a warm occlusion. The handbook describes this alternative; the current 3D scene does not combine both types into the same geometry.'],
      ['No single temperature outcome', 'An occluded front may combine layered precipitation with embedded convection. Surface temperature after passage can rise or fall, depending on the air masses involved. The curves here correspond to the displayed cold-type example.']
    ],
    caution: 'The 3D animation shows a cold occlusion. The handbook also explains the contrasting warm-occlusion structure.',
    experiment: 'Play from the start. Find the moment when the warm air finally loses contact with the ground.'
  },
  cyclone: {
    ...LESSONS.cyclone, title: 'Frontal cyclone', short: 'Place each front inside a whole weather system.',
    headline: 'A wave along a front grows into a cyclone.', sub: 'An idealized Northern Hemisphere midlatitude life cycle—not a tropical cyclone.',
    points: [
      'A surface low connects to cold and warm fronts.',
      'Near-surface air converges counterclockwise in the Northern Hemisphere.',
      'The warm sector narrows, occlusion develops and the system weakens.'
    ],
    phases: [
      ['Frontal wave', 'A wave develops along the boundary between cold and warm air.'],
      ['Low develops', 'Warm air extends toward the cold side as cold air advances toward the warm side.'],
      ['Mature cyclone', 'Cold front, warm front and warm sector become distinct.'],
      ['Occlusion', 'The cold front catches the warm front and lifts the warm sector.'],
      ['Weakening', 'The low weakens and clouds diminish in this idealized model.']
    ],
    sections: [
      ['From individual fronts to a low', 'Cold and warm fronts often belong to the same extratropical low-pressure system. From above, the cold front extends south of the low and the warm front extends east, with the warm sector between them. Real systems do not always match this ideal pattern.'],
      ['Rotation in the Northern Hemisphere', 'Near a surface low, air generally spirals inward counterclockwise; the rotation reverses in the Southern Hemisphere. High-pressure circulation is opposite. The Coriolis effect does not drive air in a straight line from high to low pressure; friction and other influences affect flow across isobars.'],
      ['One typical life cycle', 'Continuous shape changes illustrate the initial wave, development, maturity, occlusion and decay. These prescribed motions are a teaching model, not the result of solving fluid equations. They do not predict the growth rate or intensity of a real cyclone.'],
      ['Not a tropical cyclone', 'Frontal cyclones are associated with horizontal temperature contrasts in the midlatitudes. Mature tropical cyclones typically do not have the cold and warm fronts shown here. This is a frontal-cyclone lesson, not a typhoon simulator.']
    ],
    caution: 'An idealized Northern Hemisphere frontal cyclone—not a live weather map or a tropical-cyclone forecast.',
    experiment: 'Use top view. Follow the fronts to the low-pressure center, then locate the warm sector.'
  }
};
const COMPARE_EN = [
  ['Identification', 'Cold air replaces warm air', 'Warm air replaces cold air', 'The front moves very slowly', 'A cold front catches a warm front'],
  ['Typical slope', 'Steeper', 'Gentler', 'Varies with structure', 'Includes warm air lifted aloft'],
  ['Typical clouds & rain', 'Near and behind the front; showers common', 'Widespread, ahead on the cold side', 'Lingering clouds and rain', 'Layered and convective clouds may coexist'],
  ['Surface temperature', 'Usually falls', 'Usually rises', 'Different on each side; smaller changes at one station', 'Depends on the two cooler air masses'],
  ['Remember', 'A dry cold front may bring no rain', 'Warm fronts can have thunderstorms', 'The air is not motionless', 'Warm air leaves the surface']
];
const QUESTIONS_EN = [
  {q:'Is a cold air mass necessarily dry?', a:['Yes: cold air cannot contain water vapor','No: temperature and moisture are different properties','Only in winter'], correct:1, ex:'Maritime polar air can be both cold and moist. Source region and travel history both influence an air mass’s moisture.'},
  {q:'What is more plausible when cold-front humidity is reduced substantially?', a:['The front disappears','Cooling and a wind shift may remain, but there is less rain','Lightning always increases'], correct:1, ex:'A front is defined by air-mass contrasts and replacement, not by the presence of rain.'},
  {q:'Where is the main rain band as a typical warm front approaches?', a:['Ahead of the front, on the cold side','Only behind the front, on the warm side','Its position is determined entirely by wind direction'], correct:0, ex:'Warm air glides above the cold air ahead. Clouds and rain can arrive before the surface front.'},
  {q:'What does “stationary” mainly refer to in a stationary front?', a:['Every air particle stops','The surface front changes position very little','Temperature stops changing'], correct:1, ex:'Airflow, moisture transport, ascent and rainfall may all continue.'},
  {q:'What happens to the warmest air during occlusion?', a:['It is pushed underground','It is gradually lifted away from the surface','It becomes a purple air mass'], correct:1, ex:'Purple is only a map symbol for an occluded front. The warm air remains aloft.'},
  {q:'What is the typical near-surface circulation around a Northern Hemisphere low?', a:['Clockwise and outward','Counterclockwise and inward','All the air moves directly upward'], correct:1, ex:'Counterclockwise convergence is typical near a Northern Hemisphere surface low. Rotation reverses in the Southern Hemisphere.'},
  {q:'Is “cold-front rain falls only behind the front” a strict definition?', a:['Yes: any exception is not a cold front','No: upper-level fronts or convection can produce rain ahead','It is strict only over the ocean'], correct:1, ex:'Rain near and behind the front is a common teaching summary. The actual rain pattern depends on dynamics and moisture.'},
  {q:'What helps separate electric charge inside a thunderstorm?', a:['Cold and warm air masses rubbing against each other','Collisions and different motions of ice crystals, graupel and other particles','Air pressure exceeding one fixed threshold'], correct:1, ex:'Ice-particle collisions and upward and downward motions contribute to charge separation. A temperature-contrast control alone cannot determine lightning.'}
];
const SOURCES_EN = SOURCES.map((s,i)=>({...s,use:[
  'Four front types, weather-map symbols, typical clouds and passage changes.',
  'Cross-section structure, cold-side precipitation and the role of moisture and instability.',
  'Source regions, temperature, moisture and air-mass modification.',
  'Cold and warm occlusions, three air masses and frontal weather.',
  'Ice-crystal and graupel collisions and charge separation in thunderstorms.',
  'Complete textbook: Chapter 12, Fronts & Airmasses; Chapter 13, Extratropical Cyclones; Chapter 14, Thunderstorm Fundamentals. CC BY-NC-SA 4.0; the PDF is not redistributed here.'
][i]}));


/* MODULE: i18n.js */
/* Explicit, offline localization. Never translates the simulation by mutating it. */
const TEXT = {
 openExperiment:['在三维场景中探索 →','Explore this in 3D →'],quizResetDone:['答题记录已重置','Question progress reset'],
 brand:['锋界','FrontScope'], edition:['气象实验室','WEATHER STUDIO'], series:['自然地理 / 08','PHYSICAL GEOGRAPHY / 08'],
 description:['在三维山川之间探索天气：冷锋、暖锋、准静止锋、锢囚锋与锋面气旋。','Explore air masses, cold fronts, warm fronts, stationary fronts, occlusions and frontal cyclones in an offline 3D landscape.'],
 viewGroup:['观察视角','Viewing mode'],free:['自由观察','Orbit'],side:['剖面观察','Section'],top:['俯视观察','Top view'],
 viewFreeTip:['自由旋转与探索 · 1','Free orbit and exploration · 1'],viewSideTip:['剖面观察 · 2','Cross-section view · 2'],viewTopTip:['俯视观察 · 3','Top-down view · 3'],
 guide:['知识手册','Field notes'],guideTip:['知识手册、对照判读与参考教材','Lessons, comparisons, questions and references'],
 help:['操作指南','Controls'],helpTip:['操作指南与偏好 · ?','Controls and preferences · ?'],
 language:['切换语言','Switch language'],langToggle:['Switch to English · L','Switch to Chinese · L'],langChanged:['已切换为中文 · 实验状态已保留','English enabled · your experiment is unchanged'],
 soundOn:['关闭环境音','Mute ambience'],soundOff:['开启环境音','Enable ambience'],soundTip:['环境音默认开启，可随时静音','Ambience is on by default; mute at any time'],
 capture:['保存场景图片','Save scene image'],fullscreen:['全屏','Fullscreen'],fullscreenExit:['退出全屏','Exit fullscreen'],
 chapters:['探索章节','Explore chapters'],coursePanel:['课程与知识','Lessons and knowledge'],closeCourses:['关闭课程面板','Close lesson panel'],
 understand:['看懂','Inside'],readLesson:['打开本节完整讲解','Read this lesson'],tryIt:['动手试一试','TRY IT YOURSELF'],
 compareLink:['过境前、中、后，有什么不同？','What changes as a front passes?'],symbols:['天气图语言','Map symbols'],clickSwitch:['点击切换','SELECT A FRONT'],
 creatorLine:['让知识可以被探索','Made to be explored'],
 stageLabel:['三维锋面实验场景','Interactive 3D weather experiment'],canvasLabel:['拖动旋转，滚轮缩放；双指缩放与平移。按问号查看帮助。','Drag to orbit, scroll to zoom, or pinch and pan with two fingers. Press ? for controls.'],
 resetCamera:['复位镜头 · R / 双击画面','Reset camera · R / double-click scene'],cinema:['沉浸观察 · F','Immersive view · F'],exitCinema:['返回实验界面','Back to the lab'],
 labels:['知识标注','Knowledge labels'],labelsTip:['显示或隐藏三维知识标注','Show or hide knowledge labels'],zoomIn:['拉近镜头 · +','Zoom in · +'],zoomOut:['拉远镜头 · −','Zoom out · −'],
 autoTour:['镜头导览','Camera tour'],tourTip:['自动演变，并在关键阶段缓缓切换镜头','Play the sequence with smooth camera changes at key stages'],tourEnd:['停止导览','Stop tour'],
 tourRunning:['镜头导览中','CAMERA TOUR'],tourStopped:['已交还镜头控制','Camera control is yours again'],tourStarted:['导览已开始 · 拖动画面即可接管镜头','Tour started · drag the scene to take over'],
 coldMass:['冷气团','Cold air'],warmMass:['暖气团','Warm air'],coolMass:['前方冷气团','Cool air ahead'],
 coldSub:['较冷 · 密度较大','Colder · denser'],warmSub:['受迫抬升','Forced ascent'],coolSub:['较冷 · 比后方冷空气暖','Cool, but warmer than the trailing air'],
 airWarmSub:['相对较暖 · 干湿独立','Relatively warm · moisture varies'],lifted:['被抬离地面','Lifted from the surface'],gliding:['沿缓坡上滑','Gentle sloping ascent'],retreating:['逐渐退却','Retreating'],balance:['冷暖相持','Nearly stationary'],
 low:['低压中心 · 辐合','Surface low · convergence'],massHelp:['认识气团','Explore air masses'],
 cloudLayer:['层状云系','Layered clouds'],cloudConvection:['对流云发展','Convective growth'],cloudMixed:['层状 / 混合云系','Layered / mixed clouds'],
 cloudLayerSub:['广阔上滑 · 层状降水','Broad ascent · steady rain'],cloudConvectionSub:['强上升 · 积雨云条件','Strong ascent · cumulonimbus potential'],cloudMixedSub:['抬升凝结 · 云量增加','Rising and condensing air'],
 occluding:['冷锋追赶暖锋','Cold front catches up'],surfaceFront:['锋面与地面相交','Front at the surface'],nearlyStill:['锋线近乎不动','Little net movement'],warmLeaving:['暖区逐渐离开地面','Warm sector rises aloft'],frontDirection:['锋线 · 推进方向 →','Surface front · advance →'],
 ruler:['垂直结构','VERTICAL SECTION'],upper:['高空','Upper air'],middle:['中层','Mid-level'],lower:['低层','Low-level'],surface:['地面','Surface'],exaggeration:['垂直夸大','Height exaggerated'],
 paused:['暂停 · 可自由探索','Paused · explore freely'],playing:['正在演变','Simulation playing'],scrubbing:['正在定位时间','Scrubbing the sequence'],
 controlHint:['拖动旋转 · 滚轮缩放 · 双击复位','Drag to orbit · scroll to zoom · double-click to reset'],touchHint:['单指旋转 · 双指缩放 / 平移','One finger: orbit · two fingers: pinch / pan'],
 scale:['虚构地形 · 240 × 160 km 示意域','Fictional terrain · 240 × 160 km schematic domain'],
 params:['实验参数','Experiment controls'],paramsPanel:['参数与观测','Controls and observations'],closeParams:['关闭参数面板','Close controls'],reset:['重置','Reset'],resetParams:['恢复本节默认参数（可撤销）','Restore lesson defaults (undo available)'],paramsMeta:['改变条件，看天气如何响应。','Change a condition. Watch the response.'],
 delta:['气团温差','Temperature contrast'],speed:['锋面移动速度','Front speed'],humidity:['近地面相对湿度','Surface humidity'],instability:['对流不稳定度','Convective instability'],slope:['锋面坡度','Frontal slope'],
 deltaHint:['改变两侧相对气温，不是天气强弱的唯一指标。','Changes the relative temperatures. Contrast alone does not determine weather intensity.'],
 speedHint:['锋线的推进速度，不等于城镇观测到的风速。','The speed of the moving front, not the wind speed observed at a town.'],
 humidityHint:['理想化水汽条件；湿度低时，可以有锋、无雨。','Idealized moisture supply. At low humidity, a front can exist without rain.'],
 instabilityHint:['教学用归一化指标，并非实测 CAPE。提高后，对流云更容易发展。','A normalized teaching index, not observed CAPE. Higher values favor convective growth.'],
 slopeHint:['1:n 中，n 越大锋面越缓。画面夸大了垂直尺度。','In a 1:n slope, a larger n means a gentler front. The view exaggerates vertical scale.'],
 staticCompare:['静态对比','Static comparison'],stalled:['近乎停滞','Nearly stationary'],lifeCycle:['理想生命周期','Idealized life cycle'],notApplicable:['本节未使用此参数','This parameter is not used in this lesson'],
 typeValue:['点击数值可精确输入','Click the value to enter an exact number'],modified:['已调整','Modified'],defaultParams:['默认参数','Default values'],
 clouds:['云层','Clouds'],rain:['降水','Rain'],lightning:['雷电','Lightning'],flow:['风场','Airflow'],temperature:['气温','Temperature'],pressure:['气压','Pressure'],temperatureField:['温度场','Temperature'],pressureField:['气压场','Pressure'],layers:['场景图层','Scene layers'],
 cloudsTip:['云层显示开关；不改变气象条件','Cloud visibility; does not change the weather model'],rainTip:['雨粒子显示开关；不改变模型中的降水','Rain visibility; model precipitation is unchanged'],lightningTip:['雷电闪光；减少动态效果时关闭','Lightning flashes; disabled with reduced effects'],flowTip:['显示流线、箭头与气流粒子','Show streamlines, arrows and air particles'],
 pressureTip:['显示示意气压等值线','Show schematic pressure contours'],temperatureTip:['显示地表相对温度色带','Show relative surface temperature'],
 dryPreset:['干燥冷锋','Dry cold front'],stormPreset:['湿暖 · 强对流','Moist & unstable'],dryTip:['保持冷锋结构，降低湿度与不稳定度','Keep the cold front but lower humidity and instability'],stormTip:['切到高湿度、高不稳定度的冷锋','Explore a moist, unstable cold-front example'],
 paramsReset:['已恢复本节默认参数','Lesson defaults restored'],undo:['撤销','Undo'],undone:['已恢复刚才的实验条件','Your previous conditions are restored'],
 dryApplied:['有锋面，也可以没有雨。观察温度曲线。','A front can exist without rain. Watch the temperature curve.'],stormApplied:['湿度与不稳定度同时升高，云雨与雷电增强。','Higher moisture and instability strengthen clouds, rain and lightning.'],
 response:['条件响应','RESPONSE'],dryResponse:['水汽较少：锋面仍在，雨电显著减弱。','Little moisture: the front remains, but rain and lightning weaken.'],stormResponse:['湿润且不稳定：对流云雨更活跃。','Moist and unstable: more active convective clouds and rain.'],calmResponse:['调整条件，比较同一城镇的过境曲线。','Adjust conditions and compare the passage at the same town.'],
 observation:['城镇观测','Station readings'],townSelect:['选择观测城镇','Choose an observation town'],notMeasured:['概念模型输出 · 非实测','Conceptual output · not measured'],wind:['风向 / 风速','Wind'],weather:['天气现象','Weather'],
 relativeTrend:['过境趋势','Passage trend'],chartLabel:['城镇温压过境曲线；可拖动定位，左右键调节','Town temperature and pressure curves. Drag to seek, or use Left and Right arrows.'],
 chartStart:['开始','Start'],chartMiddle:['相对进度','Progress'],chartEnd:['结束','End'],chartHint:['拖动曲线，可回看任意时刻','Drag the chart to inspect a moment'],chartTemp:['气温 °C','Temp. °C'],chartPressure:['气压 hPa','Pressure hPa'],
 focusTown:['聚焦城镇','Focus town'],focusTownTip:['缓缓靠近所选观测站，不改变实验进度','Move closer to the selected town without changing progress'],townFocused:['已聚焦{name} · 双击可复位','Focused on {name} · double-click to reset'],townChanged:['观测站已切换至{name}','Now observing {name}'],
 conditional:['天气有条件，不是必然。','Conditions matter.'],quiz:['知识挑战','Knowledge check'],quizTip:['八道判读题与解析','Eight questions with explanations'],
 localRender:['本地 3D 渲染','Local 3D renderer'],quality:['渲染质量','Rendering quality'],eco:['节能','Eco'],balanced:['均衡画质','Balanced'],high:['精细画质','Detailed'],qualityChanged:['已切换画质：{name}','Quality: {name}'],
 play:['播放天气演变','Play the weather sequence'],pause:['暂停天气演变','Pause the weather sequence'],playTip:['播放 / 暂停整个天气动画 · 空格','Play / pause the entire weather animation · Space'],restart:['从头播放','Play from the start'],speedRate:['播放倍率','Playback speed'],
 timeTitle:['天气演变','Weather in motion'],timelineLabel:['天气演变进度','Weather sequence progress'],timeRelative:['相对{name}过境','Relative to passage at {name}'],timeStalled:['相持天气 · 示意过程','Stalled front · illustrative sequence'],timeConcept:['教学过程 · 非实时时间','Teaching sequence · not real time'],
 phasePrefix:['阶段','Phase'],timelineTip:['预览{name} · {percent}%','Preview {name} · {percent}%'],phaseGo:['跳转到：{name}','Jump to: {name}'],
 mobileCourses:['课程','Lessons'],mobileParams:['参数 / 观测','Controls'],mobileBook:['知识','Learn'],
 signature:['MakerJackie · 地理可视化系列','MakerJackie · Geography series'],notForecast:['教学示意 · 非天气预报','Educational model · not a forecast'],
 bookEyebrow:['FIELD NOTES / 锋面知识手册','FIELD NOTES / WEATHER & FRONTS'],closeBook:['关闭知识手册','Close field notes'],bookGroup:['知识手册栏目','Field notes sections'],
 bookLesson:['原理讲解','Learn'],bookCompare:['对照判读','Compare'],bookQuiz:['知识挑战','Check'],bookSources:['教材与来源','Sources'],
 bookTitleLesson:['{name} · 看懂一场天气','{name} · understand the weather'],bookTitleCompare:['从结构到天气，读懂四种锋面','Four fronts, from structure to weather'],bookTitleQuiz:['你真的看懂了吗？','Put your understanding to the test'],bookTitleSources:['知识有出处，模型有边界','Sources and model boundaries'],
 references:['参考','References'],avoidAbsolute:['不要把典型情况当作定义','A typical pattern is not a definition'],
 compareIntro:['先看哪一侧气团替代另一侧，再结合结构、云雨和站点变化综合判断。颜色、方向和一次降水都不能单独定义锋面。','First identify which air mass replaces the other. Then consider the structure, clouds, precipitation and station changes together. Color, direction or one rain event cannot define a front on its own.'],
 comparisonFactor:['判读要素','Feature'],passageSequence:['固定城镇，典型过境序列','Typical passage at a fixed station'],occlusionTypes:['锢囚也有两种','Two types of occlusion'],
 occlusionExplain:['后方空气比前方更冷时，形成冷式锢囚；后方空气相对没那么冷时，会沿更冷的前方空气上滑，形成暖式锢囚。三维场景演示前一种。','When the following air is colder than the air ahead, a cold occlusion forms. When it is less cold, it rises over the colder air ahead in a warm occlusion. This 3D scene illustrates the first type.'],
 sourceIntro:['这份手册依据公开气象教学资料编写，是原创讲解，不是任何指定版本教材的全文搬运。','These original explanations draw on public meteorological teaching resources. They are not a reproduction of a particular textbook.'],
 modelNotes:['模型说明','About the model'],modelSpace:['空间与时间','Space and time'],modelSpaceText:['地形、城镇完全虚构。240 × 160 km 为教学域，垂直尺度夸大。推进型锋面的时间按锋速换算为相对所选城镇过境的时刻，不是天气预报。','Terrain and towns are fictional. The teaching domain is labeled 240 × 160 km, with exaggerated height. Moving-front time is derived from front speed relative to passage at the selected town; it is not a forecast.'],
 modelParams:['气象参数','Weather parameters'],modelParamsText:['温湿度、锋速和不稳定度驱动解析函数与粒子动画，没有求解大气方程或水微物理。数值是概念模型输出。','Temperature contrast, humidity, front speed and instability drive analytical functions and particle animation. Atmospheric equations and cloud microphysics are not solved. Values are conceptual outputs.'],
 modelScope:['适用范围','Scope'],modelScopeText:['冷锋、暖锋采用典型个例；准静止锋表现相持；锢囚为冷式；锋面气旋是北半球中纬度模型，不是台风。','Cold and warm fronts are typical examples; the stationary front lingers; the occlusion is cold-type. The frontal cyclone is a Northern Hemisphere midlatitude model, not a typhoon.'],
 modelVisual:['视觉编码','Visual encoding'],modelVisualText:['蓝红表示相对冷暖，不表示干湿。流线、闪电与雨粒子解释机制，不能用于读取精确风速、雷暴强度或雨量。','Blue and red indicate relative temperature, not moisture. Streamlines, lightning and rain particles explain mechanisms; they cannot be used to read precise wind speed, storm intensity or rainfall.'],
 textbook:['完整教材入口','Complete textbook'],textbookText:['UBC 提供 Roland Stull 的 Practical Meteorology 完整教材，重点对应第 12、13、14 章。使用原教材请遵循其 CC BY-NC-SA 4.0 许可。本项目未附带教材 PDF。','UBC hosts Roland Stull’s Practical Meteorology. Chapters 12, 13 and 14 are particularly relevant. Use of the original textbook is subject to its CC BY-NC-SA 4.0 license. The PDF is not included in this project.'],
 questionNo:['问题 {n} / {total}','Question {n} / {total}'],quizScore:['已答 {answered} · 答对 {score}','Answered {answered} · correct {score}'],correct:['判断正确','Correct'],incorrect:['换个角度看','Look at it another way'],quizHint:['选择后查看解析。答案不会影响实验进度。','Choose an answer to see an explanation. Your experiment will not change.'],prevQuestion:['← 上一题','← Previous'],nextQuestion:['下一题 →','Next →'],firstQuestion:['回到第一题 ↻','Back to the start ↻'],resetQuiz:['重新挑战','Try again'],questionLabel:['第 {n} 题','Question {n}'],
 lessonRestored:['已回到{name} · 保留上次条件','Back to {name} · your conditions are preserved'],
 introTitle:['一场天气，交给你探索。','A whole weather system. Yours to explore.'],introText:['拖动画面改变视角；点击播放看锋面推进。参数右侧的数值支持精确输入。','Drag to look around. Press play to follow the front. Click a parameter value to type an exact number.'],introDismiss:['开始探索','Explore'],introHelp:['查看操作','View controls'],
 helpTitle:['让每一次操作，都更顺手。','Make the lab feel like yours.'],helpEyebrow:['CONTROLS / 操作与偏好','CONTROLS / PREFERENCES'],closeHelp:['关闭操作指南','Close controls guide'],
 helpOrbit:['旋转与缩放','Orbit & zoom'],helpOrbitText:['鼠标拖动旋转；滚轮平滑缩放。触屏单指旋转，双指缩放与平移。','Drag to orbit and scroll to zoom smoothly. On touch screens, orbit with one finger; pinch and pan with two.'],
 helpPan:['平移与复位','Pan & reset'],helpPanText:['右键拖动或 Shift + 拖动平移。双击画面或按 R 复位；镜头不会突然跳回。','Right-drag or Shift-drag to pan. Double-click the scene or press R to ease back to the default camera.'],
 helpTime:['掌握时间','Control time'],helpTimeText:['时间轴和观测曲线都可拖动；播放时拖动会临时暂停，松开后继续。点击阶段可平滑跳转。','Drag the timeline or chart. Scrubbing briefly pauses playback and resumes on release. Click a stage to ease to it.'],
 helpParams:['精确试验','Fine-tune conditions'],helpParamsText:['拖动滑块，或点击右侧数值输入。重置和情境预设提供撤销；章节切换保留本次会话里的条件。','Use sliders or type into the value fields. Reset and scenario presets support undo. Each lesson keeps its conditions during this session.'],
 helpKeyboard:['键盘捷径','Keyboard shortcuts'],keySpace:['播放 / 暂停','Play / pause'],keyArrows:['后退 / 前进','Seek backward / forward'],keyViews:['自由 / 剖面 / 俯视','Orbit / section / top'],keyZoom:['镜头缩放','Zoom'],keyR:['复位镜头','Reset camera'],keyF:['沉浸观察','Immersive view'],keyL:['切换中英文','Switch language'],keyEsc:['关闭面板 / 退出沉浸','Close panel / exit immersion'],
 preferences:['偏好设置','Preferences'],reduced:['减少动态效果','Reduced effects'],reducedText:['关闭惯性、镜头过渡和雷电闪光。仍可手动播放天气过程。','Disable inertia, camera transitions and lightning flashes. You can still play the weather sequence manually.'],loop:['循环演变','Loop playback'],loopText:['到达结尾后，从起点重新播放。','Restart the weather sequence when it reaches the end.'],prefsLocal:['语言与偏好仅保存在当前浏览器。首次交互后可播放环境音。','Language and preferences are stored only in this browser. Ambience can play after your first interaction.'],
 limitedLightning:['减少动态效果已开启，雷电闪光保持关闭。','Reduced effects are enabled, so lightning flashes stay off.'],
 end:['演变结束 · 可回看任意阶段，或开始另一种锋面。','Sequence complete · revisit a stage or explore another front.'],
 pressureNotice:['等压线为教学示意，不是实时天气图。','Pressure contours are illustrative, not a live weather chart.'],sectionNotice:['剖面切去前半地形，垂直尺度夸大。','The section removes the foreground terrain. Height is exaggerated.'],
 audioEnabled:['环境音已开启 · 可随时静音','Ambience enabled · mute at any time'],audioDisabled:['环境音已关闭','Ambience muted'],audioError:['当前浏览器暂不能启用声音。','This browser could not enable audio.'],
 fullscreenError:['当前环境限制全屏；可以使用沉浸观察。','Fullscreen is restricted here. Immersive view is available instead.'],
 capturePreparing:['正在生成场景图片…','Preparing your scene image…'],captureError:['浏览器未能导出图片。','The browser could not export the image.'],captureSuccess:['已生成场景 PNG，保存请求已交给浏览器。','Scene PNG created; the save request is with your browser.'],captureLegend:['3D 自然地理实验馆','3D geography laboratory'],
 loadingTitle:['让天气，变得看得见。','See how the weather works.'],loadingTerrain:['正在雕刻山脉与河谷…','Sculpting mountains and river valleys…'],loadingTown:['生成森林、村镇、道路与水系…','Building forests, towns, roads and waterways…'],loadingAir:['构建气团、锋面与云雨…','Bringing air masses, fronts and clouds to life…'],loadingReady:['实验馆已准备就绪','Your laboratory is ready'],
 errorTitle:['三维场景未能启动','The 3D scene could not start'],errorInstructions:['请用支持 WebGL 2、开启图形加速的浏览器打开完整 HTML 文件。','Open the complete HTML file in a WebGL 2 browser with graphics acceleration enabled.'],reload:['重新加载','Reload'],errorStart:['启动失败：{message}','Startup failed: {message}'],contextLost:['图形上下文中断。请关闭其他高负载标签页后重新加载。','Graphics context was lost. Close other resource-intensive tabs and reload.'],
 weatherShowers:['阵雨 · 雷暴','Showers · thunder'],weatherRain:['明显降水','Rain'],weatherSteady:['连续性降水','Steady rain'],weatherDry:['少云 · 干燥','Few clouds · dry'],weatherClearing:['云量减少','Clouds decreasing'],weatherFair:['晴到多云','Fair to cloudy'],
 dryStory:['当前较干：锋面仍在，云雨与雷电显著减弱。','Dry conditions: the front remains, with much weaker clouds, rain and lightning.'],
 selectedTown:['已选观测站','Selected station'],railHandle:['下滑关闭面板','Swipe down to close'],bookmarkNote:['只更换语言，不重置镜头、参数、时间或答题记录。','Switching language preserves the camera, conditions, time and quiz answers.']
};
function resolveLanguage() { return document.body.lang === "en" ? "en" : "zh";
  const entry = document.documentElement.dataset.entryLang;
  const url = new URL(location.href);
  const explicit = url.searchParams.get('lang');
  if (['zh','en'].includes(explicit)) return explicit;
  if (['zh','en'].includes(entry)) return entry;
  try { const saved=JSON.parse(localStorage.getItem('front-atlas:lang')); if(['zh','en'].includes(saved)) return saved; } catch {}
  return 'zh';
}
let language = resolveLanguage();
function t(key, values={}) {
  const item=TEXT[key];
  if(!item) throw new Error('Missing localization key: '+key);
  return item[language==='en'?1:0].replace(/\{(\w+)\}/g, (_, name)=>String(values[name]??''));
}
function lessonData(id) { return (language==='en'?LESSONS_EN:LESSONS)[id]; }
function questionsData() { return language==='en'?QUESTIONS_EN:QUESTIONS; }
function sourcesData() { return language==='en'?SOURCES_EN:SOURCES; }
function townName(town) { return language==='en'?({yunling:'Yunling City',qingshan:'Qingshan Town',hubin:'Hubin City'}[town.id]):town.name; }
function directionName(angle) { return (language==='en'?['N','NE','E','SE','S','SW','W','NW']:['北','东北','东','东南','南','西南','西','西北'])[Math.round(angle/45)%8]; }
const WEATHER_KEYS={'阵雨 · 雷暴':'weatherShowers','明显降水':'weatherRain','连续性降水':'weatherSteady','少云 · 干燥':'weatherDry','云量减少':'weatherClearing','晴到多云':'weatherFair'};
function weatherName(obs) { return t(WEATHER_KEYS[obs.weather]||'weatherFair'); }
const PHASE_SHORT_EN={air:['Compare','Boundary','Surface','Moisture','Explore'],cold:['Warm air','Approach','Passage','Cold air','After'],warm:['Cold air','Clouds','Passage','Warm air','After'],stationary:['Meet','Stall','Ascent','Rain','Continue'],occluded:['Two fronts','Catch-up','Occluding','Warm air aloft','Occluded'],cyclone:['Wave','Develop','Mature','Occlude','Weaken']};
function phaseLabel(id,i,compact=false) { return compact&&language==='en'?PHASE_SHORT_EN[id][i]:lessonData(id).phases[i][0]; }


/* MODULE: scene.js */
/* Visual weather: curved translucent interfaces, batched flow paths, evolving
   cloud volumes, falling particles, branched lightning and a cyclone model. */
function airSheet(w,fn,color,alpha=.1){let m=w.mesh(paramSurface(44,20,fn,color),{mode:7,opacity:alpha,unlit:.92},'air');m.castShadow=false;return m;}
function symbolGeometry(kind,length=15.1){let b=new Builder(),purple=colors.purple,step=1.13;for(let k=0,z=-length/2+.32;z<length/2;z+=step,k++){let warm=kind==='warm'||(kind==='stationary'||kind==='occluded')&&k%2===1,c=kind==='occluded'?purple:warm?colors.warm:colors.cold;let x=frontBend(z),sign=kind==='stationary'&&warm?-1:1;
 if(warm){let geo=ringGeometry(0,.245,c,'xz',20,-Math.PI/2,Math.PI);b.append(geo,M.compose([x,.09,z],[0,sign===-1?Math.PI:0,0]));}
 else b.face([x,.085,z-.22],[x+.43,.085,z],[x,.085,z+.22],c,[0,1,0]);}return b.build();}
function makeFlowBatch(w,defs,color){let b=new Builder(),heads=new Builder();for(let d of defs){d.samples=pathPoints(d.fn,80);b.append(tubeGeometry(d.samples,d.radius||.015,color,4));let p=samplePath(d.samples,.56),dir=V.sub(samplePath(d.samples,.575),p);heads.append(arrowGeometry(p,dir,.22,color));d.phase=hash(defs.indexOf(d),16);}
 let line=w.mesh(b.build(),{unlit:1,opacity:.38,clearance:true},'flow'),arrows=w.mesh(heads.build(),{unlit:1,opacity:.90,clearance:true},'flow');line.castShadow=arrows.castShadow=false;let group={defs,line,arrows,color,mat:M.id()};w.flowBatches.push(group);return group;}
function frontSurface(w,sign,slope,color,height=7.8,alpha=.11){let surf=airSheet(w,(u,v)=>[frontBend(-7.7+u*15.4)+sign*v*height*slope,.66+v*height,-7.7+u*15.4],color,alpha),edge=w.mesh(tubeGeometry(pathPoints(t=>[sign*t*height*slope,.65+t*height,7.72],64),.016,color,5),{unlit:1,opacity:.7},'air');edge.castShadow=false;return[surf,edge];}
function airVolume(w,cold,sign,slope,color){let meshes=[];for(let j=0;j<3;j++){let z=-7.7+j*7.7;let sheet=airSheet(w,(u,v)=>{let y=.65+v*5.0,edge=sign*v*5*slope;let x=cold?(sign>0?mix(edge,40,u):mix(-40,edge,u)):(sign>0?mix(-40,edge,u):mix(edge,40,u));return[x,y,z];},color,.040);meshes.push(sheet);}return meshes;}
function makeLightning(w,seed){let b=new Builder(),glow=new Builder(),r=rng(seed);for(let n=0;n<3;n++){let z=-5+n*4.6,x=-.55+r()*.4,y=5.5+r()*1.3,path=[];for(let i=0;i<=17;i++){let u=i/17;path.push([x+(r()-.5)*.48+u*.32,y*(1-u)+.6,z+(r()-.5)*.38]);}b.append(tubeGeometry(path,.011,'#d8ecff',4));glow.append(tubeGeometry(path,.054,'#829fff',5));for(let k of [4,8,11]){let p=path[k],end=[p[0]+(r()-.5)*1.1,p[1]-.9-r()*.5,p[2]+(r()-.5)*1.0],pts=pathPoints(t=>V.lerp(p,end,t).map((v,i)=>i===1?v:v+Math.sin(t*24+k)*.06),12);b.append(tubeGeometry(pts,.006,'#cedaff',4));}}
 let halo=new Mesh(glow.build(),{unlit:1,opacity:0}),bolt=new Mesh(b.build(),{unlit:1,opacity:0});halo.castShadow=bolt.castShadow=false;halo.tag=bolt.tag='lightning';w.lightning=[halo,bolt];}
function cloudPoint(w,p,s,alpha,seed,c){let a=w.cloud(p,s,alpha,seed,c);a.base=[...p];a.baseSize=s;a.baseAlpha=alpha;return a;}
function makeClouds(w,kind,params){let r=rng(971),arr=[],layers=[];let warm=kind==='warm',station=kind==='stationary',oc=kind==='occluded',slope=params.slope/80*.54;
 if(warm){for(let level=0;level<5;level++){let x=.9+level*1.8,y=2.3+level*.9;for(let i=0;i<62;i++){let p=[x+(r()-.5)*2.2,y+(r()-.5)*.35,(r()-.5)*15.1],pt=cloudPoint(w,p,1.7+r()*1.5,.34+r()*.26,r()*50,level>2?'#d8e2e7':'#adbfc9');pt.band=level;arr.push(pt);}}}
 else{let cols=station?10:11;for(let c=0;c<cols;c++){let z=-7.0+c*1.36;let h=(station?4.0:5.1)+r()*2.3+(c===4||c===7?1.35:0),s=.9+r()*.32;for(let i=0;i<32;i++){let u=r(),y=1.8+u*h,x=-.55-u*slope*2.2+(r()-.5)*(1.5+u);let pt=cloudPoint(w,[x,y,z+(r()-.5)*1.5],s*(1.05+r()*.98)*(1+u*.35),.48+r()*.24,r()*60,u>.45?'#d6e1e9':'#7f99ad');arr.push(pt);}
  // Knuckles at the developing tower top, then a broad, thin anvil.
  for(let i=0;i<9;i++){let x=-2.2+(r()-.5)*3.8,y=h+1.8+r()*.7;let pt=cloudPoint(w,[x,y,z+(r()-.5)*1.7],1.3+r()*1.4,.46+r()*.17,r()*60,'#e2e9e9');pt.anvil=true;arr.push(pt);}}
  if(oc)for(let i=0;i<110;i++){let p=[1+r()*5.2,3.4+r()*1.3,(r()-.5)*15];arr.push(cloudPoint(w,p,1.8+r()*1.3,.44,r()*60,'#c6d5dc'));}
 }
 w.cloudMeta=arr;
}
function createFrontScene(kind,params,base){let w=new World(kind);w.meshes=[...base.meshes];w.terrain=base.terrain;w.baseCount=base.meshes.length;w.flowBatches=[];w.camera={...base.camera};w.ambient=.53;w.type=kind;w.params={...params};w.cloudMeta=[];w.lightning=[];w.noSection=false;
 if(kind==='cyclone')return createCycloneScene(w,params,base);
 let warm=kind==='warm',air=kind==='air',station=kind==='stationary',oc=kind==='occluded',slope=params.slope/80*.54;let sign=warm?1:-1,height=warm?6.5:8.2;
 w.frontMeshes=[];w.secondary=[];w.raised=[];
 // Colored warm/cold sheets indicate volumes, not solid walls.
 w.frontMeshes.push(...frontSurface(w,sign,slope,warm?colors.warm:oc?colors.purple:colors.cold,height,air?.16:.09));
 w.frontMeshes.push(...airVolume(w,true,sign,slope,colors.cold));if(!oc)w.frontMeshes.push(...airVolume(w,false,sign,slope,colors.warm));else{w.coolMass=airVolume(w,true,1,1.5,'#90cddd');w.secondary.push(...w.coolMass);for(let z of [-7.65,0,7.65]){let m=w.mesh(paramSurface(24,16,(u,v)=>[u,v*4.8,z],colors.warm),{mode:9,unlit:1,opacity:.05,wave:6.2,fold:0},'air');m.castShadow=false;w.raised.push(m);}}
 let trace=w.mesh(tubeGeometry(pathPoints(t=>[frontBend(-7.55+t*15.1),.085,-7.55+t*15.1],120),.029,warm?colors.warm:oc?colors.purple:colors.cold,6),{unlit:1,fit:true},'front');trace.castShadow=false;w.frontMeshes.push(trace);w.trace=trace;
 let syms=w.mesh(symbolGeometry(oc?'cold':kind),{unlit:1,fit:true},'front');syms.castShadow=false;w.frontMeshes.push(syms);w.coldSymbols=syms;
 if(oc){let secondTrace=w.mesh(tubeGeometry(pathPoints(t=>[frontBend(-7.55+t*15.1),.11,-7.55+t*15.1],90),.03,colors.warm,5),{unlit:1,fit:true},'front');secondTrace.castShadow=false;let ws=w.mesh(symbolGeometry('warm'),{unlit:1,fit:true},'front');ws.castShadow=false;w.secondary.push(secondTrace,ws,...frontSurface(w,1,1.5,colors.warm,6.3,.075));let purple=w.mesh(symbolGeometry('occluded'),{unlit:1,fit:true},'front');purple.castShadow=false;w.purple=purple;w.frontMeshes.push(purple);}
 const coldDefs=[],warmDefs=[];
 for(let j=0;j<12;j++){let z=-7.1+j*1.29;for(let k=0;k<2;k++){let y=.85+k*.84;
  coldDefs.push({fn:u=>station?[-4+k*1.8,y, mix(-8,8,u)]:warm?[mix(2.4,11,u),y+.1*Math.sin(u*Math.PI),z]:[mix(-12,.02,u),y+.1*Math.sin(u*Math.PI),z],speed:.036, count:3});}
  for(let k=0;k<2;k++){let off=k*.9;warmDefs.push({fn:u=>{if(station)return[mix(9,-2,u),.9+off+smooth(.25,.90,u)*4.1,z];if(warm)return[mix(-11,10,u),.94+off+Math.pow(smooth(.2,1,u),1.25)*5.8,z];return[mix(11,-3.5,u),.92+off+Math.pow(smooth(.18,.90,u),1.7)*7.4,z];},speed:.026,count:4});}}
 w.coldFlow=makeFlowBatch(w,coldDefs,colors.cold);w.warmFlow=makeFlowBatch(w,warmDefs,colors.warm);
 if(!air)makeClouds(w,kind,params);makeLightning(w,42);
 w.update=function(t,p){this.time=t;this.progress=p;const fx=frontX(kind,p),atm=modelAtmosphere(kind,p,params),move=M.translate([fx,0,0]);w.atmos=atm;w.fx=fx;
  for(let m of w.frontMeshes)m.model=move;
  let ocLift=oc?smooth(.28,.79,p)*3.4:0,gap=oc?Math.max(0,6.2*(1-smooth(.03,.77,p))):0;w.gap=gap;w.ocLift=ocLift;
  if(oc){for(let m of w.secondary){m.model=M.translate([fx+gap,0,0]);if(m.tag==='front')m.visible=p<.74;}for(let m of w.raised){m.model=move;m.mat.wave=gap;m.mat.fold=ocLift;}w.coldSymbols.visible=p<.74;w.purple.visible=p>=.74;w.trace.mat.tint=p<.74?col('#739dff'):col('#bba0ff');}
  w.particles=[];
  for(let g of w.flowBatches){g.mat=M.translate([fx,(oc&&g===w.warmFlow)?ocLift:0,0]);g.line.model=g.arrows.model=g.mat;let sp=.019+params.speed*.00048;g.line.mat.opacity=air?.44:.38;for(let d of g.defs)for(let i=0;i<d.count;i++)for(let trail=0;trail<3;trail++){let u=fract(t*sp+i/d.count+d.phase-trail*.0045),pos=M.point(g.mat,samplePath(d.samples,u));if(Math.abs(pos[0])<12&&Math.abs(pos[2])<8){pos[1]=Math.max(pos[1],base.airHeight(pos[0],pos[2])+.55);w.particles.push({p:pos,c:g.color,s:(.11-trail*.025),a:.86-trail*.20});}}}
  // Cloud growth follows moisture and stability, with gentle deterministic drift.
  let grow=warm?1:.58+.42*params.instability/100;
  for(let c of w.cloudMeta){let v=c.base,breath=Math.sin(t*.19+c.seed)*.055;c.p=[fx+v[0]+Math.sin(t*.11+c.seed)*.095,.75+(v[1]-.75)*grow+breath, v[2]+Math.sin(t*.09+c.seed)*.06];c.s=c.baseSize*(.62+.38*atm.moist)*(c.anvil?grow:1);c.a=c.baseAlpha*atm.cloud;}
  w.rain=[];if(atm.rain>.035){let count=Math.round(1600*atm.rain),seed=21;for(let i=0;i<count;i++){let z=(hash(i,seed)-.5)*15.0;let x=fx+(warm?1.0+hash(i,seed+1)*5.8:station?(hash(i,seed+1)-.5)*5.2:oc?-2+hash(i,seed+1)*5:-1.35+(hash(i,seed+1)-.5)*1.9);if(Math.abs(x)>12)continue;let ground=Math.max(.26,w.terrain.height(x,z)),top=warm?3.0:4.3+grow*.8,fall=fract(hash(i,seed+5)-t*(.75+hash(i,9)*.5)),y=mix(ground+.04,Math.max(top,ground+.15),fall);w.rain.push({p:[x+(fall-.5)*.18,y,z],s:.35+hash(i,8)*.35,c:'#bddcf0',a:.19+hash(i,6)*.22});}}
  let beat=t%(8.0-3.5*atm.thunder);let flash=atm.thunder>.23&&beat<.38?Math.pow(Math.max(0,1-beat/.38),2)*(.65+.35*Math.sin(beat*56)**2):0;w.flash=flash;for(let m of w.lightning){m.model=move;m.visible=flash>.025;m.mat.opacity=flash*(m===w.lightning[0]?.20:.95);}
  for(let car of base.cars){let u=fract(t*.007+car.phase);car.m.model=M.translate(samplePath(car.path,u));}
 };
 w.update(3.6,.5);return w;
}
function createCycloneScene(w,params,base){w.camera={distance:35,target:[0,1.6,0],yaw:.10,pitch:1.15};w.cyclone=true;w.curveMeshes=[];w.flowBatches=[];
 const spiral=[];for(let i=0;i<20;i++){let theta=i/20*TAU;spiral.push({fn:u=>{let r=mix(11,1.1,u),a=theta-u*2.2;return[r*Math.cos(a)-.7,1.0+u*.5,r*Math.sin(a)*.62-.5]},count:4,speed:.035});}makeFlowBatch(w,spiral,'#85c9da');
 // The low and frontal arms evolve by regenerating only small line meshes.
 w.dynamicFront=[];w.cloudMeta=[];let r=rng(900);for(let j=0;j<250;j++){let u=r(),theta=u*TAU*1.65;let rad=.8+u*8.5;let c=cloudPoint(w,[rad*Math.cos(theta),2+r()*1.1,rad*Math.sin(theta)*.68],1.0+r()*1.2,.45+r()*.2,r()*60,'#d6e2e5');c.u=u;c.rad=rad;c.theta=theta;}
 w.lastBucket=-1;w.fx=0;w.lightning=[];
 w.update=function(t,p){w.time=t;w.progress=p;w.atmos=modelAtmosphere('cyclone',p,params);w.flash=0;let develop=.30+.70*Math.sin(p*Math.PI),turn=p*.75;
  const bucket=Math.floor(p*90);if(bucket!==w.lastBucket){w.lastBucket=bucket;let old=w.dynamicFront;w.meshes=w.meshes.filter(m=>!old.includes(m));if(w.renderer)w.renderer.disposeMeshes(old);w.dynamicFront=[];let center=[-.8,1.05,-1.0];
   let coldFn=u=>[center[0]-u*(3.0-2*p)+Math.sin(u*3.2+p*2)*1.2, .10,center[2]+u*8.1],warmFn=u=>[center[0]+u*11.8,.11,center[2]+Math.sin(u*2.8+p*2)*1.5-u*.9];
   function arm(fn,kind){let b=new Builder(),pts=pathPoints(fn,90),c=kind==='cold'?colors.cold:kind==='warm'?colors.warm:colors.purple;b.append(tubeGeometry(pts,.045,c,6));for(let u=.16;u<.98;u+=.10){let a=fn(u),next=fn(u+.012),dir=V.norm(V.sub(next,a)),normal=[dir[2],0,-dir[0]];if(kind==='cold'||kind==='occluded'&&Math.round((u-.16)/.10)%2===0){b.face(V.add(a,V.mul(dir,-.22)),V.add(a,V.mul(normal,.45)),V.add(a,V.mul(dir,.22)),c,[0,1,0]);}else{b.append(ringGeometry(0,.24,c,'xz',16,0,Math.PI),M.compose(a,[0,Math.atan2(normal[0],normal[2]),0]));}}let m=w.mesh(b.build(),{unlit:1,fit:true},'front');m.castShadow=false;w.dynamicFront.push(m);}
   arm(coldFn,'cold');arm(warmFn,'warm');if(p>.48){let len=(p-.48)*TAU*1.65;arm(u=>[center[0]-Math.sin(u*len)*2.2,.12,center[2]-Math.cos(u*len)*1.5],'occluded');}
  }
  for(let c of w.cloudMeta){let a=c.theta-turn-t*.011;let r=c.rad*(1.05-.25*develop);c.p=[r*Math.cos(a)-.8,c.base[1],r*Math.sin(a)*.68-1];c.s=c.baseSize*(.7+.6*develop);c.a=c.baseAlpha*w.atmos.cloud*develop;}
  w.particles=[];for(let g of w.flowBatches){for(let d of g.defs)for(let i=0;i<d.count;i++){let u=fract(t*.034+i/d.count+d.phase),v=samplePath(d.samples,u);v[1]=Math.max(v[1],base.airHeight(v[0],v[2])+.55);w.particles.push({p:v,s:.13,c:g.color,a:.8});}}
  w.rain=[];for(let i=0;i<Math.round(460*w.atmos.rain*develop);i++){let u=hash(i,4),a=u*TAU*1.65-turn-t*.011,rad=(.8+u*8.5)*(1.05-.25*develop),x=rad*Math.cos(a)-.8,z=rad*Math.sin(a)*.68-1,ground=w.terrain.height(x,z);w.rain.push({p:[x,mix(ground,Math.max(ground+.1,2.5),fract(hash(i,5)-t)),z],s:.32,c:'#add5e8',a:.2});}
  for(let car of base.cars)car.m.model=M.translate(samplePath(car.path,fract(t*.007+car.phase)));
 };
 w.update(3.6,.5);return w;
}


/* MODULE: main.js */
/* Front Atlas — offline application, UI and deterministic inspection hooks. */
const $=id=>document.getElementById(id), $$=q=>[...document.querySelectorAll(q)];
const ICONS={
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 route:'<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 16V8a3 3 0 0 1 6 0v8a4 4 0 0 0 8 0V8"/>',
 orbit:'<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/><path d="m19 3 2 2"/>',
 section:'<path d="M3 18V5h18v13H3Zm0-6h18M8 5v13"/><path d="m13 15 3-5 4 5"/>',
 top:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15"/>',
 volumeOff:'<path d="m11 4-5 5H2v6h4l5 5V4Zm5 5 6 6m0-6-6 6"/>',
 volume:'<path d="m11 4-5 5H2v6h4l5 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 bulb:'<path d="M8 16c-6-4-2-13 4-13s10 9 4 13v3H8v-3Zm1 6h6m-3-3v-6m-3-3 3 3 3-3"/>',
 reset:'<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
 focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/>',
 tag:'<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/>',
 sliders:'<path d="M3 6h7m4 0h7M3 12h12m4 0h2M3 18h3m4 0h11"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 cloud:'<path d="M7 18h11a4 4 0 1 0-1-8A6 6 0 0 0 5 9a4.5 4.5 0 0 0 2 9Z"/>',
 rain:'<path d="M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11 1 4 4 0 0 1 2 7H5Zm2 3-1 4m6-4-1 4m6-4-1 4"/>',
 bolt:'<path d="m14 2-9 12h6l-1 8 9-13h-6l1-7Z"/>',
 station:'<circle cx="12" cy="8" r="3"/><path d="M6 14a8 8 0 1 1 12 0m-6-3v11m-5 0h10"/>',
 pressure:'<ellipse cx="12" cy="12" rx="4" ry="5"/><ellipse cx="12" cy="12" rx="8" ry="10"/><path d="M2 18A13 13 0 0 1 6 2M22 6a13 13 0 0 1-4 16"/>',
 temp:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-5v8"/>',
 wind:'<path d="M3 7h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 17h5a2 2 0 1 1-2 2"/>',
 spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
 play:'<path d="m8 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor" stroke="none"/>',
 restart:'<path d="M5 5v14m14-14L8 12l11 7V5Z"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 drop:'<path d="M12 2s-7 8-7 13a7 7 0 1 0 14 0C19 10 12 2 12 2Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
 slope:'<path d="M3 20 21 4v16H3Zm11 0a8 8 0 0 0-3-5"/>',
 cold:'<path d="M2 9h20M4 9l4 6 4-6m1 0 4 6 4-6"/>',
 warm:'<path d="M2 15h20M3 15a4 4 0 0 1 8 0m2 0a4 4 0 0 1 8 0"/>',
 stationary:'<path d="M2 12h20M3 12l4-6 4 6m2 0a4 4 0 0 0 8 0"/>',
 occluded:'<path d="M2 15h20M3 15l4-6 4 6m2 0a4 4 0 0 1 8 0"/>',
 cyclone:'<path d="M12 12c8-8 12 2 5 7s-14 0-11-7 11-9 15-5M12 12C4 20 0 10 7 5s14 0 11 7"/>'
};
function icon(name){return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name]||ICONS.layers)+'</svg>'}
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}
function frontGlyph(type){let a=type==='cold'?'#63b8ff':type==='warm'?'#ff9575':'#bd97ee';if(type==='stationary')return '<svg class="front-symbol" viewBox="0 0 78 26" aria-hidden="true"><path d="M3 13h72" stroke="#79adcf" stroke-width="2"/><path d="m9 13 6-9 6 9m23 0 6-9 6 9" fill="#63b8ff"/><path d="M26 13a7 7 0 0 0 14 0m22 0a7 7 0 0 0 14 0" fill="#ff9575"/></svg>';return '<svg class="front-symbol" viewBox="0 0 78 26" aria-hidden="true"><path d="M3 16h72" stroke="'+a+'" stroke-width="2"/>'+[8,30,52].map((x,i)=>type==='cold'||(type==='occluded'&&i%2===0)?'<path d="m'+x+' 16 7-10 7 10" fill="'+a+'"/>':'<path d="M'+x+' 16a7 7 0 0 1 14 0" fill="'+a+'"/>').join('')+'</svg>'}

const CONFIG = [
  {id:'delta',icon:'temp',min:4,max:25,step:1,unit:'°C'},
  {id:'speed',icon:'wind',min:5,max:70,step:1,unit:'km/h'},
  {id:'humidity',icon:'drop',min:20,max:100,step:1,unit:'%'},
  {id:'instability',icon:'bolt',min:0,max:100,step:1,unit:'%'},
  {id:'slope',icon:'slope',min:40,max:300,step:5,unit:'ratio'}
];
const store = {
  get(key){try{return JSON.parse(localStorage.getItem('front-atlas:'+key));}catch{return null;}},
  set(key,value){try{localStorage.setItem('front-atlas:'+key,JSON.stringify(value));}catch{/* Private browsing and file origins may deny storage. */}}
};
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  lesson:'cold', lang:language, p:.5, time:43.6, playing:false, rate:1, view:'free',
  params:{...PRESETS.cold}, town:'qingshan', field:0,
  overlays:{clouds:true,rain:true,lightning:true,flow:true}, labels:true,
  quality:1, book:'lesson', bookLesson:'cold', quiz:{index:0,answers:{}},
  sound:true, reduced:systemMotion.matches, loop:false, tour:false, tourPhase:-1
};
let renderer,camera,base,world,frame=0,lastNow=0,lastUI=0,ready=false,dirty=true;
let captureNext=false,rebuildTimer,toastTimer,resizeObserver,audio,lastThunder=-100,disposed=0;
let frozen=false,renderCount=0,chartBuildCount=0,pTween=null,scrub=null,toastState=null;
let openRail=null,railOpener=null,dialogResume=false,lastDialogTrigger=null;
const lessonMemory=new Map(),errors=[];
const textCache=new WeakMap();
window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
function setText(el,value){if(!el)return;const s=String(value);if(textCache.get(el)!==s||el.textContent!==s){el.textContent=s;textCache.set(el,s);}}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function townNow(){return TOWNS.find(t=>t.id===state.town)||TOWNS[1];}
function invalidate(){dirty=true;}
function localize(root=document){
  root.querySelectorAll('[data-i18n]').forEach(el=>setText(el,t(el.dataset.i18n)));
  root.querySelectorAll('[data-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.aria)));
  root.querySelectorAll('[data-tip-key]').forEach(el=>el.dataset.tip=t(el.dataset.tipKey));
}
function applyLocale(){
  document.documentElement.lang=language==='en'?'en':'zh-CN';
  document.documentElement.dataset.lang=language;
  document.title=t('brand')+' · 3D Weather Lab | MakerJackie';
  document.querySelector('meta[name="description"]').content=t('description');
  localize();
  $$('[data-language-toggle]').forEach(b=>{
    b.querySelectorAll('[data-lang]').forEach(s=>s.classList.toggle('active',s.dataset.lang===language));
    b.setAttribute('aria-label',t('langToggle'));
    // Only the language switch itself intentionally retains the other script.
  });
  setText($('controlHint'),t(matchMedia('(pointer: coarse)').matches?'touchHint':'controlHint'));
}
function setLanguage(lang,{announce=true}={}){
  if(!['en','zh'].includes(lang)||lang===language)return; document.body.dispatchEvent(new CustomEvent('world-language', {bubbles:true, detail:lang}));
  const scroll=$('bookContent').scrollTop,previousToast=toastState,wasToastVisible=$('toast').classList.contains('show');
  language=lang;state.lang=lang;store.set('lang',lang);
  hideTooltip();hideTimePreview();applyLocale();
  if(ready){
    renderLessonUI();renderTownUI();renderSliders();invalidateChart();updateUI(true);updateLabels();
    if($('bookDialog').open){renderBook(state.book);$('bookContent').scrollTop=scroll;}
    if($('helpDialog').open)renderHelp();
    syncControlStates();invalidate();
  }
  if(wasToastVisible&&previousToast?.action)toast(previousToast.key,previousToast.values,previousToast.action);
  else if(announce)toast('langChanged');
  else if(wasToastVisible&&previousToast)toast(previousToast.key,previousToast.values);
}
function toast(key,values={},action=null){
  values={...values};
  if(key==='qualityChanged')values.name=t(['eco','balanced','high'][state.quality]);
  if(key==='townChanged'||key==='townFocused')values.name=townName(townNow());
  if(key==='lessonRestored')values.name=lessonData(state.lesson).title;
  toastState={key,values,action};
  (document.querySelector('dialog[open]')||document.body).append($('toast'));
  setText($('toastText'),t(key,values));
  $('toastAction').hidden=!action;
  if(action){setText($('toastAction'),t(action.key||'undo'));$('toastAction').onclick=()=>{action.run();dismissToast();};}
  $('toast').classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(dismissToast,action?7200:3300);
}
function dismissToast(){
  if(document.activeElement===$('toastAction'))$('toastAction').blur();
  clearTimeout(toastTimer);$('toast').classList.remove('show');toastState=null;
  $('toastAction').hidden=true;$('toastAction').onclick=null;setText($('toastText'),'');
}
function phaseAt(p=state.p){
  if(['cold','warm'].includes(state.lesson)){
    const d=observation(state.lesson,p,state.params,townNow()).d;
    return d< -6?0:d< -1?1:d<1.8?2:d<6?3:4;
  }
  return phaseIndex(p);
}
function phaseProgress(i){
  return ['cold','warm'].includes(state.lesson)
    ?clamp((townNow().x-frontBend(townNow().z)+[-10,-3,0,3.5,9][i]+16)/32)
    :[.07,.32,.52,.72,.94][i];
}
function setPlaying(on){
  if(on&&state.p>=.999){state.p=0;state.time=3.6;}
  state.playing=!!on;pTween=null;dismissIntro();showPlay();invalidate();
  if(audio&&!on)audio.bus.gain.setTargetAtTime(0,audio.ctx.currentTime,.12);
}
function showPlay(){
  const key=state.playing?'pause':'play';
  if($('playBtn').dataset.show!==key){$('playBtn').innerHTML=icon(key);$('playBtn').dataset.show=key;}
  $('playBtn').setAttribute('aria-label',t(key));
  $('playBtn').setAttribute('aria-pressed',String(state.playing));
  setText($('simState'),t(scrub?'scrubbing':state.tour?'tourRunning':state.playing?'playing':'paused'));
  document.body.classList.toggle('is-playing',state.playing);
}
function seek(value,{smoothly=false,pause=true}={}){
  if(!Number.isFinite(value))return;
  const next=clamp(value);
  if(pause)state.playing=false;
  if(smoothly&&!state.reduced){pTween={from:state.p,to:next,elapsed:0,duration:.46};}
  else{pTween=null;state.p=next;state.time=3.6+next*80;}
  invalidate();updateUI(true);showPlay();
}
function goPhase(index){
  stopTour(false);dismissIntro();seek(phaseProgress(index),{smoothly:true});
}
function rebuildWorld(){
  clearTimeout(rebuildTimer);
  if(world){
    const owned=world.meshes.filter(m=>!base.meshes.includes(m));
    renderer.disposeMeshes([...owned,...(world.lightning||[])]);disposed+=owned.length;
  }
  world=createFrontScene(state.lesson,state.params,base);world.renderer=renderer;
  world.update(state.time,state.p);renderer.shadowKey=null;invalidate();
}
function rememberLesson(){if(world)lessonMemory.set(state.lesson,{params:{...state.params},p:state.p,time:state.time,view:state.view,town:state.town});}
function setLesson(kind,{reset=false,preserveCamera=false,announce=false}={}){
  if(!LESSONS[kind])return;
  const same=kind===state.lesson;
  if(world&&!same)rememberLesson();
  stopTour(false);pTween=null;scrub=null;state.playing=false;
  state.lesson=kind;
  const saved=!reset?lessonMemory.get(kind):null;
  if(reset||!same){
    Object.assign(state.params,saved?.params||PRESETS[kind]);
    state.p=saved?.p??(kind==='occluded'?.38:.5);
    state.time=saved?.time??(3.6+state.p*80);
    if(saved){state.view=saved.view;state.town=saved.town;}
  }
  if(reset)lessonMemory.delete(kind);
  rebuildWorld();renderLessonUI();renderTownUI();renderSliders();invalidateChart();
  if(!preserveCamera)changeView(state.view,!ready,{quiet:true,fromTour:true});
  updateUI(true);syncControlStates();
  if($('bookDialog').open&&state.book==='lesson'){state.bookLesson=kind;renderBook('lesson');}
  if(announce&&saved)toast('lessonRestored',{name:lessonData(kind).title});
}
function paramDisabled(id){return id==='speed'&&['stationary','air','cyclone'].includes(state.lesson)||id==='slope'&&state.lesson==='cyclone';}
function setParam(id,value,{allowDisabled=false}={}){
  const config=CONFIG.find(c=>c.id===id);
  if(!config||!Number.isFinite(value)||paramDisabled(id)&&!allowDisabled)return;
  const v=clamp(config.min+Math.round((value-config.min)/config.step)*config.step,config.min,config.max);
  dismissIntro();state.params[id]=v;syncParamValue(id);invalidateChart();invalidate();
  if(id==='slope'){
    clearTimeout(rebuildTimer);
    rebuildTimer=setTimeout(()=>{rebuildWorld();updateUI(true);},120);
  }
  updateParameterFeedback();updateUI(true);
}
function experimentSnapshot(){return{lesson:state.lesson,params:{...state.params},p:state.p,time:state.time,view:state.view,town:state.town};}
function restoreExperiment(snap){
  state.lesson=snap.lesson;Object.assign(state.params,snap.params);state.p=snap.p;state.time=snap.time;state.view=snap.view;state.town=snap.town;
  state.playing=false;pTween=null;stopTour(false);rebuildWorld();renderLessonUI();renderTownUI();renderSliders();invalidateChart();
  changeView(state.view,false,{quiet:true,fromTour:true});updateUI(true);syncControlStates();
}
function resetParameters(){
  const previous=experimentSnapshot();
  Object.assign(state.params,PRESETS[state.lesson]);rebuildWorld();renderSliders();invalidateChart();updateUI(true);
  toast('paramsReset',{}, {run:()=>restoreExperiment(previous)});
}
function applyScenario(storm){
  const previous=experimentSnapshot();
  setLesson('cold',{reset:true,preserveCamera:true});
  Object.assign(state.params,{humidity:storm?95:30,instability:storm?95:25});
  renderSliders();invalidateChart();invalidate();updateUI(true);dismissIntro();
  toast(storm?'stormApplied':'dryApplied',{}, {run:()=>restoreExperiment(previous)});
}
function changeView(view,immediate=false,{quiet=false,fromTour=false}={}){
  if(!['free','side','top'].includes(view))return;
  if(!fromTour)stopTour(false);
  state.view=view;camera?.preset(view,world,immediate||state.reduced);
  syncViewTabs();invalidate();
  if(view==='side'&&!quiet)toast('sectionNotice');
}
function syncViewTabs(){
  $$('[data-view]').forEach(b=>{const on=b.dataset.view===state.view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('sectionRuler').hidden=state.view!=='side';
}
function setOverlay(key,on){
  if(!Object.hasOwn(state.overlays,key))return;
  if(key==='lightning'&&state.reduced&&on){toast('limitedLightning');return;}
  dismissIntro();state.overlays[key]=!!on;syncControlStates();invalidate();
}
function setField(type){
  if(type==='flow'||type==='rain'){setOverlay(type,!state.overlays[type]);return;}
  const next=type==='pressure'?2:1;state.field=state.field===next?0:next;
  syncControlStates();invalidate();if(state.field===2)toast('pressureNotice');
}
function selectTown(id,{announce=false}={}){
  if(!TOWNS.some(t=>t.id===id))return;
  dismissIntro();state.town=id;$('townSelect').value=id;renderPhaseButtons();invalidateChart();updateUI(true);invalidate();
  if(announce)toast('townChanged',{name:townName(townNow())});
}
function focusTown(){
  const town=townNow();stopTour(false);state.view='free';syncViewTabs();
  camera.focusAt([town.x,base.terrain.height(town.x,town.z),town.z]);
  invalidate();dismissIntro();closeRails();toast('townFocused',{name:townName(town)});
}
function startTour(){
  if(state.tour){stopTour();return;}
  state.tour=true;state.tourPhase=-1;state.p=0;state.time=3.6;setPlaying(true);
  updateTour();syncControlStates();toast('tourStarted');
}
function stopTour(announce=true){
  if(!state.tour)return;state.tour=false;state.tourPhase=-1;syncControlStates();
  if(announce)toast('tourStopped');
}
function updateTour(){
  if(!state.tour)return;
  const i=phaseAt();if(i===state.tourPhase)return;state.tourPhase=i;
  const views=state.lesson==='cyclone'?['free','top','top','free','top']:['free','side','side','top','free'];
  changeView(views[i],false,{quiet:true,fromTour:true});
}
function syncControlStates(){
  if(!$('tourBtn'))return;
  syncViewTabs();showPlay();
  $$('[data-toggle]').forEach(b=>{const on=state.overlays[b.dataset.toggle];b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $$('[data-field]').forEach(b=>{
    const k=b.dataset.field,on=k==='temperature'?state.field===1:k==='pressure'?state.field===2:state.overlays[k];
    b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
  });
  $('labelsBtn').classList.toggle('active',state.labels);$('labelsBtn').setAttribute('aria-pressed',String(state.labels));
  $('soundBtn').classList.toggle('active',state.sound);$('soundBtn').setAttribute('aria-pressed',String(state.sound));$('soundBtn').setAttribute('aria-label',t(state.sound?'soundOn':'soundOff'));
  $('tourBtn').classList.toggle('active',state.tour);$('tourBtn').setAttribute('aria-pressed',String(state.tour));
  setText($('tourBtn').querySelector('span'),t(state.tour?'tourEnd':'autoTour'));
  $('qualitySelect').value=String(state.quality);setText($('speedBtn'),state.rate+'×');
  document.body.classList.toggle('reduced-effects',state.reduced);
}
function resize(){
  if(!renderer)return;
  const b=$('stage').getBoundingClientRect();if(b.width<1||b.height<1)return;
  renderer.resize(b.width,b.height,state.quality);invalidate();
}
function drawCurrent(dt=.016){
  world.update(state.time,state.p);camera.update(renderer.cssWidth/renderer.cssHeight,dt);
  renderer.field=state.field;renderer.frontX=world.fx||0;
  renderer.frontKind={cold:0,warm:1,stationary:2,occluded:3,cyclone:4,air:5}[state.lesson];
  renderer.progress=state.p;
  renderer.flash=state.overlays.lightning&&!state.reduced?world.flash||0:0;
  renderer.render(world,camera,state.time,{...state.overlays,lightning:state.overlays.lightning&&!state.reduced,section:state.view==='side',cut:state.view==='side',contours:false});
  updateLabels();renderCount++;dirty=false;
}
function loop(now){
  if(!ready||frozen)return;
  const dt=lastNow?Math.min(.5,(now-lastNow)/1000):.016;lastNow=now;
  if(!document.hidden){
    if(pTween){
      pTween.elapsed+=dt;const u=clamp(pTween.elapsed/pTween.duration),q=u*u*(3-2*u);
      state.p=mix(pTween.from,pTween.to,q);state.time=3.6+state.p*80;invalidate();
      if(u>=1){pTween=null;updateUI(true);}
    }else if(state.playing&&!scrub){
      state.time+=dt*state.rate;
      const rate=['stationary','air','cyclone'].includes(state.lesson)?.8:state.params.speed/40;
      state.p=Math.min(1,state.p+dt*rate*state.rate/80);invalidate();
      if(state.p>=1){
        if(state.loop){state.p=0;state.time=3.6;state.tourPhase=-1;}
        else{setPlaying(false);stopTour(false);toast('end');updateUI(true);}
      }
      updateTour();
    }
    if(dirty||camera.moving||captureNext){drawCurrent(dt);}
    if(now-lastUI>100&&(state.playing||pTween||scrub)){updateUI();lastUI=now;}
    updateAudio();
    if(captureNext){captureNext=false;captureScene();}
  }
  frame=requestAnimationFrame(loop);
}


/* MODULE: ui.js */
/* DOM rendering is separated from simulation. Charts cache their curves, and
 * changing language never rebuilds the 3D world or changes the camera. */
let chartKey='',chartInfo=null;
function renderLessonUI(){
  const lesson=lessonData(state.lesson);
  document.documentElement.style.setProperty('--accent',lesson.color);
  setText($('stageEyebrow'),'EXPERIMENT '+lesson.no+' / '+lesson.en);
  $('stageTitle').innerHTML=esc(lesson.title)+(language==='zh'?'<span>'+esc(lesson.en)+'</span>':'');
  setText($('stageSubtitle'),lesson.short);setText($('knowledgeTitle'),lesson.title);
  $('keyPoints').innerHTML=lesson.points.map(p=>'<p>'+esc(p)+'</p>').join('');
  setText($('experimentText'),lesson.experiment);setText($('cautionText'),lesson.caution);
  $('lessonNav').innerHTML=Object.keys(LESSONS).map(id=>{
    const l=lessonData(id);return '<button class="lesson-btn '+(id===state.lesson?'active':'')+'" data-lesson="'+id+'" '+(id===state.lesson?'aria-current="page"':'')+'><span class="lesson-icon">'+icon(l.icon)+'</span><span class="lesson-name">'+esc(l.title)+(language==='zh'?'<small>'+l.en+'</small>':'')+'</span><span class="lesson-no">'+l.no+'</span></button>';
  }).join('');
  $('legendItems').innerHTML=['cold','warm','stationary','occluded'].map(id=>'<button data-legend="'+id+'" data-tip="'+esc(lessonData(id).short)+'" aria-label="'+esc(lessonData(id).title)+'">'+frontGlyph(id)+'<span>'+esc(lessonData(id).title)+'</span></button>').join('');
  renderPhaseButtons();
}
function renderTownUI(){
  $('townSelect').innerHTML=TOWNS.map(town=>'<option value="'+town.id+'">'+esc(townName(town))+'</option>').join('');
  $('townSelect').value=state.town;
  $('townLabels').innerHTML=TOWNS.map(town=>'<button class="world-label town-label '+(town.id===state.town?'selected':'')+'" id="town-'+town.id+'" data-town="'+town.id+'" aria-label="'+esc(townName(town))+'" aria-pressed="'+(town.id===state.town)+'"><span><b>'+esc(townName(town))+'</b><small>— °C</small></span></button>').join('');
}
function renderPhaseButtons(){
  $('phaseButtons').innerHTML=lessonData(state.lesson).phases.map(([name],i)=>'<button data-phase="'+i+'" data-tip="'+esc(name)+'" aria-label="'+esc(t('phaseGo',{name}))+'"><span class="phase-dot"></span><span>'+esc(phaseLabel(state.lesson,i,true))+'</span></button>').join('');
  $('timelineMarkers').innerHTML=Array.from({length:5},(_,i)=>'<i style="left:'+phaseProgress(i)*100+'%"></i>').join('');
}
function paramValueText(id,value){const c=CONFIG.find(x=>x.id===id);return c.unit==='ratio'?'1 : '+value:value+' '+c.unit;}
function renderSliders(){
  $('sliders').innerHTML=CONFIG.map(c=>{
    const disabled=paramDisabled(c.id),v=state.params[c.id];
    const disabledText=c.id==='speed'?t(state.lesson==='stationary'?'stalled':state.lesson==='cyclone'?'lifeCycle':'staticCompare'):t('notApplicable');
    const minmax=' min="'+c.min+'" max="'+c.max+'" step="'+c.step+'"';
    return '<div class="slider-control '+(disabled?'disabled':'')+'" data-control="'+c.id+'">'+
      '<div class="slider-top"><label for="param-'+c.id+'">'+icon(c.icon)+esc(t(c.id))+'</label><button class="param-help" data-param-hint="'+c.id+'" data-tip="'+esc(t(c.id+'Hint'))+'" aria-label="'+esc(t(c.id+'Hint'))+'">?</button>'+
      '<div class="value-editor" id="output-'+c.id+'">'+(disabled?'<span class="disabled-note">'+esc(disabledText)+'</span>':
      (c.unit==='ratio'?'<span class="value-unit">1 :</span>':'')+'<input class="param-number" id="number-'+c.id+'" data-number="'+c.id+'" type="number" inputmode="decimal"'+minmax+' value="'+v+'" aria-label="'+esc(t(c.id)+' '+(c.unit==='ratio'?'1:n':c.unit))+'" data-tip="'+esc(t('typeValue'))+'">'+(c.unit!=='ratio'?'<span class="value-unit">'+c.unit+'</span>':''))+'</div></div>'+
      '<div class="slider-track"><input id="param-'+c.id+'" data-param="'+c.id+'" type="range"'+minmax+' value="'+clamp(v,c.min,c.max)+'" '+(disabled?'disabled':'')+' aria-label="'+esc(t(c.id))+'" aria-describedby="hint-'+c.id+'" style="--fill:'+clamp((v-c.min)/(c.max-c.min))*100+'%">'+
      '<span class="default-tick" style="left:'+clamp((PRESETS[state.lesson][c.id]-c.min)/(c.max-c.min))*100+'%" aria-hidden="true"></span></div><span class="sr-only" id="hint-'+c.id+'">'+esc(disabled?disabledText:t(c.id+'Hint'))+'</span></div>';
  }).join('');
  $('sliders').querySelectorAll('input[type=range]').forEach(input=>{
    input.addEventListener('input',()=>setParam(input.dataset.param,+input.value));
    input.addEventListener('pointerdown',()=>input.closest('.slider-control').classList.add('adjusting'));
    for(const ev of ['pointerup','pointercancel','blur'])input.addEventListener(ev,()=>input.closest('.slider-control').classList.remove('adjusting'));
  });
  $('sliders').querySelectorAll('[data-number]').forEach(input=>{
    let original=state.params[input.dataset.number],cancelled=false;
    const config=CONFIG.find(c=>c.id===input.dataset.number);
    input.addEventListener('focus',()=>{original=state.params[input.dataset.number];cancelled=false;input.select();});
    input.addEventListener('input',()=>{
      const v=input.valueAsNumber;
      if(Number.isFinite(v)&&v>=config.min&&v<=config.max)setParam(config.id,v);
    });
    input.addEventListener('blur',()=>{
      if(!cancelled){const value=input.valueAsNumber;setParam(config.id,Number.isFinite(value)?value:original);}
      input.value=state.params[config.id];input.closest('.slider-control').classList.remove('adjusting');
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();input.blur();}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelled=true;setParam(config.id,original);input.value=original;input.blur();}
    });
  });
  updateParameterFeedback();
}
function syncParamValue(id){
  const config=CONFIG.find(c=>c.id===id),input=$('param-'+id),number=$('number-'+id),value=state.params[id];
  if(input){input.value=value;input.style.setProperty('--fill',clamp((value-config.min)/(config.max-config.min))*100+'%');input.setAttribute('aria-valuetext',paramValueText(id,value));}
  if(number&&document.activeElement!==number)number.value=value;
}
function updateParameterFeedback(){
  const modified=CONFIG.some(c=>state.params[c.id]!==PRESETS[state.lesson][c.id]);
  $('modifiedBadge').hidden=!modified;
  const dry=state.params.humidity<38,storm=state.params.humidity>=85&&state.params.instability>=75;
  setText($('parameterResponse'),t(dry?'dryResponse':storm?'stormResponse':'calmResponse'));
  const panel=$('parameterResponse').parentElement;
  panel.classList.toggle('is-dry',dry);panel.classList.toggle('is-storm',storm);
  $$('[data-control]').forEach(el=>el.classList.toggle('modified',state.params[el.dataset.control]!==PRESETS[state.lesson][el.dataset.control]));
  $('dryPreset').classList.toggle('selected',state.lesson==='cold'&&state.params.humidity===30&&state.params.instability===25);
  $('stormPreset').classList.toggle('selected',state.lesson==='cold'&&state.params.humidity===95&&state.params.instability===95);
}
function invalidateChart(){chartKey='';}
function buildChart(){
  const key=JSON.stringify([state.lesson,state.params,state.town,language]);
  if(key===chartKey){updateChartCursor();return;}
  chartKey=key;chartBuildCount++;
  const data=Array.from({length:81},(_,i)=>observation(state.lesson,i/80,state.params,townNow()));
  const L=24,R=250,T=9,B=99,ty=v=>B-v/32*(B-T),py=v=>B-(v-1000)/24*(B-T),xx=u=>L+u*(R-L);
  chartInfo={L,R,T,B,ty,py,xx};
  const path=(fn,key)=>data.map((d,i)=>(i?'L':'M')+xx(i/80).toFixed(2)+','+fn(d[key]).toFixed(2)).join(' ');
  let markup='';
  for(let j=0;j<4;j++){
    const y=mix(T,B,j/3);
    markup+='<path d="M'+L+' '+y+'H'+R+'" class="chart-grid"/><text x="17" y="'+(y+3)+'" class="chart-axis" text-anchor="end">'+Math.round(mix(32,0,j/3))+'</text><text x="256" y="'+(y+3)+'" class="chart-axis">'+Math.round(mix(1024,1000,j/3))+'</text>';
  }
  const passage=['cold','warm'].includes(state.lesson)?phaseProgress(2):.5;
  markup+='<path d="M'+xx(passage)+' '+T+'V'+B+'" class="chart-passage"/>'+
    '<path d="'+path(ty,'temperature')+'" class="chart-temp"/><path d="'+path(py,'pressure')+'" class="chart-pressure"/>'+
    '<g id="chartCursor"><path d="M0 '+T+'V'+B+'" class="chart-cursor"/><circle id="chartTempDot" cx="0" r="3.2" fill="#ffb08d"/><circle id="chartPressureDot" cx="0" r="3.2" fill="#78caff"/></g>'+
    '<path id="chartHoverCursor" d="M0 '+T+'V'+B+'" class="chart-hover" visibility="hidden"/>'+
    '<text x="24" y="118" class="chart-axis">'+esc(t('chartStart'))+'</text><text x="137" y="118" class="chart-axis" text-anchor="middle">'+esc(t('chartMiddle'))+'</text><text x="250" y="118" class="chart-axis" text-anchor="end">'+esc(t('chartEnd'))+'</text>';
  $('chart').innerHTML=markup;updateChartCursor();
}
function updateChartCursor(){
  if(!chartInfo||!$('chartCursor'))return;
  const {xx,ty,py}=chartInfo,obs=observation(state.lesson,state.p,state.params,townNow());
  $('chartCursor').setAttribute('transform','translate('+xx(state.p).toFixed(2)+',0)');
  $('chartTempDot').setAttribute('cy',ty(obs.temperature).toFixed(2));$('chartPressureDot').setAttribute('cy',py(obs.pressure).toFixed(2));
  $('chart').setAttribute('aria-valuenow',Math.round(state.p*100));
  $('chart').setAttribute('aria-valuetext',Math.round(state.p*100)+'% · '+obs.temperature.toFixed(1)+' °C · '+obs.pressure.toFixed(0)+' hPa');
}
function timeReading(p){
  if(['air','stationary','cyclone'].includes(state.lesson))return Math.round(p*100)+' %';
  const town=townNow(),hours=(frontX(state.lesson,p)+frontBend(town.z)-town.x)*10/Math.max(1,state.params.speed);
  return 'T '+(hours<0?'−':'+')+Math.abs(hours).toFixed(1)+' h';
}
function updateUI(force=false){
  if(!world)return;
  const lesson=lessonData(state.lesson),town=townNow(),obs=observation(state.lesson,state.p,state.params,town),i=phaseAt();
  if(!scrub||scrub.type!=='timeline')$('timeline').value=Math.round(state.p*1000);
  $('timeline').style.setProperty('--fill',state.p*100+'%');
  $('timeline').setAttribute('aria-valuetext',Math.round(state.p*100)+'% · '+lesson.phases[i][0]);
  setText($('timelineProgress'),Math.round(state.p*100)+'%');setText($('phaseCount'),'0'+(i+1)+' / 05');setText($('phaseName'),lesson.phases[i][0]);
  setText($('storyTitle'),lesson.headline);
  setText($('storyText'),state.params.humidity<38&&state.lesson!=='air'?t('dryStory'):lesson.phases[i][1]);
  $$('[data-phase]').forEach((b,j)=>{b.classList.toggle('active',j===i);b.setAttribute('aria-current',j===i?'step':'false');});
  const writeMetric=(id,value,unit)=>{
    const el=$(id);
    if(el.dataset.value!==value){el.innerHTML=value+'<small>'+unit+'</small>';el.dataset.value=value;}
  };
  writeMetric('tempValue',obs.temperature.toFixed(1),'°C');writeMetric('pressureValue',obs.pressure.toFixed(0),'hPa');
  setText($('windValue'),directionName(obs.windDir)+' / '+obs.windSpeed.toFixed(1)+' m/s');setText($('weatherValue'),weatherName(obs));
  setText($('virtualTime'),timeReading(state.p));
  setText($('timeNote'),['air','stationary','cyclone'].includes(state.lesson)?t(state.lesson==='stationary'?'timeStalled':'timeConcept'):t('timeRelative',{name:townName(town)}));
  buildChart();
  for(const town of TOWNS){
    const el=$('town-'+town.id),ob=observation(state.lesson,state.p,state.params,town);if(!el)continue;
    setText(el.querySelector('small'),ob.temperature.toFixed(0)+' °C');
    const on=town.id===state.town;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));
    el.setAttribute('aria-label',townName(town)+' · '+ob.temperature.toFixed(1)+' °C'+(on?' · '+t('selectedTown'):''));
  }
  showPlay();
}
function place(el,p,allow=true){
  const q=camera.project(p,renderer.cssWidth,renderer.cssHeight),visible=allow&&state.labels&&q.visible;
  const v=visible?'visible':'hidden';if(el.style.visibility!==v)el.style.visibility=v;
  if(visible){el.style.left=q.x.toFixed(1)+'px';el.style.top=q.y.toFixed(1)+'px';}
}
function updateLabels(){
  if(!world||!camera.vp)return;
  const fx=world.fx||0,warm=state.lesson==='warm',oc=state.lesson==='occluded',cy=state.lesson==='cyclone',air=state.lesson==='air',inside=Math.abs(fx)<10.5;
  const cx=warm?clamp(fx+6.6,-9,9):clamp(fx-6.6,-9,9),wx=warm?clamp(fx-6.4,-9,9):clamp(fx+6.4,-9,9);
  setText($('warmLabel').querySelector('span'),t(air?'airWarmSub':oc&&state.p>.7?'lifted':warm?'gliding':'warmSub'));
  setText($('coldLabel').querySelector('span'),t(warm?'retreating':state.lesson==='stationary'?'balance':'coldSub'));
  place($('coldLabel'),[cx,4.2,4.9],!cy&&(warm?fx<8:fx>-8));
  place($('warmLabel'),oc?[fx+(world.gap||0)/2,5.1+(world.ocLift||0),4.8]:[wx,5.7,2.5],!cy&&(warm?fx>-8:fx<8));
  place($('coolLabel'),[clamp(fx+(world.gap||0)+4,-9,9),3.2,4.6],oc);
  const height=warm?6.6:1+7.3*(.58+.42*state.params.instability/100);
  setText($('cloudLabel').querySelector('b'),t(warm?'cloudLayer':state.params.instability>52?'cloudConvection':'cloudMixed'));
  setText($('cloudLabel').querySelector('span'),t(warm?'cloudLayerSub':state.params.instability>52?'cloudConvectionSub':'cloudMixedSub'));
  place($('cloudLabel'),[fx+(warm?3:-1.5),height,-2.8],!cy&&!air&&inside&&state.overlays.clouds&&world.atmos.cloud>.12);
  setText($('frontLabel').querySelector('b'),oc?(state.p>.74?lessonData('occluded').title:t('occluding')):air?t('surfaceFront'):lessonData(state.lesson).title);
  setText($('frontLabel').querySelector('span'),t(state.lesson==='stationary'?'nearlyStill':oc?'warmLeaving':'frontDirection'));
  place($('frontLabel'),[fx-(state.view==='side'?0:1.1),1,state.view==='side'?-.15:7.7],!cy&&inside);
  place($('lowLabel'),[-.8,2.5,-1],cy);
  for(const town of TOWNS)place($('town-'+town.id),[town.x,base.terrain.height(town.x,town.z)+.48,town.z],state.view!=='side');
  $('compassNeedle').style.transform='rotate('+(-camera.yaw/DEG)+'deg)';
}
function bookSources(ids){
  const sources=sourcesData();
  return '<div class="inline-sources">'+t('references')+': '+ids.map(i=>'<a href="'+sources[i].url+'" target="_blank" rel="noopener noreferrer">'+esc(sources[i].name)+'</a>').join(' · ')+'</div>';
}
function renderBook(tab,{preserveScroll=false}={}){
  if(!['lesson','compare','quiz','sources'].includes(tab))return;
  const scroll=$('bookContent').scrollTop;state.book=tab;
  $$('[data-book]').forEach(b=>{const on=b.dataset.book===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  const l=lessonData(state.bookLesson);let html='';
  setText($('dialogTitle'),t('bookTitle'+({lesson:'Lesson',compare:'Compare',quiz:'Quiz',sources:'Sources'}[tab]),{name:l.title}));
  if(tab==='lesson'){
    html='<div class="book-intro"><span class="eyebrow">'+l.en+'</span><h3>'+esc(l.headline)+'</h3><p>'+esc(l.sub)+'</p></div><div class="book-sections">'+l.sections.map(([heading,body],i)=>'<section><span class="section-number">0'+(i+1)+'</span><div><h3>'+esc(heading)+'</h3><p>'+esc(body)+'</p></div></section>').join('')+'</div>'+
    '<div class="book-callout">'+icon('spark')+'<div><b>'+t('avoidAbsolute')+'</b><p>'+esc(l.caution)+'</p></div></div>'+bookSources(l.sources)+
    '<button class="open-experiment" data-scene-lesson="'+state.bookLesson+'">'+t('openExperiment')+'</button>'+
    '<div class="book-navigation">'+Object.keys(LESSONS).map(id=>'<button data-read="'+id+'" class="'+(id===state.bookLesson?'active':'')+'">'+lessonData(id).no+' '+esc(lessonData(id).title)+'</button>').join('')+'</div>';
  }else if(tab==='compare'){
    const rows=language==='en'?COMPARE_EN:COMPARE;
    html='<p class="book-lead">'+t('compareIntro')+'</p><div class="table-scroll" tabindex="0"><table><thead><tr><th>'+t('comparisonFactor')+'</th>'+['cold','warm','stationary','occluded'].map(id=>'<th>'+frontGlyph(id)+esc(lessonData(id).title)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<'+(i?'td':'th')+'>'+esc(v)+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</tbody></table></div>'+
      '<h3 class="book-subtitle">'+t('passageSequence')+'</h3><div class="passage-grid">'+['cold','warm'].map(id=>{const x=lessonData(id);return '<section><h3>'+esc(x.title)+'</h3>'+[0,2,4].map(i=>'<p><b>'+esc(x.phases[i][0])+'</b>'+esc(x.phases[i][1])+'</p>').join('')+'</section>';}).join('')+'</div>'+
      '<div class="book-callout"><div><b>'+t('occlusionTypes')+'</b><p>'+t('occlusionExplain')+'</p></div></div>'+bookSources([0,1,3]);
  }else if(tab==='sources'){
    html='<p class="book-lead">'+t('sourceIntro')+'</p><div class="source-list">'+sourcesData().map((s,i)=>'<a class="source-card" href="'+s.url+'" target="_blank" rel="noopener noreferrer"><span>0'+(i+1)+'</span><div><b>'+esc(s.name)+'</b><p>'+esc(s.use)+'</p></div><i>↗</i></a>').join('')+'</div>'+
      '<h3 class="book-subtitle">'+t('modelNotes')+'</h3><div class="limit-grid">'+['Space','Params','Scope','Visual'].map(k=>'<section><b>'+t('model'+k)+'</b><p>'+t('model'+k+'Text')+'</p></section>').join('')+'</div><div class="book-callout"><div><b>'+t('textbook')+'</b><p>'+t('textbookText')+'</p></div></div>';
  }else{
    const qs=questionsData(),q=qs[state.quiz.index],answer=state.quiz.answers[state.quiz.index],answered=answer!==undefined;
    const score=Object.entries(state.quiz.answers).filter(([i,a])=>qs[+i]?.correct===a).length;
    html='<div class="quiz-meta"><span>'+t('questionNo',{n:state.quiz.index+1,total:qs.length})+'</span><span>'+t('quizScore',{answered:Object.keys(state.quiz.answers).length,score})+'</span></div><h3 class="quiz-question">'+esc(q.q)+'</h3><div class="quiz-answers">'+q.a.map((a,i)=>'<button data-answer="'+i+'" class="'+(answered?(i===q.correct?'correct':answer===i?'incorrect':''):'')+'" '+(answered?'disabled':'')+'><span>'+String.fromCharCode(65+i)+'</span>'+esc(a)+(answered&&i===q.correct?'<b>✓</b>':'')+'</button>').join('')+'</div>'+
      (answered?'<div class="quiz-explanation" role="status"><b>'+t(answer===q.correct?'correct':'incorrect')+'</b><p>'+esc(q.ex)+'</p></div>':'<p class="quiz-hint">'+t('quizHint')+'</p>')+
      '<div class="quiz-footer"><button id="quizPrev" '+(state.quiz.index===0?'disabled':'')+'>'+t('prevQuestion')+'</button><button id="quizReset">'+t('resetQuiz')+'</button><button id="quizNext">'+t(state.quiz.index===qs.length-1?'firstQuestion':'nextQuestion')+'</button></div><div class="quiz-dots">'+qs.map((_,i)=>'<button data-question="'+i+'" aria-label="'+esc(t('questionLabel',{n:i+1}))+'" class="'+(i===state.quiz.index?'active':'')+' '+(state.quiz.answers[i]!==undefined?'answered':'')+'">'+(i+1)+'</button>').join('')+'</div>';
  }
  $('bookContent').innerHTML=html;$('bookContent').scrollTop=preserveScroll?scroll:0;
}
function renderHelp(){
  const cards=[['orbit','Orbit'],['mouse','Pan'],['play','Time'],['sliders','Params']];
  const keys=[['Space','Space'],['← / →','Arrows'],['1 / 2 / 3','Views'],['+ / −','Zoom'],['R','R'],['F','F'],['L','L'],['Esc','Esc']];
  $('helpContent').innerHTML='<div class="help-grid">'+cards.map(([ic,k])=>'<section>'+icon(ic)+'<div><h3>'+t('help'+k)+'</h3><p>'+t('help'+k+'Text')+'</p></div></section>').join('')+'</div>'+
    '<h3 class="help-subtitle">'+t('helpKeyboard')+'</h3><div class="shortcut-grid">'+keys.map(([key,name])=>'<div><kbd>'+key+'</kbd><span>'+t('key'+name)+'</span></div>').join('')+'</div>'+
    '<h3 class="help-subtitle">'+t('preferences')+'</h3><div class="preference-list">'+['reduced','loop'].map(k=>'<label class="preference"><span><b>'+t(k)+'</b><small>'+t(k+'Text')+'</small></span><input type="checkbox" role="switch" id="preference-'+k+'" '+(state[k]?'checked':'')+'><span class="switch-track" aria-hidden="true"></span></label>').join('')+'</div><p class="prefs-note">'+t('prefsLocal')+'</p><p class="prefs-note">'+t('bookmarkNote')+'</p>';
}
function showTimePreview(progress,clientX,clientY){
  const p=clamp(progress),i=phaseAt(p),obs=observation(state.lesson,p,state.params,townNow());
  const el=$('timePreview');
  setText(el.querySelector('b'),phaseLabel(state.lesson,i));
  setText(el.querySelector('span'),townName(townNow())+' · '+timeReading(p));
  setText(el.querySelector('small'),obs.temperature.toFixed(1)+' °C   /   '+obs.pressure.toFixed(0)+' hPa');
  el.hidden=false;
  const w=el.offsetWidth,h=el.offsetHeight;
  el.style.left=clamp(clientX-w/2,8,innerWidth-w-8)+'px';
  el.style.top=clamp(clientY-h-17,8,innerHeight-h-8)+'px';
}
function hideTimePreview(){
  $('timePreview').hidden=true;
  if($('chartHoverCursor'))$('chartHoverCursor').setAttribute('visibility','hidden');
}


/* MODULE: interactions.js */
/* Interaction choreography: reversible actions, pointer-safe scrubbing,
 * focused drawers, native dialogs and keyboard shortcuts. */
let tooltipTimer,tooltipOwner=null,switchingDialog=false,gestureStart=null;
const labelGestures=new Map();
function hideTooltip(){
  clearTimeout(tooltipTimer);
  if(tooltipOwner)tooltipOwner.removeAttribute('aria-describedby');
  tooltipOwner=null;$('tooltip').hidden=true;
}
function requestTooltip(target,keyboard=false){
  if(!target?.dataset.tip||(!keyboard&&matchMedia('(pointer:coarse)').matches))return;
  hideTooltip();
  tooltipTimer=setTimeout(()=>{
    if(!target.isConnected||target.closest('[inert]'))return;
    tooltipOwner=target;const el=$('tooltip');
    const host=target.closest('dialog[open]')||document.body;host.append(el);
    setText(el,target.dataset.tip);el.hidden=false;
    target.setAttribute('aria-describedby','tooltip');
    const box=target.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;
    el.style.left=clamp(box.left+box.width/2-w/2,10,innerWidth-w-10)+'px';
    const above=box.top-h-10;
    el.style.top=(above>12?above:Math.min(innerHeight-h-10,box.bottom+10))+'px';
  },keyboard?160:500);
}
function dismissIntro(){
  if(!$('introCard').hidden){$('introCard').hidden=true;store.set('intro-v2',true);}
}
function trapFocus(e,root){
  if(e.key!=='Tab')return;
  const nodes=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
  if(!nodes.length){e.preventDefault();return;}
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
}
function closeRails({restoreFocus=true}={}){
  const previous=railOpener;
  for(const el of [$('leftRail'),$('rightRail')]){el.classList.remove('open');el.removeAttribute('role');el.removeAttribute('aria-modal');}
  for(const el of $$('.topbar,#stage,.transport,.mobile-tools,.bottom-signature,.panel-rail'))el.inert=false;
  $('railBackdrop').hidden=true;
  $$('[data-rail]').forEach(b=>b.setAttribute('aria-expanded','false'));
  openRail=null;railOpener=null;
  if(restoreFocus&&previous?.isConnected)previous.focus({preventScroll:true});
}
function openDrawer(side,opener){
  const rail=$(side==='left'?'leftRail':'rightRail');
  if(rail===openRail){closeRails();return;}
  closeRails({restoreFocus:false});hideTooltip();dismissIntro();
  railOpener=opener;openRail=rail;rail.classList.add('open');rail.setAttribute('role','dialog');rail.setAttribute('aria-modal','true');
  $('railBackdrop').hidden=false;
  for(const el of $$('.topbar,#stage,.transport,.mobile-tools,.bottom-signature,.panel-rail'))el.inert=el!==rail;
  $$('[data-rail]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.rail===side)));
  rail.querySelector('[data-close-rail]').focus({preventScroll:true});
}
function openDialog(id){
  hideTooltip();hideTimePreview();dismissIntro();closeRails({restoreFocus:false});
  const already=$('bookDialog').open||$('helpDialog').open;
  if(!already){dialogResume=state.playing;lastDialogTrigger=document.activeElement;}
  switchingDialog=true;
  if(id!=='bookDialog'&&$('bookDialog').open)$('bookDialog').close();
  if(id!=='helpDialog'&&$('helpDialog').open)$('helpDialog').close();
  switchingDialog=false;
  state.playing=false;showPlay();
  if(!$(id).open)$(id).showModal();
}
function openBook(tab='lesson',lesson=state.lesson){state.bookLesson=lesson;renderBook(tab);openDialog('bookDialog');}
function openHelp(){renderHelp();openDialog('helpDialog');}
function closeDialogState(){
  hideTooltip();
  if(switchingDialog||$('bookDialog').open||$('helpDialog').open)return;
  if(dialogResume)setPlaying(true);dialogResume=false;
  if(lastDialogTrigger?.isConnected&&!lastDialogTrigger.closest('[inert]'))lastDialogTrigger.focus({preventScroll:true});
  lastDialogTrigger=null;
}
function setReduced(on,{save=true}={}){
  state.reduced=!!on;
  if(save)store.set('reduced',state.reduced);
  if(camera){camera.reduced=state.reduced;if(on)camera.transition(camera.desired,true);}
  if(on){state.overlays.lightning=false;pTween=null;stopTour(false);}
  syncControlStates();invalidate();
}
function setCinema(on){
  closeRails({restoreFocus:false});dismissIntro();hideTooltip();
  document.body.classList.toggle('cinema',on);$('exitCinema').hidden=!on;
  $('cinemaBtn').setAttribute('aria-pressed',String(on));
  requestAnimationFrame(resize);
  if(on)$('exitCinema').focus({preventScroll:true});else $('cinemaBtn').focus({preventScroll:true});
}
function startScrub(type,e){
  if(scrub)return;
  stopTour(false);dismissIntro();pTween=null;
  scrub={type,pointerId:e.pointerId,resume:state.playing};state.playing=false;showPlay();
  document.body.classList.add('is-scrubbing');
}
function endScrub(e,resume=true){
  if(!scrub||e?.pointerId!==undefined&&e.pointerId!==scrub.pointerId)return;
  const shouldResume=resume&&scrub.resume;scrub=null;
  document.body.classList.remove('is-scrubbing');hideTimePreview();
  if(shouldResume)setPlaying(true);else showPlay();
  updateUI(true);invalidate();
}
function chartProgress(e){const b=$('chart').getBoundingClientRect();return clamp(((e.clientX-b.left)/b.width*280-24)/226);}
function timelineProgressAt(e){const b=$('timeline').getBoundingClientRect();return clamp((e.clientX-b.left-7)/Math.max(1,b.width-14));}
function handleGlobalKeys(e){
  const input=document.activeElement;
  const typing=/^(INPUT|SELECT|TEXTAREA)$/.test(input?.tagName)||input?.isContentEditable;
  if(openRail){trapFocus(e,openRail);if(e.key==='Escape'){e.preventDefault();closeRails();}return;}
  if($('bookDialog').open||$('helpDialog').open)return;
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  const buttonFocus=input?.closest('button,a');
  if(e.key==='Escape'){
    if(document.body.classList.contains('cinema'))setCinema(false);
    stopTour(false);dismissIntro();hideTimePreview();return;
  }
  if(e.code==='Space'&&!buttonFocus){e.preventDefault();setPlaying(!state.playing);}
  else if(e.key==='ArrowRight'&&!buttonFocus){e.preventDefault();stopTour(false);seek(state.p+(e.shiftKey?.1:.025));}
  else if(e.key==='ArrowLeft'&&!buttonFocus){e.preventDefault();stopTour(false);seek(state.p-(e.shiftKey?.1:.025));}
  else if(e.key==='1'||e.key==='2'||e.key==='3'){e.preventDefault();changeView({1:'free',2:'side',3:'top'}[e.key]);}
  else if(e.key==='+'||e.key==='='){e.preventDefault();camera.zoom(.88);invalidate();}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();camera.zoom(1/.88);invalidate();}
  else if(e.key.toLowerCase()==='r'){e.preventDefault();stopTour(false);camera.preset(state.view,world);invalidate();}
  else if(e.key.toLowerCase()==='f'){e.preventDefault();setCinema(!document.body.classList.contains('cinema'));}
  else if(e.key.toLowerCase()==='l'){e.preventDefault();setLanguage(language==='zh'?'en':'zh');}
  else if(e.key==='?'||e.key.toLowerCase()==='h'){e.preventDefault();openHelp();}
}
function bindEvents(){
  paintIcons();
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-language-toggle'))setLanguage(language==='zh'?'en':'zh');
    if(button.dataset.lesson){dismissIntro();setLesson(button.dataset.lesson,{announce:true});closeRails();}
    if(button.dataset.legend)setLesson(button.dataset.legend,{announce:true});
    if(button.dataset.phase!==undefined)goPhase(+button.dataset.phase);
    if(button.dataset.town)selectTown(button.dataset.town,{announce:true});
    if(button.dataset.read){state.bookLesson=button.dataset.read;renderBook('lesson');}
    if(button.dataset.sceneLesson){const id=button.dataset.sceneLesson;dialogResume=false;$('bookDialog').close();setLesson(id);}
    if(button.dataset.paramHint)toast(button.dataset.paramHint+'Hint');
    if(button.dataset.answer!==undefined){state.quiz.answers[state.quiz.index]=+button.dataset.answer;store.set('quiz',state.quiz);renderBook('quiz');$('quizNext').focus({preventScroll:true});}
    if(button.dataset.question!==undefined){state.quiz.index=+button.dataset.question;store.set('quiz',state.quiz);renderBook('quiz');}
    if(button.id==='quizPrev'){state.quiz.index=Math.max(0,state.quiz.index-1);renderBook('quiz');}
    if(button.id==='quizNext'){state.quiz.index=(state.quiz.index+1)%QUESTIONS.length;renderBook('quiz');}
    if(button.id==='quizReset'){
      const old=structuredClone(state.quiz);state.quiz={index:0,answers:{}};store.set('quiz',state.quiz);renderBook('quiz');
      toast('quizResetDone',{}, {run:()=>{state.quiz=old;store.set('quiz',state.quiz);if($('bookDialog').open)renderBook('quiz');}});
    }
  });
  $$('[data-view]').forEach(b=>b.onclick=()=>{dismissIntro();changeView(b.dataset.view);});
  $$('[data-toggle]').forEach(b=>b.onclick=()=>setOverlay(b.dataset.toggle,!state.overlays[b.dataset.toggle]));
  $$('[data-field]').forEach(b=>b.onclick=()=>setField(b.dataset.field));
  $('resetCamera').onclick=()=>{stopTour(false);camera.preset(state.view,world);invalidate();};
  $('zoomInBtn').onclick=()=>{camera.zoom(.88);invalidate();};$('zoomOutBtn').onclick=()=>{camera.zoom(1/.88);invalidate();};
  $('gl').addEventListener('dblclick',e=>{e.preventDefault();stopTour(false);camera.preset(state.view,world);invalidate();});
  camera.onInteraction=kind=>{
    if(camera.touchPoints.size>1)for(const g of labelGestures.values())g.multi=true;
    dismissIntro();stopTour(false);hideTooltip();
    if(kind==='orbit'&&state.view!=='free'){state.view='free';syncViewTabs();}
    invalidate();
  };
  // An annotation is still part of the touch surface: pinch can start on a
  // label, while a genuine tap retains the label's learn/select action.
  $('worldLabels').addEventListener('pointerdown',e=>{
    const label=e.target.closest('button.world-label');if(!label||e.button!==0)return;
    e.preventDefault();label.focus({preventScroll:true});
    labelGestures.set(e.pointerId,{label,x:e.clientX,y:e.clientY,moved:false,multi:camera.touchPoints.size>0});
    camera.pointerDown(e);
    if(camera.touchPoints.size>1)for(const g of labelGestures.values())g.multi=true;
  });
  $('gl').addEventListener('pointermove',e=>{
    const g=labelGestures.get(e.pointerId);if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>7)g.moved=true;
  });
  document.addEventListener('pointerup',e=>{
    const g=labelGestures.get(e.pointerId);labelGestures.delete(e.pointerId);
    if(g&&!g.multi&&!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<7){camera.velocity=[0,0];g.label.click();}
  });
  document.addEventListener('pointercancel',e=>labelGestures.delete(e.pointerId));
  window.addEventListener('blur',()=>labelGestures.clear());
  $('labelsBtn').onclick=()=>{state.labels=!state.labels;syncControlStates();invalidate();};
  $('tourBtn').onclick=startTour;
  $('playBtn').onclick=()=>setPlaying(!state.playing);
  $('restartBtn').onclick=()=>{state.p=0;state.time=3.6;state.tourPhase=-1;setPlaying(true);updateUI(true);};
  $('speedBtn').onclick=()=>{state.rate=({.5:1,1:2,2:4,4:.5})[state.rate]||1;setText($('speedBtn'),state.rate+'×');};
  const timeline=$('timeline');
  timeline.addEventListener('pointerdown',e=>startScrub('timeline',e));
  timeline.addEventListener('input',e=>{
    const wasScrubbing=!!scrub;seek(+e.target.value/1000,{pause:!wasScrubbing});
    if(scrub){const b=timeline.getBoundingClientRect();showTimePreview(state.p,b.left+state.p*b.width,b.top);}
  });
  timeline.addEventListener('pointermove',e=>{if(!scrub&&e.pointerType!=='touch')showTimePreview(timelineProgressAt(e),e.clientX,timeline.getBoundingClientRect().top);});
  timeline.addEventListener('pointerleave',()=>{if(!scrub)hideTimePreview();});
  timeline.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){stopTour(false);state.playing=false;pTween=null;showPlay();}});
  const chart=$('chart');
  chart.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();chart.focus({preventScroll:true});startScrub('chart',e);chart.setPointerCapture(e.pointerId);seek(chartProgress(e),{pause:false});
  });
  chart.addEventListener('pointermove',e=>{
    const p=chartProgress(e);
    if(scrub?.type==='chart')seek(p,{pause:false});
    if(e.pointerType!=='touch'||scrub){showTimePreview(p,e.clientX,chart.getBoundingClientRect().top);if($('chartHoverCursor')){$('chartHoverCursor').setAttribute('transform','translate('+(24+226*p)+',0)');$('chartHoverCursor').setAttribute('visibility','visible');}}
  });
  chart.addEventListener('pointerleave',()=>{if(!scrub)hideTimePreview();});
  chart.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();stopTour(false);
    seek(e.key==='Home'?0:e.key==='End'?1:state.p+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?.1:.01));
  });
  document.addEventListener('pointerup',e=>endScrub(e));
  document.addEventListener('pointercancel',e=>endScrub(e,false));
  window.addEventListener('blur',()=>endScrub(null,false));
  $('townSelect').onchange=e=>selectTown(e.target.value);
  $('focusTownBtn').onclick=focusTown;$('resetParams').onclick=resetParameters;
  $('dryPreset').onclick=()=>applyScenario(false);$('stormPreset').onclick=()=>applyScenario(true);
  $('guideBtn').onclick=$('readLesson').onclick=$('mobileBook').onclick=()=>openBook('lesson');
  $('compareBtn').onclick=()=>openBook('compare');$('quizBtn').onclick=()=>openBook('quiz');
  $('coldLabel').onclick=$('warmLabel').onclick=()=>openBook('lesson','air');
  $('helpBtn').onclick=$('introHelp').onclick=openHelp;$('introDismiss').onclick=dismissIntro;
  $('closeDialog').onclick=()=>$('bookDialog').close();$('closeHelp').onclick=()=>$('helpDialog').close();
  for(const id of ['bookDialog','helpDialog']){
    const dialog=$(id);dialog.addEventListener('close',closeDialogState);
    dialog.addEventListener('click',e=>{
      if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();
      if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();
    });
  }
  $$('[data-book]').forEach(b=>b.onclick=()=>renderBook(b.dataset.book));
  document.querySelector('.book-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    const tabs=$$('[data-book]'),i=tabs.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
    renderBook(tabs[next].dataset.book);tabs[next].focus();
  });
  $('helpContent').addEventListener('change',e=>{
    if(e.target.id==='preference-reduced')setReduced(e.target.checked);
    if(e.target.id==='preference-loop'){state.loop=e.target.checked;store.set('loop',state.loop);}
  });
  $('soundBtn').onclick=toggleAudio;$('captureBtn').onclick=()=>{dismissIntro();captureNext=true;invalidate();toast('capturePreparing');};
  $('fullscreenBtn').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{toast('fullscreenError');}
  };
  document.addEventListener('fullscreenchange',()=>{
    $('fullscreenBtn').classList.toggle('active',!!document.fullscreenElement);
    $('fullscreenBtn').setAttribute('aria-label',t(document.fullscreenElement?'fullscreenExit':'fullscreen'));resize();
  });
  $('cinemaBtn').onclick=()=>setCinema(true);$('exitCinema').onclick=()=>setCinema(false);
  $$('[data-rail]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.rail,b));
  $$('[data-close-rail]').forEach(b=>b.onclick=()=>closeRails());$('railBackdrop').onclick=()=>closeRails();
  $$('[data-drawer-handle]').forEach(handle=>{
    handle.addEventListener('pointerdown',e=>{gestureStart={id:e.pointerId,y:e.clientY};handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointerup',e=>{if(gestureStart&&e.pointerId===gestureStart.id&&e.clientY-gestureStart.y>60)closeRails();gestureStart=null;});
    handle.addEventListener('pointercancel',()=>gestureStart=null);
  });
  $('qualitySelect').onchange=e=>{
    state.quality=+e.target.value;store.set('quality',state.quality);renderer.shadowEnabled=state.quality>0;renderer.shadowKey=null;resize();
    toast('qualityChanged',{name:t(['eco','balanced','high'][state.quality])});
  };
  document.addEventListener('keydown',handleGlobalKeys);
  document.addEventListener('pointerover',e=>requestTooltip(e.target.closest('[data-tip]')));
  document.addEventListener('pointerout',e=>{if(tooltipOwner&&!tooltipOwner.contains(e.relatedTarget))hideTooltip();else clearTimeout(tooltipTimer);});
  document.addEventListener('focusin',e=>requestTooltip(e.target.closest('[data-tip]'),true));
  document.addEventListener('focusout',hideTooltip);document.addEventListener('pointerdown',hideTooltip);
  document.addEventListener('scroll',hideTooltip,true);
  for(const ev of ['mouseenter','focusin'])$('toast').addEventListener(ev,()=>clearTimeout(toastTimer));
  for(const ev of ['mouseleave','focusout'])$('toast').addEventListener(ev,()=>{clearTimeout(toastTimer);toastTimer=setTimeout(dismissToast,2300);});
  $('gl').addEventListener('webglcontextlost',e=>{
    e.preventDefault();cancelAnimationFrame(frame);ready=false;
    setText($('errorText'),t('contextLost'));$('error').hidden=false;
  });
  document.addEventListener('visibilitychange',()=>{
    lastNow=performance.now();if(document.hidden){endScrub(null,false);if(audio)audio.bus.gain.setTargetAtTime(0,audio.ctx.currentTime,.1);}else invalidate();
  });
  window.addEventListener('resize',()=>{hideTooltip();hideTimePreview();if(openRail&&innerWidth>1120)closeRails({restoreFocus:false});});
  systemMotion.addEventListener?.('change',e=>{if(store.get('reduced')===null)setReduced(e.matches,{save:false});});
}


/* MODULE: media.js */
/* Audio is synthesized locally; browser playback begins after a user gesture. */
function setupAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio unavailable');
  const ctx=new AC(),bus=ctx.createGain();bus.gain.value=0;bus.connect(ctx.destination);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0),r=rng(501);let last=0;
  for(let i=0;i<data.length;i++){last=(last+.018*(r()*2-1))/1.018;data[i]=last*4;}
  const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;source.connect(filter);filter.connect(bus);source.start();
  return{ctx,bus,filter,buffer,thunder(){
    const s=ctx.createBufferSource();s.buffer=buffer;s.playbackRate.value=.45;
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=190;
    const g=ctx.createGain();g.gain.setValueAtTime(.001,ctx.currentTime);g.gain.linearRampToValueAtTime(.42,ctx.currentTime+.18);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+2.7);
    s.connect(f);f.connect(g);g.connect(bus);s.start();s.stop(ctx.currentTime+2.8);
    s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }};
}
let audioBusy=false;
async function toggleAudio(){
  if(audioBusy)return;audioBusy=true;
  try{
    if(!audio)audio=setupAudio();await audio.ctx.resume();state.sound=!state.sound;
    $('soundBtn').innerHTML=icon(state.sound?'volume':'volumeOff');syncControlStates();
    if(!state.sound)audio.bus.gain.setTargetAtTime(0,audio.ctx.currentTime,.1);
    toast(state.sound?'audioEnabled':'audioDisabled');
  }catch{toast('audioError');}finally{audioBusy=false;}
}
function updateAudio(){
  if(!audio)return;
  const active=state.sound&&state.playing&&!scrub&&!document.hidden;
  const target=active?.035+(world.atmos?.rain||0)*.09:0;
  audio.bus.gain.setTargetAtTime(target,audio.ctx.currentTime,.2);
  audio.filter.frequency.setTargetAtTime(250+(world.atmos?.rain||0)*1300,audio.ctx.currentTime,.3);
  if(active&&renderer.flash>.15&&Math.abs(state.time-lastThunder)>2){
    lastThunder=state.time;setTimeout(()=>{if(state.sound&&state.playing&&!document.hidden)audio.thunder();},550);
  }
}
function captureScene(){
  try{
    const canvas=document.createElement('canvas'),w=renderer.canvas.width,h=renderer.canvas.height;canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#132638');gradient.addColorStop(1,'#050c17');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);ctx.drawImage(renderer.canvas,0,0);
    const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#06101cbb');shade.addColorStop(.22,'#06101c00');shade.addColorStop(.77,'#06101c00');shade.addColorStop(1,'#06101cbb');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    const size=Math.max(16,Math.min(w*.042,42));
    ctx.fillStyle='#e9f3fc';ctx.font='500 '+size+'px system-ui';ctx.fillText(lessonData(state.lesson).title,w*.05,h*.085,w*.9);
    ctx.font=Math.max(10,size*.37)+'px system-ui';ctx.fillStyle='#a6c2d6';
    ctx.fillText('FRONT ATLAS / '+timeReading(state.p)+' / '+Math.round(state.p*100)+'%',w*.05,h*.12,w*.9);
    const dpr=w/renderer.cssWidth;
    for(const id of ['coldLabel','warmLabel','coolLabel','lowLabel']){
      const el=$(id);if(el.style.visibility!=='visible'||!state.labels)continue;
      const x=parseFloat(el.style.left)*dpr,y=parseFloat(el.style.top)*dpr;
      ctx.textAlign='center';ctx.font='500 '+Math.max(13,size*.6)+'px system-ui';ctx.fillStyle=id==='warmLabel'?'#ffd6ba':'#b9e1ff';
      ctx.shadowBlur=8;ctx.shadowColor='#05101f';ctx.fillText(el.querySelector('b').textContent,x,y,Math.min(w*.4,250*dpr));
    }
    ctx.shadowBlur=0;ctx.textAlign='left';ctx.font=Math.max(10,size*.38)+'px system-ui';ctx.fillStyle='#e0edf5';
    const obs=observation(state.lesson,state.p,state.params,townNow());
    ctx.fillText(townName(townNow())+'  '+obs.temperature.toFixed(1)+' °C  /  '+obs.pressure.toFixed(0)+' hPa',w*.05,h*.90,w*.9);
    ctx.fillStyle='#8cacbf';ctx.font=Math.max(9,size*.3)+'px system-ui';ctx.fillText('MakerJackie · '+t('notForecast'),w*.05,h*.955,w*.9);
    canvas.toBlob(blob=>{
      if(!blob){toast('captureError');return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='front-atlas-'+state.lesson+'-'+language+'.png';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),10000);toast('captureSuccess');
    },'image/png');
  }catch{toast('captureError');}
}


/* MODULE: studio.js */
/* Deterministic filming bridge. The interactive app does not depend on the film. */
function installStudioBridge(){
  let lastView='',lastMode='',lastBook='';
  window.__FRONTSCOPE_STUDIO__={
    ready:true,
    frame(spec={}){
      frozen=true;cancelAnimationFrame(frame);pTween=null;scrub=null;
      document.body.classList.add('record-mode');$('introCard').hidden=true;
      if(spec.lang&&spec.lang!==language)setLanguage(spec.lang,{announce:false});
      if(spec.lesson&&state.lesson!==spec.lesson)setLesson(spec.lesson,{reset:true,preserveCamera:true});
      if(spec.params){let geometry=false,changed=false;for(const k of Object.keys(spec.params))if(k in state.params){const v=spec.params[k];if(k==='slope'&&state.params[k]!==v)geometry=true;if(state.params[k]!==v)changed=true;state.params[k]=v;}if(geometry)rebuildWorld();if(changed){renderSliders();invalidateChart();}}
      if(spec.view&&state.view!==spec.view){state.view=spec.view;syncViewTabs();}
      if(spec.field!==undefined)state.field=spec.field;
      if(spec.overlays)Object.assign(state.overlays,spec.overlays);
      state.labels=spec.labels!==false;state.playing=spec.playing!==false;
      if(Number.isFinite(spec.p))state.p=clamp(spec.p);
      if(Number.isFinite(spec.time))state.time=spec.time;
      const mode=spec.mode||'app';
      document.body.classList.toggle('cinema',mode==='clean');
      document.body.classList.toggle('film-clean',mode==='clean');
      renderer.captureScale=Number.isFinite(spec.renderScale)?Math.max(.3,Math.min(1,spec.renderScale)):1;resize();lastMode=mode;
      if(spec.pose)camera.transition({...camera.pose(),...spec.pose},true);
      if(spec.book!==lastBook){
        if($('bookDialog').open)$('bookDialog').close();
        if(spec.book){renderBook(spec.book);$('bookDialog').showModal();}
        lastBook=spec.book||'';
      }
      if(spec.book==='quiz'){state.quiz.index=0;if(spec.quizAnswer!==undefined){if(state.quiz.answers[0]!==spec.quizAnswer){state.quiz.answers[0]=spec.quizAnswer;renderBook('quiz');}}else if(0 in state.quiz.answers){delete state.quiz.answers[0];renderBook('quiz');}}
      if(spec.rail==='params'){const rail=$('rightRail'),section=rail.querySelector('.parameters');rail.scrollTop=Math.max(0,section.offsetTop-rail.offsetTop);}else if(spec.rail==='top')$('rightRail').scrollTop=0;
      syncControlStates();drawCurrent(0);updateUI(true);hideTooltip();dismissToast();
      return {lesson:state.lesson,p:state.p,time:state.time,errors:[...errors],glError:renderer.gl.getError()};
    },
    camera(pose){camera.transition({...camera.pose(),...pose},true);drawCurrent(0);},
    end(){document.body.classList.remove('record-mode','film-clean','cinema');frozen=false;resize();lastNow=0;frame=requestAnimationFrame(loop);}
  };
}


/* MODULE: boot.js */
/* Boot only after every module exists. Failures remain localized and visible. */
async function boot(){
  applyLocale();paintIcons();
  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  try{
    const quality=store.get('quality');if(Number.isInteger(quality)&&quality>=0&&quality<=2)state.quality=quality;
    const reduced=store.get('reduced');if(typeof reduced==='boolean')state.reduced=reduced;
    state.loop=store.get('loop')===true;
    const quiz=store.get('quiz');
    if(quiz&&typeof quiz==='object'&&quiz.answers&&typeof quiz.answers==='object'){
      state.quiz.index=Number.isInteger(quiz.index)?clamp(quiz.index,0,QUESTIONS.length-1):0;
      for(const [i,a] of Object.entries(quiz.answers)){if(/^\d+$/.test(i)&&QUESTIONS[+i]&&Number.isInteger(a)&&a>=0&&a<QUESTIONS[+i].a.length)state.quiz.answers[i]=a;}
    }
    if(state.reduced)state.overlays.lightning=false;
    setText($('loadingText'),t('loadingTerrain'));$('loadBar').style.width='12%';await wait();
    renderer=new GLRenderer($('gl'));renderer.shadowEnabled=state.quality>0;
    camera=new OrbitCamera($('gl'));camera.reduced=state.reduced;
    $('loadBar').style.width='27%';setText($('loadingText'),t('loadingTown'));await wait();
    base=createAtlasLandscape();
    renderer.heightTex=makeHeightTexture(renderer,base.terrain);
    const airHeight=makeAirHeight(renderer,base.terrain);
    renderer.airHeightTex=airHeight.texture;base.airHeight=airHeight.sample;
    $('loadBar').style.width='70%';setText($('loadingText'),t('loadingAir'));await wait();
    bindEvents();setLesson('cold',{reset:true});
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('stage'));resize();
    ready=true;try{audio=setupAudio();$('soundBtn').innerHTML=icon('volume');void audio.ctx.resume().catch(()=>{});}catch{state.sound=false;syncControlStates();}
    try {
      const saved = JSON.parse(sessionStorage.getItem('oneworld.frontscope.state') || 'null');
      sessionStorage.removeItem('oneworld.frontscope.state');
      if (saved && LESSONS[saved.lesson] && CONFIG.every(c => Number.isFinite(saved.params?.[c.id]) && saved.params[c.id] >= c.min && saved.params[c.id] <= c.max) && Number.isFinite(saved.p) && Number.isFinite(saved.time) && ['free','side','top'].includes(saved.view) && TOWNS.some(t => t.id === saved.town)) restoreExperiment(saved);
    } catch { /* Storage is optional. */ }
    syncControlStates();drawCurrent(.016);updateUI(true);
    $('loadBar').style.width='100%';setText($('loadingText'),t('loadingReady'));
    window.__FRONT_ATLAS__={
      get ready(){return ready;},get version(){return '1.0.2';},
      get state(){return structuredClone(state);},get errors(){return [...errors];},
      get diagnostics(){return{renderCount,chartBuildCount,disposed,buffers:renderer?.buffers.size,drawCalls:renderer?.drawCalls,triangles:renderer?.triangles,clouds:world?.clouds?.length,rain:world?.rain?.length,particles:world?.particles?.length,atmos:world?.atmos,camera:camera?.pose(),desired:camera?.desired,moving:camera?.moving,dragging:camera?.dragging,pointers:camera?.touchPoints.size,scrub:!!scrub,worldTime:state.time,glError:renderer?.gl.getError()};},
      lesson:(id,options={reset:true})=>setLesson(id,options),language:lang=>setLanguage(lang,{announce:false}),
      progress:p=>seek(p),param:(id,v)=>setParam(id,v,{allowDisabled:true}),
      view:(v,immediate=true)=>changeView(v,immediate,{quiet:true}),overlay:setOverlay,field:setField,town:selectTown,
      playing:setPlaying,book:openBook,help:openHelp,reduced:setReduced,
      quizAnswer:i=>{state.quiz.answers[state.quiz.index]=i;renderBook('quiz');},
      renderAt:(time,p)=>{pTween=null;state.time=time;state.p=clamp(p);drawCurrent(.016);updateUI(true);},
      freeze:on=>{frozen=!!on;if(on)cancelAnimationFrame(frame);else{lastNow=0;frame=requestAnimationFrame(loop);}},
      observation:(p=state.p,town=state.town)=>observation(state.lesson,p,state.params,TOWNS.find(t=>t.id===town)||townNow()),
      localeKeys:()=>Object.keys(TEXT),snapshot:()=>experimentSnapshot(),
      curveCacheKey:()=>chartKey
    };
    window.__FRONTSCOPE__=window.__FRONT_ATLAS__;
    installStudioBridge();
    $('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,state.reduced?0:550);
    $('introCard').hidden=store.get('intro-v2')===true;
    lastNow=0;frame=requestAnimationFrame(loop);
  }catch(error){
    errors.push(String(error?.stack||error));$('loading').hidden=true;
    setText($('errorText'),t('errorStart',{message:language==='en'&&/[\u3400-\u9fff]/.test(error.message)?'WebGL 2 is unavailable. Enable graphics acceleration and reload.':error.message||String(error)}));
    $('error').hidden=false;
    window.__FRONT_ATLAS__={get ready(){return false;},get errors(){return [...errors];}};
    console.error(error);
  }
}
window.addEventListener('pagehide', () => { if (ready) { try { sessionStorage.setItem('oneworld.frontscope.state', JSON.stringify(experimentSnapshot())); } catch {} } }); document.addEventListener('host-language', event => setLanguage(event.detail, {announce:false})); boot();

})();
}
