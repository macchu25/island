"""CuO Cupricoal: black copper(II) oxide powder. A soft black powdery heap with copper hands and feet.
Copper turns black when heated in air: the face patch is warm copper so the eyes read on the black body."""
from chemilib import *

C = '#26221F'
CU = '#D98C4A'


def build():
    soot = mat(C, rough=0.95)
    cu = mat(CU, rough=0.45, metal=0.45)
    patch_m = mat(shade(CU, 1.55), rough=0.85)
    head = sphere((0, 0, 0.5), 0.46, soot, scale=(1.12, 0.95, 0.95))
    # powder heap: soft lumps on top and at the base
    sphere((-0.24, 0.05, 0.86), 0.17, soot)
    sphere((0.2, 0.06, 0.9), 0.2, soot)
    sphere((0.0, 0.1, 0.97), 0.14, soot)
    sphere((-0.42, 0.0, 0.18), 0.17, soot, scale=(1.2, 1, 0.8))
    sphere((0.44, 0.0, 0.17), 0.16, soot, scale=(1.2, 1, 0.8))
    # copper feet and hands (the metal it came from)
    for s in (-1, 1):
        sphere((s * 0.2, -0.12, 0.07), 0.11, cu, scale=(1.1, 1.35, 0.65))
        sphere((s * 0.58, -0.08, 0.45), 0.1, cu)
    patch, _l, _n = stick(0, 0.5, 0.33, patch_m, squash=0.3, scale=(1.3, 0.95), on=[head])
    face(0.55, dx=0.17, eye_r=0.09, mouth='smile', on=[patch, head])
    return {'height': 1.0}
