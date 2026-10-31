# A fire trench at the forward edge of a tree belt, Zaporizhzhia, early morning. 示意: the layout follows the
# pattern described by RUSI and visible in drone footage (zigzag fire trench, timber revetment, duckboards,
# a communication trench back to a dugout, camouflage netting, shattered tree line), not one surveyed position.
# usage: blender -b -P blender/trench.py -- --mode still|anim --shot N --out path
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import L, N  # noqa: E402

ARGS = lib.args()
rs = np.random.RandomState(7)

lib.reset()
sc = bpy.context.scene

# ---------------------------------------------------------------- trench traces
MAIN = np.array([(-26, 0.0), (-17, 1.0), (-8, -0.2), (-1, 0.9), (5, -0.1), (12, 1.1), (20, 0.0), (28, 0.8)], float)
COMM = np.array([(5, -0.1), (5.9, -3.8), (4.7, -7.6), (5.6, -11.0)], float)
D_MAIN, WB_MAIN, WT_MAIN = 1.85, 0.55, 0.66
D_COMM, WB_COMM, WT_COMM = 1.55, 0.40, 0.52


def poly_dist(P, X, Y):
    best = np.full(X.shape, 1e9)
    side = np.zeros(X.shape)
    along = np.zeros(X.shape)
    acc = 0.0
    for i in range(len(P) - 1):
        a, b = P[i], P[i + 1]
        ab = b - a
        L2 = ab @ ab
        t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / L2, 0, 1)
        qx = a[0] + ab[0] * t
        qy = a[1] + ab[1] * t
        d = np.hypot(X - qx, Y - qy)
        m = d < best
        best[m] = d[m]
        cr = ab[0] * (Y - a[1]) - ab[1] * (X - a[0])
        side[m] = np.sign(cr[m])
        along[m] = acc + t[m] * math.sqrt(L2)
        acc += math.sqrt(L2)
    return best, side, along


def centre_y(P, x):
    for i in range(len(P) - 1):
        if P[i][0] <= x <= P[i + 1][0]:
            t = (x - P[i][0]) / (P[i + 1][0] - P[i][0])
            return P[i][1] + t * (P[i + 1][1] - P[i][1])
    return P[-1][1]


def seg_at(P, x):
    for i in range(len(P) - 1):
        if P[i][0] <= x <= P[i + 1][0]:
            return i
    return len(P) - 2


# ---------------------------------------------------------------- terrain
STEP = 0.05
xs = np.arange(-22, 22 + 1e-6, STEP)
ys = np.arange(-14, 16 + 1e-6, STEP)
X, Y = np.meshgrid(xs, ys)
ground = 0.22 * lib.fbm(X, Y, 14, 3, 1) + 0.05 * lib.fbm(X, Y, 2.0, 3, 2) + 0.012 * lib.fbm(X, Y, 0.3, 2, 3)

dM, sM, _ = poly_dist(MAIN, X, Y)
dC, sC, _ = poly_dist(COMM, X, Y)
wob = 0.045 * lib.fbm(X, Y, 0.7, 3, 4)  # walls are hand-dug, not straight
dMe = dM + wob
dCe = dC + wob


def profile(d, D, wb, wt):
    z = np.zeros_like(d)
    floor = d < wb
    z[floor] = -D
    wall = (d >= wb) & (d < wt)
    t = (d[wall] - wb) / (wt - wb)
    z[wall] = -D * (1 - t) ** 0.9
    lip = (d >= wt) & (d < wt + 0.18)
    u = (d[lip] - wt) / 0.18
    z[lip] = -0.14 * (1 - u) ** 2
    return z


cutM = profile(dMe, D_MAIN, WB_MAIN, WT_MAIN)
cutC = profile(dCe, D_COMM, WB_COMM, WT_COMM)
clump = 1 + 0.45 * lib.fbm(X, Y, 0.6, 3, 5)
parapet = np.where(sM > 0, 0.48 * np.exp(-(((dM - 1.75) / 0.8) ** 2)), 0.24 * np.exp(-(((dM - 1.5) / 0.6) ** 2))) * clump
spoilC = 0.2 * np.exp(-(((dC - 1.15) / 0.5) ** 2)) * clump
berm = np.maximum(parapet * (dM > WT_MAIN), spoilC * (dC > WT_COMM))

craters = [(-10.5, 6.5, 2.3, 0.75), (8.5, 7.8, 1.7, 0.55), (-15, -6.5, 2.7, 0.85), (14, -5.5, 1.5, 0.45), (2.2, 4.6, 1.25, 0.4), (-4, 11, 3.0, 0.9)]
crat = np.zeros_like(X)
cmask = np.zeros_like(X)
for cx, cy, R, dep in craters:
    r = np.hypot(X - cx, Y - cy) * (1 + 0.12 * lib.fbm(X, Y, 1.0, 2, int(cx * 10) & 255))
    bowl = np.where(r < R, -dep * (1 - (r / R) ** 2), 0)
    rim = 0.22 * dep * np.exp(-(((r - R) / (0.4 * R)) ** 2))
    crat += bowl + rim
    cmask = np.maximum(cmask, np.clip(1.4 - r / R, 0, 1))

