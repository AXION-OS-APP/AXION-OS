// AXION OS — automated comprehensive self-test
import { getRungs, verifyScalar, findRung } from '../lib/rungs.js';
import { systemState } from '../lib/state.js';
import { ml_dsa44, keccak_256, bytesToHex } from '../public/assets/vendor/crypto.js';
import { hsetnx, hget, KEYS } from '../lib/store.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

console.log('\n--- 1. Testing NIST FIPS 204 (ML-DSA-44) Crypto Bundle ---');
try {
  const keys = ml_dsa44.keygen();
  assert(keys.publicKey.length === 1312, 'ML-DSA-44 public key is 1312 bytes');
  assert(keys.secretKey.length === 2560, 'ML-DSA-44 secret key is 2560 bytes');

  const msg = new TextEncoder().encode('AXION OS Quantum Test');
  const sig = ml_dsa44.sign(keys.secretKey, msg);
  assert(sig.length === 2420, 'ML-DSA-44 signature is 2420 bytes');

  const valid = ml_dsa44.verify(keys.publicKey, msg, sig);
  assert(valid === true, 'Signature verifies correctly against public key');

  const tampered = new Uint8Array(msg);
  tampered[0] ^= 1;
  const invalid = ml_dsa44.verify(keys.publicKey, tampered, sig);
  assert(invalid === false, 'Tampered message fails verification');

  const commitment = bytesToHex(keccak_256(keys.publicKey));
  assert(commitment.length === 64, 'keccak256 commitment is 32 bytes (64 hex characters)');
} catch (err) {
  console.error(err);
  failed++;
}

console.log('\n--- 2. Testing Canary Rungs & Elliptic Curve Mathematics ---');
const rungs = getRungs();
assert(rungs.length === 14, `Generated exactly 14 rungs (got ${rungs.length})`);

const trainingRungs = rungs.filter(r => r.tier === 'training');
assert(trainingRungs.length === 10, 'Contains 10 training rungs (16-64 bits)');

const armedRungs = rungs.filter(r => r.tier === 'armed');
assert(armedRungs.length === 4, 'Contains 4 armed standard curves (192-256 bits)');

// Test verification of training secret scalars
const t16 = findRung('T016');
assert(t16 && t16.secret !== null, 'T016 training rung has derived secret');
assert(verifyScalar(t16, t16.secret) === true, 'T016 secret scalar successfully computes target point Q');
assert(verifyScalar(t16, t16.secret + 1n) === false, 'Incorrect scalar fails verification');

console.log('\n--- 3. Testing System State & Persistence Layer ---');
const initialState = await systemState();
assert(initialState.threat.level === 0, 'Initial threat level is 0 (NOMINAL)');
assert(initialState.rungs.armed.broken === 0, 'Zero armed rungs broken initially');

// Test atomic claim registration in storage
const testHandle = 'satosh1';
const firstWrite = await hsetnx(KEYS.broken, 'T016', { by: testHandle, at: Date.now() });
assert(firstWrite === true, 'First solver claim recorded in storage');

const secondWrite = await hsetnx(KEYS.broken, 'T016', { by: 'attacker', at: Date.now() });
assert(secondWrite === false, 'Duplicate claim rejected (HSETNX)');

const saved = await hget(KEYS.broken, 'T016');
assert(saved.by === testHandle, 'Solver attribution preserved accurately');

console.log(`\n========================================`);
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
