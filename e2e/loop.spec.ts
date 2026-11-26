import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { E2E_WEB_URL } from './env';

const OUT = fileURLToPath(new URL('../test-results/', import.meta.url));

// One player, one browser context for both tests: the second test checks the session survives a reload.
test.describe.serial('breeding loop', () => {
  let context: BrowserContext;
  let page: Page;
  const pageErrors: string[] = [];
  const suffix = Date.now().toString(36);
  const user = { email: `e2e-${suffix}@example.com`, displayName: `e2e_${suffix}`, password: 'password123' };
  let waterName = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL: E2E_WEB_URL });
    page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(e.message));
    // Read the name from the served catalog, not a literal: content data may be renamed.
    const catalog = (await (await page.request.get('/api/catalog')).json()) as {
      chemicals: { id: string; name: string }[];
    };
    waterName = catalog.chemicals.find((c) => c.id === 'h2o')!.name;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.afterEach(() => {
    expect(pageErrors, 'uncaught page errors').toEqual([]);
  });

  const codexPanel = () => page.getByRole('heading', { name: 'Codex', exact: true }).locator('..');
  const waterCard = () =>
    codexPanel().locator('div').filter({ has: page.getByText(waterName, { exact: true }) }).last();

  test('register, breed 2 H2 + O2 with a spark, collect, see H2O in the Codex', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Đăng ký' }).click();
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Tên hiển thị').fill(user.displayName);
    await page.getByLabel('Mật khẩu').fill(user.password);
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

    await expect(page.getByRole('banner').getByText(user.displayName)).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();

    // The quest panel tells a new player what to do first.
    const quests = page.getByRole('region', { name: 'Nhiệm vụ' });
    await expect(quests.getByLabel('Đã xong')).toHaveText('0/19');
    const coins = page.getByRole('banner').getByLabel('Số Xu');
    await expect(coins).toHaveText('200 Xu');
    // Starter kit: exactly 6 kinds x 4 (read-only API check).
    const me = (await (await page.request.get('/api/me')).json()) as { inventory: { chemicalId: string; count: number }[] };
    expect(me.inventory.filter((i) => i.count > 0).map((i) => [i.chemicalId, i.count]).sort()).toEqual(
      ['h2', 'o2', 'c', 'n2', 'na', 'cl2'].sort().map((id) => [id, 4]),
    );
    await expect(quests.getByTestId('quest-extract-first')).toContainText('Nhận quái từ Máy chiết');

    await page.getByRole('banner').getByRole('button', { name: 'Lai tạo' }).click();
    const panel = page.getByRole('dialog', { name: 'Phòng lai tạo' });
    await expect(panel.getByTestId('pick-h2').locator('img')).toHaveJSProperty('complete', true);
    expect(await panel.getByTestId('pick-h2').locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await panel.getByTestId('pick-h2').click();
    await panel.getByRole('button', { name: 'Tăng A' }).click();
    await expect(panel.getByLabel('Số lượng A')).toHaveText('2');
    await panel.getByTestId('pick-o2').click();
    await expect(panel.getByLabel('Số lượng B')).toHaveText('1');
    const spark = panel.getByRole('group', { name: 'Kích hoạt' }).getByRole('button', { name: 'Tia lửa' });
    await spark.click();
    await expect(spark).toHaveAttribute('aria-pressed', 'true');
    // Approved rule h2_o2_spark needs only activation spark; the other conditions stay at their defaults.
    await expect(panel.getByRole('group', { name: 'Nhiệt độ' }).getByRole('button', { name: '25 °C' })).toHaveAttribute('aria-pressed', 'true');

    const feeText = (await panel.getByTestId('breeding-fee').textContent()) ?? '';
    const fee = Number(/(\d+)\s*Xu/.exec(feeText)![1]);
    expect(fee, 'spark costs 3 Xu').toBe(3);

    const started = page.waitForResponse((r) => r.url().endsWith('/api/breeding') && r.request().method() === 'POST');
    await panel.getByRole('button', { name: 'Bắt đầu' }).click();
    expect((await started).status()).toBe(201);
    await expect(panel).toHaveCount(0);
    await expect(coins).toHaveText(`${200 - fee} Xu`);

    // BREEDING_TIME_SCALE=0: the session is ready at once; the button enables on the next 1 s tick.
    await page.getByRole('region', { name: 'Máy đang chạy' }).getByRole('button', { name: 'Thu hoạch' }).click();

    const result = page.getByRole('dialog', { name: 'Kết quả' });
    await expect(result.getByText('Khám phá mới!')).toBeVisible();
    await expect(result.getByText('Người khám phá đầu tiên!')).toBeVisible();
    await expect(result.getByTestId('product')).toHaveCount(1);
    await expect(result.getByTestId('product')).toContainText('×2');
    await result.getByRole('button', { name: 'Đóng' }).click();
    await expect(result).toHaveCount(0);

    // Breed, collect, make water, first discovery: 4 of 19 quests done; the water quest leaves the list.
    await expect(quests.getByLabel('Đã xong')).toHaveText('4/19');
    await expect(quests.getByTestId('quest-make-water')).toHaveCount(0);

    // discover-3 is checked through the API: the panel lists only the first 3 pending quests, and the new
    // expedition and extractor quests now come before it.
    const qs = (await (await page.request.get('/api/quests')).json()) as { quests: { id: string; progress: number; done: boolean }[] };
    expect(qs.quests).toHaveLength(19);
    expect(qs.quests.find((q) => q.id === 'discover-3')).toMatchObject({ progress: 1, done: false });

    // Sell 1 H2O at the floor price from the market.
    const economy = (await (await page.request.get('/api/economy')).json()) as { floorPrices: Record<string, number> };
    const floor = economy.floorPrices.h2o!;
    expect(floor, 'h2o floor price from /api/economy').toBeGreaterThanOrEqual(1);
    await page.getByRole('banner').getByRole('button', { name: 'Chợ' }).click();
    const market = page.getByRole('dialog', { name: 'Chợ' });
    await expect(market).toBeVisible();
    await market.getByTestId('sell-h2o').click();
    await expect(market.getByText(/Đã bán 1 .*: \+\d+ Xu/)).toBeVisible();
    await expect(coins).toHaveText(`${200 - fee + floor} Xu`);
    await market.getByRole('button', { name: 'Đóng' }).click();
    await expect(market).toHaveCount(0);
    await expect(quests.getByLabel('Đã xong')).toHaveText('5/19');

    await page.getByRole('banner').getByRole('button', { name: 'Codex' }).click();
    await expect(waterCard()).toBeVisible();
    await expect(waterCard()).toContainText('H₂O');
    await expect(waterCard()).toContainText('×1'); // 2 made, 1 sold
  });

  test('reload keeps the session and the H2O codex entry', async () => {
    await page.reload();
    await expect(page.getByRole('banner').getByText(user.displayName)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Đăng nhập' })).toHaveCount(0);
    await page.getByRole('banner').getByRole('button', { name: 'Codex' }).click();
    await expect(waterCard()).toBeVisible();
    await expect(waterCard()).toContainText('×1'); // 2 made, 1 sold
    await expect(waterCard()).toContainText(`Khám phá bởi ${user.displayName}`);
  });

  test('send H2 to Bãi cát, collect SiO2, sell it, quest done, buy the air permit', async () => {
    test.setTimeout(120_000);
    const quests = page.getByRole('region', { name: 'Nhiệm vụ' });
    const coins = page.getByRole('banner').getByLabel('Số Xu');
    const balance = async () => Number(/\d+/.exec((await coins.textContent()) ?? '')![0]);
    const before = await balance();

    // The previous test left the Codex open.
    await codexPanel().getByRole('button', { name: 'Đóng' }).click();
    await expect(codexPanel()).toHaveCount(0);
    await page.getByRole('banner').getByRole('button', { name: 'Khai thác' }).click();
    const dock = page.getByRole('dialog', { name: 'Bến khai thác' });
    await expect(dock).toBeVisible();
    const sand = dock.getByTestId('place').filter({ hasText: 'Bãi cát' });
    await sand.getByRole('button', { name: 'Gửi quái' }).click();
    const pick = sand.getByTestId('pick-h2');
    await expect(pick.locator('img')).toHaveJSProperty('complete', true);
    expect(await pick.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    const sent = page.waitForResponse((r) => r.url().endsWith('/api/expeditions') && r.request().method() === 'POST');
    await pick.click();
    expect((await sent).status()).toBe(201);
    await expect(coins).toHaveText(`${before} Xu`); // fee 0

    // EXPEDITION_TIME_SCALE makes the trip ready in about 1.2 s; "Nhận" shows on the next 1 s tick.
    const collected = page.waitForResponse((r) => /\/api\/expeditions\/[^/]+\/collect$/.test(r.url()) && r.request().method() === 'POST');
    await dock.getByTestId('trip').getByRole('button', { name: 'Nhận' }).click();
    expect((await collected).status()).toBe(200);
    await expect(dock.getByTestId('trip')).toHaveCount(0);
    await dock.getByRole('button', { name: 'Đóng' }).click();
    await expect(dock).toHaveCount(0);
    await expect(quests.getByLabel('Đã xong')).toHaveText('6/19');
    await expect(quests.getByTestId('quest-expedition-first')).toHaveCount(0);

    // SiO2 is now known: the Codex shows it (not "???") and the market sells it.
    const economy = (await (await page.request.get('/api/economy')).json()) as { floorPrices: Record<string, number> };
    const floor = economy.floorPrices.sio2!;
    await page.getByRole('banner').getByRole('button', { name: 'Chợ' }).click();
    const market = page.getByRole('dialog', { name: 'Chợ' });
    await market.getByTestId('sell-sio2').click();
    await expect(market.getByText(/Đã bán 1 .*: \+\d+ Xu/)).toBeVisible();
    await expect(coins).toHaveText(`${before + floor} Xu`);
    await market.getByRole('button', { name: 'Đóng' }).click();
    await expect(market).toHaveCount(0);

    await page.getByRole('banner').getByRole('button', { name: 'Codex' }).click();
    const codex = codexPanel();
    const sioName = (await (await page.request.get('/api/catalog')).json() as { chemicals: { id: string; name: string }[] })
      .chemicals.find((c) => c.id === 'sio2')!.name;
    const sioCard = codex.locator('div').filter({ has: page.getByText(sioName, { exact: true }) }).last();
    await expect(sioCard).toBeVisible();
    await expect(sioCard).not.toContainText('???');
    await expect(sioCard).toContainText('SiO₂');
    await expect(sioCard).toContainText('×3'); // 4 collected, 1 sold
    await codex.getByRole('button', { name: 'Đóng' }).click();
    await expect(codex).toHaveCount(0);

    // Air permit costs 60 Xu.
    const air = (await (await page.request.get('/api/expeditions')).json()) as { places: { id: string; permitPrice: number }[] };
    const price = air.places.find((p) => p.id === 'air')!.permitPrice;
    expect(price).toBe(60);
    const start = await balance();
    await page.getByRole('banner').getByRole('button', { name: 'Khai thác' }).click();
    await expect(dock).toBeVisible();
    const tower = dock.getByTestId('place').filter({ hasText: 'Tháp tách khí' });
    await tower.getByRole('button', { name: `Mua giấy phép · ${price} Xu` }).click();
    await expect(tower.getByRole('button', { name: 'Gửi quái' })).toBeVisible();
    await expect(coins).toHaveText(`${start - price} Xu`);
  });
});

