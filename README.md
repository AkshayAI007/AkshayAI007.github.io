# Akshay Bawaliwale — Portfolio Site

A self-contained static site. No build step, no dependencies — open `index.html`
in a browser, or deploy the whole folder as-is to any static host (Netlify,
Vercel, GitHub Pages, S3, etc.).

## Structure

```
index.html              Main site (Home, About, Writing, Lab, Resume, Reach Out
                        + three case studies), hash-routed
projects/
  cardiovascular.html   Cardiovascular Risk Prediction — project deep-dive
  netflix.html          Netflix Content Clustering — project deep-dive
  image-enhancer.html   AI Image Enhancer — project deep-dive
  nyc-taxi.html         NYC Taxi Trip Time Prediction — project deep-dive
```

`index.html` holds every main-site page as a `.page` section toggled by a small
hash router. Each file in `projects/` is independent and self-contained (own
`<style>`, own fonts, links back to `../index.html`).

---

## Design system v2

The stylesheet is organised in numbered sections inside the single `<style>`
block. Section 0 is the token block in `:root`; sections 01–23 are the
component layers. Change tokens, not component values.

### Colour — one primary, one secondary, three accents, each with a job

The palette is "Instrument": a cool graphite ground, ice-white type, a precise
azure carrying emphasis, and four supporting colours that each mean exactly one
thing. Cool structure, warm warnings — the convention every piece of monitoring
software already uses — extended with a violet marker for classical-ML content
and a mint reserved for verified/shipped outcome numbers.

| Role | Token | Value | Used for |
|---|---|---|---|
| Primary | `--azure` / `--azure-lit` / `--azure-pale` / `--azure-deep` | `#4C8DFF` … | **Human / editorial emphasis.** Kickers, links, primary CTA, active nav, headline gradients. |
| Secondary | `--slate` / `--slate-lit` / `--slate-dim` | `#7683B5` | Supporting UI — secondary actions, timeline date labels. |
| Accent 1 | `--amber` | `#F0A13C` | **Live machine state only.** Status dots, signal-flow pulses, "within target" confirmations. |
| Accent 2 | `--violet` / `--violet-dim` | `#9B7FE0` | Classical/applied-ML content — distinguishes ML callouts from GenAI/LLM callouts, which stay on primary. |
| Accent 3 | `--mint` / `--mint-dim` | `#3ED598` | Verified/shipped outcome numbers. |
| Ground | `--ink` → `--surface-3` | `#0B0E13` → `#232D40` | Ground and raised surfaces — graphite with a blue bias. |
| Content | `--ice` / `--text` → `--text-4` | `#E9EDF4` → `#7D8798` | Content. Every step clears WCAG AA (4.5:1) on `--ink`. |

The split is what makes each accent mean something: if azure marked everything,
it would highlight nothing. Anything that reports what the *system* is doing is
amber; anything that's classical ML rather than GenAI is violet; anything that
reports what *Akshay* wants you to read is azure.

Two constraints the palette has to respect, both verified:

- **Azure is only legible with dark text on it.** Ink on `--azure` is 6.04:1;
  white on it is 3.20:1 and fails. Every azure flood — buttons, the mobile menu,
  the project result band — carries `--ink` text, and the darkest gradient stop
  never goes below `#4480EA` (5.08:1 with ink).
- **On the light sections azure has to go deeper.** `--azure` on cool paper is
  4.26:1 and fails; those sections use `#1F57BD` (5.61:1) instead. Deep azure
  on the *dark* ground is only 3.82:1, so it is a gradient stop there, never text.

Azure at gold's alpha floods a ground the way gold never did, so the atmospheric
washes (hero glow, section blooms, the route veil) run at roughly half the alpha
a warm accent would take. Keep them there — that is what stops the ground from
becoming navy and the accent from becoming wallpaper.

### Type
One micro-label style — `--fs-micro: 11px` at `--ls-micro: .16em` — replaces the
11 different sizes and 11 different tracking values the previous version used
for the same job. Nothing renders below 11px. Data positions use
`font-variant-numeric: tabular-nums` so figures don't jitter while animating.

