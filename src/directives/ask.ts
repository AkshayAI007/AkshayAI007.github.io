import type { ClientDirective } from 'astro';

/**
 * `client:ask` — hydrates the "Ask Akshay" island on first intent: pointing
 * at, focusing or pressing any `[data-ask-open]` trigger. The panel is
 * server-rendered and closed, so nothing is visible until then, and the React
 * runtime stays off the critical path of every page.
 *
 * Until the island announces it is listening (the `ask:ready` event, fired
 * once its own click handler is attached), clicks on a trigger are recorded
 * on `window.__askQueued` and replayed by the island when it mounts. A failed
 * chunk load re-arms the directive, so the next intent retries.
 */
const askDirective: ClientDirective = (load) => {
  const INTENT = ['pointerover', 'focusin', 'touchstart', 'pointerdown'] as const;
  let loading = false;

  const trigger = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-ask-open]') : null);

  const arm = () => INTENT.forEach((t) => document.addEventListener(t, onIntent, { capture: true, passive: true }));
  const disarm = () => INTENT.forEach((t) => document.removeEventListener(t, onIntent, true));

  const start = async () => {
    if (loading) return;
    loading = true;
    disarm();
    try {
      const hydrate = await load();
      await hydrate();
    } catch (err) {
      loading = false;
      arm();
      console.warn('Ask Akshay failed to load; it will retry on the next interaction.', err);
    }
  };

  function onIntent(e: Event) {
    if (trigger(e)) void start();
  }

  function onClick(e: Event) {
    const t = trigger(e);
    if (!t) return;
    window.__askQueued = t;
    void start();
  }

  window.addEventListener('ask:ready', () => document.removeEventListener('click', onClick, true), { once: true });
  arm();
  document.addEventListener('click', onClick, true);
};

export default askDirective;
