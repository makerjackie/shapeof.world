#!/usr/bin/env python3
"""Mix score + sfx for the fast, no-voice cut."""
import os, subprocess, wave
import numpy as np
SR=48000
film=os.path.join(os.path.dirname(__file__),'..','cuts','deepinfer-fast')
a=os.path.join(film,'output','audio')
def rd(p):
    w=wave.open(p); n=w.getnframes(); ch=w.getnchannels()
    d=np.frombuffer(w.readframes(n),dtype='<i2').astype(np.float32)/32768
    return d.reshape(-1,ch).T
m=rd(os.path.join(a,'music.wav')); s=rd(os.path.join(a,'sfx.wav'))
n=min(m.shape[1],s.shape[1]); mix=m[:,:n]+s[:,:n]*0.55
pcm=(np.clip(mix,-1,1).T*32767).astype('<i2')
with wave.open(os.path.join(a,'mix.wav'),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg','-y','-v','error','-i',os.path.join(a,'mix.wav'),'-af','loudnorm=I=-14:TP=-1.5:LRA=8','-ar',str(SR),os.path.join(a,'mix-norm.wav')],check=True)
print('mix-norm.wav')