floor_noise = 0.035 * lib.fbm(X, Y, 1.5, 3, 6)
Z = ground + berm + crat
inside = np.minimum(cutM, cutC)
Z = np.where(inside < 0, np.minimum(Z, inside + ground * 0.15 + np.where(inside <= -1.5, floor_noise, 0)), Z)

terrain = lib.grid_mesh("terrain", X, Y, Z)
Xo, Yo = np.meshgrid(np.linspace(-400, 400, 161), np.linspace(-400, 400, 161))
Zo = np.where((np.abs(Xo) < 24) & (np.abs(Yo) < 16), -3.0, 0.22 * lib.fbm(Xo, Yo, 14, 3, 1) - 0.2)
outer = lib.grid_mesh("outer", Xo, Yo, Zo)
me = terrain.data


def attr(name, arr):
    a = me.attributes.new(name, "FLOAT", "POINT")
    a.data.foreach_set("value", arr.ravel().astype(np.float32))


d_in = np.minimum(dMe - WB_MAIN, dCe - WB_COMM)
attr("floor", np.clip(1 - (d_in + 0.06) / 0.08, 0, 1) * (Z < -1.2))
attr("wall", np.clip((Z < -0.08) * (d_in < 0.45) * 1.0 - np.clip(1 - (d_in + 0.06) / 0.08, 0, 1) * (Z < -1.2), 0, 1))
attr("spoil", np.clip(berm / 0.25, 0, 1) + np.clip(1 - (np.minimum(dM, dC) - 0.7) / 1.2, 0, 1) * (Z > -0.1))
attr("crater", cmask)
top = (Z > -0.12) & (np.minimum(dM, dC) > 0.78)
dens = np.clip(0.55 + 1.2 * lib.fbm(X, Y, 4, 3, 9), 0, 1) * top * (1 - np.clip(berm / 0.3, 0, 1)) * (1 - cmask)
vg = terrain.vertex_groups.new(name="grass")
idx = np.nonzero(dens.ravel() > 0.05)[0]
w = dens.ravel()[idx]
for val in (0.25, 0.5, 0.75, 1.0):
    sel = idx[(w > val - 0.25) & (w <= val)]
    if len(sel):
        vg.add(sel.tolist(), val, "REPLACE")

# ---------------------------------------------------------------- terrain material
m, nt, bsdf, out = lib.new_mat("ground")
tc = N(nt, "ShaderNodeTexCoord")
co = tc.outputs["Object"]
leaves = lib.texset(nt, "forest_leaves_02", 2.2, co)
grassT = lib.texset(nt, "dry_decay_leaves", 2.4, co)
mud = lib.texset(nt, "brown_mud_02", 2.0, co)
soilw = lib.texset(nt, "excavated_soil_wall", 1.6, co, blend=0.35)
floorT = lib.texset(nt, "muddy_tracks", 1.4, co)
burn = lib.texset(nt, "burned_ground_01", 3.0, co)


def A_(name):
    a = N(nt, "ShaderNodeAttribute", attribute_name=name)
    return a.outputs["Fac"]


