# Inside an iPhone: references and model limits

Original procedural teaching model. Exterior dimensions refer to iPhone 13.
No Apple CAD, iFixit photographs, scanned meshes, product textures or third-party
artistic assets are included. Product names identify specification references;
no endorsement is implied. All visible geometry, materials, text textures and
charts are authored for this world.

## Device references

- [Apple specifications](https://support.apple.com/en-us/111872): 146.7 × 71.5 ×
  7.65 mm, 174 g; 6.1-inch OLED, 2532 × 1170, 460 ppi; A15 with 6 CPU, 4 GPU
  and 16 Neural Engine cores; Wide 12 MP f/1.6, Ultra Wide 12 MP f/2.4, 120°;
  sensor-shift OIS for the Wide camera.
- [Apple launch announcement](https://www.apple.com/newsroom/2021/09/apple-introduces-iphone-13-and-iphone-13-mini/):
  diagonal camera arrangement and core counts.

The frame uses 10 mm per scene unit. Interior layout, packages, screws, lenses,
connectors, layer thicknesses and exploded paths are teaching geometry. RAM is
separated to make its role inspectable, not to assert original package placement.
This is not a disassembly procedure, scan or repair guide.
Rear camera modules turn toward the viewer as the explosion opens, to expose
their optical faces. Their native assembled orientation faces the back glass.

## Six laboratories

1. Display: decode 8-bit sRGB to linear light with s/12.92 below 0.04045,
   otherwise ((s+0.055)/1.055)^2.4. Relative luminance Y=0.2126R+0.7152G+0.0722B.
   See [W3C CSS Color 4](https://www.w3.org/TR/css-color-4/#color-conversion-code).
   These standard sRGB/Rec.709 weights do not measure the actual P3 OLED panel.
   The 16×18 RGB-stripe grid is not the original subpixel arrangement. The 0.5 Hz
   scan illustrates 60 Hz at 1/120 speed, not the actual panel drive scheme.
   Touch markers are ray-cast positions, not a capacitance solver or firmware.
2. Silicon: published core counts; schematic block positions and areas. The
   independent eight-bit full adder calculates sum=A xor B xor carry and
   next carry=AB or carry(A xor B). All 65,536 input pairs are tested. It is
   not an A15 netlist, instruction trace, pipeline or transistor simulation.
3. Camera: ideal thin lens 1/f=1/u+1/v; chosen reference f=4.2 mm, fixed f/1.6.
   The focal length is not an original lens prescription. Circle of confusion
   c=(f/N)|v-s|/v at sensor distance s. Readouts use mm and controls use metres.
   Bench rays use compressed object/image scales and enlarge image-distance
   differences 30×. They are schematic rather than a numerical ray-trace;
   apparent sensor movement represents relative lens/sensor displacement.
   Original autofocus moves lens elements. The RGGB raster illustrates filtering,
   not a specific sensor die. [Sony CMOS technology](https://www.sony-semicon.com/en/technology/is/index.html)
   supports photodiodes and image sensing. No source images are reused.
   The original synthetic F target is inverted on the displayed image plane.
   A Gaussian blur visualises the computed circle of confusion using a chosen
   6 mm image width. This is an image-plane illustration, not sensor reconstruction
   firmware, a calibrated point-spread function, or a complete optical simulator.
4. Power: reference cell 12 Wh, not measured iPhone capacity. dSOC/dt=
   -Pcell/(12×3600). Chosen voltage 3.3+0.85SOC V. Teaching powers in watts:
   display=0.12+1.8 brightness; compute=0.18+2.5 load²; radio=0.08+0.95 load;
   other=0.22. A 20 W source uses chosen 90% conversion efficiency. Cell acceptance
   is 12 W below 80% charge and linearly tapers to zero at full charge. This is
   an illustrative CC/CV envelope, not Apple's controller. The internal optional
   lumped thermal state uses 0.09 ohm, 140 J/K, 5 K/W and 23°C; it does not
   predict device temperature or certify safety. Cell time advances at 60× playback.
   Ion/electron particles and layers are not physical counts, speeds or thicknesses.
   [DOE battery explanation](https://www.energy.gov/science/doe-explainsbatteries)
   supports external electrons, internal ions and reversal on charge.
5. Radio: ideal unfiltered BPSK, not the real 5G air interface. Bits flip phase
   by pi. [ITU-R P.525](https://www.itu.int/rec/R-REC-P.525/en) free-space loss:
   L=32.44+20log10(fMHz)+20log10(dkm) dB. Reference uplink: 23 dBm transmit,
   0 dBi device gain, 15 dBi base-station gain, 20 MHz bandwidth, 7 dB receiver
   noise figure and -174 dBm/Hz thermal-noise density (about 290 K).
   C=B log2(1+S/N) is a Shannon upper bound, not actual throughput. No blockage,
   interference, fading, matching, coding, duplexing overhead or scheduling.
   Waveform cycles, antenna sizes and expanding field rings are not to scale.
6. Haptics: steady-state m x''+c x'+k x=F cos(wt), with chosen reference m=2 g,
   f0=175 Hz, Q=6, k=m w0², c=m w0/Q. Amplitude=F/hypot(k-mw²,cw),
   phase=atan2(cw,k-mw²). These are not Taptic Engine measurements. Motion runs
   at 1/100 speed and displacement is enlarged 12×. The drive is steady sinusoidal,
   not a manufacturer's transient haptic waveform. Actuator geometry is schematic.

## Licenses

World source: repository AGPL-3.0-only; original public content: repository
content license. Existing dependencies Three.js, React, Fiber, Drei and Phosphor
Icons are MIT. No external HDRI, downloaded model, vendor texture, font or
restricted reference image is required. References supply facts and equations,
not copied artwork. Full source parameters live in model.ts and parts.ts.
