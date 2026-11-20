"""Cl2 Chlorquill: a pale green two-lobed gas prankster with swim goggles pushed up on its forehead (pool chlorine)."""
from chemilib import *

C = '#9BE35A'


def build():
    body = mat(C, rough=0.7)
    strap = mat('#3E7BD6', rough=0.5)
    rim = mat('#FF7FA8', rough=0.4)
    glass = mat('#CFF4FF', rough=0.08)
    # two equal fused lobes (Cl-Cl); a flat filler smooths the seam where the face sits
    lobes = [sphere((s * 0.24, 0.0, 0.5), 0.38, body) for s in (-1, 1)]
    head = sphere((0, 0.02, 0.48), 0.36, body, scale=(1, 0.95, 0.95))
    face(0.46, dx=0.17, eye_r=0.09, eye='happy', mouth='smile', on=[head] + lobes)
    # goggles pushed up: strap hugging the forehead, a lens on each lobe poking above the top
    torus((0, 0.0, 0.72), 0.5, 0.04, strap, scale=(1.12, 0.72, 1), major_segs=24, minor_segs=5)
    for s in (-1, 1):
        x = s * 0.22
        torus((x, -0.22, 0.83), 0.11, 0.035, rim, rot=(math.radians(60), 0, 0), major_segs=16, minor_segs=5)
        cyl((x, -0.21, 0.83), 0.1, 0.04, glass, rot=(math.radians(60), 0, 0), verts=14)
    torus((0, -0.3, 0.8), 0.05, 0.02, rim, rot=(0, math.pi / 2, 0), scale=(1, 1, 0.6), major_segs=10, minor_segs=4)
    return {'height': 0.95, 'hover': 0.18}
