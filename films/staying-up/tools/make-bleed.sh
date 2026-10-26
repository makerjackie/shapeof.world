#!/bin/bash
# Make the "video sound leaking from a phone speaker" clips from our own library tracks:
# a few seconds of each, band-limited like a small speaker, into public/sfx/bleed-N.wav.
set -e
cd "$(dirname "$0")/../public/sfx"
i=0
for id in scene-funk-90 scene-house-90 scene-chiptune-90 scene-breakbeat-90 scene-bossa-90 scene-synthwave-90; do
  i=$((i+1))
  [ -f bleed-$i.wav ] && continue
  url=$(curl -sfL "https://music.shapeof.world/tracks/$id.json" | python3 -c 'import json,sys;m=json.load(sys.stdin);print(m["assets"]["preview"]);r=m.get("rights") or {};assert r.get("commercialUse") is True and r.get("attributionRequired") is False')
  curl -sfL -o /Volumes/DevSSD/tmp-bleed.mp3 "$url"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss 20 -t 6 -i /Volumes/DevSSD/tmp-bleed.mp3 \
    -af "highpass=f=380,lowpass=f=3200,acompressor=threshold=-18dB:ratio=4,volume=0.9,afade=t=in:d=0.04,afade=t=out:st=5.6:d=0.4" -ac 1 -ar 48000 bleed-$i.wav
  echo "bleed-$i <- $id"
done
rm -f /Volumes/DevSSD/tmp-bleed.mp3
