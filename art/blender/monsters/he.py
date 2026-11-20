"""He Heliopop: a party-balloon body with a knot and a short string. Helium floats high.
Noble gas: aloof, sleepy eyes."""
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
    latex = mat('#FFE8A3', rough=0.22)
    knot = mat(shade('#FFE8A3', 0.85), rough=0.3)
    string = mat('#F7F7F7', rough=0.8)
    body = drop((0, 0, 0.8), 0.42, latex, tip=1.18, scale=(1, 0.95, 1.05), rot=(math.pi, 0, 0))
    cyl((0, 0, 0.27), 0.06, 0.1, knot, r_top=0.03, verts=12)                  # knot
    sphere((0, 0, 0.21), 0.045, knot)
    pts = [(0.05 * math.sin(i / 10 * math.pi * 1.5), 0, 0.2 - 0.2 * i / 10) for i in range(11)]
    tube(pts, 0.012, string, sides=5)
    face(0.74, dx=0.16, eye_r=0.095, eye='sleepy', mouth='flat', on=[body])
    return {'height': 1.15, 'hover': 0.14}
