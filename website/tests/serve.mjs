import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {extname, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = await realpath(fileURLToPath(new URL('../build/', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
  '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (request, response) => {
  const fail = (status) => { response.writeHead(status); response.end(); };
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    return fail(405);
  }
  try {
    const pathname = decodeURIComponent(request.url.split('?')[0]);
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return fail(400);
    if (!pathname.startsWith('/hubsaude/')) return fail(404);
    let file = join(root, pathname.slice('/hubsaude/'.length));
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(308, {Location: `${encodeURI(pathname)}/${request.url.includes('?') ? `?${request.url.split('?').slice(1).join('?')}` : ''}`});
        return response.end();
      }
      file = join(file, 'index.html');
      info = await stat(file);
    }
    const resolved = await realpath(file);
    const inside = relative(root, resolved);
    if (inside === '..' || inside.startsWith(`..${sep}`) || !info.isFile()) return fail(404);
    response.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(resolved).on('error', () => response.destroy()).pipe(response);
  } catch (error) {
    fail(error instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
  }
});

server.listen(4173, '127.0.0.1', () => console.log('Static build: http://127.0.0.1:4173/hubsaude/'));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
