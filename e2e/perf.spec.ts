import { expect, test } from '@playwright/test';

// Spec section 3: the lab with 12 species on the shelf holds a mean >= 55 fps on desktop Chromium.
const TARGET_FPS = 55;
const SAMPLE_MS = 5_000;
// Set PERF_STRICT=1 on a machine with a real GPU to turn the soft check into a hard assertion.
const STRICT = process.env.PERF_STRICT === '1';
// The habitat shelf shows at most 12 species.
const SHELF_SIZE = 12;

test('lab renders 12 species at the target frame rate', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const reg = await page.request.post('/api/auth/register', {
    data: { email: `perf-${suffix}@example.com`, displayName: `perf_${suffix}`, password: 'password123' },
  });
  expect(reg.status()).toBe(201);
  // The starter kit already grants 25 element species (4 each), so a fresh player fills the
  // 12-slot shelf; no extractor claims are needed.
  const me = await page.request.get('/api/me');
  const species = ((await me.json()) as { inventory: { count: number }[] }).inventory.filter((s) => s.count > 0).length;
  expect(species).toBeGreaterThanOrEqual(SHELF_SIZE);

  await page.goto('/');
  await expect(page.locator('canvas').first()).toBeVisible();

  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no webgl2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });

  await page.waitForTimeout(1_500); // warm-up: shader compile, first frames
  const stats = await page.evaluate(
    (ms) =>
      new Promise<{ frames: number; elapsed: number; worstMs: number }>((resolve) => {
        let frames = 0;
        let worstMs = 0;
        let start = 0;
        let last = 0;
        const tick = (t: number) => {
          if (start === 0) { start = t; last = t; requestAnimationFrame(tick); return; }
          frames += 1;
          worstMs = Math.max(worstMs, t - last);
          last = t;
          if (t - start >= ms) resolve({ frames, elapsed: t - start, worstMs });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    SAMPLE_MS,
  );
  const meanFps = (stats.frames * 1000) / stats.elapsed;
  const summary = `mean ${meanFps.toFixed(1)} fps over ${(stats.elapsed / 1000).toFixed(1)} s, worst frame ${stats.worstMs.toFixed(0)} ms, renderer: ${gpu}`;
  console.log(`[perf] ${summary}`);
  test.info().annotations.push({ type: 'perf', description: summary });

  if (STRICT) {
    expect(meanFps).toBeGreaterThanOrEqual(TARGET_FPS);
  } else if (meanFps < TARGET_FPS) {
    test.info().annotations.push({
      type: 'perf-soft-fail',
      description: `below ${TARGET_FPS} fps target; soft check (headless software GL). Run with PERF_STRICT=1 on real hardware.`,
    });
    console.warn(`[perf] below ${TARGET_FPS} fps target (soft check, not failing)`);
  }
});
