import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { ownEverySpecies } from './ownAll';
import { islandProbe, openIsland, type Probe } from './probe';

// Visual and behaviour checks of the island scene. Registers only (no breeding): loop.spec.ts needs the First
// Discovery of H2O. Pages open with `?e2e`, which exposes a read-only scene probe (apps/web/src/island/E2EProbe.tsx).
const OUT = fileURLToPath(new URL('../test-results/', import.meta.url));

async function register(page: Page, tag: string) {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `${tag}-${suffix}@example.com`, displayName: `${tag}_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
}

/** Moves the mouse onto a scene node (projected through the live camera) and returns the page point. */
async function pointAt(page: Page, node: string, lift = 0) {
  const box = (await page.getByTestId('island').locator('canvas').boundingBox())!;
  const p = await islandProbe(page, (pr: Probe, a: { node: string; lift: number }) => pr.screenOf(a.node, a.lift), { node, lift });
  expect(p, `${node} is in the scene`).not.toBeNull();
  return { x: box.x + p!.x, y: box.y + p!.y };
}

/** Drags the ground so `node` comes to the middle of the canvas (map-style pan with a real mouse drag). */
async function centreOn(page: Page, node: string) {
  const box = (await page.getByTestId('island').locator('canvas').boundingBox())!;
  const p = await pointAt(page, node);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1_200);
}

async function zoomTowards(page: Page, node: string, steps: number) {
  const p = await pointAt(page, node);
  await page.mouse.move(p.x, p.y);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1_200); // damping settles
}

test('the island shows all 45 owned species as .glb models; clicking one opens its own detail', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page, 'island');
  const catalog = (await (await page.request.get('/api/catalog')).json()) as {
    chemicals: { id: string }[];
    monsters: { chemicalId: string; displayName: string }[];
  };
  expect(await ownEverySpecies(page)).toBe(45);

  await openIsland(page, 45);
  const onIsland = await islandProbe(page, (pr: Probe) => pr.monsters());
  expect(onIsland.sort()).toEqual(catalog.chemicals.map((c) => c.id).sort());
  await page.screenshot({ path: `${OUT}island-whole.png` });

  // Building click (projected from the live scene) opens the breeding room with a picture of every owned species.
  const breeding = await pointAt(page, 'building-breeding', 1.5);
  await page.mouse.click(breeding.x, breeding.y);
  const room = page.getByRole('dialog', { name: 'Phòng lai tạo' });
  await expect(room).toBeVisible();
  await expect(room.locator('[data-testid^="pick-"]')).toHaveCount(45);
  await expect
    .poll(() => room.locator('[data-testid^="pick-"] img').evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth > 0).length), { timeout: 15_000 })
    .toBe(45);
  await page.screenshot({ path: `${OUT}breeding-room.png` });
  await room.getByRole('button', { name: 'Đóng' }).click();
  await expect(room).toHaveCount(0);

  // Market building opens the market panel.
  const market = await pointAt(page, 'building-market', 1.5);
  await page.mouse.click(market.x, market.y);
  const marketDialog = page.getByRole('dialog', { name: 'Chợ' });
  await expect(marketDialog).toBeVisible();
  await marketDialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(marketDialog).toHaveCount(0);
  await page.screenshot({ path: `${OUT}island-market.png` });

  // Metal plot close-up (hg is the widest metal; check it does not overlap its neighbours).
  await zoomTowards(page, 'island-monster-hg', 16);
  await centreOn(page, 'island-monster-mg');
  await page.screenshot({ path: `${OUT}island-zoom-metal.png` });

  // Click the sodium monster where the camera actually draws it, and expect ITS detail panel.
  const scale = await islandProbe(page, (pr: Probe) => pr.limits.monsterScale);
  const na = await pointAt(page, 'island-monster-na', 0.5 * scale);
  await page.mouse.click(na.x, na.y);
  const naName = catalog.monsters.find((m) => m.chemicalId === 'na')!.displayName;
  const detail = page.getByRole('heading', { name: naName, exact: true }).locator('..');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Na ·');
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${OUT}island-monster-detail.png` });
  await detail.getByRole('button', { name: 'Đóng' }).click();
  await expect(detail).toHaveCount(0);

  // Close-ups of every alpha-blended or wide model: gas lobes, ar bulb, ko2 helmet in the quarry.
  for (const [name, node] of [['gas', 'island-monster-n2'], ['noble', 'island-monster-ar'], ['quarry', 'island-monster-ko2']] as const) {
    await openIsland(page, 45, true);
    await zoomTowards(page, node, 26);
    await centreOn(page, node);
    await page.screenshot({ path: `${OUT}island-closeup-${name}.png` });
    // Tight crop around the model itself, to judge its face and any alpha-blended parts.
    const c = await pointAt(page, node, 0.5);
    await page.screenshot({ path: `${OUT}island-closeup-${name}-crop.png`, clip: { x: c.x - 180, y: c.y - 170, width: 360, height: 300 } });
  }

  expect(errors, 'uncaught page errors').toEqual([]);
});

test('a running session shows on the breeding building; the camera cannot leave the island', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page, 'island2');
  await ownEverySpecies(page, { running: true });
  await openIsland(page, 45);

  expect(await islandProbe(page, (pr: Probe) => pr.hasNode('breeding-running'))).toBe(true);
  await zoomTowards(page, 'building-breeding', 12);
  await page.screenshot({ path: `${OUT}island-running-zoom.png` });

  // Drag hard towards one side six times, then zoom all the way out.
  const box = (await page.getByTestId('island').locator('canvas').boundingBox())!;
  for (let i = 0; i < 6; i++) {
    const a = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.5 };
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x - box.width * 0.7, a.y + box.height * 0.3, { steps: 8 });
    await page.mouse.up();
  }
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(1_500);
  const cam = await islandProbe(page, (pr: Probe) => ({ ...pr.camera(), limits: pr.limits }));
  const { cx, cz, rx, rz } = cam.limits.island;
  const f = cam.limits.targetFraction;
  const k = Math.hypot((cam.target.x - cx) / (rx * f), (cam.target.z - cz) / (rz * f));
  expect(k, 'pan target stays inside the clamp ellipse').toBeLessThanOrEqual(1 + 1e-6);
  expect(cam.maxDistance).toBeLessThanOrEqual(cam.limits.maxDistance);
  expect(cam.distance, 'zoom-out stops at maxDistance').toBeLessThanOrEqual(cam.maxDistance + 1e-3);
  await page.screenshot({ path: `${OUT}island-clamp-zoomout.png` });

  expect(errors, 'uncaught page errors').toEqual([]);
});
