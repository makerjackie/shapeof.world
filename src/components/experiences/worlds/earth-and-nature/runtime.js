export function mount(environment) {
const { translate, location, history, document, window, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, matchMedia, ResizeObserver } = environment;

// ---- math.js ----
/* Earth & Nature · small, dependency-free 3D mathematics. Column-major matrices. */
const TAU=Math.PI*2, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a));return t*t*(3-2*t)}, fract=x=>x-Math.floor(x);
const vadd=(a,b)=>a.map((n,i)=>n+b[i]), vsub=(a,b)=>a.map((n,i)=>n-b[i]), vmul=(a,s)=>a.map(n=>n*s);
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{let l=Math.hypot(...a)||1;return a.map(n=>n/l)};
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function matmul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])}
function lookAt(eye,target,up=[0,1,0]){let z=norm(vsub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function transform(p=[0,0,0],s=[1,1,1],r=0){let c=Math.cos(r),q=Math.sin(r);return new Float32Array([c*s[0],0,-q*s[0],0,0,s[1],0,0,q*s[2],0,c*s[2],0,...p,1])}
function project(p,m){let q=[0,0,0,0];for(let i=0;i<4;i++)q[i]=m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i];return [q[0]/q[3],q[1]/q[3],q[2]/q[3],q[3]]}
function color(hex){let n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
const cmix=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
function random(seed=42){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
function hash(x,z){return fract(Math.sin(x*127.1+z*311.7)*43758.5453123)}
function noise(x,z){let a=Math.floor(x),b=Math.floor(z),u=smooth(0,1,fract(x)),v=smooth(0,1,fract(z));return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v)}
function fbm(x,z,n=5){let a=.5,v=0;for(let i=0;i<n;i++){v+=a*noise(x,z);x=x*2.03+17.9;z=z*2.03-6.1;a*=.5}return v}
function ridge(x,z,n=5){let a=.55,v=0;for(let i=0;i<n;i++){v+=a*(1-Math.abs(noise(x,z)*2-1));x=x*2.09+19;z=z*2.09-5;a*=.5}return v}
function gauss(x,z,cx,cz,sx,sz=sx){return Math.exp(-((x-cx)**2/(sx*sx)+(z-cz)**2/(sz*sz)))}
function catmull(points,t){let f=clamp(t)* (points.length-1),i=Math.min(points.length-2,Math.floor(f)),u=f-i;let a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*u+(2*a[k]-5*v+4*c[k]-d[k])*u*u+(-a[k]+3*v-3*c[k]+d[k])*u*u*u))}


// ---- engine.js ----
/*
 * Earth & Nature — native WebGL 2 renderer, revision 2.
 * Instanced vegetation, height-aware water, micro-normal materials, soft shadows,
 * optional HDR/bloom + FXAA. All textures are generated locally and reused.
 */
const VERT = `#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec2 aUV;
layout(location=4) in vec3 aTarget;
layout(location=5) in vec3 aTargetNormal;
layout(location=6) in vec4 iPosition;
layout(location=7) in vec4 iScale;
layout(location=8) in vec4 iColor;
uniform mat4 uModel, uVP, uLightVP;
uniform mat3 uNormalMatrix;
uniform float uTime, uMorph, uAmplitude;
uniform int uType;
uniform bool uInstanced;
out vec3 vWorld, vNormal, vColor;
out vec2 vUV;
out vec4 vShadow;
void main() {
    vec3 p = mix(aPosition, aTarget, uMorph);
    vec3 n = normalize(mix(aNormal, aTargetNormal, uMorph));
    vec3 tint = vec3(1.);
    if (uInstanced) {
        float cs=cos(iScale.w), sn=sin(iScale.w);
        mat3 turn=mat3(cs,0.,-sn, 0.,1.,0., sn,0.,cs);
        p=turn*(p*iScale.xyz)+vec3(iPosition.x,mix(iPosition.y,iColor.w,uMorph),iPosition.z);
        n=normalize(turn*(n/iScale.xyz));
        tint=iColor.rgb;
    }
    if (uType==1) {
        float phase=p.x*1.85+p.z*.76-uTime*1.25;
        float q=p.x*-.91+p.z*2.9-uTime*1.84;
        p.y+=(sin(phase)*.025+sin(q)*.012)*uAmplitude;
        n=normalize(n+vec3(-cos(phase)*.045+cos(q)*.011,0.,-cos(phase)*.019-cos(q)*.035)*uAmplitude);
    }
    if (uType==15) p.y+=aUV.y*uAmplitude;
    if (uType==5) {
        float wind=sin(uTime*.85+p.x*.63+p.z*.36)+.35*sin(uTime*1.57+p.z);
        p.x+=wind*.035*aUV.y*aUV.y*uAmplitude;
        p.z+=cos(uTime*.72+p.x*.25)*.019*aUV.y*uAmplitude;
    }
    vec4 world=uModel*vec4(p,1.);
    vWorld=world.xyz; vNormal=normalize(uNormalMatrix*n);
    vColor=aColor*tint; vUV=aUV; vShadow=uLightVP*world;
    gl_Position=uVP*world;
}`;

