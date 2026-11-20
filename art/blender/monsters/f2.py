"""F2 Fluorspike: a pale yellow-green imp covered in soft rounded nubs (baby spikes). Wide eager eyes, floats."""
from chemilib import *

C = '#D7F26B'


def build():
    body = mat(C, rough=0.6)
    nub = mat(shade(C, 1.25), rough=0.6)
    head = sphere((0, 0, 0.55), 0.42, body)
    # nubs spread evenly over the ball (golden-angle spiral); none on the face disc
    n = 19
    for i in range(n):
        zf = 1 - 2 * (i + 0.5) / n
        rr = math.sqrt(1 - zf * zf)
        a = i * math.pi * (3 - math.sqrt(5))
        d = Vector((rr * math.cos(a), rr * math.sin(a), zf))
        if d.y < -0.45 and abs(d.x) < 0.75 and d.z < 0.55:
            continue
        # round nub, about 40% sunk into the body, stretched a little along its outward direction
        loc = Vector((0, 0, 0.55)) + d * 0.37
        sphere(tuple(loc), 0.12, nub, scale=(1, 1, 1.25), rot=d.to_track_quat('Z', 'Y').to_euler(), segs=10, rings=6)
    face(0.55, dx=0.17, eye_r=0.1, eye='wide', mouth='o', on=[head])
    return {'height': 1.0, 'hover': 0.18}
