"""Hg Mercuripple: liquid metal that refuses to be solid. A shiny puddle blob with a few loose
droplets beside it and a small glass cap on its head (its vapour stays capped)."""
from chemilib import *

C = '#C0C8D2'


def build():
    merc = mat(C, rough=0.06, metal=0.6)
    glass = mat('#DDF2FF', rough=0.05, alpha=0.55)
    knob = mat('#8FA3B8', rough=0.3, metal=0.4)
    body = sphere((0, 0, 0.3), 0.4, merc, scale=(1.0, 0.9, 0.82))
    sphere((0, 0, 0.06), 0.4, merc, scale=(1.3, 1.15, 0.17), segs=24, rings=10)   # puddle skirt
    for x, y, r in ((0.42, -0.3, 0.16), (-0.46, 0.2, 0.15), (-0.2, -0.38, 0.12)):
        sphere((x, y, 0.05), r, merc, scale=(1.2, 1, 0.35))                       # lumpy puddle edge
    for x, y, r in ((0.62, -0.18, 0.07), (0.72, 0.02, 0.045), (-0.62, -0.22, 0.055)):
        sphere((x, y, r * 0.8), r, merc, scale=(1, 1, 0.8))                       # loose droplets
    # little glass cap with a knob, sitting on top of the blob
    cyl((0, 0, 0.66), 0.13, 0.12, glass, r_top=0.11, verts=20)
    sphere((0, 0, 0.74), 0.04, knob)
    face(0.32, dx=0.16, eye_r=0.09, mouth='o', on=[body])
    return {'height': 0.8}
