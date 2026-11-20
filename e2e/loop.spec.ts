import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { E2E_WEB_URL } from './env';

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

    const panel = page.getByRole('region', { name: 'Lai tạo' });
    await panel.getByLabel('Chất A').selectOption('h2');
    await panel.getByRole('button', { name: 'Tăng A' }).click();
    await expect(panel.getByLabel('Số lượng A')).toHaveText('2');
    await panel.getByLabel('Chất B').selectOption('o2');
    await expect(panel.getByLabel('Số lượng B')).toHaveText('1');
    const spark = panel.getByRole('group', { name: 'Kích hoạt' }).getByRole('button', { name: 'Tia lửa' });
    await spark.click();
    await expect(spark).toHaveAttribute('aria-pressed', 'true');
    // Approved rule h2_o2_spark needs only activation spark; the other conditions stay at their defaults.
    await expect(panel.getByRole('group', { name: 'Nhiệt độ' }).getByRole('button', { name: '25 °C' })).toHaveAttribute('aria-pressed', 'true');

    const started = page.waitForResponse((r) => r.url().endsWith('/api/breeding') && r.request().method() === 'POST');
    await panel.getByRole('button', { name: 'Bắt đầu' }).click();
    expect((await started).status()).toBe(201);

    // BREEDING_TIME_SCALE=0: the session is ready at once; the button enables on the next 1 s tick.
    await page.getByRole('region', { name: 'Máy đang chạy' }).getByRole('button', { name: 'Thu hoạch' }).click();

    const result = page.getByRole('dialog', { name: 'Kết quả' });
    await expect(result.getByText('Khám phá mới!')).toBeVisible();
    await expect(result.getByText('Người khám phá đầu tiên!')).toBeVisible();
    await expect(result.getByTestId('product')).toHaveCount(1);
    await expect(result.getByTestId('product')).toContainText('×2');
    await result.getByRole('button', { name: 'Đóng' }).click();
    await expect(result).toHaveCount(0);

    await page.getByRole('banner').getByRole('button', { name: 'Codex' }).click();
    await expect(waterCard()).toBeVisible();
    await expect(waterCard()).toContainText('H₂O');
    await expect(waterCard()).toContainText('×2');
  });

  test('reload keeps the session and the H2O codex entry', async () => {
    await page.reload();
    await expect(page.getByRole('banner').getByText(user.displayName)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Đăng nhập' })).toHaveCount(0);
    await page.getByRole('banner').getByRole('button', { name: 'Codex' }).click();
    await expect(waterCard()).toBeVisible();
    await expect(waterCard()).toContainText('×2');
    await expect(waterCard()).toContainText(`Khám phá bởi ${user.displayName}`);
  });
});
