// TrueNAS: alerts, system info and (with enablePools) pools and their root datasets. Version 1
// through the REST API (/api/v2.0, removed in TrueNAS 26.04); version 2 through the JSON-RPC
// WebSocket API (/api/current), with a small WebSocket client of its own (node: only, and it
// can accept a self-signed certificate). Pending alerts and unhealthy pools are marked.

import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

/** 93784 seconds as "1d 2h", as in the unifi and glances widgets. */
export function formatUptime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** A client text frame (masked, as RFC 6455 wants from clients). */
function frame(text) {
  const payload = Buffer.from(text);
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x81, 0x80 | len])
    : len < 65536 ? Buffer.from([0x81, 0x80 | 126, len >> 8, len & 255])
      : Buffer.concat([Buffer.from([0x81, 0x80 | 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(len)); return b; })()]);
  const mask = crypto.randomBytes(4);
  const body = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
  return Buffer.concat([head, mask, body]);
}

/** Minimal JSON-RPC over WebSocket: opens, calls methods in order, closes. */
export async function wsSession(url, { insecure, signal }) {
  const target = new URL(url);
  const key = crypto.randomBytes(16).toString('base64');
  const lib = target.protocol === 'https:' ? https : http;
  const socket = await new Promise((resolve, reject) => {
    const req = lib.request(target, {
      headers: { connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': key },
      ...(insecure ? { rejectUnauthorized: false } : {}),
      signal,
    });
    req.on('upgrade', (res, sock, head) => {
      const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      if (res.headers['sec-websocket-accept'] !== accept) { sock.destroy(); reject(new Error('TrueNAS WebSocket answered without a valid handshake')); return; }
      if (head?.length) sock.unshift(head);
      resolve(sock);
    });
    req.on('response', (res) => reject(new Error(`TrueNAS WebSocket answered ${res.statusCode}`)));
    req.on('error', reject);
    req.end();
  });
  let buffer = Buffer.alloc(0);
  let message = [];
  const waiting = new Map();
  const fail = (err) => { for (const w of waiting.values()) w.reject(err); waiting.clear(); };
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 2) return;
      const op = buffer[0] & 0x0f;
      const fin = buffer[0] & 0x80;
      let len = buffer[1] & 0x7f;
      let at = 2;
      if (len === 126) { if (buffer.length < 4) return; len = buffer.readUInt16BE(2); at = 4; }
      else if (len === 127) { if (buffer.length < 10) return; len = Number(buffer.readBigUInt64BE(2)); at = 10; }
      if (buffer.length < at + len) return;
      const payload = buffer.subarray(at, at + len);
      buffer = buffer.subarray(at + len);
      if (op === 8) { fail(new Error('TrueNAS WebSocket closed the connection')); socket.end(); return; }
      if (op !== 1 && op !== 0) continue; // pings and binary frames are not needed here
      message.push(payload);
      if (!fin) continue;
      const text = Buffer.concat(message).toString();
      message = [];
      let json;
      try { json = JSON.parse(text); } catch { continue; }
      const w = waiting.get(json.id);
      if (!w) continue;
      waiting.delete(json.id);
      if (json.error) w.reject(new Error(`TrueNAS: ${json.error.message ?? json.error.data?.reason ?? 'error'}`));
      else w.resolve(json.result);
    }
  });
  socket.on('error', fail);
  socket.on('close', () => fail(new Error('TrueNAS WebSocket closed the connection')));
  let id = 0;
  return {
    call(method, params = []) {
      const n = ++id;
      return new Promise((resolve, reject) => {
        waiting.set(n, { resolve, reject });
        socket.write(frame(JSON.stringify({ jsonrpc: '2.0', id: n, method, params })));
      });
    },
    close() { socket.end(Buffer.from([0x88, 0x80, 0, 0, 0, 0])); },
  };
}

async function viaWebSocket(ctx, url) {
  const o = ctx.options;
  const ws = await wsSession(`${url}/api/current`, { insecure: o.insecure, signal: ctx.signal });
  try {
    const ok = o.key ? await ws.call('auth.login_with_api_key', [o.key]) : await ws.call('auth.login', [o.username ?? '', o.password ?? '']);
    if (ok !== true) throw new Error('TrueNAS login answered 401');
    const [alerts, info] = [await ws.call('alert.list'), await ws.call('system.info')];
    const pools = o.enablePools ? await ws.call('pool.query') : [];
    const datasets = o.enablePools ? await ws.call('pool.dataset.query', [[['type', '=', 'FILESYSTEM']], { extra: { flat: false, retrieve_children: false } }]) : [];
    return { alerts, info, pools, datasets };
  } finally {
    ws.close();
  }
}

async function viaRest(ctx, url) {
  const o = ctx.options;
  const headers = { accept: 'application/json' };
  if (o.key) headers.authorization = `Bearer ${o.key}`;
  else if (o.username) headers.authorization = `Basic ${Buffer.from(`${o.username}:${o.password ?? ''}`).toString('base64')}`;
  const get = async (path) => {
    const res = await ctx.fetch(`${url}/api/v2.0/${path}`, { headers, insecure: o.insecure });
    if (!res.ok) throw new Error(`TrueNAS ${path} answered ${res.status}`);
    return res.json();
  };
  const [alerts, info, pools, datasets] = await Promise.all([
    get('alert/list'), get('system/info'),
    o.enablePools ? get('pool') : [], o.enablePools ? get('pool/dataset') : [],
  ]);
  return { alerts, info, pools, datasets };
}

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const { alerts, info, pools, datasets } = Number(ctx.options.version) >= 2 ? await viaWebSocket(ctx, url) : await viaRest(ctx, url);
    const pending = (alerts ?? []).filter((a) => a?.dismissed === false).length;
    const uptime = Number(info?.uptime_seconds);
    const out = {
      attributes: { uptimeHours: Number.isFinite(uptime) && uptime > 0 ? Math.round(uptime / 360) / 10 : null },
      blocks: [
        { key: 'load', label: 'load', value: Array.isArray(info?.loadavg) ? Math.round(info.loadavg[0] * 100) / 100 : null },
        { key: 'uptime', label: 'uptime', value: formatUptime(info?.uptime_seconds) },
        { key: 'alerts', label: 'alerts', value: pending, ...(pending > 0 ? { status: 'warn' } : {}) },
      ],
    };
    if (ctx.options.enablePools) {
      const size = (v) => Number(v?.parsed ?? v?.rawvalue ?? 0) || 0;
      out.rows = [...pools].sort((a, b) => String(a.name).localeCompare(String(b.name))).map((p) => {
        const root = datasets.find((d) => d.pool === p.name && d.name === p.name) ?? datasets.find((d) => d.name === p.name);
        const used = size(root?.used);
        const total = used + size(root?.available);
        return {
          label: String(p.name),
          value: total > 0 ? `${formatBytes(used)} / ${formatBytes(total)}` : null,
          progress: total > 0 ? Math.round((1000 * used) / total) / 10 : 0,
          ...(p.healthy === false ? { status: 'error' } : {}),
        };
      }).sort((a, b) => (a.status ? 0 : 1) - (b.status ? 0 : 1));
    }
    return out;
  },
};
