// pyLoad: pyload-ng answers GET /api/status_server with an API key (X-API-Key) or Basic
// authentication. Older pyLoad (0.4) logs in with a form POST to /api/login (a session id, kept)
// and answers POST /api/statusServer with it. The widget tries pyload-ng first.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

const form = (o) => new URLSearchParams(o).toString();

export default {
  async fetch(ctx) {
    const { username, password, key } = ctx.options;
    const api = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    let status = null;
    if (key || (username && password) || ctx.cache.get('ng')) {
      const headers = { accept: 'application/json' };
      if (key) headers['x-api-key'] = key;
      else if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
      const res = await ctx.fetch(`${api}/status_server`, { headers });
      if (res.status === 401) throw new Error('pyLoad answered 401');
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body && !body.error) {
          ctx.cache.set('ng', true);
          status = body;
        }
      }
    }
    if (!status) {
      const login = async () => {
        const res = await ctx.fetch(`${api}/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form({ username: username ?? '', password: password ?? '' }) });
        const session = res.ok ? await res.json().catch(() => false) : false;
        if (!session) throw new Error('pyLoad login answered 401');
        ctx.cache.set('session', session);
        return session;
      };
      const ask = async (session) => ctx.fetch(`${api}/statusServer`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form({ session }) });
      let res = await ask(ctx.cache.get('session') ?? (await login()));
      if (res.status === 401 || res.status === 403) res = await ask(await login());
      if (!res.ok) throw new Error(`pyLoad answered ${res.status}`);
      status = await res.json();
    }
    return {
      attributes: { speed: Math.round((Number(status.speed) || 0) / 1e5) / 10 },
      blocks: [
        { key: 'speed', label: 'speed', value: formatRate(status.speed) },
        { key: 'active', label: 'active', value: status.active ?? 0 },
        { key: 'queue', label: 'queue', value: status.queue ?? 0 },
        { key: 'total', label: 'total', value: status.total ?? 0 },
      ],
    };
  },
};
