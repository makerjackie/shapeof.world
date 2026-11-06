# White-hot thermal look: every material becomes an emission grey by how warm the thing is at dawn.
# People and the dugout door are warm, the ground cool, trees and sky cold. Cut-out materials keep their alpha.
import bpy

import lib
from lib import L, N

DEFAULT = {"terrain": 0.2, "timber": 0.16, "trunk": 0.1, "Plane": 0.12, "Cube": 0.14, "net": 0.24, "fog": None}


def _lin(g):
    return g**2.2


def _mat(name, g, var=0.06, alpha_src=None, wall_warm=False):
    m, nt, bsdf, out = lib.new_mat(name)
    nt.nodes.remove(bsdf)
    em = N(nt, "ShaderNodeEmission")
    tc = N(nt, "ShaderNodeTexCoord")
    nz = N(nt, "ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.6
    nz.inputs["Detail"].default_value = 6
    L(nt, tc.outputs["Object"], nz.inputs["Vector"])
    v = lib.math_(nt, "ADD", g, lib.math_(nt, "MULTIPLY", lib.math_(nt, "SUBTRACT", nz.outputs["Fac"], 0.5), var * 2))
    if wall_warm:  # trench walls and floor hold the night's warmth a little longer than the open field
        wa = N(nt, "ShaderNodeAttribute", attribute_name="wall")
        fl = N(nt, "ShaderNodeAttribute", attribute_name="floor")
        v = lib.math_(nt, "ADD", v, lib.math_(nt, "ADD", lib.math_(nt, "MULTIPLY", wa.outputs["Fac"], 0.09), lib.math_(nt, "MULTIPLY", fl.outputs["Fac"], 0.12)))
        cr = N(nt, "ShaderNodeAttribute", attribute_name="crater")
        v = lib.math_(nt, "ADD", v, lib.math_(nt, "MULTIPLY", cr.outputs["Fac"], 0.0))
    v = lib.math_(nt, "POWER", lib.math_(nt, "MAXIMUM", v, 0.0), 2.2)
    L(nt, v, em.inputs["Strength"])
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    if alpha_src is not None:
        mix = N(nt, "ShaderNodeMixShader")
        tr = N(nt, "ShaderNodeBsdfTransparent")
        L(nt, lib.math_(nt, "MULTIPLY", alpha_src(nt), 0.35), mix.inputs[0])  # ordinary nets do not stop heat
        L(nt, tr.outputs[0], mix.inputs[1])
        L(nt, em.outputs[0], mix.inputs[2])
        L(nt, mix.outputs[0], out.inputs["Surface"])
        m.surface_render_method = "DITHERED"
    else:
        L(nt, em.outputs[0], out.inputs["Surface"])
    return m


def _alpha_from(orig):
    """Rebuild the original material's alpha in the new tree by copying its node tree is costly; instead reuse
    the original node group: we link the original material as a node group is not possible, so copy nodes."""

    def build(nt):
        # copy all nodes feeding the original BSDF alpha
        src = orig.node_tree
        bs = [n for n in src.nodes if n.type == "BSDF_PRINCIPLED"][0]
        link = bs.inputs["Alpha"].links[0] if bs.inputs["Alpha"].links else None
        if not link:
            return 1.0
        cache = {}

        def clone(n):
            if n.name in cache:
                return cache[n.name]
            c = nt.nodes.new(n.bl_idname)
            for attr in ("image", "projection", "projection_blend", "interpolation", "extension", "uv_map", "attribute_name", "operation", "use_clamp", "data_type", "interpolation_type", "clamp", "wave_type", "bands_direction", "noise_dimensions", "feature", "distance", "blend_type"):
                if hasattr(n, attr):
                    try:
                        setattr(c, attr, getattr(n, attr))
                    except Exception:
                        pass
            for i, inp in enumerate(n.inputs):
                if inp.is_linked:
                    lk = inp.links[0]
                    up = clone(lk.from_node)
                    nt.links.new(up.outputs[list(lk.from_node.outputs).index(lk.from_socket)], c.inputs[i])
                elif hasattr(inp, "default_value"):
                    try:
                        c.inputs[i].default_value = inp.default_value
                    except Exception:
                        pass
            cache[n.name] = c
            return c

        up = clone(link.from_node)
        return up.outputs[list(link.from_node.outputs).index(link.from_socket)]

    return build


def apply(sc, hot):
    w = sc.world
    for n in list(w.node_tree.nodes):
        if n.type == "BACKGROUND":
            n.inputs["Color"].links and w.node_tree.links.remove(n.inputs["Color"].links[0])
            n.inputs["Color"].default_value = (1, 1, 1, 1)
            n.inputs["Strength"].default_value = _lin(0.07)
    cache = {}
    for o in sc.objects:
        if o.name.startswith("fog"):
            o.hide_render = True
            continue
        if o.type not in ("MESH",):
            continue
        g = hot.get(o.name)
        if g is None:
            nm = o.name.lower()
            g = 0.24 if nm in ("terrain", "outer") else 0.17 if "trunk" in nm or "tree" in nm or "branch" in nm else 0.3 if nm == "net" else 0.3
        for slot in o.material_slots:
            orig = slot.material
            if orig is None:
                continue
            has_alpha = orig.use_nodes and any(n.type == "BSDF_PRINCIPLED" and n.inputs["Alpha"].is_linked for n in orig.node_tree.nodes)
            key = (orig.name, round(g, 3), o.name in ("terrain", "outer"))
            if key not in cache:
                cache[key] = _mat(f"th_{orig.name}_{g}", g, 0.05, _alpha_from(orig) if has_alpha else None, wall_warm=o.name in ("terrain", "outer"))
            slot.material = cache[key]
    vs = sc.view_settings
    vs.view_transform = "Standard"
    vs.look = "None"
    vs.exposure = 0
