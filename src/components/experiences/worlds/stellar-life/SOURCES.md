# A star’s life: model, sources and display boundaries

This is an original interactive atlas of four actual stellar-evolution histories. It interpolates archived calculations; it does not solve stellar structure in the browser or predict a particular observed star.

## Primary sources and commercial reuse

- Farag, E.; Timmes, F. X.; Taylor, M.; Patton, K. M.; Farmer, R., 2020. [Original Zenodo dataset, DOI 10.5281/zenodo.3707670](https://doi.org/10.5281/zenodo.3707670), version 1. The [record API](https://zenodo.org/api/records/3707670) specifies CC BY 4.0, permitting commercial reuse with credit and adaptation notice. Our adapted table retains CC BY 4.0 as an exception to repository original-content terms.
- [Farag et al., ApJ 893:133 (2020)](https://doi.org/10.3847/1538-4357/ab7f2c), [author manuscript](https://arxiv.org/html/2003.05844): MESA r12115, single nonrotating mass-losing solar-metallicity stars. The [2024 erratum](https://doi.org/10.3847/1538-4357/ad324c) corrects manual readings of neutrino peaks, not internal calculations or the photon/structure columns used here. No neutrino measurements are shown.
- [MESA output documentation](https://docs.mesastar.org/en/26.4.1/using_mesa/output.html): obsolete restarted history entries must be removed. [Original history-column definitions](https://github.com/MESAHub/mesa/blob/main/star/defaults/history_columns.list): age in years; mass and core masses in solar masses; log luminosity in solar units; log effective temperature in kelvin; log radius in solar radii; central density in g/cm³; central abundances are mass fractions. No MESA source code is incorporated.
- CIE 2019, [CIE 1931 2-degree observer, DOI 10.25039/CIE.DS.xvudnb9b](https://doi.org/10.25039/CIE.DS.xvudnb9b). Original CSV and official CC BY-SA 4.0 metadata are retained unmodified, with the appropriate license exception for colour data. See the [asset-adjacent rights record](../../../../../public/assets/stellar-life/SOURCES.md).
- [IAU 2015 Resolution B3](https://www.iau.org/static/resolutions/IAU2015_English.pdf): nominal solar conversion constants, not exact measured properties of the actual Sun. [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/wall_2022.pdf): Wien displacement and second radiation constants.
- [NASA, failed-supernova candidate from NEOWISE archival data](https://science.nasa.gov/blogs/science-news/2026/02/12/archival-data-from-nasas-neowise-tracks-star-turning-into-black-hole/): collapse need not produce a bright supernova. Initial mass alone is not a universal neutron-star/black-hole boundary.

All star surfaces, backgrounds, clouds, cutaway geometry and compact-object illustrations are procedural original artwork. No copyrighted paper figure or unlicensed track collection is used.

## Reproduction and reduction

Run `python3 src/components/experiences/worlds/stellar-life/prepare-data.py` from the repository root. Python standard library only. Original compressed histories download into ignored `.local/stellar-life/`. Four source files are pinned by MD5 from the Zenodo record and SHA-256 in `data-meta.json`; no request to a live science API is needed at runtime.

For a restarted run, entries with a model number or physical age at least as great as a newly appended row are discarded before accepting that replacement. Final retained histories have strictly increasing model numbers and binary64 ages. This matters in the final seconds of the massive models: rounding all ages to ten significant decimal digits would erase genuine time ordering.

147,054 valid rows are reduced to 12,853 samples. Piecewise linear interpolation is parameterized by **physical age**. A multidimensional recursive simplifier retains a sample whenever any selected feature would exceed its tolerance. Phase boundaries, endpoints and a solar-age anchor are mandatory samples. Maximum feature errors before decimal packing are: mass 0.002 M☉; log Teff 0.004 dex; log L 0.008 dex; log R 0.006 dex; log central T 0.008 dex; log central density 0.012 dex; each central abundance 0.006; each core mass 0.003 M☉; each log nuclear power 0.09 dex. Abrupt changes and thermal pulses therefore remain resolved within these declared limits, rather than being replaced with straight illustrative arrows. Ages keep full source binary64 values. Other values keep ten significant digits; that rounding is negligible compared with the declared reduction tolerances. No claim of numerical precision beyond the underlying stellar model is made.

Binary assets accept either their gzip bytes or a hosting layer's already-decompressed response. Schema, row counts, finite values and strictly increasing ages are validated before display. No cloud storage or credentials are required.

## Timeline and stages

The default browsing clock assigns equal display lengths to extracted intervals. It does **not** claim equal elapsed physical time. The alternative clock maps physical age linearly. Neither playback mapping changes source ages, physics, numeric values or the HR path. Scrubbing the HR diagram chooses a retained source record, and keyboard arrows traverse adjacent retained records.

Display stage gates are reproducible **browsing heuristics**, not an alternative stellar classification or exact universal ignition times:

- Pre-main sequence begins at the first original protostar record. Molecular-cloud collapse, accretion and birth before this record are not simulated.
- Main sequence starts when central H has fallen by 0.001 from its initial mass fraction and hydrogen-burning luminosity exceeds 89% of photon luminosity (`log LH - log L > -0.05`).
- Leaving the main sequence uses central H below 1e-4.
- Core helium-burning interval begins when central He falls by 0.01 relative to its value at the end of H burning. The earlier helium flash in low-mass stars is not falsely labelled as this exact boundary.
- Advanced/AGB browsing begins at central He below 1e-4. Low-mass post-AGB heating uses log Teff >4 and current mass <1.4 M☉ after this boundary; white-dwarf cooling begins at the hottest subsequent retained source point.
- The final gate is the final source record. Low-mass models end near 0.1 L☉, still around 30,000 K; they are not followed into hypothetical black dwarfs. Massive models stop when iron-core infall exceeds 300 km/s, before explosion or remnant calculation.

The same-age comparison stops each shorter-lived history at its own endpoint and marks it †. It does not extrapolate the endpoint into an assertion that the star remains in that state at later ages.

## Physical readings and visual geometry

All main readings come from history columns; effective temperature is the photospheric, not the central, temperature. Log temperature, radius and luminosity interpolate linearly with physical age. Linear interpolation of these logarithms approximately preserves their Stefan–Boltzmann relationship; the extra radius check uses T☉=5772 K. Escape speed uses G M☉=1.3271244e20 m³/s² and R☉=6.957e8 m. Wien's displacement uses b=2.897771955e-3 m K.

Central H/He/C/O bars are central mass fractions, not whole-star composition or energy shares. The nuclear-source bar divides powers from `log_LH`, `log_LHe`, `log_LZ` by their sum; it does not imply instantaneous equality with photon output. Thermal/gravitational storage and neutrino losses matter. The mass ledger uses the source's initial current mass minus its subsequent current mass. Wind loss and expelled envelope are represented; this is a retained/removed model-mass ledger, not a separate accounting of nuclear mass defects and radiated energy.

The selected internal core masses are compositional boundaries from MESA. They are nested for display by clipping each boundary to its enclosing mass; source instrument columns themselves are not changed. A displayed shell radius is `cuberoot(enclosed_mass / total_mass)`. This **equal-density mass-coordinate glyph** is not a measured radial-density profile, physical core size or shell-burning thickness. Inner-to-outer labels describe mass-coordinate ranges, not pure chemical layers. The small central highlight is a legibility cue, not a measured burning-zone radius.

Appearance radius defaults to `clamp(1.35 + 0.30 log10(R/R☉), 0.62, 2.3)` display units. Linear mode uses actual on-screen radius ratios with an overall camera-fit normalization. Compact stars can vanish beside supergiants at true linear ratios. Rotation and granulation are slowed original artwork. Starfield points are designed, not a stellar catalogue. The nebula is an environmental illustration. Gas particles indicate cumulative removed mass and do not solve gas hydrodynamics, shell ages, ionization or outflow speeds.

## Colour and compact remnants

Planck spectra are integrated from 360 to 830 nm against the unaltered 1-nm CIE 1931 table. XYZ converts to linear sRGB with the standard D65 matrix; negative channels clip to zero and the greatest channel normalizes to one. This is relative display colour, not bolometric intensity, calibrated photography or a safe observing method. Atmospheres, dust reddening, spectral lines and instrumental response are omitted. Actual luminosities stay numerical.

Neutron-star and black-hole views are explicitly separate **conditional illustrations**, with independently enlarged sizes. No source track continues into either view, no remnant mass is invented, and no initial-mass threshold assigns a branch. Rotation, metallicity, binary interaction, stellar structure, explosion energy and fallback affect real outcomes. A beam or accretion ring is a possible environment, not a required feature. No lensing, relativistic transport, explosive nucleosynthesis or nuclear engineering is calculated.

## Verification

Model tests pin the adapted data hash, source row counts, license and strict late-stage age ordering; verify raw/already-decoded gzip; confirm actual endpoints; round-trip both clock mappings; check interpolation against the Stefan–Boltzmann law; conserve displayed mass and shell totals; pin the CIE table hash and colour ordering; verify HR point selection and temperature-axis direction; and verify physical speed/wavelength/linear-radius calculations. Browser verification covers real local downloads, free 3D orbit, all masses, phase and HR navigation, playing and pause, cutaways, same-age comparison, scale mode, both conditional endings, mobile, English and reduced motion. All posters are actual rendered scene captures.
