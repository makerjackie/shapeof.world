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

## Round 2: scale journey, modern structures, logic and atoms

All new models and circuit code are authored for this project. No external
photos, slide illustrations, brand marks or meshes are shipped.

### Continuous scales and original schematics

The phone (150 × 72 mm), package (14 mm), and die/floorplan (8 mm) are chosen
illustrative dimensions, not a manufacturer's product or measured area ratios.
CPU, GPU, cache and NPU blocks explain roles, not their market-specific layout.
A persistent sample-change message separates these schematics from the real
150 × 170 μm Tiny Tapeout macro. The scale ladder and pinch, wheel and slider
all change the logarithm of the horizontal orthographic field in metres.
Adjacent scenes change size continuously and crossfade. The macro-to-cell
anchor uses the actual inverter's GDS centre. All Z dimensions and schematic
sizes remain illustrative. The transistor view's scale bar says schematic field;
it is not a metrology view of any of the three transistor shapes.

### Aluminium and modern transistor shapes

[Tim Edwards, Introduction to the SkyWater PDK (2021)](https://isn.ucsd.edu/courses/beng207/lectures/Tim_Edwards_2021_slides.pdf)
identifies the SKY130 routing stack as five layers of aluminium. This macro still
contains only M1–M4. The renderer uses silvery reflective material with subtle
false-color tint. A procedural Three.js RoomEnvironment supplies reflections;
no environment image is downloaded. Via geometry remains from the source GDS.

[imec: A view on the logic technology roadmap](https://www.imec-int.com/en/articles/view-logic-technology-roadmap)
describes three-sided electrostatic control in FinFETs and gate-all-around control
of suspended sheets. Our planar, fin and nanosheet models are independent,
non-proportional cutaways. A translucent front portion reveals the wrapped
channel. The same teaching current model is used in all three to isolate the
causal experiment; it does **not** predict or compare process performance.

[Intel, Mark Bohr, 14 nm Process Technology (2014)](https://www.intel.com/content/dam/www/public/us/en/documents/technology-briefs/bohr-14nm-idf-2014-brief.pdf),
PDF pages 11, 14 and 17: fin width 8 nm, transistor gate pitch 70 nm, fin height
42 nm. These are a specific published example, not universal FinFET dimensions,
and not SKY130 values. Only factual dimensions are cited. No Intel image, slide,
logo or code is reproduced. GAA is shown structurally without invented process
dimensions.

### Hair comparison

[NASA/JPL-Caltech: Orion microchip at 500X](https://science.nasa.gov/resource/orion-microchip-at-500x-magnification/)
uses roughly 100 μm for a hair diameter. The UI computes
`100,000 nm / 70 nm = 1,428.57` and says about 1,400 **gate pitches**. Gate pitch
includes spacing; it is not a complete device width, a universal hair diameter,
or the pitch of this SKY130 layout. The hair graphic and pitch marks are original
schematics. No NASA image is used.

### Teaching netlist

The actual [pinned ALU RTL](https://github.com/TinyTapeout/tinytapeout-02/blob/90098b825ac7e1bf1a97555da7a55bf656491ef3/verilog/rtl/007_alu_top.v)
and [gate netlist](https://github.com/TinyTapeout/tinytapeout-02/blob/90098b825ac7e1bf1a97555da7a55bf656491ef3/verilog/gl/alu_top.v)
were inspected under the same pinned Apache-2.0 license. The wrapper takes
**two-bit operands**, A from io_in[7:6], B from io_in[5:4], and a four-bit operation
selector. It is not the required four-bit input adder. No part of that netlist is
copied into the browser and no GDS route is falsely colored as a verified signal.

`logic-model.ts` is an original 36-NAND Boolean network: nine NAND gates per
full-adder bit, with two four-NAND XOR networks and one final carry NAND.
C0 is zero for four-bit addition; the one-bit lesson exposes C0 as an input.
The fifth output bit preserves overflow (15 + 15 = 30). All 256 four-bit input
pairs and all eight one-bit input triples are tested. Gate depth determines
when a value is revealed. The animation's ticks are a teaching topological order,
not real gate delays, transient voltages or a timing-accurate CMOS simulation.
The inverter and NAND lessons show ideal PMOS/NMOS on/off states; no analogue
cross-conduction or dynamic power is modeled.

### Diamond-cubic silicon

[NIST 2022 CODATA complete listing](https://physics.nist.gov/cuu/Constants/Table/allascii.txt)
gives the silicon lattice parameter `5.431020511 × 10^-10 m`; the display rounds
to **0.543 nm**. The generated positions use the diamond-cubic basis: an FCC
lattice plus the (1/4, 1/4, 1/4) offset. Nearest neighbours are separated by
`sqrt(3) a / 4`, approximately 0.235 nm. Interior atoms have four neighbours;
a finite cropped surface has fewer. Sphere radii, bond cylinders and colors are
visual symbols, not measured atomic boundaries, electron orbitals or bonds as
physical rods. Nothing is presented as quantum simulation.
