"""CHEMIMON Blender modelling library.

Every monster is built by a recipe in art/blender/monsters/<id>.py that calls these helpers.
Run through art/blender/run.py (blender -b -P art/blender/run.py -- <id> ...).

Authoring convention (Blender coordinates):
  - Z is up, the monster stands on Z = 0 and faces -Y (this becomes +Z in glTF / three.js).
  - Author at any size: finish() floors the model on the ground and scales it to `height`.
  - Baby style: big head, tiny body, big round eyes, soft rounded shapes, no sharp menace.

Budgets asserted on export (spec section 8): <= 5000 triangles, <= 1 MB per .glb, no textures.
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_MONSTERS = os.path.join(ROOT, 'apps', 'web', 'public', 'assets', 'monsters')
OUT_RENDERS = os.path.join(ROOT, 'art', 'renders')

MAX_TRIS = 5000
MAX_BYTES = 1_000_000

_parts = []
_mats = {}

DARK = '#1F1A2B'      # eyes, mouths
WHITE = '#FFFFFF'
BLUSH = '#FF9DB0'


# ---------------------------------------------------------------- scene

def reset():
    """Start from an empty scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _parts.clear()
    _mats.clear()


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(hex_color):
    h = hex_color.lstrip('#')
    return tuple(_srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def shade(hex_color, factor):
    """Lighter (factor > 1) or darker (factor < 1) variant of a hex colour."""
    h = hex_color.lstrip('#')
    ch = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    if factor >= 1:
        ch = [round(c + (255 - c) * min(factor - 1, 1)) for c in ch]
    else:
        ch = [round(c * max(factor, 0)) for c in ch]
    return '#%02X%02X%02X' % tuple(ch)


def mat(color, rough=0.55, metal=0.0, emit=0.0, alpha=1.0):
    """Plain Principled material (the only kind that survives glTF export cleanly).

    Keep metal <= 0.6: the game lights with a small local environment, so a fully
    metallic surface would render too dark.
    """
    key = (color.upper(), round(rough, 3), round(metal, 3), round(emit, 3), round(alpha, 3))
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new('m_%s_%d' % (color.lstrip('#'), len(_mats)))
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = rgb(color)
    b.inputs['Base Color'].default_value = (*c, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = min(metal, 0.6)
    if emit > 0:
        b.inputs['Emission Color'].default_value = (*c, 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    _mats[key] = m
    return m


def _as_mat(m):
    return mat(m) if isinstance(m, str) else m


def _register(obj, material, smooth=True):
    obj.data.materials.clear()
    obj.data.materials.append(_as_mat(material))
    for p in obj.data.polygons:
        p.use_smooth = smooth
    _parts.append(obj)
    return obj


def _active():
    return bpy.context.view_layer.objects.active


# ---------------------------------------------------------------- primitives
# Every primitive takes: loc (x, y, z), a material (hex string or mat()), optional rot (radians)
# and scale. All return the Blender object so a recipe can tweak it further.

def _lod(r, segs, rings):
    """Pick a mesh density from the radius so small details stay cheap (triangle budget)."""
    if segs and rings:
        return segs, rings
    if r >= 0.3:
        return 24, 14
    if r >= 0.12:
        return 14, 8
    return 10, 6


def sphere(loc, r, material, scale=(1, 1, 1), rot=(0, 0, 0), segs=None, rings=None):
    segs, rings = _lod(r, segs, rings)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=r, location=loc, rotation=rot)
    o = _active()
    o.scale = scale
    return _register(o, material)


def ico(loc, r, material, subdiv=1, scale=(1, 1, 1), rot=(0, 0, 0), flat=True):
    """Faceted gem (flat=True) or low-poly ball."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=loc, rotation=rot)
    o = _active()
    o.scale = scale
    return _register(o, material, smooth=not flat)


def rbox(loc, size, material, bevel=0.12, rot=(0, 0, 0), segs=3):
    """Box with rounded edges. size = (x, y, z) full extents."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = _active()
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = o.modifiers.new('bevel', 'BEVEL')
    mod.width = min(bevel, min(size) * 0.49)
    mod.segments = segs
    return _register(o, material)


def cyl(loc, r, depth, material, rot=(0, 0, 0), r_top=None, verts=16):
    """Cylinder, or a cone / tapered cylinder when r_top is given (0 = point)."""
    if r_top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r_top, depth=depth, location=loc, rotation=rot)
    return _register(_active(), material)


def torus(loc, major, minor, material, rot=(0, 0, 0), scale=(1, 1, 1), major_segs=20, minor_segs=6):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segs,
                                     minor_segments=minor_segs, location=loc, rotation=rot)
    o = _active()
    o.scale = scale
    return _register(o, material)


