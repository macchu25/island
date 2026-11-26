"""Cuon day dien: a wooden spool wound with copper wire, one end running out."""
from chemilib import *


def build():
    copper = mat('#D9803F', rough=0.35, metal=0.45)
    copper_d = mat('#B8622B', rough=0.4, metal=0.45)
    wood = mat('#E8B07E', rough=0.7)
    # spool lies on its side: axis along Y so the winding faces the camera
    rot = (0, math.pi / 2, 0)
    for x in (-0.3, 0.3):
        cyl((x, 0, 0.5), 0.5, 0.08, wood, rot=rot, verts=28)
    cyl((0, 0, 0.5), 0.14, 0.56, wood, rot=rot, verts=14)
    # winding: 5 turns across the width, 2 layers
    for i in range(5):
        x = -0.2 + 0.1 * i
        torus((x, 0, 0.5), 0.3, 0.06, copper if i % 2 == 0 else copper_d, rot=rot, major_segs=28, minor_segs=8)
        torus((x, 0, 0.5), 0.37, 0.05, copper_d if i % 2 == 0 else copper, rot=rot, major_segs=28, minor_segs=8)
    # loose end: a curl of wire coming off the front
    capsule((0.15, -0.4, 0.22), (0.3, -0.6, 0.06), 0.04, copper, verts=8)
    capsule((0.3, -0.6, 0.06), (0.62, -0.7, 0.05), 0.04, copper, verts=8)
    return {'view': (1.3, -2.8, 0.9)}
