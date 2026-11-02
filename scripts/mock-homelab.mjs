// A fake homelab: serves the API answers in widgets/<id>/fixture.json under /<id>/..., e.g.
// GET /radarr/api/v3/movie. Used by the tests and for trying the widgets without the
// real services:  node scripts/mock-homelab.mjs [port]   (default 4100)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every widget's fixture.json (widget id to its routes); a widget without one has none. */
export function loadFixtures(dir = path.join(ROOT, 'widgets')) {
  const out = {};
  for (const id of fs.readdirSync(dir)) {
    const file = path.join(dir, id, 'fixture.json');
    if (fs.existsSync(file)) out[id] = JSON.parse(fs.readFileSync(file, 'utf8')).routes;
  }
  return out;
}

/** Starts the mock; `requests` records every request (method, path, query, headers, body). */
export async function startMock({ port = 0, fixtures = loadFixtures() } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://mock');
    const [, widget, ...rest] = url.pathname.split('/');
    const route = `${req.method} /${rest.join('/')}`;
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ widget, route, query: Object.fromEntries(url.searchParams), headers: req.headers, body });
      const answer = fixtures[widget]?.[route];
      res.setHeader('content-type', 'application/json');
      if (answer === undefined) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: `no fixture for ${widget} ${route}` }));
      }
      // { "_headers": {...}, "_body": ... } answers with headers too (e.g. Gitea's X-Total-Count);
      // "_text" instead of "_body" answers plain text (e.g. Prometheus metrics)
      if (answer && typeof answer === 'object' && '_headers' in answer) {
        for (const [k, v] of Object.entries(answer._headers)) res.setHeader(k, v);
        return res.end(typeof answer._text === 'string' ? answer._text : JSON.stringify(answer._body ?? null));
      }
      res.end(JSON.stringify(answer));
    });
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((r) => server.close(r)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mock = await startMock({ port: Number(process.argv[2] ?? 4100) });
  console.log(`mock homelab on ${mock.url} (e.g. ${mock.url}/radarr/api/v3/movie)`);
}
