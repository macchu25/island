"""I2 Iodrift: a dark violet crystal base that turns into soft violet mist tufts on top (iodine sublimes:
solid straight to vapour)."""
from chemilib import *

C = '#5B2A86'


def build():
    crystal = mat(shade(C, 1.1), rough=0.3, metal=0.2)
    mist = mat(shade(C, 1.62), rough=0.8)
    mist2 = mat(shade(C, 1.8), rough=0.85)
    # faceted crystal base, wider than tall
    ico((0, 0, 0.26), 0.36, crystal, subdiv=1, scale=(1.25, 1.05, 0.8), flat=True)
    # mist head rising out of the crystal, carries the face
    head = sphere((0, 0, 0.66), 0.38, mist, scale=(1.05, 0.95, 0.92))
    face(0.66, dx=0.16, eye_r=0.085, eye='round', mouth='o', on=[head])
    # vapour tufts drifting off the top
    sphere((-0.24, 0.06, 0.94), 0.16, mist2)
    sphere((0.06, 0.06, 1.02), 0.18, mist2)
    sphere((0.3, 0.06, 0.92), 0.13, mist2)
    sphere((0.38, 0.06, 1.12), 0.06, mist2)
    return {'height': 1.0}
