"""Render picker thumbnails from the shipped monster .glb files.

  blender -b -P art/blender/thumbs.py -- [--size 256] [<id> ...]     (no ids = every .glb)

Writes apps/web/public/assets/monsters/thumbs/<id>.png: transparent background, 3/4 front view.
Thumbnails are rendered from the .glb (not the recipe) so the picture matches what the island shows.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MONSTERS = os.path.join(ROOT, 'apps', 'web', 'public', 'assets', 'monsters')
OUT = os.path.join(MONSTERS, 'thumbs')


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def render(mid, size):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MONSTERS, mid + '.glb'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2
    span = max(hi.x - lo.x, hi.z - lo.z, 0.6)

    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'

    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.85, 0.9, 1.0, 1)
    bg.inputs['Strength'].default_value = 1.0
    sc.world = world

    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3.0
    sun_data.angle = math.radians(12)
    sun = bpy.data.objects.new('sun', sun_data)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(45), 0, math.radians(35))

    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 60
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    # Monsters face -Y in Blender: look from the front, a little to the right and above.
    cam.location = centre + Vector((0.75, -2.6, 0.7)) * span
    look_at(cam, centre)
    sc.camera = cam

    sc.render.filepath = os.path.join(OUT, mid + '.png')
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    size = 256
    if '--size' in argv:
        size = int(argv[argv.index('--size') + 1])
        del argv[argv.index('--size'):argv.index('--size') + 2]
    ids = argv or sorted(f[:-4] for f in os.listdir(MONSTERS) if f.endswith('.glb'))
    os.makedirs(OUT, exist_ok=True)
    for mid in ids:
        render(mid, size)
    print('THUMBS_OK %d' % len(ids))


main()
