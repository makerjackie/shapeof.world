# A wheat field south of Orikhiv at sunrise, June: green-gold winter wheat, a two-rut field track, windbreak tree
# belts. The camera sits in the wheat. Vehicles come from blender/vehicles.py when the models are present.
# usage: blender -b -P blender/field.py -- --mode still|anim --shot N --out path
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import L, N  # noqa: E402

ARGS = lib.args()
rs = np.random.RandomState(11)
lib.reset()
sc = bpy.context.scene

# ---------------------------------------------------------------- ground
STEP = 0.25
xs = np.arange(-120, 120 + 1e-6, STEP)
ys = np.arange(-60, 260 + 1e-6, STEP)
X, Y = np.meshgrid(xs, ys)
Z = 0.6 * lib.fbm(X, Y, 90, 3, 1) + 0.04 * lib.fbm(X, Y, 3, 3, 2) + Y * 0.012  # rises gently to the south-east
# field track: two ruts 1.8 m apart curving across the field
TRK = lambda y: 6 + 9 * np.sin(y / 70)  # noqa: E731
dtr = X - TRK(Y)
rut = np.exp(-(((np.abs(dtr) - 0.9) / 0.28) ** 2)) * 0.09 + np.exp(-((dtr / 1.6) ** 2)) * 0.03
Z = Z - rut
track = np.clip(1.3 - np.abs(dtr) / 1.6, 0, 1)
ground = lib.grid_mesh("ground", X, Y, Z)
me = ground.data
a = me.attributes.new("track", "FLOAT", "POINT")
a.data.foreach_set("value", track.ravel().astype(np.float32))


def Zs(x, y):
    i = int(round((y - ys[0]) / STEP))
    j = int(round((x - xs[0]) / STEP))
    return float(Z[min(max(i, 0), len(ys) - 1), min(max(j, 0), len(xs) - 1)])


