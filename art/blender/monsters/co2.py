"""CO2 Fizzcarb: three balls in a straight line (O=C=O). Charcoal middle with the face, a pale cyan ball each side,
fizz bubbles above. Floats."""
from chemilib import *

C = '#D6DEE6'
CARBON = '#3B3B44'


def build():
    carbon = mat(shade(CARBON, 1.2), rough=0.7)
    oxy = mat('#BFE6F2', rough=0.6)
    pale = mat(C, rough=0.7)
    fizz = mat('#E2F6FC', rough=0.1)
    head = sphere((0, 0, 0.5), 0.38, carbon)
    for s in (-1, 1):
        sphere((s * 0.6, 0.04, 0.5), 0.27, oxy)
    # pale face patch so dark eyes read on the charcoal ball
    patch, _l, _n = stick(0, 0.46, 0.27, pale, squash=0.35, scale=(1.15, 0.9), sink=0.2, on=[head])
    face(0.48, dx=0.15, eye_r=0.08, eye='round', mouth='o', on=[patch])
    # fizz bubbles rising from the top
    sphere((0.06, 0.0, 0.96), 0.09, fizz)
    sphere((-0.16, 0.0, 1.1), 0.07, fizz)
    sphere((0.14, 0.0, 1.22), 0.055, fizz)
    return {'height': 1.0, 'hover': 0.18}