nz = N(nt, "ShaderNodeTexNoise")
nz.inputs["Scale"].default_value = 0.35
nz.inputs["Detail"].default_value = 6
L(nt, co, nz.inputs["Vector"])
nzf = nz.outputs["Fac"]
topc = lib.mixc(nt, lib.maprange(nt, nzf, 0.42, 0.62), leaves["diff"], grassT["diff"])
topr = lib.mixf(nt, lib.maprange(nt, nzf, 0.42, 0.62), leaves["rough"], grassT["rough"])
toph = lib.mixf(nt, lib.maprange(nt, nzf, 0.42, 0.62), leaves["disp"], grassT["disp"])
spoil = lib.maprange(nt, lib.math_(nt, "ADD", A_("spoil"), lib.math_(nt, "SUBTRACT", nzf, 0.5)), 0.25, 0.75)
c1 = lib.mixc(nt, spoil, topc, mud["diff"])
r1 = lib.mixf(nt, spoil, topr, mud["rough"])
h1 = lib.mixf(nt, spoil, toph, mud["disp"])
crf = lib.maprange(nt, lib.math_(nt, "ADD", A_("crater"), lib.math_(nt, "SUBTRACT", nzf, 0.5)), 0.3, 0.7)
c1 = lib.mixc(nt, crf, c1, burn["diff"])
r1 = lib.mixf(nt, crf, r1, burn["rough"])
h1 = lib.mixf(nt, crf, h1, burn["disp"])
wl = A_("wall")
hs = N(nt, "ShaderNodeHueSaturation")
hs.inputs["Saturation"].default_value = 0.35
L(nt, soilw["diff"], hs.inputs["Color"])
sep = N(nt, "ShaderNodeSeparateXYZ")
L(nt, co, sep.inputs[0])
horizon = lib.maprange(nt, lib.math_(nt, "ADD", sep.outputs[2], lib.math_(nt, "MULTIPLY", nzf, 0.5)), -0.95, -0.55)
soilcol = lib.mixc(nt, horizon, (0.62, 0.47, 0.3, 1), (0.16, 0.12, 0.095, 1))
wallc = lib.mixc(nt, 1.0, hs.outputs[0], soilcol)
wallc.node.blend_type = "MULTIPLY"
c2 = lib.mixc(nt, wl, c1, wallc)
r2 = lib.mixf(nt, wl, r1, soilw["rough"])
h2 = lib.mixf(nt, wl, h1, soilw["disp"])
fl = A_("floor")
# wet floor: darker, with puddles in the low spots
pud = N(nt, "ShaderNodeTexNoise")
pud.inputs["Scale"].default_value = 0.9
pud.inputs["Detail"].default_value = 3
L(nt, co, pud.inputs["Vector"])
wet = lib.math_(nt, "MULTIPLY", fl, lib.maprange(nt, pud.outputs["Fac"], 0.5, 0.56))
fc = lib.mixc(nt, 1.0, floorT["diff"], (0.55, 0.5, 0.45, 1))
fc.node.blend_type = "MULTIPLY"
c3 = lib.mixc(nt, fl, c2, fc)
r3 = lib.mixf(nt, fl, r2, lib.math_(nt, "MULTIPLY", floorT["rough"], 0.8))
h3 = lib.mixf(nt, fl, h2, floorT["disp"])
c4 = lib.mixc(nt, wet, c3, (0.05, 0.045, 0.04, 1))
r4 = lib.mixf(nt, wet, r3, 0.04)
h4 = lib.mixf(nt, wet, h3, 0.5)
c5 = lib.mixc(nt, 1.0, c4, (0.62, 0.6, 0.58, 1))
c5.node.blend_type = "MULTIPLY"
L(nt, c5, bsdf.inputs["Base Color"])
L(nt, r4, bsdf.inputs["Roughness"])
bump = N(nt, "ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.55
bump.inputs["Distance"].default_value = 0.06
L(nt, h4, bump.inputs["Height"])
L(nt, bump.outputs[0], bsdf.inputs["Normal"])
terrain.data.materials.append(m)
outer.data.materials.append(m)


# ---------------------------------------------------------------- timber: revetment, posts, duckboards
def box(name, size, loc, rot, mat, coll):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    o.data.materials.append(mat)
    return o


wood = lib.simple_pbr("planks", "weathered_planks", 1.2, tint=(0.42, 0.37, 0.31), bump=0.6)
wood2 = lib.simple_pbr("planks_old", "old_planks_02", 1.4, tint=(0.4, 0.36, 0.31), bump=0.6)
bark = lib.simple_pbr("bark", "bark_brown_02", 1.0, tint=(0.42, 0.38, 0.33), bump=0.9)
C_T = lib.collection("timber")
boards = []  # (size, loc, rot, material)
logs = []  # (radius, length, loc, rot)


def wall_runs(P, D, WB, x_lo, x_hi):
    """Revetment along both walls in runs of 1.5-3.5 m: planks, round logs, or bare soil."""
    for i in range(len(P) - 1):
        a, b = P[i], P[i + 1]
        if max(a[0], b[0]) < x_lo or min(a[0], b[0]) > x_hi:
            continue
        u = (b - a) / np.linalg.norm(b - a)
        n = np.array([-u[1], u[0]])
        Lseg = np.linalg.norm(b - a)
        ang = math.atan2(u[1], u[0])
        for sgn in (1, -1):
            s0 = 0.35
            while s0 < Lseg - 0.5:
                run = min(rs.uniform(1.5, 3.5), Lseg - 0.35 - s0)
                if run < 0.5:
                    break
                style = rs.choice(["planks", "logs", "bare"], p=[0.3, 0.1, 0.6])
                if style == "planks":
                    z = -D + 0.12
                    while z < -0.25:
                        hgt = rs.uniform(0.13, 0.27)
                        if rs.rand() > 0.22:
                            ln = run * rs.uniform(0.8, 1.05)
                            mid = a + u * (s0 + run / 2 + rs.uniform(-0.15, 0.15))
                            th = rs.uniform(0.022, 0.045)
                            p = mid + n * (WB + th / 2 + 0.005 + (z + D) * 0.03 + rs.uniform(-0.015, 0.02)) * sgn
                            boards.append(((ln, th, hgt), (p[0], p[1], z + hgt / 2), (rs.uniform(-0.06, 0.06), rs.uniform(-0.04, 0.04), ang + rs.uniform(-0.02, 0.02)), wood if rs.rand() < 0.6 else wood2))
                        z += hgt + rs.uniform(0.0, 0.07)
                elif style == "logs":
                    z = -D + 0.1
                    while z < -0.3:
                        r = rs.uniform(0.045, 0.085)
                        ln = run * rs.uniform(0.85, 1.05)
                        mid = a + u * (s0 + run / 2 + rs.uniform(-0.2, 0.2))
                        p = mid + n * (WB + r + (z + D) * 0.03) * sgn
                        logs.append((r, ln, (p[0], p[1], z + r), (rs.uniform(-0.05, 0.05), math.pi / 2 + rs.uniform(-0.04, 0.04), ang + rs.uniform(-0.03, 0.03))))
                        z += 2 * r + rs.uniform(0.0, 0.04)
                if style != "bare":
                    for s2 in (s0, s0 + run):
                        p = a + u * s2 + n * (WB + 0.07) * sgn
                        logs.append((rs.uniform(0.04, 0.07), D + 0.25, (p[0], p[1], -D / 2 + 0.05), (rs.uniform(-0.04, 0.04), rs.uniform(-0.04, 0.04), 0)))
                s0 += run + rs.uniform(0.02, 0.3)
        # duckboards: slats on two runners, some missing or broken
        for s2 in np.arange(0.15, Lseg - 0.1, 0.24):
            if not (x_lo < (a + u * s2)[0] < x_hi) or rs.rand() < 0.08:
                continue
            p = a + u * s2
            boards.append(((0.085, WB * 1.45, 0.026), (p[0], p[1], -D + 0.075), (rs.uniform(-0.03, 0.03), rs.uniform(-0.03, 0.03), ang + math.pi / 2 + rs.uniform(-0.06, 0.06) + math.pi / 2), wood2))


wall_runs(MAIN, D_MAIN, WB_MAIN, -14, 16)
wall_runs(COMM, D_COMM, WB_COMM, -99, 99)
DX = 2.45  # dugout door on the rear wall, next to the soldier
_dy = centre_y(MAIN, DX)
boards = [bd for bd in boards if not (abs(bd[1][0] - DX) < 0.62 and bd[1][1] < _dy - 0.3 and bd[1][2] > -D_MAIN + 0.1)]
logs = [lg for lg in logs if not (abs(lg[2][0] - DX) < 0.62 and lg[2][1] < _dy - 0.3)]
for k, (size, loc, rot, mat) in enumerate(boards):
    box(f"board{k}", size, loc, rot, mat, C_T)
for k, (r, ln, loc, rot) in enumerate(logs):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=ln, location=loc, rotation=rot, vertices=12)
    o = bpy.context.active_object
    for c in list(o.users_collection):
        c.objects.unlink(o)
    C_T.objects.link(o)
    o.data.materials.append(bark)
