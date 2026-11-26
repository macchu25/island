"""Banh xa phong: a pink soap bar with an embossed top and a few bubbles."""
from chemilib import *


def build():
    pink = mat('#FF9EC4', rough=0.35)
    pink_l = mat('#FFC2DA', rough=0.35)
    bubble = mat('#DFF6FF', rough=0.1, alpha=0.75)
    rbox((0, 0, 0.19), (1.0, 0.62, 0.38), pink, bevel=0.14, segs=3)
    rbox((0, 0, 0.375), (0.7, 0.4, 0.05), pink_l, bevel=0.03, segs=2)    # embossed panel
    for dx in (-0.2, 0.0, 0.2):                                         # three little ridges
        rbox((dx, 0, 0.405), (0.06, 0.26, 0.03), pink, bevel=0.012, segs=1)
    for (x, y, z, r) in ((0.55, -0.35, 0.3, 0.14), (0.7, -0.15, 0.5, 0.1), (-0.5, -0.4, 0.45, 0.11), (0.45, -0.52, 0.62, 0.07)):
        sphere((x, y, z), r, bubble, segs=12, rings=8)
    return {'view': (0.4, -2.2, 1.5)}
