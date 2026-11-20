"""Tile renders into one image.  blender -b -P art/blender/contact_sheet.py -- OUT.png [--sil] [--cols N] id [id ...]"""
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RENDERS = os.path.join(HERE, '..', 'renders')
argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]
sil = '--sil' in argv
cols = int(argv[argv.index('--cols') + 1]) if '--cols' in argv else 5
skip = {out, '--sil', '--cols', str(cols) if '--cols' in argv else None}
ids = [a for a in argv[1:] if a not in skip]
cell = 256
rows = (len(ids) + cols - 1) // cols
sheet = np.ones((rows * cell, cols * cell, 4), dtype=np.float32)
for i, mid in enumerate(ids):
    path = os.path.join(RENDERS, mid + ('_sil' if sil else '') + '.png')
    if not os.path.exists(path):
        continue
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    step = max(w // cell, 1)
    px = px[::step, ::step][:cell, :cell]
    r, c = divmod(i, cols)
    y0 = (rows - 1 - r) * cell
    sheet[y0:y0 + px.shape[0], c * cell:c * cell + px.shape[1]] = px
res = bpy.data.images.new('sheet', cols * cell, rows * cell)
res.pixels = sheet.ravel()
res.filepath_raw = out
res.file_format = 'PNG'
res.save()
print('SHEET', out, len(ids))
