// Synology DSM: SYNO.Core.System info (uptime), info type=storage (volumes) and
// SYNO.Core.System.Utilization (CPU, memory), as homepage. The API paths and versions come from
// SYNO.API.Info (kept); the login (SYNO.API.Auth, POSTed, format=sid) is kept and renewed when
// DSM reports the session gone. A volume with less than 10% free is marked.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

/** DSM's "123:45:12" (hours may pass 24) as "5d 3h", as in the other widgets. */
export function formatUptime(text) {
  const [h, m] = String(text ?? '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m || 0}m`;
}

const SESSION_GONE = [105, 106, 107, 119];

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const call = async (path, params, method = 'GET') => {
      const body = new URLSearchParams(params).toString();
      const res = method === 'POST'
        ? await ctx.fetch(`${url}/webapi/${path}`, { method, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body, insecure: o.insecure })
        : await ctx.fetch(`${url}/webapi/${path}?${body}`, { headers: { accept: 'application/json' }, insecure: o.insecure });
      if (!res.ok) throw new Error(`Synology ${params.api} answered ${res.status}`);
      return res.json();
    };
    const apis = ctx.cache.get('apis') ?? (await call('query.cgi', { api: 'SYNO.API.Info', version: '1', method: 'query', query: 'SYNO.API.Auth,SYNO.Core.System,SYNO.Core.System.Utilization' })).data ?? {};
    ctx.cache.set('apis', apis);
    const api = (name) => ({ path: apis[name]?.path ?? 'entry.cgi', version: String(apis[name]?.maxVersion ?? 1) });
    const login = async () => {
      const a = api('SYNO.API.Auth');
      const r = await call(a.path, { api: 'SYNO.API.Auth', version: String(Math.min(Number(a.version), 6)), method: 'login', account: o.username, passwd: o.password, session: 'homelab-dashboard', format: 'sid' }, 'POST');
      // 400 wrong login, 401 disabled, 402 no permission, 403/404 two-step verification
      if (!r.success || !r.data?.sid) throw new Error(`Synology login answered ${r.error?.code >= 403 ? '403 (two-step verification is on)' : 401}`);
      ctx.cache.set('sid', r.data.sid);
    };
    const get = async (name, params, retried = false) => {
      if (!ctx.cache.get('sid')) await login();
      const a = api(name);
      const r = await call(a.path, { api: name, version: a.version, ...params, _sid: ctx.cache.get('sid') });
      if (!r.success && SESSION_GONE.includes(r.error?.code) && !retried) {
        ctx.cache.delete('sid');
        return get(name, params, true);
      }
      if (!r.success) throw new Error(`Synology ${name} answered ${r.error?.code === 105 ? 403 : 500} (code ${r.error?.code})`);
      return r.data ?? {};
    };
    const info = await get('SYNO.Core.System', { method: 'info' });
    const storage = await get('SYNO.Core.System', { method: 'info', type: 'storage' });
    const util = await get('SYNO.Core.System.Utilization', { method: 'get' });

    const volumes = storage.vol_info ?? [];
    const volume = o.volume ? volumes.find((v) => v.name === o.volume) : volumes[0];
    if (o.volume && !volume) throw new Error(`Synology has no volume "${o.volume}"`);
    const total = Number(volume?.total_size);
    const free = total - Number(volume?.used_size);
    const cpu = util.cpu ?? {};
    const mem = util.memory ?? {};
    const memory = mem.real_usage !== undefined ? Number(mem.real_usage)
      : 100 - (100 * (Number(mem.avail_real) + Number(mem.cached))) / Number(mem.total_real);
    return {
      attributes: {
        volumeFree: Number.isFinite(free) ? Math.round(free / 1e8) / 10 : null,
        volumeFreePercent: total > 0 && Number.isFinite(free) ? Math.round((free / total) * 1000) / 10 : null,
      },
      blocks: [
        { key: 'uptime', label: 'uptime', value: formatUptime(info.up_time) },
        { key: 'volumeAvailable', label: 'volumeAvailable', value: Number.isFinite(free) ? formatBytes(free) : null, ...(total > 0 && free / total < 0.1 ? { status: 'warn' } : {}) },
        { key: 'resources.cpu', label: 'cpu', value: Number(cpu.user_load ?? 0) + Number(cpu.system_load ?? 0), unit: '%' },
        { key: 'resources.mem', label: 'memory', value: Number.isFinite(memory) ? Math.round(memory * 10) / 10 : null, unit: '%' },
      ],
    };
  },
};
