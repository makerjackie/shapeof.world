"""Chroma similarity of each bar with the bar d bars earlier (d = 8, 16, 24): finds where the track can be cut
on a bar line without a seam (a cut from bar a to bar b is clean when bar a-1 matches bar b-1).

Usage: python tools/chroma.py <mono.wav> <bpm> <first beat s>
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import stft
p,bpm,first=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
sr,y=wavfile.read(p); y=y.astype(np.float32); y/=np.abs(y).max()
f,t,Z=stft(y,fs=sr,nperseg=8192,noverlap=8192-2048,boundary=None); A=np.abs(Z)
m=(f>60)&(f<4000); pc=np.round(12*np.log2(f[m]/440)+69)%12
C=np.stack([A[m][pc==k].sum(0) for k in range(12)])  # 12 x T
bar=4*60/bpm; n=int((len(y)/sr-first)/bar)
B=[]
for k in range(n):
    a=np.searchsorted(t,first+k*bar); b=np.searchsorted(t,first+(k+1)*bar)
    v=C[:,a:b].mean(1); B.append(v/ (np.linalg.norm(v)+1e-9))
B=np.array(B)
def sim(i,j): return float(B[i]@B[j])
print("bars",n)
for d in (8,16,24):
    print(f"sim(bar, bar-{d}):")
    row=[f"{k}:{sim(k,k-d):.3f}" for k in range(d,n)]
    for i in range(0,len(row),12): print("  "+" ".join(row[i:i+12]))
