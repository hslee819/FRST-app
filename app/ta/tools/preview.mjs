import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedFiles = new Set([
  'basic.html',
  'renewal.html',
  'TA.html',
  'src/renewal-base.html',
  'src/renewal-ui.css',
  'src/review-cards.js',
  'src/review-cards.css',
  'KakaoTalk_20261106_151959657_14.jpg',
]);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg' };

export function createPreviewServer(root = projectRoot) {
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    if (pathname === '/') {
      response.writeHead(302, { Location: '/renewal.html' }).end();
      return;
    }
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }

    // The development HTML and the standalone output share the same relative link.
    const relative = pathname === '/src/basic.html' ? 'basic.html' : pathname.slice(1);
    if (!allowedFiles.has(relative)) {
      response.writeHead(404).end('Not found');
      return;
    }

    const filename = path.join(root, relative);
    try {
      const metadata = await stat(filename);
      if (!metadata.isFile()) throw new Error('Not a file');
      const contentType = types[path.extname(filename)];
      response.writeHead(200, {
        'Content-Type': contentType.startsWith('text/') ? `${contentType}; charset=utf-8` : contentType,
        'Content-Length': metadata.size,
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      const stream = createReadStream(filename);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch {
      response.writeHead(404).end('Not found. Run the build command first for renewal.html or TA.html.');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4174);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.on('error', (error) => {
      console.error(`Preview failed: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Local: http://127.0.0.1:${port}/renewal.html`);
      console.log(`Baseline: http://127.0.0.1:${port}/basic.html`);
    });
    process.on('SIGINT', () => server.close());
    process.on('SIGTERM', () => server.close());
  }
}
