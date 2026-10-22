#!/usr/bin/env node
/** Tiny static file server for local testing: node serve.js <dir> <port> */
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(dir, path.normalize(p));
    if (!file.startsWith(dir)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': types['.html'] });
        return fs.createReadStream(path.join(dir, '404.html')).on('error', () => res.end('Not found')).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`Serving ${path.relative(process.cwd(), dir)} at http://localhost:${port}`));
