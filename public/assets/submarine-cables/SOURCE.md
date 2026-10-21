# Shared land mask

`land.json` contains simplified Natural Earth 1:110m country outer rings, used
by the retained `earth-spin-orbit` world to distinguish land and ocean.

- Upstream: https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/
- Terms: public domain; https://www.naturalearthdata.com/about/terms-of-use/
- Local source: `public/assets/flow/countries.geojson`.
- Derivation: Douglas-Peucker simplification, epsilon 0.16 degrees; rings under
  0.6 square degrees omitted; coordinates rounded to two decimal places.
- Rebuild: `node scripts/generate-earth-land-mask.mjs`.

The historical asset directory name is retained for existing consumers. The
withdrawn cable network data and world are not included.
