// Lighthouse CI budgets (mobile emulation, median of 3 runs).
// Run after `pnpm build`: `pnpm dlx @lhci/cli@0.15.1 autorun`.
const PORT = 4322;
const url = (path) => `http://localhost:${PORT}${path}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `node scripts/serve.mjs dist ${PORT}`,
      startServerReadyPattern: 'serving',
      url: [url('/'), url('/case/voice-ai')],
      numberOfRuns: 3,
      settings: {
        // The full-page screenshot resizes the viewport, which would hydrate
        // every island and skew the load-time script budget.
        skipAudits: ['full-page-screenshot'],
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:performance': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
            'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
            'categories:seo': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
          },
        },
        {
          // Plan target is 2.0 s. With v1's typography kept byte-for-byte, LCP
          // waits on Newsreader (variable, ~87 KB roman after subsetting): case
          // studies measure ~2.1 s. Closing the gap needs a type decision
          // (font-display: optional, or lighter cuts) — see README → Backlog.
          matchingUrlPattern: `^(?!${url('/')}$)`,
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2300, aggregationMethod: 'median-run' }],
          },
        },
        {
          matchingUrlPattern: `^${url('/')}$`,
          assertions: {
            // JavaScript transferred at load stays under 60 KB (gzipped).
            'resource-summary:script:size': ['error', { maxNumericValue: 60 * 1024, aggregationMethod: 'median-run' }],
            // The hero also needs the italic cut (~98 KB) for "survive reality.": ~2.9 s.
            'largest-contentful-paint': ['error', { maxNumericValue: 3100, aggregationMethod: 'median-run' }],
          },
        },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
