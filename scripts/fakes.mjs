// Fake services for widgets that speak something other than plain HTTP with JSON (apcupsd's
// TCP protocol, Valve's UDP server query, My.JDownloader's encryption, ...), and the options every
// widget needs to run against the fixtures. Shared by the tests and by the dashboard's
// scripts/widget-images.mjs, which photographs each widget for its docs page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDGETS = path.join(ROOT, 'widgets');

/** A widget's fixture served at the root, for widgets that ask absolute paths on their url. */
export async function atRoot(id) {
  const http = await import('node:http');
  const { routes } = JSON.parse(fs.readFileSync(path.join(ROOT, `widgets/${id}/fixture.json`), 'utf8'));
  const srv = http.createServer((req, res) => {
    const answer = routes[`${req.method} ${new URL(req.url, 'http://x').pathname}`];
    res.statusCode = answer === undefined ? 404 : 200;
    res.end(JSON.stringify(answer ?? {}));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() };
}

/** A fake UrBackup web interface: salt, login (checking the hash), status and usage. */
export async function urbackupServer() {
  const http = await import('node:http');
  const { loginHash } = await import(path.join(WIDGETS, 'urbackup', 'server.js'));
  const salt = { ses: 'pre', rnd: 'r4nd', salt: 's4lt', pbkdf2_rounds: 10000 };
  const now = Date.now() / 1000;
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const a = new URL(req.url, 'http://x').searchParams.get('a');
      const p = new URLSearchParams(body);
      const send = (o) => res.end(JSON.stringify(o));
      if (a === 'salt') return send(p.get('username') === 'dashboard' ? salt : { error: 0 });
      if (a === 'login') return send(p.get('password') === loginHash('pw', salt) ? { success: true, session: 'ses-1' } : { success: false });
      if (p.get('ses') !== 'ses-1') return send({ error: 1 });
      if (a === 'status') return send({ status: [
        { name: 'nas', lastbackup: now - 3600, lastbackup_image: now - 7200, file_ok: true, image_ok: true },
        { name: 'laptop', lastbackup: now - 3600, image_not_supported: true, file_ok: false },
        { name: 'old', lastbackup: now - 30 * 86400, lastbackup_image: now - 30 * 86400, file_ok: true, image_ok: true },
        { name: 'pc', lastbackup: now - 600, image_disabled: true, file_ok: true }] });
      if (a === 'usage') return send({ usage: [{ name: 'nas', used: 1200000000000 }, { name: 'pc', used: 300000000000 }] });
      res.statusCode = 404;
      res.end('{}');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() };
}

