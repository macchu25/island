"""Build the CHEMIMON island map and its five buildings.

  blender -b -P art/blender/island.py -- [--render] [island|breeding|extractor|codex|market|dock ...]

No name builds all six. Output goes to apps/web/public/assets/island/<name>.glb.
--render writes preview renders to art/renders/ (island_*.png, <building>.png), made from the
exported .glb files with the pilot monsters placed for scale.

Coordinates: apps/web/src/island/layout.json is the source of truth (three.js units, Y up).
Blender x = layout x, Blender y = -layout z, Blender z = up.

Contract (docs/specs/2026-11-20-island-and-models.md section 5):
  - island.glb is authored in world position. Inside every habitat and building radius the ground is
    flat at z = 0; habitat floors sit at most 0.03 above it. The inner 0.8 * r of every habitat holds
    nothing taller than 0.1 (monsters stand there). Scenery lives on the rim.
  - buildings are authored around their own origin (base centre at 0, facing -Y), inside radius r,
    2.5 to 5 units tall.
Layer heights: grass 0, pond bed 0.010, paths 0.012..0.022 (one 0.001 step per route), plazas 0.023,
habitat floors and pond water 0.025. No two different surfaces share a plane.
"""
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import chemilib as L  # noqa: E402
from chemilib import capsule, cyl, ico, mat, rbox, sphere, torus  # noqa: E402

LAYOUT_PATH = os.path.join(L.ROOT, 'apps', 'web', 'src', 'island', 'layout.json')
OUT = os.path.join(L.ROOT, 'apps', 'web', 'public', 'assets', 'island')
RENDERS = L.OUT_RENDERS

ISLAND_MAX_TRIS = 60000
ISLAND_MAX_BYTES = 3_000_000
ISLAND_MAX_MATS = 24
BUILDING_MAX_TRIS = 8000
BUILDING_MAX_BYTES = 1_000_000
BUILDING_MIN_H, BUILDING_MAX_H = 2.5, 5.0

CLEAR = 0.8          # inner fraction of a habitat radius that must stay clear
TALL = 0.1           # anything above this inside the clear zone is an error
FLOOR_TOP = 0.025    # habitat floor discs and pond water
PATH_Z = 0.012       # paths (each route +0.0012 above the previous one, up to 0.0216)
PLAZA_Z = 0.023      # building plazas
BED_Z = 0.010        # pond bed under the translucent water

ISL = {}
HAB = {}
BLD = {}
PLOTS = {}
ROUTES = []          # smoothed path polylines (full, unclipped)
RUNS = []            # clipped path pieces that are drawn
ENTRIES = {}         # plot name -> list of angles (degrees) where a path meets the plot edge
SEGS = []            # path segments for distance queries


# ---------------------------------------------------------------- layout

def load_layout():
    d = json.load(open(LAYOUT_PATH))
    i = d['island']
    ISL.update(cx=i['cx'], cy=-i['cz'], rx=i['rx'], ry=i['rz'])
    for k, v in d['habitats'].items():
        HAB[k] = dict(name=k, x=v['x'], y=-v['z'], r=v['r'], kind='habitat')
    for k, v in d['buildings'].items():
        BLD[k] = dict(name=k, x=v['x'], y=-v['z'], r=v['r'], kind='building')
    PLOTS.update(HAB)
    PLOTS.update(BLD)


def at(p, ang, dist, z=0.0):
    """Point at `ang` degrees (0 = +x, 90 = +y = away from the camera) and `dist` from plot p."""
    a = math.radians(ang)
    return (p['x'] + dist * math.cos(a), p['y'] + dist * math.sin(a), z)


def yaw_to(x, y, tx, ty):
    """Yaw that turns local -Y (the front) towards (tx, ty)."""
    return math.atan2(ty - y, tx - x) + math.pi / 2


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- outline and height

def outline_r(th):
    """Organic outline factor around the nominal ellipse (bulges a bit, never shrinks much)."""
    return (1.015 + 0.04 * math.sin(3 * th + 0.7) + 0.028 * math.sin(5 * th + 2.1)
            + 0.016 * math.sin(8 * th + 0.4))


def island_f(x, y):
    """Fraction of the outline radius at (x, y): < 1 inside the island."""
    dx = (x - ISL['cx']) / ISL['rx']
    dy = (y - ISL['cy']) / ISL['ry']
    return math.hypot(dx, dy) / outline_r(math.atan2(dy, dx))


HILLS = [  # (x, y, height, radius) in Blender coordinates; masked away from plots and paths
    (-12.5, -4.5, 1.5, 2.6), (12.5, -4.5, 1.5, 2.6), (0.0, -9.8, 1.1, 2.4), (-8.5, 15.5, 1.8, 2.6),
    (8.5, 15.5, 1.8, 2.6), (-17.0, 7.0, 1.4, 2.4), (-7.0, 5.0, 0.7, 1.5), (7.0, 5.0, 0.7, 1.5),
    (-16.5, 15.0, 1.0, 2.0), (16.5, 15.0, 1.0, 2.0), (0.0, 19.8, 1.0, 2.0),
]


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L2))
    return math.hypot(wx - t * vx, wy - t * vy)


def path_dist(x, y):
    best = 1e9
    for (ax, ay, bx, by) in SEGS:
        if abs(x - ax) > best + 2 and abs(x - bx) > best + 2:
            continue
        d = seg_dist(x, y, ax, ay, bx, by)
        if d < best:
            best = d
    return best


def plot_gap(x, y):
    """Distance from (x, y) to the nearest plot edge (negative inside a plot)."""
    return min(math.hypot(x - p['x'], y - p['y']) - p['r'] for p in PLOTS.values())


def ground_h(x, y):
    """Grass height. Exactly 0 inside every plot (plus margin) and along every path."""
    m = min(smoothstep(0.0, 1.8, plot_gap(x, y) - 1.0),
            smoothstep(0.0, 1.5, path_dist(x, y) - 1.7))
    if m <= 0:
        return 0.0
    f = island_f(x, y)
    fade = smoothstep(0.98, 0.84, f)
    h = sum(hh * math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (hr * hr)) for hx, hy, hh, hr in HILLS)
    h += 0.14 * noise.noise(Vector((x * 0.21, y * 0.21, 0.37)))
    return h * m * fade


# ---------------------------------------------------------------- mesh helpers

