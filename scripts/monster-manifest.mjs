// Writes manifest.json (the list of .glb files that exist) for monsters and for island scenery.
// Run after building models: node scripts/monster-manifest.mjs
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'assets');
for (const kind of ['monsters', 'island']) {
  const dir = join(assets, kind);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const available = readdirSync(dir).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort();
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ available }) + '\n');
  console.log(`${kind}: ${available.length} model(s)`);
}
