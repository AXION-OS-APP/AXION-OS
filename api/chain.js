// GET /api/chain — live Ethereum mainnet snapshot (block, gas, fullness).
import { send, allow, wrap } from '../lib/http.js';
import { getChain } from '../lib/chain.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  send(res, 200, await getChain(), 6);
});
