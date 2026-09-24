import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

/**
 * Impact deck: four measured outcomes, one instrument on stage at a time,
 * auto-advancing while in view (paused on hover/focus, off under reduced
 * motion). React owns selection and ARIA state; each instrument's animation
 * runs imperatively on its panel, as in v1, so re-selecting a panel restarts
 * its CSS transitions from the top.
 *
 * Server-rendered in its initial state (first panel active, not yet played),
 * which is exactly what v1 painted before its script ran.
 */

type Kind = 'queue' | 'stream' | 'grid' | 'ads';

const TABS = [
  { label: 'Service queue · Voice AI', value: '2 days → 3 min' },
  { label: 'Time to first token · ReAct agent', value: '<3s' },
  { label: 'Output accuracy · hybrid RAG', value: '>95%' },
  { label: 'Ad delivery · Google & Meta agent', value: 'days → <10 min' },
] as const;
const KINDS: Kind[] = ['queue', 'stream', 'grid', 'ads'];

const STREAM_ANSWER =
  'Paid search held steady. Organic calls fell after the Google listing lost its opening hours — restore the listing first, then re-check call tracking in 7 days.';
/** 10×10 graded answers; cells are staggered along the diagonal. */
const RAG_MISSES = new Set([23, 47, 71, 88]);

const v = (name: string, value: number) => ({ [name]: value }) as CSSProperties;
const pad = (n: number) => String(n + 1).padStart(2, '0');

