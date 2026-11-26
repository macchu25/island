"""Binh chua chay: a red fire extinguisher with silver valve and handle, black hose."""
from chemilib import *


def build():
    red = mat('#E02F2F', rough=0.4)
    silver = mat('#CDD3DB', rough=0.3, metal=0.6)
    black = mat('#26262B', rough=0.6)
    white = mat('#FFFFFF', rough=0.5)
    cyl((0, 0, 0.5), 0.3, 0.85, red, verts=28, r_top=0.3)                   # body
    sphere((0, 0, 0.92), 0.3, red, scale=(1, 1, 0.55), segs=24, rings=12)   # shoulder
    cyl((0, 0, 0.1), 0.31, 0.06, black, verts=28)                           # base ring
    cyl((0, 0, 0.5), 0.305, 0.22, white, verts=28)                          # label band
    cyl((0, 0, 1.08), 0.09, 0.14, silver, verts=16)                         # neck
    rbox((0.08, 0, 1.2), (0.42, 0.1, 0.07), silver, bevel=0.03, segs=2)     # top handle
    rbox((0.0, 0, 1.12), (0.3, 0.08, 0.05), silver, bevel=0.02, segs=2, rot=(0, 0.35, 0))  # lever
    capsule((0.12, 0, 1.08), (0.45, 0, 0.95), 0.05, black)                  # hose out
    capsule((0.45, 0, 0.95), (0.5, 0, 0.55), 0.05, black)                   # hose down
    cyl((0.5, 0, 0.5), 0.085, 0.1, black, verts=12, r_top=0.11)             # nozzle
    return {'view': (0.4, -2.3, 1.3)}
