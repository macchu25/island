"""Fe3O4 Lodestomp: magnetite, the natural magnet (lodestone). A black faceted rock with iron
filings standing up on it like soft hair, holding a small compass."""
from chemilib import *

C = '#1E1B1A'
FE = '#8A8D91'


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def rod(a, b, r, material):
    """Thin cheap rod from a to b with a round tip at b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    c = cyl(tuple((a + b) / 2), r, d.length, material, verts=6)
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    sphere(tuple(b), r, material, segs=6, rings=4)
    return c


def build():
    rock = mat(C, rough=0.75, metal=0.2)
    fe = mat(FE, rough=0.45, metal=0.5)
    patch_m = mat(shade(FE, 1.6), rough=0.8)
    head = flat(ico((0, 0, 0.5), 0.5, rock, subdiv=2, scale=(1.12, 0.95, 1.0)))
    # iron filings standing up along the magnetic field: short, thick, round-tipped
    for x in (-0.33, -0.2, -0.07, 0.07, 0.2, 0.33):
        for y in (-0.12, 0.05, 0.2):
            xx = x + (0.06 if y > 0 else 0) - (0.06 if y > 0.1 else 0)
            e = max(0.0, 1 - (xx / 0.56) ** 2 - (y / 0.47) ** 2)
            z0 = 0.5 + 0.5 * math.sqrt(e) - 0.08
            rod((xx, y, z0), (xx * 1.3, y, z0 + 0.2 - abs(xx) * 0.1), 0.038, fe)
    # stubby arms; the right hand holds a compass
    for s in (-1, 1):
        sphere((s * 0.2, -0.1, 0.06), 0.1, fe, scale=(1.1, 1.3, 0.6))
        sphere((s * 0.58, -0.06, 0.32), 0.09, rock)
    cyl((0.72, -0.08, 0.36), 0.15, 0.06, fe, rot=(math.pi / 2, 0, 0), verts=18)
    cyl((0.72, -0.115, 0.36), 0.12, 0.02, mat('#F4F1E8', rough=0.6), rot=(math.pi / 2, 0, 0), verts=18)
    sphere((0.72, -0.13, 0.41), 0.03, mat('#E2504A', rough=0.5), scale=(0.7, 0.4, 2.0))
    sphere((0.72, -0.13, 0.31), 0.03, DARK, scale=(0.7, 0.4, 2.0))
    patch, _l, _n = stick(0, 0.47, 0.32, patch_m, squash=0.3, scale=(1.3, 0.92), on=[head])
    face(0.52, dx=0.17, eye_r=0.09, mouth='smile', on=[patch, head])
    return {'height': 1.05}
