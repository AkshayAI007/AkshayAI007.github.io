// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import subsetFonts from './integrations/subset-fonts.mjs';

// One place to change if the site moves to a custom domain: canonical URLs,
// the sitemap, RSS and Open Graph images all derive from `site`.
const SITE = 'https://akshayai007.github.io';

/** Registers `client:ask` — see src/directives/ask.ts. @type {import('astro').AstroIntegration} */
const askDirective = {
  name: 'ask-directive',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'ask', entrypoint: './src/directives/ask.ts' });
    },
  },
};

export default defineConfig({
  site: SITE,
  // `file` emits about.html, case/voice-ai.html… GitHub Pages serves them at
  // /about and /case/voice-ai (no redirect hop), and the v1 deep-dive URLs
  // /projects/<slug>.html keep resolving to the very same files.
  build: { format: 'file', inlineStylesheets: 'always' },
  trailingSlash: 'never',
  integrations: [
    askDirective,
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.endsWith('/404'),
    }),
    subsetFonts(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