m, nt, bsdf, out = lib.new_mat("ground")
tc = N(nt, "ShaderNodeTexCoord")
co = tc.outputs["Object"]
soil = lib.texset(nt, "farm_soil", 2.5, co)
trk = lib.texset(nt, "muddy_tracks", 2.0, co)
tr = N(nt, "ShaderNodeAttribute", attribute_name="track")
c = lib.mixc(nt, tr.outputs["Fac"], soil["diff"], trk["diff"])
# far away the field reads as wheat: tint the soil towards straw-green with distance from the camera area
sep = N(nt, "ShaderNodeSeparateXYZ")
L(nt, co, sep.inputs[0])
far = lib.maprange(nt, lib.math_(nt, "ABSOLUTE", lib.math_(nt, "SUBTRACT", sep.outputs[1], 20)), 25, 60)
nzc = N(nt, "ShaderNodeTexNoise")
nzc.inputs["Scale"].default_value = 0.05
L(nt, co, nzc.inputs["Vector"])
wheatcol = lib.mixc(nt, nzc.outputs["Fac"], (0.22, 0.24, 0.07, 1), (0.36, 0.33, 0.12, 1))
c = lib.mixc(nt, lib.math_(nt, "MULTIPLY", far, lib.math_(nt, "SUBTRACT", 1.0, tr.outputs["Fac"])), c, wheatcol)
L(nt, c, bsdf.inputs["Base Color"])
L(nt, lib.mixf(nt, tr.outputs["Fac"], soil["rough"], trk["rough"]), bsdf.inputs["Roughness"])
bump = N(nt, "ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.5
L(nt, lib.mixf(nt, tr.outputs["Fac"], soil["disp"], trk["disp"]), bump.inputs["Height"])
L(nt, bump.outputs[0], bsdf.inputs["Normal"])
ground.data.materials.append(m)


# ---------------------------------------------------------------- one wheat plant (3 variants)
def tube(path, r0, r1, sides=5):
    verts = []
    faces = []
    n = len(path)
    for i, p in enumerate(path):
        t = i / (n - 1)
        r = r0 + (r1 - r0) * t
        d = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        d = d / (np.linalg.norm(d) + 1e-9)
        a_ = np.cross(d, [0, 1, 0])
        a_ /= np.linalg.norm(a_) + 1e-9
        b_ = np.cross(d, a_)
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            verts.append(p + r * (math.cos(ang) * a_ + math.sin(ang) * b_))
    for i in range(n - 1):
        for k in range(sides):
            faces.append((i * sides + k, i * sides + (k + 1) % sides, (i + 1) * sides + (k + 1) % sides, (i + 1) * sides + k))
    return verts, faces


def plant(seed):
    R = np.random.RandomState(seed)
    h = R.uniform(0.78, 0.98)
    bend = R.uniform(0.03, 0.12)
    tz = np.linspace(0, 1, 9)
    path = np.stack([bend * tz**2, np.zeros_like(tz), h * tz], 1)
    V, F = tube(path, 0.0028, 0.0018)
    parts = [(V, F, 0)]
    # ear: spikelets alternating on two sides of the rachis
    top = path[-1]
    V2, F2 = [], []
    ico_v = np.array([(0, 0, 1), (0.89, 0, 0.45), (0.28, 0.85, 0.45), (-0.72, 0.53, 0.45), (-0.72, -0.53, 0.45), (0.28, -0.85, 0.45),
                      (0.72, 0.53, -0.45), (-0.28, 0.85, -0.45), (-0.89, 0, -0.45), (-0.28, -0.85, -0.45), (0.72, -0.53, -0.45), (0, 0, -1)], float)
    ico_f = [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5), (0, 5, 1), (1, 6, 2), (2, 7, 3), (3, 8, 4), (4, 9, 5), (5, 10, 1),
             (6, 7, 2), (7, 8, 3), (8, 9, 4), (9, 10, 5), (10, 6, 1), (11, 7, 6), (11, 8, 7), (11, 9, 8), (11, 10, 9), (11, 6, 10)]
    ns = 14
    epath = []
    for k in range(ns):
        t = k / (ns - 1)
        side = 1 if k % 2 else -1
        size = 0.75 + 0.5 * math.sin(math.pi * (0.2 + 0.7 * t))
        c_ = top + np.array([bend * 0.08 * t + side * 0.0032, 0, 0.006 + 0.075 * t])
        epath.append(c_)
        sc_ = np.array([0.0036, 0.0028, 0.0062]) * size
        o_ = len(V2)
        V2 += [tuple(c_ + v * sc_) for v in ico_v]
        F2 += [tuple(i + o_ for i in f_) for f_ in ico_f]
    epath = np.array(epath)
    parts.append((V2, F2, 1))
    # awns: thin quads
    V3, F3 = [], []
    for k in range(12):
        p = epath[1 + k % 12]
        ang = R.uniform(0, 6.28)
        d = np.array([math.cos(ang) * 0.35, math.sin(ang) * 0.35, 1.0])
        d /= np.linalg.norm(d)
        q = p + d * R.uniform(0.04, 0.07)
        w = np.array([-d[1], d[0], 0]) * 0.0005 + 1e-6
        base = len(V3)
        V3 += [p - w, p + w, q + w, q - w]
        F3.append((base, base + 1, base + 2, base + 3))
    parts.append((V3, F3, 1))
    # two leaves
    for lz in (R.uniform(0.25, 0.35), R.uniform(0.45, 0.6)):
        ang = R.uniform(0, 6.28)
        dirx = np.array([math.cos(ang), math.sin(ang), 0])
        lp = []
        for t in np.linspace(0, 1, 7):
            lp.append(path[int(lz * 8)] + dirx * 0.22 * t + np.array([0, 0, 0.14 * t - 0.2 * t * t]))
        side = np.array([-dirx[1], dirx[0], 0])
        V4, F4 = [], []
        for i, p in enumerate(lp):
            w = 0.006 * math.sin(math.pi * (0.1 + 0.85 * i / 6))
            V4 += [p - side * w, p + side * w]
        for i in range(len(lp) - 1):
            F4.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        parts.append((V4, F4, 0))
    verts, faces, mats = [], [], []
    for V_, F_, mi in parts:
        o = len(verts)
        verts += [tuple(v) for v in V_]
        faces += [tuple(i + o for i in f_) for f_ in F_]
        mats += [mi] * len(F_)
    me = bpy.data.meshes.new(f"wheat{seed}")
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(f"wheat{seed}", me)
    for p_, mi in zip(me.polygons, mats):
        p_.material_index = mi
    return ob


