"""Si Silicub: a slate-blue computer chip. Flat square body, thin gold circuit lines on top, short silver pin legs
along two sides (silicon is the stuff of chips)."""
from chemilib import *

C = '#6E7F99'


def build():
    chip = mat(C, rough=0.5)
    gold = mat('#E9C24B', rough=0.35, metal=0.5)
    pin = mat('#CDD3DB', rough=0.3, metal=0.5)
    W, D, H, Z = 0.92, 0.8, 0.56, 0.4
    head = rbox((0, 0, Z), (W, D, H), chip, bevel=0.14)
    top = Z + H / 2
    # gold circuit traces and pads on the top
    rbox((-0.18, 0.05, top), (0.04, 0.5, 0.025), gold, bevel=0.01, segs=1)
    rbox((0.04, -0.15, top), (0.45, 0.04, 0.025), gold, bevel=0.01, segs=1)
    rbox((0.2, 0.12, top), (0.04, 0.32, 0.025), gold, bevel=0.01, segs=1)
    for p in ((-0.18, 0.3), (0.26, -0.15), (0.2, 0.28)):
        cyl((p[0], p[1], top), 0.045, 0.03, gold, verts=10)
    # orientation notch on the top front edge
    sphere((0, -D / 2 + 0.1, top), 0.07, mat(shade(C, 0.7), rough=0.6), scale=(1, 1, 0.25))
    # pin legs: three on each side, out then down to the ground
    for s in (-1, 1):
        for y in (-0.24, 0.0, 0.24):
            rbox((s * (W / 2 + 0.03), y, Z - 0.12), (0.12, 0.1, 0.07), pin, bevel=0.025, segs=1)
            rbox((s * (W / 2 + 0.07), y, (Z - 0.12) / 2), (0.07, 0.1, Z - 0.12), pin, bevel=0.025, segs=1)
    face(0.42, dx=0.18, eye_r=0.09, eye='round', mouth='smile', on=[head])
    return {'height': 0.85}
