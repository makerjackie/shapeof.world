#!/bin/bash
# Copies the CC0 Kenney models the film uses into public/models (not in Git).
# Source kits (CC0, https://kenney.nl): City Kit Suburban/Commercial/Industrial, Car Kit, Mini Characters 1, Nature Kit,
# Furniture Kit. Download each kit's zip from its kenney.nl page and unzip into $KENNEY/<kit-name>/.
set -e
KENNEY=${KENNEY:-/Volumes/DevSSD/Projects/assets-cc0/kenney}
cd "$(dirname "$0")/.."
rm -rf public/models && mkdir -p public/models
cp_kit() { mkdir -p public/models/$2/Textures; cp "$KENNEY/$1/Models/GLB format/"*.glb public/models/$2/ 2>/dev/null || true
  cp "$KENNEY/$1/Models/GLB format/Textures/colormap.png" public/models/$2/Textures/ 2>/dev/null || true; }
cp_kit city-kit-suburban sub
cp_kit city-kit-commercial com
cp_kit city-kit-industrial ind
cp_kit car-kit car
cp_kit mini-characters-1 chr
mkdir -p public/models/nat public/models/fur
for n in tree_oak_dark tree_default_dark tree_detailed_dark tree_fat_darkh tree_pineRoundC plant_bushLarge plant_bush \
  crops_cornStageD crops_leafsStageB crops_wheatStageB crop_pumpkin crop_carrot fence_simple; do
  cp "$KENNEY/nature-kit/Models/GLTF format/$n.glb" public/models/nat/; done
for n in tableRound chair cardboardBoxClosed cardboardBoxOpen; do
  cp "$KENNEY/furniture-kit/Models/GLTF format/$n.glb" public/models/fur/; done
du -sh public/models