const FRAG = `#version 300 es
precision highp float; precision highp int;
in vec3 vWorld,vNormal,vColor;
in vec2 vUV;
in vec4 vShadow;
uniform sampler2D uShadow,uNoise,uHeight;
uniform vec3 uEye,uLight,uTint,uHeatPos;
uniform float uTime,uAlpha,uAmplitude,uNight,uClip,uCut,uEmissive,uTerrainMorph,uHeat,uFront,uWaterMode;
uniform vec4 uTerrainBounds;
uniform int uType;
uniform bool uShadows,uHasTerrain;
out vec4 outColor;
float noise(vec2 p) { return texture(uNoise,p/32.).r; }
float fine(vec2 p) { return texture(uNoise,p/32.).b; }
float fbm(vec2 p) { return noise(p)*.65+noise(p*2.07+9.)*.24+noise(p*4.13-11.)*.11; }
float heightAt(vec2 xz) {
    vec2 uv=xz/uTerrainBounds.xy+.5;
    vec4 h=texture(uHeight,clamp(uv,vec2(.001),vec2(.999)));
    float a=(h.r*256.+h.g)/257., b=(h.b*256.+h.a)/257.;
    return mix(a,b,uTerrainMorph)*24.-4.;
}
float shadow(vec3 n) {
    if (!uShadows) return 1.;
    vec3 p=vShadow.xyz/vShadow.w*.5+.5;
    if (min(p.x,p.y)<0. || max(p.x,p.y)>1. || p.z>1.) return 1.;
    float bias=max(.00125*(1.-dot(n,uLight)),.00034), s=0.;
    // A fixed kernel avoids temporal noise as the camera moves.
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
        float d=texture(uShadow,p.xy+vec2(float(x),float(y))*1.35/2048.).r;
        s+=p.z-bias>d?.30:1.;
    }
    return s/9.;
}
vec3 surfaceNormal(vec3 n,float h,float strength) {
    vec3 px=dFdx(vWorld),py=dFdy(vWorld);
    vec3 r1=cross(py,n),r2=cross(n,px);
    float det=dot(px,r1);
    vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
    return normalize(abs(det)*n-strength*grad+vec3(0.,.00000001,0.));
}
void main() {
    if(uClip>.5 && vWorld.z>uCut) discard;
    vec3 n=normalize(vNormal); if(!gl_FrontFacing)n=-n;
    vec3 base=vColor*uTint, c=pow(max(base,vec3(.001)),vec3(2.2));
    vec3 view=normalize(uEye-vWorld), halfv=normalize(uLight+view);
    float alpha=uAlpha, em=uEmissive, rough=.82;
    vec3 weights=pow(abs(n),vec3(5.));weights/=max(dot(weights,vec3(1.)),.001);
    float grain=noise(vWorld.yz*5.3)*weights.x+noise(vWorld.xz*5.3)*weights.y+noise(vWorld.xy*5.3)*weights.z;
    float micro=fine(vWorld.yz*21.)*weights.x+fine(vWorld.xz*21.)*weights.y+fine(vWorld.xy*21.)*weights.z;
    float rock=1.-smoothstep(0.02,.10,base.g-base.r);
    bool isSnow=min(base.r,base.b)>.68 && base.b>base.r*.92;
    if(uType==0||uType==2||uType==10) {
        float sediment=sin(vWorld.y*19.+noise(vWorld.xz*1.4)*1.7);
        float joint=pow(1.-abs(sin(vWorld.x*4.1+vWorld.z*1.3+noise(vWorld.xy*2.)*.8)),20.);
        float h=(grain*.085+micro*.012+(uType==2?sediment*.012:0.))*(isSnow?.32:1.);
        n=surfaceNormal(n,h,.48);
        c*=mix(.73,1.2,grain)*mix(.93,1.05,micro);
        if(uType==2) c*=.90+.10*sediment;
        else c*=1.-joint*rock*.11*(1.-abs(n.y));
        if(isSnow) { c=mix(c,pow(vec3(.84,.92,.95),vec3(1.7)),.16);rough=.56; }
    }
    if(uType==8) {
        float ripple=sin(vWorld.x*33.+vWorld.z*4.5+noise(vWorld.xz*2.)*3.5);
        n=surfaceNormal(n,ripple*.010+grain*.015,.6);
        c*=.92+grain*.17+ripple*.038;rough=.92;
    }
    if(uType==5) {c*=.78+grain*.38;rough=.86;}
    float sh=shadow(n), ndl=max(dot(n,uLight),0.);
    vec3 sky=mix(vec3(.17,.235,.29),vec3(.035,.09,.18),uNight);
    vec3 sun=mix(vec3(1.48,1.34,1.16),vec3(.26,.46,.79),uNight);
    float hemisphere=.56+.44*n.y;
    vec3 light=sky*(.66+hemisphere*.66)+sun*ndl*sh;
    vec3 bounce=vec3(.14,.105,.067)*(.5-.5*n.y)*(1.-uNight*.7);
    vec3 rim=vec3(.12,.21,.25)*pow(1.-max(dot(n,view),0.),3.5)*(.6+.4*n.y);
    vec3 result=c*(light+bounce)+rim*.17;
    float gloss=pow(max(dot(n,halfv),0.),mix(120.,8.,rough))*mix(.055,.005,rough)*sh;
    result+=sun*gloss;
    if(uHeat>0. && uType!=3) {
        vec3 d=uHeatPos-vWorld;float att=uHeat/(1.+dot(d,d)*1.9);
        result+=c*vec3(3.,.57,.075)*att*(.3+.7*max(dot(normalize(d),n),0.));
    }
    if(uType==1) {
        vec2 w=vWorld.xz;
        if(uWaterMode>1.5 && uHasTerrain && heightAt(w)<.10)discard;
        float phase=w.x*2.1+w.y*.72-uTime*1.24;
        float small=sin(w.x*8.3+w.y*11.1-uTime*2.9)*.5+sin(w.x*17.2-w.y*6.7+uTime*3.4)*.18;
        n=surfaceNormal(n,small*.009+noise(w*5.2+vec2(uTime*.19,-uTime*.12))*.032,.7);
        float depth=uHasTerrain?max(.008,vWorld.y-heightAt(w)):.6;
        if(uWaterMode>.5) depth=.24+max(0.,.5-abs(vUV.x-.5))*1.4;
        float fr=.035+.70*pow(1.-max(dot(n,view),0.),4.);
        vec3 shallow=vec3(.10,.38,.34),deep=vec3(.009,.085,.14);
        vec3 water=mix(shallow,deep,1.-exp(-depth*.95));
        if(uWaterMode>.5)water=mix(vec3(.09,.33,.27),vec3(.016,.22,.23),smoothstep(.05,.47,min(vUV.x,1.-vUV.x)));
        float caustic=pow(1.-abs(sin(w.x*9.+sin(w.y*8.+uTime)*1.2)),16.)*.018*exp(-depth*1.7);
        vec3 reflectSky=mix(vec3(.24,.40,.49),vec3(.035,.08,.17),uNight);
        float glint=pow(max(dot(n,normalize(uLight+view)),0.),150.)*1.8*sh;
        float nfoam=noise(w*5.+vec2(-uTime*.42,uTime*.1));
        float shore=(1.-smoothstep(.035,.52,depth))*(.30+.7*nfoam);
        float lace=smoothstep(.57,.8,nfoam+sin(depth*19.-uTime*2.7)*.15);
        float foam=shore*lace;
        if(uWaterMode>.5) {
            float edge=1.-smoothstep(.03,.14,min(vUV.x,1.-vUV.x));
            foam=edge*smoothstep(.39,.68,nfoam)*.34;
            foam+=pow(max(0.,sin(vUV.y*124.-uTime*3.9+vUV.x*6.)),24.)*.1;
        }
        result=mix(water,reflectSky,fr)*mix(.86,1.,sh)+sun*glint+caustic;
        result=mix(result,vec3(.76,.88,.83),clamp(foam*.7,0.,.85));
        // River edges are actual narrow meshes, never a full landscape-sized blue sheet.
        alpha*=uWaterMode>.5?smoothstep(0.,.025,min(vUV.x,1.-vUV.x)):1.;
    }
    if(uType==3) {
        if(vUV.y>uFront)discard;
        float hot=smoothstep(.10,.55,uAmplitude);
        vec2 uv=vec2(vUV.x*13.,vUV.y*49.-uTime*.22*(.6+uAmplitude));
        float cells=fbm(uv),cracks=1.-smoothstep(.018,.11,abs(cells-.49));
        float center=pow(max(0.,sin(vUV.x*3.14159)),.55);
        float crust=smoothstep(.4,.72,cells+.14*sin(vUV.y*130.));
        vec3 lava=mix(vec3(.36,.019,.002),vec3(2.6,.44,.018),center*.85+cracks*.15);
        lava=mix(lava,vec3(3.8,1.34,.16),cracks*center*.55);
        lava=mix(lava,vec3(.038,.027,.021),crust*.55*(1.-center*.55));
        result=mix(vec3(.043,.039,.034)*light,lava,hot);em=0.;
        result+=vec3(1.,.14,.005)*hot*.16*sin(uTime*2.+vUV.y*8.);
    }
    if(uType==4) {
        if(vUV.y>uFront-.030*pow(abs(vUV.x*2.-1.),2.))discard;
        float fissure=pow(1.-abs(sin(vUV.y*90.+noise(vUV*24.)*1.8+vUV.x*2.)),11.);
        float vein=noise(vWorld.xz*15.);
        n=surfaceNormal(n,grain*.025+fissure*.018,.42);
        result=pow(base,vec3(2.2))*(light*.70+vec3(.024,.06,.08));
        result=mix(result,vec3(.025,.19,.26),fissure*.70);
        result+=vec3(.022,.085,.115)*pow(1.-max(dot(n,view),0.),3.);
        result+=vec3(.13,.19,.19)*pow(max(dot(n,halfv),0.),70.)*sh;
    }
    if(uType==6) {
        vec2 g=abs(fract(vWorld.xz*.5-.5)-.5)/max(fwidth(vWorld.xz*.5),vec2(.001));
        float line=1.-min(min(g.x,g.y),1.);
        float radial=1.-smoothstep(12.,35.,length(vWorld.xz));
        result=vec3(.022,.075,.087);alpha*=line*.22*radial;
    }
    if(uType==7)result=pow(base,vec3(2.2));
    if(uType==11) {
        bool ocean=base.b>base.r*1.25&&base.b>base.g*1.05;
        if(ocean)result+=vec3(.3,.46,.51)*pow(max(dot(n,halfv),0.),70.)*sh;
        result+=vec3(.009,.045,.095)*pow(1.-max(dot(n,view),0.),3.);
    }
    if(uType==15) {
        result=mix(vec3(.013,.067,.090),vec3(.050,.235,.267),pow(vUV.y,.75));
        result+=vec3(.11,.23,.24)*smoothstep(.98,1.,vUV.y);
        result*=mix(1.,.38,uNight);
    }
    if(uType==12) {
        float crossFade=sin(clamp(vUV.x,0.,1.)*3.14159265);
        float lace=noise(vWorld.xz*9.+vec2(uTime*.12,0.));
        alpha*=pow(crossFade,.55)*smoothstep(.27,.67,lace)*.72;
        result=vec3(.50,.69,.65)*mix(1.,.4,uNight);
    }
    if(uType==13) {
        vec3 q=normalize(vWorld);
        float cloud=fbm(vec2(q.x*10.+uTime*.007,q.z*10.+q.y*8.));
        cloud+=.10*sin(q.y*19.+q.x*8.);
        alpha*=smoothstep(.45,.64,cloud);
        result=vec3(.71,.78,.78)*(sky+sun*max(dot(n,uLight),.0));
    }
    if(uType==14) {
        float limb=pow(1.-abs(dot(n,view)),3.8);
        alpha*=limb;
        result=vec3(.14,.45,.76)*(1.3+max(dot(n,uLight),0.));
    }
    result+=c*em;
    float fog=smoothstep(35.,110.,distance(uEye,vWorld));
    result=mix(result,vec3(.006,.016,.026),fog*.4);
    outColor=vec4(max(result,vec3(0.)),alpha);
}`;
const DEPTH=`#version 300 es
precision highp float; precision highp int;
in vec3 vWorld;in vec2 vUV;uniform float uClip,uCut,uFront;uniform int uType;
out vec4 outColor;
void main(){if(uClip>.5&&vWorld.z>uCut)discard;if(uType==3&&vUV.y>uFront)discard;if(uType==4&&vUV.y>uFront-.030*pow(abs(vUV.x*2.-1.),2.))discard;outColor=vec4(1.);}`;
const PVERT=`#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 aPosition;layout(location=1) in vec4 aColor;layout(location=2) in float aSize;
uniform mat4 uVP;uniform float uPixel;
out vec4 vColor;out float vSeed;
void main(){vec4 p=uVP*vec4(aPosition,1.);gl_Position=p;gl_PointSize=clamp(aSize*uPixel/max(1.,p.w),1.,190.);vColor=aColor;vSeed=fract(float(gl_VertexID)*.61803399);}`;
const PFRAG=`#version 300 es
precision highp float; precision highp int;
in vec4 vColor;in float vSeed;
uniform int uMode;uniform sampler2D uNoise;
out vec4 outColor;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float r=dot(uv,uv);if(r>1.)discard;
 float a=pow(1.-r,2.);vec3 c=pow(max(vColor.rgb,vec3(.001)),vec3(1.4));
 if(uMode==1||uMode==3){
   float n=texture(uNoise,uv*.22+vec2(vSeed,.2)).r;
   float detail=texture(uNoise,uv*.67+vec2(.4,vSeed)).r;
   float edge=1.-smoothstep(.37+n*.25,.88+n*.11,sqrt(r));
   a=edge*(.48+n*.46+detail*.15);
   vec3 sphere=normalize(vec3(uv,sqrt(max(0.,1.-r))));
   float shading=.5+.65*max(0.,dot(sphere,normalize(vec3(-.6,-.8,.5))));
   c*=shading;
 }else if(uMode==2){a=pow(1.-r,1.25);c*=1.1;}
 else {c*=1.65; a=exp(-r*5.)*(1.-smoothstep(.8,1.,r));}
 outColor=vec4(c,a*vColor.a);
}`;
const FULLVERT=`#version 300 es
precision highp float;
out vec2 vUV;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const BLURFRAG=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uImage;uniform vec2 uStep;uniform bool uExtract;out vec4 outColor;
vec3 sampleColor(vec2 uv){vec3 c=texture(uImage,uv).rgb;if(uExtract){float v=max(max(c.r,c.g),c.b);return c*max(0.,v-.96)/(v+.001);}return c;}
void main(){vec3 c=sampleColor(vUV)*.227027;c+=sampleColor(vUV+uStep*1.384615)*.316216;c+=sampleColor(vUV-uStep*1.384615)*.316216;c+=sampleColor(vUV+uStep*3.230769)*.070270;c+=sampleColor(vUV-uStep*3.230769)*.070270;outColor=vec4(c,1.);}`;
const POSTFRAG=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uImage,uBloom,uDepth;uniform vec2 uTexel;uniform bool uBloomOn;uniform float uNight;out vec4 outColor;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec3 c=texture(uImage,vUV).rgb;
 vec3 nw=texture(uImage,vUV+vec2(-1.,-1.)*uTexel).rgb,ne=texture(uImage,vUV+vec2(1.,-1.)*uTexel).rgb;
 vec3 sw=texture(uImage,vUV+vec2(-1.,1.)*uTexel).rgb,se=texture(uImage,vUV+uTexel).rgb;
 float l=lum(c),lo=min(l,min(min(lum(nw),lum(ne)),min(lum(sw),lum(se)))),hi=max(l,max(max(lum(nw),lum(ne)),max(lum(sw),lum(se))));
 vec2 dir=vec2(-(lum(nw)+lum(ne)-lum(sw)-lum(se)),lum(nw)+lum(sw)-lum(ne)-lum(se));
 float reduce=max((lum(nw)+lum(ne)+lum(sw)+lum(se))*.03125,.0078125);
 dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-5.),vec2(5.))*uTexel;
 vec3 aa=.5*(texture(uImage,vUV+dir/6.).rgb+texture(uImage,vUV-dir/6.).rgb);
 c=mix(c,aa,smoothstep(.028,.11,hi-lo)*.72);
 if(uBloomOn)c+=texture(uBloom,vUV).rgb*.22;
 float depth=texture(uDepth,vUV).r;
 if(depth>.99999){float halo=exp(-dot((vUV-vec2(.49,.55))*vec2(1.15,1.),(vUV-vec2(.49,.55))*vec2(1.15,1.))*4.2);c+=mix(vec3(.0017,.0042,.007),vec3(.011,.027,.038),halo)*(1.-uNight*.55)-vec3(.003,.009,.014);}
 vec3 result=pow(aces(max(c,vec3(0.))*.94),vec3(1./2.2));
 float vig=1.-.16*smoothstep(.22,.76,length(vUV-.5));result*=vig;
 float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 outColor=vec4(result+dither/650.,1.);
}`;
class Geometry {
    constructor(){this.p=[];this.n=[];this.c=[];this.uv=[];this.p2=[];this.n2=[];this.indices=[];}
    vertex(p,n,c,uv=[0,0],target=p,n2=n){const i=this.p.length/3;this.p.push(...p);this.n.push(...n);this.c.push(...c);this.uv.push(...uv);this.p2.push(...target);this.n2.push(...n2);return i;}
    triangle(a,b,c,co){const n=norm(cross(vsub(b,a),vsub(c,a))),i=this.p.length/3;this.vertex(a,n,co,[0,0]);this.vertex(b,n,co,[1,0]);this.vertex(c,n,co,[.5,1]);this.indices.push(i,i+1,i+2);}
    quad(a,b,c,d,co){this.triangle(a,b,c,co);this.triangle(a,c,d,co);}
    merge(g,p=[0,0,0],s=[1,1,1],r=0){
        const offset=this.p.length/3,cr=Math.cos(r),sr=Math.sin(r);
        for(let i=0;i<g.p.length/3;i++){
            const tr=a=>{const x=a[i*3]*s[0],y=a[i*3+1]*s[1],z=a[i*3+2]*s[2];return[x*cr+z*sr+p[0],y+p[1],-x*sr+z*cr+p[2]];};
            const tn=a=>norm([a[i*3]*cr/s[0]+a[i*3+2]*sr/s[2],a[i*3+1]/s[1],-a[i*3]*sr/s[0]+a[i*3+2]*cr/s[2]]);
            this.vertex(tr(g.p),tn(g.n),g.c.slice(i*3,i*3+3),g.uv.slice(i*2,i*2+2),tr(g.p2),tn(g.n2));
        }
        for(const i of g.indices)this.indices.push(i+offset);return this;
    }
}
function normalMatrix(m){
    // Inverse transpose: correct lighting even on non-uniformly scaled models.
    const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]],bc=cross(b,c),ca=cross(c,a),ab=cross(a,b),det=dot(a,bc)||1;
    return new Float32Array([...vmul(bc,1/det),...vmul(ca,1/det),...vmul(ab,1/det)]);
}
class Renderer {
    constructor(canvas){
        this.canvas=canvas;
        this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
        if(!this.gl)throw new Error(translate('未能创建 WebGL 2。请开启浏览器硬件加速，并在新版浏览器中打开。'));
        const gl=this.gl;
        this.program=this.programOf(VERT,FRAG);this.depthProgram=this.programOf(VERT,DEPTH);this.pProgram=this.programOf(PVERT,PFRAG);
        this.blurProgram=this.programOf(FULLVERT,BLURFRAG);this.postProgram=this.programOf(FULLVERT,POSTFRAG);
        this.meshes=[];this.particles=[];this.shadowVP=matmul(ortho(-21,21,-21,21,1,95),lookAt([-20,31,17],[0,0,0]));
        this.light=norm([-20,31,17]);this.shadows=true;this.bloom=true;this.night=0;this.clip=0;this.cut=.1;this.time=0;this.dpr=1.5;
        this.heat=0;this.heatPos=[0,5,0];this.terrain=null;this.shadowDirty=true;this.lastShadowKey='';this.drawCalls=0;this.gpuBytes=0;
        this.hdr=!!gl.getExtension('EXT_color_buffer_float');this.frameTargets=null;this.blankVAO=gl.createVertexArray();
        this.makeNoise();this.heightTexture=this.texture(1,1,new Uint8Array([0,0,0,0]));this.createShadow();
        gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    }
    programOf(v,f){
        const g=this.gl,p=g.createProgram();
        for(const [type,src] of [[g.VERTEX_SHADER,v],[g.FRAGMENT_SHADER,f]]){const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));g.attachShader(p,s);g.deleteShader(s);}
        g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));
        const u={};for(let i=0;i<g.getProgramParameter(p,g.ACTIVE_UNIFORMS);i++){const n=g.getActiveUniform(p,i).name;u[n]=g.getUniformLocation(p,n);}return {p,u};
    }
    texture(w,h,data,repeat=false){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,w,h,0,g.RGBA,g.UNSIGNED_BYTE,data);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,repeat?g.REPEAT:g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,repeat?g.REPEAT:g.CLAMP_TO_EDGE);return t;}
    makeNoise(){
        const size=256,rand=random(2619),data=new Uint8Array(size*size*4),layers=[];
        for(const n of [4,8,16,32,64,128])layers.push({n,a:Float32Array.from({length:n*n},()=>rand())});
        const val=(l,x,y)=>{let px=x/size*l.n,py=y/size*l.n,ix=Math.floor(px),iy=Math.floor(py),u=smooth(0,1,fract(px)),v=smooth(0,1,fract(py)),a=l.a,n=l.n;return mix(mix(a[(iy%n)*n+ix%n],a[(iy%n)*n+(ix+1)%n],u),mix(a[((iy+1)%n)*n+ix%n],a[((iy+1)%n)*n+(ix+1)%n],u),v);};
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){let f=0,w=0;layers.forEach((l,k)=>{const a=Math.pow(.54,k);f+=val(l,x,y)*a;w+=a;});const i=(y*size+x)*4;data[i]=clamp((f/w-.5)*1.9+.5)*255;data[i+1]=val(layers[2],x,y)*255;data[i+2]=(val(layers[4],x,y)*.65+val(layers[5],x,y)*.35)*255;data[i+3]=255;}
        this.noiseTexture=this.texture(size,size,data,true);const g=this.gl;g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);
    }
    setTerrain(fn,target,mesh,w=24,d=18){
        const nx=256,nz=192,a=new Uint8Array(nx*nz*4);
        for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=(i/(nx-1)-.5)*w,z=(j/(nz-1)-.5)*d,idx=(j*nx+i)*4;let h=fn(x,z),ht=target?target(x,z):h;let v=Math.round(clamp((h+4)/24)*65535),v2=Math.round(clamp((ht+4)/24)*65535);a.set([v>>8,v&255,v2>>8,v2&255],idx);}
        const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.heightTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,nx,nz,0,g.RGBA,g.UNSIGNED_BYTE,a);
        this.terrain={fn,target,mesh,w,d};this.shadowDirty=true;
    }
    createShadow(){
        const g=this.gl;this.depthTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.depthTexture);g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,2048,2048,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);
        for(const [a,b] of [[g.TEXTURE_MIN_FILTER,g.NEAREST],[g.TEXTURE_MAG_FILTER,g.NEAREST],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,a,b);
        this.shadowFB=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFB);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.depthTexture,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);this.shadowAvailable=g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE;this.shadows=this.shadowAvailable;g.bindFramebuffer(g.FRAMEBUFFER,null);
    }
    createTarget(w,h,depth=false){
        const g=this.gl,fb=g.createFramebuffer(),texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);
        g.texImage2D(g.TEXTURE_2D,0,this.hdr?g.RGBA16F:g.RGBA8,w,h,0,g.RGBA,this.hdr?g.HALF_FLOAT:g.UNSIGNED_BYTE,null);
        for(const [a,b] of [[g.TEXTURE_MIN_FILTER,g.LINEAR],[g.TEXTURE_MAG_FILTER,g.LINEAR],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,a,b);
        g.bindFramebuffer(g.FRAMEBUFFER,fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);
        let depthTex=null;
        if(depth){depthTex=g.createTexture();g.bindTexture(g.TEXTURE_2D,depthTex);g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,w,h,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);for(const [a,b] of [[g.TEXTURE_MIN_FILTER,g.NEAREST],[g.TEXTURE_MAG_FILTER,g.NEAREST],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,a,b);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,depthTex,0);}
        if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE){g.deleteFramebuffer(fb);g.deleteTexture(texture);if(depthTex)g.deleteTexture(depthTex);g.bindFramebuffer(g.FRAMEBUFFER,null);throw new Error(translate('此设备不支持当前渲染缓冲格式。'));}g.bindFramebuffer(g.FRAMEBUFFER,null);return {fb,texture,depthTex,w,h};
    }
    disposeTargets(targets){
        if(!targets)return;const g=this.gl;
        for(const t of Object.values(targets)){g.deleteFramebuffer(t.fb);g.deleteTexture(t.texture);if(t.depthTex)g.deleteTexture(t.depthTex);}
    }
    updateTargets(w,h){
        if(this.frameTargets&&this.frameTargets.scene.w===w&&this.frameTargets.scene.h===h&&this.targetHDR===this.hdr)return;
        this.disposeTargets(this.frameTargets);this.frameTargets=null;
        const build=()=>{
            const t={};try{t.scene=this.createTarget(w,h,true);t.a=this.createTarget(Math.max(1,w>>2),Math.max(1,h>>2));t.b=this.createTarget(Math.max(1,w>>2),Math.max(1,h>>2));return t;}
            catch(e){this.disposeTargets(t);throw e;}
        };
        try{this.frameTargets=build();}
        catch(e){if(!this.hdr)throw e;this.hdr=false;this.frameTargets=build();}
        this.targetHDR=this.hdr;
    }

    mesh(geo,options={}){
        const g=this.gl,vao=g.createVertexArray(),buffers=[];g.bindVertexArray(vao);
        [geo.p,geo.n,geo.c,geo.uv,geo.p2,geo.n2].forEach((arr,i)=>{const b=g.createBuffer(),a=new Float32Array(arr);buffers.push(b);g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,a,g.STATIC_DRAW);this.gpuBytes+=a.byteLength;g.enableVertexAttribArray(i);g.vertexAttribPointer(i,i===3?2:3,g.FLOAT,false,0,0);});
        const ib=g.createBuffer(),ix=new Uint32Array(geo.indices);buffers.push(ib);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib);g.bufferData(g.ELEMENT_ARRAY_BUFFER,ix,g.STATIC_DRAW);this.gpuBytes+=ix.byteLength;g.bindVertexArray(null);
        const m={vao,buffers,count:geo.indices.length,fullCount:geo.indices.length,model:identity(),morph:0,type:0,alpha:1,amplitude:1,tint:[1,1,1],emissive:0,visible:true,cast:true,clip:false,layer:'land',front:1,waterMode:0,instances:0,...options};
        this.meshes.push(m);this.shadowDirty=true;return m;
    }
    instances(geo,instances,options={}){
        const m=this.mesh(geo,options),g=this.gl,data=new Float32Array(instances.length*12);
        instances.forEach((a,i)=>{const p=a.p,s=a.s||[1,1,1],c=a.c||[1,1,1];data.set([...p,a.seed||0,...s,a.r||0,...c,a.y2??p[1]],i*12);});
        const b=g.createBuffer();m.buffers.push(b);g.bindVertexArray(m.vao);g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,data,g.STATIC_DRAW);this.gpuBytes+=data.byteLength;
        for(let i=0;i<3;i++){g.enableVertexAttribArray(6+i);g.vertexAttribPointer(6+i,4,g.FLOAT,false,48,i*16);g.vertexAttribDivisor(6+i,1);}g.bindVertexArray(null);m.instances=instances.length;m.instanced=true;return m;
    }
    points(count,{mode=0,additive=false,layer='motion'}={}){
        const g=this.gl,vao=g.createVertexArray(),buffer=g.createBuffer(),data=new Float32Array(count*8);g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,data,g.DYNAMIC_DRAW);
        [3,4,1].forEach((sz,i)=>{g.enableVertexAttribArray(i);g.vertexAttribPointer(i,sz,g.FLOAT,false,32,[0,12,28][i]);});g.bindVertexArray(null);
        const p={vao,buffer,data,count,mode,additive,layer,visible:true};this.particles.push(p);this.gpuBytes+=data.byteLength;return p;
    }
    updatePoints(p){const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,p.buffer);g.bufferSubData(g.ARRAY_BUFFER,0,p.data);}
    clearScene(){const g=this.gl;for(const m of this.meshes){g.deleteVertexArray(m.vao);for(const b of m.buffers)g.deleteBuffer(b);}for(const p of this.particles){g.deleteVertexArray(p.vao);g.deleteBuffer(p.buffer);}this.meshes=[];this.particles=[];this.terrain=null;this.heat=0;this.gpuBytes=0;this.shadowDirty=true;}
    resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight,d=Math.min(this.dpr,2.0,2560/Math.max(w,h)),pw=Math.max(1,Math.round(w*d)),ph=Math.max(1,Math.round(h*d));if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}this.updateTargets(pw,ph);return [w,h];}
    bindTexture(unit,tex){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,tex);}
    uniforms(pr,vp,eye){
        const g=this.gl,u=pr.u;g.useProgram(pr.p);g.uniformMatrix4fv(u.uVP,false,vp);g.uniformMatrix4fv(u.uLightVP,false,this.shadowVP);g.uniform1f(u.uTime,this.time);g.uniform3fv(u.uEye,eye);g.uniform3fv(u.uLight,this.light);g.uniform1f(u.uNight,this.night);g.uniform1i(u.uShadows,this.shadows&&this.shadowAvailable);g.uniform1i(u.uShadow,0);g.uniform1i(u.uNoise,1);g.uniform1i(u.uHeight,2);g.uniform1f(u.uCut,this.cut);g.uniform1i(u.uHasTerrain,!!this.terrain);g.uniform1f(u.uTerrainMorph,this.terrain?.mesh?.morph||0);g.uniform4fv(u.uTerrainBounds,[this.terrain?.w||24,this.terrain?.d||18,0,0]);g.uniform1f(u.uHeat,this.heat);g.uniform3fv(u.uHeatPos,this.heatPos);
    }
    drawMesh(m,pr){
        const g=this.gl,u=pr.u;g.bindVertexArray(m.vao);g.uniformMatrix4fv(u.uModel,false,m.model);g.uniformMatrix3fv(u.uNormalMatrix,false,normalMatrix(m.model));g.uniform1f(u.uMorph,m.morph);g.uniform1f(u.uAmplitude,m.amplitude);g.uniform1i(u.uType,m.type);g.uniform1f(u.uAlpha,m.alpha);g.uniform3fv(u.uTint,m.tint);g.uniform1f(u.uEmissive,m.emissive);g.uniform1f(u.uClip,m.clip?this.clip:0);g.uniform1i(u.uInstanced,!!m.instanced);g.uniform1f(u.uFront,m.front);g.uniform1f(u.uWaterMode,m.waterMode);
        if(m.instanced)g.drawElementsInstanced(g.TRIANGLES,m.count,g.UNSIGNED_INT,0,m.instances);else g.drawElements(g.TRIANGLES,m.count,g.UNSIGNED_INT,0);this.drawCalls++;
    }
    postprocess(){
        const g=this.gl,{scene,a,b}=this.frameTargets;g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.depthMask(false);g.bindVertexArray(this.blankVAO);
        if(this.bloom){let pr=this.blurProgram;g.useProgram(pr.p);g.uniform1i(pr.u.uImage,0);g.bindFramebuffer(g.FRAMEBUFFER,a.fb);g.viewport(0,0,a.w,a.h);this.bindTexture(0,scene.texture);g.uniform2fv(pr.u.uStep,[1/scene.w,1/scene.h]);g.uniform1i(pr.u.uExtract,true);g.drawArrays(g.TRIANGLES,0,3);
            g.bindFramebuffer(g.FRAMEBUFFER,b.fb);this.bindTexture(0,a.texture);g.uniform2fv(pr.u.uStep,[1/a.w,0]);g.uniform1i(pr.u.uExtract,false);g.drawArrays(g.TRIANGLES,0,3);
            g.bindFramebuffer(g.FRAMEBUFFER,a.fb);this.bindTexture(0,b.texture);g.uniform2fv(pr.u.uStep,[0,1/a.h]);g.drawArrays(g.TRIANGLES,0,3);}
        g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,scene.w,scene.h);const pr=this.postProgram;g.useProgram(pr.p);this.bindTexture(0,scene.texture);this.bindTexture(1,a.texture);this.bindTexture(2,scene.depthTex);g.uniform1i(pr.u.uImage,0);g.uniform1i(pr.u.uBloom,1);g.uniform1i(pr.u.uDepth,2);g.uniform1i(pr.u.uBloomOn,this.bloom);g.uniform1f(pr.u.uNight,this.night);g.uniform2fv(pr.u.uTexel,[1/scene.w,1/scene.h]);g.drawArrays(g.TRIANGLES,0,3);this.drawCalls+=this.bloom?4:1;g.depthMask(true);g.enable(g.DEPTH_TEST);
    }
    render(vp,eye){
        const g=this.gl;this.triangles=0;this.drawCalls=0;g.disable(g.BLEND);g.depthMask(true);g.enable(g.DEPTH_TEST);
        // Cache static shadow maps. Animated terrain/model transforms invalidate them;
        // wind-only leaf motion deliberately does not force a full shadow pass.
        const casters=this.meshes.filter(m=>m.visible&&m.cast&&m.alpha>.95&&m.type!==6);
        const key=this.clip+'|'+this.cut+'|'+casters.map(m=>[m.morph.toFixed(4),m.model[12].toFixed(3),m.model[13].toFixed(3),m.model[14].toFixed(3),m.model[0].toFixed(3),m.model[1].toFixed(3),m.model[2].toFixed(3),m.model[5].toFixed(3),m.model[10].toFixed(3),m.front.toFixed(4),m.count].join(',')).join(';');
        if(this.shadows&&this.shadowAvailable&&(this.shadowDirty||key!==this.lastShadowKey)){
            g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFB);g.viewport(0,0,2048,2048);g.clear(g.DEPTH_BUFFER_BIT);this.uniforms(this.depthProgram,this.shadowVP,eye);for(const m of casters)this.drawMesh(m,this.depthProgram);this.shadowDirty=false;this.lastShadowKey=key;
        }
        const target=this.frameTargets.scene;g.bindFramebuffer(g.FRAMEBUFFER,target.fb);g.viewport(0,0,target.w,target.h);g.clearColor(.003,.009,.014,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
        this.uniforms(this.program,vp,eye);this.bindTexture(0,this.depthTexture);this.bindTexture(1,this.noiseTexture);this.bindTexture(2,this.heightTexture);
        for(const m of this.meshes)if(m.visible&&m.alpha>=.999){this.drawMesh(m,this.program);this.triangles+=m.count/3*(m.instanced?m.instances:1);}
        g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(false);
        const transparent=this.meshes.filter(m=>m.visible&&m.alpha<.999&&m.alpha>.001).sort((a,b)=>Math.hypot(b.model[12]-eye[0],b.model[13]-eye[1],b.model[14]-eye[2])-Math.hypot(a.model[12]-eye[0],a.model[13]-eye[1],a.model[14]-eye[2]));
        for(const m of transparent){this.drawMesh(m,this.program);this.triangles+=m.count/3*(m.instanced?m.instances:1);}
        const pr=this.pProgram;g.useProgram(pr.p);g.uniformMatrix4fv(pr.u.uVP,false,vp);g.uniform1f(pr.u.uPixel,this.canvas.height*1.5);g.uniform1i(pr.u.uNoise,1);this.bindTexture(1,this.noiseTexture);
        for(const p of this.particles)if(p.visible){g.blendFunc(g.SRC_ALPHA,p.additive?g.ONE:g.ONE_MINUS_SRC_ALPHA);g.uniform1i(pr.u.uMode,p.mode);g.bindVertexArray(p.vao);g.drawArrays(g.POINTS,0,p.count);this.drawCalls++;}
        g.disable(g.BLEND);g.depthMask(true);this.postprocess();g.bindVertexArray(null);
    }
}
class OrbitCamera {
    constructor(canvas){this.canvas=canvas;this.az=.60;this.el=.60;this.distance=37;this.target=[0,1,0];this.want={az:this.az,el:this.el,distance:this.distance,target:[...this.target]};this.pointers=new Map();this.onInput=()=>{};this.bind();}
    bind(){
        const c=this.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());
        c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});this.onInput();});
        c.addEventListener('pointermove',e=>{
            const old=this.pointers.get(e.pointerId);if(!old)return;const pts=[...this.pointers.entries()];
            if(pts.length===2){const other=pts.find(([id])=>id!==e.pointerId)[1],d0=Math.hypot(old.x-other.x,old.y-other.y),d1=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(d1>2)this.want.distance=clamp(this.want.distance*d0/d1,10,72);}
            else if(old.button===2||e.shiftKey){const fac=this.want.distance/650,dx=(e.clientX-old.x)*fac,dy=(e.clientY-old.y)*fac;this.want.target[0]-=dx*Math.cos(this.az);this.want.target[2]+=dx*Math.sin(this.az);this.want.target[1]+=dy;}
            else {this.want.az-=(e.clientX-old.x)*.0047;this.want.el=clamp(this.want.el+(e.clientY-old.y)*.0035,.12,1.47);}
            this.pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
        });
        for(const ev of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(ev,e=>this.pointers.delete(e.pointerId));
        c.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaMode===1?e.deltaY*16:e.deltaY;this.want.distance=clamp(this.want.distance*Math.exp(clamp(delta,-160,160)*.001),10,72);this.onInput();},{passive:false});
    }
    preset(az,el,distance,target=[0,1,0]){az=this.az+Math.atan2(Math.sin(az-this.az),Math.cos(az-this.az));this.want={az,el,distance,target:[...target]};}
    update(dt,aspect){
        const s=1-Math.exp(-dt*(this.pointers.size?11:5.5));this.az=mix(this.az,this.want.az,s);this.el=mix(this.el,this.want.el,s);this.distance=mix(this.distance,this.want.distance,s);this.target=this.target.map((v,i)=>mix(v,this.want.target[i],s));
        const r=this.distance,ce=Math.cos(this.el);this.eye=[this.target[0]+r*ce*Math.sin(this.az),this.target[1]+r*Math.sin(this.el),this.target[2]+r*ce*Math.cos(this.az)];this.vp=matmul(perspective(.67,aspect,.12,180),lookAt(this.eye,this.target));return this.vp;
    }
}


// ---- geometry.js ----
/* Reusable, locally generated geometry. No downloaded meshes or image billboards. */
function boxGeo(w,h,d,c){const g=new Geometry(),x=w/2,y=h/2,z=d/2;g.quad([-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],c);g.quad([x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],c);g.quad([-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],c);g.quad([-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],c);g.quad([x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z],c);g.quad([-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z],c);return g;}
function recomputeNormals(g){
    const n=new Float32Array(g.p.length),n2=new Float32Array(g.p2.length);
    const calc=(p,out)=>{for(let k=0;k<g.indices.length;k+=3){const ia=g.indices[k]*3,ib=g.indices[k+1]*3,ic=g.indices[k+2]*3,ab=[p[ib]-p[ia],p[ib+1]-p[ia+1],p[ib+2]-p[ia+2]],ac=[p[ic]-p[ia],p[ic+1]-p[ia+1],p[ic+2]-p[ia+2]],v=cross(ab,ac);for(const i of [ia,ib,ic])for(let a=0;a<3;a++)out[i+a]+=v[a];}for(let i=0;i<out.length;i+=3){const d=Math.hypot(out[i],out[i+1],out[i+2])||1;out[i]/=d;out[i+1]/=d;out[i+2]/=d;}};
    calc(g.p,n);calc(g.p2,n2);g.n=Array.from(n);g.n2=Array.from(n2);return g;
}
function sphereGeo(radius,c,n=32,m=22,rough=0,part=TAU){const g=new Geometry();for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const a=i/n*part,b=j/m*Math.PI,no=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)],r=radius*(1+rough*(noise(no[0]*4+no[1],no[2]*5+no[1])-.5));g.vertex(vmul(no,r),no,c,[i/n,j/m]);}for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;g.indices.push(a,a+1,b,b,a+1,b+1);}return rough?recomputeNormals(g):g;}
function coneGeo(bottom,top,h,c,n=16,rough=0){const g=new Geometry();for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU,r1=bottom*(1+rough*Math.sin(i*5.7)),r2=bottom*(1+rough*Math.sin((i+1)*5.7)),p=[r1*Math.cos(a),0,r1*Math.sin(a)],q=[r2*Math.cos(b),0,r2*Math.sin(b)],u=[top*Math.cos(b),h,top*Math.sin(b)],v=[top*Math.cos(a),h,top*Math.sin(a)];g.quad(p,v,u,q,cmix(c,vmul(c,.82),i%2*.2));g.triangle([0,0,0],p,q,c);g.triangle([0,h,0],u,v,c);}return g;}
function tubeGeo(points,radius,c,segments=140,sides=10){const g=new Geometry();for(let j=0;j<=segments;j++){const t=j/segments,p=catmull(points,t),next=catmull(points,clamp(t+.001)),prev=catmull(points,clamp(t-.001)),tan=norm(vsub(next,prev)),ref=Math.abs(tan[1])>.94?[1,0,0]:[0,1,0],a=norm(cross(tan,ref)),b=cross(tan,a),r=typeof radius==='function'?radius(t):radius;for(let i=0;i<=sides;i++){const ang=i/sides*TAU,n=vadd(vmul(a,Math.cos(ang)),vmul(b,Math.sin(ang)));g.vertex(vadd(p,vmul(n,r)),n,c,[i/sides,t]);}}for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;g.indices.push(a,b,a+1,a+1,b,b+1);}return g;}
function ribbonGeo(points,width,c,segments=220,across=8){
    const g=new Geometry();for(let j=0;j<=segments;j++){const t=j/segments,p=catmull(points,t),p0=catmull(points,clamp(t-.002)),p1=catmull(points,clamp(t+.002)),dir=norm([p1[0]-p0[0],0,p1[2]-p0[2]]),side=[-dir[2],0,dir[0]],w=typeof width==='function'?width(t):width;
        for(let i=0;i<=across;i++){const u=i/across,off=(u-.5)*w;g.vertex(vadd(p,vmul(side,off)),[0,1,0],c,[u,t]);}}
    for(let j=0;j<segments;j++)for(let i=0;i<across;i++){const a=j*(across+1)+i,b=a+across+1;g.indices.push(a,a+1,b,b,a+1,b+1);}return recomputeNormals(g);
}
function surfaceRibbonGeo(points,width,c,fn,offset=.035,segments=240,across=8){
    const g=ribbonGeo(points,width,c,segments,across);
    for(let i=0;i<g.p.length/3;i++){const x=g.p[i*3],z=g.p[i*3+2],u=g.uv[i*2];g.p[i*3+1]=fn(x,z)+offset+.015*Math.sin(u*Math.PI);g.p2[i*3+1]=g.p[i*3+1];}
    return recomputeNormals(g);
}
function ringGeo(cx,y,cz,r0,r1,c,n=160){const g=new Geometry();for(let i=0;i<=n;i++)for(let j=0;j<2;j++){const a=i/n*TAU,r=j?r1:r0;g.vertex([cx+Math.cos(a)*r,y,cz+Math.sin(a)*r],[0,1,0],c,[j,i/n]);}for(let i=0;i<n;i++){const a=i*2;g.indices.push(a,a+1,a+2,a+1,a+3,a+2);}return g;}
function heightGeo(fn,col,{w=24,d=18,n=272,m=204,target=null}={}){
    // Cache one bordered height grid instead of evaluating six times per vertex.
    const g=new Geometry(),stride=n+3,a=new Float32Array((n+3)*(m+3)),b=target?new Float32Array(a.length):a,dx=w/n,dz=d/m;
    for(let j=-1;j<=m+1;j++)for(let i=-1;i<=n+1;i++){const x=(i/n-.5)*w,z=(j/m-.5)*d,k=(j+1)*stride+i+1;a[k]=fn(x,z);if(target)b[k]=target(x,z);}
    for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const x=(i/n-.5)*w,z=(j/m-.5)*d,k=(j+1)*stride+i+1,no=norm([(a[k-1]-a[k+1])/(2*dx),1,(a[k-stride]-a[k+stride])/(2*dz)]),nt=target?norm([(b[k-1]-b[k+1])/(2*dx),1,(b[k-stride]-b[k+stride])/(2*dz)]):no;g.vertex([x,a[k],z],no,col(x,z,b[k],nt),[i/n,j/m],[x,b[k],z],nt);}
    for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;g.indices.push(a,b,a+1,b,b+1,a+1);}return g;
}
const rockPalette=['343b3c','525850','786b58','95866e','686953','aa9675','81775e','afa183','6f7668','97947a','bbb08e','8b8975'].map(color);
function geologicalLevels(){const a=[-3],r=random(735);while(a[a.length-1]<15)a.push(a[a.length-1]+.14+r()*.24);return a;}
const GEO_LEVELS=geologicalLevels();
function strataGeo(fn,{w=24,d=18,n=148,bottom=-3,fold=0}={}){
    const g=new Geometry(),levels=GEO_LEVELS;
    const edge=(side,t)=>side===0?[-w/2+t*w,d/2]:side===1?[w/2,d/2-t*d]:side===2?[w/2-t*w,-d/2]:[-w/2,-d/2+t*d];
    for(let side=0;side<4;side++)for(let i=0;i<n;i++){
        const a=edge(side,i/n),b=edge(side,(i+1)/n),ha=fn(...a),hb=fn(...b);
        for(let k=0;k<levels.length-1;k++){
            const f=p=>fold*(Math.sin(p[0]*.7)+.3*Math.sin(p[0]*1.7+p[1]))*.55+.038*Math.sin(p[0]*.58+p[1]*.7+k*.13);
            const al=clamp(levels[k]+f(a),bottom,ha),bl=clamp(levels[k]+f(b),bottom,hb),au=clamp(levels[k+1]+f(a),bottom,ha),bu=clamp(levels[k+1]+f(b),bottom,hb);
            if(au-al<.0001&&bu-bl<.0001)continue;
            const base=rockPalette[Math.floor(k*.63)%rockPalette.length],c=cmix(base,rockPalette[(k+3)%rockPalette.length],.18),dark=.92+.09*noise(i*.38,k*.43+side);
            g.quad([a[0],al,a[1]],[b[0],bl,b[1]],[b[0],bu,b[1]],[a[0],au,a[1]],vmul(c,dark));
        }
    }return g;
}
const greens=['596b40','6c7b47','324e3c','718947','929963'].map(color),stone=color('96978b'),snow=color('e4edf0'),sand=color('c9ac76');
function alpineColor(x,z,h,n){
    const q=fbm(x*.61,z*.61),s=1-n[1],meadow=cmix(greens[0],greens[3],smooth(.24,.74,q));
    let c=cmix(meadow,cmix(color('807f73'),color('b3b0a0'),q),smooth(.14,.67,s));
    c=cmix(c,color('888c84'),smooth(3.8,6.3,h+q));
    const snowline=5.0+(noise(x*.8,z*.8)-.5)*.85;
    c=cmix(c,snow,smooth(snowline,snowline+.66,h+q*.9-s*1.5));return vmul(c,.97+noise(x*8,z*8)*.07);
}
function greenColor(x,z,h,n){const q=fbm(x*.71,z*.71);let c=cmix(greens[0],greens[3],smooth(.2,.76,q));return cmix(c,cmix(color('868779'),color('b2a993'),q),smooth(.12,.60,1-n[1]));}
function desertColor(x,z,h,n){return cmix(color('ac8858'),color('dec296'),.27+fbm(x*.39,z*.39)*.62);}
function volcanicColor(x,z,h,n){const r=Math.hypot(x,z),ash=fbm(x*.54,z*.54),scar=Math.abs(Math.sin(Math.atan2(z,x)*9+r*.9));let c=cmix(color('424443'),color('7f7362'),ash*.8);c=cmix(c,color('393b3a'),(1-scar)*.3);if(r>4.8)c=cmix(c,greenColor(x,z,h,n),smooth(4.8,8,r)*.94);return c;}
function addBase(R,fn,opts={}){
    const top=R.mesh(heightGeo(fn,opts.col||alpineColor,opts),{layer:'land',type:opts.material||0,clip:!!opts.clip});
    const sg=strataGeo(fn,opts);
    if(opts.target)for(let i=0;i<sg.p.length/3;i++){const x=sg.p[i*3],y=sg.p[i*3+1],z=sg.p[i*3+2],old=fn(x,z),next=opts.target(x,z);sg.p2[i*3+1]=y>=old-.05?next:Math.min(y,next);}
    const sides=R.mesh(sg,{type:2,layer:'strata',clip:!!opts.clip});
    if(opts.target)Object.defineProperty(sides,'morph',{get:()=>top.morph,set:()=>{},configurable:true});
    R.mesh(boxGeo((opts.w||24)+.02,.16,(opts.d||18)+.02,color('263a3c')),{model:transform([0,-3.08,0]),layer:'strata'});
    R.mesh(heightGeo(()=>-3.21,()=>color('224551'),{w:70,d:70,n:2,m:2}),{type:6,alpha:.62,cast:false,layer:'grid'});
    R.setTerrain(fn,opts.target,top,opts.w||24,opts.d||18);return {top,sides};
}
function pineGeo(seed=1){
    const rnd=random(seed),g=new Geometry(),trunk=coneGeo(.027,.009,1.06,color('6e6650'),7);
    g.merge(trunk);
    const sides=13,layers=14,branch=new Geometry(),base=color(seed%2?'537258':'426853');
    for(let j=0;j<=layers;j++){
        const t=j/layers,y=.12+t*1.14,outer=(j%2===0?1:.63),r=(.28*(1-t)+.012)*outer;
        for(let i=0;i<=sides;i++){
            const a=i/sides*TAU,rr=r*(1+.22*Math.sin(a*5+seed+j*.71)+.08*Math.sin(a*11+j));
            const p=[Math.cos(a)*rr+Math.sin(t*2+seed)*.018,y+Math.sin(a*5+j)*.024*(1-t),Math.sin(a)*rr];
            const c=cmix(base,color('869773'),.10+t*.19+rnd()*.09);
            branch.vertex(p,norm([Math.cos(a),.32,Math.sin(a)]),c,[i/sides,t]);
        }
    }
    for(let j=0;j<layers;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;branch.indices.push(a,b,a+1,a+1,b,b+1);}
    g.merge(recomputeNormals(branch));for(let i=0;i<g.uv.length/2;i++)g.uv[i*2+1]=clamp(g.p[i*3+1]/1.26);return g;
}
function broadleafGeo(seed=3){const g=new Geometry(),r=random(seed),base=color('667b4d');g.merge(coneGeo(.039,.015,.65,color('696247'),7));for(let i=0;i<6;i++){const a=i*2.4,s=.15+r()*.11;g.merge(sphereGeo(s,cmix(base,color('9ca165'),r()*.35),10,7,.5),[Math.cos(a)*.16,.57+r()*.27,Math.sin(a)*.16],[1,1.1,1]);}for(let i=0;i<g.uv.length/2;i++)g.uv[i*2+1]=clamp(g.p[i*3+1]);return g;}
function groupHandle(meshes){return {meshes,get visible(){return meshes[0]?.visible??false;},set visible(v){for(const m of meshes)m.visible=v;}};}
function attachToTerrain(m,R){if(R.terrain?.target){const anchor=R.terrain.mesh;Object.defineProperty(m,'morph',{get:()=>anchor.morph,set:()=>{},configurable:true});}return m;}
function addForest(R,fn,{count=500,seed=8,filter=null,w=23,d=17,scale=1,mixed=true}={}){
    const rnd=random(seed),sets=Array.from({length:4},()=>[]),terrain=R.terrain;
    // Irregular patches and clearings, not a uniform scatter of identical cones.
    count=Math.round(count*.82);
    for(let i=0,k=0;i<count*24&&k<count;i++){
        const x=(rnd()-.5)*w,z=(rnd()-.5)*d,h=fn(x,z),slope=Math.hypot(fn(x+.11,z)-h,fn(x,z+.11)-h),patch=noise(x*.33+4,z*.33-2);
        if(h<.22||h>4.5||slope>.17||patch<.31||(filter&&!filter(x,z,h)))continue;
        const s=(.34+rnd()*.66)*scale*(.74+patch*.36),type=mixed&&h<1.55&&rnd()>.7?3:Math.floor(rnd()*3),shade=.84+rnd()*.27;
        const h0=terrain?terrain.fn(x,z):h,h1=terrain?.target?terrain.target(x,z):h;
        sets[type].push({p:[x,h0-.028,z],y2:h1-.028,s:[s,s*(.82+rnd()*.34),s],r:rnd()*TAU,c:[shade,shade*(.98+rnd()*.06),shade],seed:rnd()});k++;
    }
    const meshes=sets.map((instances,i)=>attachToTerrain(R.instances(i===3?broadleafGeo(seed+3):pineGeo(seed+i*11),instances,{type:5,layer:'vegetation',clip:true}),R));return groupHandle(meshes);
}
function rockGeo(seed=1){
    const g=sphereGeo(1,color('929083'),14,10,.42),r=random(seed),sx=.7+r()*.5,sz=.65+r()*.6;
    for(let i=0;i<g.p.length/3;i++){
        const x=g.p[i*3],y=g.p[i*3+1],z=g.p[i*3+2];
        const yy=Math.min(y,.68+x*.23-z*.12),xx=Math.min(x,.81-y*.18),zz=Math.max(z,-.82+x*.16);
        g.p[i*3]=g.p2[i*3]=xx*sx;g.p[i*3+1]=g.p2[i*3+1]=yy*.72;g.p[i*3+2]=g.p2[i*3+2]=zz*sz;
        const shade=.84+noise(x*4+seed,z*4+y)*.24;for(let a=0;a<3;a++)g.c[i*3+a]*=shade;
    }return recomputeNormals(g);
}
function addBoulders(R,fn,{count=170,filter=null,seed=19,scale=1}={}){
    const rnd=random(seed),sets=[[],[],[]],terrain=R.terrain;
    for(let i=0;i<count;i++){
        const x=(rnd()-.5)*23,z=(rnd()-.5)*17,h=fn(x,z);if(h<.10||(filter&&!filter(x,z,h)))continue;
        const s=(.045+Math.pow(rnd(),2)*.17)*scale,shade=.73+rnd()*.3,h0=terrain?terrain.fn(x,z):h,h1=terrain?.target?terrain.target(x,z):h;
        sets[i%3].push({p:[x,h0-.01,z],y2:h1-.01,s:[s*(1+rnd()*.8),s,s],r:rnd()*TAU,c:[shade,shade,shade*.98]});
    }
    return groupHandle(sets.map((instances,i)=>attachToTerrain(R.instances(rockGeo(seed+i*7),instances,{layer:'land',type:2,clip:true}),R)));
}
function marker(label,en,p,desc,tag=translate('观察点'),color0=null){return {label,en,p,desc,tag,color:color0};}
function pointSet(ps,i,p,c,alpha,size){ps.data.set([...p,...c,alpha,size],i*8);}
function addAmbientClouds(R,seed=12){
    const rnd=random(seed),ps=R.points(52,{mode:3,layer:'clouds'}),data=[];
    for(let i=0;i<52;i++){const a=rnd()*TAU,r=10+rnd()*5;data.push([Math.cos(a)*r,.65+rnd()*1.8,Math.sin(a)*r,rnd()*1.1+1.4,rnd()*TAU]);}
    return t=>{for(let i=0;i<data.length;i++){const [x,y,z,s,a]=data[i];pointSet(ps,i,[x+Math.sin(t*.021+a)*.6,y+.1*Math.sin(t*.034+a),z],[.57,.67,.68],.035,s);}R.updatePoints(ps);};
}
function flowParticles(R,points,{count=90,speed=.065,size=.075,co=color('b4f7ee'),spread=.12,layer='motion',height=null}={}){
    const ps=R.points(count,{additive:true,layer}),rnd=random(782),offset=Array.from({length:count},()=>[(rnd()-.5)*spread,rnd()]);
    return(t,intensity=1)=>{for(let i=0;i<count;i++){const u=fract(i/count+t*speed),p=catmull(points,u);if(height)p[1]=height(p[0]+offset[i][0],p[2],u);pointSet(ps,i,[p[0]+offset[i][0],p[1]+.045,p[2]],co,.26*intensity*Math.sin(u*Math.PI),size*(.55+offset[i][1]*.7));}R.updatePoints(ps);};
}
function cutFaceGeo(fn,{z=.16,w=24,n=190,fold=0}={}){
    const g=new Geometry(),levels=GEO_LEVELS;
    for(let i=0;i<n;i++){const x=(i/n-.5)*w,x1=((i+1)/n-.5)*w;for(let j=0;j<levels.length-1;j++){
        const off=x=>fold*Math.sin(x*.7)*.5+.045*Math.sin(x*.47+j*.2),lo=levels[j],hi=levels[j+1],a=Math.min(fn(x,z),hi+off(x)),b=Math.min(fn(x1,z),hi+off(x1));
        if(a<lo&&b<lo)continue;const c=cmix(rockPalette[Math.floor(j*.63)%12],rockPalette[(j+3)%12],.16);
        g.quad([x,Math.min(lo+off(x),a),z],[x1,Math.min(lo+off(x1),b),z],[x1,b,z],[x,a,z],c);
    }}return g;
}
// Angular, domain-warped relief: large ridges, secondary gullies, then scree scale.
function mountainRelief(x,z){
    const wx=x+(noise(x*.36+12,z*.36)-.5)*1.35,wz=z+(noise(x*.36-8,z*.36+9)-.5)*1.35;
    const r=1-Math.abs(noise(wx*.60,wz*.60)*2-1),r2=1-Math.abs(noise(wx*1.31+8,wz*1.31-5)*2-1),r3=1-Math.abs(noise(wx*2.87-3,wz*2.87+7)*2-1);
    return Math.pow(r,2)*.55+Math.pow(r2,2)*.27+Math.pow(r3,2)*.13+noise(x*6,z*6)*.05;
}

// Close the visible edges of the ocean cutaway: the water is a volume rather
// than a blue sheet hovering above the seabed. Shape follows the terrain morph.
function addWaterEdge(R,level){
    const terrain=R.terrain;if(!terrain)return null;
    const {fn,target,w,d}=terrain,g=new Geometry(),steps=230;
    const edge=(side,t)=>side===0?[-w/2+t*w,d/2]:side===1?[w/2,d/2-t*d]:side===2?[w/2-t*w,-d/2]:[-w/2,-d/2+t*d];
    const normals=[[0,0,1],[1,0,0],[0,0,-1],[-1,0,0]];
    for(let side=0;side<4;side++)for(let j=0;j<steps;j++){
        const a=edge(side,j/steps),b=edge(side,(j+1)/steps),h=[fn(...a),fn(...b)],h2=target?[target(...a),target(...b)]:h;
        if(Math.min(...h,...h2)>=level)continue;
        const first=g.p.length/3;
        for(const [p,k,top] of [[a,0,0],[b,1,0],[b,1,1],[a,0,1]]){
            g.vertex([p[0],top?level:Math.min(level,h[k]),p[1]],normals[side],color('417a88'),[k,top],[p[0],top?level:Math.min(level,h2[k]),p[1]]);
        }
        g.indices.push(first,first+1,first+2,first,first+2,first+3);
    }
    return attachToTerrain(R.mesh(g,{type:15,alpha:.88,amplitude:0,cast:false,layer:'water'}),R);
}


// ---- content.js ----
/* Teaching content is deliberately separated from rendering and interaction. */
const CHAPTERS=[
 {id:'atlas',title:translate('地表形态总览'),short:translate('地貌总览'),en:'A LIVING PLANET',group:translate('从这里出发'),icon:'mountain',accent:'#73d5d6',subtitle:translate('山海之间，看见塑造地球的力量。'),intro:translate('不是静止的风景，而是一颗持续变化的星球。选择一个地貌，走进它的形成过程。'),params:[translate('内力活动'),translate('水流动感')],values:[.72,.65],variants:[],stages:[translate('内力抬升'),translate('风化与侵蚀'),translate('搬运'),translate('沉积'),translate('新的地表')],cut:false,action:translate('开始地貌导览'),facts:[translate('内力作用与外力作用同时影响地表，并非彼此割裂。'),translate('这里把不同环境组合成地貌索引，不代表一个真实地区。'),translate('点击三维标签，可以进入独立的地貌实验。')],question:translate('山峰升高与河谷加深，可以同时发生吗？'),answer:translate('可以。构造抬升与流水侵蚀可以同时进行，它们的相对速率会影响地表起伏。'),quiz:[translate('哪一组都属于外力作用？'),[translate('褶皱、火山喷发'),translate('流水侵蚀、风力堆积'),translate('地壳抬升、海浪侵蚀')],1],source:'landforms'},
 {id:'volcano',title:translate('火山，从地下到地表'),short:translate('火山喷发'),en:'THE EARTH BREATHES FIRE',group:translate('内力塑造'),icon:'volcano',accent:'#ffac7b',subtitle:translate('打开地球的一道窗口，观察岩浆如何抵达地表。'),intro:translate('气体膨胀、岩浆流动、火山灰升腾。一次完整的喷发过程，可以在这里暂停和重放。'),params:[translate('气体驱动强度'),translate('岩浆相对黏度')],values:[.74,.45],variants:[],stages:[translate('岩浆积聚'),translate('活动增强'),translate('喷发'),translate('熔岩流淌'),translate('冷却成岩')],cut:true,action:translate('触发一次喷发'),facts:[translate('岩浆位于地下；到达地表后称为熔岩。'),translate('气体含量、温度、成分和黏度等因素共同影响喷发行为。'),translate('高黏度不等于必然爆炸性喷发；参数仅演示部分关系。')],question:translate('火山灰是“烧完以后留下的灰”吗？'),answer:translate('不是。火山灰主要是细小的岩石、矿物及火山玻璃碎屑。模型中的灰柱也不是普通烟囱的烟。'),quiz:[translate('打开内部剖面，你会看到什么关系？'),[translate('地表海水直接变成熔岩'),translate('岩浆可沿通道上升到地表'),translate('整个地幔都是液态岩浆')],1],source:'volcano'},
 {id:'tectonics',title:translate('让岩层弯曲的力量'),short:translate('板块与构造'),en:'A PLANET IN MOTION',group:translate('内力塑造'),icon:'layers',accent:'#e7bc83',subtitle:translate('碰撞、张裂与错动，写在岩层里的运动。'),intro:translate('将漫长的构造过程压缩为可观察的形变。三种边界分别展示，避免概念混淆。'),params:[translate('形变幅度'),translate('地震波示意强度')],values:[.8,.55],variants:[translate('碰撞与褶皱'),translate('离散与裂谷'),translate('转换与错动')],stages:[translate('初始岩层'),translate('应力积累'),translate('开始形变'),translate('持续运动'),translate('新的构造')],cut:false,action:translate('播放构造演化'),facts:[translate('岩石圈板块相互运动，边界可表现为聚合、离散或转换。'),translate('褶皱是岩层弯曲；断层是岩体沿破裂面发生相对位移。'),translate('地表的山谷与背斜、向斜不能只按“高低”一一对应。')],question:translate('所有板块边界都会生成新的地壳吗？'),answer:translate('不会。在理想转换边界，板块主要水平错动；离散边界的海底扩张中心才常伴随新洋壳形成。'),quiz:[translate('判断断层的关键是？'),[translate('两侧颜色不一样'),translate('岩体发生破裂且有相对位移'),translate('岩层只要弯曲就算')],1],source:'tectonics'},
 {id:'river',title:translate('一条河流的雕刻'),short:translate('河流地貌'),en:'WATER WRITES THE LAND',group:translate('外力雕刻'),icon:'river',accent:'#75d7cf',subtitle:translate('从山谷到海洋，水带走什么，又留下什么？'),intro:translate('让地表逐渐切开，看见 V 形谷、曲流与沉积三角洲。'),params:[translate('下切程度'),translate('流量示意')],values:[.75,.62],variants:[translate('V 形河谷'),translate('曲流与牛轭湖'),translate('河口三角洲')],stages:[translate('初始地表'),translate('侵蚀启动'),translate('河谷加深'),translate('搬运泥沙'),translate('地貌演化')],cut:false,action:translate('播放流水演化'),facts:[translate('侵蚀、搬运与沉积可在一条河流的不同位置同时发生。'),translate('曲流通常凹岸侵蚀、凸岸堆积，河道会迁移。'),translate('三角洲能否形成，还取决于波浪、潮汐、海平面与沉积空间等。')],question:translate('“上游只有侵蚀，下游只有堆积”对吗？'),answer:translate('不对。这是过度简化。同一河段不同位置可以发生不同作用，洪水过程也会改变侵蚀与沉积格局。'),quiz:[translate('曲流的凸岸通常容易出现？'),[translate('泥沙堆积形成边滩'),translate('火山喷发'),translate('冰川拔蚀')],0],source:'rivers'},
 {id:'glacier',title:translate('冰，是缓慢的河流'),short:translate('冰川地貌'),en:'THE SLOWEST SCULPTOR',group:translate('外力雕刻'),icon:'glacier',accent:'#a1def7',subtitle:translate('看似静止的冰川，正在拓宽整条山谷。'),intro:translate('比较河谷与冰蚀谷，观察冰体下滑、侧碛和冰川末端退缩。'),params:[translate('冰体运动示意'),translate('消融倾向')],values:[.55,.38],variants:[translate('冰蚀 U 形谷'),translate('冰川末端退缩')],stages:[translate('原有谷地'),translate('冰川占据'),translate('磨蚀与拔蚀'),translate('谷地拓宽'),translate('U 形谷显现')],cut:false,action:translate('播放冰川演化'),facts:[translate('冰川在重力作用下缓慢流动，不是完全静止的冰块。'),translate('磨蚀与拔蚀共同影响冰川地貌。'),translate('末端退缩不意味着冰体向山上倒流。')],question:translate('冰川正在退缩时，冰还可能向下运动吗？'),answer:translate('可能。末端位置取决于冰的补给与消融等因素；即使冰体持续向下流动，末端仍可能因消融占优而后退。'),quiz:[translate('典型冰蚀谷常表现为？'),[translate('宽底、陡壁的 U 形谷'),translate('只能形成沙丘'),translate('所有位置完全平坦')],0],source:'glaciers'},
 {id:'karst',title:translate('一滴水，穿过一座山'),short:translate('喀斯特地貌'),en:'A LANDSCAPE DISSOLVED',group:translate('外力雕刻'),icon:'cave',accent:'#acd5a0',subtitle:translate('地表的峰林之下，还有另一条隐秘的水路。'),intro:translate('剥开石灰岩，认识溶蚀、地下河、石钟乳与石笋。'),params:[translate('溶蚀过程示意'),translate('水循环活跃度')],values:[.64,.7],variants:[],stages:[translate('岩石与裂隙'),translate('水的渗入'),translate('溶蚀扩大'),translate('峰林与溶洞'),translate('沉积与循环')],cut:true,action:translate('播放喀斯特演化'),facts:[translate('碳酸盐岩的溶蚀与水、二氧化碳及岩石结构有关。'),translate('喀斯特不仅包括峰林，还包括溶洞、落水洞、地下河等。'),translate('石钟乳、石笋常来自碳酸钙沉积，不是岩石溶蚀后直接剩下的柱子。')],question:translate('溶洞变大和石笋长高，是同一种作用吗？'),answer:translate('不是。前者主要涉及溶蚀，后者主要涉及矿物沉积。两种过程可以出现在同一套喀斯特系统中。'),quiz:[translate('从洞顶向下发育的通常称为？'),[translate('石笋'),translate('石钟乳'),translate('海蚀柱')],1],source:'karst'},
 {id:'desert',title:translate('风，把沙漠写成波浪'),short:translate('风成地貌'),en:'THE SHAPE OF THE WIND',group:translate('外力雕刻'),icon:'wind',accent:'#ebc18a',subtitle:translate('一粒沙的跃动，最终改变一整片沙丘。'),intro:translate('观察沙粒的搬运、背风坡堆积和沙脊迁移；再比较风蚀雅丹。'),params:[translate('风速示意'),translate('风向偏转')],values:[.68,.5],variants:[translate('沙丘与迁移'),translate('风蚀雅丹')],stages:[translate('沙源与风'),translate('沙粒搬运'),translate('越过沙脊'),translate('背风堆积'),translate('地貌迁移')],cut:false,action:translate('播放风成演化'),facts:[translate('沙丘是风积地貌；雅丹属于侵蚀地貌。'),translate('沙粒可以蠕移、跃移或悬移，取决于粒径和风力等。'),translate('改变风向会先改变沙粒运动，已有沙丘不会瞬间转身。')],question:translate('沙丘迁移，是整座沙丘在地面滑动吗？'),answer:translate('不是。沙粒不断从迎风侧搬运，并在背风侧沉积，使沙丘形态和位置逐步改变。'),quiz:[translate('下面哪一个主要属于风积地貌？'),[translate('沙丘'),translate('海蚀拱'),translate('冰斗')],0],source:'aeolian'},
 {id:'coast',title:translate('海岸，没有固定的边界'),short:translate('海岸地貌'),en:'WHERE LAND MEETS THE SEA',group:translate('外力雕刻'),icon:'wave',accent:'#85d7e7',subtitle:translate('一道拱门、一根岩柱，记录着海浪长久的来访。'),intro:translate('持续运动的波浪，与远慢于它的海岸演化，在同一模型中对照。'),params:[translate('波浪活动示意'),translate('潮位相对高度')],values:[.72,.6],variants:[],stages:[translate('岸坡与裂隙'),translate('海蚀洞'),translate('海蚀拱'),translate('拱顶坍塌'),translate('海蚀柱')],cut:false,action:translate('播放海岸演化'),facts:[translate('海蚀洞可在薄弱部位发育，贯通岬角后可形成海蚀拱。'),translate('拱顶坍塌后可能留下海蚀柱，岩柱仍会继续被侵蚀。'),translate('海岸演变也受到岩性、构造、潮汐与海平面变化等影响。')],question:translate('海蚀柱是不是海岸侵蚀的最终状态？'),answer:translate('不是。海蚀柱仍会继续风化、侵蚀和坍塌，可能成为较低的残留礁石或被进一步移除。'),quiz:[translate('海蚀拱坍塌后可能留下？'),[translate('海蚀柱'),translate('火山口'),translate('沙丘')],0],source:'coasts'},
 {id:'water',title:translate('一滴水的地球旅行'),short:translate('水循环'),en:'ONE DROP, MANY JOURNEYS',group:translate('地球系统'),icon:'drop',accent:'#95cce9',subtitle:translate('蒸发、凝结、降水、径流，把山海连在一起。'),intro:translate('用可见的粒子，追踪原本不可见的水汽。观察不同环节的联系。'),params:[translate('蒸发活跃度'),translate('降水活跃度')],values:[.7,.65],variants:[],stages:[translate('蒸发'),translate('水汽输送'),translate('凝结'),translate('降水'),translate('径流')],cut:false,action:translate('跟随一滴水'),facts:[translate('水循环由太阳能、重力等共同驱动。'),translate('蒸发、降水与径流常同时发生，不是全地球排队进行的五个步骤。'),translate('模型突出海陆间循环的一条路线，未穷尽蒸腾、下渗等所有路径。')],question:translate('云中的水是看不见的水蒸气吗？'),answer:translate('云主要由悬浮的小水滴、冰晶或两者组成。水蒸气本身不可见，图中的黄色粒子是帮助理解的示意。'),quiz:[translate('水从海洋进入大气，通常首先涉及？'),[translate('蒸发'),translate('岩浆侵入'),translate('断层错动')],0],source:'water'},
 {id:'earth',title:translate('把地球，轻轻剖开'),short:translate('地球圈层'),en:'INSIDE OUR HOME',group:translate('地球系统'),icon:'earth',accent:'#e8b875',subtitle:translate('从薄薄的地壳，到炽热而高压的核心。'),intro:translate('逐层认识地壳、地幔、外核与内核，建立对地球内部的空间理解。'),params:[translate('剖面旋转'),translate('自动巡览速度')],values:[.5,.5],variants:[],stages:[translate('地表'),translate('地壳'),translate('地幔'),translate('外核'),translate('内核')],cut:false,action:translate('巡览地球圈层'),facts:[translate('地壳与上部地幔的刚性部分构成岩石圈。'),translate('地幔绝大部分为固态岩石，不能画成全球性的岩浆海。'),translate('外核主要为液态，内核主要为固态；状态同时受温度与压力影响。')],question:translate('“地下温度高，所以越往下越是液态”对吗？'),answer:translate('不对。物质状态取决于温度、压力和成分等。内核虽温度很高，在巨大压力下仍主要为固态。'),quiz:[translate('下列说法正确的是？'),[translate('整个地幔都是液态'),translate('内核主要为固态'),translate('所有地壳都一样厚')],1],source:'earth'}
];
const SOURCES={
 landforms:{title:'NPS · Park Landforms',url:'https://www.nps.gov/subjects/geology/landforms.htm'},
 volcano:{title:'NPS · Volcanic Eruptions',url:'https://www.nps.gov/subjects/volcanoes/volcanic-eruptions.htm'},
 tectonics:{title:'USGS · This Dynamic Earth',url:'https://pubs.usgs.gov/gip/dynamic/dynamic.html'},
 rivers:{title:'NPS · River Systems and Fluvial Landforms',url:'https://www.nps.gov/subjects/geology/fluvial-landforms.htm'},
 glaciers:{title:'NPS · Glaciers and Glacial Landforms',url:'https://www.nps.gov/subjects/geology/glacial-landforms.htm'},
 karst:{title:'NPS · Caves and Karst',url:'https://www.nps.gov/subjects/caves/index.htm'},
 aeolian:{title:'NPS · Aeolian Landforms',url:'https://www.nps.gov/subjects/geology/aeolian-landforms.htm'},
 coasts:{title:'NPS · Coastal Landforms',url:'https://www.nps.gov/subjects/geology/coastal-landforms.htm'},
 water:{title:'USGS · The Water Cycle',url:'https://www.usgs.gov/special-topics/water-science-school/science/water-cycle'},
 earth:{title:'USGS · Inside the Earth',url:'https://pubs.usgs.gov/gip/dynamic/inside.html'}
};
const ICONS={mountain:'M2 20 9 7l4 8 3-6 6 11H2Zm5-9 2 2 2-2M13 4l2-2 3 5',volcano:'m2 21 7-13 2 2 2-2 9 13H2ZM11 4l-1-3m5 4 2-3M6 6 3 4m16 3 3-1M8 17l3-2 2 2 3-1',layers:'m2 7 10-5 10 5-10 5L2 7Zm0 5 10 5 10-5M2 17l10 5 10-5',river:'M7 2c12 4-12 7 1 11s-1 7 1 9M15 2c12 4-12 7 1 11s-1 7 1 9',glacier:'m1 21 8-17 5 8 3-6 6 15H1Zm5-10 3 3 3-4m-1 5 3 3 2-3M17 2v-2',cave:'M3 21V10l5-7h8l5 7v11h-6v-7l-3-4-3 4v7H3ZM8 3l1 5m7-5-1 6',wind:'M2 8h13a3 3 0 1 0-3-3M2 12h18a3 3 0 1 1-3 3M2 17h7a3 3 0 1 1-3 3',wave:'M2 12c3 0 4-7 10-7s8 5 6 7c-2 3-6 0-4-2-2 0-2 6 2 6h6M2 17c3-2 5 2 8 0M2 21c4-2 6 2 10 0s6 2 10 0',drop:'M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14ZM8 16c0 3 2 4 4 4',earth:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c5 5 5 15 0 20-5-5-5-15 0-20',play:'m8 4 13 8-13 8V4Z',pause:'M8 4v16M16 4v16',reset:'M3 10a9 9 0 1 1 1 8M3 3v7h7',focus:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',camera:'M3 7h5l2-3h4l2 3h5v14H3V7Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',expand:'M8 2H2v6M16 2h6v6M2 16v6h6m14-6v6h-6',book:'M3 4h7l2 2 2-2h7v17h-7l-2-2-2 2H3V4Zm9 2v13',sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4-10v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',search:'M16 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 8 8',chevron:'m9 5 7 7-7 7',close:'m5 5 14 14M5 19 19 5',menu:'M3 6h18M3 12h18M3 18h18',check:'m4 12 5 5L21 5',info:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6m0-10v1',download:'M12 2v13m-5-5 5 5 5-5M3 16v6h18v-6',arrow:'M3 12h18m-6-6 6 6-6 6'};
function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]||ICONS.mountain}"/></svg>`}