def mesh_obj(name, verts, faces, mats, mat_idx=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    for m in mats:
        me.materials.append(L._as_mat(m))
    if mat_idx:
        for poly, i in zip(me.polygons, mat_idx):
            poly.material_index = i
    for poly in me.polygons:
        poly.use_smooth = smooth
    L._parts.append(o)
    return o


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def flat_caps(o):
    """Flat-shade n-gon caps of cylinders and cones so they do not get a dark smooth gradient."""
    for p in o.data.polygons:
        if len(p.vertices) > 4:
            p.use_smooth = False
    return o


def cut(o, keep):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    return o


def hemi(loc, r, material, scale=(1, 1, 1), segs=20, rings=10):
    """Upper half of a sphere (open at the bottom)."""
    o = sphere(loc, r, material, scale=scale, segs=segs, rings=rings)
    return cut(o, lambda c: c.z > -1e-4)


def annulus(x, y, r0, r1, material, z, verts=64):
    """Flat ring (top face only) between radii r0 and r1 at height z."""
    vs, fs = [], []
    for i in range(verts):
        a = 2 * math.pi * i / verts
        vs.append((x + r0 * math.cos(a), y + r0 * math.sin(a), z))
        vs.append((x + r1 * math.cos(a), y + r1 * math.sin(a), z))
    for i in range(verts):
        j = (i + 1) % verts
        fs.append((2 * i, 2 * i + 1, 2 * j + 1, 2 * j))
    return mesh_obj('ring', vs, fs, [material], smooth=False)


def floor(p, inner, band, frac=0.86):
    """Two-tone habitat floor: inner disc plus an outer band, both with their top at FLOOR_TOP."""
    disc(p['x'], p['y'], p['r'] * frac, inner, FLOOR_TOP)
    annulus(p['x'], p['y'], p['r'] * frac, p['r'], band, FLOOR_TOP)


def disc(x, y, r, material, top, depth=0.05, verts=64):
    o = cyl((x, y, top - depth / 2), r, depth, material, verts=verts)
    return flat(o)


def post(loc, r, h, material, verts=10, r_top=None):
    """Upright cylinder standing on loc (loc z = base)."""
    x, y, z = loc
    return flat_caps(cyl((x, y, z + h / 2), r, h, material, verts=verts, r_top=r_top))


def ball(loc, r, material, scale=(1, 1, 1), segs=12, rings=8):
    return sphere(loc, r, material, scale=scale, segs=segs, rings=rings)


class grp:
    """Build parts around the origin, then move them: `with grp(x, y, yaw): ...`."""

    def __init__(self, x, y, yaw=0.0, z=0.0, s=1.0):
        self.M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Scale(s, 4)

    def __enter__(self):
        self.n = len(L._parts)
        return self

    def __exit__(self, *exc):
        bpy.context.view_layer.update()
        for o in L._parts[self.n:]:
            o.matrix_world = self.M @ o.matrix_world
        return False


def sector(cx, cy, r0, r1, a0, a1, z0, z1, material, step=6.0, bevel=0.07):
    """Annular sector block (terrace step) between radii r0..r1 and angles a0..a1 (degrees)."""
    n = max(3, int(abs(a1 - a0) / step))
    verts, faces = [], []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        for rr in (r0, r1):
            for z in (z0, z1):
                verts.append((cx + rr * math.cos(a), cy + rr * math.sin(a), z))

    def ix(i, ring, lev):
        return i * 4 + ring * 2 + lev
    for i in range(n):
        faces.append((ix(i, 0, 1), ix(i, 1, 1), ix(i + 1, 1, 1), ix(i + 1, 0, 1)))  # top
        faces.append((ix(i, 1, 0), ix(i + 1, 1, 0), ix(i + 1, 1, 1), ix(i, 1, 1)))  # outer
        faces.append((ix(i, 0, 1), ix(i + 1, 0, 1), ix(i + 1, 0, 0), ix(i, 0, 0)))  # inner
    faces.append((ix(0, 1, 0), ix(0, 1, 1), ix(0, 0, 1), ix(0, 0, 0)))
    faces.append((ix(n, 0, 0), ix(n, 0, 1), ix(n, 1, 1), ix(n, 1, 0)))
    o = mesh_obj('sector', verts, faces, [material], smooth=False)
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = bevel
    m.segments = 2
    m.limit_method = 'ANGLE'
    return o


# ---------------------------------------------------------------- floating land (main island and islets)

SIDE = [  # (radial factor, z, material slot) below the grass edge; slot 0 grass, 1 soil, 2 rock
    (0.985, -0.07, 0), (1.0, -0.24, 0), (1.01, -0.5, 1), (1.008, -0.9, 1), (0.998, -1.25, 1),
    (0.99, -1.6, 2), (0.97, -2.5, 2), (0.92, -3.5, 2), (0.82, -4.8, 2), (0.68, -6.2, 2),
    (0.53, -7.7, 2), (0.38, -9.2, 2), (0.24, -10.7, 2), (0.11, -12.0, 2),
]


def floating_land(name, cx, cy, rx, ry, out_r, height, NA, NR, depth, z0=0.0, top_f=0.965, seed=0.0):
    """Grass cushion on top, soil band, then a lumpy rock cone tapering down to a tip.

    depth scales the SIDE profile (1 = main island, about 12 units deep)."""
    verts, faces, mid = [], [], []
    k_tip = depth * 13.2

    def ring_xy(th, f):
        k = f * out_r(th)
        return cx + k * rx * math.cos(th), cy + k * ry * math.sin(th)

    verts.append((cx, cy, z0 + height(cx, cy)))
    rings = []
    for i in range(1, NR + 1):
        f = top_f * i / NR
        ring = []
        for a in range(NA):
            th = 2 * math.pi * a / NA
            x, y = ring_xy(th, f)
            ring.append(len(verts))
            verts.append((x, y, z0 + height(x, y)))
        rings.append((ring, 0))
    for f, z, slot in SIDE:
        ring = []
        zz = z * depth
        for a in range(NA):
            th = 2 * math.pi * a / NA
            ff = f
            dz = 0.0
            if slot == 2:
                n1 = noise.noise(Vector((math.cos(th) * 1.8 + seed, math.sin(th) * 1.8, zz * 0.33)))
                n2 = noise.noise(Vector((math.cos(th) * 4.5, math.sin(th) * 4.5 + seed, zz * 0.8)))
                lump = 0.12 + 0.12 * min(1.0, -z / 6.0)      # lumpier further down
                ff = f * (1 + lump * n1 + 0.07 * n2)
                dz = 0.45 * depth * n2
            x, y = ring_xy(th, ff)
            ring.append(len(verts))
            verts.append((x, y, z0 + zz + dz))
        rings.append((ring, slot))
    tip = len(verts)
    verts.append((cx + 0.3 * depth, cy - 0.2 * depth, z0 - k_tip))
    first = rings[0][0]
    for a in range(NA):
        faces.append((0, first[a], first[(a + 1) % NA]))
        mid.append(0)
    for (ra, _), (rb, slot) in zip(rings, rings[1:]):
        for a in range(NA):
            b = (a + 1) % NA
            faces.append((ra[a], rb[a], rb[b], ra[b]))
            mid.append(slot)
    last = rings[-1][0]
    for a in range(NA):
        faces.append((last[a], tip, last[(a + 1) % NA]))
        mid.append(2)
    o = mesh_obj(name, verts, faces, [P['grass'], P['soil'], P['rock']], mid, smooth=True)
    for poly in o.data.polygons:        # faceted rock underneath, soft grass on top
        if poly.material_index == 2:
            poly.use_smooth = False
    return o


def islet(x, y, z, r, seed):
    def out(th):
        return 1 + 0.08 * math.sin(3 * th + seed) + 0.05 * math.sin(5 * th + 2 * seed)

    floating_land('islet', x, y, r, r * 0.85, out, lambda a, b: 0.0, 20, 2, r / 9.0, z0=z, top_f=0.9,
                  seed=seed)


# ---------------------------------------------------------------- materials (one fixed palette)

P = {}


def palette():
    P.clear()
    P.update(
        grass=mat('#9EDB7B', rough=0.85),
        leaf=mat('#5FBF6E', rough=0.8),
        soil=mat('#C98D5E', rough=0.9),
        rock=mat('#A799B8', rough=0.85),
        path=mat('#F6E6BC', rough=0.9),
        stone=mat('#EDE3D0', rough=0.85),
        sand=mat('#EFCB94', rough=0.9),
        dark=mat('#544A4C', rough=0.8),
        metal=mat('#AEB6C2', rough=0.35, metal=0.45),
        gold=mat('#FFC93C', rough=0.3, metal=0.35),
        brick=mat('#E07E55', rough=0.75),
        glow=mat('#FFA040', rough=0.5, emit=3.0),
        soil2=mat('#2F5560', rough=0.9),
        pink=mat('#FFA6CF', rough=0.45, emit=0.15),
        violet=mat('#B79CFF', rough=0.25, emit=0.6),
        cyan=mat('#8FF0FF', rough=0.2, emit=0.35),
        water=mat('#5CC8F5', rough=0.05, alpha=0.85),
        white=mat('#FFFFFF', rough=0.7),
        night=mat('#4B4380', rough=0.6),
        neon=mat('#FF5E9A', rough=0.4, emit=3.0),
        lamp=mat('#FFE58A', rough=0.4, emit=2.5),
        glass=mat('#D8FFF4', rough=0.05, alpha=0.35),
        sky=mat('#CFE4FF', rough=0.85),
        chartreuse=mat('#E4F5A8', rough=0.8),
    )
    P['blossom'] = P['pink']


# ---------------------------------------------------------------- paths

def chaikin(pts, n=3):
    for _ in range(n):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            out.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        out.append(pts[-1])
        pts = out
    return pts


def resample(pts, step=0.4):
    out = [pts[0]]
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        t = step - acc
        while t <= d:
            out.append((a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d))
            t += step
        acc = d - (t - step)
    out.append(pts[-1])
    return out


PATH_W = 1.0


def plan_paths():
    def c(name):
        p = PLOTS[name]
        return (p['x'], p['y'])
    fork = (0.0, 5.6)
    routes = [
        [c('breeding'), fork, c('gas')],
        [fork, (-2.0, 7.4), c('crystal')],
        [fork, (2.0, 7.4), c('spring')],
        [c('breeding'), (-6.0, 1.0), c('metal')],
        [c('breeding'), (6.0, 1.0), c('quarry')],
        [c('breeding'), (-3.9, -3.4), c('extractor')],
        [c('breeding'), (3.9, -3.4), c('codex')],
        [c('breeding'), c('market')],
        [c('metal'), c('dock')],
        [c('crystal'), (-9.5, 12.4), c('noble')],
        [c('spring'), (9.5, 12.4), c('halogen')],
    ]
    ROUTES.clear()
    RUNS.clear()
    SEGS.clear()
    ENTRIES.clear()
    for ri, r in enumerate(routes):
        pts = resample(chaikin(r))
        ROUTES.append(pts)
        for a, b in zip(pts, pts[1:]):
            SEGS.append((a[0], a[1], b[0], b[1]))

        def inside(q):
            for p in PLOTS.values():
                lim = p['r'] - 0.06 if p['kind'] == 'habitat' else p['r'] + 0.3
                if math.hypot(q[0] - p['x'], q[1] - p['y']) < lim:
                    return True
            return False
        run = []
        for q in pts:
            if inside(q):
                if len(run) > 1:
                    RUNS.append((ri, run))
                run = []
            else:
                run.append(q)
        if len(run) > 1:
            RUNS.append((ri, run))
    for _ri, run in RUNS:
        for q in (run[0], run[-1]):
            for p in PLOTS.values():
                if math.hypot(q[0] - p['x'], q[1] - p['y']) < p['r'] + 0.6:
                    ENTRIES.setdefault(p['name'], []).append(
                        math.degrees(math.atan2(q[1] - p['y'], q[0] - p['x'])))


def free(p, ang, half=24):
    """True when no path enters plot p within `half` degrees of `ang`."""
    for e in ENTRIES.get(p['name'], []):
        if abs((ang - e + 180) % 360 - 180) < half:
            return False
    return True


def build_paths():
    """Path ribbons. Each route gets its own height step (0.001) so overlapping routes never share a
    plane; the building plazas sit above all of them (11 routes: top 0.022 < 0.023), habitat floors above
    the plazas."""
    for ri, run in RUNS:
        z = PATH_Z + 0.001 * ri
        verts, faces = [], []
        n = len(run)
        for i, q in enumerate(run):
            a = run[max(i - 1, 0)]
            b = run[min(i + 1, n - 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]
            d = math.hypot(tx, ty) or 1
            nx, ny = -ty / d, tx / d
            w = PATH_W / 2 * (1 + 0.08 * math.sin(i * 0.9))
            verts.append((q[0] + nx * w, q[1] + ny * w, z))
            verts.append((q[0] - nx * w, q[1] - ny * w, z))
        for i in range(n - 1):
            faces.append((2 * i + 1, 2 * i + 3, 2 * i + 2, 2 * i))
        mesh_obj('path', verts, faces, [P['path']], smooth=False)
    for b in BLD.values():
        disc(b['x'], b['y'], b['r'] + 0.5, P['path'], PLAZA_Z, verts=64)


# ---------------------------------------------------------------- reusable props

def boulder(x, y, s, material=None, z=None, seed=0):
    rnd = random.Random(seed)
    z = ground_h(x, y) if z is None else z
    return sphere((x, y, z + 0.12 * s), 0.5 * s, material or P['rock'],
                  scale=(1.0 + 0.3 * rnd.random(), 0.8 + 0.3 * rnd.random(), 0.62),
                  rot=(0, 0, rnd.random() * math.pi), segs=10, rings=6)


def tree(x, y, s=1.0, kind='round', seed=0):
    rnd = random.Random(seed)
    z = ground_h(x, y) - 0.08
    if kind == 'pine':
        post((x, y, z), 0.13 * s, 0.6 * s, P['soil'], verts=8, r_top=0.09 * s)
        for i, (rr, hh) in enumerate(((0.75, 0.9), (0.58, 0.8), (0.4, 0.7))):
            zz = z + (0.45 + i * 0.5) * s
            o = cyl((x, y, zz + hh * s / 2), rr * s, hh * s, P['leaf'], r_top=0.06 * s, verts=12)
            flat_caps(o)
        ball((x, y, z + 1.95 * s), 0.09 * s, P['leaf'], segs=8, rings=5)
        return
    post((x, y, z), 0.14 * s, 1.0 * s, P['soil'], verts=8, r_top=0.1 * s)
    m = P['blossom'] if kind == 'blossom' else P['leaf']
    ball((x, y, z + 1.35 * s), 0.62 * s, m, scale=(1, 1, 0.92), segs=12, rings=7)
    for k in range(2):
        a = rnd.random() * 2 * math.pi
        ball((x + 0.42 * s * math.cos(a), y + 0.42 * s * math.sin(a), z + (1.05 + 0.25 * k) * s),
             0.42 * s, m, segs=9, rings=6)


def bush(x, y, s=1.0, material=None, seed=0):
    rnd = random.Random(seed)
    z = ground_h(x, y) - 0.04
    m = material or P['leaf']
    ball((x, y, z + 0.22 * s), 0.36 * s, m, scale=(1, 1, 0.85), segs=9, rings=6)
    for k in range(2):
        a = rnd.random() * 2 * math.pi
        ball((x + 0.3 * s * math.cos(a), y + 0.3 * s * math.sin(a), z + 0.15 * s), 0.26 * s, m,
             segs=7, rings=5)
    if rnd.random() < 0.4:
        ball((x, y - 0.2 * s, z + 0.45 * s), 0.08 * s, P['blossom'], segs=6, rings=4)


def flowers(x, y, s=1.0, seed=0):
    rnd = random.Random(seed)
    z = ground_h(x, y)
    for k in range(3):
        a = rnd.random() * 2 * math.pi
        d = rnd.random() * 0.35 * s
        m = (P['blossom'], P['lamp'], P['white'])[k % 3]
        ball((x + d * math.cos(a), y + d * math.sin(a), z + 0.09), 0.085 * s, m, segs=6, rings=4)


def cloud(x, y, z, s=1.0):
    ball((x, y, z), 0.45 * s, P['white'], scale=(1.2, 1, 0.8), segs=12, rings=8)
    ball((x - 0.45 * s, y + 0.05, z - 0.08 * s), 0.32 * s, P['white'], segs=10, rings=7)
    ball((x + 0.48 * s, y - 0.05, z - 0.1 * s), 0.3 * s, P['white'], segs=10, rings=7)
    ball((x + 0.1 * s, y + 0.1, z + 0.25 * s), 0.3 * s, P['white'], segs=10, rings=7)


def ring_of(p, dist, every, fn, half=24, start=0.0):
    """Call fn(x, y, ang) at `dist` from plot p every `every` degrees, skipping path entries."""
    n = int(round(360 / every))
    for i in range(n):
        ang = start + i * every
        if free(p, ang, half):
            x, y, _ = at(p, ang, dist)
            fn(x, y, ang)


# ---------------------------------------------------------------- habitats

def hab_metal(p):
    """Forge plateau: dark stone floor, anvils, a glowing kiln, ingot stacks, braziers."""
    x0, y0, r = p['x'], p['y'], p['r']
    floor(p, P['dark'], P['brick'], 0.9)
    torus((x0, y0, FLOOR_TOP), r * 0.9, 0.05, P['glow'], scale=(1, 1, 0.5), major_segs=56, minor_segs=4)
    ring_of(p, r + 0.05, 13, lambda x, y, a: rbox((x, y, 0.1), (0.5, 0.36, 0.26), P['rock'], bevel=0.08,
                                                     rot=(0, 0, math.radians(a + 90)), segs=1), half=16)
    # kiln landmark, back-left, mouth facing the plot
    kx, ky, _ = at(p, 150, r + 1.1)
    with grp(kx, ky, yaw_to(kx, ky, x0, y0)):
        ball((0, 0, 0.75), 1.05, P['brick'], scale=(1, 1, 1.05), segs=18, rings=10)
        torus((0, 0, 0.12), 1.0, 0.16, P['dark'], major_segs=20, minor_segs=6)
        ball((0, -0.86, 0.55), 0.46, P['glow'], scale=(1, 0.45, 0.85), segs=12, rings=8)
        torus((0, -0.9, 0.58), 0.48, 0.09, P['dark'], rot=(math.pi / 2, 0, 0), scale=(1, 1, 0.9))
        post((0.25, 0.25, 1.55), 0.24, 0.9, P['dark'], verts=12)
        torus((0.25, 0.25, 2.45), 0.26, 0.07, P['metal'], major_segs=12)
        ball((0.25, 0.25, 2.75), 0.18, P['white'], segs=8, rings=6)   # little smoke puff
        ball((0.45, 0.35, 3.05), 0.13, P['white'], segs=8, rings=6)
    # anvils on the rim
    for ang in (60, 200, 300):
        ax, ay, _ = at(p, ang, r - 0.35)
        with grp(ax, ay, yaw_to(ax, ay, x0, y0) + math.pi / 2):
            rbox((0, 0, 0.14), (0.42, 0.34, 0.28), P['dark'], bevel=0.06, segs=1)
            rbox((0, 0, 0.34), (0.22, 0.2, 0.16), P['metal'], bevel=0.04, segs=1)
            rbox((0, 0, 0.5), (0.7, 0.3, 0.18), P['metal'], bevel=0.06, segs=2)
            flat_caps(cyl((0.5, 0, 0.53), 0.1, 0.32, P['metal'], rot=(0, math.pi / 2, 0), r_top=0.0, verts=10))
    # ingot stacks
    for ang, mats in ((20, ('gold', 'metal', 'brick')), (245, ('brick', 'gold', 'metal')), (100, ('metal', 'gold', 'gold'))):
        ix, iy, _ = at(p, ang, r + 0.55)
        with grp(ix, iy, yaw_to(ix, iy, x0, y0)):
            for k, dx in enumerate((-0.2, 0.2)):
                rbox((dx, 0, 0.08), (0.34, 0.2, 0.14), P[mats[k]], bevel=0.04, segs=1)
            rbox((0, 0, 0.22), (0.34, 0.2, 0.14), P[mats[2]], bevel=0.04, segs=1)
    # braziers
    for ang in (-25, -155, 45, 175):
        if not free(p, ang):
            continue
        bx, by, _ = at(p, ang, r + 0.35)
        post((bx, by, 0), 0.07, 0.55, P['dark'], verts=8)
        flat_caps(cyl((bx, by, 0.62), 0.16, 0.16, P['metal'], r_top=0.24, verts=12))
        ball((bx, by, 0.72), 0.16, P['glow'], segs=10, rings=6)
    for ang, s in ((115, 1.1), (185, 0.9), (80, 0.7)):
        bx, by, _ = at(p, ang, r + 1.0)
        boulder(bx, by, s, P['dark'], z=0.0, seed=ang)


def hab_quarry(p):
    """Stepped pale stone terraces with mineral veins, gem nuggets and an ore cart."""
    x0, y0, r = p['x'], p['y'], p['r']
    floor(p, P['sand'], P['stone'], 0.9)
    ring_of(p, r + 0.02, 11, lambda x, y, a: sphere((x, y, 0.05), 0.3, P['soil'], scale=(1.1, 0.8, 0.45),
                                                       rot=(0, 0, math.radians(a)), segs=8, rings=5), half=16)
    a0, a1 = -62, 42
    steps = [(r + 0.25, r + 1.15, 0.42), (r + 1.0, r + 1.9, 0.85), (r + 1.75, r + 2.5, 1.3)]
    for rin, rout, h in steps:
        sector(x0, y0, rin, rout, a0, a1, -0.1, h, P['stone'])
    veins = ('cyan', 'pink', 'gold', 'violet')
    rnd = random.Random(5)
    for k, (rin, rout, h) in enumerate(steps):
        for j in range(6):
            ang = a0 + 6 + (a1 - a0 - 12) * (j + 0.5 * (k % 2)) / 6
            vx, vy, _ = at(p, ang, rin - 0.01)
            m = P[veins[(j + k) % 4]]
            rbox((vx, vy, h * (0.35 + 0.3 * rnd.random())), (0.8, 0.1, 0.13), m, bevel=0.04,
                 rot=(0, 0.25 * (rnd.random() - 0.5), math.radians(ang + 90)), segs=1)
            # a vein strip across the step top as well, so the camera (looking at the tops) sees it
            tx, ty, _ = at(p, ang + 3, (rin + rout) / 2)
            rbox((tx, ty, h + 0.02), (0.1, rout - rin - 0.25, 0.06), m, bevel=0.025,
                 rot=(0, 0, math.radians(ang + 3 + 90)), segs=1)
            if j % 2 == k % 2:
                gx, gy, _ = at(p, ang + 6, (rin + rout) / 2 + 0.1)
                ico((gx, gy, h + 0.1), 0.22, m, subdiv=1, rot=(0.3, 0.2, ang))
    # ore cart on short rails, front-right of the plot
    cx, cy, _ = at(p, -95, r + 0.75)
    with grp(cx, cy, 0.0):
        for s in (-1, 1):
            rbox((0, s * 0.22, 0.03), (2.2, 0.06, 0.05), P['metal'], bevel=0.02, segs=1)
        for i in range(4):
            rbox((-0.8 + i * 0.53, 0, 0.015), (0.12, 0.62, 0.04), P['soil'], bevel=0.02, segs=1)
        rbox((0, 0, 0.36), (0.8, 0.52, 0.42), P['brick'], bevel=0.1, segs=2)
        for sx in (-0.26, 0.26):
            for sy in (-0.24, 0.24):
                torus((sx, sy, 0.13), 0.09, 0.04, P['dark'], rot=(math.pi / 2, 0, 0), major_segs=10,
                      minor_segs=4)
        for i, m in enumerate(('cyan', 'gold', 'pink', 'violet')):
            ico((-0.2 + 0.14 * i, 0.06 * (-1) ** i, 0.64), 0.14, P[m], subdiv=1, rot=(i, 0.3, 0.2))
    for ang, s in ((150, 1.0), (205, 0.8), (115, 0.75)):
        bx, by, _ = at(p, ang, r + 0.8)
        boulder(bx, by, s, P['stone'], z=0.0, seed=ang)


def crystal_cluster(x, y, yaw, s, mats, seed, n=4):
    rnd = random.Random(seed)
    with grp(x, y, yaw, s=s):
        for k in range(n):
            h = 0.5 + 0.7 * rnd.random() if k else 1.3
            rr = 0.13 + 0.05 * rnd.random() if k else 0.2
            m = P[mats[k % len(mats)]]
            tx = (rnd.random() - 0.5) * 0.5 if k else 0
            ty = (rnd.random() - 0.5) * 0.3 if k else 0
            lean_x = -0.35 * rnd.random() if k else -0.12      # lean outward (+Y, away from the plot)
            lean_y = (rnd.random() - 0.5) * 0.7 if k else 0
            rot = (lean_x, lean_y, 0)
            R = Matrix.Rotation(lean_y, 3, 'Y') @ Matrix.Rotation(lean_x, 3, 'X')
            base = Vector((tx, ty, -0.05))
            mid = base + R @ Vector((0, 0, h / 2))
            top = base + R @ Vector((0, 0, h + 0.15 * h))
            flat(cyl(tuple(mid), rr, h, m, rot=rot, verts=6))
            flat(cyl(tuple(top), rr, 0.3 * h, m, rot=rot, r_top=0.0, verts=6))


def hab_crystal(p):
    """Crystal garden on dark soil: gem clusters on the rim and an open geode at the back."""
    x0, y0, r = p['x'], p['y'], p['r']
    floor(p, P['soil2'], P['dark'], 0.88)
    ring_of(p, r + 0.02, 18, lambda x, y, a: ico((x, y, 0.06), 0.16, P['violet' if int(a) % 36 else 'cyan'],
                                                   subdiv=1, scale=(1, 1, 0.6), rot=(0, 0, a)), half=16)
    gx, gy, _ = at(p, 105, r + 1.05)
    with grp(gx, gy, yaw_to(gx, gy, x0, y0)):
        shell = sphere((0, 0, 0.6), 1.0, P['dark'], scale=(1, 0.9, 0.95), segs=18, rings=10)
        cut(shell, lambda c: c.y > -0.45)
        for i, (dx, dz, m) in enumerate(((-0.35, 0.45, 'violet'), (0.3, 0.55, 'pink'), (0.0, 0.95, 'violet'),
                                          (-0.15, 0.25, 'cyan'), (0.35, 0.95, 'cyan'), (-0.45, 0.85, 'pink'))):
            ico((dx, -0.1, dz), 0.26, P[m], subdiv=1, rot=(i, 0.4 * i, 0.2))
    rnd = random.Random(3)
    for ang, s, mats in ((40, 1.5, ('pink', 'violet')), (165, 1.6, ('cyan', 'violet')), (-15, 1.0, ('violet', 'pink')),
                         (220, 1.0, ('cyan', 'pink')), (72, 1.1, ('cyan', 'pink')), (138, 1.2, ('pink', 'cyan')),
                         (190, 0.9, ('violet', 'cyan')), (10, 1.1, ('cyan', 'violet'))):
        if not free(p, ang):
            continue
        cx, cy, _ = at(p, ang, r + 0.35)
        crystal_cluster(cx, cy, yaw_to(cx, cy, x0, y0), s, mats, seed=int(rnd.random() * 1000))


def hab_spring(p):
    """Shallow pond: stone ring, stepping stones on the edge, lily pads, a rock spout, reeds, mist."""
    x0, y0, r = p['x'], p['y'], p['r']
    disc(x0, y0, r, P['night'], BED_Z, depth=0.03)
    disc(x0, y0, r - 0.02, P['water'], FLOOR_TOP, depth=0.01)
    ring_of(p, r + 0.05, 12, lambda x, y, a: sphere((x, y, 0.05), 0.3, P['stone'], scale=(1.15, 0.85, 0.42),
                                                       rot=(0, 0, math.radians(a)), segs=8, rings=5), half=14)
    # stepping stones and lily pads stay flat (top <= 0.03) inside the clear zone
    for ang, d in ((-150, 0.9), (-30, 0.9), (20, 0.9)):
        sx, sy, _ = at(p, ang, d * r)
        sphere((sx, sy, 0.0), 0.3, P['stone'], scale=(0.9, 1.2, 0.2), rot=(0, 0, math.radians(ang)), segs=10, rings=6)
    for ang, d in ((60, 0.55), (200, 0.6), (-80, 0.4)):
        lx, ly, _ = at(p, ang, d * r)
        disc(lx, ly, 0.3, P['leaf'], FLOOR_TOP + 0.004, depth=0.004, verts=14)
    # rock spout landmark at the back with a little stream into the pond
    sx, sy, _ = at(p, 92, r + 0.65)
    with grp(sx, sy, yaw_to(sx, sy, x0, y0)):
        sphere((0, 0.15, 0.35), 0.75, P['rock'], scale=(1.1, 0.9, 0.8), segs=14, rings=8)
        sphere((-0.35, 0.25, 1.0), 0.48, P['rock'], scale=(1, 0.9, 0.9), segs=12, rings=7)
        sphere((0.3, 0.3, 1.15), 0.4, P['rock'], segs=12, rings=7)
        flat_caps(cyl((0.0, -0.45, 1.05), 0.12, 0.4, P['metal'], rot=(math.radians(70), 0, 0), verts=10))
        capsule((0, -0.62, 0.98), (0, -0.85, 0.3), 0.08, P['water'], verts=8)
        torus((0, -0.88, 0.04), 0.22, 0.05, P['white'], major_segs=12, minor_segs=4)
        ball((0.6, -0.15, 0.25), 0.18, P['leaf'], segs=8, rings=5)
    for ang in (30, 150, 245):
        if not free(p, ang, 18):
            continue
        rx, ry, _ = at(p, ang, r + 0.4)
        for k, (dx, dy, h) in enumerate(((0, 0, 0.9), (0.18, 0.08, 0.7), (-0.15, 0.1, 0.6), (0.05, -0.15, 0.5))):
            post((rx + dx, ry + dy, 0), 0.035, h, P['leaf'], verts=6)
            if k < 2:
                capsule((rx + dx, ry + dy, h - 0.05), (rx + dx, ry + dy, h + 0.12), 0.055, P['soil'], verts=6)
    for ang, z, s in ((128, 0.55, 1.0), (55, 0.45, 0.8), (-5, 0.4, 0.7), (205, 0.5, 0.8)):
        if not free(p, ang, 18):
            continue
        mx, my, _ = at(p, ang, r + 0.25)
        ball((mx, my, z), 0.32 * s, P['glass'], scale=(1.3, 1, 0.7), segs=10, rings=6)
        ball((mx + 0.3 * s, my, z + 0.12), 0.22 * s, P['glass'], segs=8, rings=5)


def hab_gas(p):
    """Breezy hilltop meadow: flower ring, a striped windsock, a pinwheel, cloud puffs overhead."""
    x0, y0, r = p['x'], p['y'], p['r']
    floor(p, P['sky'], P['white'], 0.88)
    ring_of(p, r + 0.05, 30, lambda x, y, a: flowers(x, y, 0.9, seed=int(a)), half=14)
    wx, wy, _ = at(p, 45, r + 0.45)
    post((wx, wy, 0), 0.06, 2.3, P['white'], verts=8)
    ball((wx, wy, 2.35), 0.09, P['gold'], segs=8, rings=5)
    with grp(wx, wy, math.radians(20), z=2.1):
        torus((0.08, 0, 0), 0.2, 0.03, P['metal'], rot=(0, math.pi / 2, 0), major_segs=12, minor_segs=4)
        rr = 0.2
        for i in range(4):
            r2 = rr * 0.82
            m = P['neon'] if i % 2 == 0 else P['white']
            o = cyl((0.25 + 0.3 * i, 0, -0.06 * i), rr, 0.3, m, rot=(0, math.pi / 2 + 0.12, 0), r_top=r2, verts=12)
            flat_caps(o)
            rr = r2
    # pinwheel
    px, py, _ = at(p, 140, r + 0.4)
    post((px, py, 0), 0.04, 1.1, P['white'], verts=6)
    with grp(px, py, yaw_to(px, py, x0, y0 - 6), z=1.1):
        for i, m in enumerate(('blossom', 'lamp', 'cyan', 'neon')):
            a = i * math.pi / 2
            sphere((0.16 * math.cos(a), -0.05, 0.16 * math.sin(a)), 0.15, P[m], scale=(1, 0.25, 0.6),
                   rot=(0, -a, 0), segs=8, rings=5)
        ball((0, -0.08, 0), 0.05, P['white'], segs=6, rings=4)
    for ang, d, z, s in ((100, r + 0.4, 2.4, 1.0), (165, r + 0.3, 1.9, 0.75), (15, r + 0.4, 2.7, 0.8),
                         (65, r + 1.4, 3.2, 1.2)):
        cx, cy, _ = at(p, ang, d)
        cloud(cx, cy, z, s)


def hab_noble(p):
    """Calm glowing lantern court: indigo floor, a glowing ring, neon light posts, a neon arch."""
    x0, y0, r = p['x'], p['y'], p['r']
    disc(x0, y0, r, P['night'], FLOOR_TOP)
    torus((x0, y0, FLOOR_TOP), r - 0.12, 0.05, P['violet'], scale=(1, 1, 0.5), major_segs=48, minor_segs=4)
    orbs = ('neon', 'lamp', 'violet')
    i = 0
    for ang in range(0, 360, 40):
        if not free(p, ang, 20):
            continue
        lx, ly, _ = at(p, ang, r + 0.25)
        post((lx, ly, 0), 0.06, 1.25, P['dark'], verts=8)
        torus((lx, ly, 1.27), 0.1, 0.03, P['metal'], major_segs=10, minor_segs=4)
        ball((lx, ly, 1.45), 0.2, P[orbs[i % 3]], scale=(1, 1, 1.15), segs=12, rings=8)
        i += 1
    ax, ay, _ = at(p, 95, r + 0.35)
    with grp(ax, ay, yaw_to(ax, ay, x0, y0)):
        for s in (-1, 1):
            rbox((s * 1.1, 0, 0.15), (0.32, 0.32, 0.3), P['dark'], bevel=0.06, segs=1)
        arch = torus((0, 0, 0.3), 1.1, 0.09, P['neon'], rot=(math.pi / 2, 0, 0), major_segs=28, minor_segs=6)
        cut(arch, lambda c: c.y > -0.02)        # torus local y is world up after the rotation
        arch2 = torus((0, 0.05, 0.3), 0.85, 0.06, P['violet'], rot=(math.pi / 2, 0, 0), major_segs=24, minor_segs=5)
        cut(arch2, lambda c: c.y > -0.02)
        ball((0, 0, 1.4), 0.16, P['lamp'], segs=10, rings=6)
    for ang, z in ((130, 2.4), (60, 2.7), (170, 2.1)):
        fx, fy, _ = at(p, ang, r + 0.6)
        ball((fx, fy, z), 0.15, P['lamp'], scale=(1, 1, 1.25), segs=10, rings=6)
        flat_caps(cyl((fx, fy, z + 0.2), 0.07, 0.06, P['dark'], verts=8))


def hab_halogen(p):
    """Greenhouse plot: white tile floor, a low glass fence, coloured vapour vents, a glass house."""
    x0, y0, r = p['x'], p['y'], p['r']
    floor(p, P['chartreuse'], P['white'], 0.88)
    every = 20
    for k in range(18):
        ang = k * every
        nxt = ang + every
        if not free(p, ang, 14):
            continue
        fx, fy, _ = at(p, ang, r + 0.12)
        post((fx, fy, 0), 0.05, 0.55, P['white'], verts=8)
        ball((fx, fy, 0.57), 0.065, P['white'], segs=8, rings=5)
        if free(p, nxt, 14):
            mid = ang + every / 2
            mx, my, _ = at(p, mid, (r + 0.12) * math.cos(math.radians(every / 2)))
            chord = 2 * (r + 0.12) * math.sin(math.radians(every / 2)) - 0.1
            rbox((mx, my, 0.29), (chord, 0.04, 0.42), P['glass'], bevel=0.015, rot=(0, 0, math.radians(mid + 90)), segs=1)
    for ang, m in ((20, 'leaf'), (150, 'lamp'), (-40, 'violet')):
        vx, vy, _ = at(p, ang, r + 0.65)
        post((vx, vy, 0), 0.16, 0.36, P['metal'], verts=12)
        torus((vx, vy, 0.36), 0.16, 0.045, P['dark'], major_segs=12, minor_segs=4)
        for k, (dz, rr) in enumerate(((0.62, 0.24), (0.98, 0.19), (1.28, 0.14))):
            ball((vx + 0.06 * k, vy, dz), rr, P[m], segs=10, rings=6)
    hx, hy, _ = at(p, 90, r + 0.95)
    with grp(hx, hy, yaw_to(hx, hy, x0, y0)):
        rbox((0, 0, 0.06), (1.9, 1.3, 0.12), P['white'], bevel=0.04, segs=1)
        rbox((0, 0, 0.62), (1.75, 1.15, 1.0), P['glass'], bevel=0.04, segs=1)
        for sx in (-0.88, 0.88):
            for sy in (-0.58, 0.58):
                post((sx, sy, 0.1), 0.045, 1.05, P['white'], verts=6)
        # gable roof: two glass slopes and a white ridge
        for s in (-1, 1):
            rbox((0, s * 0.32, 1.38), (1.85, 0.72, 0.04), P['glass'], bevel=0.015,
                 rot=(s * math.radians(-33), 0, 0), segs=1)
        flat_caps(cyl((0, 0, 1.58), 0.05, 1.95, P['white'], rot=(0, math.pi / 2, 0), verts=8))
        for dx, m in ((-0.45, 'leaf'), (0.0, 'pink'), (0.45, 'leaf')):
            post((dx, 0.15, 0.12), 0.15, 0.22, P['brick'], verts=10, r_top=0.19)
            ball((dx, 0.15, 0.55), 0.24, P[m], segs=10, rings=6)


HABITAT_BUILDERS = dict(metal=hab_metal, quarry=hab_quarry, crystal=hab_crystal, spring=hab_spring,
                        gas=hab_gas, noble=hab_noble, halogen=hab_halogen)


# ---------------------------------------------------------------- filler scatter

def occupied_grid(skip):
    bpy.context.view_layer.update()
    cells = set()
    for o in L._parts:
        if o in skip:
            continue
        M = o.matrix_world
        for v in o.data.vertices:
            w = M @ v.co
            if w.z > 0.05:
                cells.add((int(math.floor(w.x / 0.5)), int(math.floor(w.y / 0.5))))
    return cells


def scatter(skip):
    cells = occupied_grid(skip)
    rnd = random.Random(42)
    placed = []

    def ok(x, y, rad, fmax, tall):
        if island_f(x, y) > fmax:
            return False
        if tall and island_f(x, y) < 0.62:      # trees frame the island edge, the middle stays open
            return False
        for p in PLOTS.values():
            d = math.hypot(x - p['x'], y - p['y']) - p['r']
            if d < rad + (0.7 if p['kind'] == 'habitat' else 0.9):
                return False
            # tall things must not hide a plot that lies behind them (camera looks towards +Y)
            if tall and p['y'] > y and d < 3.2:
                return False
        if path_dist(x, y) < PATH_W / 2 + 0.3 + rad:
            return False
        for (qx, qy, qr) in placed:
            if math.hypot(x - qx, y - qy) < rad + qr + 0.2:
                return False
        c = int(math.ceil(rad / 0.5)) + 1
        gx, gy = int(math.floor(x / 0.5)), int(math.floor(y / 0.5))
        for i in range(gx - c, gx + c + 1):
            for j in range(gy - c, gy + c + 1):
                if (i, j) in cells:
                    return False
        return True

    def sample():
        while True:
            u, v = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
            if u * u + v * v < 1:
                return ISL['cx'] + u * ISL['rx'] * 1.1, ISL['cy'] + v * ISL['ry'] * 1.1

    counts = dict(tree=0, bush=0, rock=0, flower=0)
    want = dict(tree=30, bush=18, rock=9, flower=14)
    spec = dict(tree=(1.0, 0.9, True), bush=(0.55, 0.93, False), rock=(0.5, 0.93, False), flower=(0.35, 0.92, False))
    for kind in ('tree', 'bush', 'rock', 'flower'):
        rad, fmax, tall = spec[kind]
        tries = 0
        while counts[kind] < want[kind] and tries < 6000:
            tries += 1
            x, y = sample()
            if not ok(x, y, rad, fmax, tall):
                continue
            placed.append((x, y, rad))
            counts[kind] += 1
            seed = int(rnd.random() * 1e6)
            if kind == 'tree':
                k = rnd.random()
                s = 0.85 + 0.4 * rnd.random()
                tree(x, y, s, 'pine' if k < 0.3 else ('blossom' if k < 0.5 else 'round'), seed)
            elif kind == 'bush':
                bush(x, y, 0.8 + 0.5 * rnd.random(), seed=seed)
            elif kind == 'rock':
                boulder(x, y, 0.6 + 0.6 * rnd.random(), seed=seed)
            else:
                flowers(x, y, 1.0, seed)
    print('ISLAND_SCATTER', counts)


# ---------------------------------------------------------------- island build + checks

def build_island():
    palette()
    plan_paths()
    for p in PLOTS.values():   # every plot plus its rim must be well inside the outline (the dock is a shore pier)
        if p['name'] == 'dock':
            continue
        for k in range(36):
            x, y, _ = at(p, k * 10, p['r'] + 0.8)
            if island_f(x, y) > 0.95:
                raise RuntimeError('plot %s rim reaches the island edge (f=%.2f)' % (p['name'], island_f(x, y)))
    with tally('terrain'):
        floating_land('terrain', ISL['cx'], ISL['cy'], ISL['rx'], ISL['ry'], outline_r, ground_h, 104, 28, 1.35)
    skip = set(L._parts)
    with tally('paths'):
        build_paths()
    skip.update(L._parts)
    for name, fn in HABITAT_BUILDERS.items():
        with tally(name):
            fn(HAB[name])
    with tally('scatter'):
        scatter(skip)
    with tally('islets'):
        islet(-26.0, 9.0, -1.6, 2.0, 1.0)
        islet(25.0, -4.5, -2.2, 1.6, 2.0)
        islet(18.5, 22.5, -0.8, 1.3, 3.0)
        with grp(0, 0, 0, z=-1.6):          # ground_h is 0 outside the island; drop onto the islet top
            tree(-26.0, 9.2, 0.8, 'blossom', 7)
            bush(-25.0, 8.4, 0.8, seed=3)
        with grp(0, 0, 0, z=-2.2):
            tree(25.0, -4.3, 0.7, 'pine', 8)


def tris_of(objs):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in objs:
        e = o.evaluated_get(dg)
        m = e.to_mesh()
        m.calc_loop_triangles()
        n += len(m.loop_triangles)
        e.to_mesh_clear()
    return n


class tally:
    """Print the triangle count of the parts built inside the block."""

    def __init__(self, label):
        self.label = label

    def __enter__(self):
        self.n = len(L._parts)

    def __exit__(self, *exc):
        if not exc[0]:
            print('ISLAND_TRIS %-10s %6d' % (self.label, tris_of(L._parts[self.n:])))
        return False


def strip_uv(obj):
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])


