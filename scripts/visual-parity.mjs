// Visual parity: screenshots two builds of the site under identical,
// deterministic conditions and reports the pixel difference for every
// route × width × theme. Used for the Astro migration (baseline = the v1
// static site at the v1-static tag) and, after cutover, as the visual
// regression gate (baseline = main).
//
//   node scripts/visual-parity.mjs --base http://localhost:4400 --base-kind legacy \
//     --head http://localhost:4401 [--routes home,about] [--widths 390,768,1440] \
//     [--themes dark,light] [--max 0.01] [--out test-results/parity]
//
// Offline mode (PARITY_OFFLINE=1) serves v1's third-party assets locally —
// Unsplash photos from src/assets/images/photos and three.js from
// tests/.cache — for sandboxes without access to those CDNs.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { routeOffline } from '../tests/offline.mjs';
import { ROUTES } from '../tests/routes.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const base = args.base;
const head = args.head;
const baseKind = args['base-kind'] ?? 'astro';
const widths = (args.widths ?? '390,768,1440').split(',').map(Number);
const themes = (args.themes ?? 'dark,light').split(',');
const only = args.routes?.split(',');
const maxRatio = Number(args.max ?? 0.01);
const out = args.out ?? 'test-results/parity';
const offline = process.env.PARITY_OFFLINE === '1';
if (!base || !head) throw new Error('--base and --head are required');


/** Loads a page and brings it to a settled, deterministic state. */
async function capture(browser, url, width, theme) {
  const height = width <= 390 ? 844 : 900;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  if (offline) await routeOffline(context);
  await context.addInitScript((t) => localStorage.setItem('ab-theme', t), theme);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Walk the page once so observers fire, lazy images load and islands hydrate.
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.round(height * 0.8)) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(
    () =>
      // v1 keeps every page in one document: images on hidden pages never load.
      [...document.images].every((i) => i.complete || i.getClientRects().length === 0) &&
      document.querySelectorAll('astro-island[ssr]:not([client="ask"])').length === 0,
    null,
    { timeout: 20_000 },
  );
  // Transition delays survive reduced motion (only durations are zeroed): let them land.
  await page.waitForTimeout(3000);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  await context.close();
  return PNG.sync.read(png);
}

function diff(a, b) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img) => {
    if (img.width === width && img.height === height) return img;
    const p = new PNG({ width, height });
    p.data.fill(255);
    PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
    return p;
  };
  const [pa, pb] = [pad(a), pad(b)];
  const out = new PNG({ width, height });
  const n = pixelmatch(pa.data, pb.data, out.data, width, height, { threshold: 0.1, includeAA: false });
  return { ratio: n / (width * height), image: out, sizes: `${a.width}×${a.height} vs ${b.width}×${b.height}` };
}

const browser = await chromium.launch();
await mkdir(out, { recursive: true });
const rows = [];
for (const route of ROUTES.filter((r) => !only || only.includes(r.name))) {
  for (const width of widths) {
    for (const theme of themes) {
      const baseUrl = base + (baseKind === 'legacy' ? route.legacy : route.path);
      const id = `${route.name}-${width}-${theme}`;
      let a, b;
      try {
        [a, b] = await Promise.all([capture(browser, baseUrl, width, theme), capture(browser, head + route.path, width, theme)]);
      } catch (err) {
        rows.push({ id, diff: 'error', sizes: String(err.message).split('\n')[0], pass: false });
        console.log(`FAIL ${id.padEnd(40)} capture error: ${String(err.message).split('\n')[0]}`);
        continue;
      }
      const d = diff(a, b);
      const pass = d.ratio <= maxRatio;
      if (!pass || args.keep) {
        await writeFile(join(out, `${id}.base.png`), PNG.sync.write(a));
        await writeFile(join(out, `${id}.head.png`), PNG.sync.write(b));
        await writeFile(join(out, `${id}.diff.png`), PNG.sync.write(d.image));
      }
      rows.push({ id, diff: `${(d.ratio * 100).toFixed(3)}%`, sizes: d.sizes, pass });
      console.log(`${pass ? 'ok  ' : 'FAIL'} ${id.padEnd(40)} ${(d.ratio * 100).toFixed(3).padStart(7)}%  ${d.sizes}`);
    }
  }
}
await browser.close();

const failed = rows.filter((r) => !r.pass);
const summary = [
  `### Visual parity — ${rows.length - failed.length}/${rows.length} within ${(maxRatio * 100).toFixed(1)}%`,
  '',
  '| Page · width · theme | Pixel diff | Sizes | |',
  '| --- | ---: | --- | --- |',
  ...rows.map((r) => `| ${r.id} | ${r.diff} | ${r.sizes} | ${r.pass ? '✅' : '❌'} |`),
].join('\n');
await writeFile(join(out, 'summary.md'), summary + '\n');
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n', { flag: 'a' });
process.exit(failed.length ? 1 : 0);
