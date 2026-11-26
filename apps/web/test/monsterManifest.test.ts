import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '@chemimon/content';
import { expect, it } from 'vitest';

const DIR = join(__dirname, '../public/assets/monsters');

it('manifest.json lists exactly the .glb files on disk, and every catalog monster has one', () => {
  const listed: string[] = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')).available;
  const onDisk = readdirSync(DIR).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
  expect([...listed].sort()).toEqual(onDisk.sort());
  const keys = loadCatalog().monsters.map((m) => m.assetKey);
  expect(keys.filter((k) => !listed.includes(k))).toEqual([]);
});
