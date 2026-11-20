"""P4 Phospip: a waxy pale body made of four balls in a tetrahedron (the P4 molecule), a small green glow on top
(white phosphorus glows in the dark)."""
from chemilib import *

C = '#F6F1D1'


def build():
    wax = mat(C, rough=0.35)
    glow = mat('#5EF07E', rough=0.4, emit=0.9)
    # three base balls (one at the back, two at the front corners) and the head ball on top
    for deg in (-150, -30, 90):
        a = math.radians(deg)
        sphere((math.cos(a) * 0.27, math.sin(a) * 0.27, 0.26), 0.26, wax)
    head = sphere((0, -0.02, 0.72), 0.4, wax)
    face(0.74, dx=0.17, eye_r=0.085, eye='round', mouth='smile', on=[head])
    # little round green glow on top
    sphere((0, 0.0, 1.13), 0.1, glow)
    return {'height': 1.0}
