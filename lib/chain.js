// AXION OS — live Ethereum mainnet snapshot via JSON-RPC (cached per instance).
const RPC = process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';
const TTL = 12_000;
let cache = { at: 0, data: null };

async function rpc(method, params = []) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

export async function getChain() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  try {
    const [blk, gas] = await Promise.all([rpc('eth_getBlockByNumber', ['latest', false]), rpc('eth_gasPrice')]);
    cache = {
      at: Date.now(),
      data: {
        ok: true,
        chainId: 1,
        block: parseInt(blk.number, 16),
        blockTime: parseInt(blk.timestamp, 16),
        txCount: blk.transactions?.length ?? 0,
        baseFeeGwei: blk.baseFeePerGas ? +(parseInt(blk.baseFeePerGas, 16) / 1e9).toFixed(3) : null,
        gasGwei: +(parseInt(gas, 16) / 1e9).toFixed(3),
        gasUsedPct: +((parseInt(blk.gasUsed, 16) / parseInt(blk.gasLimit, 16)) * 100).toFixed(1),
        hash: blk.hash,
        fetchedAt: Date.now(),
      },
    };
  } catch (e) {
    if (cache.data) return { ...cache.data, stale: true };
    return { ok: false, error: String(e.message || e) };
  }
  return cache.data;
}
