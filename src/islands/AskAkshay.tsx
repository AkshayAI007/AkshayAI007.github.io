import { useCallback, useEffect, useRef, useState } from 'react';
import { ASK_INTRO, ASK_PROMPTS, answer } from '@/lib/ask';
import { trapFocus } from '@/lib/focus';

/**
 * The "Ask Akshay" panel. Server-rendered closed (and `inert`, so it's out of
 * the tab order); hydrated by `client:ask` when a visitor reaches for any
 * `[data-ask-open]` trigger — the header button or the floating one.
 */
export default function AskAkshay() {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState<string>(ASK_INTRO);
  const [active, setActive] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const isOpen = useRef(false);

  const show = useCallback((from: Element | null) => {
    opener.current = from ?? document.activeElement;
    isOpen.current = true;
    setOpen(true);
  }, []);

  // Closing hands focus back to whatever opened the panel.
  const hide = useCallback(() => {
    if (!isOpen.current) return;
    isOpen.current = false;
    setOpen(false);
    const back = opener.current;
    opener.current = null;
    if (back instanceof HTMLElement && document.body.contains(back)) requestAnimationFrame(() => back.focus());
  }, []);

  // Triggers live outside the island (header, floating button): delegate.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target.closest('[data-ask-open]') : null;
      if (t) show(t);
    };
    document.addEventListener('click', onClick);
    if (window.__askQueued) {
      show(window.__askQueued);
      delete window.__askQueued;
    }
    // Tell client:ask this handler is live, so it stops queueing clicks.
    window.dispatchEvent(new Event('ask:ready'));
    return () => document.removeEventListener('click', onClick);
  }, [show]);

  // Opening moves focus into the panel once it is no longer inert.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
  }, [open]);

  // Escape closes and Tab stays inside — unless the mobile menu is on top.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.getElementById('mobileMenu')?.classList.contains('open') || !panel.current) return;
      if (e.key === 'Tab') trapFocus(panel.current, e);
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

  return (
    <aside
      className={open ? 'chat-panel open' : 'chat-panel'}
      id="chatPanel"
      role="dialog"
      aria-modal="false"
      aria-label="Portfolio intelligence assistant"
      inert={!open}
      ref={panel}
    >
      <div className="chat-head">
        <div><span className="agent-status"></span><strong>PORTFOLIO INTELLIGENCE</strong><small>GROUNDED IN VERIFIED EXPERIENCE</small></div>
        <button id="chatCloseBtn" aria-label="Close portfolio assistant" onClick={hide}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="chat-answer" aria-live="polite">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"></path></svg>
        <p id="chatAnswerText">{reply}</p>
      </div>
      <div className="chat-prompts" id="chatPrompts">
        {ASK_PROMPTS.map(({ label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={active === label}
            data-prompt={label}
            onClick={() => {
              const text = answer(label);
              if (!text) return;
              setActive(label);
              setReply(text);
            }}
          >
            {label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        ))}
      </div>
      <a href="/reach">
        CONTINUE THE CONVERSATION{' '}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </a>
    </aside>
  );
}
