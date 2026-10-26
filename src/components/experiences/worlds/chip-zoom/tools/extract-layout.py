"""Rebuild the displayed masks from the pinned GDS; pip install gdstk==0.9.61.

No invented routing. Coordinates are integer nanometres in the source XY plane.
Only drawing masks used in the presentation are selected; annotations, implant
and verification layers are not surfaces. The original GDS is retained beside
the output. Z positions are intentionally not encoded in this planar dataset.
"""
from pathlib import Path
import gzip
import hashlib
import json
import tempfile
import gdstk

DATA = Path(__file__).resolve().parents[1] / 'data'
source = (DATA / 'alu_top.gds.gz').read_bytes()
raw = gzip.decompress(source)
with tempfile.NamedTemporaryFile(suffix='.gds') as f:
    f.write(raw)
    f.flush()
    library = gdstk.read_gds(f.name)
top = next(c for c in library.top_level() if c.name == 'alu_top')
specs = {
    'nwell': (64, 20), 'diff': (65, 20), 'poly': (66, 20),
    'licon': (66, 44), 'li': (67, 20), 'mcon': (67, 44),
    'm1': (68, 20), 'v1': (68, 44), 'm2': (69, 20),
    'v2': (69, 44), 'm3': (70, 20), 'v3': (70, 44), 'm4': (71, 20),
}

def masks(cell):
    result = {}
    for name, (layer, datatype) in specs.items():
        polygons = cell.get_polygons(layer=layer, datatype=datatype)
        result[name] = [[int(round(float(v) * 1000)) for xy in p.points for v in xy] for p in polygons]
    return result

# A real placed inverter, including its orientation, rather than a repeated tile.
inverter = next(r for r in top.references if r.cell_name == 'sky130_fd_sc_hd__inv_2')
layout = {
    'schema': 1, 'unit': 'nm', 'name': top.name,
    'sourceCommit': '90098b825ac7e1bf1a97555da7a55bf656491ef3',
    'gdsSha256': hashlib.sha256(raw).hexdigest(),
    'bounds': [0, 0, 150000, 170000],
    'layers': masks(top),
    'cell': {'name': inverter.cell_name, 'bounds': [int(round(v * 1000)) for xy in inverter.bounding_box() for v in xy], 'layers': masks(inverter)},
}
encoded = json.dumps(layout, separators=(',', ':')).encode()
# mtime=0 makes subsequent exports byte-identical.
(DATA / 'alu-layout.json.gz').write_bytes(gzip.compress(encoded, mtime=0))
summary = {k: v for k, v in layout.items() if k not in ('layers', 'cell')}
summary['polygonCounts'] = {k: len(v) for k, v in layout['layers'].items()}
summary['cell'] = {k: v for k, v in layout['cell'].items() if k != 'layers'}
summary['jsonBytes'] = len(encoded)
summary['gzipBytes'] = (DATA / 'alu-layout.json.gz').stat().st_size
(DATA / 'manifest.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
