# Transparent display derivatives

These 93 WebP images are background-removed derivatives of the photo-referenced
AI illustrations in `../display/`, not new photographs or new generated specimens.
Original reference photographs, generation masters and generation manifests remain
unchanged. Their individual attribution, source licence and adaptation terms in
`../display/NOTICE.md` and `generation-*.json` continue to apply to these derivatives.
No exclusive rights or endorsement are claimed.

On 2026-09-11, with the user's approval of local background removal, Apple Vision
foreground instance segmentation (revision 1, macOS version recorded in
`sources.json`) produced masks for 89 images. All detected foreground objects were
kept, including the four americium pieces and two plutonium pieces. Segmentation
does not repaint or generate pixels. The unchanged master RGB was combined with
the mask, retaining the source dimensions, and encoded as WebP quality 84, method 6.
Alpha is stored in the files, including the 160px and 640px derivatives; the UI
does not depend on multiply blending to disguise an opaque background.

At, Pa and Po keep their complete dark or monochrome experimental fields. Only
the connected outer white mounting border was removed (8% colour fuzz). Np uses
the same outer-background procedure (14% fuzz) to retain its complete cork support,
which foreground instance segmentation incorrectly removed. These four masks
have a 0.45px edge blur; all masks use a 1%,99% level adjustment. Cropped source
containers, internal glass reflections, and white areas within physical glass
remain as photographed/generated: this is an alpha cutout, not optical refraction
reconstruction. The eight other photographic positions retain their documentary
context. The 17 synthetic-element diagrams retain vector previews and live detail;
their small grid cells use separately recorded transparent WebP thumbnails.

The 93 outputs were reviewed on dark and paper backgrounds for specimen silhouette,
small components, glass edges and retained context. The unchanged reference photos
are the evidence; neither a generative adaptation nor a segmentation result is a
chemical measurement. `sources.json` locks each master hash, output hash, dimensions,
mask method and decoded alpha pixel counts. Regeneration is intentionally explicit
and requires another visual review because system segmentation can vary by OS.

Generate with `node scripts/generate-periodic-table-cutouts.mjs` on macOS 14+ with
Swift and ImageMagick 7; verify locked artifacts on a supported ImageMagick host
with `node scripts/generate-periodic-table-cutouts.mjs --check`. Then regenerate
responsive assets with `node scripts/generate-periodic-table-images.mjs`.

## Storage and loading

This fixed collection exceeds the 100-raster assessment threshold. It stays in
Git + Static Assets: images are compressed, paths contain content hashes, the
existing public-dependency collector can package them locally, and the repository
does not yet have a generic remote-world-image download/lock adapter. This change
does not require a live image-transformation service or alter App runtime policy.
Old referenced objects remain available for rollback. The additional cutout masters
are only requested when an exhibit opens; entry uses 160px thumbnails (the complete
photographic grid remains within 400 KiB), and the one featured preview uses 640px.
Each full cutout is below 250 KiB, each preview below 100 KiB, each thumbnail below
20 KiB. Hashes and exact byte counts are recorded in the adjacent and responsive
manifests. The photographic grid stays below 400 KiB; the detailed nuclear diagrams
have a separate 128 KiB allowance, and all grid images together stay below 512 KiB.
This preserves the diagrams' fine structure while keeping entry below the 1 MiB
image-transfer target. Asset
references remain local for offline collection; no App build or release is claimed.
