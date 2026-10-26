import bpy,sys
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
for obj in list(bpy.data.objects):
    if obj.type!='MESH': continue
    if obj.name.startswith(('000_','005_','063_','145_','158_','165_')):
        bpy.context.view_layer.objects.active=obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=.000001)
        bpy.ops.object.mode_set(mode='OBJECT')
        bevel=obj.modifiers.new('Cast edge radii, 1.5 mm','BEVEL')
        bevel.width=.0015; bevel.segments=3; bevel.limit_method='ANGLE';bevel.angle_limit=.55
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        for poly in obj.data.polygons: poly.use_smooth=True
        normal=obj.modifiers.new('Preserve casting flats','WEIGHTED_NORMAL');normal.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=normal.name)
bpy.ops.export_scene.gltf(filepath=args[1],export_format='GLB',export_yup=True,export_extras=True)
