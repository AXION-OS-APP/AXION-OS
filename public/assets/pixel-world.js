// AXION OS — pixel-world canvas scenes (shared by landing and app).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function fit(canvas, h) {
  const w = canvas.clientWidth || 300;
  const hh = h || canvas.clientHeight || w;
  const s = 1; // draw at CSS resolution; pixels are drawn as blocks anyway
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(hh * s);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { ctx, w: canvas.width, h: canvas.height };
}

export function loop(el, fn, fps = 30) {
  let visible = true, last = 0;
  if ('IntersectionObserver' in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(el);
  const step = (t) => {
    if (visible && t - last > 1000 / fps) { last = t; fn(t); }
    if (!reduce) requestAnimationFrame(step);
  };
  fn(0);
  if (!reduce) requestAnimationFrame(step);
}

// Cheap deterministic value noise.
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ---------------- rotating pixel planet ---------------- */
export function planet(canvas, getTone = () => 'ok') {
  let S = fit(canvas);
  addEventListener('resize', () => { S = fit(canvas); });
  const stars = Array.from({ length: 60 }, (_, i) => [hash(i, 1), hash(i, 2), hash(i, 3)]);
  loop(canvas, (t) => {
    const { ctx, w, h } = S;
    const cell = Math.max(4, Math.round(w / 56));
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, w, h);
    for (const [x, y, b] of stars) {
      ctx.fillStyle = b > .85 && Math.sin(t / 300 + x * 50) > .3 ? '#e8ecff' : '#3a3f66';
      ctx.fillRect(Math.floor(x * cols) * cell, Math.floor(y * rows) * cell, cell / 2, cell / 2);
    }
    const tone = getTone();
    const sea = '#12305e', sea2 = '#1a4785';
    const land = tone === 'crit' ? ['#7a1f2b', '#ff4a5a'] : tone === 'warn' ? ['#7a5a12', '#ffc23d'] : ['#2f7a1f', '#8dff4a'];
    const R = Math.min(cols, rows) * 0.36, cx = cols / 2, cy = rows / 2, rot = t * 0.00012;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const dx = (i + .5 - cx) / R, dy = (j + .5 - cy) / R, d2 = dx * dx + dy * dy;
      if (d2 > 1) {
        if (d2 < 1.18 && d2 > 1.0) { ctx.fillStyle = 'rgba(61,217,255,.35)'; ctx.fillRect(i * cell, j * cell, cell, cell); }
        continue;
      }
      const z = Math.sqrt(1 - d2);
      const lon = Math.atan2(dx, z) + rot * Math.PI * 2, lat = Math.asin(dy);
      const n = noise(lon * 2.2 + 10, lat * 3.1 + 4) * .7 + noise(lon * 6, lat * 6) * .3;
      const light = (-dx * .6 - dy * .5 + z * .7);
      let col;
      if (Math.abs(lat) > 1.25) col = '#dfe8ff';
      else if (n > .55) col = light > .35 ? land[1] : land[0];
      else col = light > .35 ? sea2 : sea;
      ctx.fillStyle = col; ctx.fillRect(i * cell, j * cell, cell, cell);
      if (light < -.05) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(i * cell, j * cell, cell, cell); }
    }
    // orbiting satellite (a tiny chip)
    const a = t * 0.0011, ox = cx + Math.cos(a) * R * 1.35, oy = cy + Math.sin(a) * R * 0.45;
    if (Math.sin(a) > -0.2 || Math.hypot(ox - cx, oy - cy) > R) {
      ctx.fillStyle = '#3dd9ff'; ctx.fillRect(Math.round(ox) * cell, Math.round(oy) * cell, cell * 2, cell);
      ctx.fillStyle = '#ffc23d'; ctx.fillRect(Math.round(ox) * cell + cell / 2, Math.round(oy) * cell - cell / 2, cell, cell / 2);
    }
  }, 20);
}

