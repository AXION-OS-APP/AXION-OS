// AXION OS — small HTTP helpers shared by every /api function (works across environments and in server.js).
import { incr } from './store.js';

export function send(res, status, body, cacheSec = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Cache-Control', cacheSec ? `public, s-maxage=${cacheSec}, stale-while-revalidate=${cacheSec * 4}` : 'no-store');
  res.end(JSON.stringify(body));
}

export function query(req) {
  const u = new URL(req.url || '/', 'http://local');
  return Object.fromEntries(u.searchParams.entries());
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

// Returns false (and responds) when the method is not allowed.
export function allow(req, res, methods) {
  if (req.method === 'OPTIONS') { send(res, 204, {}); return false; }
  if (!methods.includes(req.method)) { send(res, 405, { error: `method ${req.method} not allowed` }); return false; }
  return true;
}

export function ip(req) {
  const f = req.headers['x-forwarded-for'];
  return (Array.isArray(f) ? f[0] : f || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
}

// Fixed-window limiter. Returns false (and responds 429) when exceeded.
export async function limit(req, res, bucket, max, windowSec = 60) {
  const n = await incr(`axion:rl:${bucket}:${ip(req)}:${Math.floor(Date.now() / 1000 / windowSec)}`, windowSec);
  if (n > max) { send(res, 429, { error: 'rate limited, slow down' }); return false; }
  return true;
}

export const cleanHandle = (s) => String(s || '').trim().replace(/[^\w.\-@]/g, '').slice(0, 24) || 'anon';

export function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (e) {
      console.error('[axion]', e);
      if (!res.headersSent) send(res, 500, { error: e.message || 'internal error' });
    }
  };
}
