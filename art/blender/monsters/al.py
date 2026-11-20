"""Al Alumbo: a light drink-can body (aluminium cans) with a ring-pull tab on top."""
import chemilib
from chemilib import *

C = '#B8C4D0'


def soft(o, w=0.03, segs=2):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = w
    m.segments = segs
    return o


def build():
    can = mat(C, rough=0.3, metal=0.5)
    rim = mat(shade(C, 1.3), rough=0.25, metal=0.55)
    band = mat('#7FB8E8', rough=0.5)
    body = soft(cyl((0, 0, 0.5), 0.36, 0.84, can, verts=32), 0.05, 3)
    soft(cyl((0, 0, 0.98), 0.36, 0.12, rim, r_top=0.29, verts=32), 0.02)   # tapered neck
    torus((0, 0, 1.04), 0.27, 0.035, rim, major_segs=28)                    # top rim
    # ring-pull: a flat loop lying on the lid, plus the rivet
    torus((0, -0.11, 1.08), 0.1, 0.032, rim, rot=(-0.45, 0, 0), major_segs=16)   # tab, tipped up a little
    sphere((0, 0, 1.05), 0.04, rim)
    soft(cyl((0, 0, 0.28), 0.365, 0.16, band, verts=32), 0.02)             # label band
    for s in (-1, 1):
        sphere((s * 0.15, -0.04, 0.05), 0.1, can, scale=(1, 1.2, 0.6))     # feet
        sphere((s * 0.41, -0.02, 0.48), 0.08, can)                          # arms
    face(0.62, dx=0.14, eye_r=0.085, mouth='smile', on=[body])
    return {'height': 1.1}
