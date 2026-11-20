"""H2 Hydrollo: the lightest gas. A pale puff that floats, with one curl of wisp on top."""
from chemilib import *

C = '#9AD8FF'


def build():
    body = mat(C, rough=0.75)
    light = mat(shade(C, 1.45), rough=0.8)
    head = sphere((0, 0, 0.55), 0.42, body, scale=(1.05, 0.95, 0.92))
    # soft tufts: a gas has no hard outline
    sphere((-0.3, 0.05, 0.82), 0.2, light)
    sphere((0.28, 0.05, 0.84), 0.17, light)
    sphere((0.02, 0.02, 0.98), 0.2, light)
    # wisp tail under the body instead of feet
    drop((0, 0.05, 0.16), 0.15, body, tip=1.4, rot=(math.pi, 0, 0))
    # tiny hands
    sphere((-0.47, -0.1, 0.45), 0.08, light)
    sphere((0.47, -0.1, 0.45), 0.08, light)
    face(0.56, dx=0.17, eye_r=0.09, mouth='smile', on=[head])
    return {'height': 1.0, 'hover': 0.16}
