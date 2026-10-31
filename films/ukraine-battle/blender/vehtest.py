# Turntable test of a vehicle: renders a few views on a plain ground.
import math, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib, vehicles
a = lib.args()
lib.reset()
v = getattr(vehicles, a.get("v", "leopard2a6"))("veh", plough=a.get("plough") == "1")
vehicles.drive(v, float(a.get("dist", 0)))
bpy.ops.mesh.primitive_plane_add(size=60)
g = bpy.context.active_object
g.data.materials.append(lib.simple_pbr("g", "farm_soil", 2.5))
lib.world_hdri("belfast_sunset_puresky_4k.exr", 1.0, rot=float(a.get("rot", 0.6)))
lib.sun(angle_deg=18, az_deg=40, strength=3.5, col=(1, 0.85, 0.7), soft=1.5)
lib.render_settings(int(a.get("w", 960)), int(a.get("h", 540)), 24, int(a.get("samples", 24)))
sc = bpy.context.scene
os.makedirs("blender/out/veh", exist_ok=True)
views = {"q": (9, 9, 3.2), "side": (12, 0.5, 1.6), "front": (3, 11, 2.0), "rear": (-6, -9, 4), "close": (3.6, 4.2, 1.6)}
for nm in a.get("views", "q,side,front,close").split(","):
    cam = lib.camera("c" + nm, views[nm], (0, 0.5 if nm != "close" else 2.4, 1.3 if nm != "close" else 1.1), lens=40 if nm != "close" else 30)
    sc.camera = cam
    sc.render.filepath = f"blender/out/veh/{nm}.jpg"
    bpy.ops.render.render(write_still=True)
