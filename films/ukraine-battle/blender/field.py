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


import wheat  # noqa: E402

WC = wheat.source_collection()


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
