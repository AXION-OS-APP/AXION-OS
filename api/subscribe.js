// POST /api/subscribe { email, level } — opt in to threat-level alerts at or above `level`.
import { send, allow, body, limit, wrap } from '../lib/http.js';
import { hset, hlen, KEYS } from '../lib/store.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  if (!(await limit(req, res, 'sub', 5))) return;
  const { email, level } = await body(req);
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(e)) return send(res, 400, { error: 'invalid email address' });
  const lv = Math.max(1, Math.min(4, parseInt(level, 10) || 1));
  await hset(KEYS.subs, e, { level: lv, at: Date.now() });
  send(res, 200, { ok: true, message: `Alerts armed for level ≥ ${lv}.`, subscribers: await hlen(KEYS.subs) });
});
