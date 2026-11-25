import { loadCatalog } from '@chemimon/content';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { ReactNode } from 'react';
import type { Object3D } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rendered = new Map<string, { label?: string; badge?: string; phase?: number }>();
vi.mock('../src/monsters/MonsterModel', () => ({
  MonsterModel: (p: { monster: { chemicalId: string }; label?: string; badge?: string; phase?: number }) => {
    rendered.set(p.monster.chemicalId, { label: p.label, badge: p.badge, phase: p.phase });
    return null;
  },
}));

import { Buildings } from '../src/island/Buildings';
import { habitatFor } from '../src/island/habitats';
import { IslandMonsters } from '../src/island/IslandMonsters';
import { LAYOUT } from '../src/island/layout';
import { FLOOR_Y, MONSTER_ISLAND_SCALE } from '../src/island/placement';
import { useUi } from '../src/state/ui';

const catalog = loadCatalog();
const STARTERS = catalog.chemicals.filter((c) => c.kind === 'element').map((c) => c.id);

function client(inventory: { chemicalId: string; count: number }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory, sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], catalog);
  return (children: ReactNode) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
type Instance = ReturnType<Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>['scene']['findAll']>[number];
const byName = (root: { findAll: (f: (n: Instance) => boolean) => Instance[] }, name: string) =>
  root.findAll((n) => (n.instance as Object3D).name === name);

beforeEach(() => {
  rendered.clear();
  useUi.setState({ panel: 'none', selectedChemicalId: null, pulse: null });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available: [] }))));
});
afterEach(() => vi.unstubAllGlobals());

describe('IslandMonsters', () => {
  it('renders EVERY owned species: 25 starter stacks never hide newly bred compounds (old shelf bug)', async () => {
    const inventory = [...STARTERS.map((id) => ({ chemicalId: id, count: id === 'h2' ? 0 : 4 })), { chemicalId: 'h2o', count: 2 }, { chemicalId: 'nacl', count: 1 }];
    const wrap = client(inventory);
    await ReactThreeTestRenderer.create(wrap(<IslandMonsters />));
    const expected = inventory.filter((s) => s.count > 0).map((s) => s.chemicalId);
    expect([...rendered.keys()].sort()).toEqual(expected.sort());
    expect(rendered.get('h2o')).toMatchObject({ label: 'H₂O', badge: '×2' });
    expect(rendered.get('fe')).toMatchObject({ label: 'Fe', badge: '×4' });
    expect(rendered.has('h2')).toBe(false);
  });

  it('all 45 species owned: each stands inside its own habitat plot', async () => {
    const wrap = client(catalog.chemicals.map((c) => ({ chemicalId: c.id, count: 1 })));
    const r = await ReactThreeTestRenderer.create(wrap(<IslandMonsters />));
    expect(rendered.size).toBe(45);
    for (const c of catalog.chemicals) {
      const g = byName(r.scene, `island-monster-${c.id}`)[0]!.instance;
      const hab = LAYOUT.habitats[habitatFor(c)];
      expect(Math.hypot(g.position.x - hab.x, g.position.z - hab.z), c.id).toBeLessThan(hab.r);
      expect(g.position.y).toBe(FLOOR_Y);
      expect(g.scale.x).toBe(MONSTER_ISLAND_SCALE);
    }
    expect(new Set([...rendered.values()].map((v) => v.phase)).size).toBe(45);
  });

  it('clicking a monster opens its detail panel; a drag that ends on it does not', async () => {
    const wrap = client([{ chemicalId: 'fe', count: 4 }]);
    const r = await ReactThreeTestRenderer.create(wrap(<IslandMonsters />));
    const hit = r.scene.findAll((n) => n.instance.name === 'hit')[0]!;
    await r.fireEvent(hit, 'click', { delta: 40 });
    expect(useUi.getState().panel).toBe('none');
    await r.fireEvent(hit, 'click', { delta: 0 });
    expect(useUi.getState()).toMatchObject({ panel: 'monster', selectedChemicalId: 'fe' });
  });
});

describe('Buildings', () => {
  const renderBuildings = (running = false) => ReactThreeTestRenderer.create(client([])(<Buildings running={running} />));

  it('places the three buildings at their layout positions with primitive fallbacks and name signs', async () => {
    const r = await renderBuildings();
    for (const id of ['breeding', 'extractor', 'codex'] as const) {
      const g = byName(r.scene, `building-${id}`)[0]!.instance;
      expect([g.position.x, g.position.z]).toEqual([LAYOUT.buildings[id].x, LAYOUT.buildings[id].z]);
      expect(g.getObjectByName(`sign-${id}`)).toBeTruthy();
    }
    expect(byName(r.scene, 'breeding-machine')).toHaveLength(1);
    expect(byName(r.scene, 'extractor-fallback')).toHaveLength(1);
    expect(byName(r.scene, 'codex-fallback')).toHaveLength(1);
  });

  it('codex building opens the codex; breeding building opens the breeding room; extractor pulses its HUD widget', async () => {
    const r = await renderBuildings();
    await r.fireEvent(byName(r.scene, 'hit-codex')[0]!, 'click', { delta: 0 });
    expect(useUi.getState().panel).toBe('codex');
    await r.fireEvent(byName(r.scene, 'hit-breeding')[0]!, 'click', { delta: 0 });
    expect(useUi.getState().panel).toBe('breeding');
    expect(useUi.getState().pulse).toBeNull();
    await r.fireEvent(byName(r.scene, 'hit-extractor')[0]!, 'click', { delta: 0 });
    expect(useUi.getState().pulse).toBe('extractor');
  });

  it('shows the running glow only while a breeding session runs', async () => {
    expect(byName((await renderBuildings(false)).scene, 'breeding-running')).toHaveLength(0);
    expect(byName((await renderBuildings(true)).scene, 'breeding-running')).toHaveLength(1);
  });
});
