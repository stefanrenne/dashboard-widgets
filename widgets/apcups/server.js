// APC UPS: apcupsd's network information server (NIS, port 3551). The command "status" is sent
// as a length-prefixed string; the answer is length-prefixed lines ("STATUS   : ONLINE") ending
// with a zero length. On battery is marked, and so is a UPS apcupsd lost.

import net from 'node:net';

/** "KEY      : value" lines to { KEY: value }. */
export function parseStatus(lines) {
  const out = {};
  for (const line of lines) {
    const at = line.indexOf(':');
    if (at > 0) out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

export function nisStatus(host, port, signal) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const chunks = [];
    const done = (err, value) => {
      socket.destroy();
      if (err) reject(err);
      else resolve(value);
    };
    signal?.addEventListener('abort', () => done(signal.reason ?? new Error('aborted')), { once: true });
    socket.on('connect', () => {
      const cmd = Buffer.from('status');
      const head = Buffer.alloc(2);
      head.writeUInt16BE(cmd.length);
      socket.write(Buffer.concat([head, cmd]));
    });
    socket.on('data', (data) => {
      chunks.push(data);
      const buf = Buffer.concat(chunks);
      const lines = [];
      for (let at = 0; at + 2 <= buf.length;) {
        const len = buf.readUInt16BE(at);
        if (len === 0) return done(null, lines);
        if (at + 2 + len > buf.length) return; // the rest is still on its way
        lines.push(buf.toString('latin1', at + 2, at + 2 + len));
        at += 2 + len;
      }
    });
    socket.on('error', done);
    socket.on('end', () => done(new Error('apcupsd closed the connection')));
  });
}

const number = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Minutes ("45.3 Minutes") as "45:18" or "1:02:03". */
export function clock(minutes) {
  const total = Math.round(minutes * 60);
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(total % 60)}` : `${m}:${pad(total % 60)}`;
}

export default {
  async fetch(ctx) {
    const raw = String(ctx.options.url);
    const target = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `tcp://${raw}`);
    let lines;
    try {
      lines = await nisStatus(target.hostname, Number(target.port) || 3551, ctx.signal);
    } catch (err) {
      throw new Error(`apcupsd answered nothing (${err.code ?? err.message})`);
    }
    const s = parseStatus(lines);
    const status = String(s.STATUS ?? '').toUpperCase();
    const state = status.includes('COMMLOST') ? 'lost' : status.includes('ONBATT') ? 'onBattery' : status.includes('ONLINE') ? 'online' : status.toLowerCase() || null;
    const left = number(s.TIMELEFT);
    return {
      attributes: { timeleft: left },
      blocks: [
        { key: 'status', label: 'status', value: state, ...(state === 'onBattery' ? { status: 'warn' } : state === 'lost' ? { status: 'error' } : {}) },
        { key: 'load', label: 'load', value: number(s.LOADPCT), unit: '%' },
        { key: 'bcharge', label: 'bcharge', value: number(s.BCHARGE), unit: '%' },
        { key: 'timeleft', label: 'timeleft', value: left === null ? null : clock(left) },
      ],
    };
  },
};
