// Frigate: /api/stats (cameras, uptime, version) and with enableRecentEvents /api/events. With
// a username Frigate wants its frigate_token cookie from POST /api/login, kept and renewed on a
// 401. Event times are spans since the event ("2h 5m"), as elsewhere.

export function span(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/api`;
    const login = async () => {
      const res = await ctx.fetch(`${url}/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user: o.username, password: o.password ?? '' }), insecure: o.insecure });
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('frigate_token='));
      if (!res.ok || !cookie) throw new Error(`Frigate login answered ${res.ok ? 401 : res.status}`);
      ctx.cache.set('cookie', cookie);
    };
    const get = async (path, retried = false) => {
      if (o.username && !ctx.cache.get('cookie')) await login();
      const headers = { accept: 'application/json', ...(o.username ? { cookie: ctx.cache.get('cookie') } : {}) };
      const res = await ctx.fetch(`${url}/${path}`, { headers, insecure: o.insecure });
      if ((res.status === 401 || res.status === 403) && o.username && !retried) {
        ctx.cache.delete('cookie');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`Frigate ${path.split('?')[0]} answered ${res.status}`);
      return res.json();
    };
    const stats = await get('stats');
    const uptime = Number(stats.service?.uptime);
    const out = {
      attributes: { uptimeHours: stats.service?.uptime === undefined || !Number.isFinite(uptime) ? null : Math.round(uptime / 360) / 10 },
      blocks: [
        { key: 'cameras', label: 'cameras', value: stats.cameras ? Object.keys(stats.cameras).length : 0 },
        { key: 'uptime', label: 'uptime', value: stats.service?.uptime === undefined ? null : span(stats.service.uptime) },
        { key: 'version', label: 'version', value: stats.service?.version ? String(stats.service.version).split('-')[0] : null },
      ],
    };
    if (o.enableRecentEvents) {
      const events = await get('events?limit=5');
      const now = Date.now() / 1000;
      out.rows = events.map((e) => ({
        label: `${e.camera} · ${e.label}${typeof e.top_score === 'number' || typeof e.score === 'number' ? ` ${Math.round((e.top_score ?? e.score) * 100)}%` : ''}`,
        value: span(now - Number(e.start_time)),
      }));
    }
    return out;
  },
};
