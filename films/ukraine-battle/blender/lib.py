# Shared helpers for the Blender scenes: meshes from numpy, Poly Haven materials with box projection, asset import,
# render settings. Assets live in ../assets (not in Git; fetch with tools/ph.py and the Rocketbox/Sketchfab notes in
# README.md).
import math
import os

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def args():
    import sys

    a = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = {}
    for i in range(0, len(a) - 1, 2):
        out[a[i].lstrip("-")] = a[i + 1]
    return out


# ---------------------------------------------------------------- meshes
def grid_mesh(name, X, Y, Z, coll=None):
    ny, nx = Z.shape
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).astype(np.float32)
    i = np.arange(nx * ny).reshape(ny, nx)
    quads = np.stack([i[:-1, :-1].ravel(), i[:-1, 1:].ravel(), i[1:, 1:].ravel(), i[1:, :-1].ravel()], 1)
    return mesh_from(name, verts, quads, coll)


def mesh_from(name, verts, faces, coll=None, smooth=True):
    me = bpy.data.meshes.new(name)
    verts = np.asarray(verts, np.float32)
    faces = np.asarray(faces, np.int32)
    n = faces.shape[1]
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(faces.size)
    me.loops.foreach_set("vertex_index", faces.ravel())
    me.polygons.add(len(faces))
    me.polygons.foreach_set("loop_start", np.arange(0, faces.size, n, dtype=np.int32))
    try:
        me.polygons.foreach_set("loop_total", np.full(len(faces), n, np.int32))
    except Exception:
        pass
    me.update(calc_edges=True)
    me.validate()
    if smooth:
        me.shade_smooth() if hasattr(me, "shade_smooth") else me.polygons.foreach_set("use_smooth", np.ones(len(faces), bool))
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