// A fresh player of its own: the serial player above has sold and spent Xu, so its balance is not 200.
test('deliver a market order: Giao pays 15 Xu, the stall cools down', async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `ord-${suffix}@example.com`, displayName: `ord_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  await page.goto('/');
  const coins = page.getByRole('banner').getByLabel('Số Xu');
  await expect(coins).toHaveText('200 Xu');

  await page.getByRole('banner').getByRole('button', { name: 'Chợ' }).click();
  const market = page.getByRole('dialog', { name: 'Chợ' });
  await market.getByRole('tab', { name: 'Đơn hàng' }).click();
  const orders = market.getByRole('region', { name: 'Đơn hàng' });
  const food = orders.getByRole('group', { name: 'Phố ẩm thực' });
  await expect(food).toContainText('Xưởng bánh snack');
  await expect(food).toContainText('Cần 3 N₂');
  await expect(food).toContainText('+15 Xu');
  await expect(orders.getByRole('group', { name: 'Khu nhà máy' })).toContainText('Chưa có đơn. Khám phá thêm chất nhé.');

  await food.getByRole('button', { name: 'Giao' }).click();
  await expect(market.getByRole('status')).toHaveText('Đã giao 3 N₂ cho Xưởng bánh snack: +15 Xu');
  await expect(coins).toHaveText('215 Xu');
  await expect(food).toContainText('Đơn mới sau 30 phút');
  await expect(food.getByRole('button', { name: 'Giao' })).toHaveCount(0);

  const qs = (await (await page.request.get('/api/quests')).json()) as { quests: { id: string; done: boolean }[] };
  expect(qs.quests.find((q) => q.id === 'deliver-first')).toMatchObject({ done: true });

  await page.screenshot({ path: `${OUT}market-orders.png` });
});

// A fresh player of its own: needs the exact 200 Xu starter balance.
test('craft a can: extract 2 Al, craft, collect, sell for 5 Xu, buy the Bình chữa cháy blueprint', async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `wk-${suffix}@example.com`, displayName: `wk_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  await page.goto('/');
  const coins = page.getByRole('banner').getByLabel('Số Xu');
  await expect(coins).toHaveText('200 Xu');

  // EXTRACTOR_COOLDOWN_SCALE=0: two claims in a row. Al comes only from the extractor.
  const extractor = page.getByTestId('extractor');
  await extractor.getByLabel('Nguyên tố').selectOption('al');
  for (let n = 1; n <= 2; n++) {
    const claimed = page.waitForResponse((r) => r.url().includes('/api/extractor') && r.request().method() === 'POST');
    await extractor.getByRole('button', { name: 'Nhận', exact: true }).click();
    expect((await claimed).status()).toBeLessThan(300);
    await expect.poll(async () => {
      const me = (await (await page.request.get('/api/me')).json()) as { inventory: { chemicalId: string; count: number }[] };
      return me.inventory.find((i) => i.chemicalId === 'al')?.count ?? 0;
    }).toBe(n);
  }

  await page.getByRole('banner').getByRole('button', { name: 'Xưởng', exact: true }).click();
  const shop = page.getByRole('dialog', { name: 'Xưởng chế tạo' });
  await expect(shop).toBeVisible();
  const can = shop.getByRole('group', { name: 'Lon nhôm' });
  await expect(can).toContainText('Giá sàn: 5 Xu');
  await can.getByRole('button', { name: 'Chế tạo' }).click();
  // WORKSHOP_TIME_SCALE=0.002: ready in ~0.24 s; "Nhận" shows on the next 1 s tick.
  await shop.getByTestId('job').getByRole('button', { name: 'Nhận' }).click();
  await expect(shop.getByTestId('job-result')).toContainText('Nhận về: 1 Lon nhôm');

  const extinguisher = shop.getByRole('group', { name: 'Bình chữa cháy' });
  await extinguisher.getByRole('button', { name: 'Mua bản vẽ (30 Xu)' }).click();
  await expect(coins).toHaveText('170 Xu');
  await expect(extinguisher.getByRole('button', { name: 'Chế tạo' })).toBeVisible();
  await page.screenshot({ path: `${OUT}workshop.png` });
  await shop.getByRole('button', { name: 'Đóng' }).click();
  await expect(shop).toHaveCount(0);

  await page.getByRole('banner').getByRole('button', { name: 'Chợ' }).click();
  const market = page.getByRole('dialog', { name: 'Chợ' });
  await market.getByTestId('sell-can').click();
  await expect(market.getByText(/Đã bán 1 .*: \+5 Xu/)).toBeVisible();
  await expect(coins).toHaveText('175 Xu');

  const qs = (await (await page.request.get('/api/quests')).json()) as { quests: { id: string; done: boolean }[] };
  expect(qs.quests.find((q) => q.id === 'craft-first')).toMatchObject({ done: true });
  expect(qs.quests.find((q) => q.id === 'blueprint-first')).toMatchObject({ done: true });
});

