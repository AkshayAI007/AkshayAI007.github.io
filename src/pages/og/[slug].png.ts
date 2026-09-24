import type { APIRoute, GetStaticPaths } from 'astro';
import { getCases, getProjects } from '@/lib/content';
import { renderOg, type OgCard } from '@/lib/og';

/** One Open Graph image per route: /og/<slug>.png. */
export const getStaticPaths = (async () => {
  const pages: { slug: string; card: OgCard }[] = [
    { slug: 'home', card: { kicker: 'Senior Generative AI & LLM Engineer', title: 'I architect AI systems that', em: 'survive reality.', metric: '2 DAYS → 3 MIN · 3M+ SMBS · 20+ LLM SYSTEMS' } },
    { slug: 'about', card: { kicker: 'About · machine learning to production AI', title: 'Machine learning got me here.', em: 'Generative AI is where I build now.' } },
    { slug: 'writing', card: { kicker: 'Writing · notes from the machine room', title: 'Making complex AI', em: 'harder to misunderstand.' } },
    { slug: 'reach', card: { kicker: 'Reach out · start here', title: 'Have an AI problem that refuses to behave?', em: "Let's talk." } },
    { slug: 'resume', card: { kicker: 'Resume · the one-page version', title: 'Everything above,', em: 'compressed to one page.', metric: '20+ PRODUCTION LLM SYSTEMS · IIT KHARAGPUR' } },
  ];
  for (const c of await getCases()) {
    const v = c.data.proof.value;
    pages.push({
      slug: `case-${c.id}`,
      card: { kicker: c.data.kicker, title: c.data.heading, metric: `${v.from ? `${v.from} → ` : ''}${v.to} · ${c.data.proof.label}`.toUpperCase() },
    });
  }
  for (const p of await getProjects()) {
    const s = p.data.stats[0]!;
    pages.push({
      slug: `project-${p.id}`,
      card: { kicker: p.data.orbit.tag, title: p.data.heading, em: p.data.headingEm, metric: `${s.value} · ${s.label}`.toUpperCase() },
    });
  }
  return pages.map(({ slug, card }) => ({ params: { slug }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const png = await renderOg((props as { card: OgCard }).card, site!.host);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
