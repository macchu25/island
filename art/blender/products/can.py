"""Lon nhom: a drink can, silver body, red label band, ring pull on top."""
from chemilib import *


def build():
    alu = mat('#D5DAE2', rough=0.3, metal=0.5)
    red = mat('#E8453C', rough=0.45)
    white = mat('#FFFFFF', rough=0.5)
    cyl((0, 0, 0.5), 0.34, 0.9, alu, verts=28)
    cyl((0, 0, 0.5), 0.345, 0.5, red, verts=28)                       # label band
    cyl((0, 0, 0.5), 0.35, 0.07, white, verts=28)                     # white wave stripe
    cyl((0, 0, 0.97), 0.3, 0.06, alu, verts=28, r_top=0.26)            # tapered neck
    torus((0, 0, 1.0), 0.285, 0.025, alu, major_segs=28, minor_segs=6)  # rim
    rbox((0, 0, 1.0), (0.46, 0.46, 0.02), alu, bevel=0.2, segs=2)
    torus((0.06, -0.02, 1.03), 0.07, 0.02, white, major_segs=14, minor_segs=5)  # pull tab
    rbox((-0.07, 0.0, 1.03), (0.12, 0.05, 0.02), white, bevel=0.02, segs=1)
    return {'view': (0.5, -2.3, 1.2)}
