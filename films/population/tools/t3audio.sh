# music: 跃动·碎拍 (lib-breakbeat-motion) from 23.34 s; impacts on the two lightning strikes
set -e
M=/Volumes/DevSSD/tmp/pop-mus/lib
[ -f $M/sfx-impact-16.wav ] || curl -s -o $M/sfx-impact-16.wav https://music-cdn.shapeof.world/tracks/sfx-impact-16/v1/master.wav
ffmpeg -nostdin -loglevel error -y -ss 23.34 -t 21 -i $M/lib-breakbeat-motion.mp3 -i $M/sfx-impact-16.wav -i $M/sfx-impact-16.wav \
  -filter_complex "[0:a]aresample=48000,afade=t=out:st=20.3:d=0.7[m];[1:a]aresample=48000,adelay=4738|4738,volume=0.9[s1];[2:a]aresample=48000,adelay=12632|12632,volume=0.9[s2];[m][s1][s2]amix=inputs=3:normalize=0,alimiter=limit=0.89[o]" \
  -map "[o]" -ac 2 -ar 48000 public/t3.wav
ls -lh public/t3.wav
