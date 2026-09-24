import { SITE } from './site';

export interface SeoInput {
  /** Full <title>. */
  title: string;
  description: string;
  /** Open Graph / Twitter copy, when it should differ from the meta description. */
  socialDescription?: string;
  /** Path of the page, e.g. "/case/voice-ai" ("/" for home). */
  path: string;
  /** Path of the Open Graph image under /og, e.g. "/og/home.png". */
  ogImage: string;
  ogType?: 'website' | 'profile' | 'article';
  /** Alt text for the OG image. */
  ogImageAlt?: string;
}

export interface Seo extends Required<SeoInput> {
  canonical: string;
  ogImageUrl: string;
}

export function buildSeo(input: SeoInput, site: URL): Seo {
  const canonical = new URL(input.path, site).href;
  return {
    ogType: 'website',
    ogImageAlt: input.title,
    socialDescription: input.description,
    ...input,
    canonical,
    ogImageUrl: new URL(input.ogImage, site).href,
  };
}

/** schema.org Person — the author of everything on the site. */
export function personJsonLd(site: URL) {
  return {
    '@type': 'Person',
    '@id': new URL('/#person', site).href,
    name: SITE.name,
    url: site.href,
    jobTitle: SITE.jobTitle,
    worksFor: { '@type': 'Organization', name: SITE.employer },
    alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Indian Institute of Technology Kharagpur' }],
    knowsAbout: [
      'Generative AI',
      'Large language models',
      'Multi-agent systems',
      'Retrieval-augmented generation',
      'Voice AI',
      'LLM evaluation',
      'LangGraph',
      'LiveKit',
      'AWS',
    ],
    sameAs: [SITE.github, SITE.linkedin, SITE.medium],
  };
}

export function withContext<T extends object>(node: T) {
  return { '@context': 'https://schema.org', ...node };
}

export function breadcrumbJsonLd(site: URL, trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: new URL(t.path, site).href,
    })),
  };
}
