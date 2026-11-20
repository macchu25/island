"""Ne Neonimbus: a glowing red-pink orb holding a bent, glowing neon-tube ring around itself."""
import bmesh
import chemilib
from chemilib import *


def tube(points, r, material, sides=6, flat=1.0, cap=True):
    """Sweep a small ring along a list of points (parallel-transport frame, no twist jumps).
    r is a number or a function of t in [0, 1]. flat < 1 squashes the section into a ribbon."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    tans = []
    for i in range(n):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tans.append((b - a).normalized())
    ref = Vector((0, -1, 0)) if abs(tans[0].y) < 0.9 else Vector((1, 0, 0))
    nrm = (ref - tans[0] * ref.dot(tans[0])).normalized()
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        if i:
            nrm = (nrm - tans[i] * nrm.dot(tans[i])).normalized()
        bin_ = tans[i].cross(nrm)
        rr = r(i / (n - 1)) if callable(r) else r
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            ring.append(bm.verts.new(p + (nrm * math.cos(a) * flat + bin_ * math.sin(a)) * rr))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    if cap:
        bm.faces.new(rings[0])
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('tube')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('tube', me)
    bpy.context.collection.objects.link(o)
    return chemilib._register(o, chemilib._as_mat(material))


def build():
    orb_m = mat('#FF5E7E', rough=0.35, emit=0.45)
    tube_m = mat('#FF6A3D', rough=0.3, emit=1.0)
    cap = mat('#8E8E9A', rough=0.4, metal=0.5)
    orb = sphere((0, 0, 0.6), 0.42, orb_m, segs=28, rings=16)
    # neon tube bent into a wavy ring around the waist, slightly tilted, held by both hands
    pts = []
    for i in range(49):
        th = 2 * math.pi * i / 48
        rr = 0.56
        pts.append((rr * math.cos(th), rr * math.sin(th) * 0.85, 0.4 + 0.12 * math.sin(2 * th) - 0.08 * math.sin(th)))
    tube(pts, 0.035, tube_m, sides=6, cap=False)
    for s in (-1, 1):
        sphere((s * 0.47, 0, 0.45), 0.1, orb_m)                           # hands gripping the tube
    # electrode caps where the bent tube ends meet
    cyl((0.56, 0, 0.4), 0.05, 0.1, cap, rot=(math.pi / 2, 0, 0), verts=10)
    face(0.66, dx=0.16, eye_r=0.095, mouth='o', on=[orb])
    return {'height': 1.0, 'hover': 0.18}
