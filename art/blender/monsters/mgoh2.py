"""Mg(OH)2 Milkymag: milk of magnesia. A chubby milk-bottle body with a silver magnesium foil cap
and two OH ears (a cyan oxygen ball with a tiny pale hydrogen ball)."""
from chemilib import *

C = '#EAF4F4'
MG = '#CFD6DD'
O = '#5EC8E5'
H = '#9AD8FF'


def build():
    milk = mat(C, rough=0.35)
    cap = mat(MG, rough=0.3, metal=0.5)
    o = mat(O, rough=0.4)
    h = mat(shade(H, 1.3), rough=0.5)
    head = sphere((0, 0, 0.42), 0.43, milk, scale=(1.0, 0.95, 1.05))
    cyl((0, 0, 0.86), 0.2, 0.24, milk, r_top=0.17, verts=20)                 # bottle neck
    cyl((0, 0, 1.0), 0.2, 0.08, cap, verts=20)                                # foil cap
    sphere((0, 0, 1.04), 0.2, cap, scale=(1, 1, 0.3))
    for s in (-1, 1):
        sphere((s * 0.36, 0.0, 0.72), 0.1, o)                                 # O of the OH ear
        sphere((s * 0.45, 0.0, 0.8), 0.055, h)                                # H of the OH ear
        sphere((s * 0.16, -0.08, 0.04), 0.09, milk, scale=(1, 1.3, 0.6))
    face(0.42, dx=0.16, eye_r=0.09, mouth='o', on=[head])
    return {'height': 1.05}
