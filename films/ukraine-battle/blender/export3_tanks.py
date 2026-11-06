# The four Leopards of 样片E as glTF for the three.js renderer (src/e3): the procedural camo, dust, mud and
# crevice darkening are baked by Cycles into one texture per tank; wheels stay separate nodes so three.js can
# spin them; the track links are realised into static meshes.
# usage: blender -b -P blender/export3_tanks.py -- [--size 2048] [--only 0]
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
import vehicles  # noqa: E402

ARGS = lib.args()
OUT = os.path.join(lib.ROOT, "public", "e3")
os.makedirs(OUT, exist_ok=True)
SIZE = int(ARGS.get("size", 2048))
lib.reset()
sc = bpy.context.scene

# Cycles on the GPU for the bake
sc.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = "GPU"
except Exception as e:  # noqa: BLE001
    print("GPU not available, baking on the CPU:", e)
sc.cycles.samples = int(ARGS.get("samples", 24))
sc.render.bake.margin = 6


def descendants(o):
    out = []
    for c in o.children:
        out.append(c)
        out += descendants(c)
    return out


def realize(holder):
    """append a Realize Instances node to a geometry-nodes modifier so the evaluated mesh carries the links"""
    for m in holder.modifiers:
        if m.type == "NODES":
            ng = m.node_group
            go = [n for n in ng.nodes if n.type == "GROUP_OUTPUT"][0]
            src = go.inputs[0].links[0].from_socket
            ri = ng.nodes.new("GeometryNodeRealizeInstances")
            ng.links.new(src, ri.inputs[0])
            ng.links.new(ri.outputs[0], go.inputs[0])


def as_mesh(o, name, local):
    """a plain mesh copy of o (modifiers applied) with transform `local` (in the tank's frame)"""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    n = bpy.data.objects.new(name, me)
    n.matrix_world = local
    return n


def flat(name, col, rough=0.7, metal=0.0):
    return vehicles.flat(name, col, rough, metal)


HUB = flat("x_hub", (0.05, 0.056, 0.036), 0.75)
TYRE = flat("x_tyre", (0.022, 0.022, 0.022), 0.9)
STEEL = flat("x_track", (0.05, 0.047, 0.043), 0.6, 0.6)

VC = lib.collection("column")
only = ARGS.get("only")
for k in range(4):
    if only is not None and int(only) != k:
        continue
    name = f"v{k}"
    v = vehicles.leopard2a6(name, VC, seed=k * 1.7, plough=k == 0, dust=0.12)
    v.location = (0, 0, 0)
    v.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    inv = v.matrix_world.inverted()
    spin = set(v["spinners"])
    track_holders = {t[0] for t in v["tracks"]}
    EX = lib.collection(f"x_{name}")
    body_parts, wheels, tracks = [], [], []
    for o in descendants(v):
        if o.type != "MESH" or o.hide_render:
            continue
        if o.name in spin:
            o.rotation_euler = (0, 0, 0)
            bpy.context.view_layer.update()
            w = as_mesh(o, o.name, inv @ o.matrix_world)
            w.data.materials.clear()
            # tyre faces are the outermost ring: colour by material index of the source (0 = tyre, others = hub)
            src_mats = [s.material.name if s.material else "" for s in o.material_slots]
            w.data.materials.append(TYRE)
            w.data.materials.append(HUB)
            for p in w.data.polygons:
                p.material_index = 0 if (p.material_index < len(src_mats) and "rubber" in src_mats[p.material_index].lower()) else 1
            EX.objects.link(w)
            wheels.append(w)
        elif o.name in track_holders:
            realize(o)
            bpy.context.view_layer.update()
            t = as_mesh(o, o.name, inv @ o.matrix_world)
            t.data.materials.clear()
            t.data.materials.append(STEEL)
            for p in t.data.polygons:
                p.material_index = 0
            EX.objects.link(t)
            tracks.append(t)
        else:
            b = as_mesh(o, o.name + "_x", inv @ o.matrix_world)
            EX.objects.link(b)
            body_parts.append(b)
    # one body mesh in the tank's frame
    with bpy.context.temp_override(active_object=body_parts[0], selected_editable_objects=body_parts, selected_objects=body_parts, object=body_parts[0]):
        bpy.ops.object.join()
    body = body_parts[0]
    body.name = name + "_body"
    with bpy.context.temp_override(object=body, active_object=body, selected_editable_objects=[body], selected_objects=[body]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # lift everything clear of anything else for the AO in the bake (object/space-relative shading is unaffected)
    print(name, "body faces", len(body.data.polygons), "wheels", len(wheels), "track faces", sum(len(t.data.polygons) for t in tracks))
    # UVs
    bpy.context.view_layer.objects.active = body
    for o in bpy.context.view_layer.objects:
        o.select_set(o == body)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    # bake the base colour (it includes the AO node of the paint)
    img = bpy.data.images.new(name + "_bake", SIZE, SIZE)
    targets = []
    for s in body.material_slots:
        m = s.material
        if m is None:
            continue
        t = m.node_tree.nodes.new("ShaderNodeTexImage")
        t.image = img
        m.node_tree.nodes.active = t
        targets.append((m, t))
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=6, use_clear=True)
    img.filepath_raw = os.path.join(OUT, f"tank_{name}.jpg")
    img.file_format = "JPEG"
    sc.render.image_settings.quality = 92
    img.save()
    for m, t in targets:
        m.node_tree.nodes.remove(t)
    # replace the body materials with the baked one
    bm, nt, bsdf, out = lib.new_mat(name + "_baked")
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.78
    body.data.materials.clear()
    body.data.materials.append(bm)
    for p in body.data.polygons:
        p.material_index = 0
    # a root empty at the origin with everything under it, then export
    root = bpy.data.objects.new(name, None)
    EX.objects.link(root)
    for o in [body] + wheels + tracks:
        mw = o.matrix_world.copy()
        o.parent = root
        o.matrix_world = mw
    for o in bpy.context.view_layer.objects:
        o.select_set(o in [root, body] + wheels + tracks)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f"tank_{name}.glb"),
        use_selection=True,
        export_format="GLB",
        export_yup=False,
        export_apply=False,
        export_animations=False,
        export_image_format="JPEG",
        export_texcoords=True,
        export_normals=True,
    )
    print("wrote", f"tank_{name}.glb")