def check_island(obj):
    errors = []
    vs = obj.data.vertices
    for h in HAB.values():
        lim2 = (CLEAR * h['r']) ** 2
        n = sum(1 for v in vs if v.co.z > TALL and (v.co.x - h['x']) ** 2 + (v.co.y - h['y']) ** 2 < lim2)
        if n:
            errors.append('%s: %d vertices above %.2f inside %.0f%% of r' % (h['name'], n, TALL, CLEAR * 100))
    for b in BLD.values():
        lim2 = b['r'] ** 2
        n = sum(1 for v in vs if v.co.z > TALL and (v.co.x - b['x']) ** 2 + (v.co.y - b['y']) ** 2 < lim2)
        if n:
            errors.append('%s: %d vertices above %.2f inside r' % (b['name'], n, TALL))
    # top surface: ray grid from above, must land between 0 and 0.03 (BVH built from the joined mesh
    # data itself, so it cannot see a stale evaluated copy)
    tree = BVHTree.FromPolygons([v.co.copy() for v in vs], [tuple(p.vertices) for p in obj.data.polygons])
    for p in PLOTS.values():
        lim = CLEAR * p['r'] if p['kind'] == 'habitat' else p['r']
        worst = 0.0
        n = 0
        steps = int(lim / 0.25)
        for i in range(-steps, steps + 1):
            for j in range(-steps, steps + 1):
                dx, dy = i * 0.25, j * 0.25
                if dx * dx + dy * dy > lim * lim:
                    continue
                loc, _n, _i, _d = tree.ray_cast(Vector((p['x'] + dx, p['y'] + dy, 30)), Vector((0, 0, -1)))
                n += 1
                z = loc.z if loc is not None else -99
                if z < -0.001 or z > 0.031:
                    worst = z if abs(z) > abs(worst) else worst
        if worst:
            errors.append('%s: top surface at %.3f inside the plot (rays %d)' % (p['name'], worst, n))
        print('ISLAND_FLAT %s rays=%d %s' % (p['name'], n, 'FAIL' if worst else 'ok'))
    nm = len(obj.data.materials)
    if nm > ISLAND_MAX_MATS:
        errors.append('%d materials, limit %d' % (nm, ISLAND_MAX_MATS))
    return errors


