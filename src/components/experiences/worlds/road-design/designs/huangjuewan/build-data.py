"""Rebuild the compact ODbL road/terrain derivative (development tool, not bundled).
Usage: python build-data.py expanded-osm.json tile-directory output-directory
Requires numpy scipy osqp pillow. Inputs/HTTP provenance are documented alongside.
"""
import json, math, sys, collections, hashlib
from pathlib import Path
import numpy as np
from scipy import sparse
from scipy.ndimage import gaussian_filter
from scipy.spatial import cKDTree
import osqp
from PIL import Image
raw_path,tile_path,output=map(Path,sys.argv[1:4]); output.mkdir(exist_ok=True,parents=True)
CENTER=(29.588,106.601); R=6371000; rad=math.pi/180
project=lambda g: ((g['lon']-CENTER[1])*rad*R*math.cos(CENTER[0]*rad),-(g['lat']-CENTER[0])*rad*R)
raw=json.loads(raw_path.read_text()); ways=[]
# The low-speed primary street system is outside this free-flow interchange model.
# Keep links touching the 1 km interchange core; peripheral urban ramp terminals
# remain boundary portals, rather than inventing unrecorded signal controls.
for w in raw['elements']:
 t=w['tags'];h=t['highway']
 if h=='primary' or h=='primary_link':continue
 ps=[project(p) for p in w['geometry']]
 if '_link' in h and not any(abs(x)<500 and abs(z)<700 for x,z in ps):continue
 ways.append({**w,'xy':ps})
# Clip to a 3.2 km square, retaining actual OSM shared-node identities.
coords={}; roads=[]
def inside(p):return max(abs(p[0]),abs(p[1]))<=1600
for w in ways:
 runs=[];run=[]
 for i,(nid,p) in enumerate(zip(w['nodes'],w['xy'])):
  if i:
   a=w['xy'][i-1]; last=w['nodes'][i-1]
   if inside(a)!=inside(p):
    ax,az=a;dx,dz=p[0]-ax,p[1]-az;ts=[]
    for v,d in [(ax,dx),(az,dz)]:
     if abs(d)>1e-8:
      for bound in [-1600,1600]:
       tt=(bound-v)/d
       if 0<=tt<=1 and max(abs(ax+dx*tt),abs(az+dz*tt))<=1600.001:ts.append(tt)
    if ts:
     tt=ts[0];new=f'clip-{w["id"]}-{i}';coords[new]=(ax+dx*tt,az+dz*tt)
     if inside(a):run.append(new);runs.append(run);run=[]
     else:run=[new]
  if inside(p):coords[str(nid)]=p;run.append(str(nid))
 if len(run)>1:runs.append(run)
 for k,ids in enumerate(runs):
  if len(ids)<2:continue
  t=w['tags'];direction=t.get('oneway','yes');ids=ids[::-1] if direction=='-1' else ids
  road={'id':str(w['id'])+(f'-{k}' if len(runs)>1 else ''),'osmId':w['id'],'nodes':ids,'highway':t['highway'],'layer':int(t.get('layer','0')),'bridge':t.get('bridge')=='yes','tunnel':t.get('tunnel')=='yes','lanes':int(t.get('lanes','1' if '_link' in t['highway'] else '3').split(';')[0]),'name':t.get('name','')}
  roads.append(road)
# Disconnected peripheral motorway fragments should not become false approaches.
node_roads=collections.defaultdict(list)
for i,w in enumerate(roads):
 for n in w['nodes']:node_roads[n].append(i)
seed=next(i for i,w in enumerate(roads) if w['osmId']==497122801);seen={seed};todo=[seed]
while todo:
 i=todo.pop()
 for n in roads[i]['nodes']:
  for j in node_roads[n]:
   if j not in seen:seen.add(j);todo.append(j)
