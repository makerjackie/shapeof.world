#!/bin/bash
# Fetch the sound effects from music.shapeof.world (our own CC0 synthesis library) into public/sfx/,
# then synthesise the few the library lacks (tools/synth-sfx.py).
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
switch sfx-mechanical-01
clip sfx-ui-12
slap sfx-impact-14
book sfx-foley-16
LIST
PY=${PY:-$HOME/.venvs/shapeof-films/bin/python}
[ -f sfx/flaps.wav ] && [ -f sfx/meter.wav ] || $PY ../tools/synth-sfx.py sfx
ls -la sfx