// A fresh player of its own: needs the exact 200 Xu starter balance.
test('buy the furnace: Lò cao unlocks the 1000 °C breeding option', async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `lab-${suffix}@example.com`, displayName: `lab_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  await page.goto('/');
  const coins = page.getByRole('banner').getByLabel('Số Xu');
  await expect(coins).toHaveText('200 Xu');

  const header = page.getByRole('banner');
  await header.getByRole('button', { name: 'Lai tạo' }).click();
  const breeding = page.getByRole('dialog', { name: 'Phòng lai tạo' });
  const hot = () => breeding.getByRole('group', { name: 'Nhiệt độ' }).getByRole('button', { name: /1000 °C/ });
  await expect(hot()).toBeDisabled();
  await expect(hot()).toContainText('Cần Lò cao');
  await expect(hot()).toContainText('🔒');
  await expect(breeding.getByText('Mở thêm điều kiện ở Phòng thí nghiệm.')).toBeVisible();
  await breeding.getByRole('button', { name: 'Đóng' }).click();
  await expect(breeding).toHaveCount(0);

  await header.getByRole('button', { name: 'Thí nghiệm' }).click();
  const labs = page.getByRole('dialog', { name: 'Phòng thí nghiệm' });
  await expect(labs).toBeVisible();
  const item = (name: string) => labs.getByTestId('lab-item').filter({ hasText: name });
  await item('Lò cao').getByRole('button', { name: 'Mua (150 Xu)' }).click();
  await expect(coins).toHaveText('50 Xu');
  await expect(item('Lò cao')).toContainText('Đã có');
  await expect(item('Buồng điện phân')).toContainText('Chưa dùng được');
  await page.screenshot({ path: `${OUT}labs.png` });
  await labs.getByRole('button', { name: 'Đóng' }).click();
  await expect(labs).toHaveCount(0);

  await header.getByRole('button', { name: 'Lai tạo' }).click();
  await expect(hot()).toBeEnabled();
  await expect(hot()).not.toContainText('Cần Lò cao');

  const qs = (await (await page.request.get('/api/quests')).json()) as { quests: { id: string; done: boolean }[] };
  expect(qs.quests.find((q) => q.id === 'lab-first')).toMatchObject({ done: true });
});
