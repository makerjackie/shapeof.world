# The Mala Tokmachka - Robotyne field in Blender: Copernicus DEM (80 m) under a Sentinel-2 image (10 m, 2023-06-05),
# OSM tree belts grown as 3D trees near the camera, a detailed patch where the column stopped on 8 June 2023, the
# defence lines (示意, after RUSI/CSIS descriptions and the imagery) as glowing overlays, smoke on the horizon.
# Local frame: metres east (x) / north (y) of 47.42N 35.86E, as in src/geo.ts.
# usage: blender -b -P blender/battlefield.py -- --shot N --mode still|anim --frame F --out path
import json
import math
import os
import re
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import L, N  # noqa: E402

ARGS = lib.args()
ROOT = lib.ROOT
rs = np.random.RandomState(4)
lib.reset()
sc = bpy.context.scene
EXAG = float(ARGS.get("exag", 1.6))

# ---------------------------------------------------------------- data
FX0, FX1, FY0, FY1 = -20000, 20000, -22000, 22000
DEM = np.fromfile(os.path.join(ROOT, "public", "dem80.f32"), dtype=np.float32).reshape(550, 500)  # row 0 = north
GEO = open(os.path.join(ROOT, "src", "geo.ts")).read()


def geo_line(name):
    m = re.search(rf"export const {name} = line\((\[\[.*?\]\])\);", GEO, re.S)
    return np.array(json.loads(m.group(1)), float) * 1000


TRENCH_1 = geo_line("TRENCH_1")
MINE_BELT = geo_line("MINE_BELT")
MAIN_LINE = geo_line("MAIN_LINE")
THIRD_LINE = geo_line("THIRD_LINE")
FIELD = json.load(open(os.path.join(ROOT, "src", "data", "field.json")))


def dem_h(x, y):
    """Bilinear DEM height (m, before exaggeration) at local x, y (arrays)."""
    u = (np.asarray(x) - FX0) / (FX1 - FX0) * 500 - 0.5
    v = (FY1 - np.asarray(y)) / (FY1 - FY0) * 550 - 0.5
    u = np.clip(u, 0, 498.999)
    v = np.clip(v, 0, 548.999)
    i0 = np.floor(v).astype(int)
    j0 = np.floor(u).astype(int)
    fu = u - j0
    fv = v - i0
    a = DEM[i0, j0]
    b = DEM[i0, j0 + 1]
    c = DEM[i0 + 1, j0]
    d = DEM[i0 + 1, j0 + 1]
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv


H0 = float(dem_h(1000, 7300))  # heights are relative to the column's spot


def H(x, y):
    return (dem_h(x, y) - H0) * EXAG


def line_y(Lp, x):
    for i in range(len(Lp) - 1):
        if Lp[i][0] <= x <= Lp[i + 1][0]:
            t = (x - Lp[i][0]) / (Lp[i + 1][0] - Lp[i][0])
            return Lp[i][1] + t * (Lp[i + 1][1] - Lp[i][1])
    return Lp[-1][1]


# the column: lead vehicles stopped in the minefield south of Mala Tokmachka
CX, CY = 1000.0, 7240.0

# ---------------------------------------------------------------- global terrain (whole field) with the satellite image
xs = np.linspace(FX0, FX1, 501)
ys = np.linspace(FY0, FY1, 551)
X, Y = np.meshgrid(xs, ys)
Z = H(X, Y)
# leave room for the detailed patch
PATCH = 900.0
inpatch = (np.abs(X - CX) < PATCH - 60) & (np.abs(Y - CY) < PATCH - 60)
Z = np.where(inpatch, Z - 3.0, Z)
glob = lib.grid_mesh("terrain", X, Y, Z)
uv = glob.data.uv_layers.new(name="UV")
uvs = np.stack([(X.ravel() - FX0) / (FX1 - FX0), (Y.ravel() - FY0) / (FY1 - FY0)], 1)
loops = np.empty(len(glob.data.loops), np.int32)
glob.data.loops.foreach_get("vertex_index", loops)
uv.data.foreach_set("uv", uvs[loops].ravel().astype(np.float32))

SAT = bpy.data.images.load(os.path.join(ROOT, "public", "s2-2023-06-05.jpg"))


