# side-by-side: reference (left) vs ours (right), reference audio. bash tools/sbs.sh out/t2.mp4 out/t2_sbs.mp4
IN=$1; OUT=$2
ffmpeg -nostdin -loglevel error -y -i /Volumes/DevSSD/tmp/pop-ref/ref.mp4 -i "$IN" -t 18 \
  -filter_complex "[0:v]trim=0:18,setpts=PTS-STARTPTS,scale=1080:1920,fps=30[a];[1:v]scale=1080:1920,fps=30[b];[a][b]hstack=inputs=2[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart "$OUT"
ls -lh "$OUT"
