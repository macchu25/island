"""Fe Ferrotump: sturdy iron golem baby. Magnetic (horseshoe magnet on the head), rusts (orange patch)."""
from chemilib import *

C = '#8A8D91'


def build():
    iron = mat(C, rough=0.4, metal=0.55)
    dark = mat(shade(C, 0.62), rough=0.45, metal=0.5)
    rust = mat('#C4622D', rough=0.9)
    head = rbox((0, 0, 0.72), (0.86, 0.74, 0.7), iron, bevel=0.2)
    rbox((0, 0, 0.26), (0.5, 0.42, 0.34), dark, bevel=0.12)            # tiny body
    for s in (-1, 1):
        rbox((s * 0.17, -0.02, 0.07), (0.2, 0.26, 0.14), iron, bevel=0.06)   # feet
        sphere((s * 0.34, -0.02, 0.3), 0.1, iron)                           # stubby arms
        cyl((s * 0.44, 0, 0.74), 0.07, 0.06, dark, rot=(0, math.pi / 2, 0)) # bolts
    # rust patch on one top corner
    sphere((0.27, -0.2, 0.98), 0.15, rust, scale=(1, 1, 0.5))
    # horseshoe magnet: red arc with pale tips
    red = mat('#E2504A', rough=0.5)
    tip = mat('#F2F2F2', rough=0.5)
    torus((-0.12, 0.02, 1.1), 0.13, 0.045, red, rot=(math.pi / 2, 0, 0))
    rbox((-0.25, 0.02, 1.07), (0.1, 0.1, 0.1), tip, bevel=0.03)
    rbox((0.01, 0.02, 1.07), (0.1, 0.1, 0.1), tip, bevel=0.03)
    face(0.72, dx=0.19, eye_r=0.095, mouth='smile', on=[head])
    return {'height': 1.0}
