// GPU layer reduction -> GPU whole-domain reduction. Read back only 128 bytes at 4 Hz.
import { computePipeline, bindGroup } from './engine/gpu.js';
import { MeasurementHistory, HEAT_OF_COMBUSTION, FUEL_PLANE } from './measurements';
export class Meters {
  constructor(device, sim, sparks) {
    this.device=device;this.sim=sim;this.history=new MeasurementHistory();this.busy=false;this.fastBusy=false;
    const usage=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC;
    this.layers=device.createBuffer({size:(sim.res[1]+1)*64,usage});
    this.out=device.createBuffer({size:128,usage});
    this.read=device.createBuffer({size:128,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    this.fastOut=device.createBuffer({size:16,usage});this.fastRead=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const shader=`
struct Row { totals: vec4f, root: vec4f, yellow: vec4f, smoke: vec4f };
struct Spark { p: vec4f, v: vec4f, q: vec4f, m: vec4f };
@group(0) @binding(0) var s: texture_3d<f32>;
@group(0) @binding(1) var s2: texture_3d<f32>;
@group(0) @binding(2) var geo: texture_3d<f32>;
@group(0) @binding(3) var reaction: texture_3d<f32>;
@group(0) @binding(4) var<storage,read> sparks: array<Spark>;
@group(0) @binding(5) var<storage,read_write> rows: array<Row>;
const DX:f32=${sim.dx};const DV:f32=${sim.dx**3};
var<workgroup> totals:array<vec4f,128>;
var<workgroup> roots:array<vec4f,128>;
var<workgroup> yellows:array<vec4f,128>;
var<workgroup> smokes:array<vec4f,128>;
fn best(a:vec4f,b:vec4f)->vec4f{return select(a,b,b.w>a.w);}
@compute @workgroup_size(128) fn main(@builtin(local_invocation_index) lane:u32,@builtin(workgroup_id) wg:vec3u){
 let dims=textureDimensions(s);var sum=vec4f(0);var root=vec4f(0);var yellow=vec4f(0);var smoke=vec4f(0);
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
   if(flame){sum.z+=DX*DX;}
   if(p.y>.07 && p.y<.5 && T>900.0){root=best(root,vec4f(p,a.w*exp(-a.z*12.0)*exp(-age/.045)));}
   if(p.y>.15 && p.y<1.0){yellow=best(yellow,vec4f(p,a.z*max(T-1000.0,0.0)));}
   if(p.y>.5){smoke=best(smoke,vec4f(p,b.z));}
  }
 }else{
  for(var i=lane;i<${sparks.count}u;i+=128u){let a=sparks[i];if(a.m.z>.5){sum.x+=1.0;if(a.q.w>root.w && a.p.y<1.7){root=vec4f(a.p.xyz,a.q.w);yellow=vec4f(a.m.x,0,0,a.q.w);}}}
 }
 totals[lane]=sum;roots[lane]=root;yellows[lane]=yellow;smokes[lane]=smoke;workgroupBarrier();
 for(var stride=64u;stride>0u;stride/=2u){if(lane<stride){totals[lane]+=totals[lane+stride];roots[lane]=best(roots[lane],roots[lane+stride]);yellows[lane]=best(yellows[lane],yellows[lane+stride]);smokes[lane]=best(smokes[lane],smokes[lane+stride]);}workgroupBarrier();}
 if(lane==0u){rows[wg.x]=Row(totals[0],roots[0],yellows[0],smokes[0]);}
}`;
    this.reduce=computePipeline(device,shader,'main','meter-layers');
    this.bg=bindGroup(device,this.reduce,[sim.S,sim.S2,sim.geo,sim.reaction,sparks.buf,this.layers]);
    this.finish=computePipeline(device,`
struct Row {totals:vec4f,root:vec4f,yellow:vec4f,smoke:vec4f};
@group(0) @binding(0) var<storage,read> rows:array<Row>;
@group(0) @binding(1) var<storage,read_write> out:array<Row,2>;
fn best(a:vec4f,b:vec4f)->vec4f{return select(a,b,b.w>a.w);}
@compute @workgroup_size(1) fn main(){var t=vec4f(0);var r=vec4f(0);var y=vec4f(0);var s=vec4f(0);
for(var i=0u;i<${sim.res[1]}u;i++){let a=rows[i];t.x+=a.totals.x;t.y+=a.totals.y;
 if(a.totals.z>=.0005){t.z=max(t.z,(f32(i)+.5)*${sim.dx}-${FUEL_PLANE});}
 if(a.totals.w>=.0005){t.w=max(t.w,(f32(i)+.5)*${sim.dx}-${FUEL_PLANE});}
 r=best(r,a.root);y=best(y,a.yellow);s=best(s,a.smoke);}
out[0]=Row(t,r,y,s);out[1]=rows[${sim.res[1]}];}`,'main','meter-total');
    this.finishBg=bindGroup(device,this.finish,[this.layers,this.out]);
    this.fast=computePipeline(device,`
@group(0) @binding(0) var s:texture_3d<f32>;
@group(0) @binding(1) var lin:sampler;
@group(0) @binding(2) var<storage,read_write> out:vec4f;
@compute @workgroup_size(1) fn main(){out=vec4f(293.0+1000.0*textureSampleLevel(s,lin,vec3f(.5,.5/1.8,.5),0).x,0,0,0);}`,'main','meter-frequency');
    this.fastBg=bindGroup(device,this.fast,[sim.S,sim.lin,this.fastOut]);
  }
  async sample(time,record=true){
    if(this.busy)return null;this.busy=true;
    try{
      const enc=this.device.createCommandEncoder();let pass=enc.beginComputePass();pass.setPipeline(this.reduce);pass.setBindGroup(0,this.bg);pass.dispatchWorkgroups(this.sim.res[1]+1);pass.end();
      pass=enc.beginComputePass();pass.setPipeline(this.finish);pass.setBindGroup(0,this.finishBg);pass.dispatchWorkgroups(1);pass.end();
      enc.copyBufferToBuffer(this.out,0,this.read,0,128);this.device.queue.submit([enc.finish()]);await this.read.mapAsync(GPUMapMode.READ);
      const a=new Float32Array(this.read.getMappedRange()).slice();this.read.unmap();
      const feature=i=>a[i+3]>0?[a[i],a[i+1],a[i+2]]:null;
      const row={time,chemicalKw:a[0],thermalKw:a[1],tip:a[2],rawTip:a[3],centerTemperature:this.history.fast.at(-1)?.value??293,
        root:feature(4),yellow:feature(8),smoke:feature(12),spark:{count:a[16],position:[a[20],a[21],a[22]],temperature:a[23],diameter:a[24]}};
      if(record||!this.latest)this.latest=this.history.add(row);else this.latest={...this.latest,...row};
      return this.latest;
    }finally{this.busy=false;}
  }
  async sampleFrequency(time){
    if(this.fastBusy)return;this.fastBusy=true;
    try{const enc=this.device.createCommandEncoder(),pass=enc.beginComputePass();pass.setPipeline(this.fast);pass.setBindGroup(0,this.fastBg);pass.dispatchWorkgroups(1);pass.end();enc.copyBufferToBuffer(this.fastOut,0,this.fastRead,0,16);this.device.queue.submit([enc.finish()]);await this.fastRead.mapAsync(GPUMapMode.READ);const value=new Float32Array(this.fastRead.getMappedRange())[0];this.fastRead.unmap();this.history.addFast(time,value);}finally{this.fastBusy=false;}
  }
}
