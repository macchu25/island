"""Pb Plumbudge: squat, heavy and sleepy, shaped like a lead fishing weight with a ring on top."""
from chemilib import *

C = '#5F6670'


def build():
    lead = mat(shade(C, 1.2), rough=0.55, metal=0.35)
    ring = mat(shade(C, 0.9), rough=0.4, metal=0.5)
    body = drop((0, 0, 0.42), 0.46, lead, tip=1.1, scale=(1.15, 1, 0.85))
    for v in body.data.vertices:                      # heavy: flatten the bottom onto the ground
        if v.co.z < -0.3:
            v.co.z = -0.3 + (v.co.z + 0.3) * 0.25
    torus((0, 0, 0.97), 0.09, 0.03, ring, rot=(math.pi / 2, 0, 0), major_segs=16)
    cyl((0, 0, 0.87), 0.04, 0.08, ring, verts=10)
    for s in (-1, 1):
        sphere((s * 0.2, -0.12, 0.07), 0.09, lead, scale=(1.1, 1.2, 0.6))     # stubby feet
    face(0.47, dx=0.18, eye_r=0.095, eye='sleepy', mouth='o', on=[body])
    return {'height': 0.8}