def export(name, max_tris, max_bytes, check):
    obj = L._join()
    obj.name = name
    strip_uv(obj)
    L._parts[:] = [obj]
    errors = check(obj)
    if errors:
        raise RuntimeError('%s failed checks:\n  ' % name + '\n  '.join(errors))
    info = L.finish(name, out_dir=OUT, normalize=False, max_tris=max_tris, max_bytes=max_bytes, render=False)
    print('ISLAND_FILE %s tris=%d bytes=%d materials=%d' % (name, info['tris'], info['bytes'], info['materials']))
    return info


# ---------------------------------------------------------------- buildings

def check_building(name):
    r = BLD[name]['r']

    def check(obj):
        errors = []
        xs = [v.co for v in obj.data.vertices]
        rad = max(math.hypot(c.x, c.y) for c in xs)
        lo = min(c.z for c in xs)
        hi = max(c.z for c in xs)
        if rad > r:
            errors.append('footprint radius %.2f > r %.2f' % (rad, r))
        if not (BUILDING_MIN_H <= hi <= BUILDING_MAX_H):
            errors.append('height %.2f outside %.1f..%.1f' % (hi, BUILDING_MIN_H, BUILDING_MAX_H))
        if lo < -0.05:
            errors.append('base goes below ground (%.2f)' % lo)
        print('BUILDING_DIM %s radius=%.2f/%.2f height=%.2f min_z=%.3f' % (name, rad, r, hi, lo))
        return errors
    return check


