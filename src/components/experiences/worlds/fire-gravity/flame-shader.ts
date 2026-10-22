export const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`
export const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time, gravity, height, radius, traces, peel, focus, transport, air, burn, chemistry, sceneScale, sceneOffset;
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
// Illustrative air path: rising entrainment on Earth vs nearly radial supply.
vec2 airPos(float j,float phase,float b){
float a=j*6.283185/16.;
vec2 start=vec2(cos(a)*1.12,.48+sin(a)*.9);
vec2 inward=mix(start,vec2(cos(a)*.58,.48+sin(a)*.43),phase);
float signX=mod(j,2.)<1.?-1.:1.;
float arrivalY=.30+mod(j,4.)*.30;
float arrivalH=clamp(arrivalY/height,0.,1.);
float edgeR=radius*pow(max(0.,sin(3.14159*pow(arrivalH,.82))),.82)*(1.-.60*arrivalH);
vec2 rise=vec2(signX*mix(.9,edgeR,phase),arrivalY-.12*(1.-phase));
return mix(inward,rise,b);
}
void main(){
vec2 uv=(gl_FragCoord.xy/resolution-.5)*vec2(resolution.x/resolution.y,1.);
vec2 p=uv*sceneScale; p.y+=sceneOffset;
float b=sqrt(gravity);
vec3 color=vec3(.009,.007,.009);
float glow=burn*exp(-dot(p-vec2(0,.55),p-vec2(0,.55))*2.0);
color+=mix(vec3(.008,.025,.055),vec3(.09,.022,.003),b)*glow;
// Candlelight falling on a dark room behind the flame.
float room=burn*exp(-length((p-vec2(0,.7))*vec2(.5,.42))*1.3);
color+=mix(vec3(.004,.009,.02),vec3(.045,.02,.007),b)*room;
// Dust motes drifting through the light: decorative depth, not data.
for(int m=0;m<18;m++){
float mf=float(m);
float speed=.035+.05*hash(vec3(mf,3.,4.));
vec2 mote=vec2((hash(vec3(mf,1.,2.))-.5)*3.4+.07*sin(time*.37+mf*1.7),-.7+mod(hash(vec3(mf,5.,6.))*3.6+time*speed,3.6));
float lit=exp(-length(mote-vec2(0,.7))*1.15);
float size=.00005+.00009*hash(vec3(mf,7.,8.));
color+=vec3(1.,.68,.38)*exp(-dot(p-mote,p-mote)/size)*lit*burn*.55;
}
// Warm subsurface wax, a concave liquid pool and irregular raised rim.
float flicker=.95+.035*sin(time*5.7)+.015*sin(time*11.3);
float waxWidth=.185+.0018*sin(p.y*11.+1.)+.0008*sin(p.y*29.);
if(p.y<.0 && p.y>-.9 && abs(p.x)<waxWidth){
float side=sqrt(max(0.,1.-pow(p.x/waxWidth,2.)));
float light=(.09+.91*burn*flicker)*exp(p.y*1.65)*(.10+.90*side);
float texture=noise(vec3(p*120.,2.));
vec3 wax=mix(vec3(.065,.060,.052),vec3(.65,.53,.38),light);
float translucent=exp(p.y*7.)*pow(side,2.)*burn;
color=wax*(.34+.03*texture)+vec3(.28,.105,.024)*translucent;
// Light leaking through the thin wax wall near the edges.
color+=vec3(.20,.10,.035)*pow(1.-side,2.5)*exp(p.y*2.4)*burn*flicker*.8;
color+=vec3(.008,.007,.005)*noise(vec3(p*70.,3.))*light;
}
float pool=length(vec2(p.x/.186,(p.y+.005)/.038));
if(pool<1.08){
float rim=smoothstep(.76,.96,pool)*(1.-smoothstep(1.,1.08,pool));
float reflection=exp(-pow((p.x-.018)/.045,2.)-pow((p.y+.015)/.011,2.));
vec3 liquid=vec3(.028,.017,.008)+burn*vec3(.065,.033,.008)*(1.-pool*.45);
liquid+=burn*flicker*vec3(.55,.30,.09)*reflection;
color=mix(liquid,vec3(.48,.38,.25)*(.15+.85*burn),rim);
}
// Analytic line-of-sight thickness of an emissive shell; avoids ray marching.
float y=p.y-.055;
float flameHeight=height*mix(1.,.58+.42*air,chemistry);
float h=y/flameHeight;
if(h>0. && h<1. && abs(p.x)<radius+.12){
// Convected density changes the local silhouette instead of moving a rigid sprite.
float flow=noise(vec3(h*4.,time*.65,1.));
float sway=b*pow(h,1.65)*(.045*sin(time*2.4-h*5.)+.027*sin(time*5.1-h*9.)+(flow-.5)*.075);
float micro=radius*sqrt(max(0.,1.-h*h));
float earth=radius*pow(sin(3.14159*pow(h,.82)),.82)*(1.-.60*h);
float n=noise(vec3(p.x*12.,y*8.-time*2.2,1.));
float r=max(.001,mix(micro,earth,b)*(1.+b*(n-.5)*.17*h));
float x=p.x-sway;
float end=smoothstep(0.,.055,h)*(1.-smoothstep(.94,1.,h));
// Integrate emissive gas through eight depth samples. This is an artistic
// optical model, not a reacting-flow or measured temperature simulation.
vec3 natural=vec3(0.);
for(int k=0;k<8;k++){
float z=(float(k)+.5)/8.*2.-1.;
float radial=sqrt(x*x+z*z*r*r)/max(r,.001);
float skin=1.-smoothstep(.74,1.05,radial);
float fuelCore=(1.-smoothstep(.27,.53,h))*(1.-smoothstep(.18,.58,radial));
float soot=skin*(1.-fuelCore)*smoothstep(.04,.26,h);
float eddy=noise(vec3(x*15.,h*10.-time*2.4,z*2.));
soot*=.76+.28*eddy;
vec3 hot=mix(vec3(3.8,.85,.07),vec3(4.8,2.7,.82),(1.-smoothstep(.20,.88,radial)));
natural+=hot*soot*r*.83*b;
float blue=skin*(1.-smoothstep(.055,.22,h));
natural+=vec3(.035,.19,.72)*blue*.24;
if(b<.99)natural+=vec3(.035,.20,.72)*skin*(1.-b)*.18;
}
float darkProjection=(1.-smoothstep(.12,.43,h))*(1.-smoothstep(.16,.64,abs(x)/max(r,.001)));
natural*=end*flicker*(1.-.87*darkProjection);
// A gradual half-section exposes the fuel-rich core without a scene cut.
float coreHeight=.43;
float coreRadius=.105*pow(max(0.,sin(3.14159*clamp(h/coreHeight,0.,1.))),.7);
float darkCore=(1.-smoothstep(coreRadius-.012,coreRadius+.012,abs(x)))*(1.-smoothstep(.40,.44,h));
float inside=1.-smoothstep(r-.01,r+.01,abs(x));
float outerBand=exp(-pow((abs(x)-r)/.015,2.));
float luminous=inside*(1.-darkCore);
float rr=abs(x)/max(r,.001);
// Soot glows hottest-looking toward the reaction sheet; tiny particles twinkle as they rise.
vec3 lumCol=mix(vec3(.80,.24,.03),vec3(2.05,1.02,.28),smoothstep(.15,.95,rr))*(.5+.5*smoothstep(.04,.34,h))*(1.-.5*smoothstep(.72,1.,h));
lumCol+=vec3(2.2,1.3,.5)*pow(noise(vec3(x*70.,h*48.-time*2.6,7.)),16.)*4.*smoothstep(.12,.32,h)*smoothstep(.25,.6,rr);
vec3 coreCol=vec3(.045,.03,.02)+vec3(.10,.06,.03)*noise(vec3(x*22.,h*13.-time*1.3,9.));
float coreEdge=exp(-pow((abs(x)-coreRadius)/.009,2.))*(1.-smoothstep(.36,.43,h))*smoothstep(.01,.05,h);
float outerGlow=exp(-pow((abs(x)-r)/.032,2.));
vec3 section=coreCol*darkCore+lumCol*luminous*.62+vec3(.08,.36,1.2)*outerBand+vec3(.03,.12,.42)*outerGlow+vec3(.55,.32,.13)*coreEdge*.3;
float emphasis=1.;
if(focus>.5 && focus<1.5)emphasis=.18+.82*darkCore;
if(focus>1.5 && focus<2.5)emphasis=.2+.8*luminous;
if(focus>2.5)emphasis=.16+.84*outerBand;
section*=emphasis;
// Focusing the core reveals the wax vapor that fills it, drifting upward.
if(focus>.5 && focus<1.5){
float vapor=.55+.45*noise(vec3(x*26.,h*18.-time*1.6,4.));
float coreRim=exp(-pow((abs(x)-coreRadius)/.007,2.))*(1.-smoothstep(.36,.43,h))*smoothstep(.01,.05,h);
section+=vec3(.52,.34,.17)*darkCore*vapor*(.6+.4*smoothstep(.0,.25,h))+vec3(1.1,.72,.36)*coreRim*.8;
}
float cut=smoothstep(radius*(1.-peel)-.015,radius*(1.-peel)+.015,x)*peel;
color+=mix(natural,section*end,cut)*burn;
// The open edge is a restrained illuminated seam, not a solid diagram border.
color+=vec3(.25,.15,.06)*exp(-pow(x/.006,2.))*inside*peel*.45*burn;

}
// Fuel tracers: liquid supply -> vapor near the wick -> luminous reaction region.
if(transport>.01 && b>.5 && burn>.01){
for(int k=0;k<14;k++){
float phase=fract(time*.13+float(k)/14.);
float side=mod(float(k),2.)<1.?-1.:1.;
vec2 q;
if(phase<.22){float u=phase/.22;q=vec2(side*.15*(1.-u),-.015+.025*u);}
else if(phase<.42){float u=(phase-.22)/.20;q=vec2(.012*sin(u*1.3),.01+.27*u);}
else {float u=(phase-.42)/.58;q=vec2(side*(.015+.13*sin(u*3.14)),.28+1.19*u);}
float spark=exp(-dot(p-q,p-q)/.00007);
vec3 fuelColor=mix(vec3(.60,.34,.10),vec3(1.5,.75,.12),smoothstep(.42,.6,phase));
color+=fuelColor*spark*transport*burn*.85*(1.-smoothstep(.88,1.,phase));
}}
// Soft radiative feedback halos returning toward the wax pool (illustrative).
if(transport>.01 && b>.5 && burn>.01 && p.y<.15 && p.y>-.3){
float heatRadius=fract(time*.22)*.65;
float distanceFromFlame=length((p-vec2(0,.25))*vec2(1.,.8));
float wave=exp(-pow((distanceFromFlame-heatRadius)/.012,2.))*(1.-heatRadius/.65);
color+=vec3(.10,.027,.006)*wave*transport*burn;
}
// Dark wick and tiny ember sit in front of the flame.
float wickX=.012*sin(p.y*12.);
if(p.y>-.005 && p.y<.11 && abs(p.x-wickX)<.011)color=vec3(.009,.006,.004)+vec3(.95,.17,.012)*burn*smoothstep(.04,.11,p.y)*(.7+.3*sin(p.y*360.));
// Optional illustrative air paths: rising entrainment vs nearly radial supply.
if(traces>.01){
for(int j=0;j<16;j++){
float jf=float(j);
float phase=fract(time*.16+jf*.618);
// A short fading tail shows which way the air is moving.
for(int t=0;t<4;t++){
float tf=float(t);
float ph=phase-tf*.022;
if(ph<0.)continue;
vec2 q=airPos(jf,ph,b);
float dotLight=exp(-dot(p-q,p-q)/(.00016*(1.-tf*.18)));
float fade=(1.-tf*.27)*smoothstep(0.,.12,phase);
color+=mix(vec3(.20,.47,.83),vec3(.85,.72,.38),smoothstep(.85,1.,ph))*dotLight*fade*traces*.45*mix(1.,air,chemistry);
}
}}
// Smoke is a qualitative soot plume, not a visible representation of CO.
float smokeAmount=chemistry*burn*max(0.,(1.-air)*1.4-.15);
float smokeBase=height*(.58+.42*air)*.86;
float smokeY=p.y-smokeBase;
if(smokeY>0. && smokeY<1.4 && smokeAmount>.01){
float curl=.10*sin(smokeY*7.-time*1.4)+.06*sin(smokeY*13.+time*.7);
float width=.04+smokeY*.11;
float density=exp(-pow((p.x-curl)/width,2.))*(1.-smoothstep(.6,1.4,smokeY))*smoothstep(0.,.2,smokeY);
density*=.45+.55*noise(vec3(p*8.,time*.6));
color+=vec3(.13,.12,.115)*density*smokeAmount;
}
color=vec3(1.)-exp(-color*1.8);
float grain=(hash(vec3(gl_FragCoord.xy,0.))-.5)/255.;
gl_FragColor=vec4(pow(color,vec3(.85))+grain,1.);
}`
