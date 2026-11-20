"""
Rikshaw Rush — Blender model builder.

Builds the game's hero models from primitives with bevels, smooth shading and PBR materials,
then exports each as .glb into public/models/ and writes models.json.

Run (headless):
  blender --background --factory-startup --python blender/build_models.py -- <out_dir> [preview]

Conventions (match the game):
  * 1 Blender unit = 1 metre, Z up, origin on the ground at the model centre.
  * Vehicles face +Y in Blender — the glTF exporter maps that to -Z, the game's forward (verified in the .glb).
  * The cow faces +X (the game turns it to cross the road).
  * Rickshaw wheels are separate objects named Wheel_* with applied transforms, so the game can spin them.
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else 'public/models')
PREVIEW = len(argv) > 1 and argv[1] == 'preview'
os.makedirs(OUT, exist_ok=True)
random.seed(7)

# ------------------------------------------------------------------ helpers
_mats = {}
def reset():
    _mats.clear()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=3.0, alpha=1.0):
    key = (name, color, metal, rough, emit, alpha)
    if key in _mats and _mats[key].name in bpy.data.materials:
        return _mats[key]
    m = bpy.data.materials.new(name)
    if hasattr(m, "use_nodes") and not m.node_tree: m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    c = [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    p.inputs['Base Color'].default_value = (*lin, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit is not None:
        e = [((emit >> 16) & 255) / 255, ((emit >> 8) & 255) / 255, (emit & 255) / 255]
        e = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in e]
        p.inputs['Emission Color'].default_value = (*e, 1)
        p.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'
    m.diffuse_color = (*lin, alpha)
    _mats[key] = m
    return m

def _finish(o, m, bevel=0.0, segs=2, smooth=False, name=None):
    if name:
        o.name = name
    o.data.materials.clear()
    o.data.materials.append(m)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel > 0:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segs
        mod.limit_method = 'ANGLE'
        mod.harden_normals = False
    if smooth:
        for poly in o.data.polygons:
            poly.use_smooth = True
    return o

def box(size, loc, m, bevel=0.02, rot=(0, 0, 0), name=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return _finish(o, m, bevel, name=name)

def cyl(r, depth, loc, m, rot=(0, 0, 0), verts=24, bevel=0.0, name=None, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.active_object
    return _finish(o, m, bevel, smooth=True, name=name)

def sphere(r, loc, m, scale=(1, 1, 1), segs=20, name=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=segs, ring_count=max(8, segs // 2))
    o = bpy.context.active_object
    o.scale = scale
    return _finish(o, m, smooth=True, name=name)

def torus(R, r, loc, m, rot=(0, 0, 0), name=None, maj=32, mn=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=maj, minor_segments=mn)
    o = bpy.context.active_object
    return _finish(o, m, smooth=True, name=name)

def tapered_box(size, loc, m, top_scale=(1, 0.7), shift_y=0.0, bevel=0.06, name=None):
    """Box whose top face is scaled (x, y) and shifted along Y — car cabins, cowls."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        if v.co.z > 0:
            v.co.x *= top_scale[0]; v.co.y = v.co.y * top_scale[1] + shift_y
    bm.to_mesh(o.data); bm.free()
    return _finish(o, m, bevel, name=name)

def export(name, flip=False):
    # Models are authored nose toward +Y; the glTF exporter maps Blender +Y to -Z, the game's forward.
    # (flip=True turns a model 180 deg first — only needed for models authored nose toward -Y.)
    if flip:
        for o in bpy.context.scene.objects:
            if o.parent is None:
                o.location = (-o.location.x, -o.location.y, o.location.z)
                o.rotation_euler.z += math.pi
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    # apply modifiers on export; selection = everything in the scene
    bpy.ops.object.select_all(action='SELECT')
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    print(f'[build] exported {path}')
    if PREVIEW:
        render_preview(name)

