// AXION OS — main console application logic
import { CONFIG } from '../assets/config.js';
import { ml_dsa44, keccak_256, bytesToHex, hexToBytes } from '../assets/vendor/crypto.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toast(msg, bad = false) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast on' + (bad ? ' bad' : '');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { t.className = 'toast'; }, 2400);
}

// ----------------- App Dock & Router -----------------
const APPS = [
  { id: 'dashboard', name: 'DASHBOARD.EXE', tag: 'MONITOR', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#3dd9ff" d="M1 1h12v12H1z"/><path fill="#0a0b14" d="M3 3h8v8H3z"/><path fill="#8dff4a" d="M5 5h4v4H5z"/></svg>` },
  { id: 'ark',       name: 'ARK.EXE',       tag: 'PROTECT', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#8dff4a" d="M4 6h6v6H4zM5 3h4v1H5zM4 4h1v2H4zM9 4h1v2H9z"/><path fill="#0a0b14" d="M6 8h2v2H6z"/></svg>` },
  { id: 'recover',   name: 'RECOVER.EXE',   tag: 'PROTECT', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#ffc23d" d="M2 3h10v2H2zM2 9h10v2H2zM4 5h6v4H4z"/><path fill="#0a0b14" d="M6 6h2v2H6z"/></svg>` },
  { id: 'signer',    name: 'SIGNER.EXE',    tag: 'PROTECT', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#3dd9ff" d="M9 2h2v2H9zM8 4h2v2H8zM7 5h2v2H7zM6 6h2v2H6zM5 7h2v2H5zM4 8h2v2H4zM3 10h2v2H3z"/></svg>` },
  { id: 'oracle',    name: 'ORACLE.EXE',    tag: 'MONITOR', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#ffc23d" d="M3 9h2v2H3zM6 6h2v5H6zM9 3h2v8H9z"/></svg>` },
  { id: 'canary',    name: 'CANARY.EXE',    tag: 'MONITOR', ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#ff4fd8" d="M5 3h4v1H5zM4 4h6v3H4zM3 7h8v3H3zM5 10h1v2H5zM8 10h1v2H8z"/><path fill="#ffc23d" d="M10 5h2v1h-2z"/></svg>` },
  { id: 'guard',     name: 'GUARD.EXE',     tag: 'BUILD',   ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#8dff4a" d="M3 2h8v6H3zM4 8h6v2H4zM5 10h4v1H5zM6 11h2v1H6z"/><path fill="#0a0b14" d="M6 4h2v3H6z"/></svg>` },
  { id: 'board',     name: 'BOARD.EXE',     tag: 'RANK',    ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#e8ecff" d="M1 7h3v4H1zM5 3h3v8H5zM9 5h2v6H9z"/><path fill="#8dff4a" d="M6 1h1v1H6z"/></svg>` },
  { id: 'contracts', name: 'SOURCE.EXE',    tag: 'BUILD',   ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#e8ecff" d="M3 3h6v1H3zM3 5h8v1H3zM3 7h5v1H3zM3 9h7v1H3z"/><path fill="#3dd9ff" d="M10 2h2v2h-2z"/></svg>` },
  { id: 'settings',  name: 'CONFIG.EXE',    tag: 'SYSTEM',  ico: `<svg viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="#8a90b8" d="M5 2h4v2H5zM5 10h4v2H5zM2 5h2v4H2zM10 5h2v4h-2zM4 4h6v6H4z"/><path fill="#0a0b14" d="M6 6h2v2H6z"/></svg>` },
];

let globalState = null;
let connectedWallet = null;

function renderDock() {
  const current = (location.hash.slice(1) || 'dashboard').toLowerCase();
  $('dock').innerHTML = APPS.map(app => `
    <a href="#${app.id}" id="dock-${app.id}" ${current === app.id ? 'aria-current="page"' : ''}>
      ${app.ico} <span>${app.name}</span>
    </a>
  `).join('');
}

function navigate() {
  const hash = (location.hash.slice(1) || 'dashboard').toLowerCase();
  const app = APPS.find(a => a.id === hash) || APPS[0];
  renderDock();
  $('win-title').textContent = app.name;
  $('win-ico').innerHTML = app.ico;

  const win = $('win');
  switch (app.id) {
    case 'dashboard': renderDashboard(win); break;
    case 'ark':       renderArk(win); break;
    case 'recover':   renderRecover(win); break;
    case 'signer':    renderSigner(win); break;
    case 'oracle':    renderOracle(win); break;
    case 'canary':    renderCanary(win); break;
    case 'guard':     renderGuard(win); break;
    case 'board':     renderBoard(win); break;
    case 'contracts': renderContracts(win); break;
    case 'settings':  renderSettings(win); break;
    default:          renderDashboard(win);
  }
}

window.addEventListener('hashchange', navigate);

// ----------------- Header Clock & Status -----------------
function updateClock() {
  const d = new Date();
  $('st-clock').textContent = d.toISOString().slice(11, 19) + ' UTC';
}
setInterval(updateClock, 1000);
updateClock();

async function pollStatus() {
  try {
    const res = await fetch('/api/status');
    const s = await res.json();
    globalState = s;

    const pad = (n) => String(n).padStart(2, '0');
    const pill = $('st-lvl');
    pill.textContent = `LVL ${pad(s.threat.level)} ${s.threat.label}`;
    pill.className = `pill c-${s.threat.tone === 'ok' ? 'lime' : s.threat.tone === 'warn' ? 'amber' : 'red'}`;

    if (s.chain && s.chain.ok) {
      $('st-blk').textContent = '#' + s.chain.block.toLocaleString('en-US');
      $('st-gas').textContent = s.chain.gasGwei + ' gwei';
    }

    if ($('dock-foot')) {
      $('dock-foot').textContent = `store: ${s.system.store} · v${s.system.version}`;
    }
  } catch (err) {
    console.error('Status poll error:', err);
  }
}
setInterval(pollStatus, 12000);

// ----------------- Wallet Connection -----------------
async function setupWallet() {
  const btn = $('wallet-btn');
  btn.onclick = async () => {
    if (connectedWallet) {
      connectedWallet = null;
      btn.textContent = 'Connect wallet';
      toast('Wallet disconnected');
      return;
    }

    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          connectedWallet = accounts[0];
          btn.textContent = connectedWallet.slice(0, 6) + '…' + connectedWallet.slice(-4);
          toast(`Connected: ${connectedWallet.slice(0, 8)}`);
          return;
        }
      } catch (e) {
        toast('Connection rejected', true);
        return;
      }
    }

    // Fallback: simulated local test wallet
    const sim = '0x71C...' + Math.random().toString(16).slice(2, 6);
    connectedWallet = '0x71C021200000000000000000000000000000' + Math.random().toString(16).slice(2, 6);
    btn.textContent = connectedWallet.slice(0, 6) + '…' + connectedWallet.slice(-4);
    toast('Simulated Web3 wallet active');
  };
}

// =========================================================================
// APP 1: DASHBOARD
// =========================================================================
function renderDashboard(el) {
  const s = globalState;
  const threat = s?.threat || { level: 0, label: 'NOMINAL', tone: 'ok' };
  const pad = (n) => String(n).padStart(2, '0');

  el.innerHTML = `
    <h2>AXION OS // SYSTEM MONITOR</h2>
    <p class="lead">Central telemetry dashboard tracking cryptographic threat levels, armed canary rungs, and mainnet parameters.</p>

    <div class="tiles">
      <div class="tile">
        <div class="k">Threat level</div>
        <div class="v c-${threat.tone === 'ok' ? 'lime' : threat.tone === 'warn' ? 'amber' : 'red'}">${pad(threat.level)} ${threat.label}</div>
        <div class="s">Quantum defense readiness</div>
      </div>
      <div class="tile">
        <div class="k">Armed canaries</div>
        <div class="v">${s ? s.rungs.armed.total - s.rungs.armed.broken : 4} / ${s ? s.rungs.armed.total : 4}</div>
        <div class="s">Standard curves intact</div>
      </div>
      <div class="tile">
        <div class="k">Training solved</div>
        <div class="v c-cyan">${s ? s.rungs.training.broken : 0} / ${s ? s.rungs.training.total : 10}</div>
        <div class="s">Toy rungs cracked</div>
      </div>
      <div class="tile">
        <div class="k">Ark keys</div>
        <div class="v c-mag">${s ? s.ark.registered : 0}</div>
        <div class="s">PQ commitments saved</div>
      </div>
    </div>

    <div class="box" style="margin-top:20px">
      <h3>THREAT LEVEL INDICATOR</h3>
      <div class="gauge">
        <i class="${threat.level >= 0 ? 'on l0' : ''}">0 · NOMINAL</i>
        <i class="${threat.level >= 1 ? 'on l1' : ''}">1 · WATCH</i>
        <i class="${threat.level >= 2 ? 'on l2' : ''}">2 · ELEVATED</i>
        <i class="${threat.level >= 3 ? 'on l3' : ''}">3 · CRITICAL</i>
        <i class="${threat.level >= 4 ? 'on l4' : ''}">4 · BREACH</i>
      </div>
      <div class="note ${threat.tone === 'ok' ? 'g' : threat.tone === 'warn' ? '' : 'r'}" style="margin-top:14px">
        ${threat.level === 0 ? 'Status Nominal: No armed elliptic-curve bounties have been broken. Recommended action: Register an Ark commitment now while gas and threat are low.' : 'Threat Elevated: One or more armed keys have been factored. Triggering automated circuit breakers.'}
      </div>
    </div>

    <div class="cols" style="margin-top:18px">
      <div class="box">
        <h3>L1 TELEMETRY</h3>
        <div class="kv">
          <span>Chain</span><span>Ethereum Mainnet (ChainID 1)</span>
          <span>Latest block</span><span class="num c-lime">${s?.chain?.ok ? '#' + s.chain.block.toLocaleString('en-US') : 'Connecting…'}</span>
          <span>Base fee</span><span class="num">${s?.chain?.ok ? s.chain.baseFeeGwei + ' Gwei' : '—'}</span>
          <span>Gas price</span><span class="num">${s?.chain?.ok ? s.chain.gasGwei + ' Gwei' : '—'}</span>
          <span>Block capacity</span><span class="num">${s?.chain?.ok ? s.chain.gasUsedPct + '%' : '—'}</span>
        </div>
      </div>
      <div class="box">
        <h3>QUICK DISPATCH</h3>
        <p style="margin:0 0 14px;color:var(--dim);font-size:18px">Direct execution shortcuts to protective tools:</p>
        <div class="btns">
          <a class="btn pri" href="#ark">Generate Ark Key ▶</a>
          <a class="btn cy" href="#signer">PQ Signer</a>
          <a class="btn" href="#canary">Canary Solver</a>
          <a class="btn" href="#guard">Guard Builder</a>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// APP 2: ARK (ML-DSA-44 Keygen & Registration)
// =========================================================================
let currentArkKit = null;

function renderArk(el) {
  el.innerHTML = `
    <h2>ARK.EXE // POST-QUANTUM KEY COMMITMENT</h2>
    <p class="lead">Generate a NIST FIPS 204 (ML-DSA-44) lattice keypair inside your browser. Save the recovery kit, then register its 32-byte keccak256 commitment.</p>

    <div class="cols">
      <div>
        <div class="box">
          <div class="step"><b>STEP 1</b><span>Generate Lattice Keypair</span></div>
          <p style="margin:0 0 12px;color:var(--dim);font-size:18px">Pure in-browser post-quantum generation. No private keys are ever transmitted over the network.</p>
          <div class="btns">
            <button class="btn pri" id="ark-gen-btn" type="button">Forge ML-DSA-44 Keypair ▶</button>
            <button class="btn" id="ark-dl-btn" type="button" disabled>Download Recovery Kit</button>
          </div>
        </div>

        <div class="box" style="margin-top:14px">
          <div class="step"><b>STEP 2</b><span>Register Commitment</span></div>
          <div class="field">
            <label>Wallet / Handle alias</label>
            <input type="text" id="ark-alias-in" placeholder="vitalik.eth" maxlength="24">
          </div>
          <div class="field">
            <label>Keccak256 Commitment (32 bytes)</label>
            <input type="text" id="ark-commit-in" placeholder="0x..." readonly>
          </div>
          <div class="btns" style="margin-top:14px">
            <button class="btn cy" id="ark-reg-btn" type="button" disabled>Register to Ark API</button>
            <button class="btn" id="ark-tx-btn" type="button" disabled>Build L1 Calldata</button>
          </div>
        </div>
      </div>

      <div>
        <div class="box">
          <h3>KEY INSPECTOR</h3>
          <div class="readout">
            <div><span>Algorithm</span><b class="c-lime">ML-DSA-44</b></div>
            <div><span>PK Size</span><b id="ark-pk-sz">0 B</b></div>
            <div><span>SK Size</span><b id="ark-sk-sz">0 B</b></div>
          </div>
          <div class="outhead"><span class="label">Public Key (Hex)</span><button class="btn sm" id="ark-copy-pk" type="button">Copy</button></div>
          <div class="out" id="ark-pk-out">No key generated yet. Click "Forge ML-DSA-44 Keypair" to begin.</div>
          
          <div class="outhead"><span class="label">Commitment Hash</span><button class="btn sm" id="ark-copy-c" type="button">Copy</button></div>
          <div class="out" id="ark-c-out">0x0000000000000000000000000000000000000000000000000000000000000000</div>

          <div class="outhead" id="ark-calldata-head" style="display:none"><span class="label">Ethereum L1 Calldata</span></div>
          <div class="out" id="ark-calldata-out" style="display:none"></div>
        </div>
      </div>
    </div>

    <div class="box" style="margin-top:18px">
      <h3>VERIFY AN EXISTING COMMITMENT</h3>
      <div style="display:flex;gap:10px;margin-top:8px">
        <input type="text" id="ark-lookup-in" placeholder="0x... (32-byte commitment hash)" style="flex:1">
        <button class="btn cy sm" id="ark-lookup-btn" type="button">Query Registry</button>
      </div>
      <div id="ark-lookup-res" style="margin-top:12px;display:none" class="out"></div>
    </div>
  `;

  // Keygen handler
  $('ark-gen-btn').onclick = () => {
    try {
      toast('Generating ML-DSA-44 lattice keypair…');
      const keys = ml_dsa44.keygen();
      const pkHex = '0x' + bytesToHex(keys.publicKey);
      const skHex = '0x' + bytesToHex(keys.secretKey);
      const commit = '0x' + bytesToHex(keccak_256(keys.publicKey));

      currentArkKit = {
        algorithm: 'ML-DSA-44',
        standard: 'NIST FIPS 204',
        publicKey: pkHex,
        secretKey: skHex,
        commitment: commit,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      $('ark-pk-sz').textContent = keys.publicKey.length + ' B';
      $('ark-sk-sz').textContent = keys.secretKey.length + ' B';
      $('ark-pk-out').textContent = pkHex;
      $('ark-c-out').textContent = commit;
      $('ark-commit-in').value = commit;

      $('ark-dl-btn').disabled = false;
      $('ark-reg-btn').disabled = false;
      $('ark-tx-btn').disabled = false;

      toast('Lattice keypair ready ✓');
    } catch (err) {
      console.error(err);
      toast('Keygen failed: ' + err.message, true);
    }
  };

  // Download kit
  $('ark-dl-btn').onclick = () => {
    if (!currentArkKit) return;
    const alias = ($('ark-alias-in').value.trim() || 'default').replace(/[^\w-]/g, '');
    const blob = new Blob([JSON.stringify({ ...currentArkKit, alias }, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `axion-ark-recovery-kit-${alias}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(u);
    toast('Recovery kit downloaded ✓');
  };

  // Register to API
  $('ark-reg-btn').onclick = async () => {
    if (!currentArkKit) return;
    const alias = $('ark-alias-in').value.trim() || 'anon';
    try {
      const res = await fetch('/api/ark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment: currentArkKit.commitment, alias, algo: 'ML-DSA-44' }),
      });
      const data = await res.json();
      if (data.ok) {
        toast(`Commitment registered: ${data.receipt} ✓`);
      } else {
        toast(data.error || 'Registration error', true);
      }
    } catch (e) {
      toast('Failed to reach Ark API', true);
    }
  };

  // Build L1 calldata: commitKey(bytes32) -> selector 0x...
  $('ark-tx-btn').onclick = () => {
    if (!currentArkKit) return;
    const cClean = currentArkKit.commitment.replace(/^0x/, '');
    // Function selector for commitKey(bytes32): keccak256("commitKey(bytes32)")[:4]
    const sel = bytesToHex(keccak_256(new TextEncoder().encode('commitKey(bytes32)'))).slice(0, 8);
    const calldata = '0x' + sel + cClean;

    $('ark-calldata-head').style.display = 'flex';
    const cdOut = $('ark-calldata-out');
    cdOut.style.display = 'block';
    cdOut.textContent = calldata;

    toast('Calldata prepared ✓');
  };

  $('ark-copy-pk').onclick = () => {
    if (currentArkKit) { navigator.clipboard.writeText(currentArkKit.publicKey); toast('Public key copied ✓'); }
  };
  $('ark-copy-c').onclick = () => {
    if (currentArkKit) { navigator.clipboard.writeText(currentArkKit.commitment); toast('Commitment hash copied ✓'); }
  };

  // Lookup existing
  $('ark-lookup-btn').onclick = async () => {
    const val = $('ark-lookup-in').value.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(val)) return toast('Enter valid 32-byte 0x-hex commitment', true);
    try {
      const r = await fetch(`/api/ark?c=${val}`).then(x => x.json());
      const resEl = $('ark-lookup-res');
      resEl.style.display = 'block';
      if (r.found) {
        resEl.className = 'out ok';
        resEl.innerHTML = `STATUS: REGISTERED<br>Alias: ${escapeHtml(r.alias)}<br>Algorithm: ${r.algo}<br>Registered: ${new Date(r.at).toISOString()}`;
      } else {
        resEl.className = 'out bad';
        resEl.textContent = 'Commitment NOT found in registry.';
      }
    } catch (e) {
      toast('Lookup request failed', true);
    }
  };
}

// =========================================================================
// APP 3: RECOVER (Emergency Vault Migration)
// =========================================================================
function renderRecover(el) {
  el.innerHTML = `
    <h2>RECOVER.EXE // POST-QUANTUM VAULT MIGRATION</h2>
    <p class="lead">Load a saved Ark recovery kit to construct an emergency migration transaction for contracts inheriting AxionVault.</p>

    <div class="cols">
      <div>
        <div class="box">
          <div class="step"><b>STEP 1</b><span>Load Recovery Kit</span></div>
          <div class="field">
            <label>Select Recovery JSON file</label>
            <div style="display:flex;align-items:center;gap:12px;background:#05060d;border:3px solid var(--line);padding:6px 10px">
              <button type="button" class="btn sm cy" id="rec-file-pick-btn">Choose File</button>
              <span id="rec-file-label" class="c-dim" style="font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">No file chosen</span>
              <input type="file" id="rec-file-in" accept=".json" style="display:none">
            </div>
          </div>
          <div class="field" style="margin-top:12px">
            <label>Or Paste Public Key (Hex)</label>
            <textarea id="rec-pk-in" placeholder="0x..."></textarea>
          </div>
        </div>

        <div class="box" style="margin-top:14px">
          <div class="step"><b>STEP 2</b><span>Destination Parameters</span></div>
          <div class="field">
            <label>Target Vault Contract Address</label>
            <input type="text" id="rec-vault-in" placeholder="0x..." value="${CONFIG.contracts.ark || ''}">
          </div>
          <div class="field">
            <label>New Owner Recipient Address</label>
            <input type="text" id="rec-recipient-in" placeholder="0x...">
          </div>
          <div class="btns" style="margin-top:14px">
            <button class="btn pri" id="rec-build-btn" type="button">Assemble Migration Payload ▶</button>
          </div>
        </div>
      </div>

      <div>
        <div class="box">
          <h3>MIGRATION CALLLDATA</h3>
          <div class="outhead"><span class="label">ABI: emergencyMigrate(address,bytes)</span><button class="btn sm" id="rec-copy-cd" type="button">Copy</button></div>
          <div class="out" id="rec-cd-out" style="min-height:120px">Upload kit or enter parameters to compute payload.</div>
          <div class="note g" style="margin-top:12px">
            Validates that keccak256(pqPublicKey) perfectly satisfies your registered pre-Moment commitment.
          </div>
        </div>
      </div>
    </div>
  `;

  $('rec-file-pick-btn').onclick = () => $('rec-file-in').click();

  $('rec-file-in').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      $('rec-file-label').textContent = 'No file chosen';
      $('rec-file-label').className = 'c-dim';
      return;
    }
    $('rec-file-label').textContent = file.name;
    $('rec-file-label').className = 'c-lime';
    const r = new FileReader();
    r.onload = (evt) => {
      try {
        const j = JSON.parse(evt.target.result);
        if (j.publicKey) {
          $('rec-pk-in').value = j.publicKey;
          toast('Recovery kit parsed successfully ✓');
        } else {
          toast('File missing publicKey field', true);
        }
      } catch (err) {
        toast('Invalid JSON file', true);
      }
    };
    r.readAsText(file);
  };

  $('rec-build-btn').onclick = () => {
    const pk = $('rec-pk-in').value.trim().replace(/^0x/, '');
    const to = $('rec-recipient-in').value.trim();
    if (!pk || pk.length !== 1312 * 2) return toast('Invalid ML-DSA-44 public key (expected 1312 bytes)', true);
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return toast('Invalid recipient Ethereum address', true);

    // ABI encode emergencyMigrate(address,bytes)
    // selector: keccak256("emergencyMigrate(address,bytes)")[:4]
    const sel = bytesToHex(keccak_256(new TextEncoder().encode('emergencyMigrate(address,bytes)'))).slice(0, 8);
    const toClean = to.replace(/^0x/, '').padStart(64, '0');
    const offset = (64).toString(16).padStart(64, '0'); // bytes param offset (2 words)
    const len = (1312).toString(16).padStart(64, '0');
    // pad pk to 32-byte boundary: 1312 bytes is exactly 41 words of 32 bytes (1312 = 41 * 32), no padding needed!
    const calldata = '0x' + sel + toClean + offset + len + pk;

    $('rec-cd-out').textContent = calldata;
    toast('Migration calldata assembled ✓');
  };

  $('rec-copy-cd').onclick = () => {
    const val = $('rec-cd-out').textContent;
    if (val && val.startsWith('0x')) {
      navigator.clipboard.writeText(val);
      toast('Calldata copied to clipboard ✓');
    }
  };
}

// =========================================================================
// APP 4: PQ SIGNER (ML-DSA-44 Sign & Verify)
// =========================================================================
function renderSigner(el) {
  el.innerHTML = `
    <h2>SIGNER.EXE // LATTICE SIGNATURE BENCH</h2>
    <p class="lead">Sign and verify arbitrary payloads using NIST FIPS 204 (ML-DSA-44) lattice cryptography. Completely browser-side.</p>

    <div class="cols">
      <div>
        <div class="box">
          <h3>SIGN MESSAGE</h3>
          <div class="field">
            <label>Message Payload (Text)</label>
            <textarea id="sig-msg-in" placeholder="Transfer 500 ETH to safe multisig...">AXION OS quantum security verification message</textarea>
          </div>
          <div class="field">
            <label>Secret Key (Hex, 2560 bytes)</label>
            <textarea id="sig-sk-in" placeholder="0x... or leave empty to generate key on the fly"></textarea>
          </div>
          <div class="btns" style="margin-top:12px">
            <button class="btn pri" id="sig-sign-btn" type="button">Sign Payload ▶</button>
            <button class="btn sm cy" id="sig-use-ark-btn" type="button">Use Key From Ark</button>
          </div>
        </div>
      </div>

      <div>
        <div class="box">
          <h3>VERIFY SIGNATURE</h3>
          <div class="field">
            <label>Message</label>
            <input type="text" id="ver-msg-in" value="AXION OS quantum security verification message">
          </div>
          <div class="field">
            <label>Public Key (1312 bytes hex)</label>
            <input type="text" id="ver-pk-in" placeholder="0x...">
          </div>
          <div class="field">
            <label>Signature (2420 bytes hex)</label>
            <textarea id="ver-sig-in" placeholder="0x..."></textarea>
          </div>
          <div class="btns" style="margin-top:12px">
            <button class="btn cy" id="ver-verify-btn" type="button">Verify Signature ▶</button>
          </div>
          <div id="ver-badge" style="margin-top:14px;display:none"></div>
        </div>
      </div>
    </div>

    <div class="box" style="margin-top:18px">
      <div class="outhead"><span class="label">Latest Produced Signature</span><button class="btn sm" id="sig-copy-res" type="button">Copy</button></div>
      <div class="out" id="sig-res-out" style="min-height:90px">Awaiting signature generation...</div>
    </div>
  `;

  $('sig-use-ark-btn').onclick = () => {
    if (!currentArkKit) return toast('Generate an Ark key first', true);
    $('sig-sk-in').value = currentArkKit.secretKey;
    $('ver-pk-in').value = currentArkKit.publicKey;
    toast('Imported key from Ark ✓');
  };

  $('sig-sign-btn').onclick = () => {
    try {
      const msgText = $('sig-msg-in').value;
      if (!msgText) return toast('Enter a message', true);
      const msgBytes = new TextEncoder().encode(msgText);

      let skHex = $('sig-sk-in').value.trim();
      let pkHex = $('ver-pk-in').value.trim();

      if (!skHex) {
        toast('Forging fresh keypair…');
        const k = ml_dsa44.keygen();
        skHex = '0x' + bytesToHex(k.secretKey);
        pkHex = '0x' + bytesToHex(k.publicKey);
        $('sig-sk-in').value = skHex;
        $('ver-pk-in').value = pkHex;
      }

      const skBytes = hexToBytes(skHex.replace(/^0x/, ''));
      const sig = ml_dsa44.sign(skBytes, msgBytes);
      const sigHex = '0x' + bytesToHex(sig);

      $('sig-res-out').textContent = sigHex;
      $('ver-msg-in').value = msgText;
      $('ver-sig-in').value = sigHex;

      toast('Signature forged (2420 bytes) ✓');
    } catch (err) {
      console.error(err);
      toast('Signing failed: ' + err.message, true);
    }
  };

  $('ver-verify-btn').onclick = () => {
    try {
      const msgText = $('ver-msg-in').value;
      const pkHex = $('ver-pk-in').value.trim().replace(/^0x/, '');
      const sigHex = $('ver-sig-in').value.trim().replace(/^0x/, '');

      if (!pkHex || !sigHex) return toast('Public key and signature required', true);

      const msgBytes = new TextEncoder().encode(msgText);
      const pkBytes = hexToBytes(pkHex);
      const sigBytes = hexToBytes(sigHex);

      const valid = ml_dsa44.verify(pkBytes, msgBytes, sigBytes);
      const badge = $('ver-badge');
      badge.style.display = 'block';

      if (valid) {
        badge.innerHTML = `<div class="out ok">[ VALID NIST FIPS 204 SIGNATURE ]<br>Cryptographically intact. Verified offline.</div>`;
        toast('Signature VALID ✓');
      } else {
        badge.innerHTML = `<div class="out bad">[ INVALID SIGNATURE ]<br>Verification failed. Signature does not match payload.</div>`;
        toast('Signature INVALID', true);
      }
    } catch (e) {
      const badge = $('ver-badge');
      badge.style.display = 'block';
      badge.innerHTML = `<div class="out bad">[ VERIFICATION ERROR ]<br>${escapeHtml(e.message)}</div>`;
      toast('Verification error', true);
    }
  };

  $('sig-copy-res').onclick = () => {
    const val = $('sig-res-out').textContent;
    if (val.startsWith('0x')) { navigator.clipboard.writeText(val); toast('Signature copied ✓'); }
  };
}

// =========================================================================
// APP 5: ORACLE (Threat Level & Subscription)
// =========================================================================
function renderOracle(el) {
  const s = globalState;
  const threat = s?.threat || { level: 0, label: 'NOMINAL', tone: 'ok' };

  el.innerHTML = `
    <h2>ORACLE.EXE // ON-CHAIN THREAT ORACLE</h2>
    <p class="lead">Real-time threat level reading and protocol response matrix for Ethereum smart contracts.</p>

    <div class="cols">
      <div>
        <div class="box">
          <h3>CURRENT FEED STATUS</h3>
          <div class="kv">
            <span>Threat level</span><b class="c-${threat.tone === 'ok' ? 'lime' : threat.tone === 'warn' ? 'amber' : 'red'}">${threat.level} / 4 (${threat.label})</b>
            <span>Axion moment</span><span>${s?.moment ? new Date(s.moment).toISOString() : 'NOT TRIGGERED'}</span>
            <span>Contract address</span><span class="mono">${CONFIG.contracts.oracle || '0x43b... (Local Anvil)'}</span>
            <span>Refresh cycle</span><span>Every 12 seconds</span>
          </div>
          <div class="btns" style="margin-top:14px">
            <button class="btn cy sm" id="ora-refresh-btn" type="button">Force Read ▶</button>
          </div>
        </div>

        <div class="box" style="margin-top:14px">
          <h3>THREAT LEVEL SUBSCRIPTION</h3>
          <p style="margin:0 0 10px;color:var(--dim);font-size:18px">Get automated webhook/email notifications when the on-chain threat level changes.</p>
          <div class="field">
            <label>Recipient Email</label>
            <input type="email" id="ora-email-in" placeholder="security@dao.org">
          </div>
          <div class="field">
            <label>Trigger Minimum Level</label>
            <select id="ora-level-sel">
              <option value="1">Level 1 · Watch (192-bit break)</option>
              <option value="2">Level 2 · Elevated (224-bit break)</option>
              <option value="3">Level 3 · Critical (256-bit P-256 break)</option>
              <option value="4">Level 4 · Breach (secp256k1 L1 break)</option>
            </select>
          </div>
          <div class="btns" style="margin-top:14px">
            <button class="btn pri sm" id="ora-sub-btn" type="button">Arm Alert ▶</button>
          </div>
        </div>
      </div>

      <div>
        <div class="box">
          <h3>RESPONSE PLAYBOOK</h3>
          <div class="scroll">
            <table class="t">
              <thead><tr><th>Level</th><th>Trigger Condition</th><th>Action Required</th></tr></thead>
              <tbody>
                <tr><td class="c-lime">0 · NOMINAL</td><td>All armed rungs intact</td><td>Generate and commit Ark keys. Normal operations.</td></tr>
                <tr><td class="c-amber">1 · WATCH</td><td>192-bit rung cracked</td><td>Prepare migration scripts. Monitor canary gas fees.</td></tr>
                <tr><td class="c-amber">2 · ELEVATED</td><td>224-bit rung cracked</td><td>Pause non-essential bridge transfers. Freeze high-value DAOs.</td></tr>
                <tr><td class="c-red">3 · CRITICAL</td><td>256-bit P-256 cracked</td><td>Execute emergency migration to post-quantum addresses.</td></tr>
                <tr><td class="c-red">4 · BREACH</td><td>secp256k1 L1 curve solved</td><td>All ECDSA signatures vulnerable. Fall back to Ark commitments.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  $('ora-refresh-btn').onclick = async () => {
    toast('Querying oracle feed…');
    await pollStatus();
    renderOracle(el);
    toast('Oracle state refreshed ✓');
  };

  $('ora-sub-btn').onclick = async () => {
    const email = $('ora-email-in').value.trim();
    const level = $('ora-level-sel').value;
    if (!email) return toast('Enter valid email', true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, level }),
      });
      const d = await res.json();
      if (d.ok) toast(d.message + ' ✓');
      else toast(d.error || 'Subscription error', true);
    } catch (e) {
      toast('Alert service unreachable', true);
    }
  };
}

// =========================================================================
// APP 6: CANARY (ECDLP Ladder & In-Browser BSGS Solver)
// =========================================================================
let currentWorker = null;

async function renderCanary(el) {
  el.innerHTML = `
    <h2>CANARY.EXE // ECDLP BOUNTY LADDER</h2>
    <p class="lead">Fourteen elliptic-curve challenges. Training rungs (≤40 bits) can be cracked in your browser using Shanks' Baby-Step Giant-Step algorithm.</p>

    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="btns">
          <button class="btn sm pri" id="can-tab-all" type="button">All Rungs</button>
          <button class="btn sm" id="can-tab-train" type="button">Training (16–64b)</button>
          <button class="btn sm" id="can-tab-armed" type="button">Armed (192–256b)</button>
        </div>
        <div class="tag" id="can-count">Loading…</div>
      </div>
      <div class="scroll" style="margin-top:14px">
        <table class="t click" id="can-table">
          <thead>
            <tr><th>Rung ID</th><th>Curve</th><th>Bits</th><th>Tier</th><th>Points</th><th>Status</th></tr>
          </thead>
          <tbody id="can-tbody">
            <tr><td colspan="6" class="empty">Loading canary rungs…</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="cols" style="margin-top:18px">
      <div class="box">
        <h3>SELECTED RUNG DETAILS</h3>
        <div id="can-detail" class="empty">Click any rung row above to inspect.</div>
      </div>

      <div class="box">
        <h3>IN-BROWSER BSGS SOLVER</h3>
        <div id="can-solver-panel">
          <p style="color:var(--dim);margin:0 0 10px">Select an eligible training rung (≤40 bits) to unleash the Web Worker solver.</p>
        </div>
      </div>
    </div>
  `;

  let rungs = [];
  try {
    const res = await fetch('/api/rungs');
    const data = await res.json();
    rungs = data.rungs || [];
  } catch (err) {
    $('can-tbody').innerHTML = `<tr><td colspan="6" class="empty c-red">Failed to load rungs</td></tr>`;
    return;
  }

  let filter = 'all';

  function drawTable() {
    const filtered = rungs.filter(r => {
      if (filter === 'train') return r.tier === 'training';
      if (filter === 'armed') return r.tier === 'armed';
      return true;
    });

    $('can-count').textContent = `${filtered.length} rungs active`;
    $('can-tbody').innerHTML = filtered.map(r => `
      <tr data-id="${r.id}" class="${r.broken ? 'sel' : ''}">
        <td><b>${r.id}</b></td>
        <td>${r.curve}</td>
        <td class="num">${r.bits}</td>
        <td><span class="pill ${r.tier === 'armed' ? 'c-red' : 'c-cyan'}">${r.tier}</span></td>
        <td class="num c-lime">+${r.points}</td>
        <td><span class="${r.broken ? 'c-lime' : 'c-dim'}">${r.broken ? 'BROKEN by ' + escapeHtml(r.brokenBy) : 'INTACT'}</span></td>
      </tr>
    `).join('');

    // Row selection
    $('can-tbody').querySelectorAll('tr').forEach(tr => {
      tr.onclick = () => selectRung(tr.getAttribute('data-id'));
    });
  }

  $('can-tab-all').onclick = () => { filter = 'all'; drawTable(); };
  $('can-tab-train').onclick = () => { filter = 'train'; drawTable(); };
  $('can-tab-armed').onclick = () => { filter = 'armed'; drawTable(); };

  function selectRung(id) {
    const r = rungs.find(x => x.id === id);
    if (!r) return;

    $('can-detail').innerHTML = `
      <div class="dl">
        <dt>Rung ID</dt><dd class="c-lime">${r.id} (${r.curve})</dd>
        <dt>Tier</dt><dd>${r.tier.toUpperCase()}</dd>
        <dt>Bits</dt><dd>${r.bits} bits</dd>
        <dt>Field Prime p</dt><dd class="break">${r.params.p}</dd>
        <dt>Generator G</dt><dd class="break">x: ${r.params.gx}<br>y: ${r.params.gy}</dd>
        <dt>Target Point Q</dt><dd class="break">x: ${r.params.qx}<br>y: ${r.params.qy}</dd>
        <dt>Key Range</dt><dd>${r.params.keyRange}</dd>
      </div>
    `;

    const solver = $('can-solver-panel');
    if (r.browserSolvable) {
      solver.innerHTML = `
        <div class="step"><b>TARGET</b><span>${r.id} · ${r.bits}-bit challenge</span></div>
        <div class="btns">
          <button class="btn pri" id="worker-start-btn" type="button">Start BSGS Solver ▶</button>
          <button class="btn sm" id="worker-stop-btn" type="button" disabled>Cancel</button>
        </div>
        <div class="progress" style="margin-top:14px"><i id="worker-bar"></i></div>
        <div id="worker-status" class="out" style="margin-top:10px">Worker ready. Estimated runtime: ${r.bits <= 24 ? '< 1 sec' : r.bits <= 32 ? '1-5 sec' : '15-45 sec'}.</div>
        
        <div class="field" style="margin-top:12px">
          <label>Solver Handle</label>
          <input type="text" id="solver-handle" placeholder="hunter.eth" value="axi_solver">
        </div>
        <div class="field">
          <label>Discovered Discrete Log (k)</label>
          <input type="text" id="worker-k-out" placeholder="0x..." readonly>
        </div>
        <div class="btns" style="margin-top:10px">
          <button class="btn cy" id="worker-claim-btn" type="button" disabled>Submit Claim to Leaderboard ▶</button>
        </div>
      `;

      $('worker-start-btn').onclick = () => startSolver(r);
      $('worker-stop-btn').onclick = stopSolver;
      $('worker-claim-btn').onclick = () => submitClaim(r);
    } else {
      solver.innerHTML = `
        <div class="note r">
          Rung ${r.id} is ${r.bits}-bit (${r.tier}). Keyspace is 2^${r.bits}, which exceeds in-browser memory.
        </div>
        <div class="field" style="margin-top:12px">
          <label>Manual Scalar Solution (Hex or Dec)</label>
          <input type="text" id="manual-k-in" placeholder="0x...">
        </div>
        <div class="field">
          <label>Solver Handle</label>
          <input type="text" id="manual-handle-in" placeholder="hunter.eth" value="hunter">
        </div>
        <div class="btns" style="margin-top:12px">
          <button class="btn cy" id="manual-submit-btn" type="button">Submit Solution ▶</button>
        </div>
      `;

      $('manual-submit-btn').onclick = async () => {
        const k = $('manual-k-in').value.trim();
        const handle = $('manual-handle-in').value.trim() || 'anon';
        if (!k) return toast('Scalar k required', true);
        await postClaim(r.id, k, handle);
      };
    }
  }

  function startSolver(r) {
    stopSolver();
    $('worker-start-btn').disabled = true;
    $('worker-stop-btn').disabled = false;
    $('worker-claim-btn').disabled = true;
    $('worker-bar').style.width = '0%';
    $('worker-status').textContent = 'Spawning Web Worker… initializing baby-step table…';

    currentWorker = new Worker('/app/solver.worker.js');
    currentWorker.postMessage({
      p: r.params.p, a: r.params.a,
      gx: r.params.gx, gy: r.params.gy,
      qx: r.params.qx, qy: r.params.qy,
      bits: r.bits,
    });

    currentWorker.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'progress') {
        $('worker-bar').style.width = d.pct.toFixed(1) + '%';
        $('worker-status').textContent = `Phase: ${d.phase.toUpperCase()} STEPS (${d.pct.toFixed(1)}%) | Evaluated: ${d.steps.toLocaleString()} points`;
      } else if (d.type === 'found') {
        $('worker-bar').style.width = '100%';
        $('worker-status').textContent = `SUCCESS! Found k = ${d.k} in ${d.ms} ms (table: ${d.tableSize} pts)`;
        $('worker-k-out').value = d.k;
        $('worker-claim-btn').disabled = false;
        $('worker-start-btn').disabled = false;
        $('worker-stop-btn').disabled = true;
        toast('Discrete log scalar cracked! ✓');
      } else if (d.type === 'fail') {
        $('worker-status').textContent = `Search complete. No scalar found in designated window (${d.ms.toFixed(0)} ms).`;
        $('worker-start-btn').disabled = false;
        $('worker-stop-btn').disabled = true;
        toast('Solver finished with no match', true);
      }
    };
  }

  function stopSolver() {
    if (currentWorker) {
      currentWorker.terminate();
      currentWorker = null;
      toast('Solver aborted');
    }
    const b = $('worker-start-btn');
    if (b) b.disabled = false;
    const c = $('worker-stop-btn');
    if (c) c.disabled = true;
  }

  async function submitClaim(r) {
    const k = $('worker-k-out').value;
    const handle = $('solver-handle').value.trim() || 'anon';
    await postClaim(r.id, k, handle);
  }

  async function postClaim(id, k, handle) {
    try {
      toast('Submitting solution to oracle…');
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, k, handle }),
      });
      const d = await res.json();
      if (d.ok) {
        toast(d.message + ' ✓');
        await renderCanary(el);
      } else {
        toast(d.message || d.error || 'Claim rejected', true);
      }
    } catch (e) {
      toast('Network error claiming bounty', true);
    }
  }

  drawTable();
  if (rungs.length > 0) selectRung(rungs[0].id);
}

// =========================================================================
// APP 7: GUARD (Contract Builder)
// =========================================================================
function renderGuard(el) {
  el.innerHTML = `
    <h2>GUARD.EXE // CONTRACT LOCK BUILDER</h2>
    <p class="lead">Generate a custom Solidity smart contract inheriting AxionGuard to shield your protocol when quantum threats arise.</p>

    <div class="cols">
      <div>
        <div class="box">
          <h3>SPECIFICATIONS</h3>
          <div class="field">
            <label>Contract Name</label>
            <input type="text" id="gd-name" value="TreasuryVault">
          </div>
          <div class="field">
            <label>Trip Safety Threshold</label>
            <select id="gd-thresh">
              <option value="1">Level 1 · WATCH (Conservative / Paranoid)</option>
              <option value="2" selected>Level 2 · ELEVATED (Recommended for DeFi)</option>
              <option value="3">Level 3 · CRITICAL (Permissive)</option>
            </select>
          </div>
          <div class="field">
            <label>Protected Functions</label>
            <div class="checks">
              <label><input type="checkbox" id="fn-withdraw" checked> withdraw()</label>
              <label><input type="checkbox" id="fn-transfer" checked> transfer()</label>
              <label><input type="checkbox" id="fn-mint" checked> mint()</label>
              <label><input type="checkbox" id="fn-upgrade"> upgrade()</label>
            </div>
          </div>
          <div class="btns" style="margin-top:14px">
            <button class="btn pri" id="gd-gen-btn" type="button">Assemble Contract ▶</button>
            <button class="btn cy sm" id="gd-dl-btn" type="button">Download .sol</button>
          </div>
        </div>
      </div>

      <div>
        <div class="box">
          <div class="outhead"><span class="label">Generated Solidity Code</span><button class="btn sm" id="gd-copy-btn" type="button">Copy Code</button></div>
          <pre class="src" id="gd-code-out" style="max-height:480px"></pre>
        </div>
      </div>
    </div>
  `;

  function generateCode() {
    const name = ($('gd-name').value.trim() || 'MyGuardContract').replace(/[^\w]/g, '');
    const threshVal = $('gd-thresh').value;
    const threshLabel = threshVal === '1' ? 'IAxionOracle.ThreatLevel.WATCH' : threshVal === '2' ? 'IAxionOracle.ThreatLevel.ELEVATED' : 'IAxionOracle.ThreatLevel.CRITICAL';

    const fns = [];
    if ($('fn-withdraw').checked) {
      fns.push(`    function withdraw(uint256 amount, address payable to) external onlyOwner quantumSafe {\n        require(amount <= address(this).balance, "Insufficient balance");\n        to.transfer(amount);\n    }`);
    }
    if ($('fn-transfer').checked) {
      fns.push(`    function transferTokens(address token, address to, uint256 amount) external onlyOwner quantumSafe {\n        // ERC-20 transfer logic\n    }`);
    }
    if ($('fn-mint').checked) {
      fns.push(`    function mint(address to, uint256 amount) external quantumSafe {\n        // Minting logic protected against compromised signers\n    }`);
    }
    if ($('fn-upgrade').checked) {
      fns.push(`    function upgradeImplementation(address newImpl) external onlyOwner quantumSafe {\n        // Proxy upgrade logic\n    }`);
    }

    const code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AxionGuard.sol";

/**
 * @title ${name}
 * @notice Protected by AXION OS quantum early warning system.
 */
contract ${name} is AxionGuard {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller not owner");
        _;
    }

    constructor(IAxionOracle _oracle)
        AxionGuard(_oracle, ${threshLabel})
    {
        owner = msg.sender;
    }

${fns.join('\n\n')}
}`;

    $('gd-code-out').textContent = code;
  }

  $('gd-gen-btn').onclick = () => {
    generateCode();
    toast('Solidity contract assembled ✓');
  };
  $('gd-copy-btn').onclick = () => {
    navigator.clipboard.writeText($('gd-code-out').textContent);
    toast('Code copied to clipboard ✓');
  };
  $('gd-dl-btn').onclick = () => {
    const code = $('gd-code-out').textContent;
    const name = ($('gd-name').value.trim() || 'MyGuardContract').replace(/[^\w]/g, '');
    const blob = new Blob([code], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${name}.sol`;
    a.click();
    URL.revokeObjectURL(u);
    toast('Contract file downloaded ✓');
  };

  generateCode();
}

