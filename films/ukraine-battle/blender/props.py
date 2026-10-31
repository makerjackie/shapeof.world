# Small procedural props: an AK-pattern rifle, a quadcopter (recon or FPV), a hanging tarp.
import math

import bpy
import numpy as np

import lib
from lib import L, N


def _mat(name, col, rough, metal=0.0):
    m, nt, bsdf, out = lib.new_mat(name)
    bsdf.inputs["Base Color"].default_value = (*col, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def _part(kind, size, loc, rot, mat, parts):
    if kind == "box":
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
        o = bpy.context.active_object
        o.scale = size
        bev = o.modifiers.new("b", "BEVEL")
        bev.width = min(size) * 0.18
        bev.segments = 2
    else:
        bpy.ops.mesh.primitive_cylinder_add(radius=size[0], depth=size[1], location=loc, rotation=rot, vertices=16)
        o = bpy.context.active_object
    o.data.materials.append(mat)
    parts.append(o)
    return o


def _join(parts, name, coll):
    for o in parts:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll.objects.link(o)
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def rifle(coll):
    """AK-pattern rifle along +Z, butt at the origin, magazine towards -Y. About 0.94 m."""
    bpy.context.scene.cursor.location = (0, 0, 0)
    steel = _mat("gun_steel", (0.025, 0.025, 0.027), 0.42, 0.7)
    poly = _mat("gun_poly", (0.03, 0.028, 0.026), 0.62)
    P = []
    _part("box", (0.04, 0.115, 0.24), (0, -0.02, 0.12), (0.08, 0, 0), poly, P)  # stock
    _part("box", (0.046, 0.075, 0.25), (0, 0.0, 0.375), (0, 0, 0), steel, P)  # receiver
    _part("box", (0.032, 0.035, 0.11), (0, -0.07, 0.29), (-0.45, 0, 0), poly, P)  # grip
    for k in range(3):  # curved magazine
        _part("box", (0.03, 0.06, 0.085), (0, -0.075 - k * 0.055, 0.465 + k * 0.025), (-0.25 - k * 0.22, 0, 0), poly, P)
    _part("box", (0.05, 0.058, 0.19), (0, 0.004, 0.59), (0, 0, 0), poly, P)  # handguard
    _part("cyl", (0.012, 0.22), (0, 0.032, 0.6), (0, 0, 0), steel, P)  # gas tube
    _part("cyl", (0.009, 0.4), (0, 0.0, 0.7), (0, 0, 0), steel, P)  # barrel
    _part("cyl", (0.014, 0.075), (0, 0.0, 0.905), (0, 0, 0), steel, P)  # muzzle brake
    _part("box", (0.012, 0.03, 0.02), (0, 0.03, 0.83), (0, 0, 0), steel, P)  # front sight
    _part("box", (0.012, 0.02, 0.05), (0, 0.045, 0.5), (0, 0, 0), steel, P)  # rear sight
    return _join(P, "rifle", coll)


def quad(coll, kind="recon"):
    """Quadcopter at the origin, nose +Y. recon: grey folding-arm camera drone (~0.35 m); fpv: open frame with a
    strapped warhead (~0.3 m)."""
    bpy.context.scene.cursor.location = (0, 0, 0)
    grey = _mat("quad_body", (0.12, 0.12, 0.12) if kind == "recon" else (0.03, 0.03, 0.03), 0.5)
    dark = _mat("quad_motor", (0.02, 0.02, 0.02), 0.4, 0.5)
    prop = _mat("quad_prop", (0.05, 0.05, 0.05), 0.5)
    prop.surface_render_method = "DITHERED"
    pn = prop.node_tree
    bs = [n for n in pn.nodes if n.type == "BSDF_PRINCIPLED"][0]
    bs.inputs["Alpha"].default_value = 0.35
    P = []
    if kind == "recon":
        _part("box", (0.09, 0.2, 0.07), (0, 0, 0), (0, 0, 0), grey, P)
        _part("box", (0.05, 0.04, 0.04), (0, 0.11, -0.03), (0, 0, 0), dark, P)  # camera gimbal
        arms = [(0.15, 0.12), (-0.15, 0.12), (0.17, -0.11), (-0.17, -0.11)]
    else:
        _part("box", (0.07, 0.14, 0.03), (0, 0, 0), (0, 0, 0), grey, P)
        _part("box", (0.04, 0.09, 0.04), (0, -0.01, 0.035), (0, 0, 0), dark, P)  # battery
        _part("cyl", (0.03, 0.2), (0, 0.04, -0.045), (math.pi / 2, 0, 0), _mat("warhead", (0.12, 0.13, 0.08), 0.6), P)
        arms = [(0.13, 0.13), (-0.13, 0.13), (0.13, -0.13), (-0.13, -0.13)]
    for ax, ay in arms:
        L_ = math.hypot(ax, ay)
        _part("box", (0.022, L_, 0.014), (ax / 2, ay / 2, 0.0), (0, 0, math.atan2(-ax, ay)), grey, P)
        _part("cyl", (0.016, 0.022), (ax, ay, 0.01), (0, 0, 0), dark, P)
        _part("cyl", (0.075 if kind == "recon" else 0.065, 0.002), (ax, ay, 0.025), (0, 0, 0), prop, P)
    return _join(P, f"quad_{kind}", coll)


def tarp(coll, w=0.85, h=1.25, seed=0):
    """A blanket or tarp hanging from a top edge at the origin, in the XZ plane, with vertical folds."""
    R = np.random.RandomState(seed)
    xs = np.linspace(-w / 2, w / 2, 40)
    zs = np.linspace(0, -h, 50)
    X, Zz = np.meshgrid(xs, zs)
    t = -Zz / h
    Y = 0.035 * np.sin(X * 22 + R.rand() * 6) * (0.4 + t) + 0.02 * np.sin(X * 47) * t + 0.06 * t**3
    o = lib.grid_mesh("tarp", X, Y, Zz, coll)
    m, nt, bsdf, out = lib.new_mat("tarp")
    tc = N(nt, "ShaderNodeTexCoord")
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 6
    L(nt, tc.outputs["Object"], nz.inputs["Vector"])
    L(nt, lib.mixc(nt, nz.outputs["Fac"], (0.04, 0.045, 0.035, 1), (0.1, 0.1, 0.08, 1)), bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    o.data.materials.append(m)
    sol = o.modifiers.new("t", "SOLIDIFY")
    sol.thickness = 0.006
    return o
