"""Reproduce the adapted CC BY 4.0 table; Python standard library only.
Run from repository root: python3 src/components/experiences/worlds/stellar-life/prepare-data.py [download-cache]
Original xz files live in the ignored cache, never in the public bundle.
"""
from pathlib import Path
import gzip, hashlib, json, lzma, math, sys, urllib.request
ROOT=Path(__file__).resolve().parents[5]
CACHE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'.local/stellar-life'
CACHE.mkdir(parents=True,exist_ok=True)
FILES={'1':('1p0','66976957c64a0e01fe132c9d3a2ba94f'),'3':('3p0','e0447b8384a3ab8775e40dd1a2a0c136'),'15':('15p0','28200bfca82dea0ca6f3e609b65204f6'),'25':('25p0','7fe264f6da9ee20cfa7c2e83e12b28e7')}
COLS=['model_number','star_age','star_mass','log_Teff','log_L','log_R','log_center_T','log_center_Rho','center_h1','center_he4','center_c12','center_o16','center_ne20','center_si28','he_core_mass','c_core_mass','o_core_mass','si_core_mass','fe_core_mass','log_LH','log_LHe','log_LZ','log_Lnuc']
# Max linear interpolation errors, in original column units. Age/model number are not error features.
TOLS=[0,0,.002,.004,.008,.006,.008,.012,.006,.006,.006,.006,.006,.006,.003,.003,.003,.003,.003,.09,.09,.09,.09]

def reduce_rows(rows,keep):
    stack=list(zip(sorted(keep),sorted(keep)[1:]))
    while stack:
        a,b=stack.pop()
        if b-a<2:continue
        span=rows[b][1]-rows[a][1]
        best=-1;peak=1
        for i in range(a+1,b):
            t=(rows[i][1]-rows[a][1])/span if span>0 else (i-a)/(b-a)
            err=max(abs(rows[i][j]-(rows[a][j]+t*(rows[b][j]-rows[a][j])))/TOLS[j] for j in range(2,len(COLS)))
            if err>peak:best=i;peak=err
        if best>=0:keep.add(best);stack.extend([(a,best),(best,b)])
    return sorted(keep)

tracks=[]
for mass,(stem,md5) in FILES.items():
    path=CACHE/(stem+'.data.xz')
    if not path.exists():urllib.request.urlretrieve(f'https://zenodo.org/records/3707670/files/{stem}_msun_history.data.xz?download=1',path)
    actual=hashlib.md5(path.read_bytes()).hexdigest()
    if actual!=md5:raise ValueError(f'{path}: input MD5 mismatch {actual}; incomplete download?')
    rows=[]
    with lzma.open(path,'rt') as f:
        header=[next(f) for _ in range(6)][5].split();ix=[header.index(c) for c in COLS]
        for line in f:
            vals=line.split()
            if not vals:continue
            r=[float(vals[k]) for k in ix]
            if not all(math.isfinite(v) for v in r):raise ValueError('Non-finite source value')
            # A restart appends replacements: discard its obsolete future as well as duplicate numbers.
            while rows and (rows[-1][0]>=r[0] or rows[-1][1]>=r[1]):rows.pop()
            rows.append(r)
    n=len(rows);h0=rows[0][8]
    def first(pred,start=0):return next((i for i in range(start,n) if pred(rows[i])),n-1)
    zams=first(lambda r:r[8]<h0-.001 and r[19]-r[4]>-.05)
    tams=first(lambda r:r[8]<1e-4,zams)
    he0=rows[tams][9];heign=first(lambda r:r[9]<he0-.01,tams)
    heend=first(lambda r:r[9]<1e-4,heign)
    events=[('pms',0),('main',zams),('giant',tams),('helium',heign)]
    if int(mass)<8:
        events.append(('agb',heend))
        hottest=max(range(heend,n),key=lambda i:rows[i][3])
        post=first(lambda r:r[3]>4 and r[2]<1.4,heend)
        events.extend([('postagb',post),('white',hottest)])
    else:events.append(('advanced',heend))
    events.append(('endpoint',n-1))
    anchors={0,n-1,*[i for _,i in events]}
    if mass=='1':anchors.add(min(range(n),key=lambda i:abs(rows[i][1]-4.57e9)))
    keep=reduce_rows(rows,anchors);indexmap={old:new for new,old in enumerate(keep)}
    data=[[round(r[0]),r[1],*[float(f'{x:.10g}') for x in r[2:]]] for r in [rows[i] for i in keep]]
    phases=[{'id':name,'index':indexmap[i]} for name,i in events]
    tracks.append({'initialMass':int(mass),'sourceRows':n,'retainedRows':len(data),'sourceFile':stem+'_msun_history.data.xz','sourceMD5':md5,'sourceSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'phases':phases,'rows':data})
    print(mass,n,'→',len(data),'end:',data[-1][1:6],'events',[(name,rows[i][1])for name,i in events],flush=True)
obj={'schema':1,'columns':COLS,'source':'doi:10.5281/zenodo.3707670','license':'CC-BY-4.0','adaptation':'selected columns; discarded obsolete restart rows; bounded-error linear simplification; float64 ages; other columns at 10 significant digits','tolerances':TOLS,'tracks':tracks}
payload=json.dumps(obj,separators=(',',':')).encode()
out=ROOT/'public/assets/stellar-life/tracks.json.gz';out.write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
meta={k:v for k,v in obj.items()if k!='tracks'};meta['tracks']=[{k:v for k,v in t.items()if k!='rows'}for t in tracks];meta['sha256']=hashlib.sha256(payload).hexdigest();meta['uncompressedBytes']=len(payload);meta['gzipBytes']=out.stat().st_size
(ROOT/'src/components/experiences/worlds/stellar-life/data-meta.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Packed',len(payload),'→',out.stat().st_size)
