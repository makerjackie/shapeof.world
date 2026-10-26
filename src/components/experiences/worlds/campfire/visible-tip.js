// Visual annotation only: locate the emitting contour after the upstream volume reconstruction.
// This does not change flame-height statistics or substitute image brightness for a gas measurement.
import { computePipeline, bindGroup } from './engine/gpu.js';
export class VisibleTip {
  constructor(device, renderer) {
    this.device=device;this.renderer=renderer;this.busy=false;this.uv=null;
    this.out=device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    this.read=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    this.settings=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.reduce=computePipeline(device,`
@group(0) @binding(0) var volume:texture_2d<f32>;
@group(0) @binding(1) var<storage,read_write> rows:array<vec4f>;
var<workgroup> values:array<vec4f,128>;
@compute @workgroup_size(128) fn main(@builtin(local_invocation_index) lane:u32,@builtin(workgroup_id) group:vec3u){
 let dims=textureDimensions(volume);var best=vec4f(0);
 for(var x=lane;x<dims.x;x+=128u){let v=textureLoad(volume,vec2u(x,group.x),0).r;if(v>best.z){best=vec4f((f32(x)+.5)/f32(dims.x),(f32(group.x)+.5)/f32(dims.y),v,1);}}
 values[lane]=best;workgroupBarrier();
 for(var stride=64u;stride>0u;stride/=2u){if(lane<stride && values[lane+stride].z>values[lane].z){values[lane]=values[lane+stride];}workgroupBarrier();}
 if(lane==0u){rows[group.x]=values[0];}
}`,'main','visible-tip-rows');
    this.finish=computePipeline(device,`
@group(0) @binding(0) var<storage,read> rows:array<vec4f>;
@group(0) @binding(1) var<storage,read_write> out:vec4f;
@group(0) @binding(2) var<uniform> config:vec4f;
@compute @workgroup_size(1) fn main(){out=vec4f(0);let count=u32(config.x);
 // A declared visibility threshold: exposed linear red >0.15, in two adjacent rows.
 for(var y=0u;y+1u<count;y++){if(rows[y].z*config.y>.15 && rows[y+1u].z*config.y>.15){out=rows[y];break;}}
}`,'main','visible-tip-total');
  }
  async sample(key){
    if(this.busy)return;this.busy=true;
    try{
      const r=this.renderer,d=this.device;
      if(this.texture!==r.vol){this.rows?.destroy();this.texture=r.vol;this.rows=d.createBuffer({size:r.vh*16,usage:GPUBufferUsage.STORAGE});this.bg=bindGroup(d,this.reduce,[r.vol,this.rows]);this.finishBg=bindGroup(d,this.finish,[this.rows,this.out,this.settings]);}
      d.queue.writeBuffer(this.settings,0,new Float32Array([r.vh,r.params.exposure,0,0]));
      const enc=d.createCommandEncoder();let pass=enc.beginComputePass();pass.setPipeline(this.reduce);pass.setBindGroup(0,this.bg);pass.dispatchWorkgroups(r.vh);pass.end();
      pass=enc.beginComputePass();pass.setPipeline(this.finish);pass.setBindGroup(0,this.finishBg);pass.dispatchWorkgroups(1);pass.end();enc.copyBufferToBuffer(this.out,0,this.read,0,16);
      d.queue.submit([enc.finish()]);await this.read.mapAsync(GPUMapMode.READ);const a=new Float32Array(this.read.getMappedRange()).slice();this.read.unmap();this.key=key;this.uv=a[3]>0?[a[0],a[1]]:null;
    }finally{this.busy=false;}
  }
}
