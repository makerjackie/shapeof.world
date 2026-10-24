#!/usr/bin/env node
/**
 * Reproducible offline molecular assets. Run from the repository root:
 *   node src/components/experiences/worlds/plant-cell/tools/build-molecules.mjs [6FKF ...]
 * Downloads unmodified CC0 PDB mmCIF into ignored node_modules/.cache/plant-cell-pdb.
 * Gaussian heavy-atom density -> Three.js marching cubes -> edge-collapse reduction.
 * No OPM coordinates or third-party models; orientation is estimated from deposited
 * transmembrane helices, with biochemical landmarks determining the membrane side.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, Vector3, Quaternion, Color } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { parseCif } from './cif.mjs';

const ROOT=resolve(fileURLToPath(new URL('../../../../../../', import.meta.url)));
const CACHE=resolve(ROOT,'node_modules/.cache/plant-cell-pdb');
const OUT=resolve(ROOT,'public/assets/plant-cell/molecules');
const IDS=['6FKF','3JCU','5L8R','6RQF','1RWT','8RUC','1AG6','1A70','1FNB'];
export const ELEMENTS={H:1,HE:2,LI:3,B:5,C:6,N:7,O:8,F:9,NA:11,MG:12,SI:14,P:15,S:16,CL:17,K:19,CA:20,MN:25,FE:26,CO:27,NI:28,CU:29,ZN:30,BR:35,CD:48,I:53};
export const GROUPS={rotor:0,alpha:1,beta:2,statorArm:3,subunitA:4,ligand:5};
const ATP_COLORS=['#c87f4f','#d8cdb0','#b9a882','#8f9aa3','#8f9aa3','#a49c7a'];
const PALETTES={
 '3JCU':['#778d58','#8c9b67','#688051','#829a64','#b1a680'],
 '5L8R':['#769b93','#85a79d','#6d9188','#a6b6a0'],
 '6RQF':['#aa8b67','#b29b78','#85775a','#aa986e'],
 '1RWT':['#8b9d68','#95a672','#7f955f'],
 '8RUC':['#9ba89b','#b1bbad','#879b94','#b3b9a5'],
 '1AG6':['#9caaac','#a6b8ba'],'1A70':['#b29d79','#9f946e'],'1FNB':['#b1b797','#9da887'],
};
const v=(p)=>new Vector3(...p);
const mean=(atoms)=>{if(!atoms.length)throw Error('Empty landmark');const p=new Vector3();for(const a of atoms)p.add(v(a.p));return p.multiplyScalar(1/atoms.length)};
const eligible=(a)=>a.element!=='H'&&a.element!=='D'&&a.residue!=='HOH'&&a.residue!=='DOD';
export function classifyATP(description){
 if(!/^ATP synthase /i.test(description))return GROUPS.ligand;
 if(/gamma|epsilon|subunit c,/i.test(description))return GROUPS.rotor;
 if(/subunit alpha/i.test(description))return GROUPS.alpha;
 if(/subunit beta/i.test(description))return GROUPS.beta;
 if(/delta|subunit b(?:'|,)/i.test(description))return GROUPS.statorArm;
 if(/subunit a,/i.test(description))return GROUPS.subunitA;
 return GROUPS.ligand;
}
async function cachedCif(id){
 const path=resolve(CACHE,`${id}.cif`);try{return await readFile(path,'utf8')}catch{}
 // curl respects the author's networking configuration; no credentials are needed.
 execFileSync('curl',['--fail','--silent','--show-error','--location','--retry','3','--max-time','120',`https://files.rcsb.org/download/${id}.cif`,'-o',path]);
 return readFile(path,'utf8');
}
function operation(row,p){return [1,2,3].map(i=>[1,2,3].reduce((s,j)=>s+Number(row[`matrix[${i}][${j}]`])*p[j-1],Number(row[`vector[${i}]`])))}
function readAtoms(cif){
 const descriptions=new Map(cif._entity.map(e=>[e.id,e.pdbx_description]));
 // Alternate conformations are mutually exclusive: keep the highest occupancy,
 // choosing the first alt id on ties, not two overlapping copies of an atom.
 const choices=new Map();
 for(const a of cif._atom_site){
  if(a.pdbx_PDB_model_num&&a.pdbx_PDB_model_num!=='1')continue;
  const atom={p:[+a.Cartn_x,+a.Cartn_y,+a.Cartn_z],element:a.type_symbol.toUpperCase(),residue:a.label_comp_id,name:a.label_atom_id,seq:+a.label_seq_id,authSeq:+a.auth_seq_id,chain:a.label_asym_id,authChain:a.auth_asym_id,entity:a.label_entity_id,description:descriptions.get(a.label_entity_id)??'',occupancy:+a.occupancy};
  if(!eligible(atom))continue;
  const key=[a.label_asym_id,a.label_seq_id,a.auth_seq_id,a.label_atom_id,a.label_comp_id].join(':');
  if(!choices.has(key)||choices.get(key).occupancy<atom.occupancy)choices.set(key,atom);
 }return [...choices.values()];
}
function buildAssembly(cif,id,base){
 if(id==='1RWT'){
  // 1RWT deposited biological assembly is a 60-mer proteoliposome. Its native
  // membrane building block is the C3 trimer around crystallographic Z: chain A
  // and the two 120-degree copies, including ligands assigned to auth chain A.
  const selected=base.filter(a=>a.authChain==='A');
  const atoms=['1','2','3'].flatMap(op=>selected.map(a=>({...a,chain:`${a.chain}@${op}`,p:operation(cif._pdbx_struct_oper_list.find(r=>r.id===op),a.p)})));
  return {atoms,note:'Native C3 LHCII trimer: auth chain A with its ligands, operations 1,2,3. The deposited assembly 1 is a 60-mer proteoliposome and is deliberately not rendered.',operators:['1','2','3']};
 }
 const rows=cif._pdbx_struct_assembly_gen.filter(r=>r.assembly_id==='1');
 const atoms=[];const operators=[];
 for(const r of rows){
  if(/[()]/.test(r.oper_expression))throw Error(`Unsupported composite operator ${id}`);
  const ops=r.oper_expression.split(',').flatMap(s=>s.includes('-')?Array.from({length:+s.split('-')[1]-+s.split('-')[0]+1},(_,i)=>String(+s.split('-')[0]+i)):[s]);
  const chains=new Set(r.asym_id_list.split(','));
  for(const op of ops){operators.push(op);const matrix=cif._pdbx_struct_oper_list.find(x=>x.id===op);for(const a of base)if(chains.has(a.chain))atoms.push({...a,chain:`${a.chain}@${op}`,p:operation(matrix,a.p)});}
 }
 return {atoms,note:'Biological assembly 1 from deposited mmCIF operators; first model and highest-occupancy atom conformer only.',operators};
}
function principalDirection(directions){
 // Power iteration on sum(u u^T) is sign-invariant for antiparallel TM helices.
 const m=Array.from({length:3},()=>[0,0,0]);
 for(const p of directions)for(let i=0;i<3;i++)for(let j=0;j<3;j++)m[i][j]+=p[i]*p[j];
 let x=[.33,.57,.75];for(let k=0;k<64;k++){let n=m.map(r=>r.reduce((s,c,i)=>s+c*x[i],0));let l=Math.hypot(...n);if(l<1e-10)throw Error('Degenerate orientation');x=n.map(v=>v/l)}return v(x);
}
function tmHelices(cif,base,id){
 const allowed=id==='3JCU'?new Set(['1','2','3','4','7','17','18']):id==='5L8R'?new Set(['1','2','3','4','5','6']):id==='6RQF'?new Set(['1','2','5','6','7','8']):new Set(['1']);
 const directions=[],centres=[];const keyAtoms=new Map();
 for(const a of base)if(a.name==='CA'&&allowed.has(a.entity)){let list=keyAtoms.get(a.chain)??[];list.push(a);keyAtoms.set(a.chain,list)}
 for(const h of cif._struct_conf??[]){
  if(h.conf_type_id!=='HELX_P'||+h.end_label_seq_id-+h.beg_label_seq_id<17)continue;
  if(id==='1RWT'&&h.beg_label_asym_id!=='A')continue;
  const all=keyAtoms.get(h.beg_label_asym_id)??[];
  const aa=all.filter(a=>a.seq>=+h.beg_label_seq_id&&a.seq<=+h.end_label_seq_id).sort((a,b)=>a.seq-b.seq);
  if(aa.length<16)continue;
  const lo=mean(aa.slice(0,4)),hi=mean(aa.slice(-4)),axis=hi.clone().sub(lo);
  // A helix long enough to cross a ~3 nm hydrophobic core; short surface
  // helices are excluded from the membrane-normal estimate.
  if(axis.length()<20)continue;
  directions.push(axis.normalize().toArray());centres.push(lo.add(hi).multiplyScalar(.5));
 }
 if(!directions.length)throw Error(`No transmembrane helices for ${id}`);
 const normal=principalDirection(directions);
 const aligned=centres.filter((_,i)=>Math.abs(normal.dot(v(directions[i])))>.70);
 const origin=new Vector3();for(const p of aligned)origin.add(p);origin.multiplyScalar(1/aligned.length);
 return {normal,origin,count:aligned.length,candidateCount:directions.length};
}
function orient(cif,id,base,atoms){
 let origin,normal,method,helixCount=0;const landmarks={};
 if(id==='6FKF'){
  origin=mean(atoms.filter(a=>/subunit c,/i.test(a.description)));
  const gamma=mean(atoms.filter(a=>/gamma/i.test(a.description)));
  normal=gamma.clone().sub(origin).normalize();method='c14-ring heavy-atom centre to gamma-chain heavy-atom centre';
  landmarks.cRing=origin.clone();landmarks.gamma=gamma;landmarks.CF1=mean(atoms.filter(a=>/subunit alpha|subunit beta/i.test(a.description)));
 }else if(['3JCU','5L8R','6RQF','1RWT'].includes(id)){
  const tm=tmHelices(cif,base,id);origin=tm.origin;normal=tm.normal;helixCount=tm.count;method='Dominant direction of deposited long transmembrane alpha helices; signed using biochemical sidedness markers';
  if(id==='3JCU'){
   const manganese=atoms.filter(a=>a.element==='MN');landmarks.oxygenEvolvingMn=mean(manganese);
   landmarks.oxygenEvolvingProteins=mean(atoms.filter(a=>/oxygen-evolving enhancer/i.test(a.description)));
   if(landmarks.oxygenEvolvingMn.clone().sub(origin).dot(normal)>0)normal.negate();
  }else if(id==='5L8R'){
   // Auth chains C/D/E are PsaC/PsaD/PsaE; entity 9 is uninformatively
   // titled "Putative uncharacterized protein", so author chain is retained.
   for(const [name,chain]of [['PsaC','C'],['PsaD','D'],['PsaE','E']])landmarks[name]=mean(atoms.filter(a=>a.authChain===chain&&a.name==='CA'));
   if(landmarks.PsaC.clone().sub(origin).dot(normal)<0)normal.negate();
  }else if(id==='6RQF'){
   landmarks.cytochromeFHead=mean(atoms.filter(a=>a.description==='Cytochrome f'&&a.seq<230));
   landmarks.rieskeHead=mean(atoms.filter(a=>/iron-sulfur subunit/i.test(a.description)&&a.seq>75));
   if(landmarks.cytochromeFHead.clone().sub(origin).dot(normal)>0)normal.negate();
  }else{
   // Averaging the symmetry-related origins places the trimer on its C3 axis.
   const originals=['1','2','3'].map(op=>v(operation(cif._pdbx_struct_oper_list.find(r=>r.id===op),origin.toArray())));
   origin=new Vector3();for(const p of originals)origin.add(p);origin.multiplyScalar(1/3);
   normal=new Vector3(0,0,1);
   landmarks.NTerminus=mean(atoms.filter(a=>a.seq>0&&a.seq<30));
   if(landmarks.NTerminus.clone().sub(origin).dot(normal)<0)normal.negate();
   method='Native C3 axis, signed by stromal N-terminal peptide';
  }
 }else{origin=mean(atoms);normal=new Vector3(0,1,0);method='Soluble protein, biological-assembly centroid; no membrane orientation required'}
 const rotation=new Quaternion().setFromUnitVectors(normal,new Vector3(0,1,0));
 for(const a of atoms)a.p=v(a.p).sub(origin).applyQuaternion(rotation).multiplyScalar(.1).toArray();
 return {method,helixCount,sourceOriginAngstrom:origin.toArray(),sourceNormal:normal.toArray(),normal:[0,1,0],stroma:'+Y',lumen:'-Y',landmarksNm:Object.fromEntries(Object.entries(landmarks).map(([k,p])=>[k,p.clone().sub(origin).applyQuaternion(rotation).multiplyScalar(.1).toArray()]))};
}
function span(atoms){let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const a of atoms)for(let j=0;j<3;j++){min[j]=Math.min(min[j],a.p[j]);max[j]=Math.max(max[j],a.p[j])}return {minNm:min,maxNm:max,spansNm:min.map((v,i)=>max[i]-v)}}
function metadata(cif,id,assembly,orientation){
 const citation=cif._citation?.find(x=>x.id==='primary')??cif._citation?.[0]??{};
 const organism=[...new Set([...(cif._entity_src_nat??[]).map(x=>x.pdbx_organism_scientific),...(cif._entity_src_gen??[]).map(x=>x.pdbx_gene_src_scientific_name)].filter(Boolean))].join('; ');
 const polymers=new Set((cif._entity_poly??[]).map(e=>e.entity_id));
 const chains=Object.values(assembly.atoms.reduce((o,a)=>{o[a.chain]??={chain:a.chain,authorChain:a.authChain,entity:a.entity,description:a.description,group:classifyATP(a.description),atomCount:0};o[a.chain].atomCount++;return o},{})).filter(chain=>id==='6FKF'||polymers.has(chain.entity));
 return {id,title:cif._struct?.[0]?.title??id,organism,resolutionAngstrom:Number(cif._refine?.[0]?.ls_d_res_high??cif._em_3d_reconstruction?.[0]?.resolution)||null,citationTitle:citation.title??'',citationDOI:citation.pdbx_database_id_DOI&&citation.pdbx_database_id_DOI!=='?'?citation.pdbx_database_id_DOI:`10.2210/pdb${id}/pdb`,pdbDOI:`10.2210/pdb${id}/pdb`,source:`https://files.rcsb.org/download/${id}.cif`,license:'CC0-1.0',licenseURL:'https://www.rcsb.org/pages/usage-policy',assembly:assembly.note,assemblyOperators:assembly.operators,heavyAtomCount:assembly.atoms.length,chains,orientation,...span(assembly.atoms),warnings:id==='1A70'?['Deposited spinach ferredoxin I is the E92K mutant; this is not an unmutated native sequence.']:id==='5L8R'?['Pea (Pisum sativum; currently Lathyrus oleraceus in the PDB taxonomy), not spinach.']:[]};
}
function bins(atoms,cell){const map=new Map();for(let i=0;i<atoms.length;i++){const key=atoms[i].p.map(x=>Math.floor(x/cell)).join(',');let b=map.get(key);if(!b){b=[];map.set(key,b)}b.push(i)}return map}
function neighborIds(map,p,cell,r){const c=p.map(x=>Math.floor(x/cell)),out=[];for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++){const a=map.get([c[0]+x,c[1]+y,c[2]+z].join(','));if(a)out.push(...a)}return out}
function atomBinary(atoms,meta){
 const n=atoms.length,buffer=Buffer.alloc(32+n*10);buffer.write('PCAT');buffer.writeUInt32LE(1,4);buffer.writeUInt32LE(n,8);buffer.writeFloatLE(.001,12);
 const chainIds=new Map(meta.chains.map((c,i)=>[c.chain,i]));const b=bins(atoms,1);const counts=[];
 for(let i=0;i<n;i++){
  const a=atoms[i],p=a.p;for(let j=0;j<3;j++)buffer.writeInt16LE(Math.round(p[j]*1000),32+(i*3+j)*2);
  buffer[32+n*6+i]=ELEMENTS[a.element]??6;buffer[32+n*7+i]=classifyATP(a.description);
  let count=0;for(const k of neighborIds(b,p,1,1))if(k!==i&&atoms[k].p.reduce((s,x,j)=>s+(x-p[j])**2,0)<1)count++;
  counts.push(count);buffer[32+n*8+i]=Math.round(255*Math.min(1,count/240));buffer[32+n*9+i]=chainIds.get(a.chain);
 }
 meta.atomFormat={magic:'PCAT',version:1,count:n,quantumNm:.001,headerBytes:32,arrays:['int16 xyz','uint8 atomicNumber','uint8 group','uint8 occlusion','uint8 chain'],groups:GROUPS,occlusion:'Number of other heavy atoms within 1 nm / 240, clamped to [0,1]; visual ambient-occlusion proxy, not an electrostatic calculation.'};
 meta.atomGroupCounts=Object.fromEntries(Object.entries(GROUPS).map(([name,g])=>[name,atoms.filter(a=>classifyATP(a.description)===g).length]));
 meta.neighborCounts={min:Math.min(...counts),max:Math.max(...counts),mean:counts.reduce((a,b)=>a+b,0)/n};
 return buffer;
}
function surfaceColor(id,a){
 const palette=id==='6FKF'?ATP_COLORS:PALETTES[id];const index=id==='6FKF'?classifyATP(a.description):+a.entity%palette.length;return new Color(palette[index]);
}
function surfaceGeometry(id,atoms){
 const limits=span(atoms),centre=limits.minNm.map((x,i)=>(x+limits.maxNm[i])/2),side=Math.max(...limits.spansNm)+2.8;
 // ~0.3 nm Gaussian blur is deliberately coarser than atomic van der Waals
 // surfaces. Large complexes retain 9k-14k faces; soluble proteins 2k-4k.
 const resolution=Math.max(30,Math.min(80,Math.ceil(side/.32))),sigma=.29,cutoff=sigma*3.1;
 const mc=new MarchingCubes(resolution,new MeshBasicMaterial(),false,false,220000);mc.isolation=3.5;
 const step=side/resolution,lower=centre.map(x=>x-side/2);
 for(const a of atoms){
  const q=a.p.map((x,j)=>(x-lower[j])/step),radius=Math.ceil(cutoff/step);
  for(let z=Math.max(1,Math.floor(q[2])-radius);z<=Math.min(resolution-2,Math.ceil(q[2])+radius);z++)for(let y=Math.max(1,Math.floor(q[1])-radius);y<=Math.min(resolution-2,Math.ceil(q[1])+radius);y++)for(let x=Math.max(1,Math.floor(q[0])-radius);x<=Math.min(resolution-2,Math.ceil(q[0])+radius);x++){
   const distance=((x-q[0])**2+(y-q[1])**2+(z-q[2])**2)*step*step;if(distance>cutoff*cutoff)continue;
   mc.field[x+resolution*(y+resolution*z)]+=Math.exp(-distance/(2*sigma*sigma));
  }
 }
 mc.update();const raw=new Float32Array(mc.count*3);for(let i=0;i<raw.length;i++)raw[i]=mc.positionArray[i]*side/2+centre[i%3];
 let geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(raw,3));geometry=mergeVertices(geometry,1e-4);
 const inputTriangles=geometry.index.count/3;const target=id==='3JCU'?12000:['5L8R','6FKF','8RUC'].includes(id)?9000:id==='6RQF'||id==='1RWT'?6500:2500;
 const remove=Math.max(0,geometry.attributes.position.count-Math.floor(target/2));
 if(remove>0)geometry=new SimplifyModifier().modify(geometry,remove);
 geometry.computeVertexNormals();const p=geometry.attributes.position.array,colors=new Float32Array(p.length);const search=bins(atoms,1);
 for(let i=0;i<p.length;i+=3){let pos=[p[i],p[i+1],p[i+2]],near=neighborIds(search,pos,1,1),best=0,dist=Infinity;if(!near.length)near=neighborIds(search,pos,1,3);
  for(const index of near){const d=atoms[index].p.reduce((s,x,j)=>s+(x-pos[j])**2,0);if(d<dist){dist=d;best=index}}
  const color=surfaceColor(id,atoms[best]);colors.set([color.r,color.g,color.b],i);
 }
 geometry.setAttribute('color',new Float32BufferAttribute(colors,3));mc.geometry.dispose();mc.material.dispose();
 return {geometry,details:{method:'Gaussian heavy-atom density, marching cubes, edge-collapse decimation',gaussianSigmaNm:sigma,isovalue:3.5,gridStepNm:step,gridResolution:resolution,inputTriangles,triangles:geometry.index.count/3,vertices:geometry.attributes.position.count}};
}
function surfaceBinary(geometry){
 const p=geometry.attributes.position.array,normals=geometry.attributes.normal.array,colors=geometry.attributes.color.array,index=geometry.index.array,n=p.length/3;
 if(n>65535)throw Error('Surface exceeds uint16 vertices');
 const buffer=Buffer.alloc(32+n*12+index.length*2);buffer.write('PCMS');buffer.writeUInt32LE(1,4);buffer.writeUInt32LE(n,8);buffer.writeUInt32LE(index.length,12);buffer.writeFloatLE(.002,16);
 for(let i=0;i<p.length;i++){buffer.writeInt16LE(Math.round(p[i]*500),32+i*2);buffer.writeInt8(Math.round(Math.max(-1,Math.min(1,normals[i]))*127),32+n*6+i);buffer[32+n*9+i]=Math.round(Math.max(0,Math.min(1,colors[i]))*255)}
 for(let i=0;i<index.length;i++)buffer.writeUInt16LE(index[i],32+n*12+i*2);
 return buffer;
}
async function build(id){
 const start=Date.now(),source=await cachedCif(id),cif=parseCif(source),base=readAtoms(cif),assembly=buildAssembly(cif,id,base);
 const orientation=orient(cif,id,base,assembly.atoms),meta=metadata(cif,id,assembly,orientation);
 meta.sourceSha256=createHash('sha256').update(source).digest('hex');
 if(id==='6FKF'){const atomic=gzipSync(atomBinary(assembly.atoms,meta),{level:9});await writeFile(resolve(OUT,`${id}.atoms.bin.gz`),atomic);meta.atomCompressedBytes=atomic.length;}
 console.log(`${id}: ${assembly.atoms.length} heavy atoms, orientation ${JSON.stringify(orientation.landmarksNm)}`);
 const {geometry,details}=surfaceGeometry(id,assembly.atoms),surface=gzipSync(surfaceBinary(geometry),{level:9});meta.surface={...details,compressedBytes:surface.length,format:'PCMS v1: 32-byte header, int16 xyz (0.002 nm), int8 normals, uint8 linear RGB, uint16 triangle indices'};
 await writeFile(resolve(OUT,`${id}.surface.bin.gz`),surface);await writeFile(resolve(OUT,`${id}.json`),JSON.stringify(meta,null,2)+'\n');
 console.log(`${id}: ${details.triangles} triangles, ${surface.length} gzip bytes, ${(Date.now()-start)/1000}s`);
}
async function buildLigand(id){
 const path=resolve(CACHE,`${id}.cif`);
 let text;try{text=await readFile(path,'utf8')}catch{
  execFileSync('curl',['--fail','--silent','--show-error','--location','--retry','3','--max-time','120',`https://files.rcsb.org/ligands/download/${id}.cif`,'-o',path]);text=await readFile(path,'utf8');
 }
 const cif=parseCif(text),atomRows=cif._chem_comp_atom.filter(a=>a.type_symbol!=='H'&&a.type_symbol!=='D');
 const names=new Map(atomRows.map((a,i)=>[a.atom_id,i]));
 const positions=atomRows.map(a=>['x','y','z'].map(axis=>Number(a[`pdbx_model_Cartn_${axis}_ideal`])*.1));
 const center=[0,1,2].map(j=>positions.reduce((sum,p)=>sum+p[j],0)/positions.length);
 const ligand={id,title:cif._chem_comp[0].name,source:`https://files.rcsb.org/ligands/download/${id}.cif`,license:'CC0-1.0',coordinateType:'Chemical Component Dictionary ideal heavy-atom coordinates, centered, nanometres; phosphate protonation state is schematic.',
  positions:positions.flatMap(p=>p.map((x,j)=>Math.round((x-center[j])*100000)/100000)),
  elements:atomRows.map(a=>ELEMENTS[a.type_symbol.toUpperCase()]),
  names:atomRows.map(a=>a.atom_id),
  bonds:cif._chem_comp_bond.filter(b=>names.has(b.atom_id_1)&&names.has(b.atom_id_2)).map(b=>[names.get(b.atom_id_1),names.get(b.atom_id_2),b.value_order==='DOUB'?2:b.value_order==='TRIP'?3:1]),
 };
 await writeFile(resolve(OUT,`${id}.ligand.json`),JSON.stringify(ligand)+'\n');
 console.log(`${id}: ${atomRows.length} ideal heavy atoms`);
}
export async function main(){await mkdir(CACHE,{recursive:true});await mkdir(OUT,{recursive:true});const ids=process.argv.slice(2).filter(s=>!s.startsWith('--'));for(const id of ids.length?ids:IDS){if(!IDS.includes(id))throw Error(`Unknown PDB ${id}`);await build(id)}if(!ids.length)for(const id of ['ATP','ADP','PO4'])await buildLigand(id)}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
