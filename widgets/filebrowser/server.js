// File Browser: logs in (POST /api/login answers a JWT as text, kept), then GET /api/usage
// with it in X-Auth. With proxy header authentication the user name goes in `authHeader`.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { username, password, authHeader } = ctx.options;
    const url = ctx.options.url.replace(/\/+$/, '');
    const login = async () => {
      const headers = { 'content-type': 'application/json' };
      if (authHeader) headers[authHeader] = username;
      const res = await ctx.fetch(`${url}/api/login`, { method: 'POST', headers, body: JSON.stringify({ username, password: password ?? '' }) });
      if (!res.ok) throw new Error(`File Browser login answered ${res.status}`);
      ctx.cache.set('token', (await res.text()).trim());
    };
    const usage = async (retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/api/usage`, { headers: { accept: 'application/json', 'x-auth': ctx.cache.get('token') } });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('token');
        return usage(true);
      }
      if (!res.ok) throw new Error(`File Browser usage answered ${res.status}`);
      return res.json();
    };
    const u = await usage();
    const total = Number(u.total) || 0;
    const used = Number(u.used) || 0;
    return {
      attributes: { available: Math.round((total - used) / 1e8) / 10, usedPercent: total ? Math.round((used / total) * 1000) / 10 : null },
      blocks: [
        { key: 'available', label: 'available', value: formatBytes(total - used), ...(total && used / total > 0.9 ? { status: 'warn' } : {}) },
        { key: 'used', label: 'used', value: formatBytes(used) },
        { key: 'total', label: 'total', value: formatBytes(total) },
      ],
    };
  },
};
