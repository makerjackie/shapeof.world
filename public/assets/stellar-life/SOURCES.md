# Stellar-life data rights and provenance

These third-party datasets are exceptions to the repository's general CC BY-NC original-content license. Both permit commercial use without an application. Original scene artwork is separate; no paper figure, astronomical photograph or MESA source code is copied.

## Stellar evolution table — CC BY 4.0

Farag, Ebraheem; Timmes, F. X.; Taylor, Morgan; Patton, Kelly M.; Farmer, R. (2020). **Stellar Tracks (i.e., MESA history files) used in the article “On Stellar Evolution In A Neutrino Hertzsprung-Russell Diagram”**, version 1. Zenodo. DOI [10.5281/zenodo.3707670](https://doi.org/10.5281/zenodo.3707670).

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The original record's [machine-readable metadata](https://zenodo.org/api/records/3707670) explicitly identifies `cc-by-4.0`.

`tracks.json.gz` is adapted by Shape of the World: four selected initial masses (1, 3, 15, 25 solar masses); 23 selected columns; obsolete MESA restart rows removed; bounded-error interpolation simplification; full binary64 ages retained and other columns packed at ten significant decimal digits; JSON serialized and gzip compressed. The adapted table remains **CC BY 4.0**. Original compressed history hashes and exact transformations are in the world source's `prepare-data.py` and `data-meta.json`.

The source histories are single, nonrotating, solar-metallicity MESA r12115 calculations. The two low-mass tracks end with still-hot white dwarfs. The two massive tracks stop at rapid iron-core infall; there are no numerical explosion or compact-remnant predictions in this dataset. Citation: [Farag et al. 2020, ApJ 893, 133](https://doi.org/10.3847/1538-4357/ab7f2c), and [2024 erratum](https://doi.org/10.3847/1538-4357/ad324c). The erratum corrects manually read neutrino peaks, not the internally calculated histories. This world does not display neutrino luminosities or fluxes.

## Colour-matching functions — CC BY-SA 4.0

International Commission on Illumination (CIE), 2019. **CIE 1931 colour-matching functions, 2 degree observer**. DOI [10.25039/CIE.DS.xvudnb9b](https://doi.org/10.25039/CIE.DS.xvudnb9b). Source: [original CSV](https://files.cie.co.at/Publications-datasets/CIE_xyz_1931_2deg.csv), [original metadata](https://files.cie.co.at/Publications-datasets/CIE_xyz_1931_2deg.csv_metadata.json).

License: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). The official metadata explicitly records this license. Both CSV and metadata are retained unmodified. CSV MD5: `17cca777db64b17170f06f67ce9d3ab7`; 471 samples, 360–830 nm at 1-nm intervals. Any derived colour-data adaptation is likewise made available under CC BY-SA 4.0. The independently authored physical integration and application code follows the repository's AGPL-3.0 terms.

The scene integrates Planck spectral radiance with these functions, converts XYZ to linear sRGB and normalizes the greatest channel to one. RGB display gamut clipping and independent exposure are explicit display choices; screen brightness is not a calibrated view of stellar luminosity, and no human could safely observe a resolved stellar photosphere this way.
