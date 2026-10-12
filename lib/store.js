// AXION OS — persistence layer.
// Uses Upstash Redis over REST when env vars are present, otherwise an in-memory store
// (fine for local dev; in serverless cloud memory only survives while an instance stays warm).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
export const backend = URL_ && TOKEN ? 'redis' : 'memory';

const mem = (globalThis.__AXION_MEM ||= { kv: new Map(), hash: new Map(), list: new Map() });

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error('store: ' + j.error);
  return j.result;
}

const enc = (v) => JSON.stringify(v);
const dec = (s) => { try { return s == null ? null : JSON.parse(s); } catch { return null; } };

export async function hset(key, field, value) {
  if (backend === 'redis') return redis(['HSET', key, field, enc(value)]);
  if (!mem.hash.has(key)) mem.hash.set(key, new Map());
  mem.hash.get(key).set(field, enc(value));
  return 1;
}

// Sets only if the field does not exist. Returns true when written.
export async function hsetnx(key, field, value) {
  if (backend === 'redis') return (await redis(['HSETNX', key, field, enc(value)])) === 1;
  if (!mem.hash.has(key)) mem.hash.set(key, new Map());
  const h = mem.hash.get(key);
  if (h.has(field)) return false;
  h.set(field, enc(value));
  return true;
}

export async function hget(key, field) {
  if (backend === 'redis') return dec(await redis(['HGET', key, field]));
  return dec(mem.hash.get(key)?.get(field));
}

export async function hgetall(key) {
  const out = {};
  if (backend === 'redis') {
    const arr = (await redis(['HGETALL', key])) || [];
    for (let i = 0; i < arr.length; i += 2) out[arr[i]] = dec(arr[i + 1]);
    return out;
  }
  for (const [k, v] of mem.hash.get(key) || []) out[k] = dec(v);
  return out;
}

export async function hlen(key) {
  if (backend === 'redis') return Number(await redis(['HLEN', key])) || 0;
  return mem.hash.get(key)?.size || 0;
}

export async function lpush(key, value, max = 200) {
  if (backend === 'redis') {
    await redis(['LPUSH', key, enc(value)]);
    await redis(['LTRIM', key, '0', String(max - 1)]);
    return;
  }
  const l = mem.list.get(key) || [];
  l.unshift(enc(value));
  mem.list.set(key, l.slice(0, max));
}

export async function lrange(key, n = 50) {
  if (backend === 'redis') return ((await redis(['LRANGE', key, '0', String(n - 1)])) || []).map(dec);
  return (mem.list.get(key) || []).slice(0, n).map(dec);
}

export async function incr(key, ttlSec) {
  if (backend === 'redis') {
    const v = await redis(['INCR', key]);
    if (v === 1 && ttlSec) await redis(['EXPIRE', key, String(ttlSec)]);
    return v;
  }
  const now = Date.now();
  const cur = mem.kv.get(key);
  if (!cur || cur.exp < now) {
    mem.kv.set(key, { v: 1, exp: now + (ttlSec || 3600) * 1000 });
    return 1;
  }
  cur.v += 1;
  return cur.v;
}

export const KEYS = {
  broken: 'axion:rungs:broken', // hash rungId -> {by, at, k}
  claims: 'axion:claims', // list of claim events
  players: 'axion:players', // hash handle -> {points, rungs[]}
  ark: 'axion:ark', // hash commitment -> {alias, algo, at}
  subs: 'axion:subs', // hash email -> {level, at}
};
