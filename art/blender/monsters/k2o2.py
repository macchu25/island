"""K2O2 Kaliperk: potassium peroxide. A round lilac-white ball with the same O-O bubble bow worn
on one side, and a lilac flame tuft (potassium burns violet)."""
from chemilib import *

C = '#E9DDF5'
K = '#C9A7E8'
O = '#5EC8E5'


def build():
    body = mat(C, rough=0.6)
    feet = mat(K, rough=0.6)
    flame = mat('#9B5DE0', rough=0.5, emit=0.7)
    bub = mat(shade(O, 1.15), rough=0.25)
    head = sphere((0, 0, 0.47), 0.45, body, scale=(1.12, 1.0, 0.98))
    # lilac flame tuft on top
    drop((-0.02, 0.02, 0.99), 0.15, flame, tip=1.6, rot=(0, -0.2, 0))
    drop((0.14, 0.04, 0.92), 0.08, flame, tip=1.5, rot=(0, 0.5, 0))
    # the O-O bow, worn over one ear
    bx, bz = 0.4, 0.78
    for s in (-1, 1):
        sphere((bx - s * 0.095, -0.05, bz + s * 0.095), 0.12, bub, scale=(1.05, 0.7, 0.85), rot=(0, 0.785, 0))
        sphere((s * 0.18, -0.08, 0.05), 0.09, feet, scale=(1, 1.3, 0.65))
        sphere((s * 0.5, -0.05, 0.36), 0.075, body)
    sphere((bx, -0.07, bz), 0.055, mat(shade(O, 0.8), rough=0.4))
    face(0.46, dx=0.17, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.05}
