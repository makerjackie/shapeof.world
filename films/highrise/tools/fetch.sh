#!/bin/bash
# Downloads everything kept out of Git: the two soundtracks and the sound effects (music.shapeof.world, the brand's
# own library), the photos (Wikimedia Commons: HUD public domain; Exploringlife CC BY-SA 4.0) and NASA's Black Marble.
cd "$(dirname "$0")/../public" || exit 1
UA="Mozilla/5.0"
mkdir -p sfx photos map
# 《千年之后（氛围版）》 (third-party, as on tower): copy from the tower film
[ -s qnzh.m4a ] || cp ../../tower/public/music.m4a qnzh.m4a 2>/dev/null || cp /Volumes/DevSSD/Projects/code/shapeof.world/films/tower/public/music.m4a qnzh.m4a
for id in sfx-foley-02 sfx-mechanical-01 sfx-transition-08 sfx-mechanical-08 sfx-water-12 sfx-mechanical-18 sfx-mechanical-14 sfx-scifi-17 sfx-transition-05 sfx-impact-03 sfx-ui-13 sfx-water-10 sfx-notification-18 sfx-impact-11 sfx-transition-19 sfx-transition-15 sfx-impact-16 sfx-transition-18 sfx-impact-19 sfx-mechanical-16 sfx-transition-16 sfx-impact-08 sfx-transition-07 sfx-impact-20; do
  [ -s "sfx/$id.wav" ] || curl -sS -A "$UA" -o "sfx/$id.wav" "https://music-cdn.shapeof.world/tracks/$id/v1/master.wav"
done
[ -s photos/surfside-before.jpg ] || curl -sS -A "$UA" -o photos/surfside-before.jpg "https://upload.wikimedia.org/wikipedia/commons/8/82/Champlain_Towers_South_%28Surfside%2C_Miami%2C_FL%29.jpg"
[ -s photos/surfside-rescue3.jpg ] || curl -sS -A "$UA" -o photos/surfside-rescue3.jpg "https://upload.wikimedia.org/wikipedia/commons/0/0d/Surfside_condominium_collapse_photo_from_Miami-Dade_Fire_Rescue_3.jpg"
[ -s photos/meifoo-2021.jpg ] || curl -sS -A "$UA" -o photos/meifoo-2021.jpg "https://upload.wikimedia.org/wikipedia/commons/5/56/Mei_Foo_Sun_Chuen_2021.jpg"
for f in photos/*.jpg; do /opt/homebrew/bin/magick "$f" -resize "2400x2400>" -quality 90 "$f"; done
if [ ! -s map/china-lights.jpg ]; then
  curl -sS -A "$UA" -o map/bm2016.jpg https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg
  /opt/homebrew/bin/magick map/bm2016.jpg -crop 2363x1462+9487+1350 +repage -quality 92 map/china-lights.jpg
fi
ls -l . sfx photos map | head -60
