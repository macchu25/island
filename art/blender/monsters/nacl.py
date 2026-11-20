"""NaCl Salinub: table salt. A clean white cube crystal with two small cubes stuck on it
(a cream sodium cube and a green chlorine cube) and a salt-shaker cap on top."""
from chemilib import *

C = '#F7F7F7'
NA = '#E8E3C9'
CL = '#9BE35A'


def build():
    salt = mat(C, rough=0.35)
    na = mat(shade(NA, 0.84), rough=0.3, metal=0.4)
    cl = mat(CL, rough=0.45)
    cap = mat('#C7CED6', rough=0.3, metal=0.55)
    head = rbox((0, 0, 0.5), (0.84, 0.78, 0.8), salt, bevel=0.08)
    rbox((-0.47, -0.16, 0.66), (0.25, 0.25, 0.25), na, bevel=0.04, rot=(0.3, 0.25, 0.5))
    rbox((0.43, 0.0, 0.24), (0.22, 0.22, 0.22), cl, bevel=0.035, rot=(0.4, 0.3, 0.7))
    # salt-shaker cap with three holes
    cyl((0, 0, 0.94), 0.3, 0.1, cap, verts=20)
    sphere((0, 0, 0.98), 0.3, cap, scale=(1, 1, 0.55))
    for x, y in ((-0.1, -0.05), (0.1, -0.05), (0, 0.1)):
        sphere((x, y, 1.135), 0.035, DARK, scale=(1, 1, 0.5), segs=8, rings=4)
    for s in (-1, 1):
        sphere((s * 0.2, -0.05, 0.08), 0.1, salt, scale=(1.1, 1.3, 0.7))
    face(0.52, dx=0.17, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.0}
