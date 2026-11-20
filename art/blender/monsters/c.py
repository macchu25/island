"""C Soota: a rounded charcoal lump with soft facets and one small bright diamond gem on the forehead
(carbon is both graphite and diamond)."""
from chemilib import *

C = '#3B3B44'


def build():
    coal = mat(shade(C, 1.1), rough=0.85)
    dust = mat(shade(C, 1.75), rough=0.9)
    gem = mat('#BFF3FF', rough=0.05, emit=0.35)
    head = ico((0, 0, 0.5), 0.46, coal, subdiv=2, scale=(1.12, 0.95, 0.92))
    # pale soot-dust muzzle so the dark eyes read on the black lump
    patch, _l, _n = stick(0, 0.44, 0.27, dust, squash=0.3, scale=(1.3, 0.85), sink=0.2, on=[head])
    face(0.47, dx=0.16, eye_r=0.085, eye='round', mouth='smile', on=[patch])
    # diamond on the forehead: a small brilliant (flat top, pointed bottom)
    loc, n = chemilib_hit(0, 0.76, [head])
    gz = loc.z if loc is not None else 0.76
    gy = (loc.y if loc is not None else -0.3) - 0.02
    cyl((0, gy, gz + 0.05), 0.11, 0.055, gem, verts=8, r_top=0.075, rot=(-0.35, 0, 0))
    cyl((0, gy + 0.01, gz - 0.03), 0.11, 0.11, gem, verts=8, r_top=0.0, rot=(math.pi - 0.35, 0, 0))
    # stubby feet and hands
    for s in (-1, 1):
        sphere((s * 0.2, -0.05, 0.08), 0.12, coal, scale=(1, 1.2, 0.7))
        sphere((s * 0.5, -0.05, 0.36), 0.09, coal)
    return {'height': 0.9}


def chemilib_hit(x, z, on):
    import chemilib
    return chemilib._hit(x, z, on)