def render_preview(name):
    scn = bpy.context.scene
    for o in list(bpy.data.objects):
        if o.type in ('CAMERA', 'LIGHT'):
            bpy.data.objects.remove(o)
    objs = [o for o in scn.objects if o.type == 'MESH']
    mn = Vector((min(min((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs),
                 min(min((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs), 0))
    mx = Vector((max(max((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs),
                 max(max((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs),
                 max(max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
    center = (mn + mx) / 2
    size = max((mx - mn).length, 1)
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scn.collection.objects.link(cam)
    cam.location = center + Vector((size * 1.15, size * 1.25, size * 0.7))
    d = center + Vector((0, 0, mx.z * 0.45)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 35
    scn.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5; sun.rotation_euler = (0.8, 0.2, 0.6)
    scn.collection.objects.link(sun)
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.display.shading.light = 'STUDIO'
    scn.display.shading.color_type = 'MATERIAL'
    scn.display.shading.show_shadows = True
    scn.display.shading.show_cavity = True
    scn.render.resolution_x, scn.render.resolution_y = 900, 640
    scn.render.filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_preview', f'{name}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam); bpy.data.objects.remove(sun)

# ------------------------------------------------------------------ palettes
GREEN, YELLOW, RED, BLUE, WHITE = 0x1b7f3b, 0xffd60a, 0xd62828, 0x1565c0, 0xffffff
ART = [0xd62828, 0xffd60a, 0x0b8f3a, 0x1565c0, 0xe91e63, 0xff7f11, 0x00acc1, 0xffffff]

def M():
    return {
        'body': mat('body_green', GREEN, 0.15, 0.35),
        'trim': mat('trim_yellow', YELLOW, 0.3, 0.35),
        'chrome': mat('chrome', 0xe6e6e6, 1.0, 0.12),
        'dark': mat('dark', 0x161616, 0.2, 0.6),
        'rubber': mat('rubber', 0x121212, 0.0, 0.85),
        'canopy': mat('canopy', 0x1c1c1c, 0.0, 0.7),
        'seat': mat('seat', 0x8b1a1a, 0.0, 0.45),
        'glass': mat('glass', 0x9fc4d8, 0.0, 0.05, alpha=0.35),
        'head': mat('headlamp', 0xfff6d0, 0.0, 0.1, emit=0xfff3c4, strength=6),
        'tail': mat('taillamp', 0xff2020, 0.0, 0.2, emit=0xff2020, strength=4),
        'amber': mat('amber', 0xffa000, 0.0, 0.2, emit=0xffa000, strength=3),
        'skin': mat('skin', 0xb07a52, 0.0, 0.6),
        'kurta': mat('kurta', 0xd9d2bf, 0.0, 0.75),
        'cap': mat('cap', 0x2b2b2b, 0.0, 0.7),
        'plate': mat('plate', 0xf5f5f5, 0.0, 0.5),
    }

def art_stripes(x, y0, y1, z0, z1, normal_x, count=4):
    """Zig-zag truck-art bands painted on a side panel at x (facing ±X)."""
    rows = count
    h = (z1 - z0) / rows
    for r in range(rows):
        col = mat(f'art{r}', ART[r % len(ART)], 0.1, 0.4)
        n = int((y1 - y0) / 0.11)
        for i in range(n):
            y = y0 + (i + 0.5) * (y1 - y0) / n
            ang = 0.6 if i % 2 else -0.6
            box((0.012, 0.13, h * 0.42), (x + normal_x * 0.006, y, z0 + (r + 0.5) * h), col, bevel=0, rot=(ang, 0, 0))

def flower(x, y, z, normal_x, col):
    for k in range(6):
        a = k / 6 * math.pi * 2
        sphere(0.035, (x + normal_x * 0.01, y + math.cos(a) * 0.045, z + math.sin(a) * 0.045), col, scale=(0.4, 1, 1), segs=10)
    sphere(0.025, (x + normal_x * 0.015, y, z), mat('flower_mid', YELLOW, 0, 0.4), scale=(0.5, 1, 1), segs=10)

# ------------------------------------------------------------------ RICKSHAW
def build_rickshaw():
    reset(); m = M()
    # chassis + floor
    box((1.32, 2.7, 0.12), (0, 0.05, 0.42), m['dark'], 0.02)
    # rear passenger tub (rounded)
    box((1.52, 1.36, 0.64), (0, -0.62, 0.82), m['body'], 0.07)
    box((1.58, 1.4, 0.07), (0, -0.62, 1.15), m['trim'], 0.03)
    box((1.58, 1.4, 0.05), (0, -0.62, 0.5), m['chrome'], 0.02)
    # truck-art on both sides + back
    for s in (-1, 1):
        art_stripes(s * 0.765, -1.25, 0.02, 0.56, 0.84, s, count=3)
        for i, y in enumerate((-1.1, -0.82, -0.54, -0.26)):
            flower(s * 0.77, y, 0.99, s, mat(f'fl{i}', ART[(i + 4) % len(ART)], 0, 0.4))
    for r in range(3):
        col = mat(f'artb{r}', ART[(r + 2) % len(ART)], 0.1, 0.4)
        box((1.3, 0.012, 0.07), (0, -1.305, 0.62 + r * 0.12), col, 0)
    # tail lights + plate + reflectors
    for s in (-1, 1):
        box((0.2, 0.04, 0.12), (s * 0.58, -1.31, 1.0), m['tail'], 0.01)
    box((0.44, 0.02, 0.15), (0, -1.315, 0.62), m['plate'], 0.01)
    for i in range(5):
        box((0.04, 0.01, 0.08), (-0.12 + i * 0.06, -1.33, 0.62), m['dark'], 0)
    # driver section: floor, cowl (tapered nose), lower apron
    box((1.06, 1.0, 0.08), (0, 0.52, 0.52), m['dark'], 0.02)
    tapered_box((1.04, 0.22, 0.9), (0, 1.02, 0.96), m['body'], top_scale=(0.92, 0.7), shift_y=-0.05, bevel=0.05)
    box((0.94, 0.5, 0.14), (0, 0.9, 0.56), m['body'], 0.04)
    for r in range(2):
        box((0.7, 0.01, 0.06), (0, 1.14, 0.74 + r * 0.1), mat(f'artc{r}', ART[r * 3], 0.1, 0.4), 0, rot=(-0.2, 0, 0))
    # headlight with chrome bezel, indicators
    cyl(0.15, 0.1, (0, 1.15, 1.18), m['chrome'], rot=(math.pi / 2, 0, 0), verts=32)
    cyl(0.12, 0.02, (0, 1.205, 1.18), m['head'], rot=(math.pi / 2, 0, 0), verts=32)
    for s in (-1, 1):
        cyl(0.05, 0.05, (s * 0.42, 1.14, 0.72), m['amber'], rot=(math.pi / 2, 0, 0), verts=16)
    # windscreen + frame
    box((1.08, 0.025, 0.62), (0, 1.0, 1.72), m['glass'], 0, rot=(0.12, 0, 0))
    box((1.14, 0.07, 0.05), (0, 1.03, 1.4), m['chrome'], 0.01)
    box((1.14, 0.06, 0.04), (0, 0.96, 2.03), m['chrome'], 0.01)
    # pillars
    for x, y in ((-0.74, 0.98), (0.74, 0.98), (-0.74, -1.27), (0.74, -1.27), (-0.74, 0.0), (0.74, 0.0)):
        cyl(0.03, 1.0, (x, y, 1.6), m['chrome'], verts=12)
    # canopy: rounded roof shell + rim
    cyl(0.82, 2.62, (0, -0.14, 2.12), m['canopy'], rot=(math.pi / 2, 0, 0), verts=40)
    o = bpy.context.active_object; o.scale = (1, 1, 0.28); bpy.ops.object.transform_apply(scale=True)
    box((1.62, 2.62, 0.1), (0, -0.14, 2.1), m['canopy'], 0.03)
    box((1.66, 2.66, 0.05), (0, -0.14, 2.05), m['trim'], 0.02)
    # jhalar fringe
    for i in range(16):
        y = 1.1 - i * 0.16
        for s in (-1, 1):
            c = mat(f'fr{i % 4}', [RED, YELLOW, BLUE, WHITE][i % 4], 0.1, 0.4)
            box((0.02, 0.08, 0.17), (s * 0.84, y, 1.95), c, 0.005)
            sphere(0.025, (s * 0.84, y, 1.85), c, segs=8)
    for i in range(9):
        c = mat(f'fr{i % 4}', [RED, YELLOW, BLUE, WHITE][i % 4], 0.1, 0.4)
        box((0.08, 0.02, 0.17), (-0.72 + i * 0.18, 1.18, 1.95), c, 0.005)
    # rolled side flaps
    for s in (-1, 1):
        cyl(0.07, 1.3, (s * 0.8, -0.6, 2.0), m['canopy'], rot=(math.pi / 2, 0, 0), verts=12)
    # seats
    box((1.3, 0.62, 0.18), (0, -0.84, 1.18), m['seat'], 0.06)
    box((1.3, 0.12, 0.62), (0, -1.2, 1.55), m['seat'], 0.05)
    box((0.56, 0.45, 0.14), (0, 0.22, 1.08), m['dark'], 0.05)
    # handlebar + column + mirrors
    cyl(0.028, 0.92, (0, 0.78, 1.33), m['chrome'], rot=(0, math.pi / 2, 0), verts=12)
    for s in (-1, 1):
        cyl(0.04, 0.12, (s * 0.44, 0.78, 1.33), m['rubber'], rot=(0, math.pi / 2, 0), verts=12)
        cyl(0.014, 0.38, (s * 0.52, 0.8, 1.5), m['chrome'], rot=(0, s * 0.55, 0), verts=8)
        sphere(0.08, (s * 0.62, 0.8, 1.67), m['chrome'], scale=(1, 0.35, 0.7), segs=16)
    cyl(0.035, 0.7, (0, 0.94, 0.98), m['chrome'], rot=(0.3, 0, 0), verts=12)
    # mudguards
    for s in (-1, 1):
        box((0.27, 0.8, 0.05), (s * 0.68, -0.92, 0.7), m['body'], 0.02)
    box((0.28, 0.62, 0.05), (0, 1.17, 0.66), m['trim'], 0.02)
    for s in (-1, 1):
        box((0.045, 0.045, 0.48), (s * 0.13, 1.17, 0.55), m['chrome'], 0.01)
    # exhaust
    cyl(0.055, 0.62, (0.45, -1.3, 0.36), m['chrome'], rot=(math.pi / 2, 0, 0), verts=16)
    # driver (seated, hands on bar)
    box((0.42, 0.26, 0.56), (0, 0.22, 1.45), m['kurta'], 0.08)
    sphere(0.14, (0, 0.24, 1.92), m['skin'], segs=16)
    cyl(0.13, 0.12, (0, 0.24, 2.05), m['cap'], verts=16)
    box((0.2, 0.06, 0.05), (0, 0.37, 1.88), m['cap'], 0.01)  # moustache
    for s in (-1, 1):
        box((0.1, 0.46, 0.1), (s * 0.26, 0.48, 1.52), m['kurta'], 0.03, rot=(-0.4, 0, 0))
        box((0.16, 0.46, 0.14), (s * 0.11, 0.44, 1.12), mat('pants', 0x55524a, 0, 0.8), 0.04)
    # wheels (separate, transforms applied, origin at hub)
    def wheel(name, x, y, z):
        parts = []
        parts.append(torus(0.235, 0.075, (x, y, z), m['rubber'], rot=(0, math.pi / 2, 0)))
        parts.append(cyl(0.17, 0.12, (x, y, z), m['chrome'], rot=(0, math.pi / 2, 0), verts=24))
        parts.append(cyl(0.06, 0.2, (x, y, z), m['dark'], rot=(0, math.pi / 2, 0), verts=16))
        for k in range(6):
            a = k / 6 * math.pi
            parts.append(box((0.02, 0.32, 0.03), (x, y, z), m['dark'], 0, rot=(a, 0, 0)))
        for p in parts:
            p.select_set(True)
            for mod in p.modifiers:
                bpy.context.view_layer.objects.active = p
                bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        w = bpy.context.active_object
        w.name = name
        bpy.context.scene.cursor.location = (x, y, z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.context.scene.cursor.location = (0, 0, 0)
    wheel('Wheel_RL', -0.7, -0.92, 0.31)
    wheel('Wheel_RR', 0.7, -0.92, 0.31)
    wheel('Wheel_F', 0, 1.18, 0.31)
    export('rickshaw')

# ------------------------------------------------------------------ TRUCK (Pakistani decorated)
def build_truck():
    reset(); m = M()
    body = mat('truck_red', 0xc81d25, 0.2, 0.35)
    wood = mat('wood', 0x7a5230, 0, 0.7)
    # chassis
    box((2.2, 8.0, 0.3), (0, 0, 0.75), m['dark'], 0.03)
    # cargo bed with painted wooden panels
    box((2.4, 4.8, 1.5), (0, -1.0, 1.7), wood, 0.04)
    for s in (-1, 1):
        for r in range(4):
            c = mat(f'tart{r}', ART[r % len(ART)], 0.1, 0.4)
            box((0.02, 4.6, 0.26), (s * 1.215, -1.0, 1.15 + r * 0.34), c, 0)
        for i in range(6):
            flower(s * 1.22, -3.0 + i * 0.8, 2.05, s, mat(f'tfl{i}', ART[(i + 3) % len(ART)], 0, 0.4))
    for r in range(4):
        box((2.3, 0.02, 0.26), (0, -3.41, 1.15 + r * 0.34), mat(f'tart{r}', ART[r % len(ART)], 0.1, 0.4), 0)
    # cab with tapered windscreen
    tapered_box((2.3, 1.9, 1.7), (0, 2.5, 1.75), body, top_scale=(0.96, 0.8), shift_y=-0.15, bevel=0.08)
    box((2.0, 0.03, 0.65), (0, 3.37, 2.0), m['glass'], 0, rot=(-0.1, 0, 0))
    box((2.32, 0.1, 0.3), (0, 3.45, 1.0), m['chrome'], 0.03)            # bumper
    for s in (-1, 1):
        cyl(0.16, 0.1, (s * 0.85, 3.47, 1.35), m['chrome'], rot=(math.pi / 2, 0, 0), verts=24)
        cyl(0.12, 0.02, (s * 0.85, 3.52, 1.35), m['head'], rot=(math.pi / 2, 0, 0), verts=24)
    # the famous painted "taj" crown over the cab
    tapered_box((2.3, 0.45, 1.2), (0, 2.25, 3.2), body, top_scale=(0.85, 1), bevel=0.05)
    for r in range(3):
        box((2.2, 0.02, 0.3), (0, 2.48, 2.85 + r * 0.33), mat(f'tart{r + 1}', ART[(r + 1) % len(ART)], 0.1, 0.4), 0)
    for i in range(7):
        sphere(0.08, (-0.95 + i * 0.32, 2.3, 3.85), mat(f'bulb{i % 4}', 0xffffff, 0, 0.2, emit=[0xff2a2a, 0xffd60a, 0x2bff88, 0x00e5ff][i % 4], strength=5), segs=10)
    # chains / jingles at the back
    for i in range(12):
        box((0.04, 0.03, 0.34), (-1.05 + i * 0.19, -3.45, 0.55), m['chrome'], 0.005)
    for s in (-1, 1):
        box((0.3, 0.05, 0.14), (s * 1.0, -3.42, 1.0), m['tail'], 0.01)
    # wheels (6) with hubs
    for x in (-1.0, 1.0):
        for y in (2.6, -1.6, -2.6):
            torus(0.38, 0.14, (x, y, 0.5), m['rubber'], rot=(0, math.pi / 2, 0))
            cyl(0.26, 0.28, (x, y, 0.5), m['chrome'], rot=(0, math.pi / 2, 0), verts=24)
    export('truck')

# ------------------------------------------------------------------ BUS
def build_bus():
    reset(); m = M()
    body = mat('bus_yellow', 0xffc21a, 0.15, 0.4)
    box((2.45, 8.6, 2.4), (0, 0, 1.6), body, 0.15)
    for s in (-1, 1):
        box((0.04, 7.6, 0.72), (s * 1.23, 0.2, 2.15), m['glass'], 0)
        for i in range(9):
            box((0.05, 0.08, 0.74), (s * 1.235, -3.4 + i * 0.85, 2.15), m['dark'], 0)
        for r in range(3):
            box((0.02, 8.2, 0.12), (s * 1.24, 0, 0.95 + r * 0.16), mat(f'bart{r}', ART[(r * 2) % len(ART)], 0.1, 0.4), 0)
    box((2.2, 0.04, 0.85), (0, 4.31, 2.2), m['glass'], 0)
    box((2.2, 0.04, 0.6), (0, -4.31, 2.25), m['glass'], 0)
    box((2.0, 6.5, 0.3), (0, 0.5, 2.97), m['dark'], 0.04)        # roof rack
    for i in range(5):
        box((random.uniform(0.5, 0.9), random.uniform(0.6, 1.0), random.uniform(0.3, 0.6)), (random.uniform(-0.6, 0.6), 3.0 - i * 1.3, 3.3), mat(f'lug{i}', random.choice([0x8b5a2b, 0x2e6b8a, 0xb33a3a, 0xd9c08a]), 0, 0.8), 0.04)
    for s in (-1, 1):
        box((0.3, 0.05, 0.16), (s * 1.0, -4.32, 0.95), m['tail'], 0.01)
        cyl(0.14, 0.05, (s * 0.85, 4.33, 1.0), m['head'], rot=(math.pi / 2, 0, 0), verts=20)
    for x in (-1.05, 1.05):
        for y in (3.0, -2.8):
            torus(0.38, 0.14, (x, y, 0.5), m['rubber'], rot=(0, math.pi / 2, 0))
            cyl(0.26, 0.3, (x, y, 0.5), m['chrome'], rot=(0, math.pi / 2, 0), verts=24)
    export('bus')

# ------------------------------------------------------------------ COW (faces +X)
def build_cow():
    reset()
    fur = mat('cow_white', 0xf0ebe0, 0, 0.8)
    spot = mat('cow_spot', 0x3a2a22, 0, 0.8)
    pink = mat('cow_nose', 0xd9a0a0, 0, 0.6)
    horn = mat('horn', 0xe8e0c8, 0, 0.5)
    hoof = mat('hoof', 0x2b2b2b, 0, 0.6)
    sphere(0.5, (0, 0, 1.0), fur, scale=(1.55, 0.82, 0.9), segs=28)                     # barrel body
    sphere(0.32, (0.25, 0.33, 1.05), spot, scale=(1.2, 0.35, 1.0), segs=16)
    sphere(0.26, (-0.45, -0.36, 1.1), spot, scale=(1.0, 0.3, 0.9), segs=16)
    sphere(0.3, (0.35, 0, 1.35), fur, scale=(1.0, 0.85, 0.6), segs=18)                  # zebu hump, blended into the back
    sphere(0.34, (0.55, 0, 0.82), fur, scale=(0.6, 0.55, 0.9), segs=14)                 # dewlap/chest
    sphere(0.22, (0.98, 0, 1.15), fur, scale=(1.25, 0.85, 1.0), segs=20)                # head
    sphere(0.13, (1.22, 0, 1.06), pink, scale=(0.8, 1, 0.75), segs=16)                  # muzzle
    for s in (-1, 1):
        sphere(0.03, (1.08, s * 0.14, 1.24), mat('eye', 0x111111, 0, 0.2), segs=8)
        cyl(0.04, 0.26, (0.9, s * 0.15, 1.42), horn, rot=(s * 0.7, 0, 0), verts=10, r2=0.008)
        sphere(0.07, (0.86, s * 0.25, 1.28), fur, scale=(0.5, 1.4, 0.55), segs=10)       # ears
        for x in (-0.55, 0.5):
            cyl(0.085, 0.62, (x, s * 0.24, 0.37), fur, verts=14)                         # legs (attached)
            sphere(0.1, (x, s * 0.24, 0.66), fur, segs=10)                               # knee/shoulder blend
            cyl(0.09, 0.08, (x, s * 0.24, 0.04), hoof, verts=12)
    cyl(0.025, 0.55, (-0.8, 0, 0.85), fur, rot=(0, 0.35, 0), verts=8)                   # tail
    sphere(0.07, (-0.9, 0, 0.58), spot, segs=10)
    torus(0.19, 0.03, (0.76, 0, 1.08), mat('collar', 0xd62828, 0, 0.5), rot=(0, math.pi / 2 - 0.35, 0))
    sphere(0.07, (0.82, 0, 0.88), mat('bell', 0xffc93c, 1, 0.25), segs=12)
    export('cow')

# ------------------------------------------------------------------ CAMEL (Clifton beach, decorated)
def build_camel():
    reset()
    fur = mat('camel', 0xc8a26b, 0, 0.8)
    dark = mat('camel_dark', 0x9c7a4a, 0, 0.8)
    sphere(0.55, (0, 0, 1.7), fur, scale=(0.82, 1.75, 0.95), segs=28)                   # body (along Y)
    sphere(0.48, (0, -0.1, 2.15), fur, scale=(0.85, 1.05, 0.95), segs=22)               # hump
    cyl(0.15, 1.05, (0, 1.0, 2.2), fur, rot=(-0.65, 0, 0), verts=16)                    # neck
    sphere(0.19, (0, 0.72, 1.85), fur, scale=(1, 1.3, 1.1), segs=14)                    # neck base blend
    sphere(0.2, (0, 1.42, 2.66), fur, scale=(0.8, 1.6, 0.85), segs=18)                  # head
    sphere(0.09, (0, 1.72, 2.6), dark, scale=(0.9, 1, 0.8), segs=12)                    # snout
    for s in (-1, 1):
        sphere(0.03, (s * 0.14, 1.38, 2.75), mat('ceye', 0x111111, 0, 0.2), segs=8)
        sphere(0.05, (s * 0.1, 1.2, 2.86), fur, scale=(0.6, 0.6, 1.4), segs=8)          # ears
        for y in (-0.75, 0.7):
            cyl(0.1, 0.72, (s * 0.25, y, 1.05), fur, verts=12)                           # upper leg
            sphere(0.1, (s * 0.25, y, 0.68), dark, segs=10)                              # knee
            cyl(0.08, 0.66, (s * 0.25, y, 0.35), fur, verts=12)                          # lower leg
            cyl(0.12, 0.05, (s * 0.25, y, 0.025), dark, verts=12)                        # pad
    saddle_cols = [0xd62828, 0xffd60a, 0x0b8f3a, 0x1565c0, 0xe91e63]
    sphere(0.5, (0, -0.1, 2.5), mat('saddle', 0xd62828, 0, 0.6), scale=(1.0, 1.25, 0.25), segs=20)  # cloth over the hump
    for s in (-1, 1):
        box((0.03, 0.95, 0.42), (s * 0.5, -0.1, 2.1), mat('saddle2', 0x1565c0, 0, 0.6), 0.01, rot=(0, s * -0.25, 0))
        for i in range(7):
            sphere(0.045, (s * 0.55, -0.55 + i * 0.15, 1.86), mat(f'tas{i % 5}', saddle_cols[i % 5], 0, 0.5), segs=8)
    torus(0.17, 0.022, (0, 1.42, 2.66), mat('bridle', 0xffd60a, 0.6, 0.3), rot=(math.pi / 2, 0, 0))
    export('camel')

# ------------------------------------------------------------------ run
BUILDERS = {'rickshaw': build_rickshaw, 'truck': build_truck, 'bus': build_bus, 'cow': build_cow, 'camel': build_camel}
only = [a for a in argv[2:]] if len(argv) > 2 else list(BUILDERS)
for name in only:
    BUILDERS[name]()

with open(os.path.join(OUT, 'models.json'), 'w') as f:
    json.dump({
        '_help': 'Built by blender/build_models.py. Delete a name from the list to fall back to the procedural model.',
        'models': list(BUILDERS),
    }, f, indent=2)
print('[build] done')
