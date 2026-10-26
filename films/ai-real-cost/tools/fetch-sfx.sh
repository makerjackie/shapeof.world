#!/bin/bash
# Fetch the v12 sound effects from music.shapeof.world (our own CC0 synthesis library) into public/sfx/.
set -e
cd "$(dirname "$0")/../public"
mkdir -p sfx
while read name id; do
  [ -f sfx/$name.wav ] || curl -sfL -o sfx/$name.wav "https://music-cdn.shapeof.world/tracks/$id/v1/master.wav"
done <<'LIST'
keypress sfx-mechanical-03
data sfx-scifi-11
scan sfx-transition-10
swipe sfx-transition-01
thump sfx-impact-08
reveal sfx-transition-20
punch sfx-impact-14
deep sfx-transition-12
sub sfx-impact-16
LIST
ls -la sfx
