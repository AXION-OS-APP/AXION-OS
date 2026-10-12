# AXION OS // Utilities & Cryptographic Architecture

Comprehensive guide to all 10 utility programs and cryptographic primitives built into **AXION OS**.

---

## 📑 Table of Contents
1. [Lattice Keygen & Commitment (ARK.SYS)](#1-lattice-keygen--commitment-arksys)
2. [Emergency Vault Recovery (RECOVER.SYS)](#2-emergency-vault-recovery-recoversys)
3. [Lattice Message Signer & Verifier (SIGNER.SYS)](#3-lattice-message-signer--verifier-signersys)
4. [In-Browser BSGS Discrete Log Solver (CANARY.SYS)](#4-in-browser-bsgs-discrete-log-solver-canarysys)
5. [On-Chain Threat Oracle & Alerts (ORACLE.SYS)](#5-on-chain-threat-oracle--alerts-oraclesys)
6. [Smart Contract Lock Builder (GUARD.SYS)](#6-smart-contract-lock-builder-guardsys)
7. [Cryptanalysis Leaderboard (BOARD.SYS)](#7-cryptanalysis-leaderboard-boardsys)
8. [Reference Solidity Smart Contracts](#8-reference-solidity-smart-contracts)
9. [Serverless REST API Reference](#9-serverless-rest-api-reference)

---

## 1. Lattice Keygen & Commitment (ARK.SYS)
- **Standard**: NIST FIPS 204 (ML-DSA-44, formerly CRYSTALS-Dilithium2).
- **Execution**: 100% Client-side in browser via pure ESM bundle (`/assets/vendor/crypto.js`).
- **Keys**:
  - **Public Key**: 1,312 bytes hex.
  - **Secret Key**: 2,560 bytes hex.
  - **Commitment**: 32-byte `keccak256(publicKey)` digest (0x + 64 hex characters).
- **Output Artifacts**:
  - Downloadable JSON Recovery Kit (`axion-ark-recovery-kit-[alias]-[timestamp].json`).
  - Pre-formatted Ethereum L1 calldata for `AxionArk.commitKey(bytes32)`.
  - Registered to `/api/ark` registry for public verifiable timestamping.

---

## 2. Emergency Vault Recovery (RECOVER.SYS)
- **Purpose**: When an Ethereum wallet's secp256k1 ECDSA private key is at risk of quantum factoring, the owner uses this tool to authoritatively reassign vault ownership without exposing ECDSA signatures.
- **Verification**: Verifies that the uploaded ML-DSA-44 public key matches the exact `keccak256` commitment committed to `AxionArk` *before* the Axion Moment.
- **Output**:
  - Produces complete ABI-encoded calldata for:
    ```solidity
    emergencyMigrate(address newOwner, bytes pqPublicKey)
    ```
  - Compatible with any contract inheriting `AxionVault.sol`.

---

## 3. Lattice Message Signer & Verifier (SIGNER.SYS)
- **Algorithm**: ML-DSA-44 deterministic lattice signature generation.
- **Signature Size**: Exactly 2,420 bytes.
- **Offline Capable**: Works completely offline without internet or backend communication.
- **Use Cases**:
  - Authorizing post-quantum transactions.
  - Signing off-chain consensus messages and attestations.
  - Verifying integrity against post-quantum cryptographic standards.

---

## 4. In-Browser BSGS Discrete Log Solver (CANARY.SYS)
- **Mathematics**: Shanks' Baby-Step Giant-Step (BSGS) algorithm over Short-Weierstrass elliptic curves:
  $$y^2 = x^3 + ax + b \pmod p$$
- **Concurrency**: Runs inside a dedicated Web Worker (`/app/solver.worker.js`) to prevent browser thread freeze.
- **Keyspace**:
  - Toy training curves: 16 to 40 bits ($2^{16}$ to $2^{40}$).
  - Progress reporting: Baby-step precomputation phase (50%) + Giant-step lookup phase (50%).
- **Verification**: Once scalar $k$ is found, the solver submits to `/api/claim`, which recomputes $k \cdot G = Q$ on the server and awards points on the global leaderboard.

---

## 5. On-Chain Threat Oracle & Alerts (ORACLE.SYS)
- **Threat Scale (0 to 4)**:
  - `0 · NOMINAL`: All armed rungs intact. Standard operations.
  - `1 · WATCH`: 192-bit standard curve factored. Early warning stage.
  - `2 · ELEVATED`: 224-bit curve factored. DeFi protocols pause high-risk bridges.
  - `3 · CRITICAL`: 256-bit NIST P-256 factored. Emergency migration recommended.
  - `4 · BREACH`: secp256k1 L1 Ethereum curve broken. All accounts switch to Ark keys.
- **Axion Moment**: Recorded timestamp of the first armed rung breach.
- **Alert Dispatch**: Webhook / email alert subscriptions via `/api/subscribe`.

---

## 6. Smart Contract Lock Builder (GUARD.SYS)
- **Purpose**: Interactive tool to generate audited-pattern Solidity smart contracts that inherit `AxionGuard`.
- **Customization**:
  - Custom contract name (e.g. `TreasuryVault`, `BridgeEscrow`).
  - Trip safety threshold (`WATCH`, `ELEVATED`, or `CRITICAL`).
  - Selective function protection with the `quantumSafe` modifier (`withdraw`, `transfer`, `mint`, `upgrade`).
- **One-Click Export**: Copy to clipboard or download `.sol` file.

---

## 7. Cryptanalysis Leaderboard (BOARD.SYS)
- **Endpoint**: `/api/leaderboard`.
- **Scoring**: Higher bit-depth challenges yield exponentially higher point rewards.
- **Atomicity**: Uses atomic storage checks (`HSETNX`) to ensure only the first solver of an intact rung is credited as the breaker.

---

## 8. Reference Solidity Smart Contracts
Located in [`public/contracts/`](file:///C:/Users/ferry/.gemini/antigravity/scratch/axion-os/public/contracts):
- **`AxionOracle.sol`**: Tracks threat level, enforces permissioned canary updates, and records the Axion Moment timestamp.
- **`AxionCanary.sol`**: Manages on-chain bounty ladder, verifies submitted scalars, and elevates oracle levels upon armed curve breaks.
- **`AxionGuard.sol`**: Base contract with `quantumSafe` modifier that automatically halts protected functions when threat level exceeds threshold.
- **`AxionArk.sol`**: Pre-Moment registry storing 32-byte post-quantum key commitments. Forbids registrations after the Axion Moment has occurred.
- **`AxionVault.sol`**: Production-ready reference vault demonstrating both `quantumSafe` daily operations and emergency post-quantum migration.

---

## 9. Serverless REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Returns system threat level, rung ladder, moment timestamp, and live Ethereum mainnet snapshot. |
| `GET` | `/api/rungs` | Lists all 14 canary curve challenges and their mathematical parameters ($p, a, b, G, Q$). |
| `GET` | `/api/rungs?id=T032` | Returns public curve parameters for a specific rung. |
| `POST` | `/api/claim` | Submits candidate scalar $k$ for a rung. Server verifies $k \cdot G = Q$. |
| `POST` | `/api/ark` | Registers a 32-byte `keccak256` commitment hash. |
| `GET` | `/api/ark?c=0x...` | Queries registration status and metadata for a specific commitment. |
| `GET` | `/api/leaderboard` | Returns top cryptanalysis solvers and recent claim timeline. |
| `POST` | `/api/subscribe` | Registers an email address for automated threat level notifications. |
| `GET` | `/api/chain` | Returns cached live block number, gas price, base fee, and block capacity from Ethereum mainnet. |

---

*Open source, auditable, and built for the post-quantum era.*
