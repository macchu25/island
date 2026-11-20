"""Cu2O Rubicup: copper(I) oxide, the red mineral cuprite. A ruby-red chamfered cube crystal
with two copper studs on top (two Cu per O)."""
from chemilib import *

C = '#B5332B'
CU = '#D98C4A'


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def build():
    ruby = mat(shade(C, 1.08), rough=0.2)
    dark = mat(shade(C, 0.75), rough=0.3)
    cu = mat(CU, rough=0.35, metal=0.5)
    head = flat(rbox((0, 0, 0.56), (1.0, 0.82, 0.86), ruby, bevel=0.2, segs=1))
    for s in (-1, 1):
        rbox((s * 0.2, -0.02, 0.07), (0.22, 0.26, 0.16), dark, bevel=0.06)     # feet
        sphere((s * 0.54, -0.04, 0.42), 0.09, dark)                             # stubby hands
        cyl((s * 0.22, 0, 1.0), 0.085, 0.12, cu)                                # copper studs
        sphere((s * 0.22, 0, 1.06), 0.085, cu, scale=(1, 1, 0.7))
    face(0.6, dx=0.17, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.0}
