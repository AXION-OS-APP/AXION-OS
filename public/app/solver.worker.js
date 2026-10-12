// AXION OS — baby-step giant-step ECDLP solver (runs in a Web Worker).
// Finds k in [lo, hi) with k·G = Q on y^2 = x^3 + ax + b over F_p.
const mod = (a, m) => { const r = a % m; return r >= 0n ? r : r + m; };
function inv(a, m) {
  let r0 = mod(a, m), r1 = m, s0 = 1n, s1 = 0n;
  while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return mod(s0, m);
}
let P, A;
function add(X, Y) {
  if (!X) return Y; if (!Y) return X;
  let l;
  if (X[0] === Y[0]) {
    if (mod(X[1] + Y[1], P) === 0n) return null;
    l = mod((3n * X[0] * X[0] + A) * inv(2n * X[1], P), P);
  } else l = mod((Y[1] - X[1]) * inv(Y[0] - X[0], P), P);
  const x = mod(l * l - X[0] - Y[0], P);
  return [x, mod(l * (X[0] - x) - X[1], P)];
}
const neg = (X) => (X ? [X[0], mod(-X[1], P)] : null);
function mul(k, X) { let R = null; while (k > 0n) { if (k & 1n) R = add(R, X); X = add(X, X); k >>= 1n; } return R; }

self.onmessage = (e) => {
  const d = e.data;
  P = BigInt(d.p); A = BigInt(d.a);
  const G = [BigInt(d.gx), BigInt(d.gy)], Q = [BigInt(d.qx), BigInt(d.qy)];
  const lo = 1n << BigInt(d.bits - 1), hi = 1n << BigInt(d.bits);
  const span = hi - lo;
  let m = 1n; while (m * m < span) m <<= 1n; // m = 2^ceil(bits/2)
  const M = Number(m);
  const t0 = performance.now();
  const MASK = (1n << 48n) - 1n;
  const table = new Map();
  // Baby steps: j·G for j in [0, m)
  let cur = null;
  for (let j = 0; j < M; j++) {
    if (cur) { const key = Number(cur[0] & MASK); if (!table.has(key)) table.set(key, j); }
    cur = add(cur, G);
    if ((j & 8191) === 0) self.postMessage({ type: 'progress', phase: 'baby', pct: (j / M) * 50, steps: j });
  }
  // Giant steps: T = Q - lo·G - i·m·G
  const step = neg(mul(m, G));
  let T = add(Q, neg(mul(lo, G)));
  for (let i = 0; i <= M; i++) {
    if (!T) { done(lo + BigInt(i) * m); return; }
    const j = table.get(Number(T[0] & MASK));
    if (j !== undefined) {
      const J = mul(BigInt(j), G);
      for (const k of [lo + BigInt(i) * m + BigInt(j), lo + BigInt(i) * m - BigInt(j)]) {
        const R = mul(k, G);
        if (R && R[0] === Q[0] && R[1] === Q[1]) { done(k); return; }
      }
      void J;
    }
    T = add(T, step);
    if ((i & 8191) === 0) self.postMessage({ type: 'progress', phase: 'giant', pct: 50 + (i / M) * 50, steps: M + i });
  }
  self.postMessage({ type: 'fail', ms: performance.now() - t0 });

  function done(k) {
    self.postMessage({ type: 'found', k: '0x' + k.toString(16), dec: k.toString(), ms: Math.round(performance.now() - t0), tableSize: table.size });
  }
};
