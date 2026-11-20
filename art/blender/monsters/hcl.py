"""HCl Hydrochirp: a pale green puff with one small pale-blue hydrogen ball on a short bond stick. Sour flat mouth, floats."""
from chemilib import *

C = '#C7F0B0'
H = '#9AD8FF'


def rod(a, b, r, material, verts=10):
    a, b = Vector(a), Vector(b)
    d = b - a
    c = cyl(tuple((a + b) / 2), r, d.length, material, verts=verts)
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return c


def build():
    body = mat(C, rough=0.7)
    hyd = mat(shade(H, 1.15), rough=0.5)
    head = sphere((0, 0, 0.5), 0.42, body)
    # H atom on a single bond, sticking up at the top right like an antenna
    a = math.radians(38)
    tip = (math.sin(a) * 0.68, 0.0, 0.5 + math.cos(a) * 0.68)
    rod((math.sin(a) * 0.36, 0, 0.5 + math.cos(a) * 0.36), tip, 0.035, hyd)
    sphere(tip, 0.13, hyd)
    # small wisp under the body
    drop((0, 0.05, 0.12), 0.12, body, tip=1.4, rot=(math.pi, 0, 0))
    face(0.5, dx=0.17, eye_r=0.09, eye='round', mouth='flat', on=[head])
    return {'height': 1.0, 'hover': 0.16}