def sat_material(name, detail=None):
    m, nt, bsdf, out = lib.new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord")
    # UV from object position so the patch and the field share it
    sep = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, tc.outputs["Object"], sep.inputs[0])
    u = lib.math_(nt, "DIVIDE", lib.math_(nt, "SUBTRACT", sep.outputs[0], FX0), FX1 - FX0)
    v = lib.math_(nt, "DIVIDE", lib.math_(nt, "SUBTRACT", sep.outputs[1], FY0), FY1 - FY0)
    cmb = N(nt, "ShaderNodeCombineXYZ")
    L(nt, u, cmb.inputs[0])
    L(nt, v, cmb.inputs[1])
    t = N(nt, "ShaderNodeTexImage", interpolation="Cubic", extension="EXTEND")
    t.image = SAT
    L(nt, cmb.outputs[0], t.inputs["Vector"])
    hs = N(nt, "ShaderNodeHueSaturation")
    hs.inputs["Saturation"].default_value = 0.85
    hs.inputs["Value"].default_value = 0.95
    L(nt, t.outputs["Color"], hs.inputs["Color"])
    bc = N(nt, "ShaderNodeBrightContrast")
    bc.inputs["Contrast"].default_value = 0.12
    L(nt, hs.outputs[0], bc.inputs["Color"])
    col = bc.outputs[0]
    # a little ground texture so it does not look like a printed photo when lower
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.08
    nz.inputs["Detail"].default_value = 8
    L(nt, tc.outputs["Object"], nz.inputs["Vector"])
    col = lib.mixc(nt, lib.math_(nt, "MULTIPLY", nz.outputs["Fac"], 0.18), col, (0.05, 0.04, 0.03, 1))
    if detail:
        col = detail(nt, tc, col)
    L(nt, col, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.92
    return m


glob.data.materials.append(sat_material("sat"))

# ---------------------------------------------------------------- detailed patch around the column (2 m grid)
px = np.arange(CX - PATCH, CX + PATCH + 1e-6, 2.0)
py = np.arange(CY - PATCH, CY + PATCH + 1e-6, 2.0)
PX, PY = np.meshgrid(px, py)
PZ = H(PX, PY) + 0.25 * lib.fbm(PX, PY, 30, 3, 1) + 0.04 * lib.fbm(PX, PY, 3, 3, 2)
# craters: dense in the minefield and along the column's path, sparse elsewhere
crat = np.zeros_like(PX)
cr_list = []
for k in range(900):
    if k < 520:
        x = CX + rs.normal(0, 120)
        y = line_y(MINE_BELT, x) + rs.uniform(0, 520)
    else:
        x = rs.uniform(CX - PATCH, CX + PATCH)
        y = rs.uniform(CY - PATCH, CY + PATCH)
    r = rs.uniform(1.0, 3.2) if rs.rand() < 0.85 else rs.uniform(4, 7)
    cr_list.append((x, y, r))
bowl = np.zeros_like(PX)
rim = np.zeros_like(PX)
for x, y, r in cr_list:
    sel = (np.abs(PX - x) < r * 2.6) & (np.abs(PY - y) < r * 2.6)
    dx, dy = PX[sel] - x, PY[sel] - y
    th = np.arctan2(dy, dx)
    f1, f2 = rs.uniform(0, 6.28, 2)
    de = np.hypot(dx, dy) / (r * (1 + 0.22 * np.sin(3 * th + f1) + 0.12 * np.sin(5 * th + f2)))
    crat[sel] += np.where(de < 1, -0.4 * r * (1 - de**2), 0.1 * r * np.exp(-(((de - 1.1) / 0.35) ** 2)))
    bowl[sel] = np.maximum(bowl[sel], np.clip(1.15 - de, 0, 1))
    rim[sel] = np.maximum(rim[sel], np.exp(-(((de - 1.35) / 0.55) ** 2)) * (0.55 + 0.45 * np.sin(7 * th + f2)))
PZ = PZ + crat
patch = lib.grid_mesh("patch", PX, PY, PZ)
me = patch.data
cm = np.clip(bowl * 2, 0, 1)
for nm_, arr in (("crater", bowl), ("rim", rim)):
    a = me.attributes.new(nm_, "FLOAT", "POINT")
    a.data.foreach_set("value", np.clip(arr, 0, 1).ravel().astype(np.float32))
# the lane: plough furrows and track marks from the north edge down to the column
lane = np.exp(-(((PX - CX) / 5.0) ** 2)) * (PY > CY - 6) * (PY < CY + PATCH)
a = me.attributes.new("lane", "FLOAT", "POINT")
a.data.foreach_set("value", lane.ravel().astype(np.float32))
edge = np.clip(np.minimum(np.minimum(PX - (CX - PATCH), (CX + PATCH) - PX), np.minimum(PY - (CY - PATCH), (CY + PATCH) - PY)) / 150, 0, 1)
a = me.attributes.new("edge", "FLOAT", "POINT")
a.data.foreach_set("value", edge.ravel().astype(np.float32))


def patch_detail(nt, tc, col):
    co = tc.outputs["Object"]
    grass = lib.texset(nt, "aerial_grass_rock", 7.0, co)
    dirt = lib.texset(nt, "dirt_aerial_03", 6.0, co)
    mud = lib.texset(nt, "aerial_mud_1", 5.0, co, rot=math.pi / 2)
    cr = N(nt, "ShaderNodeAttribute", attribute_name="crater")
    rm = N(nt, "ShaderNodeAttribute", attribute_name="rim")
    ln = N(nt, "ShaderNodeAttribute", attribute_name="lane")
    ed = N(nt, "ShaderNodeAttribute", attribute_name="edge")
    # satellite colour carries the field pattern; the aerial grass texture adds the detail
    bw = N(nt, "ShaderNodeRGBToBW")
    L(nt, grass["diff"], bw.inputs[0])
    k = lib.maprange(nt, bw.outputs[0], 0.1, 0.6, 0.6, 1.45, smooth=False)
    tex = N(nt, "ShaderNodeVectorMath", operation="MULTIPLY")
    L(nt, col, tex.inputs[0])
    cmb = N(nt, "ShaderNodeCombineXYZ")
    for i in range(3):
        L(nt, k, cmb.inputs[i])
    L(nt, cmb.outputs[0], tex.inputs[1])
    det = lib.mixc(nt, 0.25, tex.outputs[0], grass["diff"])
    ej = lib.mixc(nt, 1.0, dirt["diff"], (0.8, 0.75, 0.7, 1))
    ej.node.blend_type = "MULTIPLY"
    det = lib.mixc(nt, lib.math_(nt, "MULTIPLY", rm.outputs["Fac"], 0.85), det, ej)
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.5
    L(nt, co, nz.inputs["Vector"])
    scorched = lib.mixc(nt, nz.outputs["Fac"], (0.018, 0.015, 0.012, 1), (0.05, 0.04, 0.03, 1))
    det = lib.mixc(nt, lib.maprange(nt, cr.outputs["Fac"], 0.05, 0.4), det, scorched)
    det = lib.mixc(nt, lib.math_(nt, "MULTIPLY", ln.outputs["Fac"], 0.9), det, mud["diff"])
    return lib.mixc(nt, ed.outputs["Fac"], col, det)


patch.data.materials.append(sat_material("sat_patch", patch_detail))


def Hp(x, y):
    """height on the patch (includes craters) by nearest sample"""
    i = int(np.clip(round((y - py[0]) / 2.0), 0, len(py) - 1))
    j = int(np.clip(round((x - px[0]) / 2.0), 0, len(px) - 1))
    return float(PZ[i, j])


# ---------------------------------------------------------------- trees: OSM woods and tree rows near the column
def low_tree(name, coll):
    """A light tree for the belts: a trunk with a few limbs and lumpy, noise-displaced crowns whose edges break up
    into leaf holes (dithered alpha), so the silhouette reads as foliage, not as balls."""
    import bmesh
    from mathutils import Matrix, Vector, noise

    R = np.random.RandomState(len(name) * 7 + 3)
    bm = bmesh.new()
    h = R.uniform(3.2, 4.5)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=0.2, radius2=0.09, depth=h, matrix=Matrix.Translation((0, 0, h / 2)))
    trunk_faces = len(bm.faces)
    for k in range(4):  # limbs
        ang = R.uniform(0, 6.28)
        tilt = R.uniform(0.5, 0.9)
        m = Matrix.Translation((0, 0, h * R.uniform(0.55, 0.85))) @ Matrix.Rotation(ang, 4, "Z") @ Matrix.Rotation(tilt, 4, "X") @ Matrix.Translation((0, 0, 0.9))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.07, radius2=0.03, depth=1.8, matrix=m)
    nt_faces = len(bm.faces)
    for k in range(7):
        c = Vector((R.uniform(-1.5, 1.5), R.uniform(-1.5, 1.5), R.uniform(h + 0.6, h + 2.6)))
        sc_ = Vector((R.uniform(1.3, 2.3), R.uniform(1.3, 2.3), R.uniform(1.0, 1.6)))
        ret = bmesh.ops.create_icosphere(bm, subdivisions=int(ARGS.get("crownsub", 2)), radius=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*sc_, 1)))
        for v in ret["verts"]:
            d = v.co - c
            n = noise.noise(v.co * 1.4 + Vector((k * 3.1, 0, 0))) * 0.55 + noise.noise(v.co * 4.0) * 0.18
            v.co = c + d * (1 + n)
    me_ = bpy.data.meshes.new(name)
    bm.to_mesh(me_)
    bm.free()
    for i, p in enumerate(me_.polygons):
        p.use_smooth = True
        p.material_index = 0 if i < nt_faces else 1
    o = bpy.data.objects.new(name, me_)
    coll.objects.link(o)
    bark_m = lib.simple_pbr("tbark", "bark_brown_02", 1.0, tint=(0.4, 0.37, 0.33), bump=0.6)
    tm, tnt, tb, tout = lib.new_mat(name + "_leaf")
    tcc = N(tnt, "ShaderNodeTexCoord")
    nz = N(tnt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 6.0
    nz.inputs["Detail"].default_value = 8
    L(tnt, tcc.outputs["Object"], nz.inputs["Vector"])
    vor = N(tnt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 14
    L(tnt, tcc.outputs["Object"], vor.inputs["Vector"])
    leaf = lib.mixc(tnt, nz.outputs["Fac"], (0.018, 0.03, 0.01, 1), (0.07, 0.095, 0.03, 1))
    L(tnt, leaf, tb.inputs["Base Color"])
    tb.inputs["Roughness"].default_value = 0.85
    # leaf holes near the silhouette
    lw = N(tnt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    edge = lw.outputs["Facing"]
    holes = lib.maprange(tnt, lib.math_(tnt, "ADD", vor.outputs["Distance"], lib.math_(tnt, "MULTIPLY", edge, 0.9)), 0.62, 0.7, 1, 0)
    L(tnt, holes, tb.inputs["Alpha"])
    bmp = N(tnt, "ShaderNodeBump")
    bmp.inputs["Strength"].default_value = 1.0
    L(tnt, vor.outputs["Distance"], bmp.inputs["Height"])
    L(tnt, bmp.outputs[0], tb.inputs["Normal"])
    tr = N(tnt, "ShaderNodeBsdfTranslucent")
    L(tnt, leaf, tr.inputs["Color"])
    mx = N(tnt, "ShaderNodeMixShader")
    mx.inputs[0].default_value = 0.25
    L(tnt, tb.outputs[0], mx.inputs[1])
    L(tnt, tr.outputs[0], mx.inputs[2])
    L(tnt, mx.outputs[0], tout.inputs["Surface"])
    tm.surface_render_method = "DITHERED"
    o.data.materials.append(bark_m)
    o.data.materials.append(tm)
    return o


TREES = lib.collection("tree_src")
for k in range(4):
    low_tree(f"tree{k}", TREES)
lib.hide_collection(TREES)
NEAR = lib.collection("tree_near")
for o in lib.ph_model("tree_small_02", NEAR):
    if o.type == "MESH":
        o.parent = None
        o.location = (0, 0, 0)
        o.scale = (2.2, 2.2, 2.4)
        bpy.context.view_layer.update()
        o.data.transform(o.matrix_basis)
        o.matrix_basis = __import__("mathutils").Matrix.Identity(4)
    elif o.type == "EMPTY":
        bpy.data.objects.remove(o)
lib.hide_collection(NEAR)
NEAR_R = float(ARGS.get("nearr", 0))
R_TREES = float(ARGS.get("treer", 1400))


def pip(poly, pts):
    """even-odd point in polygon"""
    x, y = pts[:, 0], pts[:, 1]
    inside = np.zeros(len(pts), bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        c = ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        inside ^= c
        j = i
    return inside
belt_pts = []
for ring in FIELD["woods"]:
    P = np.array(ring, float).reshape(-1, 2)
    if np.min(np.hypot(P[:, 0] - CX, P[:, 1] - CY)) > R_TREES:
        continue
    # fill the polygon with points (rejection sampling in its bbox)
    x0, y0 = P.min(0)
    x1, y1 = P.max(0)
    area = (x1 - x0) * (y1 - y0)
    n = int(area / 22)
    if n <= 0:
        continue
    cand = np.stack([rs.uniform(x0, x1, n), rs.uniform(y0, y1, n)], 1)
    belt_pts.append(cand[pip(P, cand)])
for row in FIELD["treeRows"]:
    P = np.array(row, float).reshape(-1, 2)
    if np.min(np.hypot(P[:, 0] - CX, P[:, 1] - CY)) > R_TREES:
        continue
    for i in range(len(P) - 1):
        a_, b_ = P[i], P[i + 1]
        n = int(np.linalg.norm(b_ - a_) / 5)
        t = np.linspace(0, 1, max(n, 1))
        belt_pts.append(a_ + (b_ - a_) * t[:, None] + rs.normal(0, 3, (len(t), 2)))
pts = np.concatenate(belt_pts) if belt_pts else np.zeros((0, 2))
pts = pts[np.hypot(pts[:, 0] - CX, pts[:, 1] - CY) < R_TREES]
pts = pts[~((np.abs(pts[:, 0] - CX) < 90) & (pts[:, 1] > CY - 120) & (pts[:, 1] < CY + 400))]
print("trees", len(pts))
# a point cloud mesh; geometry nodes put a random tree on each point
tz = np.array([Hp(x, y) if abs(x - CX) < PATCH and abs(y - CY) < PATCH else float(H(x, y)) for x, y in pts])
FOCUS = np.array([float(ARGS.get("fx", CX)), float(ARGS.get("fy", CY))])
near = np.hypot(pts[:, 0] - FOCUS[0], pts[:, 1] - FOCUS[1]) < NEAR_R


def tree_points(name, sel, coll_src, smin, smax):
    tm_ = bpy.data.meshes.new(name)
    tm_.from_pydata([(x, y, z) for (x, y), z in zip(pts[sel], tz[sel])], [], [])
    tpo = bpy.data.objects.new(name, tm_)
    sc.collection.objects.link(tpo)
    tpo.modifiers.new("trees", "NODES").node_group = tree_gn(name, coll_src, smin, smax)


def tree_gn(name, coll_src, smin, smax):
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = ng.nodes.new("NodeGroupInput")
    go = ng.nodes.new("NodeGroupOutput")
    m2p = ng.nodes.new("GeometryNodeMeshToPoints")
    ng.links.new(gi.outputs[0], m2p.inputs["Mesh"])
    ci = ng.nodes.new("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = coll_src
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    ip = ng.nodes.new("GeometryNodeInstanceOnPoints")
    ng.links.new(m2p.outputs[0], ip.inputs["Points"])
    ng.links.new(ci.outputs[0], ip.inputs["Instance"])
    ip.inputs["Pick Instance"].default_value = True
    rv = ng.nodes.new("FunctionNodeRandomValue")
    rv.data_type = "INT"
    rv.inputs["Max"].default_value = 99
    ng.links.new(rv.outputs[0], ip.inputs["Instance Index"])
    rz = ng.nodes.new("FunctionNodeRandomValue")
    rz.data_type = "FLOAT_VECTOR"
    rz.inputs["Min"].default_value = (0, 0, 0)
    rz.inputs["Max"].default_value = (0.08, 0.08, 6.28)
    e2r = ng.nodes.new("FunctionNodeEulerToRotation")
    ng.links.new(rz.outputs[0], e2r.inputs[0])
    ng.links.new(e2r.outputs[0], ip.inputs["Rotation"])
    rsz = ng.nodes.new("FunctionNodeRandomValue")
    rsz.data_type = "FLOAT"
    rsz.inputs["Min"].default_value = smin
    rsz.inputs["Max"].default_value = smax
    ng.links.new(rsz.outputs[0], ip.inputs["Scale"])
    ng.links.new(ip.outputs[0], go.inputs[0])
    return ng


tree_points('trees_far', ~near, TREES, 0.75, 1.35)
tree_points('trees_near', near, NEAR, 0.8, 1.25)


# ---------------------------------------------------------------- defence lines: glowing overlays (revealed per shot)
OVL = lib.collection("overlays")


def glow_mat(name, col, k=6.0, alpha=0.85):
    """glowing overlay; dithered alpha so the ground shows through"""
    m, nt, bsdf, out = lib.new_mat(name)
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Emission Color"].default_value = (*col, 1)
    bsdf.inputs["Emission Strength"].default_value = k
    bsdf.inputs["Alpha"].default_value = alpha
    m.surface_render_method = "DITHERED"
    return m


def ribbon(name, P, width, lift, mat, step=20.0):
    """a flat ribbon draped on the terrain along polyline P"""
    pts = []
    for i in range(len(P) - 1):
        a_, b_ = P[i], P[i + 1]
        n = max(1, int(np.linalg.norm(b_ - a_) / step))
        for k in range(n):
            pts.append(a_ + (b_ - a_) * k / n)
    pts.append(P[-1])
    pts = np.array(pts)
    V = []
    F = []
    for i, p in enumerate(pts):
        d = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        d /= np.linalg.norm(d) + 1e-9
        nrm = np.array([-d[1], d[0]])
        for s_ in (-1, 1):
            q = p + nrm * width / 2 * s_
            V.append((q[0], q[1], float(H(q[0], q[1])) + lift))
        if i:
            F.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    o = lib.mesh_from(name, np.array(V), np.array(F), OVL, smooth=False)
    o.data.materials.append(mat)
    return o


AMBER = (1.0, 0.55, 0.12)
ribbon("ovl_trench1", TRENCH_1, 12, 5, glow_mat("g_tr", AMBER, 3))
# the minefield: a translucent band 500 m deep north of the belt line
mb = []
for x in np.linspace(MINE_BELT[0][0], MINE_BELT[-1][0], 120):
    mb.append((x, line_y(MINE_BELT, x)))
mb = np.array(mb)
V, F = [], []
for i, (x, y) in enumerate(mb):
    for k, dy in enumerate((0, 520)):
        V.append((x, y + dy, float(H(x, y + dy)) + 4))
    if i:
        F.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
mf = lib.mesh_from("ovl_mines", np.array(V), np.array(F), OVL, smooth=False)
mm = glow_mat("g_mines", (1.0, 0.25, 0.08), 0.5, alpha=0.16)
mf.data.materials.append(mm)
ribbon("ovl_main", MAIN_LINE, 30, 8, glow_mat("g_main", AMBER, 3))
RED = (1.0, 0.16, 0.05)
ribbon("ovl_minesS", MINE_BELT, 7, 5, glow_mat("g_mS", RED, 3))
ribbon("ovl_minesN", MINE_BELT + np.array([0, 520]), 7, 5, glow_mat("g_mN", RED, 3))
ribbon("ovl_third", THIRD_LINE, 40, 8, glow_mat("g_third", AMBER, 4))

for o in OVL.objects:
    o.hide_render = o.name.replace("ovl_", "") not in ARGS.get("ovl", "").split(",")

# ---------------------------------------------------------------- smoke columns on the battlefield
def smoke(name, x, y, h=220.0, r=26.0, dark=0.6):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, float(H(x, y)) + h / 2), vertices=24)
    o = bpy.context.active_object
    o.name = name
    m, nt, bsdf, out = lib.new_mat(name)
    nt.nodes.remove(bsdf)
    v = N(nt, "ShaderNodeVolumePrincipled")
    tc = N(nt, "ShaderNodeTexCoord")
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.035
    nz.inputs["Detail"].default_value = 6
    nz.inputs["Distortion"].default_value = 0.6
    L(nt, tc.outputs["Object"], nz.inputs["Vector"])
    sep = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, tc.outputs["Object"], sep.inputs[0])
    # plume: narrow at the base, widening and thinning with height (object coords: cylinder radius 1, z -1..1)
    zz = lib.math_(nt, "MULTIPLY", lib.math_(nt, "ADD", sep.outputs[2], 1.0), 0.5)
    rr = lib.math_(nt, "SQRT", lib.math_(nt, "ADD", lib.math_(nt, "POWER", sep.outputs[0], 2.0), lib.math_(nt, "POWER", sep.outputs[1], 2.0)))
    width = lib.math_(nt, "ADD", 0.15, lib.math_(nt, "MULTIPLY", zz, 0.85))
    core = lib.maprange(nt, lib.math_(nt, "DIVIDE", rr, width), 1.0, 0.2)
    dens = lib.math_(nt, "MULTIPLY", core, lib.maprange(nt, nz.outputs["Fac"], 0.35, 0.75))
    dens = lib.math_(nt, "MULTIPLY", dens, lib.maprange(nt, zz, 1.0, 0.0))
    L(nt, lib.math_(nt, "MULTIPLY", dens, 0.08), v.inputs["Density"])
    v.inputs["Color"].default_value = (0.05 * (1 - dark) + 0.02, 0.045, 0.04, 1)
    L(nt, v.outputs[0], out.inputs["Volume"])
    o.data.materials.append(m)
    return o


if ARGS.get("shot", "A") in ("B", "high", "mid") and ARGS.get("hsmoke", "1") == "1":  # far plumes swamp near volumes
    for k, (sx, sy) in enumerate([(-1800, 5200), (3800, 6000), (-4200, 8600), (6200, 4300), (900, 3400), (-600, 7150)]):
        smoke(f"smoke{k}", sx, sy, rs.uniform(160, 300), rs.uniform(18, 34))

# ---------------------------------------------------------------- wheat around the ground-level cameras
import wheat  # noqa: E402

WC = wheat.source_collection()
WCX, WCY = float(ARGS.get("wx", CX + 15)), float(ARGS.get("wy", CY + 15))
ex = np.arange(WCX - 70, WCX + 70 + 1e-6, 0.5)
ey = np.arange(WCY - 85, WCY + 85 + 1e-6, 0.5)
EX, EY = np.meshgrid(ex, ey)
ii = np.clip(np.round((EY - py[0]) / 2.0).astype(int), 0, len(py) - 1)
jj = np.clip(np.round((EX - px[0]) / 2.0).astype(int), 0, len(px) - 1)
emit = lib.grid_mesh("wheat_emitter", EX, EY, PZ[ii, jj] - 0.02)
dens = np.clip(1.3 - np.hypot(EX - WCX, (EY - WCY) * 0.85) / 72, 0, 1) * (1 - np.clip(cm[ii, jj] * 1.5, 0, 1)) * (1 - np.clip(lane[ii, jj] * 1.6, 0, 1))
vg = emit.vertex_groups.new(name="wheat")
idx = np.nonzero(dens.ravel() > 0.03)[0]
w = dens.ravel()[idx]
for lo, hi in ((0, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1.01)):
    sel = idx[(w > lo) & (w <= hi)]
    if len(sel):
        vg.add(sel.tolist(), (lo + hi) / 2, "REPLACE")
lib.scatter(emit, WC, float(ARGS.get("wheatd", 45)), "wheat", seed=5, scale=(0.85, 1.12), tilt=0.08, name="wheat")

# ---------------------------------------------------------------- 样片E timeline (24 fps, global frames)
# A 1-84 ground, B 85-204 rise and reveal, C 205-276 drone above the lead tank, D 277-348 the stopped tank
SHOTS = {"A": (1, 84), "B": (85, 204), "C": (205, 276), "D": (277, 348)}
EXP = 245  # the mine under the lead tank's plough
V = 2.4  # m/s, a careful column
import vehicles  # noqa: E402


def lin(o, path):
    if o.animation_data and o.animation_data.action:
        for fc in lib.fcurves(o.animation_data.action, path):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


VC = lib.collection("column")
col = []
GAPS = [0, 26, 55, 82]
for k, dy in enumerate(GAPS):
    v = vehicles.leopard2a6(f"v{k}", VC, seed=k * 1.7, plough=k == 0, dust=0.12)
    x = CX + [0, 1.2, -0.8, 0.6][k]
    stop = EXP if k == 0 else EXP + 18 + 6 * k
    y_end = CY + dy - (0 if k == 0 else V * 0.4)
    y_start = y_end + V * (stop - 1) / 24
    v.rotation_euler = (0, 0, math.pi + [0, 0.03, -0.04, 0.02][k])
    for f, y in ((1, y_start), (stop, y_end)):
        v.location = (x, y, Hp(x, y))
        v.keyframe_insert("location", frame=f)
        vehicles.drive(v, y_start - y, f)
    for o in [v] + [bpy.data.objects[n] for n in v["spinners"]]:
        lin(o, "location")
        lin(o, "rotation_euler")
    for oname, mname, key in v["tracks"]:
        lin(bpy.data.objects[oname], f'modifiers["{mname}"].properties.inputs.{key}.value')
    col.append((v, stop))
LEAD = col[0][0]


# ---------------------------------------------------------------- volumes: dust behind the tanks, the blast, smoke
def vol_mat(name, colr, base_density, scale=1.2, emis=None, plume=False, ellip=False):
    m, nt, bsdf, out = lib.new_mat(name)
    nt.nodes.remove(bsdf)
    v = N(nt, "ShaderNodeVolumePrincipled")
    tc = N(nt, "ShaderNodeTexCoord")
    mp = N(nt, "ShaderNodeMapping")
    L(nt, tc.outputs["Object"], mp.inputs["Vector"])
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale * 3
    nz.inputs["Detail"].default_value = 7
    nz.inputs["Distortion"].default_value = 0.5
    L(nt, mp.outputs[0], nz.inputs["Vector"])
    sep = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, tc.outputs["Object"], sep.inputs[0])  # unit cube: -0.5..0.5
    if plume:  # narrow at the base, widening and leaning downwind with height, thinning at the top
        zz = lib.math_(nt, "ADD", sep.outputs[2], 0.5)
        xs_ = lib.math_(nt, "SUBTRACT", sep.outputs[0], lib.math_(nt, "MULTIPLY", zz, 0.12))
        rr = lib.math_(nt, "SQRT", lib.math_(nt, "ADD", lib.math_(nt, "POWER", xs_, 2.0), lib.math_(nt, "POWER", sep.outputs[1], 2.0)))
        rad = lib.math_(nt, "ADD", 0.075, lib.math_(nt, "MULTIPLY", zz, 0.2))
        shape = lib.maprange(nt, lib.math_(nt, "DIVIDE", rr, rad), 1.0, 0.25)
        shape = lib.math_(nt, "MULTIPLY", shape, lib.maprange(nt, zz, 1.0, 0.45))
    elif ellip:  # a soft ellipsoid, fuller at the bottom
        zq = lib.math_(nt, "MULTIPLY", lib.math_(nt, "ADD", sep.outputs[2], 0.1), 0.85)
        rr = lib.math_(nt, "SQRT", lib.math_(nt, "ADD", lib.math_(nt, "ADD", lib.math_(nt, "POWER", sep.outputs[0], 2.0), lib.math_(nt, "POWER", sep.outputs[1], 2.0)), lib.math_(nt, "POWER", zq, 2.0)))
        shape = lib.maprange(nt, rr, 0.48, 0.08)
    else:
        rr = lib.math_(nt, "SQRT", lib.math_(nt, "ADD", lib.math_(nt, "POWER", sep.outputs[0], 2.0), lib.math_(nt, "POWER", sep.outputs[1], 2.0)))
        shape = lib.maprange(nt, rr, 0.5, 0.15)
        shape = lib.math_(nt, "MULTIPLY", shape, lib.maprange(nt, sep.outputs[2], 0.5, 0.05))
    dens = lib.math_(nt, "MULTIPLY", shape, lib.maprange(nt, nz.outputs["Fac"], 0.38, 0.72))
    k = N(nt, "ShaderNodeValue")
    k.outputs[0].default_value = base_density
    k.label = "k"
    L(nt, lib.math_(nt, "MULTIPLY", dens, k.outputs[0]), v.inputs["Density"])
    v.inputs["Color"].default_value = (*colr, 1)
    if emis:
        e = N(nt, "ShaderNodeValue")
        e.outputs[0].default_value = 0.0
        e.label = "e"
        L(nt, lib.math_(nt, "MULTIPLY", dens, e.outputs[0]), v.inputs["Emission Strength"])
        v.inputs["Emission Color"].default_value = (*emis, 1)
    L(nt, v.outputs[0], out.inputs["Volume"])
    return m, mp, k


def key_val(node, value, frame):
    node.outputs[0].default_value = value
    node.outputs[0].keyframe_insert("default_value", frame=frame)


def vol_box(name, size, loc, mat, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o


# dust thrown up behind each moving tank (in the vehicle frame: behind = -Y)
for k, (v, stop) in enumerate(col):
    m, mp, kd = vol_mat(f"dust{k}", (0.32, 0.28, 0.22), 0.35, 0.9)
    vol_box(f"dust{k}", (5.0, 16.0, 4.5), (0, -11.5, 2.0), m, parent=v)
    mp.inputs["Location"].default_value = (0, 0, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=1)
    mp.inputs["Location"].default_value = (0.3, 2.5, -0.8)
    mp.inputs["Location"].keyframe_insert("default_value", frame=360)
    key_val(kd, 0.35, stop)
    key_val(kd, 0.0, stop + 36)

# the blast under the plough: flash, fireball, then a tall column of earth that drifts and thins
bx, by = CX, CY - 4.6
bz = Hp(bx, by)
fl = bpy.data.lights.new("flash", "POINT")
fl.color = (1.0, 0.6, 0.3)
fl.shadow_soft_size = 2.0
flo = bpy.data.objects.new("flash", fl)
sc.collection.objects.link(flo)
flo.location = (bx, by, bz + 2.0)
for f, e in ((EXP - 1, 0), (EXP, 3e6), (EXP + 2, 6e5), (EXP + 6, 0)):
    fl.energy = e
    fl.keyframe_insert("energy", frame=f)
m, mp, kd = vol_mat("fireball", (0.2, 0.12, 0.06), 2.0, 1.6, emis=(1.0, 0.45, 0.12))
fb = vol_box("fireball", (6, 6, 6), (bx, by, bz + 2.5), m)
en = [n for n in m.node_tree.nodes if n.label == "e"][0]
key_val(en, 0, EXP - 1)
key_val(en, 60, EXP)
key_val(en, 8, EXP + 4)
key_val(en, 0, EXP + 9)
key_val(kd, 0, EXP - 1)
key_val(kd, 2.0, EXP)
key_val(kd, 0, EXP + 10)
fb.scale = (0.3, 0.3, 0.3)
fb.keyframe_insert("scale", frame=EXP)
fb.scale = (1.4, 1.4, 1.6)
fb.keyframe_insert("scale", frame=EXP + 8)
m, mp, kd = vol_mat("earth", (0.07, 0.055, 0.04), 1.6, 0.8, ellip=ARGS.get("shot") == "D")
ea = vol_box("earth", (16, 16, 34), (bx, by, bz + 17), m)
key_val(kd, 0, EXP - 1)
key_val(kd, 1.6, EXP + 2)
if ARGS.get("shot") == "D":
    key_val(kd, 0.55, EXP + 30)
    key_val(kd, 0.12, EXP + 70)
    key_val(kd, 0.04, EXP + 100)
else:
    key_val(kd, 0.9, EXP + 30)
    key_val(kd, 0.25, EXP + 100)
ea.scale = (3, 3, 2)
ea.location = (bx, by, bz + 1)
ea.keyframe_insert("scale", frame=EXP)
ea.keyframe_insert("location", frame=EXP)
ea.scale = (14, 14, 30)
ea.location = (bx, by, bz + 13)
ea.keyframe_insert("scale", frame=EXP + 14)
ea.keyframe_insert("location", frame=EXP + 14)
ea.scale = (22, 22, 36)
ea.location = (bx + 6, by + 3, bz + 16)
ea.keyframe_insert("scale", frame=EXP + 100)
ea.keyframe_insert("location", frame=EXP + 100)
mp.inputs["Location"].default_value = (0, 0, 0)
mp.inputs["Location"].keyframe_insert("default_value", frame=EXP)
mp.inputs["Location"].default_value = (0.2, 0.1, -0.6)
mp.inputs["Location"].keyframe_insert("default_value", frame=EXP + 110)
# afterwards the lead tank smokes
m, mp, kd = vol_mat("tanksmoke", (0.03, 0.03, 0.028), 0.0, 1.4, plume=True)
ts = vol_box("tanksmoke", (26, 26, 42), (CX + 0.5, CY + 1.0, Hp(bx, CY) + 19.5), m)
key_val(kd, 0, EXP + 20)
key_val(kd, 1.6, EXP + 50)
mp.inputs["Location"].default_value = (0, 0, 0)
mp.inputs["Location"].keyframe_insert("default_value", frame=EXP)
mp.inputs["Location"].default_value = (0.1, 0.0, -1.2)
mp.inputs["Location"].keyframe_insert("default_value", frame=EXP + 110)

# ---------------------------------------------------------------- overlays fade in during shot B
def overlay_fade(name, f0, f1, k_on):
    o = bpy.data.objects.get("ovl_" + name)
    if not o:
        return
    o.hide_render = False
    mt = o.data.materials[0]
    bs = [n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED"][0]
    a_on = bs.inputs["Alpha"].default_value
    for f, val, al in ((f0, 0.0, 0.0), (f1, k_on, a_on)):
        bs.inputs["Emission Strength"].default_value = val
        bs.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)
        bs.inputs["Alpha"].default_value = al
        bs.inputs["Alpha"].keyframe_insert("default_value", frame=f)


B0 = SHOTS["B"][0]
OVL_ON = ARGS.get("shot", "A") == "B" and ARGS.get("ovl3d", "0") == "1"  # lines are drawn in Remotion now (linesB.json)
OVL_ON and overlay_fade("mines", B0 + 30, B0 + 48, 0.5)
OVL_ON and overlay_fade("minesS", B0 + 30, B0 + 48, 3)
OVL_ON and overlay_fade("minesN", B0 + 30, B0 + 48, 3)
OVL_ON and overlay_fade("trench1", B0 + 58, B0 + 76, 3)
OVL_ON and overlay_fade("main", B0 + 82, B0 + 100, 3)
for nm in ("third",):
    if bpy.data.objects.get("ovl_" + nm):
        bpy.data.objects["ovl_" + nm].hide_render = True

# ---------------------------------------------------------------- light, camera, render
lib.world_hdri(ARGS.get("hdri", "kloppenheim_06_puresky_4k.exr"), strength=float(ARGS.get("sky", 1.0)), rot=float(ARGS.get("rot", 2.4)))
if ARGS.get("shot", "A") in ("B", "high"):  # a big haze volume drowns the small ones (blast, smoke), so only here
    lib.fog_box(float(ARGS.get("fog", 0.00005)), (0.85, 0.8, 0.75), 0.6, size=(40000, 40000, 1200), loc=(CX, CY, 500))
lib.sun(angle_deg=float(ARGS.get("sunel", 9)), az_deg=float(ARGS.get("sunaz", 50)), strength=float(ARGS.get("sunk", 4.5)), col=(1.0, 0.75, 0.52), soft=1.0)
lib.render_settings(int(ARGS.get("w", 1920)), int(ARGS.get("h", 1080)), 24, int(ARGS.get("samples", 32)), exposure=float(ARGS.get("exp", 0.0)))
shot = ARGS.get("shot", "A")
sc.eevee.volumetric_end = 20000 if shot in ("B", "high") else 900
sc.eevee.volumetric_start = 0.5
sc.eevee.volumetric_tile_size = ARGS.get("voltile", "8" if shot == "B" else "4")
sc.eevee.volumetric_samples = int(ARGS.get("volsamples", 64))
try:
    sc.eevee.volumetric_sample_distribution = 0.9
except Exception:
    pass
gz = Hp(CX, CY)


def cam_keys(cam, keys, ease=True):
    """keys: [(frame, loc, target, lens)]"""
    for f, loc, tgt, lens in keys:
        cam.location = loc
        lib.look_at(cam, tgt)
        cam.data.lens = lens
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.keyframe_insert("lens", frame=f)


cam = lib.camera("cam", (0, 0, 0), (0, 1, 0), lens=32)
cam.data.clip_end = 60000
if shot == "A":
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 5.6
    cam.data.dof.focus_object = LEAD
    cam_keys(cam, [(1, (CX + 6, CY - 32, Hp(CX + 6, CY - 32) + 2.1), (CX + 0.5, CY + 30, gz + 2.0), 75), (84, (CX + 5.2, CY - 31, Hp(CX + 5.2, CY - 31) + 2.1), (CX + 0.4, CY + 26, gz + 2.0), 70)])
elif shot == "B":
    cam_keys(cam, [(85, (CX + 6, CY + 74, gz + 6), (CX, CY + 12, gz + 1), 30), (130, (CX + 30, CY + 230, gz + 90), (CX - 60, CY - 500, gz), 30), (204, (CX + 80, CY + 520, gz + 330), (CX - 150, CY - 1500, gz), 30)])
elif shot == "C":
    cam_keys(cam, [(205, (CX + 3, CY + 14, gz + 62), (CX, CY + 6, gz), 35), (276, (CX + 2.5, CY + 11, gz + 58), (CX, CY + 2, gz), 38)])
elif shot == "D":
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 4
    cam.data.dof.focus_object = LEAD
    from mathutils import Vector as _V

    lx, ly = CX, CY  # where the lead tank stopped (LEAD.location may hold its start)
    cam_keys(cam, [(277, (lx - 21, ly + 9, Hp(lx - 21, ly + 9) + 1.8), (lx, ly - 1, gz + 4.2), 35), (348, (lx - 18.6, ly + 8.0, Hp(lx - 18.6, ly + 8.0) + 1.8), (lx, ly - 1, gz + 4.6), 35)])
else:
    cam_keys(cam, [(1, (CX + 120, CY + 300, gz + 90), (CX, CY + 10, gz), 35)])
# camera shake: hand-held on the ground, a hard jolt for the drone at the blast
if cam.animation_data and cam.animation_data.action:
    for fc in lib.fcurves(cam.animation_data.action, "rotation_euler"):
        nm_ = fc.modifiers.new("NOISE")
        nm_.strength = {"A": 0.01, "B": 0.004, "C": 0.004, "D": 0.012}.get(shot, 0.004)
        nm_.scale = 22
        nm_.phase = fc.array_index * 9.1
sc.camera = cam
f0, f1 = SHOTS.get(shot, (1, 1))
sc.frame_start, sc.frame_end = f0, f1

# label anchors for Remotion (shot B): screen positions per frame
if shot == "B":
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector as _V

    anchors = {
        "mines": (CX - 120, line_y(MINE_BELT, CX - 120) + 90),
        "trench": (CX - 420, line_y(TRENCH_1, CX - 420)),
        "main": (CX - 1800, line_y(MAIN_LINE, CX - 1800)),
    }
    out = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        row = {}
        for k_, (x, y) in anchors.items():
            p = world_to_camera_view(sc, cam, _V((x, y, float(H(x, y)) + 5)))
            row[k_] = [round(p.x * 1920, 1), round((1 - p.y) * 1080, 1), int(p.z > 0)]
        out[f - f0] = row
    os.makedirs(os.path.join(ROOT, "public", "field"), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, "public", "field", "anchorsB.json"), "w"))

    # the defence lines as screen polylines per frame, drawn by Remotion (crisp colours, no re-render to restyle)
    def dense(P, step, x0, x1):
        P = np.asarray(P, float)
        pts = []
        for i in range(len(P) - 1):
            a_, b_ = P[i], P[i + 1]
            n = max(1, int(np.linalg.norm(b_ - a_) / step))
            for k in range(n):
                pts.append(a_ + (b_ - a_) * k / n)
        pts.append(P[-1])
        return [q for q in pts if x0 <= q[0] <= x1]

    LINES = {
        "trench": dense(TRENCH_1, 25, CX - 4000, CX + 4000),
        "minesS": dense(MINE_BELT, 25, CX - 4000, CX + 4000),
        "minesN": dense(np.asarray(MINE_BELT) + np.array([0, 520]), 25, CX - 4000, CX + 4000),
        "main": dense(MAIN_LINE, 80, CX - 16000, CX + 16000),
    }
    lo = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        row = {}
        for k_, pts in LINES.items():
            seq = []
            for q in pts:
                p = world_to_camera_view(sc, cam, _V((q[0], q[1], float(H(q[0], q[1])) + 2)))
                if p.z <= 1.0:
                    seq.append(None)
                else:
                    seq.append([int(np.clip(p.x * 1920, -9999, 9999)), int(np.clip((1 - p.y) * 1080, -9999, 9999))])
            row[k_] = seq
        lo[f - f0] = row
    json.dump(lo, open(os.path.join(ROOT, "public", "field", "linesB.json"), "w"), separators=(",", ":"))

