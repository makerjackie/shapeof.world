"""Regenerate checked-in astronomy assets from official sources. Run from repository root.
Review source changes and source manifests before accepting regenerated outputs.
"""
import urllib.request, pathlib, subprocess, hashlib, json
out=pathlib.Path('public/assets/solar-system/voyager'); raw=pathlib.Path('.scratch/voyager-images');raw.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
items={
 'pia00144':'https://science.nasa.gov/wp-content/uploads/2024/04/pia00144.jpg',
 'pia00459':'https://science.nasa.gov/wp-content/uploads/2024/04/pia00459.jpg',
 'pia02238':'https://science.nasa.gov/wp-content/uploads/2024/04/pia02238.jpg',
 'pia00335':'https://science.nasa.gov/wp-content/uploads/2024/04/pia00335.jpg',
 'pia03152':'https://science.nasa.gov/wp-content/uploads/2024/04/pia03152.jpg',
 'pia18182':'https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg',
 'pia01492':'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/i/a/0/PIA01492-1.jpg',
 'pia02212':'https://images-assets.nasa.gov/image/PIA02212/PIA02212~orig.jpg',
 'pia23645':'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA23645.jpg'}
manifest=[]
for key,url in items.items():
 p=raw/(key+'.jpg');urllib.request.urlretrieve(url,p)
 info=subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(p)],text=True)
 size=[int(line.split(':')[-1]) for line in info.splitlines() if 'pixel' in line]
 resize=['-resize','1280','0'] if size[0]>1280 else []
 target=out/(key+'.webp')
 subprocess.run(['cwebp','-quiet','-q','82',*resize,str(p),'-o',str(target)],check=True)
 manifest.append({'file':target.name,'source':url,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'credit':'Courtesy NASA/JPL-Caltech','processing':'WebP q82; width capped at 1280; no crop or creative alteration','retrieved':'2026-09-18'})
 print(key,target.stat().st_size,flush=True)
(out/'image-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
