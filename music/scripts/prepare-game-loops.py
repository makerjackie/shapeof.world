#!/usr/bin/env python3
"""Make optional PCM loop derivatives; publish only seams passing both checks."""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import subprocess
import wave
from pathlib import Path
import numpy as np

spec=importlib.util.spec_from_file_location('sounds',Path(__file__).with_name('synthesize-sounds.py'))
sounds=importlib.util.module_from_spec(spec); spec.loader.exec_module(sounds)
lib=sounds.lib; ROOT=sounds.ROOT; SR=44100

def prepare(path):
    record=json.loads(path.read_text()); ident=record['id']; d=path.parent
    if not record.get('loopRequested'): return ident,'not requested'
    out=ROOT/'music/.cache/processed'/ident/'v1'
    evidence=d/'loop-evidence.json'
    if evidence.exists():
        result=json.loads(evidence.read_text())
    else:
        data=subprocess.check_output(['ffmpeg','-v','error','-i',str(out/'master.mp3'),'-f','f32le','-ac','2','-ar',str(SR),'-'])
        x=np.frombuffer(data,dtype='<f4').reshape(-1,2).astype(np.float64)
        bpm=record.get('audioReview',{}).get('bpmEstimate') or record['bpm']
        if not 45<=bpm<=200: bpm=record['bpm']
        # Tempo is only a search hint. Compare real window spectra and dynamics;
        # no beat-grid or sample-exact bar claim is derived from a model estimate.
        length=min(16*4*60/bpm,len(x)/SR-10)
        if length<12: return ident,'source too short'
        overlap=round(min(.15,60/bpm*.2)*SR)
        mono=x.mean(axis=1)
        frame=2048
        def signature(at):
            segment=mono[at:at+frame]
            spectrum=np.abs(np.fft.rfft(segment*np.hanning(frame)))
            bands=np.array([np.sqrt(np.mean(b*b)) for b in np.array_split(spectrum,32)])
            return bands/max(np.linalg.norm(bands),1e-9),np.sqrt(np.mean(segment**2))
        candidates=[]
        n=round(length*SR)
        for start in np.arange(4,max(4.01,len(x)/SR-length-3),.125):
            a=round(start*SR); b=a+n
            sa,ra=signature(a); sb,rb=signature(b-overlap)
            candidates.append((float(np.linalg.norm(sa-sb)+abs(ra-rb)*5),a,b))
        _,a,b=min(candidates)
        segment=x[a:b].copy()
        # Rotate the overlap-add seam into the start; outer boundary joins
        # adjacent source samples. Listening still decides harmonic/rhythmic fit.
        mix=np.linspace(0,1,overlap)[:,None]
        joined=segment[-overlap:]*(1-mix)+segment[:overlap]*mix
        loop=np.concatenate([joined,segment[overlap:-overlap]],axis=0)
        peak=float(np.max(np.abs(loop))); loop*=min(1,.9/max(peak,1e-9))
        wav=out/'loop.wav'
        with wave.open(str(wav),'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((loop*32767).round().astype('<i2').tobytes())
        with wave.open(str(wav),'rb') as w: actual=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768
        metrics=[sounds.qa_metrics(actual[:,c],True) for c in [0,1]]
        if not all(m['seamPassed'] for m in metrics): return ident,'PCM seam rejected'
        review_file=d/'loop-listen.mp3'
        subprocess.run(['ffmpeg','-y','-v','error','-stream_loop','2','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k',str(review_file)],check=True)
        qa=sounds.review_sound(review_file,d,{'kind':'ambience'})
        # Generic repeat listening catches gaps/clicks. Add a music-specific
        # review so a smooth waveform cannot hide a broken musical phrase.
        import base64
        dest=d/('loop-musical-'+hashlib.sha256(wav.read_bytes()).hexdigest()[:16]+'.json')
        if dest.exists(): musical=json.loads(dest.read_text())
        else:
            response=lib.review_request(f'https://aiplatform.googleapis.com/v1/projects/{lib.PROJECT}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent',{'contents':[{'role':'user','parts':[{'text':f'This game music excerpt repeats three times, with boundaries every {len(loop)/SR:.3f} seconds. Listen across both joins. Return JSON: musicalLoop:boolean, reason:string. Pass only if rhythm, harmony, dynamics and phrase continuity are comfortable for continuous game background playback. Reject obvious repeated fade-ins, ending cadences, abrupt chord changes, skipped beats or conspicuous edits at joins. This is an automated assessment, be conservative.'},{'inlineData':{'mimeType':'audio/mpeg','data':base64.b64encode(review_file.read_bytes()).decode()}}]}],'generationConfig':{'responseMimeType':'application/json','temperature':.1}},180)
            text=''.join(p.get('text','') for c in response.get('candidates',[]) for p in c.get('content',{}).get('parts',[]) if not p.get('thought'))
            musical=json.loads(text)
            if type(musical.get('musicalLoop')) is not bool: raise ValueError('Invalid musical seam review')
            musical.update(model='gemini-2.5-flash',method='automated-audio-review',scope='three-complete-repetitions',reviewedAt=lib.now())
            lib.write(dest,musical)
        passed=qa.get('seamlessLoop') is True and qa.get('suitableForLibrary') is True and qa.get('voicesDetected') is False and qa.get('audibleDefect') is False and musical['musicalLoop']
        result={'seamless':bool(passed),'basis':'PCM seam analysis plus automated texture and musical-phrase listening across three repetitions','asset':'loop','duration':round(len(loop)/SR,6),'sampleRate':SR,'startSample':0,'endSample':len(loop),'sourceStartSeconds':a/SR,'sourceEndSeconds':b/SR,'crossfadeSeconds':overlap/SR,'sourceEncoding':'MP3-derived PCM, not a lossless original','technicalReview':metrics,'audioReview':qa,'musicalReview':musical}
        lib.write(evidence,result)
    if result['seamless']:
        wav=out/'loop.wav'; ogg=out/'loop.ogg'
        if not ogg.exists() or not ogg.stat().st_size:
            subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','vorbis','-strict','experimental','-ac','2','-q:a','5',str(ogg)],check=True)
        for file in [wav,ogg]: subprocess.run(['ffmpeg','-xerror','-v','error','-i',str(file),'-f','null','-'],check=True)
        record['assets']['loop']=f'https://music-cdn.shapeof.world/tracks/{ident}/v1/loop.wav'
        record['assets']['loopOgg']=f'https://music-cdn.shapeof.world/tracks/{ident}/v1/loop.ogg'
        record['loop']=result
        lib.write(path,record)
        return ident,'loop verified'
    return ident,'retained as non-looping music: '+result['musicalReview'].get('reason','')

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--jobs',type=int,default=3); a=p.parse_args()
    paths=sorted((ROOT/'music/.cache/library').glob('scene-game-*/track.json'))
    def safe(path):
        try: return prepare(path)
        except Exception as e: return path.parent.name,'failed: '+str(e)[:150]
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(6,a.jobs)) as pool:
        for ident,state in pool.map(safe,paths): lib.log(f'{ident}: {state}')
if __name__=='__main__': main()
