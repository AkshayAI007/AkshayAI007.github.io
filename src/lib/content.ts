import { getImage } from 'astro:assets';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { OrbitCard } from '@/islands/ProjectOrbit';
import { PROJECT_ICONS, strokeIcon } from './icons';

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export const getCases = async () => (await getCollection('cases')).sort(byOrder);
export const getProjects = async () => (await getCollection('projects')).sort(byOrder);
export const getWriting = async () => (await getCollection('writing')).sort(byOrder);

export const caseHref = (c: CollectionEntry<'cases'>) => `/case/${c.id}`;
export const projectHref = (p: CollectionEntry<'projects'>) => `/projects/${p.id}`;

/** Orbit cards for the home page: image variants are generated here, at build. */
export async function getOrbitCards(): Promise<OrbitCard[]> {
  const projects = await getProjects();
  return Promise.all(
    projects.map(async (p) => {
      const src = p.data.cover.image;
      const widths = [640, 960, 1400, 1920].filter((w) => w <= src.width);
      if (!widths.includes(src.width) && src.width < 1920) widths.push(src.width);
      const [avif, webp] = await Promise.all(
        (['avif', 'webp'] as const).map((format) => getImage({ src, widths, format, quality: 70 })),
      );
      const fallback = await getImage({ src, width: Math.min(1400, src.width), format: 'jpg', quality: 70 });
      return {
        href: projectHref(p),
        ...p.data.orbit,
        icon: strokeIcon(PROJECT_ICONS[p.data.icon]),
        image: {
          src: fallback.src,
          width: src.width,
          height: src.height,
          alt: p.data.cover.alt,
          sources: [
            { type: 'image/avif', srcset: avif!.srcSet.attribute },
            { type: 'image/webp', srcset: webp!.srcSet.attribute },
          ],
        },
      };
    }),
  );
}
