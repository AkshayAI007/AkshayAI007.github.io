/**
 * In-page navigation on the home page, where Home, Systems and Projects all
 * live. Clicking them scrolls instead of reloading, offset below the fixed
 * header, and the primary nav marks whichever one you're on — v1's router
 * behaviour, without the router.
 */

// scrollIntoView + scroll-padding-top settles short while the page is still
// animating in (.page route-in translates it), so measure one frame after
// layout and read the header's real height.
export function scrollToAnchor(target: Element | null) {
  if (!target) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const header = document.querySelector('.site-header');
      const offset = (header ? header.getBoundingClientRect().height : 88) + 20;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  });
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const el of document.querySelectorAll<HTMLElement>('[data-scroll]')) {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToAnchor(document.querySelector(el.dataset.scroll!));
  });
}

const onHome = document.getElementById('systems') !== null;

function markCurrent() {
  const route = location.hash === '#systems' ? 'systems' : location.hash === '#projects' ? 'projects' : 'home';
  for (const a of document.querySelectorAll<HTMLAnchorElement>('.desktop-nav a')) {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

if (onHome) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href="/"], a[href="/#systems"], a[href="/#projects"]');
    if (!a) return;
    e.preventDefault();
    window.dispatchEvent(new Event('menu:close'));
    const href = a.getAttribute('href')!;
    if (location.pathname + location.hash !== href) history.pushState(null, '', href);
    markCurrent();
    if (href === '/') {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      }));
    } else {
      scrollToAnchor(document.querySelector(href.slice(1)));
    }
  });
  window.addEventListener('popstate', markCurrent);
  window.addEventListener('hashchange', markCurrent);
  markCurrent();

  // A legacy /#/systems link was rewritten in <head> (see LegacyHashRedirect);
  // scroll there the way v1 did on a deep link.
  const legacy = (window as { __legacyAnchor?: string }).__legacyAnchor;
  if (legacy) scrollToAnchor(document.querySelector(legacy));
}
