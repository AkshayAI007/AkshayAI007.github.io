/* ═══════════════════════════════════════════════════════════════════════
   Beams background — site-wide ambient layer.
   Plain-JS port of the React "BeamsBackground" component: soft, blurred
   light beams drifting upward on a fixed canvas behind every page.

   · Tinted to the site's blue accent range; quieter on the light theme.
   · Renders at a fraction of screen resolution (the blur hides it) so the
     full-viewport layer stays cheap. Capped at ~40fps.
   · Pauses when the tab is hidden; a still frame for reduced motion.
   · Included by index.html and every page in /projects.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__abBeams) return;
  window.__abBeams = true;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var canvas = document.createElement('canvas');
  canvas.className = 'ab-beams';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var style = document.createElement('style');
  style.textContent =
    '.ab-beams{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;' +
    'opacity:0;transition:opacity 1.6s ease;filter:blur(6px) saturate(120%)}' +
    '.ab-beams.is-live{opacity:1}' +
    ':root[data-theme="light"] .ab-beams.is-live{opacity:.8}' +
    /* the beams sit on <html>'s ground, so page-level grounds become see-through
       and full-width panel bands turn translucent; small widgets stay solid */
    'html.has-beams body,html.has-beams .index-page,html.has-beams .detail-page,html.has-beams .public-work,html.has-beams .explorer{background:transparent!important}' +
    'html.has-beams .beliefs,html.has-beams .evaluation-lab,html.has-beams .case-architecture{background:color-mix(in srgb,var(--panel) 55%,transparent)!important}' +
    'html.has-beams .hero-ambient{display:none}';
  document.head.appendChild(style);

  var SCALE = 0.35;          // backing-store resolution vs CSS pixels
  var COUNT = 30;
  var W = 0, H = 0, beams = [];

  function isDark() { return (root.getAttribute('data-theme') || 'dark') !== 'light'; }

  function makeBeam(i, fresh) {
    var b = {
      angle: -35 + Math.random() * 10,
      width: (fresh ? 30 + Math.random() * 60 : 100 + Math.random() * 100),
      speed: (fresh ? 0.6 + Math.random() * 1.2 : 0.5 + Math.random() * 0.4),
      opacity: (fresh ? 0.12 + Math.random() * 0.16 : 0.2 + Math.random() * 0.1),
      hue: 205 + (i * 45) / COUNT + Math.random() * 6,   // cyan-blue → periwinkle, around --accent
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    };
    return b;
  }

  function placeFresh(b) {
    b.x = Math.random() * W * 1.5 - W * 0.25;
    b.y = Math.random() * H * 1.5 - H * 0.25;
    b.length = H * 2.5;
  }

  function reset(b, i) {
    var col = i % 3, spacing = W / 3;
    b.y = H + 100;
    b.x = col * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
    b.width = 100 + Math.random() * 100;
    b.speed = 0.5 + Math.random() * 0.4;
    b.hue = 205 + (i * 45) / COUNT;
    b.opacity = 0.2 + Math.random() * 0.1;
    b.length = H * 2.5;
  }

  function resize() {
    W = Math.max(1, Math.round(window.innerWidth));
    H = Math.max(1, Math.round(window.innerHeight));
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    beams = [];
    for (var i = 0; i < COUNT; i++) { var b = makeBeam(i, true); placeFresh(b); beams.push(b); }
  }

  function draw(step) {
    var dark = isDark();
    var sat = dark ? 85 : 70, light = dark ? 65 : 52;
    ctx.clearRect(0, 0, W, H);
    ctx.filter = 'blur(' + Math.round(35 * SCALE) + 'px)';
    for (var i = 0; i < beams.length; i++) {
      var b = beams[i];
      if (step) {
        b.y -= b.speed * step;
        b.pulse += b.pulseSpeed * step;
        if (b.y + b.length < -100) reset(b, i);
      }
      var o = b.opacity * (0.8 + Math.sin(b.pulse) * 0.2) * (dark ? 1.7 : 1.2);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle * Math.PI / 180);
      var g = ctx.createLinearGradient(0, 0, 0, b.length);
      var c = 'hsla(' + b.hue.toFixed(1) + ',' + sat + '%,' + light + '%,';
      g.addColorStop(0, c + '0)');
      g.addColorStop(0.1, c + (o * 0.5) + ')');
      g.addColorStop(0.4, c + o + ')');
      g.addColorStop(0.6, c + o + ')');
      g.addColorStop(0.9, c + (o * 0.5) + ')');
      g.addColorStop(1, c + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(-b.width / 2, 0, b.width, b.length);
      ctx.restore();
    }
    ctx.filter = 'none';
  }

  var raf = 0, last = 0, running = false, FRAME = 1000 / 40;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME) return;
    var step = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;   // speeds are per 60fps frame
    last = now;
    draw(step);
  }
  function sync() {
    var should = !document.hidden && !reduce.matches;
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    if (!running) draw(0);
  }

  function start() {
    document.body.insertBefore(canvas, document.body.firstChild);
    root.classList.add('has-beams');
    resize();
    draw(0);
    requestAnimationFrame(function () { canvas.classList.add('is-live'); });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { resize(); if (!running) draw(0); }, 120); });
    document.addEventListener('visibilitychange', sync);
    if (reduce.addEventListener) reduce.addEventListener('change', sync);
    new MutationObserver(function () { if (!running) draw(0); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    sync();
  }

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