### Space
8px scale, `--s1` (8px) → `--s9` (160px). Section rhythm is `--bay`; horizontal
inset is `--gutter`.

### Motion
Four durations (`--dur-1` 140ms micro → `--dur-4` 640ms page) and three easings
(`--ease-out` entering, `--ease-in` exiting, `--ease-spring` press). Exits run at
roughly 65% of enters. Everything is disabled under `prefers-reduced-motion`.

### Photography
Every photo is graded into the palette at runtime rather than shipped
pre-treated: `grayscale` → steel tint via `mix-blend-mode: color` → a vertical
scrim for text legibility. On hover the grade relaxes and colour partly returns.
The recipe lives in the `.shot` block; drop any image into a `.shot` figure and
it will match the brand.

The tint gradient is deliberately *desaturated* steel (`#7EA6E0` → `#42638F` →
`#1E2836`), not `--azure` itself: `mix-blend-mode: color` takes hue and
saturation wholesale, so a fully saturated accent turns every photograph cyan.

---

## Deployment notes

- **Fonts** load from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`)
  with `display=swap` — needs internet access; no local font files bundled.
- **Photography** is hotlinked from the Unsplash CDN (`images.unsplash.com`)
  with `srcset`, `sizes`, `loading="lazy"`, and explicit `width`/`height` so
  there is no layout shift. Unsplash supports hotlinking and does the resizing
  server-side, which is why the repo stays small. To remove the third-party
  dependency, download each URL into `assets/img/` and rewrite the `src`/`srcset`
  — no other change is needed. Photo credit sits in the footer.
- **Routing** is hash-based (`index.html#/case/voice-ai`) so it works from
  `file://` and from any static host without server rewrites. Every section is
  deep-linkable and shareable; back/forward and scroll restoration both work.
- The Resume page's "Download Resume (PDF)" button embeds the PDF as a base64
  data URI, decodes it to a `Blob` client-side, and triggers the save via a
  temporary `<a download>` + `URL.createObjectURL` — the one pattern that
  reliably forces an actual file save (rather than an in-browser preview)
  across Chrome/Firefox/Edge/Safari, with a `data:` URL tab-open as the last-
  resort fallback if `Blob` construction throws. To trim page weight, you can
  swap the embedded base64 for a real `<a href="resume.pdf" download>` pointing
  at a hosted PDF instead — it would cut roughly 200KB off every first load.
- Project links point at `projects/*.html` relative paths — keep the folder
  alongside `index.html`.
- "View Code on GitHub" links point at real repos under `github.com/AkshayAI007`;
  verify they are public before sharing the site externally.

## Accessibility

Audited across all 9 routes and all 4 project pages. Current state:

- 0 text/background pairs below WCAG AA (4.5:1 body, 3:1 large)
- 0 interactive targets under 44×44px
- 0 text below 11px
- 0 images without `alt` and without intrinsic dimensions
- No heading-level skips; exactly one `<h1>` per page
- A single visible focus ring on every interactive element (`:focus-visible`)
- Skip-to-content link on every page
- Closed dialogs (mobile menu, assistant panel) are `inert`, so they leave the
  tab order entirely; both trap focus while open, close on `Escape`, and return
  focus to whatever opened them
- Explorer tabs implement the ARIA tabs pattern with roving `tabindex` and
  arrow/Home/End keys
- Reveal animations have a scroll-driven fallback, so a deep link or a restored
  scroll position can never leave content stuck at `opacity: 0`

## Known trade-offs

- The site commits to a single dark theme by design; there is no light mode.
- Three sections (`.beliefs`, `.evaluation-lab`, and `.case-architecture` on the
  case studies) invert to a cool paper on purpose, as spec-sheet moments.
  Anything placed there needs colours checked against the light ground, not the
  dark one — azure in particular has to drop to `#1F57BD`.
