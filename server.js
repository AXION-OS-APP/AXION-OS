// AXION OS — zero-dependency local dev server: serves /public and routes /api/* to ./api/*.js
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.sol': 'text/plain; charset=utf-8', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};

async function serveStatic(req, res, pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const base = path.join(PUB, clean);
  if (!base.startsWith(PUB)) { res.writeHead(403).end(); return; }
  for (const f of [base, base + '.html', path.join(base, 'index.html')]) {
    try {
      const st = await fs.stat(f);
      if (!st.isFile()) continue;
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(await fs.readFile(f));
      return;
    } catch { /* try next */ }
  }
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(await fs.readFile(path.join(PUB, '404.html')).catch(() => '404'));
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://local');
  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).replace(/[^\w-]/g, '');
    const file = path.join(ROOT, 'api', name + '.js');
    try {
      await fs.access(file);
      const mod = await import(pathToFileURL(file).href);
      await mod.default(req, res);
    } catch (e) {
      if (e.code === 'ENOENT') { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"no such endpoint"}'); return; }
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  await serveStatic(req, res, pathname);
}).listen(PORT, () => console.log(`\n  ▓▓ AXION OS dev server → http://localhost:${PORT}\n`));