// ---- scenes.js ----
/* Ten independently constructed worlds; process sliders change geometry and dynamics. */
function volcanoHeight(x,z) {
    const r=Math.hypot(x,z),a=Math.atan2(z,x),re=r*(1+.026*Math.sin(a*5)+.018*Math.sin(a*9+.3));
    const cone=6.7*Math.exp(-Math.pow(re/3.48,1.48));
    const crater=2.04*Math.exp(-Math.pow(re/.73,5));
    const gullies=(Math.pow(Math.abs(Math.sin(a*10.5+r*.22)),1.7)*.30 +
        Math.abs(Math.sin(a*23.5-r*.47))*.085+mountainRelief(x*1.3,z*1.3)*.23)*smooth(.73,1.6,r)*(1-smooth(5.7,8.5,r));
    return .44+cone-crater+gullies+.13*fbm(x*.82+8,z*.82);
}

function volcanicSystem(R,fn,{cx=0,cz=0,scale=1}={}) {
    const ventY=fn(cx,cz)+.07,lipY=fn(cx+.75*scale,cz)+.04,rnd=random(983);
    const lake=R.mesh(ringGeo(cx,ventY,cz,0,.51*scale,color('ff792d')),{type:3,cast:false,clip:true,layer:'motion'});
    const flows=[];
    // Asymmetric, branching lava channels follow the actual terrain, not tubes
    // suspended above it. Dark levees are distinct geometry beside the hot centre.
    const angles=[.37,1.02,1.8,2.61,3.8,5.25];
    for(let k=0;k<angles.length;k++) {
        const pts=[],length=4.5+(k%3)*.73;
        for(let j=0;j<=100;j++) {
            const t=j/100,r=(.74+t*length)*scale;
            const a=angles[k]+Math.sin(t*8+k)*.067+Math.sin(t*20+k)*.025+t*t*.17;
            const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
            pts.push([x,fn(x,z)+.03,z]);
        }
        const width=t=>scale*(.065+.135*Math.sin(t*Math.PI)+.048*noise(t*47,k*2.3))*(k===1?1.35:1);
        const bank=R.mesh(surfaceRibbonGeo(pts,t=>width(t)*1.9,color('343331'),fn,.026,260,8),{type:2,cast:false,clip:true,layer:'motion'});
        const mesh=R.mesh(surfaceRibbonGeo(pts,width,color('ff8b39'),fn,.054,260,10),{type:3,cast:false,clip:true,layer:'motion'});
        flows.push({mesh,bank,index:k});
        if(k===1||k===3) {
            const sub=[];for(let j=0;j<=65;j++) {
                const t=j/65,r=(2.5+t*2.2)*scale,a=angles[k]+.13+t*.23;
                const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;sub.push([x,fn(x,z)+.055,z]);
            }
            const branch=R.mesh(surfaceRibbonGeo(sub,t=>scale*(.09-t*.06),color('ff8635'),fn,.052,150,6),{type:3,cast:false,clip:true,layer:'motion'});
            flows.push({mesh:branch,bank:null,index:k+3,branch:true});
        }
    }
    const sparks=R.points(260,{additive:true}),bombs=R.points(45,{mode:2}),ash=R.points(205,{mode:1,layer:'clouds'}),glow=R.points(4,{additive:true});
    const seeds=Array.from({length:305},()=>[rnd(),rnd(),rnd(),rnd()]);
    let clock=0,lastT=0;
    return (t,p,gas=.72,viscosity=.45)=>{
        clock+=Math.max(0,Math.min(.15,t-lastT));lastT=t;
        const active=smooth(.16,.35,p)*(1-smooth(.72,.985,p)),power=active*(.38+gas*1.03)*(.83+viscosity*.31),cool=1-smooth(.79,1,p);
        const extent=clamp(smooth(.27,.86,p)/(.74+viscosity*.57));
        lake.amplitude=power*.8+cool*.28;lake.visible=p>.10;
        R.heat=power*1.1;R.heatPos=[cx,lipY+.1,cz];
        for(const {mesh,bank,index,branch} of flows){
            const front=clamp((extent-(branch?.26:0))*(1.22-index*.035));
            mesh.front=front;mesh.visible=p>.27&&front>.001;mesh.amplitude=power*.73+cool*.32;
            if(bank){bank.visible=mesh.visible;bank.count=Math.max(0,Math.floor(front*260))*8*6;}
        }
        for(let i=0;i<sparks.count;i++) {
            const [a,b,c,d]=seeds[i],age=fract(clock*(.27+d*.12)+a)*2.6,theta=b*TAU,v=(.65+c*2.35)*(1-viscosity*.32);
            const x=cx+Math.cos(theta)*v*age*scale,z=cz+Math.sin(theta)*v*age*scale,y=lipY+((4.4+power*2.6+d*2.4)*age-4.9*age*age)*scale;
            const hit=y<fn(x,z)+.05,fade=(1-smooth(1.5,2.55,age))*power;
            pointSet(sparks,i,[x,y,z],[1,mix(.20,.78,d),.04],hit?0:fade*.84,(.016+d*.030)*scale);
        }
        R.updatePoints(sparks);
        for(let i=0;i<bombs.count;i++){
            const [a,b,c,d]=seeds[i+260],age=fract(clock*.19+a)*3.2,theta=b*TAU;
            const x=cx+Math.cos(theta)*age*(1.3+c)*scale,z=cz+Math.sin(theta)*age*(1.3+c)*scale,y=lipY+(7*age-4.7*age*age)*scale;
            pointSet(bombs,i,[x,y,z],[.51+d*.35,.20,.06],y>fn(x,z)?power*.7:0,(.038+c*.026)*scale);
        }R.updatePoints(bombs);
        for(let i=0;i<ash.count;i++){
            const [a,b,c,d]=seeds[i],age=fract(clock*(.049+b*.015)+a),spread=(.22+smooth(.05,.85,age)*2.05)*scale;
            const swell=Math.sin(age*13+b*TAU)*.2,xx=Math.sin(b*TAU+age*3.1),zz=Math.cos(c*TAU-age*2.2);
            const x=cx+xx*(spread+swell)+age*age*2.2*scale,z=cz+zz*spread*.74,y=lipY+.2+age*(6.6+power*2.1)*scale;
            const gray=mix(.27,.55,age),opacity=(.12+power*.14)*Math.pow(Math.sin(age*Math.PI),.65)*smooth(.11,.3,p)*(1-smooth(.85,1,p));
            pointSet(ash,i,[x,y,z],[gray*.93,gray*.96,gray],opacity,(.49+age*1.85)*( .75+d*.35)*scale);
        }R.updatePoints(ash);
        for(let i=0;i<4;i++)pointSet(glow,i,[cx,lipY+.07+i*.17*scale,cz],[1,.24,.018],power*.12,(.56+i*.17)*scale);
        R.updatePoints(glow);
    };
}

