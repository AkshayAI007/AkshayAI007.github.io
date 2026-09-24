import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getWriting } from '@/lib/content';
import { SITE } from '@/lib/site';

/** Writing feed. Posts live on LinkedIn for now, so items link out. */
export const GET: APIRoute = async ({ site }) => {
  const posts = (await getWriting()).sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
  return rss({
    title: `Writing — ${SITE.name}`,
    description: 'Notes from the machine room: the decisions, failure modes and mental models behind production AI.',
    site: site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.excerpt,
      link: p.data.url,
      pubDate: p.data.published,
      categories: [p.data.category],
    })),
    customData: '<language>en</language>',
  });
};
