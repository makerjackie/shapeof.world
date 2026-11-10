# Membrane entry observatory

This is an original, generic educational illustration of an enveloped particle
crossing a membrane. It is **not a particular pathogen**, a molecular structure
viewer, an infection simulator or a laboratory model. All geometry, materials,
interface and prose are authored for this project. No protein-coordinate data,
third-party biological images or textbook figures are redistributed here.
Code follows the repository AGPL-3.0 license; original content follows LICENSING.md.

## References and use

- [Molecular Biology of the Cell: Cell Biology of Infection](https://www.ncbi.nlm.nih.gov/books/NBK26833/): high-level distinction between attachment, membrane crossing and release; surface versus endosomal fusion of enveloped particles.
- [Molecular Biology of the Cell: Membrane Transport and Compartmental Diversity](https://www.ncbi.nlm.nih.gov/books/NBK26859/): lipid bilayers, uptake and membrane-bounded compartments.
- [Entry of enveloped viruses into host cells: membrane fusion](https://pubmed.ncbi.nlm.nih.gov/23737062/): review supporting the two qualitative routes.

These sources establish the general mechanisms, not the shape, dimensions,
timing or success probability of the displayed particle. No copyrighted source
figures are copied; interface copy is an original, brief explanation.

## Geometry and display choices

The exhibition uses dimensionless model units. A particle radius of 1, two
lipid-head shells at 1 and 0.94, 1,100 sample positions per shell, 34 stylized
surface-protein clusters, 180 internal-protein beads and one coiled cargo chain
are **display choices**, not counts or dimensions measured from a specimen.
The flat membrane is a 64 by 40 grid with two head layers. Tails point inward;
the two aqueous sides remain outside the hydrophobic interior. These instances
make the bilayer readable and are not a density measurement or atomistic model.

Peeling removes a cap from visible components; exploded offsets deliberately
separate layers. False colours identify different structures, not microscopic
appearance. A translucent, cut-open vesicle exposes an otherwise hidden
compartment. Its shape changes are a geometric illustration, not a calculation
of membrane elasticity or protein activity. Background cytoplasmic structures
provide context without simulating infection, replication or synthesis.

## Progress, topology and limits

At 1×, one exhibition pass takes 70 wall-clock seconds. This is explicitly
**not biological time**. Progress maps through reversible, deterministic key
states using smooth interpolation. Scrubbing backward reproduces the same
structure. A resumed background tab caps each elapsed step, preventing a jump
across the entire presentation. Global and local pause freeze the progress.

Uptake is distinguished from access to the cytoplasm: a membrane still encloses
the vesicle contents. The simplified fusion connection and cargo movement
illustrate that distinction. Switching routes restarts the presentation, not a
virtual biological experiment. No specific sequences, affinities, kinetic
constants, infection predictions, optimization controls, drug predictions or
experimental procedures are provided. The display stops at entry and release;
subsequent events and routes differ substantially between viruses.

`model.test.ts` verifies bounded/finite display states, deterministic reverse
scrubbing, the separation between uptake and cytoplasmic access, cargo-release
ordering, elapsed-step limits and the position of structural instances. These
are choreography and geometry checks, not biological validation experiments.

## Readability and navigation

The membrane closeup uses a smaller, flat 22 by 16 display patch, rather than
enlarging the full journey's 64 by 40 grid. Two head layers and inward-pointing
paired stalks have deliberately enlarged separation for classroom visibility.
All dimensions, stalk counts, colour differences and roughness are original
display choices, not molecular measurements or resolved chemical structures.
The on-screen closeup explicitly labels this departure from molecular scale.
Journey bending and the surface opening still follow the existing choreography;
the closeup is a static structural illustration, not a magnified simulation.

The locate action is an exhibition bookmark. Membrane selection opens the
structural closeup; particle components open the cutaway. Vesicle location and
the inside view select the existing endosomal illustration at progress 0.5,
where the enclosure is visible and cargo has not reached the cytoplasm. The
interface states that this changes the displayed route/frame. These bookmarks
do not add biological conditions or change the underlying entry model.

Membrane instance matrices are updated when display progress or route changes,
instead of rewriting unchanged instances on every rendered frame while paused.
The new tests check display geometry and visibility of navigation destinations.
