"""N2 Nitrolo: two equal blue puff lobes held together by a triple bond (three short links). Calm, floats."""
from chemilib import *

C = '#7F9CF5'


def rod(a, b, r, material, verts=10):
    """Thin straight link from point a to point b (no end caps)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    c = cyl(tuple((a + b) / 2), r, d.length, material, verts=verts)
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return c


def build():
    body = mat(C, rough=0.75)
    light = mat(shade(C, 1.45), rough=0.8)
    # the face lobe sits at the origin (face() is centred on x = 0); its twin floats beside it
    head = sphere((0, -0.04, 0.5), 0.4, body)
    sphere((-1.0, 0.22, 0.52), 0.4, body)
    # triple bond: three short pale links across the gap
    for dz in (-0.13, 0.0, 0.13):
        rod((-0.3, 0.05, 0.5 + dz), (-0.72, 0.17, 0.51 + dz), 0.05, light)
    # tiny wisp tails so both lobes read as gas
    drop((0, 0.04, 0.12), 0.12, body, tip=1.4, rot=(math.pi, 0, 0))
    drop((-1.0, 0.24, 0.14), 0.12, body, tip=1.4, rot=(math.pi, 0, 0))
    face(0.5, dx=0.16, eye_r=0.085, eye='sleepy', mouth='smile', on=[head])
    return {'height': 0.85, 'hover': 0.18}
