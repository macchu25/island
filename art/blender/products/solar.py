"""Tam pin mat troi: a blue cell panel in a silver frame, tilted on a small stand."""
from chemilib import *
from products import grp


def build():
    frame = mat('#E4E8EF', rough=0.35, metal=0.4)
    cell = mat('#2D5BB8', rough=0.25)
    cell_l = mat('#4F86E8', rough=0.25)
    dark = mat('#6F7A8E', rough=0.45, metal=0.4)
    with grp(z=0.55, rx=0.9):
        rbox((0, 0, 0), (1.2, 0.8, 0.07), frame, bevel=0.025, segs=1)
        for i in range(3):
            for j in range(2):
                x = (i - 1) * 0.37
                y = (j - 0.5) * 0.36
                rbox((x, y, 0.04), (0.33, 0.32, 0.03), cell if (i + j) % 2 == 0 else cell_l, bevel=0.01, segs=1)
    # stand: a rear leg and a base
    rbox((0, 0.3, 0.22), (0.08, 0.08, 0.5), dark, bevel=0.02, segs=1, rot=(0.3, 0, 0))
    rbox((0, 0.05, 0.03), (0.9, 0.5, 0.06), dark, bevel=0.02, segs=1)
    return {'view': (0.3, -2.3, 0.9)}
