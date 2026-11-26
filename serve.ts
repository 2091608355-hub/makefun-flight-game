// Skylark Courier — tiny static server for local play-testing.
// Serves game/ at http://localhost:8080 so the game can be opened in a
// desktop browser exactly as the judges will serve it: plain files,
// no build step, nothing fetched from the network.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(fileURLToPath(import.meta.url), '..', 'game'));
const port = Number(process.env.PORT || 8080);

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const path = resolve(join(root, normalize(rel)));
    if (!path.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Skylark Courier serving game/ at http://localhost:${port}`);
});
