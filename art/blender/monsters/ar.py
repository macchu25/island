"""Ar Argoso: lavender light bulb (argon fills light bulbs). Glass bulb body with a screw base under
it, lazy sleepy eyes. Floats low."""
from chemilib import *

C = '#B79CFF'


def build():
    glass = mat(C, rough=0.08, alpha=0.88)
    base = mat('#C9C2B4', rough=0.35, metal=0.5)
    tip = mat('#5A5560', rough=0.5)
    bulb = sphere((0, 0, 0.66), 0.42, glass, segs=28, rings=16)
    cyl((0, 0, 0.32), 0.2, 0.26, glass, r_top=0.3, verts=24)                  # neck
    cyl((0, 0, 0.13), 0.19, 0.14, base, verts=20)                             # screw base
    for z in (0.09, 0.15):
        torus((0, 0, z), 0.19, 0.022, base, major_segs=20)                    # threads
    cyl((0, 0, 0.03), 0.08, 0.06, tip, r_top=0.12, verts=14)                  # contact tip
    for s in (-1, 1):
        sphere((s * 0.3, -0.06, 0.34), 0.065, glass)                           # tiny hands at the neck
    face(0.64, dx=0.16, eye_r=0.095, eye='sleepy', mouth='smile', on=[bulb])
    return {'height': 1.05, 'hover': 0.12}
