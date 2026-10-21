# Evidence event provenance

The fixed values in `event-data.ts` are a small extract from the `Zmumu.csv`
file in CERN Open Data record 307, “Z to two muons from 2010”. The selected row
is `Type=GG, Run=148029, Event=64829157`; the source row reports
`M=91.1845527329` GeV. (The CSV contains multiple reconstruction rows for
the same run/event, so the `Type` discriminator is part of this event key.)
The release describes 2,304 events selected for education and outreach from
real 2010 CMS data at 7 TeV. It is released under the **CC0 1.0 Universal**
waiver and requests citation of DOI `10.7483/OPENDATA.CMS.XBN9.HFGT`.

Source record and file:

- https://opendata.cern.ch/record/307
- https://opendata.cern.ch/record/307/files/Zmumu.csv

The renderer is original project code under the repository's default
`AGPL-3.0-only` terms. It does not embed or vendor iSpy WebGL. iSpy WebGL was
researched as a reference event-display implementation; its source is MIT at
https://github.com/cms-outreach/ispy-webgl.
