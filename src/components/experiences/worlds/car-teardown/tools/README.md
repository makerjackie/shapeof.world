# Preparing the local car assets

Run from the repository root. Inputs live in `.local/car-assets/`; generated binaries are not committed. Keep the source license documents with the inputs. Tools are offline preparation dependencies, not application dependencies:

```sh
npm install --prefix .local/car-prep --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 draco3dgltf three
# Copy the preparation module beside those dependencies, or provide equivalent Node resolution.
cp src/components/experiences/worlds/car-teardown/tools/prepare-assets.mjs .local/car-prep/prepare-assets.mjs
```

First convert the CC0 STEP into Y-up GLB with product names preserved. Blender adds casting bevels:

```sh
blender --background --python src/components/experiences/worlds/car-teardown/tools/bevel-engine.py -- .local/car-assets/innerscene-i4/model.glb .local/car-assets/v2/engine-beveled.glb
node .local/car-prep/prepare-assets.mjs
```

`prepare-assets.mjs` reads the compressed Khronos source, strips logos and placeholders, preserves native uniform scale, aligns wheel axes, moves the central controls rearward, and reconstructs rigid engine bind groups with semantic `kind`, cylinder and pivot metadata. The source engine's 45-degree pose is undone before runtime kinematics. Draco never merges different moving parts. KTX2 images stay embedded.

The default public asset directory is intentionally unpopulated at this checkpoint. For local development:

```sh
VITE_CAR_ASSET_BASE=/@fs/ABSOLUTE/WORKTREE/.local/car-assets/v2 pnpm dev --port 3221
```

For a release, upload `car.glb`, `engine.glb`, `studio.hdr`, Draco/Basis decoder JS/WASM and their Apache-2.0 notices into one versioned asset directory; v2 lives in R2 bucket `shapeof-world-assets` under `car-teardown/v2/`, served at `/assets/car-teardown/v2/` by the site Worker; a new version goes in a new `v<n>/` prefix, added to `PREFIXES` in `src/worker/world-assets.ts`. Keep Khronos/DGG/Unity Fan attribution from `SOURCES.md`. Do not upload raw STEP, `engine-beveled.glb`, the encoder or reference screenshots. Publication requires its own approval.
