// GET /api/status — threat level, rung summary, registry counts and live mainnet snapshot.
import { send, allow, wrap } from '../lib/http.js';
import { systemState } from '../lib/state.js';
import { getChain } from '../lib/chain.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const [state, chain] = await Promise.all([systemState(), getChain()]);
  send(res, 200, { ...state, chain }, 5);
});
