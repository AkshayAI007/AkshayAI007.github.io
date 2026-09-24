// Downloads the Unsplash photographs v1 hotlinked, so astro:assets can
// self-host them (AVIF/WebP, responsive srcset). Run once; the results are
// committed under src/assets/images/photos. Re-running is idempotent.
//
//   node scripts/fetch-photos.mjs
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/images/photos');

// name -> Unsplash photo id (the ids v1 used in its srcset URLs)
export const PHOTOS = {
  'hero-ambient': '1543722530-d2c3201371e7',
  'dna-helix': '1628595351029-c2bf17511435',
  'cinema': '1489599849927-2ee91cede3ba',
  'camera-lenses': '1516035069371-29a1b244cc32',
  'yellow-cabs': '1449824913935-59a10b8d2000',
  'circuit-board': '1518770660439-4636190af475',
  'server-racks': '1558494949-ef010cbdcc31',
  'earth-at-night': '1451187580459-43490279c0fa',
};

// 1920 is the widest variant v1 ever requested; q=90 leaves headroom for re-encoding.
const url = (id) => `https://images.unsplash.com/photo-${id}?fm=jpg&q=90&w=1920&fit=max`;

await mkdir(outDir, { recursive: true });
for (const [name, id] of Object.entries(PHOTOS)) {
  const file = join(outDir, `${name}.jpg`);
  if (await stat(file).then(() => true, () => false)) {
    console.log(`skip ${name}`);
    continue;
  }
  const res = await fetch(url(id));
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log(`saved ${name}.jpg`);
}