bpy.ops.object.select_all(action="DESELECT")
for o in C_T.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = C_T.objects[0]
bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------------------------------------------------------------- sandbags
burlap, bnt, bb, _ = lib.new_mat("burlap")
tcb = N(bnt, "ShaderNodeTexCoord")
wv = N(bnt, "ShaderNodeTexWave", wave_type="BANDS")
wv.inputs["Scale"].default_value = 180
L(bnt, tcb.outputs["Object"], wv.inputs["Vector"])
wv2 = N(bnt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
wv2.inputs["Scale"].default_value = 180
L(bnt, tcb.outputs["Object"], wv2.inputs["Vector"])
nb = N(bnt, "ShaderNodeTexNoise")
nb.inputs["Scale"].default_value = 4
L(bnt, tcb.outputs["Object"], nb.inputs["Vector"])
col = lib.mixc(bnt, nb.outputs["Fac"], (0.20, 0.18, 0.12, 1), (0.34, 0.30, 0.21, 1))
L(bnt, col, bb.inputs["Base Color"])
bb.inputs["Roughness"].default_value = 0.95
bmp = N(bnt, "ShaderNodeBump")
bmp.inputs["Strength"].default_value = 0.25
L(bnt, lib.math_(bnt, "ADD", wv.outputs["Fac"], wv2.outputs["Fac"]), bmp.inputs["Height"])
L(bnt, bmp.outputs[0], bb.inputs["Normal"])
C_S = lib.collection("sandbags")
for x0 in (-6.0, 1.8, 9.5, -12.5):
    i = seg_at(MAIN, x0)
    a, b = MAIN[i], MAIN[i + 1]
    u = (b - a) / np.linalg.norm(b - a)
    n = np.array([-u[1], u[0]])
    ang = math.atan2(u[1], u[0])
    for row in range(2):
        for k in range(-3, 4):
            if row == 1 and k == 0:
                continue  # firing slot
            p = np.array([x0, centre_y(MAIN, x0)]) + u * (k * 0.56 + row * 0.28) + n * (WT_MAIN + 0.32)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(p[0], p[1], 0.02 + row * 0.15), rotation=(rs.uniform(-0.06, 0.06), rs.uniform(-0.06, 0.06), ang + rs.uniform(-0.12, 0.12)))
            o = bpy.context.active_object
            o.scale = (0.55, 0.32, 0.17)
            o.modifiers.new("s", "SUBSURF").levels = 2
            for c in list(o.users_collection):
                c.objects.unlink(o)
            C_S.objects.link(o)
            o.data.materials.append(burlap)

