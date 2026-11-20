import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { ownEverySpecies } from './ownAll';

// Visual check of the island scene. Registers only (no breeding): loop.spec.ts needs the First Discovery of H2O.
const OUT = fileURLToPath(new URL('../test-results/', import.meta.url));

async function settle(page: Page, ms: number) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

test('island shows every owned species; screenshots of the whole island and one habitat', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const suffix = Date.now().toString(36);
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `island-${suffix}@example.com`, displayName: `island_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  // Screenshots show the full roster: all 45 species, so every habitat is populated.
  expect(await ownEverySpecies(page)).toBe(45);

  await page.goto('/');
  const canvas = page.getByTestId('island').locator('canvas');
  await expect(canvas).toBeVisible();
  await settle(page, 4_000); // models, shader compile, environment bake
  await page.screenshot({ path: `${OUT}island-whole.png` });

  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  // Clicking the breeding building (centre of the island) pulses the breeding HUD panel for about 1.5 s.
  const breeding = at(0.59, 0.42);
  await page.mouse.click(breeding.x, breeding.y);
  await expect(page.getByRole('region', { name: 'Lai tạo' })).toHaveAttribute('data-pulse', 'true');
  await expect(page.getByRole('region', { name: 'Lai tạo' })).not.toHaveAttribute('data-pulse', 'true', { timeout: 4_000 });

  // Zoom towards the metal habitat (left of centre) with real wheel input (zoom-to-cursor), then pan with a real drag.
  const metal = at(0.35, 0.4);
  await page.mouse.move(metal.x, metal.y);
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(60);
  }
  await settle(page, 1_200);
  await page.screenshot({ path: `${OUT}island-zoom-metal.png` });

  // Clicking a monster (the big sodium block in the middle of the metal plot) opens its detail panel.
  const na = at(433 / 1280, 262 / 720);
  await page.mouse.click(na.x, na.y);
  const close = page.getByRole('button', { name: 'Đóng' });
  await expect(close).toBeVisible();
  await settle(page, 2_500);
  await page.screenshot({ path: `${OUT}island-monster-detail.png` });
  await close.click();
  await expect(close).toHaveCount(0);

  const mid = at(0.5, 0.5);
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.move(mid.x - 300, mid.y + 60, { steps: 12 });
  await page.mouse.up();
  await settle(page, 1_200);
  await page.screenshot({ path: `${OUT}island-zoom-pan.png` });

  // Fresh start view, then a close-up of the gas habitat (floating .glb monsters).
  await page.reload();
  await expect(canvas).toBeVisible();
  await settle(page, 3_000);
  const gas = at(0.565, 0.15);
  await page.mouse.move(gas.x, gas.y);
  for (let i = 0; i < 22; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(60);
  }
  // Drag the hilltop down into the middle of the screen.
  const top = at(0.6, 0.25);
  await page.mouse.move(top.x, top.y);
  await page.mouse.down();
  await page.mouse.move(top.x, top.y + 260, { steps: 12 });
  await page.mouse.up();
  await settle(page, 1_200);
  await page.screenshot({ path: `${OUT}island-zoom-gas.png` });

  expect(errors, 'uncaught page errors').toEqual([]);
});

test('a running session glows on the breeding building; its click pulses the HUD; the camera cannot leave the island', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const suffix = Date.now().toString(36);
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `island2-${suffix}@example.com`, displayName: `island2_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  await ownEverySpecies(page, { running: true });
  // Show every building model that exists on disk even before the coordinator regenerates the manifest
  // (a listed file that is missing falls back to the primitive building).
  await page.route('**/assets/island/manifest.json', (r) => r.fulfill({ json: { available: ['island', 'breeding', 'extractor', 'codex'] } }));

  await page.goto('/');
  const canvas = page.getByTestId('island').locator('canvas');
  await expect(canvas).toBeVisible();
  await settle(page, 4_000);
  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  const breeding = at(0.59, 0.42);
  await page.mouse.click(breeding.x, breeding.y);
  const panel = page.getByRole('region', { name: 'Lai tạo' });
  await expect(panel).toHaveAttribute('data-pulse', 'true');
  await page.screenshot({ path: `${OUT}island-running-pulse.png` });

  // Zoom on the breeding building to see the running glow.
  await page.mouse.move(breeding.x, breeding.y);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(60);
  }
  await settle(page, 1_200);
  await page.screenshot({ path: `${OUT}island-running-zoom.png` });

  // Drag hard towards one side six times, then zoom all the way out: the island must still fill the view.
  for (let i = 0; i < 6; i++) {
    const a = at(0.85, 0.5);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x - box.width * 0.7, a.y + box.height * 0.3, { steps: 8 });
    await page.mouse.up();
  }
  await settle(page, 800);
  await page.screenshot({ path: `${OUT}island-clamp-drag.png` });
  const c = at(0.6, 0.5);
  await page.mouse.move(c.x, c.y);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(30);
  }
  await settle(page, 1_200);
  await page.screenshot({ path: `${OUT}island-clamp-zoomout.png` });

  expect(errors, 'uncaught page errors').toEqual([]);
});
