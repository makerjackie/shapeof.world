#!/usr/bin/env python3
"""Publish reviewed campaign audio with immutable receipts and full CDN hashes."""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT/'music/.cache/audio-publication'
MIMES={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.json':'application/json'}
spec=importlib.util.spec_from_file_location('lib',Path(__file__).with_name('generate-library.py'))
lib=importlib.util.module_from_spec(spec); spec.loader.exec_module(lib)

def collect(ids=None):
    paths=list((ROOT/'music/.cache/library').glob('scene-*/track.json'))+list((ROOT/'music/.cache/library').glob('scene-*/c*/track.json'))+list((ROOT/'music/.cache/sound-design').glob('*/track.json'))+list((ROOT/'music/.cache/sound-design').glob('*/c*/track.json'))
    chosen={}
    for path in sorted(paths):
        record=json.loads(path.read_text()); ident=record['id']
        if ids and ident not in ids: continue
        public=ROOT/'music/tracks'/f'{ident}.json'
        if public.exists():
            old=json.loads(public.read_text())
            # Adding a separately verified derivative to this campaign is safe;
            # replacing an existing recording/version is not.
            if not (record.get('loop',{}).get('seamless') and 'loop' in record.get('assets',{}) and 'loop' not in old.get('assets',{})): continue
            if old.get('generation',{}).get('sha256')!=record.get('generation',{}).get('sha256') or any(record['assets'].get(k)!=v for k,v in old['assets'].items()):
                raise ValueError('Refusing to replace a published source: '+ident)
        state=json.loads((path.parent/'state.json').read_text()) if (path.parent/'state.json').exists() else {}
        if state.get('state') not in ['generated','reviewed']: continue
        qa=record.get('audioReview') or {}
        if qa.get('suitableForLibrary') is not True or qa.get('audibleDefect') is not False: continue
        if qa.get('vocalsDetected',qa.get('voicesDetected')) is not False: continue
        if record.get('shortForm') and not all(qa.get(k) is True for k in ['immediateHook','clearPulse','resolvedEnding']): continue
        if record.get('rightsProfile') not in ['lyria-commercial-2026-09','original-synthesis-cc0']: raise ValueError('Missing permission profile')
        chosen[ident]=(path,record)
    return list(chosen.values())

def assets(record):
    entries=[]
    for role,url in record['assets'].items():
        parsed=urlparse(url); parts=parsed.path.strip('/').split('/')
        if parsed.netloc!='music-cdn.shapeof.world' or len(parts)!=4 or parts[:2]!=['tracks',record['id']] or not parts[2].startswith('v') or parsed.query: raise ValueError('Invalid immutable asset URL')
        file=ROOT/'music/.cache/processed'/record['id']/parts[2]/parts[3]
        if not file.is_file() or file.suffix not in MIMES: raise ValueError('Missing/unsupported audio delivery '+str(file))
        entries.append({'role':role,'url':url,'key':parsed.path.lstrip('/'),'file':str(file),'type':MIMES[file.suffix],'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size})
    return entries

def verify(entry):
    dest=CACHE/'verified'/entry['sha256']; dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists() and json.loads(dest.read_text()).get('url')==entry['url']: return
    tmp=CACHE/'downloads'/entry['sha256']; tmp.parent.mkdir(parents=True,exist_ok=True)
    response=subprocess.run(['curl','--http1.1','--noproxy','*','--fail','--silent','--show-error','--max-time','120','--retry','2','--retry-all-errors','--output',str(tmp),'--write-out','%{http_code} %{content_type}',entry['url']],text=True,capture_output=True,timeout=400)
    if response.returncode or response.stdout.split()!=['200',entry['type']]: raise ValueError('CDN response failed: '+response.stdout+' '+response.stderr[:150])
    if tmp.stat().st_size!=entry['bytes'] or hashlib.sha256(tmp.read_bytes()).hexdigest()!=entry['sha256']: raise ValueError('CDN hash mismatch '+entry['url'])
    lib.write(dest,{'url':entry['url'],'sha256':entry['sha256'],'bytes':entry['bytes'],'verifiedAt':lib.now()})
    tmp.unlink() # Only this task's temporary verification copy.

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--ids',nargs='+'); p.add_argument('--publish',action='store_true'); a=p.parse_args()
    CACHE.mkdir(parents=True,exist_ok=True)
    records=collect(a.ids); prepared=[(path,record,assets(record)) for path,record in records]
    lib.log(f'{len(prepared)} reviewed assets, {sum(len(e) for _,_,e in prepared)} files')
    if not a.publish: return
    receipts_path=CACHE/'uploaded.json'; receipts=json.loads(receipts_path.read_text()) if receipts_path.exists() else {}
    all_entries=[entry for _,_,entries in prepared for entry in entries]
    for entry in all_entries:
        if entry['key'] in receipts and receipts[entry['key']]!=entry['sha256']: raise ValueError('Immutable bytes changed: '+entry['key'])
    for mime in sorted(set(e['type'] for e in all_entries)):
        group=[e for e in all_entries if e['type']==mime and e['key'] not in receipts]
        for start in range(0,len(group),100):
            part=group[start:start+100]; manifest=CACHE/'upload.json'
            lib.write(manifest,[{'key':e['key'],'file':e['file']} for e in part])
            env={**os.environ,**{k:'' for k in ['http_proxy','https_proxy','HTTP_PROXY','HTTPS_PROXY']}}
            with (CACHE/'upload.log').open('a') as log:
                subprocess.run([str(ROOT/'node_modules/.bin/wrangler'),'r2','bulk','put','shapeof-world-music','--filename',str(manifest),'--remote','--force','--concurrency','4','--content-type',mime,'--cache-control','public, max-age=31536000, immutable'],cwd=ROOT,env=env,stdout=log,stderr=log,check=True,timeout=900)
            for entry in part: receipts[entry['key']]=entry['sha256']
            lib.write(receipts_path,receipts); lib.log(f'Uploaded {len(part)} {mime} files')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(verify,all_entries))
    for path,record,entries in prepared:
        record['assetIntegrity']={e['role']:{'sha256':e['sha256'],'bytes':e['bytes'],'mimeType':e['type']} for e in entries}
        record['status']='published'; record['verifiedAt']=lib.now()
        lib.write(ROOT/'music/tracks'/f'{record["id"]}.json',record)
    lib.log(f'Published {len(prepared)} records after full-byte CDN verification')

if __name__=='__main__': main()