# ---------------------------------------------------------------- camouflage net over part of the trench
xs_n = np.linspace(-3.5, 4.5, 81)
vs_n = np.linspace(-1.9, 1.9, 39)
XN, VN = np.meshgrid(xs_n, vs_n)
YN = np.array([[centre_y(MAIN, x) for x in xs_n]] * len(vs_n)) + VN
ZN = 0.42 - 0.22 * np.cos(VN / 1.9 * math.pi / 2) ** 2 + 0.04 * lib.fbm(XN, YN, 0.8, 2, 11) - 0.08 * np.cos((XN + 3.5) / 8 * math.pi * 3) ** 2
net = lib.grid_mesh("net", XN, YN, ZN)
nm, nnt, nbsdf, nout = lib.new_mat("net")
ntc = N(nnt, "ShaderNodeTexCoord")
nz2 = N(nnt, "ShaderNodeTexNoise")
nz2.inputs["Scale"].default_value = 2.6
nz2.inputs["Detail"].default_value = 9
nz2.inputs["Roughness"].default_value = 0.68
L(nnt, ntc.outputs["Object"], nz2.inputs["Vector"])
cut = N(nnt, "ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE")
cut.inputs["Scale"].default_value = 26
L(nnt, ntc.outputs["Object"], cut.inputs["Vector"])
garn = lib.math_(nnt, "MULTIPLY", lib.maprange(nnt, nz2.outputs["Fac"], 0.5, 0.525), lib.maprange(nnt, cut.outputs["Distance"], 0.03, 0.09))
wx = N(nnt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
wx.inputs["Scale"].default_value = 7
wx.inputs["Distortion"].default_value = 1.5
L(nnt, ntc.outputs["Object"], wx.inputs["Vector"])
wy = N(nnt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
wy.inputs["Scale"].default_value = 7
wy.inputs["Distortion"].default_value = 1.5
L(nnt, ntc.outputs["Object"], wy.inputs["Vector"])
thr = lib.math_(nnt, "MAXIMUM", lib.maprange(nnt, wx.outputs["Fac"], 0.955, 0.985), lib.maprange(nnt, wy.outputs["Fac"], 0.955, 0.985))
alpha = lib.math_(nnt, "MAXIMUM", garn, thr)
nz3 = N(nnt, "ShaderNodeTexNoise")
nz3.inputs["Scale"].default_value = 11
L(nnt, ntc.outputs["Object"], nz3.inputs["Vector"])
ncol = lib.mixc(nnt, nz3.outputs["Fac"], (0.05, 0.06, 0.03, 1), (0.17, 0.15, 0.08, 1))
L(nnt, ncol, nbsdf.inputs["Base Color"])
nbsdf.inputs["Roughness"].default_value = 0.9
L(nnt, alpha, nbsdf.inputs["Alpha"])
try:
    nm.surface_render_method = "DITHERED"
except Exception:
    nm.blend_method = "HASHED"
net.data.materials.append(nm)
if ARGS.get("net") != "1":
    bpy.data.objects.remove(net)

# ---------------------------------------------------------------- shattered tree line
C_TR = lib.collection("trees")


def trunk(x, y, h, r, lean, seed):
    R = np.random.RandomState(seed)
    nv = 12
    levels = max(4, int(h / 0.25))
    verts = []
    for l in range(levels + 1):
        t = l / levels
        rr = r * (1 - 0.35 * t)
        for k in range(nv):
            a = 2 * math.pi * k / nv
            zz = h * t
            if l == levels:
                zz += R.uniform(-0.45, 0.25) * r * 4  # splintered top
            rad = rr * (1 + 0.06 * R.randn())
            verts.append((math.cos(a) * rad + lean[0] * zz, math.sin(a) * rad + lean[1] * zz, zz - 0.3))
    faces = []
    for l in range(levels):
        for k in range(nv):
            faces.append((l * nv + k, l * nv + (k + 1) % nv, (l + 1) * nv + (k + 1) % nv, (l + 1) * nv + k))
    o = lib.mesh_from(f"trunk{seed}", np.array(verts), np.array(faces), C_TR)
    o.location = (x, y, float(Zs(x, y)))
    o.data.materials.append(bark)
    return o


def Zs(x, y):
    i = int(round((y - ys[0]) / STEP))
    j = int(round((x - xs[0]) / STEP))
    i = min(max(i, 0), len(ys) - 1)
    j = min(max(j, 0), len(xs) - 1)
    return Z[i, j]


C_LIB = lib.collection("lib")
branches = lib.ph_model("dry_branches_medium_01", C_LIB)
acacia = lib.ph_model("tree_small_02", C_LIB)
log = lib.ph_model("dead_tree_trunk", C_LIB)
grass = lib.ph_model("grass_medium_01", C_LIB)
stump = lib.ph_model("tree_stump_01", C_LIB)
props = {k: lib.ph_model(k, C_LIB) for k in ("ammo_box", "wooden_military_crate", "metal_jerrycan_green", "rusted_spade_01", "russian_food_cans_01")}


def inst(objs, loc, rot=(0, 0, 0), s=1.0, coll=C_TR):
    out = []
    for o in objs:
        if o.type != "MESH":
            continue
        c = o.copy()
        c.data = o.data
        coll.objects.link(c)
        c.parent = None
        c.location = loc
        c.rotation_euler = rot
        c.scale = (s, s, s)
        out.append(c)
    return out


k = 0
for y0, n_ in ((-2.6, 16), (-5.0, 14), (-7.8, 10), (2.4, 5)):
    for xx in np.linspace(-21, 21, n_):
        x = xx + rs.uniform(-1.2, 1.2)
        y = y0 + rs.uniform(-0.8, 0.8)
        if min(abs(y - centre_y(MAIN, x)), 99) < 1.4 or (abs(x - 5.3) < 1.3 and -12 < y < 0):
            continue
        k += 1
        if rs.rand() < 0.62:
            h = rs.uniform(1.2, 5.5)
            o = trunk(x, y, h, rs.uniform(0.09, 0.2), (rs.uniform(-0.08, 0.08), rs.uniform(-0.08, 0.08)), k)
            if h > 3 and rs.rand() < 0.6:
                inst(branches, (x, y, float(Zs(x, y)) + h * 0.7), (rs.uniform(-0.3, 0.3), rs.uniform(-0.3, 0.3), rs.uniform(0, 6.28)), rs.uniform(1.2, 2.0))
        elif math.hypot(x - 0.6, y - 0.3) > 6.5:
            inst(acacia, (x, y, float(Zs(x, y))), (0, 0, rs.uniform(0, 6.28)), rs.uniform(1.5, 2.3))
for i_ in range(9):
    x = rs.uniform(-20, 20)
    y = rs.uniform(-12, 12)
    if abs(y - centre_y(MAIN, x)) < 2.5:
        continue
    inst(log, (x, y, float(Zs(x, y)) - 0.05), (0, 0, rs.uniform(0, 6.28)), rs.uniform(0.8, 1.3))
for i_ in range(6):
    x = rs.uniform(-20, 20)
    y = rs.uniform(-10, -2)
    inst(stump, (x, y, float(Zs(x, y)) - 0.05), (0, 0, rs.uniform(0, 6.28)), rs.uniform(1.0, 1.6))

# ground cover: grass tufts through a particle system on the "grass" vertex group
gcoll = lib.collection("grass_src")
for o in grass:
    if o.type == "MESH":
        for c in list(o.users_collection):
            c.objects.unlink(o)
        gcoll.objects.link(o)
        o.location = (0, 0, 0)
        o.parent = None
gem = lib.grid_mesh("grass_emitter", X, Y, Z + 0.005)
gvg = gem.vertex_groups.new(name="grass")
for val in (0.25, 0.5, 0.75, 1.0):
    sel = idx[(w > val - 0.25) & (w <= val)]
    if len(sel):
        gvg.add(sel.tolist(), val, "REPLACE")
lib.scatter(gem, gcoll, float(ARGS.get("grassd", 5.0)), "grass", seed=3, scale=(0.5, 1.1), tilt=0.12, name="grass")
lib.hide_collection(gcoll)

# props in the trench
def place(name, x, dy, z_up, rot, s=1.0):
    y = centre_y(MAIN, x) + dy
    inst(props[name], (x, y, -D_MAIN + 0.07 + z_up), rot, s, coll=lib.collection("props"))


place("ammo_box", -1.2, -0.25, 0.0, (0, 0, 0.3))
place("ammo_box", -1.0, -0.22, 0.18, (0, 0, 0.1))
place("wooden_military_crate", 3.4, 0.2, 0.0, (0, 0, 1.4), 0.8)
place("metal_jerrycan_green", 2.6, -0.32, 0.0, (0, 0, 0.6))
place("rusted_spade_01", -2.6, 0.38, 0.55, (0.25, 0, 0.2))
place("russian_food_cans_01", 3.3, 0.18, 0.42, (0, 0, 0.5))
for k_, o in enumerate(props.values()):
    pass
lib.hide_collection(C_LIB)

# ---------------------------------------------------------------- dugout door
import props  # noqa: E402

C_D = lib.collection("dugout")
seg = seg_at(MAIN, DX)
u = (MAIN[seg + 1] - MAIN[seg]) / np.linalg.norm(MAIN[seg + 1] - MAIN[seg])
nrm = np.array([-u[1], u[0]])
ang = math.atan2(u[1], u[0])
door = np.array([DX, centre_y(MAIN, DX)]) - nrm * (WB_MAIN + 0.012)
bpy.ops.mesh.primitive_plane_add(size=1, location=(door[0], door[1], -D_MAIN + 0.68), rotation=(math.pi / 2, 0, ang))
hole = bpy.context.active_object
hole.scale = (0.78, 1.36, 1)
hm, hnt, hb, _ = lib.new_mat("void")
hb.inputs["Base Color"].default_value = (0.004, 0.0035, 0.003, 1)
hb.inputs["Roughness"].default_value = 1
hole.data.materials.append(hm)
for side in (-1, 1):
    p_ = door + u * side * 0.47 + nrm * 0.04
    bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=1.6, location=(p_[0], p_[1], -D_MAIN + 0.75), vertices=12)
    bpy.context.active_object.data.materials.append(bark)
p_ = door + nrm * 0.06
bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=1.35, location=(p_[0], p_[1], -D_MAIN + 1.46), rotation=(0, math.pi / 2, ang), vertices=12)
bpy.context.active_object.data.materials.append(bark)
for k in range(5):  # roof logs over the dugout, half buried
    p_ = door - nrm * (0.4 + 0.05 * k) + u * (k - 2) * 0.24
    bpy.ops.mesh.primitive_cylinder_add(radius=rs.uniform(0.08, 0.11), depth=2.4, location=(p_[0] - nrm[0] * 0.8, p_[1] - nrm[1] * 0.8, float(Zs(p_[0], p_[1] - 1.0)) + 0.02), rotation=(math.pi / 2, 0, ang + rs.uniform(-0.08, 0.08)), vertices=12)
    bpy.context.active_object.data.materials.append(bark)
