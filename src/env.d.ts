declare module 'astro' {
  interface AstroClientDirectives {
    /** Hydrate on first intent toward a `[data-ask-open]` trigger. See src/directives/ask.ts. */
    'client:ask'?: boolean;
  }
}

declare global {
  interface Window {
    /** Set by the legacy hash redirect: the home-page anchor to scroll to. */
    __legacyAnchor?: string;
    /** Set by client:ask when a trigger is clicked before the island hydrates. */
    __askQueued?: Element;
  }
}

export {};
