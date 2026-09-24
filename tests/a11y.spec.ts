import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes.mjs';

// Zero serious or critical axe violations on every route, in both themes.
for (const theme of ['dark', 'light'] as const) {
  for (const route of ROUTES) {
    test(`${route.name} (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((t) => localStorage.setItem('ab-theme', t), theme);
      await page.goto(route.path);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 600) await page.evaluate((t) => window.scrollTo(0, t), y);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForLoadState('networkidle');

      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`),
      ).toEqual([]);
    });
  }
}
