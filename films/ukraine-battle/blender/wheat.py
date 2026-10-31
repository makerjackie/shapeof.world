# Wheat plants (own procedural model): stem, two leaves, an ear of alternating spikelets with awns.
import math

import bpy
import numpy as np

import lib
from lib import L, N

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




def source_collection(name="wheat_src"):
    stem_m = wheat_mat("wheat_stem", (0.07, 0.12, 0.025, 1), (0.22, 0.25, 0.06, 1))
    ear_m = wheat_mat("wheat_ear", (0.24, 0.26, 0.07, 1), (0.38, 0.33, 0.11, 1))
    WC = lib.collection("wheat_src")
    for k in range(4):
        p = plant(k)
        p.data.materials.append(stem_m)
        p.data.materials.append(ear_m)
        WC.objects.link(p)
    lib.hide_collection(WC)
    return WC
