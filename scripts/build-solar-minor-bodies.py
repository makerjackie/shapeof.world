"""Regenerate checked-in astronomy assets from official sources. Run from repository root.
Review source changes and source manifests before accepting regenerated outputs.
"""
import urllib.request,urllib.parse,json,pathlib,hashlib
items=[('pluto','冥王星','134340','dwarf','#cabbaa',1188.3),('ceres','谷神星','1','dwarf','#a4a5a3',469.7),('eris','阋神星','136199','dwarf','#d6d1c7',1163),('haumea','妊神星','136108','dwarf','#c9c6bb',780),('makemake','鸟神星','136472','dwarf','#b98d70',715),('vesta','灶神星','4','asteroid','#a8a6a2',262.7),('pallas','智神星','2','asteroid','#9a9693',256),('halley','哈雷彗星','1P','comet','#9bd8e7',5.5),('encke','恩克彗星','2P','comet','#a3d3cf',2.4),('67p','67P 彗星','67P','comet','#99bdb6',1.65),('hale-bopp','海尔—波普彗星','C/1995 O1','comet','#b6e2d9',30)]
result=[];sources=[]
for id,name,des,kind,color,radius in items:
 url='https://ssd-api.jpl.nasa.gov/sbdb.api?'+urllib.parse.urlencode({'des':des,'full-prec':'true','phys-par':'true'})
 raw=urllib.request.urlopen(url).read();data=json.loads(raw)
 if data.get('signature',{}).get('version')!='1.3':raise ValueError(data)
 orbit=data['orbit'];e={a['name']:float(a['value']) for a in orbit['elements']}
 result.append({'id':id,'name':name,'kind':kind,'color':color,'radiusKm':radius,'epochDays':float(orbit['epoch'])-2451545,'periodDays':e['per'],'perihelionDays':e['tp']-2451545,'elements':{'a':e['a'],'e':e['e'],'i':e['i'],'L':e['ma']+e['w']+e['om'],'lp':e['w']+e['om'],'node':e['om']}})
 sources.append({'id':id,'url':url,'solutionDate':orbit['soln_date'],'epochJD':orbit['epoch'],'sha256':hashlib.sha256(raw).hexdigest()})
 print(id,e['e'],flush=True)
pathlib.Path('src/components/experiences/worlds/solar-system/minor-data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
pathlib.Path('public/assets/solar-system/voyager/small-body-sources.json').write_text(json.dumps(sources,indent=2)+'\n')
