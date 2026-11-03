// JDownloader through the My.JDownloader API (as homepage): JDownloader connects out to it, so
// the widget needs no address of the instance. Login (/my/connect) and the device list are
// signed with HMAC-SHA256 and answered AES-128-CBC encrypted; the call to the device
// (downloadsV2/queryPackages) is encrypted too. Secrets come from the e-mail address and
// password; the session is kept and made anew when a call fails.

import crypto from 'node:crypto';

const APP_KEY = 'dashboard';
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

/** AES-128-CBC with the first half of a 32-byte key as IV and the second half as key. */
export function encrypt(text, ivKey) {
  const c = crypto.createCipheriv('aes-128-cbc', ivKey.subarray(16, 32), ivKey.subarray(0, 16));
  return Buffer.concat([c.update(text, 'utf8'), c.final()]).toString('base64');
}
export function decrypt(base64, ivKey) {
  const d = crypto.createDecipheriv('aes-128-cbc', ivKey.subarray(16, 32), ivKey.subarray(0, 16));
  return Buffer.concat([d.update(String(base64).trim(), 'base64'), d.final()]).toString('utf8');
}
/** The secrets My.JDownloader derives from the account: { login, device }. */
export function secrets(email, password) {
  const e = String(email).toLowerCase();
  return { login: sha256(`${e}${password}server`), device: sha256(`${e}${password}device`) };
}
/** A token after login: sha256(secret + session token as bytes). */
export const derive = (secret, sessionToken) => sha256(Buffer.concat([secret, Buffer.from(sessionToken, 'hex')]));

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { username, password, client } = ctx.options;
    const api = String(ctx.options.url || 'https://api.jdownloader.org').replace(/\/+$/, '');
    const rid = () => crypto.randomInt(1, 2 ** 47);
    const signed = async (path, params, key, what) => {
      const r = rid();
      const query = `${path}?${new URLSearchParams({ ...params, rid: String(r) })}`;
      const signature = crypto.createHmac('sha256', key).update(query).digest('hex');
      const res = await ctx.fetch(`${api}${query}&signature=${signature}`, { method: 'POST', headers: { 'content-type': 'application/json' } });
      if (!res.ok) throw new Error(`My.JDownloader ${what} answered ${res.status}`);
      const body = JSON.parse(decrypt(await res.text(), key));
      if (body.rid !== r) throw new Error(`My.JDownloader ${what} answered another request`);
      return body;
    };
    const connect = async () => {
      const s = secrets(username, password);
      const login = await signed('/my/connect', { email: String(username).toLowerCase(), appkey: APP_KEY }, s.login, 'login');
      const server = derive(s.login, login.sessiontoken);
      const devices = await signed('/my/listdevices', { sessiontoken: login.sessiontoken }, server, 'device list');
      const device = (devices.list ?? []).find((d) => d.name === client);
      if (!device) throw new Error(`no JDownloader named "${client}" in this account (${(devices.list ?? []).map((d) => d.name).join(', ') || 'none online'})`);
      const session = { token: login.sessiontoken, device: device.id, key: derive(s.device, login.sessiontoken) };
      ctx.cache.set('session', session);
      return session;
    };
    const query = async (session) => {
      const r = rid();
      const action = '/downloadsV2/queryPackages';
      const params = { bytesLoaded: true, bytesTotal: true, enabled: true, finished: true, running: true, speed: true, status: true, maxResults: -1, startAt: 0 };
      const body = encrypt(JSON.stringify({ apiVer: 1, rid: r, url: action, params: [JSON.stringify(params)] }), session.key);
      const res = await ctx.fetch(`${api}/t_${encodeURIComponent(session.token)}_${encodeURIComponent(session.device)}${action}`, { method: 'POST', headers: { 'content-type': 'application/aesjson-jd; charset=utf-8' }, body });
      if (!res.ok) throw new Error(`JDownloader answered ${res.status}`);
      const out = JSON.parse(decrypt(await res.text(), session.key));
      if (out.rid !== r) throw new Error('JDownloader answered another request');
      return out.data ?? [];
    };
    let packages;
    const cached = ctx.cache.get('session');
    try {
      packages = await query(cached ?? (await connect()));
    } catch (err) {
      if (!cached) throw err;
      ctx.cache.delete('session'); // expired: once more with a new session
      packages = await query(await connect());
    }
    const total = packages.reduce((s, p) => s + (Number(p.bytesTotal) || 0), 0);
    const loaded = packages.reduce((s, p) => s + (Number(p.bytesLoaded) || 0), 0);
    const speed = packages.filter((p) => p.finished !== true).reduce((s, p) => s + (Number(p.speed) || 0), 0);
    return {
      blocks: [
        { key: 'downloadCount', label: 'downloadCount', value: packages.length },
        { key: 'downloadTotalBytes', label: 'downloadTotalBytes', value: formatBytes(total) },
        { key: 'downloadBytesRemaining', label: 'downloadBytesRemaining', value: formatBytes(Math.max(0, total - loaded)) },
        { key: 'downloadSpeed', label: 'downloadSpeed', value: `${formatBytes(speed)}/s` },
      ],
    };
  },
};
