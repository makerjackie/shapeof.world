# Historical wind and current fields

These are historical scientific data, not live feeds. They are excluded from the repository's original-content CC BY-NC licence; upstream data rights continue to apply.

## Data provenance and rights

The two JSON conversions were retrieved from [Cameron Beccario's `earth`](https://github.com/cambecc/earth), pinned commit `5f091f0c3b60aa38a996a886985bacb3673d16c3`, checked 2026-10-30. Its MIT notice is retained in [LICENSE-earth.md](./LICENSE-earth.md). This world independently implements its globe, interpolation, spherical integration and interaction; it does not embed the upstream application or request earth.nullschool.net tiles or services.

- **Wind**: NOAA / National Weather Service / NCEP, GFS 10-m u/v. Reference cycle `2014-01-31T00:00:00Z`, forecast lead 3 h, validity `2014-01-31T03:00:00Z`. Grid 360 × 181, 1° spacing, longitude start 0°, latitude 90° to −90°. Units m/s. [GFS product reference](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast). [NWS data-use policy](https://www.weather.gov/disclaimer): NWS information is in the public domain except where noted, for lawful use with source identification, without misleading official presentation or endorsement. No NOAA/NWS logo is included.
- **Ocean**: Earth & Space Research (ESR), OSCAR third degree, version 1, dataset DOI [10.5067/OSCAR-03D01](https://doi.org/10.5067/OSCAR-03D01). Historical nominal date `2014-01-31T00:00:00Z`; a five-day product, not an instantaneous observation. Grid 1080 × 481, ⅓° spacing, longitude start 20°E, latitude 80°N to 80°S. Units m/s. The conversion's depth label is 15 m; [ESR's method description](https://www.esr.org/data-products/oscar/oscar-surface-currents/) describes upper-30-m mean currents. This old product has been retired and is used here as a historical sample. [PO.DAAC Data Use and Citation Guideline](https://podaac.jpl.nasa.gov/CitingPODAAC) explicitly makes hosted data openly shared without restriction, with appropriate citation. This notice does not claim that contractor-created OSCAR data are federal public-domain works.

Citation: **ESR. 2009. OSCAR third deg. Ver. 1. PO.DAAC, CA, USA. Historical conversion accessed 2026-10-30 through the pinned earth repository, DOI 10.5067/OSCAR-03D01.**

## Binary format

`wind-20140131.i16.gz` and `ocean-20140131.i16.gz` losslessly preserve the conversions' original 0.01-m/s precision and each component's missing values. After gzip decompression:

1. `nx × ny` signed little-endian Int16 u values, north-to-south rows and eastward columns;
2. the same number of Int16 v values;
3. multiply non-missing integers by 0.01 m/s; sentinel `32767` means missing.

The original JSON SHA-256 hashes, decompressed binary hashes, reference radii, exact geometry and valid-vector counts are in `src/components/experiences/worlds/wind-ocean/data-meta.json`. The reproducible converter is adjacent: `prepare-data.mjs`. It pins URLs and verifies source hashes before writing. Compressed sizes are 203,958 bytes for wind and 384,519 bytes for currents.

OSCAR has 313,589 complete vectors. A complete vector requires **both** u and v; the two missing masks differ slightly and are retained independently.

## Earth image

The existing `/assets/solar-system/earth-bmng-4k.jpg` is reused unchanged. Reto Stöckli / NASA Goddard Space Flight Center, Blue Marble land surface, shallow water and shaded topography. Original source and rights: [existing solar-system source record](../solar-system/SOURCES.md), [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). It is a cartographic base, not satellite imagery synchronous with these velocity fields. No NASA logo or endorsement is implied.
