## Synopsis

This project provides a WebGL2 shader to render a non-rotating black hole with
an accretion disc and background stars. See the [full documentation](
https://ebruneton.github.io/black_hole_shader/index.html) for more details, as
well as the [online demo](
https://ebruneton.github.io/black_hole_shader/demo/demo.html).

## License

This project is released under the BSD license.

## Shape of the World source subset

Restored and reviewed on 2026-10-18 against upstream revision
`e72b3f293409893a6fa25528b29572c96fc57f57` (2020-11-11).
`black_hole/demo/camera_view/camera_view.js` retains this project's earlier
touch/camera adaptations. The deployed adaptation is
`public/vendor/black-hole/demo.html`; its sky is generated independently by
`scripts/generate-black-hole-sky.mjs`, rather than by the historical catalogue
pipeline retained here for format reference.

This is a source subset: `black_hole/paper/` (including the historical sky
teaser and external typesetting files) and the separately sourced
`submodules/rgb9_e5/` C helper, Gaia instrument passband table
`gaia_sky_map/colors.inc`, and raw CIE table `color_maps/colors.inc` are
intentionally excluded. Existing BSD demo lookup tables remain in the runtime;
this task does not rebuild them or import another color dataset. The paper remains a
[scientific reference](https://arxiv.org/abs/2010.08735). The original Makefile
documents the upstream toolchain; it is not this site's build command and is
not a complete source distribution of every optional upstream target.
No catalogue downloads, catalogue data or upstream sky images are included.
See `public/vendor/black-hole/NOTICE.md` and the world's `SOURCE.md` for the
asset-level record and licence boundaries.

Restored text has trailing whitespace normalized for repository diff checks;
this does not change the shader, model, lookup data or runtime behavior.
