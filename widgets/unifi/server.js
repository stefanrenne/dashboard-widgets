// UniFi Network: stat/health of one site. With an API key through UniFi OS (X-API-KEY on
// /proxy/network); with a username and password through UniFi OS's /api/auth/login (cookie plus
// CSRF token), or a classic controller's /api/login when that does not exist. The session is
// kept and renewed once on a 401.

/** 93784 seconds as "1d 2h". */
export function formatUptime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const cookieHeader = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

async function login(ctx, o, url) {
  const body = JSON.stringify({ username: o.username, password: o.password ?? '' });
  const init = { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body, insecure: o.insecure };
  let res = await ctx.fetch(`${url}/api/auth/login`, init); // UniFi OS
  if (res.ok) return { base: `${url}/proxy/network`, headers: { cookie: cookieHeader(res), 'x-csrf-token': res.headers.get('x-csrf-token') ?? '' } };
  if (res.status !== 404) throw new Error(`UniFi login answered ${res.status}`);
  res = await ctx.fetch(`${url}/api/login`, init); // classic controller
  if (!res.ok) throw new Error(`UniFi login answered ${res.status}`);
  return { base: url, headers: { cookie: cookieHeader(res) } };
}

async function session(ctx, o, url, fresh) {
  if (o.key) return { base: `${url}/proxy/network`, headers: { 'x-api-key': o.key } };
  if (!o.username) throw new Error('UniFi needs key, or username and password');
  if (!fresh && ctx.cache.get('session')) return ctx.cache.get('session');
  const s = await login(ctx, o, url);
  ctx.cache.set('session', s);
  return s;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const get = async (path, retried = false) => {
      const s = await session(ctx, o, url, retried);
      const res = await ctx.fetch(`${s.base}${path}`, { headers: { accept: 'application/json', ...s.headers }, insecure: o.insecure });
      if (res.status === 401 && o.username && !o.key && !retried) return get(path, true);
      if (!res.ok) throw new Error(`UniFi ${path} answered ${res.status}`);
      return (await res.json()).data ?? [];
    };

    let site = 'default';
    if (o.site) {
      const sites = await get('/api/self/sites');
      const found = sites.find((x) => x.desc === o.site || x.name === o.site);
      if (!found) throw new Error(`UniFi has no site "${o.site}"`);
      site = found.name;
    }
    const health = await get(`/api/s/${encodeURIComponent(site)}/stat/health`);
    const sub = (name) => health.find((h) => h.subsystem === name);
    const state = (h) => (!h ? 'unknown' : h.status === 'ok' ? 'up' : 'down');
    const blocks = [];
    const wan = sub('wan');
    const uptime = wan?.['gw_system-stats']?.uptime ?? sub('www')?.uptime;
    blocks.push({ key: 'uptime', label: 'uptime', value: formatUptime(uptime) });
    for (const name of ['wan', 'lan', 'wlan']) {
      const h = sub(name);
      const s = state(h);
      // a subsystem the controller does not report (no gateway, no APs) is left out, as in homepage
      if (!h) continue;
      blocks.push({ key: name, label: name, value: s, ...(s === 'down' ? { status: 'error' } : {}) });
      if (name !== 'wan') {
        blocks.push({ key: `${name}_users`, label: `${name}_users`, value: Number(h.num_user ?? 0) + Number(h.num_guest ?? 0) });
        blocks.push({ key: `${name}_devices`, label: `${name}_devices`, value: Number(h.num_adopted ?? 0) });
      }
    }
    const up = Number(uptime);
    return { attributes: { uptimeHours: Number.isFinite(up) && up > 0 ? Math.round(up / 360) / 10 : null }, blocks };
  },
};
