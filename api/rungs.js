// GET /api/rungs            — every canary rung with public curve parameters
// GET /api/rungs?id=T032    — a single rung
import { send, allow, query, wrap } from '../lib/http.js';
import { rungStates } from '../lib/state.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const { id } = query(req);
  const rungs = await rungStates();
  if (id) {
    const r = rungs.find((x) => x.id === String(id).toUpperCase());
    return r ? send(res, 200, r, 5) : send(res, 404, { error: 'unknown rung' });
  }
  send(res, 200, { rungs }, 5);
});
