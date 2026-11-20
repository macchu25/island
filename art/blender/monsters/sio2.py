"""SiO2 Quartzle: quartz. A cluster of pale six-sided quartz points on a slate silicon rock;
the biggest point has the face, one small point is oxygen-cyan."""
from chemilib import *
from mathutils import Euler

C = '#E6E0F0'
SI = '#6E7F99'
O = '#5EC8E5'


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def point(x, z, r, h, tip, material, tilt=0.0, y=0.0, tip_mat=None):
    """Hexagonal quartz point: prism of height h with a blunt six-sided tip, base at (x, y, z), tilted about Y."""
    rot = (Euler((0, tilt, 0)).to_matrix() @ Euler((0, 0, 0)).to_matrix())
    base = Vector((x, y, z))
    up = rot @ Vector((0, 0, 1))
    prism = flat(cyl(tuple(base + up * (h / 2)), r, h, material, verts=6))
    cap = flat(cyl(tuple(base + up * (h + tip / 2)), r, tip, tip_mat or material, r_top=r * 0.22, verts=6))
    for o in (prism, cap):
        o.rotation_euler = rot.to_euler()
    return prism


def build():
    q = mat(shade(C, 0.97), rough=0.25)
    qt = mat(shade(C, 0.86), rough=0.2)
    qo = mat(shade(O, 1.5), rough=0.15)
    flat(ico((0, 0.05, 0.1), 0.38, mat(SI, rough=0.8), subdiv=2, scale=(1.5, 1.05, 0.45)))
    big = point(0, 0.12, 0.4, 0.72, 0.26, q, tip_mat=qt)
    point(-0.42, 0.1, 0.19, 0.42, 0.15, q, tilt=-0.5, y=0.04, tip_mat=qt)
    point(0.44, 0.1, 0.16, 0.34, 0.12, qo, tilt=0.55, y=0.02)
    point(0.24, 0.12, 0.12, 0.26, 0.1, q, tilt=0.25, y=0.25, tip_mat=qt)
    face(0.5, dx=0.14, eye_r=0.085, mouth='smile', on=[big])
    return {'height': 1.1}
