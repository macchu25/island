"""Na2O2 Peroxipip: sodium peroxide. A pale yellow egg wearing a bow made of two joined cyan
oxygen bubbles: the O-O peroxide bond."""
from chemilib import *

C = '#F5E6A8'
O = '#5EC8E5'


def build():
    body = mat(C, rough=0.55)
    feet = mat(shade(C, 0.85), rough=0.6)
    bub = mat(shade(O, 1.15), rough=0.25)
    knot = mat(shade(O, 0.8), rough=0.4)
    head = sphere((0, 0, 0.5), 0.42, body, scale=(1.0, 0.95, 1.2))
    # bow on top: two oxygen bubbles joined by a short bond
    for s in (-1, 1):
        sphere((s * 0.19, 0.02, 1.03), 0.15, bub, scale=(1.05, 0.7, 0.85), rot=(0, s * 0.35, 0))
        sphere((s * 0.16, -0.08, 0.07), 0.09, feet, scale=(1, 1.3, 0.65))
        sphere((s * 0.43, -0.05, 0.38), 0.075, body)
    cyl((0, 0.02, 1.02), 0.04, 0.2, knot, rot=(0, math.pi / 2, 0), verts=8)
    sphere((0, 0.0, 1.0), 0.065, knot)
    face(0.48, dx=0.16, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.1}
