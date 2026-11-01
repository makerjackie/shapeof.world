# Hands the 样片E scene from battlefield.py to the three.js renderer (src/e3) without rendering anything:
#  - every run (one per shot): shot_<S>.json with, per frame, the camera, the four tanks, the volumes' keyed values
#  - with --export3static 1: scene.json (constants, sun, sky), the detailed patch (heights + crater/rim/lane/edge),
#    tree and wheat placements and their meshes (GLB, Z up).
# Called at the end of battlefield.py with --export3 1 (and --mode none).
import json
import math
import os

import bpy
import numpy as np

import lib


def mat16(m):
    """column-major, as three.js Matrix4.fromArray expects"""
    return [round(m[r][c], 5) for c in range(4) for r in range(4)]


def node_val(obj, label):
    if not obj or not obj.data or not getattr(obj.data, "materials", None):
        return None
    for n in obj.data.materials[0].node_tree.nodes:
        if n.label == label:
            return round(float(n.outputs[0].default_value), 4)
    return None


def export_glb(objs, path):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB", export_yup=False, export_apply=True, export_animations=False, export_materials="PLACEHOLDER")


def run(g):
    sc = bpy.context.scene
    OUT = os.path.join(lib.ROOT, "public", "e3")
    os.makedirs(OUT, exist_ok=True)
    ARGS, shot = g["ARGS"], g["shot"]
    f0, f1 = g["SHOTS"][shot]
    cam, col = g["cam"], g["col"]
    LEAD = g["LEAD"]

    # ---------------------------------------------------------------- per frame
    frames = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        cd = cam.data
        row = {
            "f": f,
            "cam": mat16(cam.matrix_world),
            "lens": round(cd.lens, 3),
            "sensor": cd.sensor_width,
            "focus": round((LEAD.matrix_world.translation - cam.matrix_world.translation).length, 3) if cd.dof.use_dof else 0,
            "fstop": cd.dof.aperture_fstop if cd.dof.use_dof else 0,
            "tanks": [],
            "fx": {},
        }
        for v, stop in col:
            sp = bpy.data.objects[v["spinners"][0]]
            row["tanks"].append({"m": mat16(v.matrix_world), "dist": round(-sp.rotation_euler.x * v["radii"][0], 4)})
        for name in ["dust0", "dust1", "dust2", "dust3", "fireball", "earth", "tanksmoke"]:
            o = bpy.data.objects.get(name)
            if o:
                row["fx"][name] = {"m": mat16(o.matrix_world), "k": node_val(o, "k"), "e": node_val(o, "e")}
        fl = bpy.data.objects.get("flash")
        row["flash"] = round(fl.data.energy, 1) if fl else 0
        frames.append(row)
    json.dump({"shot": shot, "f0": f0, "f1": f1, "frames": frames}, open(os.path.join(OUT, f"shot_{shot}.json"), "w"), separators=(",", ":"))
    print("e3: wrote", f"shot_{shot}.json", len(frames), "frames")

    if ARGS.get("export3static", "0") != "1":
        return

    # ---------------------------------------------------------------- constants, sun and sky
    sun = bpy.data.objects.get("sun")
    sdir = sun.matrix_world.to_3x3() @ __import__("mathutils").Vector((0, 0, -1))  # direction the light travels
    wn = sc.world.node_tree.nodes
    env = [n for n in wn if n.type == "TEX_ENVIRONMENT"][0]
    mp = [n for n in wn if n.type == "MAPPING"][0]
    bg = [n for n in wn if n.type == "BACKGROUND"][0]
    px, py = g["px"], g["py"]
    meta = {
        "CX": g["CX"], "CY": g["CY"], "EXAG": g["EXAG"], "H0": g["H0"], "PATCH": g["PATCH"],
        "FX": [g["FX0"], g["FX1"], g["FY0"], g["FY1"]], "EXP": g["EXP"], "SHOTS": g["SHOTS"], "gz": g["gz"],
        "patch": {"x0": float(px[0]), "y0": float(py[0]), "nx": len(px), "ny": len(py), "step": 2.0},
        "sun": {"dir": [round(c, 5) for c in sdir], "strength": sun.data.energy, "color": list(sun.data.color), "angle": sun.data.angle},
        "sky": {"file": os.path.basename(env.image.filepath), "rot": mp.inputs["Rotation"].default_value[2], "strength": bg.inputs["Strength"].default_value},
        "tanks": [v.name for v, s in col],
        "radii": {v.name: list(v["radii"]) for v, s in col},
        "spinners": {v.name: list(v["spinners"]) for v, s in col},
    }
    json.dump(meta, open(os.path.join(OUT, "scene.json"), "w"), indent=1)

    # ---------------------------------------------------------------- the detailed patch
    PZ = g["PZ"].astype(np.float32)
    PZ.tofile(os.path.join(OUT, "patch.f32"))
    att = np.stack([np.clip(a, 0, 1) for a in (g["bowl"], g["rim"], g["lane"], g["edge"])], -1)
    (att * 255).round().astype(np.uint8).tofile(os.path.join(OUT, "patch_attr.u8"))
    print("e3: patch", PZ.shape)

    # ---------------------------------------------------------------- trees: placements + 4 variants
    rs = np.random.RandomState(9)
    pts, tz = g["pts"], g["tz"]
    n = len(pts)
    T = np.zeros((n, 7), np.float32)
    T[:, 0], T[:, 1], T[:, 2] = pts[:, 0], pts[:, 1], tz
    T[:, 3] = rs.uniform(0, 6.283, n)  # yaw
    T[:, 4] = rs.uniform(0.75, 1.35, n)  # scale
    T[:, 5] = rs.randint(0, 4, n)  # variant
    T[:, 6] = rs.uniform(0, 1, n)  # tint
    T.tofile(os.path.join(OUT, "trees.f32"))
    trees = [o for o in g["TREES"].objects if o.type == "MESH"]
    for o in trees:
        o.location = (0, 0, 0)
    # the source collection is excluded from the view layer; link the meshes to the scene to select them
    tmp = lib.collection("e3_tmp")
    tcopies = []
    for o in trees:
        c = o.copy()
        c.name = "tree_" + o.name
        tmp.objects.link(c)
        tcopies.append(c)
    print("e3: trees", n, [len(o.data.polygons) for o in trees])

    # ---------------------------------------------------------------- wheat: instances from the scatter + 4 plants
    dg = bpy.context.evaluated_depsgraph_get()
    plants = sorted(o.name for o in g["WC"].objects)
    W = []
    for inst in dg.object_instances:
        if inst.is_instance and inst.parent and inst.parent.original.name == "wheat_emitter":
            nm = inst.object.original.name
            if nm not in plants:
                continue
            m = inst.matrix_world
            t, q, s = m.decompose()
            W.append((t.x, t.y, t.z, q.x, q.y, q.z, q.w, s.z, plants.index(nm)))
    W = np.array(W, np.float32)
    W.tofile(os.path.join(OUT, "wheat.f32"))
    wcopies = []
    for nm in plants:
        c = bpy.data.objects[nm].copy()
        c.name = "wheat_" + nm
        c.location = (0, 0, 0)
        tmp.objects.link(c)
        wcopies.append(c)
    print("e3: wheat", len(W), "instances; plant faces", [len(bpy.data.objects[nm].data.polygons) for nm in plants])
    export_glb(tcopies, os.path.join(OUT, "trees.glb"))
    export_glb(wcopies, os.path.join(OUT, "wheat.glb"))
    print("e3: static done")
