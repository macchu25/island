"""Island layout guide renders for the image-generation agent.

  blender -b -P art/blender/guide.py

Writes art/reference/island-guide-clean.png, island-guide-labeled.png, island-guide.json.
Game (three.js, y up, +z toward the camera) -> Blender: x = x, y = -z, z = up.
Markers are drawn by projecting layout positions with world_to_camera_view, then composited
in pure Python (bitmap digits), no PIL.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

LAYOUT = json.load(open(os.path.join(ROOT, 'apps', 'web', 'src', 'island', 'layout.json')))
GLB = os.path.join(ROOT, 'apps', 'web', 'public', 'assets', 'island')
OUT = os.path.join(ROOT, 'art', 'reference')
W, H = 1920, 1080
FOV = 42.0
ELEV = 45.0
AZ = 0.0            # camera on the game's +z side
DIST = 74.0
ORDER = ['breeding', 'extractor', 'codex', 'market', 'dock', 'workshop',
         'metal', 'quarry', 'crystal', 'spring', 'gas', 'noble', 'halogen']
FLOOR_Y = 0.025


def g2b(x, z, y=0.0):
    return Vector((x, -z, y))


def import_glb(name, x=0.0, z=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(GLB, name + '.glb'))
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location = (o.location.x + x, o.location.y - z, o.location.z)


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 64
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('sky')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.82, 1.0, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sc.world = w
    # soft daylight: wide sun from the camera's upper left, so shadows stay light
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(-25)))
    s = bpy.context.view_layer.objects.active
    s.data.energy = 2.6
    s.data.angle = math.radians(25)
    # plain calm sea
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 4, -0.9))
    sea = bpy.context.view_layer.objects.active
    m = bpy.data.materials.new('sea')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.13, 0.56, 0.86, 1)
    b.inputs['Roughness'].default_value = 1.0
    sea.data.materials.append(m)
    import_glb('island')
    for k, v in LAYOUT['buildings'].items():
        import_glb(k, v['x'], v['z'])
    return sc


def make_camera(sc):
    isl = LAYOUT['island']
    target = g2b(isl["cx"], isl["cz"] + 4.0)   # aim 4 units toward the camera so the whole island fits vertically
    el = math.radians(ELEV)
    az = math.radians(AZ)
    # azimuth 0: camera on the +z side of the game = -y in Blender
    off = Vector((DIST * math.cos(el) * math.sin(az), -DIST * math.cos(el) * math.cos(az), DIST * math.sin(el)))
    cd = bpy.data.cameras.new('guide')
    cd.sensor_fit = 'HORIZONTAL'
    cd.sensor_width = 36.0
    cd.lens = 18.0 / math.tan(math.radians(FOV) / 2)
    cd.clip_end = 1000
    cam = bpy.data.objects.new('guide', cd)
    bpy.context.collection.objects.link(cam)
    cam.location = target + off
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    bpy.context.view_layer.update()
    return cam, target


def px(sc, cam, p):
    c = world_to_camera_view(sc, cam, p)
    return c.x * W, (1.0 - c.y) * H     # image y from the top


def project_items(sc, cam):
    items = []
    for i, k in enumerate(ORDER, 1):
        kind = 'building' if k in LAYOUT['buildings'] else 'habitat'
        v = LAYOUT['buildings' if kind == 'building' else 'habitats'][k]
        # marker at ground level of the plot centre; buildings: lifted to mid-height so it sits on the model
        cx, cy = px(sc, cam, g2b(v['x'], v['z'], FLOOR_Y))
        it = dict(number=i, id=k, kind=kind, game_x=v['x'], game_z=v['z'], radius=v['r'],
                  px=round(cx, 1), py=round(cy, 1))
        pts = [px(sc, cam, g2b(v['x'] + v['r'] * math.cos(t), v['z'] + v['r'] * math.sin(t), FLOOR_Y))
               for t in [2 * math.pi * j / 72 for j in range(72)]]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        it['ellipse'] = dict(px=round((min(xs) + max(xs)) / 2, 1), py=round((min(ys) + max(ys)) / 2, 1),
                             rx=round((max(xs) - min(xs)) / 2, 1), ry=round((max(ys) - min(ys)) / 2, 1))
        if kind == 'habitat':
            it['plot_ellipse'] = it['ellipse']
        items.append(it)
    return items


# ---- pure-python marker compositing
FONT = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}


def composite(pix, items):
    R = 34
    S = 4   # font cell size in px
    for it in items:
        cx, cy = it['px'], it['py']
        txt = str(it['number'])
        tw = len(txt) * 5 * S + (len(txt) - 1) * S
        th = 7 * S
        x0, y0 = cx - tw / 2, cy - th / 2
        for yy in range(int(cy - R - 2), int(cy + R + 3)):
            if not 0 <= yy < H:
                continue
            for xx in range(int(cx - R - 2), int(cx + R + 3)):
                if not 0 <= xx < W:
                    continue
                d = math.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
                a_ring = min(1.0, max(0.0, R + 0.5 - d))
                if a_ring <= 0:
                    continue
                col = (0.07, 0.07, 0.10)
                if d > R - 3:
                    col = (1, 1, 1)           # white rim for contrast on any background
                u = (xx + 0.5 - x0) / S
                v = (yy + 0.5 - y0) / S
                if 0 <= v < 7 and 0 <= u < tw / S:
                    ci = int(u // 6)
                    cu = u - ci * 6
                    if ci < len(txt) and cu < 5 and FONT[txt[ci]][int(v)][int(cu)] == '1':
                        col = (1, 1, 1)
                i = (yy * W + xx) * 4
                for c in range(3):
                    pix[i + c] = pix[i + c] * (1 - a_ring) + col[c] * a_ring


def save_png(pix, path):
    img = bpy.data.images.new('out', W, H, alpha=True)
    img.pixels.foreach_set(pix)
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()


def main():
    os.makedirs(OUT, exist_ok=True)
    sc = build_scene()
    cam, target = make_camera(sc)
    clean = os.path.join(OUT, 'island-guide-clean.png')
    sc.render.filepath = clean
    bpy.ops.render.render(write_still=True)
    items = project_items(sc, cam)
    img = bpy.data.images.load(clean)
    pix = list(img.pixels)
    # bottom-up rows in Blender: flip the row index for drawing
    flipped = [0.0] * len(pix)
    for r in range(H):
        flipped[r * W * 4:(r + 1) * W * 4] = pix[(H - 1 - r) * W * 4:(H - r) * W * 4]
    composite(flipped, items)
    out = [0.0] * len(pix)
    for r in range(H):
        out[(H - 1 - r) * W * 4:(H - r) * W * 4] = flipped[r * W * 4:(r + 1) * W * 4]
    save_png(out, os.path.join(OUT, 'island-guide-labeled.png'))
    meta = dict(
        coordinate_note='game x,z (three.js, y up, +z toward camera) -> Blender (x, -z, up)',
        camera=dict(position_blender=[round(c, 3) for c in cam.location],
                    position_game=[round(cam.location.x, 3), round(cam.location.z, 3), round(-cam.location.y, 3)],
                    target_game=[target.x, 0.0, -target.y], azimuth_deg=AZ, elevation_deg=ELEV,
                    distance=DIST, fov_deg=FOV, sensor_fit='HORIZONTAL (fov is horizontal)',
                    lens_mm=cam.data.lens, sensor_width_mm=cam.data.sensor_width),
        resolution=[W, H], image_origin='top-left, pixels', items=items)
    json.dump(meta, open(os.path.join(OUT, 'island-guide.json'), 'w'), indent=2)
    print('GUIDE_OK')


main()
