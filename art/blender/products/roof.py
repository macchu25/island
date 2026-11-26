"""Tam ton: a corrugated roof sheet (a row of tubes) tilted up, with four screws."""
from chemilib import *
from products import grp


def build():
    sheet = mat('#E8704F', rough=0.45, metal=0.2)
    sheet_d = mat('#C95A3C', rough=0.5, metal=0.2)
    screw = mat('#E4E8EF', rough=0.3, metal=0.5)
    with grp(z=0.55, rx=0.95):
        n = 8
        for i in range(n):
            x = (i - (n - 1) / 2) * 0.17
            cyl((x, 0, 0), 0.105, 1.15, sheet if i % 2 == 0 else sheet_d, rot=(math.pi / 2, 0, 0), verts=12)
        for i in range(n - 1):
            x = (i - (n - 2) / 2) * 0.17
            cyl((x, 0, -0.04), 0.07, 1.15, sheet_d if i % 2 == 0 else sheet, rot=(math.pi / 2, 0, 0), verts=8)
        for x in (-0.425, 0.425):
            for y in (-0.4, 0.4):
                sphere((x, y, 0.1), 0.05, screw, scale=(1, 1, 0.7), segs=8, rings=5)
    return {'view': (0.4, -2.4, 0.8)}
