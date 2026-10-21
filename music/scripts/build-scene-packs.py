#!/usr/bin/env python3
"""Build small reusable scene kits; mixes are examples, never new compositions."""
import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('lib',Path(__file__).with_name('generate-library.py'))
lib=importlib.util.module_from_spec(spec); spec.loader.exec_module(lib)
PLANS=[
 {'id':'product-15','title':{'en':'15-second product reveal','zh':'15 秒产品展示'},'description':{'en':'A rhythmic chamber score with a swipe, a light impact and a final interface cue.','zh':'室内乐节奏搭配划过、轻撞击与结尾提示，适合短促产品展示。'},'duration':15,'events':[('scene-chamber-40','preview',0,-5,'music'),('sfx-transition-01','master',4.5,-5,'transition'),('sfx-impact-01','master',9,-3,'impact'),('sfx-ui-01','master',14,-3,'logo')]},
 {'id':'explainer-60','title':{'en':'60-second explainer bed','zh':'60 秒讲解背景'},'description':{'en':'A quiet music bed and sparse chapter cues. The demo contains no narration; adjust music under your own voice.','zh':'低音量背景音乐与少量章节提示。示例没有旁白，使用时根据自己的人声调整音量。'},'duration':60,'events':[('scene-bossa-90','preview',0,-14,'music'),('sfx-ui-01','master',5,-8,'chapter'),('sfx-ui-01','master',25,-8,'chapter'),('sfx-ui-01','master',45,-8,'chapter'),('sfx-transition-01','master',58,-10,'ending')]},
 {'id':'exploration-game','title':{'en':'Exploration game starter','zh':'探索游戏入门套件'},'description':{'en':'Looping music, designed rain ambience and two event sounds. A 30-second mix demonstrates the balance.','zh':'循环配乐、合成细雨与两种事件音效。30 秒混音示范背景与交互声音的配合。'},'duration':30,'events':[('scene-game-ambient-exploration','loop',0,-9,'music-loop'),('ambience-rain-01','master',0,-20,'ambience'),('sfx-ui-01','master',8,-5,'interaction'),('sfx-impact-01','master',19,-5,'event')]},
]

