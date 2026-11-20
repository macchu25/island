"""Na2O Natrolump: sodium oxide, a white powder. A soft white mochi lump with two little
cream sodium cubes for ears (two Na per O)."""
from chemilib import *

C = '#F1EEE4'
NA = '#E8E3C9'


def superball(loc, r, material, p=2.6, scale=(1, 1, 1)):
    """Sphere pushed towards a rounded box: p=2 is a sphere, higher p is boxier."""
    o = sphere(loc, r, material, scale=scale)
    for v in o.data.vertices:
        n = (abs(v.co.x) ** p + abs(v.co.y) ** p + abs(v.co.z) ** p) ** (1 / p)
        if n > 0:
            v.co *= r / n
    return o


def build():
    body = mat(C, rough=0.7)
    na = mat(shade(NA, 0.86), rough=0.3, metal=0.35)
    head = superball((0, 0, 0.42), 0.5, body, p=2.4, scale=(1.3, 1.0, 0.86))
    for s in (-1, 1):
        rbox((s * 0.36, 0.02, 0.8), (0.25, 0.25, 0.25), na, bevel=0.04, rot=(0, s * 0.35, s * 0.2))
        sphere((s * 0.24, -0.1, 0.05), 0.09, body, scale=(1.1, 1.2, 0.6))
    face(0.44, dx=0.2, eye_r=0.095, mouth='smile', on=[head])
    return {'height': 0.9}
