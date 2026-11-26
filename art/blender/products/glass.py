"""Tam kinh: a clear window pane in a thin white frame, tilted back with two glints."""
from chemilib import *
from products import grp


def build():
    frame = mat('#FFF4E2', rough=0.5)
    pane = mat('#9FE3FF', rough=0.05, alpha=0.75)
    glint = mat('#FFFFFF', rough=0.3, alpha=0.9)
    with grp(z=0.5, rx=-0.18, rz=0.0):
        rbox((0, 0, 0), (0.95, 0.05, 1.15), pane, bevel=0.02, segs=1)
        for sx in (-1, 1):
            rbox((sx * 0.5, 0, 0), (0.1, 0.1, 1.2), frame, bevel=0.03, segs=2)
        for sz in (-1, 1):
            rbox((0, 0, sz * 0.6), (1.1, 0.1, 0.1), frame, bevel=0.03, segs=2)
        for dx, w in ((-0.18, 0.1), (0.0, 0.05)):
            rbox((dx, -0.035, 0.18), (w, 0.012, 0.6), glint, bevel=0.005, rot=(0, 0.5, 0), segs=1)
    # a little stand so it reads as a pane, not a wall
    rbox((0, -0.12, 0.03), (1.0, 0.4, 0.06), frame, bevel=0.025, segs=1)
    return {'view': (0.7, -2.3, 0.9)}
