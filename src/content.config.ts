import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const label = z.object({ label: z.string(), value: z.string() });

/* ── case studies: /case/<slug> ─────────────────────────────────────── */
const cases = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/cases' }),
  schema: z.object({
    /** Leading part of <title>; " | Akshay Bawaliwale" is appended. */
    title: z.string(),
    description: z.string().max(170),
    order: z.number().int(),
    kicker: z.string(),
    heading: z.string(),
    lede: z.string(),
    proof: z.object({
      label: z.string(),
      /** Headline value. `from` renders struck through; `seq` / `count` animate it in. */
      value: z.object({
        from: z.string().optional(),
        to: z.string(),
        seq: z.string().optional(),
        count: z.number().optional(),
        /** Screen-reader phrasing when the visible value is animated. */
        spoken: z.string().optional(),
      }),
      viz: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('collapse'), after: z.string() }),
        z.object({ kind: z.literal('ruler'), fill: z.string(), mark: z.string(), ticks: z.array(z.string()) }),
        z.object({ kind: z.literal('fields'), total: z.number().int(), repaired: z.array(z.number().int()) }),
      ]),
      foot: z.string(),
      support: z.array(label).length(3),
    }),
    spec: z.array(label).length(4),
    architecture: z.object({
      title: z.string(),
      stops: z.array(z.object({ label: z.string(), detail: z.string(), hot: z.boolean().default(false) })).min(2),
    }),
    decisions: z.object({
      title: z.string(),
      items: z.array(z.object({ title: z.string(), insteadOf: z.string(), because: z.string(), tradeoff: z.string() })).min(1),
    }),
    outcome: z.object({
      lede: z.string(),
      caption: z.string(),
      columns: z.array(z.string()).min(2),
      rows: z.array(z.array(z.string()).min(2)),
    }),
    next: z.object({ case: reference('cases'), label: z.string() }),
  }),
});

/* ── project deep-dives: /projects/<slug> ───────────────────────────── */
const projects = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(170),
      order: z.number().int(),
      icon: z.enum(['heart-pulse', 'film', 'sparkles', 'route']),
      chips: z.array(z.object({ label: z.string(), accent: z.boolean().default(false) })),
      heading: z.string(),
      headingEm: z.string(),
      lede: z.string(),
      repo: z.string().url(),
      /** Secondary hero action; defaults to "back to portfolio". */
      live: z.object({ label: z.string(), url: z.string().url() }).optional(),
      cover: z.object({ image: image(), alt: z.string(), caption: z.string() }),
      stats: z.array(label).length(4),
      bench: z.object({
        title: z.string(),
        meta: z.string(),
        note: z.string().optional(),
        /** Ranked bars on a linear scale… */
        bars: z
          .object({
            min: z.number(),
            max: z.number(),
            axis: z.array(z.string()),
            rows: z.array(
              z.object({
                label: z.string(),
                value: z.string(),
                mark: z.enum(['win', 'flag']).optional(),
                note: z.string().optional(),
              }),
            ),
          })
          .optional(),
        /** …or a bespoke figure from src/components/bench. */
        figure: z.enum(['netflix-scatter', 'tiling']).optional(),
      }),
      flowTitle: z.string(),
      flow: z.array(z.object({ label: z.string(), hot: z.boolean().default(false) })),
      stack: z.array(z.string()),
      usp: z.string(),
      cta: z.string(),
      /** The card in the home-page orbit. */
      orbit: z.object({
        title: z.string(),
        tag: z.string(),
        desc: z.string(),
        metric: z.string(),
        tint: z.string().regex(/^#[0-9a-f]{6}$/i),
      }),
    }),
});

/* ── writing: external posts today, full posts later ────────────────── */
const writing = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string(),
      category: z.string(),
      minutes: z.number().int().positive(),
      published: z.coerce.date(),
      order: z.number().int(),
      /** Where the post lives until it's published here in full. */
      url: z.string().url(),
      /** Shown as a photo card in the home-page preview. */
      feature: z
        .object({ title: z.string(), image: image(), alt: z.string() })
        .optional(),
    }),
});

export const collections = { cases, projects, writing };
