"""Fe2O3 Hemarust: iron(III) oxide, rust. A rusty red-brown boulder golem with flaking plates,
long golem arms and one rusty nail stuck in its head. One flake shows grey iron underneath."""
from chemilib import *

C = '#9C3D1E'
FE = '#8A8D91'


def superball(loc, r, material, p=2.6, scale=(1, 1, 1)):
    o = sphere(loc, r, material, scale=scale)
    for v in o.data.vertices:
        n = (abs(v.co.x) ** p + abs(v.co.y) ** p + abs(v.co.z) ** p) ** (1 / p)
        if n > 0:
            v.co *= r / n
    return o


def build():
    rust = mat(C, rough=0.85)
    flake = mat('#C4622D', rough=0.9)
    dark = mat(shade(C, 0.7), rough=0.85)
    fe = mat(FE, rough=0.4, metal=0.5)
    head = superball((0, 0, 0.6), 0.45, rust, p=2.5, scale=(1.1, 0.95, 1.0))
    sphere((0, 0, 0.2), 0.24, dark, scale=(1.1, 0.9, 0.8))                      # tiny body
    for s in (-1, 1):
        capsule((s * 0.5, -0.02, 0.5), (s * 0.6, -0.06, 0.16), 0.09, rust)     # long golem arms
        sphere((s * 0.17, -0.04, 0.06), 0.11, dark, scale=(1.1, 1.3, 0.6))     # feet
    # flaking plates
    sphere((-0.38, -0.12, 0.9), 0.15, flake, scale=(1, 1, 0.25), rot=(0.3, -0.7, 0))
    sphere((0.47, -0.05, 0.62), 0.13, flake, scale=(1, 1, 0.25), rot=(0, 1.2, 0.2))
    sphere((0.185, -0.277, 0.95), 0.11, fe, scale=(1, 1, 0.25), rot=(0.7, 0.3, 0))
    # rusty nail stuck in the head
    nail = mat('#7A3A1E', rough=0.7, metal=0.3)
    cyl((0.1, 0.02, 1.08), 0.035, 0.36, nail, rot=(0, 0.35, 0), verts=8)
    cyl((0.16, 0.02, 1.25), 0.085, 0.04, nail, rot=(0, 0.35, 0), verts=12)
    face(0.6, dx=0.18, eye_r=0.095, mouth='smile', on=[head])
    return {'height': 1.15}