# hand the scene to the three.js renderer (src/e3) instead of rendering it here
if ARGS.get("export3"):
    import export3_scene  # noqa: E402

    export3_scene.run(globals())

outp = ARGS.get("out", os.path.join(ROOT, "blender", "out", f"e_{shot}.jpg"))
os.makedirs(os.path.dirname(outp), exist_ok=True)
if ARGS.get("save"):
    bpy.ops.wm.save_as_mainfile(filepath=ARGS["save"])
if ARGS.get("mode", "still") == "still":
    sc.frame_set(int(ARGS.get("frame", (f0 + f1) // 2)))
    for nm_ in ("earth", "fireball", "tanksmoke", "dust0"):
        o_ = bpy.data.objects.get(nm_)
        if o_:
            kk = [n for n in o_.data.materials[0].node_tree.nodes if n.label == "k"]
            print("DBG", nm_, tuple(round(v, 1) for v in o_.matrix_world.translation), tuple(round(v, 1) for v in o_.scale), "k", round(kk[0].outputs[0].default_value, 2) if kk else None, "hide", o_.hide_render)
    print("DBG lead", tuple(round(v, 1) for v in LEAD.matrix_world.translation), "cam", tuple(round(v, 1) for v in sc.camera.matrix_world.translation))
    sc.render.filepath = outp
    bpy.ops.render.render(write_still=True)
elif ARGS.get("mode") == "anim":
    sc.render.filepath = outp
    bpy.ops.render.render(animation=True)
