# Rocketbox avatars (Microsoft, MIT licence): load, re-texture the US ACU camouflage into a neutral olive pattern,
# and pose the 3ds Max biped skeleton.
import math
import os

import bpy
import numpy as np

import lib
from lib import L, N

RB = os.path.join(lib.A, "rocketbox")
PALETTES = {
    # dark, mid, light: a generic olive/brown digital pattern (worn by neither army exactly)
    "olive": [(0.075, 0.07, 0.045), (0.16, 0.165, 0.095), (0.29, 0.27, 0.18)],
    "dark": [(0.05, 0.05, 0.04), (0.11, 0.115, 0.08), (0.2, 0.19, 0.14)],
}


def recolour(src, dst, pal):
    if os.path.exists(dst):
        return dst
    im = bpy.data.images.load(src)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    lum = px[:, 0] * 0.3 + px[:, 1] * 0.59 + px[:, 2] * 0.11
    sat = px[:, :3].max(1) - px[:, :3].min(1)
    lo, hi = np.percentile(lum, 5), np.percentile(lum, 95)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
    p = np.array(pal, np.float32)
    c = np.where(t[:, None] < 0.5, p[0] + (p[1] - p[0]) * (t[:, None] * 2), p[1] + (p[2] - p[1]) * (t[:, None] * 2 - 1))
    # everything is re-coloured, including the US unit patches and flag on the sleeves (neutral, no insignia)
    out = bpy.data.images.new(os.path.basename(dst), w, h)
    o = np.concatenate([c, np.ones((len(c), 1), np.float32)], 1)
    out.pixels.foreach_set(o.ravel())
    out.filepath_raw = dst
    out.file_format = "PNG"
    out.save()
    return dst


def material(name, colour, normal, spec, rough_base=0.75):
    m, nt, bsdf, out = lib.new_mat(name)
    uv = N(nt, "ShaderNodeUVMap")
    t = N(nt, "ShaderNodeTexImage")
    t.image = lib.img(colour, True)
    L(nt, uv.outputs[0], t.inputs["Vector"])
    # mud and dust on lower legs and everything a little dirty
    L(nt, t.outputs["Color"], bsdf.inputs["Base Color"])
    if normal and os.path.exists(normal):
        tn = N(nt, "ShaderNodeTexImage")
        tn.image = lib.img(normal, False)
        L(nt, uv.outputs[0], tn.inputs["Vector"])
        nm = N(nt, "ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.8
        L(nt, tn.outputs["Color"], nm.inputs["Color"])
        L(nt, nm.outputs[0], bsdf.inputs["Normal"])
    if spec and os.path.exists(spec):
        ts = N(nt, "ShaderNodeTexImage")
        ts.image = lib.img(spec, False)
        L(nt, uv.outputs[0], ts.inputs["Vector"])
        L(nt, lib.maprange(nt, ts.outputs["Color"], 0, 1, 0.95, rough_base - 0.35, smooth=False), bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = rough_base
    return m


def load(name, recolour_to="olive", coll=None, **kw):
    pal = kw.get("recolour", recolour_to)
    d = os.path.join(RB, name)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(d, f"{name}.fbx"))
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == "ARMATURE"][0]
    mesh = [o for o in new if o.type == "MESH"][0]
    for o in new:
        if o.type == "EMPTY":
            bpy.data.objects.remove(o)
        elif o.animation_data:
            o.animation_data_clear()  # the FBX carries a take that would snap the avatar back to its origin
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    if coll:
        for o in (arm, mesh):
            for c in list(o.users_collection):
                c.objects.unlink(o)
            coll.objects.link(o)
    files = os.listdir(d)
    for slot in mesh.material_slots:
        base = slot.material.name.split(".")[0]  # e.g. sm004_body
        col = next((f for f in files if f.startswith(base + "_color")), None)
        if not col:
            continue
        cp = os.path.join(d, col)
        if col.endswith("_acu.tga") and pal:
            cp = recolour(cp, os.path.join(d, f"{base}_color_{pal}_v2.png"), PALETTES[pal])
        slot.material = material(base + "_m", cp, os.path.join(d, f"{base}_normal.tga"), os.path.join(d, f"{base}_specular.tga"), 0.8 if "head" not in base else 0.55)
    arm["mesh"] = mesh.name
    return arm


def R(arm, bone, x=0.0, y=0.0, z=0.0):
    pb = arm.pose.bones[bone]
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
    return pb


def key(arm, bones, frame):
    for b in bones:
        arm.pose.bones[b].keyframe_insert("rotation_euler", frame=frame)


