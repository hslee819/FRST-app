import http from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

const allowed = new Set(['index.html', 'styles.css', 'comparison.css', 'studio.css', 'app.js', 'app-data.js', 'comparison-data.js', 'app-comparison.js']);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript' };
const port = Number(process.env.PORT) || 4174;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!allowed.has(file)) { response.writeHead(404).end('Not found'); return; }
  response.setHeader('Content-Type', `${types[file.split('.').pop()]}; charset=utf-8`);
  response.setHeader('Cache-Control', 'no-store');
  const stream = createReadStream(fileURLToPath(new URL(file, import.meta.url)));
  stream.on('error', () => { response.statusCode = 500; response.end('Unable to read file'); });
  stream.pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
