"""Thanh thep: a steel I-beam seen end-on and a little from the side, with bolts on the flanges."""
from chemilib import *


def build():
    steel = mat('#8FA2B8', rough=0.35, metal=0.5)
    steel_d = mat('#6F8197', rough=0.4, metal=0.5)
    bolt = mat('#FFC93C', rough=0.3, metal=0.35)
    L = 1.8   # length along Y (towards the back)
    y = L / 2 - 0.0
    rbox((0, y, 0.09), (0.95, L, 0.18), steel, bevel=0.03, segs=1)         # bottom flange
    rbox((0, y, 1.01), (0.95, L, 0.18), steel, bevel=0.03, segs=1)         # top flange
    rbox((0, y, 0.55), (0.18, L, 0.78), steel_d, bevel=0.02, segs=1)       # web
    for x in (-0.3, 0.3):                                                    # bolts on the top flange
        for yy in (0.4, 1.4):
            cyl((x, yy, 1.11), 0.06, 0.04, bolt, verts=6)
    return {'view': (1.9, -2.4, 1.1)}