# The FBX bones do not point head-to-tail along the limb, so each bone is aimed by the vector from its head to the
# head of a reference child (thigh -> calf, hand -> middle finger, head -> between the eyes).
REF = {
    "Bip01 Spine": "Bip01 Spine1", "Bip01 Spine1": "Bip01 Spine2", "Bip01 Spine2": "Bip01 Neck", "Bip01 Neck": "Bip01 Head",
    "Bip01 Head": ("Bip01 LEye", "Bip01 REye"),
}
for s_ in ("L", "R"):
    REF.update({
        f"Bip01 {s_} Thigh": f"Bip01 {s_} Calf", f"Bip01 {s_} Calf": f"Bip01 {s_} Foot", f"Bip01 {s_} Foot": f"Bip01 {s_} Toe0",
        f"Bip01 {s_} Clavicle": f"Bip01 {s_} UpperArm", f"Bip01 {s_} UpperArm": f"Bip01 {s_} Forearm",
        f"Bip01 {s_} Forearm": f"Bip01 {s_} Hand", f"Bip01 {s_} Hand": f"Bip01 {s_} Finger2",
    })
BODY = np.array([(0, -1, 0), (1, 0, 0), (0, 0, 1)], float)  # forward, left, up in world for the avatar at import


def _head(arm, b):
    return arm.pose.bones[b].matrix.translation.copy()


def aim(arm, bone, d):
    """Rotate `bone` about its head so its anatomical direction points along d = (forward, left, up)."""
    from mathutils import Vector

    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]
    pb.rotation_mode = "XYZ"
    ref = REF[bone]
    tgt = (_head(arm, ref[0]) + _head(arm, ref[1])) / 2 if isinstance(ref, tuple) else _head(arm, ref)
    cur = (tgt - pb.matrix.translation).normalized()
    R0 = arm.matrix_world.to_3x3().normalized()
    dw = BODY[0] * d[0] + BODY[1] * d[1] + BODY[2] * d[2]
    da = (R0.inverted() @ Vector(dw)).normalized()
    q = cur.rotation_difference(da)
    M = pb.matrix.copy()
    N_ = (q.to_matrix() @ M.to_3x3()).to_4x4()
    N_.translation = M.translation
    pb.matrix = N_


def apply(arm, pose):
    """pose: {bone: (forward, left, up)}; applied parent-first, before the avatar is moved or turned."""
    for b in ORDER:
        if b in pose:
            aim(arm, b, pose[b])
    bpy.context.view_layer.update()


ORDER = [
    "Bip01 Spine", "Bip01 Spine1", "Bip01 Spine2", "Bip01 Neck", "Bip01 Head",
    "Bip01 L Thigh", "Bip01 L Calf", "Bip01 L Foot", "Bip01 R Thigh", "Bip01 R Calf", "Bip01 R Foot",
    "Bip01 L Clavicle", "Bip01 L UpperArm", "Bip01 L Forearm", "Bip01 L Hand",
    "Bip01 R Clavicle", "Bip01 R UpperArm", "Bip01 R Forearm", "Bip01 R Hand",
]


def mirror(p):
    out = dict(p)
    for b, v in p.items():
        if " L " in b:
            out[b.replace(" L ", " R ")] = (v[0], -v[1], v[2])
    return out


# (forward, left, up). Sitting on the trench floor, back to the wall, knees up, forearms over the knees.
SIT = mirror({
    "Bip01 Spine": (-0.32, 0, 1),
    "Bip01 Spine1": (-0.18, 0, 1),
    "Bip01 Spine2": (-0.05, 0, 1),
    "Bip01 Neck": (0.25, 0, 1),
    "Bip01 Head": (1, 0, -0.1),
    "Bip01 L Thigh": (0.75, 0.18, 0.62),
    "Bip01 L Calf": (0.42, 0.04, -0.9),
    "Bip01 L Foot": (1, 0.1, -0.15),
    "Bip01 L UpperArm": (0.5, 0.12, -0.86),
    "Bip01 L Forearm": (0.92, -0.12, -0.2),
    "Bip01 L Hand": (0.45, -0.08, -0.9),
})
LOOK_UP = {"Bip01 Neck": (-0.1, 0, 1), "Bip01 Head": (0.35, 0.05, 1)}


def pose_sit_wall(arm):
    apply(arm, SIT)
    return arm


def apply_rel(arm, pose):
    """Apply a pose to an avatar that has already been moved/turned: directions stay in its own frame."""
    import math as _m

    z = arm.rotation_euler.z
    loc = arm.location.copy()
    arm.rotation_euler.z = -_m.pi / 2  # the import orientation BODY is defined for
    bpy.context.view_layer.update()
    apply(arm, pose)
    arm.rotation_euler.z = z
    arm.location = loc
    bpy.context.view_layer.update()
