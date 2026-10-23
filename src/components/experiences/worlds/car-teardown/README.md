# Car teardown

Original procedural FR sedan; no downloaded models or textures. Coordinates are front +X, up +Y, right +Z. All physical and construction dimensions live in `vehicle-spec.ts`; `SOURCES.md` distinguishes representative values from physical laws.

- `model.ts`: pure four-stroke kinematics, timing and transmission ratios. Angles are degrees; the visual crank advances by `rpm / slowdown`.
- `body-geometry.ts`, `engine-geometry.ts`, `gear-geometry.ts`: generated geometry. Body wheel-arch clipping is duplicated in the depth material. Cam profiles and valve followers use the same lift law.
- `Body.tsx`, `Wheels.tsx`, `Engine.tsx`, `Systems.tsx`: material and assembly components. Named parts use `userData.partId`, including ancestor groups for multi-mesh assemblies.
- `parts.ts`: bilingual registry and staggered system transforms. Counts represent registered parts/assemblies, not triangles or every fastener. Body panels currently share one loft.
- `Scene.tsx`: studio, camera, picking and isolation. Keep the postprocessing subtree stable during slider updates. Tone mapping belongs in the composer, which disables the renderer's tone mapper.
- `brake-material.ts`: local guard for Three r183's anisotropic BRDF visibility denominator. Missing this guard produced non-finite HDR pixels at grazing angles; bloom spread them into black tiles or whole frames, despite no WebGL errors. A/B captures isolated the brake discs and verified the guard with all effects and mipmap bloom enabled. Do not work around this by removing AO/ghost systems or by modifying global Three shaders. Recheck after a Three upgrade.
- `Instruments.tsx`: projected SVG labels and 720-degree timing chart. Mobile controls scroll inside a collapsible drawer; every system also remains accessible through the system selector. Scrubbing must synchronously freeze `pausedRef` before assigning the shared angle: React DOM and r3f are separate roots, so state alone allows one extra frame.

Run `pnpm exec vitest run src/components/experiences/worlds/car-teardown` and `pnpm typecheck`. The tests include actual mesh raycasts for cylinder bores and inclined cam/follower contact, in addition to model invariants.
