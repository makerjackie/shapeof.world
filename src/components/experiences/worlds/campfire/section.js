// GPU-only section rendering; a probe samples five local trilinear stencils, returning 80 bytes.
import { UniformStruct, computePipeline, bindGroup, layoutFromWGSL } from './engine/gpu.js';
import { FIELDS, HEAT_COLORS, COOL_COLORS, decodeSample } from './fields';
const fields = ['w','h','aspect','tanFov','px','py','pz','horizontal','fx','fy','fz','offset','rx','ry','rz','field','ux','uy','uz','opacity','qx','qy','qz','dx','cut'];
function ramp(name, colors) {
  const entries = colors.map(hex => `vec3f(${[1,3,5].map(i => (parseInt(hex.slice(i,i+2),16)/255).toFixed(6)).join(',')})`);
  return `fn ${name}(t: f32) -> vec3f { let a = array<vec3f,5>(${entries.join(',')}); let x=clamp(t,0.0,1.0)*4.0; let i=min(u32(x),3u); return mix(a[i],a[i+1u],x-f32(i)); }`;
}
export class Section {
  constructor(device, sim, format) {
    this.device = device; this.sim = sim;
    this.U = new UniformStruct(device, 'SectionParams', fields);
    const common = this.U.wgsl() + `
@group(0) @binding(0) var<uniform> P: SectionParams;
@group(0) @binding(1) var s: texture_3d<f32>;
@group(0) @binding(2) var s2: texture_3d<f32>;
@group(0) @binding(3) var vel: texture_3d<f32>;
@group(0) @binding(4) var vort: texture_3d<f32>;
@group(0) @binding(5) var geo: texture_3d<f32>;
@group(0) @binding(6) var lin: sampler;
fn uvw(p: vec3f) -> vec3f { return (p + vec3f(.6,0,.6)) / vec3f(1.2,1.8,1.2); }
`;
    const shader = common + ramp('heat',HEAT_COLORS) + ramp('cool',COOL_COLORS) + `
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(a[i],0,1);
}
@fragment fn fs(@builtin(position) px: vec4f) -> @location(0) vec4f {
  let ndc=vec2f(px.x/P.w*2.0-1.0,1.0-px.y/P.h*2.0);
  let ro=vec3f(P.px,P.py,P.pz);
  let rd=vec3f(P.fx,P.fy,P.fz)+vec3f(P.rx,P.ry,P.rz)*ndc.x*P.tanFov*P.aspect+vec3f(P.ux,P.uy,P.uz)*ndc.y*P.tanFov;
  let axis=select(2u,1u,P.horizontal>0.5);
  if(abs(rd[axis])<0.00001){discard;}
  let t=(P.offset-ro[axis])/rd[axis];
  let p=ro+rd*t;
  let uv=uvw(p);
  if(t<0.0 || any(uv<vec3f(0)) || any(uv>vec3f(1))){discard;}
  let a=textureSampleLevel(s,lin,uv,0); let b=textureSampleLevel(s2,lin,uv,0);
  let v=textureSampleLevel(vel,lin,uv,0).xyz;
  let g=textureSampleLevel(geo,lin,uv,0);
  var value=(293.0+1000.0*a.x-293.0)/1507.0;
  if(P.field==1.0){value=a.w*10000.0/15000.0;}
  if(P.field==2.0){value=a.z;}
  if(P.field==3.0){value=a.y/.15;}
  if(P.field==4.0){value=clamp(1.0-a.y-b.x,0.0,1.0);}
  if(P.field==5.0){value=length(v)/6.0;}
  if(P.field==7.0){value=length(textureSampleLevel(vort,lin,uv,0).xyz)/P.dx/100.0;}
  if(P.field==6.0){value=b.y/max(a.y+b.x,.0001)*1000.0/200.0;}
  var color=select(cool(value),heat(value),P.field<2.0);
  let q=select(vec2f(p.x,p.y),vec2f(p.x,p.z),P.horizontal>0.5);
  let grid=abs(fract(q*10.0+.5)-.5);
  let line=1.0-smoothstep(.003,.009,min(grid.x,grid.y));
  color=mix(color,vec3f(.38,.58,.66),line*.18);
  // Hatch solid cells: these are not valid gas-temperature measurements.
  if(g.z>.5 && P.cut>.5){discard;}
  if(g.z>.5){color=mix(vec3f(.10,.12,.15),vec3f(.24,.28,.31),step(.5,fract((q.x+q.y)*85.0)));}
  let edge=min(min(uv.x,1.0-uv.x),select(min(uv.y,1.0-uv.y),min(uv.z,1.0-uv.z),P.horizontal>.5));
  if(edge<.003){color=vec3f(.55,.82,.86);}
  var arrow=false;
  // Velocity arrows on a 10 cm lattice; sample direction at each arrow centre.
  if(P.field==5.0){
    let center=floor(q*10.0)/10.0+.05;
    let cp=select(vec3f(center.x,center.y,P.offset),vec3f(center.x,P.offset,center.y),P.horizontal>.5);
    let vv=textureSampleLevel(vel,lin,uvw(cp),0).xyz;
    let vv2=select(vv.xy,vv.xz,P.horizontal>.5);
    let mag=length(vv2); let dir=vv2/max(mag,.001); let d=q-center;
    let along=dot(d,dir); let across=abs(dot(d,vec2f(-dir.y,dir.x)));
    let shaft=across<.0015 && abs(along)<.027;
    let head=abs(across-(.027-along)*.6)<.002 && along>.010 && along<.027;
    if(mag>.05 && (shaft || head)){color=vec3f(.94,.98,1);arrow=true;}
  }
  // The entire cut stays legible: cold air is dark glass, hot gas is opaque.
  // This display transfer function never masks probes or scientific reductions.
  let hot=smoothstep(.157,.607,a.x); // 450–900 K
  if(P.cut>.5){let fieldWeight=select(hot,.35+.65*hot,P.field==4.0 || P.field==5.0 || P.field==7.0);color=mix(vec3f(.045,.075,.095)+vec3f(.15,.23,.27)*line,color,fieldWeight);}
  var alpha=P.opacity*select(1.0,mix(.30,1.0,hot),P.cut>.5);
  if(arrow && P.opacity>0.0){color=vec3f(.94,.98,1);alpha=max(alpha,.9);}
  // Fresh air has no gas age. Keep its glass substrate, without inventing an age color.
  if(P.field==6.0 && a.y+b.x<.0001){color=vec3f(.045,.075,.095)+vec3f(.15,.23,.27)*line;alpha=.30*P.opacity;}
  if(edge<.003){color=vec3f(.55,.82,.86);alpha=max(alpha,.85);}
  return vec4f(color,alpha);
}`;
    const module = device.createShaderModule({code:shader,label:'campfire-section'});
    const bgl = layoutFromWGSL(device,shader,GPUShaderStage.FRAGMENT);
    this.pipe=device.createRenderPipeline({layout:device.createPipelineLayout({bindGroupLayouts:[bgl]}),vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}} ]},primitive:{topology:'triangle-list'}});
    this.pipe.bgl=bgl;
    this.resources=[this.U.buffer,sim.S,sim.S2,sim.vel,sim.vort,sim.geo,sim.lin];
    this.bg=bindGroup(device,this.pipe,this.resources);
    this.out=device.createBuffer({size:80,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    this.read=device.createBuffer({size:80,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
    this.probe=computePipeline(device,common+`
@group(0) @binding(7) var<storage,read_write> out: array<vec4f,5>;
@compute @workgroup_size(1) fn main(){let u=uvw(vec3f(P.qx,P.qy,P.qz));
out[0]=textureSampleLevel(s,lin,u,0);out[1]=textureSampleLevel(s2,lin,u,0);
out[2]=textureSampleLevel(vel,lin,u,0);out[3]=textureSampleLevel(vort,lin,u,0);out[4]=textureSampleLevel(geo,lin,u,0);}`,'main','campfire-probe');
    this.probeBg=bindGroup(device,this.probe,[...this.resources,this.out]);
    this.busy=false;
  }
  update(cam,w,h,slice,point=[0,.3,0]) {
    this.U.set({w,h,aspect:w/h,tanFov:Math.tan(cam.fovY/2),px:cam.pos[0],py:cam.pos[1],pz:cam.pos[2],fx:cam.fwd[0],fy:cam.fwd[1],fz:cam.fwd[2],rx:cam.right[0],ry:cam.right[1],rz:cam.right[2],ux:cam.up[0],uy:cam.up[1],uz:cam.up[2],horizontal:+slice.horizontal,offset:slice.offset,field:FIELDS.findIndex(f=>f.id===slice.field),opacity:slice.opacity,cut:+slice.cut,qx:point[0],qy:point[1],qz:point[2],dx:this.sim.dx}).upload();
  }
  draw(enc,view) { const pass=enc.beginRenderPass({colorAttachments:[{view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(this.pipe);pass.setBindGroup(0,this.bg);pass.draw(3);pass.end(); }
  async sample(position,time) {
    if(this.busy)return null;
    this.busy=true;
    try {
      this.U.set({qx:position[0],qy:position[1],qz:position[2]}).upload();
      const enc=this.device.createCommandEncoder();const pass=enc.beginComputePass();pass.setPipeline(this.probe);pass.setBindGroup(0,this.probeBg);pass.dispatchWorkgroups(1);pass.end();
      enc.copyBufferToBuffer(this.out,0,this.read,0,80);this.device.queue.submit([enc.finish()]);
      await this.read.mapAsync(GPUMapMode.READ);const raw=new Float32Array(this.read.getMappedRange()).slice();this.read.unmap();
      return decodeSample(raw,position,time,this.sim.dx);
    } finally {this.busy=false;}
  }
}
