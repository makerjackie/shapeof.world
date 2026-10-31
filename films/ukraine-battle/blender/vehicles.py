# Vehicles modelled from published dimensions and photographs (own work, no third-party meshes).
# Frame: forward +Y, up +Z, origin on the ground under the hull centre. Each builder returns the root empty;
# road wheels and the track phase can be animated with drive(vehicle, metres) per frame.
import math

import bpy
import numpy as np
from mathutils import Matrix, Vector

import lib
from lib import L, N


# ---------------------------------------------------------------- mesh helpers
def _obj(name, verts, faces, coll, mat=None, smooth=False, bevel=0.0, seg=2):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    if faces:
        import bmesh

        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if bevel > 0:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = seg
        b.limit_method = "ANGLE"
        b.angle_limit = math.radians(30)
        b.harden_normals = False
    return o


def prism_x(name, prof, x0, x1, coll, mat, bevel=0.02):
    """Side profile [(y, z)...] (counter-clockwise seen from +X) extruded from x0 to x1."""
    n = len(prof)
    V = [(x0, y, z) for y, z in prof] + [(x1, y, z) for y, z in prof]
    F = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    return _obj(name, V, F, coll, mat, bevel=bevel)


def prism_z(name, plan, z0, ztop, coll, mat, bevel=0.02, shrink=0.0):
    """Plan polygon [(x, y)...] (counter-clockwise from above) from z0 up to ztop (a number or one per point);
    `shrink` pulls the top in towards the centroid (sloped sides)."""
    n = len(plan)
    zt = ztop if isinstance(ztop, (list, tuple)) else [ztop] * n
    c = np.mean(np.array(plan), 0)
    top = [(c + (np.array(p) - c) * (1 - shrink)) for p in plan]
    V = [(x, y, z0) for x, y in plan] + [(t[0], t[1], z) for t, z in zip(top, zt)]
    F = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    return _obj(name, V, F, coll, mat, bevel=bevel)


def box(name, size, loc, coll, mat, rot=(0, 0, 0), bevel=0.015):
    sx, sy, sz = (s / 2 for s in size)
    V = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    o = _obj(name, V, F, coll, mat, bevel=bevel)
    o.location = loc
    o.rotation_euler = rot
    return o


def cyl(name, r, length, loc, coll, mat, axis="X", verts=24, r2=None, bevel=0.0):
    """Cylinder (or cone frustum with r2) along an axis, centred at loc."""
    r2 = r if r2 is None else r2
    V = []
    for end, rr in ((-length / 2, r), (length / 2, r2)):
        for k in range(verts):
            a = 2 * math.pi * k / verts
            V.append((end, math.cos(a) * rr, math.sin(a) * rr))
    F = [list(range(verts))[::-1], list(range(verts, 2 * verts))]
    for k in range(verts):
        j = (k + 1) % verts
        F.append([k, j, verts + j, verts + k])
    o = _obj(name, V, F, coll, mat, smooth=True, bevel=bevel)
    o.location = loc
    o.rotation_euler = {"X": (0, 0, 0), "Y": (0, 0, math.pi / 2), "Z": (0, -math.pi / 2, 0)}[axis]
    return o


def wheel(name, r, w, coll, mat_hub, mat_tyre, spokes=0, dish=0.03):
    """A road wheel: rubber tyre ring plus a dished hub, axis X, at the origin."""
    parts = []
    parts.append(cyl(name + "_tyre", r, w, (0, 0, 0), coll, mat_tyre, "X", 32, bevel=0.01))
    parts.append(cyl(name + "_disc", r * 0.84, w + 0.02, (0, 0, 0), coll, mat_hub, "X", 32))
    parts.append(cyl(name + "_hub", r * 0.32, w + 0.07, (0, 0, 0), coll, mat_hub, "X", 16, r2=r * 0.22))
    for k in range(6):  # bolts
        a = 2 * math.pi * k / 6
        parts.append(cyl(name + f"_b{k}", 0.018, w + 0.09, (0, math.cos(a) * r * 0.2, math.sin(a) * r * 0.2), coll, mat_hub, "X", 8))
    return join(parts, name)