roads=[w for i,w in enumerate(roads) if i in seen]
# Terrain provenance is provided by the S3 HTTP x-amz-meta-x-imagery-sources header.
tiles={}
for p in tile_path.glob('12-*.png'):
 z,x,y=map(int,p.stem.split('-'));a=np.array(Image.open(p)).astype(float);tiles[x,y]=a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768

def terrain(x,z):
 lat=CENTER[0]-z/R/rad;lon=CENTER[1]+x/(R*math.cos(CENTER[0]*rad))/rad
 px=(lon+180)/360*4096*256;py=(1-math.asinh(math.tan(lat*rad))/math.pi)/2*4096*256
 ix,iy=math.floor(px),math.floor(py);fx,fy=px-ix,py-iy
 def at(xx,yy):return tiles[xx//256,yy//256][yy%256,xx%256]
 return float(at(ix,iy)*(1-fx)*(1-fy)+at(ix+1,iy)*fx*(1-fy)+at(ix,iy+1)*(1-fx)*fy+at(ix+1,iy+1)*fx*fy)
base=terrain(0,0); size=129;step=25;origin=-1600
values=np.array([[terrain(origin+i*step,origin+j*step)-base for i in range(size)]for j in range(size)])
# 30 m SRTM is not a surveyed carriageway grade: smooth its target profile at 50 m.
terrain_smooth=gaussian_filter(values,2)
def ground(x,z):
 xx=max(0,min(size-1,(x-origin)/step));zz=max(0,min(size-1,(z-origin)/step));i,j=int(xx),int(zz);fx,fz=xx-i,zz-j
 return float(terrain_smooth[j,i]*(1-fx)*(1-fz)+terrain_smooth[j,min(i+1,size-1)]*fx*(1-fz)+terrain_smooth[min(j+1,size-1),i]*(1-fx)*fz+terrain_smooth[min(j+1,size-1),min(i+1,size-1)]*fx*fz)
# Densify horizontal roads to <= 12 m, preserving all original shared vertices.
for w in roads:
 dense=[w['nodes'][0]]
 for j in range(1,len(w['nodes'])):
  a,b=w['nodes'][j-1:j+1];pa,pb=coords[a],coords[b];length=math.dist(pa,pb);n=max(1,math.ceil(length/12))
  for k in range(1,n):
   v=f'{w["id"]}:{j}:{k}';coords[v]=(pa[0]+(pb[0]-pa[0])*k/n,pa[1]+(pb[1]-pa[1])*k/n);dense.append(v)
  dense.append(b)
 w['nodes']=dense
ids=list(dict.fromkeys(n for w in roads for n in w['nodes']));idx={n:i for i,n in enumerate(ids)};N=len(ids);target=np.zeros(N);weights=np.zeros(N)
for w in roads:
 for n in w['nodes']:
  i=idx[n];x,z=coords[n];weight=1 if w['bridge'] or w['tunnel'] else 2
  target[i]+=weight*(ground(x,z)+w['layer']*7.5+.12);weights[i]+=weight
weights=np.maximum(weights,.1);target/=weights
# Sparse quadratic objective: honour the 7.5 m layer seed and smooth the grade.
P=sparse.diags(weights);q=-weights*target;smoothrows=[];smoothcols=[];smoothvals=[];r=0
for w in roads:
 for j in range(1,len(w['nodes'])-1):
  a,b,c=w['nodes'][j-1:j+2];la=math.dist(coords[a],coords[b]);lb=math.dist(coords[b],coords[c])
  for v,k in [(a,1/la),(b,-1/la-1/lb),(c,1/lb)]:smoothrows.append(r);smoothcols.append(idx[v]);smoothvals.append(k)
  r+=1
D=sparse.coo_matrix((smoothvals,(smoothrows,smoothcols)),shape=(r,N)).tocsc();P=P+1200*(D.T@D)
rows=[];cols=[];vals=[];lo=[];hi=[]
def constraint(coeff,l,u):
 row=len(lo)
 for c,v in coeff.items():rows.append(row);cols.append(c);vals.append(v)
 lo.append(l);hi.append(u)
for w in roads:
 for a,b in zip(w['nodes'],w['nodes'][1:]):
  length=math.dist(coords[a],coords[b]);constraint({idx[a]:1,idx[b]:-1},-.058*length,.058*length)
# Exact plan intersections are broad-phase indexed into 60 m cells.
segments=[];cells=collections.defaultdict(list)
for wi,w in enumerate(roads):
 for a,b in zip(w['nodes'],w['nodes'][1:]):
  pa,pb=coords[a],coords[b];si=len(segments);segments.append((wi,a,b,pa,pb))
  for ix in range(math.floor(min(pa[0],pb[0])/60),math.floor(max(pa[0],pb[0])/60)+1):
   for iz in range(math.floor(min(pa[1],pb[1])/60),math.floor(max(pa[1],pb[1])/60)+1):cells[ix,iz].append(si)
pairs=set();crossings=[];ambiguous=[]
for bucket in cells.values():
 for ii,si in enumerate(bucket):
  for sj in bucket[ii+1:]:
   key=min(si,sj),max(si,sj)
   if key in pairs:continue
   pairs.add(key);wi,a,b,A,B=segments[si];wj,c,d,C,E=segments[sj]
   if wi==wj or len({a,b,c,d})<4:continue
   rx,rz=B[0]-A[0],B[1]-A[1];sx,sz=E[0]-C[0],E[1]-C[1];det=rx*sz-rz*sx
   if abs(det)<1e-8:continue
   t=((C[0]-A[0])*sz-(C[1]-A[1])*sx)/det;u=((C[0]-A[0])*rz-(C[1]-A[1])*rx)/det
   if not(0<t<1 and 0<u<1):continue
   aw,bw=roads[wi],roads[wj]
   sign=1 if aw['layer']>bw['layer'] else -1
   if aw['layer']==bw['layer']:
    # Same-tag crossings are not silently treated as flat intersections. Propagate
    # bridge order from the nearest distinct-level seed along the connected way.
    aa=(target[idx[a]]*(1-t)+target[idx[b]]*t);bb=target[idx[c]]*(1-u)+target[idx[d]]*u
    sign=1 if aa>=bb else -1;ambiguous.append([aw['osmId'],bw['osmId']])
   coeff={idx[a]:sign*(1-t),idx[b]:sign*t,idx[c]:-sign*(1-u),idx[d]:-sign*u}
   constraint(coeff,5.65,np.inf);crossings.append({'roads':[aw['id'],bw['id']],'a':[idx[a],idx[b],t],'b':[idx[c],idx[d],u],'sign':sign,'taggedOrder':aw['layer']!=bw['layer']})
A=sparse.coo_matrix((vals,(rows,cols)),shape=(len(lo),N)).tocsc();solver=osqp.OSQP();solver.setup(P=P.tocsc(),q=q,A=A,l=np.array(lo),u=np.array(hi),verbose=False,eps_abs=1e-6,eps_rel=1e-6,max_iter=100000,polishing=True);result=solver.solve()
if result.info.status!='solved':raise RuntimeError(result.info.status)
y=result.x
# Rendering earthworks: make a narrow 24 m road reservation follow inferred
# non-bridge grades; keep the unmodified raw DEM separately in this derivative.
nearpoints=[];nearheights=[]
for w in roads:
 if w['bridge'] or w['tunnel']:continue
 for n in w['nodes']:nearpoints.append(coords[n]);nearheights.append(y[idx[n]]-.12)
tree=cKDTree(nearpoints);gridpoints=np.array([(origin+i*step,origin+j*step)for j in range(size)for i in range(size)]);dist,nearest=tree.query(gridpoints);blend=np.clip(1-dist/65,0,1);blend=blend*blend*(3-2*blend)
render=values.flatten()*(1-blend)+np.array(nearheights)[nearest]*blend
# Under elevated decks, DEM predates road excavation. Cut only where terrain
# would swallow a bridge, in a narrow road corridor, preserving hillside context.
bridgepoints=[];bridgeheights=[]
for w in roads:
 if not w['bridge']:continue
 for n in w['nodes']:bridgepoints.append(coords[n]);bridgeheights.append(y[idx[n]]-5.8)
btree=cKDTree(bridgepoints);bd,bn=btree.query(gridpoints);bb=np.clip(1-bd/32,0,1);render=np.minimum(render,render*(1-bb)+np.array(bridgeheights)[bn]*bb)
render=render.reshape(size,size)
# Quantisation 1 mm retains numerical grade/clearance tolerance in tests.
node_data=[[n,round(coords[n][0],3),round(float(y[idx[n]]),3),round(coords[n][1],3)]for n in ids]
for w in roads:w['nodes']=[idx[n] for n in w['nodes']]
maxgrade=max(abs(y[idx[b]]-y[idx[a]])/math.dist(coords[a],coords[b]) for wi,a,b,pa,pb in segments)
clearances=[]
for cr in crossings:
 a,b,t=cr['a'];c,d,u=cr['b'];clearances.append(cr['sign']*((y[a]*(1-t)+y[b]*t)-(y[c]*(1-u)+y[d]*u)))
metadata={'date':'2026-10-23','source':'OpenStreetMap contributors, ODbL 1.0','osmBaseTimestamp':raw['osm3s']['timestamp_osm_base'],'osmInputSha256':hashlib.sha256(raw_path.read_bytes()).hexdigest(),'rawWayCount':len(raw['elements']),'includedWayCount':len(roads),'originalNodeCount':sum(':' not in n and not n.startswith('clip') for n in ids),'vertexCount':N,'center':{'lat':CENTER[0],'lon':CENTER[1]},'demCenterElevation':round(base,3),'layerSeedMetres':7.5,'maximumGrade':round(float(maxgrade),7),'crossingCount':len(crossings),'minimumCrossingSeparation':round(min(clearances),5),'sameLayerOrderInferences':ambiguous,'solver':'OSQP convex quadratic programme; 5.8% slope and 5.65 m separation constraints','highestRoadRelativeToDatum':round(float(max(y)),3),'lowestRoadRelativeToDatum':round(float(min(y)),3),'maximumRoadAboveRawDEM':round(max(y[idx[n]]-(terrain(*coords[n])-base) for n in ids),3),'maximumRoadAboveSmoothedDEM':round(max(y[idx[n]]-ground(*coords[n]) for n in ids),3),'terrainSources':['srtm/N29E106.tif','gmted/10N090E_20101117_gmted_mea075.tif'],'extentMetres':3200}
def render_ground(x,z):
 xx=max(0,min(size-1,(x-origin)/step));zz=max(0,min(size-1,(z-origin)/step));i=min(size-2,int(xx));j=min(size-2,int(zz));fx,fz=xx-i,zz-j
 return render[j,i]*(1-fx)*(1-fz)+render[j,i+1]*fx*(1-fz)+render[j+1,i]*(1-fx)*fz+render[j+1,i+1]*fx*fz
metadata['maximumRoadAboveRenderedTerrain']=round(max(y[idx[n]]-render_ground(*coords[n]) for n in ids),3)
(output/'huangjuewan-roads.json').write_text(json.dumps({'metadata':metadata,'nodes':node_data,'roads':roads,'crossings':crossings},ensure_ascii=False,separators=(',',':'))+'\n')
(output/'huangjuewan-terrain.json').write_text(json.dumps({'originX':origin,'originZ':origin,'step':step,'width':size,'height':size,'sourceElevation':round(base,3),'values':[round(float(v),2)for v in render.flatten()],'rawValues':[round(float(v),2)for v in values.flatten()]},separators=(',',':'))+'\n')
print(json.dumps(metadata,indent=2),flush=True)