def build_breeding():
    cream = mat('#FFF4E2', rough=0.6)
    mint = mat('#7EDCC4', rough=0.45)
    lilac = mat('#B8A4FF', rough=0.4)
    core = mat('#FF9CCB', rough=0.3, emit=1.6)
    glass = mat('#CFF2FF', rough=0.05, alpha=0.32)
    sun = mat('#FFD45E', rough=0.4, emit=0.8)
    sky = mat('#7FD0FF', rough=0.3, emit=0.6)
    # base platform with a soft rim and a front step
    flat_caps(cyl((0, 0, 0.15), 2.5, 0.3, cream, verts=40))
    torus((0, 0, 0.3), 2.5, 0.09, mint, major_segs=40, minor_segs=6)
    rbox((0, -2.55, 0.08), (1.3, 0.5, 0.16), cream, bevel=0.06, segs=2)
    # central chamber: drum, glass dome, glowing egg core
    flat_caps(cyl((0, 0, 0.62), 1.3, 0.64, mint, verts=32))
    torus((0, 0, 0.94), 1.3, 0.1, lilac, major_segs=32, minor_segs=6)
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8
        ball((1.31 * math.cos(a), 1.31 * math.sin(a), 0.62), 0.07, (sun, sky)[k % 2], segs=8, rings=5)
    hemi((0, 0, 0.94), 1.2, glass, segs=24, rings=12)
    ball((0, 0, 1.55), 0.48, core, scale=(1, 1, 1.22), segs=18, rings=10)
    torus((0, 0, 1.5), 0.78, 0.04, lilac, rot=(0.35, 0, 0), major_segs=24, minor_segs=4)
    torus((0, 0, 1.6), 0.7, 0.04, sun, rot=(-0.3, 0.4, 0), major_segs=24, minor_segs=4)
    flat_caps(cyl((0, 0, 2.17), 0.42, 0.16, cream, verts=20))
    hemi((0, 0, 2.25), 0.36, lilac, segs=16, rings=8)
    post((0, 0, 2.5), 0.05, 0.75, cream, verts=8)
    torus((0, 0, 3.0), 0.26, 0.05, mint, rot=(math.pi / 2, 0, 0), major_segs=16, minor_segs=4)
    ball((0, 0, 3.0), 0.17, sun, segs=12, rings=8)
    ball((0, 0, 3.42), 0.12, core, segs=10, rings=6)
    # front control panel with buttons
    rbox((0, -1.32, 0.66), (0.95, 0.18, 0.42), cream, bevel=0.06, segs=2, rot=(0.15, 0, 0))
    for i, m in enumerate((core, sun, sky)):
        ball((-0.28 + 0.28 * i, -1.43, 0.7), 0.075, m, segs=10, rings=6)
    # two input pods with coloured samples, joined to the dome by arched tubes
    for s, sample in ((-1, sky), (1, sun)):
        x = s * 1.95
        flat_caps(cyl((x, 0.1, 0.55), 0.55, 0.5, cream, verts=20))
        torus((x, 0.1, 0.8), 0.55, 0.06, lilac, major_segs=20, minor_segs=4)
        flat_caps(cyl((x, 0.1, 1.15), 0.44, 0.7, glass, verts=20))
        hemi((x, 0.1, 1.5), 0.44, glass, segs=16, rings=8)
        ball((x, 0.1, 1.15), 0.24, sample, segs=14, rings=8)
        flat_caps(cyl((x, 0.1, 1.98), 0.2, 0.08, lilac, verts=12))
        pts = [(x - s * 0.1, 0.1, 1.98), (s * 1.75, 0.05, 2.4), (s * 1.2, 0.0, 2.35), (s * 0.78, 0.0, 1.82)]
        for a, b in zip(pts, pts[1:]):
            capsule(a, b, 0.09, mint, verts=10)
        for dy in (-0.32, 0.42):
            rbox((x - s * 0.2, 0.1 + dy, 0.1), (0.2, 0.16, 0.2), lilac, bevel=0.05, segs=1)


