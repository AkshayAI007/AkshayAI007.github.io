import { expect, test } from '@playwright/test';
import { LEGACY_LINKS, ROUTES } from './routes.mjs';

const ORIGIN = 'http://localhost:4321';

for (const route of ROUTES) {
  test.describe(route.name, () => {
    test('returns 200, renders its h1, logs no errors, calls nothing third-party', async ({ page }) => {
      const errors: string[] = [];
      const external: string[] = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) external.push(r.url()); });

      const res = await page.goto(route.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(route.h1);

      // walk the page so lazy images load and islands hydrate
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 600) await page.evaluate((t) => window.scrollTo(0, t), y);
      await page.waitForLoadState('networkidle');

      expect(errors, 'console errors').toEqual([]);
      expect(external, 'requests to other origins').toEqual([]);
    });

    test('has unique, complete metadata', async ({ page, request }) => {
      await page.goto(route.path);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      const og = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(title.length).toBeGreaterThan(10);
      expect(description?.length ?? 0).toBeGreaterThan(50);
      expect(canonical).toBe(new URL(route.path, 'https://akshayai007.github.io').href);
      const ogRes = await request.get(new URL(og!).pathname);
      expect(ogRes.status()).toBe(200);
      expect(ogRes.headers()['content-type']).toContain('image/png');
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.length).toBe(1);
      expect(() => JSON.parse(ld[0]!)).not.toThrow();
    });
  });
}

test('titles and descriptions are unique across routes', async ({ page }) => {
  const seen = { title: new Set<string>(), description: new Set<string>() };
  for (const route of ROUTES) {
    await page.goto(route.path);
    seen.title.add(await page.title());
    seen.description.add((await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
  }
  expect(seen.title.size).toBe(ROUTES.length);
  expect(seen.description.size).toBe(ROUTES.length);
});

test.describe('legacy links land on the right page', () => {
  for (const link of LEGACY_LINKS) {
    test(link.from, async ({ page }) => {
      await page.goto(link.from);
      await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).hash).toBe(link.to);
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }
});

test('a legacy anchor link scrolls to its section', async ({ page }) => {
  await page.goto('/#/projects');
  await expect.poll(() => page.evaluate(() => document.getElementById('projects')!.getBoundingClientRect().top)).toBeLessThan(160);
});

test('unknown paths get the 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('This page took a different route.');
});

test('feeds and crawl files are served', async ({ request }) => {
  for (const path of ['/rss.xml', '/sitemap-index.xml', '/robots.txt', '/favicon.svg', '/Akshay_Bawaliwale_Resume.pdf']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const route of ROUTES) expect(sitemap).toContain(`<loc>${new URL(route.path, 'https://akshayai007.github.io').href}</loc>`);
});
