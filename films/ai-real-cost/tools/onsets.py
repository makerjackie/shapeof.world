"""Onsets (spectral-flux peaks) in a time window, for music without a steady pulse (the coda chords of track B).

Usage: python tools/onsets.py <mono.wav> <from s> <to s>
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import stft, find_peaks
p,a0,a1=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
sr,y=wavfile.read(p); y=y.astype(np.float32); y/=np.abs(y).max()
hop=256; f,t,Z=stft(y,fs=sr,nperseg=2048,noverlap=2048-hop,boundary=None)
mag=np.log1p(np.abs(Z)*10); flux=np.concatenate([[0],np.maximum(0,np.diff(mag,axis=1)).sum(0)]); fps=sr/hop
i0,i1=int(a0*fps),int(a1*fps); seg=flux[i0:i1]
pk,pr=find_peaks(seg,prominence=np.percentile(seg,90),distance=int(0.15*fps))
rms=lambda tt: 20*np.log10(np.sqrt(np.mean(y[int(tt*sr):int((tt+0.3)*sr)]**2))+1e-9)
for k,pp in zip(pk,pr['prominences']):
    tt=(i0+k)/fps
    print(f"{tt:7.3f}s prom {pp:6.1f} rms {rms(tt):6.1f}dB")
