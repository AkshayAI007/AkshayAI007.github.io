import type { ClientDirective } from 'astro';

/**
 * `client:ask` — hydrates the "Ask Akshay" island on first intent: pointing
 * at, focusing or pressing any `[data-ask-open]` trigger. The panel is
 * server-rendered and closed, so nothing is visible until then, and the React
 * runtime stays off the critical path of every page.
 *
 * A click that arrives before hydration finishes is recorded on
 * `window.__askQueued`; the island opens for it as soon as it mounts.
 */
const askDirective: ClientDirective = (load) => {
  const INTENT = ['pointerover', 'focusin', 'touchstart', 'pointerdown'] as const;
  let started = false;
  let hydrated = false;

  const trigger = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-ask-open]') : null);

  const start = async () => {
    if (started) return;
    started = true;
    INTENT.forEach((t) => document.removeEventListener(t, onIntent, true));
    const hydrate = await load();
    await hydrate();
    hydrated = true;
    document.removeEventListener('click', onClick, true);
  };

  const onIntent = (e: Event) => {
    if (trigger(e)) void start();
  };

  const onClick = (e: Event) => {
    const t = trigger(e);
    if (!t || hydrated) return;
    (window as Window & { __askQueued?: Element }).__askQueued = t;
    void start();
  };

  INTENT.forEach((t) => document.addEventListener(t, onIntent, { capture: true, passive: true }));
  document.addEventListener('click', onClick, true);
};

export default askDirective;
