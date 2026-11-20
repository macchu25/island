"""K Kalibop: soft lilac squishy block, even jumpier than sodium (arms up), with a lilac flame tuft
on its head (potassium burns with a violet flame)."""
from chemilib import *

C = '#C9A7E8'


def build():
    body_m = mat(C, rough=0.6, metal=0.1)
    flame = mat('#A877F0', rough=0.4, emit=0.9)
    core = mat('#E6D2FF', rough=0.4, emit=0.8)
    head = rbox((0, 0, 0.5), (0.78, 0.7, 0.86), body_m, bevel=0.32, segs=4)
    for s in (-1, 1):
        sphere((s * 0.18, -0.03, 0.06), 0.1, body_m, scale=(1, 1.2, 0.65))   # feet
        capsule((s * 0.38, -0.02, 0.55), (s * 0.5, -0.02, 0.78), 0.07, body_m)  # arms up, jumpy
    # flame tuft standing on the head
    drop((0.0, 0.0, 1.0), 0.17, flame, tip=1.9, rot=(0, 0.3, 0))
    drop((-0.13, 0.0, 0.96), 0.09, flame, tip=1.8, rot=(0, -0.5, 0))
    drop((0.13, 0.0, 0.95), 0.08, flame, tip=1.7, rot=(0, 0.6, 0))
    drop((0.0, -0.09, 0.98), 0.09, core, tip=1.7, rot=(0, 0.3, 0))
    face(0.48, dx=0.17, eye_r=0.095, eye='wide', mouth='o', on=[head])
    return {'height': 1.15}
