"""NaHCO3 Bakepuff: baking soda. A puffy bun body with a golden crust on top and fizz bubbles
rising from it (the CO2 bubbles it makes with vinegar)."""
from chemilib import *

C = '#F3E3C0'
CRUST = '#D9A55B'
FIZZ = '#BFE6F5'


def build():
    dough = mat(C, rough=0.7)
    crust = mat(CRUST, rough=0.6)
    body = sphere((0, 0, 0.36), 0.5, dough, scale=(1.15, 1.0, 0.78))
    sphere((0, 0.0, 0.58), 0.4, crust, scale=(1.1, 0.95, 0.5))
    for s in (-1, 1):
        sphere((s * 0.32, -0.08, 0.05), 0.09, dough, scale=(1, 1.3, 0.6))
    for loc, r in (((-0.3, 0.05, 0.98), 0.1), ((0.0, 0.08, 1.08), 0.075), ((0.28, 0.02, 0.96), 0.09), ((0.12, 0.1, 0.9), 0.05)):
        sphere(loc, r, mat(shade(FIZZ, 1.2), rough=0.05, alpha=0.7))
    face(0.36, dx=0.2, eye_r=0.09, mouth='smile', on=[body])
    return {'height': 1.0}
