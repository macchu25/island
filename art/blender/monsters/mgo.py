"""MgO Blancmag: magnesium oxide, the white powder left when magnesium burns with a dazzling
white flame. A soft white pillow block, a puff of powder at its feet, and a faint spark on top."""
from chemilib import *

C = '#FAFAF5'
MG = '#CFD6DD'


def superball(loc, r, material, p=2.6, scale=(1, 1, 1)):
    o = sphere(loc, r, material, scale=scale)
    for v in o.data.vertices:
        n = (abs(v.co.x) ** p + abs(v.co.y) ** p + abs(v.co.z) ** p) ** (1 / p)
        if n > 0:
            v.co *= r / n
    return o


def build():
    body = mat(C, rough=0.9)
    puff = mat(shade(MG, 1.25), rough=0.95)
    spark = mat('#FFD84A', rough=0.4, emit=0.9)
    head = superball((0, 0, 0.5), 0.5, body, p=3.2, scale=(1.08, 0.82, 0.86))
    # powder puffs around the base
    for x, r in ((-0.5, 0.13), (-0.3, 0.11), (0.32, 0.12), (0.52, 0.1)):
        sphere((x, -0.12, 0.08), r, puff, scale=(1.2, 1, 0.75))
    for s in (-1, 1):
        sphere((s * 0.58, -0.04, 0.48), 0.085, body)
    # faint four-point spark resting on top
    sphere((0, 0, 1.06), 0.07, spark, scale=(0.9, 0.9, 3.0))
    sphere((0, 0, 1.06), 0.07, spark, scale=(2.6, 0.9, 0.9))
    face(0.52, dx=0.19, eye_r=0.095, mouth='smile', on=[head])
    return {'height': 1.05}
