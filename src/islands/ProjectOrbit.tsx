import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Project orbit — a physically-eased 3D carousel. `pos` is a continuous ring
 * position: card i sits at angle (i − pos) × 360°/N, so increasing pos turns
 * the ring clockwise (front → left → back → right). Arrows, autoplay, index
 * clicks and drags all just move `target`; a spring eases `pos` toward it.
 *
 * The server render already holds the first frame: each card's transform is
 * written in container-query units (the ring radius depends on the stage
 * width), so the ring is in place before — and unchanged by — hydration.
 */

export interface OrbitImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  sources: { type: string; srcset: string }[];
}

export interface OrbitCard {
  href: string;
  title: string;
  tag: string;
  desc: string;
  metric: string;
  tint: string;
  /** Complete <svg> markup of the project's stroke icon. */
  icon: string;
  image: OrbitImage;
}

const DWELL = 5200;
const SIZES = '(max-width:760px) 80vw, 380px';
/** Ring radius: min(stage × .42, card × 1.3) — the same rule render() uses. */
const RADIUS = 'min(42cqw, calc(var(--w) * 1.3))';

const pad2 = (n: number) => String(n).padStart(2, '0');
const num = (n: number, d = 4) => +n.toFixed(d);

/** The pose card i takes at ring position `pos`, as render() computes it. */
function pose(i: number, n: number, pos = 0) {
  const th = ((i - pos) * (360 / n) * Math.PI) / 180;
  const face = Math.cos(th);
  return {
    sin: Math.sin(th),
    zk: (face - 1) * 0.95,
    rot: -Math.sin(th) * 34,
    lift: (1 - face) * -10,
    filter:
      `brightness(${(0.32 + 0.68 * ((face + 1) / 2)).toFixed(3)}) saturate(${(0.55 + (0.45 * (face + 1)) / 2).toFixed(3)})` +
      (face < -0.4 ? ` blur(${((-face - 0.4) * 2.5).toFixed(2)}px)` : ''),
    z: Math.round(face * 100) + 100,
    gx: `${(50 + Math.sin(th) * 70).toFixed(1)}%`,
  };
}

function firstFrame(i: number, n: number, tint: string): CSSProperties {
  const p = pose(i, n);
  return {
    '--tint': tint,
    transform: `translate3d(calc(${RADIUS} * ${num(p.sin)}), ${num(p.lift, 1)}px, calc(${RADIUS} * ${num(p.zk)})) rotateY(${num(p.rot, 2)}deg)`,
    filter: p.filter,
    zIndex: p.z,
    '--gx': p.gx,
  } as CSSProperties;
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);

