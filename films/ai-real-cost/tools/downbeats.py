"""Measured onset at each downbeat of a beat grid (checks the grid against the audio, one line per bar).

Usage: python tools/downbeats.py <mono.wav> <bpm> <first beat s> <bars>
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import stft
p,bpm,first,nb=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),int(sys.argv[4])
sr,y=wavfile.read(p); y=y.astype(np.float32); y/=np.abs(y).max()
hop=128; f,t,Z=stft(y,fs=sr,nperseg=2048,noverlap=2048-hop,boundary=None)
mag=np.log1p(np.abs(Z)*10); flux=np.concatenate([[0],np.maximum(0,np.diff(mag,axis=1)).sum(0)]); fps=sr/hop
flux=(flux-np.median(flux))/(flux.std()+1e-9)
bar=4*60/bpm
for k in range(nb):
    g=first+k*bar; a=max(0,int((g-0.15)*fps)); b=int((g+0.15)*fps)
    if b>=len(flux): break
    w=flux[a:b]; i=int(np.argmax(w)); tm=(a+i)/fps - 2048/2/sr*0  # stft centre offset ignored
    # also beats 2-4 strengths
    bs=[]
    for j in range(4):
        gg=g+j*bar/4; aa=max(0,int((gg-0.06)*fps)); bb=int((gg+0.06)*fps); bs.append(flux[aa:bb].max() if bb<len(flux) else 0)
    print(f"bar {k:2d} grid {g:7.3f}  peak {tm:7.3f} ({(tm-g)*1000:+5.0f} ms) str {w[i]:5.1f} | beats " + " ".join(f"{v:4.1f}" for v in bs))
