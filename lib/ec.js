// AXION OS — tiny dependency-free short-Weierstrass EC arithmetic (y^2 = x^3 + ax + b mod p).
// Points are [x, y] BigInt tuples; `null` is the point at infinity.

export const mod = (a, m) => {
  const r = a % m;
  return r >= 0n ? r : r + m;
};

export function modPow(base, exp, m) {
  let r = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
}

export function modInv(a, m) {
  let r0 = mod(a, m), r1 = m, s0 = 1n, s1 = 0n;
  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  if (r0 !== 1n) throw new Error('value not invertible');
  return mod(s0, m);
}

export function pointAdd(P, Q, c) {
  if (!P) return Q;
  if (!Q) return P;
  const { p, a } = c;
  let l;
  if (P[0] === Q[0]) {
    if (mod(P[1] + Q[1], p) === 0n) return null;
    l = mod((3n * P[0] * P[0] + a) * modInv(2n * P[1], p), p);
  } else {
    l = mod((Q[1] - P[1]) * modInv(Q[0] - P[0], p), p);
  }
  const x = mod(l * l - P[0] - Q[0], p);
  const y = mod(l * (P[0] - x) - P[1], p);
  return [x, y];
}

export function pointMul(k, P, c) {
  let R = null;
  let A = P;
  let e = k;
  if (e < 0n) throw new Error('negative scalar');
  while (e > 0n) {
    if (e & 1n) R = pointAdd(R, A, c);
    A = pointAdd(A, A, c);
    e >>= 1n;
  }
  return R;
}

export function onCurve(P, c) {
  if (!P) return true;
  const { p, a, b } = c;
  return mod(P[1] * P[1] - (P[0] * P[0] * P[0] + a * P[0] + b), p) === 0n;
}

export function samePoint(P, Q) {
  if (!P || !Q) return P === Q;
  return P[0] === Q[0] && P[1] === Q[1];
}

const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];

export function isProbablePrime(n) {
  if (n < 2n) return false;
  for (const sp of SMALL_PRIMES) {
    if (n === sp) return true;
    if (n % sp === 0n) return false;
  }
  let d = n - 1n, s = 0;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  outer: for (const a of SMALL_PRIMES) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 1; i < s; i++) {
      x = (x * x) % n;
      if (x === n - 1n) continue outer;
    }
    return false;
  }
  return true;
}

export const legendre = (a, p) => modPow(a, (p - 1n) / 2n, p);

// Tonelli–Shanks square root mod prime p. Returns null if no root exists.
export function sqrtMod(a, p) {
  a = mod(a, p);
  if (a === 0n) return 0n;
  if (legendre(a, p) !== 1n) return null;
  if (p % 4n === 3n) return modPow(a, (p + 1n) / 4n, p);
  let q = p - 1n, s = 0n;
  while ((q & 1n) === 0n) { q >>= 1n; s++; }
  let z = 2n;
  while (legendre(z, p) !== p - 1n) z++;
  let m = s, c = modPow(z, q, p), t = modPow(a, q, p), r = modPow(a, (q + 1n) / 2n, p);
  while (t !== 1n) {
    let i = 0n, t2 = t;
    while (t2 !== 1n) { t2 = (t2 * t2) % p; i++; }
    const b = modPow(c, 1n << (m - i - 1n), p);
    m = i; c = (b * b) % p; t = (t * c) % p; r = (r * b) % p;
  }
  return r;
}

export const hex = (n) => '0x' + n.toString(16);

export function parseScalar(v) {
  if (typeof v === 'bigint') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) throw new Error('empty scalar');
  if (/^0x[0-9a-f]+$/.test(s)) return BigInt(s);
  if (/^[0-9]+$/.test(s)) return BigInt(s);
  throw new Error('scalar must be decimal or 0x-hex');
}
