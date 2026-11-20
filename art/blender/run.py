"""Build monster models.

  blender -b -P art/blender/run.py -- [--render] [--out DIR] <id> [<id> ...]
  blender -b -P art/blender/run.py -- --all [--render]

Each id needs a recipe art/blender/monsters/<id>.py that defines build() and ends by returning
chemilib.finish(...) arguments through its own call. See monsters/h2.py for the shape of a recipe.
"""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import chemilib  # noqa: E402


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    render = '--render' in argv
    out = None
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    ids = [a for a in argv if not a.startswith('--') and a != out]
    if '--all' in argv:
        ids = sorted(f[:-3] for f in os.listdir(os.path.join(HERE, 'monsters')) if f.endswith('.py') and not f.startswith('_'))
    failed = []
    for mid in ids:
        chemilib.reset()
        try:
            mod = importlib.import_module('monsters.' + mid)
            spec = mod.build() or {}
            chemilib.finish(mid, render=render, out_dir=out, **spec)
        except Exception as exc:  # report every broken recipe, not only the first
            import traceback
            traceback.print_exc()
            failed.append('%s: %s' % (mid, exc))
    if failed:
        print('CHEMILIB_FAILED ' + ' | '.join(failed))
        sys.exit(1)
    print('CHEMILIB_OK %d model(s)' % len(ids))


main()
