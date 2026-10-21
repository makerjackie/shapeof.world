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
 look:(e,t)=>{let z=V.norm(V.sub(e,t)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1])},
 mul:(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
};
function RNG(seed=188809){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const rand=RNG();const range=(a,b)=>a+(b-a)*rand(),pick=a=>a[Math.floor(rand()*a.length)];
const colorCache=new Map();
function rgb(hex){if(Array.isArray(hex))return hex;if(!colorCache.has(hex)){const value=parseInt(hex.slice(1),16);colorCache.set(hex,[(value>>16&255)/255,(value>>8&255)/255,(value&255)/255]);}return colorCache.get(hex)}
function tint(c,v){return rgb(c).map(x=>Math.min(1,Math.max(0,x*v)))}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const ease=t=>t*t*(3-2*t);

class Batch{
 constructor(kind='paint'){this.kind=kind;this.data=new PaintingVertices();this.count=0;}
 vert(p,n,uv,c,em=0,anim=0,alpha=1){this.data.push(...p,...n,...uv,...rgb(c),em,anim,alpha);}
 tri(a,b,c,color,uv=[[0,0],[1,0],[1,1]],em=0,anim=0,alpha=1,normals=null){let n=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));[a,b,c].forEach((p,i)=>this.vert(p,normals?normals[i]:n,uv[i],color,em,anim,alpha));}
 quad(a,b,c,d,color,em=0,anim=0,alpha=1,uv=[[0,0],[1,0],[1,1],[0,1]]){this.tri(a,b,c,color,[uv[0],uv[1],uv[2]],em,anim,alpha);this.tri(a,c,d,color,[uv[0],uv[2],uv[3]],em,anim,alpha)}
 upload(gl){this.count=this.data.length/14;this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);const vertices=this.data.toArray();this.ranges=paintingDrawRanges(vertices,14);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);let off=0;[3,3,2,3,3].forEach((s,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,s,gl.FLOAT,false,56,off*4);off+=s;});this.data=null;gl.bindVertexArray(null);}
}
class World{
 constructor(){this.solid=new Batch();this.alpha=new Batch();this.sky=new Batch('sky');this.labels=new Batch('labels');this.colliders=[];this.stats={};this.active=this.solid;}
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

const sceneVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;layout(location=3) in vec3 aColor;layout(location=4) in vec3 aExtra;
uniform mat4 uVP;uniform float uTime;out vec3 vPos;out vec3 vNormal;out vec2 vUV;out vec3 vColor;out vec3 vExtra;
void main(){vec3 p=aPosition;if(aExtra.y>1.5&&aExtra.y<2.5){p.x+=sin(uTime*.75+p.z*.4)*.055;p.y+=sin(uTime*.9+p.x)*.035;}if(aExtra.y>2.5&&aExtra.y<3.5){p.y+=sin(uTime*.6+p.x*8.)*.22;p.x+=sin(uTime*.3+p.z)*.1;}if(aExtra.y>3.5){p.x+=sin(uTime*1.2+p.y*7.)*.05;p.y+=sin(uTime*.7+p.x)*.045;}vPos=p;vNormal=aNormal;vUV=aUV;vColor=aColor;vExtra=aExtra;gl_Position=uVP*vec4(p,1.);}`;
const sceneFS=`#version 300 es
precision highp float;in vec3 vPos;in vec3 vNormal;in vec2 vUV;in vec3 vColor;in vec3 vExtra;
uniform sampler2D uTexture;uniform vec3 uEye;uniform float uTime;uniform int uKind;out vec4 outColor;
void main(){vec4 tex=texture(uTexture,vUV);if(uKind==1){vec3 s=tex.rgb;float star=smoothstep(.67,.93,max(s.r,s.g));s+=star*.025*sin(uTime*.8+vUV.x*128.+vUV.y*99.);outColor=vec4(s,1.);return;}
vec3 col=vColor;if(uKind==2){col*=tex.rgb;}else{col*=.37+tex.rgb*.87;}
vec3 N=normalize(vNormal);float diffuse=max(dot(N,normalize(vec3(-.4,1.,.5))),0.);float fill=.75+.25*diffuse;col*=fill;
float terrace=exp(-pow((vPos.x+3.)*.26,2.))*smoothstep(-21.,-15.,vPos.z)*(1.-smoothstep(4.,10.,vPos.z));float glow=terrace*exp(-max(vPos.y-2.,0.)*.3);col=mix(col,col*vec3(1.22,1.08,.65)+vec3(.018,.01,0.),glow*.65);
col=mix(col,vColor*(uKind==2?tex.rgb:(.53+tex.rgb*.67)),vExtra.x);
float fog=1.-exp(-pow(length(vPos-uEye)*.009,1.6));fog*=1.-vExtra.x*.6;col=mix(col,vec3(.084,.148,.242),fog);
outColor=vec4(clamp(col,0.,1.),vExtra.z*(uKind==2?tex.a:1.));}`;
const postVS=`#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const postFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene;uniform vec2 uSize;uniform float uPaint;uniform float uFade;out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 px=1./uSize;vec3 c=texture(uScene,vUV).rgb;vec3 sum=c;float w=1.;vec3 halo=vec3(0.);
for(int i=0;i<4;i++){float a=float(i)*1.570796;vec2 d=vec2(cos(a),sin(a));vec3 n=texture(uScene,vUV+d*px*1.1).rgb;float k=.12*exp(-length(n-c)*11.);sum+=n*k;w+=k;vec3 b=texture(uScene,vUV+d*px*6.).rgb;halo+=max(b-vec3(.77,.71,.56),vec3(0.))*.026;}
c=mix(c,sum/w,.75)+halo;vec2 q=vUV*uSize;float grain=hash(floor(q))-.5;float weave=sin(q.x*2.8)*sin(q.y*2.6);c*=1.+grain*.055*uPaint+weave*.014*uPaint;
float edge=smoothstep(.23,.85,length((vUV-.5)*vec2(1.,.85)));c*=1.-edge*.18;c=mix(c,c*vec3(1.026,1.0,.975),.45);outColor=vec4(c*(1.-uFade),1.);}`;
class Renderer{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!gl)throw new Error('WEBGL2_UNAVAILABLE');this.gl=gl;this.sceneProgram=this.program(sceneVS,sceneFS);this.postProgram=this.program(postVS,postFS);this.quality=createPaintingQuality();this.paint=1;this.scale=1;this.fbo=gl.createFramebuffer();this.color=gl.createTexture();this.depth=gl.createRenderbuffer();this.textureCache=[];this.draws=0;this.errors=[];this.resize();}
 program(v,f){const g=this.gl;function compile(type,s){let x=g.createShader(type);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(x));return x;}let p=g.createProgram();g.attachShader(p,compile(g.VERTEX_SHADER,v));g.attachShader(p,compile(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
 texture(canvas,repeat=true){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,repeat?g.REPEAT:g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,repeat?g.REPEAT:g.CLAMP_TO_EDGE);g.generateMipmap(g.TEXTURE_2D);return t;}
 resize(){const g=this.gl;const [w,h]=paintingRenderSize(document.body.clientWidth,document.body.clientHeight,window.devicePixelRatio,this.scale,this.quality.scale);if(this.canvas.width===w&&this.canvas.height===h&&this.sized)return;this.sized=true;this.canvas.width=w;this.canvas.height=h;g.bindTexture(g.TEXTURE_2D,this.color);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.bindRenderbuffer(g.RENDERBUFFER,this.depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,w,h);g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.color,0);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.depth);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('Framebuffer is incomplete');g.bindFramebuffer(g.FRAMEBUFFER,null);}
 init(world,paint,sky,labels){this.world=world;for(let b of [world.solid,world.alpha,world.sky,world.labels])b.upload(this.gl);this.paintTex=this.texture(paint);this.skyTex=this.texture(sky);this.labelTex=this.texture(labels,false);this.uniforms={};for(const n of ['uVP','uTime','uTexture','uEye','uKind'])this.uniforms[n]=this.gl.getUniformLocation(this.sceneProgram,n);this.postUniforms={};for(const n of ['uScene','uSize','uPaint','uFade'])this.postUniforms[n]=this.gl.getUniformLocation(this.postProgram,n);}
 render(eye,target,time,fade=0){const g=this.gl,w=this.canvas.width,h=this.canvas.height;let vp=M.mul(M.perspective((document.body.clientWidth<600?66:56)*Math.PI/180,w/h,.08,260),M.look(eye,target));g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.viewport(0,0,w,h);g.enable(g.DEPTH_TEST);g.depthMask(true);g.disable(g.CULL_FACE);g.disable(g.BLEND);g.clearColor(.07,.13,.22,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.sceneProgram);g.uniformMatrix4fv(this.uniforms.uVP,false,vp);g.uniform1f(this.uniforms.uTime,time);g.uniform3fv(this.uniforms.uEye,eye);g.uniform1i(this.uniforms.uTexture,0);g.activeTexture(g.TEXTURE0);
 const draw=(b,t,k)=>{g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(this.uniforms.uKind,k);g.bindVertexArray(b.vao);drawPaintingRanges(g,b,vp);};g.depthMask(false);draw(this.world.sky,this.skyTex,1);g.depthMask(true);draw(this.world.solid,this.paintTex,0);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);draw(this.world.labels,this.labelTex,2);g.depthMask(false);draw(this.world.alpha,this.paintTex,0);g.depthMask(true);g.disable(g.BLEND);
 g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.DEPTH_TEST);g.bindVertexArray(null);g.useProgram(this.postProgram);g.bindTexture(g.TEXTURE_2D,this.color);g.uniform1i(this.postUniforms.uScene,0);g.uniform2f(this.postUniforms.uSize,w,h);g.uniform1f(this.postUniforms.uPaint,this.paint);g.uniform1f(this.postUniforms.uFade,fade);g.drawArrays(g.TRIANGLES,0,3);this.draws=5;this.vp=vp;}
}

/* Original seeded brushwork; no downloaded textures, photographs, fonts or models. */
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function makePaint(){const [c,x]=surface(512,512),r=RNG(9145);x.fillStyle='#c1c3b2';x.fillRect(0,0,512,512);
 // Broad, rounded deposits and parallel bristle ridges make pigment legible up close.
 const pigment=['#eeead1','#cbd2c1','#9eaeb0','#b3bba8','#dcd8b8','#8e9b9d','#d6d5c3'];
 for(let i=0;i<580;i++){let px=r()*512,py=r()*512,len=20+r()*95,ww=3+r()*13;
  x.save();x.translate(px,py);x.rotate(-.19+r()*.36);x.lineCap='round';x.strokeStyle=pigment[Math.floor(r()*pigment.length)];x.globalAlpha=.20+r()*.32;x.lineWidth=ww;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(-ww*.10,len*.45,ww*.28,len);x.stroke();
  for(let j=0;j<3;j++){x.lineWidth=.6+r()*.85;x.strokeStyle=j%2?'#758989':'#f6edc7';x.globalAlpha=.10+r()*.15;let a=(r()-.5)*ww;x.beginPath();x.moveTo(a,3);x.quadraticCurveTo(a+1,len*.45,a+ww*.28,len-4);x.stroke();}x.restore();}
 for(let i=0;i<2900;i++){const px=r()*512,py=r()*512,len=3+r()*24,v=Math.floor(110+r()*135);x.strokeStyle=`rgba(${v},${v-2},${v-7},${.07+r()*.20})`;x.lineWidth=.4+r()*1.2;x.beginPath();x.moveTo(px,py);x.lineTo(px+2,py+len);x.stroke();}
 let d=x.getImageData(0,0,512,512);for(let i=0;i<d.data.length;i+=4){let n=(r()-.5)*11;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n;}x.putImageData(d,0,0);return c;}
function makeSky(){const [c,x]=surface(2048,1024),r=RNG(1888),g=x.createLinearGradient(0,0,0,1024);g.addColorStop(0,'#16396a');g.addColorStop(.25,'#254c80');g.addColorStop(.46,'#2b5680');g.addColorStop(.62,'#17394e');g.addColorStop(1,'#112a3b');x.fillStyle=g;x.fillRect(0,0,2048,1024);
 const blues=['#32618d','#34598e','#24547c','#3b668e','#347389','#21416c','#354e80','#536382','#416478'];
 for(let i=0;i<17500;i++){let px=r()*2048,py=r()*850,a=Math.sin(px*.006+py*.007)*.35-.08,len=4+r()*32;x.save();x.translate(px,py);x.rotate(a);x.globalAlpha=.12+r()*.3;x.strokeStyle=blues[Math.floor(r()*blues.length)];x.lineWidth=.5+r()*3;x.beginPath();x.moveTo(-len/2,0);x.quadraticCurveTo(0,-2,len/2,r()*2);x.stroke();x.restore();}
 function star(px,py,s){let glow=x.createRadialGradient(px,py,0,px,py,s*4.5);glow.addColorStop(0,'rgba(250,225,138,.18)');glow.addColorStop(.5,'rgba(174,201,142,.09)');glow.addColorStop(1,'rgba(174,201,142,0)');x.fillStyle=glow;x.fillRect(px-s*5,py-s*5,s*10,s*10);
 for(let j=4;j>=0;j--){const rr=s*(.32+j*.28);x.strokeStyle=['#fff5be','#f2e4a5','#cedcb2','#769c9a','#4e819b'][j];x.lineWidth=s*(j===0?.47:.2);x.lineCap='round';for(let k=0;k<8;k++){let a=k/8*Math.PI*2+r()*.12;x.beginPath();x.arc(px,py,rr,a,a+.38+r()*.18);x.stroke();}}x.fillStyle='#fff3b7';x.beginPath();x.ellipse(px,py,s*.31,s*.4,.2,0,Math.PI*2);x.fill();
 for(let k=0;k<9;k++){let a=r()*6.28,rr=s*(.75+r()*.7);x.strokeStyle=k%2?'rgba(239,224,155,.7)':'rgba(111,163,171,.55)';x.lineWidth=.7+r();x.beginPath();x.moveTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr);x.lineTo(px+Math.cos(a)*(rr+2),py+Math.sin(a)*(rr+2));x.stroke();}}
 // Irregular discrete halos, not the spiral sky from The Starry Night (1889).
 for(let i=0;i<190;i++){let px=r()*2048,py=90+r()*425,s=1.3+r()*2.1;if(i%8===0)s=3.6+r()*3;star(px,py,s);}
 [[1380,390,8.2],[1540,432,7.8],[1650,305,6.5],[1820,352,8],[1290,448,5.6],[1440,275,5],[1760,457,5],[1580,170,7]].forEach(s=>star(...s));
 return c;}
function makeLabels(){const [c,x]=surface(1024,1024);x.fillStyle='#102f36';x.fillRect(0,0,1024,1024);
 function tile(y){x.strokeStyle='#bd934d';x.lineWidth=5;x.strokeRect(17,y+17,478,478);x.strokeStyle='#5b684b';x.lineWidth=2;x.strokeRect(25,y+25,462,462)}
 tile(0);x.textAlign='center';x.fillStyle='#e6cc7a';x.font='bold 78px Georgia, serif';x.fillText('CAFÉ',256,228);x.font='italic 38px Georgia, serif';x.fillText('du soir',256,290);x.font='22px Georgia, serif';x.fillText('•  ARLES  •',256,372);
 x.fillStyle='#122f32';x.fillRect(512,0,512,512);x.strokeStyle='#9c7a42';x.lineWidth=13;x.strokeRect(528,14,480,484);x.fillStyle='#eadfc0';x.font='italic 53px Georgia, serif';x.fillText('ce soir',768,100);x.strokeStyle='#8b9b82';x.lineWidth=2;x.beginPath();x.moveTo(594,127);x.lineTo(942,127);x.stroke();x.font='30px Georgia, serif';['café au lait','pain & miel','un peu de nuit'].forEach((s,i)=>x.fillText(s,768,203+i*77));x.font='20px Georgia, serif';x.fillStyle='#b6b895';x.fillText('prenez votre temps',768,460);
 x.fillStyle='#ded1a0';x.fillRect(0,512,512,512);x.fillStyle='#3b666d';x.font='italic 48px Georgia, serif';x.fillText('Sous les étoiles',256,589);x.fillStyle='#325777';x.fillRect(47,620,418,289);x.fillStyle='#e8c450';x.beginPath();x.moveTo(64,705);x.lineTo(229,766);x.lineTo(214,882);x.lineTo(64,882);x.fill();x.fillStyle='#1e3f43';x.fillRect(285,717,141,169);for(let i=0;i<9;i++){x.fillStyle='#eedfa6';x.beginPath();x.arc(84+(i*79)%360,639+(i*47)%90,3+i%3,0,6.28);x.fill();}x.fillStyle='#41636a';x.font='23px Georgia, serif';x.fillText('Une étude imaginaire · 1888',256,960);
 x.fillStyle='#d5c38c';x.fillRect(512,512,512,512);x.fillStyle='#364e54';x.font='italic 47px Georgia, serif';x.fillText('À la nuit',768,628);x.font='28px Georgia, serif';['A little table.','A sky without hurry.','Stay a little longer.'].forEach((s,i)=>x.fillText(s,768,726+64*i));x.strokeStyle='#a18c5b';x.lineWidth=2;x.strokeRect(534,534,468,468);return c;}
function labelQuad(world,a,b,c,d,tile=0,em=.5){let ix=tile%2,iy=Math.floor(tile/2);let u0=ix*.5+.004,u1=(ix+1)*.5-.004,v1=1-iy*.5-.004,v0=1-(iy+1)*.5+.004;world.labels.quad(a,b,c,d,'#ffffff',em,0,1,[[u0,v0],[u1,v0],[u1,v1],[u0,v1]])}

/* The imagined Place du Forum. Dimensions are artistic, not a survey of Arles. */
async function makeWorld(){
 const yieldBuild=createPaintingBuildYield(setTimeout);
 const w=new World();
 const C={gold:'#dcb63e',lit:'#ebce5e',ochre:'#b98c36',blue:'#386c84',deep:'#214658',teal:'#254e4e',trim:'#467b80',iron:'#253f40',wood:'#a67537',cream:'#c9d4b4',roof:'#365962'};
 const p=(x,y,z)=>[x,y,z];
 await yieldBuild();
 // Enclosing hand-painted sky sphere, with a full 360° texture.
 for(let j=0;j<32;j++)for(let i=0;i<64;i++){let a=i/64*Math.PI*2,b=j/32*Math.PI,aa=(i+1)/64*Math.PI*2,bb=(j+1)/32*Math.PI;let pt=(t,h)=>[Math.cos(t)*Math.sin(h)*180,Math.cos(h)*180,Math.sin(t)*Math.sin(h)*180];w.sky.quad(pt(a,b),pt(aa,b),pt(aa,bb),pt(a,bb),'#ffffff',1,0,1,[[i/64,1-j/32],[(i+1)/64,1-j/32],[(i+1)/64,1-(j+1)/32],[i/64,1-(j+1)/32]]);}
 w.box([0,-.19,-26],[112,.28,135],'#416368');
 w.box([-3.7,.065,-6.7],[5.5,.21,22.9],'#a88142');
 await yieldBuild();
 // Uneven individual stones: warm near the terrace, cobalt and jade farther away.
 function cobble(x,z,sx,sz,color){let y=.009+range(-.015,.019),a=range(-.1,.1),r=range(.065,.12),poly=[[-sx/2+r,-sz/2],[sx/2-r,-sz/2],[sx/2,-sz/2+r],[sx/2,sz/2-r],[sx/2-r,sz/2],[-sx/2+r,sz/2],[-sx/2,sz/2-r],[-sx/2,-sz/2+r]];
  let q=poly.map(v=>w.transform([v[0]+range(-.022,.022),y+.024+range(-.006,.006),v[1]+range(-.012,.012)],[x,0,z],a)),b=poly.map(v=>w.transform([v[0]*1.04,y-.010,v[1]*1.04],[x,0,z],a));let uv=poly.map(v=>[v[0]/sx+.5,v[1]/sz+.5]);
  for(let i=0;i<8;i++){let j=(i+1)%8;w.solid.tri([x,y+.031,z],q[j],q[i],color,[[.5,.5],uv[j],uv[i]]);w.solid.quad(b[i],b[j],q[j],q[i],tint(color,.78));}
 }
 let stones=0;
 const cool=['#617d89','#7e9291','#3a666f','#53788b','#928e67','#ad975f','#384e61','#739690','#416272','#c0ab71'];
 const warm=['#b89748','#cdb16a','#ae9d61','#70878a','#d6ba65','#7e8665','#a38d4b','#516c71'];
 for(let z=17,row=0;z>-74;z-=.56,row++){await yieldBuild();let min=z>4?-17:-.5,max=z>-25?10.2:8.5;for(let x=min+(row%2)*.42;x<max;x+=.86){if(x>9.1&&z<5&&z>-22)continue;let glow=x<2.5&&z<7&&z>-22;let col=pick(glow?warm:cool);cobble(x+range(-.04,.04),z+range(-.035,.035),range(.77,.84),range(.48,.535),tint(col,range(.88,1.12)));stones++;}}
 await yieldBuild();
 // Terrace boards and the low lip, with directional painted grain.
 for(let z=-18;z<4.7;z+=.28)w.box([-3.42,.188,z],[4.7,.024,.25],tint('#b58a40',range(.91,1.11)));
 w.box([-.94,.165,-6.6],[.14,.27,23.1],'#d2ab4f');w.box([-3.45,.16,4.88],[5.2,.24,.16],'#be9046');
 function wallWindow(x,z,y,side,col=C.teal,lit=false,size=1){let origin=[x,y,z],rot=side*Math.PI/2;const tr=q=>w.transform(q,origin,rot);const bx=(q,s,c,r=0,em=0)=>w.box(tr(q),s,c,rot+r,em);let ww=1.1*size,hh=1.75*size;
  bx([0,0,0],[ww+.28,hh+.27,.16],tint(C.trim,.83));bx([0,0,.10],[ww,hh,.08],lit?'#c4ac57':'#193e51',0,lit?.64:0);bx([0,0,.16],[.055,hh,.09],C.teal);bx([0,.12,.16],[ww,.05,.09],C.teal);
  bx([0,-hh/2-.09,.16],[ww+.45,.14,.37],tint(C.trim,1.08));bx([0,hh/2+.14,.07],[ww+.42,.16,.23],tint(C.trim,1.13));
  for(let s of [-1,1]){let off=s*(ww/2+.27),yaw=s*.12;bx([off,0,.22],[.48,hh+.08,.11],col,yaw);for(let yy=-hh/2+.12;yy<hh/2;yy+=.14)bx([off,yy,.302],[.46,.055,.09],tint(col,range(1.02,1.26)),yaw);bx([off,0,.33],[.035,hh,.035],tint(col,.7),yaw);}
 }
 await yieldBuild();
 // Café upper floor, pale turquoise with five shuttered bays and continuous iron rail.
 w.box([-8.52,8.0,-6.6],[6.05,6.6,23.2],'#46788b');w.box([-8.52,11.33,-6.6],[6.38,.22,23.5],'#609493');
 w.box([-8.52,4.78,-6.6],[6.2,.27,23.5],'#9aa875');
 await yieldBuild();
 // Patchy pigment marks on façade: geometry, not a photograph pasted onto a wall.
 for(let i=0;i<550;i++){let yy=range(5.02,11.17),zz=range(-18,4.8);w.box([-5.48,yy,zz],[.009,range(.08,.32),range(.025,.075)],pick(['#537e8c','#61858c','#3d6b82','#5c838f','#44758a']));}
 [-15.7,-11.1,-6.5,-1.9,2.9].forEach((z,i)=>{wallWindow(-5.40,z,6.22,1,'#2c5a5b',false);wallWindow(-5.40,z,9.28,1,'#2a5359',i===3);});
 await yieldBuild();
 // Upper balconies and curving ironwork.
 for(let z=-17.7;z<4.5;z+=.55){w.cylinder([-4.84,4.95,z],[-4.84,5.60,z],.025,.023,'#294c4d',5);}
 w.cylinder([-4.84,5.62,-18],[-4.84,5.62,4.8],.036,.036,'#244647',6);w.box([-5.02,4.95,-6.6],[1.06,.09,23.3],'#749386');
 await yieldBuild();
 // Lower café walls leave an actual open doorway into the invented room.
 w.box([-5.63,2.35,-8.55],[.30,4.70,19.1],C.gold);w.box([-5.63,2.35,3.93],[.30,4.70,1.56],C.gold);w.box([-5.63,4.03,2.06],[.30,1.36,2.14],C.gold);
 w.box([-8.48,2.35,4.88],[6.0,4.70,.28],'#467479');w.box([-11.40,2.35,-6.6],[.24,4.70,23.2],'#365459');w.box([-8.48,2.35,-18.10],[6.,4.70,.27],'#99823e');
 w.box([-8.42,4.67,-6.6],[6.1,.14,23.1],'#8e783d');
 await yieldBuild();
 // Ornament, door recesses, green wainscoting and pilasters.
 for(let z of [-16,-11.7,-7.4,-3.1]){
  w.box([-5.445,1.54,z],[.058,2.55,1.58],'#a58736');w.box([-5.403,1.64,z],[.053,2.30,1.32],'#698154');
  w.box([-5.36,1.92,z],[.053,1.32,1.13],'#c6b867',0,.18);w.box([-5.32,1.84,z],[.05,2.23,.065],'#536f4e');w.box([-5.32,1.62,z],[.05,.067,1.24],'#536f4e');
  w.box([-5.34,.71,z],[.10,.36,1.25],'#819154');w.box([-5.36,2.99,z],[.13,.15,1.76],'#e3c759');
 }
 for(let z=-17.8;z<4.9;z+=2.16){if(z>.7&&z<3.1)continue;w.box([-5.36,1.64,z],[.15,3.27,.14],'#d1a440');w.box([-5.29,3.28,z],[.24,.16,.30],'#ead076');}
 for(let i=0;i<420;i++){let zz=range(-18,4.7);if(zz>1&&zz<3.1)continue;w.box([-5.46,range(.25,4.42),zz],[.018,range(.06,.32),range(.020,.036)],pick(['#e6c34e','#c3a147','#ebce64','#a99647']));}
 w.box([-5.495,5.37,-6.6],[.065,1.36,23.2],'#d5b23e',0,.2);
 await yieldBuild();
 // The great ochre awning: many slightly sagged strips with real volume, scalloped valance.
 for(let j=0;j<54;j++){let z=-18+j*.424,zz=z+.429,outer=-.79,inner=-5.47;for(let s=0;s<7;s++){let t=s/7,tt=(s+1)/7;let xx=inner+(outer-inner)*t,xxx=inner+(outer-inner)*tt;let yy=6.22-2.17*t-.17*Math.sin(Math.PI*t),yyy=6.22-2.17*tt-.17*Math.sin(Math.PI*tt);let color=tint(j%4===0?'#d9b33f':'#e5bf42',range(.975,1.025));w.solid.quad([xx,yy,z],[xxx,yyy,z],[xxx,yyy,zz],[xx,yy,zz],color,.25);w.solid.quad([xx,yy-.045,zz],[xxx,yyy-.045,zz],[xxx,yyy-.045,z],[xx,yy-.045,z],tint(color,.89),.17);}
  let ybottom=3.78-.055*Math.sin(j*.7);w.solid.quad([outer,4.04,z],[outer,4.04,zz],[outer,ybottom,zz],[outer,ybottom,z],tint('#d5ad37',j%3===0?.94:1),.17);}
 w.cylinder([-.79,4.05,-18],[ -.79,4.05,4.9],.035,.035,'#b18b32',6);
 for(let z of [-17.65,-10.8,-3.8,4.45]){w.cylinder([-5.25,3.20,z],[-.8,4.01,z],.028,.028,'#7e793b',6);w.cylinder([-.89,.24,z],[-.89,4.0,z],.039,.039,'#879248',6);}
 await yieldBuild();
 // Curled wall brackets, warm gas lanterns and light pools.
 function lantern(x,y,z,large=false){let s=large?1.25:1;w.box([x,y,z],[.32*s,.50*s,.32*s],'#e6cc78',0,.93);w.box([x,y-.28*s,z],[.4*s,.07*s,.4*s],C.iron);w.box([x,y+.29*s,z],[.46*s,.07*s,.46*s],C.iron);w.cylinder([x,y+.31*s,z],[x,y+.54*s,z],.3*s,.035,C.iron,4);for(let a of [-1,1])for(let b of [-1,1])w.cylinder([x+a*.17*s,y-.25*s,z+b*.17*s],[x+a*.17*s,y+.25*s,z+b*.17*s],.022,.022,C.iron,5);w.sphere([x,y,z],[.10,.19,.1],'#fff1b5',8,6,1);}
 for(let z of [-14.4,-7.0,-.2]){w.cylinder([-5.32,2.82,z],[-4.63,2.82,z],.037,.037,'#778149',6);w.tube([[-5.1,2.7,z],[-4.96,2.43,z],[-4.7,2.45,z],[-4.63,2.8,z]],.025,'#9e9b4d');lantern(-4.61,2.45,z);}
 await yieldBuild();
 // A readable (imaginary) painted café sign at the near end.
 labelQuad(w,[-5.29,3.4,4.15],[-5.29,3.4,3.07],[-5.29,4.46,3.07],[-5.29,4.46,4.15],0,.5);
 await yieldBuild();
 // Roof has a real ridge and laid tile courses.
 function roof(x,z,dx,dz,y,col){let l=x-dx/2,r=x+dx/2,front=z+dz/2,back=z-dz/2;w.solid.quad([l,y,front],[l,y,back],[x,y+1.42,back],[x,y+1.42,front],col);w.solid.quad([x,y+1.42,front],[x,y+1.42,back],[r,y,back],[r,y,front],tint(col,.76));w.solid.tri([l,y,front],[x,y+1.42,front],[r,y,front],tint(col,.9));
  for(let zz=back;zz<front;zz+=.38){w.cylinder([l,y+.045,zz],[x,y+1.46,zz],.035,.035,tint(col,1.18),5);w.cylinder([x,y+1.46,zz],[r,y+.045,zz],.035,.035,tint(col,.95),5);}for(let xx=l+.5;xx<r;xx+=.62){let yy=y+1.42*(1-Math.abs(xx-x)/(dx/2));w.cylinder([xx,yy+.05,back],[xx,yy+.05,front],.022,.022,tint(col,.77),5);}}
 roof(-8.51,-6.6,6.8,23.6,11.43,'#40656c');
 for(let z of [-15.4,-1]){w.box([-9.2,12.0,z],[.85,2.0,.8],'#497078');w.box([-9.2,13.06,z],[1.06,.14,1.02],'#648784');}
 await yieldBuild();
 // Café furniture: bentwood chairs, marble tops, saucers, cups, bread and flowers.
 function chair(x,z,rot=0,occupied=false){const o=[x,.22,z],tr=q=>w.transform(q,o,rot);w.cylinder(tr([0,.47,0]),tr([0,.52,0]),.25,.26,'#aa8546',12);w.cylinder(tr([0,.518,0]),tr([0,.525,0]),.215,.215,'#bbab6b',12);
  for(let a of [-1,1])for(let b of [-1,1])w.cylinder(tr([a*.22,0,b*.24]),tr([a*.17,.51,b*.16]),.025,.028,C.wood,6);
  let curve=[];for(let i=0;i<=18;i++){let a=Math.PI*i/18;curve.push(tr([Math.cos(a)*.28,.71+Math.sin(a)*.46,-.23]));}w.tube(curve,.027,'#ae8a48',6);w.cylinder(tr([-.28,.51,-.23]),tr([-.28,.71,-.23]),.029,.028,C.wood,6);w.cylinder(tr([.28,.51,-.23]),tr([.28,.71,-.23]),.029,.028,C.wood,6);
  let inner=[];for(let i=0;i<=12;i++){let a=Math.PI*i/12;inner.push(tr([Math.cos(a)*.18,.68+Math.sin(a)*.31,-.237]));}w.tube(inner,.017,'#927b40',5);w.ellipse([x,.205,z],.37,.31,'#463e32',.18);}
 function cup(x,y,z){w.cylinder([x,y,z],[x,y+.022,z],.14,.14,'#d5dbb4',12);w.cylinder([x,y+.026,z],[x,y+.15,z],.068,.088,'#e1d9af',12);w.cylinder([x,y+.153,z],[x,y+.155,z],.067,.068,'#513f26',12);let arc=[];for(let i=0;i<12;i++){let a=-Math.PI*.7+i/11*Math.PI*1.4;arc.push([x+.081+Math.cos(a)*.046,y+.09+Math.sin(a)*.048,z]);}w.tube(arc,.012,'#d8d8ac',5);}
 const tables=[];
 function table(x,z,rad=.55,props=true){let y=1.00;w.cylinder([x,.23,z],[x,.96,z],.055,.045,'#4c5440',8);for(let a=0;a<3;a++){let ang=a*Math.PI*2/3;w.tube([[x,.45,z],[x+Math.cos(ang)*.21,.23,z+Math.sin(ang)*.21],[x+Math.cos(ang)*.39,.23,z+Math.sin(ang)*.39]],.025,'#4b5546',6);}
  w.cylinder([x,y-.043,z],[x,y,z],rad,rad,'#77978b',24);w.cylinder([x,y+.003,z],[x,y+.018,z],rad*.963,rad*.963,'#c5d1b4',24);w.ellipse([x,.211,z],rad*.86,rad*.70,'#344d47',.2);tables.push({x,z,rad});
  if(props){cup(x+.13,y+.024,z+.08);w.box([x-.19,y+.025,z-.04],[.16,.009,.25],'#dfd0a5',.32);w.cylinder([x-.21,y+.03,z-.18],[x-.21,y+.20,z-.18],.055,.044,'#779883',9);w.tube([[x-.21,y+.19,z-.18],[x-.20,y+.38,z-.17]],.009,'#718449',5);for(let j=0;j<5;j++){let a=j/5*6.28;w.sphere([x-.2+Math.cos(a)*.028,y+.38,z-.17+Math.sin(a)*.03],[.035,.026,.032],j%2?'#e7bd52':'#eed283',6,4);} }
 }
 const layout=[[-2.53,3.58],[-4.05,1.40],[-2.57,-1.2],[-4.02,-3.85],[-2.65,-6.25],[-4.0,-8.9],[-2.56,-11.2],[-4.02,-13.6],[-2.7,-16.0]];
 layout.forEach(([x,z],i)=>{table(x,z,i===0?.61:.53,i%3!==2);chair(x,z+.89,Math.PI,i>4);chair(x+.76,z-.32,-Math.PI/2,i%3===1);if(i>1)chair(x-.63,z-.48,.45,i%2===0);});
 await yieldBuild();
 // One small table at the terrace's edge, with a steaming cup to sit beside.
 table(-.16,4.1,.53,true);chair(.63,4.10,-Math.PI/2);chair(-.2,5.03,Math.PI);
 await yieldBuild();
 // Thin animated steam ribbons. Transparency is subtle; never a solid white plume.
 for(let k=0;k<3;k++){let xx=-.03+k*.014,zz=4.18+k*.012;for(let j=0;j<10;j++){let yy=1.18+j*.05,xx0=xx+Math.sin(j*.65+k)*.02,xx1=xx+Math.sin((j+1)*.65+k)*.02;w.alpha.quad([xx0-.012,yy,zz],[xx0+.012,yy,zz],[xx1+.014,yy+.05,zz],[xx1-.014,yy+.05,zz],'#e5dbb7',.7,4,(1-j/10)*.16);}}
 await yieldBuild();
 // Modest figure sculpture: painted shapes, not photorealistic faces.
 function person(x,z,rot=0,coat='#354e53',seated=false,apron=false,skirt=false){let base=seated?.28:0;const tr=q=>w.transform(q,[x,base,z],rot);let hip=seated?.62:.87,should=seated?1.09:1.39,head=seated?1.42:1.72;
  const sph=(q,s,c)=>w.sphere(tr(q),s,c,10,6);const limb=(a,b,r1,r2,c)=>w.cylinder(tr(a),tr(b),r1,r2,c,8);
  w.ellipse([x,.214,z],.33,.24,'#233e3f',.2);
  if(skirt&&!seated){w.cylinder(tr([0,.24,0]),tr([0,1.1,0]),.29,.14,coat,10);}
  else for(let s of [-1,1]){let knees=[s*.105,seated?.45:.49,seated?.31:.015],foot=[s*.115,.23,seated?.31:.045];limb([s*.10,hip,0],knees,.083,.07,tint(coat,.70));limb(knees,foot,.072,.043,tint(coat,.75));sph([foot[0],.22,foot[2]+.068],[.067,.056,.135],'#2e3c3d');}
  sph([0,(hip+should)/2,0],[.215,(should-hip)/2+.07,.132],coat);sph([0,should-.03,0],[.247,.102,.134],coat);
  limb([0,should+.09,0],[0,head-.16,0],.054,.060,'#b6a478');sph([0,head,.015],[.114,.162,.104],'#bea878');sph([0,head+.073,-.025],[.119,.108,.106],'#39443c');sph([0,head-.001,.111],[.023,.039,.027],'#c8ae7c');
  let handY=seated?.92:apron?1.14:.93;for(let s of [-1,1]){let elbow=[s*.26,should-.28,.025],hand=[s*(apron?.30:.17),handY,apron?.24:.15];limb([s*.19,should-.06,0],elbow,.065,.052,coat);limb(elbow,hand,.052,.032,coat);sph(hand,[.043,.067,.04],'#b7a475');}
  if(apron){w.box(tr([0,1.10,.131]),[.31,.69,.029],'#d8daba',rot);w.box(tr([0,1.44,.136]),[.105,.19,.028],'#e6dfb9',rot);w.cylinder(tr([.29,1.19,.23]),tr([.29,1.22,.23]),.20,.20,'#85968a',12);}
 }
 person(-2.15,-8.16,.32,'#c2cbb5',false,true);
 person(-2.05,-5.65,Math.PI,'#3f5b58',true);person(-3.90,-3.0,Math.PI,'#6b5c48',true);person(-3.55,-9.52,-.25,'#284651',true);person(-2.75,-12.02,.2,'#314952',true);person(-3.80,-14.50,.25,'#776b41',true);person(-3.42,-15.90,-1.3,'#8f8252',true);
 person(3.35,-11.2,2.3,'#768560',false,false,true);person(4.08,-11.40,2.3,'#324e57');person(1.58,-15.4,-.2,'#9f8b4d');person(5.47,-25.4,.5,'#796c56',false,false,true);person(1.1,-31,-.4,'#465a55');person(6.3,-43,1.1,'#6f6b4f');
 await yieldBuild();
 // Interior: clearly an imagined extension, accessible through the actual doorway at z≈2.
 w.box([-8.40,.17,.40],[5.8,.1,8.7],'#746b45');w.box([-8.4,2.3,-4.02],[5.8,4.6,.17],'#8c8148');w.box([-10.43,.77,.02],[1.20,1.12,6.6],'#496450');w.box([-10.43,1.35,.02],[1.45,.11,6.9],'#ada366');
 for(let zz=-2.8;zz<3;zz+=1.1){cup(-10.08,1.41,zz);w.cylinder([-10.73,1.4,zz],[-10.73,1.74,zz],.085,.066,'#517b65',10);}
 for(let yy of [2.0,2.72]){w.box([-11.19,yy,.18],[.41,.13,6.35],'#686b45');for(let zz=-2.7;zz<3.1;zz+=.56)w.cylinder([-11.09,yy+.05,zz],[-11.09,yy+range(.24,.50),zz],.072,.055,pick(['#496d54','#849d6e','#50746c','#8c9665']),8);}
 lantern(-8.37,3.1,.32);w.cylinder([-8.37,3.44,.32],[-8.37,4.6,.32],.023,.023,C.iron,6);
 labelQuad(w,[-9.70,1.62,-3.913],[-8.5,1.62,-3.913],[-8.5,2.82,-3.913],[-9.70,2.82,-3.913],2,.4);
 labelQuad(w,[-7.5,1.64,-3.911],[-6.28,1.64,-3.911],[-6.28,2.86,-3.911],[-7.5,2.86,-3.911],3,.4);
 w.box([-7.38,.69,-2.28],[1.14,.08,.84],'#a59a69');w.cylinder([-7.38,.2,-2.28],[-7.38,.68,-2.28],.065,.055,C.iron,7);chair(-7.36,-1.5,Math.PI);
 await yieldBuild();
 // Menu board next to the door, facing the street.
 w.box([-4.70,.80,3.62],[.15,1.08,.77],'#7c673b',.12);labelQuad(w,[-4.60,.34,4.0],[-4.60,.34,3.25],[-4.60,1.3,3.25],[-4.60,1.3,4.0],1,.22);
 await yieldBuild();
 // Neighbouring houses, varied heights, shutters, decorative cornices and tiled roofs.
 function house(face,z,len,height,side,color,idx){let dep=range(5.2,7.2),x=face-side*dep/2;w.box([x,height/2,z],[dep,height,len],color);w.box([x,height+.08,z],[dep+.32,.20,len+.34],tint(color,1.16));w.box([face+side*.14,3.17,z],[.28,.16,len+.14],tint(color,1.18));
  let bays=Math.max(1,Math.floor(len/2.15));for(let i=0;i<bays;i++){let zz=z-len/2+(i+.5)*len/bays;for(let yy=4.55;yy<height-1;yy+=2.63)wallWindow(face+side*.045,zz,yy,side,idx%2?'#28514e':'#365864',(idx+i+Math.floor(yy))%7===0,.83);}
  const rr=side*Math.PI/2,origin=[face+side*.07,0,z],tr=q=>w.transform(q,origin,rr);w.box(tr([0,1.3,.01]),[len*.56,2.6,.09],idx%3?'#284d50':'#928d53',rr,idx%3?0:.18);w.box(tr([0,2.6,.12]),[len*.63,.15,.21],tint(color,1.3),rr);
  for(let q=-len*.27;q<len*.28;q+=.6){w.box(tr([q,1.35,.09]),[.045,2.55,.12],'#233e42',rr);}
  w.box(tr([0,.20,.13]),[len*.62,.32,.35],tint(color,.74),rr);roof(x,z,dep+.48,len+.34,height+.18,idx%3===0?'#586856':'#315761');
  if(idx%2===0){w.box([x,height+1.8,z-.7],[.66,1.72,.72],tint(color,.88));w.box([x,height+2.70,z-.7],[.86,.12,.90],tint(color,1.1));}
  w.collider(Math.min(face,face-side*dep)-.2,Math.max(face,face-side*dep)+.2,z-len/2-.16,z+len/2+.16);
  for(let j=0;j<120;j++){let zz=range(z-len/2,z+len/2);w.box([face+side*.031,range(3.4,height-.2),zz],[.008,range(.06,.32),range(.018,.059)],tint(color,range(.85,1.3)));}
 }
 const homes=[ [9.5,1.8,6.7,9.2,-1,'#386c7d'],[10,-5.0,6.65,12.7,-1,'#315e71'],[9.6,-11.1,5.4,10.8,-1,'#2a5161'],[9.75,-17.2,6.75,14.1,-1,'#35586b'],[10,-24.2,6.9,11.6,-1,'#2d5765'],[9.0,-33.8,6.6,14.7,-1,'#30576b'],[8.7,-40.7,6.9,12.5,-1,'#305664'],[8.7,-47.7,6.9,14.4,-1,'#274f60'],[8.7,-55,7.4,12.4,-1,'#2d5160'],[-5.3,-22.3,7.2,9.7,1,'#466d76'],[-4.1,-29.7,7.5,11.4,1,'#426676'],[-3.5,-37.2,7.3,10.1,1,'#335967'],[-2.8,-44.3,6.5,12.5,1,'#2f5666'],[-2.5,-53.3,9.5,9.2,1,'#315765'],[-2.2,-64,10.4,10.6,1,'#345564'] ];homes.forEach((h,i)=>house(...h,i));
 await yieldBuild();
 // Street entrance remains an open, navigable plaza. Background buildings fill the horizon.
 [-18,-28,-38].forEach((x,i)=>{house(x,-15-i*10,11,range(8,13),1,'#315966',20+i)});
 await yieldBuild();
 // Small bell tower at the vanishing point.
 w.box([2.10,6.3,-63],[2.45,12.6,2.9],'#31576b');w.box([2.1,12.1,-63],[2.86,.22,3.24],'#5c7b82');w.box([2.1,13.54,-63],[2.27,2.7,2.75],'#3e6575');w.box([2.10,13.63,-61.59],[1.3,1.65,.06],'#1e4051');w.cylinder([2.1,13.3,-61.6],[2.1,14.06,-61.6],.32,.18,'#8d9168',10);w.cylinder([2.1,15.02,-63],[2.1,18.16,-63],2.03,.0,'#31546b',4);w.cylinder([2.1,18.13,-63],[2.1,18.8,-63],.036,.028,'#a8b19a',6);w.cylinder([1.87,18.54,-63],[2.34,18.54,-63],.024,.024,'#a8b19a',6);
 await yieldBuild();
 // Iron drain, short bollards and a quietly glowing corner shop.
 for(let z=-19;z<8;z+=3.2){w.box([7.8,.029,z],[.41,.014,.20],'#243f44');for(let j=-2;j<=2;j++)w.box([7.8+j*.065,.042,z],[.017,.007,.16],'#5a776d');}
 for(let z of [7.5,-20,-30]){w.cylinder([7.0,.04,z],[7.0,.65,z],.07,.055,'#475f53',8);w.sphere([7,.68,z],[.084,.087,.084],'#6a8065',8,5);}
 labelQuad(w,[9.39,2.94,2.46],[9.39,2.94,4.36],[9.39,3.48,4.36],[9.39,3.48,2.46],0,.17);
 await yieldBuild();
 // Organic tree: branching skeleton, thousands of pointed, painted leaflets.
 function tree(x,z,size=1){let yy=.15;w.cylinder([x,yy,z],[x-.15*size,4.1*size,z-.18],.21*size,.095*size,'#34584c',10);let branches=[];
  for(let i=0;i<9;i++){let ang=i/9*6.28+.4,rad=range(1.7,3.3)*size,end=[x+Math.cos(ang)*rad,range(5.3,7.0)*size,z+Math.sin(ang)*rad];w.tube([[x-.12,3.2*size,z],[x+Math.cos(ang)*rad*.5,4.9*size,z+Math.sin(ang)*rad*.5],end],.060*size,'#335a4c',7);branches.push(end);}
  let leafcolors=['#28574a','#3b6851','#426f54','#4b7552','#567853','#325d53','#7f8850','#265044'];
  for(let i=0;i<1850;i++){let ang=range(0,6.28),rr=Math.sqrt(rand())*3.6*size,xx=x+Math.cos(ang)*rr,zz=z+Math.sin(ang)*rr,yy=6.05*size+range(-1,1)*size-rr*.12;let a=range(-.6,.6)+ang*.35,len=range(.13,.48)*size,width=len*range(.22,.42),dy=range(-.06,.09),col=pick(leafcolors),center=[xx,yy,zz];let ux=Math.cos(a),uz=Math.sin(a);let A=[xx-ux*len/2,yy-dy,zz-uz*len/2],B=[xx-uz*width/2,yy+.018,zz+ux*width/2],D=[xx+uz*width/2,yy+.012,zz-ux*width/2],E=[xx+ux*len/2,yy+dy,zz+uz*len/2];w.solid.tri(A,B,E,col,undefined,0,2);w.solid.tri(A,E,D,tint(col,.81),undefined,0,2);}
 }
 tree(8.0,-2.8,1.14);tree(6.8,-28.5,.72);tree(-15,-24,1.2);tree(15,-40,1.1);
 await yieldBuild();
 // Pots and olive sprigs near the doorway.
 for(let [x,z,s] of [[-4.84,4.32,.48],[7.98,-20,.70],[8.1,5.5,.60],[-.5,-20,.55]]){w.cylinder([x,.19,z],[x,.64*s+.19,z],.25*s,.39*s,'#9e774b',11);w.cylinder([x,.64*s+.19,z],[x,.68*s+.19,z],.41*s,.41*s,'#b08b56',12);for(let k=0;k<18;k++){let a=k/18*6.28,rr=range(.1,.3)*s,h=range(.35,.85)*s;w.cylinder([x,.6*s+.19,z],[x+Math.cos(a)*rr,.65*s+h,z+Math.sin(a)*rr],.009,.006,'#697b43',5);w.sphere([x+Math.cos(a)*rr,.65*s+h,z+Math.sin(a)*rr],[.09*s,.14*s,.045*s],pick(['#6b864c','#9eab5d','#4e754d']),6,4);}}
 await yieldBuild();
 // An unobtrusive bench in the quieter alley.
 for(let z of [-26.4,-27.4]){w.box([6.55,.46,z],[1.23,.10,.20],'#789275');w.box([6.55,.20,z],[.14,.45,.18],'#344f49');}for(let i=0;i<4;i++)w.box([7.15,.77+i*.13,-26.9],[.10,.082,1.48],'#648169');
 await yieldBuild();
 // Very sparse motes in gaslight, not a glitter storm.
 for(let i=0;i<44;i++){let x=range(-5.2,.4),y=range(.75,4.2),z=range(-17,5),s=range(.010,.018);w.alpha.quad([x-s,y-s,z],[x+s,y-s,z],[x+s,y+s,z],[x-s,y+s,z],'#eed69a',.9,3,range(.12,.35));}
 await yieldBuild();
 // Collision system: café room is walkable, windows/walls are not. Furniture uses circles.
 w.collider(-11.6,-11.15,-18.5,5.1);w.collider(-11.5,-5.45,4.71,5.12);w.collider(-11.5,-5.46,-18.5,-3.91);w.collider(-5.88,-5.36,-18.1,1.02);w.collider(-5.88,-5.36,3.11,4.94);w.collider(-11.4,-9.69,-3.4,3.3);
 w.tables=tables;w.stats={stones,triangles:(w.solid.data.length+w.alpha.data.length+w.labels.data.length+w.sky.data.length)/42,opaqueVertices:w.solid.data.length/14};return w;
}

/* Original procedural score “A table beneath the stars”. Web Audio only, no samples. */
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

/* Interaction, accessible bilingual UI, camera choreography and postcard export. */
const COPY={
 zh:{brand:'画框之外',painting:'关于这幅画',title:'夜色，尚未打烊。',subtitle:'走进梵高的《夜间露天咖啡座》',intro:'这一次，不必站在画框外。<br>沿着灯光往前走，或者，只在一张桌旁坐下。',enter:'走进这幅画',freeEnter:'我想自己走走',entryNote:'28 秒夜游 · 随时接手漫游 · 点击进入后开启轻柔配乐',postcard:'留一张明信片',hide:'只看夜色 · H',spot0:'入画',spot1:'一杯夜色',spot2:'灯火里面',spot3:'小巷深处',spot4:'屋顶之间',spot5:'星星之间',aboutTitle:'从一幅画，到一个夜晚。',aboutIntro:'灵感来自文森特·梵高的《夜间露天咖啡座》（1888），描绘法国阿尔勒论坛广场的一间咖啡馆。原作收藏于克勒勒-米勒博物馆。',keptTitle:'画里的起点',keptText:'明黄色的雨篷、蓝绿色的街道、圆桌、百叶窗、行人与夜空。我们以这些色彩和空间关系为起点。',addedTitle:'画框外的想象',addedText:'室内、背街、屋顶、人物体积、星空方位与配乐均是本项目的艺术化补充，不是历史测绘或原作中隐藏的信息。',howTitle:'不是一张全景图。',howText:'墙、窗、石板、杯子和椅子都由三维网格搭建。你可以改变位置，也可以改变高度。所有纹理与配乐由程序原创生成，离线运行，不调用任何模型或在线 API。',respectTitle:'靠近它，而不是替代它。',respectText:'这个作品是一封写给原画的情书，不是原画的数字修复。认识真实的笔触、尺寸与创作背景，请继续走进博物馆的原作资料。',museumLink:'馆藏与原作资料 ↗',imageLink:'查看原画图像 ↗',linksNote:'仅主动打开以上资料链接时需要联网；本网站的漫游、音频、纹理与截图均不需要网络。',settingsTitle:'把夜晚调到舒服。',volume:'音乐音量',musicNote:'原创程序钢琴 · A table beneath the stars',paint:'画布颗粒',paintNote:'只调整细微颗粒，不移除材质笔触',quality:'画面精度',qualityNote:'卡顿时切换到轻量',low:'轻量',high:'精细',motion:'自动运镜',motionNote:'容易晕 3D 时选择关闭',off:'关闭',on:'开启',controlsTitle:'把方向交给你。',controlsText:'电脑：拖动看四周，WASD / 方向键移动，滚轮前后移动。F 切换步行 / 飞行，飞行时 Q 下降、E 上升。双击地面走过去。P 留下明信片，H 隐藏界面，Esc 退出自动夜游。',touchText:'手机：左下摇杆移动，拖动画面环顾四周。飞行时右侧 ↑ ↓ 调整高度。也可以点击底部地点直接抵达。',limitsText:'步行有基础墙体与桌面碰撞；飞行是自由观察模式，不模拟真实身体或建筑碰撞。连续街区的范围有限，可通过地点按钮回到画里。',walk:'步行 · F 切换飞行',fly:'飞行 · F 回到街上',walkTouch:'步行 · 切换飞行',flyTouch:'飞行 · 回到街上',hintWalk:'拖动环顾 · <kbd>W A S D</kbd> 移动 · 双击地面走过去',hintFly:'拖动环顾 · <kbd>W A S D</kbd> 移动 · <kbd>Q</kbd> 下降 <kbd>E</kbd> 上升',hintTouch:'左下摇杆移动 · 拖动画面环顾 · 点击地点抵达',hintTour:'自动夜游中 · 拖动画面或按方向键，随时接手',tourEnd:'夜游结束。接下来，方向交给你。',freeToast:'没有任务，也不必赶路。喜欢哪里，就在那里停一会儿。',blocked:'这边是墙或桌子。绕一下，或者切换飞行。',audioError:'当前浏览器未能启动音频，仍可继续漫游。',captureOK:'这一刻，已经装进明信片。',captureError:'当前浏览器未能保存截图，请使用系统截图。',onSound:'关闭音乐',offSound:'开启音乐',settings:'设置',full:'全屏',hideLabel:'隐藏界面',restore:'恢复界面',tour:'重播夜游',tourStop:'停止夜游',close:'关闭',map:'局部想象地图',soundIntro:'轻柔配乐已开启，可点右上角关闭。',motionOffToast:'自动运镜已关闭，你仍可自由移动。',bound:'已经走到这片想象的边缘。点击地点回到街区。'},
 en:{brand:'Beyond the frame',painting:'The painting',title:'The night is still open.',subtitle:'Step inside Van Gogh’s Café Terrace at Night',intro:'This time, you need not stay outside the frame.<br>Follow the light. Or simply find a table.',enter:'Step into the painting',freeEnter:'Wander on my own',entryNote:'A 28-second night walk · Take over anytime · Gentle music starts on entry',postcard:'Keep a postcard',hide:'Just the night · H',spot0:'The threshold',spot1:'A quiet table',spot2:'Inside the light',spot3:'The little lane',spot4:'The rooftops',spot5:'Among the stars',aboutTitle:'A painting becomes a night.',aboutIntro:'Inspired by Vincent van Gogh’s Café Terrace at Night (1888), depicting a café on the Place du Forum in Arles, France. The original belongs to the Kröller-Müller Museum collection.',keptTitle:'Where the painting begins',keptText:'A yellow awning, a blue-green street, round tables, shutters, passers-by and stars. Their colors and spatial relationships are our starting point.',addedTitle:'Where imagination continues',addedText:'The interior, side streets, rooftops, three-dimensional figures, star positions and music are artistic additions—not a historical survey or hidden information recovered from the painting.',howTitle:'Not a panorama.',howText:'Walls, windows, cobbles, cups and chairs are actual 3D meshes. Change your position, not just your viewing direction. All textures and music are generated locally from original code, without models or online APIs.',respectTitle:'Come closer. Not replace it.',respectText:'This is a love letter to the painting, not a digital restoration. Discover its actual brushwork, dimensions and context in the museum’s original collection resources.',museumLink:'Museum collection ↗',imageLink:'View the original painting ↗',linksNote:'Only these optional source links require internet access. The world, textures, audio and postcard export all work offline.',settingsTitle:'Make yourself at home.',volume:'Music volume',musicNote:'Original procedural piano · A table beneath the stars',paint:'Canvas grain',paintNote:'Fine surface grain only; brush textures remain',quality:'Render detail',qualityNote:'Choose Light if movement feels slow',low:'Light',high:'Fine',motion:'Automatic camera',motionNote:'Turn off if camera motion is uncomfortable',off:'Off',on:'On',controlsTitle:'The direction is yours.',controlsText:'Desktop: drag to look; WASD / arrow keys to move; scroll to move forward/back. F switches walk/flight. Q descends and E ascends in flight. Double-click the ground to walk there. P saves a postcard; H hides the interface; Esc stops the night walk.',touchText:'Mobile: move with the lower-left joystick and drag the scene to look. In flight, the right-side arrows change height. Tap any place in the bottom bar to arrive there.',limitsText:'Walking has basic wall and table collision. Flight is a free observation mode without body or building collision. The connected neighborhood is finite; place buttons always bring you back.',walk:'Walking · F to fly',fly:'Flying · F to walk',walkTouch:'Walking · tap to fly',flyTouch:'Flying · tap to walk',hintWalk:'Drag to look · <kbd>W A S D</kbd> to move · Double-click ground to walk',hintFly:'Drag to look · <kbd>W A S D</kbd> to move · <kbd>Q</kbd> down <kbd>E</kbd> up',hintTouch:'Left joystick to move · Drag to look · Tap a place to arrive',hintTour:'A guided night walk · Drag or use movement keys to take over',tourEnd:'The night walk ends. The direction is yours now.',freeToast:'There is no task, and no hurry. Stay wherever you like.',blocked:'A wall or table is in the way. Go around it, or switch to flight.',audioError:'Audio could not start in this browser. You can still explore.',captureOK:'A little piece of the night, kept as a postcard.',captureError:'This browser could not save a postcard. Use a system screenshot.',onSound:'Turn music off',offSound:'Turn music on',settings:'Settings',full:'Fullscreen',hideLabel:'Hide interface',restore:'Restore interface',tour:'Replay night walk',tourStop:'Stop night walk',close:'Close',map:'Imagined local map',soundIntro:'Gentle music is on. Use the top-right button to turn it off.',motionOffToast:'Automatic camera is off. You can still move freely.',bound:'You have reached the edge of this imagined neighborhood. Tap a place to return.'}
};
const PLACES=[
 {p:[8.2,3.25,14.5],t:[-2.9,4.2,-10.4],zh:['画中的街角','黄色的灯火，蓝色的夜。现在，你在画里了。'],en:['The painted corner','Yellow lamplight, a blue night. You are inside the frame.'],tag:'PLACE DU FORUM'},
 {p:[-.16,1.52,5.03],t:[-2.25,1.85,-3.5],zh:['给自己留一张桌子','这一杯不用喝完。这个夜晚也不用急着结束。'],en:['A table just for you','There is no need to finish the cup. Or the evening.'],tag:'A TABLE BENEATH THE STARS'},
 {p:[-7.95,1.72,2.05],t:[4.3,2.8,1.95],zh:['灯火里面','从画里看向画外。这间小店，是我们的想象。'],en:['Inside the lamplight','An imagined interior. Look back out into the painting.'],tag:'AN IMAGINED INTERIOR'},
 {p:[4.2,1.72,-27],t:[1.3,6.3,-61],zh:['小巷深处','再往前一点，喧闹就留在了身后。'],en:['Down the little lane','A few more steps, and the bustle is behind you.'],tag:'BEYOND THE PAINTED EDGE'},
 {p:[7.7,16.2,14],t:[-5,10.2,-12],zh:['屋顶之间','当你改变高度，熟悉的画也有了新的模样。'],en:['Between the rooftops','Change your height. Find a different painting.'],tag:'ABOVE THE ROOFLINE'},
 {p:[5,23,2],t:[-3,39,-40],zh:['星星之间','有些夜晚，只适合抬头，不适合赶路。'],en:['Among the stars','Some nights ask you to look up, not move on.'],tag:'THE BLUE HOUR, FOREVER'}
];
const TOUR={p:[[8.2,3.25,14.5],[2.3,2.5,8.4],[1.2,1.8,2.3],[1.35,1.85,-8],[3.5,3.7,-14.8],[6.8,10.8,-18],[6.3,19.5,-10.3],[5,23,2]],t:[[-2.9,4.2,-10.4],[-2.9,2.8,-3],[-3.25,1.55,-1.2],[-3.8,2.4,-11],[-1,7,-28],[-5,9,-9],[-8,20,-42],[-3,39,-40]]};
const TOUR_COPY={zh:['这一次，不必站在画框外。','灯还亮着。我们再坐一会儿。','在熟悉的画里，走一段陌生的路。','越过屋顶，把喧闹留在下面。','原来，夜晚也有这么多种亮。'],en:['This time, you need not stay outside the frame.','The light is still on. Let’s stay a little longer.','An unfamiliar path inside a familiar painting.','Over the roofs. Leave the bustle below.','There are so many ways for a night to shine.']};
const TOUR_TAGS=['THE THRESHOLD','THE GOLDEN TERRACE','THE LITTLE LANE','ABOVE THE ROOFS','AMONG THE STARS'];
const $=id=>document.getElementById(id),body=document.body;
let renderer,world,music,ready=false,lang=document.body.lang==='en'?'en':'zh',mode='landing',fly=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,eye=PLACES[0].p.slice(),yaw=0,pitch=0,goalYaw=0,goalPitch=0,selected=0,age=0,tourTime=0,last=0,frame=0,fade=0,transition=null,moveGoal=null,visit=new Set([0]),joy=[0,0],vertical=0,keys=new Set(),dialogOpen=false,touch=matchMedia('(pointer: coarse)').matches,toastTimer=null,animationFrame=null,lastBlockToast=0;
function t(k){return COPY[lang][k]||k;}
function aim(target){let d=V.norm(V.sub(target,eye));yaw=goalYaw=Math.atan2(d[0],-d[2]);pitch=goalPitch=Math.asin(clamp(d[1],-.999,.999));}
function forward(){return [Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300);}
function updateLocation(){const s=PLACES[selected],c=s[lang];$('locationOverline').textContent=`0${selected+1} / 06 · ${s.tag}`;$('locationTitle').textContent=c[0];$('locationText').textContent=c[1];document.querySelectorAll('[data-spot]').forEach(b=>b.classList.toggle('selected',+b.dataset.spot===selected));$('mapCaption').textContent=`${t('map')} · ${visit.size} / 6`;}
function updateUI(){document.querySelector('.hero').inert=mode!=='landing';document.querySelector('.explore-ui').inert=mode==='landing';body.classList.toggle('exploring',mode!=='landing');body.classList.toggle('touring',mode==='tour');body.classList.toggle('flying',fly);body.classList.toggle('touch',touch);body.classList.toggle('reduced-motion',reduced);$('flyLabel').textContent=t(fly?(touch?'flyTouch':'fly'):(touch?'walkTouch':'walk'));$('hint').innerHTML=t(mode==='tour'?'hintTour':touch?'hintTouch':fly?'hintFly':'hintWalk');$('tourButton').textContent=mode==='tour'?'Ⅱ':'▷';$('tourButton').classList.toggle('active',mode==='tour');$('tourButton').title=$('tourButton').ariaLabel=t(mode==='tour'?'tourStop':'tour');$('soundButton').classList.toggle('muted',!music?.on);$('soundButton').title=$('soundButton').ariaLabel=t(music?.on?'onSound':'offSound');$('motionOff').classList.toggle('active',reduced);$('motionOn').classList.toggle('active',!reduced);updateLocation();}
function syncStaticLanguage(){
 document.querySelector('#loading h2').textContent=lang==='zh'?'正在走进夜色':'Entering the painted night';
 $('loadMessage').textContent=lang==='zh'?'铺好石板，点亮灯火。':'Laying the stones and lighting the lamps.';
 document.querySelector('#error h2').textContent=lang==='zh'?'这个夜晚需要 WebGL 2。':'This world needs WebGL 2.';
 document.querySelector('#error p').textContent=lang==='zh'?'浏览器无法创建三维画面，请检查硬件加速设置。':'The browser could not create a 3D scene. Check hardware acceleration.';
 document.querySelector('#error button').textContent=lang==='zh'?'重新打开':'Reload';
 $('home').ariaLabel=lang==='zh'?'回到画前':'Return to the painting';
 document.querySelector('.top-tools').ariaLabel=lang==='zh'?'世界工具栏':'World tools';
 $('tourWords').textContent=TOUR_COPY[lang][Math.min(4,Math.floor(tourTime/28*5))];
}
function applyLanguage(){$('toast').textContent='';syncStaticLanguage();document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(n=>n.innerHTML=t(n.dataset.i18n));$('languageButton').textContent=lang==='zh'?'EN':'ZH';$('languageButton').title=$('languageButton').ariaLabel=lang==='zh'?'Switch to English':'切换中文';[['settingsButton','settings'],['fullButton','full'],['restoreButton','restore'],['hideButton','hideLabel']].forEach(([id,k])=>$(id).title=$(id).ariaLabel=t(k));document.querySelectorAll('[data-close]').forEach(b=>b.ariaLabel=t('close'));$('world').ariaLabel=lang==='zh'?'可自由探索的三维咖啡馆街道':'An explorable three-dimensional café street';document.title=lang==='zh'?'夜色，尚未打烊。｜画框之外':'The night is still open. | Outside the frame';updateUI();}
async function sound(on){try{await music.set(on);updateUI();}catch(e){toast(t('audioError'));if(music)music.on=false;updateUI();}}
function stopTour(){if(mode==='tour'){mode='free';fly=eye[1]>2.6;updateUI();}}
function enter(free=false){if(!ready)return;mode='free';if(free||reduced){eye=PLACES[0].p.slice();aim(PLACES[0].t);fly=false;updateUI();toast(t('freeToast'));}else startTour();$('world').focus({preventScroll:true});}
function startTour(){if(!ready)return;if(reduced){mode='free';jump(0);toast(t('motionOffToast'));return;}transition=null;moveGoal=null;mode='tour';tourTime=0;eye=TOUR.p[0].slice();aim(TOUR.t[0]);fly=false;selected=0;updateUI();}
function jump(id,instant=false){if(!ready)return;stopTour();mode='free';keys.clear();moveGoal=null;joy=[0,0];$('stick').style.transform='';const change=()=>{selected=id;visit.add(id);eye=PLACES[id].p.slice();aim(PLACES[id].t);fly=id>=4;updateUI();};if(instant||reduced){change();transition=null;fade=0;}else transition={age:0,swapped:false,change};updateUI();}
function home(){if(!ready)return;transition=null;moveGoal=null;mode='landing';selected=0;eye=PLACES[0].p.slice();aim(PLACES[0].t);fly=false;keys.clear();fade=0;body.classList.remove('hidden-ui');updateUI();}
function canWalk(x,z){if(x<-17||x>18||z<-72||z>19)return false;const r=.17;for(let c of world.colliders)if(x>c.x0-r&&x<c.x1+r&&z>c.z0-r&&z<c.z1+r)return false;for(let c of world.tables)if(Math.hypot(x-c.x,z-c.z)<c.rad+.11)return false;return true;}
function moveBy(delta){let nx=eye[0]+delta[0],nz=eye[2]+delta[2];if(fly){eye[0]=clamp(nx,-30,28);eye[1]=clamp(eye[1]+delta[1],.70,43);eye[2]=clamp(nz,-74,24);return true;}let did=false;if(canWalk(nx,eye[2])){eye[0]=nx;did=true;}if(canWalk(eye[0],nz)){eye[2]=nz;did=true;}return did;}
function toggleFly(){if(mode==='landing')enter(true);stopTour();fly=!fly;moveGoal=null;if(!fly){if(!canWalk(eye[0],eye[2]))eye=[3,1.72,clamp(eye[2],-69,16)];else eye[1]=1.72;}updateUI();}
function curve(points,t){let q=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(q)),u=q-i;const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*u+(2*a[k]-5*v+4*c[k]-d[k])*u*u+(-a[k]+3*v-3*c[k]+d[k])*u*u*u));}
function updateTour(dt){tourTime=Math.min(28,tourTime+dt);let k=tourTime/28;eye=curve(TOUR.p,k);aim(curve(TOUR.t,k));let section=Math.min(4,Math.floor(k*5));$('tourSmall').textContent=`0${section+1} / 05 · ${TOUR_TAGS[section]}`;$('tourWords').textContent=TOUR_COPY[lang][section];$('tourProgress').style.width=`${k*100}%`;let id=k<.27?0:k<.49?1:k<.66?3:k<.83?4:5;if(id!==selected){selected=id;visit.add(id);updateLocation();}if(tourTime>=28){mode='free';fly=true;selected=5;updateUI();toast(t('tourEnd'));}}
function drawMap(){const c=$('map'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);const tr=(a,b)=>[30+(a+11)*7,211+(b-10)*2.15];x.strokeStyle='#96a49144';x.lineWidth=1;x.beginPath();x.moveTo(...tr(2,15));x.lineTo(...tr(2,-68));x.stroke();world.colliders.forEach(o=>{let A=tr(o.x0,o.z0),B=tr(o.x1,o.z1);x.fillStyle=o.x0<0?'#94a6922c':'#749e9a26';x.fillRect(A[0],A[1],B[0]-A[0],B[1]-A[1]);});let A=tr(-5.6,-18),B=tr(-.8,5);x.fillStyle='#e8c47644';x.fillRect(A[0],A[1],B[0]-A[0],B[1]-A[1]);x.strokeStyle='#d5be7766';x.strokeRect(A[0],A[1],B[0]-A[0],B[1]-A[1]);let P=tr(eye[0],eye[2]);x.save();x.translate(...P);x.rotate(yaw);x.fillStyle='#efd393';x.beginPath();x.moveTo(0,-7);x.lineTo(4,4);x.lineTo(0,2);x.lineTo(-4,4);x.fill();x.restore();x.fillStyle='#b9c6b8';x.font='12px Georgia';x.fillText('N',W-29,24);x.beginPath();x.moveTo(W-25,30);x.lineTo(W-25,43);x.stroke();}
function loop(stamp){if(!ready)return;if(document.hidden){last=stamp;animationFrame=requestAnimationFrame(loop);return;}if(renderer.quality.sample(stamp))renderer.resize();const elapsed=Math.min((stamp-last)/1000||.016,1),dt=Math.min(elapsed,.08);last=stamp;age+=dt;frame++;
 if(!dialogOpen){if(mode==='tour')updateTour(elapsed);else if(mode==='free'){
  yaw+=(goalYaw-yaw)*(1-Math.exp(-dt*15));pitch+=(goalPitch-pitch)*(1-Math.exp(-dt*15));let z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy[1],xx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy[0],up=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+vertical;let sp=(keys.has('ShiftLeft')?5.0:2.15)*(fly?1.8:1)*dt,den=Math.max(1,Math.hypot(xx,z));let f=fly?forward():[Math.sin(yaw),0,-Math.cos(yaw)],right=[Math.cos(yaw),0,Math.sin(yaw)];if(z||xx||up){moveGoal=null;moveBy(V.add(V.mul(V.add(V.mul(f,z/den),V.mul(right,xx/den)),sp),[0,up*sp,0]));if(!fly)eye[1]+=(1.72-eye[1])*(1-Math.exp(-dt*5));}
  if(moveGoal){let d=V.sub(moveGoal,eye);d[1]=0;let dist=Math.hypot(...d);if(dist<.14)moveGoal=null;else{let old=eye.slice();moveBy(V.mul(V.norm(d),Math.min(dist,dt*2.1)));eye[1]+=(1.72-eye[1])*.08;if(Math.hypot(eye[0]-old[0],eye[2]-old[2])<.001){moveGoal=null;toast(t('blocked'));}}}
 }
 if(transition){transition.age+=elapsed;let tt=transition.age;if(tt<.22)fade=ease(tt/.22)*.97;else{if(!transition.swapped){transition.change();transition.swapped=true;}fade=(1-ease(clamp((tt-.22)/.40,0,1)))*.97;if(tt>=.63){transition=null;fade=0;}}}}
 let target=V.add(eye,forward()),renderEye=eye;if(mode==='landing'&&!reduced){let drift=Math.sin(age*.17)*.065;renderEye=[eye[0]+drift,eye[1]+Math.sin(age*.21)*.026,eye[2]];target=PLACES[0].t;}
 renderer.render(renderEye,target,reduced?0:age,fade);if(frame%5===0&&mode!=='landing')drawMap();animationFrame=requestAnimationFrame(loop);
}
function showDialog(id){stopTour();keys.clear();joy=[0,0];dialogOpen=true;$(id).showModal();}
function closeDialog(d){d.close();dialogOpen=false;keys.clear();last=performance.now();}
function bind(){
 $('enter').onclick=()=>enter(false);$('freeEnter').onclick=()=>enter(true);$('home').onclick=home;$('soundButton').onclick=()=>sound(!music.on);$('languageButton').onclick=()=>{lang=lang==='zh'?'en':'zh';applyLanguage();};$('tourButton').onclick=()=>mode==='tour'?stopTour():startTour();$('flyButton').onclick=toggleFly;$('aboutButton').onclick=()=>showDialog('aboutDialog');$('settingsButton').onclick=()=>showDialog('settingsDialog');
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.closest('dialog')));document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>{dialogOpen=false;keys.clear();});d.addEventListener('click',e=>{if(e.target===d){let r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}})});
 document.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>jump(+b.dataset.spot));$('hideButton').onclick=()=>body.classList.add('hidden-ui');$('restoreButton').onclick=()=>body.classList.remove('hidden-ui');$('fullButton').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(e){toast(lang==='zh'?'浏览器不允许全屏；可用浏览器自带全屏。':'Use the browser’s fullscreen command.');}};
 $('volume').oninput=e=>music.setVolume(+e.target.value/100);$('paint').oninput=e=>renderer.paint=+e.target.value/100;function quality(scale){renderer.quality.manual();renderer.scale=scale;renderer.resize();$('qualityLow').classList.toggle('active',scale<1);$('qualityHigh').classList.toggle('active',scale===1);}$('qualityLow').onclick=()=>quality(.70);$('qualityHigh').onclick=()=>quality(1);$('motionOff').onclick=()=>{reduced=true;stopTour();updateUI();};$('motionOn').onclick=()=>{reduced=false;updateUI();};$('captureButton').onclick=postcard;
 let drag=null;const cv=$('world');cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touch){touch=true;updateUI();}if(mode==='landing'){enter(true);}stopTour();moveGoal=null;drag={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||dialogOpen)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;goalYaw-=dx*.0035;goalPitch=clamp(goalPitch-dy*.003,-1.32,1.40);drag.x=e.clientX;drag.y=e.clientY;});const endDrag=e=>{if(drag?.id===e.pointerId)drag=null;};cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);cv.addEventListener('lostpointercapture',()=>drag=null);
 cv.addEventListener('wheel',e=>{if(dialogOpen)return;e.preventDefault();if(mode==='landing')enter(true);stopTour();moveBy(V.mul(fly?forward():[Math.sin(yaw),0,-Math.cos(yaw)],-Math.sign(e.deltaY)*.50));},{passive:false});
 cv.addEventListener('dblclick',e=>{if(mode!=='free'||fly||dialogOpen)return;let f=forward(),right=V.norm(V.cross(f,[0,1,0])),up=V.cross(right,f),ff=Math.tan((document.body.clientWidth<600?66:56)*Math.PI/360),nx=((e.clientX-document.body.getBoundingClientRect().left)/document.body.clientWidth*2-1)*ff*document.body.clientWidth/document.body.clientHeight,ny=(1-(e.clientY-document.body.getBoundingClientRect().top)/document.body.clientHeight*2)*ff,dir=V.norm(V.add(f,V.add(V.mul(right,nx),V.mul(up,ny))));if(dir[1]>-.015)return;let dist=(.20-eye[1])/dir[1],dest=V.add(eye,V.mul(dir,dist));if(dist<28&&canWalk(dest[0],dest[2]))moveGoal=dest;else toast(t('blocked'));});
 window.addEventListener('keydown',e=>{if(dialogOpen)return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.code==='Escape'){stopTour();body.classList.remove('hidden-ui');return;}if(e.code==='KeyH'){body.classList.toggle('hidden-ui');return;}if(e.code==='KeyP'){postcard();return;}if(e.code==='KeyF'){if(!e.repeat)toggleFly();return;}if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){e.preventDefault();if(mode==='landing')enter(true);stopTour();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();joy=[0,0];vertical=0;drag=null;});
 let jid=null;const joystick=$('joystick');function joystickMove(e){if(e.pointerId!==jid)return;let r=joystick.getBoundingClientRect(),xx=(e.clientX-r.left-r.width/2)/35,yy=(e.clientY-r.top-r.height/2)/35,d=Math.max(1,Math.hypot(xx,yy));joy=[xx/d,yy/d];$('stick').style.transform=`translate(${joy[0]*29}px,${joy[1]*29}px)`;}
 joystick.addEventListener('pointerdown',e=>{e.preventDefault();stopTour();jid=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e)});joystick.addEventListener('pointermove',joystickMove);for(let ev of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(ev,()=>{jid=null;joy=[0,0];$('stick').style.transform='';});[['upButton',1],['downButton',-1]].forEach(([id,val])=>{$(id).addEventListener('pointerdown',e=>{e.preventDefault();vertical=val;$(id).setPointerCapture(e.pointerId);});for(let ev of ['pointerup','pointercancel','lostpointercapture'])$(id).addEventListener(ev,()=>vertical=0);});
 window.addEventListener('resize',()=>{if(renderer)renderer.resize();});document.addEventListener('visibilitychange',()=>{keys.clear();joy=[0,0];if(music?.on&&music.context){if(document.hidden)void music.context.suspend();else void music.context.resume();}renderer?.quality.reset();last=performance.now();});cv.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;cancelAnimationFrame(animationFrame);$('error').style.display='block';$('errorDetail').textContent=lang==='zh'?'显卡上下文已丢失。请重新打开页面。':'The graphics context was lost. Reload the page.';if(music?.on)sound(false);});
}
function postcard(){if(!ready)return;try{renderer.render(eye,V.add(eye,forward()),reduced?0:age,0);let cv=$('world'),out=document.createElement('canvas'),W=cv.width,H=cv.height,margin=Math.max(25,Math.round(W*.035)),footer=Math.max(95,Math.round(W*.083));out.width=W+margin*2;out.height=H+margin*2+footer;let x=out.getContext('2d');x.fillStyle='#ece4cf';x.fillRect(0,0,out.width,out.height);x.drawImage(cv,margin,margin);x.fillStyle='#365158';x.textAlign='left';x.font=`italic ${Math.round(W*.025)}px Georgia, serif`;x.fillText('A night to stay a little longer.',margin,margin+H+footer*.46);x.font=`${Math.max(10,Math.round(W*.008))}px sans-serif`;x.fillStyle='#737c6c';x.fillText('CAFÉ TERRACE AT NIGHT · AN IMAGINED EXTENSION',margin,margin+H+footer*.76);x.textAlign='right';x.fillText('Shape of the World',out.width-margin,margin+H+footer*.76);out.toBlob(blob=>{if(!blob){toast(t('captureError'));return;}let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='a-night-in-arles.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);toast(t('captureOK'));},'image/png');}catch(e){toast(t('captureError'));}}
async function boot(){syncStaticLanguage();try{await new Promise(r=>requestAnimationFrame(r));renderer=new Renderer($('world'));$('loadBar').style.width='25%';await new Promise(r=>setTimeout(r,20));let paint=makePaint(),sky=makeSky(),labels=makeLabels();$('loadBar').style.width='55%';$('loadMessage').textContent=lang==='zh'?'摆好圆桌，让星星各就各位。':'Setting the tables beneath the stars.';await new Promise(r=>setTimeout(r,20));world=await makeWorld();$('loadBar').style.width='84%';await new Promise(r=>setTimeout(r,20));renderer.init(world,paint,sky,labels);music=new NightMusic();void music.set(true).catch(()=>{music.on=false;});aim(PLACES[0].t);bind();applyLanguage();ready=true;last=performance.now();renderer.render(eye,PLACES[0].t,0);$('loadBar').style.width='100%';$('loading').classList.add('done');animationFrame=requestAnimationFrame(loop);
 window.cafeWorld={get ready(){return ready},getState:()=>({mode,fly,eye:eye.slice(),yaw,pitch,selected,visits:[...visit],lang,reduced,stats:world.stats,drawCalls:renderer.draws,audioOn:music.on,audioState:music.context?.state,audioNotes:music.scheduled,frame,canvas:[$('world').width,$('world').height]}),jump:(id)=>jump(id,true),setTourTime:sec=>{mode='tour';tourTime=clamp(sec,0,28);updateTour(0);updateUI();},setPose:(p,target)=>{mode='free';eye=p.slice();aim(target);fly=eye[1]>2.6;updateUI()},setLanguage:l=>{lang=l;applyLanguage()},capture:postcard,canWalk,home,stop:()=>{cancelAnimationFrame(animationFrame);},render:()=>renderer.render(eye,V.add(eye,forward()),0,0),glError:()=>renderer.gl.getError()};
 }catch(e){console.error(e);$('error').style.display='block';$('errorDetail').textContent=e.message||String(e);$('loading').classList.add('done');}}
boot();

// Bridge the native bilingual world to the shared site shell.
const resize = new ResizeObserver(() => window.dispatchEvent(new Event('resize')));
resize.observe(document.body);
document.addEventListener('host-language', e => window.cafeWorld?.setLanguage(e.detail));
document.getElementById('languageButton').addEventListener('click', () => {
 const state=window.cafeWorld?.getState();
 document.body.dispatchEvent(new CustomEvent('world-language',{bubbles:true,detail:state?.language || state?.lang}));
});


const savePose=()=>{const s=window.cafeWorld?.getState();if(s&&s.mode!=='landing')try{sessionStorage.setItem('oneworld.cafe-terrace.pose',JSON.stringify(s))}catch{}};
window.addEventListener('pagehide',savePose);
function restorePose(){
 const api=window.cafeWorld;if(!api?.ready){setTimeout(restorePose,100);return;}
 try{const saved=JSON.parse(sessionStorage.getItem('oneworld.cafe-terrace.pose')||'null');sessionStorage.removeItem('oneworld.cafe-terrace.pose');
 if(saved&&Array.isArray(saved.eye)&&saved.eye.length===3&&saved.eye.every(Number.isFinite)){
 const target=saved.target||(Number.isFinite(saved.yaw)&&Number.isFinite(saved.pitch)?[saved.eye[0]+Math.sin(saved.yaw)*Math.cos(saved.pitch),saved.eye[1]+Math.sin(saved.pitch),saved.eye[2]-Math.cos(saved.yaw)*Math.cos(saved.pitch)]:null);
 if(target?.length===3&&target.every(Number.isFinite))api.setPose(saved.eye,target);
 } }catch{}
}
restorePose();
}
