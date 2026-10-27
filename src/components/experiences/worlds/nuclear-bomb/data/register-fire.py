"""Least-squares affine registration, original 3200×3101 USSBS scan -> EPSG:3857.
Manual river/bridge correspondences. Residuals include identification and old map error.
Requires numpy, pyproj, scipy, Pillow. See SOURCES.md and the control-point JSON.
python register-fire.py scan.jpg output-directory
"""
from pathlib import Path
import json,sys,math
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_fill_holes, label
from pyproj import Transformer

out=Path(sys.argv[2]);out.mkdir(exist_ok=True,parents=True)
controls=[
 ('Aioi Bridge / main crossing',1426,1045,132.452531,34.396560),
 ('Motoyasu Bridge',1460,1134,132.453662,34.394096),
 ('Honkawa Bridge',1368,1148,132.450583,34.393700),
 ('Misasa Bridge',1555,687,132.457181,34.407739),
 ('Yokogawa Bridge',1367,777,132.450235,34.405523),
 ('Tokiwa Bridge',1844,761,132.467611,34.403790),
 ('Kyobashi Bridge',1870,1053,132.469944,34.394187),
 ('Tsurumi Bridge',1856,1310,132.469504,34.385953),
 ('Sumiyoshi Bridge',1253,1491,132.446683,34.384155),
]
forward=Transformer.from_crs(4326,3857,always_xy=True)
inverse=Transformer.from_crs(3857,4326,always_xy=True)
A=np.array([[x,y,1] for _,x,y,_,_ in controls],float)
B=np.array([forward.transform(lon,lat) for *_,lon,lat in controls])
matrix=np.linalg.lstsq(A,B,rcond=None)[0]
res=np.linalg.norm(A@matrix-B,axis=1)*math.cos(math.radians(34.3947))
loo=[]
for i in range(len(A)):
 keep=np.arange(len(A))!=i;m=np.linalg.lstsq(A[keep],B[keep],rcond=None)[0]
 loo.append(float(np.linalg.norm(A[i]@m-B[i])*math.cos(math.radians(34.3947))))
im=Image.open(sys.argv[1]).convert('RGB');rgb=np.asarray(im).astype(float)
r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
mask=(r>120)&(r-g>35)&(r-b>30)&(g<160)
mask[:,:790]=False;mask[1900:]=False
mask=binary_fill_holes(binary_closing(mask,iterations=5))
labs,num=label(mask);sizes=np.bincount(labs.ravel());sizes[0]=0
mask=sizes[labs]>2500
yy,xx=np.indices(mask.shape)
alpha=np.where(mask,np.where((xx+yy)%22<5,195,20),0).astype('uint8')
layer=np.zeros((*mask.shape,4),dtype='uint8');layer[:,:,:3]=[255,106,61];layer[:,:,3]=alpha
Image.fromarray(layer).resize((1600,1551),Image.Resampling.LANCZOS).save(out/'registered-fire.png',optimize=True)
corners=[inverse.transform(*(np.array([x,y,1])@matrix)) for x,y in [(0,0),(im.width,0),(im.width,im.height),(0,im.height)]]
report=dict(source='USSBS 1946 Extent of Fire, Hiroshima',sourceImageSize=list(im.size),crs='EPSG:3857 / coordinates EPSG:4326',method='Affine least squares; hand-identified stable crossings',status='provisional; independent cartographic review pending',matrix=matrix.tolist(),rmseGroundM=float(np.sqrt(np.mean(res**2))),maxResidualGroundM=float(max(res)),leaveOneOutRmseGroundM=float(np.sqrt(np.mean(np.array(loo)**2))),corners=corners,controls=[dict(name=n,pixel=[x,y],longitude=lon,latitude=lat,residualGroundM=float(e),leaveOneOutGroundM=l) for (n,x,y,lon,lat),e,l in zip(controls,res,loo)])
(out/'fire-registration.json').write_text(json.dumps(report,indent=2))
print('ground RMSE',report['rmseGroundM'],'LOO',report['leaveOneOutRmseGroundM'])
