import type { Page } from '@playwright/test';

/**
 * Render-only tests: rewrite GET /api/me so the player owns every catalog species (counts 1 to 6), and optionally
 * shows a running breeding session. Lets a fresh player show all 45 monsters on the island without breeding them.
 * Never use it in a gameplay test.
 */
export async function ownEverySpecies(page: Page, opts: { running?: boolean } = {}): Promise<number> {
  const catalog = (await (await page.request.get('/api/catalog')).json()) as { chemicals: { id: string }[] };
  const inventory = catalog.chemicals.map((c, i) => ({ chemicalId: c.id, count: 1 + (i % 6) }));
  await page.route('**/api/me', async (route) => {
    const res = await route.fetch();
    if (!res.ok()) return route.fulfill({ response: res });
    const body = (await res.json()) as { inventory: unknown; sessions: unknown[] };
    body.inventory = inventory;
    if (opts.running) {
      body.sessions = [{
        id: 'render-only-session',
        status: 'running',
        inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }],
        conditions: { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' },
        readyAt: new Date(Date.now() + 3_600_000).toISOString(),
      }];
    }
    return route.fulfill({ response: res, json: body });
  });
  return inventory.length;
}
