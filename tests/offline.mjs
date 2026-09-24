// Offline stand-ins for v1's third-party assets, for sandboxes whose egress
// policy blocks those CDNs (enable with PARITY_OFFLINE=1; CI doesn't need it):
//   images.unsplash.com  → the same photos from src/assets/images/photos
//   cdn.jsdelivr.net     → three@0.170.0 from tests/.cache (npm pack)
//   fonts.google*        → fetched by Node, which trusts the sandbox proxy
import { readFile } from 'node:fs/promises';

const PHOTO_IDS = {
  '1543722530-d2c3201371e7': 'hero-ambient',
  '1628595351029-c2bf17511435': 'dna-helix',
  '1489599849927-2ee91cede3ba': 'cinema',
  '1516035069371-29a1b244cc32': 'camera-lenses',
  '1449824913935-59a10b8d2000': 'yellow-cabs',
  '1518770660439-4636190af475': 'circuit-board',
  '1558494949-ef010cbdcc31': 'server-racks',
  '1451187580459-43490279c0fa': 'earth-at-night',
};

const encoded = new Map();

export async function routeOffline(context) {
  const sharp = (await import('sharp')).default;
  await context.route('https://images.unsplash.com/**', async (route) => {
    const u = new URL(route.request().url());
    const name = PHOTO_IDS[u.pathname.replace('/photo-', '')];
    if (!name) return route.abort();
    const w = Number(u.searchParams.get('w') ?? 1400);
    const key = `${name}@${w}`;
    // WebP, not AVIF: encoding has to keep up with page loads. Memoised per size.
    if (!encoded.has(key)) {
      encoded.set(key, sharp(`src/assets/images/photos/${name}.jpg`).resize({ width: w, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer());
    }
    await route.fulfill({ body: await encoded.get(key), contentType: 'image/webp', headers: { 'access-control-allow-origin': '*' } });
  });
  await context.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js', async (route) =>
    route.fulfill({
      body: await readFile('tests/.cache/three-0.170.0.module.min.js'),
      contentType: 'text/javascript',
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    const req = route.request();
    const res = await fetch(req.url(), { headers: { 'user-agent': (await req.headerValue('user-agent')) ?? '' } });
    const headers = Object.fromEntries([...res.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
    await route.fulfill({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
  });
}
