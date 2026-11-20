"""S8 Sulfurrow: a yellow crystal baby wearing a crown ring of eight small beads (the puckered S8 ring)."""
from chemilib import *

C = '#F2D21B'


def build():
    body = mat(C, rough=0.45)
    bead = mat(shade(C, 1.35), rough=0.35)
    head = ico((0, 0, 0.62), 0.42, body, subdiv=2, scale=(1.08, 0.95, 0.95), flat=True)
    sphere((0, 0, 0.2), 0.2, body, scale=(1.1, 1, 0.9))                 # tiny body
    for s in (-1, 1):
        sphere((s * 0.13, -0.04, 0.06), 0.09, body, scale=(1, 1.25, 0.65))   # feet
        sphere((s * 0.26, -0.03, 0.24), 0.07, body)                         # hands
    face(0.6, dx=0.17, eye_r=0.09, eye='round', mouth='smile', on=[head])
    # crown: eight beads in a ring, alternately up and down like the real puckered S8 ring
    for i in range(8):
        a = i * math.pi / 4
        z = 1.0 + (0.05 if i % 2 == 0 else -0.01)
        sphere((math.cos(a) * 0.24, math.sin(a) * 0.22 + 0.02, z), 0.075, bead)
    return {'height': 1.0}