def build(plan,publish):
    directory=ROOT/'music/.cache/scene-packs'/plan['id']; directory.mkdir(parents=True,exist_ok=True)
    tracks={}; entries=[]; inputs=[]; filters=[]
    for i,(ident,role,at,gain,use) in enumerate(plan['events']):
        track=json.loads((ROOT/'music/tracks'/f'{ident}.json').read_text())
        if track.get('rightsProfile') not in ['lyria-commercial-2026-09','original-synthesis-cc0']: raise ValueError('Unknown permission')
        url=track['assets'][role]; version,filename=url.split('/')[-2:]
        file=ROOT/'music/.cache/processed'/ident/version/filename
        sha=hashlib.sha256(file.read_bytes()).hexdigest()
        if sha!=track['assetIntegrity'][role]['sha256']: raise ValueError('Source hash mismatch')
        if use=='music-loop' and not track.get('loop',{}).get('seamless'): raise ValueError('Unverified loop')
        tracks[ident]=track
        entries.append({'id':ident,'role':role,'use':use,'atSeconds':at,'gainDb':gain,'url':url,'sha256':sha,'file':f'audio/{ident}-{role}{file.suffix}'})
        inputs+=['-i',str(file)]
        remaining=plan['duration']-at
        filters.append(f'[{i}:a]atrim=duration={remaining},asetpts=PTS-STARTPTS,volume={gain}dB,adelay={round(at*1000)}:all=1[a{i}]')
    filters.append(''.join(f'[a{i}]' for i in range(len(entries)))+f'amix=inputs={len(entries)}:normalize=0:duration=longest,apad,atrim=duration={plan["duration"]},afade=t=out:st={plan["duration"]-.25}:d=0.25,alimiter=limit=0.9:level=false[mix]')
    preview=directory/'preview.mp3'
    if preview.exists():
        old=directory/('mix-'+hashlib.sha256(preview.read_bytes()).hexdigest()[:16]+'.mp3')
        if not old.exists(): old.write_bytes(preview.read_bytes())
    subprocess.run(['ffmpeg','-y','-v','error',*inputs,'-filter_complex',';'.join(filters),'-map','[mix]','-ar','44100','-codec:a','libmp3lame','-b:a','160k',str(preview)],check=True)
    review_dir=directory/'reviews'/hashlib.sha256(preview.read_bytes()).hexdigest()
    review_dir.mkdir(parents=True,exist_ok=True)
    review=lib.review(preview,review_dir)
    if review.get('vocalsDetected') or review.get('audibleDefect') or not review.get('suitableForLibrary'): raise ValueError('Mix failed review')
    manifest={k:v for k,v in plan.items() if k!='events'}
    manifest.update(schemaVersion=1,kind='scene-kit',isIndependentComposition=False,events=entries,licenseUrl='https://music.shapeof.world/audio-license.txt',audioReview=review)
    lib.write(directory/'manifest.json',manifest)
    bundle=directory/'kit.zip'
    with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as z:
        z.write(directory/'manifest.json','manifest.json'); z.write(ROOT/'music/AUDIO_LICENSE.txt','AUDIO_LICENSE.txt')
        z.write(ROOT/'music/rights-profiles.json','rights-profiles.json')
        z.write(preview,'example-mix.mp3')
        added=set()
        for e in entries:
            if e['file'] in added: continue
            added.add(e['file']); track=tracks[e['id']]
            version,filename=e['url'].split('/')[-2:]
            z.write(ROOT/'music/.cache/processed'/e['id']/version/filename,e['file'])
        for ident,track in tracks.items(): z.writestr(f'metadata/{ident}.json',json.dumps(track,ensure_ascii=False,indent=2)+'\n')
    # Hash-addressed zip keys stay immutable even if ZIP timestamps differ.
    deliver={}
    for name,mime in [('preview.mp3','audio/mpeg'),('kit.zip','application/zip')]:
        file=directory/name; sha=hashlib.sha256(file.read_bytes()).hexdigest()
        key=f'kits/{plan["id"]}/{sha[:16]}/{name}'
        deliver['preview' if name.endswith('.mp3') else 'download']={'url':'https://music-cdn.shapeof.world/'+key,'sha256':sha,'bytes':file.stat().st_size}
        if publish:
            marker=directory/f'uploaded-{sha}.json'
            if not marker.exists():
                env={**os.environ,**{k:'' for k in ['http_proxy','https_proxy','HTTP_PROXY','HTTPS_PROXY']}}
                with (directory/'upload.log').open('a') as log:
                    subprocess.run([str(ROOT/'node_modules/.bin/wrangler'),'r2','object','put','shapeof-world-music/'+key,'--file',str(file),'--remote','--force','--content-type',mime,'--cache-control','public, max-age=31536000, immutable'],cwd=ROOT,env=env,stdout=log,stderr=log,check=True)
                lib.write(marker,{'sha256':sha})
            tmp=directory/'cdn-verification.tmp'
            subprocess.run(['curl','--http1.1','--noproxy','*','--fail','--silent','--show-error','--retry','2','--retry-all-errors','--max-time','120','-o',str(tmp),deliver['preview' if name.endswith('.mp3') else 'download']['url']],check=True)
            if hashlib.sha256(tmp.read_bytes()).hexdigest()!=sha: raise ValueError('CDN hash mismatch')
            tmp.unlink()
    manifest['assets']=deliver
    if publish:
        manifest['status']='published'; manifest['verifiedAt']=lib.now()
        lib.write(ROOT/'music/packs'/f'{plan["id"]}.json',manifest)
    lib.log(plan['id']+(': published' if publish else ': rendered and reviewed'))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--publish',action='store_true'); a=p.parse_args()
    for plan in PLANS: build(plan,a.publish)
