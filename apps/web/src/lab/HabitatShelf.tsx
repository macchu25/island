import type { MonsterDef } from '@chemimon/shared';
import { useCatalog, useMe } from '../api/queries';
import { MonsterModel } from '../monsters/MonsterModel';

export function HabitatShelf() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  if (!me || !catalog) return null;
  const byChem = new Map(catalog.monsters.map((m) => [m.chemicalId, m]));
  const owned = me.inventory
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.chemicalId.localeCompare(b.chemicalId))
    .map((s) => byChem.get(s.chemicalId))
    .filter((m): m is MonsterDef => m !== undefined)
    .slice(0, 12);
  return (
    <group name="habitat-shelf" position={[0, 0, -4]}>
      {owned.map((m, i) => (
        <group key={m.id} position={[(i % 6) * 1.6 - 4, Math.floor(i / 6) * 1.6, 0]} scale={0.8}>
          <MonsterModel monster={m} />
        </group>
      ))}
    </group>
  );
}