def join(parts, name):
    for o in parts:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            with bpy.context.temp_override(object=o, active_object=o):
                bpy.ops.object.modifier_apply(modifier=m.name)
    with bpy.context.temp_override(active_object=parts[0], selected_editable_objects=parts, selected_objects=parts):
        bpy.ops.object.join()
    o = parts[0]
    o.name = name
    with bpy.context.temp_override(object=o, active_object=o, selected_editable_objects=[o], selected_objects=[o]):
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


# ---------------------------------------------------------------- materials
def paint(name, scheme="nato3", dust=0.28, mud=0.55, seed=0.0):
    """Camouflage paint with dust on top surfaces, mud low down, darker in the crevices, worn edges."""
    m, nt, bsdf, out = lib.new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord")
    mp = N(nt, "ShaderNodeMapping")
    mp.inputs["Location"].default_value = (seed * 13.1, seed * 7.7, 0)
    L(nt, tc.outputs["Object"], mp.inputs["Vector"])
    co = mp.outputs[0]
    if scheme == "nato3":
        cols = [(0.045, 0.062, 0.032, 1), (0.062, 0.045, 0.028, 1), (0.014, 0.014, 0.012, 1)]  # green, brown, black
    elif scheme == "green":
        cols = [(0.06, 0.08, 0.045, 1), (0.055, 0.072, 0.042, 1), (0.05, 0.065, 0.04, 1)]
    else:  # russian green with a lighter tone
        cols = [(0.07, 0.085, 0.045, 1), (0.06, 0.07, 0.04, 1), (0.08, 0.09, 0.055, 1)]
    n1 = N(nt, "ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 0.42
    n1.inputs["Detail"].default_value = 2
    n1.inputs["Roughness"].default_value = 0.5
    n1.inputs["Distortion"].default_value = 0.3
    L(nt, co, n1.inputs["Vector"])
    n2 = N(nt, "ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 0.55
    n2.inputs["Detail"].default_value = 3
    L(nt, co, n2.inputs["Vector"])
    def step(fac, t):
        r = N(nt, "ShaderNodeValToRGB")
        r.color_ramp.interpolation = "CONSTANT"
        r.color_ramp.elements[0].position = 0.0
        r.color_ramp.elements[0].color = (0, 0, 0, 1)
        r.color_ramp.elements[1].position = t
        r.color_ramp.elements[1].color = (1, 1, 1, 1)
        L(nt, fac, r.inputs[0])
        return r.outputs[0]

    c = lib.mixc(nt, step(n1.outputs["Fac"], 0.5), cols[0], cols[1])
    c = lib.mixc(nt, step(n2.outputs["Fac"], 0.585), c, cols[2])
    # fine grime
    g = N(nt, "ShaderNodeTexNoise")
    g.inputs["Scale"].default_value = 9
    g.inputs["Detail"].default_value = 8
    L(nt, co, g.inputs["Vector"])
    c = lib.mixc(nt, lib.math_(nt, "MULTIPLY", g.outputs["Fac"], 0.35), c, (0.03, 0.028, 0.022, 1))
    # dust on upward faces
    geo = N(nt, "ShaderNodeNewGeometry")
    sep = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, geo.outputs["Normal"], sep.inputs[0])
    dn = N(nt, "ShaderNodeTexNoise")
    dn.inputs["Scale"].default_value = 2.5
    dn.inputs["Detail"].default_value = 6
    L(nt, co, dn.inputs["Vector"])
    up = lib.math_(nt, "MULTIPLY", lib.maprange(nt, sep.outputs[2], 0.55, 0.95), lib.maprange(nt, dn.outputs["Fac"], 0.35, 0.65))
    c = lib.mixc(nt, lib.math_(nt, "MULTIPLY", up, dust), c, (0.15, 0.135, 0.11, 1))
    # mud and dust low down (world height)
    sepw = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, geo.outputs["Position"], sepw.inputs[0])
    obj = N(nt, "ShaderNodeObjectInfo")
    sepo = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, obj.outputs["Location"], sepo.inputs[0])
    hz = lib.math_(nt, "SUBTRACT", sepw.outputs[2], sepo.outputs[2])
    low = lib.math_(nt, "MULTIPLY", lib.maprange(nt, lib.math_(nt, "ADD", hz, lib.math_(nt, "MULTIPLY", dn.outputs["Fac"], 0.5)), 1.2, 0.55), mud)
    c = lib.mixc(nt, low, c, (0.055, 0.047, 0.037, 1))
    # crevices darker
    ao = N(nt, "ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = 0.35
    c2 = lib.mixc(nt, 1.0, c, (0, 0, 0, 1))
    c2.node.blend_type = "MULTIPLY"
    L(nt, ao.outputs["AO"], c2.node.inputs[7])
    c = lib.mixc(nt, 0.55, c, c2)
    L(nt, c, bsdf.inputs["Base Color"])
    L(nt, lib.mixf(nt, up, 0.62, 0.85), bsdf.inputs["Roughness"])
    bmp = N(nt, "ShaderNodeBump")
    bmp.inputs["Strength"].default_value = 0.12
    L(nt, g.outputs["Fac"], bmp.inputs["Height"])
    L(nt, bmp.outputs[0], bsdf.inputs["Normal"])
    return m


def flat(name, col, rough=0.6, metal=0.0):
    m, nt, bsdf, out = lib.new_mat(name)
    bsdf.inputs["Base Color"].default_value = (*col, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


# ---------------------------------------------------------------- track (geometry nodes along a loop)
def track_loop(wheels, sprocket, idler, rollers, thick=0.08):
    """Closed polyline (y, z) of the track centre line around sprocket, wheels, idler and return rollers."""
    pts = []
    # bottom run under the wheels (front to back), then up around the sprocket (rear), top run, idler (front)
    ys = sorted([w[0] for w in wheels], reverse=True)
    rw = wheels[0][2]
    zb = thick / 2
    for y in ys:
        pts.append((y, zb))
    sy, sz, sr = sprocket
    a0 = math.atan2(zb - sz, ys[-1] - sy)
    for a in np.linspace(a0, math.pi / 2 + math.pi * 0.0 + math.pi * 0.5, 14):  # around the back
        pts.append((sy + (sr + thick / 2) * math.cos(a), sz + (sr + thick / 2) * math.sin(a)))
    top = [(r[0], r[1] + r[2] + thick / 2) for r in sorted(rollers)]
    pts += top
    iy, iz, ir = idler
    a1 = math.atan2(zb - iz, ys[0] - iy)
    for a in np.linspace(math.pi / 2, a1 + 2 * math.pi if a1 < 0 else a1, 14):
        pts.append((iy + (ir + thick / 2) * math.cos(a), iz + (ir + thick / 2) * math.sin(a)))
    # densify with straight segments and a little sag on the top run
    P = np.array(pts)
    out = []
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        n = max(1, int(np.linalg.norm(b - a) / 0.05))
        for k in range(n):
            out.append(a + (b - a) * k / n)
    return np.array(out)


def track_object(name, loop, x, width, coll, link_mat, pad_mat, pitch=0.165):
    """Track links instanced along the loop by geometry nodes; input 'Phase' (metres) scrolls them."""
    # the loop as a curve object (poly), in the vehicle frame
    cd = bpy.data.curves.new(name + "_path", "CURVE")
    cd.dimensions = "3D"
    sp = cd.splines.new("POLY")
    sp.points.add(len(loop) - 1)
    for i, (y, z) in enumerate(loop):
        sp.points[i].co = (x, y, z, 1)
    sp.use_cyclic_u = True
    path = bpy.data.objects.new(name + "_path", cd)
    coll.objects.link(path)
    # one link: plate with a guide horn and grousers
    parts = [box(name + "_plate", (width, pitch * 0.92, 0.045), (0, 0, 0), coll, link_mat, bevel=0.008)]
    parts.append(box(name + "_horn", (0.05, pitch * 0.5, 0.11), (0, 0, 0.07), coll, link_mat, bevel=0.01))
    parts.append(box(name + "_pad1", (width * 0.38, pitch * 0.7, 0.03), (-width * 0.27, 0, -0.035), coll, pad_mat, bevel=0.006))
    parts.append(box(name + "_pad2", (width * 0.38, pitch * 0.7, 0.03), (width * 0.27, 0, -0.035), coll, pad_mat, bevel=0.006))
    parts.append(box(name + "_end1", (0.05, pitch * 0.98, 0.06), (-width / 2, 0, 0), coll, link_mat, bevel=0.008))
    parts.append(box(name + "_end2", (0.05, pitch * 0.98, 0.06), (width / 2, 0, 0), coll, link_mat, bevel=0.008))
    link = join(parts, name + "_link")
    link.hide_render = True
    link.hide_viewport = True
    # perimeter of the loop -> number of links
    per = float(np.sum(np.linalg.norm(np.diff(np.vstack([loop, loop[:1]]), axis=0), axis=1)))
    nlinks = int(round(per / pitch))
    ng = bpy.data.node_groups.new(name + "_gn", "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ph = ng.interface.new_socket(name="Phase", in_out="INPUT", socket_type="NodeSocketFloat")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nd = ng.nodes
    gi = nd.new("NodeGroupInput")
    go = nd.new("NodeGroupOutput")
    oi = nd.new("GeometryNodeObjectInfo")
    oi.inputs["Object"].default_value = path
    oi.transform_space = "RELATIVE"
    pts = nd.new("GeometryNodePoints")
    pts.inputs["Count"].default_value = nlinks
    idx = nd.new("GeometryNodeInputIndex")
    # factor = fract(index / n + phase / perimeter)
    m1 = nd.new("ShaderNodeMath")
    m1.operation = "DIVIDE"
    ng.links.new(idx.outputs[0], m1.inputs[0])
    m1.inputs[1].default_value = nlinks
    m2 = nd.new("ShaderNodeMath")
    m2.operation = "DIVIDE"
    ng.links.new(gi.outputs["Phase"], m2.inputs[0])
    m2.inputs[1].default_value = per
    m3 = nd.new("ShaderNodeMath")
    m3.operation = "ADD"
    ng.links.new(m1.outputs[0], m3.inputs[0])
    ng.links.new(m2.outputs[0], m3.inputs[1])
    m4 = nd.new("ShaderNodeMath")
    m4.operation = "FRACT"
    ng.links.new(m3.outputs[0], m4.inputs[0])
    sc_ = nd.new("GeometryNodeSampleCurve")
    sc_.mode = "FACTOR"
    ng.links.new(oi.outputs["Geometry"], sc_.inputs["Curves"])
    ng.links.new(m4.outputs[0], sc_.inputs["Factor"])
    setp = nd.new("GeometryNodeSetPosition")
    ng.links.new(pts.outputs[0], setp.inputs["Geometry"])
    ng.links.new(sc_.outputs["Position"], setp.inputs["Position"])
    # rotation: link's Y along the tangent, its Z along the outward normal of the loop (in the YZ plane)
    al = nd.new("FunctionNodeAlignRotationToVector")
    al.axis = "Y"
    ng.links.new(sc_.outputs["Tangent"], al.inputs["Vector"])
    al2 = nd.new("FunctionNodeAlignRotationToVector")
    al2.axis = "X"
    al2.pivot_axis = "Y"
    ng.links.new(al.outputs[0], al2.inputs["Rotation"])
    al2.inputs["Vector"].default_value = (-1, 0, 0)
    li = nd.new("GeometryNodeObjectInfo")
    li.inputs["Object"].default_value = link
    li.inputs["As Instance"].default_value = True
    ip = nd.new("GeometryNodeInstanceOnPoints")
    ng.links.new(setp.outputs[0], ip.inputs["Points"])
    ng.links.new(li.outputs["Geometry"], ip.inputs["Instance"])
    ng.links.new(al2.outputs[0], ip.inputs["Rotation"])
    ng.links.new(ip.outputs[0], go.inputs[0])
    holder = _obj(name, [(0, 0, 0)], [], coll)
    mod = holder.modifiers.new("track", "NODES")
    mod.node_group = ng
    path.hide_render = True
    return holder, mod, ph.identifier


# ---------------------------------------------------------------- Leopard 2A6
def leopard2a6(name="leo", coll=None, scheme="nato3", seed=0.0, plough=False, dust=0.28):
    coll = coll or lib.collection(name)
    root = bpy.data.objects.new(name, None)
    coll.objects.link(root)
    P = paint(name + "_paint", scheme, dust=dust, seed=seed)
    steel = flat(name + "_steel", (0.035, 0.034, 0.032), 0.45, 0.6)
    rubber = flat(name + "_rubber", (0.02, 0.02, 0.02), 0.85)
    glass = flat(name + "_glass", (0.01, 0.015, 0.02), 0.05, 0.0)
    dark = flat(name + "_dark", (0.012, 0.012, 0.011), 0.7)
    parts = []
    # lower hull between the tracks, with the glacis
    hull = [(-3.84, 0.56), (3.5, 0.56), (3.92, 0.97), (3.92, 1.06), (2.62, 1.38), (-3.86, 1.38), (-3.86, 0.72)]
    parts.append(prism_x("hull", hull, -1.12, 1.12, coll, P, 0.03))
    # sponsons over the tracks
    spon = [(-3.86, 1.12), (3.64, 1.12), (2.62, 1.38), (-3.86, 1.38)]
    parts.append(prism_x("sponL", spon, -1.76, -1.12, coll, P, 0.02))
    parts.append(prism_x("sponR", spon, 1.12, 1.76, coll, P, 0.02))
    # rear plate details, engine deck grilles
    for k in range(5):
        parts.append(box(f"grille{k}", (2.3, 0.18, 0.03), (0, -1.8 - k * 0.38, 1.395), coll, dark, bevel=0.005))
    parts.append(box("tailbox", (2.6, 0.3, 0.45), (0, -3.95, 1.05), coll, P))
    # side skirts: armoured front section, thinner rear
    for sx in (-1, 1):
        x = sx * 1.815
        sk = [(0.95, 0.72), (3.55, 0.72), (3.86, 1.08), (3.86, 1.3), (0.95, 1.3)]
        parts.append(prism_x(f"skirtF{sx}", sk, x - 0.05, x + 0.05, coll, P, 0.015))
        sk2 = [(-3.62, 0.76), (0.95, 0.76), (0.95, 1.3), (-3.62, 1.3)]
        parts.append(prism_x(f"skirtR{sx}", sk2, x - 0.025, x + 0.025, coll, P, 0.01))
        for k in range(6):  # skirt section seams
            parts.append(box(f"seam{sx}{k}", (0.012, 0.02, 0.56), (x + sx * 0.03, -3.0 + k * 0.75, 1.03), coll, dark, bevel=0.0))
        parts.append(cyl(f"light{sx}", 0.08, 0.12, (sx * 1.45, 3.82, 1.2), coll, glass, "Y", 16))
        parts.append(cyl(f"cable{sx}", 0.022, 4.2, (sx * 1.65, -1.2, 1.41), coll, steel, "Y", 8))
    # driver's hatch and periscopes
    parts.append(cyl("drvhatch", 0.32, 0.06, (-0.55, 2.35, 1.39), coll, P, "Z", 24))
    for k in range(3):
        parts.append(box(f"drvper{k}", (0.16, 0.06, 0.08), (-0.55 + (k - 1) * 0.18, 2.72, 1.38), coll, glass, bevel=0.005))
    hull_o = join(parts, name + "_hull")
    hull_o.parent = root

    # turret (2A6: wedge add-on armour on the front)
    T = []
    tz0 = 1.4
    body = [(-1.62, 1.55), (1.62, 1.55), (1.72, -0.9), (1.42, -2.55), (-1.42, -2.55), (-1.72, -0.9)]
    T.append(prism_z("tbody", body, tz0, 2.36, coll, P, 0.03, shrink=0.03))
    for sx in (-1, 1):
        wedge = [(sx * 0.44, 1.5), (sx * 1.7, 1.5), (sx * 1.02, 2.72)] if sx > 0 else [(sx * 1.7, 1.5), (sx * 0.44, 1.5), (sx * 1.02, 2.72)]
        zt = [2.3, 2.3, 2.12] if sx > 0 else [2.3, 2.3, 2.12]
        T.append(prism_z(f"wedge{sx}", wedge, 1.47, zt, coll, P, 0.025))
        # smoke dischargers
        for k in range(4):
            T.append(cyl(f"smoke{sx}{k}", 0.045, 0.32, (sx * 1.78, -0.35 - k * 0.11, 2.1), coll, steel, "Z", 12).copy() if False else cyl(f"smoke{sx}{k}", 0.045, 0.32, (sx * 1.8, -0.35 - k * 0.12, 2.12), coll, dark, "X", 12))
    T.append(box("mantlet", (0.86, 0.5, 0.66), (0, 1.78, 1.93), coll, P))
    # roof: hatches, gunner's sight (EMES), commander's PERI
    T.append(cyl("cmdhatch", 0.36, 0.14, (0.62, -0.1, 2.42), coll, P, "Z", 28))
    T.append(cyl("ldrhatch", 0.34, 0.08, (-0.62, -0.1, 2.39), coll, P, "Z", 28))
    T.append(prism_z("emes", [(0.62, 0.95), (1.18, 0.95), (1.18, 1.5), (0.62, 1.5)], 2.34, [2.62, 2.62, 2.5, 2.5], coll, P, 0.02))
    T.append(box("emesglass", (0.4, 0.02, 0.1), (0.9, 1.51, 2.42), coll, glass, bevel=0.0))
    T.append(cyl("peribase", 0.16, 0.25, (0.25, 0.35, 2.48), coll, P, "Z", 20))
    T.append(box("perihead", (0.34, 0.42, 0.26), (0.25, 0.38, 2.72), coll, P, bevel=0.03))
    T.append(box("periglass", (0.24, 0.02, 0.12), (0.25, 0.6, 2.74), coll, glass, bevel=0.0))
    # bustle basket and antennas
    for xx in np.linspace(-1.3, 1.3, 7):
        T.append(box(f"bask{xx:.1f}", (0.03, 0.03, 0.42), (xx, -2.95, 2.05), coll, steel, bevel=0.0))
    T.append(box("baskrim", (2.7, 0.03, 0.03), (0, -2.95, 2.26), coll, steel, bevel=0.0))
    T.append(box("baskbot", (2.7, 0.42, 0.03), (0, -2.76, 1.86), coll, steel, bevel=0.0))
    T.append(box("tarp", (2.2, 0.34, 0.26), (0, -2.78, 2.02), coll, flat(name + "_tarp", (0.06, 0.06, 0.04), 0.9), bevel=0.06))
    for sx in (-1, 1):
        T.append(cyl(f"ant{sx}", 0.008, 2.4, (sx * 0.95, -2.2, 3.55), coll, dark, "Z", 6))
    turret = join(T, name + "_turret")
    turret.parent = root
    turret.location = (0, 0, 0)
    # gun: L55 with thermal sleeve, fume extractor, muzzle reference sensor
    G = []
    gz = 1.93
    G.append(cyl("sleeve1", 0.12, 1.5, (0, 2.0 + 0.75, gz), coll, P, "Y", 24, r2=0.11))
    G.append(cyl("sleeve2", 0.105, 1.6, (0, 3.5 + 0.8, gz), coll, P, "Y", 24, r2=0.1))
    G.append(cyl("evac", 0.155, 0.62, (0, 4.35, gz), coll, P, "Y", 24, r2=0.15))
    G.append(cyl("sleeve3", 0.095, 3.1, (0, 5.1 + 1.55, gz), coll, P, "Y", 24, r2=0.088))
    G.append(cyl("muzzle", 0.092, 0.2, (0, 8.25, gz), coll, steel, "Y", 24))
    for k in range(4):
        G.append(box(f"band{k}", (0.24, 0.03, 0.24), (0, 2.6 + k * 1.45, gz), coll, dark, bevel=0.0))
    G.append(box("mrs", (0.06, 0.12, 0.06), (0, 8.18, gz + 0.12), coll, steel))
    gun = join(G, name + "_gun")
    gun.parent = turret

    # running gear
    WZ = 0.43
    wheels = [(y, WZ, 0.35) for y in (2.47, 1.65, 0.83, 0.01, -0.81, -1.63, -2.45)]
    sprocket = (-3.33, 0.62, 0.31)
    idler = (3.33, 0.62, 0.31)
    rollers = [(2.05, 0.99, 0.1), (0.62, 0.99, 0.1), (-0.8, 0.99, 0.1), (-2.2, 0.99, 0.1)]
    spinners = []
    for sx in (-1, 1):
        x = sx * 1.43
        for i, (y, z, r) in enumerate(wheels):
            for half in (-1, 1):  # double wheels
                w = wheel(f"{name}_rw{sx}{i}{half}", r, 0.23, coll, P, rubber)
                w.location = (x + half * 0.15, y, z)
                w.parent = root
                spinners.append((w, r))
        for (y, z, r), nm in ((sprocket, "spr"), (idler, "idl")):
            w = wheel(f"{name}_{nm}{sx}", r, 0.5, coll, P, steel)
            w.location = (x, y, z)
            w.parent = root
            spinners.append((w, r))
        for i, (y, z, r) in enumerate(rollers):
            w = cyl(f"{name}_rr{sx}{i}", r, 0.3, (x, y, z), coll, P, "X", 16)
            w.parent = root
            spinners.append((w, r))
    loop = track_loop(wheels, sprocket, idler, rollers)
    tracks = []
    for sx in (-1, 1):
        t, mod, key = track_object(f"{name}_track{sx}", loop, sx * 1.43, 0.635, coll, steel, rubber)
        t.parent = root
        for o in coll.objects:
            if o.name.startswith(f"{name}_track{sx}_path"):
                o.parent = root
        tracks.append((mod, key))
    if plough:
        pl = []
        for sx in (-1, 1):
            pl.append(box(f"blade{sx}", (1.0, 0.25, 0.6), (sx * 1.45, 4.55, 0.32), coll, steel, rot=(0.5, 0, 0), bevel=0.02))
            pl.append(box(f"arm{sx}", (0.12, 0.9, 0.12), (sx * 1.0, 4.0, 0.7), coll, P, rot=(-0.35, 0, 0)))
        pl.append(box("beam", (2.6, 0.16, 0.16), (0, 4.35, 0.62), coll, P))
        plo = join(pl, name + "_plough")
        plo.parent = root
    root["spinners"] = [w.name for w, r in spinners]
    root["radii"] = [r for w, r in spinners]
    root["tracks"] = [(m.id_data.name, m.name, k) for m, k in tracks]
    return root


def drive(root, dist, frame=None):
    """Turn wheels and scroll the tracks for `dist` metres travelled; keyframe at `frame` if given."""
    for nm, r in zip(root["spinners"], root["radii"]):
        o = bpy.data.objects[nm]
        o.rotation_euler.x = -dist / r
        if frame is not None:
            o.keyframe_insert("rotation_euler", index=0, frame=frame)
    for oname, mname, key in root["tracks"]:
        mod = bpy.data.objects[oname].modifiers[mname]
        getattr(mod.properties.inputs, key).value = -dist  # Blender 5: modifier inputs live in .properties.inputs
        if frame is not None:
            bpy.data.objects[oname].keyframe_insert(f'modifiers["{mname}"].properties.inputs.{key}.value', frame=frame)
