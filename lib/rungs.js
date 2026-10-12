// AXION OS — canary rung registry.
// Training rungs: small custom curves whose secret scalar is derived from AXION_SEED (solvable on purpose).
// Armed rungs: standard curves with a public point derived by hash-to-curve, so NOBODY knows its scalar.
import crypto from 'node:crypto';
import { mod, pointMul, onCurve, samePoint, isProbablePrime, legendre, sqrtMod, hex, parseScalar } from './ec.js';

export const DEV_SEED = 'axion-os-dev-seed-change-me';
const SEED = process.env.AXION_SEED || DEV_SEED;
export const usingDevSeed = SEED === DEV_SEED;

const H = (...parts) => BigInt('0x' + crypto.createHash('sha256').update(parts.join('|')).digest('hex'));
const HM = (...parts) => BigInt('0x' + crypto.createHmac('sha256', SEED).update(parts.join('|')).digest('hex'));

const STANDARD = {
  secp192r1: {
    p: 'fffffffffffffffffffffffffffffffeffffffffffffffff',
    a: 'fffffffffffffffffffffffffffffffefffffffffffffffc',
    b: '64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1',
    gx: '188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012',
    gy: '07192b95ffc8da78631011ed6b24cdd573f977a11e794811',
    n: 'ffffffffffffffffffffffff99def836146bc9b1b4d22831',
  },
  secp224r1: {
    p: 'ffffffffffffffffffffffffffffffff000000000000000000000001',
    a: 'fffffffffffffffffffffffffffffffefffffffffffffffffffffffe',
    b: 'b4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4',
    gx: 'b70e0cbd6bb4bf7f321390b94a03c1d356c21122343280d6115c1d21',
    gy: 'bd376388b5f723fb4c22dfe6cd4375a05a07476444d5819985007e34',
    n: 'ffffffffffffffffffffffffffff16a2e0b8f03e13dd29455c5c2a3d',
  },
  secp256r1: {
    p: 'ffffffff00000001000000000000000000000000ffffffffffffffffffffffff',
    a: 'ffffffff00000001000000000000000000000000fffffffffffffffffffffffc',
    b: '5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b',
    gx: '6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296',
    gy: '4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5',
    n: 'ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
  },
  secp256k1: {
    p: 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
    a: '0',
    b: '7',
    gx: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    gy: '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    n: 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
  },
};

const TRAINING_BITS = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64];
const ARMED = [
  { curve: 'secp192r1', level: 1 },
  { curve: 'secp224r1', level: 2 },
  { curve: 'secp256r1', level: 3 },
  { curve: 'secp256k1', level: 4 },
];
export const BROWSER_MAX_BITS = 40;

function buildTraining(bits) {
  const B = BigInt(bits);
  for (let tweak = 0; tweak < 64; tweak++) {
    let p = (1n << B) + (H('axion/p', bits, tweak) % (1n << (B - 1n)));
    if ((p & 1n) === 0n) p += 1n;
    while (!isProbablePrime(p)) p += 2n;
    const a = H('axion/a', bits, tweak) % p;
    let b = H('axion/b', bits, tweak) % p;
    while (mod(4n * a ** 3n + 27n * b ** 2n, p) === 0n) b += 1n;
    const c = { p, a, b };
    let x = H('axion/g', bits, tweak) % p, G = null;
    for (let i = 0; i < 4096 && !G; i++, x = (x + 1n) % p) {
      const rhs = mod(x ** 3n + a * x + b, p);
      if (rhs !== 0n && legendre(rhs, p) === 1n) G = [x, sqrtMod(rhs, p)];
    }
    if (!G) continue;
    const half = 1n << (B - 1n);
    const k = half + (HM('axion/k', bits, tweak) % half); // full-width secret scalar
    const Q = pointMul(k, G, c);
    if (!Q || samePoint(Q, G)) continue;
    return {
      id: `T${String(bits).padStart(3, '0')}`,
      tier: 'training',
      bits,
      curve: `axn-train-${bits}`,
      level: 0,
      c, G, Q, n: null,
      secret: k,
      points: bits * bits,
      browser: bits <= BROWSER_MAX_BITS,
    };
  }
  throw new Error(`could not build training curve for ${bits} bits`);
}

function buildArmed({ curve, level }) {
  const s = STANDARD[curve];
  const c = { p: BigInt('0x' + s.p), a: BigInt('0x' + s.a), b: BigInt('0x' + s.b) };
  const G = [BigInt('0x' + s.gx), BigInt('0x' + s.gy)];
  const n = BigInt('0x' + s.n);
  if (!onCurve(G, c)) throw new Error(`bad generator for ${curve}`);
  // Nothing-up-my-sleeve target: x = H("AXION-OS/ARMED/<curve>/<ctr>") until it lands on the curve.
  let Q = null;
  for (let ctr = 0; !Q; ctr++) {
    const x = H('AXION-OS/ARMED', curve, ctr) % c.p;
    const y = sqrtMod(x ** 3n + c.a * x + c.b, c.p);
    if (y !== null) Q = [x, (y & 1n) === 0n ? y : c.p - y];
  }
  const bits = c.p.toString(2).length;
  return {
    id: `A${String(bits).padStart(3, '0')}${curve.endsWith('k1') ? 'K' : 'R'}`,
    tier: 'armed',
    bits,
    curve,
    level,
    c, G, Q, n,
    secret: null,
    points: bits * bits * 10,
    browser: false,
    seedPhrase: `AXION-OS/ARMED|${curve}`,
  };
}

let CACHE = null;
export function getRungs() {
  if (!CACHE) CACHE = [...TRAINING_BITS.map(buildTraining), ...ARMED.map(buildArmed)];
  return CACHE;
}

export const findRung = (id) => getRungs().find((r) => r.id === String(id || '').toUpperCase());

export function publicRung(r, state = {}) {
  return {
    id: r.id,
    tier: r.tier,
    bits: r.bits,
    curve: r.curve,
    level: r.level,
    points: r.points,
    browserSolvable: r.browser,
    params: {
      p: hex(r.c.p), a: hex(r.c.a), b: hex(r.c.b),
      gx: hex(r.G[0]), gy: hex(r.G[1]),
      qx: hex(r.Q[0]), qy: hex(r.Q[1]),
      n: r.n ? hex(r.n) : null,
      keyRange: r.tier === 'training' ? `[2^${r.bits - 1}, 2^${r.bits})` : '[1, n)',
    },
    derivation: r.seedPhrase || null,
    broken: !!state.broken,
    brokenBy: state.brokenBy || null,
    brokenAt: state.brokenAt || null,
  };
}

// Returns true iff k·G == Q on the rung's curve.
export function verifyScalar(r, kInput) {
  let k = parseScalar(kInput);
  if (k <= 0n) throw new Error('scalar must be positive');
  if (r.n) k = k % r.n;
  if (k === 0n) return false;
  return samePoint(pointMul(k, r.G, r.c), r.Q);
}

export const LEVELS = [
  { level: 0, label: 'NOMINAL', tone: 'ok' },
  { level: 1, label: 'WATCH', tone: 'warn' },
  { level: 2, label: 'ELEVATED', tone: 'warn' },
  { level: 3, label: 'CRITICAL', tone: 'crit' },
  { level: 4, label: 'BREACH', tone: 'crit' },
];
