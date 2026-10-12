// POST /api/ark { commitment, alias?, algo? } — register a post-quantum key commitment (hash only).
// GET  /api/ark?c=0x…                         — look up a commitment
// GET  /api/ark                               — registry size
import { send, allow, body, query, limit, cleanHandle, wrap } from '../lib/http.js';
import { hget, hsetnx, hlen, KEYS } from '../lib/store.js';

const isCommit = (s) => /^0x[0-9a-f]{64}$/.test(String(s || '').toLowerCase());

export default wrap(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const { c } = query(req);
    if (!c) return send(res, 200, { registered: await hlen(KEYS.ark) }, 5);
    if (!isCommit(c)) return send(res, 400, { error: 'commitment must be 0x + 64 hex chars' });
    const rec = await hget(KEYS.ark, c.toLowerCase());
    return send(res, 200, rec ? { found: true, commitment: c.toLowerCase(), ...rec } : { found: false });
  }

  if (!(await limit(req, res, 'ark', 10))) return;
  const { commitment, alias, algo } = await body(req);
  if (!isCommit(commitment)) return send(res, 400, { error: 'commitment must be 0x + 64 hex chars' });
  const c = commitment.toLowerCase();
  const rec = { alias: cleanHandle(alias), algo: algo === 'ML-DSA-44' ? algo : 'ML-DSA-44', at: Date.now() };
  const fresh = await hsetnx(KEYS.ark, c, rec);
  const stored = fresh ? rec : await hget(KEYS.ark, c);
  send(res, 200, { ok: true, fresh, commitment: c, receipt: 'AXN-ARK-' + c.slice(2, 10).toUpperCase(), ...stored, registered: await hlen(KEYS.ark) });
});
