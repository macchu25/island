"""SiC Moissy: silicon carbide (moissanite), one of the hardest materials, used in grinding wheels.
A dark teal hexagonal crystal plate holding a charcoal grinding wheel with a slate silicon hub."""
from chemilib import *

C = '#3D7F6E'
SI = '#6E7F99'
CC = '#3B3B44'


def build():
    teal = mat(shade(C, 1.1), rough=0.2)
    dark = mat(shade(C, 0.7), rough=0.4)
    plate = cyl((0, 0, 0.52), 0.5, 0.4, teal, rot=(math.pi / 2, 0, 0), verts=6)
    bev = plate.modifiers.new('bevel', 'BEVEL')
    bev.width = 0.05
    bev.segments = 2
    for p in plate.data.polygons:
        p.use_smooth = False
    for s in (-1, 1):
        sphere((s * 0.17, -0.02, 0.07), 0.1, dark, scale=(1.1, 1.3, 0.7))
        sphere((s * 0.48, -0.04, 0.38), 0.085, dark)
    # grinding wheel held in the right hand
    wheel = mat(CC, rough=0.95)
    cyl((0.68, -0.08, 0.42), 0.25, 0.09, wheel, rot=(math.pi / 2, 0, 0), verts=24)
    cyl((0.68, -0.09, 0.42), 0.085, 0.12, mat(SI, rough=0.4, metal=0.4), rot=(math.pi / 2, 0, 0), verts=12)
    face(0.55, dx=0.16, eye_r=0.09, mouth='smile', on=[plate])
    return {'height': 1.0}
