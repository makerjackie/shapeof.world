# Complete element data notice

`complete-element-data.json` is a dated, transformed snapshot of the official
PubChem PUG-REST periodic-table endpoint:

<https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON>

Snapshot attribution:

- Retrieved: 2026-09-10
- SHA-256 of the fetched response: `ff0f75976583b8a6493b18d0b42e83e1b68bd6e112b45d33578d98494ed5d321`
- PubChem/NCBI citation and data access guidance:
  <https://pubchem.ncbi.nlm.nih.gov/docs/citation-guidelines>
- PubChem download, provenance and licensing guidance:
  <https://pubchem.ncbi.nlm.nih.gov/docs/downloads>
  and <https://www.ncbi.nlm.nih.gov/home/about/policies/>

PubChem describes the periodic-table values as compiled from authoritative
contributors and directs users to the individual element pages for detailed
provenance. This repository keeps the endpoint snapshot hash and date so a
future refresh can be compared explicitly. NCBI requests acknowledgment for
government-created public-domain material, while PubChem also warns that some
contributed content can carry separate restrictions; this notice therefore
attributes PubChem and does not claim a blanket license for unrelated PubChem
records.

The source endpoint reports melting and boiling points in kelvin. The checked
snapshot converts those two fields to degrees Celsius by subtracting 273.15
and rounds to six decimal places. Density remains g/cm³ and electronegativity
remains the Pauling scale. Blank source cells remain `null`; no missing
property is imputed. Configuration strings marked `(predicted)` or
`(calculated)` retain their orbital text, have the marker removed, and set
`configPredicted: true`. The source's arsenic pair (1090 K melting, 887 K
boiling) is internally inconsistent, so its boiling value is deliberately
`null` rather than silently corrected.

The JSON snapshot contains factual data only. Project code remains under the
repository's AGPL-3.0-only license; this notice does not relicense PubChem,
NCBI, or any contributor material.

## Lawrencium configuration qualification

The PubChem snapshot lists Lr as `[Rn]7s2 5f14 6d1`. This record is overridden
in the checked output with `[Rn]7s2 5f14 7p1`, with `configPredicted: true` and
a per-record `note`. The NIST Atomic Spectra Database's element 103 record
lists the ground-state configuration as `[Rn]5f14 7s2 7p`:
<https://physics.nist.gov/cgi-bin/Elements/elInfo.pl?element=103>.

This is kept as a qualified prediction rather than experimental certainty.
Recent spectroscopy literature reports no high-precision experimental atomic
structure for Lr, while calculations consistently favor the 7s²7p ground
state; see <https://doi.org/10.1140/epjd/s10053-026-01198-9> (lines 119–122
in the article's HTML). The PubChem source hash above still identifies the
unmodified fetched response, and this explicit record override is intentionally
documented here.

The optional `atomicRadius` field is PubChem's van der Waals radius in pm,
and `ionization` is first ionization energy in eV. PubChem documents these
units on its periodic-table property views:
<https://pubchem.ncbi.nlm.nih.gov/periodic-table/atomic-radius/> and
<https://pubchem.ncbi.nlm.nih.gov/periodic-table/ionization-energy/>.

The records for C, He, and As carry condition notes for phase UI. Carbon's
listed thermal values are condition dependent and carbon sublimates at ordinary
pressure; helium's listed melting point requires increased pressure because it
stays liquid to very low temperatures at ordinary pressure; arsenic's 887 K
value is standard-atmosphere sublimation and its 1090 K melting value is about
28 atm. These should be rendered as qualified phase boundaries, never as an
unqualified sequence of ordinary-pressure melt and boil events.
