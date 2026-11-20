import { useMemo } from 'react';
import type { MonsterDef } from '@chemimon/shared';
import { useCatalog, useMe } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterModel } from '../monsters/MonsterModel';

export function HabitatShelf() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const inventory = me?.inventory;
  const owned = useMemo(() => {
    if (!inventory || !catalog) return [];
    const byChem = new Map(catalog.monsters.map((m) => [m.chemicalId, m]));
    return [...inventory]
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count || a.chemicalId.localeCompare(b.chemicalId))
      .map((s) => byChem.get(s.chemicalId))
      .filter((m): m is MonsterDef => m !== undefined)
      .slice(0, 12);
  }, [inventory, catalog]);
  if (!catalog) return null;
  const labelFor = (m: MonsterDef) => {
    const f = catalog.chemicals.find((c) => c.id === m.chemicalId)?.formula;
    return f ? formatFormula(f) : undefined;
  };
  return (
    <group name="habitat-shelf" position={[0, 0, -4]}>
      {owned.map((m, i) => (
        <group key={m.id} position={[(i % 6) * 1.6 - 4, Math.floor(i / 6) * 1.6, 0]} scale={0.8}>
          <MonsterModel monster={m} label={labelFor(m)} />
        </group>
      ))}
    </group>
  );
}