tp = props.tarp(C_D, 0.6, 1.25, 3)
tp.location = (door[0] + u[0] * 0.12 + nrm[0] * 0.05, door[1] + u[1] * 0.12 + nrm[1] * 0.05, -D_MAIN + 1.4)
tp.rotation_euler = (0, 0, ang)

# ---------------------------------------------------------------- soldier (Rocketbox, MIT) with his rifle
import soldier  # noqa: E402

SX = 0.6
FLOOR = -D_MAIN + 0.088
sold = soldier.load("Military_Male_03", recolour="olive")
soldier.pose_sit_wall(sold)
sold.location = (SX, centre_y(MAIN, SX) - 0.36, FLOOR + 0.24)
sold.rotation_euler.z += math.pi + 0.35
bpy.context.view_layer.update()
th_ = sold.rotation_euler.z + math.pi / 2  # body yaw relative to the import orientation (facing -Y)
fwd = np.array([math.sin(th_), -math.cos(th_)])
lft = np.array([-fwd[1], fwd[0]])
base = np.array([sold.location.x, sold.location.y])
gun = props.rifle(lib.collection("gun"))
gun.hide_render = ARGS.get("rifle") != "1"
# leaning on the wall at his left, butt on the duckboards
butt = np.array([*(base + lft * 0.42 + fwd * 0.22), FLOOR + 0.01])
top = np.array([*(base + lft * 0.5 - fwd * 0.08), FLOOR + 0.92])
dv = top - butt
dv /= np.linalg.norm(dv)
from mathutils import Vector  # noqa: E402

