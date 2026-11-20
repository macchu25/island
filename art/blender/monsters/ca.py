"""Ca Calcimoo: chalky gentle giant. A wide soft body, a bone worn like a bow (calcium builds bones)
and chunky chalk boots."""
from chemilib import *

C = '#F4EBDD'


def build():
    chalk = mat(shade(C, 0.9), rough=0.9)
    boot = mat(shade(C, 0.72), rough=0.9)
    bone = mat('#FFF1CF', rough=0.5)
    body = rbox((0, 0, 0.54), (1.3, 0.8, 0.84), chalk, bevel=0.36, segs=4)
    for s in (-1, 1):
        rbox((s * 0.3, -0.04, 0.09), (0.36, 0.44, 0.2), boot, bevel=0.08)    # chunky boots
        sphere((s * 0.66, -0.04, 0.4), 0.11, chalk)                           # stubby arms
    # bone bow, tilted on the top-left of the head
    bx, bz, ang = -0.26, 1.1, 0.4
    ca_, sa = math.cos(ang), math.sin(ang)
    half = 0.22
    a = (bx - half * ca_, -0.05, bz + half * sa)
    b = (bx + half * ca_, -0.05, bz - half * sa)
    capsule(a, b, 0.06, bone)
    for (x, y, z) in (a, b):
        for k in (-1, 1):
            sphere((x + k * 0.06 * sa, y, z + k * 0.06 * ca_), 0.085, bone)
    sphere((bx, -0.1, bz), 0.06, mat('#FF9DB0', rough=0.6), scale=(1, 0.8, 1.2))   # pink knot: worn as a bow
    face(0.6, dx=0.22, eye_r=0.1, eye='happy', mouth='smile', on=[body])
    return {'height': 1.0}
