// Static file server with GitHub Pages' URL resolution, for tests and local
// previews of a built site (or of the v1 tree):
//   /            → index.html
//   /about       → about.html        (extensionless .html, served with 200)
//   /dir         → 301 /dir/         (directory without a trailing slash)
//   anything else missing → 404.html with status 404
// Text responses are gzipped when the client accepts it, as Pages does, so
// Lighthouse sees realistic transfer sizes.
//
//   node scripts/serve.mjs [dir=dist] [port=4321]
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
};

const isFile = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false;
const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false;

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg']);
const gzipped = new Map();

async function send(req, res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-cache' };
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    if (!gzipped.has(file)) gzipped.set(file, gzipSync(await readFile(file)));
    res.writeHead(status, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding' }).end(gzipped.get(file));
    return;
  }
  res.writeHead(status, headers);
  createReadStream(file).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const target = normalize(join(root, path));
  if (!target.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (path.endsWith('/')) {
    if (await isFile(join(target, 'index.html'))) return send(req, res, join(target, 'index.html'));
  } else if (await isFile(target)) {
    return send(req, res, target);
  } else if (await isFile(`${target}.html`)) {
    return send(req, res, `${target}.html`);
  } else if (await isDir(target)) {
    res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
    return;
  }
  if (await isFile(join(root, '404.html'))) return send(req, res, join(root, '404.html'), 404);
  res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
