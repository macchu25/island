"""Mg Magflick: a silvery egg baby with a curled magnesium ribbon on its head.
The ribbon burns at its tip with a dazzling white spark."""
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
    silver = mat('#CFD6DD', rough=0.3, metal=0.45)
    ribbon = mat(shade('#CFD6DD', 0.85), rough=0.25, metal=0.55)
    spark = mat('#FFFFFF', rough=0.2, emit=3.0)
    glow = mat('#FFEB8A', rough=0.3, emit=0.7)
    head = sphere((0, 0, 0.55), 0.42, silver, scale=(0.95, 0.9, 1.08), segs=28, rings=16)
    for s in (-1, 1):
        sphere((s * 0.16, -0.04, 0.06), 0.1, silver, scale=(1, 1.2, 0.65))   # feet
        sphere((s * 0.42, -0.04, 0.42), 0.085, silver)                      # arms
    # ribbon: rises from the crown, makes one loop to the side, ends in a spark
    pts = []
    for i in range(41):
        t = i / 40
        th = 2 * math.pi * 1.15 * t
        x = 0.16 * math.sin(th) + 0.1 * t
        z = 0.94 + 0.28 * t + 0.16 * (1 - math.cos(th)) * 0.9
        pts.append((x, 0, z))
    tube(pts, 0.065, ribbon, sides=6, flat=0.3)
    ex, _, ez = pts[-1]
    sphere((ex, 0, ez), 0.09, spark)
    sphere((ex, 0, ez), 0.2, glow, scale=(1, 0.3, 0.25))
    sphere((ex, 0, ez), 0.2, glow, scale=(0.25, 0.3, 1))
    face(0.52, dx=0.16, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.15}
