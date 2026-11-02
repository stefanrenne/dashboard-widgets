// Synology Download Station: SYNO.DownloadStation.Task list with transfer details. The API path
// and version come from SYNO.API.Info (kept); the login (SYNO.API.Auth, POSTed, format=sid,
// session DownloadStation) is kept and renewed when DSM reports the session gone.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
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
    const apis = ctx.cache.get('apis') ?? (await call('query.cgi', { api: 'SYNO.API.Info', version: '1', method: 'query', query: 'SYNO.API.Auth,SYNO.DownloadStation.Task' })).data ?? {};
    ctx.cache.set('apis', apis);
    const api = (name) => ({ path: apis[name]?.path ?? 'entry.cgi', version: String(apis[name]?.maxVersion ?? 1) });
    const login = async () => {
      const a = api('SYNO.API.Auth');
      const r = await call(a.path, { api: 'SYNO.API.Auth', version: String(Math.min(Number(a.version), 6)), method: 'login', account: o.username, passwd: o.password, session: 'DownloadStation', format: 'sid' }, 'POST');
      if (!r.success || !r.data?.sid) throw new Error(`Synology login answered ${r.error?.code >= 403 ? '403 (two-step verification is on)' : 401}`);
      ctx.cache.set('sid', r.data.sid);
    };
    const list = async (retried = false) => {
      if (!ctx.cache.get('sid')) await login();
      const a = api('SYNO.DownloadStation.Task');
      const r = await call(a.path, { api: 'SYNO.DownloadStation.Task', version: a.version, method: 'list', additional: 'transfer', _sid: ctx.cache.get('sid') });
      if (!r.success && SESSION_GONE.includes(r.error?.code) && !retried) {
        ctx.cache.delete('sid');
        return list(true);
      }
      if (!r.success) throw new Error(`Synology Download Station answered ${r.error?.code === 105 ? 403 : 500} (code ${r.error?.code})`);
      return r.data?.tasks ?? [];
    };
    const tasks = await list();
    const t = (task) => task.additional?.transfer ?? {};
    const done = tasks.filter((task) => t(task).size_downloaded === task.size).length;
    const down = tasks.reduce((s, task) => s + (t(task).speed_download ?? 0), 0);
    const up = tasks.reduce((s, task) => s + (t(task).speed_upload ?? 0), 0);
    return {
      // the rates in MB/s (decimal, one decimal) for a filter
      attributes: { download: Math.round(down / 1e5) / 10, upload: Math.round(up / 1e5) / 10 },
      blocks: [
        { key: 'leech', label: 'leech', value: tasks.length - done },
        { key: 'download', label: 'download', value: formatRate(down) },
        { key: 'seed', label: 'seed', value: done },
        { key: 'upload', label: 'upload', value: formatRate(up) },
      ],
    };
  },
};
