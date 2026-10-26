#!/bin/bash
# Downloads everything kept out of Git: the two soundtracks and the sound effects (music.shapeof.world, the brand's
# own library), the photos (Wikimedia Commons: HUD public domain; Exploringlife CC BY-SA 4.0) and NASA's Black Marble.
cd "$(dirname "$0")/../public" || exit 1
UA="Mozilla/5.0"
mkdir -p sfx photos map
for id in invisible-halo ice-retreat; do [ -s "$id.mp3" ] || curl -sS -A "$UA" -o "$id.mp3" "https://music-cdn.shapeof.world/tracks/$id/v1/master.mp3"; done
for id in sfx-foley-02 sfx-mechanical-01 sfx-transition-08 sfx-mechanical-08 sfx-water-12 sfx-mechanical-18 sfx-mechanical-14 sfx-scifi-17 sfx-transition-05 sfx-impact-03 sfx-ui-13 sfx-water-10 sfx-notification-18 sfx-impact-11 sfx-transition-19 sfx-transition-15 sfx-impact-16 sfx-transition-18 sfx-impact-19; do
  [ -s "sfx/$id.wav" ] || curl -sS -A "$UA" -o "sfx/$id.wav" "https://music-cdn.shapeof.world/tracks/$id/v1/master.wav"
done
[ -s photos/pruitt-collapse.jpg ] || curl -sS -A "$UA" -o photos/pruitt-collapse.jpg "https://upload.wikimedia.org/wikipedia/commons/1/1b/Pruitt-Igoe-collapses.jpg"
[ -s photos/pruitt-aerial.jpg ] || curl -sS -A "$UA" -o photos/pruitt-aerial.jpg "https://upload.wikimedia.org/wikipedia/commons/b/b9/Pruitt-igoeUSGS02.jpg"
[ -s photos/meifoo-2021.jpg ] || curl -sS -A "$UA" -o photos/meifoo-2021.jpg "https://upload.wikimedia.org/wikipedia/commons/5/56/Mei_Foo_Sun_Chuen_2021.jpg"
for f in photos/*.jpg; do /opt/homebrew/bin/magick "$f" -resize "2400x2400>" -quality 90 "$f"; done
if [ ! -s map/china-lights.jpg ]; then
  curl -sS -A "$UA" -o map/bm2016.jpg https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg
  /opt/homebrew/bin/magick map/bm2016.jpg -crop 2363x1462+9487+1350 +repage -quality 92 map/china-lights.jpg
fi
ls -l . sfx photos map | head -60
