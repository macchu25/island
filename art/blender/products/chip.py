"""Chip dien tu: a dark package with a lighter die and gold pins on four sides."""
from chemilib import *


def build():
    body = mat('#2F3B4A', rough=0.4)
    die = mat('#66788C', rough=0.35, metal=0.3)
    gold = mat('#FFC93C', rough=0.3, metal=0.4)
    mint = mat('#7EDCC4', rough=0.4)
    rbox((0, 0, 0.14), (0.8, 0.8, 0.16), body, bevel=0.05, segs=2)
    rbox((0, 0, 0.245), (0.46, 0.46, 0.05), die, bevel=0.02, segs=1)
    rbox((0, 0, 0.275), (0.24, 0.24, 0.02), mint, bevel=0.01, segs=1)
    for i in range(5):
        t = (i - 2) * 0.15
        for s in (-1, 1):
            rbox((s * 0.5, t, 0.1), (0.2, 0.07, 0.04), gold, bevel=0.01, segs=1)
            rbox((t, s * 0.5, 0.1), (0.07, 0.2, 0.04), gold, bevel=0.01, segs=1)
    cyl((-0.28, -0.28, 0.23), 0.04, 0.02, gold, verts=8)        # pin-1 dot
    return {'view': (0.25, -1.7, 1.6)}