function sceneVolcano(R,S) {
    const fn=volcanoHeight;addBase(R,fn,{col:volcanicColor,clip:true,n:320,m:240});
    addForest(R,fn,{count:670,filter:(x,z)=>Math.hypot(x,z)>5.9,scale:.82});
    addBoulders(R,fn,{count:390,filter:(x,z)=>Math.hypot(x,z)>3.1,scale:.9});
    R.mesh(cutFaceGeo(fn),{type:2,layer:'interior'});
    R.mesh(sphereGeo(1.45,color('e96027'),48,32,.12),{model:transform([0,-1.04,.42],[1.58,.72,.40]),type:3,layer:'interior',cast:false});
    const conduit=[[0,-1.0,.65],[-.25,.55,.55],[.18,2.15,.49],[-.05,3.7,.38],[0,4.93,.31]];
    R.mesh(tubeGeo(conduit,t=>.16+Math.sin(t*12)*.026,color('ff8b3b'),130,14),{type:3,layer:'interior',cast:false});
    for(const sign of [-1,1])R.mesh(tubeGeo([[sign*.3,.9,.46],[sign*1.05,1.65,.43],[sign*1.5,1.82,.41]],t=>.085*(1-t*.76),color('ef712d'),55,10),{type:3,layer:'interior',cast:false});
    const flow=flowParticles(R,conduit,{co:color('ffdf8f'),count:45,speed:.09,layer:'interior',size:.044});
    const anim=volcanicSystem(R,fn),cloud=addAmbientClouds(R);
    return {
        preset:[.54,.50,39,[0,2.5,0]],
        markers:[
            marker(translate('火山口'),'CRATER',[.75,fn(.75,0)+.15,0],translate('火山口与地下通道相连；不规则的边缘记录着喷发与塌陷。'),translate('结构')),
            marker(translate('熔岩流'),'LAVA CHANNELS',[2.25,fn(2.25,2.6)+.12,2.6],translate('地表熔岩沿坡流动，边缘逐渐冷却，形成较暗的壳与堤。这里夸大了可见流动。'),translate('观察')),
            marker(translate('火山灰柱'),'ASH COLUMN',[.3,9.2,-.25],translate('火山灰是细小的岩石、矿物与火山玻璃碎屑；不是燃烧后的烟灰。'),translate('易错点')),
            marker(translate('岩浆储集区'),'MAGMA RESERVOIR',[0,-.7,.6],translate('储集区、主通道与侧向裂隙均为结构示意；真实岩浆系统可能含有大量晶体。'),translate('剖面'))
        ],
        update(t,dt,s){anim(t,s.progress,s.params[0],s.params[1]);flow(t);cloud(t);},
        note:translate('触发喷发，观察灰柱、抛射物、分支熔岩与逐步冷却。打开剖面可看到内部通道。')
    };
}

function atlasHeight(x,z) {
    const peaks=5.9*gauss(x,z,-5.2,-4.3,3.8,3.4)+3.2*gauss(x,z,-8,-2.9,2.4,2.8)+2.7*gauss(x,z,-1.8,-5.8,2.8,2.6);
    const alpine=peaks*(.78+mountainRelief(x*.67,z*.67)*.27);
    const vol=(volcanoHeight((x-5.1)*1.31,(z+4.3)*1.31)-.48)*gauss(x,z,5.1,-4.3,5.5,4.4);
    let h=.49+fbm(x*.54,z*.54)*.56+alpine+vol;
    if(x<-5&&z>1.3){const q=gauss(x,z,-8,3.2,2.1,2.7),tower=Math.pow(Math.abs(Math.sin(x*1.28+z*.21)*Math.sin(z*1.01)),5);h+=q*tower*2.8;}
    if(x>4&&z>-.6){const u=fract((x+Math.sin(z*.65)*.5+z*.3)/3.6),a=u<.78?Math.pow(u/.78,.85):Math.pow((1-u)/.22,1.4);h=mix(h,.57+a*1.15+noise(x*5,z*5)*.023,smooth(4.3,6.2,x)*smooth(-.6,1.,z));}
    const rx=-2.4+Math.sin((z+4)*.53)*1.75,ry=Math.max(.18,1.83-(z+5)*.097-smooth(-.25,.35,z)*.37),distance=Math.abs(x-rx);
    if(z>-5.5)h=mix(h,ry-.18,1-smooth(.16,1.03,distance));
    const coast=smooth(7.05,9,z)*.98+smooth(9.1,12,x)*.94;
    return mix(h,-.53,clamp(coast));
}