// =========================================================================
// APP 8: LEADERBOARD
// =========================================================================
async function renderBoard(el) {
  el.innerHTML = `
    <h2>BOARD.EXE // CRYPTANALYSIS LEADERBOARD</h2>
    <p class="lead">Solvers who successfully cracked discrete logarithm challenges on the AXION OS canary ladder.</p>

    <div class="cols">
      <div class="box">
        <h3>TOP HUNTERS</h3>
        <div class="scroll">
          <table class="t">
            <thead><tr><th>Rank</th><th>Handle</th><th>Points</th><th>Cracked Rungs</th></tr></thead>
            <tbody id="board-tbody"><tr><td colspan="4" class="empty">Loading standings…</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="box">
        <h3>LATEST VERIFIED CLAIMS</h3>
        <div class="scroll">
          <table class="t">
            <thead><tr><th>Rung</th><th>Bits</th><th>Solver</th><th>When</th></tr></thead>
            <tbody id="claims-tbody"><tr><td colspan="4" class="empty">Loading claim feed…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/leaderboard');
    const d = await res.json();

    const pBody = $('board-tbody');
    if (d.players && d.players.length > 0) {
      pBody.innerHTML = d.players.map(p => `
        <tr>
          <td><b class="${p.rank === 1 ? 'c-lime' : p.rank <= 3 ? 'c-cyan' : ''}">#${p.rank}</b></td>
          <td>${escapeHtml(p.handle)}</td>
          <td class="num c-lime">${p.points.toLocaleString()}</td>
          <td>${p.rungs.join(', ')}</td>
        </tr>
      `).join('');
    } else {
      pBody.innerHTML = `<tr><td colspan="4" class="empty">No hunters on the board yet. Be the first to crack a training rung!</td></tr>`;
    }

    const cBody = $('claims-tbody');
    if (d.recent && d.recent.length > 0) {
      cBody.innerHTML = d.recent.map(c => `
        <tr>
          <td><b class="c-cyan">${c.id}</b></td>
          <td class="num">${c.bits}b</td>
          <td>${escapeHtml(c.by)}</td>
          <td class="num c-dim">${new Date(c.at).toLocaleTimeString()}</td>
        </tr>
      `).join('');
    } else {
      cBody.innerHTML = `<tr><td colspan="4" class="empty">No recent claims.</td></tr>`;
    }
  } catch (err) {
    $('board-tbody').innerHTML = `<tr><td colspan="4" class="empty c-red">Failed to load leaderboard</td></tr>`;
  }
}

// =========================================================================
// APP 9: SOURCE (Contract Code Viewer)
// =========================================================================
const CONTRACT_FILES = [
  { name: 'AxionOracle.sol', path: '/contracts/AxionOracle.sol', desc: 'Threat level oracle & moment recorder' },
  { name: 'AxionCanary.sol', path: '/contracts/AxionCanary.sol', desc: 'ECDLP bounty ladder' },
  { name: 'AxionGuard.sol',  path: '/contracts/AxionGuard.sol',  desc: 'Abstract circuit breaker base' },
  { name: 'AxionArk.sol',    path: '/contracts/AxionArk.sol',    desc: 'Pre-moment PQ key registry' },
  { name: 'AxionVault.sol',  path: '/contracts/AxionVault.sol',  desc: 'Protected vault with emergency recovery' },
];

async function renderContracts(el) {
  el.innerHTML = `
    <h2>SOURCE.EXE // REFERENCE SOLIDITY</h2>
    <p class="lead">Inspect the audited-pattern smart contracts that power the AXION OS quantum defense architecture.</p>

    <div class="files">
      <div class="flist" id="contract-list">
        ${CONTRACT_FILES.map((f, i) => `
          <button type="button" data-idx="${i}" ${i === 0 ? 'aria-pressed="true"' : ''}>
            ${f.name}
            <span>${f.name.split('.')[0].slice(5)}</span>
          </button>
        `).join('')}
      </div>

      <div class="box" style="padding:0">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:2px solid var(--line)">
          <span class="label" id="src-active-title">AxionOracle.sol</span>
          <div class="btns">
            <button class="btn sm" id="src-copy-btn" type="button">Copy</button>
            <button class="btn sm cy" id="src-dl-btn" type="button">Download</button>
          </div>
        </div>
        <pre class="src" id="src-view" style="border:0">Loading contract source…</pre>
      </div>
    </div>
  `;

  let currentCode = '';
  let currentFileName = 'AxionOracle.sol';

  async function loadFile(idx) {
    const f = CONTRACT_FILES[idx];
    currentFileName = f.name;
    $('src-active-title').textContent = f.name + ' · ' + f.desc;
    try {
      const res = await fetch(f.path);
      currentCode = await res.text();
      $('src-view').textContent = currentCode;
    } catch (e) {
      $('src-view').textContent = '// Error loading contract file';
    }
  }

  $('contract-list').querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      $('contract-list').querySelectorAll('button').forEach(b => b.removeAttribute('aria-pressed'));
      btn.setAttribute('aria-pressed', 'true');
      loadFile(parseInt(btn.getAttribute('data-idx'), 10));
    };
  });

  $('src-copy-btn').onclick = () => {
    if (currentCode) { navigator.clipboard.writeText(currentCode); toast('Contract copied ✓'); }
  };
  $('src-dl-btn').onclick = () => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(u);
    toast('Contract file downloaded ✓');
  };

  loadFile(0);
}

// =========================================================================
// APP 10: SETTINGS (Config & Environment)
// =========================================================================
function renderSettings(el) {
  el.innerHTML = `
    <h2>CONFIG.EXE // SYSTEM PREFERENCES</h2>
    <p class="lead">Configure local network endpoints, smart contract target overrides, and clear application caches.</p>

    <div class="cols">
      <div class="box">
        <h3>NETWORK & RPC</h3>
        <div class="field">
          <label>Ethereum RPC Endpoint</label>
          <input type="text" id="set-rpc-in" value="${CONFIG.rpc}">
        </div>
        <div class="field">
          <label>Canary Contract Address</label>
          <input type="text" id="set-can-in" value="${CONFIG.contracts.canary || ''}" placeholder="0x...">
        </div>
        <div class="field">
          <label>Oracle Contract Address</label>
          <input type="text" id="set-ora-in" value="${CONFIG.contracts.oracle || ''}" placeholder="0x...">
        </div>
        <div class="field">
          <label>Ark Contract Address</label>
          <input type="text" id="set-ark-in" value="${CONFIG.contracts.ark || ''}" placeholder="0x...">
        </div>
        <div class="btns" style="margin-top:14px">
          <button class="btn pri sm" id="set-save-btn" type="button">Save Settings</button>
          <button class="btn sm" id="set-reset-btn" type="button">Reset Defaults</button>
        </div>
      </div>

      <div class="box">
        <h3>DIAGNOSTICS & SYSTEM INFO</h3>
        <div class="dl">
          <dt>Browser Engine</dt><dd>${navigator.userAgent.slice(0, 48)}…</dd>
          <dt>Lattice Signature</dt><dd class="c-lime">ML-DSA-44 (FIPS 204)</dd>
          <dt>Hash Primitive</dt><dd class="c-lime">keccak256</dd>
          <dt>Backend State</dt><dd>${globalState ? globalState.system.store : 'connecting'}</dd>
          <dt>Dev Seed Active</dt><dd>${globalState?.system?.devSeed ? 'YES (solvable training seeds)' : 'NO (production keys)'}</dd>
        </div>
        <div class="btns" style="margin-top:18px">
          <button class="btn cy sm" id="set-clearcache-btn" type="button">Purge Local Storage</button>
        </div>
      </div>
    </div>
  `;

  $('set-save-btn').onclick = () => {
    CONFIG.rpc = $('set-rpc-in').value.trim();
    CONFIG.contracts.canary = $('set-can-in').value.trim();
    CONFIG.contracts.oracle = $('set-ora-in').value.trim();
    CONFIG.contracts.ark = $('set-ark-in').value.trim();
    toast('Settings saved ✓');
  };

  $('set-reset-btn').onclick = () => {
    $('set-rpc-in').value = 'https://ethereum-rpc.publicnode.com';
    $('set-can-in').value = '';
    $('set-ora-in').value = '';
    $('set-ark-in').value = '';
    toast('Reset to default configurations');
  };

  $('set-clearcache-btn').onclick = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast('Cache cleared successfully ✓');
  };
}

// ----------------- Initialization -----------------
setupWallet();
pollStatus().then(() => {
  navigate();
});
