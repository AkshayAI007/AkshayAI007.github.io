// Reduces a folder of Lighthouse JSON reports (<label>.<formFactor>.<run>.json)
// to one median row per page and form factor.
//
//   node scripts/lighthouse-summary.mjs <reportDir> <out.json>
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [dir, out] = process.argv.slice(2);
const groups = new Map();
for (const f of (await readdir(dir)).filter((n) => n.endsWith('.json'))) {
  const [label, formFactor] = f.split('.');
  const lhr = JSON.parse(await readFile(join(dir, f), 'utf8'));
  const a = lhr.audits;
  const script = a['resource-summary']?.details?.items?.find((i) => i.resourceType === 'script');
  const row = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
    fcpMs: Math.round(a['first-contentful-paint'].numericValue),
    lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
    tbtMs: Math.round(a['total-blocking-time'].numericValue),
    cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
    totalKb: Math.round(a['total-byte-weight'].numericValue / 1024),
    scriptKb: script ? Math.round(script.transferSize / 1024) : 0,
  };
  const key = `${label}|${formFactor}`;
  if (!groups.has(key)) groups.set(key, { url: lhr.finalDisplayedUrl, label, formFactor, runs: [] });
  groups.get(key).runs.push(row);
}
const median = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
const pages = [...groups.values()].map((g) => ({
  ...g,
  median: Object.fromEntries(Object.keys(g.runs[0]).map((k) => [k, median(g.runs.map((r) => r[k]))])),
}));
await writeFile(out, JSON.stringify({ recordedAt: new Date().toISOString(), pages }, null, 2) + '\n');
console.table(pages.map((p) => ({ page: p.label, form: p.formFactor, ...p.median })));
