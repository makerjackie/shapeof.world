# Pose test: import a soldier, apply POSE (from argv json), render front/side/3-4 views at low res.
import json, math, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib, soldier
a = lib.args()
lib.reset()
arm = soldier.load(a.get("name", "Military_Male_03"), recolour="olive")
if a.get("info"):
    for b in arm.data.bones:
        if any(k in b.name for k in ("Pelvis","Spine","Neck","Head","Thigh","Calf","Foot","Clavicle","UpperArm","Forearm","Hand")) and "Finger" not in b.name:
            m = b.matrix_local
            print("BONE", b.name, "head", tuple(round(v,2) for v in (arm.matrix_world @ b.head_local)), "x", tuple(round(v,2) for v in m.col[0][:3]), "y", tuple(round(v,2) for v in m.col[1][:3]), "z", tuple(round(v,2) for v in m.col[2][:3]))
soldier.apply(arm, soldier.SIT)
if a.get("up"):
    soldier.apply(arm, soldier.LOOK_UP)
arm.location = (0, 0, float(a.get("z", -0.72)))
bpy.ops.mesh.primitive_plane_add(size=6, location=(0,0,0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.45, 1))  # the wall behind (+Y is behind the soldier? we test)
bpy.context.active_object.scale = (3, 0.1, 2)
lib.world_hdri("kloofendal_misty_morning_puresky_4k.exr", 1.0)
lib.render_settings(640, 640, 24, 16)
sc = bpy.context.scene
os.makedirs("blender/out/pose", exist_ok=True)
for nm, loc in (("front", (0, -3.2, 1.0)), ("side", (3.2, 0, 1.0)), ("q", (2.2, -2.4, 1.6))):
    cam = lib.camera("c"+nm, loc, (0, 0, 0.7), lens=40)
    sc.camera = cam
    sc.render.filepath = f"blender/out/pose/{nm}.jpg"
    bpy.ops.render.render(write_still=True)