/** A fake Minecraft server answering the status request (in two TCP chunks). */
export async function minecraftServer() {
  const net = await import('node:net');
  const varint = (n) => { const out = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n); return Buffer.from(out); };
  const handshakes = [];
  const srv = net.createServer((socket) => {
    socket.once('data', (data) => {
      handshakes.push(data);
      const json = Buffer.from(JSON.stringify({ version: { name: 'Paper 1.21.4', protocol: 769 }, players: { online: 3, max: 20 }, description: { text: 'Homelab' } }));
      const body = Buffer.concat([varint(0), varint(json.length), json]);
      const all = Buffer.concat([varint(body.length), body]);
      socket.write(all.subarray(0, 10));
      setTimeout(() => socket.end(all.subarray(10)), 5);
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `udp://127.0.0.1:${srv.address().port}`, handshakes, close: () => srv.close() };
}

/** A fake My.JDownloader: login, the device list and a device's packages, with its crypto. */
export async function myJDownloader() {
  const http = await import('node:http');
  const { secrets, derive, encrypt, decrypt } = await import(path.join(WIDGETS, 'jdownloader', 'server.js'));
  const crypto = await import('node:crypto');
  const s = secrets('Anna@example.com', 'pw');
  const session = 'a1b2c3d4';
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      calls.push(u.pathname);
      const signedBy = (key) => {
        const query = req.url.slice(0, req.url.indexOf('&signature='));
        return u.searchParams.get('signature') === crypto.createHmac('sha256', key).update(query).digest('hex');
      };
      const rid = Number(u.searchParams.get('rid'));
      if (u.pathname === '/my/connect') {
        if (!signedBy(s.login) || u.searchParams.get('email') !== 'anna@example.com') return res.writeHead(403).end('{}');
        return res.end(encrypt(JSON.stringify({ sessiontoken: session, regaintoken: 'ff', rid }), s.login));
      }
      if (u.pathname === '/my/listdevices') {
        const server = derive(s.login, session);
        if (!signedBy(server)) return res.writeHead(403).end('{}');
        return res.end(encrypt(JSON.stringify({ list: [{ id: 'dev1', name: 'JDownloader@nas', type: 'jd' }], rid }), server));
      }
      if (u.pathname === `/t_${session}_dev1/downloadsV2/queryPackages`) {
        const key = derive(s.device, session);
        const q = JSON.parse(decrypt(body, key));
        return res.end(encrypt(JSON.stringify({ rid: q.rid, data: [
          { name: 'debian', bytesTotal: 4000000000, bytesLoaded: 1000000000, speed: 2500000, finished: false },
          { name: 'photos', bytesTotal: 1000000000, bytesLoaded: 1000000000, speed: 0, finished: true }] }), key));
      }
      res.writeHead(404).end('{}');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, calls, close: () => srv.close() };
}

/** A fake game server answering A2S_INFO, after a challenge as newer servers do. */
export async function gameServer() {
  const dgram = await import('node:dgram');
  const socket = dgram.createSocket('udp4');
  const asked = [];
  socket.on('message', (msg, from) => {
    asked.push(msg);
    const head = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    if (msg.length === 25) return socket.send(Buffer.concat([head, Buffer.from([0x41, 1, 2, 3, 4])]), from.port, from.address);
    const str = (x) => Buffer.from(`${x}\0`, 'utf8');
    const info = Buffer.concat([head, Buffer.from([0x49, 17]), str('Homelab CS'), str('de_dust2'), str('csgo'), str('Counter-Strike'), Buffer.from([0xda, 0x02, 12, 24, 2, 0x64, 0x6c, 0, 1])]);
    socket.send(info, from.port, from.address);
  });
  await new Promise((r) => socket.bind(0, '127.0.0.1', r));
  return { url: `udp://127.0.0.1:${socket.address().port}`, asked, close: () => socket.close() };
}

/** A tiny apcupsd network information server answering "status". */
export async function nis(lines) {
  const net = await import('node:net');
  const srv = net.createServer((sock) => {
    sock.once('data', (d) => {
      if (d.toString('latin1', 2) !== 'status') return sock.end();
      const parts = lines.map((l) => { const b = Buffer.from(l, 'latin1'); const h = Buffer.alloc(2); h.writeUInt16BE(b.length); return Buffer.concat([h, b]); });
      const all = Buffer.concat([...parts, Buffer.alloc(2)]);
      sock.write(all.subarray(0, 20));
      setTimeout(() => sock.end(all.subarray(20)), 5);
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `tcp://127.0.0.1:${srv.address().port}`, close: () => srv.close() };
}

/** Starts every fake service; `close()` stops them all. */
export async function startFakes() {
  const fakes = {
    apcupsd: await nis(['STATUS   : ONLINE', 'LOADPCT  : 10.0 Percent', 'BCHARGE  : 100.0 Percent', 'TIMELEFT : 60.0 Minutes']),
    a2s: await gameServer(),
    myjd: await myJDownloader(),
    mc: await minecraftServer(),
    urb: await urbackupServer(),
    dockerd: await atRoot('docker'),
  };
  return { ...fakes, close: () => Object.values(fakes).forEach((f) => f.close()) };
}

/**
 * The options each widget needs on top of `url` (the mock's /<id>) and `key` to run against its
 * fixture: ids the fixture uses, logins the fakes check, the fakes' addresses.
 */
export function exampleOptions({ mockUrl, fakes }) {
  const mock = { url: mockUrl };
  const { apcupsd, a2s, myjd, mc, urb, dockerd } = fakes;
  return {
    openmeteo: { latitude: 52.37, longitude: 4.89, units: 'metric', cache: 5 },
    // the fixture's events are in October 2026
    calendar: { integrations: [
      { type: 'sonarr', url: `${mock.url}/calendar`, key: 'k', color: 'teal' },
      { type: 'radarr', url: `${mock.url}/calendar`, key: 'k' },
      { type: 'ical', url: `${mock.url}/calendar/family.ics`, name: 'Family', color: 'zinc' },
    ] },
    openweathermap: { latitude: 52.37, longitude: 4.89, apiKey: 'test-key', units: 'metric', cache: 5 },
    stocks: { watchlist: ['AAPL'], apiKey: 'test-key', color: true, cache: 1 },
    uptimekuma: { slug: 'home' },
    dispatcharr: { username: 'admin', password: 'pw' },
    downloadstation: { username: 'dl', password: 'pw' },
    checkmk: { site: 'cmk', username: 'automation', password: 's3cret' },
    get cloudflared() { return { url: `${mock.url}/cloudflared`, accountid: 'acc1', tunnelid: 'tun1' }; },
    coinmarketcap: { symbols: ['BTC', 'ETH'], currency: 'EUR' },
    crowdsec: { username: 'dashboard', password: 'pw' },
    beszel: { version: 2, username: 'admin@example.com', password: 'pw' },
    get azuredevops() { return { organization: 'example', project: 'homelab', definitionId: '12', repositoryId: 'homelab', userEmail: 'anna@example.com' }; },
    arcane: { env: '1' },
    duplicati: { password: 'pw' },
    filebrowser: { username: 'dashboard', password: 'pw' },
    freshrss: { username: 'anna', password: 'pw' },
    get gamedig() { return { url: a2s.url, serverType: 'csgo', timeout: 1 }; },
    gitlab: { user_id: '42' },
    headscale: { nodeId: '3' },
    get jdownloader() { return { url: myjd.url, username: 'Anna@example.com', password: 'pw', client: 'JDownloader@nas' }; },
    homebox: { username: 'anna@example.com', password: 'pw' },
    homebridge: { username: 'admin', password: 'pw' },
    komodo: { secret: 's3cret' },
    get minecraft() { return { url: mc.url, timeout: 1 }; },
    mikrotik: { username: 'dashboard', password: 'pw' },
    nextdns: { profile: 'abc123', get url() { return `${mock.url}/nextdns`; } },
    ntfy: { topic: 'backups' },
    omada: { username: 'dashboard', password: 'pw', site: 'Default' },
    opnsense: { username: 'k', password: 's' },
    openwrt: { username: 'dashboard', password: 'pw' },
    pangolin: { org: 'homelab' },
    peanut: { key: 'ups' },
    pfsense: { wan: 'igb0' },
    prometheusmetric: { metrics: [] },
    qnap: { username: 'dashboard', password: 'pw' },
    'unifi-drive': { username: 'dashboard', password: 'pw' },
    get urbackup() { return { url: urb.url, username: 'dashboard', password: 'pw' }; },
    get apcups() { return { url: apcupsd.url }; },
    tailscale: { deviceid: 'n1234567CNTRL' },
    navidrome: { user: 'anna', token: 't0k', salt: 's4lt' },
    grafana: { username: 'admin', password: 'pw' },
    openmediavault: { method: 'services.getStatus', username: 'admin', password: 'pw' },
    'custom-api': { mappings: [] },
    button: { text: 'Pull', command: 'true' },
    get docker() { return { url: dockerd.url, container: 'plex' }; },
    proxmoxvm: { node: 'pve', vmid: '101', token: 'api@pam!dash', secret: 's3cret' },
    'kubernetes-pods': { namespace: 'media', app: 'jellyfin' },
    ping: { host: '127.0.0.1' },
    resources: { cpu: true, memory: true, disk: ['/'] },
  };
}
