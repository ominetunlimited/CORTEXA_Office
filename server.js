/* CORTEXA production static server (zero dependencies).
   Serves the Vite build in ./dist, binds Railway's $PORT on all interfaces,
   falls back to index.html for client-side routes, sets real security
   headers, and gives hashed assets long-lived immutable caching.          */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[cortexa] dist/index.html not found — run "npm run build" before starting the server.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
};

/* Real security headers — set here at the edge so the HTML stays preview-friendly. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(self)',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; " +
    "manifest-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

const IMMUTABLE = /^\/assets\//; /* Vite content-hashed bundles */

function send(res, status, body, type, extra) {
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': extra || 'no-cache',
    ...SECURITY_HEADERS,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
  }

  /* resolve safely inside ./dist — blocks path traversal */
  const rel = path.normalize(pathname).replace(/^([/\\])+/, '');
  let file = path.resolve(DIST, rel);
  if (!file.startsWith(DIST + path.sep) && file !== DIST) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  let stat = null;
  try { stat = fs.statSync(file); } catch { /* fall through to SPA shell */ }

  /* directory → its index.html */
  if (stat && stat.isDirectory()) {
    file = path.join(file, 'index.html');
    try { stat = fs.statSync(file); } catch { stat = null; }
  }

  const serveFile = (p, s) => {
    const ext = path.extname(p).toLowerCase();
    const cache = IMMUTABLE.test('/' + path.relative(DIST, p).replace(/\\/g, '/'))
      ? 'public, max-age=31536000, immutable'
      : (ext === '.html' || p.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300');
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': s.size,
      'Cache-Control': cache,
      ...SECURITY_HEADERS,
    });
    if (method === 'HEAD') return res.end();
    fs.createReadStream(p).pipe(res);
  };

  if (stat && stat.isFile()) return serveFile(file, stat);

  /* SPA fallback — every unrouted GET gets the application shell */
  const shell = path.join(DIST, 'index.html');
  const shellStat = fs.statSync(shell);
  res.writeHead(200, {
    'Content-Type': MIME['.html'],
    'Content-Length': shellStat.size,
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS,
  });
  if (method === 'HEAD') return res.end();
  fs.createReadStream(shell).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[cortexa] serving ./dist on http://${HOST}:${PORT}`);
});

/* graceful shutdown for container orchestrators */
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