function sceneAtlas(R,S) {
    const fn=atlasHeight,col=(x,z,h,n)=>{
        if(x>3.7&&z<-1.3&&Math.hypot(x-5.1,z+4.3)<4.3)return cmix(volcanicColor((x-5.1)*1.31,(z+4.3)*1.31,h,n),alpineColor(x,z,h,n),.05);
        if(x>4.3&&z>-.5)return desertColor(x,z,h,n);
        return alpineColor(x,z,h,n);
    };
    addBase(R,fn,{col,n:336,m:252});
    const sea=R.mesh(heightGeo(()=>.14,()=>color('278893'),{n:145,m:110}),{type:1,cast:false,layer:'water'});
    const oceanEdge=addWaterEdge(R,.14);
    const river=[];for(let i=0;i<=120;i++){const z=-5+i/120*14;river.push([-2.4+Math.sin((z+4)*.53)*1.75,Math.max(.18,1.83-(z+5)*.097-smooth(-.25,.35,z)*.37)+.026,z]);}
    R.mesh(ribbonGeo(river,t=>.40+.10*t,color('45b5b6'),260,10),{type:1,waterMode:1,layer:'water',cast:false});
    const flow=flowParticles(R,river,{count:115,speed:.048,size:.042});
    const ice=[];for(let j=0;j<=50;j++){const t=j/50,x=-5.6+t*2.3,z=-5.5+t*4;ice.push([x,fn(x,z)+.06,z]);}
    R.mesh(surfaceRibbonGeo(ice,t=>.28+.5*Math.sin(t*Math.PI),color('bfe4e9'),fn,.07,180,12),{type:4,layer:'water',cast:false});
    addForest(R,fn,{count:1150,filter:(x,z,h)=>!(x>4&&z>-1)&&!(x>1&&z<-2)&&h>.38&&Math.abs(x-(-2.4+Math.sin((z+4)*.53)*1.75))>.5,scale:.65});
    addBoulders(R,fn,{count:520,filter:(x,z,h)=>!(x>4&&z>-.5)&&h>.28,scale:.65});
    const volcano=volcanicSystem(R,fn,{cx:5.1,cz:-4.3,scale:.75}),cloud=addAmbientClouds(R);
    return {
        preset:[.52,.65,40,[0,1.12,0]],
        markers:[marker(translate('冰川与雪山'),'GLACIAL LANDSCAPES',[-5.4,fn(-5.4,-4.5)+.2,-4.5],translate('进入冰川章节，比较流水与冰川塑造的谷地。'),'glacier'),marker(translate('火山活动'),'VOLCANIC FORCES',[5.1,fn(5.65,-4.3)+.3,-4.3],translate('进入火山实验，改变气体驱动与黏度，触发一次喷发。'),'volcano','#ffae7e'),marker(translate('河流侵蚀'),'RIVER EROSION',[-2.5,1.13,2.1],translate('进入河流章节，观察下切、曲流和三角洲。'),'river'),marker(translate('风与沙丘'),'AEOLIAN LANDFORMS',[7,1.75,2.8],translate('进入风成地貌，观察沙脊迁移与沙粒的跃动。'),'desert'),marker(translate('海岸的雕刻'),'COASTAL EROSION',[4.5,.45,8.2],translate('进入海岸章节，观察海蚀拱的坍塌与海蚀柱。'),'coast')],
        update(t,dt,s){volcano(t,.53,s.params[0]);flow(t,s.params[1]);sea.amplitude=.65+s.params[1]*.7;cloud(t);},
        note:translate('独立的火山、河流、冰川、喀斯特、沙丘与海岸实验。点击地貌标记进入。')
    };
}

function sceneRiver(R,S) {
    const variant=S.variant||0;if(variant===2)return sceneDelta(R,S);
    const meander=variant===1,cx=z=>Math.sin((z+4.8)*.49)*(meander?3.7:1.95),grade=z=>.27+(9-z)*(meander?.021:.081);
    const ox=(x,z)=>Math.sqrt(((x+5.25)/1.17)**2+((z-3.15)/1.65)**2);
    const h0=(x,z)=>.75+fbm(x*.33,z*.33)*.7+smooth(8,-9,z)*(meander?.57:4.5)+(meander?0:mountainRelief(x*.7,z*.7)*.65);
    const h1=(x,z)=>{
        const b=h0(x,z),dist=Math.abs(x-cx(z)),ry=grade(z),width=meander?1.06:2.27;
        let v=mix(b,ry-.16,1-smooth(.18,width,dist));
        if(!meander){const g=mountainRelief(x*1.25,z*1.25)*.15*smooth(.45,2.0,dist);v+=g;}
        if(meander&&x<-3.95){const d=Math.abs(ox(x,z)-1);v=mix(v,grade(3.15)-.12,1-smooth(.07,.25,d));}
        return v;
    };
    const {top}=addBase(R,h0,{col:greenColor,target:h1,n:312,m:234});top.morph=S.progress;
    const pts=[];for(let i=0;i<=160;i++){const z=-9+i/160*18;pts.push([cx(z),grade(z)+.025,z]);}
    const channelGeo=ribbonGeo(pts,meander?.92:.50,color('429f9b'),320,12);
    for(let i=0;i<channelGeo.p.length/3;i++){const x=channelGeo.p[i*3],z=channelGeo.p[i*3+2];channelGeo.p[i*3+1]=h0(x,z)+.055;}
    recomputeNormals(channelGeo);
    const channel=R.mesh(channelGeo,{type:1,waterMode:1,layer:'water',cast:false});
    addForest(R,h1,{count:930,filter:(x,z)=>Math.abs(x-cx(z))>(meander?1.2:2.8)&&(!meander||Math.abs(ox(x,z)-1)>.5),scale:meander?.72:.75});
    addBoulders(R,h1,{count:350,filter:(x,z)=>Math.abs(x-cx(z))>(meander?1:1.5),scale:.65});
    const cloud=addAmbientClouds(R),flow=flowParticles(R,pts,{count:170,speed:.058,size:.035,height:(x,z)=>mix(h0(x,z)+.055,grade(z)+.045,top.morph)});
    let lake=null;
    if(meander){
        const oxbow=[];for(let i=0;i<=100;i++){const a=-Math.PI*.93+i/100*Math.PI*1.86;oxbow.push([-5.25+Math.cos(a)*1.17,grade(3.15)+.024,3.15+Math.sin(a)*1.65]);}
        const g=ribbonGeo(oxbow,.31,color('497e74'),180,8);for(let i=0;i<g.p.length/3;i++)g.p[i*3+1]=h0(g.p[i*3],g.p[i*3+2])+.05;recomputeNormals(g);lake=R.mesh(g,{type:1,waterMode:1,cast:false,layer:'water'});
        // Narrow sediment bars inside bends, also attached to the evolving surface.
        const bars=new Geometry();for(const z0 of [-3.5,3.1,8]){const bar=[];for(let j=0;j<=42;j++){const z=z0-1+j/42*2,x=cx(z)+(Math.sin((z0+4.8)*.49)>0?-.63:.63);bar.push([x,h1(x,z)+.018,z]);}const b=surfaceRibbonGeo(bar,t=>.13*Math.sin(t*Math.PI),color('b6a67d'),h1,.025,60,4);for(let i=0;i<b.p.length/3;i++)b.p[i*3+1]=h0(b.p[i*3],b.p[i*3+2])+.025;bars.merge(b);}const bm=R.mesh(recomputeNormals(bars),{type:8,cast:false});Object.defineProperty(bm,'morph',{get:()=>top.morph,set:()=>{}});
    }
    let flowTime=0;
    return {
        preset:[.53,.66,37,[0,1,0]],
        markers:meander?[marker(translate('凹岸侵蚀'),'CUT BANK',[cx(1)+.64,grade(1)+.35,1],translate('曲流外侧常易受侵蚀；弯道不断迁移，而不是只沿固定沟槽流水。')),marker(translate('凸岸堆积'),'POINT BAR',[cx(4)-.62,grade(4)+.22,4],translate('内侧水流搬运能力变化，可形成泥沙边滩。浅色边滩突出侵蚀与沉积的对照。')),marker(translate('牛轭湖'),'OXBOW LAKE',[-5.25,grade(3.15)+.22,3.15],translate('旧河道与主河道分离后可形成牛轭湖。模型并置结果以便课堂比较。'))]:[marker(translate('上游下切'),'VERTICAL EROSION',[cx(-5),grade(-5)+.42,-5],translate('流水下切、坡面过程和构造条件共同影响谷地形态。')),marker(translate('V 形河谷'),'V-SHAPED VALLEY',[cx(.7),grade(.7)+.33,.7],translate('随着演化，河床降低，谷坡在两侧逐渐显现。')),marker(translate('搬运与沉积'),'TRANSPORT & DEPOSITION',[cx(6),grade(6)+.25,6],translate('同一条河流的不同位置可以同时发生侵蚀、搬运和沉积。'))],
        update(t,dt,s){top.morph=clamp(s.progress*(.55+s.params[0]*.65));channel.morph=top.morph;channel.visible=s.progress>.015;if(lake)lake.morph=top.morph;flowTime+=dt*(.35+s.params[1]*1.5);flow(flowTime);cloud(t);},
        note:translate('表面、河道、树木和边滩随同一地形演化，避免河流悬浮。切换子场景比较侵蚀与沉积。')
    };
}

function sceneDelta(R,S) {
    const branch=(j,z)=>j*smooth(-4,7,z)*(2.45+.22*Math.sin(z*.52+j*.6));
    const terrain=(x,z)=>{
        const fan=(1-smooth(1,8.7,z))*(1-smooth(2.2,10,Math.abs(x))),ground=-.38+fan*1.38+fbm(x*.7,z*.7)*.15;
        let distance=20;for(let j=-2;j<=2;j++)distance=Math.min(distance,Math.abs(x-branch(j,z)));
        const incised=mix(ground,.19+.013*(9-z),1-smooth(.17,.5,distance));return Math.min(ground,incised);
    };
    const start=(x,z)=>terrain(x,z)-smooth(-4.3,5,z)*.80;
    const {top}=addBase(R,start,{target:terrain,n:300,m:224,col:(x,z,h,n)=>h<.58?cmix(color('a89471'),color('68805a'),smooth(.2,.58,h)):greenColor(x,z,h,n)});
    const sea=R.mesh(heightGeo(()=>.16,()=>color('257f8b'),{n:146,m:110}),{type:1,cast:false,layer:'water'});
    const oceanEdge=addWaterEdge(R,.16);
    const channels=[],flows=[];
    for(let j=-2;j<=2;j++){
        const pts=[];for(let i=0;i<=110;i++){const z=-9+i/110*17.1,x=branch(j,z);pts.push([x,Math.max(.185,terrain(x,z)+.027),z]);}
        const geo=ribbonGeo(pts,t=>mix(.43,.23,t),color('4f9992'),245,8);
        for(let i=0;i<geo.p.length/3;i++){const x=geo.p[i*3],z=geo.p[i*3+2];geo.p[i*3+1]=Math.max(.181,start(x,z)+.04);}
        recomputeNormals(geo);channels.push(R.mesh(geo,{type:1,waterMode:2,cast:false,layer:'water'}));
        flows.push(flowParticles(R,pts,{count:65,speed:.065,size:.031,co:color('d2b77d'),height:(x,z)=>Math.max(.19,mix(start(x,z),terrain(x,z),top.morph)+.035)}));
    }
    addForest(R,terrain,{count:460,filter:(x,z,h)=>z<-3&&h>.5&&Math.abs(x)>1,scale:.49});
    addBoulders(R,terrain,{count:160,filter:(x,z)=>z<-5,scale:.4});
    const cloud=addAmbientClouds(R),mud=R.points(150,{layer:'motion'}),rnd=random(785),seeds=Array.from({length:150},()=>[rnd(),rnd(),rnd()]);let clock=0;
    return {preset:[.29,.82,35,[0,.3,0]],markers:[marker(translate('入海口'),'RIVER MOUTH',[0,.8,-1],translate('河流进入海洋，泥沙输送、波浪与潮汐共同决定沉积能否保存。')),marker(translate('分流河道'),'DISTRIBUTARIES',[3,.45,3],translate('多条河道把水和泥沙输送到三角洲前缘。')),marker(translate('沉积前缘'),'DELTA FRONT',[0,.4,6.5],translate('拖动时间轴，看沉积体逐渐露出水面。不是所有河口都会形成三角洲。'))],update(t,dt,s){top.morph=clamp(s.progress*(.6+s.params[0]*.7));for(const c of channels)c.morph=top.morph;clock+=dt*(.3+s.params[1]*1.4);for(const f of flows)f(clock);for(let i=0;i<150;i++){const [a,b,c]=seeds[i],age=fract(a+clock*.035);pointSet(mud,i,[(b-.5)*10*(.5+age),.192,4.8+age*3.9],[.48,.47,.26],.16*s.params[0]*Math.sin(age*Math.PI),.05+c*.08);}R.updatePoints(mud);sea.amplitude=.65;cloud(t);},note:translate('细颗粒显示泥沙路径，浅水颜色标识沉积前缘。几何演化为概念模型，非沉积通量计算。')};
}

function sceneGlacier(R,S) {
    const valleyX=z=>Math.sin(z*.25)*.63;
    const floor=z=>.44+smooth(8,-9,z)*2.18;
    const relief=(x,z)=>{
        const d=Math.abs(x-valleyX(z)),rel=mountainRelief(x*.92,z*.92),spurs=.5+.5*Math.cos(z*.69+x*.16);
        return floor(z)+Math.pow(Math.min(d/4.6,1),.77)*(3.25+.60*Math.sin(z*.26+1)+1.05*gauss(x,z,-6,-5,3,3)+rel*.74+spurs*.32)+noise(x*5,z*5)*.07;
    };
    const uvalley=(x,z)=>{
        const d=Math.abs(x-valleyX(z)),floorH=floor(z),wall=Math.pow(clamp((d-.65)/3.9),2.15)*4.4;
        const trough=floorH+wall+mountainRelief(x*1.13,z*1.13)*.57*smooth(1.5,3.2,d);
        return mix(trough,relief(x,z),smooth(3.9,5.3,d));
    };
    const {top}=addBase(R,relief,{col:alpineColor,target:uvalley,n:324,m:244});
    const pts=[];for(let i=0;i<=140;i++){const z=-8.8+i/140*15.6;pts.push([valleyX(z),floor(z)+.46,z]);}
    const width=t=>2.52*(.72+.28*Math.sin(t*Math.PI))*(1-smooth(.83,1.04,t)*.4);
    const iceGeo=ribbonGeo(pts,width,color('8cbdce'),400,36);
    for(let i=0;i<iceGeo.p.length/3;i++){
        const x=iceGeo.p[i*3],z=iceGeo.p[i*3+2],u=iceGeo.uv[i*2],t=iceGeo.uv[i*2+1];
        const crevasse=Math.pow(Math.max(0,1-Math.abs(Math.sin(z*6.8+u*.62+noise(x*5,z*2)*.6))),7)*.19*smooth(-8,-6,z)*(1-smooth(3,6,z));
        const surface=.25+.18*Math.pow(Math.sin(u*Math.PI),.6)-crevasse+noise(x*12,z*9)*.018;
        iceGeo.p[i*3+1]=relief(x,z)+surface;iceGeo.p2[i*3+1]=uvalley(x,z)+surface;
    }
    recomputeNormals(iceGeo);const ice=R.mesh(iceGeo,{type:4,layer:'water',cast:true});
    const skirt=new Geometry();
    for(let side of [0,36]){
        let base=skirt.p.length/3;
        for(let j=0;j<=400;j++)for(let k=0;k<2;k++){
            let i=j*37+side,x=iceGeo.p[i*3],z=iceGeo.p[i*3+2],p=[x,k?iceGeo.p[i*3+1]:relief(x,z),z],p2=[x,k?iceGeo.p2[i*3+1]:uvalley(x,z),z];
            skirt.vertex(p,[side?1:-1,0,0],color(k?'8abccc':'478598'),[side/36,j/400],p2);
        }
        for(let j=0;j<400;j++){let i=base+j*2;skirt.indices.push(i,i+1,i+2,i+1,i+3,i+2);}
    }
    const iceSides=R.mesh(skirt,{type:4,layer:'water',cast:false});
    const rnd=random(417),stones=[];for(let i=0;i<480;i++){
        const z=-8+rnd()*14.8,x=valleyX(z)+(i%2?1:-1)*(1.3+rnd()*.35),s=.035+rnd()*.055;
        stones.push({p:[x,relief(x,z)+.045,z],y2:uvalley(x,z)+.05,s:[s*(1+rnd()),s*.6,s],r:rnd()*TAU,c:[.8,.84,.82]});
    }attachToTerrain(R.instances(rockGeo(17),stones,{layer:'land',type:2}),R);
    addForest(R,uvalley,{count:460,filter:(x,z,h)=>Math.abs(x)>4.6&&h<4.4,scale:.57});
    addBoulders(R,uvalley,{count:250,filter:(x,z)=>Math.abs(x-valleyX(z))>2,scale:.7});
    const glints=R.points(125,{additive:true}),seeds=Array.from({length:125},()=>[rnd(),rnd()]),cloud=addAmbientClouds(R);
    // A real mesh caps the advancing/retreating ice front instead of an open sheet.
    const frontG=new Geometry();for(let i=0;i<=48;i++)for(let j=0;j<2;j++){
        const u=i/48;frontG.vertex([(u-.5),j*.35+Math.sin(u*Math.PI)*.12,-.468*Math.pow(Math.abs(u*2-1),2)],[0,0,1],color(j?'82b9c9':'3f7f95'),[u,j*.1]);
    }for(let i=0;i<48;i++){const a=i*2;frontG.indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const terminus=R.mesh(frontG,{type:4,cast:false,layer:'water'});let clock=0;
    const markers=[marker(translate('积累区'),'ACCUMULATION ZONE',[0,3.4,-6.8],translate('积雪经压实和变质形成冰川冰；重力使冰体向下运动。')),marker(translate('冰裂隙与 U 形谷'),'CREVASSES & GLACIAL TROUGH',[.85,1.9,.5],translate('拉伸可使冰体产生裂隙。谷地的拓宽加深则来自冰川侵蚀等过程。')),marker(translate('冰川末端'),'GLACIER TERMINUS',[0,.9,5.3],translate('末端后退不等于冰体向山上倒流。观察冰面颗粒的运动方向。')),marker(translate('侧碛'),'LATERAL MORAINE',[-1.6,1.75,2.5],translate('两侧的碎石带用三维颗粒表现，不是贴在冰面上的线。'))];
    return {
        preset:[.45,.62,39,[0,1.3,0]],
        markers,
        update(t,dt,s){
            top.morph=s.progress;ice.morph=iceSides.morph=top.morph;
            const length=clamp(.98-s.params[1]*.38-(S.variant===1?s.progress*.43:0),.25,1);ice.front=iceSides.front=length;ice.visible=iceSides.visible=s.layers.water;
            const z=-8.8+15.6*length,x=valleyX(z),h=mix(relief(x,z),uvalley(x,z),top.morph)+.02;
            terminus.model=transform([x,h,z],[width(length),1,1]);terminus.visible=s.layers.water;markers[2].p=[x,h+.4,z];
            clock+=dt*(.3+s.params[0]*1.3);
            for(let i=0;i<125;i++){const [a,b]=seeds[i],u=fract(a+clock*.009)*length,p=catmull(pts,u),off=(b-.5)*width(u)*.72;p[0]+=off;p[1]=mix(relief(p[0],p[2]),uvalley(p[0],p[2]),top.morph)+.44;pointSet(glints,i,p,[.54,.83,.92],.30*Math.sin(u/length*Math.PI),.027);}
            R.updatePoints(glints);cloud(t);
        },
        note:translate('冰裂隙有实际的表面凹陷；末端连续退缩，冰体仍沿谷地向下流。空间与时间均经夸张。')
    };
}

function sceneKarst(R,S) {
    const rand=random(121),towers=[],riverX=z=>Math.sin(z*.4)*1.8;
    for(let i=0;i<47;i++){
        const x=(rand()-.5)*21.6,z=(rand()-.5)*15.7;if(Math.abs(x-riverX(z))<1.4)continue;
        towers.push([x,z,.62+rand()*.62,2.0+rand()*4.3,rand()*TAU]);
    }
    const final=(x,z)=>{
        let h=.38+fbm(x*.54,z*.54)*.3,peak=0;
        for(const [cx,cz,r,a,phase] of towers){
            const dx=x-cx,dz=z-cz,q=(dx*dx+dz*dz)/(r*r);if(q>5.8)continue;
            const theta=Math.atan2(dz,dx),joints=.89+.075*Math.sin(theta*8+phase)+.033*Math.sin(theta*19+z*.8),cap=Math.exp(-Math.pow(q/joints,1.64));
            const profile=a*cap*(.96+noise(x*6+phase,z*6)*.055);
            peak=Math.max(peak,profile);
        }
        h+=peak;const distance=Math.abs(x-riverX(z));return mix(h,.24,1-smooth(.22,.65,distance));
    };
    const start=(x,z)=>6.95+fbm(x*.68,z*.68)*.5;
    const {top}=addBase(R,start,{target:final,clip:true,n:336,m:252,col:(x,z,h,n)=>{
        const limestone=cmix(color('858f85'),color('b8b7a3'),fbm(x*1.4,z*1.4));return cmix(limestone,greenColor(x,z,h,n),smooth(.25,.82,n[1])*.78);
    }});
    const river=[];for(let i=0;i<=110;i++){const z=-9+i/110*18;river.push([riverX(z),.354,z]);}
    const riv=R.mesh(ribbonGeo(river,.55,color('34928b'),260,10),{type:1,waterMode:1,cast:false,clip:true,layer:'water'});
    const flow=flowParticles(R,river,{count:100,speed:.049,size:.032});
    const forest=addForest(R,final,{count:660,filter:(x,z,h)=>h<1.35&&Math.abs(x-riverX(z))>.73,scale:.40});
    addBoulders(R,final,{count:260,filter:(x,z,h)=>h<1.4&&Math.abs(x-riverX(z))>.7,scale:.45});
    R.mesh(cutFaceGeo(final),{type:2,layer:'interior'});
    // A recessed, rough three-dimensional wall, not a flat black oval.
    const cave=new Geometry(),rings=32,sides=100;
    for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
        const r=j/rings,a=i/sides*TAU,x=Math.cos(a)*r*5.25,y=-1.13+Math.sin(a)*r*1.54;
        const z=.21+(1-r*r)*.50+noise(x*4,y*5)*.07;
        const c=cmix(color('182b2b'),color('445047'),smooth(.4,1,r)*.60);
        cave.vertex([x,y,z],[0,0,1],c,[i/sides,r]);
    }
    for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;cave.indices.push(a,a+1,b,b,a+1,b+1);}
    R.mesh(recomputeNormals(cave),{layer:'interior',cast:false});
    const formations=new Geometry(),tips=[];
    const speleo=(height,radius,seed)=>{
        const g=new Geometry(),n=18,m=18;
        for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
            const t=j/m,a=i/n*TAU,r=radius*Math.pow(1-t,1.5)*(1+.16*Math.sin(a*7+t*3+seed));
            const p=[Math.cos(a)*r+Math.sin(t*2+seed)*.023*t,t*height,Math.sin(a)*r];
            g.vertex(p,norm([Math.cos(a),radius/height,Math.sin(a)]),cmix(color('968970'),color('c5b99b'),t*.45),[i/n,t]);
        }
        for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;g.indices.push(a,b,a+1,a+1,b,b+1);}return recomputeNormals(g);
    };
    for(let i=0;i<26;i++){
        const x=-4.65+i*.365,height=.23+rand()*.65,roof=-1.13+Math.sqrt(Math.max(0,1-(x/5.25)**2))*1.47;
        const ceiling=speleo(height,.12+rand()*.06,i),floorG=speleo(.19+rand()*.64,.10+rand()*.055,i+4);
        formations.merge(ceiling,[x,roof,.77],[1,-1,1]);formations.merge(floorG,[x,-2.33,.73]);tips.push([x,roof-height,.84]);
    }
    R.mesh(formations,{layer:'interior',cast:false,type:2});
    const under=[[-4.9,-2.19,.92],[-2.5,-2.15,1.05],[0,-2.18,.87],[2.5,-2.19,.98],[4.9,-2.19,.77]];
    R.mesh(ribbonGeo(under,.48,color('359487'),160,8),{type:1,waterMode:1,layer:'interior',cast:false});
    const flow2=flowParticles(R,under,{count:65,speed:.053,size:.029,layer:'interior'}),drip=R.points(52,{additive:true,layer:'interior'}),cloud=addAmbientClouds(R);let clock=0;
    return {
        preset:[.47,.62,40,[0,1,0]],
        markers:[marker(translate('石灰岩峰林'),'LIMESTONE TOWERS',[-6,final(-6,-4)+.7,-4],translate('峰体的侧壁、节理与坡顶有不同的细节。峰林由岩体被溶蚀分割而成，不是从平地长出。')),marker(translate('地下溶洞'),'DISSOLUTION CAVE',[.3,-.5,.9],translate('含二氧化碳的水沿裂隙溶蚀碳酸盐岩，可逐渐扩大地下通道。'),translate('剖面')),marker(translate('石钟乳与石笋'),'SPELEOTHEMS',[-2,-1,.95],translate('从洞顶向下的石钟乳、从洞底向上的石笋，主要由矿物沉积形成。'),translate('剖面')),marker(translate('地表河流'),'SURFACE WATER',[riverX(6),.57,6],translate('地表水与地下水可通过裂隙、落水洞和泉相互联系。'))],
        update(t,dt,s){
            top.morph=clamp(s.progress*(.7+s.params[0]*.55));riv.visible=top.morph>.89&&s.layers.water;forest.visible=top.morph>.70&&s.layers.vegetation;
            clock+=dt*(.35+s.params[1]);flow(clock);flow2(clock);
            for(let i=0;i<52;i++){const age=fract(clock*.24+i*.713),p=tips[i%tips.length];pointSet(drip,i,[p[0],mix(p[1],-2.18,age*age),p[2]],[.48,.8,.85],s.params[1]*.5*Math.sin(age*Math.PI),.020);}
            R.updatePoints(drip);cloud(t);
        },note:translate('打开剖面，观察凹入的洞壁、钟乳石、石笋、滴水和地下河。不同过程的时间尺度经过夸张。')
    };
}

