// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeHTML } from 'entities';
import subsetFont from 'subset-font';

/**
 * After the build, subsets the Newsreader woff2 files (the heaviest webfonts,
 * ~130–145 KB each) to the characters the built site actually contains:
 * every character in dist's HTML, JS, CSS and XML, with HTML entities
 * decoded, plus printable ASCII. Glyph outlines, variation axes (wght, opsz)
 * and every OpenType feature are kept, so rendering is unchanged; only glyphs
 * the site never shows are dropped (about a third of each file).
 *
 * Because the set is derived from the output on every build, new content
 * brings its characters with it. Only text injected at runtime could miss a
 * glyph, and would then fall back per character to the next font in the stack.
 *
 * @param {{ match?: RegExp }} [options]
 * @returns {import('astro').AstroIntegration}
 */
export default function subsetFonts({ match = /^newsreader-.*\.woff2$/ } = {}) {
  return {
    name: 'subset-fonts',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await readdir(root, { recursive: true });
        const chars = new Set();
        for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
        for (const file of files.filter((f) => /\.(html|js|css|xml)$/.test(f))) {
          const raw = await readFile(join(root, file), 'utf8');
          for (const ch of file.endsWith('.html') || file.endsWith('.xml') ? decodeHTML(raw) : raw) chars.add(ch);
        }
        const text = [...chars].join('');
        for (const file of files.filter((f) => match.test(f.split('/').pop() ?? ''))) {
          const path = join(root, file);
          const before = await readFile(path);
          const after = await subsetFont(before, text, { targetFormat: 'woff2' });
          if (after.length >= before.length) continue;
          await writeFile(path, after);
          logger.info(`${file}: ${Math.round(before.length / 1024)} KB → ${Math.round(after.length / 1024)} KB`);
        }
      },
    },
  };
}