export default function ProjectOrbit({ cards }: { cards: OrbitCard[] }) {
  const root = useRef<HTMLDivElement>(null);
  const N = cards.length;

  useEffect(() => {
    const rootEl = root.current!;
    const stage = rootEl.querySelector<HTMLElement>('.orbit-stage')!;
    const scene = rootEl.querySelector<HTMLElement>('.orbit-scene')!;
    const cardEls = [...rootEl.querySelectorAll<HTMLAnchorElement>('.orbit-card')];
    const items = [...rootEl.querySelectorAll<HTMLLIElement>('.orbit-index li')];
    const now = rootEl.querySelector<HTMLElement>('#orbitNow')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mod = (n: number, m: number) => ((n % m) + m) % m;

    let pos = 0, target = 0, vel = 0, front = 0;
    let visible = false, hover = false, dragging = false, t0 = performance.now(), prog = 0;
    let mx = 0, my = 0, tx = 0, ty = 0;
    let raf = 0;

    const radius = () => Math.min(stage.clientWidth * 0.42, cardEls[0]!.offsetWidth * 1.3);

    function render() {
      const R = radius();
      cardEls.forEach((c, i) => {
        const p = pose(i, N, pos);
        c.style.transform = `translate3d(${(p.sin * R).toFixed(1)}px,${p.lift.toFixed(1)}px,${(p.zk * R).toFixed(1)}px) rotateY(${p.rot.toFixed(2)}deg)`;
        c.style.filter = p.filter;
        c.style.zIndex = String(p.z);
        c.style.setProperty('--gx', p.gx); // gloss slides as it turns
      });
      const f = mod(Math.round(pos), N);
      if (f !== front) {
        front = f;
        cardEls.forEach((c, i) => {
          const on = i === f;
          c.classList.toggle('is-front', on);
          c.tabIndex = on ? 0 : -1;
          c.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        items.forEach((li, i) => {
          li.classList.toggle('is-active', i === f);
          if (i !== f) li.style.removeProperty('--p');
        });
        now.textContent = pad2(f + 1);
        rootEl.style.setProperty('--tint-live', cardEls[f]!.style.getPropertyValue('--tint'));
      }
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      scene.style.transform = `rotateX(${(-4 + my * 5).toFixed(2)}deg) rotateY(${(mx * 7).toFixed(2)}deg)`;
    }

    const goTo = (t: number) => { target = t; t0 = performance.now(); prog = 0; };
    const step = (d: number) => goTo(Math.round(target) + d);
    const toCard = (i: number) => { // shortest way round to card i
      const cur = Math.round(target);
      let d = mod(i - cur, N);
      if (d > N / 2) d -= N;
      goTo(cur + d);
    };

    const ac = new AbortController();
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
      el.addEventListener(type, fn as EventListener, { signal: ac.signal });

    rootEl.querySelectorAll<HTMLElement>('.orbit-arrow').forEach((b) => on(b, 'click', () => step(Number(b.dataset.dir))));
    items.forEach((li, i) => on(li.querySelector('button')!, 'click', () => toCard(i)));
    on(rootEl, 'keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    // drag / swipe to spin the ring; a still click on a side card brings it forward
    let sx = 0, sp = 0, moved = false, downFront: Element | null = null;
    on(stage, 'pointerdown', (e) => {
      dragging = true; moved = false; sx = e.clientX; sp = target;
      const dc = (e.target as Element).closest('.orbit-card');
      downFront = dc && dc.classList.contains('is-front') ? dc : null;
      stage.classList.add('is-dragging');
    });
    on(window, 'pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!dragging) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 6) moved = true;
      target = sp - dx / (radius() * 1.6);
    });
    const end = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      if (moved) { goTo(Math.round(target)); return; }
      const hit = (e.target as Element).closest?.('.orbit-card');
      if (hit && !hit.classList.contains('is-front')) toCard(cardEls.indexOf(hit as HTMLAnchorElement));
    };
    on(window, 'pointerup', end);
    on(window, 'pointercancel', end);
    on(stage, 'pointerleave', () => { tx = 0; ty = 0; });
    on(stage, 'dragstart', (e) => e.preventDefault());
    // only a still, deliberate click on the card already in front follows its link
    cardEls.forEach((c) => on(c, 'click', (e) => {
      if (moved || (e.detail && c !== downFront) || !c.classList.contains('is-front')) e.preventDefault();
    }));

    on(rootEl, 'mouseenter', () => { hover = true; });
    on(rootEl, 'mouseleave', () => { hover = false; t0 = performance.now() - prog * DWELL; });
    on(rootEl, 'focusin', () => { hover = true; });
    on(rootEl, 'focusout', () => { hover = false; });

    let last = performance.now();
    const frame = (n: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (n - last) / 1000);
      last = n;
      // time-based spring toward target (slightly under-damped: a soft settle, same speed on any device)
      if (reduce.matches) { pos = target; vel = 0; }
      else {
        for (let k = 0; k < 4; k++) { const h = dt / 4; vel += ((target - pos) * 90 - vel * 15) * h; pos += vel * h; }
        if (Math.abs(target - pos) < 1e-4 && Math.abs(vel) < 1e-3) { pos = target; vel = 0; }
      }
      const moving = pos !== target || vel !== 0 || Math.abs(tx - mx) > 1e-3 || Math.abs(ty - my) > 1e-3 || dragging;
      if (moving) render();
      // autoplay
      if (hover || dragging || !visible || document.hidden || reduce.matches) { t0 = n - prog * DWELL; return; }
      prog = Math.min(1, (n - t0) / DWELL);
      items[front]?.style.setProperty('--p', prog.toFixed(4));
      if (prog >= 1) step(1);
    };

    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; }, { threshold: 0.3 });
    io.observe(rootEl);
    render();
    raf = requestAnimationFrame(frame);

    return () => {
      ac.abort();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [N]);

  return (
    <div
      className="orbit reveal"
      id="projectOrbit"
      role="region"
      aria-roledescription="carousel"
      aria-label="Public projects"
      ref={root}
      style={{ '--tint-live': cards[0]?.tint } as CSSProperties}
    >
      <button className="orbit-arrow orbit-prev" type="button" aria-label="Previous project" data-dir="-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H5"></path><path d="M11 5l-7 7 7 7"></path></svg>
      </button>
      <div className="orbit-stage" aria-live="polite" style={{ containerType: 'inline-size' }}>
        <div className="orbit-scene" style={{ transform: 'rotateX(-4.00deg) rotateY(0.00deg)' }}>
          <span className="orbit-floor" aria-hidden="true"></span>
          {cards.map((c, i) => (
            <a
              key={c.href}
              className={i === 0 ? 'orbit-card is-front' : 'orbit-card'}
              draggable={false}
              href={c.href}
              style={firstFrame(i, N, c.tint)}
              data-index={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${N}: ${c.title}`}
              tabIndex={i === 0 ? 0 : -1}
              aria-hidden={i === 0 ? 'false' : 'true'}
            >
              <span className="orbit-face">
                <picture>
                  {c.image.sources.map((s) => <source key={s.type} type={s.type} srcSet={s.srcset} sizes={SIZES} />)}
                  <img src={c.image.src} alt={c.image.alt} width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />
                </picture>
                <span className="orbit-shade" aria-hidden="true"></span>
                <span className="orbit-top">
                  <span className="orbit-num">{pad2(i + 1)}</span>
                  <span className="orbit-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: c.icon }}></span>
                </span>
                <span className="orbit-body">
                  <span className="orbit-tag">{c.tag}</span>
                  <span className="orbit-title">{c.title}</span>
                  <span className="orbit-desc">{c.desc}</span>
                  <span className="orbit-cta"><span>Case study</span><b>{c.metric}</b><Arrow /></span>
                </span>
                <span className="orbit-gloss" aria-hidden="true"></span>
              </span>
            </a>
          ))}
        </div>
      </div>
      <button className="orbit-arrow orbit-next" type="button" aria-label="Next project" data-dir="1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15"></path><path d="M13 5l7 7-7 7"></path></svg>
      </button>
      <div className="orbit-rail">
        <span className="orbit-count"><b id="orbitNow">01</b>{` / ${pad2(N)}`}</span>
        <ol className="orbit-index">
          {cards.map((c, i) => (
            <li key={c.href} className={i === 0 ? 'is-active' : undefined}>
              <button type="button" data-go={i} aria-label={`Show project ${i + 1}: ${c.title}`}><i></i><span>{c.title}</span></button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
