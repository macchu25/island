"""O2 Oxybree: a cyan puff with a curled breeze tuft at each side and a tiny ember on its tail (oxygen feeds fire)."""
from chemilib import *

C = '#5EC8E5'


def curl(center, major, minor, material, a0, a1, side):
    """Open curl: part of a ring in the front (XZ) plane, from angle a0 to a1 (degrees, measured for the right
    side; mirrored when side = -1). Both ends get a round cap."""
    o = torus(center, major, minor, material, rot=(math.pi / 2, 0, 0), major_segs=24, minor_segs=6)
    lo, hi = math.radians(a0), math.radians(a1)

    def keep(x, y):
        ang = math.atan2(y, x if side > 0 else -x)
        return lo <= ang <= hi

    bm = bmesh.new()
    bm.from_mesh(o.data)
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if not keep(c.x, c.y):
            dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    for a in (lo, hi):
        x = side * math.cos(a) * major
        sphere((center[0] + x, center[1], center[2] + math.sin(a) * major), minor, material, segs=8, rings=5)
    return o


def build():
    body = mat(C, rough=0.75)
    light = mat(shade(C, 1.45), rough=0.8)
    ember = mat('#FF7A2E', rough=0.5, emit=0.6)
    head = sphere((0, 0, 0.6), 0.42, body, scale=(1.0, 0.95, 0.95))
    # breeze tufts: a short straight streak out of each side ending in a half-turn hook
    for s in (-1, 1):
        capsule((s * 0.36, 0.0, 0.64), (s * 0.6, 0.0, 0.64), 0.05, light)
        curl((s * 0.6, 0.0, 0.73), 0.09, 0.05, light, -90, 110, s)
    # tail curls down to one side and ends in a little glowing ember
    drop((0.12, 0.05, 0.2), 0.14, body, tip=1.6, rot=(0, math.pi - 0.45, 0))
    sphere((0.23, 0.05, 0.0), 0.075, ember)
    drop((0.23, 0.05, 0.05), 0.055, ember, tip=2.0, rot=(0, 0.3, 0))
    face(0.6, dx=0.17, eye_r=0.09, eye='happy', mouth='smile', on=[head])
    return {'height': 1.0, 'hover': 0.16}
