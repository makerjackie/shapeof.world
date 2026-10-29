# Wind, and the ocean

An original explorable globe of two real historical vector fields. This world is not a live weather display, a navigation instrument or a forecast of actual drifting objects.

## Primary sources and rights

The asset-adjacent [source and rights record](../../../../../public/assets/wind-ocean/SOURCES.md) identifies source URLs, MIT attribution for the upstream conversions, NOAA/NWS public-domain conditions, unrestricted PO.DAAC data use with citation, and the unchanged NASA cartographic base. Raw input hashes and binary hashes are checked into `data-meta.json`. `prepare-data.mjs` reproduces the binary assets from a pinned upstream commit, verifies the original hashes, and rejects unexpected numeric precision.

- [NOAA/NCEI Global Forecast System](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast): product provenance. The supplied historical conversion contains 10-m winds from NCEP, 2014-01-31 00Z cycle at +3 h.
- [NWS disclaimer and data-use policy](https://www.weather.gov/disclaimer): NWS data rights and identification requirements.
- [ESR OSCAR Surface Currents](https://www.esr.org/data-products/oscar/oscar-surface-currents/): estimated currents combine geostrophic, wind-driven and thermal-gradient terms, averaged over the upper 30 m of the solution.
- [PO.DAAC OSCAR third-degree product](https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_third-deg), DOI [10.5067/OSCAR-03D01](https://doi.org/10.5067/OSCAR-03D01): third-degree, five-day, 80°N–80°S product and retirement status.
- [PO.DAAC citation guideline](https://podaac.jpl.nasa.gov/CitingPODAAC): hosted data are openly shared without restriction, and the dataset should be cited.
- [Cameron Beccario, earth](https://github.com/cambecc/earth), pinned commit `5f091f0c3b60aa38a996a886985bacb3673d16c3`: the two historical JSON conversions, distributed with an MIT notice retained beside our assets. No upstream rendering code, private service, iframe or remote tile request is used.
- NASA / Reto Stöckli, Blue Marble land, shallow water and shaded topography: existing 4K image, rights and processing in `public/assets/solar-system/SOURCES.md`.

## Precisely which dates?

### Wind

- Original JSON reference time: `2014-01-31T00:00:00.000Z`.
- Forecast lead: 3 h; **validity 2014-01-31 03:00 UTC**.
- Specified height: 10 m above ground.
- 360 × 181 samples; longitude 0° to 359° in +1° columns; latitude +90° to −90° in −1° rows.
- Header spherical radius: 6,371,229 m.
- All 65,160 u/v pairs are present.

### Ocean

- Original JSON nominal time: `2014-01-31T00:00:00.000Z`.
- OSCAR third-degree version 1 is a **five-day product**, not an instantaneous observation or the modern daily quarter-degree v2 product.
- Header nominal depth: 15 m. This is not claimed to be a resolved 15-m layer: ESR describes the near-surface current as an upper-30-m mean.
- 1080 × 481 samples; longitude 20° to 379⅔° in +⅓° columns; latitude +80° to −80° in −⅓° rows.
- Header spherical radius: 6,367,470 m.
- 313,589 complete vectors. A missing u or missing v invalidates the pair. The original component masks are not replaced with a land raster or with zero velocity.

These dates and different time supports remain visible in the interface. They are not simultaneous high-frequency observations, and a local wind/current angle is not an estimate of an instantaneous response or causal coefficient.

## Encoding, loading and interpolation

The input conversions already have 0.01-m/s precision. Packing stores each component as signed little-endian Int16 at scale 0.01, reserving 32767 for missing. No resampling or extra quantisation is performed. Gzip payloads total 588,477 bytes; the existing NASA map is 906,226 bytes. The code validates decompressed lengths before decoding. It accepts either a gzip body or bytes already decoded by a host's `Content-Encoding: gzip`, avoiding double decompression.

The world downloads only local assets. Progress reports actual fetch-reader body bytes and does not invent a timer-based percentage or mix compressed Content-Length with decoded reader bytes. No external credentials or weather service is needed after deployment.

Interpolation is bilinear on native u/v components. Longitude is periodic and the ocean grid's 20° origin is explicitly handled. Latitude bounds are inclusive. At the final latitude row the previous row and a unit interpolation fraction are used. **All four cell corners require both components**, even at a coastal grid boundary; there is no coastal extrapolation. A missing cell can be land, sea ice, a coast or missing coverage; the interface does not label every missing point as land.

Speed is `sqrt(u² + v²)`. Flow-toward bearing clockwise from true north is `atan2(u,v)`; the meteorological wind-from bearing adds 180°. The compass and arrows show travel direction, while the wind instrument explicitly reports origin direction. Interpolating speed magnitudes instead of vectors is intentionally avoided.

## Spherical trajectories

The mathematical position is a unit Cartesian vector consistent with the globe's texture:

```
p = (cos φ cos λ, sin φ, −cos φ sin λ)
east  = (−sin λ, 0, −cos λ)
north = (−sin φ cos λ, cos φ, sin φ sin λ)
dp/dt = (u east + v north) / R
```

User trajectories apply fourth-order Runge–Kutta in this tangent field, normalising each intermediate point and the final point to the sphere. This avoids explicit division by cos(latitude), so the coordinate implementation remains finite near the poles. It does not magically remove uncertainty or the longitude-basis ambiguity of gridded pole data.

Each product uses its own radius from the input header. The chosen step is at most 1,800 s for wind or 10,800 s for water, and at most 0.22 of a representative native cell crossing time at the current speed. The zonal cell width is reduced by cos(latitude), with a 0.06 numerical floor very close to the poles. The vector field is sampled at every RK stage and at the endpoint. If a required sample is missing, the marker remains at the last valid point and stops; no crossing, beaching or rescue route is invented.

Distance travelled accumulates spherical great-circle distances between accepted steps. Separation uses a common 6,371,000-m reference sphere. Track replay interpolates recorded endpoints on the sphere, including across the antimeridian; this is replay interpolation, not a second integration. At most twelve user markers are kept. User history samples are spaced by approximately 30 minutes for air and two hours for water, with the current endpoint retained for smooth playback.

The observation clock advances only after a marker is released. It can pause, run at 1, 3 or 12 simulated h per real second, replay prior history and follow a selected marker. Clearing tracks resets the clock, while map and measurement settings remain available. The integration horizon is capped at **30 simulated days**.

## Frozen-field assumption

There is one frame for each product. Their native gridded velocities are held fixed throughout every trajectory. Therefore even a mathematically accurate 30-day path is an **illustrative steady-field trajectory, not a forecast or a reconstruction of a particular real drifter**. Weather evolution, tides, waves, Stokes drift, vertical movement, sub-grid turbulence, stochastic diffusion, buoyancy and object windage are omitted.

A “water marker” follows the product's upper-ocean velocity; it is not a realistic floating bottle, vessel, spill or life-saving search target. The nine-marker release shows only differential advection from starts roughly 20–35 km apart, not a measured turbulent dispersion law. The paired air and water experiment compares two different velocity products and temporal supports; it does not model coupled atmosphere–ocean dynamics.

## Rendering and scope

- The globe uses the existing NASA image as a historical cartographic texture, with designed observation lighting rather than an asserted 2014 solar terminator. No cloud photograph is overlaid as if synchronous with the fields.
- The data texture for speed colours is generated by native-grid interpolation to a 720 × 360 display raster. Missing ocean cells stay transparent. Each streamline vertex is coloured by its local sampled speed, using the same linear-RGB palette as the scalar display raster. Scalar colours saturate at 28 m/s for wind and 2.4 m/s for currents; numerical readings remain unclipped.
- Background streamline geometry uses native-field RK4 with approximately fixed arc-length sampling rather than the user clock, so slow-current structure remains legible. Steps target 0.28 of a local native cell, refine when an endpoint would jump too far, and stop at missing values. These are frozen-field streamlines; animated highlights loop at a designed visual rate. **They do not measure elapsed drift time or physical speed at screen scale.** User markers separately use the physical clock described above.
- Ocean and wind lines are displayed at 1.009 and 1.022 globe radii. The height separation is a display choice, not the actual difference between ocean depth and 10-m wind. Local direction arrows have equal fixed display lengths; neither their length nor compass-arrow length is used to compare speeds.
- Seeds are deterministic and approximately uniform in spherical area. Calm/near-zero vectors are omitted from the background streamlines to reduce visual clutter; the probe still reports their actual speeds.
- Eight regional camera entries were chosen for exploration. Some probe starts were selected from stronger cells in this particular snapshot, not imposed climatological flow directions. All paths remain computed from the same source fields.
- Mobile reduces background streamline count and retains every measurement, release, nine-marker experiment, region, time/replay, layer and following control.

## Verification

Automated model checks cover source/binary hashes and counts, raw versus already-decoded gzip delivery, exact 3-hour forecast validity, bilinear component values, periodic longitude with shifted origins, both latitude edges, strict missing corners, globe/texture basis, known equatorial and meridional motion, antimeridian crossing, finite polar stepping, cell-dependent time steps, elapsed time and distance, replay interpolation, wind-from versus flow-toward bearing, bounded spherical streamline geometry and missing polar rows in the speed raster.

Browser QA covers the full route from local binary download through rendered globe, measurement, paired release, elapsed motion, pause/replay, individual removal, nine-marker release, regional movement, missing-value handling, English copy, mobile controls and reduced-motion start. Screenshots are produced from the actual world, including the complete poster set.
