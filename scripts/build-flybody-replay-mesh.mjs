import fs from 'node:fs';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const base=process.argv[2]||'.scratch/xenova';
const model=JSON.parse(fs.readFileSync(base+'/body-model.json'));
const root=new THREE.Group();
for(const [name,m] of Object.entries(model.meshes)) {
 const b=fs.readFileSync(base+'/public/body/assets/meshes/'+m.file);
 let g=new STLLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 // Upstream transformVertices mirrors Y, then applies metre-to-mm scaling.
 g.scale(model.meshScale,model.meshScale*(m.mirror?-1:1),model.meshScale);
 if(m.mirror){const p=g.attributes.position;for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i+1),b=new THREE.Vector3().fromBufferAttribute(p,i+2);p.setXYZ(i+1,b.x,b.y,b.z);p.setXYZ(i+2,a.x,a.y,a.z);}}
 g.deleteAttribute('normal');g=mergeVertices(g,1e-5);g.computeVertexNormals();
 const wing=name.includes('wing'),eye=name.endsWith('eye');
 const mat=new THREE.MeshStandardMaterial({color:eye?'#a72420':wing?'#c9b9a0':name.includes('abdomen')?'#9b713b':'#b28b59',roughness:eye?.3:.56,transparent:wing,opacity:wing?.3:1,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(g,mat);mesh.name=name;root.add(mesh);
}
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}};
const glb=await new GLTFExporter().parseAsync(root,{binary:true});
fs.writeFileSync('public/assets/worlds/flybody/replay/v1/body.glb',Buffer.from(glb));
console.log(glb.byteLength);