def build_extractor():
    teal = mat('#5CC8C0', rough=0.45)
    yellow = mat('#FFCF5A', rough=0.45)
    grey = mat('#A9B2BE', rough=0.35, metal=0.45)
    dark = mat('#5C566B', rough=0.7)
    cream = mat('#FFF4E2', rough=0.6)
    juice = mat('#7FF0D8', rough=0.2, emit=1.2)
    glass = mat('#CFF2FF', rough=0.05, alpha=0.32)
    red = mat('#FF7A8A', rough=0.4, emit=1.5)
    flat_caps(cyl((0, 0, 0.12), 2.05, 0.24, cream, verts=36))
    torus((0, 0, 0.24), 2.05, 0.08, teal, major_segs=36, minor_segs=5)
    # derrick: four tilted legs with cross rings, a drill shaft inside, housing on top
    tx, ty = -0.55, 0.35
    for sx in (-1, 1):
        for sy in (-1, 1):
            capsule((tx + sx * 0.62, ty + sy * 0.62, 0.24), (tx + sx * 0.24, ty + sy * 0.24, 2.75), 0.07, teal, verts=8)
    for z, w in ((0.95, 0.5), (1.75, 0.37)):
        for sx, sy, rot in ((0, -1, 0), (0, 1, 0), (-1, 0, math.pi / 2), (1, 0, math.pi / 2)):
            rbox((tx + sx * w, ty + sy * w, z), (2 * w + 0.12, 0.08, 0.08), yellow, bevel=0.03, rot=(0, 0, rot), segs=1)
    flat_caps(cyl((tx, ty, 1.55), 0.08, 2.4, grey, verts=10))
    for k in range(3):
        torus((tx, ty, 0.55 + 0.12 * k), 0.13 - 0.02 * k, 0.03, yellow, major_segs=10, minor_segs=4)
    flat_caps(cyl((tx, ty, 0.42), 0.2, 0.3, grey, r_top=0.08, verts=10))
    torus((tx, ty, 0.25), 0.32, 0.06, dark, major_segs=16, minor_segs=4)
    rbox((tx, ty, 3.05), (0.95, 0.95, 0.62), yellow, bevel=0.14, segs=2)
    torus((tx, ty - 0.52, 3.05), 0.3, 0.06, grey, rot=(math.pi / 2, 0, 0), major_segs=16, minor_segs=4)
    for k in range(3):
        a = k * math.pi / 3
        rbox((tx, ty - 0.53, 3.05), (0.56, 0.04, 0.05), grey, bevel=0.015, rot=(0, a, 0), segs=1)
    ball((tx, ty - 0.55, 3.05), 0.07, red, segs=8, rings=5)
    flat_caps(cyl((tx, ty, 3.45), 0.13, 0.2, grey, verts=10))
    ball((tx, ty, 3.62), 0.15, red, segs=12, rings=8)
    # collection tank with glowing element juice
    kx, ky = 0.95, -0.55
    flat_caps(cyl((kx, ky, 0.36), 0.66, 0.24, grey, verts=24))
    flat_caps(cyl((kx, ky, 1.08), 0.6, 1.2, glass, verts=24))
    flat_caps(cyl((kx, ky, 0.92), 0.5, 0.88, juice, verts=20))
    for z in (0.7, 1.35):
        torus((kx, ky, z), 0.61, 0.035, teal, major_segs=24, minor_segs=4)
    hemi((kx, ky, 1.68), 0.62, yellow, scale=(1, 1, 0.55), segs=20, rings=10)
    for i, m in enumerate((yellow, red, cream)):
        ball((kx - 0.2 + 0.2 * i, ky - 0.05 * i, 1.0 + 0.2 * (i % 2)), 0.09, m, segs=8, rings=5)
    # gauge on the tank front
    flat_caps(cyl((kx + 0.2, ky - 0.66, 0.6), 0.14, 0.05, cream, rot=(math.pi / 2, 0, 0), verts=14))
    rbox((kx + 0.2, ky - 0.7, 0.62), (0.03, 0.02, 0.11), red, bevel=0.01, rot=(0, 0.6, 0), segs=1)
    # pipes: housing to tank top, drill hole to tank side
    for pts in ([(tx + 0.48, ty, 3.0), (0.55, 0.2, 3.0), (kx, ky, 2.55), (kx, ky, 1.95)],
                [(tx + 0.25, ty - 0.1, 0.42), (0.25, -0.75, 0.42), (kx - 0.6, ky, 0.42)]):
        for a, b in zip(pts, pts[1:]):
            capsule(a, b, 0.09, grey, verts=10)
    torus((kx, ky, 2.25), 0.12, 0.04, teal, major_segs=10, minor_segs=4)
    # little crates of extracted elements
    for (cx, cy, m) in ((0.9, 0.85, sky_mat()), (1.25, 0.45, red)):
        rbox((cx, cy, 0.42), (0.4, 0.4, 0.36), cream, bevel=0.05, segs=1)
        ball((cx, cy, 0.66), 0.13, m, segs=8, rings=5)


def sky_mat():
    return mat('#9AD8FF', rough=0.3, emit=0.8)


