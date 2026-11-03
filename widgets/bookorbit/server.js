// BookOrbit: a login as a native client (access and refresh token in the body; the refresh token
// renews an expired access token, a new login when that fails), then the library statistics and
// your reading statistics.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const api = `${o.url.replace(/\/+$/, '')}/api/v1`;
    const tokens = async (path, body) => {
      const res = await ctx.fetch(`${api}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      const t = res.ok ? await res.json() : null;
      if (!t?.accessToken) return null;
      ctx.cache.set('access', t.accessToken);
      if (t.refreshToken) ctx.cache.set('refresh', t.refreshToken);
      return t.accessToken;
    };
    const access = async (fresh) => {
      if (!fresh && ctx.cache.get('access')) return ctx.cache.get('access');
      const refreshed = ctx.cache.get('refresh') ? await tokens('auth/refresh', { refreshToken: ctx.cache.get('refresh') }) : null;
      if (refreshed) return refreshed;
      ctx.cache.delete('refresh');
      const fromLogin = await tokens('auth/login', { username: o.username, password: o.password, clientKind: 'native', deviceLabel: 'dashboard' });
      if (!fromLogin) throw new Error('BookOrbit login answered 401');
      return fromLogin;
    };
    const get = async (path, retried = false) => {
      const res = await ctx.fetch(`${api}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${await access(retried)}` } });
      if (res.status === 401 && !retried) return get(path, true);
      if (!res.ok) throw new Error(`BookOrbit ${path} answered ${res.status}`);
      return res.json();
    };
    const library = await get('statistics/summary');
    const reading = await get('user-statistics/summary');
    return {
      blocks: [
        { key: 'books', label: 'books', value: library.totalBooks ?? null },
        { key: 'authors', label: 'authors', value: library.totalAuthors ?? null },
        { key: 'series', label: 'series', value: library.totalSeries ?? null },
        { key: 'storage', label: 'storage', value: library.totalSize === undefined ? null : formatBytes(library.totalSize) },
        { key: 'reading', label: 'reading', value: reading.inProgressBooks ?? null },
        { key: 'finished', label: 'finished', value: reading.completedBooks ?? null },
      ],
    };
  },
};
