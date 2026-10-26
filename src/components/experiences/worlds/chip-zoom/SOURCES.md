# Inside a chip — data, rights and model boundaries

Checked 2026-10-26. Third-party layouts retain their upstream licenses; they are
not relicensed as original project content. No third-party photo is shipped.

## Real layout

- **Design:** Ryan Cornateanu, ALU, Tiny Tapeout 02.
  [Design repository](https://github.com/ryancor/tt02-submission-template),
  [design license](https://github.com/ryancor/tt02-submission-template/blob/main/LICENSE):
  Apache License 2.0. The upstream description identifies the ALU; the prototype
  displays physical geometry, not a simulated netlist of this ALU.
- **Pinned fabrication-layout artifact:**
  [TinyTapeout/tinytapeout-02, commit 90098b825ac7e1bf1a97555da7a55bf656491ef3](https://github.com/TinyTapeout/tinytapeout-02/tree/90098b825ac7e1bf1a97555da7a55bf656491ef3),
  `gds/alu_top.gds.gz`.
  [License at that revision](https://github.com/TinyTapeout/tinytapeout-02/blob/90098b825ac7e1bf1a97555da7a55bf656491ef3/LICENSE)
  begins “Apache License / Version 2.0, January 2004”.
  Original retained at `data/alu_top.gds.gz`; decoded SHA-256:
  `7db89b760cd058e125290989f529363c93a56c85c40645f51947a5c9ccf1a2f7`.
- **Foundry standard cells:** SkyWater / Google,
  [sky130_fd_sc_hd](https://github.com/google/skywater-pdk-libs-sky130_fd_sc_hd),
  [Apache-2.0 license](https://github.com/google/skywater-pdk-libs-sky130_fd_sc_hd/blob/main/LICENSE).
  The artifact also contains Efabless `sky130_ef_sc_hd__decap_12`, distributed in
  [open-pdks custom cells](https://github.com/fossi-foundation/open-pdks/tree/main/sky130/custom/sky130_fd_sc_hd),
  under [Apache-2.0](https://github.com/fossi-foundation/open-pdks/blob/main/LICENSE).
- Complete Apache terms accompany these files in `data/LICENSE-APACHE-2.0.txt`.
  Author acknowledgments and transformation notice are in `data/NOTICE.md`.

### Extraction and transformations

`tools/extract-layout.py` reads the original GDS with **gdstk 0.9.61**, flattens
references without inventing routes, and exports selected drawing masks in
integer nanometres to `data/alu-layout.json.gz`. `data/manifest.json` records
units, bounds, polygon counts, source commit and checksum. Rebuild with:

```sh
python -m pip install gdstk==0.9.61
python src/components/experiences/worlds/chip-zoom/tools/extract-layout.py
```

gdstk is an offline conversion tool only; its code is neither vendored nor shipped
to the browser. [Upstream license](https://github.com/heitzmann/gdstk/blob/main/LICENSE)
is **Boost Software License 1.0**, not MIT. Browser triangulation uses the existing
Three.js dependency (MIT); runtime decompression uses existing fflate (MIT).

The source macro bounds are **150 × 170 μm**. This is a macro on the shared
Tiny Tapeout chip, not the entire die, and not the chip in a modern smartphone.
The selected placed inverter is `sky130_fd_sc_hd__inv_2`, with all selected masks
in the bounding box `[67.430,105.840]–[69.190,109.040] μm`. Its **1.76 × 3.20 μm**
display dimensions include mask extensions; they are not a transistor pitch or
the standard-cell placement-site dimensions. Its poly and active geometry are
from the same GDS, including the original reference transform.

### Layer mapping and display

[Official SKY130 GDS layer reference](https://skywater-pdk.readthedocs.io/en/main/rules/layers.html),
[official process stack](https://skywater-pdk.readthedocs.io/en/main/rules/assumptions.html#process-stack-diagram).

| Display | GDS layer:datatype | Meaning |
| --- | --- | --- |
| nwell | 64:20 | N-well |
| diff | 65:20 | Active area |
| poly | 66:20 | Polysilicon |
| licon | 66:44 | Contact to local interconnect |
| LI | 67:20 | Local interconnect |
| mcon | 67:44 | LI–M1 contact |
| M1 / v1 | 68:20 / 68:44 | Metal 1 / via to M2 |
| M2 / v2 | 69:20 / 69:44 | Metal 2 / via to M3 |
| M3 / v3 | 70:20 / 70:44 | Metal 3 / via to M4 |
| M4 | 71:20 | Metal 4 |

SKY130 supports five metal layers plus local interconnect, but **this macro has
no M5 geometry**. The five peel operations are M4, M3, M2, M1, LI. A via leaves
with its upper conductor. Actual contacts are included, not random decorations.

XY shapes and their relative placement are retained. Z thickness and spacing are
greatly exaggerated for inspection; they do not reproduce the process stack
dimensions. Mask colors are false color. Insulating media, implants, taps,
text, pin annotations and verification masks are omitted. The model is not a
manufacturing cross-section or a validated electrical extraction.

## Planar NMOS teaching model

[SKY130 device documentation](https://skywater-pdk.readthedocs.io/en/main/rules/device-details.html)
provides the planar 1.8 V device context. FinFET / GAA is intentionally not
substituted for SKY130 planar geometry.

For the causal model, see the physical equations in
[TU Graz — MOSFET gradual-channel approximation](https://lampz.tugraz.at/~hadley/psd/L10/gradualchannelapprox.php),
and [MIT 6.012 — gradual-channel approximation](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-fall-2009/resources/mit6_012f09_lec11_gradual/).
Only the scientific relationships are used. No lecture image, slide, prose or
code is copied into the product; these reference materials are not licensed
product assets.

The body is assumed tied to source. For `u = max(VGS − VT, 0)`:

- `I / β = u VDS − VDS² / 2` for `0 ≤ VDS < u`;
- `I / β = u² / 2` for `VDS ≥ u`;
- zero current in this idealized model if `u = 0` or `VDS = 0`.

`VT = 0.65 V` is an **illustrative parameter**, not an extracted SKY130 threshold.
Both voltage inputs are bounded to 0–1.8 V. Current is normalized to the value at
VGS = VDS = 1.8 V and reported as a percentage, never as measured amperes.
Leakage, subthreshold conduction, body effect, capacitance, mobility degradation,
velocity saturation and channel-length modulation are omitted. The visual
channel is binary for readability and does not model pinch-off geometry.

White particles represent electrons drifting from source to positive drain;
conventional current runs in the opposite direction. Their speed and size are
illustrative. The insulating layer separates the gate from the channel: the
gate's electric field changes the channel, rather than electrons passing from
the gate through the oxide. The cutaway is original geometry, not a SEM image.

## Scope

Phone, package, SoC floorplan, logic-gate assembly, numeric adder and atomic-scale
views are not yet implemented. No unsourced modern SoC area percentages or
node-name-to-transistor-size conversions are used. The explicit model notes
separate a historical open process from future modern-chip schematics.
