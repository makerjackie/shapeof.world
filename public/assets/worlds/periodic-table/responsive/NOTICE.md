# Responsive element images

These are resized, WebP-compressed derivatives of the existing display illustrations
and reference photographs. No generative editing, cropping, recolouring or upscaling
is applied. Source photographs and display illustrations are unchanged.

Each entry in `sources.json` records the input and output SHA-256, dimensions,
bytes, ImageMagick version and conversion arguments, plus the original reference
and its credit, source and licence. The input notices in `../display/NOTICE.md`
and `../collection/NOTICE.md` still apply; no new or broader licence is claimed.
Shared Bk/Ts imagery reuses the same two files and retains its contextual caption.

- Small cells: longest edge 160px, quality 72; 100 files, 257,932 bytes total.
- Spotlight preview: longest edge 640px, quality 78; 100 files, 2,638,536 bytes total.
  Only the currently previewed element requests its preview image.
- Detail/reference views retain their existing full-size files and load on demand.
- The 17 synthesis illustrations remain SVG, preserving vector lines and labels.

Both photo variants preserve the whole input frame and aspect ratio. The 160px
variant covers the current cell's maximum roughly 74px photo area at 2x DPR;
additional resolutions should follow an actual layout/DPR need. File totals above
are not cold-page network measurements: SVG, the one visible preview, other page
assets, response compression and browser caching are separate.

Regenerate from the repository root with `node scripts/generate-periodic-table-images.mjs`.
Use the recorded ImageMagick version and run the same command with `--check` to
re-encode and verify reproducibility. Run the world's image tests for coverage,
hashes, actual WebP dimensions and byte budgets. Do not edit generated images,
`sources.json` or `image-variants.ts` by hand. Content hashes in filenames prevent
replacement content from reusing an old URL; regeneration does not delete old files.

This collection exceeds the media standard's 100-raster review threshold. Its
derivatives remain in Git + Static Assets for now because the fixed, reproducible
local inputs support both the web and existing offline asset collector; generic
remote-image collection is not implemented. These variants add 2,896,468 image
bytes to offline assets, but each web visit fetches only the selected sizes. The
world's literal generated URLs allow the existing exporter to collect both variants.
This change neither uploads assets to R2 nor changes distribution or cache settings.