/* ---------------- side-scrolling pixel world ---------------- */
export function world(canvas) {
  let S = fit(canvas);
  addEventListener('resize', () => { S = fit(canvas); });
  const P = 4; // world pixel size
  loop(canvas, (t) => {
    const { ctx, w, h } = S;
    const W = Math.ceil(w / P), H = Math.ceil(h / P);
    const px = (x, y, c, ww = 1, hh = 1) => { ctx.fillStyle = c; ctx.fillRect(x * P, y * P, ww * P, hh * P); };
    // sky bands
    const bands = ['#070814', '#0b0d22', '#10133a', '#171a4f', '#22205e', '#33246a'];
    for (let y = 0; y < H; y++) px(0, y, bands[Math.min(bands.length - 1, Math.floor((y / H) * bands.length * 1.1))], W, 1);
    // stars
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(hash(i, 7) * W), y = Math.floor(hash(i, 9) * H * .55);
      if (Math.sin(t / 400 + i) > -.6) px(x, y, i % 9 ? '#4a5088' : '#e8ecff');
    }
    // moon
    const mx = Math.floor(W * .82), my = Math.floor(H * .18);
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) px(mx + x, my + y, (x + 2) * (x + 2) + (y - 1) * (y - 1) < 30 ? '#f3f0d8' : '#a9a68c');
    const off = t * 0.004;
    // far mountains
    for (let x = 0; x < W; x++) {
      const m = Math.floor(H * .55 - noise((x + off * 2) * .04, 1) * H * .25);
      px(x, m, '#1c1d4a', 1, H - m);
    }
    // city skyline with blinking windows
    const sp = off * 5;
    for (let x = 0; x < W; x++) {
      const bx = Math.floor((x + sp) / 7);
      const bh = Math.floor(8 + hash(bx, 3) * H * .32);
      const top = H - 10 - bh;
      px(x, top, '#11132e', 1, H - top);
      const lx = Math.floor(x + sp) % 7;
      if (lx === 0) px(x, top, '#0a0b14', 1, H - top);
      else if (lx % 2 === 0) for (let y = top + 2; y < H - 12; y += 3) {
        if (hash(bx * 13 + lx, y) > .62 && Math.sin(t / 900 + bx + y) > -.7) px(x, y, hash(bx, y) > .8 ? '#ff4fd8' : '#ffc23d');
      }
      if (hash(bx, 5) > .82 && lx === 3) { px(x, top - 4, '#3a3f66', 1, 4); if (Math.sin(t / 250 + bx) > 0) px(x, top - 5, '#ff4a5a'); }
    }
    // ground: circuit-board terrain
    const gy = H - 10;
    px(0, gy, '#1e7fa8', W, 1);
    px(0, gy + 1, '#0e1020', W, 9);
    const gs = off * 12;
    for (let x = 0; x < W; x++) {
      const k = Math.floor(x + gs);
      if (k % 12 === 0) px(x, gy + 3, '#2b3466', 6, 1);
      if (k % 18 === 5) px(x, gy + 6, '#2b3466', 1, 3);
      if (k % 24 === 9) px(x, gy + 5, '#ffc23d', 1, 1);
    }
    // walking pixel robot (original mascot "AXI")
    const rx = Math.floor(W * .2), ry = gy - 9, f = Math.floor(t / 180) % 2;
    const body = [
      '..cccc..', '.cwwwwc.', '.cwkwkc.', '.cwwwwc.', '..cccc..', '.gggggg.', 'gg.ll.gg', '..g..g..', f ? '.g....g.' : '..g..g..',
    ];
    const pal = { c: '#3dd9ff', w: '#e8ecff', k: '#0a0b14', g: '#8a90b8', l: '#8dff4a' };
    body.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) px(rx + x, ry + y, pal[ch]); }));
    // floating data packets
    for (let i = 0; i < 6; i++) {
      const x = Math.floor((hash(i, 11) * W - t * 0.01 * (1 + i % 3)) % W + W) % W;
      const y = Math.floor(H * .3 + hash(i, 12) * H * .2 + Math.sin(t / 500 + i) * 2);
      px(x, y, i % 2 ? '#8dff4a' : '#3dd9ff', 2, 2);
    }
  }, 24);
}
