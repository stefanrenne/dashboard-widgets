// Flood: GET /api/torrents. When Flood answers 401 the widget logs in
// (POST /api/auth/authenticate; an empty body without authentication) and keeps the jwt cookie.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const url = ctx.options.url.replace(/\/+$/, '');
    const login = async () => {
      const res = await ctx.fetch(`${url}/api/auth/authenticate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: username && password ? JSON.stringify({ username, password }) : '{}' });
      if (!res.ok) throw new Error(`Flood login answered ${res.status}`);
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('jwt='));
      if (cookie) ctx.cache.set('cookie', cookie);
    };
    const torrents = async (retried = false) => {
      const headers = { accept: 'application/json' };
      if (ctx.cache.get('cookie')) headers.cookie = ctx.cache.get('cookie');
      const res = await ctx.fetch(`${url}/api/torrents`, { headers });
      if (res.status === 401 && !retried) {
        await login();
        return torrents(true);
      }
      if (!res.ok) throw new Error(`Flood answered ${res.status}`);
      return Object.values((await res.json()).torrents ?? {});
    };
    const list = await torrents();
    const has = (t, s) => (t.status ?? []).includes(s);
    const down = list.reduce((s, t) => s + (t.downRate ?? 0), 0);
    const up = list.reduce((s, t) => s + (t.upRate ?? 0), 0);
    return {
      // the rates in MB/s (decimal, one decimal) for a filter
      attributes: { download: Math.round(down / 1e5) / 10, upload: Math.round(up / 1e5) / 10 },
      blocks: [
        { key: 'leech', label: 'leech', value: list.filter((t) => has(t, 'downloading')).length },
        { key: 'download', label: 'download', value: formatRate(down) },
        { key: 'seed', label: 'seed', value: list.filter((t) => has(t, 'complete')).length },
        { key: 'upload', label: 'upload', value: formatRate(up) },
      ],
    };
  },
};
