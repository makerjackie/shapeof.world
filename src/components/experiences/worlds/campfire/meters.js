// GPU layer reduction -> GPU whole-domain reduction. Read back 192 bytes at 4 Hz and 208 bytes at 20 Hz; never a whole field.
import { computePipeline, bindGroup } from './engine/gpu.js';
import { MeasurementHistory, HEAT_OF_COMBUSTION, FUEL_PLANE } from './measurements';
export class Meters {
  constructor(device, sim, sparks) {
    this.device=device;this.sim=sim;this.history=new MeasurementHistory();this.busy=false;this.fastBusy=false;
    const usage=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC;
    this.layers=device.createBuffer({size:(sim.res[1]+1)*96,usage});
    this.out=device.createBuffer({size:192,usage});
    this.read=device.createBuffer({size:192,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    this.fastOut=device.createBuffer({size:16,usage});this.fastRead=device.createBuffer({size:208,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const shader=`
struct Row { totals: vec4f, root: vec4f, yellow: vec4f, smoke: vec4f, tip: vec4f, thermalInfo: vec4f };
struct Spark { p: vec4f, v: vec4f, q: vec4f, m: vec4f };
@group(0) @binding(0) var s: texture_3d<f32>;
@group(0) @binding(1) var s2: texture_3d<f32>;
@group(0) @binding(2) var geo: texture_3d<f32>;
@group(0) @binding(3) var reaction: texture_3d<f32>;
@group(0) @binding(4) var<storage,read> sparks: array<Spark>;
@group(0) @binding(5) var<storage,read_write> rows: array<Row>;
@group(0) @binding(6) var blackbody:texture_2d<f32>;
const DX:f32=${sim.dx};const DV:f32=${sim.dx**3};
var<workgroup> totals:array<vec4f,128>;
var<workgroup> roots:array<vec4f,128>;
var<workgroup> yellows:array<vec4f,128>;
var<workgroup> smokes:array<vec4f,128>;
var<workgroup> tips:array<vec4f,128>;
var<workgroup> thermalInfos:array<vec4f,128>;
fn best(a:vec4f,b:vec4f)->vec4f{return select(a,b,b.w>a.w);}
@compute @workgroup_size(128) fn main(@builtin(local_invocation_index) lane:u32,@builtin(workgroup_id) wg:vec3u){
 let dims=textureDimensions(s);var sum=vec4f(0);var root=vec4f(0);var yellow=vec4f(0);var smoke=vec4f(0);var tip=vec4f(0);var thermalInfo=vec4f(0);
 if(wg.x<dims.y){
  for(var i=lane;i<dims.x*dims.z;i+=128u){
   let c=vec3u(i%dims.x,wg.x,i/dims.x);let g=textureLoad(geo,c,0);if(g.z>.5){continue;}
   let a=textureLoad(s,c,0);let b=textureLoad(s2,c,0);let r=textureLoad(reaction,c,0);
   let p=vec3f(-.6,0,-.6)+(vec3f(c)+.5)*DX;let T=293.0+1000.0*a.x;let age=b.y/max(a.y+b.x,.0001);
   // rho=353/T kg/m3 (ideal air, ~1 atm); fuel heat is an explicit 14 MJ/kg assumption.
   sum.x+=r.x*(353.0/max(r.y,293.0))*${HEAT_OF_COMBUSTION}.0*DV/1000.0;
   sum.y+=(354800.0/T)*(a.w*10000.0)*DV/1000.0;
   let rawFlame=(T>1000.0 && a.z>.02)||(T>900.0 && a.w>.3 && age<.05);
   if(rawFlame){sum.w+=DX*DX;}
   // Match the renderer's open-boundary fade when identifying visible flame, without warping the probe fields.
   let edge=min(min(p.x+.6,.6-p.x),min(p.z+.6,.6-p.z));
   let fade=smoothstep(.02,.15,edge)*smoothstep(0.0,.4,1.8-p.y);
   let Tv=293.0+1000.0*a.x*fade;
   let flame=(Tv>1000.0 && a.z*fade>.02)||(Tv>900.0 && a.w*fade>.3 && age<.05);
   if(flame){sum.z+=DX*DX;let index=i32(clamp((Tv-400.0)/2600.0,0.0,1.0)*1023.0);let radiance=textureLoad(blackbody,vec2i(index,1),0).w*a.z*fade;tip=best(tip,vec4f(p,radiance));}
   if(T>600.0){thermalInfo.x=max(thermalInfo.x,p.y);}
   if(c.y>=dims.y-2u){thermalInfo.y=max(thermalInfo.y,T);}
   thermalInfo.z=max(thermalInfo.z,T);
   if(p.y>.07 && p.y<.5 && T>900.0){root=best(root,vec4f(p,a.w*exp(-a.z*12.0)*exp(-age/.045)));}
   if(p.y>.15 && p.y<1.0){yellow=best(yellow,vec4f(p,a.z*max(T-1000.0,0.0)));}
   if(p.y>.4 && !rawFlame){smoke=best(smoke,vec4f(p,b.z));}
  }
 }else{
  for(var i=lane;i<${sparks.count}u;i+=128u){let a=sparks[i];if(a.m.z>.5){sum.x+=1.0;if(a.q.w>root.w && a.p.y<1.7){root=vec4f(a.p.xyz,a.q.w);yellow=vec4f(a.m.x,0,0,a.q.w);}}}
 }
 totals[lane]=sum;roots[lane]=root;yellows[lane]=yellow;smokes[lane]=smoke;tips[lane]=tip;thermalInfos[lane]=thermalInfo;workgroupBarrier();
 for(var stride=64u;stride>0u;stride/=2u){if(lane<stride){totals[lane]+=totals[lane+stride];roots[lane]=best(roots[lane],roots[lane+stride]);yellows[lane]=best(yellows[lane],yellows[lane+stride]);smokes[lane]=best(smokes[lane],smokes[lane+stride]);tips[lane]=best(tips[lane],tips[lane+stride]);thermalInfos[lane]=max(thermalInfos[lane],thermalInfos[lane+stride]);}workgroupBarrier();}
 if(lane==0u){rows[wg.x]=Row(totals[0],roots[0],yellows[0],smokes[0],tips[0],thermalInfos[0]);}
}`;
    this.reduce=computePipeline(device,shader,'main','meter-layers');
    this.bg=bindGroup(device,this.reduce,[sim.S,sim.S2,sim.geo,sim.reaction,sparks.buf,this.layers,sparks.renderer.bbTex]);
    this.finish=computePipeline(device,`
struct Row {totals:vec4f,root:vec4f,yellow:vec4f,smoke:vec4f,tip:vec4f,thermalInfo:vec4f};
@group(0) @binding(0) var<storage,read> rows:array<Row>;
@group(0) @binding(1) var<storage,read_write> out:array<Row,2>;
fn best(a:vec4f,b:vec4f)->vec4f{return select(a,b,b.w>a.w);}
@compute @workgroup_size(1) fn main(){var t=vec4f(0);var r=vec4f(0);var y=vec4f(0);var s=vec4f(0);var tip=vec4f(0);var thermalInfo=vec4f(0);var occupied:array<u32,6>;var peakRadiance=0.0;
for(var i=0u;i<${sim.res[1]}u;i++){let a=rows[i];t.x+=a.totals.x;t.y+=a.totals.y;
 if(a.totals.z>=.0005){t.z=max(t.z,(f32(i)+.5)*${sim.dx}-${FUEL_PLANE});tip=a.tip;occupied[i/20u]|=1u<<(i%20u);}
 if(a.totals.w>=.0005){t.w=max(t.w,(f32(i)+.5)*${sim.dx}-${FUEL_PLANE});}
 peakRadiance=max(peakRadiance,a.tip.w);r=best(r,a.root);y=best(y,a.yellow);thermalInfo=max(thermalInfo,a.thermalInfo);}
// Annotation only: highest visibly emitting layer, >=0.2% of peak and 0.0002 of the 1500 K reference.
// This does NOT change the temperature/soot intermittency measurement above.
tip=vec4f(0);for(var i=0u;i<${sim.res[1]}u;i++){let a=rows[i];if(a.totals.z>=.0005 && a.tip.w>=max(.0002,peakRadiance*.002)){tip=a.tip;}}
// Smoke anchor is in a non-flaming cell above the instantaneous visible flame, not inside it.
for(var i=0u;i<${sim.res[1]}u;i++){let a=rows[i];if(a.smoke.y>t.z+${FUEL_PLANE}+.025){s=best(s,a.smoke);}}
out[0]=Row(t,r,y,s,tip,thermalInfo);out[1]=rows[${sim.res[1]}];out[1].tip=vec4f(f32(occupied[0]),f32(occupied[1]),f32(occupied[2]),f32(occupied[3]));out[1].thermalInfo=vec4f(f32(occupied[4]),f32(occupied[5]),0,0);}`,'main','meter-total');
    this.finishBg=bindGroup(device,this.finish,[this.layers,this.out]);
    this.fast=computePipeline(device,`
@group(0) @binding(0) var s:texture_3d<f32>;
@group(0) @binding(1) var lin:sampler;
@group(0) @binding(2) var<storage,read_write> out:vec4f;
@compute @workgroup_size(1) fn main(){out=vec4f(293.0+1000.0*textureSampleLevel(s,lin,vec3f(.5,.25/1.8,.5),0).x,293.0+1000.0*textureSampleLevel(s,lin,vec3f(.5,.5/1.8,.5),0).x,293.0+1000.0*textureSampleLevel(s,lin,vec3f(.5,.8/1.8,.5),0).x,0);}`,'main','meter-frequency');
    this.fastBg=bindGroup(device,this.fast,[sim.S,sim.lin,this.fastOut]);
  }
  async sample(time,record=true){
    if(this.busy)return null;this.busy=true;
    try{
      const enc=this.device.createCommandEncoder();let pass=enc.beginComputePass();pass.setPipeline(this.reduce);pass.setBindGroup(0,this.bg);pass.dispatchWorkgroups(this.sim.res[1]+1);pass.end();
      pass=enc.beginComputePass();pass.setPipeline(this.finish);pass.setBindGroup(0,this.finishBg);pass.dispatchWorkgroups(1);pass.end();
      enc.copyBufferToBuffer(this.out,0,this.read,0,192);this.device.queue.submit([enc.finish()]);await this.read.mapAsync(GPUMapMode.READ);
      const a=new Float32Array(this.read.getMappedRange()).slice();this.read.unmap();
      const feature=i=>a[i+3]>0?[a[i],a[i+1],a[i+2]]:null;
      const layerOccupancy=Array.from({length:this.sim.res[1]},(_,i)=>(Math.round(a[40+Math.floor(i/20)])>>>i%20)&1);
      const row={time,layerOccupancy,dx:this.sim.dx,chemicalKw:a[0],thermalKw:a[1],tip:a[2],rawTip:a[3],centerTemperature:this.history.fast.at(-1)?.value??293,
        root:feature(4),yellow:feature(8),smoke:feature(12),tipPosition:feature(16),hotTop:a[20],topTemperature:a[21],maxTemperature:a[22],spark:{count:a[24],position:[a[28],a[29],a[30]],temperature:a[31],diameter:a[32]}};
      if(record||!this.latest)this.latest=this.history.add(row);else this.latest={...this.latest,...row};
      return this.latest;
    }finally{this.busy=false;}
  }
  async sampleFrequency(time){
    if(this.fastBusy)return;this.fastBusy=true;
    try{
      const enc=this.device.createCommandEncoder();let pass=enc.beginComputePass();pass.setPipeline(this.reduce);pass.setBindGroup(0,this.bg);pass.dispatchWorkgroups(this.sim.res[1]+1);pass.end();
      pass=enc.beginComputePass();pass.setPipeline(this.finish);pass.setBindGroup(0,this.finishBg);pass.dispatchWorkgroups(1);pass.end();
      pass=enc.beginComputePass();pass.setPipeline(this.fast);pass.setBindGroup(0,this.fastBg);pass.dispatchWorkgroups(1);pass.end();
      enc.copyBufferToBuffer(this.out,0,this.fastRead,0,192);enc.copyBufferToBuffer(this.fastOut,0,this.fastRead,192,16);
      this.device.queue.submit([enc.finish()]);await this.fastRead.mapAsync(GPUMapMode.READ);
      const a=new Float32Array(this.fastRead.getMappedRange()).slice();this.fastRead.unmap();
      this.tipPosition=a[19]>0?[a[16],a[17],a[18]]:null;
      this.history.addFast({time,chemicalKw:a[0],tip:a[2],lower:a[48],value:a[49],upper:a[50]});
    }finally{this.fastBusy=false;}
  }
}
