// Writes apps/web/public/assets/monsters/manifest.json from the .glb files that exist.
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'assets', 'monsters');
const available = readdirSync(dir).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort();
writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ available }) + '\n');
console.log(`manifest: ${available.length} model(s)`);
