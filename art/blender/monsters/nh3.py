"""NH3 Ammobloom: a mint ball body standing on three small hydrogen balls like a tripod (trigonal pyramid).
A tiny two-leaf sprout on top: ammonia feeds crops. Floats low."""
from chemilib import *

C = '#B6E3D4'
H = '#9AD8FF'


def rod(a, b, r, material, verts=10):
    a, b = Vector(a), Vector(b)
    d = b - a
    c = cyl(tuple((a + b) / 2), r, d.length, material, verts=verts)
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return c


def build():
    body = mat(C, rough=0.65)
    hyd = mat(shade(H, 1.15), rough=0.5)
    leaf = mat('#7CCB6B', rough=0.6)
    head = sphere((0, 0, 0.6), 0.42, body)
    # three H legs, 120 degrees apart: one at the back, two at the front corners
    for deg in (90, 210, 330):
        a = math.radians(deg)
        foot = (math.cos(a) * 0.34, math.sin(a) * 0.34, 0.1)
        rod((math.cos(a) * 0.15, math.sin(a) * 0.15, 0.3), foot, 0.04, hyd)
        sphere(foot, 0.12, hyd)
    # sprout
    cyl((0, 0, 1.06), 0.025, 0.12, leaf)
    for s in (-1, 1):
        drop((s * 0.1, 0, 1.13), 0.07, leaf, tip=1.8, scale=(1, 0.5, 1), rot=(0, s * math.radians(60), 0))
    face(0.6, dx=0.17, eye_r=0.09, eye='round', mouth='smile', on=[head])
    return {'height': 1.0, 'hover': 0.12}
