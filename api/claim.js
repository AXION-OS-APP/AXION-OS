// POST /api/claim { id, k, handle } — submit a discrete-log solution for a canary rung.
// The server recomputes k·G and compares it with the published target point Q.
import { send, allow, body, limit, cleanHandle, wrap } from '../lib/http.js';
import { findRung, verifyScalar } from '../lib/rungs.js';
import { hget, hsetnx, hset, lpush, KEYS } from '../lib/store.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  if (!(await limit(req, res, 'claim', 20))) return;
  const { id, k, handle } = await body(req);
  const rung = findRung(id);
  if (!rung) return send(res, 404, { error: 'unknown rung id' });

  let ok;
  try { ok = verifyScalar(rung, k); } catch (e) { return send(res, 400, { error: e.message }); }
  if (!ok) return send(res, 200, { ok: false, id: rung.id, message: 'k·G does not match Q. Keep searching.' });

  const who = cleanHandle(handle);
  const at = Date.now();
  const first = await hsetnx(KEYS.broken, rung.id, { by: who, at });
  if (!first) {
    const prev = await hget(KEYS.broken, rung.id);
    return send(res, 200, { ok: true, first: false, id: rung.id, message: `Valid key, but ${prev?.by || 'someone'} broke this rung first.` });
  }

  const player = (await hget(KEYS.players, who)) || { handle: who, points: 0, rungs: [] };
  player.points += rung.points;
  player.rungs.push(rung.id);
  player.last = at;
  await hset(KEYS.players, who, player);
  await lpush(KEYS.claims, { id: rung.id, bits: rung.bits, tier: rung.tier, by: who, at, points: rung.points });

  send(res, 200, {
    ok: true,
    first: true,
    id: rung.id,
    points: rung.points,
    message: rung.tier === 'armed'
      ? `ARMED RUNG ${rung.id} BROKEN. Threat level raised. The AXION Moment has been recorded.`
      : `Rung ${rung.id} cracked. +${rung.points} pts for ${who}.`,
  });
});
