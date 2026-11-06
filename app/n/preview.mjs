import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('./', import.meta.url));
const allowed = new Set([
  'index.html', 'N.html', 'focus-content.html', 'grades-content.html',
  'src/base.css', 'src/my.css', 'src/services.css', 'src/focus.css', 'src/grades.css',
  'src/my.js', 'src/services.js', 'src/focus.js', 'src/app.js',
]);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };

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
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!allowed.has(relative) && !/^assets\/[a-z0-9-]+\.png$/.test(relative)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const filename = path.join(root, relative);
    let metadata;
    try {
      metadata = await stat(filename);
      if (!metadata.isFile()) throw new Error('Not a file');
    } catch {
      response.writeHead(404).end('Not found. Run node n/build.mjs to create N.html.');
      return;
    }
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
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4176);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.on('error', error => {
      console.error(`Preview failed: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Source: http://127.0.0.1:${port}/`);
      console.log(`Standalone: http://127.0.0.1:${port}/N.html`);
    });
    process.on('SIGINT', () => server.close());
    process.on('SIGTERM', () => server.close());
  }
}
