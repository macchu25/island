"""Au Aurumble: a gold bar (trapezoid ingot) head with a tiny crown and proud happy eyes.
Gold never tarnishes, so it is smooth and clean."""
import bmesh
import chemilib
from chemilib import *

C = '#FFC93C'


def ingot(loc, bottom, top, h, material, bevel=0.08):
    """Trapezoid prism: bottom = (x, y) full size at the base, top = (x, y) at the top."""
    bm = bmesh.new()
    vs = []
    for (w, d), z in ((bottom, -h / 2), (top, h / 2)):
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            vs.append(bm.verts.new((sx * w / 2, sy * d / 2, z)))
    for f in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('ingot')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('ingot', me)
    o.location = loc
    bpy.context.collection.objects.link(o)
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = bevel
    m.segments = 3
    return chemilib._register(o, chemilib._as_mat(material))


def slope_smile(x, z, eye_r, target):
    """chemilib's smile, but turned to follow the surface normal (the ingot front is sloped)."""
    loc, n = chemilib._hit(x, z, [target])
    bpy.ops.mesh.primitive_torus_add(major_radius=eye_r * 0.55, minor_radius=eye_r * 0.13,
                                     major_segments=14, minor_segments=5, location=(0, 0, 0))
    t = bpy.context.view_layer.objects.active
    bm = bmesh.new()
    bm.from_mesh(t.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
    bm.to_mesh(t.data)
    bm.free()
    q = n.to_track_quat('-Y', 'Z')
    from mathutils import Euler
    t.rotation_euler = (q @ Euler((math.pi / 2, 0, 0)).to_quaternion()).to_euler()
    t.location = tuple(loc - n * 0.004)
    chemilib._register(t, DARK)


def build():
    gold = mat(C, rough=0.25, metal=0.6)
    deep = mat(shade(C, 0.82), rough=0.3, metal=0.6)
    gem = mat('#E8455A', rough=0.2)
    head = ingot((0, 0, 0.62), (1.05, 0.7), (0.72, 0.44), 0.62, gold, bevel=0.1)
    sphere((0, 0, 0.2), 0.19, deep, scale=(1, 0.9, 0.9))                     # tiny body
    for s in (-1, 1):
        sphere((s * 0.14, -0.03, 0.05), 0.09, deep, scale=(1, 1.2, 0.6))     # feet
        sphere((s * 0.26, -0.03, 0.24), 0.075, deep)                         # arms
    # tiny crown: band with five rounded points and one gem
    cyl((0.1, 0, 0.96), 0.13, 0.1, deep, verts=16)
    for i in range(5):
        a = 2 * math.pi * i / 5 + math.pi / 2
        sphere((0.1 + 0.13 * math.cos(a), 0.13 * math.sin(a), 1.04), 0.04, deep)
    sphere((0.1, -0.13, 0.96), 0.035, gem)
    face(0.6, dx=0.2, eye_r=0.095, eye='happy', mouth='none', on=[head])
    slope_smile(0, 0.47, 0.095, head)
    return {'height': 1.0}
