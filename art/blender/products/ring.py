"""Nhan vang: a gold ring standing up, with a cut cyan gem."""
from chemilib import *


def build():
    gold = mat('#FFC93C', rough=0.25, metal=0.5)
    gem = mat('#7FE8FF', rough=0.1, emit=0.15)
    torus((0, 0, 0.5), 0.36, 0.1, gold, rot=(math.pi / 2, 0, 0), major_segs=32, minor_segs=10)
    # gem setting: a small gold block, then a faceted stone
    rbox((0, 0, 0.92), (0.2, 0.2, 0.1), gold, bevel=0.04, segs=1)
    ico((0, 0, 1.06), 0.15, gem, subdiv=1, scale=(1, 1, 1.05), flat=True)
    return {'view': (0.45, -2.2, 0.8)}
