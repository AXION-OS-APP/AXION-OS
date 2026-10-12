// Bundle noble post-quantum & hashes for browser usage
import esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VENDOR_DIR = path.join(ROOT, 'public', 'assets', 'vendor');
fs.mkdirSync(VENDOR_DIR, { recursive: true });

const entryCode = `
import { ml_dsa44 } from '@noble/post-quantum/ml-dsa';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export { ml_dsa44, keccak_256, bytesToHex, hexToBytes };
`;

const entryFile = path.join(VENDOR_DIR, '_entry.js');
fs.writeFileSync(entryFile, entryCode);

await esbuild.build({
  entryPoints: [entryFile],
  outfile: path.join(VENDOR_DIR, 'crypto.js'),
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2022'],
});

fs.unlinkSync(entryFile);
console.log('Built vendor crypto bundle -> public/assets/vendor/crypto.js');
