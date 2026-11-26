"""Product picture recipes (can, wire, soap, glass, roof, steel, ring, solar, chip).

Each recipe is art/blender/products/<id>.py with build() returning an optional dict. Objects stand on Z = 0, the
camera looks from the front (-Y). Recipe keys: 'view' = camera offset in units of the object span (default
(0.6, -2.4, 1.3)). Rendered by `blender -b -P art/blender/thumbs.py -- --products [<id> ...]`.
No faces: these are objects, not monsters.
"""
import bpy
from mathutils import Matrix

import chemilib as L

IDS = ['can', 'wire', 'soap', 'glass', 'roof', 'steel', 'ring', 'solar', 'chip']


class grp:
    """Build parts around the origin, then tilt / move them as one: `with grp(z=0.5, rx=-0.5): ...`."""

    def __init__(self, x=0.0, y=0.0, z=0.0, rx=0.0, ry=0.0, rz=0.0):
        self.M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')

    def __enter__(self):
        self.n = len(L._parts)
        return self

    def __exit__(self, *exc):
        bpy.context.view_layer.update()
        for o in L._parts[self.n:]:
            o.matrix_world = self.M @ o.matrix_world
        return False
