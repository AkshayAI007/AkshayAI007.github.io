# Akshay Bawaliwale — Portfolio

Source for [akshayai007.github.io](https://akshayai007.github.io): Astro 5 (static output),
TypeScript (strict), React 19 islands, Tailwind CSS v4, MDX content collections. Every page is
pre-rendered HTML; JavaScript loads only for the interactive islands, and only when they are
needed.

The site was migrated from a single hand-written `index.html` with hash routes. The v1 source is
preserved at the [`v1-static`](https://github.com/AkshayAI007/AkshayAI007.github.io/tree/v1-static)
tag, and every page of the new build is checked pixel-for-pixel against it.

## Commands

Node 22 and pnpm 10 (`corepack enable`).

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Type-safe production build into `dist/` |
| `pnpm preview` | Serve `dist/` with GitHub Pages' URL rules (`/about` → `about.html`, 404 page) |
| `pnpm check` | `astro check`: TypeScript + content schemas |
| `pnpm test` | Playwright: routes, legacy links, metadata, axe, behaviour, console, third-party requests |
| `pnpm test:lighthouse` | Lighthouse CI with the performance/SEO/a11y/JS budgets |
| `pnpm parity -- --base <url> --head <url>` | Visual diff of two builds (see below) |

## Structure

```
src/
  pages/        index, about, writing, reach, resume, 404,
                case/[slug], projects/[slug], og/[slug].png, rss.xml, robots.txt
  layouts/      Base (head, SEO, JSON-LD) → Page (site chrome) → CaseStudy;  Project
  components/   Header, MobileMenu, ThemeToggle, Photo, LegacyHashRedirect,
                home/*  (hero, sections), case/*  (ProofMetric, ArchitectureFlow,
                DecisionList, Ledger, Story), project/*  (Bench, Column, figures)
  islands/      ImpactDeck, StackMarquee, ProjectOrbit, AskAkshay   (React)
  content/      cases/*.mdx, projects/*.mdx, writing/*.md   (schemas: content.config.ts)
  lib/          motion.ts (reveals, count-ups, progress, parallax), anchors.ts,
                aurora.ts (hero WebGL), seo.ts, og.tsx, content.ts, site.ts
  directives/   ask.ts — `client:ask`, hydrate-on-intent for the chat
integrations/   subset-fonts.mjs — trims Newsreader to the characters the build uses
  styles/       tokens.css, theme.css (Tailwind @theme), global.css → site/*,
                project.css, fonts*.css (generated)
  assets/       photographs + portrait, optimised at build (AVIF/WebP, srcset)
public/         resume PDF, favicon
scripts/        serve.mjs, visual-parity.mjs, gen-font-faces.mjs, fetch-photos.mjs
tests/          Playwright specs, route table, offline stand-ins for parity runs
```

## Content

Case studies, projects and writing are content collections validated by Zod
(`src/content.config.ts`): a missing field or a typo in front matter fails `pnpm check` and the
build.

- **Case study** — `src/content/cases/<slug>.mdx` → `/case/<slug>`. Front matter holds the
  structured parts (proof metric and its instrument, spec, architecture stages, decisions,
  outcome ledger, next case); the MDX body holds the prose as `<Story kicker title>` blocks.
- **Project** — `src/content/projects/<slug>.mdx` → `/projects/<slug>`, plus its card in the
  home-page orbit (`orbit:`). Benchmarks are ranked bars from data (`bench.bars`) or a bespoke
  figure from `src/components/project`. Prose goes in `<Column kicker title>` blocks.
- **Writing** — `src/content/writing/<slug>.md`. Posts link out (LinkedIn) for now; `feature:`
  puts one on the home page. The RSS feed is built from this collection.

Every route gets a generated Open Graph image (`/og/<slug>.png`, Satori), a canonical URL,
JSON-LD, and a sitemap entry. The site URL lives in one place, `astro.config.mjs` → `site`.

## Design system

`src/styles/tokens.css` is the single source of colour, type, rhythm and motion tokens (dark by
default, `data-theme="light"` on `<html>`, persisted under `ab-theme`). Tailwind utilities map
onto the same tokens (`bg-ground`, `text-ink-2`, `font-serif`, `ease-spring` — see
`styles/theme.css`); Preflight is off because the site ships its own base layer.

The component styles under `styles/site/` are v1's stylesheet ported verbatim, split at its
section markers and imported in the original order so the cascade is unchanged. Refactoring
them into Tailwind utilities is safe now that the visual gate exists: change, then run parity.

Fonts are self-hosted from Fontsource. `scripts/gen-font-faces.mjs` writes `@font-face` rules
that mirror Google Fonts' descriptors exactly, pointing at Fontsource files verified
byte-identical to what Google served v1. After each build, `integrations/subset-fonts.mjs`
trims the Newsreader files to the characters present in `dist/` (outlines, axes and OpenType
features kept), which cuts them by about a third with no change in rendering.

## Quality gates (CI)

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

| Check | Tool | Threshold |
| --- | --- | --- |
| Types + content schemas | `astro check` | 0 errors |
| Build | `astro build` | succeeds, no warnings |
| Routes | Playwright | all routes 200 + their H1; legacy `#/` links land right; 404 works |
| Visual regression | `scripts/visual-parity.mjs` | ≤ 1% pixel diff vs the base branch, 390/768/1440 × dark/light |
| Accessibility | axe-core | 0 serious/critical, both themes |
| Performance | Lighthouse CI (mobile) | Perf ≥ 95, SEO 100, A11y ≥ 95, LCP < 2 s, home JS < 60 KB gz |
| Links | lychee | no broken internal or external links |
| Console / network | Playwright | no errors; no third-party requests |

The visual job builds the PR's base branch next to the PR and compares them in the same
runner, so no screenshots are stored in git. An intentional visual change is approved by
adding the `visual-change` label to the PR. Make these checks required in branch protection
so a failure blocks the merge.

## Deploy and rollback

`.github/workflows/deploy.yml` publishes to GitHub Pages (Settings → Pages → Source:
**GitHub Actions**) after CI succeeds on `main`. To roll back, run the **Deploy** workflow
manually with `ref: v1-static` (or any commit): one run, no revert needed.

### URL map

Old links keep working. The fragment never reaches the server, so a small inline script on the
home page rewrites `/#/…` URLs before first paint.

| Old | New |
| --- | --- |
| `/#/`, `/#/home` | `/` |
| `/#/systems`, `/#/projects`, `/#/lab` | `/#systems`, `/#projects`, `/#projects` |
| `/#/about`, `/#/writing`, `/#/reach`, `/#/resume` | `/about`, `/writing`, `/reach`, `/resume` |
| `/#/case/voice-ai` | `/case/voice-ai` |
| `/#/case/agent`, `/#/case/b2b` | `/case/agent` |
| `/#/case/onboarding`, `/#/case/eval` | `/case/onboarding` |
| `/projects/<slug>.html` | still served (same file); canonical is `/projects/<slug>` |
| `/Akshay_Bawaliwale_Resume.pdf` | unchanged |

## Performance

Lighthouse, mobile emulation (v1: median of 3 runs on the live site; v2: median of 5, local build).

| Page | v1 (live, Phase 0) | v2 (this build) |
| --- | --- | --- |
| Home: performance / LCP / TBT | 35 / 6.5 s / 4.0 s | 96 / 2.6 s / < 0.1 s |
| Case study: performance / LCP | 72 / 6.5 s | 99 / 2.1 s |
| Home JavaScript at load | 168 KB | 7 KB (React loads only when an island is reached) |

v1 numbers: `tests/baseline/lighthouse-v1.json`. The remaining LCP is the Newsreader download (see
Backlog).

## Backlog

- **Broken link: the cardiovascular live app.** `https://cardiovascular-risk-predictor.onrender.com/`
  returns 404 (it did on v1 too). Redeploy the Render service or remove `live:` from
  `src/content/projects/cardiovascular.mdx`, then drop its exclusion from `lychee.toml`.

- **LCP target (2.0 s).** With v1's type kept byte-for-byte, LCP waits on the variable Newsreader
  files (roman ~87 KB, italic ~98 KB after subsetting). Case studies measure ~2.1 s, home ~2.6 s;
  the CI budgets hold those values. Reaching 2.0 s needs a typography decision, e.g.
  `font-display: optional` for Newsreader (first visits on slow networks would show the
  fallback serif) or lighter cuts.
- **Project benchmark values.** v1's project CSS set `font: 500 var(--fs-meta)/1 var(--font-mono)`
  on the bench values, but never defined `--fs-meta`, so they rendered in the inherited serif.
  That rendering is preserved (`font: inherit`, commented in `project.css`); decide whether
  the mono face was the intent.
- **Accessibility fixes made in the migration** (the only intended visual changes): light-theme
  `--flag` #bd3c0a → #aa3609 and `--ink-3` #6f6454 → #685e4f (both were under 4.5:1 on the
  panel background), the architecture hint's light-theme opacity .55 → .65, the project "The
  USP" label 62% → 80% ink, and keyboard access to the scrollable project pipeline.
- **Dead CSS.** v1's stylesheet still carries rules for components it had removed (metric band,
  glimpse grid, explorer, case impact…). Prune them, and move components to Tailwind
  utilities, with the visual gate as the safety net.
- **Astro 7.** The plan pinned Astro 5 (5.18, maintained); Astro 7 is the current major.
- **Phase 7 — real "Ask Akshay".** The island and `src/lib/ask.ts` are the seam: replace
  `answer()` with a streamed, retrieval-grounded call once hosting and the API key are decided.