def box(loc, size, material, rot=(0, 0, 0)):
    """Plain box (12 triangles) for small repeated tiles."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.view_layer.objects.active
    o.scale = size
    return flat(L._register(o, material))


def build_codex():
    """Open-air library: a periodic-table tile wall between two bookshelf towers under a curved
    awning, and a giant open book on a pedestal in front. Everything faces the camera (-Y)."""
    cream = mat('#FFF4E2', rough=0.6)
    roof = mat('#8C9CF5', rough=0.5)
    lilac = mat('#C9B8FF', rough=0.5)
    gold = mat('#FFC93C', rough=0.3, metal=0.35)
    cover = mat('#E8607A', rough=0.6)
    page = mat('#FFFFFF', rough=0.7)
    tiles = dict(s=mat('#FF9EC4', rough=0.5), d=mat('#9AD8FF', rough=0.5), p=mat('#FFE07A', rough=0.5),
                 n=mat('#C9B8FF', rough=0.5, emit=0.3), h=mat('#B8F0A0', rough=0.5))
    flat_caps(cyl((0, 0, 0.12), 2.0, 0.24, cream, verts=36))
    torus((0, 0, 0.24), 2.0, 0.07, lilac, major_segs=36, minor_segs=5)
    rbox((0, -1.95, 0.06), (1.1, 0.3, 0.12), cream, bevel=0.04, segs=1)
    # back wall with the tile table on its front face
    wy = 0.75
    rbox((0, wy, 1.32), (2.5, 0.3, 2.16), cream, bevel=0.06, segs=1)
    pitch = 0.128
    size = 0.11
    rows = {1: [1, 18], 2: [1, 2] + list(range(13, 19)), 3: [1, 2] + list(range(13, 19))}
    for row in range(4, 8):
        rows[row] = list(range(1, 19))
    for row, cols in rows.items():
        for col in cols:
            if row == 1 and col == 1:
                m = tiles['h']
            elif col <= 2:
                m = tiles['s']
            elif col <= 12:
                m = tiles['d']
            elif col == 18:
                m = tiles['n']
            elif col == 17:
                m = tiles['h']
            else:
                m = tiles['p']
            x = (col - 9.5) * pitch
            z = 2.12 - (row - 1) * pitch
            box((x, wy - 0.17, z), (size, 0.05, size), m)
    # bookshelf towers with coloured spines, capped by little domes
    spines = (tiles['s'], tiles['d'], tiles['p'], tiles['n'], cover, tiles['h'])
    rnd = random.Random(9)
    for sx in (-1, 1):
        x = sx * 1.45
        rbox((x, 0.55, 1.4), (0.62, 0.62, 2.32), lilac, bevel=0.08, segs=1)
        for shelf in range(3):
            z0 = 0.55 + shelf * 0.62
            rbox((x, 0.23, z0 - 0.04), (0.56, 0.06, 0.05), cream, bevel=0.015, segs=1)
            bx = x - 0.22
            while bx < x + 0.2:
                w = 0.06 + 0.03 * rnd.random()
                h = 0.32 + 0.14 * rnd.random()
                box((bx + w / 2, 0.24, z0 + h / 2), (w, 0.1, h), spines[int(rnd.random() * len(spines))])
                bx += w + 0.012
        flat_caps(cyl((x, 0.55, 2.62), 0.36, 0.12, cream, verts=16))
        hemi((x, 0.55, 2.68), 0.3, roof, segs=14, rings=8)
        ball((x, 0.55, 3.04), 0.08, gold, segs=8, rings=5)
    # curved awning over the wall
    aw = cyl((0, 0.62, 2.48), 0.62, 2.2, roof, rot=(0, math.pi / 2, 0), verts=24)
    cut(aw, lambda c: c.x < 1e-4)          # keep the upper half (local -x is world up after the turn)
    flat_caps(aw)
    for sx in (-1, 1):                      # cream trims under the awning ends
        rbox((sx * 1.0, 0.02, 2.5), (0.36, 0.1, 0.1), cream, bevel=0.03, segs=1)
    rbox((0, 0.02, 2.5), (1.6, 0.08, 0.08), cream, bevel=0.03, segs=1)
    flat_caps(cyl((0, 0.62, 3.2), 0.07, 0.2, gold, verts=8))
    ico((0, 0.62, 3.45), 0.2, gold, subdiv=1)
    # giant open book on a pedestal, tilted towards the viewer
    flat_caps(cyl((0, -0.75, 0.5), 0.2, 0.52, lilac, verts=12))
    rbox((0, -0.75, 0.8), (0.9, 0.5, 0.12), cream, bevel=0.04, segs=1)
    with grp(0, -0.75, 0.0, z=1.02):
        tilt = math.radians(28)
        R = Matrix.Rotation(tilt, 3, 'X')
        rbox(tuple(R @ Vector((0, 0, -0.07))), (1.7, 1.0, 0.07), cover, bevel=0.03, rot=(tilt, 0, 0), segs=1)
        for sx in (-1, 1):
            c = R @ Vector((sx * 0.41, 0, 0.03))
            rbox(tuple(c), (0.8, 0.92, 0.09), page, bevel=0.035, rot=(tilt, sx * -0.1, 0), segs=2)
            for k in range(4):        # tiny coloured element squares on the pages, no letters
                c2 = R @ Vector((sx * (0.2 + 0.17 * (k % 2)), -0.15 + 0.3 * (k // 2), 0.09))
                box(tuple(c2), (0.12, 0.12, 0.02), (tiles['s'], tiles['d'], tiles['p'], tiles['n'])[(k + sx) % 4],
                    rot=(tilt, sx * -0.1, 0))
        flat_caps(cyl(tuple(R @ Vector((0, 0, -0.01))), 0.05, 0.92, cover, rot=(math.pi / 2 + tilt, 0, 0), verts=8))
    for i, m in enumerate((tiles['s'], tiles['p'], tiles['d'])):
        ball((-0.5 + 0.5 * i, -0.75, 1.75 + 0.15 * (i % 2)), 0.1, m, segs=10, rings=6)


def half_disc(x, y, z, r, depth, material, verts=8):
    """Solid lower half of a disc facing -Y (an awning flap), flat edge on top at height z."""
    vs, fs = [], []
    for yy in (y - depth / 2, y + depth / 2):
        vs.append((x, yy, z))
        for i in range(verts + 1):
            a = math.pi + math.pi * i / verts
            vs.append((x + r * math.cos(a), yy, z + r * math.sin(a)))
    k = verts + 2
    fs.append(tuple(range(k))[::-1])                    # front (-Y)
    fs.append(tuple(range(k, 2 * k)))                   # back
    ring = list(range(k)) + [0]
    for i, j in zip(ring, ring[1:]):
        fs.append((i, j, j + k, i + k))
    o = mesh_obj('flap', vs, fs, [material], smooth=False)
    bm = bmesh.new()                                    # make every face point outwards
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    return o


def build_market():
    """Open market stall (Cho): a striped awning on four posts with a scalloped valance, a counter pushed
    out in front with crates of round goods and a little coin stack, a small balance scale hanging from
    an arm past the awning edge (visible from the high game camera), and an old round coin with a square
    hole on top. Front = -Y."""
    cream = mat('#FFF4E2', rough=0.6)
    pink = mat('#FF9EC4', rough=0.55)
    mint = mat('#7EDCC4', rough=0.45)
    peach = mat('#FFC9A0', rough=0.6)
    wood = mat('#E8B07E', rough=0.7)
    lilac = mat('#C9B8FF', rough=0.5)
    gold = mat('#FFC93C', rough=0.3, metal=0.35)
    goods = dict(red=mat('#FF7A7A', rough=0.4), orange=mat('#FFB347', rough=0.45), green=mat('#9BE37A', rough=0.45),
                 purple=mat('#B79CFF', rough=0.4), yellow=mat('#FFE07A', rough=0.45))
    # round base with a mint rim
    flat_caps(cyl((0, 0, 0.1), 2.0, 0.2, cream, verts=36))
    torus((0, 0, 0.2), 2.0, 0.07, mint, major_segs=36, minor_segs=5)
    # four posts (back ones taller, the awning slopes towards the front) with round caps
    fy, by = -0.6, 0.95
    for x in (-1.2, 1.2):
        for y, h in ((fy, 2.12), (by, 2.55)):
            post((x, y, 0.2), 0.08, h, mint, verts=10)
            ball((x, y, 0.2 + h), 0.11, cream, segs=10, rings=6)
    rbox((0, fy, 2.28), (2.5, 0.1, 0.1), cream, bevel=0.03, segs=1)        # front beam
    rbox((0, by, 2.7), (2.5, 0.1, 0.1), cream, bevel=0.03, segs=1)         # back beam
    # striped awning: 7 adjacent strips on one sloped plane, scalloped flaps along the front edge
    y0, z0, y1, z1 = -0.9, 2.38, 1.15, 2.82
    tilt = math.atan2(z1 - z0, y1 - y0)
    length = math.hypot(y1 - y0, z1 - z0)
    n, w = 7, 0.42
    for i in range(n):
        x = (i - (n - 1) / 2) * w
        m = pink if i % 2 == 0 else cream
        rbox((x, (y0 + y1) / 2, (z0 + z1) / 2), (w, length, 0.08), m, bevel=0.02, rot=(tilt, 0, 0), segs=1)
        half_disc(x, y0 - 0.01, z0 - 0.01, w / 2, 0.06, m)
    # back panel with two shelves of goods (seen from the front)
    rbox((0, by + 0.08, 1.25), (2.3, 0.1, 1.7), lilac, bevel=0.04, segs=1)
    order = ('red', 'orange', 'green', 'purple', 'yellow')
    for k, z in enumerate((0.95, 1.55)):
        rbox((0, by - 0.08, z - 0.04), (2.2, 0.22, 0.06), cream, bevel=0.02, segs=1)
        for j in range(6):
            ball((-0.9 + 0.36 * j, by - 0.08, z + 0.1), 0.12, goods[order[(j + 2 * k) % 5]], segs=10, rings=6)
    # counter pushed out in front of the awning posts
    cy = -1.0
    rbox((0, cy, 0.6), (2.4, 0.6, 0.8), peach, bevel=0.06, segs=1)
    rbox((0, cy, 1.04), (2.56, 0.74, 0.08), cream, bevel=0.03, segs=1)
    for i, m in enumerate((goods['red'], goods['yellow'], goods['green'])):   # round badges on the front
        flat_caps(cyl((-0.75 + 0.75 * i, cy - 0.31, 0.6), 0.13, 0.04, m, rot=(math.pi / 2, 0, 0), verts=14))
    # two crates of goods on the counter
    top = 1.08
    for cx, picks in ((-0.75, ('red', 'red', 'green', 'red', 'green')), (0.05, ('orange', 'purple', 'orange', 'purple', 'orange'))):
        rbox((cx, cy, top + 0.13), (0.62, 0.48, 0.26), wood, bevel=0.04, segs=1)
        rbox((cx, cy - 0.245, top + 0.13), (0.64, 0.03, 0.08), cream, bevel=0.01, segs=1)
        for k, (dx, dy, dz) in enumerate(((-0.15, -0.08, 0), (0.0, -0.1, 0), (0.15, -0.08, 0), (-0.07, 0.08, 0.04), (0.08, 0.08, 0.04))):
            ball((cx + dx, cy + dy, top + 0.3 + dz), 0.11, goods[picks[k]], segs=10, rings=6)
        ball((cx, cy, top + 0.47), 0.11, goods[picks[0]], segs=10, rings=6)
    # little stack of coins next to the scale
    for k in range(3):
        flat_caps(cyl((0.82 + 0.02 * (k % 2), cy - 0.08, top + 0.03 + 0.06 * k), 0.13, 0.05, gold, verts=14))
    # side goods: a crate of yellow fruit (right) and a round basket of berries (left), on the base
    rbox((1.55, -0.65, 0.42), (0.44, 0.44, 0.44), wood, bevel=0.05, segs=1)
    for dx, dy in ((-0.09, -0.08), (0.09, -0.06), (0.0, 0.09)):
        ball((1.55 + dx, -0.65 + dy, 0.72), 0.11, goods['yellow'], segs=10, rings=6)
    flat_caps(cyl((-1.55, -0.6, 0.38), 0.27, 0.36, wood, r_top=0.32, verts=16))
    torus((-1.55, -0.6, 0.56), 0.32, 0.04, cream, major_segs=16, minor_segs=4)
    for dx, dy in ((-0.1, -0.08), (0.1, -0.07), (0.0, 0.1), (0.0, -0.02)):
        ball((-1.55 + dx, -0.6 + dy, 0.62 + (0.07 if dx == 0 and dy < 0 else 0)), 0.1, goods['purple'], segs=10, rings=6)
    # balance scale hanging from an arm that reaches past the awning edge
    sx, sy = 0.82, -1.3
    rbox((sx, (fy + sy) / 2 - 0.02, 2.2), (0.08, abs(sy - fy) + 0.12, 0.08), mint, bevel=0.02, segs=1)
    post((sx, sy, 1.86), 0.018, 0.34, gold, verts=6)
    ball((sx, sy, 1.85), 0.05, gold, segs=8, rings=5)
    rbox((sx, sy, 1.83), (0.62, 0.04, 0.04), gold, bevel=0.015, segs=1)
    for px in (sx - 0.28, sx + 0.28):
        post((px, sy, 1.6), 0.012, 0.23, gold, verts=6)
        pan = hemi((px, sy, 1.6), 0.14, gold, scale=(1, 1, 0.4), segs=14, rings=6)
        pan.rotation_euler = (math.pi, 0, 0)    # bowl opens upwards
    ball((sx - 0.28, sy, 1.59), 0.06, goods['red'], segs=8, rings=5)
    # old round coin with a square hole on a short pole above the awning
    cz = 3.4
    post((0, 0.15, 2.72), 0.04, cz - 2.72 - 0.3, cream, verts=8)
    flat_caps(cyl((0, 0.15, cz), 0.32, 0.08, gold, rot=(math.pi / 2, 0, 0), verts=28))
    for sgn in (-1, 1):
        torus((0, 0.15 + sgn * 0.04, cz), 0.27, 0.025, gold, rot=(math.pi / 2, 0, 0), major_segs=24, minor_segs=4)
        box((0, 0.15 + sgn * 0.045, cz), (0.13, 0.012, 0.13), cream)


def build_dock():
    """Expedition dock (Ben khai thac): a wooden pier on posts running out to the west (the water side),
    a small mine cart on short rails, a signpost with a pickaxe, and a rope coil. Front = -Y."""
    plank = mat('#C9965F', rough=0.8)
    plank2 = mat('#B5834F', rough=0.8)
    dark = mat('#7A5634', rough=0.8)
    cream = mat('#FFF4E2', rough=0.6)
    mint = mat('#7EDCC4', rough=0.45)
    gold = mat('#FFC93C', rough=0.3, metal=0.35)
    steel = mat('#9AA5B8', rough=0.4, metal=0.5)
    ore = mat('#B79CFF', rough=0.4)
    # deck: 8 planks along X (x from 0.9 land end to -2.0 water end), alternating tone
    x0, x1, w = 0.9, -2.0, 1.6
    n = 8
    pw = (x0 - x1) / n
    for i in range(n):
        x = x0 - pw * (i + 0.5)
        rbox((x, 0, 0.3), (pw - 0.03, w, 0.1), plank if i % 2 == 0 else plank2, bevel=0.02, segs=1)
    # two stringers under the deck
    for y in (-0.55, 0.55):
        rbox(((x0 + x1) / 2, y, 0.2), (x0 - x1, 0.12, 0.1), dark, bevel=0.02, segs=1)
    # posts: three pairs, tops stick out above the deck with caps; rope between the end pair
    for x in (0.6, -0.5, -1.7):
        for y in (-0.78, 0.78):
            post((x, y, 0.0), 0.09, 0.9 if x < 0 else 0.75, dark, verts=8)
            ball((x, y, 0.9 if x < 0 else 0.75), 0.1, cream, segs=8, rings=5)
    for y in (-0.78, 0.78):
        rbox((-0.55, y, 0.62), (2.3, 0.05, 0.05), cream, bevel=0.01, segs=1)
    # rails and sleepers for the cart
    for y in (-0.22, 0.22):
        rbox((-0.4, y, 0.4), (2.4, 0.05, 0.05), steel, bevel=0.01, segs=1)
    for i in range(6):
        rbox((0.7 - 0.5 * i, 0, 0.37), (0.1, 0.6, 0.04), dark, bevel=0.01, segs=1)
    # mine cart: tapered body, mint stripe, four wheels, a heap of ore
    cx = -0.5
    rbox((cx, 0, 0.78), (0.72, 0.56, 0.4), mint, bevel=0.05, segs=1)
    rbox((cx, 0, 0.9), (0.78, 0.62, 0.06), cream, bevel=0.02, segs=1)
    for dx in (-0.22, 0.22):
        for y in (-0.3, 0.3):
            flat_caps(cyl((cx + dx, y, 0.5), 0.12, 0.06, dark, rot=(math.pi / 2, 0, 0), verts=10))
    for dx, dy, dz in ((-0.15, -0.08, 0), (0.12, 0.05, 0), (0.0, 0.0, 0.1), (-0.12, 0.1, 0.02)):
        ball((cx + dx, dy, 1.0 + dz), 0.13, ore, scale=(1, 1, 0.85), segs=8, rings=5)
    # signpost at the land end with a hanging board and a pickaxe on top
    sx, sy = 1.3, -0.9
    post((sx, sy, 0.0), 0.06, 2.4, dark, verts=8)
    rbox((sx, sy - 0.07, 1.8), (0.9, 0.06, 0.4), cream, bevel=0.03, segs=1)
    flat_caps(cyl((sx - 0.3, sy - 0.11, 1.8), 0.08, 0.03, gold, rot=(math.pi / 2, 0, 0), verts=10))
    rbox((sx, sy, 2.4), (0.06, 0.06, 0.5), dark, bevel=0.01, segs=1)
    rbox((sx, sy, 2.65), (0.55, 0.07, 0.09), steel, bevel=0.02, segs=1)
    # rope coil
    torus((0.5, 0.55, 0.4), 0.17, 0.05, cream, major_segs=14, minor_segs=4)


BUILDING_BUILDERS = dict(breeding=build_breeding, extractor=build_extractor, codex=build_codex, market=build_market, dock=build_dock)


# ---------------------------------------------------------------- preview renders

def _import(path, x=0.0, y=0.0, z=0.0, yaw=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.parent is None:
            o.location = (o.location.x + x, o.location.y + y, o.location.z + z)
            o.rotation_mode = 'XYZ'
            o.rotation_euler.z += yaw
    return new


def _scene():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 32
    sc.cycles.use_denoising = True
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('sky')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.80, 1.0, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    sc.world = w
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(40), 0, math.radians(-30)))
    s = bpy.context.view_layer.objects.active
    s.data.energy = 3.0
    s.data.angle = math.radians(10)
    return sc


def _shot(sc, name, loc, target, lens, w=1024, h=768):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.clip_end = 300
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.filepath = os.path.join(RENDERS, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('ISLAND_RENDER', sc.render.filepath)


def render_previews(targets):
    L.reset()
    os.makedirs(RENDERS, exist_ok=True)
    sc = _scene()
    _import(os.path.join(OUT, 'island.glb'))
    for name, b in BLD.items():
        path = os.path.join(OUT, name + '.glb')
        if os.path.exists(path):
            _import(path, b['x'], b['y'])
    mons = os.path.join(L.OUT_MONSTERS, '%s.glb')
    cast = [('fe', HAB['metal'], 0, 0), ('fe', HAB['metal'], 1.2, 0.6), ('h2o', HAB['spring'], 0, 0),
            ('h2', HAB['gas'], 0, 0), ('fe', HAB['quarry'], 0, 0), ('h2o', HAB['halogen'], 0, 0),
            ('h2', HAB['noble'], 0, 0), ('fe', HAB['crystal'], 0, 0)]
    for mid, h, dx, dy in cast:
        if os.path.exists(mons % mid):
            _import(mons % mid, h['x'] + dx, h['y'] + dy)
    b = BLD['breeding']
    if os.path.exists(mons % 'fe'):
        _import(mons % 'fe', b['x'] + 1.2, b['y'] - b['r'] - 0.8)
        for n in ('extractor', 'codex', 'market', 'dock'):
            bb = BLD[n]
            _import(mons % 'fe', bb['x'] + 1.0, bb['y'] - bb['r'] - 0.7)
    if 'island' in targets:
        _shot(sc, 'island_overview', (0, -30, 26), (0, 4, 0), 30)
        _shot(sc, 'island_left', (-11, -9.5, 11), (-10, 6, 0), 30)
        _shot(sc, 'island_right', (11, -9.5, 11), (10, 6, 0), 30)
        _shot(sc, 'island_back', (0, -1, 12), (0, 12.5, 0), 30)
        _shot(sc, 'island_side', (-26, -34, 4), (0, 3, -3.5), 32)
    for name in ('breeding', 'extractor', 'codex', 'market', 'dock'):
        if name in targets:
            bb = BLD[name]
            dx = dict(breeding=2.5, extractor=-4.5, codex=4.5, market=3.0, dock=3.0)[name]
            _shot(sc, name, (bb['x'] + dx, bb['y'] - 8.0, 5.5), (bb['x'], bb['y'], 1.4), 40, 768, 768)


# ---------------------------------------------------------------- main

def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    render = '--render' in argv
    targets = [a for a in argv if not a.startswith('--')] or ['island', 'breeding', 'extractor', 'codex', 'market', 'dock']
    load_layout()
    results = []
    for t in targets:
        L.reset()
        if t == 'island':
            build_island()
            results.append(export('island', ISLAND_MAX_TRIS, ISLAND_MAX_BYTES, check_island))
        elif t in BUILDING_BUILDERS:
            BUILDING_BUILDERS[t]()
            results.append(export(t, BUILDING_MAX_TRIS, BUILDING_MAX_BYTES, check_building(t)))
        else:
            raise SystemExit('unknown target %s' % t)
    for r in results:
        print('ISLAND_SUMMARY %-10s tris=%6d bytes=%8d materials=%d' % (r['name'], r['tris'], r['bytes'], r['materials']))
    if render:
        render_previews(targets)
    print('ISLAND_OK')



if __name__ == '__main__':
    try:
        main()
    except BaseException as exc:          # Blender exits 0 on an uncaught error; make failures visible
        if isinstance(exc, SystemExit) and not exc.code:
            raise
        import traceback
        traceback.print_exc()
        print('ISLAND_FAILED %s' % exc)
        sys.exit(1)
