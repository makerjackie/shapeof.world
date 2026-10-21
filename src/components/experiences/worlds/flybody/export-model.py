"""Build only Apache-2.0 flybody geometry; never fetch Figshare datasets/policies.
Run with Python 3.12 and requirements-model.txt.
Upstream mesh geometry and MJCF transforms are adapted; see asset SOURCES.md.
"""
import concurrent.futures, hashlib, json, pathlib, subprocess, xml.etree.ElementTree as ET
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
REV = 'd015e9bfe441bd90ae431bac24c55cb74bdbce26'
ROOT = pathlib.Path(__file__).resolve().parents[5]
CACHE = ROOT / '.scratch/flybody-upstream'
OUT = ROOT / 'public/assets/worlds/flybody'
BASE = f'https://raw.githubusercontent.com/TuragaLab/flybody/{REV}/'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
def fetch(path):
    target = CACHE / pathlib.Path(path).name
    if not target.exists():
        temp = target.with_suffix(target.suffix + '.part')
        subprocess.run(['curl', '-fsSL', '--retry', '4', '--retry-all-errors', '--max-time', '120', BASE + path, '-o', str(temp)], check=True)
        temp.replace(target)
    return target
xml = fetch('flybody/fruitfly/assets/fruitfly.xml')
root = ET.parse(xml).getroot()
assets = root.find('asset')
mesh_files = {x.attrib['name']:x.attrib['file'] for x in assets.findall('mesh')}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(fetch, ['flybody/fruitfly/assets/'+v for v in mesh_files.values()]))
(OUT/'LICENSE').write_bytes(fetch('LICENSE').read_bytes())
scene = trimesh.Scene(base_frame='world')
materials = {}
for m in assets.findall('material'):
    rgba = [float(v) for v in m.get('rgba','1 1 1 1').split()]
    materials[m.get('name')] = PBRMaterial(name=m.get('name'), baseColorFactor=rgba,
       metallicFactor=0.12, roughnessFactor=0.46, doubleSided=True,
       alphaMode='BLEND' if rgba[3]<1 else 'OPAQUE')

def transform(el):
    q = [float(v) for v in el.get('quat','1 0 0 0').split()]
    mat=trimesh.transformations.quaternion_matrix(q)
    mat[:3,3]=[float(v) for v in el.get('pos','0 0 0').split()]
    return mat

counts = [0,0]
def visit(body, parent):
    name=body.get('name')
    scene.graph.update(frame_to=name, frame_from=parent, matrix=transform(body))
    for geom in body.findall('geom'):
        key=geom.get('mesh')
        if not key: continue
        mesh=trimesh.load(CACHE/mesh_files[key], force='mesh', process=True)
        counts[0]+=len(mesh.faces)
        # Preserve facet-rich compound eyes and fine wing veins; simplify large surfaces.
        budget=10000 if key=='head_red' else 3500 if 'wing' in key else 1800
        if len(mesh.faces)>budget: mesh=mesh.simplify_quadric_decimation(face_count=budget)
        mesh.apply_scale(0.1)  # MJCF default mesh scale, centimetres.
        mesh.visual=trimesh.visual.TextureVisuals(material=materials[geom.get('material','body')])
        counts[1]+=len(mesh.faces)
        scene.add_geometry(mesh, node_name='mesh_'+geom.get('name'), geom_name=key,
                           parent_node_name=name, transform=transform(geom))
    for child in body.findall('body'): visit(child,name)
visit(root.find('worldbody/body'),'world')
def credit(tree):
    tree['asset']['copyright'] = 'flybody: HHMI Janelia / Google DeepMind; Apache-2.0. Modified by Shape of the World (2026-09-12). See SOURCES.md and LICENSE.'
    tree['asset']['extras'] = {'sourceRevision': REV, 'modifications': 'Mesh simplification and MJCF-to-glTF conversion; no policies or datasets.'}
blob=scene.export(file_type='glb', tree_postprocessor=credit)
digest=hashlib.sha256(blob).hexdigest()
name=f'flybody-{digest[:12]}.glb'
(OUT/name).write_bytes(blob)
record={'revision':REV,'output':name,'sha256':digest,'bytes':len(blob),'trianglesBefore':counts[0],'trianglesAfter':counts[1],
        'inputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(CACHE.iterdir()) if p.suffix in ['.obj','.xml']}}
(OUT/'manifest.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k!='inputs'},indent=2))