function sceneDesert(R,S) {
    const yard=S.variant===1;
    const dune=(x,z)=>{
        const warp=Math.sin(z*.43)*.85+Math.sin(z*.16)*1.5+.12*Math.sin(z*1.1),u=fract((x+warp)/5.0);
        const profile=u<.77?Math.pow(u/.77,.83):Math.pow((1-u)/.23,1.36);
        return .23+profile*(1.47+fbm(x*.19,z*.24)*.92)+noise(x*8,z*8)*.015;
    };
    const yardFn=(x,z)=>{
        let h=.21+fbm(x*.63,z*.63)*.18;
        for(let k=-3;k<=3;k++){
            const shift=Math.sin(k*5)*1.7,xx=x+shift,width=.43*(1-smooth(-2,8,xx)*.42),axis=k*2.27+Math.sin(x*.23+k)*.14;
            const body=Math.exp(-Math.pow((z-axis)/width,4))*smooth(-9,-6,xx)*(1-smooth(2.6,8.8,xx));
            h+=body*(1.4+.8*(1-smooth(-5,2,xx))+.45*noise(xx*.9,k+z*.4));
        }return h;
    };
    const fn=yard?yardFn:dune,target=(x,z)=>yard?mix(yardFn(x,z),.25,.21):dune(x-1.45,z);
    const {top}=addBase(R,fn,{col:desertColor,target,n:328,m:244,material:yard?2:8});
    if(yard)addBoulders(R,fn,{count:130,filter:(x,z,h)=>h<.5,scale:.47});
    const sandParticles=R.points(640,{additive:true}),dust=R.points(42,{mode:3,layer:'clouds'}),rnd=random(249),seed=Array.from({length:640},()=>[rnd(),rnd(),rnd(),rnd()]);
    let clock=0;
    return {
        preset:[.50,.60,35,[0,.55,0]],
        markers:yard?[marker(translate('雅丹垄岗'),'YARDANG RIDGES',[-3,2.35,-2.15],translate('风蚀与其他侵蚀作用形成垄岗和沟槽；雅丹并不是沙丘。')),marker(translate('风蚀沟槽'),'EROSIONAL GROOVES',[3,.75,1.1],translate('垄岗沿主导风向延伸，具体形态也受岩性、水流等影响。'))]:[marker(translate('迎风坡'),'STOSS SLOPE',[-2,fn(-2,-1)+.2,-1],translate('颗粒在迎风侧向上搬运；细小波纹与沙丘主脊分属不同空间尺度。')),marker(translate('背风坡'),'SLIP FACE',[1.1,fn(1.1,2)+.25,2],translate('越过沙脊的沙粒在背风侧堆积、滑落，形成常较陡的坡面。')),marker(translate('沙脊迁移'),'DUNE MIGRATION',[5.3,fn(5.3,5)+.3,5],translate('迁移来自沙粒反复搬运和堆积；不是整个沙丘沿地面滑动。'))],
        update(t,dt,s){
            top.morph=s.progress;clock+=dt*(.36+s.params[0]*1.65);const wind=(s.params[1]-.5)*1.35;
            for(let i=0;i<640;i++){
                const [a,b,c,d]=seed[i],x=fract(a+clock*.064)*24-12,z=fract(b+(x+12)*Math.sin(wind)/24)*18-9;
                const ground=mix(fn(x,z),target(x,z),top.morph),jump=Math.abs(Math.sin((x+a)*11.7))*.19*c;
                pointSet(sandParticles,i,[x,ground+.025+jump,z],[.89,.72,.40],(.13+d*.16)*s.params[0],.010+c*.013);
            }R.updatePoints(sandParticles);
            for(let i=0;i<42;i++){
                const [a,b,c,d]=seed[i],x=fract(a+clock*.021)*24-12,z=b*18-9,h=mix(fn(x,z),target(x,z),top.morph);
                pointSet(dust,i,[x,h+.15+c*.5,z],[.65,.55,.35],s.params[0]*.022*Math.sin((x+12)/24*Math.PI),1.1+d*1.4);
            }R.updatePoints(dust);
        },
        note:translate('宽阔、缓起的迎风坡与陡落的背风坡；微小沙纹和跃移颗粒一起表现风的尺度。')
    };
}

function archGeo(legs=true){
 const g=new Geometry(),c=color('a5aaa1'),n=88,slices=12;
 // Irregular limestone arch: a genuinely open mesh, not a painted hole.
 for(let j=0;j<=slices;j++)for(let i=0;i<=n;i++)for(let ring=0;ring<2;ring++){
  let t=i/n*Math.PI,z=(j/slices-.5)*1.24,edge=Math.pow(Math.abs(z)/.62,2),r=(ring?1.88:1.05);
  r+=(noise(i*.29,j*.38)-.5)*.12+Math.sin(t*13+z*3)*.027;
  let x=Math.cos(t)*r*1.27,y=Math.sin(t)*r+1.15;
  y+=Math.sin(x*9.2+z)*.028+noise(x*3,z*3)*.04;
  let shade=.89+noise(x*2+z,y*5)*.13;g.vertex([x,y,z],[0,1,0],c.map(v=>v*shade),[j/slices,i/n]);
 }
 let row=(n+1)*2;
 for(let j=0;j<slices;j++)for(let i=0;i<n;i++)for(let r=0;r<2;r++){let a=j*row+i*2+r,b=a+row;g.indices.push(a,b,a+2,b,b+2,a+2);}
 for(let j of [0,slices])for(let i=0;i<n;i++){let a=j*row+i*2;g.indices.push(a,a+2,a+3,a,a+3,a+1);}
 for(let i of [0,n])for(let j=0;j<slices;j++){let a=j*row+i*2;g.indices.push(a,a+1,a+row+1,a,a+row+1,a+row);}
 recomputeNormals(g);
 if(legs){for(let side of [-1,1])g.merge(coastalStackGeo(side+8),[side*1.87,-.40,0],[.73,.55,.78]);}
 return g;
}
function coastalStackGeo(seed=9){
 let g=new Geometry(),rnd=random(seed),sides=29,levels=38,c=color('a0a69b'),phase=rnd()*TAU;
 for(let j=0;j<=levels;j++)for(let i=0;i<=sides;i++){
  let u=j/levels,a=i/sides*TAU,profile=.62+.19*Math.sin(u*3.3+.4)+.12*noise(u*6,seed);
  let taper=1.-Math.pow(u,6)*.13,flute=.92+.08*Math.sin(a*7+phase)+.035*Math.sin(a*13+u*4);
  let band=1.+.025*Math.sin(u*48+phase),r=profile*taper*flute*band;
  let p=[Math.cos(a)*r,3.1*u+(u===1?.06*Math.sin(a*5+phase):0),Math.sin(a)*r*.77];
  g.vertex(p,[Math.cos(a),.04,Math.sin(a)],c.map(v=>v*(.84+.15*noise(a*2,u*19))),[i/sides,u]);
 }
 for(let j=0;j<levels;j++)for(let i=0;i<sides;i++){let a=j*(sides+1)+i,b=a+sides+1;g.indices.push(a,a+1,b,b,a+1,b+1);}
 let cap=g.vertex([0,3.12,0],[0,1,0],color('a8b395'));
 for(let i=0;i<sides;i++)g.indices.push(cap,levels*(sides+1)+i,levels*(sides+1)+i+1);
 return recomputeNormals(g);
}

function sceneCoast(R,S){
 const shore=z=>.65+Math.sin(z*.48)*.68+Math.sin(z*1.31)*.16;
 const fn=(x,z)=>{let top=2.4+fbm(x*.37,z*.37)*.85+(mountainRelief(x*.65,z*.65)-.5)*.23;
  let lip=shore(z),cliff=top-(.045*Math.sin(z*16)+.03*noise(z*13,x*2))*smooth(lip-.45,lip-.05,x);
  let h=mix(cliff,-.56-smooth(lip+.4,12,x)*2.1,smooth(lip-.20,lip+.23,x));
  return h+.055*noise(x*6,z*6)*(1.-smooth(lip-.4,lip+.3,x));};
 addBase(R,fn,{col:(x,z,y,n)=>y<.15?color('738575'):n[1]<.72?cmix(color('8b948b'),color('b1ada0'),noise(x*2,y*9)) : greenColor(x,y,z,n),n:324,m:244});
 let sea=R.mesh(heightGeo(()=>.18,()=>color('297a88'),{n:192,m:144}),{type:1,cast:false,layer:'water'});
    const oceanEdge=addWaterEdge(R,.18);
 addForest(R,fn,{count:770,filter:(x,z)=>x<shore(z)-1.1,scale:.57});
 addBoulders(R,fn,{count:450,filter:(x,z)=>x<shore(z)-.15,scale:.63});
 const cap=R.mesh(archGeo(false),{type:2,model:transform([4,0,-2]),layer:'land'}),legs=[];
 for(let sign of [-1,1])legs.push(R.mesh(coastalStackGeo(sign+11),{type:2,model:transform([4+sign*1.88,-.35,-2],[.77,.53,.9]),layer:'land'}));
 const stacks=[];
 for(let [x,z,s,h] of [[5.1,3.7,.83,1.06],[8.2,5.6,.52,.66],[2.2,-6.6,.65,.77],[3,7,.45,.4],[10,-4,.36,.3]])
  stacks.push(R.mesh(coastalStackGeo(Math.round(x*17)),{type:2,model:transform([x,-.25,z],[s,h,s]),layer:'land'}));
 // A broad wave packet approaches the same shoreline; no abrupt replacement lines.
 const crests=[];
 for(let k=0;k<7;k++){
  let points=Array.from({length:100},(_,j)=>[0,.21,-9+j/99*18]);
  crests.push(R.mesh(ribbonGeo(points,.20,color('c7e7df'),180,4),{type:12,alpha:.24,cast:false,layer:'water'}));
 }
 let spray=R.points(230,{mode:2,layer:'motion'}),cloud=addAmbientClouds(R),debris=[];
 const rnd=random(412);
 for(let i=0;i<11;i++){
  let x=2.7+rnd()*2.6,y=1.55+rnd()*.8,z=-2+(rnd()-.5)*.9,size=.12+rnd()*.18;
  let m=R.mesh(rockGeo(100+i),{type:2,model:transform([x,y,z],[size,size,size]),cast:false,layer:'motion'});
  debris.push({m,x,y,z,size,r:rnd()*TAU});
 }
 let clock=0;
 const marks=[marker(translate('海蚀崖'),'SEA CLIFF',[.9,3.1,3.5],translate('海浪与风化等共同侵蚀岸坡，使海岸线逐渐后退。')),marker(translate('海蚀拱'),'SEA ARCH',[4,3.1,-2],translate('海蚀洞贯通岬角后可形成海蚀拱。拖动演化阶段观察拱顶坍塌，留下残留岩柱。')),marker(translate('海蚀柱'),'SEA STACK',[5.1,3.1,3.7],translate('与陆地分离的残留岩柱仍会继续受到侵蚀，不是演化的终点。')),marker(translate('近岸波浪'),'BREAKING WAVES',[8,.4,1],translate('波浪向岸传播，近岸水深、浪高与岩岸形态共同影响破碎。白色泡沫用于提示过程。'))];
 return {preset:[.66,.61,37,[0,.8,0]],markers:marks,update(t,dt,s){
  clock+=dt*(.38+s.params[0]*.72);let tide=(s.params[1]-.5)*.55;
  sea.amplitude=.25+s.params[0]*1.6;sea.model=transform([0,tide,0]);oceanEdge.amplitude=tide;
  let fall=smooth(.59,.76,s.progress),disappear=smooth(.68,.78,s.progress);
  cap.model=transform([4,-fall*2.5,-2+fall*.35],[1,1-fall*.32,1],fall*.12);
  cap.alpha=1-disappear;cap.cast=cap.alpha>.95;
  marks[1].p=[4,Math.max(.35,3.1-fall*2.5),-2];
  debris.forEach((o,i)=>{let p=clamp((s.progress-.61-i*.003)/.17),flight=Math.sin(p*Math.PI);o.m.model=transform([o.x+(o.x-4)*p*.5,Math.max(-.48,o.y-p*p*3.8)+flight*.35,o.z+Math.sin(o.r)*p*.8],[o.size,o.size,o.size],o.r+p*2);o.m.alpha=smooth(.6,.64,s.progress);});
  crests.forEach((m,i)=>{let u=fract(clock*.105+i/7),x=12-u*10.9;m.model=transform([x,tide+Math.sin(clock*1.3+i)*.012,0]);m.alpha=Math.pow(Math.sin(u*Math.PI),1.4)*(.12+s.params[0]*.15);});
  for(let i=0;i<spray.count;i++){let z=i/spray.count*18-9,u=fract(clock*.86+i*.137),y=.18+tide+Math.sin(u*Math.PI)*(.25+s.params[0]*.63);pointSet(spray,i,[shore(z)+.28+u*.65,y,z+.08*Math.sin(i)],[.68,.87,.85],Math.sin(u*Math.PI)*.4,.025+u*.018);}
  R.updatePoints(spray);cloud(t);
 },note:translate('观察岩岸断面、海蚀拱的空洞和逐渐下坠的拱顶。青绿浅水、近岸泡沫与深海颜色连续过渡。')};
}

function arrowGeo(from,to,y,z,co){let g=new Geometry(),dir=Math.sign(to-from),s=.3;g.quad([from,y,z-s],[to-dir*.8,y,z-s],[to-dir*.8,y,z+s],[from,y,z+s],co);g.triangle([to,y,z],[to-dir*1.2,y,z+.8],[to-dir*1.2,y,z-.8],co);return g;}
function sceneTectonics(R,S){
 const variant=S.variant||0,flat=(x,z)=>.64+fbm(x*.38,z*.38)*.32;
 const fold=(x,z)=>gauss(x,z,0,0,5.4,20)*(1.54+Math.cos(x*1.26)*1.05+mountainRelief(x*.8,z*.8)*1.36);
 const final=(x,z)=>flat(x,z)+fold(x,z);let top,moving=[],fissure=null;
 if(variant===0){
  let b=addBase(R,flat,{target:final,col:alpineColor,n:312,m:234});top=b.top;
  b.sides.visible=false;b.sides.alwaysHidden=true;
  // The entire sedimentary column bends, not just its outer contour.
  let g=strataGeo(flat,{n:244});
  for(let i=0;i<g.p.length/3;i++){
   let x=g.p[i*3],y=g.p[i*3+1],z=g.p[i*3+2];
   g.p2[i*3+1]=y+fold(x,z)*smooth(-3.05,.35,y);
   g.p2[i*3]=x*(1-.055*gauss(x,z,0,0,8,30)*smooth(-3,.4,y));
  }
  let layers=R.mesh(recomputeNormals(g),{type:2,layer:'strata'});moving.push(layers);
  addBoulders(R,final,{count:570,scale:.61});
  addForest(R,final,{count:510,filter:(x,z,h)=>Math.abs(x)>4.1,scale:.52});
 }else{
  R.mesh(heightGeo(()=>-3.35,()=>color('183b46'),{w:65,d:65,n:2,m:2}),{type:6,alpha:.6,cast:false,layer:'grid'});
  for(let sign of [-1,1]){
   const local=(x,z)=>{let worldX=x+sign*5.9,edge=Math.abs(worldX);
    let terrace=.45+.22*fbm(worldX*.38,z*.38)+mountainRelief(worldX*.6,z*.6)*.28;
    if(variant===1)terrace+=gauss(worldX,z,sign*1.1,0,1.25,18)*(.38+.38*mountainRelief(worldX,z));
    else terrace+=.2*smooth(0,1,edge)*Math.sin(z*.32+worldX*.2);
    return terrace;};
   let a=R.mesh(heightGeo(local,greenColor,{w:11.5,d:18,n:178,m:240}),{model:transform([sign*5.9,0,0]),layer:'land'});
   let b=R.mesh(strataGeo(local,{w:11.5,n:224}),{model:transform([sign*5.9,0,0]),type:2,layer:'strata'});
   a.sign=b.sign=sign;moving.push(a,b);
   let rnd=random(sign+113),rocks=[];
   for(let i=0;i<180;i++){let x=(rnd()-.5)*11.1,z=(rnd()-.5)*17.4,sz=.04+rnd()*.10;rocks.push({p:[x,local(x,z),z],s:[sz,sz*.7,sz],r:rnd()*TAU});}
   let stones=R.instances(rockGeo(77),rocks,{type:2,layer:'land'});stones.sign=sign;moving.push(stones);
  }
  if(variant===1)fissure=R.mesh(heightGeo(()=>-1.5,()=>color('fe6635'),{w:6,d:18,n:40,m:120}),{type:3,cast:false,layer:'motion',amplitude:.7});
 }
 const arrows=[];
 if(variant!==2){arrows.push(R.mesh(arrowGeo(-10,-5,3.25,5.9,color('70dce0')),{type:7,layer:'motion',cast:false}));arrows.push(R.mesh(arrowGeo(10,5,3.25,5.9,color('f5bb70')),{type:7,layer:'motion',cast:false}));}
 else{for(let sign of [-1,1])arrows.push(R.mesh(arrowGeo(-4,3,2.2,0,color(sign>0?'70dce0':'f5bb70')),{type:7,layer:'motion',cast:false,model:transform([sign*4,0,0],[1,1,1],sign*Math.PI/2)}));}
 let rings=[];for(let i=0;i<4;i++)rings.push(R.mesh(ringGeo(0,variant===0?3.95:.9,0,1,1.025,color('e5c793')),{type:7,alpha:.45,cast:false,layer:'motion'}));
 return {preset:[.36,.44,37,[0,.35,0]],markers:variant===0?[marker(translate('岩层褶皱'),'FOLDED STRATA',[-1,1.9,8.9],translate('受到挤压时，岩层可能发生弯曲。地表形态不一定与背斜、向斜简单对应。')),marker(translate('地壳缩短与抬升'),'SHORTENING & UPLIFT',[0,3.9,-1],translate('大陆碰撞可造成地壳缩短、增厚与山脉抬升。模型夸大了形变。')),marker(translate('构造应力'),'TECTONIC STRESS',[-7,3.3,5.9],translate('箭头表示相对运动方向，不代表真实移动速度。'))]:variant===1?[marker(translate('离散边界'),'DIVERGENT BOUNDARY',[0,1.2,0],translate('板块相互分离；在海底扩张中心，岩浆可上升并形成新的洋壳。')),marker(translate('裂谷'),'RIFT',[0,-.3,6],translate('张裂可产生断裂与地表凹陷。这里用简化的板块平移展示关系。'))]:[marker(translate('转换边界'),'TRANSFORM BOUNDARY',[0,1,0],translate('板块沿边界水平错动。理想转换边界既不生成也不消耗岩石圈。')),marker(translate('断层错动'),'FAULT SLIP',[0,.9,6],translate('断层的滑动可释放积累的弹性应变能并产生地震。'))],update(t,dt,s){
  if(top){top.morph=s.progress*(.5+s.params[0]*.5);moving[0].morph=top.morph;}
  else for(let m of moving)m.model=transform([m.sign*(5.9+(variant===1?s.progress*(.55+s.params[0]*1.3):0)),0,variant===2?m.sign*s.progress*(.6+s.params[0]*2):0]);
  arrows.forEach((m,i)=>{if(variant!==2)m.model=transform([Math.sin(t*.65)*.10*(i?1:-1),0,0],[variant===1?-1:1,1,1]);});
  rings.forEach((r,i)=>{let q=fract(t*.16+i*.25),sc=.6+q*4.2;r.model=transform([0,0,0],[sc,1,sc]);r.alpha=Math.sin(q*Math.PI)*s.params[1]*.23;});
  if(fissure){fissure.amplitude=.45+s.params[0]*.36;R.heat=.5;R.heatPos=[0,-.8,0];}
 },note:translate('三种边界各有独立模型。褶皱岩层连续形变；板块错动和张裂可由时间轴逐步观察。')};
}

