# Periodic three-body initial conditions

Numerical initial conditions in this folder are scientific facts transcribed
from the authors' arXiv source files. The visualization, integrator, and
interface are original to Shape of the World. No code, figures, or movies from
the source papers or from https://github.com/sjtu-liao/three-body are copied.

## equal-mass-695.json

695 families of planar, equal-mass, zero-angular-momentum, collisionless
periodic orbits in the isosceles collinear configuration.

- Xiaoming Li and Shijun Liao, “More than six hundred new families of
  Newtonian periodic planar collisionless three-body orbits”,
  *Science China Physics, Mechanics & Astronomy* **60**, 129511 (2017).
- doi:10.1007/s11433-017-9078-5
- arXiv:1705.00527v4 (source file `3-body-14.tex`, supplementary tables
  S.XVII–XXX: velocities after scaling initial positions to
  `(-1,0)`, `(1,0)`, `(0,0)`).

## unequal-mass-1349.json

1349 families of planar periodic orbits with `m1 = m2 = 1` and `m3 ≠ 1`,
zero angular momentum, same collinear configuration.

- Xiaoming Li, Yipeng Jing, and Shijun Liao, “Over a thousand new periodic
  orbits of a planar three-body system with unequal masses”,
  *Publications of the Astronomical Society of Japan* **70**, 64 (2018).
- doi:10.1093/pasj/psy057
- arXiv:1709.04775 (source file `3-body-unequal-mass-3.tex`, supplementary
  initial-condition tables).

## spatial-orbits.json

Curated 2,416 three-dimensional periodic orbits from the 10,059 reported in
2025: every linearly stable orbit, every “piano-trio” orbit, and the shortest
orbits of each mass. Paper is CC BY 4.0; numbers are scientific facts.

- Xiaoming Li and Shijun Liao, “Discovery of 10,059 new three-dimensional
  periodic orbits of general three-body problem”, arXiv:2508.08568 (2025).
- Initial configuration: r1=(-1,0,0), r2=(1,0,0), r3=(0,0,z0);
  v1=(vx,vy,vz), v2=(vx,vy,-vz), v3=(-2 vx/m3, -2 vy/m3, 0).

## Named historical and Šuvakov orbits

Euler (1767) and Lagrange (1772) solutions are constructed from the classical
rigid configurations, not from the Li–Liao tables. Figure-eight, butterfly,
moth, dragonfly, yarn, goggles, bumblebee, and yin-yang labels follow
Šuvakov & Dmitrašinović, *Phys. Rev. Lett.* **110**, 114301 (2013),
arXiv:1303.0181, Table I, cross-checked against Li–Liao family numbers.
