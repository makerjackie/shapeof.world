"""MaleCNS v1.0 CC BY 4.0 extract. Python3.12, numpy2.2.6, pyarrow21.0.0.
Download official annotations and weights into .scratch/flybody-malecns first.
Raw sources remain outside Git; deterministic output retains strongest 3 outgoing
connections with >=5 contacts between displayed, traced neurons with somata.
"""
from pathlib import Path
import hashlib,json,heapq,struct
import numpy as np
import pyarrow as pa
import pyarrow.feather as feather
ROOT=Path(__file__).resolve().parents[5]
CACHE=ROOT/'.scratch/flybody-malecns';OUT=ROOT/'public/assets/worlds/flybody/neural';OUT.mkdir(parents=True,exist_ok=True)
rows=feather.read_table(CACHE/'annotations.feather').to_pylist()
valid=sorted((r for r in rows if r['status']=='Traced' and r['somaLocation'] and len(r['somaLocation'])==3),key=lambda r:r['bodyId'])
ids=np.array([r['bodyId'] for r in valid],dtype=np.int64);count=len(valid)
types=sorted(set((r['instance'] or r['type'] or 'untyped') for r in valid));typeidx={s:i for i,s in enumerate(types)}
def group(r):
 s=r['superclass'] or ''
 if s=='descending_neuron':return 3
 if s.startswith('ol_') or s.startswith('visual_'):return 0
 if s.startswith('vnc_'):return 2
 if s.startswith('cb_'):return 1
 return 4
buf=bytearray()
for r in valid:
 x,y,z=r['somaLocation'];buf.extend(struct.pack('<fffIII',(x-48000)/14000,(y-37000)/14000,(72000-z)/14000,r['bodyId'],group(r),typeidx[r['instance'] or r['type'] or 'untyped']))
def write(name,blob):
 h=hashlib.sha256(blob).hexdigest();filename=f'{name}-{h[:12]}.bin';(OUT/filename).write_bytes(blob);return filename,h
nodefile,nodehash=write('somata',buf)
meta={'count':count,'sourceRows':len(rows),'types':types,'groups':['visual','central','nerve-cord','descending','other'],'nodes':nodefile,'nodeSha256':nodehash,'presets':[int(np.where(ids==i)[0][0]) for i in [10001,10360,10442,10010,523769] if i in ids]}
print('Nodes exported:',count,flush=True)
# Arrow record batches bound memory rather than materialising the 1.1 GB graph.
heaps=[[] for _ in valid];source_edges=0;retained=0
with pa.memory_map(str(CACHE/'connections.feather'),'r') as source:
 reader=pa.ipc.open_file(source)
 print(reader.schema,flush=True)
 for b in range(reader.num_record_batches):
  batch=reader.get_batch(b)
  names=batch.schema.names
  pre=batch.column(names.index('body_pre')).to_numpy();post=batch.column(names.index('body_post')).to_numpy();weight=batch.column(names.index('weight')).to_numpy()
  source_edges+=len(pre)
  a=np.searchsorted(ids,pre);c=np.searchsorted(ids,post)
  mask=(a<count)&(c<count)&(weight>=5)
  ix=np.nonzero(mask)[0];ix=ix[(ids[a[ix]]==pre[ix])&(ids[c[ix]]==post[ix])]
  for j in ix:
   h=heaps[a[j]];item=(int(weight[j]),-int(c[j]))
   if len(h)<3:heapq.heappush(h,item)
   elif item>h[0]:heapq.heapreplace(h,item)
  if b%200==0:print('batch',b,'/',reader.num_record_batches,flush=True)
edges=np.zeros((count,6),dtype='<u4')
for i,h in enumerate(heaps):
 for slot,(w,minus_target) in enumerate(sorted(h,reverse=True)):
  edges[i,slot*2]=-minus_target;edges[i,slot*2+1]=w;retained+=1
edgefile,edgehash=write('outputs',edges.tobytes())
meta.update(edges=edgefile,edgeSha256=edgehash,retainedEdges=retained,sourceEdges=source_edges,version='male-cns:v1.0',minimumContacts=5,outputsPerNeuron=3,coordinateUnits='uniformly scaled 8nm voxels; display axes x,y,-z',sources={p.name:hashlib.file_digest(p.open('rb'),'sha256').hexdigest() for p in [CACHE/'annotations.feather',CACHE/'connections.feather']})
(OUT/'manifest.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
print('Exported',count,'neurons',retained,'edges',flush=True)
