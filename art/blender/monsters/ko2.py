"""KO2 Superkal: potassium superoxide, the oxygen source in rebreathers. A little hero with a clear
bubble helmet and a cape. Lilac cape and boots for potassium, cyan helmet tint for oxygen."""
from chemilib import *

C = '#F2B33D'
K = '#C9A7E8'
O = '#5EC8E5'


def build():
    body = mat(C, rough=0.5)
    cape_m = mat(K, rough=0.7)
    glass = mat(shade(O, 1.35), rough=0.02, alpha=0.2)
    ring = mat(O, rough=0.35, metal=0.3)
    head = sphere((0, 0, 0.66), 0.36, body, scale=(1.05, 0.95, 0.95))
    sphere((0, 0, 0.24), 0.22, body, scale=(1, 0.9, 1))                      # tiny body
    # cape: flat cone behind the body, flaring wider than the helmet at the bottom
    cape = cyl((0, 0.17, 0.27), 0.5, 0.5, cape_m, r_top=0.2, verts=20)
    cape.scale = (1.0, 0.32, 1.0)
    torus((0, 0, 0.36), 0.2, 0.05, ring, minor_segs=6)                       # helmet collar
    for s in (-1, 1):
        sphere((s * 0.12, -0.05, 0.06), 0.09, cape_m, scale=(1, 1.3, 0.7))   # boots
        sphere((s * 0.27, -0.06, 0.27), 0.075, body)                          # hands
    sphere((0, -0.2, 0.26), 0.055, ring)                                      # chest emblem: an O2 bubble
    face(0.64, dx=0.15, eye_r=0.085, mouth='smile', on=[head])
    sphere((0, 0, 0.67), 0.47, glass)                                        # bubble helmet last
    shine = sphere((0.2, -0.36, 0.88), 0.055, mat(WHITE, rough=0.2, emit=0.8), scale=(0.8, 0.4, 2.0))
    shine.rotation_euler = (0.55, 0.0, -0.5)
    return {'height': 1.05}
