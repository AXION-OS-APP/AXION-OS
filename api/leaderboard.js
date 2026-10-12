// GET /api/leaderboard — top solvers and the latest claim feed.
import { send, allow, wrap } from '../lib/http.js';
import { hgetall, lrange, KEYS } from '../lib/store.js';

export default wrap(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const players = Object.values(await hgetall(KEYS.players))
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || a.last - b.last)
    .slice(0, 50)
    .map((p, i) => ({ rank: i + 1, handle: p.handle, points: p.points, rungs: p.rungs, last: p.last }));
  const recent = await lrange(KEYS.claims, 25);
  send(res, 200, { players, recent }, 5);
});
