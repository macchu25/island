"""CO Smolderwisp: a grey wisp of two unequal fused lobes, a small charcoal C and a larger cyan-grey O. Sneaky eyes, floats."""
from chemilib import *

C = '#8F9AA6'
CARBON = '#3B3B44'


def build():
    body = mat(shade(C, 1.12), rough=0.75)
    carbon = mat(shade(CARBON, 1.15), rough=0.8)
    head = sphere((0, 0, 0.55), 0.42, body)                   # O lobe, carries the face
    sphere((-0.5, 0.06, 0.6), 0.26, carbon)                   # C lobe, fused on the side
    # smoky tail curling away under the body
    drop((0.1, 0.06, 0.18), 0.15, body, tip=1.7, rot=(0, math.pi - 0.4, 0))
    sphere((0.28, 0.08, 0.05), 0.06, body)
    face(0.56, dx=0.17, eye_r=0.09, eye='sleepy', mouth='smile', on=[head])
    return {'height': 1.0, 'hover': 0.2}
