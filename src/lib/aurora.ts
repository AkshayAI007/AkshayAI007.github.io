/**
 * Hero aurora ribbons. v1 drew these with three.js r170 loaded from a CDN;
 * this is the same scene on raw WebGL — identical plane geometry, camera,
 * shader, colour handling and blend modes — so it renders the same frame
 * without shipping ~170 KB of library. The photo underneath remains the
 * fallback when WebGL is unavailable.
 *
 * Colours come from the live CSS tokens (--accent, --accent-2, --flag,
 * --ink-3), so the ribbons follow the theme toggle.
 */

const RIBBONS = 5;
const SPEED = 0.55;
const AMPLITUDE = 0.8;
const PLANE_W = 14;
const PLANE_H = 0.62;
const SEGMENTS = 160;

const VERT = `precision highp float;
attribute vec3 position; attribute vec2 uv;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const FRAG = `precision highp float;
uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity; varying vec2 vUv;
void main(){ vec3 c = mix(uColorA, uColorB, vUv.x);
  float along = sin(vUv.x * 3.14159265); float edge = sin(vUv.y * 3.14159265);
  gl_FragColor = vec4(c, along * pow(edge, 1.6) * uOpacity); }`;

/* ── column-major 4×4 helpers (three.js Matrix4 conventions) ─────────── */
type Mat4 = Float64Array; // three.js does its matrix math in doubles too

function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r]! * b[c * 4]! + a[4 + r]! * b[c * 4 + 1]! + a[8 + r]! * b[c * 4 + 2]! + a[12 + r]! * b[c * 4 + 3]!;
    }
  }
  return o;
}

/** Object3D matrix: translation × rotation (Euler order XYZ), unit scale. */
function compose(px: number, py: number, pz: number, rx: number, ry: number, rz: number): Mat4 {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  return new Float64Array([
    c * e, af + be * d, bf - ae * d, 0,
    -c * f, ae - bf * d, be + af * d, 0,
    d, -b * c, a * c, 0,
    px, py, pz, 1,
  ]);
}

/** Camera.lookAt(origin) → matrixWorldInverse (up = +Y). */
function viewMatrix(ex: number, ey: number, ez: number): Mat4 {
  let zx = ex, zy = ey, zz = ez;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  // x = up × z, up = (0,1,0)
  let xx = zz, xy = 0, xz = -zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;
  // y = z × x
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float64Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1,
  ]);
}

/** PerspectiveCamera.updateProjectionMatrix (zoom 1, no film offset). */
function perspective(fovDeg: number, aspect: number, near: number, far: number): Mat4 {
  const top = near * Math.tan((Math.PI / 180) * 0.5 * fovDeg);
  const height = 2 * top, width = aspect * height, left = -0.5 * width;
  const right = left + width, bottom = top - height;
  return new Float64Array([
    (2 * near) / (right - left), 0, 0, 0,
    0, (2 * near) / (top - bottom), 0, 0,
    (right + left) / (right - left), (top + bottom) / (top - bottom), -(far + near) / (far - near), -1,
    0, 0, (-2 * far * near) / (far - near), 0,
  ]);
}

/* ── colour: CSS token → linear-sRGB, as THREE.Color(css) does ───────── */
const toLinear = (c: number) => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));

function tokenColor(style: CSSStyleDeclaration, name: string, fallback: string): [number, number, number] {
  let v = style.getPropertyValue(name).trim() || fallback;
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) { ctx.fillStyle = fallback; ctx.fillStyle = v; v = ctx.fillStyle; }
  }
  if (!/^#[0-9a-f]{6}$/i.test(v)) {
    const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
    v = m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : fallback;
  }
  const n = parseInt(v.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

/* ── the scene ───────────────────────────────────────────────────────── */
interface Ribbon {
  pos: Float32Array;
  baseY: Float32Array;
  buffer: WebGLBuffer;
  phase: number;
  yOff: number;
  z: number;
  colorB: [number, number, number];
  opacity: number;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

export function mountAurora(host: HTMLElement, hero: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  const attrs: WebGLContextAttributes = {
    alpha: true, antialias: true, depth: true, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power',
  };
  const gl = (canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
  if (!gl) return; // photo fallback stays

  // Software-rendered WebGL (SwiftShader, llvmpipe — GPU-less VMs, blocklisted
  // drivers) renders on the CPU: animating it would starve the main thread.
  // There the ribbons hold the composed still frame reduced motion shows.
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const loc = {
    position: gl.getAttribLocation(program, 'position'),
    uv: gl.getAttribLocation(program, 'uv'),
    modelView: gl.getUniformLocation(program, 'modelViewMatrix'),
    projection: gl.getUniformLocation(program, 'projectionMatrix'),
    colorA: gl.getUniformLocation(program, 'uColorA'),
    colorB: gl.getUniformLocation(program, 'uColorB'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
  };

  // THREE.PlaneGeometry(14, 0.62, 160, 1): two rows of 161 vertices.
  const cols = SEGMENTS + 1;
  const count = cols * 2;
  const uvs = new Float32Array(count * 2);
  const template = new Float32Array(count * 3);
  for (let iy = 0; iy < 2; iy++) {
    const y = iy * PLANE_H - PLANE_H / 2;
    for (let ix = 0; ix < cols; ix++) {
      const k = iy * cols + ix;
      template[k * 3] = (ix * PLANE_W) / SEGMENTS - PLANE_W / 2;
      template[k * 3 + 1] = -y;
      uvs[k * 2] = ix / SEGMENTS;
      uvs[k * 2 + 1] = 1 - iy;
    }
  }
  const indices = new Uint16Array(SEGMENTS * 6);
  for (let ix = 0; ix < SEGMENTS; ix++) {
    const a = ix, b = ix + cols, c = ix + 1 + cols, d = ix + 1;
    indices.set([a, b, d, b, c, d], ix * 6);
  }
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const ribbons: Ribbon[] = [];
  for (let i = 0; i < RIBBONS; i++) {
    const pos = template.slice();
    const baseY = new Float32Array(count);
    for (let k = 0; k < count; k++) baseY[k] = pos[k * 3 + 1]!;
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    ribbons.push({
      pos, baseY, buffer,
      phase: (i / RIBBONS) * Math.PI * 2,
      yOff: (i - (RIBBONS - 1) / 2) * 0.3,
      z: (i - (RIBBONS - 1) / 2) * 0.7,
      colorB: [0, 0, 0],
      opacity: 0.5,
    });
  }

  const root = document.documentElement;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let colorA: [number, number, number] = [0, 0, 0];
  let additive = true;

  function applyTheme() {
    const cs = getComputedStyle(root);
    const dark = (root.getAttribute('data-theme') || 'dark') !== 'light';
    colorA = tokenColor(cs, '--accent', '#7f9dff');
    const accent2 = tokenColor(cs, '--accent-2', '#a9beff');
    const flag = tokenColor(cs, '--flag', '#e8724a');
    const ink = tokenColor(cs, '--ink-3', '#928979');
    ribbons.forEach((r, i) => {
      r.colorB = i === 2 ? flag : i % 2 ? ink : accent2;
      r.opacity = dark ? (i === 2 ? 0.3 : 0.36) : 0.32;
    });
    additive = dark;
  }

  // Group transform + camera, as v1 set them in resize().
  let group = { x: 2.0, y: 0.05, rz: -0.14 };
  let projection = perspective(38, 1, 0.1, 100);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    gl!.viewport(0, 0, Math.round(w * ratio), Math.round(h * ratio));
    // keep the ribbons filling narrow (mobile) heroes
    const narrow = w / h < 1;
    projection = perspective(narrow ? 46 : 38, w / h, 0.1, 100);
    group = narrow ? { x: 0, y: -2.2, rz: -0.22 } : { x: 2.0, y: 0.05, rz: -0.14 };
  }

  // gentle pointer parallax
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function draw(t: number) {
    for (const r of ribbons) {
      const { pos, baseY, phase, yOff } = r;
      for (let k = 0; k < count; k++) {
        const x = pos[k * 3]!;
        const wave = Math.sin(x * 0.5 + t * 0.8 + phase) * AMPLITUDE + Math.sin(x * 0.85 - t * 0.5 + phase * 1.7) * AMPLITUDE * 0.35;
        pos[k * 3 + 1] = baseY[k]! + wave + yOff;
        pos[k * 3 + 2] = Math.cos(x * 0.35 + t * 0.35 + phase) * 0.5;
      }
    }
    px += (tx - px) * 0.04;
    py += (ty - py) * 0.04;
    const view = viewMatrix(px * 0.6, 0.4 - py * 0.35, 7.5);
    const groupMatrix = compose(group.x, group.y, 0, -0.12, 0, group.rz);

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.disable(gl!.DEPTH_TEST); // three: depthTest on, depthWrite off → every fragment passes
    gl!.enable(gl!.BLEND);
    gl!.blendEquation(gl!.FUNC_ADD);
    if (additive) gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE);
    else gl!.blendFuncSeparate(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA, gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.enable(gl!.CULL_FACE);
    gl!.uniformMatrix4fv(loc.projection, false, Float32Array.from(projection));
    gl!.uniform3fv(loc.colorA, colorA);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, uvBuffer);
    gl!.enableVertexAttribArray(loc.uv);
    gl!.vertexAttribPointer(loc.uv, 2, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Transparent objects are drawn back to front (the farthest ribbon is i = 0),
    // and DoubleSide transparent materials in two passes: back faces, then front.
    for (const r of ribbons) {
      gl!.bindBuffer(gl!.ARRAY_BUFFER, r.buffer);
      gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, r.pos);
      gl!.enableVertexAttribArray(loc.position);
      gl!.vertexAttribPointer(loc.position, 3, gl!.FLOAT, false, 0, 0);
      gl!.uniformMatrix4fv(loc.modelView, false, Float32Array.from(multiply(view, multiply(groupMatrix, compose(0, 0, r.z, 0, 0, 0)))));
      gl!.uniform3fv(loc.colorB, r.colorB);
      gl!.uniform1f(loc.opacity, r.opacity);
      for (const face of [gl!.FRONT, gl!.BACK]) {
        gl!.cullFace(face);
        gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0);
      }
    }
  }

  let lastT = 0;
  let running = false, visible = false, raf = 0, clockStart = performance.now(), pausedAt = performance.now();

  const loop = (now: number) => {
    lastT = ((now - clockStart) / 1000) * SPEED;
    draw(lastT);
    raf = requestAnimationFrame(loop);
  };

  function sync() {
    const should = visible && !document.hidden && !reduceQuery.matches && !software;
    if (should && !running) {
      running = true;
      clockStart += performance.now() - pausedAt;
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      pausedAt = performance.now();
      cancelAnimationFrame(raf);
    }
  }

  applyTheme();
  new MutationObserver(() => {
    applyTheme();
    if (!running) draw(lastT);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  host.appendChild(canvas);
  new ResizeObserver(() => {
    resize();
    if (!running) draw(lastT);
  }).observe(host);
  resize();

  new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    sync();
  }).observe(hero);
  document.addEventListener('visibilitychange', sync);
  reduceQuery.addEventListener('change', () => {
    sync();
    if (!running) draw(lastT);
  });
  canvas.addEventListener('webglcontextlost', () => {
    running = false;
    cancelAnimationFrame(raf);
  });

  draw(2.2); // a composed still frame for reduced motion
  lastT = 2.2;
  host.classList.add('is-live');
  hero.classList.add('has-aurora');
}