export default function ImpactDeck() {
  const reduce = useRef(false);
  const [current, setCurrent] = useState(0);
  // Re-selecting the current tab must still replay it; React skips same-value updates.
  const [, replay] = useReducer((n: number) => n + 1, 0);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(true);
  const inView = useRef(false);
  const hovering = useRef(false);
  const manual = useRef(false);
  const started = useRef(false);
  const timers = useRef<number[]>([]);
  const deck = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const pending = useRef<{ index: number; focus: boolean } | null>(null);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Step a number through a sequence of values, then settle on the final one. */
  const steps = (el: HTMLElement | null, start: number, gap: number) => {
    if (!el || reduce.current) return;
    const final = el.dataset.final ?? (el.dataset.final = el.textContent ?? '');
    const seq = el.dataset.steps!.split('|');
    el.textContent = seq[0]!;
    seq.forEach((s, i) => later(() => { el.textContent = s; }, start + i * gap));
    later(() => { el.textContent = final; }, start + seq.length * gap);
  };

  const players: Record<Kind, (p: HTMLElement) => void> = {
    queue: (p) => steps(p.querySelector('[data-steps]'), 420, 230),
    ads: (p) => steps(p.querySelector('[data-steps]'), 420, 260),
    grid: (p) => {
      p.querySelectorAll<HTMLElement>('.vr-pipe li').forEach((li, i) => li.style.setProperty('--s', String(i)));
      const el = p.querySelector<HTMLElement>('[data-to]')!;
      if (reduce.current) return;
      const end = Number(el.dataset.to), t0 = performance.now() + 700, dur = 1500;
      const tick = (now: number) => {
        if (!p.classList.contains('is-active')) return;
        const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        el.textContent = `${el.dataset.prefix}${Math.round(end * e)}${el.dataset.suffix}`;
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = `${el.dataset.prefix}0${el.dataset.suffix}`;
      requestAnimationFrame(tick);
    },
    stream: (p) => {
      const clock = p.querySelector<HTMLElement>('.vs-clock')!;
      const ruler = p.querySelector<HTMLElement>('.vs-ruler b')!;
      const tools = [...p.querySelectorAll<HTMLElement>('.vs-tools span')];
      const out = p.querySelector<HTMLElement>('.vs-text')!;
      tools.forEach((t) => t.classList.remove('on'));
      out.textContent = '';
      if (reduce.current) {
        tools.forEach((t) => t.classList.add('on'));
        out.textContent = STREAM_ANSWER;
        clock.textContent = 'first token < 3s';
        ruler.style.setProperty('--t', '52%');
        return;
      }
      const FIRST = 2600, t0 = performance.now();
      clock.textContent = '0.0s';
      ruler.style.setProperty('--t', '0%');
      const tick = (now: number) => {
        if (!p.classList.contains('is-active')) return;
        const ms = Math.min(FIRST, now - t0);
        clock.textContent = `${(ms / 1000).toFixed(1)}s`;
        ruler.style.setProperty('--t', `${(ms / 5000) * 100}%`);
        if (ms < FIRST) requestAnimationFrame(tick);
        else clock.textContent = 'first token · < 3s';
      };
      requestAnimationFrame(tick);
      tools.forEach((t, i) => later(() => t.classList.add('on'), 350 + i * 420));
      STREAM_ANSWER.split(' ').forEach((w, i) => later(() => { out.textContent += (i ? ' ' : '') + w; }, FIRST + i * 70));
    },
  };

  const select = useCallback((i: number, focus = false) => {
    clear();
    pending.current = { index: (i + TABS.length) % TABS.length, focus };
    setCurrent(pending.current.index);
    replay();
  }, []);

  // After React has toggled aria-selected/hidden: restart the panel's
  // transitions, play its instrument and restart the dwell bar.
  useLayoutEffect(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    panels.current.forEach((p) => p?.classList.remove('is-active', 'is-played'));
    const p = panels.current[job.index]!;
    void p.offsetWidth; // restart CSS transitions
    p.classList.add('is-active');
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-played')));
    players[KINDS[job.index]!](p);
    const bar = tabs.current[job.index]?.querySelector<HTMLElement>('.it-progress');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    }
    if (job.focus) tabs.current[job.index]?.focus();
  });

  const syncPause = () => setPaused(!inView.current || hovering.current);
  const takeOver = () => {
    manual.current = true;
    setAuto(false);
  };

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAuto(!reduce.current);
    const io = new IntersectionObserver(([en]) => {
      inView.current = !!en?.isIntersecting;
      syncPause();
      if (inView.current && !started.current) {
        started.current = true;
        select(0);
      }
    }, { threshold: 0.35 });
    io.observe(deck.current!);
    return () => {
      io.disconnect();
      clear();
    };
  }, [select]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      takeOver();
      select(e.key === 'Home' ? 0 : TABS.length - 1, true);
      return;
    }
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    takeOver();
    select(current + step, true);
  };

  const hover = (on: boolean) => () => {
    hovering.current = on;
    syncPause();
  };

  return (
    <div
      className={`impact-deck${auto ? ' is-auto' : ''}${paused ? ' is-paused' : ''}`}
      id="impactDeck"
      ref={deck}
      onMouseEnter={hover(true)}
      onMouseLeave={hover(false)}
      onFocus={hover(true)}
      onBlur={hover(false)}
    >
      <div className="impact-tabs" role="tablist" aria-label="Measured outcomes">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className="impact-tab"
            role="tab"
            id={`impTab${i}`}
            aria-controls={`impPanel${i}`}
            aria-selected={i === current}
            tabIndex={i === current ? 0 : -1}
            ref={(el) => { tabs.current[i] = el; }}
            onClick={() => { takeOver(); select(i); }}
            onKeyDown={onKey}
          >
            <span className="it-idx">{pad(i)}</span>
            <span className="it-label">{t.label}</span>
            <span className="it-value">{t.value}</span>
            <i className="it-progress" aria-hidden="true" onAnimationEnd={() => { if (auto && !manual.current) select(current + 1); }}></i>
          </button>
        ))}
      </div>

      <div className="impact-stage">
        {/* className is static on purpose: selection classes are driven imperatively (see useLayoutEffect). */}
        <div className="impact-panel is-active" role="tabpanel" id="impPanel0" aria-labelledby="impTab0" data-kind="queue" hidden={current !== 0} ref={(el) => { panels.current[0] = el; }}>
          <p className="ip-kicker">Service-queue latency &middot; multi-agent voice care</p>
          <p className="ip-value"><s>2 days</s><span className="ip-arrow" aria-hidden="true">&rarr;</span><strong data-steps="2 days|1 day|12 h|3 h|40 min|3 min">3 min</strong></p>
          <div className="viz-hours" aria-hidden="true">
            <div className="vh-bars">
              {Array.from({ length: 48 }, (_, h) => <i key={h} style={v('--h', h)}></i>)}
              <b className="vh-now"><span>now &middot; 3 min</span></b>
            </div>
            <div className="vh-axis"><em>0 h</em><em>each outline = one hour of the old queue</em><em>48 h</em></div>
          </div>
          <ul className="ip-chips"><li><b>&minus;99.9%</b> queue latency</li><li><b>87.5%</b> faster fulfilment</li></ul>
        </div>

        <div className="impact-panel" role="tabpanel" id="impPanel1" aria-labelledby="impTab1" data-kind="stream" hidden={current !== 1} ref={(el) => { panels.current[1] = el; }}>
          <p className="ip-kicker">Time to first token &middot; ReAct agent</p>
          <p className="ip-value"><strong>&lt;3s</strong></p>
          <div className="viz-stream" aria-hidden="true">
            <div className="vs-bar"><span>agent.run()</span><span className="vs-clock">0.0s</span></div>
            <p className="vs-q">&rsaquo; Why did this dental clinic&rsquo;s inbound calls drop this month?</p>
            <p className="vs-tools"><span>crm</span><span>ads</span><span>reviews</span><span>listings</span><span>web</span></p>
            <p className="vs-out"><span className="vs-text"></span><i className="vs-caret"></i></p>
            <div className="vs-ruler"><i><b></b><u><span>3s budget</span></u></i><span><em>0s</em><em>1</em><em>2</em><em>3</em><em>4</em><em>5s</em></span></div>
          </div>
          <ul className="ip-chips"><li><b>3M+</b> US SMBs</li><li><b>10</b> tools</li><li><b>10</b> data sources</li></ul>
        </div>

        <div className="impact-panel" role="tabpanel" id="impPanel2" aria-labelledby="impTab2" data-kind="grid" hidden={current !== 2} ref={(el) => { panels.current[2] = el; }}>
          <p className="ip-kicker">Output accuracy &middot; hybrid retrieval</p>
          <p className="ip-value"><strong data-to="95" data-prefix=">" data-suffix="%">&gt;95%</strong></p>
          <div className="viz-rag" aria-hidden="true">
            <ol className="vr-pipe"><li>Query</li><li>Keyword + vector</li><li>Re-rank</li><li>Grounded answer</li></ol>
            <div className="vr-grid">
              {Array.from({ length: 100 }, (_, k) => <i key={k} className={RAG_MISSES.has(k) ? 'miss' : undefined} style={v('--d', Math.floor(k / 10) + (k % 10))}></i>)}
            </div>
            <p className="vr-legend"><span><i></i>correct</span><span><i className="miss"></i>miss</span></p>
          </div>
          <ul className="ip-chips"><li><b>Hybrid</b> search</li><li><b>Re-ranked</b> over SMB records</li></ul>
        </div>

        <div className="impact-panel" role="tabpanel" id="impPanel3" aria-labelledby="impTab3" data-kind="ads" hidden={current !== 3} ref={(el) => { panels.current[3] = el; }}>
          <p className="ip-kicker">Ad delivery &middot; Google &amp; Meta ads agent</p>
          <p className="ip-value"><s>days</s><span className="ip-arrow" aria-hidden="true">&rarr;</span><strong data-steps="days|1 day|6 h|1 h|<10 min">&lt;10 min</strong></p>
          <div className="viz-ads" aria-hidden="true">
            {(['before', 'after'] as const).map((row) => (
              <div key={row} className={`va-row va-${row}`}>
                <em>{row === 'before' ? 'Before' : 'Agent'}</em>
                <div className="va-track">
                  {['Brief', 'Creative', 'Audience', 'Launch'].flatMap((stage, k) => [
                    ...(k ? [<i key={`g${k}`} className="va-gap"></i>] : []),
                    <span key={stage} style={v('--k', k)}>{stage}</span>,
                  ])}
                </div>
                <small>{row === 'before' ? 'days of manual hand-offs' : <>one run &middot; &lt;10 min</>}</small>
              </div>
            ))}
          </div>
          <ul className="ip-chips"><li><b>2,000+</b> SMB ad accounts</li><li><b>Google</b> + <b>Meta</b></li></ul>
        </div>
      </div>
    </div>
  );
}
