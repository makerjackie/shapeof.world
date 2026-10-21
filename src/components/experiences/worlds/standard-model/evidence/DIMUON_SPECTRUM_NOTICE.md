# CMS dimuon spectrum extract

This fixed histogram is aggregated from the complete `MuRun2010B.csv` file in [CERN Open Data record 700](https://opendata.cern.ch/record/700), “Dimuon event information derived from the Run2010B public Mu dataset”. The record contains 100,000 rows from 2010 Run2010B data and assigns DOI `10.7483/OPENDATA.CMS.CB8H.MFFA`.

The source is released under the **CC0 1.0 Universal** waiver. The source record says that events were selected for precisely two muons with invariant mass between 2 and 110 GeV, with at least one high-quality global muon. It also warns that the selection may differ from CMS physics results and is not suitable for a full physics analysis.

`dimuon-spectrum.json` retains the source URL, DOI, license, acquisition date, SHA-256 of the downloaded CSV, selection description, units, row count and fixed 1 GeV/c² histogram. The 108 bins cover `[2, 110)` GeV/c² and sum to 100,000. No source CSV or large binary is shipped.

To reproduce and verify the extract, obtain `MuRun2010B.csv` manually from the record's file link, save it locally, and run:

```sh
python3 scripts/standard-model/export-dimuon-spectrum.py --input /path/to/MuRun2010B.csv
```

The script never downloads data. It verifies the recorded SHA-256, reads the real `M` column, checks the event count and range, and compares every recomputed bin with the checked-in JSON.

This is a preselected education sample, not an unbiased cross-section measurement. Its peaks are useful as a visual route from reconstructed data to candidate resonances, but a histogram alone does not establish a discovery, significance, detector efficiency, background model or systematic uncertainty. The project renderer is original code under the repository’s `AGPL-3.0-only` terms and must cite the DOI when presenting the extract.
