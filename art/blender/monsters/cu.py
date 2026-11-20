"""Cu Cuprikin: copper golem baby with a coiled-wire antenna (copper conducts) carrying a little
spark at its tip, and one green patina spot."""
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
    copper = mat('#D98C4A', rough=0.35, metal=0.5)
    dark = mat(shade('#D98C4A', 0.75), rough=0.4, metal=0.5)
    patina = mat('#5FBF9F', rough=0.8)
    spark = mat('#FFE07A', rough=0.3, emit=2.0)
    head = rbox((0, 0, 0.66), (1.0, 0.72, 0.6), copper, bevel=0.28, segs=3)   # wide pill head
    cyl((0, 0, 0.27), 0.2, 0.3, dark, verts=20)                                # body
    for s in (-1, 1):
        capsule((s * 0.12, 0, 0.14), (s * 0.13, 0, 0.06), 0.08, dark)       # legs
        sphere((s * 0.13, -0.04, 0.04), 0.1, copper, scale=(1, 1.3, 0.6))   # feet
        capsule((s * 0.22, 0, 0.34), (s * 0.32, -0.03, 0.22), 0.06, dark)   # arms
        sphere((s * 0.34, -0.04, 0.2), 0.08, copper)                        # mitts
    # coiled wire antenna: a spring standing on the head
    pts = []
    for i in range(43):
        t = i / 42
        th = 2 * math.pi * 3.5 * t
        pts.append((0.075 * math.cos(th), 0.075 * math.sin(th), 0.94 + 0.3 * t))
    pts.insert(0, (0.075, 0, 0.9))
    tube(pts, 0.022, copper, sides=6)
    sphere((0, 0, 1.26), 0.07, spark)
    face(0.66, dx=0.2, eye_r=0.095, mouth='smile', on=[head])
    stick(0.36, 0.86, 0.07, patina, squash=0.3, scale=(1.3, 0.9), on=[head])
    return {'height': 1.15}