function sceneWater(R,S){
 const route=z=>-3.8+(z+3)*1.02+Math.sin((z+3)*.6)*.24;
 const fn=(x,z)=>{let peak=6.7*gauss(x,z,-5,-3.9,4.7,4.2)*(.70+mountainRelief(x*.72,z*.72)*.35);
  let h=.38+fbm(x*.4,z*.4)*.42+peak,channel=Math.exp(-Math.pow((x-route(z))/.37,2));
  h-=channel*.22*smooth(-3.2,-2.2,z)*(1-smooth(3.8,5,z));
  return mix(h,-.40,smooth(4.1,7,x));};
 addBase(R,fn,{col:alpineColor,n:320,m:240});
 let sea=R.mesh(heightGeo(()=>.15,()=>color('267f96'),{n:160,m:120}),{type:1,cast:false,layer:'water'});
    const oceanEdge=addWaterEdge(R,.15);
 addForest(R,fn,{count:970,filter:(x,z,h)=>x<3&&Math.abs(x-route(z))>.63,scale:.56});addBoulders(R,fn,{count:490,scale:.62});
 const vapor=[[9,.25,2],[9,2.3,1],[7.8,5.6,-.4],[5.4,7.9,-1.3],[.3,8.5,-2.2],[-4.5,8.3,-2.8]];
 let runoff=Array.from({length:100},(_,i)=>{let z=-3+i/99*7.8,x=route(z);return [x,Math.max(.17,fn(x,z)+.046),z];});
 let water=R.mesh(surfaceRibbonGeo(runoff,u=>.20+u*.29,color('48b2b5'),(x,z)=>Math.max(.17,fn(x,z)),.048,290,10),{type:1,waterMode:1,cast:false,layer:'water'});
 let evaporate=flowParticles(R,vapor,{count:150,speed:.09,co:color('f4c784'),spread:.48,size:.055});
 let rain=R.points(260,{mode:2,layer:'motion'}),cloud=R.points(95,{mode:3,layer:'clouds'}),rnd=random(744),cs=Array.from({length:95},()=>[rnd(),rnd(),rnd()]);
 let rainSeed=Array.from({length:260},()=>[rnd(),rnd(),rnd()]);
 let flow=flowParticles(R,runoff,{count:150,speed:.09,size:.045}),vaporTime=0,rainTime=0;
 return {preset:[.5,.55,40,[0,2.1,0]],markers:[marker(translate('蒸发'),'EVAPORATION',[9,2.5,2],translate('液态水转为水蒸气进入大气。黄色粒子只是用来显示不可见的水汽。')),marker(translate('水汽输送与凝结'),'TRANSPORT & CONDENSATION',[1,8.6,-2],translate('空气中的水汽随大气运动输送；冷却达到适当条件时可凝结成云滴或冰晶。')),marker(translate('降水'),'PRECIPITATION',[-5,6.8,-2.5],translate('云中水滴或冰晶增长后，可能以雨、雪等形式落向地表。')),marker(translate('径流'),'RUNOFF',[1,.9,2.7],translate('水以地表和地下径流等方式运动。这里突出海陆间水循环的一条路径。'))],update(t,dt,s){
  vaporTime+=dt*(.3+s.params[0]);rainTime+=dt*(.5+s.params[1]);evaporate(vaporTime,s.params[0]);flow(rainTime,.45+s.params[1]);water.amplitude=.3+s.params[1]*.65;
  for(let i=0;i<rain.count;i++){let [a,b,c]=rainSeed[i],x=-5.1+(a-.5)*5.7,z=-2.8+(c-.5)*2.9,u=fract(rainTime*.44+b),ground=fn(x,z)+.07,y=mix(8.3,ground,u);pointSet(rain,i,[x+.08*u,y,z],[.65,.81,.88],Math.sin(u*Math.PI)*s.params[1]*.46,.023);}
  R.updatePoints(rain);
  for(let i=0;i<95;i++){let [a,b,c]=cs[i],swell=Math.sin(a*Math.PI);pointSet(cloud,i,[-5.2+(a-.5)*6.3+.12*Math.sin(t*.055),8.05+b*.95*swell,-2.6+(c-.5)*2.5],[.74,.79,.79],.12+s.params[1]*.055,.75+swell*.8+b*.35);}
  R.updatePoints(cloud);
 },note:translate('黄色水汽、细雨与贴合坡面的径流同时运动；调节蒸发与降水时，粒子速度平滑变化而不重新跳位。')};
}

function sceneEarth(R,S){
 R.mesh(heightGeo(()=>-6.8,()=>color('183b46'),{w:55,d:55,n:2,m:2}),{type:6,alpha:.5,cast:false,layer:'grid'});
 const radii=[5.9,5.7,3.25,1.53],palette=['487f97','ae6746','df9c47','ffd384'].map(color),part=TAU*.75,meshes=[];
 for(let k=0;k<4;k++){
  let g=sphereGeo(radii[k],palette[k],156,104,0,part);
  if(k===0){
   for(let i=0;i<g.p.length/3;i++){
    let x=g.p[i*3]/radii[0],y=g.p[i*3+1]/radii[0],z=g.p[i*3+2]/radii[0],lon=Math.atan2(z,x),lat=Math.asin(clamp(y,-1,1));
    let continental=fbm(x*3.2+8,z*3.2+y*2.8)+.14*Math.sin(lon*2.4+lat*3.1);
    let land=smooth(.48,.54,continental),mountain=Math.pow(mountainRelief(x*11+y*7,z*11-y*5),2);
    let terrain=cmix(color('4f705b'),color('b6ac83'),smooth(.16,.54,continental)*.6+mountain*.26);
    let arid=smooth(.12,.33,Math.abs(lat))*(1-smooth(.40,.68,Math.abs(lat)))*noise(lon*3+2,lat*4);
    terrain=cmix(terrain,color('a8a177'),arid*.6);
    let c=cmix(color('255d79'),terrain,land);c=cmix(c,color('d4e1de'),smooth(1.04,1.34,Math.abs(lat)+noise(x*10,z*10)*.1));
    let r=radii[0]+land*(.012+mountain*.048);
    for(let a=0;a<3;a++){g.p[i*3+a]*=r/radii[0];g.p2[i*3+a]=g.p[i*3+a];g.c[i*3+a]=c[a];}
   }
  }
  meshes.push(R.mesh(g,{type:k===0?11:0,emissive:k===3?.3:0,layer:'land'}));
  const ring=new Geometry(),r1=k===3?0:radii[k+1],r0=radii[k],angular=174,radial=k===0?3:30;
  for(let side of [0,part]){
   let start=ring.p.length/3;
   for(let j=0;j<=angular;j++)for(let i=0;i<=radial;i++){
    let t=j/angular*Math.PI,u=i/radial,r=mix(r1,r0,u),p=[Math.sin(t)*r*Math.cos(side),Math.cos(t)*r,Math.sin(t)*r*Math.sin(side)];
    let pattern=.9+.1*noise(t*4,u*9+k*7),co=palette[k].map(v=>v*pattern);
    let n=[-Math.sin(side),0,Math.cos(side)];if(side===0)n=vmul(n,-1);
    ring.vertex(p,n,co,[u,j/angular]);
   }
   for(let j=0;j<angular;j++)for(let i=0;i<radial;i++){let a=start+j*(radial+1)+i,b=a+radial+1;ring.indices.push(a,a+1,b,b,a+1,b+1);}
  }
  meshes.push(R.mesh(ring,{layer:'land',type:7,emissive:k===3?.12:0}));
 }
 const cloud=R.mesh(sphereGeo(6.015,color('e4edeb'),150,96,0,part),{type:13,alpha:.55,cast:false,layer:'clouds'});
 const air=R.mesh(sphereGeo(6.13,color('62a7cf'),150,96,0,part),{type:14,alpha:.32,cast:false,layer:'clouds'});
 meshes.push(cloud,air);
 R.mesh(ringGeo(0,-6.65,0,7.35,7.38,color('52929c')),{type:7,alpha:.4,cast:false,layer:'grid'});
 const marks=[marker(translate('地壳'),'CRUST',[5.3,2.6,-.1],translate('最外层固体岩石外壳，厚度相对地球半径很小。这里显著夸大了地壳厚度。')),marker(translate('地幔'),'MANTLE',[3.9,1,-.1],translate('地幔绝大部分是固态岩石，但在地质时间尺度上可以发生缓慢的塑性流动。')),marker(translate('外核'),'OUTER CORE',[2,-1,-.1],translate('外核主要为液态铁合金。不能把外核、地幔与火山岩浆储集区混为一谈。')),marker(translate('内核'),'INNER CORE',[.3,.35,-.1],translate('内核主要为固态铁合金。高温不必然意味着液态，压力同样重要。'))],positions=marks.map(m=>[...m.p]);
 return {preset:[2.2,.28,26,[0,0,0]],markers:marks,update(t,dt,s){
  let a=(s.params[0]-.5)*1.6;for(let m of meshes)m.model=transform([0,0,0],[1,1,1],a);
  marks.forEach((m,i)=>{let p=positions[i];m.p=[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];});
 },note:translate('高细分球面、程序化地表与缓慢流动的云层。地壳厚度夸大；大陆不是实际测绘地图。')};
}

const SCENES={atlas:sceneAtlas,volcano:sceneVolcano,tectonics:sceneTectonics,river:sceneRiver,glacier:sceneGlacier,karst:sceneKarst,desert:sceneDesert,coast:sceneCoast,water:sceneWater,earth:sceneEarth};


