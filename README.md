# AXION OS // Cryptographic Utilities & Post-Quantum Tools

A fullstack suite of post-quantum cryptographic utilities (NIST FIPS 204 ML-DSA-44), elliptic-curve discrete logarithm solvers, and an on-chain quantum early-warning layer for Ethereum L1.

---

## 🛠️ Built-in Utilities Overview

| Utility | Interface | Core Technology | Description |
|---|---|---|---|
| **Lattice Keygen & Commitment** | `ARK.SYS` (`#ark`) | NIST FIPS 204 (ML-DSA-44) | Generates in-browser 1312-byte public keys, 2560-byte secret keys, exports JSON recovery kits, and registers 32-byte `keccak256` pre-Moment commitments. |
| **Emergency Vault Recovery** | `RECOVER.SYS` (`#recover`) | ABI Encoding & keccak256 | Validates saved recovery kits, verifies public key hashes, and builds L1 calldata for `emergencyMigrate(address,bytes)` for `AxionVault`. |
| **Lattice Signer & Verifier** | `SIGNER.SYS` (`#signer`) | ML-DSA-44 Signatures | Signs arbitrary payloads offline producing 2420-byte lattice signatures, and verifies signature validity in-browser. |
| **Canary Discrete Log Solver** | `CANARY.SYS` (`#canary`) | Shanks' BSGS Algorithm | Interactive Web Worker solving discrete logarithm challenges $k \cdot G = Q$ on custom 16-to-40 bit curves with live step telemetry. |
| **On-Chain Threat Oracle** | `ORACLE.SYS` (`#oracle`) | Ethereum JSON-RPC & Events | Real-time monitoring of threat levels (0 to 4), Axion Moment recording, response playbooks, and webhook/email alert triggers. |
| **Smart Contract Lock Builder** | `GUARD.SYS` (`#guard`) | Solidity 0.8.28 Code Generation | Dynamically generates custom contracts with `quantumSafe` modifiers based on selected sensitive functions (`withdraw`, `transfer`, `mint`, etc.). |
| **Leaderboard & Claims** | `BOARD.SYS` (`#board`) | Atomic Store (`HSETNX`) | Tracks solver rankings and real-time cryptanalysis bounty solutions. |
| **Smart Contracts Repository** | `SOURCE.SYS` (`#contracts`) | Reference Solidity Contracts | Source viewer and downloader for `AxionOracle`, `AxionCanary`, `AxionGuard`, `AxionArk`, and `AxionVault`. |

---

## 📂 Repository Architecture

```
axion-os/
├── api/                     # Cloud Serverless Endpoints (Node.js)
│   ├── status.js            # GET  /api/status (Threat level & live eth stats)
│   ├── rungs.js             # GET  /api/rungs (14 canary curves & parameters)
│   ├── claim.js             # POST /api/claim (Server verification of scalar k·G=Q)
│   ├── ark.js               # POST /api/ark (Post-quantum commitment registry)
│   ├── leaderboard.js       # GET  /api/leaderboard (Standings & claim timeline)
│   ├── subscribe.js         # POST /api/subscribe (Threat level notifications)
│   └── chain.js             # GET  /api/chain (Ethereum mainnet snapshot)
├── lib/                     # Cryptography & Storage Libraries
│   ├── ec.js                # BigInt Short-Weierstrass curve arithmetic
│   ├── rungs.js             # 10 training + 4 armed curve configurations
│   ├── store.js             # Memory & Upstash Redis adapter
│   ├── state.js             # State and threat-level aggregator
│   └── chain.js             # Ethereum RPC client
├── public/                  # Console Application & Contracts
│   ├── app/                 # Console UI & Web Worker solver
│   ├── assets/              # Vendor crypto bundle (ML-DSA-44 & keccak256)
│   └── contracts/           # Reference Solidity 0.8.28 smart contracts
│       ├── AxionOracle.sol  # Threat level oracle
│       ├── AxionCanary.sol  # ECDLP bounty ladder
│       ├── AxionGuard.sol   # Quantum circuit breaker
│       ├── AxionArk.sol     # Pre-moment commitment registry
│       └── AxionVault.sol   # Protected vault with emergency recovery
├── scripts/
│   ├── build-crypto.js      # Vendor bundle compiler
│   └── selftest.js          # Automated end-to-end test suite
└── package.json
```

---

## ⚡ Quickstart

### 1. Installation
```bash
git clone https://github.com/AXION-OS-APP/AXION-OS.git
cd axion-os
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open your browser at `http://localhost:3000/app` to access the utilities console.

### 3. Run Self-Test Suite
Executes the automated 17-point test covering ML-DSA-44 key generation, signature verification, EC point multiplication, and atomic store handlers:
```bash
npm test
```

---

## 🌐 Serverless REST API Specifications

### `GET /api/status`
Returns the aggregate quantum threat level, canary ladder state, and live Ethereum mainnet telemetry:
```json
{
  "threat": { "level": 0, "label": "NOMINAL", "tone": "ok", "max": 4 },
  "rungs": { "total": 14, "training": { "total": 10, "broken": 0 }, "armed": { "total": 4, "broken": 0 } },
  "chain": { "ok": true, "block": 21840000, "gasGwei": 12.5 }
}
```

### `POST /api/claim`
Submit a discovered discrete logarithm scalar $k$ for a challenge rung:
```json
{
  "id": "T016",
  "k": "0x8fa4",
  "handle": "hunter.eth"
}
```

### `POST /api/ark`
Register a 32-byte post-quantum key commitment before the decisive moment:
```json
{
  "commitment": "0x8f192b95ffc8da78631011ed6b24cdd573f977a11e7948110000000000000000",
  "alias": "vitalik.eth",
  "algo": "ML-DSA-44"
}
```

---

## ☁️ Cloud Deployment

Compatible with modern serverless and static hosting platforms (Node.js runtime):
- **Output Directory**: `public`
- **Node Version**: `20.x`

---

## 📄 License
MIT © AXION OS
*Open source cryptographic utilities for Ethereum L1.*
