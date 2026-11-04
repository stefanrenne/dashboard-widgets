// UniFi Drive (UNAS): logs in through UniFi OS (POST /api/auth/login: a cookie and a CSRF
// token, kept and renewed on a 401), then GET /proxy/drive/api/v2/storage. A degraded pool is
// marked, as is use above 90%.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { username, password, insecure } = ctx.options;
    const url = ctx.options.url.replace(/\/+$/, '');
    const login = async () => {
      const res = await ctx.fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ username, password }), insecure });
      if (!res.ok) throw new Error(`UniFi Drive login answered ${res.status}`);
      const session = { cookie: res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '), csrf: res.headers.get('x-csrf-token') ?? '' };
      ctx.cache.set('session', session);
      return session;
    };
    const storage = async (retried = false) => {
      const s = ctx.cache.get('session') ?? (await login());
      const res = await ctx.fetch(`${url}/proxy/drive/api/v2/storage`, { headers: { accept: 'application/json', cookie: s.cookie, 'x-csrf-token': s.csrf }, insecure });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('session');
        return storage(true);
      }
      if (!res.ok) throw new Error(`UniFi Drive answered ${res.status}`);
      return res.json();
    };
    const pools = (await storage()).pools ?? [];
    if (!pools.length) throw new Error('UniFi Drive has no storage pools');
    const total = pools.reduce((s, p) => s + (Number(p.capacity) || 0), 0);
    const used = pools.reduce((s, p) => s + (Number(p.usage) || 0), 0);
    const degraded = pools.some((p) => p.status === 'degraded');
    const state = degraded ? 'degraded' : ['fullyOperational', 'noDataProtectionYet'].includes(pools[0].status) ? 'healthy' : 'unknown';
    return {
      attributes: {
        available: Math.round(Math.max(0, total - used) / 1e8) / 10,
        usedPercent: total > 0 ? Math.round((1000 * used) / total) / 10 : null,
      },
      blocks: [
        { key: 'total', label: 'total', value: formatBytes(total) },
        { key: 'used', label: 'used', value: formatBytes(used), ...(total && used / total > 0.9 ? { status: 'warn' } : {}) },
        { key: 'available', label: 'available', value: formatBytes(Math.max(0, total - used)) },
        { key: 'status', label: 'status', value: state, ...(degraded ? { status: 'error' } : {}) },
      ],
    };
  },
};
