"""Ag Argentot: the shiniest mirror. A very smooth round silver head, a four-point sparkle,
and one small dark tarnish spot (silver darkens near sulfur)."""
from chemilib import *

C = '#E3E6EA'


def build():
    mirror = mat(C, rough=0.06, metal=0.6)
    soft = mat(shade(C, 0.85), rough=0.2, metal=0.5)
    spark = mat('#FFE27A', rough=0.2, emit=0.6)
    tarnish = mat('#6E6577', rough=0.7)
    head = sphere((0, 0, 0.62), 0.46, mirror, segs=32, rings=18)
    sphere((0, 0, 0.18), 0.2, soft, scale=(1, 0.9, 0.9))                   # tiny body
    for s in (-1, 1):
        sphere((s * 0.13, -0.03, 0.05), 0.09, soft, scale=(1, 1.2, 0.6))  # feet
        sphere((s * 0.24, -0.03, 0.22), 0.07, soft)                        # arms
    # four-point sparkle touching the upper front of the head, overhanging the outline
    sx, sy, sz = 0.3, -0.24, 1.0
    sphere((sx, sy, sz), 0.23, spark, scale=(0.24, 0.35, 1))
    sphere((sx, sy, sz), 0.23, spark, scale=(1, 0.35, 0.24))
    sphere((sx, sy, sz), 0.06, spark)
    face(0.6, dx=0.17, eye_r=0.1, mouth='smile', on=[head])
    stick(0.31, 0.33, 0.045, tarnish, squash=0.3, scale=(1.4, 0.8), on=[head])
    return {'height': 1.0}
