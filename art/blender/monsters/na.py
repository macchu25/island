"""Na Sodiburr: soft alkali-metal cube. Sodium cuts like butter: one top corner is sliced off and
shows a shiny silver face. It fizzes in water, so a few bubbles sit at its feet."""
import bmesh
import chemilib
from chemilib import *

C = '#E8E3C9'


def slice_corner(o, plane_co, plane_no, cap_material):
    """Apply the bevel, cut the mesh with a plane through its full depth and close the hole
    with a new face in a second (shiny) material."""
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    plane_co = Vector(plane_co) - o.location     # mesh data is local to the object
    bm = bmesh.new()
    bm.from_mesh(o.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=plane_co, plane_no=plane_no, clear_outer=True)
    edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    new = bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    o.data.materials.append(chemilib._as_mat(cap_material))
    for f in new['faces']:
        f.material_index = 1
        f.smooth = False
    bm.to_mesh(o.data)
    bm.free()
    return o


def build():
    body = mat(C, rough=0.6, metal=0.15)
    silver = mat('#B9C5D4', rough=0.08, metal=0.6)
    bubble = mat('#CDEFFF', rough=0.1, alpha=0.75)
    head = rbox((0, 0, 0.56), (0.92, 0.8, 0.86), body, bevel=0.2, segs=3)
    # plane through the whole depth on the +X top edge, tipped a little to the front
    slice_corner(head, (0.25, 0, 0.86), Vector((0.72, -0.25, 0.65)).normalized(), silver)
    for s in (-1, 1):
        sphere((s * 0.2, -0.05, 0.07), 0.11, body, scale=(1.1, 1.2, 0.75))   # feet
        sphere((s * 0.5, -0.05, 0.42), 0.09, body)                          # stubby arms
    # fizz bubbles around the feet
    for x, y, r in ((-0.48, -0.25, 0.08), (-0.6, -0.08, 0.05), (0.52, -0.22, 0.07), (0.38, -0.36, 0.045),
                    (0.64, -0.05, 0.045)):
        sphere((x, y, r), r, bubble)
    face(0.52, dx=0.19, eye_r=0.095, mouth='smile', on=[head])
    return {'height': 1.0}
