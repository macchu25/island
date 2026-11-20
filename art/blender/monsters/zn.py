"""Zn Zincabob: a bluish-grey guard with a bucket helmet and a round shield in front of one arm
(zinc coats steel and takes the rust so the steel does not)."""
from chemilib import *

C = '#A9B7BE'


def soft(o, w=0.03, segs=2):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = w
    m.segments = segs
    return o


def build():
    zinc = mat(C, rough=0.4, metal=0.4)
    helm = mat(shade(C, 0.78), rough=0.35, metal=0.5)
    shield_m = mat('#7FA6C9', rough=0.4, metal=0.3)
    boss = mat('#E5ECF2', rough=0.3, metal=0.5)
    head = sphere((0, 0, 0.6), 0.4, zinc)
    sphere((0, 0, 0.2), 0.2, zinc, scale=(1, 0.9, 0.9))                      # body
    # upside-down bucket helmet: wide rim at the brow, narrow top
    soft(cyl((0, 0, 0.95), 0.43, 0.3, helm, r_top=0.33, verts=28), 0.03)
    torus((0, 0, 0.81), 0.42, 0.035, helm, major_segs=24)
    sphere((0, 0, 1.11), 0.06, helm)
    for s in (-1, 1):
        sphere((s * 0.13, -0.03, 0.05), 0.09, zinc, scale=(1, 1.2, 0.6))     # feet
    sphere((0.27, -0.04, 0.24), 0.08, zinc)                                  # free arm
    # round shield held in front of the left arm, overhanging the side
    sphere((-0.26, -0.1, 0.24), 0.08, zinc)
    soft(cyl((-0.34, -0.2, 0.3), 0.24, 0.06, shield_m, rot=(math.pi / 2, 0, 0), verts=28), 0.02)
    sphere((-0.34, -0.24, 0.3), 0.07, boss, scale=(1, 0.6, 1))
    face(0.6, dx=0.16, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.0}
