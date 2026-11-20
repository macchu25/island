"""Al2O3 Sapphirelle: sapphire is aluminium oxide. A blue brilliant-cut gem with silver aluminium feet."""
from chemilib import *

C = '#2C5BC9'
AL = '#B8C4D0'
N = 8


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def build():
    gem = mat(shade(C, 1.1), rough=0.12)
    table = mat(shade(C, 1.45), rough=0.1)
    al = mat(AL, rough=0.35, metal=0.5)
    rz = math.pi / N
    girdle = flat(cyl((0, 0, 0.62), 0.6, 0.34, gem, verts=N, rot=(0, 0, rz)))
    flat(cyl((0, 0, 0.89), 0.6, 0.2, table, r_top=0.36, verts=N, rot=(0, 0, rz)))     # crown
    flat(cyl((0, 0, 0.25), 0.07, 0.4, gem, r_top=0.6, verts=N, rot=(0, 0, rz)))       # pavilion
    for s in (-1, 1):
        sphere((s * 0.13, -0.02, 0.06), 0.1, al, scale=(1, 1.3, 0.7))
        sphere((s * 0.6, -0.02, 0.56), 0.085, al)
    face(0.64, dx=0.14, eye_r=0.08, mouth='smile', on=[girdle])
    return {'height': 1.0}