def wheat_mat(name, base, tip):
    m, nt, bsdf, out = lib.new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord")
    sep = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, tc.outputs["Object"], sep.inputs[0])
    nz = N(nt, "ShaderNodeObjectInfo")
    col = lib.mixc(nt, lib.maprange(nt, sep.outputs[2], 0.2, 0.95), base, tip)
    col = lib.mixc(nt, lib.math_(nt, "MULTIPLY", nz.outputs["Random"], 0.5), col, (0.4, 0.38, 0.12, 1))
    L(nt, col, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.55
    for nm_ in ("Transmission Weight", "Subsurface Weight"):
        pass
    tr = N(nt, "ShaderNodeBsdfTranslucent")
    L(nt, col, tr.inputs["Color"])
    mix = N(nt, "ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.35
    L(nt, bsdf.outputs[0], mix.inputs[1])
    L(nt, tr.outputs[0], mix.inputs[2])
    L(nt, mix.outputs[0], out.inputs["Surface"])
    return m


stem_m = wheat_mat("wheat_stem", (0.07, 0.12, 0.025, 1), (0.22, 0.25, 0.06, 1))
ear_m = wheat_mat("wheat_ear", (0.24, 0.26, 0.07, 1), (0.38, 0.33, 0.11, 1))
WC = lib.collection("wheat_src")
for k in range(4):
    p = plant(k)
    p.data.materials.append(stem_m)
    p.data.materials.append(ear_m)
    WC.objects.link(p)
lib.hide_collection(WC)

# ---------------------------------------------------------------- the wheat: dense around the camera area, none on the track
CAM_C = np.array([float(ARGS.get("cx", 0)), float(ARGS.get("cy", 10))])
# a separate emitter around the camera so the particle count goes where it is seen
E = 0.25
ex = np.arange(CAM_C[0] - 40, CAM_C[0] + 40 + 1e-6, E)
ey = np.arange(CAM_C[1] - 25, CAM_C[1] + 60 + 1e-6, E)
EX, EY = np.meshgrid(ex, ey)
ii = np.clip(np.round((EY - ys[0]) / STEP).astype(int), 0, len(ys) - 1)
jj = np.clip(np.round((EX - xs[0]) / STEP).astype(int), 0, len(xs) - 1)
EZ = Z[ii, jj] - 0.01
emit = lib.grid_mesh("wheat_emitter", EX, EY, EZ)
edtr = EX - TRK(EY)
d = np.hypot(EX - CAM_C[0], (EY - CAM_C[1]) * 0.6)
dens = np.clip(1.3 - d / 38, 0, 1) * np.clip(np.abs(edtr) / 1.4 - 0.55, 0, 1)
vg = emit.vertex_groups.new(name="wheat")
idx = np.nonzero(dens.ravel() > 0.02)[0]
w = dens.ravel()[idx]
for lo, hi in ((0, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1.01)):
    sel = idx[(w > lo) & (w <= hi)]
    if len(sel):
        vg.add(sel.tolist(), (lo + hi) / 2, "REPLACE")
lib.scatter(emit, WC, float(ARGS.get("wheat", 300000)) / (80 * 85) * 1.6, "wheat", seed=5, scale=(0.85, 1.12), tilt=0.07, name="wheat")

# ---------------------------------------------------------------- tree belts on the horizon
C_LIB = lib.collection("lib")
acacia = lib.ph_model("tree_small_02", C_LIB)
lib.hide_collection(C_LIB)
C_TR = lib.collection("belts")
for yb in (150.0, 235.0):
    for x in np.arange(-120, 120, 3.2):
        x2 = x + rs.uniform(-1, 1)
        y2 = yb + rs.uniform(-4, 4) + 6 * math.sin(x / 40)
        for o in acacia:
            if o.type != "MESH":
                continue
            cobj = o.copy()
            C_TR.objects.link(cobj)
            cobj.parent = None
            cobj.location = (x2, y2, Zs(x2, y2) - 0.2)
            cobj.rotation_euler = (0, 0, rs.uniform(0, 6.28))
            s_ = rs.uniform(2.6, 3.6)
            cobj.scale = (s_, s_, s_ * rs.uniform(1.0, 1.25))

# ---------------------------------------------------------------- light and camera
lib.world_hdri(ARGS.get("hdri", "belfast_sunset_puresky_4k.exr"), strength=float(ARGS.get("sky", 1.0)), rot=float(ARGS.get("rot", 0.0)), fog=float(ARGS.get("fog", 0.0012)), fog_col=(0.9, 0.82, 0.72), anis=0.55)
lib.sun(angle_deg=float(ARGS.get("sunel", 7)), az_deg=float(ARGS.get("sunaz", 75)), strength=float(ARGS.get("sunk", 4.0)), col=(1.0, 0.72, 0.48), soft=1.2)
lib.render_settings(int(ARGS.get("w", 1920)), int(ARGS.get("h", 1080)), 24, int(ARGS.get("samples", 32)), exposure=float(ARGS.get("exp", 0.0)))

shot = ARGS.get("shot", "1")
if shot == "1":
    cam = lib.camera("cam", (CAM_C[0] - 2.0, CAM_C[1], Zs(*CAM_C) + 0.75), (TRK(CAM_C[1] + 14), CAM_C[1] + 14, Zs(TRK(CAM_C[1] + 14), CAM_C[1] + 14) + 1.6), lens=40, fstop=4, focus=16)
else:
    cam = lib.camera("cam", (CAM_C[0] - 30, CAM_C[1] - 25, 14), (TRK(CAM_C[1] + 10), CAM_C[1] + 10, 0), lens=35)
sc.camera = cam
outp = ARGS.get("out", os.path.join(lib.ROOT, "blender", "out", f"field_{shot}.jpg"))
os.makedirs(os.path.dirname(outp), exist_ok=True)
if ARGS.get("save"):
    bpy.ops.wm.save_as_mainfile(filepath=ARGS["save"])
if ARGS.get("mode", "still") == "still":
    sc.render.filepath = outp
    bpy.ops.render.render(write_still=True)
