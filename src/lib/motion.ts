/**
 * Site-wide motion, ported from v1: cursor glow, scroll progress line, sticky
 * header, hero parallax, staggered reveals and the proof-number sequences.
 * Every effect checks prefers-reduced-motion; under it, content is simply shown.
 * Loaded once per page by the Page layout.
 */

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;

/* ── cursor glow ─────────────────────────────────────────────────────── */
function cursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow || !window.matchMedia('(pointer: fine)').matches || reduced()) return;
  let tx = 0, ty = 0, x = 0, y = 0, active = false;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!active) {
      active = true;
      glow.style.opacity = '1';
    }
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    active = false;
    glow.style.opacity = '0';
  });
  const tick = () => {
    x += (tx - x) * 0.11;
    y += (ty - y) * 0.11;
    glow.style.transform = `translate3d(${x}px,${y}px,0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── reveals: arrive in sequence, capped so long grids stay snappy ───── */
let pendingReveals: HTMLElement[] = [];

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

function armReveals() {
  for (const el of document.querySelectorAll<HTMLElement>('.reveal')) {
    if (el.dataset.armed) continue;
    el.dataset.armed = '1';
    // Island wrappers (<astro-island>, display: contents) are transparent here too.
    const parent = el.parentElement?.tagName === 'ASTRO-ISLAND' ? el.parentElement.parentElement : el.parentElement;
    const siblings = Array.from(parent?.children ?? [])
      .flatMap((n) => (n.tagName === 'ASTRO-ISLAND' ? Array.from(n.children) : [n]))
      .filter((n) => n.classList.contains('reveal'));
    el.style.setProperty('--i', String(Math.min(siblings.indexOf(el), 6)));
    pendingReveals.push(el);
    revealObserver.observe(el);
  }
  sweepReveals();
}

/* Safety net: IntersectionObserver only fires for elements the viewport passes
   over, so an instant jump (anchor link, restored scroll) could leave content
   stuck at opacity 0. Anything already at or above the fold is revealed. */
function sweepReveals() {
  if (!pendingReveals.length) return;
  const fold = window.innerHeight + 80;
  pendingReveals = pendingReveals.filter((el) => {
    if (el.classList.contains('is-visible')) return false;
    if (el.getBoundingClientRect().top < fold) {
      el.classList.add('is-visible');
      revealObserver.unobserve(el);
      return false;
    }
    return true;
  });
}

/* ── scroll-linked work, batched into one frame ──────────────────────── */
function scrollEffects() {
  const progressLine = document.getElementById('progressLine');
  const header = document.querySelector<HTMLElement>('.site-header');
  const hero = document.getElementById('heroSection');
  const parallax = document.getElementById('heroParallax');
  let queued = false;

  const frame = () => {
    queued = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (progressLine) progressLine.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    header?.classList.toggle('is-stuck', doc.scrollTop > 24);
    sweepReveals();
    // Hero parallax only matters while the hero is actually on screen.
    if (hero && parallax) {
      const r = hero.getBoundingClientRect();
      if (r.height > 0 && r.bottom > -200) {
        const p = Math.min(1, Math.max(0, -r.top / r.height));
        parallax.style.transform = `translate3d(0, ${p * 140}px, 0)`;
        parallax.style.opacity = String(1 - Math.min(1, p / 0.85));
      }
    }
  };

  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }, { passive: true });
  frame();
}

/* ── proof numbers: count-down sequences and count-ups, played once ──── */
function proofNumbers() {
  if (reduced() || !('IntersectionObserver' in window)) return;
  const seqEls = [...document.querySelectorAll<HTMLElement>('[data-seq]')];
  const cntEls = [...document.querySelectorAll<HTMLElement>('[data-count]')];
  // Park each value at its starting state; the reveal plays it forward.
  for (const el of seqEls) {
    el.dataset.final = el.innerHTML;
    el.innerHTML = el.dataset.seq!.split('|')[0]!;
  }
  for (const el of cntEls) {
    el.dataset.final = el.innerHTML;
    el.innerHTML = `${el.dataset.prefix ?? ''}0${el.dataset.suffix ?? ''}`;
  }
  const play = (el: HTMLElement) => {
    if (el.dataset.seq) {
      const steps = el.dataset.seq.split('|');
      steps.forEach((s, i) => setTimeout(() => { el.innerHTML = s; }, 350 + i * 230));
      setTimeout(() => { el.innerHTML = el.dataset.final!; }, 350 + steps.length * 230);
      return;
    }
    const end = parseFloat(el.dataset.count!);
    const t0 = performance.now() + 300;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 1100));
      const e = 1 - Math.pow(1 - p, 3);
      el.innerHTML = `${el.dataset.prefix ?? ''}${Math.round(end * e)}${el.dataset.suffix ?? ''}`;
      if (p < 1) requestAnimationFrame(step);
      else el.innerHTML = el.dataset.final!;
    };
    step(performance.now());
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      play(en.target as HTMLElement);
      io.unobserve(en.target);
    }
  }, { threshold: 0.6 });
  [...seqEls, ...cntEls].forEach((el) => io.observe(el));
}

cursorGlow();
scrollEffects();
armReveals();
proofNumbers();
