import { useAnimationFrame, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-velocity marquee (the supplied <ScrollVelocityRow> model): the row
 * drifts at a base speed; a spring-smoothed read of page-scroll velocity
 * multiplies it up to 6× and scroll direction flips which way it runs.
 * Copies are cloned to cover the width. Motion pauses off-screen, in hidden
 * tabs and on hover; under reduced motion the chips wrap, static (CSS).
 */

export interface StackGroup {
  layer: string;
  tools: string[];
}

interface Props {
  groups: StackGroup[];
  /** Base speed, in % of one copy's width per second. */
  velocity?: number;
  direction?: 1 | -1;
}

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

export default function StackMarquee({ groups, velocity = 0.5, direction = 1 }: Props) {
  const rows = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const block = useRef<HTMLUListElement>(null);
  const [copies, setCopies] = useState(1);

  const { scrollY } = useScroll();
  const smooth = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, (v) => (v < 0 ? -1 : 1) * Math.min(5, (Math.abs(v) / 1000) * 5));

  const state = useRef({ x: 0, unit: 0, base: direction >= 0 ? 1 : -1, cur: direction >= 0 ? 1 : -1 });
  const flags = useRef({ inView: true, hovering: false, reduce: false });

  useEffect(() => {
    const rowsEl = rows.current!;
    const section = rowsEl.closest('.stack-marquee') ?? rowsEl;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const layout = () => {
      flags.current.reduce = mq.matches;
      if (mq.matches) {
        // reduced motion: one static copy, wrapped by CSS
        setCopies(1);
        if (row.current) row.current.style.transform = '';
        return;
      }
      const unit = block.current?.scrollWidth ?? 0;
      state.current.unit = unit;
      setCopies(unit > 0 ? Math.max(3, Math.ceil(rowsEl.offsetWidth / unit) + 2) : 1);
    };

    const io = new IntersectionObserver(([e]) => { flags.current.inView = !!e?.isIntersecting; });
    io.observe(section);
    const enter = () => { flags.current.hovering = true; };
    const leave = () => { flags.current.hovering = false; };
    section.addEventListener('mouseenter', enter);
    section.addEventListener('mouseleave', leave);
    const ro = new ResizeObserver(layout);
    ro.observe(rowsEl);
    mq.addEventListener('change', layout);
    void document.fonts?.ready.then(layout);
    layout();

    return () => {
      io.disconnect();
      ro.disconnect();
      mq.removeEventListener('change', layout);
      section.removeEventListener('mouseenter', enter);
      section.removeEventListener('mouseleave', leave);
    };
  }, []);

  useAnimationFrame((_, delta) => {
    const f = flags.current, s = state.current;
    if (f.reduce || !f.inView || f.hovering || document.visibilityState !== 'visible' || !s.unit || !row.current) return;
    const dt = Math.min(0.064, delta / 1000);
    const vf = factor.get(), abs = Math.min(5, Math.abs(vf));
    if (abs > 0.1) s.cur = s.base * (vf >= 0 ? 1 : -1);
    s.x += s.cur * ((s.unit * velocity) / 100) * (1 + abs) * dt;
    row.current.style.transform = `translate3d(${-wrap(0, s.unit, s.x)}px,0,0)`;
  });

  const track = (i: number) => (
    <ul className="sm-track" key={i} ref={i === 0 ? block : undefined} aria-hidden={i === 0 ? undefined : 'true'}>
      {groups.map((g) => (
        <li className="sm-group" key={g.layer}>
          <em>{g.layer}</em>
          {g.tools.map((t) => <span className="sm-chip" key={t}>{t}</span>)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="sm-rows" ref={rows}>
      <div className="sm-row" data-dir={direction} data-velocity={velocity} ref={row}>
        {Array.from({ length: copies }, (_, i) => track(i))}
      </div>
    </div>
  );
}
