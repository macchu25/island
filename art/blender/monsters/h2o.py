"""H2O Aquabun: a water drop with two little hydrogen buns set at the bent-molecule angle."""
from chemilib import *

C = '#2F8FEA'
H = '#9AD8FF'


def build():
    water = mat(shade(C, 1.15), rough=0.18)
    hyd = mat(shade(H, 1.2), rough=0.5)
    body = drop((0, 0, 0.42), 0.44, water, tip=1.5, scale=(1.1, 1, 1))
    # the two H atoms sit about 104 degrees apart, like the real molecule
    for s in (-1, 1):
        a = math.radians(52) * s
        sphere((math.sin(a) * 0.5, 0.02, 0.42 + math.cos(a) * 0.5), 0.15, hyd)
    # shine and feet
    sphere((-0.17, -0.02, 0.05), 0.1, water, scale=(1, 1.2, 0.6))
    sphere((0.17, -0.02, 0.05), 0.1, water, scale=(1, 1.2, 0.6))
    face(0.4, dx=0.17, eye_r=0.09, mouth='o', on=[body])
    return {'height': 1.0}
