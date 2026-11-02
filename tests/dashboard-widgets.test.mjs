// The widgets that came from the dashboard itself: the ones behind its own features
// (siteMonitor: http-status, ping: ping, container: docker, app: kubernetes-pods, proxmoxNode:
// proxmoxvm) and the generic and header widgets. Called through the public ctx contract only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import httpStatus from '../widgets/http-status/server.js';
import customApi, { pick } from '../widgets/custom-api/server.js';
import docker, { cpuPercent, byteValue } from '../widgets/docker/server.js';
import proxmoxvm, { memoryBlock } from '../widgets/proxmoxvm/server.js';
import kubernetesPods from '../widgets/kubernetes-pods/server.js';
import kubernetes, { PATHS as K8S, cores, bytes as k8sBytes } from '../widgets/kubernetes/server.js';
import resources, { PATHS as RESOURCE_PATHS, formatUptime, formatBytes } from '../widgets/resources/server.js';
import { parseLatency } from '../widgets/ping/server.js';
import button, { OUTPUT_LIMIT, CUT_MARKER, ROOT, ROOT_OFF } from '../widgets/button/server.js';

const silentLog = { info() {}, warn() {}, error() {} };

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Starts an HTTP server on a random port (or a unix socket); returns { url, close }. */
async function serve(handler, { socketPath } = {}) {
  const server = http.createServer(handler);
  await new Promise((resolve) => (socketPath ? server.listen(socketPath, resolve) : server.listen(0, '127.0.0.1', resolve)));
  const url = socketPath ? null : `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((r) => server.close(r)) };
}

/** The dashboard's ctx.fetch, as far as these widgets use it: relative to options.url, and socketPath. */
function widgetFetch(input, init = {}, baseUrl) {
  if (init.socketPath) {
    return new Promise((resolve, reject) => {
      const req = http.request({ socketPath: init.socketPath, path: String(input), method: init.method ?? 'GET', headers: { host: 'localhost' } }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode })));
      });
      req.on('error', reject);
      req.end();
    });
  }
  const url = baseUrl && !/^[a-z][a-z0-9+.-]*:/i.test(String(input)) ? new URL(String(input), baseUrl) : input;
  const { insecure, tls, ...rest } = init;
  return fetch(url, rest);
}

/** A minimal ctx for calling a widget's fetch() directly. */
function fakeCtx(options, overrides = {}) {
  return {
    apiVersion: 1,
    instanceId: 'test',
    options,
    params: {},
    signal: new AbortController().signal,
    cache: new Map(),
    log: silentLog,
    fetch: (input, init) => widgetFetch(input, init, options.url),
    ...overrides,
  };
}

test('http-status: up, login wall, server error and offline', async () => {
  const codes = { '/ok': 200, '/login': 401, '/broken': 503, '/nohead': 405 };
  const srv = await serve((req, res) => {
    res.statusCode = req.url === '/nohead' && req.method === 'GET' ? 200 : codes[req.url];
    res.end();
  });
  try {
    const check = (p, method = 'HEAD') => httpStatus.fetch(fakeCtx({ url: srv.url + p, method }));
    assert.equal((await check('/ok')).status, 'up');
    assert.equal((await check('/login')).status, 'up');
    assert.equal((await check('/broken')).status, 'down');
    assert.equal((await check('/nohead')).blocks[0].value, 200);
  } finally {
    await srv.close();
  }
  const offline = await httpStatus.fetch(fakeCtx({ url: srv.url + '/ok', method: 'HEAD' }));
  assert.equal(offline.status, 'down');
});

test('custom-api maps JSON fields to blocks', async () => {
  const srv = await serve((req, res) => {
    assert.equal(req.headers['x-api-key'], 'k');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ data: { count: 42, ratio: 0.25, items: [{ name: 'a' }] } }));
  });
  try {
    const out = await customApi.fetch(fakeCtx({
      url: srv.url, method: 'GET', headers: { 'x-api-key': 'k' },
      mappings: [
        { field: 'data.count', label: 'Count' },
        { field: 'data.ratio', label: 'Ratio', scale: 100, unit: '%' },
        { field: 'data.items.0.name', label: 'First' },
        { field: 'data.missing', label: 'Missing' },
      ],
    }));
    assert.deepEqual(out.blocks, [
      { label: 'Count', value: 42 },
      { label: 'Ratio', value: 25, unit: '%' },
      { label: 'First', value: 'a' },
      { label: 'Missing', value: null },
    ]);
  } finally {
    await srv.close();
  }
  assert.equal(pick({ a: [{ b: 1 }] }, 'a.0.b'), 1);
});

test('docker: running container over a unix socket', async () => {
  const socketPath = path.join(tmpDir('hd-sock-'), 'd.sock');
  const srv = await serve((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/containers/plex/json') return res.end(JSON.stringify({ State: { Status: 'running', Health: { Status: 'healthy' } } }));
    if (req.url === '/containers/sick/json') return res.end(JSON.stringify({ State: { Status: 'running', Health: { Status: 'unhealthy' } } }));
    if (req.url === '/containers/plain/json') return res.end(JSON.stringify({ State: { Status: 'running' } }));
    if (req.url === '/containers/stopped/json') return res.end(JSON.stringify({ State: { Status: 'exited', Health: { Status: 'healthy' } } }));
    if (req.url.startsWith('/containers/plex/stats')) {
      return res.end(JSON.stringify({
        cpu_stats: { cpu_usage: { total_usage: 300 }, system_cpu_usage: 2000, online_cpus: 2 },
        precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
        memory_stats: { usage: 300 * 1048576, stats: { inactive_file: 100 * 1048576 } },
        networks: { eth0: { rx_bytes: 55_500_000, tx_bytes: 20_000_000 }, eth1: { rx_bytes: 0, tx_bytes: 4_600_000 } },
      }));
    }
    res.statusCode = 404;
    res.end('{}');
  }, { socketPath });
  const ctxFor = (container) => {
    const signal = new AbortController().signal;
    return fakeCtx({ container, socket: socketPath }, { signal });
  };
  try {
    const out = await docker.fetch(ctxFor('plex'));
    assert.equal(out.status, 'up');
    assert.deepEqual(out.blocks.map((b) => [b.label, b.value, b.unit]), [['status', 'running (healthy)', undefined], ['cpu', 40, '%'], ['memory', 210, 'MB'], ['rx', 55.5, 'MB'], ['tx', 24.6, 'MB']], 'RX and TX over all networks, as homepage');
    assert.equal((await docker.fetch(ctxFor('nope'))).status, 'down');
    // healthy and unhealthy for a service's filter (container.healthy); no healthcheck: both false
    const health = async (c) => (await docker.fetch(ctxFor(c))).attributes;
    assert.deepEqual(out.attributes, { healthy: true, unhealthy: false });
    assert.deepEqual(await health('sick'), { healthy: false, unhealthy: true });
    assert.deepEqual(await health('plain'), { healthy: false, unhealthy: false });
    assert.deepEqual(await health('stopped'), { healthy: false, unhealthy: false }, 'a stopped container is not healthy');
    assert.deepEqual(await health('nope'), { healthy: false, unhealthy: false });
  } finally {
    await srv.close();
  }
  assert.equal(cpuPercent({}), null);
  assert.deepEqual([byteValue(512), byteValue(1500), byteValue(2.25e9)], [{ value: 512, unit: 'B' }, { value: 1.5, unit: 'kB' }, { value: 2.3, unit: 'GB' }]);
});

test('docker: a Swarm service by name, running tasks against its replicas, as in homepage', async () => {
  const socketPath = path.join(tmpDir('hd-sock-'), 'd.sock');
  const services = {
    web: { ID: 'svc-web', Spec: { Name: 'web', Mode: { Replicated: { Replicas: 3 } } } },
    api: { ID: 'svc-api', Spec: { Name: 'api', Mode: { Replicated: { Replicas: 2 } } } },
    agent: { ID: 'svc-agent', Spec: { Name: 'agent', Mode: { Global: {} } } },
    off: { ID: 'svc-off', Spec: { Name: 'off', Mode: { Replicated: { Replicas: 0 } } } },
  };
  const task = (id, state = 'running') => ({ Status: { State: state, ContainerStatus: { ContainerID: id } } });
  const tasks = { 'svc-web': [task('c1'), task('c2')], 'svc-api': [task('remote1'), task('remote2')], 'svc-agent': [task('remote3')], 'svc-off': [] };
  const asked = [];
  const srv = await serve((req, res) => {
    const url = new URL(req.url, 'http://x');
    asked.push(url.pathname);
    res.setHeader('content-type', 'application/json');
    const service = url.pathname.match(/^\/services\/(\w+)$/)?.[1];
    if (service && services[service]) return res.end(JSON.stringify(services[service]));
    if (url.pathname === '/tasks') {
      const f = JSON.parse(url.searchParams.get('filters'));
      assert.deepEqual(f['desired-state'], ['running']);
      return res.end(JSON.stringify([...tasks[f.service[0]], task('x', 'shutdown')]));
    }
    if (url.pathname === '/containers/c1/stats') {
      return res.end(JSON.stringify({
        cpu_stats: { cpu_usage: { total_usage: 300 }, system_cpu_usage: 2000, online_cpus: 2 },
        precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
        memory_stats: { usage: 200e6, stats: {} },
      }));
    }
    res.statusCode = 404;
    res.end('{}');
  }, { socketPath });
  const run = (container, swarm = true) => {
    const signal = new AbortController().signal;
    return docker.fetch(fakeCtx({ container, socket: socketPath, swarm }, { signal }));
  };
  try {
    const web = await run('web');
    assert.equal(web.status, 'warn');
    assert.equal(web.statusText, 'partial');
    assert.deepEqual(web.blocks.map((b) => [b.label, b.value, b.status]), [['status', 'partial', 'warn'], ['replicas', '2/3', 'warn'], ['cpu', 40, undefined], ['memory', 200, undefined]]);
    const api = await run('api');
    assert.deepEqual([api.status, api.statusText, api.blocks.map((b) => b.value)], ['up', 'running', ['running', '2/2']], 'no stats from tasks on other nodes');
    assert.deepEqual([(await run('agent')).status, (await run('agent')).blocks[1].value], ['up', 1], 'a global service counts its tasks');
    assert.equal((await run('off')).status, 'down');
    assert.equal((await run('nope')).statusText, 'not found');
    asked.length = 0;
    assert.equal((await run('web', false)).statusText, 'not found', 'without swarm only containers');
    assert.deepEqual(asked, ['/containers/web/json']);
  } finally {
    await srv.close();
  }
});

test('proxmoxvm: state, CPU and memory of a VM or container, with homepage\'s API token header', async () => {
  const vms = {
    '/api2/json/nodes/pve/qemu/101/status/current': { data: { status: 'running', cpu: 0.0451, mem: 2.15e9 } },
    '/api2/json/nodes/pve/lxc/200/status/current': { data: { status: 'running', cpu: 0.2, mem: 300e6 } },
    '/api2/json/nodes/pve/qemu/102/status/current': { data: { status: 'running', qmpstatus: 'paused', cpu: 0, mem: 1e9 } },
    '/api2/json/nodes/pve/qemu/103/status/current': { data: { status: 'stopped', cpu: 0, mem: 0 } },
  };
  const auth = [];
  const srv = await serve((req, res) => {
    auth.push(req.headers.authorization);
    if (req.url === '/api2/json/nodes/pve/qemu/401/status/current') { res.statusCode = 401; return res.end(); }
    const body = vms[req.url];
    res.statusCode = body ? 200 : 500;
    res.end(JSON.stringify(body ?? { data: null, message: 'Configuration file does not exist' }));
  });
  const run = (vmid, type = 'qemu') => {
    const signal = new AbortController().signal;
    return proxmoxvm.fetch(fakeCtx({ url: `${srv.url}/`, token: 'api@pam!dash', secret: 's3cret', node: 'pve', vmid, type, insecure: true }, { signal }));
  };
  try {
    const vm = await run('101');
    assert.deepEqual([vm.status, vm.statusText], ['up', 'running']);
    assert.deepEqual(vm.blocks.map((b) => [b.key, b.value, b.unit]), [['status', 'running', undefined], ['cpu', 4.5, '%'], ['mem', 2.2, 'GB']]);
    assert.equal(auth[0], 'PVEAPIToken=api@pam!dash=s3cret');
    assert.deepEqual(vm.attributes, { cpu: 4.5, memory: 2150 }, 'raw numbers for a filter: % and MB');
    assert.deepEqual((await run('200', 'lxc')).blocks.map((b) => b.value), ['running', 20, 300]);
    const paused = await run('102');
    assert.deepEqual([paused.status, paused.blocks[0].status], ['warn', 'warn']);
    const stopped = await run('103');
    assert.deepEqual([stopped.status, stopped.statusText, stopped.blocks.length], ['down', 'stopped', 1]);
    assert.deepEqual(stopped.attributes, { cpu: null, memory: null });
    assert.equal((await run('999')).statusText, 'not found');
    await assert.rejects(run('401'), /Proxmox status answered 401/);
    await assert.rejects(run('1/../2'), /vmid/);
  } finally {
    await srv.close();
  }
  assert.deepEqual(memoryBlock(undefined).value, null);
});

test('kubernetes-pods: state, pods, CPU and memory of an app\'s pods, as in homepage', async () => {
  const pod = (name, phase, limit) => ({ metadata: { name }, status: { phase }, spec: { containers: [{ resources: limit ? { limits: { cpu: limit } } : {} }] } });
  const pods = {
    'app.kubernetes.io/name=jellyfin': [pod('j1', 'Running', '500m'), pod('j2', 'Running', '500m')],
    'app.kubernetes.io/name=half': [pod('h1', 'Running'), pod('h2', 'Pending')],
    'app.kubernetes.io/name=down': [pod('d1', 'Failed')],
    'app.kubernetes.io/instance in (a, b)': [pod('j1', 'Running')],
  };
  const asked = [];
  const srv = await serve((req, res) => {
    const url = new URL(req.url, 'http://x');
    asked.push(url.pathname);
    if (url.pathname === '/api/v1/namespaces/media/pods') return res.end(JSON.stringify({ items: pods[url.searchParams.get('labelSelector')] ?? [] }));
    if (url.pathname === '/apis/metrics.k8s.io/v1beta1/namespaces/media/pods') {
      return res.end(JSON.stringify({ items: [
        { metadata: { name: 'j1' }, containers: [{ usage: { cpu: '250m', memory: '500Mi' } }] },
        { metadata: { name: 'j2' }, containers: [{ usage: { cpu: '50m', memory: '600Mi' } }] },
        { metadata: { name: 'h1' }, containers: [{ usage: { cpu: '20m', memory: '100M' } }] },
        { metadata: { name: 'other' }, containers: [{ usage: { cpu: '4', memory: '9Gi' } }] },
      ] }));
    }
    res.statusCode = 404;
    res.end('{}');
  });
  const run = (options) => {
    const signal = new AbortController().signal;
    return kubernetesPods.fetch(fakeCtx({ namespace: 'media', url: srv.url, token: 't', ...options }, { signal }));
  };
  try {
    const j = await run({ app: 'jellyfin' });
    assert.deepEqual([j.status, j.statusText], ['up', 'running']);
    assert.deepEqual(j.blocks.map((b) => [b.key, b.value, b.unit]), [['status', 'running', undefined], ['pods', '2/2', undefined], ['cpu', 30, '%'], ['mem', 1.2, 'GB']]);
    const half = await run({ app: 'half' });
    assert.deepEqual([half.status, half.blocks[1].value, half.blocks[1].status, half.blocks[2].value], ['warn', '1/2', 'warn', 0.02], 'no limits: cores');
    const down = await run({ app: 'down' });
    assert.deepEqual([down.status, down.statusText, down.blocks.length], ['down', 'not running', 2]);
    assert.equal((await run({ app: 'nope' })).statusText, 'not found');
    assert.equal((await run({ app: 'x', podSelector: 'app.kubernetes.io/instance in (a, b)' })).blocks[1].value, '1/1', 'podSelector wins over app');
    await assert.rejects(run({}), /app or podSelector/);
  } finally {
    await srv.close();
  }
});

test('resources: memory and disk now, CPU from the second call on', async () => {
  const ctx = fakeCtx({ cpu: true, memory: true, disk: ['/'] });
  const first = await resources.fetch(ctx);
  assert.deepEqual(first.blocks.map((b) => b.label), ['cpu', 'memory', 'disk']);
  assert.equal(first.blocks[0].value, null);
  // CPU counters tick in ~10 ms steps; keep sampling until they have moved.
  let second;
  for (let tries = 0; tries < 50; tries++) {
    await new Promise((r) => setTimeout(r, 20));
    second = await resources.fetch(ctx);
    if (second.blocks[0].value !== null) break;
  }
  assert.equal(typeof second.blocks[0].value, 'number');
  assert.ok(second.blocks[2].value >= 0 && second.blocks[2].value <= 100);
});

test('ping: latency parsing for Linux, BusyBox and macOS output', () => {
  assert.equal(parseLatency('64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.3 ms'), 12.3);
  assert.equal(parseLatency('64 bytes from 10.0.0.1: seq=0 ttl=64 time=0.512 ms'), 0.5);
  assert.equal(parseLatency('time<1 ms'), 1);
  assert.equal(parseLatency('Request timeout'), null);
});

test('client-only widgets ship a client.js that defines hd-<id>', () => {
  for (const id of ['datetime', 'search']) {
    const src = fs.readFileSync(path.resolve('widgets', id, 'client.js'), 'utf8');
    assert.match(src, new RegExp(`customElements\\.define\\('hd-${id}'`));
  }
});

test('custom-api: homepage mapping options and list display', async () => {
  const { mapValue } = await import('../widgets/custom-api/server.js');
  const remap = [{ value: 'PLAYING', to: 'Playing' }, { any: true, to: 'Other' }];
  assert.deepEqual(mapValue({ remap }, 'PLAYING'), { value: 'Playing', unit: undefined });
  assert.deepEqual(mapValue({ remap }, 'X'), { value: 'Other', unit: undefined });
  assert.deepEqual(mapValue({ suffix: '%' }, 24), { value: 24, unit: '%' });
  assert.deepEqual(mapValue({ format: 'bytes' }, 1536), { value: '1.5 kB', unit: undefined });
  assert.deepEqual(mapValue({ format: 'percent', scale: 100 }, 0.5), { value: 50, unit: '%' });
  assert.deepEqual(mapValue({ prefix: 'v' }, '2.0.1'), { value: 'v2.0.1', unit: undefined });
  assert.deepEqual(mapValue({}, ''), { value: null });

  const srv = await serve((req, res) => res.end(JSON.stringify({ playbackState: 'STOPPED', currentTrack: { artist: '' }, volume: 24 })));
  try {
    const out = await customApi.fetch(fakeCtx({
      url: srv.url, method: 'GET', display: 'list',
      mappings: [
        { field: 'playbackState', label: 'State', remap: [{ value: 'STOPPED', to: 'Stopped' }] },
        { field: 'currentTrack.artist', label: 'Artist' },
        { field: 'volume', label: 'Volume', suffix: '%' },
      ],
    }));
    assert.deepEqual(out.rows, [
      { label: 'State', value: 'Stopped' },
      { label: 'Artist', value: '' },
      { label: 'Volume', value: '24 %' },
    ]);
  } finally {
    await srv.close();
  }
});

test('ping: a homepage-style URL means its host', async () => {
  const { hostOf } = await import('../widgets/ping/server.js');
  assert.equal(hostOf('http://192.168.1.50'), '192.168.1.50');
  assert.equal(hostOf('https://nas.lan:8443/x'), 'nas.lan');
  assert.equal(hostOf('nas.lan'), 'nas.lan');
});

test('resources: meters with free space for the homepage look', async () => {
  const out = await resources.fetch(fakeCtx({ cpu: false, memory: true, disk: ['/'] }));
  assert.deepEqual(out.meters.map((m) => [m.kind, m.caption]), [['memory', 'free'], ['disk', 'free']]);
  assert.match(out.meters[1].text, /^\d+(\.\d)? (B|KB|MB|GB|TB|PB)$/);
});

// ---- browser parts of built-in widgets, in jsdom
async function clientPage(file) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.eval(fs.readFileSync(path.resolve(file), 'utf8'));
  return dom.window;
}

test('search widget: filter events while typing, web search only when the page lets it', async () => {
  const w = await clientPage('widgets/search/client.js');
  const opened = [];
  w.open = (url) => opened.push(url);
  const events = [];
  w.document.addEventListener('hd-search-input', (e) => events.push(['input', e.detail.query]));
  let handled = true;
  w.document.addEventListener('hd-search-submit', (e) => { events.push(['submit', e.detail.query]); if (handled) e.preventDefault(); });
  const el = w.document.createElement('hd-search');
  el.options = { provider: 'google' };
  el.t = (k) => k;
  w.document.body.append(el);
  const input = el.shadowRoot.querySelector('input');
  const form = el.shadowRoot.querySelector('form');
  assert.equal(input.getAttribute('aria-label'), 'placeholderFilter');
  input.value = 'radarr';
  input.dispatchEvent(new w.Event('input'));
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.deepEqual(events, [['input', 'radarr'], ['submit', 'radarr']]);
  assert.deepEqual(opened, [], 'the page opened the match');
  handled = false;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.deepEqual(opened, ['https://www.google.com/search?q=radarr']);
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.deepEqual(events.at(-1), ['input', '']);
  // filterServices: false only searches the web
  for (const options of [{ filterServices: false }]) {
    const web = w.document.createElement('hd-search');
    web.options = { provider: 'google', ...options };
    web.t = (k) => k;
    w.document.body.append(web);
    const box = web.shadowRoot.querySelector('input');
    assert.equal(box.getAttribute('aria-label'), 'placeholder', JSON.stringify(options));
    events.length = 0;
    box.value = 'radarr';
    box.dispatchEvent(new w.Event('input'));
    assert.deepEqual(events, [], 'no filter events');
  }
  w.close();
});

test('resources widget: meters are exposed with role, value and a spoken label', async () => {
  const w = await clientPage('widgets/resources/client.js');
  const el = w.document.createElement('hd-resources');
  el.options = { label: 'Media' };
  el.t = (k) => ({ free: 'Free', used: 'used', disk: 'Disk', notFound: 'not found' })[k] ?? k;
  w.document.body.append(el);
  el.data = { meters: [
    { kind: 'disk', text: '25.7 TB', caption: 'free', percent: 60.4, mount: '/media' },
    { kind: 'disk', text: '/gone', caption: 'notFound', percent: 0, mount: '/gone', missing: true },
  ] };
  const [ok, missing] = el.shadowRoot.querySelectorAll('[role="meter"]');
  assert.equal(ok.getAttribute('aria-valuenow'), '60');
  assert.equal(ok.getAttribute('aria-label'), 'Media Disk: 25.7 TB Free, 60% used');
  assert.equal(missing.getAttribute('aria-label'), 'Media Disk: /gone not found');
  assert.ok(missing.classList.contains('missing'));
  w.close();
});


test('resources: CPU temperature, uptime, network rates, expanded details and binary disk units', async () => {
  const fake = tmpDir('hd-sys-');
  const sys = path.join(fake, 'sys');
  const proc = path.join(fake, 'proc');
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(fake, rel)), { recursive: true }); fs.writeFileSync(path.join(fake, rel), text); };
  put('sys/class/thermal/thermal_zone0/temp', '48000\n');
  put('sys/class/thermal/thermal_zone1/temp', '61500\n');
  put('sys/class/net/lo/statistics/rx_bytes', '0');
  put('sys/class/net/eth0/statistics/rx_bytes', '1000000');
  put('sys/class/net/eth0/statistics/tx_bytes', '500000');
  put('proc/net/route', 'Iface\tDestination\tGateway\neth0\t00000000\t0101A8C0\n');
  const saved = { ...RESOURCE_PATHS };
  Object.assign(RESOURCE_PATHS, { sys, proc });
  try {
    const opts = { cpu: false, memory: true, disk: [os.tmpdir()], cputemp: true, uptime: true, network: 'true', expanded: true, diskUnits: 'bbytes', units: 'metric' };
    const ctx = fakeCtx(opts);
    const first = await resources.fetch(ctx);
    const byKey = Object.fromEntries(first.blocks.map((b) => [b.key, b]));
    assert.deepEqual([byKey.cputemp.value, byKey.cputemp.unit], [61.5, '°C'], 'the hottest zone');
    assert.match(byKey.uptime.value, /^\d+(d \d+h|h \d+m|m)$/);
    assert.equal(byKey.rx.value, null, 'no rate before a second sample');
    const disk = first.meters.find((m) => m.kind === 'disk');
    assert.match(disk.text, /iB$/, 'diskUnits: bbytes');
    assert.match(disk.detail, /^[\d.]+ \w*iB \/ [\d.]+ \w*iB$/, 'expanded: used / total');
    assert.ok(first.meters.find((m) => m.kind === 'memory').detail.includes(' / '));
    assert.equal(first.meters.find((m) => m.kind === 'network').caption, 'eth0', 'the default route');

    // a second sample one second later: 2 MB in, 1 MB out
    ctx.cache.set('net:eth0', { ...ctx.cache.get('net:eth0'), at: Date.now() - 1000 });
    put('sys/class/net/eth0/statistics/rx_bytes', '3000000');
    put('sys/class/net/eth0/statistics/tx_bytes', '1500000');
    const second = await resources.fetch(ctx);
    const rx = second.blocks.find((b) => b.key === 'rx').value;
    assert.match(rx, /^(1\.9|2|2\.\d) MB\/s$/);

    const f = await resources.fetch(fakeCtx({ disk: [], cputemp: true, units: 'imperial', tempmin: 50, tempmax: 200 }));
    assert.deepEqual([f.blocks[0].value, f.blocks[0].unit], [142.7, '°F']);
    assert.equal(Math.round(f.meters[0].percent), 62);

    Object.assign(RESOURCE_PATHS, { sys: path.join(fake, 'none'), proc: path.join(fake, 'none') });
    const none = await resources.fetch(fakeCtx({ disk: [], cputemp: true, network: 'true' }));
    assert.deepEqual(none.blocks.map((b) => [b.key, b.value]), [['cputemp', null], ['rx', null], ['tx', null]], 'macOS: no readings, no crash');
  } finally {
    Object.assign(RESOURCE_PATHS, saved);
  }
  assert.equal(formatUptime(93784), '1d 2h');
  assert.equal(formatUptime(3700), '1h 1m');
  assert.equal(formatBytes(1536, true), '1.5 KiB');
});

/** A client-only widget's element, rendered in jsdom with the given options. */
async function renderClient(id, options, props = {}) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.eval(fs.readFileSync(path.resolve('widgets', id, 'client.js'), 'utf8'));
  const el = dom.window.document.createElement(`hd-${id}`);
  Object.assign(el, { options, t: (k) => k, ...props });
  dom.window.document.body.append(el);
  return { el, window: dom.window };
}

test('iframe: the page in a frame with homepage\'s options, and reloading', async () => {
  const { el, window } = await renderClient('iframe', { src: 'https://grafana.lan/d-solo/x?panelId=2', name: 'Power', classes: 'h-60 sm:h-60 2xl:h-72', allowScrolling: 'no', referrerPolicy: 'same-origin', allowPolicy: 'fullscreen', allowfullscreen: false, loadingStrategy: 'lazy' });
  const f = el.shadowRoot.querySelector('iframe');
  assert.deepEqual([f.src, f.title, f.name, f.style.height, f.getAttribute('scrolling'), f.className, f.referrerPolicy, f.allow, f.allowFullscreen, f.getAttribute('loading')],
    ['https://grafana.lan/d-solo/x?panelId=2', 'Power', 'Power', '18rem', 'no', 'noscroll', 'same-origin', 'fullscreen', false, 'lazy']);
  assert.equal((await renderClient('iframe', { src: 'https://a.lan/', height: '20rem' })).el.shadowRoot.querySelector('iframe').style.height, '20rem');
  assert.equal((await renderClient('iframe', { src: 'https://a.lan/', height: 'calc(1px);x' })).el.shadowRoot.querySelector('iframe').style.height, '15rem');
  assert.equal((await renderClient('iframe', { src: 'javascript:alert(1)' })).el.shadowRoot.querySelector('iframe'), null);
  const timers = [];
  window.setInterval = (fn, ms) => { timers.push(ms); return 1; };
  const r = await renderClient('iframe', { src: 'https://a.lan/', refreshInterval: 200 });
  r.window.setInterval = window.setInterval;
  r.el.render();
  assert.deepEqual(timers, [1000], 'at least a second');
  window.close();
});

test('greeting: the text, in homepage\'s sizes', async () => {
  const { el } = await renderClient('greeting', { text: 'Welcome <home>', text_size: '3xl' });
  const box = el.shadowRoot.querySelector('.text');
  assert.equal(box.textContent, 'Welcome <home>');
  assert.equal(box.style.fontSize, '1.875rem');
  const plain = await renderClient('greeting', { text: 'Hi' });
  assert.equal(plain.el.shadowRoot.querySelector('.text').style.fontSize, '1.25rem');
});

test('logo: its own mark, an image, or a single-colour icon as a mask', async () => {
  const mark = await renderClient('logo', {});
  assert.ok(mark.el.shadowRoot.querySelector('svg.logo'));
  const img = await renderClient('logo', { icon: '/icons/logo.png' });
  assert.equal(img.el.shadowRoot.querySelector('img.logo').getAttribute('src'), 'icons/logo.png');
  const mask = await renderClient('logo', { icon: 'https://cdn.example.com/home.svg#hd-mask=38bdf8' });
  const span = mask.el.shadowRoot.querySelector('.logo.mask');
  assert.equal(span.style.getPropertyValue('--mask'), 'url("https://cdn.example.com/home.svg")');
  assert.equal(span.style.getPropertyValue('--fill'), '#38bdf8');
});


test('kubernetes: quantities, cluster totals and per node from nodes and metrics, without metrics-server too', async () => {
  assert.equal(cores('250m'), 0.25);
  assert.ok(Math.abs(cores('123456789n') - 0.123456789) < 1e-12);
  assert.equal(cores('4'), 4);
  assert.equal(k8sBytes('16Gi'), 16 * 1024 ** 3);
  assert.equal(k8sBytes('2048Ki'), 2 * 1024 ** 2);
  assert.equal(k8sBytes('1G'), 1e9);
  const sa = tmpDir('hd-sa-');
  fs.writeFileSync(path.join(sa, 'token'), 'tok3n\n');
  let metrics = true;
  const auth = [];
  const srv = await serve((req, res) => {
    auth.push(req.headers.authorization);
    if (req.url === '/api/v1/nodes') {
      return res.end(JSON.stringify({ items: [
        { metadata: { name: 'node-a' }, status: { allocatable: { cpu: '4', memory: '8Gi' }, conditions: [{ type: 'Ready', status: 'True' }] } },
        { metadata: { name: 'node-b' }, status: { allocatable: { cpu: '2', memory: '4Gi' }, conditions: [{ type: 'Ready', status: 'False' }] } },
      ] }));
    }
    if (!metrics) { res.statusCode = 404; return res.end(); }
    res.end(JSON.stringify({ items: [
      { metadata: { name: 'node-a' }, usage: { cpu: '1000m', memory: '2Gi' } },
      { metadata: { name: 'node-b' }, usage: { cpu: '500000000n', memory: '1Gi' } },
    ] }));
  });
  const saved = { ...K8S };
  Object.assign(K8S, { sa, api: srv.url });
  try {
    const out = await kubernetes.fetch(fakeCtx({}));
    assert.equal(auth[0], 'Bearer tok3n');
    assert.deepEqual(out.blocks, [
      { key: 'cpu', label: 'cpu', value: 25, unit: '%' }, { key: 'memory', label: 'memory', value: 25, unit: '%' },
      { key: 'nodes', label: 'nodes', value: 2 }, { key: 'ready', label: 'ready', value: 1 },
    ]);
    assert.deepEqual(out.nodes.map((n) => [n.name, n.ready, n.cpu.used, n.memory.total]), [['node-a', true, 1, 8 * 1024 ** 3], ['node-b', false, 0.5, 4 * 1024 ** 3]]);
    metrics = false;
    const bare = await kubernetes.fetch(fakeCtx({ nodes: { show: false } }));
    assert.equal(bare.blocks[0].value, null, 'no metrics-server: no usage, still capacity');
    assert.equal(bare.cluster.cpu.total, 6);
    assert.deepEqual(bare.nodes, []);
  } finally {
    Object.assign(K8S, saved);
    await srv.close();
  }
});

test('kubernetes client: cluster meters and a line per node, a node that is not ready marked', async () => {
  const { el } = await renderClient('kubernetes', {});
  el.t = (k) => ({ cpu: 'CPU', memory: 'Memory', cores: 'cores', notReady: 'not ready' })[k] ?? k;
  el.data = {
    cluster: { show: true, cpu: { used: 1.5, total: 6 }, memory: { used: 3e9, total: 12e9 }, showLabel: true, label: 'Cluster' },
    nodeOptions: { show: true, showLabel: true },
    nodes: [{ name: 'node-a', ready: true, cpu: { used: 1, total: 4 }, memory: { used: 2, total: 8 } }, { name: 'node-b', ready: false, cpu: { used: null, total: 2 }, memory: { used: null, total: 4 } }],
  };
  const root = el.shadowRoot;
  assert.equal(root.querySelector('.title').textContent, 'Cluster');
  assert.deepEqual([...root.querySelectorAll('.meter')].map((m) => m.getAttribute('aria-label')), ['CPU: 25% (1.5 / 6 cores)', 'Memory: 25% (3 GB / 12 GB)']);
  assert.deepEqual([...root.querySelectorAll('li')].map((li) => li.textContent), ['node-aCPU 25%Memory 25%', 'node-b ✕ not readyCPU –Memory –']);
});

test('header widgets: the search button is a 28px target, resources honour Reduce Motion', () => {
  assert.match(fs.readFileSync('widgets/search/client.js', 'utf8'), /min-width: 28px; height: 28px/);
  assert.match(fs.readFileSync('widgets/resources/client.js', 'utf8'), /prefers-reduced-motion/);
});

// ---- button: a link, or a script or command run through the widget API's action call
const buttonCtx = (options, overrides = {}) => fakeCtx({ text: 'Run', ...options }, { configDir: tmpDir('hd-button-'), ...overrides });

test('button: exactly one of href, script or command, from fetch and action', async () => {
  for (const options of [{}, { href: 'https://a.lan/', command: 'true' }, { script: 'a.sh', command: 'true' }, { command: '  ' }]) {
    await assert.rejects(button.fetch(buttonCtx(options)), /set (one|only one) of href, script or command/);
    await assert.rejects(button.action(buttonCtx(options)), /set (one|only one) of href, script or command/);
  }
  await assert.rejects(button.fetch(buttonCtx({ href: 'https://a.lan/', script: 'x', command: 'y' })), /found href, script, command/);
  for (const options of [{ href: 'https://a.lan/' }, { script: 'a.sh' }, { command: 'true' }]) assert.deepEqual(await button.fetch(buttonCtx(options)), { blocks: [] });
  await assert.rejects(button.action(buttonCtx({ href: 'https://a.lan/' })), /nothing to run/);
});

test('button: a script relative to the config folder, run there', async () => {
  const ctx = buttonCtx({ script: 'scripts/hello.sh' });
  fs.mkdirSync(path.join(ctx.configDir, 'scripts'));
  fs.writeFileSync(path.join(ctx.configDir, 'scripts/hello.sh'), 'echo "hello from $(basename "$PWD")"\necho oops >&2\necho done\n');
  const out = await button.action(ctx);
  assert.deepEqual(out, { status: 'ok', output: `hello from ${path.basename(ctx.configDir)}\noops\ndone\n`, exitCode: 0 }, 'stdout and stderr in order, cwd is the config folder');
  const missing = await button.action(buttonCtx({ script: 'nope.sh' }));
  assert.equal(missing.status, 'error');
  assert.equal(missing.output, '');
  assert.match(missing.error, /^script not found: .*nope\.sh$/);
});

test('button: an inline command, and a non-zero exit code', async () => {
  assert.deepEqual(await button.action(buttonCtx({ command: 'echo one; echo two | tr a-z A-Z' })), { status: 'ok', output: 'one\nTWO\n', exitCode: 0 });
  assert.deepEqual(await button.action(buttonCtx({ command: 'echo failing >&2; exit 3' })), { status: 'error', output: 'failing\n', exitCode: 3 });
});

test('button: a timeout stops the whole process group, also a child in a subshell', async () => {
  const ctx = buttonCtx({ command: '(sleep 30; echo late) & echo $! > child.pid; echo started; sleep 30', timeout: 0.5 });
  const started = Date.now();
  const out = await button.action(ctx);
  assert.ok(Date.now() - started < 5000, 'does not wait for sleep');
  assert.deepEqual(out, { status: 'error', output: 'started\n', error: 'timed out after 0.5 s' });
  const pid = Number(fs.readFileSync(path.join(ctx.configDir, 'child.pid'), 'utf8'));
  await new Promise((r) => setTimeout(r, 100));
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }, 'the subshell is gone');
});

test('button: an aborted signal stops the run', async () => {
  const abort = new AbortController();
  const run = button.action(buttonCtx({ command: 'sleep 30' }, { signal: abort.signal }));
  setTimeout(() => abort.abort(), 100);
  assert.deepEqual(await run, { status: 'error', output: '', error: 'stopped' });
});

test('button: only PATH and HOME from the environment, unless inheritEnv', async () => {
  process.env.HD_BUTTON_TEST = 'visible';
  try {
    const names = async (options) => (await button.action(buttonCtx({ command: 'env | cut -d= -f1 | sort', ...options }))).output.trim().split('\n');
    const own = await names({});
    assert.ok(own.includes('PATH') && own.includes('HOME'));
    assert.ok(!own.includes('HD_BUTTON_TEST'));
    assert.deepEqual(own.filter((n) => !['PATH', 'HOME', 'PWD', 'SHLVL', '_', 'OLDPWD'].includes(n)), [], 'nothing else but what bash sets itself');
    assert.ok((await names({ inheritEnv: true })).includes('HD_BUTTON_TEST'));
  } finally {
    delete process.env.HD_BUTTON_TEST;
  }
});

test('button: output is capped at 64 KB, keeping the end', async () => {
  const out = await button.action(buttonCtx({ command: 'for i in $(seq 1 20000); do echo "line $i"; done' }));
  assert.equal(out.status, 'ok');
  assert.ok(out.output.startsWith(CUT_MARKER));
  assert.equal(Buffer.byteLength(out.output) - Buffer.byteLength(CUT_MARKER), OUTPUT_LIMIT);
  assert.ok(out.output.endsWith('line 20000\n'));
  const small = await button.action(buttonCtx({ command: 'echo small' }));
  assert.equal(small.output, 'small\n', 'no marker when nothing was cut');
});

test('button: a link, or a button that asks for the action and is disabled while busy', async () => {
  const link = (await renderClient('button', { text: 'Grafana <x>', href: 'https://grafana.lan/' })).el.shadowRoot;
  const a = link.querySelector('a');
  assert.deepEqual([a.href, a.target, a.rel, a.textContent, link.querySelector('button')], ['https://grafana.lan/', '_blank', 'noopener noreferrer', 'Grafana <x>', null]);
  assert.equal((await renderClient('button', { text: 'x', href: 'javascript:alert(1)' })).el.shadowRoot.querySelector('a'), null, 'only http(s) links');

  const { el, window } = await renderClient('button', { text: 'Pull images', command: 'x' });
  const b = el.shadowRoot.querySelector('button');
  assert.deepEqual([b.textContent, b.type, b.disabled, b.getAttribute('aria-busy')], ['Pull images', 'button', false, null]);
  const events = [];
  window.document.body.addEventListener('hd-widget-action', (e) => events.push([e.target, e.bubbles, e.composed, e.detail.title, e.detail.showResult]));
  b.click();
  assert.deepEqual(events, [[el, true, true, 'Pull images', 'failure']], 'a dialog only when it fails');
  el.busy = true;
  assert.deepEqual([b.disabled, b.getAttribute('aria-busy'), b.textContent, Boolean(b.querySelector('.spinner'))], [true, 'true', '', true], 'a spinner instead of the label');
  assert.equal(b.getAttribute('aria-label'), 'Pull images: running');
  b.click();
  assert.equal(events.length, 1, 'no second run while busy');
  el.busy = false;
  assert.deepEqual([b.disabled, b.getAttribute('aria-busy'), b.textContent], [false, null, 'Pull images']);

  // success: a check for a moment, not clickable meanwhile, then the label again
  el.busy = true;
  el.actionResult = { status: 'ok' };
  el.busy = false;
  assert.deepEqual([b.disabled, b.classList.contains('done'), Boolean(b.querySelector('svg.check')), b.getAttribute('aria-label')], [true, true, true, 'Pull images: done']);
  b.click();
  assert.equal(events.length, 1, 'not again while the check shows');
  await new Promise((r) => setTimeout(r, 1600));
  assert.deepEqual([b.disabled, b.classList.contains('done'), b.textContent], [false, false, 'Pull images']);
  // failure: straight back to the label (the dashboard shows the dialog)
  el.actionResult = { status: 'error' };
  assert.deepEqual([b.disabled, b.textContent], [false, 'Pull images']);
  const css = fs.readFileSync('widgets/button/client.js', 'utf8');
  assert.match(css, /min-block-size: 2\.25rem/, 'a target of at least 28px');
  assert.match(css, /prefers-reduced-motion/);
  window.close();
});

test('button: user root runs through sudo -n and the image\'s runner, -E only with inheritEnv; a clear error when it is off', async () => {
  const dir = tmpDir('hd-sudo-');
  const log = path.join(dir, 'sudo.log');
  // a stand-in for sudo: logs its arguments, then runs what follows "--" as it is
  fs.writeFileSync(path.join(dir, 'sudo'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${log}"\nwhile [ "$1" != "--" ]; do shift; done; shift\nexec "$@"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'hd-root'), '#!/bin/sh\necho "as root"\nexec /bin/bash "$@"\n', { mode: 0o755 });
  // sudo without a rule for this user
  fs.writeFileSync(path.join(dir, 'nosudo'), '#!/bin/sh\necho "sudo: a password is required" >&2\nexit 1\n', { mode: 0o755 });
  const saved = { ...ROOT };
  try {
    Object.assign(ROOT, { sudo: path.join(dir, 'sudo'), runner: path.join(dir, 'hd-root') });
    assert.deepEqual(await button.action(buttonCtx({ command: 'echo hi', user: 'root' })), { status: 'ok', output: 'as root\nhi\n', exitCode: 0 });
    await button.action(buttonCtx({ command: 'true', user: 'root', inheritEnv: true }));
    const calls = fs.readFileSync(log, 'utf8').trim().split('\n');
    assert.match(calls[0], new RegExp(`^-n -- ${path.join(dir, 'hd-root')} -c `), 'never asks for a password; no -E without inheritEnv');
    assert.match(calls[1], /^-n -E -- /, 'inheritEnv keeps the environment');
    assert.deepEqual(await button.action(buttonCtx({ command: 'echo node' })), { status: 'ok', output: 'node\n', exitCode: 0 }, 'node does not use sudo');
    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 2);

    ROOT.sudo = path.join(dir, 'nosudo');
    const off = await button.action(buttonCtx({ command: 'true', user: 'root' }));
    assert.deepEqual([off.status, off.error], ['error', ROOT_OFF]);
    ROOT.sudo = path.join(dir, 'missing');
    assert.equal((await button.action(buttonCtx({ command: 'true', user: 'root' }))).error, ROOT_OFF);
    await assert.rejects(button.action(buttonCtx({ command: 'true', user: 'admin' })), /user: "admin" is not node or root/);
  } finally {
    Object.assign(ROOT, saved);
  }
});
