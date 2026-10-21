# Voyager and Solar System source record

Retrieved 2026-09-18. These third-party observations and photographs retain their
source terms; the repository software and original-content licences do not
relicense them. No endorsement by NASA, JPL or Caltech is implied.

## Photographs

Courtesy NASA/JPL-Caltech. The nine Photojournal images are NASA/JPL mission
imagery, used under the [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/)
and [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
No logo, portrait, separately credited third-party artwork or Golden Record
recording is included. These are not project-owned exclusive commercial assets.

`image-sources.json` records original URLs, input/output SHA-256 and processing.
`src/components/experiences/worlds/solar-system/voyager/photos.ts` records the
individual NASA publication pages, acquisition dates, credit and processing
caveats displayed beside each image. Some images are composites, enhanced colour
or false colour; the 2020 Pale Blue Dot reprocessing uses 1990 observations.
WebP conversion (quality 82, width at most 1280) does not crop or invent content.
Rebuild from the repository root with `python3 scripts/build-voyager-images.py`
(macOS `sips` and `cwebp` required); review upstream hash changes before accepting.

## Trajectories

`ephemeris-sources.json` pins official NASA/JPL NAIF SPK/LSK downloads by SHA-256
and records output hashes. Raw kernels are build inputs in ignored `.scratch/`,
not browser dependencies. NAIF data-use and disclaimer information:
<https://naif.jpl.nasa.gov/naif/rules.html>.

Reproduction: create a Python virtual environment, install `spiceypy==8.0.0`,
then run `python scripts/build-voyager-ephemeris.py` from the repository root.
The generator refuses changed kernel hashes. SpiceyPy (MIT) and CSPICE are
external build tools, not copied runtime code or vendored components.

Output uses geometric heliocentric ECLIPJ2000 coordinates, kilometres and km/s,
with Unix UTC timestamps. The browser maps axes to a right-handed y-up scene.
Adaptive cubic Hermite segments are checked at their quarter/mid/three-quarter
points: spacecraft 1 km, encounter centres/moons 0.2 km, background planets
100 km interpolation tolerances. **These are sampling tolerances against the
chosen archives, not observational accuracy or a rigorous global error bound.**
Outer background tracks use planetary-system barycentres; encounter tracks use
matched planet centres and moons. SPK solutions include historical reconstructions
and predictions; they are not live telemetry.

Sub-second archival solution handoffs and UTC leap-second discontinuities are
recorded in each track's `seams`. They are excluded from smooth-segment error
statistics. The runtime snaps to an endpoint across these intervals instead of
inventing a high-velocity interpolation. Current spacecraft handoffs reach about
65,171 km (Voyager 1) and 13,692 km (Voyager 2), away from the matched closest-
approach samples. Do not interpret a tiny discontinuity as a real manoeuvre.

Coverage freezes at 2026-09-18. Later motion is explicitly constant terminal
heliocentric velocity, omitting solar deceleration, Galactic gravity and passing
stars. The NASA estimates of encounters with Gliese 445 and Ross 248 are sourced
narrative facts, not outputs of this simplified line. Planet rotation, pole
azimuth, spacecraft attitude, lighting and sky are illustrative. The observer
camera uses the spacecraft's geometric location but not its historical pointing.

## Small bodies

`small-body-sources.json` records the JPL SBDB API URL, solution date, element
epoch and raw-response hash for eleven selected objects. `minor-data.json` is a
frozen element extract. Rebuild via `python3 scripts/build-solar-minor-bodies.py`;
SBDB changes over time, so new results require review. Source:
<https://ssd-api.jpl.nasa.gov/doc/sbdb.html>.

Radii are rounded equivalent/schematic radii, not measured surface meshes:
Pluto 1188.3, Ceres 469.7, Eris 1163, Haumea 780, Makemake 715, Vesta 262.7,
Pallas 256, Halley 5.5, Encke 2.4, 67P 1.65, Hale–Bopp 30 km. Comet dimensions
are uncertain and irregular; spheres deliberately convey only approximate size.
The frozen two-body elements must not be used to predict encounters. Comet tails,
belt particles and Oort Cloud particles are qualitative illustrations, not a
catalogue of individually measured objects or a density reconstruction.

The spacecraft mesh and Web Audio score are original procedural creations;
no third-party model, music recording or sampled instrument was imported.
