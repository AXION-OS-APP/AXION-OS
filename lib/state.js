// AXION OS — aggregate system state (rungs + store) used by several endpoints.
import { getRungs, publicRung, LEVELS, usingDevSeed } from './rungs.js';
import { hgetall, hlen, KEYS, backend } from './store.js';

export async function rungStates() {
  const broken = await hgetall(KEYS.broken);
  return getRungs().map((r) => {
    const b = broken[r.id];
    return publicRung(r, b ? { broken: true, brokenBy: b.by, brokenAt: b.at } : {});
  });
}

export async function systemState() {
  const rungs = await rungStates();
  const armed = rungs.filter((r) => r.tier === 'armed');
  const training = rungs.filter((r) => r.tier === 'training');
  const armedBroken = armed.filter((r) => r.broken);
  const level = Math.min(armedBroken.length, LEVELS.length - 1);
  const strongest = rungs.filter((r) => r.broken).sort((a, b) => b.bits - a.bits)[0] || null;
  const moment = armedBroken.map((r) => r.brokenAt).sort((a, b) => a - b)[0] || null;
  return {
    threat: { ...LEVELS[level], max: LEVELS.length - 1 },
    moment,
    rungs: {
      total: rungs.length,
      training: { total: training.length, broken: training.filter((r) => r.broken).length },
      armed: { total: armed.length, broken: armedBroken.length },
      strongestBroken: strongest ? { id: strongest.id, bits: strongest.bits, curve: strongest.curve } : null,
      ladder: rungs.map((r) => ({ id: r.id, bits: r.bits, tier: r.tier, broken: r.broken })),
    },
    ark: { registered: await hlen(KEYS.ark) },
    system: { store: backend, devSeed: usingDevSeed, version: '1.0.0', time: Date.now() },
  };
}