gun.location = tuple(butt)
gun.rotation_mode = "QUATERNION"
gun.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(dv))
gun.rotation_mode = "XYZ"
hm_ = Vector((0, 0, 0))

# head: looking down, then up at the sound (shot 1); the look-up pose is used for shot 2
HEAD = ["Bip01 Neck", "Bip01 Head"]
shot = ARGS.get("shot", "1")
if shot == "1":
    soldier.key(sold, HEAD, 58)
    soldier.apply_rel(sold, soldier.LOOK_UP)
    soldier.key(sold, HEAD, 80)
elif shot in ("2", "3"):
    soldier.apply_rel(sold, soldier.LOOK_UP)

# ---------------------------------------------------------------- the drone
qd = props.quad(lib.collection("drone"), "recon")

# ---------------------------------------------------------------- light, camera, render
thermal = ARGS.get("thermal") == "1"
lib.world_hdri("kloofendal_misty_morning_puresky_4k.exr", strength=0.9, rot=1.2, fog=0 if thermal else float(ARGS.get("fog", 0.018)), fog_col=(0.78, 0.8, 0.82))
lib.sun(angle_deg=9, az_deg=70, strength=2.2, col=(1.0, 0.82, 0.66), soft=3)
lib.render_settings(int(ARGS.get("w", 1920)), int(ARGS.get("h", 1080)), 24, int(ARGS.get("samples", 48)), exposure=float(ARGS.get("exp", 0.0)))

sc.eevee.volumetric_tile_size = ARGS.get("voltile", "4")
cy = centre_y(MAIN, SX)
if shot == "wide":
    cam = lib.camera("cam", (-13, -9, 5.5), (0, 0, -0.8), lens=28)
    frames = (1, 1)
