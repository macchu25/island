import { expect, type Page } from '@playwright/test';

/** Mirror of IslandProbe in apps/web/src/island/E2EProbe.tsx (the e2e project cannot import web sources). */
export interface Probe {
  monsters(): string[];
  gltfMonsters(): number;
  loading(): boolean;
  hasNode(name: string): boolean;
  screenOf(name: string, lift?: number): { x: number; y: number } | null;
  camera(): { target: { x: number; z: number }; distance: number; maxDistance: number };
  limits: { island: { cx: number; cz: number; rx: number; rz: number }; targetFraction: number; maxDistance: number; monsterScale: number };
}

/** Runs `fn` in the page against window.__island (present only on pages opened with `?e2e`). */
export async function islandProbe<R, A = undefined>(page: Page, fn: (probe: Probe, arg: A) => R, arg?: A): Promise<R> {
  return page.evaluate(
    ({ src, a }) => {
      const probe = (window as unknown as { __island?: Probe }).__island;
      if (!probe) throw new Error('island probe missing: open the page with ?e2e');
      return (new Function('probe', 'arg', `return (${src})(probe, arg);`) as (p: Probe, x: unknown) => R)(probe, a);
    },
    { src: fn.toString(), a: arg as unknown },
  ) as Promise<R>;
}

/**
 * Opens (or reloads) the island with the probe enabled and waits until it is really ready: `count` monsters stand
 * on the island, every one renders its .glb, and no model file is still loading.
 */
export async function openIsland(page: Page, count: number, reload = false) {
  if (reload) await page.reload();
  else await page.goto('/?e2e=1');
  await expect(page.getByTestId('island').locator('canvas')).toBeVisible();
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const p = (window as unknown as { __island?: Probe }).__island;
          return p ? { n: p.monsters().length, glb: p.gltfMonsters(), loading: p.loading() } : null;
        }),
      { timeout: 60_000, intervals: [250, 500, 1_000] },
    )
    .toEqual({ n: count, glb: count, loading: false });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000); // shader compile and the environment bake
}