def drop(loc, r, material, tip=1.6, scale=(1, 1, 1), rot=(0, 0, 0), segs=None, rings=None):
    """Teardrop: a sphere whose top half is pulled into a soft point (tip = how tall, 1 = egg).
    loc = centre of the round belly; the face goes on the belly, at or below loc z."""
    o = sphere(loc, r, material, segs=segs, rings=rings)
    for v in o.data.vertices:
        if v.co.z > 0:
            t = min(v.co.z / r, 1.0)
            f = 1 - 0.5 * t * t          # round belly, soft narrowing towards the tip
            v.co.x *= f
            v.co.y *= f
            v.co.z *= 1 + (tip - 1) * t ** 1.5
    o.rotation_euler = rot
    o.scale = scale
    return o


def capsule(a, b, r, material, verts=10):
    """Rounded limb from point a to point b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    mid = (a + b) / 2
    rotq = d.to_track_quat('Z', 'Y')
    c = cyl(tuple(mid), r, d.length, material, verts=verts)
    c.rotation_euler = rotq.to_euler()
    sphere(tuple(a), r, material, segs=verts, rings=6)
    sphere(tuple(b), r, material, segs=verts, rings=6)
    return c


# ---------------------------------------------------------------- face

def _hit(x, z, objs=None):
    """Front surface point at (x, z): cast a ray from the front (-Y) towards +Y."""
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    origin = Vector((x, -20, z))
    for _ in range(8):
        ok, loc, normal, _i, obj, _m = bpy.context.scene.ray_cast(deps, origin, Vector((0, 1, 0)))
        if not ok:
            return None, None
        if objs is None or obj.original in objs:
            return loc, normal
        origin = loc + Vector((0, 1e-4, 0))
    return None, None


def stick(x, z, r, material, squash=0.45, scale=(1, 1), sink=0.25, on=None):
    """Stick a flattened disc-like blob on the front surface at (x, z). Returns (obj, loc, normal)."""
    loc, normal = _hit(x, z, on)
    if loc is None:
        raise RuntimeError('stick(%.2f, %.2f): nothing in front to stick to' % (x, z))
    q = normal.to_track_quat('-Y', 'Z')
    o = sphere(tuple(loc - normal * (r * squash * sink)), r, material, segs=14, rings=8)
    o.scale = (scale[0], squash, scale[1])
    o.rotation_euler = q.to_euler()
    return o, loc, normal


def face(z, dx=0.16, eye_r=0.085, eye='round', mouth='smile', blush=True, mouth_dz=-0.13, on=None, eye_color=DARK):
    """Baby face on the front surface: two big eyes, a tiny mouth, pink cheeks.

    z   height of the eye line.            dx    half distance between the eyes.
    eye 'round' | 'sleepy' | 'happy' | 'wide'.   mouth 'smile' | 'o' | 'flat' | 'none'.
    on  list of body objects the face may sit on (default: whatever is in front).
    Call it after the head exists and before adding things that would cover the face.
    """
    targets = list(on) if on else list(_parts)
    for side in (-1, 1):
        x = side * dx
        if eye == 'sleepy':
            e, loc, n = stick(x, z, eye_r, eye_color, squash=0.4, scale=(1.1, 0.32), on=targets)
        elif eye == 'happy':
            e, loc, n = stick(x, z, eye_r, eye_color, squash=0.4, scale=(1.05, 0.42), on=targets)
        else:
            sc = (1.0, 1.15) if eye == 'round' else (1.1, 1.3)
            e, loc, n = stick(x, z, eye_r, eye_color, scale=sc, on=targets)
            q = n.to_track_quat('-Y', 'Z')
            hi = loc + q @ Vector((-0.32 * eye_r, -0.36 * eye_r, 0.42 * eye_r))
            sphere(tuple(hi), eye_r * 0.3, mat(WHITE, rough=0.3, emit=0.4), segs=8, rings=5)
            lo = loc + q @ Vector((0.3 * eye_r, -0.4 * eye_r, -0.35 * eye_r))
            sphere(tuple(lo), eye_r * 0.14, mat(WHITE, rough=0.3, emit=0.4), segs=6, rings=4)
        if blush:
            stick(side * (dx + eye_r * 1.25), z - eye_r * 1.25, eye_r * 0.62, mat(BLUSH, rough=0.8),
                  squash=0.25, scale=(1.2, 0.75), on=targets)
    mz = z + mouth_dz
    if mouth == 'smile':
        loc, n = _hit(0, mz, targets)
        if loc is not None:
            bpy.ops.mesh.primitive_torus_add(major_radius=eye_r * 0.55, minor_radius=eye_r * 0.13,
                                             major_segments=14, minor_segments=5,
                                             location=tuple(loc - n * 0.004), rotation=(math.pi / 2, 0, 0))
            t = _active()
            bm = bmesh.new()
            bm.from_mesh(t.data)
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
            bm.to_mesh(t.data)
            bm.free()
            _register(t, DARK)
    elif mouth == 'o':
        stick(0, mz, eye_r * 0.36, DARK, squash=0.4, scale=(1, 1.15), on=targets)
    elif mouth == 'flat':
        stick(0, mz, eye_r * 0.5, DARK, squash=0.4, scale=(1, 0.22), on=targets)


# ---------------------------------------------------------------- finish / export / render

def _join():
    bpy.ops.object.select_all(action='DESELECT')
    for o in _parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = _parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(_parts) > 1:
        bpy.ops.object.join()
    return _active()


def _tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def finish(name, height=1.0, hover=0.0, out_dir=None, max_tris=MAX_TRIS, max_bytes=MAX_BYTES, render=False,
           normalize=True, span=None):
    """Join all parts, floor on Z = hover, scale so the top is at `height`, export <name>.glb.

    hover > 0 leaves an air gap under a floating monster (gases, glowing orbs).
    normalize=False keeps the authored size and position (scenery, buildings).
    Returns a dict with the triangle count and file size. Raises if a budget is exceeded.
    """
    obj = _join()
    obj.name = name
    obj.data.name = name
    zs = [v.co.z for v in obj.data.vertices]
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    lo, hi = min(zs), max(zs)
    if normalize:
        k = (height - hover) / (hi - lo)
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        for v in obj.data.vertices:
            v.co.x = (v.co.x - cx) * k
            v.co.y = (v.co.y - cy) * k
            v.co.z = (v.co.z - lo) * k + hover
        obj.data.update()
    tris = _tri_count(obj)
    if tris > max_tris:
        raise RuntimeError('%s: %d triangles, budget is %d' % (name, tris, max_tris))
    out_dir = out_dir or OUT_MONSTERS
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_animations=False, export_extras=False,
                              export_draco_mesh_compression_enable=False)
    size = os.path.getsize(path)
    if size > max_bytes:
        raise RuntimeError('%s: %d bytes, budget is %d' % (name, size, max_bytes))
    info = {'name': name, 'tris': tris, 'bytes': size, 'materials': len(obj.data.materials)}
    print('CHEMILIB_EXPORT %s tris=%d bytes=%d materials=%d' % (name, tris, size, len(obj.data.materials)))
    if render:
        render_preview(obj, name, span=span)
    return info


def _look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def _setup_render(size, samples):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x = size
    sc.render.resolution_y = size
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'Standard'
    return sc


def render_preview(obj, name, size=512, samples=24, out_dir=None, span=None):
    """Write art/renders/<name>.png (3/4 beauty view) and <name>_sil.png (front black silhouette)."""
    out_dir = out_dir or OUT_RENDERS
    os.makedirs(out_dir, exist_ok=True)
    sc = _setup_render(size, samples)
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.80, 0.88, 1.0, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sc.world = world
    span = span or max(obj.dimensions.x, obj.dimensions.z, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    ground = _active()
    ground.data.materials.append(mat('#EAF6DA', rough=0.9))
    bpy.ops.object.light_add(type='SUN', location=(3, -4, 6), rotation=(math.radians(45), 0, math.radians(35)))
    sun = _active()
    sun.data.energy = 3.2
    sun.data.angle = math.radians(12)
    bpy.ops.object.camera_add(location=(1.0 * span, -2.35 * span, 1.0 * span))
    cam = _active()
    cam.data.lens = 60
    _look_at(cam, (0, 0, obj.dimensions.z * 0.5))
    sc.camera = cam
    sc.render.filepath = os.path.join(out_dir, name + '.png')
    bpy.ops.render.render(write_still=True)

    # Front silhouette: black model on white, used to check that monsters differ by shape, not colour.
    black = bpy.data.materials.new('sil')
    black.use_nodes = True
    black.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0, 0, 0, 1)
    black.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    for i in range(len(obj.data.materials)):
        obj.data.materials[i] = black
    ground.hide_render = True
    sun.hide_render = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
    cam.location = (0, -3.3 * span, obj.dimensions.z * 0.5)
    _look_at(cam, (0, 0, obj.dimensions.z * 0.5))
    sc.cycles.samples = 4
    sc.render.resolution_x = 256
    sc.render.resolution_y = 256
    sc.render.filepath = os.path.join(out_dir, name + '_sil.png')
    bpy.ops.render.render(write_still=True)
