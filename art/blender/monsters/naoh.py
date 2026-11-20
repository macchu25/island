"""NaOH Causticub: sodium hydroxide, used to make soap. A slippery soap-bar body with soap bubbles
on top: a cream sodium bubble, a cyan oxygen bubble and a pale hydrogen bubble."""
from chemilib import *

C = '#DCE8F0'
NA = '#E8E3C9'
O = '#5EC8E5'
H = '#9AD8FF'


def superball(loc, r, material, p=2.6, scale=(1, 1, 1)):
    o = sphere(loc, r, material, scale=scale)
    for v in o.data.vertices:
        n = (abs(v.co.x) ** p + abs(v.co.y) ** p + abs(v.co.z) ** p) ** (1 / p)
        if n > 0:
            v.co *= r / n
    return o


def build():
    soap = mat(C, rough=0.15)
    head = superball((0, 0, 0.33), 0.5, soap, p=2.8, scale=(1.18, 0.7, 0.62))
    sphere((-0.28, 0.05, 0.79), 0.16, mat(shade(O, 1.3), rough=0.05, alpha=0.75))
    sphere((-0.05, 0.08, 0.72), 0.11, mat(shade(H, 1.3), rough=0.05, alpha=0.75))
    sphere((0.07, 0.07, 0.87), 0.09, mat(shade(NA, 1.1), rough=0.05, alpha=0.75))
    sphere((0.33, 0.05, 0.68), 0.075, mat(shade(O, 1.3), rough=0.05, alpha=0.75))
    for s in (-1, 1):
        sphere((s * 0.3, -0.06, 0.03), 0.08, soap, scale=(1, 1.3, 0.6))
    face(0.35, dx=0.2, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 0.9}
