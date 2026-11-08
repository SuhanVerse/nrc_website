import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

// A local static preview, with the same optional repository prefix as the build.
const root = resolve('dist');
const base = process.env.SITE_BASE || '/';
const port = Number(process.env.PORT || 8051);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};
http
  .createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname,
      );
      if (!['GET', 'HEAD'].includes(request.method) || !path.startsWith(base))
        throw new Error('Not found');
      let file = resolve(root, path.slice(base.length));
      if (file !== root && !file.startsWith(root + sep))
        throw new Error('Not found');
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
      });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(await readFile(resolve(root, '404.html')));
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Static preview: http://127.0.0.1:${port}${base}`),
  );
