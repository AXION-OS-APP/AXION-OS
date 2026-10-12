// AXION OS — landing page logic: live status, feeds, ambient pixel widgets.
import { CONFIG } from './config.js';
import { planet, world } from './pixel-world.js';

const $ = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let tone = 'ok';

export function toast(msg, bad = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast on' + (bad ? ' bad' : '');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.className = 'toast'), 2200);
}

/* ---- branding / token ---- */
$('yr').textContent = new Date().getFullYear();
$('ca-label').textContent = `${CONFIG.token.symbol} · contract address`;
if (CONFIG.token.address) $('ca-addr').textContent = CONFIG.token.address;
$('ca-copy').onclick = async () => {
  if (!CONFIG.token.address) return toast('Contract address not published yet');
  try { await navigator.clipboard.writeText(CONFIG.token.address); toast('Address copied ✓'); } catch { toast('Copy failed', true); }
};
const ICONS = {
  x: `<svg class="soc-ico" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M9.333 6.927 14.542 1h-1.234L8.785 6.223 5.173 1H1l5.467 7.779L1 15h1.234l4.782-5.419L10.827 15H15l-5.667-8.073Zm-1.69 1.916-.553-.772-4.404-6.143h1.895l3.555 4.96.553.772 4.622 6.452h-1.895l-3.773-5.269Z"/></svg>`,
  github: `<svg class="soc-ico" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8.01 8.01 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`,
};
const socials = Object.entries(CONFIG.social).filter(([, u]) => u)
  .map(([k, u]) => `<a class="btn sm social-btn social-${k}" href="${u}" target="_blank" rel="noopener noreferrer">${ICONS[k] || ''}<span>${k.toUpperCase()}</span> <span class="arrow">↗</span></a>`).join('');
$('social').innerHTML = socials;
$('social2').innerHTML = socials;

/* ---- scenes ---- */
planet($('planet'), () => tone);
world($('world-canvas'));

/* ---- boot log ---- */
const logEl = $('bootlog');
const lines = [];
function log(msg, dim = false) {
  lines.push(`<div class="${dim ? 'd' : ''}">${msg}</div>`);
  while (lines.length > 6) lines.shift();
  logEl.innerHTML = lines.join('') + '<div class="cursor">&gt; </div>';
}
const boot = ['AXION BIOS v1.0 … OK', 'POST memory 128 cells … OK', 'mount /dev/canary … OK', 'load ML-DSA-44 driver … OK', 'dial oracle feed …'];
boot.forEach((l, i) => setTimeout(() => log(l, i < 3), i * 260));

/* ---- live status ---- */
const pad2 = (n) => String(n).padStart(2, '0');
function renderLadder(ladder) {
  $('ladder').innerHTML = ladder.map((r) => {
    const pct = r.broken ? 100 : Math.max(4, Math.round((r.bits / 256) * 100));
    return `<div class="r ${r.tier}"><span>${r.id}</span><span class="bar"><i style="width:${r.broken ? 100 : 0}%"></i></span><span class="${r.broken ? 'c-lime' : 'c-dim'}">${r.broken ? 'OWN' : r.bits}</span></div>`;
  }).join('');
}

let lastBlock = 0;
async function refresh() {
  try {
    const s = await fetch('/api/status').then((r) => r.json());
    tone = s.threat.tone;
    $('lvl').textContent = pad2(s.threat.level);
    $('lvl-label').textContent = s.threat.label;
    $('lvl-label').className = 'state ' + s.threat.tone;
    $('planet-state').textContent = s.threat.level ? `● LVL ${s.threat.level}` : '● ONLINE';
    $('strong').textContent = s.rungs.strongestBroken ? `${s.rungs.strongestBroken.bits}-bit · ${s.rungs.strongestBroken.id}` : 'none yet';
    $('armed-intact').textContent = `${s.rungs.armed.total - s.rungs.armed.broken} / ${s.rungs.armed.total}`;
    $('ark-n').textContent = s.ark.registered;
    $('si-rungs').textContent = `${s.rungs.total} · 16→256 bit`;
    renderLadder(s.rungs.ladder);
    const c = s.chain || {};
    if (c.ok) {
      $('f-block').textContent = '#' + c.block.toLocaleString('en-US');
      $('f-gas').textContent = c.gasGwei + ' gwei';
      $('f-base').textContent = (c.baseFeeGwei ?? '—') + ' gwei';
      $('f-fill').textContent = c.gasUsedPct + '%';
      $('f-tx').textContent = c.txCount;
      $('feed-age').textContent = c.stale ? 'stale' : 'live';
      if (c.block !== lastBlock) { if (lastBlock) log(`new block #${c.block} · ${c.txCount} tx`); lastBlock = c.block; }
    } else {
      $('feed-age').textContent = 'offline';
    }
    if (!refresh.done) { log(`oracle online · threat ${pad2(s.threat.level)} ${s.threat.label}`); refresh.done = true; }
    updateTicker(s);
  } catch (e) {
    log('oracle unreachable, retrying…');
  }
}

function updateTicker(s) {
  const c = s.chain || {};
  const items = [
    `THREAT <b>${pad2(s.threat.level)} ${s.threat.label}</b>`,
    `ARMED RUNGS <b>${s.rungs.armed.total - s.rungs.armed.broken}/${s.rungs.armed.total} INTACT</b>`,
    `TRAINING CRACKED <b>${s.rungs.training.broken}/${s.rungs.training.total}</b>`,
    `ARK KEYS <b>${s.ark.registered}</b>`,
    c.ok ? `ETH BLOCK <b>#${c.block}</b>` : 'ETH FEED <b>OFFLINE</b>',
    c.ok ? `GAS <b>${c.gasGwei} GWEI</b>` : '',
    `PQ STANDARD <b>FIPS 204</b>`,
  ].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
  $('ticker').innerHTML = items + items;
}
refresh();
setInterval(refresh, 15000);

/* ---- ambient widgets ---- */
const reg = $('reg'), cells = [];
for (let i = 0; i < 128; i++) { const e = document.createElement('i'); if (Math.random() > .5) e.className = 'on'; reg.appendChild(e); cells.push(e); }
if (!reduce) setInterval(() => {
  for (let k = 0; k < 8; k++) { const e = cells[(Math.random() * 128) | 0]; e.className = Math.random() > .94 ? 'hot' : Math.random() > .5 ? 'on' : ''; }
}, 150);

const ops = ['BABY', 'GIANT', 'ECADD', 'ECDBL', 'INV', 'HASH', 'MATCH?', 'STORE'];
const hx = () => Array.from({ length: 8 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
const trace = Array(7).fill('');
function traceStep() {
  trace.shift();
  trace.push(`0x${hx()} <em>${ops[(Math.random() * ops.length) | 0].padEnd(6)}</em> j=${(Math.random() * 65535) | 0}`);
  $('hex').innerHTML = trace.join('\n');
}
for (let i = 0; i < 7; i++) traceStep();
if (!reduce) setInterval(traceStep, 300);

const bc = $('barcode');
for (let i = 0; i < 40; i++) { const e = document.createElement('i'); e.style.width = 1 + ((Math.random() * 3) | 0) + 'px'; if (Math.random() > .8) e.style.background = 'transparent'; bc.appendChild(e); }
