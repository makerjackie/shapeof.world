# Black-hole flyby runtime — third-party notices

This directory is the deployed demo bundle of
[Eric Bruneton's Black Hole Shader](https://github.com/ebruneton/black_hole_shader),
BSD-3-Clause. The shader license is `LICENSE` in this folder and
`public/assets/oss-source/LICENSE-black-hole-shader.txt`.

## Background star cubes (`gaia/*.dat`)

The cubemap is a processed sky from the upstream demo. Bruneton's demo UI labels
the two source catalogues **Gaia DR2** and **Tycho-2**.

- Gaia DR2: European Space Agency (ESA) mission *Gaia*, processed by the Gaia
  Data Processing and Analysis Consortium (DPAC).
  Credit: ESA/Gaia/DPAC.
  Official acknowledgement:
  https://gea.esac.esa.int/archive/documentation/GDR2/Miscellaneous/sec_credit_and_citation_instructions/
  Gaia data are open and free to use with that credit. ESA Space Science Archive
  terms also point at CC BY-NC 3.0 IGO for archive data products and require a
  separate request to `data.licences@esa.int` before commercial relicensing of
  those products. These cubes are not covered by Shape of the World's AGPL or
  CC BY-NC original-content licenses.
- Tycho-2: ESA / Høg et al. (2000). Use of the catalogue is allowed with
  acknowledgement of the source.

Neither ESA nor the DPAC endorses Shape of the World.

The relativistic lensing, accretion disc, and Doppler shift do **not** depend on
these catalogues. The cubes are only the background sampled along bent rays.

A commercially usable photographic cubemap recipe from NASA/GSFC SVS
[Deep Star Maps 2012](https://svs.gsfc.nasa.gov/3895) is kept in
`scripts/build-black-hole-sky.mjs`. It is **not currently shipped**: Bruneton’s
shader expects packed RGB9_E5 / 5-9-9-9 star tiles, and a display-referred JPEG
cube looks soft by comparison. Swap only after converting or changing the
sampler.

## Other binary tables

`black_body.dat`, `deflection.dat`, `doppler.dat`, `inverse_radius.dat`,
`rocket.dat`, and the rocket textures ship with the BSD-3-Clause demo and remain
under that shader license.
