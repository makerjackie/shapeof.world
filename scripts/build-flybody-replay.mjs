/** Offline only. Supply a pinned Neural Canvas download; never ships the full graph. */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { BrainCPU, PARAMETERS } from './vendor/flybody-xenova/brain.js';
import { FlyController } from './vendor/flybody-xenova/controller.js';
import { PulseBank, populations, decodeCounts } from './vendor/flybody-xenova/stimulus.js';
import { Gait } from './vendor/flybody-xenova/gait.js';
const cache = process.argv[2] || '.scratch/xenova';
const out = 'public/assets/worlds/flybody/replay/v1';
const json = p => JSON.parse(fs.readFileSync(p));
const manifest = json(path.join(cache, 'public/data/manifest.json'));
const unpack = (file, hash) => {
 const bytes = fs.readFileSync(path.join(cache, 'public/data', file));
 if (hash && createHash('sha256').update(bytes).digest('hex') !== hash) throw Error(`Checksum: ${file}`);
 return gunzipSync(bytes);
};
const neurons = JSON.parse(unpack(manifest.metadata));
const graph = {n: manifest.neurons, neurons, sign: Int32Array.from(neurons, r => r[5])};
for (const a of manifest.arrays) {
 const b = Buffer.concat(a.parts.map(p => unpack(p.file,p.sha256)));
 graph[a.name] = new Uint32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 if(graph[a.name].length!==a.length)throw Error('Array length');
}
const model = json(path.join(cache,'body-model.json'));
const segments = Object.keys(model.meshes);
const brain = new BrainCPU(graph,{seed:1});
const groups = populations(neurons);
// Match by dataset ID, never by visual proximity or array index across datasets.
const atlasMeta = json('public/assets/worlds/flybody/neural/manifest.json');
const atlas = fs.readFileSync('public/assets/worlds/flybody/neural/'+atlasMeta.nodes);
const atlasIds=new Set(Array.from({length:atlasMeta.count},(_,i)=>atlas.readUInt32LE(i*24+12)));
const tracks=[];
fs.mkdirSync(out,{recursive:true});
for (const [name,group,profile] of [['walk','walk','paint'],['left','left','turn'],['right','right','turn']]) {
 brain.reset();const controller=new FlyController(),gait=new Gait(model),pulses=new PulseBank(graph.n);
 const frames=[], poses=[], activity=[], offsets=[0]; let total=0;
 for(let f=0;f<250;f++) {
  if(f===20)pulses.add(groups[group],brain.tick,180,profile);
  const result=brain.batch(100,pulses.sample(brain.tick));
  const channels=decodeCounts(result.counts,groups,100);
  const pose=controller.advance(channels,.01),transforms=gait.update(pose);
  frames.push(...channels,pose.velocity,pose.yawRate,pose.yaw,pose.x,pose.z,pose.y);
  for(const s of segments) poses.push(...transforms[s]);
  for(let i=0;i<graph.n;i++)if(result.counts[i]&&atlasIds.has(Number(neurons[i][0]))) activity.push(Number(neurons[i][0]),result.counts[i]);
  offsets.push(activity.length/2);total+=result.total;
  if(f%50===0)console.log(name,f,'spikes',total,'speed',pose.velocity.toFixed(2));
 }
 const write=(suffix,Typed,values)=>{const a=Typed.from(values);fs.writeFileSync(`${out}/${name}-${suffix}.bin.gz`,gzipSync(new Uint8Array(a.buffer),{level:9}));};
 write('frames',Float32Array,frames);write('poses',Float32Array,poses);write('activity',Uint32Array,activity);write('offsets',Uint32Array,offsets);
 tracks.push({name,frames:250,dt:.01,totalSpikes:total,visibleEvents:activity.length/2,input:group,profile});
}
fs.writeFileSync(`${out}/manifest.json`,JSON.stringify({version:1,revision:'776d115ee5aa934578a87fd6d260d138084f59c1',parameters:PARAMETERS,neurons:graph.n,edges:graph.sources.length,seed:1,segments,tracks,frameWidth:12,activity:'bodyId, spike count per 10ms; all firing cells shared with anatomical atlas',playbackSpeed:.25,scope:'Locally precomputed upstream LIF model and engineered IK controller; not measured animal activity, not closed-loop biomechanics.'},null,2)+'\n');