elif shot in ("1", "top"):
    # medium shot from the trench corner, slow push-in
    cam = lib.camera("cam", (SX - 2.5, cy + 0.28, FLOOR + 1.05), (SX + 0.1, cy - 0.3, FLOOR + 0.72), lens=35, fstop=2.2)
    cam.keyframe_insert("location", frame=1)
    cam.location = (SX - 2.05, cy + 0.24, FLOOR + 1.0)
    cam.keyframe_insert("location", frame=101)
    frames = (1, 101)
elif shot == "2":
    # from beside his knees looking up past the helmet, through the net and the branches
    cam = lib.camera("cam", (SX + 0.75, cy + 0.12, FLOOR + 0.35), (SX + 0.35, cy - 0.12, FLOOR + 6.0), lens=20, fstop=5.6, focus=10)
    qd.location = (SX - 9, cy - 1.0, 11)
    qd.keyframe_insert("location", frame=1)
    qd.location = (SX + 8, cy + 0.4, 11.5)
    qd.keyframe_insert("location", frame=62)
    qd.rotation_euler = (0.1, -0.12, math.atan2(-16, 5.8))
    frames = (1, 62)
else:
    # the drone's own camera: straight down from 45 m, then the operator zooms in
    cam = lib.camera("cam", (SX + 12, cy + 30, 40), (SX - 2, cy - 1, 0), lens=24)
    cam.data.lens = 24
    cam.data.keyframe_insert("lens", frame=1)
    cam.data.keyframe_insert("lens", frame=11)
    cam.data.lens = 135
    cam.data.keyframe_insert("lens", frame=31)
    cam.keyframe_insert("location", frame=1)
    cam.keyframe_insert("rotation_euler", frame=1)
    cam.keyframe_insert("rotation_euler", frame=11)
    cam.location = (SX + 11.5, cy + 29.4, 40)
    lib.look_at(cam, (SX + 0.05, cy - 0.2, FLOOR + 0.6))
    cam.keyframe_insert("location", frame=31)
    cam.keyframe_insert("rotation_euler", frame=31)
    cam.location = (SX + 11.2, cy + 29.0, 40)
    cam.keyframe_insert("location", frame=77)
    frames = (1, 77)
# hand-held / airframe shake
if not lib.fcurves(cam.animation_data.action, "rotation_euler") if cam.animation_data and cam.animation_data.action else True:
    cam.keyframe_insert("rotation_euler", frame=1)
if cam.animation_data and cam.animation_data.action:
    for fc in lib.fcurves(cam.animation_data.action, "rotation_euler"):
        nm_ = fc.modifiers.new("NOISE")
        nm_.strength = 0.012 if shot != "3" else 0.006
        nm_.scale = 26
        nm_.phase = fc.array_index * 7.3
sc.camera = cam
sc.frame_start, sc.frame_end = frames
if shot == "top":
    cam = lib.camera("camtop", (SX, cy, 6), (SX, cy, -1.5), lens=35)
    sc.camera = cam
bpy.context.view_layer.update()
print("DBG cam", tuple(round(v, 2) for v in sc.camera.matrix_world.translation), "sold", tuple(round(v, 2) for v in sold.location), "hands", tuple(round(v, 2) for v in hm_), "gun", tuple(round(v, 2) for v in gun.location), "gun dims", tuple(round(v, 2) for v in gun.dimensions))

if thermal:
    import thermal as th  # noqa: E402

    th.apply(sc, hot={sold.name: 0.97, bpy.data.objects[sold["mesh"]].name: 0.97, gun.name: 0.42, hole.name: 0.5, tp.name: 0.33})

outp = ARGS.get("out", os.path.join(lib.ROOT, "blender", "out", f"trench_{shot}.jpg"))
os.makedirs(os.path.dirname(outp), exist_ok=True)
if ARGS.get("save"):
    bpy.ops.wm.save_as_mainfile(filepath=ARGS["save"])
if ARGS.get("mode", "still") == "still":
    sc.frame_set(int(ARGS.get("frame", frames[1])))
    from mathutils import Vector as _V

    _m = sc.camera.matrix_world
    _dg = bpy.context.evaluated_depsgraph_get()
    _ms = bpy.data.objects[sold["mesh"]]
    _me = _ms.evaluated_get(_dg).to_mesh()
    _ws = [_ms.matrix_world @ v.co for v in _me.vertices]
    print("DBG3 bbox", [round(min(v[i] for v in _ws), 2) for i in range(3)], [round(max(v[i] for v in _ws), 2) for i in range(3)], "anim", sold.animation_data.action.name if sold.animation_data and sold.animation_data.action else None, "objs", [o.name for o in bpy.data.objects if o.type == "ARMATURE"])
    print("DBG2 cam", tuple(round(v, 2) for v in _m.translation), "fwd", tuple(round(v, 2) for v in (_m.to_3x3() @ _V((0, 0, -1)))), "head", tuple(round(v, 2) for v in (sold.matrix_world @ sold.pose.bones["Bip01 Head"].head)))
    sc.render.filepath = outp
    bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = outp  # e.g. blender/out/s1/f_####
    bpy.ops.render.render(animation=True)