// ---- app.js ----
/* Application state, classroom controls and accessible interface. */
const $=id=>document.getElementById(id), $$=selector=>[...document.querySelectorAll(selector)];
const App={renderer:null,camera:null,world:null,chapter:null,frame:0,loading:false,buildId:0,selected:-1,labelRects:[],fps:0,lastFrame:0,tour:null,orbit:false,panel:'experiment'};
const State={id:'atlas',variant:0,params:[.72,.65],progress:.52,time:0,playing:true,evolving:false,speed:1,cutaway:false,night:0,layers:{vegetation:true,water:true,strata:true,motion:true,clouds:true,labels:true}};
let toastTimer=0,lastFocus=null,modalPriorPlay=true;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800)}
function paintIcon(id,name){$(id).innerHTML=icon(name)}
function initializeIcons(){document.querySelector('.brand-symbol').innerHTML=icon('mountain');document.querySelector('#presentationBtn .button-icon').innerHTML=icon('book');for(let [id,name] of Object.entries({menuBtn:'menu',fullscreenBtn:'expand',resetCamera:'reset',topView:'layers',orbitBtn:'earth',captureBtn:'camera',replayBtn:'reset',nextChapter:'chevron',resetParams:'reset',cutIcon:'layers',searchIcon:'search',closeModal:'close'}))paintIcon(id,name);}
function updateAccent(c){let a=color(c);document.documentElement.style.setProperty('--accent',c);document.documentElement.style.setProperty('--accent-rgb',a.map(x=>Math.round(x*255)).join(','))}
function renderNav(query=''){let group='',html='',q=query.trim().toLowerCase();for(let [i,c] of CHAPTERS.entries()){if(q&&![c.title,c.short,c.subtitle,c.intro,c.en,c.group,...c.variants].join(' ').toLowerCase().includes(q))continue;if(c.group!==group){group=c.group;html+=`<div class="nav-group">${group}</div>`}html+=`<button class="chapter-link ${c.id===State.id?'active':''}" data-chapter="${c.id}" aria-current="${c.id===State.id?'page':'false'}" title="${c.short}">${icon(c.icon)}<span><span class="chapter-name">${c.short}</span><span class="chapter-en">${c.id.toUpperCase()} · 3D</span></span><span class="chapter-index">${String(i).padStart(2,'0')}</span></button>`;}if(!html)html=translate('<p style="padding:18px;color:#799aaa;font-size:11px">没有找到相应章节。</p>');$('chapterNav').innerHTML=html;$$('#chapterNav [data-chapter]').forEach(b=>b.addEventListener('click',()=>loadChapter(b.dataset.chapter)));}
function showLoading(value){$('loading').classList.toggle('loaded',!value||(value&&App.transitionActive));App.loading=value;}
function captureTransition(){
 const src=$('scene'),cv=$('sceneTransition');App.transitionActive=false;
 if(!App.world||App.frame<1||!cv||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 try{cv.width=src.width;cv.height=src.height;cv.getContext('2d').drawImage(src,0,0);cv.style.transition='none';cv.style.opacity='1';App.transitionActive=true;}
 catch{cv.style.opacity='0';}
}
function finishTransition(){
 if(!App.pendingReveal)return;App.pendingReveal=false;
 const cv=$('sceneTransition');if(cv){cv.style.transition='opacity 650ms cubic-bezier(.22,1,.36,1)';cv.style.opacity='0';}
 document.querySelector('.hero').classList.remove('chapter-enter');void document.querySelector('.hero').offsetWidth;
 document.querySelector('.hero').classList.add('chapter-enter');App.transitionActive=false;
}
function smoothRenderState(dt){
 const visual=App.visual||(App.visual={progress:State.progress,params:[...State.params]});
 const f=1-Math.exp(-dt*17),p=1-Math.exp(-dt*12);
 visual.progress=mix(visual.progress,State.progress,f);
 if(Math.abs(visual.progress-State.progress)<.00005)visual.progress=State.progress;
 for(let i=0;i<State.params.length;i++){visual.params[i]=mix(visual.params[i],State.params[i],p);if(Math.abs(visual.params[i]-State.params[i])<.00005)visual.params[i]=State.params[i];}
 return {...State,progress:visual.progress,params:visual.params};
}
function setHash(id){try{history.replaceState(null,'','#'+id)}catch{}}
async function loadChapter(id,{variant=0,keep=false,record=null,touring=false}={}){
 const c=CHAPTERS.find(x=>x.id===id);if(!c||!App.renderer)return false;const token=++App.buildId;captureTransition();showLoading(true);if(!touring)stopTour();App.orbit=false;$('orbitBtn').classList.remove('active');$('orbitBtn').setAttribute('aria-pressed','false');App.selected=-1;$('observation').classList.add('closed');$('labels').innerHTML='';$('leaders').innerHTML='';
 State.id=id;State.variant=clamp(Math.floor(variant),0,Math.max(0,c.variants.length-1));if(!keep){State.params=[...c.values];State.progress=id==='glacier'?.84:id==='karst'?1:id==='river'?.72:.52;State.time=0;State.evolving=false;State.playing=true;State.cutaway=false;}
 if(record){State.params=[...record.params];State.progress=record.progress;State.cutaway=!!record.cutaway&&c.cut;State.night=record.night||0;State.layers={...State.layers,...record.layers};}
 App.chapter=c;updateAccent(c.accent);updateChapterUI();renderNav($('search').value);setHash(id);$('sidebar').classList.remove('open');$('inspector').classList.remove('open');
 await new Promise(resolve=>setTimeout(resolve,40));if(token!==App.buildId)return false;
 try{App.renderer.clearScene();App.world=SCENES[id](App.renderer,State);App.visual={progress:State.progress,params:[...State.params]};App.pendingReveal=true;App.renderer.cut=.1;App.renderer.night=State.night;const p=[...App.world.preset];if(innerWidth<820)p[2]*=innerWidth<480?1.47:1.1;App.camera.preset(...p);App.world.presetResponsive=p;createLabels();renderLayerControls();applyLayers();$('sceneHint').textContent=App.world.note;$('sceneBadge').textContent=translate('实时三维 · ')+(id==='earth'?translate('精细圈层'):translate('精细地形'))+' / V2';renderTeaching();showLoading(false);updateTransport();if(!keep)setTimeout(()=>{if(State.id===id&&App.selected<0&&!App.tour)showObservation(-1)},500);return true;}catch(error){showLoading(false);showError(error);console.error(error);return false;}
}
function updateChapterUI(){const c=App.chapter,i=CHAPTERS.indexOf(c);$('chapterNumber').textContent='CHAPTER '+String(i).padStart(2,'0');$('category').textContent=c.group;$('sceneTitle').textContent=c.title;$('englishTitle').textContent=c.en;$('sceneSubtitle').textContent=c.subtitle;$('variants').innerHTML=c.variants.map((v,j)=>`<button data-variant="${j}" class="${j===State.variant?'active':''}" aria-pressed="${j===State.variant}">${v}</button>`).join('');$$('[data-variant]').forEach(b=>b.addEventListener('click',()=>loadChapter(State.id,{variant:Number(b.dataset.variant),keep:true})));
 let labels=[...c.params];if(c.id==='river'&&State.variant===2)labels=[translate('泥沙供应示意'),translate('河道流动示意')];if(c.id==='river'&&State.variant===1)labels[0]=translate('谷地切入程度');
 $('params').innerHTML=labels.map((label,j)=>translate(`<div class="param"><div class="param-top"><label for="param${j}">${label}</label><output id="output${j}" for="param${j}">${Math.round(State.params[j]*100)}</output></div><input type="range" id="param${j}" data-param="${j}" min="0" max="100" value="${Math.round(State.params[j]*100)}" style="--progress:${State.params[j]*100}%"><div class="param-help">${j===0?translate('弱'):translate('低')} <span style="float:right">${j===0?translate('强'):translate('高')} · 相对值</span></div></div>`)).join('');$$('[data-param]').forEach(e=>e.addEventListener('input',()=>setParam(+e.dataset.param,+e.value/100)));
 $('cutRow').hidden=!c.cut;$('cutaway').checked=State.cutaway;$('mainAction').innerHTML=icon('play')+'<span>'+c.action+'</span>';$('question').textContent=c.question;$('answer').textContent=c.answer;$('answer').hidden=true;$('revealAnswer').textContent=translate('展开思考 →');let stages=[...c.stages];if(c.id==='river'&&State.variant===2)stages=[translate('泥沙入海'),translate('沉积开始'),translate('分流河道'),translate('三角洲增长'),translate('沉积前缘')];if(c.id==='coast')stages=c.stages;
 $('stages').innerHTML=stages.map((s,i)=>translate(`<button data-stage="${i}" title="前往：${s}">${s}</button>`)).join('');$$('[data-stage]').forEach(b=>b.addEventListener('click',()=>setProgress(+b.dataset.stage/4,true)));$('timeline').value=State.progress*100;syncTimeline();$$('[data-light]').forEach(b=>b.classList.toggle('active',Number(b.dataset.light)===State.night));}
function setParam(i,v){State.params[i]=clamp(v);let input=$('param'+i),out=$('output'+i);if(input){input.value=Math.round(v*100);input.style.setProperty('--progress',Math.round(v*100)+'%')}if(out)out.textContent=Math.round(v*100);}
function setProgress(v,manual=false){State.progress=clamp(v);if(manual){State.evolving=false;stopTour();if(State.id==='earth'&&App.world){let idx=Math.min(3,Math.max(0,Math.round(v*4)-1));showObservation(idx);focusMarker(idx);}if(State.id==='water'&&App.world){let idx=Math.min(3,Math.round(v*3));showObservation(idx);focusMarker(idx);}}syncTimeline();}
function syncTimeline(){let v=State.progress*100;$('timeline').value=v;$('timeline').style.setProperty('--progress',v+'%');$('timelineValue').textContent=Math.round(v)+'%';$$('[data-stage]').forEach(b=>b.classList.toggle('active',+b.dataset.stage===Math.min(4,Math.floor(State.progress*4+.3))));}
function renderLayerControls(){const existing=new Set([...App.renderer.meshes,...App.renderer.particles].map(m=>m.layer));existing.add('labels');const entries=[['vegetation',translate('植被'),'mountain'],['water',translate('水与冰'),'drop'],['strata',translate('岩层'),'layers'],['motion',translate('动态粒子'),'wind'],['clouds',translate('云雾 / 灰'),'wave'],['labels',translate('地貌标记'),'eye']];$('layerControls').innerHTML=entries.filter(([id])=>existing.has(id)).map(([id,title,ic])=>`<label class="switch-row"><span>${icon(ic)}${title}</span><input type="checkbox" data-layer="${id}" aria-label="${title}" ${State.layers[id]?'checked':''}><i></i></label>`).join('');$$('[data-layer]').forEach(e=>e.addEventListener('change',()=>{State.layers[e.dataset.layer]=e.checked;applyLayers()}));}
function applyLayers(){if(!App.renderer)return;App.renderer.clip=State.cutaway?1:0;for(let obj of [...App.renderer.meshes,...App.renderer.particles]){if(obj.layer==='interior')obj.visible=State.cutaway;else if(obj.layer in State.layers)obj.visible=State.layers[obj.layer];}if(App.world&&State.id==='tectonics'&&State.variant===0){ // The original flat side is replaced by a deforming stratigraphy mesh.
 const strata=App.renderer.meshes.filter(m=>m.layer==='strata');if(strata.length>2)strata[0].visible=false;
 }$('labels').style.display=State.layers.labels?'':'none';$('leaders').style.display=State.layers.labels?'':'none';}
function createLabels(){let markers=App.world.markers;$('labels').innerHTML=markers.map((m,i)=>translate(`<button class="hotspot" data-hotspot="${i}" style="visibility:hidden;${m.color?'border-color:'+m.color:''}" aria-label="观察${m.label}" aria-pressed="false"><strong>${m.label}</strong><small>${m.en}</small></button>`)).join('');$$('[data-hotspot]').forEach(b=>b.addEventListener('click',()=>{let i=+b.dataset.hotspot,m=markers[i];if(State.id==='atlas'&&SCENES[m.tag])loadChapter(m.tag);else{showObservation(i);focusMarker(i);}}));}
function focusMarker(i){if(!App.world)return;let m=App.world.markers[i];if(!m)return;if(m.tag===translate('剖面')&&App.chapter.cut&&!State.cutaway){State.cutaway=true;$('cutaway').checked=true;applyLayers();}let dist=State.id==='earth'?22:Math.max(19,App.world.preset[2]*.68);if(innerWidth<480)dist*=1.3;let p=m.p;App.camera.preset(App.camera.want.az,Math.max(.36,App.camera.want.el),dist,[p[0]*.5,p[1]*.6,p[2]*.4]);App.orbit=false;$('orbitBtn').classList.remove('active');}
function showObservation(i){if(!App.world)return;App.selected=i;let m=i>=0?App.world.markers[i]:null;$('observeKicker').textContent=m?(m.tag===translate('剖面')?translate('深入地球内部'):translate('停下来，仔细观察')):translate('开始你的地貌探索');$('observeTitle').textContent=m?m.label:App.chapter.short;$('observeText').textContent=m?m.desc:App.chapter.intro;$('observation').classList.remove('closed');$$('[data-hotspot]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.hotspot===i)));}
function placeLabels(){if(!App.world||!State.layers.labels)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight,rects=[],paths=[],buttons=$$('[data-hotspot]'),mobile=innerWidth<820,heroW=mobile?280:Math.min(440,w*.53),heroH=App.chapter.variants.length?190:170;
 const forbidden=[{x:8,y:5,w:heroW,h:heroH},{x:w-160,y:0,w:160,h:70}];if(!$('observation').classList.contains('closed')){let r=$('observation');forbidden.push({x:r.offsetLeft,y:r.offsetTop,w:r.offsetWidth,h:r.offsetHeight});}
 const collide=(r,a)=>!(r.x+r.w+8<a.x||r.x>a.x+a.w+8||r.y+r.h+5<a.y||r.y>a.y+a.h+5);
 App.labelRects=[];for(let i=0;i<buttons.length;i++){let b=buttons[i],m=App.world.markers[i];if((m.tag===translate('剖面')&&!State.cutaway)||(State.cutaway&&m.tag!==translate('剖面')&&m.p[2]>.1)){b.style.visibility='hidden';continue}let p=project(m.p,App.camera.vp),ax=(p[0]+1)*w/2,ay=(1-p[1])*h/2,bw=b.offsetWidth||130,bh=b.offsetHeight||43;let blocked=p[3]<0||p[2]>1||ax<12||ax>w-12||ay<12||ay>h-20;let candidates=[[ax+15,ay-50],[ax-bw-15,ay-50],[ax+16,ay+12],[ax-bw-17,ay+12],[ax-bw/2,ay-85],[ax-bw/2,ay+34]],chosen=null;
 if(!blocked){for(let slot of [b._slot,...candidates.map((_,j)=>j)].filter((v,j,a)=>Number.isInteger(v)&&a.indexOf(v)===j)){let [x0,y]=candidates[slot];let x=clamp(x0,12,w-bw-12),r={x,y,w:bw,h:bh};if(y<12||y+bh>h-38)continue;if([...forbidden,...rects].some(a=>collide(r,a)))continue;chosen=r;b._slot=slot;break;}}
 if(!chosen){b.style.visibility='hidden';continue;}let {x,y}=chosen;b.style.visibility='visible';b.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;rects.push(chosen);let endX=clamp(ax,x,x+bw),endY=ay<y?y:ay>y+bh?y+bh:y+bh/2;paths.push(`<path d="M${ax.toFixed(1)},${ay.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.6"/>`);App.labelRects.push({...chosen,label:m.label,en:m.en,ax,ay});}
 $('leaders').innerHTML=paths.join('');$('compassNeedle').style.transform=`rotate(${-App.camera.az*180/Math.PI}deg)`;
}
function renderTeaching(){let c=App.chapter,source=SOURCES[c.source];$('teachingPanel').innerHTML=translate(`<div class="teaching-intro"><span class="tiny-label">这一章，带走三个认识</span><h3>${c.short}</h3><p>${c.intro}</p></div>${c.facts.map((f,i)=>`<div class="fact"><span>0${i+1}</span><p>${f}</p></div>`).join('')}<div class="observation-list"><span class="tiny-label">点击并靠近观察点</span>${App.world.markers.map((m,i)=>`<button data-observe="${i}">${m.label}<span>↗</span></button>`).join('')}</div><div class="quiz"><span class="tiny-label">课堂小测 · 先预测，再观察</span><h3>${c.quiz[0]}</h3>${c.quiz[1].map((a,i)=>`<button data-answer="${i}"><span>${'ABC'[i]}</span>${a}</button>`).join('')}<p id="quizResult" class="quiz-result" hidden></p></div><div class="source-box"><span class="tiny-label">知识核对与延伸阅读</span><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title} ↗</a><p>参考资料仅用于概念核对。三维模型与界面为原创程序化实现，不是资料中的测绘模型。</p><button id="allSources" class="text-button">查看全部资料与模型边界 →</button></div>`);
 $$('[data-observe]').forEach(b=>b.addEventListener('click',()=>{let i=+b.dataset.observe;if(State.id==='atlas')loadChapter(App.world.markers[i].tag);else{showObservation(i);focusMarker(i);}}));$$('[data-answer]').forEach(b=>b.addEventListener('click',()=>{const correct=+b.dataset.answer===c.quiz[2];b.classList.add(correct?'correct':'wrong');$('quizResult').hidden=false;$('quizResult').textContent=correct?translate('回答正确。再旋转模型，找一处能够支持这个判断的证据。'):translate('再观察一次。提示：')+c.facts[Math.min(1,c.facts.length-1)];}));$('allSources').addEventListener('click',()=>openHelp('sources'));}
function changePanel(name){App.panel=name;$$('[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$('experimentPanel').hidden=name!=='experiment';$('teachingPanel').hidden=name!=='teaching';}
function updateTransport(){paintIcon('playBtn',State.playing?'pause':'play');$('playBtn').setAttribute('aria-label',State.playing?translate('暂停动态过程'):translate('播放动态过程'));$('playLabel').textContent=State.playing?translate('动态过程'):translate('已暂停');$('progressLabel').textContent=App.tour?translate('课堂导览'):State.evolving?translate('演化播放中'):translate('自由探索');}
function togglePlay(){State.playing=!State.playing;updateTransport();toast(State.playing?translate('动态过程已继续'):translate('已暂停。仍可旋转模型和调整时间轴。'))}
function startEvolution(){if(!App.world)return;stopTour();State.progress=0;if(App.visual)App.visual.progress=0;State.time=0;State.playing=true;State.evolving=true;App.camera.preset(...App.world.presetResponsive);$('observation').classList.add('closed');syncTimeline();updateTransport();toast(State.id==='volcano'?translate('开始一次喷发：积聚 → 喷发 → 冷却。'):translate('演化已开始。可以随时暂停或拖动时间轴。'));}
function startTour(all=false){State.playing=true;State.evolving=false;App.tour={all,index:0,elapsed:0,nextAt:all?7.5:6,chapter:0};if(all){loadChapter('volcano',{touring:true}).then(()=>{if(App.tour)showObservation(-1)});}else{showObservation(0);focusMarker(0);}updateTransport();toast(translate('课堂导览已开始。拖动模型即可接手探索。'));}
function stopTour(){App.tour=null;if($('progressLabel'))$('progressLabel').textContent=State.evolving?translate('演化播放中'):translate('自由探索');}
function resetCamera(){if(!App.world)return;stopTour();App.orbit=false;$('orbitBtn').classList.remove('active');$('orbitBtn').setAttribute('aria-pressed','false');App.camera.preset(...App.world.presetResponsive);App.selected=-1;showObservation(-1)}
function showError(error){$('errorState').hidden=false;$('errorState').innerHTML=translate('<h2>三维场景暂时没有启动</h2><p></p><button id="retryRenderer">重新加载</button>');$('errorState').querySelector('p').textContent=String(error.message||error);$('retryRenderer').onclick=()=>location.reload();}
function modalOpen(title,html){lastFocus=document.activeElement;modalPriorPlay=State.playing;State.playing=false;updateTransport();$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').hidden=false;$('closeModal').focus();}
function modalClose(){if($('modal').hidden)return;$('modal').hidden=true;State.playing=modalPriorPlay;updateTransport();if(lastFocus&&lastFocus.focus)lastFocus.focus();}
function openIndex(){modalOpen(translate('选择一段地球的故事'),translate(`<p style="margin-top:0">10 个独立三维章节 · 16 个可切换场景 · 每一章都能暂停、旋转和观察</p><div class="chapter-grid">${CHAPTERS.map((c,i)=>`<button class="chapter-card" data-openchapter="${c.id}" style="--c:${c.accent}">${icon(c.icon)}<span><strong>${String(i).padStart(2,'0')} / ${c.short}</strong><small>${c.subtitle}</small></span></button>`).join('')}</div>`));$$('[data-openchapter]').forEach(b=>b.addEventListener('click',()=>{modalClose();loadChapter(b.dataset.openchapter)}));}
function openHelp(page='help'){const sources=Object.values(SOURCES).map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a></p>`).join('');const boundaries=translate(`<h3>模型边界</h3><p><strong>这是一套概念可视化课件，不是经过标定的地球物理模拟器。</strong>地形、时间、气流、水流与粒子尺寸均为示意；参数是无量纲的相对值，不是实际压力、温度、风速或危险等级。</p><p>所有地形来自数学函数与程序化几何，未使用真实地区 DEM 或卫星数据。总览场景组合了不同环境，不代表这些地貌在某地真实共存。河流与冰川由预设的形成路径驱动，没有求解完整流体或冰体力学；地貌演化用形态插值展示因果关系。地壳厚度明显夸大，地球表面为程序化大陆示意而非准确地图。</p><p>本版覆盖常见的内、外力地貌及相关地球系统，并不等于覆盖整个初高中地理课程。这里没有用户账户、云端课件平台、在线地图或灾害预警功能。</p>`);
 const use=translate(`<p style="margin-top:0">先让学生观察，再提出问题，最后用参数或演化时间检验想法。</p><div class="help-grid"><div><h3>1 / 选择章节</h3>左侧切换地貌；河流、冰川、板块和风成地貌还有独立子场景。点击模型标签可打开解释并靠近观察。</div><div><h3>2 / 让过程发生</h3>右侧调节相对参数。火山可以完整触发一次喷发。下方时间轴支持来回拖动，左侧按钮暂停动态过程。</div><div><h3>3 / 走进地表之下</h3>在火山与喀斯特章节开启「地质剖面」。可以隐藏植被、云雾或标签，减少课堂干扰。</div><div><h3>4 / 保留一节课</h3>「课堂模式」扩大模型与字号；相机按钮导出带说明的 PNG。保存课堂配置可在下次恢复同一场景和参数。</div></div><h3>操作与快捷键</h3><p>鼠标拖动：旋转；滚轮 / 双指捏合：缩放；右键或 Shift + 拖动：平移。<br><kbd>Space</kbd> 暂停 / 继续 · <kbd>R</kbd> 复位镜头 · <kbd>L</kbd> 标签开关 · <kbd>F</kbd> 全屏 · <kbd>←</kbd> <kbd>→</kbd> 逐阶段 · <kbd>Esc</kbd> 关闭窗口 / 退出课堂模式。</p><h3>离线、隐私与兼容</h3><p>场景使用程序化模型与着色器。打开参考资料链接会离开本页面并联网。需要浏览器支持 WebGL 2 和可用的图形加速。画面卡顿时，选择「流畅」品质。</p><p>全部三维图形由原创代码实时生成。没有把效果图铺在背景上伪装成三维场景。</p>`);
 modalOpen(page==='sources'?translate('知识来源与模型边界'):translate('把地理课，带进三维世界'),page==='sources'?boundaries+translate('<h3>概念参考资料</h3>')+sources:use+boundaries+translate('<h3>概念参考资料</h3>')+sources);}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)}
function saveConfig(){const data={format:'earth-nature-classroom',version:1,chapter:State.id,variant:State.variant,params:State.params,progress:State.progress,cutaway:State.cutaway,night:State.night,layers:State.layers,camera:{...App.camera.want},savedAt:new Date().toISOString()};downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'earth-nature-'+State.id+'-classroom.json');toast(translate('课堂配置已保存到本地。'));}
function validateConfig(d){if(!d||d.format!=='earth-nature-classroom'||d.version!==1||!CHAPTERS.some(c=>c.id===d.chapter))throw new Error(translate('不是有效的地球与自然课堂配置。'));if(!Array.isArray(d.params)||d.params.length!==2||d.params.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))throw new Error(translate('参数范围不正确。'));if(typeof d.progress!=='number'||!Number.isFinite(d.progress)||d.progress<0||d.progress>1)throw new Error(translate('演化进度不正确。'));let c=CHAPTERS.find(c=>c.id===d.chapter);if(!Number.isInteger(d.variant)||d.variant<0||d.variant>=Math.max(1,c.variants.length))throw new Error(translate('子场景编号不正确。'));let layers={};for(let k of Object.keys(State.layers))if(typeof d.layers?.[k]==='boolean')layers[k]=d.layers[k];return {...d,layers,night:[0,.45,1].includes(d.night)?d.night:0};}
async function importConfig(file){try{if(!file||file.size>100000)throw new Error(translate('请选择小于 100 KB 的课堂配置 JSON 文件。'));let d=validateConfig(JSON.parse(await file.text()));await loadChapter(d.chapter,{variant:d.variant,record:d});if(d.camera&&['az','el','distance'].every(k=>Number.isFinite(d.camera[k]))&&Array.isArray(d.camera.target)&&d.camera.target.length===3&&d.camera.target.every(Number.isFinite)){App.camera.preset(clamp(d.camera.az,-20,20),clamp(d.camera.el,.12,1.47),clamp(d.camera.distance,12,68),d.camera.target.map(x=>clamp(x,-30,30)));}toast(translate('已恢复课堂配置。'))}catch(e){toast(translate('载入失败：')+e.message)}}
function drawWrapped(ctx,text,x,y,width,lineHeight,maxLines=10){let line='',lines=0;for(let ch of text){if(ctx.measureText(line+ch).width>width&&line){ctx.fillText(line,x,y);line=ch;y+=lineHeight;if(++lines>=maxLines)return y;}else line+=ch;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
function captureScene(){if(!App.world)return;const cv=$('scene'),out=document.createElement('canvas'),w=cv.width,h=cv.height;out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.fillStyle='#0a202d';ctx.fillRect(0,0,w,h);ctx.drawImage(cv,0,0);const ratio=w/cv.clientWidth;ctx.save();ctx.scale(ratio,ratio);let width=w/ratio,height=h/ratio,g=ctx.createLinearGradient(0,0,0,170);g.addColorStop(0,'rgba(4,16,25,.92)');g.addColorStop(1,'rgba(4,16,25,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,170);ctx.font='11px sans-serif';ctx.fillStyle=App.chapter.accent;ctx.fillText('EARTH & NATURE  /  3D GEOGRAPHY LAB',25,28);ctx.font='bold 27px sans-serif';ctx.fillStyle='#e4f0f3';ctx.fillText(App.chapter.title,25,65);ctx.font='12px sans-serif';ctx.fillStyle='#a9c4ce';ctx.fillText(App.chapter.subtitle,25,91);for(let r of App.labelRects){ctx.strokeStyle=App.chapter.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r.ax,r.ay);ctx.lineTo(r.x,r.y+r.h/2);ctx.stroke();ctx.fillStyle='#092030dd';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.fillStyle='#e0f1f4';ctx.font='12px sans-serif';ctx.fillText(r.label,r.x+8,r.y+17);ctx.font='7px sans-serif';ctx.fillStyle='#91b5c2';ctx.fillText(r.en,r.x+8,r.y+30);}
 ctx.fillStyle='#071923ec';ctx.fillRect(0,height-54,width,54);ctx.font='10px sans-serif';ctx.fillStyle='#b9d0d9';ctx.fillText(translate('演化阶段 ')+Math.round(State.progress*100)+'%  ·  '+App.chapter.params.map((p,i)=>p+' '+Math.round(State.params[i]*100)).join(' / '),22,height-33);ctx.fillStyle='#6e929f';ctx.font='9px sans-serif';ctx.fillText(translate('教学示意 · 非真实比例 / 非灾害预测    Created by MakerJackie'),22,height-14);ctx.restore();out.toBlob(b=>{if(b){downloadBlob(b,'earth-nature-'+State.id+'.png');toast(translate('当前三维画面已保存。'))}else toast(translate('画面导出失败，请重试。'))},'image/png');}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast(translate('此浏览器未开放全屏接口。'))}catch{toast(translate('此环境未允许全屏；可以使用课堂模式。'))}}
function presentation(force){if(!App.world||!App.camera)return;let enabled=typeof force==='boolean'?force:!document.body.classList.contains('presentation');document.body.classList.toggle('presentation',enabled);document.querySelector('#presentationBtn>span:last-child').textContent=enabled?translate('退出课堂'):translate('课堂模式');$('sidebar').classList.remove('open');$('inspector').classList.remove('open');App.camera.want.distance=enabled?App.world.preset[2]:App.world.presetResponsive[2];setTimeout(()=>placeLabels(),50);}
function installEvents(){
 $('homeBtn').onclick=() =>loadChapter('atlas');$('labBtn').onclick=()=>{modalClose();changePanel('experiment')};$('indexBtn').onclick=openIndex;$('helpBtn').onclick=()=>openHelp();$('closeModal').onclick=modalClose;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))modalClose()});$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');$('mobileControls').onclick=()=>$('inspector').classList.toggle('open');$('search').addEventListener('input',e=>renderNav(e.target.value));$('fullscreenBtn').onclick=fullscreen;$('presentationBtn').onclick=()=>presentation();$('resetCamera').onclick=resetCamera;$('topView').onclick=()=>{stopTour();App.camera.preset(App.camera.want.az,1.42,App.world.presetResponsive[2],[0,.2,0]);$('observation').classList.add('closed')};$('orbitBtn').onclick=()=>{stopTour();App.orbit=!App.orbit;$('orbitBtn').classList.toggle('active',App.orbit);$('orbitBtn').setAttribute('aria-pressed',String(App.orbit));$('observation').classList.add('closed')};$('captureBtn').onclick=captureScene;$('closeObserve').onclick=()=>$('observation').classList.add('closed');$('playBtn').onclick=togglePlay;$('replayBtn').onclick=startEvolution;$('speed').addEventListener('change',e=>State.speed=Number(e.target.value));$('timeline').addEventListener('input',e=>setProgress(+e.target.value/100,true));$('nextChapter').onclick=()=>{let i=CHAPTERS.findIndex(c=>c.id===State.id);loadChapter(CHAPTERS[(i+1)%CHAPTERS.length].id)};$$('[data-panel]').forEach(b=>b.onclick=()=>changePanel(b.dataset.panel));$('resetParams').onclick=()=>loadChapter(State.id,{variant:State.variant});$('mainAction').onclick=()=>{if(State.id==='atlas')startTour(true);else if(['water','earth'].includes(State.id))startTour(false);else startEvolution()};$('cutaway').onchange=e=>{State.cutaway=e.target.checked;applyLayers();if(State.cutaway){App.camera.preset(.20,.28,App.world.presetResponsive[2]*.88,[0,.9,0]);$('observation').classList.add('closed');toast(translate('已打开地质剖面，可继续旋转观察。'))}else resetCamera()};$$('[data-light]').forEach(b=>b.onclick=()=>{State.night=Number(b.dataset.light);$$('[data-light]').forEach(x=>x.classList.toggle('active',x===b))});$('quality').onchange=e=>{App.renderer.dpr=+e.target.value;App.renderer.shadows=+e.target.value!==1;App.renderer.bloom=+e.target.value!==1;App.renderer.shadowDirty=true;toast(+e.target.value===1?translate('流畅模式：原尺寸渲染，关闭阴影与辉光，保留抗锯齿。'):translate('精细模式：柔和阴影、材质细节、超采样与轻量辉光。'))};$('revealAnswer').onclick=()=>{$('answer').hidden=!$('answer').hidden;$('revealAnswer').textContent=$('answer').hidden?translate('展开思考 →'):translate('收起答案 ↑')};$('saveConfig').onclick=saveConfig;$('loadConfig').onclick=()=>$('configFile').click();$('configFile').onchange=e=>{importConfig(e.target.files[0]);e.target.value=''};
 document.addEventListener('keydown',e=>{let tag=document.activeElement?.tagName;if(!$('modal').hidden){if(e.key==='Escape'){e.preventDefault();modalClose()}else if(e.key==='Tab'){let focusable=$$('#modal button,#modal a[href]');let first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return;}if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;let k=e.key.toLowerCase();if(e.code==='Space'){e.preventDefault();togglePlay()}else if(k==='r')resetCamera();else if(k==='l'){State.layers.labels=!State.layers.labels;let b=document.querySelector('[data-layer="labels"]');if(b)b.checked=State.layers.labels;applyLayers()}else if(k==='f')fullscreen();else if(e.key==='ArrowRight'){e.preventDefault();setProgress(Math.min(1,Math.floor(State.progress*4+1)/4),true)}else if(e.key==='ArrowLeft'){e.preventDefault();setProgress(Math.max(0,Math.ceil(State.progress*4-1)/4),true)}else if(e.key==='Escape'){presentation(false);$('sidebar').classList.remove('open');$('inspector').classList.remove('open');}});
 document.addEventListener('visibilitychange',()=>{App.lastFrame=performance.now()});window.addEventListener('hashchange',()=>{let id=location.hash.slice(1);if(id!==State.id&&SCENES[id])loadChapter(id)});
 $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();State.playing=false;showError(new Error(translate('图形上下文暂时丢失。请关闭占用显存的页面后重新加载。')))});
}
let lastUI=0,framesInPeriod=0,periodStart=performance.now();
function animate(now){requestAnimationFrame(animate);let rawDt=(now-(App.lastFrame||now))/1000;App.lastFrame=now;let dt=clamp(rawDt,0,.08);if(!App.renderer||!App.world||App.loading||document.hidden)return;const R=App.renderer;let [w,h]=R.resize();if(w<1||h<1)return;let simDt=State.playing?dt*State.speed:0;State.time+=simDt;
 if(State.evolving&&simDt){State.progress=clamp(State.progress+simDt/(State.id==='volcano'?25:32));if(State.progress>=1){State.evolving=false;updateTransport();toast(translate('本轮演化完成。拖动时间轴可以回看。'))}}
 if(App.tour&&simDt){let tour=App.tour;tour.elapsed+=simDt;const duration=State.id==='earth'?mix(9,4,State.params[1]):tour.nextAt;if(tour.elapsed>duration){tour.elapsed=0;if(tour.all){let sequence=['volcano','tectonics','river','glacier','karst','desert','coast','water','earth'];tour.chapter++;if(tour.chapter>=sequence.length){stopTour();resetCamera();toast(translate('地貌导览完成，现在自由探索。'))}else loadChapter(sequence[tour.chapter],{touring:true});}else{tour.index++;if(tour.index>=App.world.markers.length){stopTour();resetCamera();toast(translate('观察点巡览完成。'))}else{State.progress=tour.index/(App.world.markers.length-1);showObservation(tour.index);focusMarker(tour.index);}}}}
 if(App.orbit&&State.playing)App.camera.want.az+=dt*.11;App.camera.update(dt,w/h);R.time=State.time;R.night=mix(R.night,State.night,1-Math.exp(-dt*3));App.world.update(State.time,simDt,smoothRenderState(dt)); // Scene-specific visibility must still respect user layer switches.
 for(let o of R.meshes)if(o.alwaysHidden||(o.layer in State.layers&&!State.layers[o.layer]))o.visible=false;for(let o of R.particles)if(o.layer in State.layers&&!State.layers[o.layer])o.visible=false;
 R.render(App.camera.vp,App.camera.eye);finishTransition();placeLabels();App.frame++;framesInPeriod++;if(now-lastUI>95){syncTimeline();lastUI=now;}if(now-periodStart>1800){App.fps=framesInPeriod/((now-periodStart)/1000);framesInPeriod=0;periodStart=now;$('renderStatus').textContent='V2 · '+Math.round(R.triangles/1000)+'K TRI · '+R.drawCalls+' DRAWS';}
}
async function boot(){initializeIcons();installEvents();try{App.renderer=new Renderer($('scene'));App.camera=new OrbitCamera($('scene'));App.camera.onInput=()=>{stopTour();App.orbit=false;$('orbitBtn').classList.remove('active');$('orbitBtn').setAttribute('aria-pressed','false')};let id=location.hash.slice(1);if(!SCENES[id])id='atlas';renderNav();requestAnimationFrame(animate);await loadChapter(id);if(matchMedia('(prefers-reduced-motion: reduce)').matches){State.playing=false;updateTransport();toast(translate('已按系统偏好暂停动态效果；可手动播放。'))}}catch(e){showLoading(false);showError(e);console.error(e)}}
window.EarthLab={getState:()=>JSON.parse(JSON.stringify(State)),getStats:()=>({frames:App.frame,fps:App.fps,triangles:App.renderer?.triangles,drawCalls:App.renderer?.drawCalls,gpuBytes:App.renderer?.gpuBytes,hdr:App.renderer?.hdr,instancedMeshes:App.renderer?.meshes.filter(m=>m.instanced).length,meshes:App.renderer?.meshes.length,particles:App.renderer?.particles.reduce((n,p)=>n+p.count,0),labels:App.labelRects.length,version:2,ready:!!App.world&&!App.loading}),loadChapter,setProgress:v=>setProgress(v,true),setParam,validateConfig,App,State};
boot();


}