# ---------------------------------------------------------------- node helpers
def N(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def L(nt, a, b):
    nt.links.new(a, b)


def mixc(nt, fac, a, b):
    m = N(nt, "ShaderNodeMix", data_type="RGBA")
    _in(nt, m.inputs[0], fac)
    _in(nt, m.inputs[6], a)
    _in(nt, m.inputs[7], b)
    return m.outputs[2]


def mixf(nt, fac, a, b):
    m = N(nt, "ShaderNodeMix", data_type="FLOAT")
    _in(nt, m.inputs[0], fac)
    _in(nt, m.inputs[2], a)
    _in(nt, m.inputs[3], b)
    return m.outputs[0]


def math_(nt, op, a, b=None, clamp=False):
    m = N(nt, "ShaderNodeMath", operation=op, use_clamp=clamp)
    _in(nt, m.inputs[0], a)
    if b is not None:
        _in(nt, m.inputs[1], b)
    return m.outputs[0]


def maprange(nt, x, a, b, c=0.0, d=1.0, smooth=True):
    m = N(nt, "ShaderNodeMapRange", interpolation_type="SMOOTHSTEP" if smooth else "LINEAR", clamp=True)
    _in(nt, m.inputs[0], x)
    m.inputs[1].default_value = a
    m.inputs[2].default_value = b
    m.inputs[3].default_value = c
    m.inputs[4].default_value = d
    return m.outputs[0]


def _in(nt, sock, v):
    if hasattr(v, "is_output") or type(v).__name__.startswith("NodeSocket"):
        nt.links.new(v, sock)
    else:
        sock.default_value = v


def img(path, colour=True):
    im = bpy.data.images.load(path, check_existing=True)
    if not colour:
        im.colorspace_settings.name = "Non-Color"
    return im


def tfile(name, m):
    d = os.path.join(A, "tex", name)
    for ext in ("jpg", "png"):
        p = os.path.join(d, f"{m}.{ext}")
        if os.path.exists(p):
            return p
    return None


def texset(nt, name, size, coord, blend=0.25, rot=0.0):
    """Box-projected diffuse/rough/disp of a Poly Haven texture at `size` metres per tile."""
    mp = N(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size, 1 / size, 1 / size)
    mp.inputs["Rotation"].default_value = (0, 0, rot)
    L(nt, coord, mp.inputs["Vector"])
    out = {}
    for m, cs in (("diff", True), ("rough", False), ("disp", False)):
        p = tfile(name, m)
        if not p:
            continue
        t = N(nt, "ShaderNodeTexImage", projection="BOX", projection_blend=blend)
        t.image = img(p, cs)
        L(nt, mp.outputs[0], t.inputs["Vector"])
        out[m] = t.outputs["Color"]
    return out


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = N(nt, "ShaderNodeOutputMaterial")
    bsdf = N(nt, "ShaderNodeBsdfPrincipled")
    L(nt, bsdf.outputs[0], out.inputs["Surface"])
    return m, nt, bsdf, out


def simple_pbr(name, tex, size=1.0, tint=None, bump=0.4, rough_add=0.0, coord="Object"):
    m, nt, bsdf, out = new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord")
    s = texset(nt, tex, size, tc.outputs[coord])
    col = s["diff"]
    if tint:
        col = mixc(nt, 1.0, col, (0, 0, 0, 1))
        mm = col.node
        mm.blend_type = "MULTIPLY"
        mm.inputs[7].default_value = (*tint, 1)
        L(nt, s["diff"], mm.inputs[6])
    L(nt, col, bsdf.inputs["Base Color"])
    if "rough" in s:
        L(nt, math_(nt, "ADD", s["rough"], rough_add, clamp=True), bsdf.inputs["Roughness"])
    if "disp" in s:
        b = N(nt, "ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = size * 0.05
        L(nt, s["disp"], b.inputs["Height"])
        L(nt, b.outputs[0], bsdf.inputs["Normal"])
    return m


# ---------------------------------------------------------------- assets
def import_gltf(path, coll=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    if coll:
        for o in new:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            coll.objects.link(o)
    return new


def ph_model(name, coll=None):
    d = os.path.join(A, "models", name)
    f = [x for x in os.listdir(d) if x.endswith(".gltf")][0]
    return import_gltf(os.path.join(d, f), coll)


def hide_collection(c):
    """Keep a source collection out of the render while particle systems can still instance it."""

    def find(lc):
        if lc.collection == c:
            return lc
        for ch in lc.children:
            r = find(ch)
            if r:
                return r

    lc = find(bpy.context.view_layer.layer_collection)
    if lc:
        lc.exclude = True


# ---------------------------------------------------------------- world, render
def world_hdri(name, strength=1.0, rot=0.0, fog=0.0, fog_col=(0.75, 0.78, 0.8), anis=0.3):
    w = bpy.data.worlds.new("world")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = N(nt, "ShaderNodeOutputWorld")
    bg = N(nt, "ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    env = N(nt, "ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(A, "hdri", name))
    mp = N(nt, "ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, rot)
    tc = N(nt, "ShaderNodeTexCoord")
    L(nt, tc.outputs["Generated"], mp.inputs["Vector"])
    L(nt, mp.outputs[0], env.inputs["Vector"])
    L(nt, env.outputs[0], bg.inputs["Color"])
    L(nt, bg.outputs[0], out.inputs["Surface"])
    if fog > 0:
        fog_box(fog, fog_col, anis)
    return w


def fog_box(density, col=(0.78, 0.8, 0.82), anis=0.3, size=(400, 400, 80), loc=(0, 0, 30), name="fog"):
    """A volume domain for haze (EEVEE's world volume blacks out the HDRI)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    m, nt, bsdf, out = new_mat(name)
    nt.nodes.remove(bsdf)
    v = N(nt, "ShaderNodeVolumePrincipled")
    v.inputs["Density"].default_value = density
    v.inputs["Color"].default_value = (*col, 1)
    v.inputs["Anisotropy"].default_value = anis
    L(nt, v.outputs[0], out.inputs["Volume"])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def render_settings(w=1920, h=1080, fps=24, samples=64, look="AgX - Medium High Contrast", exposure=0.0):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.fps = fps
    e = sc.eevee
    for k, v in dict(
        taa_render_samples=samples,
        use_raytracing=True,
        use_shadows=True,
        shadow_ray_count=2,
        shadow_step_count=8,
        volumetric_tile_size="4",
        volumetric_samples=96,
        volumetric_end=400.0,
        use_volumetric_shadows=True,
        fast_gi_method="GLOBAL_ILLUMINATION",
        use_fast_gi=True,
    ).items():
        try:
            setattr(e, k, v)
        except Exception as ex:
            print("eevee setting skipped", k, ex)
    try:
        e.ray_tracing_options.resolution_scale = "1"
        e.ray_tracing_method = "SCREEN"
    except Exception:
        pass
    vs = sc.view_settings
    vs.view_transform = "AgX"
    try:
        vs.look = look
    except Exception:
        pass
    vs.exposure = exposure
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 94


def camera(name, loc, target, lens=35, fstop=None, focus=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.clip_start = 0.05
    cd.clip_end = 3000
    ob = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = focus or (np.linalg.norm(np.array(target) - np.array(loc)))
    return ob


def look_at(ob, target, roll=0.0):
    from mathutils import Vector

    d = Vector(target) - ob.location
    q = d.to_track_quat("-Z", "Y")
    ob.rotation_mode = "XYZ"
    ob.rotation_euler = q.to_euler()
    ob.rotation_euler.rotate_axis("Z", roll)


def sun(angle_deg=12, az_deg=120, strength=2.0, col=(1.0, 0.86, 0.72), soft=2.0):
    ld = bpy.data.lights.new("sun", "SUN")
    ld.energy = strength
    ld.color = col
    ld.angle = math.radians(soft)
    ob = bpy.data.objects.new("sun", ld)
    bpy.context.scene.collection.objects.link(ob)
    el = math.radians(angle_deg)
    az = math.radians(az_deg)
    ob.rotation_euler = (math.pi / 2 - el, 0, az + math.pi / 2)
    return ob


# ---------------------------------------------------------------- noise (numpy, deterministic)
def value_noise(x, y, scale, seed=0):
    rs = np.random.RandomState(seed)
    perm = rs.rand(256, 256).astype(np.float32)
    gx = x / scale
    gy = y / scale
    ix = np.floor(gx).astype(int)
    iy = np.floor(gy).astype(int)
    fx = gx - ix
    fy = gy - iy
    ux = fx * fx * (3 - 2 * fx)
    uy = fy * fy * (3 - 2 * fy)

    def h(a, b):
        return perm[a % 256, b % 256]

    a = h(ix, iy)
    b = h(ix + 1, iy)
    c = h(ix, iy + 1)
    d = h(ix + 1, iy + 1)
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy


def fbm(x, y, scale, oct=4, seed=0):
    s = 0
    amp = 1
    tot = 0
    for o in range(oct):
        s = s + amp * (value_noise(x, y, scale / 2**o, seed + o * 17) - 0.5)
        tot += amp
        amp *= 0.5
    return s / tot


def fcurves(action, path=None):
    """F-curves of an action (Blender 5 keeps them in layered channelbags)."""
    out = []
    if hasattr(action, "fcurves"):
        out = list(action.fcurves)
    else:
        for layer in action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out += list(cb.fcurves)
    return [f for f in out if path is None or f.data_path == path]


def x_up(objs):
    """Hair-particle instances point their local X along the surface normal: bake each source mesh so its up (Z)
    becomes X."""
    from mathutils import Matrix

    for o in objs:
        if o.type != "MESH":
            continue
        o.data = o.data.copy()
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
        o.data.transform(Matrix.Rotation(-math.pi / 2, 4, "Y"))


def scatter(obj, coll, density, attr, seed=0, scale=(0.8, 1.2), tilt=0.06, name="scatter"):
    """Geometry-nodes scatter: instances of `coll` (picked at random, Z up) on obj's faces, `density` per m2 times
    the float attribute / vertex group `attr`. The emitter itself is not rendered."""
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nd = ng.nodes
    gi = nd.new("NodeGroupInput")
    go = nd.new("NodeGroupOutput")
    na = nd.new("GeometryNodeInputNamedAttribute")
    na.data_type = "FLOAT"
    na.inputs["Name"].default_value = attr
    mul = nd.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = density
    ng.links.new(na.outputs["Attribute"], mul.inputs[0])
    dp = nd.new("GeometryNodeDistributePointsOnFaces")
    dp.distribute_method = "RANDOM"
    ng.links.new(gi.outputs[0], dp.inputs["Mesh"])
    ng.links.new(mul.outputs[0], dp.inputs["Density"])
    dp.inputs["Seed"].default_value = seed
    ci = nd.new("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = coll
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    ip = nd.new("GeometryNodeInstanceOnPoints")
    ng.links.new(dp.outputs["Points"], ip.inputs["Points"])
    ng.links.new(ci.outputs[0], ip.inputs["Instance"])
    ip.inputs["Pick Instance"].default_value = True
    ri = nd.new("FunctionNodeRandomValue")
    ri.data_type = "INT"
    ri.inputs["Min"].default_value = 0
    ri.inputs["Max"].default_value = 999
    ri.inputs["Seed"].default_value = seed + 1
    ng.links.new(ri.outputs[0], ip.inputs["Instance Index"])
    rr = nd.new("FunctionNodeRandomValue")
    rr.data_type = "FLOAT_VECTOR"
    rr.inputs["Min"].default_value = (-tilt, -tilt, 0)
    rr.inputs["Max"].default_value = (tilt, tilt, 6.283)
    rr.inputs["Seed"].default_value = seed + 2
    er = nd.new("FunctionNodeEulerToRotation")
    ng.links.new(rr.outputs[0], er.inputs[0])
    ng.links.new(er.outputs[0], ip.inputs["Rotation"])
    rsz = nd.new("FunctionNodeRandomValue")
    rsz.data_type = "FLOAT"
    rsz.inputs["Min"].default_value = scale[0]
    rsz.inputs["Max"].default_value = scale[1]
    rsz.inputs["Seed"].default_value = seed + 3
    ng.links.new(rsz.outputs[0], ip.inputs["Scale"])
    ng.links.new(ip.outputs[0], go.inputs[0])
    mod = obj.modifiers.new(name, "NODES")
    mod.node_group = ng
    return mod
